import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VideoEditorService } from '../services/videoEditorService';
import { logger } from '../utils/logger';
import { EditorProject, EditorExportOptions } from '../../../shared/src/videoEditorTypes';

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

router.get('/exports/:filename', (req: Request, res: Response) => {
  const filePath = path.join(VideoEditorService.getExportsDir(), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Exported video not found.');
  }
  res.sendFile(filePath);
});

export default router;
