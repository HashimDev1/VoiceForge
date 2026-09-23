import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { FishAudioService } from './fishAudioService';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import { TranslationEngineService } from './translationEngineService';

const execFileAsync = util.promisify(execFile);

const EDGE_TTS_VOICES: Record<string, string> = {
  en: 'en-US-ChristopherNeural',
  es: 'es-ES-AlvaroNeural',
  ar: 'ar-SA-HamedNeural',
  ur: 'ur-PK-AsadNeural',
  hi: 'hi-IN-MadhurNeural',
  fr: 'fr-FR-HenriNeural',
  de: 'de-DE-ConradNeural',
  it: 'it-IT-DiegoNeural',
  pt: 'pt-BR-AntonioNeural',
  zh: 'zh-CN-YunxiNeural',
  ja: 'ja-JP-KeitaNeural',
  ko: 'ko-KR-InJoonNeural',
  tr: 'tr-TR-AhmetNeural'
};

export class NeuralTtsHelper {
  /**
   * Synthesizes spoken audio for the given text.
   * Priority:
   * 1. Fish Audio API (with reference ID for voice cloning)
   * 2. Local Edge-TTS (multilingual neural voice synthesis)
   * 3. FFmpeg audio synthesis fallback
   */
  public static async synthesizeSpeech(params: {
    text: string;
    language: string;
    referenceId?: string;
    outputPath: string;
    targetDurationSec?: number;
  }): Promise<{ audioPath: string; duration: number }> {
    const { text, language, referenceId, outputPath, targetDurationSec } = params;
    const langCode = TranslationEngineService.normalizeLangCode(language);

    // 1. Try Fish Audio API if key is present
    if (config.fishApiKey && config.fishApiKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE') {
      try {
        logger.info(`Attempting Fish Audio TTS for language ${language} [model/ref: ${referenceId || 'default'}]...`);
        const res = await FishAudioService.generateTTS({
          text,
          reference_id: referenceId && !referenceId.startsWith('reference_') ? referenceId : undefined,
          format: 'mp3'
        });
        if (res.audioBuffer && res.audioBuffer.length > 0) {
          await fs.promises.writeFile(outputPath, res.audioBuffer);
          const duration = await FFmpegHelper.getMediaDuration(outputPath);
          logger.info(`Fish Audio synthesis successful (${duration.toFixed(2)}s)`);
          return { audioPath: outputPath, duration };
        }
      } catch (fishErr: any) {
        logger.warn(`Fish Audio TTS unavailable (${fishErr.message}), falling back to local neural TTS engine.`);
      }
    }

    // 2. Try Edge-TTS via Python (installed locally on host)
    try {
      const voice = EDGE_TTS_VOICES[langCode] || 'en-US-ChristopherNeural';
      const cleanText = text.replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
      const pythonScript = `
import asyncio, edge_tts
async def main():
    comm = edge_tts.Communicate("""${cleanText}""", "${voice}")
    await comm.save(r"${outputPath}")
asyncio.run(main())
`;
      logger.info(`Synthesizing speech with local Neural TTS [voice: ${voice}]...`);
      await execFileAsync('python', ['-c', pythonScript], { maxBuffer: 10 * 1024 * 1024 });

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100) {
        const duration = await FFmpegHelper.getMediaDuration(outputPath);
        logger.info(`Local Neural TTS generated ${duration.toFixed(2)}s audio successfully.`);
        return { audioPath: outputPath, duration };
      }
    } catch (edgeErr: any) {
      logger.warn('Local Neural TTS synthesis failed:', edgeErr.message);
    }

    // 3. Fallback: FFmpeg valid audio synthesis
    const dur = targetDurationSec && targetDurationSec > 0 ? targetDurationSec : 3.0;
    logger.info(`Generating fallback audio tone (${dur.toFixed(2)}s)...`);
    await FFmpegHelper.generateToneAudio(outputPath, dur);
    return { audioPath: outputPath, duration: dur };
  }
}
