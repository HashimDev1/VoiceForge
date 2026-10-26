import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for speech transcription
});

/**
 * POST /api/asr/transcribe
 * Transcribes uploaded audio file or recorded voice to text using SpeechRecognitionService
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

    const result = await SpeechRecognitionService.transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'recording.mp3',
      language
    );

    let detectedLang = result.language || 'English';
    let detectedCode = result.language_code || 'en';

    // Script-based language detection on transcribed text
    const textSample = result.text || '';
    if (/[\u0900-\u097F]/.test(textSample)) {
      detectedLang = 'Hindi';
      detectedCode = 'hi';
    } else if (/[\u0600-\u06FF]/.test(textSample)) {
      detectedLang = 'Urdu';
      detectedCode = 'ur';
    } else if (/[\u3040-\u30FF]/.test(textSample)) {
      detectedLang = 'Japanese';
      detectedCode = 'ja';
    } else if (/[\u4E00-\u9FFF]/.test(textSample)) {
      detectedLang = 'Chinese';
      detectedCode = 'zh';
    } else if (/[\uAC00-\uD7AF]/.test(textSample)) {
      detectedLang = 'Korean';
      detectedCode = 'ko';
    } else {
      // Map common codes to full language names
      const langMap: Record<string, string> = {
        'hi': 'Hindi',
        'hindi': 'Hindi',
        'ur': 'Urdu',
        'urdu': 'Urdu',
        'es': 'Spanish',
        'spanish': 'Spanish',
        'fr': 'French',
        'french': 'French',
        'de': 'German',
        'german': 'German',
        'ja': 'Japanese',
        'japanese': 'Japanese',
        'ar': 'Arabic',
        'arabic': 'Arabic',
        'zh': 'Chinese',
        'chinese': 'Chinese',
        'pt': 'Portuguese',
        'portuguese': 'Portuguese',
        'ru': 'Russian',
        'russian': 'Russian',
        'it': 'Italian',
        'italian': 'Italian',
        'ko': 'Korean',
        'korean': 'Korean',
        'en': 'English',
        'english': 'English'
      };
      const key = detectedLang.toLowerCase().trim();
      if (langMap[key]) {
        detectedLang = langMap[key];
      }
    }

    res.json({
      success: true,
      text: result.text || '',
      duration: result.duration,
      language: detectedLang,
      language_code: detectedCode,
      segments: result.segments || [],
      provider: result.provider
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
