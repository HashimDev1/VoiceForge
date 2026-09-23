import { config } from '../config';
import { logger } from '../utils/logger';

export interface FishAudioTTSParams {
  text: string;
  reference_id?: string;
  format?: 'mp3' | 'wav' | 'pcm' | 'opus';
  model?: string;
  speechSpeed?: number;
  prosody?: {
    speed?: number;
    volume?: number;
  };
}

export interface FishAudioResult {
  audioBuffer: Buffer;
  contentType: string;
}

export class FishAudioService {
  /**
   * Generates TTS audio using official Fish Audio API (POST https://api.fish.audio/v1/tts)
   */
  public static async generateTTS(
    params: FishAudioTTSParams,
    maxRetries: number = 3
  ): Promise<FishAudioResult> {
    const apiKey = config.fishApiKey;

    if (!apiKey || apiKey === 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      throw new Error('Fish Audio API key is not configured. Please add FISH_API_KEY to your .env file.');
    }

    const endpoint = `${config.fishApiBaseUrl}/tts`;
    const modelHeader = params.model || config.defaultModel;
    const format = params.format || 'mp3';

    const speed = params.speechSpeed || (params.prosody && params.prosody.speed) || 1.0;

    const payload: Record<string, any> = {
      text: params.text,
      format,
      prosody: {
        speed
      }
    };

    if (params.reference_id && params.reference_id.trim()) {
      payload.reference_id = params.reference_id.trim();
    }

    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      attempt++;
      try {
        logger.info(`Sending TTS request (attempt ${attempt}/${maxRetries}) to ${endpoint} [model: ${modelHeader}]`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'model': modelHeader
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);

          if (audioBuffer.length === 0) {
            throw new Error('Audio generation succeeded but returned empty 0-byte audio buffer.');
          }

          logger.info(`TTS success: generated ${audioBuffer.length} bytes of ${format} audio.`);
          return {
            audioBuffer,
            contentType: response.headers.get('content-type') || 'audio/mpeg'
          };
        }

        const statusCode = response.status;
        let errorMessage = '';
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
        } catch {
          errorMessage = await response.text();
        }

        logger.warn(`Fish Audio API returned status ${statusCode}: ${errorMessage}`);

