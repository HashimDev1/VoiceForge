import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sanitizeFilename } from '../utils/sanitize';
import { VoiceTranslationPipelineService } from '../services/voiceTranslationPipelineService';
import { YouTubeService } from '../services/youtubeService';
import { VoiceTranslationStorageService } from '../services/voiceTranslationStorageService';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import { VoiceTranslationProject } from '../../../shared/src/types';

const router = Router();

// Configure multer storage directly to temp_storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.storageDir)) {
      fs.mkdirSync(config.storageDir, { recursive: true });
    }
    cb(null, config.storageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `input_${Date.now()}_${safeName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB for video/audio uploads
});

/**
 * POST /api/translation/upload
 * Handles media upload for audio (MP3, WAV, M4A) and video (MP4, MOV)
 */
router.post('/upload', upload.single('media'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No media file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.webm', '.mkv'].includes(ext);
    const filePath = req.file.path;

    const analysis = await VoiceTranslationPipelineService.analyzeSourceMedia(
      filePath,
      req.file.originalname
    );

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        url: `/api/audio/file/${req.file.filename}`,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype
      },
      sourceFileType: isVideo ? 'video' : 'audio',
      analysis
    });
  } catch (error: any) {
    logger.error('Upload handling error:', error);
    res.status(500).json({ success: false, error: error.message || 'File upload failed.' });
  }
});

/**
 * POST /api/translation/import-youtube
 * Downloads YouTube video or audio via yt-dlp
 */
router.post('/import-youtube', async (req: Request, res: Response) => {
  try {
    const { url, downloadVideo } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL is required.' });
    }

    logger.info(`Starting YouTube import: ${url}`);
    const media = await YouTubeService.importYouTubeVideo(url, { downloadVideo: Boolean(downloadVideo) });

    const targetFile = media.videoPath || media.audioPath;
    const isVideo = Boolean(media.videoPath);
    const filename = path.basename(targetFile);

    const analysis = await VoiceTranslationPipelineService.analyzeSourceMedia(targetFile, media.title);

    res.json({
      success: true,
      file: {
        filename,
        url: `/api/audio/file/${filename}`,
        originalName: `${media.title}.${isVideo ? 'mp4' : 'mp3'}`,
        sizeBytes: fs.existsSync(targetFile) ? fs.statSync(targetFile).size : 0
      },
      sourceFileType: isVideo ? 'video' : 'audio',
      analysis
    });
  } catch (error: any) {
    logger.error('YouTube import failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to import YouTube video.' });
  }
});

/**
 * GET /api/translation/projects
 * Lists all translation projects
 */
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await VoiceTranslationStorageService.getAllProjects();
    res.json({ success: true, projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/translation/projects/:id
 * Retrieves single translation project with outputs
 */
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await VoiceTranslationStorageService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }
    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/translation/projects
 * Creates a new translation project and kicks off processing
 */
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const {
      projectName,
      sourceFile,
      sourceFileType,
      sourceLanguage,
      targetLanguages,
      voiceId,
      voiceName,
      duration,
      durationFormatted,
      settings,
      timingMode,
      analysis
    } = req.body;

    if (!sourceFile || !sourceFile.filename) {
      return res.status(400).json({ success: false, error: 'Source file is required.' });
    }

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newProject: VoiceTranslationProject = {
      id: projectId,
      userId: 'user_default',
      projectName: projectName || `Translation - ${sourceFile.originalName || 'Project'}`,
      sourceFile,
      sourceFileType: sourceFileType || 'audio',
      sourceLanguage: sourceLanguage || 'English',
      targetLanguages: Array.isArray(targetLanguages) && targetLanguages.length > 0 ? targetLanguages : ['Spanish'],
      voiceId: voiceId || 'documentary_male',
      voiceName: voiceName || 'Documentary Male',
      duration: duration || 0,
      durationFormatted: durationFormatted || '00:00',
      status: 'uploading',
      settings: settings || {
        voiceSimilarity: 85,
        emotionMatching: 80,
        accentPreservation: 75,
        keepVoiceIdentity: true,
        keepEmotion: true,
        keepPauses: true,
        keepSpeakingStyle: true,
        keepGender: true
      },
      timingMode: timingMode || 'same-duration',
      analysis,
      outputs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await VoiceTranslationStorageService.saveProject(newProject);

    // Run processing asynchronously so request returns immediately with created project
    VoiceTranslationPipelineService.processProject(projectId).catch((err) => {
      logger.error(`Async pipeline error on project ${projectId}:`, err);
    });

    res.json({ success: true, project: saved });
  } catch (error: any) {
    logger.error('Failed to create translation project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/translation/projects/:id
 * Deletes a translation project
 */
router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await VoiceTranslationStorageService.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/translation/projects/:id/outputs/:outputId
 * Deletes a specific translation output
 */
router.delete('/projects/:id/outputs/:outputId', async (req: Request, res: Response) => {
  try {
    const updated = await VoiceTranslationStorageService.deleteOutput(req.params.id, req.params.outputId);
    res.json({ success: true, project: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
