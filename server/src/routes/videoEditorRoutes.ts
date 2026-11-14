import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VideoEditorService } from '../services/videoEditorService';
import { FacelessVideoService } from '../services/facelessVideoService';
import { logger } from '../utils/logger';
import { EditorProject, EditorExportOptions, EditorFrameExportOptions } from '../../../shared/src/videoEditorTypes';

const router = Router();

// Multer storage for uploaded media assets
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = VideoEditorService.getAssetsDir();
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    cb(null, `asset_${Date.now()}_${safeName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500 MB max
});

// ==========================================
// PROJECT ROUTES
// ==========================================

router.get('/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await VideoEditorService.listProjects();
    res.json({ success: true, projects });
  } catch (err: any) {
    logger.error('Error listing projects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await VideoEditorService.getProject(req.params.id);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const project = req.body as EditorProject;
    if (!project || !project.id || !project.name) {
      return res.status(400).json({ success: false, error: 'Valid project object is required.' });
    }
    const saved = await VideoEditorService.saveProject(project);
    res.json({ success: true, project: saved });
  } catch (err: any) {
    logger.error('Error saving project:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await VideoEditorService.deleteProject(req.params.id);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/projects/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const project = await VideoEditorService.duplicateProject(req.params.id);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/projects/:id/verify-assets', async (req: Request, res: Response) => {
  try {
    const project = await VideoEditorService.getProject(req.params.id);
    const result = await VideoEditorService.verifyProjectAssets(project);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// MEDIA UPLOAD & ASSETS
// ==========================================

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No media file was uploaded.' });
    }

    const probed = await VideoEditorService.probeMedia(req.file.path, req.file.originalname);
    res.json({ success: true, asset: probed });
  } catch (err: any) {
    logger.error('Media probe/upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/upload-bulk', upload.array('files', 200), async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No media files were uploaded.' });
    }

    // Concurrently probe uploaded media files up to 200 items with safety
    const assets = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const probed = await VideoEditorService.probeMedia(file.path, file.originalname);
        assets.push(probed);
      } catch (err: any) {
        logger.warn(`Failed probing bulk file ${file.originalname}:`, err);
        errors.push(`Failed probing ${file.originalname}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      assets,
      uploadedCount: assets.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    logger.error('Bulk media upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/assets/:filename', (req: Request, res: Response) => {
  const filePath = path.join(VideoEditorService.getAssetsDir(), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Asset file not found.');
  }
  res.sendFile(filePath);
});

// ==========================================
// CUSTOM FONTS & MOTION TEMPLATES
// ==========================================

const fontStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, VideoEditorService.getFontsDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    cb(null, `font_${Date.now()}_${safeName}${ext}`);
  }
});
const uploadFont = multer({ storage: fontStorage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/fonts', async (_req: Request, res: Response) => {
  try {
    const fonts = await VideoEditorService.listFonts();
    res.json({ success: true, fonts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fonts/upload', uploadFont.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Font file is required.' });
    }
    const font = await VideoEditorService.uploadFont(req.file);
    res.json({ success: true, font });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/fonts/:filename', (req: Request, res: Response) => {
  const filePath = path.join(VideoEditorService.getFontsDir(), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Font file not found.');
  }
  res.sendFile(filePath);
});

