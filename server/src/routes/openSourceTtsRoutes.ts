import { Router, Request, Response } from 'express';
import { OpenSourceTtsService, OPEN_SOURCE_VOICES } from '../services/openSourceTtsService';
import { ProjectService } from '../services/projectService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/open-source-tts/voices
 * Returns all available open-source neural voices (100% free, no API key needed)
 */
router.get('/voices', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'open-source-tts',
    voices: OPEN_SOURCE_VOICES
  });
});

/**
 * POST /api/open-source-tts/generate
 * Standalone endpoint to synthesize speech via Open-Source TTS service
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, voice, voiceId, speechSpeed, pitch, volume, format = 'mp3', numTakes = 1 } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required for Open-Source TTS.' });
    }

    const selectedVoice = voiceId || voice || 'en-US-ChristopherNeural';
    const count = Number(numTakes) === 2 ? 2 : 1;

    if (count === 2) {
      logger.info(`[OpenSourceTts] Generating 2 takes for "${text.trim().slice(0, 30)}..."`);
      const [res1, res2] = await Promise.all([
        OpenSourceTtsService.generateTTS({
          text: text.trim(),
          voiceId: selectedVoice,
          speechSpeed: speechSpeed ? Number(speechSpeed) : 1.0,
          pitch,
          volume,
          format,
          takeIndex: 1
        }),
        OpenSourceTtsService.generateTTS({
          text: text.trim(),
          voiceId: selectedVoice,
          speechSpeed: speechSpeed ? Number(speechSpeed) : 1.0,
          pitch,
          volume,
          format,
          takeIndex: 2
        })
      ]);

      const saved1 = await ProjectService.saveAudioFile(res1.audioBuffer, 'take1_opensource');
      const saved2 = await ProjectService.saveAudioFile(res2.audioBuffer, 'take2_opensource');

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
        service: 'open-source-tts',
        audioUrl: saved1.fileUrl,
        filename: saved1.filename,
        duration: res1.duration,
        sizeBytes: res1.sizeBytes,
        takes
      });
    }

    const result = await OpenSourceTtsService.generateTTS({
      text: text.trim(),
      voiceId: selectedVoice,
      speechSpeed: speechSpeed ? Number(speechSpeed) : 1.0,
      pitch,
      volume,
      format,
      takeIndex: 1
    });

    const savedFile = await ProjectService.saveAudioFile(result.audioBuffer, 'opensource_clip');

    res.json({
      success: true,
      service: 'open-source-tts',
      audioUrl: savedFile.fileUrl,
      filename: savedFile.filename,
      duration: result.duration,
      sizeBytes: result.sizeBytes,
      takes: [
        {
          id: `take_${Date.now()}_1`,
          label: 'Take 1',
          audioUrl: savedFile.fileUrl,
          durationSec: result.duration,
          createdAt: new Date().toISOString()
        }
      ]
    });
  } catch (err: any) {
    logger.error('Open-Source TTS Generation error:', err.message);
    res.status(500).json({
      success: false,
      service: 'open-source-tts',
      error: err.message || 'Open-Source TTS generation failed.'
    });
  }
});

/**
 * POST /api/open-source-tts/preview
 * Standalone preview endpoint for open-source voices
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { voice, voiceId, previewText, speechSpeed, format = 'mp3' } = req.body;
    const text = previewText || "Welcome to today's story. What happened next would change everything.";
    const selectedVoice = voiceId || voice || 'en-US-ChristopherNeural';

    const result = await OpenSourceTtsService.generateTTS({
      text,
      voiceId: selectedVoice,
      speechSpeed: speechSpeed ? Number(speechSpeed) : 1.0,
      format
    });

    const savedFile = await ProjectService.saveAudioFile(result.audioBuffer, 'opensource_preview');

    res.json({
      success: true,
      service: 'open-source-tts',
      audioUrl: savedFile.fileUrl,
      duration: result.duration
    });
  } catch (err: any) {
    logger.error('Open-Source TTS Preview error:', err.message);
    res.status(500).json({
      success: false,
      service: 'open-source-tts',
      error: err.message || 'Failed to generate open-source voice preview.'
    });
  }
});

/**
 * POST /api/open-source-tts/test
 * Health check & verification for the Open-Source TTS service
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const result = await OpenSourceTtsService.testConnection();
    res.json({
      ...result,
      service: 'open-source-tts'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      service: 'open-source-tts',
      message: err.message || 'Open-Source TTS engine check failed.'
    });
  }
});

export default router;
