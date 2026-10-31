import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { FlowAccountService } from '../services/flowAccountService';
import { FlowSchedulerService } from '../services/flowSchedulerService';
import { FlowStorageService } from '../services/flowStorageService';
import { FlowIntegrationAdapter } from '../services/flowIntegrationAdapter';
import { FlowSessionService } from '../services/flowSessionService';
import { FlowCreateJobPayload, FlowSaveSessionPayload, FlowBulkImportSessionsPayload } from '../../../shared/src/types';
import { logger } from '../utils/logger';

const router = Router();

const upload = multer({
  dest: FlowStorageService.tempDir,
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB video limit
});

/**
 * GET /api/flow/overview
 * Central dashboard stats, Chrome info, accounts, and jobs
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { accounts, chrome } = await FlowAccountService.getOverviewData();
    const jobs = await FlowSchedulerService.getAllJobs();

    const stats = {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === 'ready' || a.status === 'in_use').length,
      totalJobs: jobs.length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      pendingJobs: jobs.filter((j) => j.status === 'pending').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      needsAttentionJobs: jobs.filter((j) => j.status === 'needs_attention').length
    };

    return res.json({
      accounts,
      jobs,
      stats,
      chrome
    });
  } catch (err: any) {
    logger.error('Failed to get Flow Studio overview:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve overview' });
  }
});

/**
 * GET /api/flow/accounts
 * List all 10 configured accounts
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await FlowAccountService.getAccounts();
    return res.json({ accounts });
  } catch (err: any) {
    logger.error('Failed to get Flow accounts:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve accounts' });
  }
});

/**
 * PUT /api/flow/accounts/:id
 * Update account settings (friendly name, profile, priority, notes)
 */
router.put('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, profileDirectory, customUserDataDir, priority, status } = req.body;

    const updated = await FlowAccountService.updateAccount(id, {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(profileDirectory !== undefined && { profileDirectory: String(profileDirectory).trim() }),
      ...(customUserDataDir !== undefined && { customUserDataDir: String(customUserDataDir).trim() }),
      ...(priority !== undefined && { priority: Number(priority) }),
      ...(status !== undefined && { status })
    });

    return res.json({ success: true, account: updated });
  } catch (err: any) {
    logger.error(`Failed to update account ${req.params.id}:`, err);
    return res.status(400).json({ error: err.message || 'Failed to update account' });
  }
});

/**
 * POST /api/flow/accounts/:id/launch-chrome
 * Open Chrome directly with the isolated profile for user authentication or manual review
 */
router.post('/accounts/:id/launch-chrome', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetUrl } = req.body;
    const result = await FlowAccountService.launchChromeProfile(id, targetUrl);
    return res.json(result);
  } catch (err: any) {
    logger.error(`Failed to launch Chrome for ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to launch Chrome' });
  }
});

/**
 * POST /api/flow/accounts/:id/check-status
 * Non-invasive verification of Chrome profile directory
 */
router.post('/accounts/:id/check-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await FlowAccountService.checkAccountStatus(id);
    return res.json({ success: true, account });
  } catch (err: any) {
    logger.error(`Failed to check status for ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to verify profile status' });
  }
});

/**
 * POST /api/flow/accounts/:id/session
 * Save session cookies or auth token for a specific Flow account
 */
router.post('/accounts/:id/session', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload: FlowSaveSessionPayload = req.body;
    const updated = await FlowSessionService.saveAccountSession(id, payload);
    return res.json({ success: true, account: updated });
  } catch (err: any) {
    logger.error(`Failed to save session for ${req.params.id}:`, err);
    return res.status(400).json({ error: err.message || 'Failed to save session' });
  }
});

/**
 * POST /api/flow/accounts/:id/verify-session
 * Test probe connection to Google Flow / VideoFX with saved session
 */
router.post('/accounts/:id/verify-session', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await FlowSessionService.verifyAccountSession(id);
    return res.json(result);
  } catch (err: any) {
    logger.error(`Failed to verify session for ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to verify session' });
  }
});

/**
 * DELETE /api/flow/accounts/:id/session
 * Disconnect and remove saved session from account
 */
router.delete('/accounts/:id/session', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await FlowSessionService.clearAccountSession(id);
    return res.json({ success: true, account });
  } catch (err: any) {
    logger.error(`Failed to clear session for ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to clear session' });
  }
});

