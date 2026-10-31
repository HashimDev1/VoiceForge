import { Router, Request, Response } from 'express';
import { FishAudioService } from '../services/fishAudioService';
import { OpenSourceTtsService } from '../services/openSourceTtsService';
import { ProjectService } from '../services/projectService';
import { VoiceStorageService } from '../services/voiceStorageService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/tts
 * Generates audio for a single text chunk via Fish Audio or Open-Source Neural TTS
 */
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, reference_id, format = 'mp3', model, speechSpeed, prosody, numTakes = 1 } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    const count = Number(numTakes) === 2 ? 2 : 1;
    const isOpenSource = OpenSourceTtsService.isOpenSourceVoice(reference_id);

    if (isOpenSource) {
      if (count === 2) {
        logger.info(`Multi-take requested via Open-Source TTS (${reference_id}) for "${text.trim().slice(0, 30)}..."`);
        const [res1, res2] = await Promise.all([
          OpenSourceTtsService.generateTTS({
            text: text.trim(),
            voiceId: reference_id,
            speechSpeed: speechSpeed || (prosody && prosody.speed) || 1.0,
            format,
            takeIndex: 1
          }),
          OpenSourceTtsService.generateTTS({
            text: text.trim(),
            voiceId: reference_id,
            speechSpeed: speechSpeed || (prosody && prosody.speed) || 1.0,
            format,
            takeIndex: 2
          })
        ]);

        const saved1 = await ProjectService.saveAudioFile(res1.audioBuffer, 'take1_os');
        const saved2 = await ProjectService.saveAudioFile(res2.audioBuffer, 'take2_os');

        const now = Date.now();
        const takes = [
          {
            id: `take_${now}_1`,
            label: 'Take 1',
            audioUrl: saved1.fileUrl,
            durationSec: res1.duration,
            createdAt: new Date().toISOString()
          },
          {
            id: `take_${now}_2`,
            label: 'Take 2',
            audioUrl: saved2.fileUrl,
            durationSec: res2.duration,
            createdAt: new Date().toISOString()
          }
        ];

        return res.json({
          success: true,
          audioUrl: saved1.fileUrl,
          filename: saved1.filename,
          sizeBytes: res1.sizeBytes,
          duration: res1.duration,
          takes
        });
      }

      const osResult = await OpenSourceTtsService.generateTTS({
        text: text.trim(),
        voiceId: reference_id,
        speechSpeed: speechSpeed || (prosody && prosody.speed) || 1.0,
        format,
        takeIndex: 1
      });

      const savedFile = await ProjectService.saveAudioFile(osResult.audioBuffer, 'chunk_os');
      const takes = [
        {
          id: `take_${Date.now()}_1`,
          label: 'Take 1',
          audioUrl: savedFile.fileUrl,
          durationSec: osResult.duration,
          createdAt: new Date().toISOString()
        }
      ];

      return res.json({
        success: true,
        audioUrl: savedFile.fileUrl,
        filename: savedFile.filename,
        sizeBytes: osResult.sizeBytes,
        duration: osResult.duration,
        takes
      });
    }

    // Default Fish Audio pipeline
    if (count === 2) {
      logger.info(`Multi-take requested via Fish Audio for "${text.trim().slice(0, 30)}..."`);
      const [take1Result, take2Result] = await Promise.all([
        FishAudioService.generateTTS({
          text: text.trim(),
          reference_id: reference_id && reference_id !== 'default_s21_free' ? reference_id : undefined,
          format,
          model,
          speechSpeed: speechSpeed || (prosody && prosody.speed),
          prosody
        }),
        FishAudioService.generateTTS({
          text: text.trim(),
          reference_id: reference_id && reference_id !== 'default_s21_free' ? reference_id : undefined,
          format,
          model,
          speechSpeed: speechSpeed || (prosody && prosody.speed),
          prosody
        })
      ]);

      const saved1 = await ProjectService.saveAudioFile(take1Result.audioBuffer, 'take1');
      const saved2 = await ProjectService.saveAudioFile(take2Result.audioBuffer, 'take2');

      const now = Date.now();
      const takes = [
        {
          id: `take_${now}_1`,
          label: 'Take 1',
          audioUrl: saved1.fileUrl,
          createdAt: new Date().toISOString()
        },
        {
          id: `take_${now}_2`,
          label: 'Take 2',
          audioUrl: saved2.fileUrl,
          createdAt: new Date().toISOString()
        }
      ];

      return res.json({
        success: true,
        audioUrl: saved1.fileUrl,
        filename: saved1.filename,
        sizeBytes: take1Result.audioBuffer.length,
        takes
      });
    }

    const ttsResult = await FishAudioService.generateTTS({
      text: text.trim(),
      reference_id: reference_id && reference_id !== 'default_s21_free' ? reference_id : undefined,
      format,
      model,
      speechSpeed: speechSpeed || (prosody && prosody.speed),
      prosody
    });

    const savedFile = await ProjectService.saveAudioFile(ttsResult.audioBuffer, 'chunk');
    const takes = [
      {
        id: `take_${Date.now()}_1`,
        label: 'Take 1',
        audioUrl: savedFile.fileUrl,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      audioUrl: savedFile.fileUrl,
      filename: savedFile.filename,
      sizeBytes: ttsResult.audioBuffer.length,
      takes
    });
  } catch (err: any) {
    logger.error('TTS Generation error:', err.message);
    res.status(err.message.includes('401') ? 401 : err.message.includes('429') ? 429 : 500).json({
      success: false,
      error: err.message || 'TTS generation failed.'
    });
  }
});

