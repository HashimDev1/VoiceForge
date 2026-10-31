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
import { TranscriptionStorageService } from '../services/transcriptionStorageService';
import { ScriptConversionService } from '../services/scriptConversionService';
import { ReferenceAlignmentService } from '../services/referenceAlignmentService';
import { TranscriptExportHelper } from '../utils/transcriptExportHelper';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import {
  VoiceTranslationProject,
  TranscriptionProject,
  TranscriptionSegment,
  ScriptChoice,
  TranscriptionExportFormat,
  ReferenceScriptFormat,
  AlignmentReviewItem,
  ReviewResolutionState
} from '../../../shared/src/types';

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

// ==========================================
// Voiceover Transcription Studio Endpoints
// ==========================================

/**
 * POST /api/translation/transcribe
 * Performs automatic language detection and timestamped transcription
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const {
      filename,
      originalName,
      mediaType,
      languageCode,
      scriptChoice,
      originalScript,
      scriptFormat
    } = req.body;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, error: 'A media filename is required.' });
    }

    const mediaPath = path.join(config.storageDir, filename);
    if (!fs.existsSync(mediaPath)) {
      return res.status(404).json({ success: false, error: `Media file not found on server: ${filename}` });
    }

    const isVideo = mediaType === 'video' || ['.mp4', '.mov', '.webm', '.mkv'].includes(path.extname(filename).toLowerCase());

    // Extract audio stream if video
    let audioPath = mediaPath;
    let tempExtractedAudio: string | null = null;
    if (isVideo) {
      const extName = `extracted_asr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`;
      tempExtractedAudio = path.join(config.storageDir, extName);
      audioPath = await FFmpegHelper.extractAudio(mediaPath, tempExtractedAudio);
    }

    const audioBuffer = await fs.promises.readFile(audioPath);
    const mediaDuration = await FFmpegHelper.getMediaDuration(mediaPath);

    // Run speech recognition with automatic language detection
    const asrResult = await SpeechRecognitionService.transcribeAudio(
      audioBuffer,
      originalName || filename,
      languageCode
    );

    if (tempExtractedAudio && fs.existsSync(tempExtractedAudio)) {
      await fs.promises.unlink(tempExtractedAudio).catch(() => {});
    }

    if (asrResult.error && (!asrResult.segments || asrResult.segments.length === 0)) {
      return res.status(422).json({
        success: false,
        error: asrResult.error
      });
    }

    const detectedCode = (asrResult.language_code || 'en').toLowerCase();
    const detectedName = asrResult.language || 'English';
    const isHindiOrUrdu = ['hi', 'ur'].includes(detectedCode);

    // Apply Hindi/Urdu script conversion if requested
    let finalSegments = asrResult.segments || [];
    const chosenScript: ScriptChoice = scriptChoice || 'original';
    if (isHindiOrUrdu && chosenScript !== 'original') {
      finalSegments = ScriptConversionService.convertTranscriptSegments(
        finalSegments,
        chosenScript,
        detectedCode
      );
    }

    // Apply Reference-Guided Transcription if original script is provided
    let reviewItems: AlignmentReviewItem[] = [];
    let detectedFormat: ReferenceScriptFormat | undefined = undefined;
    let omittedPassages: string[] = [];

    if (typeof originalScript === 'string' && originalScript.trim().length > 0) {
      const alignment = ReferenceAlignmentService.alignTranscriptWithReference({
        recognizedSegments: finalSegments,
        referenceScript: originalScript.trim(),
        scriptFormat: scriptFormat || 'auto',
        detectedLanguageCode: detectedCode
      });

      finalSegments = alignment.alignedSegments;
      reviewItems = alignment.reviewItems;
      detectedFormat = alignment.detectedScriptFormat;
      omittedPassages = alignment.omittedReferencePassages;
    }

    const mins = Math.floor(mediaDuration / 60);
    const secs = Math.floor(mediaDuration % 60);
    const durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const projectId = `trans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newProject: TranscriptionProject = {
      id: projectId,
      filename,
      originalName: originalName || filename,
      mediaUrl: `/api/audio/file/${filename}`,
      mediaType: isVideo ? 'video' : 'audio',
      duration: mediaDuration > 0 ? mediaDuration : (asrResult.duration || 0),
      durationFormatted,
      detectedLanguage: detectedName,
      detectedLanguageCode: detectedCode,
      confidenceScore: asrResult.language_probability,
      isAmbiguousHindiUrdu: Boolean(asrResult.is_ambiguous_hindi_urdu || isHindiOrUrdu),
      selectedScript: chosenScript,
      userCorrectedLanguage: languageCode || undefined,
      segments: finalSegments,
      originalScript: originalScript ? originalScript.trim() : undefined,
      originalScriptFormat: scriptFormat || 'auto',
      detectedScriptFormat: detectedFormat,
      reviewItems: reviewItems.length > 0 ? reviewItems : undefined,
      omittedReferencePassages: omittedPassages.length > 0 ? omittedPassages : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await TranscriptionStorageService.saveProject(newProject);
    res.json({ success: true, project: saved });
  } catch (error: any) {
    logger.error('Transcription error:', error);
    res.status(500).json({ success: false, error: error.message || 'Transcription processing failed.' });
  }
});

/**
 * POST /api/translation/detect-script
 * Detects whether reference text is Devanagari, Urdu script, Roman Urdu, or English
 */