/**
 * POST /api/flow/accounts/bulk-sessions
 * Bulk import multiple sessions across account slots
 */
router.post('/accounts/bulk-sessions', async (req: Request, res: Response) => {
  try {
    const payload: FlowBulkImportSessionsPayload = req.body;
    const result = await FlowSessionService.importBulkSessions(payload);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error('Failed to bulk import Flow sessions:', err);
    return res.status(400).json({ error: err.message || 'Failed to bulk import sessions' });
  }
});

/**
 * GET /api/flow/accounts/export-sessions
 * Export all saved sessions as portable JSON
 */
router.get('/accounts/export-sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await FlowSessionService.exportSessions();
    return res.json({ success: true, count: sessions.length, sessions });
  } catch (err: any) {
    logger.error('Failed to export Flow sessions:', err);
    return res.status(500).json({ error: err.message || 'Failed to export sessions' });
  }
});

/**
 * GET /api/flow/jobs
 * List all video and image generation jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await FlowSchedulerService.getAllJobs();
    return res.json({ jobs });
  } catch (err: any) {
    logger.error('Failed to get Flow jobs:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve jobs' });
  }
});

/**
 * GET /api/flow/jobs/:id
 * Retrieve details and status of a specific job
 */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await FlowSchedulerService.getJobById(id);
    if (!job) {
      return res.status(404).json({ error: `Job ${id} not found.` });
    }
    return res.json({ success: true, job });
  } catch (err: any) {
    logger.error(`Failed to get Flow job ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve job' });
  }
});

/**
 * POST /api/flow/jobs
 * Submit a new generation job
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const payload: FlowCreateJobPayload = req.body;
    if (!payload.prompt || !payload.prompt.trim()) {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    const job = await FlowSchedulerService.createJob(payload);
    return res.status(201).json({ success: true, job });
  } catch (err: any) {
    logger.error('Failed to create Flow job:', err);
    return res.status(400).json({ error: err.message || 'Failed to queue job' });
  }
});

/**
 * POST /api/flow/jobs/batch
 * Submit multiple scene generation jobs in bulk from a script
 */
router.post('/jobs/batch', async (req: Request, res: Response) => {
  try {
    const { jobs: rawJobs } = req.body;
    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
      return res.status(400).json({ error: 'Array of jobs is required.' });
    }

    const created = await FlowSchedulerService.createBatchJobs(rawJobs);
    return res.status(201).json({ success: true, count: created.length, jobs: created });
  } catch (err: any) {
    logger.error('Failed to create batch Flow jobs:', err);
    return res.status(400).json({ error: err.message || 'Failed to queue batch jobs' });
  }
});

/**
 * POST /api/flow/jobs/:id/retry
 * Retry a failed or interrupted job
 */
router.post('/jobs/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await FlowSchedulerService.retryJob(id);
    return res.json({ success: true, job });
  } catch (err: any) {
    logger.error(`Failed to retry job ${req.params.id}:`, err);
    return res.status(400).json({ error: err.message || 'Failed to retry job' });
  }
});

/**
 * POST /api/flow/jobs/:id/resume
 * Resume a job that paused in 'needs_attention'
 */
router.post('/jobs/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await FlowSchedulerService.resumeJob(id);
    return res.json({ success: true, job });
  } catch (err: any) {
    logger.error(`Failed to resume job ${req.params.id}:`, err);
    return res.status(400).json({ error: err.message || 'Failed to resume job' });
  }
});

/**
 * POST /api/flow/jobs/:id/cancel
 * Cancel a pending or running job
 */
router.post('/jobs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await FlowSchedulerService.cancelJob(id);
    return res.json({ success: true, job });
  } catch (err: any) {
    logger.error(`Failed to cancel job ${req.params.id}:`, err);
    return res.status(400).json({ error: err.message || 'Failed to cancel job' });
  }
});

/**
 * POST /api/flow/jobs/:id/import-result
 * Manually upload or import a completed video file for a job
 */
router.post('/jobs/:id/import-result', upload.single('video'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided for import.' });
    }

    const job = await FlowIntegrationAdapter.completeJobWithVideo(
      id,
      req.file.path
    );

    // Remove temp file
    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    return res.json({ success: true, job });
  } catch (err: any) {
    logger.error(`Failed to import video for ${req.params.id}:`, err);
    if (req.file && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    return res.status(400).json({ error: err.message || 'Failed to import video' });
  }
});

/**
 * DELETE /api/flow/jobs/:id
 * Delete job and its media
 */
router.delete('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await FlowSchedulerService.deleteJob(id);
    return res.json({ success: true, message: `Job ${id} deleted.` });
  } catch (err: any) {
    logger.error(`Failed to delete job ${req.params.id}:`, err);
    return res.status(400).json({ error: err.message || 'Failed to delete job' });
  }
});

/**
 * GET /api/flow/videos
 * Centralized gallery of completed videos
 */
router.get('/videos', async (req: Request, res: Response) => {
  try {
    const jobs = await FlowSchedulerService.getAllJobs();
    const completed = jobs
      .filter((j) => j.status === 'completed' && j.videoUrl)
      .sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime());

    return res.json({
      total: completed.length,
      videos: completed
    });
  } catch (err: any) {
    logger.error('Failed to get completed videos:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve video gallery' });
  }
});

/**
 * GET /api/flow/images
 * Centralized gallery of generated Flow images
 */
router.get('/images', async (_req: Request, res: Response) => {
  try {
    const rawImages = await FlowStorageService.readJsonFile<any[]>(FlowStorageService.imagesFilePath, []);
    const imagesWithUrls = rawImages.map((img) => ({
      ...img,
      imageUrl: `/api/flow/image-file/${img.filename}`
    }));

    return res.json({
      total: imagesWithUrls.length,
      images: imagesWithUrls
    });
  } catch (err: any) {
    logger.error('Failed to get Flow images:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve image gallery' });
  }
});

/**
 * GET /api/flow/image-file/:filename
 * Secure streaming/serving of generated Flow image files
 */
router.get('/image-file/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = FlowStorageService.getSafeImagePath(filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.svg'
        ? 'image/svg+xml'
        : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    logger.error(`Error serving image ${req.params.filename}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to serve image' });
  }
});

