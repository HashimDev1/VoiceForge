import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { config } from '../config';
import { logger } from '../utils/logger';
import { FishAudioService } from './fishAudioService';
import { TranslationEngineService } from './translationEngineService';
import { TranscriptionSegment, TranscriptionWord } from '../../../shared/src/types';

const execFileAsync = util.promisify(execFile);

export interface SpeechRecognitionResult {
  text: string;
  duration?: number;
  language?: string;
  language_code?: string;
  language_probability?: number;
  is_ambiguous_hindi_urdu?: boolean;
  segments?: TranscriptionSegment[];
  provider: 'local' | 'groq' | 'openai' | 'fish_audio' | 'huggingface' | 'fallback';
  error?: string;
}

export class SpeechRecognitionService {
  /**
   * Discovers the working Python executable across Windows and Linux/Docker environments.
   */
  public static getPythonPath(): string {
    if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
      return process.env.PYTHON_PATH;
    }

    const isWin = process.platform === 'win32';
    const candidates = isWin
      ? [
          'python',
          'py',
          'C:\\Users\\Muhammad Hashim\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
          'C:\\Users\\Muhammad Hashim\\AppData\\Local\\Programs\\Python\\Python314\\python.exe'
        ]
      : [
          'python3',
          '/usr/bin/python3',
          '/usr/local/bin/python3',
          'python'
        ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return isWin ? 'python' : 'python3';
  }