export function getLanguagePreviewText(language?: string, voiceName?: string): string {
  const lang = (language || '').toLowerCase();
  if (lang.includes('hindi')) {
    return voiceName
      ? `नमस्ते! मैं ${voiceName} हूँ। यह मेरी आवाज़ का पूर्वावलोकन है। कहानी में आगे क्या हुआ, वह सब कुछ बदल देगा।`
      : `नमस्ते! यह आवाज़ का पूर्वावलोकन है। कहानी में आगे क्या हुआ, वह सब कुछ बदल देगा।`;
  }
  if (lang.includes('urdu')) {
    return voiceName
      ? `السلام علیکم! میں ${voiceName} ہوں۔ یہ میری آواز کا پیش نظارہ ہے۔ کہانی میں آگے کیا ہوا اس نے سب کچھ بدل دیا۔`
      : `السلام علیکم! یہ آواز کا پیش نظارہ ہے۔ کہانی میں آگے کیا ہوا اس نے سب کچھ بدل دیا۔`;
  }
  if (lang.includes('spanish')) {
    return `¡Hola! Esta es una vista previa de la voz. Lo que sucedió después cambiaría todo.`;
  }
  if (lang.includes('french')) {
    return `Bonjour! Ceci est un aperçu vocal. Ce qui s'est passé ensuite allait tout changer.`;
  }
  if (lang.includes('german')) {
    return `Hallo! Dies ist eine Hörprobe der Stimme. Was als Nächstes geschah, sollte alles verändern.`;
  }
  if (lang.includes('japanese')) {
    return `こんにちは！これは音声のプレビューです。その後に起こったことがすべてを変えることになります。`;
  }
  if (lang.includes('arabic')) {
    return `مرحباً! هذه معاينة للصوت. ما حدث بعد ذلك سيغير كل شيء.`;
  }
  if (lang.includes('chinese')) {
    return `你好！这是声音预览。接下来发生的事情将改变一切。`;
  }
  if (lang.includes('portuguese')) {
    return `Olá! Esta é uma prévia da voz. O que aconteceu a seguir mudaria tudo.`;
  }
  if (lang.includes('russian')) {
    return `Здравствуйте! Это предварительный просмотр голоса. То, что произошло дальше, изменило всё.`;
  }
  if (lang.includes('italian')) {
    return `Ciao! Questa è un'anteprima della voce. Quello che è successo بعد avrebbe cambiato tutto.`;
  }
  if (lang.includes('korean')) {
    return `안녕하세요! 이것은 음성 미리보기입니다. 다음에 일어난 일은 모든 것을 바꿀 것입니다.`;
  }
  return "Welcome to today's story. What happened next would change everything.";
}

/**
 * POST /api/tts/preview
 * Generates voice preview in the voice's native language
 */
