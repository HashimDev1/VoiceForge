import { Router, Request, Response } from 'express';
import multer from 'multer';
import { FishAudioService } from '../services/fishAudioService';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for speech transcription
});

/**
 * POST /api/asr/transcribe
 * Transcribes uploaded audio file or recorded voice to text using Fish Audio ASR
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required for transcription.'
      });
    }

    const { language } = req.body;
    logger.info(`Transcribing audio (${req.file.size} bytes, ${req.file.originalname || 'unknown'})...`);

    const result = await FishAudioService.transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'recording.mp3',
      language
    );

    res.json({
      success: true,
      text: result.text || '',
      duration: result.duration,
      language: result.language,
      language_code: result.language_code,
      segments: result.segments || []
    });
  } catch (error: any) {
    logger.error('ASR Transcription failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Speech-to-text transcription failed.'
    });
  }
});

export default router;
