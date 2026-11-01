import { Router, Request, Response } from 'express';
import { DocumentaryService } from '../services/documentaryService';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/documentary/projects - List all documentary projects
router.get('/projects', (req: Request, res: Response) => {
  try {
    const projects = DocumentaryService.listProjects();
    res.json({ success: true, projects });
  } catch (err: any) {
    logger.error('Failed to list documentary projects:', err);
    res.status(500).json({ error: err.message || 'Failed to list projects' });
  }
});

// GET /api/documentary/projects/:id - Get single project
router.get('/projects/:id', (req: Request, res: Response) => {
  try {
    const project = DocumentaryService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Documentary project not found' });
    }
    res.json({ success: true, project });
  } catch (err: any) {
    logger.error(`Failed to get documentary project ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Failed to retrieve project' });
  }
});

// POST /api/documentary/projects - Create or update documentary project
router.post('/projects', (req: Request, res: Response) => {
  try {
    const docData = req.body;
    if (!docData || !docData.name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const saved = DocumentaryService.saveProject(docData);
    res.json({ success: true, project: saved });
  } catch (err: any) {
    logger.error('Failed to save documentary project:', err);
    res.status(500).json({ error: err.message || 'Failed to save project' });
  }
});

// DELETE /api/documentary/projects/:id - Delete project
router.delete('/projects/:id', (req: Request, res: Response) => {
  try {
    const deleted = DocumentaryService.deleteProject(req.params.id);
    res.json({ success: true, deleted });
  } catch (err: any) {
    logger.error(`Failed to delete documentary project ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Failed to delete project' });
  }
});

// POST /api/documentary/parse-script - Parse raw script into structured scenes
router.post('/parse-script', (req: Request, res: Response) => {
  try {
    const { scriptText } = req.body;
    const scenes = DocumentaryService.parseScript(scriptText || '');
    res.json({ success: true, scenes });
  } catch (err: any) {
    logger.error('Failed to parse script:', err);
    res.status(500).json({ error: err.message || 'Failed to parse script' });
  }
});

// POST /api/documentary/handoff - Compile and hand off to multitrack video editor
router.post('/handoff', async (req: Request, res: Response) => {
  try {
    const docProject = req.body;
    if (!docProject || !docProject.scenes || !Array.isArray(docProject.scenes)) {
      return res.status(400).json({ error: 'Invalid documentary project payload' });
    }
    const result = await DocumentaryService.compileAndHandoff(docProject);
    res.json(result);
  } catch (err: any) {
    logger.error('Failed to hand off documentary project:', err);
    res.status(500).json({ error: err.message || 'Failed to hand off project' });
  }
});

export default router;