router.post('/tts/preview', async (req: Request, res: Response) => {
  try {
    const { reference_id, previewText, speechSpeed, format = 'mp3', language, voiceName } = req.body;

    // 1. Check if it's a custom cloned voice that already has a stored previewAudioUrl
    const customVoices = await VoiceStorageService.getCustomVoices().catch(() => []);
    const matchedCustom = customVoices.find((v) => v.id === reference_id);

    if (matchedCustom?.previewAudioUrl) {
      return res.json({
        success: true,
        audioUrl: matchedCustom.previewAudioUrl
      });
    }

    // 2. Determine voice language
    let effectiveLang = language || matchedCustom?.language;
    if (!effectiveLang && reference_id) {
      if (reference_id.startsWith('hi-') || reference_id.includes('Hindi')) effectiveLang = 'Hindi';
      else if (reference_id.startsWith('ur-') || reference_id.includes('Urdu')) effectiveLang = 'Urdu';
      else if (reference_id.startsWith('es-')) effectiveLang = 'Spanish';
      else if (reference_id.startsWith('fr-')) effectiveLang = 'French';
      else if (reference_id.startsWith('de-')) effectiveLang = 'German';
      else if (reference_id.startsWith('ja-')) effectiveLang = 'Japanese';
      else if (reference_id.startsWith('ar-')) effectiveLang = 'Arabic';
      else if (reference_id.startsWith('zh-')) effectiveLang = 'Chinese';
      else if (reference_id.startsWith('pt-')) effectiveLang = 'Portuguese';
      else if (reference_id.startsWith('ru-')) effectiveLang = 'Russian';
      else if (reference_id.startsWith('it-')) effectiveLang = 'Italian';
      else if (reference_id.startsWith('ko-')) effectiveLang = 'Korean';
    }

    const text = previewText || getLanguagePreviewText(effectiveLang, voiceName || matchedCustom?.name);

    if (OpenSourceTtsService.isOpenSourceVoice(reference_id)) {
      const osResult = await OpenSourceTtsService.generateTTS({
        text,
        voiceId: reference_id,
        speechSpeed: speechSpeed || 1.0,
        format
      });

      const savedFile = await ProjectService.saveAudioFile(osResult.audioBuffer, 'preview_os');

      if (matchedCustom && !matchedCustom.previewAudioUrl) {
        matchedCustom.previewAudioUrl = savedFile.fileUrl;
        await VoiceStorageService.saveCustomVoice(matchedCustom).catch(() => {});
      }

      return res.json({
        success: true,
        audioUrl: savedFile.fileUrl
      });
    }

    const ttsResult = await FishAudioService.generateTTS({
      text,
      reference_id: reference_id && reference_id !== 'default_s21_free' ? reference_id : undefined,
      format,
      speechSpeed
    });

    const savedFile = await ProjectService.saveAudioFile(ttsResult.audioBuffer, 'preview');

    if (matchedCustom && !matchedCustom.previewAudioUrl) {
      matchedCustom.previewAudioUrl = savedFile.fileUrl;
      await VoiceStorageService.saveCustomVoice(matchedCustom).catch(() => {});
    }

    res.json({
      success: true,
      audioUrl: savedFile.fileUrl
    });
  } catch (err: any) {
    logger.error('Voice Preview error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate voice preview.'
    });
  }
});

/**
 * POST /api/tts/regenerate
 * Regenerates audio for a single chunk
 */
router.post('/tts/regenerate', async (req: Request, res: Response) => {
  try {
    const { chunkId, text, reference_id, speechSpeed, format = 'mp3' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for regeneration.' });
    }

    if (OpenSourceTtsService.isOpenSourceVoice(reference_id)) {
      const osResult = await OpenSourceTtsService.generateTTS({
        text: text.trim(),
        voiceId: reference_id,
        speechSpeed: speechSpeed || 1.0,
        format,
        takeIndex: 2
      });

      const savedFile = await ProjectService.saveAudioFile(osResult.audioBuffer, `regen_${chunkId || 'chunk'}`);
      const newTake = {
        id: `take_${Date.now()}_regen`,
        label: 'New Take',
        audioUrl: savedFile.fileUrl,
        durationSec: osResult.duration,
        createdAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        take: newTake
      });
    }

    const ttsResult = await FishAudioService.generateTTS({
      text: text.trim(),
      reference_id: reference_id && reference_id !== 'default_s21_free' ? reference_id : undefined,
      format,
      speechSpeed
    });

    const savedFile = await ProjectService.saveAudioFile(ttsResult.audioBuffer, `regen_${chunkId || 'chunk'}`);
    const newTake = {
      id: `take_${Date.now()}_regen`,
      label: 'New Take',
      audioUrl: savedFile.fileUrl,
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      take: newTake
    });
  } catch (err: any) {
    logger.error('Audio chunk regeneration failed:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Chunk regeneration failed.'
    });
  }
});

export default router;
