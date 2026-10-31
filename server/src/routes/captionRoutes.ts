import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { CaptionService } from '../services/captionService';
import { CaptionVideoService, CaptionRenderOptions } from '../services/captionVideoService';
import { TranscriptionSegment } from '../../../shared/src/types';
import { TranscriptExportHelper } from '../utils/transcriptExportHelper';
import { AiCaptionStyler } from '../../../shared/src/aiCaptionStyler';
import { logger } from '../utils/logger';

const router = Router();
const allowedVideoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, callback) => callback(null, `voiceforge-caption-upload-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedVideoExtensions.has(path.extname(file.originalname).toLowerCase())) {
      return callback(new Error('Upload an MP4, MOV, M4V, WEBM, or MKV video.'));
    }
    callback(null, true);
  }
});
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/transcribe-audio', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Audio file is required for captioning.' });
    const maxWords = req.body.max_words === undefined ? 3 : Number(req.body.max_words);
    if (!Number.isFinite(maxWords) || maxWords < 1 || maxWords > 20) {
      return res.status(422).json({ success: false, error: 'Words per caption must be between 1 and 20.' });
    }
    const result = await CaptionService.generateFromAudio(req.file.buffer, req.file.originalname || 'audio.mp3', {
      maxWords: Math.round(maxWords),
      language: req.body.language,
      script: req.body.script === 'urdu_roman' ? 'urdu_roman' : 'original'
    });
    return res.json({ success: true, filename: req.file.originalname, ...result });
  } catch (error: any) {
    logger.error('Caption generation failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Caption generation failed.' });
  }
});

router.post('/transcribe-video', videoUpload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Video file is required.' });
    let settings: CaptionRenderOptions = {};
    try { settings = req.body.settings ? JSON.parse(req.body.settings) : {}; }
    catch { return res.status(400).json({ success: false, error: 'Caption settings must be valid JSON.' }); }
    const maxWords = Number(settings.maxWords ?? 3);
    if (!Number.isFinite(maxWords) || maxWords < 1 || maxWords > 20) return res.status(422).json({ success: false, error: 'Words per caption must be between 1 and 20.' });
    settings.maxWords = Math.round(maxWords);
    settings.language = settings.language || undefined;
    if (settings.language === 'ur_roman' || settings.language === 'hi_roman') settings.script = 'urdu_roman';
    const result = await CaptionVideoService.transcribeVideo(req.file.path, req.file.originalname, settings);
    return res.json({ success: true, originalName: req.file.originalname, ...result });
  } catch (error: any) {
    logger.error('Video transcription failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to transcribe video.' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) await fs.promises.unlink(req.file.path).catch(() => {});
  }
});

router.post('/render-video', videoUpload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Video file is required.' });
    let settings: CaptionRenderOptions = {};
    let segments: TranscriptionSegment[];
    try {
      settings = req.body.settings ? JSON.parse(req.body.settings) : {};
      segments = JSON.parse(req.body.segments || '[]');
    } catch { return res.status(400).json({ success: false, error: 'Caption settings and segments must be valid JSON.' }); }
    if (!Array.isArray(segments)) return res.status(422).json({ success: false, error: 'Caption segments must be a list.' });
    settings.preset = settings.preset || 'doc_white';
    const result = await CaptionVideoService.renderVideo(req.file.path, segments, settings);
    return res.json({ success: true, ...result, total_segments: segments.length, srt: TranscriptExportHelper.toSrt(segments), vtt: TranscriptExportHelper.toVtt(segments, req.file.originalname), detected_language: settings.language || 'auto' });
  } catch (error: any) {
    logger.error('Video caption render failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to render captioned video.' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) await fs.promises.unlink(req.file.path).catch(() => {});
  }
});

router.post('/analyze-style', async (req: Request, res: Response) => {
  try {
    const { segments, total_duration, language } = req.body;
    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ success: false, error: 'Transcription segments are required for style analysis.' });
    }
    const analysis = AiCaptionStyler.analyze(segments, total_duration, language);
    return res.json({ success: true, analysis });
  } catch (error: any) {
    logger.error('Caption AI style analysis failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Style analysis failed.' });
  }
});

router.post('/video', videoUpload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Video file is required.' });
    let settings: CaptionRenderOptions = {};
    if (req.body.settings) {
      try {
        settings = JSON.parse(req.body.settings);
      } catch {
        return res.status(400).json({ success: false, error: 'Caption settings must be valid JSON.' });
      }
    }
    const maxWords = Number(settings.maxWords ?? req.body.max_words ?? 3);
    if (!Number.isFinite(maxWords) || maxWords < 1 || maxWords > 20) {
      return res.status(422).json({ success: false, error: 'Words per caption must be between 1 and 20.' });
    }
    settings.maxWords = Math.round(maxWords);
    settings.language = settings.language || req.body.language || undefined;
    if (settings.language === 'ur_roman' || settings.language === 'hi_roman') settings.script = 'urdu_roman';
    settings.preset = settings.preset || req.body.preset || req.body.style || 'doc_white';

    const result = await CaptionVideoService.generateCaptionedVideo(req.file.path, req.file.originalname, settings);
    return res.json({ success: true, originalName: req.file.originalname, ...result });
  } catch (error: any) {
    logger.error('Video captioning failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to caption video.' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) await fs.promises.unlink(req.file.path).catch(() => {});
  }
});

router.get('/videos/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!/^captioned_[a-zA-Z0-9_-]+\.mp4$/.test(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid captioned video name.' });
    }
    const filePath = path.join(config.storageDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Captioned video not found.' });
    const stat = await fs.promises.stat(filePath);
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');
    if (range) {
      const [startText, endText] = range.replace(/bytes=/, '').split('-');
      const start = Number(startText);
      const end = endText ? Math.min(Number(endText), stat.size - 1) : stat.size - 1;
      if (!Number.isInteger(start) || start < 0 || start > end) return res.status(416).end();
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', end - start + 1);
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', stat.size);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    logger.error('Serve captioned video error:', error);
    return res.status(500).json({ success: false, error: 'Failed to read captioned video.' });
  }
});

router.use((error: any, _req: Request, res: Response, _next: (err?: any) => void) => {
  const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 422;
  return res.status(status).json({ success: false, error: error.message || 'Caption upload failed.' });
});

export default router;
