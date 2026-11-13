import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { CaptionService } from '../services/captionService';
import { CaptionVideoService, CaptionRenderOptions } from '../services/captionVideoService';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { TranscriptionSegment } from '../../../shared/src/types';
import { TranscriptExportHelper } from '../utils/transcriptExportHelper';
import { AiCaptionStyler } from '../../../shared/src/aiCaptionStyler';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import {
  CaptionError,
  CaptionRequestDiagnostics,
  CaptionStageName,
  classifyUnknownCaptionError
} from '../utils/captionDiagnostics';
import { logger } from '../utils/logger';

const router = Router();
const allowedVideoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const allowedAudioExtensions = new Set(['.mp3', '.wav', '.ogg', '.oga', '.opus', '.m4a', '.mp4', '.aac', '.webm', '.flac']);

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, callback) =>
      callback(
        null,
        `voiceforge-caption-upload-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`
      )
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedVideoExtensions.has(path.extname(file.originalname).toLowerCase())) {
      return callback(new Error('Upload an MP4, MOV, M4V, WEBM, or MKV video.'));
    }
    callback(null, true);
  }
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext && !allowedAudioExtensions.has(ext)) {
      return callback(new Error('Upload a supported audio format (MP3, WAV, M4A, OGG, WEBM, FLAC, AAC).'));
    }
    callback(null, true);
  }
});

function sendCaptionError(
  res: Response,
  diag: CaptionRequestDiagnostics,
  error: unknown,
  fallbackStage: CaptionStageName
): Response {
  const classified = classifyUnknownCaptionError(error, fallbackStage);
  diag.logFailure(classified);
  res.setHeader('X-Request-Id', diag.requestId);
  return res.status(classified.httpStatus).json({
    success: false,
    error: classified.userMessage,
    errorCode: classified.code,
    stage: classified.stage,
    requestId: diag.requestId
  });
}