  /**
   * Transcribe audio to text with automatic language detection, genuine timestamps,
   * and word-level alignment using faster-whisper or cloud Whisper.
   * 
   * Priority:
   * 1. High-accuracy Local faster-whisper engine (Free, Offline, genuine timestamps & word alignment)
   * 2. Groq Whisper API (whisper-large-v3-turbo, free cloud Whisper)
   * 3. OpenAI Whisper API (whisper-1, if configured)
   * 4. Fish Audio ASR (if configured and credits available)
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

    const langCode = (targetOrSourceLanguage && targetOrSourceLanguage.toLowerCase() !== 'auto')
      ? TranslationEngineService.normalizeLangCode(targetOrSourceLanguage)
      : undefined;

    let localEngineError: string | null = null;

    // 1. Try High-Accuracy Local faster-whisper Engine (Offline, Zero cost, exact timestamps)
    try {
      logger.info(`[ASR] Attempting local speech-to-text transcription via faster-whisper engine...`);
      const tempExt = ext.startsWith('.') ? ext : '.mp3';
      const tempPath = path.join(config.storageDir, `asr_temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${tempExt}`);
      await fs.promises.writeFile(tempPath, audioBuffer);
      try {
        const localResult = await this.transcribeWithPython(tempPath, langCode);
        if (localResult && (localResult.text || (localResult.segments && localResult.segments.length > 0))) {
          logger.info(`[ASR] Successfully transcribed ${localResult.text.length} chars via Local Engine (${localResult.segments?.length || 0} segments, detected: ${localResult.language} [${localResult.language_code}] prob: ${localResult.language_probability}).`);
          return {
            ...localResult,
            provider: 'local'
          };
        }
      } finally {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath).catch(() => {});
        }
      }
    } catch (localErr: any) {
      localEngineError = localErr.message || String(localErr);
      logger.warn('[ASR] Local faster-whisper engine failed, checking cloud providers:', localEngineError);
    }

    // 2. Try Groq Whisper API (Fastest Cloud Whisper API)
    const groqKey = config.groqApiKey || process.env.GROQ_API_KEY;
    if (groqKey && groqKey !== 'YOUR_GROQ_API_KEY_HERE') {
      try {
        logger.info(`[ASR] Attempting transcription via Groq Whisper API...`);
        const result = await this.transcribeWithGroq(audioBuffer, filename, mimeType, langCode, groqKey);
        if (result && (result.text || (result.segments && result.segments.length > 0))) {
          logger.info(`[ASR] Successfully transcribed ${result.text.length} chars via Groq Whisper (${result.segments?.length || 0} segments).`);
          return { ...result, provider: 'groq' };
        }
      } catch (groqErr: any) {
        logger.warn('[ASR] Groq Whisper failed, trying next provider:', groqErr.message || groqErr);
      }
    }

    // 3. Try OpenAI Whisper API
    const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
      try {
        logger.info(`[ASR] Attempting transcription via OpenAI Whisper API...`);
        const result = await this.transcribeWithOpenAI(audioBuffer, filename, mimeType, langCode, openaiKey);
        if (result && (result.text || (result.segments && result.segments.length > 0))) {
          logger.info(`[ASR] Successfully transcribed ${result.text.length} chars via OpenAI Whisper.`);
          return { ...result, provider: 'openai' };
        }
      } catch (oaiErr: any) {
        logger.warn('[ASR] OpenAI Whisper failed, trying next provider:', oaiErr.message || oaiErr);
      }
    }

    // 4. Try Fish Audio ASR
    const fishKey = config.fishApiKey;
    if (fishKey && fishKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      try {
        logger.info(`[ASR] Attempting transcription via Fish Audio ASR...`);
        const result = await FishAudioService.transcribeAudio(audioBuffer, filename, targetOrSourceLanguage);
        if (result && (result.text || (result.segments && result.segments.length > 0))) {
          logger.info(`[ASR] Successfully transcribed via Fish Audio ASR.`);
          const rawSegs = Array.isArray(result.segments) && result.segments.length > 0
            ? result.segments
            : result.text
              ? [{ id: 'seg_1', start: 0, end: result.duration || 5, text: result.text }]
              : [];

          return {
            text: result.text || '',
            duration: result.duration,
            language: result.language || 'English',
            language_code: result.language_code || 'en',
            segments: rawSegs.map((s: any, idx: number) => ({
              id: `seg_${idx + 1}`,
              start: Number(s.start || s.start_time || 0),
              end: Number(s.end || s.end_time || 0),
              text: String(s.text || '').trim()
            })),
            provider: 'fish_audio'
          };
        }
      } catch (fishErr: any) {
        logger.warn('[ASR] Fish Audio ASR failed:', fishErr.message || fishErr);
      }
    }

    // 5. Build clear diagnostic error message for live/cloud deployments
    let detailedError = 'No recognizable speech detected in this media file.';
    if (localEngineError) {
      const hasCloudKeys = Boolean(groqKey || openaiKey || fishKey);
      if (!hasCloudKeys) {
        detailedError = `Live server has no Speech Recognition engine configured. Local Python faster-whisper failed (${localEngineError}). To enable speech-to-text in production, please set GROQ_API_KEY (free at console.groq.com) or FISH_API_KEY in your environment variables.`;
      }
    }

    logger.warn('[ASR] All transcription providers failed:', detailedError);
    return {
      text: '',
      provider: 'fallback',
      language: targetOrSourceLanguage || 'English',
      language_code: langCode || 'en',
      language_probability: 0.0,
      segments: [],
      error: detailedError
    };
  }

  /**
   * Transcribe via local Python script using faster-whisper
   */
  public static async transcribeWithPython(
    audioPath: string,
    langCode?: string
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const scriptPath = path.resolve(__dirname, '../scripts/transcribe_audio.py');
    const pythonExe = this.getPythonPath();

    const args = [scriptPath, audioPath];
    if (langCode && langCode.trim()) {
      args.push(langCode.trim());
    }

    const { stdout, stderr } = await execFileAsync(pythonExe, args, {
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    if (stderr && stderr.includes('Error')) {
      logger.warn('[ASR] transcribe_audio.py stderr:', stderr);
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(stdout || '{}');
    } catch (e: any) {
      throw new Error(`Failed to parse ASR python output: ${stdout}`);
    }

    if (parsed.error) {
      throw new Error(`ASR engine error: ${parsed.error}`);
    }

    const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
    const segments: TranscriptionSegment[] = rawSegments.map((s: any, idx: number) => {
      const words: TranscriptionWord[] = Array.isArray(s.words)
        ? s.words.map((w: any) => ({
            word: String(w.word || ''),
            start: Number(w.start || 0),
            end: Number(w.end || 0),
            confidence: typeof w.probability === 'number' ? w.probability : undefined
          }))
        : [];

      return {
        id: s.id || `seg_${idx + 1}`,
        start: Number(s.start || 0),
        end: Number(s.end || 0),
        text: String(s.text || '').trim(),
        words
      };
    });

    return {
      text: (parsed.text || '').trim(),
      duration: parsed.duration,
      language: parsed.language || 'English',
      language_code: parsed.language_code || 'en',
      language_probability: typeof parsed.language_probability === 'number' ? parsed.language_probability : undefined,
      is_ambiguous_hindi_urdu: Boolean(parsed.is_ambiguous_hindi_urdu),
      segments
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
    formData.append('file', audioBlob, filename || 'audio.wav');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

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
    const segments: TranscriptionSegment[] = rawSegments.map((s: any, idx: number) => ({
      id: `seg_${idx + 1}`,
      start: Number(s.start || 0),
      end: Number(s.end || 0),
      text: String(s.text || '').trim(),
      words: Array.isArray(s.words)
        ? s.words.map((w: any) => ({
            word: String(w.word || ''),
            start: Number(w.start || 0),
            end: Number(w.end || 0)
          }))
        : []
    })).filter((s: TranscriptionSegment) => s.text.length > 0);

    if (segments.length === 0 && (data.text || '').trim()) {
      segments.push({
        id: 'seg_1',
        start: 0,
        end: typeof data.duration === 'number' ? data.duration : 5,
        text: data.text.trim(),
        words: []
      });
    }

    const detectedLang = data.language || langCode || 'en';
    const isHindiUrdu = ['hi', 'ur', 'hindi', 'urdu'].includes(detectedLang.toLowerCase());

    return {
      text: (data.text || '').trim(),
      duration: typeof data.duration === 'number' ? data.duration : undefined,
      language: detectedLang,
      language_code: langCode || detectedLang.slice(0, 2),
      language_probability: 0.95,
      is_ambiguous_hindi_urdu: isHindiUrdu,
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
    const segments: TranscriptionSegment[] = rawSegments.map((s: any, idx: number) => ({
      id: `seg_${idx + 1}`,
      start: Number(s.start || 0),
      end: Number(s.end || 0),
      text: String(s.text || '').trim(),
      words: Array.isArray(s.words)
        ? s.words.map((w: any) => ({
            word: String(w.word || ''),
            start: Number(w.start || 0),
            end: Number(w.end || 0)
          }))
        : []
    })).filter((s: TranscriptionSegment) => s.text.length > 0);

    const detectedLang = data.language || langCode || 'en';
    const isHindiUrdu = ['hi', 'ur', 'hindi', 'urdu'].includes(detectedLang.toLowerCase());

    return {
      text: (data.text || '').trim(),
      duration: typeof data.duration === 'number' ? data.duration : undefined,
      language: detectedLang,
      language_code: langCode || detectedLang.slice(0, 2),
      language_probability: 0.95,
      is_ambiguous_hindi_urdu: isHindiUrdu,
      segments
    };
  }
}