router.post('/detect-script', (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const detected = ReferenceAlignmentService.detectScriptFormat(text || '');
    res.json({ success: true, detectedFormat: detected });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/translation/transcription-projects/:id/resolve-review
 * Resolves one or all review items without corrupting audio timestamps
 */
router.post('/transcription-projects/:id/resolve-review', async (req: Request, res: Response) => {
  try {
    const { reviewItemId, action, editedText, acceptAll } = req.body;
    const project = await TranscriptionStorageService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (acceptAll) {
      const resolved = ReferenceAlignmentService.acceptAllCorrections({
        segments: project.segments,
        reviewItems: project.reviewItems || []
      });
      project.segments = resolved.segments;
      project.reviewItems = resolved.reviewItems;
    } else if (reviewItemId && action) {
      const resolved = ReferenceAlignmentService.resolveReviewItem({
        segments: project.segments,
        reviewItems: project.reviewItems || [],
        reviewItemId,
        action,
        editedText
      });
      project.segments = resolved.segments;
      project.reviewItems = resolved.reviewItems;
    }

    project.updatedAt = new Date().toISOString();
    const saved = await TranscriptionStorageService.saveProject(project);
    res.json({ success: true, project: saved });
  } catch (error: any) {
    logger.error('Resolve review error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/translation/convert-script
 * Converts transcription segments between Devanagari and Roman Urdu
 */
router.post('/convert-script', async (req: Request, res: Response) => {
  try {
    const { projectId, scriptChoice } = req.body;

    if (!projectId || !scriptChoice) {
      return res.status(400).json({ success: false, error: 'Project ID and scriptChoice are required.' });
    }

    const project = await TranscriptionStorageService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Transcription project not found.' });
    }

    const langCode = project.detectedLanguageCode || 'hi';
    const converted = ScriptConversionService.convertTranscriptSegments(
      project.segments,
      scriptChoice as ScriptChoice,
      langCode
    );

    project.segments = converted;
    project.selectedScript = scriptChoice;
    const saved = await TranscriptionStorageService.saveProject(project);

    res.json({ success: true, project: saved });
  } catch (error: any) {
    logger.error('Script conversion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/translation/transcription-projects/:id/segments
 * Updates transcript segments without modifying timestamps
 */
router.put('/transcription-projects/:id/segments', async (req: Request, res: Response) => {
  try {
    const { segments } = req.body;

    if (!Array.isArray(segments)) {
      return res.status(400).json({ success: false, error: 'Segments array is required.' });
    }

    const updated = await TranscriptionStorageService.updateSegments(req.params.id, segments);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Transcription project not found.' });
    }

    res.json({ success: true, project: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/translation/transcription-projects
 * Lists all transcription projects
 */
router.get('/transcription-projects', async (req: Request, res: Response) => {
  try {
    const projects = await TranscriptionStorageService.getAllProjects();
    res.json({ success: true, projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/translation/transcription-projects/:id
 * Retrieves single transcription project
 */
router.get('/transcription-projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await TranscriptionStorageService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Transcription project not found.' });
    }
    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/translation/transcription-projects/:id/export/:format
 * Downloads transcript formatted as TXT, SRT, VTT, or JSON
 */
router.get('/transcription-projects/:id/export/:format', async (req: Request, res: Response) => {
  try {
    const { id, format } = req.params;
    const project = await TranscriptionStorageService.getProjectById(id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Transcription project not found.' });
    }

    const baseName = sanitizeFilename(path.basename(project.originalName, path.extname(project.originalName))) || 'transcript';
    const fmt = (format || 'txt').toLowerCase();

    if (fmt === 'srt') {
      const srtContent = TranscriptExportHelper.toSrt(project.segments);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.srt"`);
      return res.send(srtContent);
    }

    if (fmt === 'vtt') {
      const vttContent = TranscriptExportHelper.toVtt(project.segments, project.originalName);
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.vtt"`);
      return res.send(vttContent);
    }

    if (fmt === 'json') {
      const jsonContent = TranscriptExportHelper.toJson(project);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.json"`);
      return res.send(jsonContent);
    }

    // Default to timestamped TXT
    const txtContent = TranscriptExportHelper.toTxt(project.segments, project.originalName);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.txt"`);
    return res.send(txtContent);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/translation/transcription-projects/:id
 * Deletes a transcription project
 */
router.delete('/transcription-projects/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await TranscriptionStorageService.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Transcription project not found.' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