/**
 * DELETE /api/flow/images/:id
 * Delete a generated image and its file from storage
 */
router.delete('/images/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const images = await FlowStorageService.readJsonFile<any[]>(FlowStorageService.imagesFilePath, []);
    const target = images.find((img) => img.id === id);

    if (target && target.filename) {
      try {
        const filePath = FlowStorageService.getSafeImagePath(target.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        logger.warn(`Could not unlink image file: ${target.filename}`);
      }
    }

    const filtered = images.filter((img) => img.id !== id);
    await FlowStorageService.writeJsonFile(FlowStorageService.imagesFilePath, filtered);

    return res.json({ success: true, message: `Image ${id} deleted.` });
  } catch (err: any) {
    logger.error(`Error deleting image ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to delete image' });
  }
});

/**
 * GET /api/flow/video-file/:filename
 * Secure streaming of video files with HTTP 206 partial content (Range requests)
 */
router.get('/video-file/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = FlowStorageService.getSafeVideoPath(filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    logger.error('Error streaming video file:', err);
    return res.status(500).json({ error: 'Failed to stream video' });
  }
});

/**
 * POST /api/flow/generate-image
 * Submit genuine Google Flow Pro image generation job
 */
router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '16:9', selectionMode = 'auto', accountId } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const job = await FlowSchedulerService.createJob({
      prompt: prompt.trim(),
      mediaType: 'image',
      selectionMode: selectionMode || 'auto',
      accountId,
      settings: {
        aspectRatio: aspectRatio as any
      }
    });

    return res.status(201).json({
      success: true,
      jobId: job.id,
      mediaId: job.id,
      job
    });
  } catch (err: any) {
    logger.error('Error in /api/flow/generate-image:', err);
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

/**
 * POST /api/flow/generate-video
 * Submit genuine Google Flow Pro video generation job
 */
router.post('/generate-video', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = '16:9',
      durationSeconds = 6,
      selectionMode = 'auto',
      accountId
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const job = await FlowSchedulerService.createJob({
      prompt: prompt.trim(),
      mediaType: 'video',
      selectionMode: selectionMode || 'auto',
      accountId,
      settings: {
        aspectRatio: aspectRatio as any,
        durationSeconds: Number(durationSeconds) || 6
      }
    });

    return res.status(201).json({
      success: true,
      jobId: job.id,
      mediaId: job.id,
      job
    });
  } catch (err: any) {
    logger.error('Error in /api/flow/generate-video:', err);
    return res.status(500).json({ error: err.message || 'Video generation failed' });
  }
});

export default router;
