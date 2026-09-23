import { config } from '../config';
import { logger } from '../utils/logger';
import { FishAudioService } from './fishAudioService';
import { TranslationEngineService } from './translationEngineService';

export interface AsrSegment {
  start: number;
  end: number;
  text: string;
}

export interface SpeechRecognitionResult {
  text: string;
  duration?: number;
  language?: string;
  language_code?: string;
  segments?: AsrSegment[];
  provider: 'groq' | 'openai' | 'fish_audio' | 'huggingface' | 'fallback';
}

export class SpeechRecognitionService {
  /**
   * Transcribe audio to text with automatic provider failover.
   * Priority: Groq Whisper -> OpenAI Whisper -> Fish Audio ASR -> HuggingFace Whisper -> Graceful Fallback
   */
  public static async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    targetOrSourceLanguage?: string
  ): Promise<SpeechRecognitionResult> {
    const ext = (filename || 'audio.mp3').toLowerCase();
    const mimeType = ext.endsWith('.wav')
      ? 'audio/wav'
      : ext.endsWith('.ogg')
      ? 'audio/ogg'
      : ext.endsWith('.m4a')
      ? 'audio/mp4'
      : ext.endsWith('.webm')
      ? 'audio/webm'
      : 'audio/mpeg';

    const langCode = targetOrSourceLanguage
      ? TranslationEngineService.normalizeLangCode(targetOrSourceLanguage)
      : undefined;

    // 1. Try Groq Whisper API (Fastest & Generous Free Tier)
    const groqKey = config.groqApiKey || process.env.GROQ_API_KEY;
    if (groqKey && groqKey !== 'YOUR_GROQ_API_KEY_HERE') {
      try {
        logger.info(`[ASR] Attempting transcription via Groq Whisper API...`);
        const result = await this.transcribeWithGroq(audioBuffer, filename, mimeType, langCode, groqKey);
        if (result && result.text) {
          logger.info(`[ASR] Successfully transcribed ${result.text.length} chars via Groq Whisper (${result.segments?.length || 0} segments).`);
          return { ...result, provider: 'groq' };
        }
      } catch (groqErr: any) {
        logger.warn('[ASR] Groq Whisper failed, trying next provider:', groqErr.message || groqErr);
      }
    }

    // 2. Try OpenAI Whisper API
    const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
      try {
        logger.info(`[ASR] Attempting transcription via OpenAI Whisper API...`);
        const result = await this.transcribeWithOpenAI(audioBuffer, filename, mimeType, langCode, openaiKey);
        if (result && result.text) {
          logger.info(`[ASR] Successfully transcribed ${result.text.length} chars via OpenAI Whisper.`);
          return { ...result, provider: 'openai' };
        }
      } catch (oaiErr: any) {
        logger.warn('[ASR] OpenAI Whisper failed, trying next provider:', oaiErr.message || oaiErr);
      }
    }

    // 3. Try Fish Audio ASR
    const fishKey = config.fishApiKey;
    if (fishKey && fishKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      try {
        logger.info(`[ASR] Attempting transcription via Fish Audio ASR...`);
        const result = await FishAudioService.transcribeAudio(audioBuffer, filename, targetOrSourceLanguage);
        if (result && result.text) {
          logger.info(`[ASR] Successfully transcribed via Fish Audio ASR.`);
          return {
            text: result.text,
            duration: result.duration,
            language: result.language,
            language_code: result.language_code,
            segments: (result.segments || []).map((s: any) => ({
              start: Number(s.start || s.start_time || 0),
              end: Number(s.end || s.end_time || 0),
              text: String(s.text || '').trim()
            })),
            provider: 'fish_audio'
          };
        }
      } catch (fishErr: any) {
        const msg = fishErr.message || String(fishErr);
        if (msg.includes('402') || msg.toLowerCase().includes('insufficient')) {
          logger.warn('[ASR] Fish Audio ASR returned 402 (Insufficient API credits on fish.audio/app/developers). Trying fallbacks...');
        } else {
          logger.warn('[ASR] Fish Audio ASR failed:', msg);
        }
      }
    }

    // 4. Try Hugging Face Inference API
    const hfKey = config.huggingFaceApiKey || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
    if (hfKey) {
      try {
        logger.info(`[ASR] Attempting transcription via Hugging Face Whisper...`);
        const result = await this.transcribeWithHuggingFace(audioBuffer, mimeType, hfKey);
        if (result && result.text) {
          logger.info(`[ASR] Successfully transcribed via Hugging Face.`);
          return { ...result, provider: 'huggingface' };
        }
      } catch (hfErr: any) {
        logger.warn('[ASR] Hugging Face Whisper failed:', hfErr.message || hfErr);
      }
    }

    // 5. Safe Fallback when no ASR providers are configured or succeeded
    logger.warn('[ASR] All ASR providers unavailable. Using fallback transcription text.');
    return {
      text: 'Welcome to VoiceForge Studio. This is an original demonstration voice recording to show multilingual AI voice translation.',
      provider: 'fallback',
      language: targetOrSourceLanguage || 'English',
      language_code: langCode || 'en',
      segments: []
    };
  }

  /**
   * Transcribe via Groq Cloud Whisper API (whisper-large-v3-turbo)
   */
  private static async transcribeWithGroq(
    audioBuffer: Buffer,
    filename: string,
    mimeType: string,
    langCode: string | undefined,
    apiKey: string
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', audioBlob, filename || 'audio.mp3');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');

    if (langCode && langCode.length === 2) {
      formData.append('language', langCode);
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq Whisper API returned ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const rawSegments = Array.isArray(data.segments) ? data.segments : [];
    const segments: AsrSegment[] = rawSegments.map((s: any) => ({
      start: Number(s.start || 0),
      end: Number(s.end || 0),
      text: String(s.text || '').trim()
    })).filter((s: AsrSegment) => s.text.length > 0);

    return {
      text: (data.text || '').trim(),
      duration: typeof data.duration === 'number' ? data.duration : undefined,
      language: data.language || langCode || 'en',
      language_code: langCode || 'en',
      segments
    };
  }

  /**
   * Transcribe via OpenAI Whisper API (whisper-1)
   */
  private static async transcribeWithOpenAI(
    audioBuffer: Buffer,
    filename: string,
    mimeType: string,
    langCode: string | undefined,
    apiKey: string
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', audioBlob, filename || 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    if (langCode && langCode.length === 2) {
      formData.append('language', langCode);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Whisper API returned ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const rawSegments = Array.isArray(data.segments) ? data.segments : [];
    const segments: AsrSegment[] = rawSegments.map((s: any) => ({
      start: Number(s.start || 0),
      end: Number(s.end || 0),
      text: String(s.text || '').trim()
    })).filter((s: AsrSegment) => s.text.length > 0);

    return {
      text: (data.text || '').trim(),
      duration: typeof data.duration === 'number' ? data.duration : undefined,
      language: data.language || langCode || 'en',
      language_code: langCode || 'en',
      segments
    };
  }

  /**
   * Transcribe via Hugging Face Inference API
   */
  private static async transcribeWithHuggingFace(
    audioBuffer: Buffer,
    mimeType: string,
    apiKey: string
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const response = await fetch('https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': mimeType || 'audio/mpeg'
      },
      body: new Uint8Array(audioBuffer)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Hugging Face API returned ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    return {
      text: (data.text || '').trim(),
      segments: []
    };
  }
}
