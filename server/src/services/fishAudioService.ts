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
          throw new Error('Fish Audio API key is invalid (401 Unauthorized). Check your .env file.');
        }
        if (statusCode === 403) {
          throw new Error(`Fish Audio rejected this request (403 Forbidden): ${errorMessage}`);
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

        throw new Error(`Fish Audio API error (${statusCode}): ${errorMessage}`);
      } catch (err: any) {
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
        if (attempt >= maxRetries || err.message.includes('401') || err.message.includes('403')) {
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
}
