import { Router, Request, Response } from 'express';
import { FishAudioService } from '../services/fishAudioService';
import { OpenSourceTtsService } from '../services/openSourceTtsService';
import { ProjectService } from '../services/projectService';
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

/**
 * POST /api/tts/preview
 * Generates voice preview
 */
router.post('/tts/preview', async (req: Request, res: Response) => {
  try {
    const { reference_id, previewText, speechSpeed, format = 'mp3' } = req.body;
    const text = previewText || "Welcome to today's story. What happened next would change everything.";

    if (OpenSourceTtsService.isOpenSourceVoice(reference_id)) {
      const osResult = await OpenSourceTtsService.generateTTS({
        text,
        voiceId: reference_id,
        speechSpeed: speechSpeed || 1.0,
        format
      });

      const savedFile = await ProjectService.saveAudioFile(osResult.audioBuffer, 'preview_os');
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