        if (statusCode === 401) {
          const err: any = new Error('Fish Audio API key is invalid (401 Unauthorized). Check your .env file.');
          err.statusCode = 401;
          err.isClientError = true;
          throw err;
        }
        if (statusCode === 402) {
          const err: any = new Error(`Fish Audio insufficient credits or payment required (402): ${errorMessage}`);
          err.statusCode = 402;
          err.isClientError = true;
          throw err;
        }
        if (statusCode === 403) {
          const err: any = new Error(`Fish Audio rejected this request (403 Forbidden): ${errorMessage}`);
          err.statusCode = 403;
          err.isClientError = true;
          throw err;
        }
        if (statusCode === 400 || statusCode === 404) {
          const err: any = new Error(`Fish Audio client error (${statusCode}): ${errorMessage}`);
          err.statusCode = statusCode;
          err.isClientError = true;
          throw err;
        }
        if (statusCode === 429) {
          if (attempt < maxRetries) {
            logger.warn(`Rate limit 429 hit. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
            continue;
          }
          throw new Error('Fish Audio rate limit reached (429 Too Many Requests). Please wait before retrying.');
        }
        if (statusCode >= 500) {
          if (attempt < maxRetries) {
            logger.warn(`Fish Audio server error ${statusCode}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
          throw new Error(`Fish Audio is temporarily unavailable (${statusCode} Server Error).`);
        }

        const fallbackErr: any = new Error(`Fish Audio API error (${statusCode}): ${errorMessage}`);
        fallbackErr.statusCode = statusCode;
        if (statusCode >= 400 && statusCode < 500) {
          fallbackErr.isClientError = true;
        }
        throw fallbackErr;
      } catch (err: any) {
        if (err.isClientError || (err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 429)) {
          throw err;
        }

        if (err.name === 'FetchError' || err.message.includes('fetch failed')) {
          if (attempt < maxRetries) {
            logger.warn(`Network connection error. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
          throw new Error('Unable to connect to Fish Audio API. Check your internet connection.');
        }

        // Rethrow specified API error
        if (attempt >= maxRetries || err.message.includes('401') || err.message.includes('403') || err.message.includes('402') || err.message.includes('400')) {
          throw err;
        }
      }
    }

    throw new Error('Audio generation failed after maximum retries.');
  }

  /**
   * Tests API key connectivity with a minimal TTS call
   */
  public static async testConnection(): Promise<{ success: boolean; message: string; model: string }> {
    const apiKey = config.fishApiKey;

    if (!apiKey || apiKey === 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      return {
        success: false,
        message: 'Add FISH_API_KEY to your .env file.',
        model: config.defaultModel
      };
    }

    try {
      const result = await this.generateTTS({
        text: 'VoiceForge connection test.',
        format: 'mp3'
      }, 1);

      if (result.audioBuffer.length > 0) {
        return {
          success: true,
          message: 'Fish Audio connection successful! API Key is active.',
          model: config.defaultModel
        };
      }
      return {
        success: false,
        message: 'Audio test returned zero bytes.',
        model: config.defaultModel
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to connect to Fish Audio API.',
        model: config.defaultModel
      };
    }
  }

  /**
   * Search / Browse remote and community voice models from Fish Audio (GET https://api.fish.audio/model)
   */
  public static async listRemoteModels(params: {
    title?: string;
    tag?: string;
    language?: string;
    self?: boolean;
    page_number?: number;
    page_size?: number;
    sort_by?: 'score' | 'task_count' | 'created_at';
  }): Promise<{ total: number; items: any[]; page_number: number; page_size: number }> {
    const apiKey = config.fishApiKey;
    const url = new URL(`${config.fishApiRootUrl}/model`);

    const page_number = params.page_number || 1;
    const page_size = params.page_size || 20;

    url.searchParams.set('page_number', String(page_number));
    url.searchParams.set('page_size', String(page_size));

    if (params.title && params.title.trim()) {
      url.searchParams.set('title', params.title.trim());
    }
    if (params.tag && params.tag.trim()) {
      url.searchParams.set('tag', params.tag.trim());
    }
    if (params.language && params.language.trim()) {
      url.searchParams.set('language', params.language.trim());
    }
    if (params.self !== undefined) {
      url.searchParams.set('self', String(params.self));
    }
    if (params.sort_by) {
      url.searchParams.set('sort_by', params.sort_by);
    }

    const headers: Record<string, string> = {};
    if (apiKey && apiKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch Fish Audio models (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
      total: data.total || (data.items ? data.items.length : 0),
      items: data.items || [],
      page_number,
      page_size
    };
  }

  /**
   * Fetch single model details (GET https://api.fish.audio/model/{id})
   */
  public static async getRemoteModel(id: string): Promise<any> {
    const apiKey = config.fishApiKey;
    const headers: Record<string, string> = {};
    if (apiKey && apiKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${config.fishApiRootUrl}/model/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model ${id} (${response.status})`);
    }

    return await response.json();
  }

  /**
   * Create an instant voice model using zero-shot reference audio (POST https://api.fish.audio/model)
   */
  public static async createVoiceModel(
    audioBuffer: Buffer,
    originalFilename: string,
    data: {
      title: string;
      description?: string;
      text?: string;
      tags?: string[];
      visibility?: 'public' | 'unlist' | 'private';
    }
  ): Promise<any> {
    const apiKey = config.fishApiKey;
    if (!apiKey || apiKey === 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      throw new Error('Fish Audio API key is required to clone voices.');
    }

    const ext = (originalFilename || '').toLowerCase();
    const mimeType = ext.endsWith('.wav')
      ? 'audio/wav'
      : ext.endsWith('.ogg')
      ? 'audio/ogg'
      : ext.endsWith('.m4a')
      ? 'audio/mp4'
      : 'audio/mpeg';

    const formData = new FormData();
    formData.append('type', 'tts');
    formData.append('train_mode', 'fast');
    formData.append('title', data.title.trim());
    formData.append('visibility', data.visibility || 'private');
    formData.append('enhance_audio_quality', 'true');

    if (data.description && data.description.trim()) {
      formData.append('description', data.description.trim());
    }

    if (data.text && data.text.trim()) {
      formData.append('texts', data.text.trim());
    }

    if (data.tags && data.tags.length > 0) {
      data.tags.forEach((tag) => formData.append('tags', tag));
    }

    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('voices', audioBlob, originalFilename || 'reference.mp3');

    logger.info(`Creating Fish Audio voice model "${data.title}" via POST ${config.fishApiRootUrl}/model...`);

    const response = await fetch(`${config.fishApiRootUrl}/model`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.message || parsed.detail || JSON.stringify(parsed);
      } catch {}
      throw new Error(`Voice model creation failed (${response.status}): ${errorMsg}`);
    }

    const createdModel = await response.json();
    logger.info(`Successfully created voice model "${createdModel.title}" with ID: ${createdModel._id}`);
    return createdModel;
  }

  /**
   * Generates candidate voices from natural language prompt (POST https://api.fish.audio/v1/voice-design)
   */
  public static async designVoice(params: {
    instruction: string;
    reference_text?: string;
    language?: string;
    n?: number;
    speed?: number;
    num_step?: number;
    guidance_scale?: number;
  }): Promise<{ candidates: any[]; instruction: string }> {
    const apiKey = config.fishApiKey;
    if (!apiKey || apiKey === 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      throw new Error('Fish Audio API key is required to use Voice Design.');
    }

    const endpoint = `${config.fishApiBaseUrl}/voice-design`;
    logger.info(`Designing voice with instruction: "${params.instruction}"`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instruction: params.instruction,
        reference_text: params.reference_text || undefined,
        language: params.language || undefined,
        n: params.n || 2,
        speed: params.speed || 1.0,
        num_step: params.num_step || 32,
        guidance_scale: params.guidance_scale || 2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.message || parsed.detail || JSON.stringify(parsed);
      } catch {}
      throw new Error(`Voice design failed (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    return {
      candidates: data.candidates || [],
      instruction: params.instruction
    };
  }

  /**
   * Transcribe speech audio to text using Fish Audio ASR (POST https://api.fish.audio/v1/asr)
   */
  public static async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    language?: string
  ): Promise<{ text: string; duration?: number; language?: string; language_code?: string; segments?: any[] }> {
    const apiKey = config.fishApiKey;
    if (!apiKey || apiKey === 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      throw new Error('Fish Audio API key is required to transcribe audio.');
    }

    const ext = (filename || '').toLowerCase();
    const mimeType = ext.endsWith('.wav')
      ? 'audio/wav'
      : ext.endsWith('.ogg')
      ? 'audio/ogg'
      : ext.endsWith('.m4a')
      ? 'audio/mp4'
      : 'audio/mpeg';

    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('audio', audioBlob, filename || 'audio.mp3');
    formData.append('ignore_timestamps', 'false');

    if (language && language.trim()) {
      formData.append('language', language.trim());
    }

    const endpoint = `${config.fishApiBaseUrl}/asr`;
    logger.info(`Sending ASR transcription request to ${endpoint}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.message || parsed.detail || JSON.stringify(parsed);
      } catch {}
      throw new Error(`Audio transcription failed (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    logger.info(`Transcription success: got ${data.text ? data.text.length : 0} characters.`);
    return data;
  }
}

