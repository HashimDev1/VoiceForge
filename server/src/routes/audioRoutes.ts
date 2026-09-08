import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ProjectService } from '../services/projectService';
import { AudioMergeService } from '../services/audioMergeService';
import { sanitizeFilename, isPathSafe } from '../utils/sanitize';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/audio/file/:filename
 * Serves generated MP3 file from storage
 */
router.get('/audio/file/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(config.storageDir, filename);

    if (!isPathSafe(config.storageDir, filePath)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    logger.error('Serve audio file error:', err);
    res.status(500).json({ error: 'Failed to read audio file.' });
  }
});

/**
 * POST /api/audio/merge
 * Merges clips with silence pause into a single MP3 file
 */
router.post('/audio/merge', async (req: Request, res: Response) => {
  try {
    const { audioUrls, pauseSec = 0.25, projectName = 'voiceover' } = req.body;

    if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
      return res.status(400).json({ error: 'audioUrls array is required.' });
    }

    const audioBuffers: Buffer[] = [];

    for (const url of audioUrls) {
      // Extract filename from URL e.g. /api/audio/file/chunk_123.mp3
      const filename = path.basename(url);
      const buffer = await ProjectService.getAudioFileBuffer(filename);
      audioBuffers.push(buffer);
    }

    const mergedBuffer = await AudioMergeService.mergeMp3Buffers(audioBuffers, pauseSec);
    const cleanProjectName = sanitizeFilename(projectName);
    const savedFile = await ProjectService.saveAudioFile(mergedBuffer, `merged_${cleanProjectName}`);

    res.json({
      success: true,
      audioUrl: savedFile.fileUrl,
      filename: `${cleanProjectName}_final.mp3`,
      sizeBytes: mergedBuffer.length
    });
  } catch (err: any) {
    logger.error('Audio merge error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to merge audio clips.'
    });
  }
});

/**
 * POST /api/audio/export-zip
 * Bundles all clips + script.txt into a downloadable ZIP file
 */
router.post('/audio/export-zip', async (req: Request, res: Response) => {
  try {
    const { clips, scriptText, projectName = 'voiceover' } = req.body;

    if (!clips || !Array.isArray(clips)) {
      return res.status(400).json({ error: 'Clips array is required.' });
    }

    const clipItems: { filename: string; buffer: Buffer }[] = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (clip.audioUrl) {
        const filename = path.basename(clip.audioUrl);
        const buffer = await ProjectService.getAudioFileBuffer(filename);
        const clipName = `${(i + 1).toString().padStart(2, '0')}_${sanitizeFilename(clip.chapterTitle || 'clip')}.mp3`;
        clipItems.push({ filename: clipName, buffer });
      }
    }

    const zipBuffer = await AudioMergeService.createZipArchive(clipItems, scriptText);
    const cleanProjectName = sanitizeFilename(projectName);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanProjectName}_all_clips.zip"`);
    res.send(zipBuffer);
  } catch (err: any) {
    logger.error('Export ZIP error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate ZIP archive.'
    });
  }
});

export default router;