router.get('/motion-templates', async (_req: Request, res: Response) => {
  try {
    const templates = await VideoEditorService.listMotionTemplates();
    res.json({ success: true, templates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/motion-templates', async (req: Request, res: Response) => {
  try {
    const template = req.body;
    if (!template || !template.name || !template.design) {
      return res.status(400).json({ success: false, error: 'Valid template with design is required.' });
    }
    const saved = await VideoEditorService.saveMotionTemplate(template);
    res.json({ success: true, template: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/motion-templates/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await VideoEditorService.deleteMotionTemplate(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// EXPORT PIPELINE
// ==========================================

router.post('/export', async (req: Request, res: Response) => {
  try {
    const { project, options } = req.body as { project: EditorProject; options: EditorExportOptions };
    if (!project || !project.clips) {
      return res.status(400).json({ success: false, error: 'Valid project is required to export.' });
    }

    const job = await VideoEditorService.startExport(project, options || { resolution: '1080x1920', fps: 30, codec: 'h264' });
    res.json({ success: true, job });
  } catch (err: any) {
    logger.error('Export initiation failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export/status/:jobId', (req: Request, res: Response) => {
  const job = VideoEditorService.getExportJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Export job not found.' });
  }
  res.json({ success: true, job });
});

router.post('/export/cancel/:jobId', (req: Request, res: Response) => {
  const cancelled = VideoEditorService.cancelExport(req.params.jobId);
  res.json({ success: cancelled });
});

router.post('/export-frame', async (req: Request, res: Response) => {
  try {
    const { project, options } = req.body as { project: EditorProject; options: EditorFrameExportOptions };
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project is required.' });
    }
    const result = await VideoEditorService.exportFrame(project, options || { time: 0, format: 'png' });
    res.json(result);
  } catch (err: any) {
    logger.error('Frame export failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to export frame' });
  }
});

router.post('/export-images-zip', async (req: Request, res: Response) => {
  try {
    const { project } = req.body as { project: EditorProject };
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project is required.' });
    }
    const result = await VideoEditorService.exportImagesZip(project);
    res.json(result);
  } catch (err: any) {
    logger.error('Images zip export failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to export images zip' });
  }
});

router.get('/exports/:filename', (req: Request, res: Response) => {
  const filePath = path.join(VideoEditorService.getExportsDir(), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Exported video not found.');
  }
  res.sendFile(filePath);
});

// ==========================================
// AUTO FACELESS VIDEO STUDIO ROUTES
// ==========================================

router.post('/faceless/generate-script', async (req: Request, res: Response) => {
  try {
    const { script, voiceId, style, aspectRatio, captionPreset, customPrompts, projectName } = req.body;
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Valid script text is required.' });
    }

    const result = await FacelessVideoService.generateFromScript({
      script,
      voiceId,
      style: style || 'cinematic',
      aspectRatio: aspectRatio || '9:16',
      captionPreset,
      customPrompts,
      projectName
    });

    res.json(result);
  } catch (err: any) {
    logger.error('Faceless video generation from script failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate faceless video' });
  }
});

router.post('/faceless/generate-from-audio', async (req: Request, res: Response) => {
  try {
    const { audioUrl, transcriptText, style, aspectRatio, captionPreset, customPrompts, projectName } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ success: false, error: 'Audio URL is required.' });
    }

    const result = await FacelessVideoService.generateFromAudio({
      audioUrl,
      transcriptText,
      style: style || 'cinematic',
      aspectRatio: aspectRatio || '9:16',
      captionPreset,
      customPrompts,
      projectName
    });

    res.json(result);
  } catch (err: any) {
    logger.error('Faceless video generation from audio failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate visuals from audio' });
  }
});

router.post('/faceless/preview-prompts', (req: Request, res: Response) => {
  try {
    const { script, style } = req.body;
    if (!script) {
      return res.status(400).json({ success: false, error: 'Script or transcript text is required.' });
    }

    const sentences = FacelessVideoService.breakScriptIntoSentences(script);
    const scenes = sentences.map((sentence, idx) => ({
      index: idx,
      sentence,
      visualPrompt: FacelessVideoService.buildVisualPrompt(sentence, style || 'cinematic')
    }));

    res.json({ success: true, scenes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/faceless/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    styles: [
      { id: 'cinematic', name: 'Cinematic Photorealism', description: '8K photorealistic, 35mm lens, volumetric lighting, Arri Alexa' },
      { id: 'dark_mystery', name: 'Dark Mystery & True Crime', description: 'Moody noir thriller, dramatic shadows, foggy atmospheric haze' },
      { id: 'cyberpunk', name: 'Cyberpunk & Sci-Fi Tech', description: 'Neon glowing cyan and magenta, futuristic cityscape, rainy reflections' },
      { id: 'anime', name: 'Anime & Manga Art', description: 'Makoto Shinkai aesthetic, vibrant sky, detailed illustration' },
      { id: 'pixar_3d', name: '3D Animation (Pixar/Disney)', description: 'Stylized 3D render, warm soft studio lighting, Octane render' },
      { id: 'vintage', name: 'Vintage Documentary', description: '1920s historical photo, Kodak Portra film grain, archival sepia' },
      { id: 'stock_video', name: '4K Stock Video B-Roll', description: 'High-definition real B-roll video footage with smooth drone motion' }
    ],
    aspectRatios: ['9:16', '16:9', '1:1'],
    captionPresets: [
      { id: 'hormozi_bold', name: 'Hormozi Viral Yellow' },
      { id: 'viral_pop', name: 'TikTok Bounce Pop' },
      { id: 'neon_glow', name: 'Cyberpunk Neon Cyan' },
      { id: 'clean_minimal', name: 'Cinematic Minimal Lower Third' }
    ]
  });
});

export default router;