/**
 * Production-safe Caption Studio readiness endpoint.
 * Reports boolean FFmpeg/libass capabilities and ASR provider configuration without exposing secrets.
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const [ffmpegCaps, asrReadiness] = await Promise.all([
      FFmpegHelper.checkCapabilities(),
      SpeechRecognitionService.getProviderReadiness()
    ]);

    const anyAsrConfigured = Object.values(asrReadiness.providersConfigured).some(Boolean);

    return res.json({
      success: true,
      ready: ffmpegCaps.ffmpegAvailable && ffmpegCaps.subtitlesFilter && anyAsrConfigured,
      runtime: {
        platform: process.platform,
        nodeEnv: process.env.NODE_ENV || config.nodeEnv
      },
      ffmpeg: {
        available: ffmpegCaps.ffmpegAvailable,
        ffprobeAvailable: ffmpegCaps.ffprobeAvailable,
        subtitlesFilter: ffmpegCaps.subtitlesFilter,
        libass: ffmpegCaps.libass,
        libmp3lame: ffmpegCaps.libmp3lame,
        libx264: ffmpegCaps.libx264,
        fontconfigReady: ffmpegCaps.fontconfigReady
      },
      asr: asrReadiness
    });
  } catch (error: any) {
    logger.error('Caption health check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to inspect Caption Studio runtime capabilities.'
    });
  }
});

router.post('/transcribe-audio', audioUpload.single('audio'), async (req: Request, res: Response) => {
  const diag = new CaptionRequestDiagnostics('transcribe-audio');
  res.setHeader('X-Request-Id', diag.requestId);

  try {
    if (!req.file) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Audio file is required for captioning.'
      );
    }

    diag.fileSize = req.file.size;
    const maxWords = req.body.max_words === undefined ? 3 : Number(req.body.max_words);
    if (!Number.isFinite(maxWords) || maxWords < 1 || maxWords > 20) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        422,
        'upload_validation',
        'Words per caption must be between 1 and 20.'
      );
    }

    const result = await CaptionService.generateFromAudio(
      req.file.buffer,
      req.file.originalname || 'audio.mp3',
      {
        maxWords: Math.round(maxWords),
        language: req.body.language,
        script: req.body.script === 'urdu_roman' ? 'urdu_roman' : 'original',
        diagnostics: diag
      }
    );

    diag.logSuccess();
    return res.json({
      success: true,
      requestId: diag.requestId,
      filename: req.file.originalname,
      ...result
    });
  } catch (error: any) {
    return sendCaptionError(res, diag, error, diag.stage);
  }
});

router.post('/transcribe-video', videoUpload.single('video'), async (req: Request, res: Response) => {
  const diag = new CaptionRequestDiagnostics('transcribe-video');
  res.setHeader('X-Request-Id', diag.requestId);

  try {
    if (!req.file) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Video file is required.'
      );
    }

    diag.fileSize = req.file.size;
    let settings: CaptionRenderOptions = {};
    try {
      settings = req.body.settings ? JSON.parse(req.body.settings) : {};
    } catch {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Caption settings must be valid JSON.'
      );
    }

    const maxWords = Number(settings.maxWords ?? 3);
    if (!Number.isFinite(maxWords) || maxWords < 1 || maxWords > 20) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        422,
        'upload_validation',
        'Words per caption must be between 1 and 20.'
      );
    }

    settings.maxWords = Math.round(maxWords);
    settings.language = settings.language || undefined;
    if (settings.language === 'ur_roman' || settings.language === 'hi_roman') {
      settings.script = 'urdu_roman';
    }
    settings.diagnostics = diag;

    const result = await CaptionVideoService.transcribeVideo(
      req.file.path,
      req.file.originalname,
      settings
    );

    diag.logSuccess();
    return res.json({
      success: true,
      requestId: diag.requestId,
      originalName: req.file.originalname,
      ...result
    });
  } catch (error: any) {
    return sendCaptionError(res, diag, error, diag.stage);
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
});

router.post('/render-video', videoUpload.single('video'), async (req: Request, res: Response) => {
  const diag = new CaptionRequestDiagnostics('render-video');
  res.setHeader('X-Request-Id', diag.requestId);

  try {
    if (!req.file) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Video file is required.'
      );
    }

    diag.fileSize = req.file.size;
    let settings: CaptionRenderOptions = {};
    let segments: TranscriptionSegment[];
    try {
      settings = req.body.settings ? JSON.parse(req.body.settings) : {};
      segments = JSON.parse(req.body.segments || '[]');
    } catch {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Caption settings and segments must be valid JSON.'
      );
    }

    if (!Array.isArray(segments)) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        422,
        'upload_validation',
        'Caption segments must be a list.'
      );
    }

    settings.preset = settings.preset || 'doc_white';
    settings.diagnostics = diag;

    const result = await CaptionVideoService.renderVideo(req.file.path, segments, settings);

    diag.logSuccess();
    return res.json({
      success: true,
      requestId: diag.requestId,
      ...result,
      total_segments: segments.length,
      srt: TranscriptExportHelper.toSrt(segments),
      vtt: TranscriptExportHelper.toVtt(segments, req.file.originalname),
      detected_language: settings.language || 'auto'
    });
  } catch (error: any) {
    return sendCaptionError(
      res,
      diag,
      error,
      diag.stage === 'upload_validation' ? 'upload_validation' : 'subtitle_burn_in'
    );
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
});

router.post('/analyze-style', async (req: Request, res: Response) => {
  try {
    const { segments, total_duration, language } = req.body;
    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'UPLOAD_ERROR',
        error: 'Transcription segments are required for style analysis.'
      });
    }
    const analysis = AiCaptionStyler.analyze(segments, total_duration, language);
    return res.json({ success: true, analysis });
  } catch (error: any) {
    logger.error('Caption AI style analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Style analysis failed.'
    });
  }
});

router.post('/video', videoUpload.single('video'), async (req: Request, res: Response) => {
  const diag = new CaptionRequestDiagnostics('caption-video');
  res.setHeader('X-Request-Id', diag.requestId);

  try {
    if (!req.file) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Video file is required.'
      );
    }

    diag.fileSize = req.file.size;
    let settings: CaptionRenderOptions = {};
    if (req.body.settings) {
      try {
        settings = JSON.parse(req.body.settings);
      } catch {
        throw new CaptionError(
          'UPLOAD_ERROR',
          400,
          'upload_validation',
          'Caption settings must be valid JSON.'
        );
      }
    }

    const maxWords = Number(settings.maxWords ?? req.body.max_words ?? 3);
    if (!Number.isFinite(maxWords) || maxWords < 1 || maxWords > 20) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        422,
        'upload_validation',
        'Words per caption must be between 1 and 20.'
      );
    }

    settings.maxWords = Math.round(maxWords);
    settings.language = settings.language || req.body.language || undefined;
    if (settings.language === 'ur_roman' || settings.language === 'hi_roman') {
      settings.script = 'urdu_roman';
    }
    settings.preset = settings.preset || req.body.preset || req.body.style || 'doc_white';
    settings.diagnostics = diag;

    const result = await CaptionVideoService.generateCaptionedVideo(
      req.file.path,
      req.file.originalname,
      settings
    );

    diag.logSuccess();
    return res.json({
      success: true,
      requestId: diag.requestId,
      originalName: req.file.originalname,
      ...result
    });
  } catch (error: any) {
    return sendCaptionError(res, diag, error, diag.stage);
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
});

router.get('/videos/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!/^captioned_[a-zA-Z0-9_-]+\.mp4$/.test(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid captioned video name.' });
    }
    const filePath = path.join(config.storageDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Captioned video not found.' });
    }
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
  const diag = new CaptionRequestDiagnostics('transcribe-video');
  const isTooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
  const captionErr = new CaptionError(
    isTooLarge ? 'AUDIO_TOO_LARGE' : 'UPLOAD_ERROR',
    isTooLarge ? 413 : 422,
    'upload_validation',
    isTooLarge
      ? 'Uploaded media file exceeds the maximum allowed size.'
      : error?.message || 'Caption media upload failed.'
  );
  diag.logFailure(captionErr);
  res.setHeader('X-Request-Id', diag.requestId);
  return res.status(captionErr.httpStatus).json({
    success: false,
    error: captionErr.userMessage,
    errorCode: captionErr.code,
    stage: captionErr.stage,
    requestId: diag.requestId
  });
});

export default router;
