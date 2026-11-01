import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import util from 'util';
import { config } from '../config';
import { logger } from '../utils/logger';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import {
  EditorProject,
  MediaAsset,
  EditorExportOptions,
  EditorExportJob,
  TimelineClip,
  TimelineTrack,
  ColorGrading
} from '../../../shared/src/videoEditorTypes';
import { createNewProject, ASPECT_RATIOS } from '../../../shared/src/videoEditorDefaults';

const execFileAsync = util.promisify(execFile);

export class VideoEditorService {
  private static projectsDir = path.join(process.cwd(), 'data', 'editor_projects');
  private static assetsDir = path.join(process.cwd(), 'uploads', 'editor_assets');
  private static exportsDir = path.join(process.cwd(), 'uploads', 'editor_exports');
  private static exportJobs: Map<string, EditorExportJob> = new Map();

  /**
   * Initializes storage directories
   */
  public static initStorage(): void {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }
      if (!fs.existsSync(this.assetsDir)) {
        fs.mkdirSync(this.assetsDir, { recursive: true });
      }
      if (!fs.existsSync(this.exportsDir)) {
        fs.mkdirSync(this.exportsDir, { recursive: true });
      }
      logger.info('VideoEditorService storage initialized successfully.');
    } catch (err) {
      logger.error('Failed to initialize VideoEditorService storage:', err);
    }
  }

  public static getAssetsDir(): string {
    return this.assetsDir;
  }

  public static getExportsDir(): string {
    return this.exportsDir;
  }

  // ==========================================
  // PROJECT CRUD
  // ==========================================

  public static async listProjects(): Promise<Array<{
    id: string;
    name: string;
    aspectRatio: string;
    duration: number;
    updatedAt: string;
    clipsCount: number;
    assetsCount: number;
  }>> {
    this.initStorage();
    const files = await fs.promises.readdir(this.projectsDir);
    const result = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.promises.readFile(path.join(this.projectsDir, file), 'utf8');
          const p = JSON.parse(content) as EditorProject;
          result.push({
            id: p.id,
            name: p.name,
            aspectRatio: p.aspectRatio,
            duration: p.duration,
            updatedAt: p.updatedAt,
            clipsCount: p.clips?.length || 0,
            assetsCount: p.assets?.length || 0
          });
        } catch {
          // ignore corrupted files
        }
      }
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public static async getProject(id: string): Promise<EditorProject> {
    this.initStorage();
    const filePath = path.join(this.projectsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Project with ID ${id} not found.`);
    }
    const content = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(content) as EditorProject;
  }

  public static async saveProject(project: EditorProject): Promise<EditorProject> {
    this.initStorage();
    project.updatedAt = new Date().toISOString();
    const filePath = path.join(this.projectsDir, `${project.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(project, null, 2), 'utf8');
    return project;
  }

  public static async deleteProject(id: string): Promise<boolean> {
    this.initStorage();
    const filePath = path.join(this.projectsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  public static async duplicateProject(id: string): Promise<EditorProject> {
    const original = await this.getProject(id);
    const newId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const copy: EditorProject = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.saveProject(copy);
    return copy;
  }

  // ==========================================
  // MEDIA PROBING & ASSET MANAGEMENT
  // ==========================================

  public static async probeMedia(filePath: string, originalFilename: string): Promise<MediaAsset> {
    this.initStorage();
    const ext = path.extname(originalFilename).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(ext);
    const isAudio = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext);
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext);

    const assetId = `asset_${Date.now()}_${randomUUID().slice(0, 6)}`;
    let duration = 0;
    let width: number | undefined;
    let height: number | undefined;
    let fps: number | undefined;
    let thumbnailUrl: string | undefined;

    const stats = await fs.promises.stat(filePath);

    if (isVideo || isAudio) {
      try {
        const ffprobe = await FFmpegHelper.getFfprobePath();
        const { stdout } = await execFileAsync(
          ffprobe,
          [
            '-v', 'error',
            '-show_entries', 'format=duration:stream=width,height,r_frame_rate,codec_type',
            '-of', 'json',
            filePath
          ],
          { maxBuffer: 2 * 1024 * 1024 }
        );
        const data = JSON.parse(stdout);
        duration = parseFloat(data.format?.duration || '0') || 0;

        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        if (videoStream) {
          width = videoStream.width;
          height = videoStream.height;
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            if (den && den > 0) fps = Math.round(num / den);
          }
        }
      } catch (err) {
        logger.warn('ffprobe probe failed, using fallbacks:', err);
      }
    }

    if (isImage) {
      duration = 5.0; // Default 5s still display
      try {
        const ffprobe = await FFmpegHelper.getFfprobePath();
        const { stdout } = await execFileAsync(
          ffprobe,
          ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', filePath],
          { maxBuffer: 1024 * 1024 }
        );
        const data = JSON.parse(stdout);
        const imgStream = data.streams?.[0];
        if (imgStream) {
          width = imgStream.width;
          height = imgStream.height;
        }
      } catch {}
    }

    // Generate video thumbnail frame if video
    if (isVideo && duration > 0) {
      try {
        const ffmpeg = await FFmpegHelper.getFfmpegPath();
        const thumbFilename = `thumb_${assetId}.jpg`;
        const thumbPath = path.join(this.assetsDir, thumbFilename);
        const seek = Math.min(1.0, duration * 0.2);

        await execFileAsync(
          ffmpeg,
          [
            '-y',
            '-ss', seek.toFixed(2),
            '-i', filePath,
            '-vframes', '1',
            '-q:v', '3',
            '-vf', 'scale=320:-1',
            thumbPath
          ],
          { maxBuffer: 5 * 1024 * 1024 }
        );

        if (fs.existsSync(thumbPath)) {
          thumbnailUrl = `/api/editor/assets/${thumbFilename}`;
        }
      } catch (err) {
        logger.warn('Failed to generate thumbnail for video:', err);
      }
    }

    const filename = path.basename(filePath);

    return {
      id: assetId,
      name: originalFilename,
      url: `/api/editor/assets/${filename}`,
      type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
      duration,
      width,
      height,
      fps,
      fileSize: stats.size,
      thumbnailUrl,
      createdAt: new Date().toISOString()
    };
  }

  // ==========================================
  // MULTITRACK FFMPEG COMPOSITOR & EXPORT
  // ==========================================

  public static getExportJob(jobId: string): EditorExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  public static async startExport(
    project: EditorProject,
    options: EditorExportOptions
  ): Promise<EditorExportJob> {
    const jobId = `job_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const job: EditorExportJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      stage: 'Preparing timeline layers...',
      createdAt: new Date().toISOString()
    };

    this.exportJobs.set(jobId, job);

    // Run export in background asynchronously
    this.executeExport(jobId, project, options).catch((err) => {
      logger.error(`Export failed for job ${jobId}:`, err);
      const j = this.exportJobs.get(jobId);
      if (j) {
        j.status = 'failed';
        j.error = err.message || 'Unknown export rendering error';
      }
    });

    return job;
  }

  private static async executeExport(
    jobId: string,
    project: EditorProject,
    options: EditorExportOptions
  ): Promise<void> {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.status = 'rendering';
    job.progress = 5;
    job.stage = 'Validating assets & timeline...';

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-video-export-'));
    const outputFilename = `export_${Date.now()}_${randomUUID().slice(0, 6)}.mp4`;
    const outputPath = path.join(this.exportsDir, outputFilename);

    try {
      const ffmpeg = await FFmpegHelper.getFfmpegPath();
      const defaultAspect = ASPECT_RATIOS.find((r) => r.id === project.aspectRatio) || ASPECT_RATIOS[0];

      let targetWidth = defaultAspect.width;
      let targetHeight = defaultAspect.height;

      if (options.resolution === '720p') {
        if (project.aspectRatio === '9:16') {
          targetWidth = 720;
          targetHeight = 1280;
        } else if (project.aspectRatio === '16:9') {
          targetWidth = 1280;
          targetHeight = 720;
        } else if (project.aspectRatio === '1:1') {
          targetWidth = 720;
          targetHeight = 720;
        }
      }

      job.progress = 15;
      job.stage = 'Processing media layers & transforms...';

      // Separate video clips and audio clips
      const videoClips = project.clips.filter((c) => c.type === 'video' || c.type === 'image' || c.type === 'overlay');
      const audioClips = project.clips.filter((c) => c.type === 'audio');

      // Sort clips by start time
      videoClips.sort((a, b) => a.start - b.start);
      audioClips.sort((a, b) => a.start - b.start);

      const totalDuration = Math.max(1, project.duration || 10);

      // If no video clips, generate background color canvas
      if (videoClips.length === 0) {
        // Simple blank slate video
        await execFileAsync(
          ffmpeg,
          [
            '-y',
            '-f', 'lavfi',
            '-i', `color=c=black:s=${targetWidth}x${targetHeight}:d=${totalDuration}:r=${project.fps || 30}`,
            '-f', 'lavfi',
            '-i', `anullsrc=r=44100:cl=stereo`,
            '-t', totalDuration.toString(),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-shortest',
            outputPath
          ],
          { maxBuffer: 30 * 1024 * 1024 }
        );
      } else {
        // Collect inputs for FFmpeg
        const inputArgs: string[] = [];
        const filterComplex: string[] = [];
        let inputIndex = 0;

        // Base canvas input 0: Black background of exact duration and resolution
        inputArgs.push('-f', 'lavfi', '-i', `color=c=black:s=${targetWidth}x${targetHeight}:d=${totalDuration}:r=${project.fps || 30}`);
        let currentVideoOut = '0:v';
        inputIndex = 1;

        // Track inputs and build layer overlays
        for (let i = 0; i < videoClips.length; i++) {
          const clip = videoClips[i];
          const asset = project.assets.find((a) => a.id === clip.assetId);
          let localFilePath = '';

          if (asset) {
            const assetFilename = path.basename(asset.url);
            localFilePath = path.join(this.assetsDir, assetFilename);
          } else if (clip.url) {
            const assetFilename = path.basename(clip.url);
            localFilePath = path.join(this.assetsDir, assetFilename);
          }

          if (localFilePath && fs.existsSync(localFilePath)) {
            inputArgs.push('-i', localFilePath);
            const clipInput = inputIndex;
            inputIndex++;

            const speed = Math.max(0.25, Math.min(4.0, clip.speed?.speed || 1));
            const sourceStart = Math.max(0, clip.sourceStart || 0);
            const effectiveDuration = clip.duration;
            const sourceDuration = effectiveDuration * speed;

            // Step 1: Trim clip
            let clipChain = `[${clipInput}:v]trim=start=${sourceStart}:duration=${sourceDuration},setpts=PTS-STARTPTS`;

            // Step 2: Speed adjustment
            if (speed !== 1) {
              clipChain += `,setpts=(1/${speed})*PTS`;
            }

            // Step 3: Color grading filters
            const cg = clip.colorGrading;
            if (cg) {
              const b = (cg.brightness || 0) / 100;
              const c = 1 + (cg.contrast || 0) / 100;
              const s = 1 + (cg.saturation || 0) / 100;
              const g = cg.gamma || 1;
              clipChain += `,eq=brightness=${b.toFixed(2)}:contrast=${c.toFixed(2)}:saturation=${s.toFixed(2)}:gamma=${g.toFixed(2)}`;

              if (cg.temperature !== 0) {
                const kelvin = Math.round(6500 + (cg.temperature || 0) * 25);
                clipChain += `,colortemperature=temperature=${kelvin}`;
              }
            }

            // Step 4: Scale to canvas according to fitMode and transform.scale
            const scaleFactor = clip.transform?.scale || 1;
            clipChain += `,scale=w='min(${targetWidth},iw*${scaleFactor})':h='min(${targetHeight},ih*${scaleFactor})':force_original_aspect_ratio=decrease`;

            // Step 5: Format for overlay with alpha
            const opacity = clip.transform?.opacity ?? 1;
            if (opacity < 1) {
              clipChain += `,format=yuva420p,colorchannelmixer=aa=${opacity.toFixed(2)}`;
            }

            const processedClipTag = `proc_v${i}`;
            filterComplex.push(`${clipChain}[${processedClipTag}];`);

            // Step 6: Overlay onto base canvas at clip.start
            const nextCanvas = `canvas_v${i}`;
            const posX = Math.round((targetWidth - targetWidth * scaleFactor) / 2 + (clip.transform?.x || 0));
            const posY = Math.round((targetHeight - targetHeight * scaleFactor) / 2 + (clip.transform?.y || 0));

            const overlayStr = `[${currentVideoOut}][${processedClipTag}]overlay=x=${posX}:y=${posY}:enable='between(t,${clip.start},${clip.start + clip.duration})'[${nextCanvas}];`;
            filterComplex.push(overlayStr);
            currentVideoOut = nextCanvas;
          }
        }

        job.progress = 40;
        job.stage = 'Mixing audio layers & leveling...';

        // Prepare Audio mixing
        const audioInputs: string[] = [];

        for (let i = 0; i < audioClips.length; i++) {
          const aClip = audioClips[i];
          const asset = project.assets.find((a) => a.id === aClip.assetId);
          let localAudioPath = '';

          if (asset) {
            const assetFilename = path.basename(asset.url);
            localAudioPath = path.join(this.assetsDir, assetFilename);
          } else if (aClip.url) {
            const assetFilename = path.basename(aClip.url);
            localAudioPath = path.join(this.assetsDir, assetFilename);
          }

          if (localAudioPath && fs.existsSync(localAudioPath)) {
            inputArgs.push('-i', localAudioPath);
            const aIndex = inputIndex;
            inputIndex++;

            const vol = ((aClip.audio?.volume ?? 100) / 100).toFixed(2);
            const delayMs = Math.round(aClip.start * 1000);
            const aSourceStart = aClip.sourceStart || 0;
            const aDuration = aClip.duration;

            let aChain = `[${aIndex}:a]atrim=start=${aSourceStart}:duration=${aDuration},asetpts=PTS-STARTPTS,volume=${vol}`;
            if (delayMs > 0) {
              aChain += `,adelay=${delayMs}|${delayMs}`;
            }

            const processedAudioTag = `proc_a${i}`;
            filterComplex.push(`${aChain}[${processedAudioTag}];`);
            audioInputs.push(`[${processedAudioTag}]`);
          }
        }

        let audioOutTag = '';
        if (audioInputs.length > 0) {
          audioOutTag = 'mixed_audio';
          filterComplex.push(`${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=2[${audioOutTag}]`);
        }

        job.progress = 65;
        job.stage = 'Executing multi-track FFmpeg synthesis...';

        const finalArgs: string[] = [
          '-y',
          ...inputArgs,
          '-filter_complex', filterComplex.join(''),
          '-map', `[${currentVideoOut}]`
        ];

        if (audioOutTag) {
          finalArgs.push('-map', `[${audioOutTag}]`, '-c:a', 'aac', '-b:a', options.audioBitrate || '192k');
        } else {
          // Silent audio track so output is valid MP4 with audio stream
          finalArgs.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:a', 'aac', '-b:a', '128k');
        }

        finalArgs.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '20',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-t', totalDuration.toString(),
          outputPath
        );

        logger.info(`Running editor export with ${videoClips.length} video clips & ${audioClips.length} audio clips...`);
        await execFileAsync(ffmpeg, finalArgs, { maxBuffer: 50 * 1024 * 1024 });
      }

      job.progress = 100;
      job.status = 'completed';
      job.stage = 'Export completed successfully!';
      job.outputUrl = `/api/editor/exports/${outputFilename}`;
      job.filename = outputFilename;
      logger.info(`Export completed: ${outputPath}`);
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'Export failed';
      throw err;
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

