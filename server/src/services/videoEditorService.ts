import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { execFile, ChildProcess } from 'child_process';
import util from 'util';
import { config } from '../config';
import { logger } from '../utils/logger';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import {
  EditorProject,
  MediaAsset,
  EditorExportOptions,
  EditorExportJob,
  EditorFrameExportOptions,
  EditorFrameExportResult,
  EditorImagesZipResult,
  TimelineClip,
  TimelineTrack,
  ColorGrading,
  CustomFontAsset,
  MotionTitleTemplate
} from '../../../shared/src/videoEditorTypes';
import { createNewProject, ASPECT_RATIOS } from '../../../shared/src/videoEditorDefaults';
import { evaluateClipKeyframes } from '../../../shared/src/videoEditorKeyframes';
import { STARTER_MOTION_TEMPLATES, motionGraphicToAssEvents } from '../../../shared/src/motionGraphicsEngine';

const execFileAsync = util.promisify(execFile);

export class VideoEditorService {
  private static projectsDir = path.join(process.cwd(), 'data', 'editor_projects');
  private static versionsDir = path.join(process.cwd(), 'data', 'editor_projects', 'versions');
  private static assetsDir = path.join(process.cwd(), 'uploads', 'editor_assets');
  private static exportsDir = path.join(process.cwd(), 'uploads', 'editor_exports');
  private static fontsDir = path.join(process.cwd(), 'data', 'editor_fonts');
  private static templatesDir = path.join(process.cwd(), 'data', 'editor_templates');
  private static exportJobs: Map<string, EditorExportJob> = new Map();
  private static activeExportProcesses: Map<string, ChildProcess> = new Map();

  /**
   * Initializes storage directories
   */
  public static initStorage(): void {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }
      if (!fs.existsSync(this.versionsDir)) {
        fs.mkdirSync(this.versionsDir, { recursive: true });
      }
      if (!fs.existsSync(this.assetsDir)) {
        fs.mkdirSync(this.assetsDir, { recursive: true });
      }
      if (!fs.existsSync(this.exportsDir)) {
        fs.mkdirSync(this.exportsDir, { recursive: true });
      }
      if (!fs.existsSync(this.fontsDir)) {
        fs.mkdirSync(this.fontsDir, { recursive: true });
      }
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
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

  public static getFontsDir(): string {
    return this.fontsDir;
  }

  // ==========================================
  // CUSTOM FONTS & MOTION GRAPHIC TEMPLATES
  // ==========================================

  public static async listFonts(): Promise<CustomFontAsset[]> {
    this.initStorage();
    const files = await fs.promises.readdir(this.fontsDir);
    const fonts: CustomFontAsset[] = [];
    for (const f of files) {
      if (f.endsWith('.ttf') || f.endsWith('.otf') || f.endsWith('.woff') || f.endsWith('.woff2')) {
        const ext = path.extname(f).toLowerCase().replace('.', '');
        const format = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : (ext as any);
        const name = path.basename(f, path.extname(f)).replace(/[-_]/g, ' ');
        fonts.push({
          id: `font_${f.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name,
          fontFamily: name,
          filename: f,
          url: `/api/editor/fonts/${f}`,
          format,
          uploadedAt: fs.statSync(path.join(this.fontsDir, f)).mtime.toISOString()
        });
      }
    }
    return fonts;
  }

  public static async uploadFont(file: { originalname: string; path: string; filename?: string }): Promise<CustomFontAsset> {
    this.initStorage();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(this.fontsDir, safeName);
    await fs.promises.copyFile(file.path, targetPath);
    await fs.promises.unlink(file.path).catch(() => {});

    const ext = path.extname(safeName).toLowerCase().replace('.', '');
    const format = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : (ext as any);
    const fontName = path.basename(safeName, path.extname(safeName)).replace(/[-_]/g, ' ');

    return {
      id: `font_${Date.now()}`,
      name: fontName,
      fontFamily: fontName,
      filename: safeName,
      url: `/api/editor/fonts/${safeName}`,
      format,
      uploadedAt: new Date().toISOString()
    };
  }

  public static async listMotionTemplates(): Promise<MotionTitleTemplate[]> {
    this.initStorage();
    const customTemplates: MotionTitleTemplate[] = [];
    const files = await fs.promises.readdir(this.templatesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.promises.readFile(path.join(this.templatesDir, file), 'utf8');
          const t = JSON.parse(content) as MotionTitleTemplate;
          customTemplates.push(t);
        } catch {}
      }
    }
    return [...STARTER_MOTION_TEMPLATES, ...customTemplates];
  }

  public static async saveMotionTemplate(template: MotionTitleTemplate): Promise<MotionTitleTemplate> {
    this.initStorage();
    const id = template.id || `custom_template_${Date.now()}`;
    const safeTemplate: MotionTitleTemplate = {
      ...template,
      id,
      isCustom: true
    };
    const filePath = path.join(this.templatesDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(safeTemplate, null, 2), 'utf8');
    return safeTemplate;
  }

  public static async deleteMotionTemplate(id: string): Promise<boolean> {
    this.initStorage();
    const filePath = path.join(this.templatesDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  // ==========================================
  // PROJECT CRUD & RECOVERY & ASSET VERIFICATION
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
        } catch {}
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
    const project = JSON.parse(content) as EditorProject;

    // Check media assets existence (Missing Media Detection)
    await this.verifyProjectAssets(project);
    return project;
  }

  public static async verifyProjectAssets(project: EditorProject): Promise<{ project: EditorProject; missingCount: number }> {
    let missingCount = 0;
    if (project.assets && Array.isArray(project.assets)) {
      for (const asset of project.assets) {
        const filename = path.basename(asset.url);
        const fullPath = path.join(this.assetsDir, filename);
        const exists = fs.existsSync(fullPath);
        asset.isMissing = !exists;
        if (!exists) missingCount++;
      }
    }
    return { project, missingCount };
  }

  public static async saveProject(project: EditorProject): Promise<EditorProject> {
    this.initStorage();
    project.updatedAt = new Date().toISOString();
    const filePath = path.join(this.projectsDir, `${project.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(project, null, 2), 'utf8');

    // Save project backup version snapshot (retaining last 10 versions)
    try {
      const versionFile = path.join(this.versionsDir, `${project.id}_${Date.now()}.json`);
      await fs.promises.writeFile(versionFile, JSON.stringify(project, null, 2), 'utf8');
    } catch {}

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
        const ffprobe = await FFprobeHelperOrPath();
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
      isMissing: false,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Check if a media file contains an active audio stream
   */
  public static async fileHasAudioStream(filePath: string): Promise<boolean> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'].includes(ext)) {
        return true;
      }
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext)) {
        return false;
      }
      const ffprobe = await FFmpegHelper.getFfprobePath();
      const { stdout } = await execFileAsync(ffprobe, [
        '-v', 'error',
        '-select_streams', 'a',
        '-show_entries', 'stream=codec_type',
        '-of', 'csv=p=0',
        filePath
      ]);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  // ==========================================
  // MULTITRACK FFMPEG COMPOSITOR & EXPORT
  // ==========================================

  public static getExportJob(jobId: string): EditorExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  /**
   * Cancels a running export job and kills its child process
   */
  public static cancelExport(jobId: string): boolean {
    const job = this.exportJobs.get(jobId);
    if (!job) return false;

    const child = this.activeExportProcesses.get(jobId);
    if (child) {
      try {
        child.kill('SIGKILL');
      } catch {}
      this.activeExportProcesses.delete(jobId);
    }

    job.status = 'cancelled';
    job.stage = 'Export cancelled by user.';
    job.progress = 0;
    logger.info(`Export job ${jobId} was cancelled.`);
    return true;
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
      if (j && j.status !== 'cancelled') {
        j.status = 'failed';
        j.error = err.message || 'Unknown export rendering error';
      }
    });

    return job;
  }

  /**
   * Builds FFmpeg filter chain strings for Adjust (ColorGrading) and Effects/Filters
   */
  public static buildColorAndEffectsFilter(clip: TimelineClip): string {
    let filterStr = '';
    const cg = clip.colorGrading;
    if (cg) {
      const b = (cg.brightness || 0) / 100;
      const c = 1 + (cg.contrast || 0) / 100;
      const s = Math.max(0, 1 + (cg.saturation || 0) / 100);
      const g = cg.gamma || 1;
      filterStr += `,eq=brightness=${b.toFixed(2)}:contrast=${c.toFixed(2)}:saturation=${s.toFixed(2)}:gamma=${g.toFixed(2)}`;

      if (cg.temperature && cg.temperature !== 0) {
        const kelvin = Math.round(6500 + cg.temperature * 25);
        filterStr += `,colortemperature=temperature=${kelvin}`;
      }

      if (cg.hue && cg.hue !== 0) {
        filterStr += `,hue=h=${cg.hue}`;
      }

      if (cg.exposure && cg.exposure !== 0) {
        const expVal = (cg.exposure / 50).toFixed(2);
        filterStr += `,exposure=exposure=${expVal}`;
      }
    }

    // Process clip effects / filters (vignette, blur, sharpen, noise, film grain, chromatic aberration, etc.)
    const effects = clip.effects || [];
    for (const eff of effects) {
      if (eff.enabled === false) continue;
      const intensity = typeof eff.intensity === 'number'
        ? (eff.intensity > 1 ? eff.intensity / 100 : eff.intensity)
        : 1;

      switch (eff.type) {
        case 'vignette': {
          const angle = (intensity * 0.7 + 0.3).toFixed(2);
          filterStr += `,vignette=angle=${angle}`;
          break;
        }
        case 'gaussian_blur':
        case 'motion_blur': {
          const sigma = Math.max(0.5, intensity * 15).toFixed(1);
          filterStr += `,gblur=sigma=${sigma}`;
          break;
        }
        case 'sharpen': {
          const amt = (intensity * 2.5).toFixed(2);
          filterStr += `,unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=${amt}`;
          break;
        }
        case 'film_grain':
        case 'noise': {
          const alls = Math.min(50, Math.max(5, Math.round(intensity * 40)));
          filterStr += `,noise=alls=${alls}:allf=t+u`;
          break;
        }
        case 'chromatic_aberration':
        case 'rgb_split': {
          const shift = Math.max(1, Math.round(intensity * 12));
          filterStr += `,rgbashift=rh=${shift}:bv=-${shift}`;
          break;
        }
        case 'vhs':
        case 'glitch': {
          filterStr += `,noise=alls=20:allf=t+u,rgbashift=rh=4:bv=-4,eq=contrast=1.15:saturation=1.2`;
          break;
        }
        case 'glow': {
          filterStr += `,curves=all='0/0 0.5/0.65 1/1'`;
          break;
        }
        case 'light_leak': {
          filterStr += `,colorchannelmixer=rr=1.2:rg=0.08:rb=0.15,eq=brightness=0.06`;
          break;
        }
      }
    }

    return filterStr;
  }

  /**
   * Robustly resolves local file path for an asset URL or clip URL
   */
  public static async resolveLocalMediaFile(mediaUrl?: string, tempDir?: string): Promise<string> {
    if (!mediaUrl) return '';
    const cleanUrl = mediaUrl.split('?')[0].split('#')[0];

    // 1. Data URLs
    if (cleanUrl.startsWith('data:')) {
      if (!tempDir) return '';
      const matches = cleanUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const ext = matches[1].includes('png') ? 'png' : matches[1].includes('jpeg') || matches[1].includes('jpg') ? 'jpg' : matches[1].includes('webp') ? 'webp' : 'bin';
        const tmpFile = path.join(tempDir, `data_asset_${randomUUID().slice(0, 8)}.${ext}`);
        await fs.promises.writeFile(tmpFile, Buffer.from(matches[2], 'base64'));
        return tmpFile;
      }
      return '';
    }

    // 2. Local uploads directories
    const filename = path.basename(decodeURIComponent(cleanUrl));
    const candidatePaths = [
      path.join(this.assetsDir, filename),
      path.resolve(process.cwd(), cleanUrl.replace(/^\/+/, '')),
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'uploads', 'editor_assets', filename),
      path.join(process.cwd(), 'temp_storage', filename),
      cleanUrl
    ];

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    return '';
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
          targetWidth = 720; targetHeight = 1280;
        } else if (project.aspectRatio === '16:9') {
          targetWidth = 1280; targetHeight = 720;
        } else if (project.aspectRatio === '1:1') {
          targetWidth = 720; targetHeight = 720;
        }
      } else if (options.resolution === '4k' || options.resolution === '2160x3840' || options.resolution === '3840x2160') {
        if (project.aspectRatio === '9:16') {
          targetWidth = 2160; targetHeight = 3840;
        } else if (project.aspectRatio === '16:9') {
          targetWidth = 3840; targetHeight = 2160;
        } else {
          targetWidth = 2160; targetHeight = 2160;
        }
      } else if (options.resolution === '1920x1080') {
        targetWidth = 1920; targetHeight = 1080;
      } else if (options.resolution === '1080x1920') {
        targetWidth = 1080; targetHeight = 1920;
      } else if (options.resolution === '1080x1080') {
        targetWidth = 1080; targetHeight = 1080;
      }

      job.progress = 15;
      job.stage = 'Processing media layers & transforms...';

      const hasSoloTrack = project.tracks.some((t) => t.solo);
      const trackMap = new Map<string, TimelineTrack>();
      project.tracks.forEach((t) => trackMap.set(t.id, t));

      const videoClips = project.clips.filter((c) => {
        const track = trackMap.get(c.trackId);
        if (track?.hidden) return false;
        return c.type === 'video' || c.type === 'image' || c.type === 'overlay' || c.type === 'text' || c.type === 'caption';
      });

      const audioClips = project.clips.filter((c) => {
        const track = trackMap.get(c.trackId);
        if (track?.muted) return false;
        if (hasSoloTrack && !track?.solo) return false;
        if (c.audio?.muted) return false;
        return c.type === 'audio' || c.type === 'video';
      });

      videoClips.sort((a, b) => {
        const orderA = trackMap.get(a.trackId)?.order ?? 0;
        const orderB = trackMap.get(b.trackId)?.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.start - b.start;
      });

      const totalDuration = Math.max(1, project.duration || 10);

      // Collect inputs and filters
      const inputArgs: string[] = [];
      const filterComplex: string[] = [];
      let inputIndex = 0;

      // Base canvas input 0
      const bgColor = project.background?.color ? project.background.color.replace('#', '') : 'black';
      inputArgs.push('-f', 'lavfi', '-i', `color=c=${bgColor}:s=${targetWidth}x${targetHeight}:d=${totalDuration}:r=${project.fps || 30}`);
      let currentVideoOut = '0:v';
      inputIndex = 1;

      for (let i = 0; i < videoClips.length; i++) {
        if ((this.exportJobs.get(jobId)?.status as string) === 'cancelled') return;
        const clip = videoClips[i];

        if (clip.type === 'text' || clip.type === 'caption') {
          const nextCanvas = `canvas_v${i}`;
          if (clip.titleDesign) {
            const assContent = motionGraphicToAssEvents([clip], totalDuration, targetWidth, targetHeight, this.fontsDir);
            const assPath = path.join(tempDir, `motion_graphic_${i}.ass`);
            await fs.promises.writeFile(assPath, assContent, 'utf8');
            const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
            const fontsDirArg = fs.existsSync(this.fontsDir) ? `:fontsdir='${this.fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")}'` : '';
            filterComplex.push(`[${currentVideoOut}]subtitles='${escapedAssPath}'${fontsDirArg}[${nextCanvas}]`);
            currentVideoOut = nextCanvas;
            continue;
          }

          const rawText = (clip.text || 'Subtitle').replace(/['":\\]/g, ' ');
          const textY = clip.transform?.y ? Math.round(targetHeight / 2 + clip.transform.y) : Math.round(targetHeight * 0.8);
          filterComplex.push(`[${currentVideoOut}]drawtext=text='${rawText}':fontsize=44:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=${textY}:enable='between(t,${clip.start},${clip.start + clip.duration})'[${nextCanvas}]`);
          currentVideoOut = nextCanvas;
          continue;
        }

        const asset = project.assets.find((a) => a.id === clip.assetId);
        const resolvedPath = await VideoEditorService.resolveLocalMediaFile(asset?.url || clip.url, tempDir);

        if (resolvedPath && fs.existsSync(resolvedPath)) {
          const isImage = clip.type === 'image' || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp'].some(ext => resolvedPath.toLowerCase().endsWith(ext));

          if (isImage) {
            inputArgs.push('-loop', '1', '-i', resolvedPath);
          } else {
            inputArgs.push('-i', resolvedPath);
          }

          const clipInput = inputIndex;
          inputIndex++;

          const speed = Math.max(0.25, Math.min(4.0, clip.speed?.speed || 1));
          const sourceStart = Math.max(0, clip.sourceStart || 0);
          const effectiveDuration = clip.duration;
          const sourceDuration = effectiveDuration * speed;

          let clipChain = '';
          if (isImage) {
            clipChain = `[${clipInput}:v]trim=duration=${effectiveDuration},setpts=PTS-STARTPTS+${clip.start}/TB`;
          } else {
            clipChain = `[${clipInput}:v]trim=start=${sourceStart}:duration=${sourceDuration},setpts=PTS-STARTPTS`;
            if (clip.speed?.reverse) {
              clipChain += `,reverse`;
            } else if (speed !== 1) {
              clipChain += `,setpts=(1/${speed})*PTS`;
            }
            clipChain += `,setpts=PTS-STARTPTS+${clip.start}/TB`;
          }

          // Step 3: Color grading (Adjust) & Effects (Filters)
          clipChain += VideoEditorService.buildColorAndEffectsFilter(clip);

          const tf = clip.transform;
          if (tf && (tf.cropTop || tf.cropBottom || tf.cropLeft || tf.cropRight)) {
            const top = tf.cropTop || 0;
            const bottom = tf.cropBottom || 0;
            const left = tf.cropLeft || 0;
            const right = tf.cropRight || 0;
            clipChain += `,crop=iw*(1-${(left + right) / 100}):ih*(1-${(top + bottom) / 100}):iw*${left / 100}:ih*${top / 100}`;
          }

          if (tf?.flipH) clipChain += `,hflip`;
          if (tf?.flipV) clipChain += `,vflip`;

          const scaleFactor = Math.max(0.05, tf?.scale || 1);
          clipChain += `,scale=w='trunc(min(${targetWidth},iw*${scaleFactor})/2)*2':h='trunc(min(${targetHeight},ih*${scaleFactor})/2)*2':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`;

          const opacity = tf?.opacity ?? 1;
          if (opacity < 1) {
            clipChain += `,format=yuva420p,colorchannelmixer=aa=${opacity.toFixed(2)}`;
          }

          const processedClipTag = `proc_v${i}`;
          filterComplex.push(`${clipChain}[${processedClipTag}]`);

          const nextCanvas = `canvas_v${i}`;
          const posX = Math.round((targetWidth - targetWidth * scaleFactor) / 2 + (tf?.x || 0));
          const posY = Math.round((targetHeight - targetHeight * scaleFactor) / 2 + (tf?.y || 0));

          filterComplex.push(`[${currentVideoOut}][${processedClipTag}]overlay=x=${posX}:y=${posY}:enable='between(t,${clip.start},${clip.start + clip.duration})':eof_action=pass[${nextCanvas}]`);
          currentVideoOut = nextCanvas;
        }
      }

      job.progress = 40;
      job.stage = 'Mixing audio layers & leveling...';

      const audioInputs: string[] = [];
      for (let i = 0; i < audioClips.length; i++) {
        if ((this.exportJobs.get(jobId)?.status as string) === 'cancelled') return;

        const aClip = audioClips[i];
        const asset = project.assets.find((a) => a.id === aClip.assetId);
        const localAudioPath = await VideoEditorService.resolveLocalMediaFile(asset?.url || aClip.url, tempDir);

        if (localAudioPath && fs.existsSync(localAudioPath)) {
          const hasAudio = await VideoEditorService.fileHasAudioStream(localAudioPath);
          if (!hasAudio) continue;

          inputArgs.push('-i', localAudioPath);
          const aIndex = inputIndex;
          inputIndex++;

          const vol = ((aClip.audio?.volume ?? 100) / 100).toFixed(2);
          const delayMs = Math.round(aClip.start * 1000);
          const aSourceStart = aClip.sourceStart || 0;
          const aDuration = aClip.duration;

          let aChain = `[${aIndex}:a]atrim=start=${aSourceStart}:duration=${aDuration},asetpts=PTS-STARTPTS,volume=${vol}`;

          const fadeIn = aClip.audio?.fadeInDuration ?? (aClip.audio as any)?.fadeIn ?? 0;
          const fadeOut = aClip.audio?.fadeOutDuration ?? (aClip.audio as any)?.fadeOut ?? 0;
          if (fadeIn > 0) aChain += `,afade=t=in:ss=0:d=${fadeIn}`;
          if (fadeOut > 0) {
            const startFade = Math.max(0, aDuration - fadeOut);
            aChain += `,afade=t=out:st=${startFade}:d=${fadeOut}`;
          }

          if (delayMs > 0) aChain += `,adelay=${delayMs}|${delayMs}`;

          const processedAudioTag = `proc_a${i}`;
          filterComplex.push(`${aChain}[${processedAudioTag}]`);
          audioInputs.push(`[${processedAudioTag}]`);
        }
      }

      let audioOutTag = '';
      if (audioInputs.length > 0) {
        audioOutTag = 'mixed_audio';
        filterComplex.push(`${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=2[${audioOutTag}]`);
      } else {
        audioOutTag = 'silent_audio';
        filterComplex.push(`aevalsrc=0:d=${totalDuration}[${audioOutTag}]`);
      }

      job.progress = 65;
      job.stage = 'Executing multi-track FFmpeg synthesis...';

      const videoMapArg = currentVideoOut.includes(':') ? currentVideoOut : `[${currentVideoOut}]`;

      const finalArgs: string[] = [
        '-y',
        ...inputArgs,
        '-filter_complex', filterComplex.join(';'),
        '-map', videoMapArg,
        '-map', `[${audioOutTag}]`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', options.audioBitrate || '192k',
        '-t', totalDuration.toString(),
        outputPath
      ];

      logger.info(`Running editor export with ${videoClips.length} visual clips & ${audioClips.length} audio clips...`);

      const child = execFile(ffmpeg, finalArgs, { maxBuffer: 50 * 1024 * 1024 });
      this.activeExportProcesses.set(jobId, child);

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          this.activeExportProcesses.delete(jobId);
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with error code ${code}`));
        });
        child.on('error', (err) => {
          this.activeExportProcesses.delete(jobId);
          reject(err);
        });
      });

      if ((this.exportJobs.get(jobId)?.status as string) === 'cancelled') return;

      job.progress = 100;
      job.status = 'completed';
      job.stage = 'Export completed successfully!';
      job.outputUrl = `/api/editor/exports/${outputFilename}`;
      job.filename = outputFilename;
      logger.info(`Export completed: ${outputPath}`);
    } catch (err: any) {
      if ((this.exportJobs.get(jobId)?.status as string) !== 'cancelled') {
        job.status = 'failed';
        job.error = err.message || 'Export failed';
      }
      throw err;
    } finally {
      this.activeExportProcesses.delete(jobId);
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Export a single still frame as PNG, JPG, or WebP at given playhead timestamp
   */
  public static async exportFrame(
    project: EditorProject,
    options: EditorFrameExportOptions
  ): Promise<EditorFrameExportResult> {
    this.initStorage();
    const time = Math.max(0, Math.min(project.duration || 60, options.time || 0));
    const format = options.format || 'png';
    const ext = format === 'jpeg' ? 'jpg' : format;
    const filename = options.filename || `frame_${Date.now()}_${Math.round(time * 100)}.${ext}`;
    const outputPath = path.join(this.exportsDir, filename);

    const defaultAspect = ASPECT_RATIOS.find((r) => r.id === project.aspectRatio) || ASPECT_RATIOS[0];
    let targetWidth = defaultAspect.width;
    let targetHeight = defaultAspect.height;

    if (options.resolution === '720p') {
      if (project.aspectRatio === '9:16') { targetWidth = 720; targetHeight = 1280; }
      else if (project.aspectRatio === '16:9') { targetWidth = 1280; targetHeight = 720; }
      else { targetWidth = 720; targetHeight = 720; }
    } else if (options.resolution === '4k') {
      if (project.aspectRatio === '9:16') { targetWidth = 2160; targetHeight = 3840; }
      else if (project.aspectRatio === '16:9') { targetWidth = 3840; targetHeight = 2160; }
      else { targetWidth = 2160; targetHeight = 2160; }
    }

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-frame-export-'));
    try {
      const ffmpeg = await FFmpegHelper.getFfmpegPath();
      const trackMap = new Map<string, TimelineTrack>();
      project.tracks.forEach((t) => trackMap.set(t.id, t));

      const activeClips = project.clips.filter((c) => {
        const track = trackMap.get(c.trackId);
        if (track?.hidden) return false;
        const isVisual = c.type === 'video' || c.type === 'image' || c.type === 'overlay' || c.type === 'text' || c.type === 'caption';
        return isVisual && time >= c.start && time <= (c.start + c.duration);
      });

      activeClips.sort((a, b) => {
        const orderA = trackMap.get(a.trackId)?.order ?? 0;
        const orderB = trackMap.get(b.trackId)?.order ?? 0;
        return orderA - orderB;
      });

      const inputArgs: string[] = [];
      const filterComplex: string[] = [];

      const bgColor = project.background?.color ? project.background.color.replace('#', '') : 'black';
      inputArgs.push('-f', 'lavfi', '-i', `color=c=${bgColor}:s=${targetWidth}x${targetHeight}:d=1:r=30`);
      let currentVideoOut = '0:v';
      let inputIndex = 1;

      for (let i = 0; i < activeClips.length; i++) {
        const clip = activeClips[i];
        if (clip.type === 'text' || clip.type === 'caption') {
          const nextCanvas = `canvas_f${i}`;
          if (clip.titleDesign) {
            const assContent = motionGraphicToAssEvents([clip], 1, targetWidth, targetHeight, this.fontsDir);
            const assPath = path.join(tempDir, `mg_frame_${i}.ass`);
            await fs.promises.writeFile(assPath, assContent, 'utf8');
            const escapedAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
            const fontsDirArg = fs.existsSync(this.fontsDir) ? `:fontsdir='${this.fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")}'` : '';
            filterComplex.push(`[${currentVideoOut}]subtitles='${escapedAss}'${fontsDirArg}[${nextCanvas}]`);
            currentVideoOut = nextCanvas;
            continue;
          }
          const rawText = (clip.text || 'Subtitle').replace(/['":\\]/g, ' ');
          const textY = clip.transform?.y ? Math.round(targetHeight / 2 + clip.transform.y) : Math.round(targetHeight * 0.8);
          filterComplex.push(`[${currentVideoOut}]drawtext=text='${rawText}':fontsize=44:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=${textY}[${nextCanvas}]`);
          currentVideoOut = nextCanvas;
          continue;
        }

        const resolvedPath = await VideoEditorService.resolveLocalMediaFile(clip.url || project.assets.find(a => a.id === clip.assetId)?.url, tempDir);
        if (!resolvedPath || !fs.existsSync(resolvedPath)) continue;

        const isImage = clip.type === 'image' || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].some(e => resolvedPath.toLowerCase().endsWith(e));
        const clipInput = inputIndex++;

        if (isImage) {
          inputArgs.push('-loop', '1', '-i', resolvedPath);
        } else {
          const offsetInClip = Math.max(0, (time - clip.start) * (clip.speed?.speed || 1) + (clip.sourceStart || 0));
          inputArgs.push('-ss', offsetInClip.toFixed(3), '-i', resolvedPath);
        }

        const tf = clip.transform;
        const scaleFactor = Math.max(0.05, tf?.scale || 1);
        let clipChain = `[${clipInput}:v]`;

        if (tf && (tf.cropTop || tf.cropBottom || tf.cropLeft || tf.cropRight)) {
          const top = tf.cropTop || 0;
          const bottom = tf.cropBottom || 0;
          const left = tf.cropLeft || 0;
          const right = tf.cropRight || 0;
          clipChain += `crop=iw*(1-${(left + right) / 100}):ih*(1-${(top + bottom) / 100}):iw*${left / 100}:ih*${top / 100},`;
        }

        // Apply Color Grading (Adjust) & Effects (Filters)
        const fxStr = VideoEditorService.buildColorAndEffectsFilter(clip);
        if (fxStr) {
          const cleanFx = fxStr.startsWith(',') ? fxStr.slice(1) : fxStr;
          clipChain += `${cleanFx},`;
        }

        clipChain += `scale=w='trunc(min(${targetWidth},iw*${scaleFactor})/2)*2':h='trunc(min(${targetHeight},ih*${scaleFactor})/2)*2':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`;

        if (tf?.flipH) clipChain += `,hflip`;
        if (tf?.flipV) clipChain += `,vflip`;

        const opacity = tf?.opacity ?? 1;
        if (opacity < 1) {
          clipChain += `,format=yuva420p,colorchannelmixer=aa=${opacity.toFixed(2)}`;
        }

        const procTag = `proc_f${i}`;
        filterComplex.push(`${clipChain}[${procTag}]`);

        const nextCanvas = `canvas_f${i}`;
        const posX = Math.round((targetWidth - targetWidth * scaleFactor) / 2 + (tf?.x || 0));
        const posY = Math.round((targetHeight - targetHeight * scaleFactor) / 2 + (tf?.y || 0));
        filterComplex.push(`[${currentVideoOut}][${procTag}]overlay=x=${posX}:y=${posY}:eof_action=pass[${nextCanvas}]`);
        currentVideoOut = nextCanvas;
      }

      const frameArgs: string[] = ['-y', ...inputArgs];
      if (filterComplex.length > 0) {
        frameArgs.push('-filter_complex', filterComplex.join(';'), '-map', `[${currentVideoOut}]`);
      } else {
        frameArgs.push('-map', '0:v');
      }

      frameArgs.push('-vframes', '1', '-q:v', '2', outputPath);
      await execFileAsync(ffmpeg, frameArgs, { maxBuffer: 20 * 1024 * 1024 });

      const stats = await fs.promises.stat(outputPath);
      return {
        success: true,
        frameUrl: `/api/editor/exports/${filename}`,
        filename,
        width: targetWidth,
        height: targetHeight,
        fileSize: stats.size
      };
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Bundles project image assets or timeline image clips with adjustments/effects into a downloadable zip file
   */
  public static async exportImagesZip(project: EditorProject): Promise<EditorImagesZipResult> {
    this.initStorage();
    const archiver = require('archiver');
    const zipFilename = `images_${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}.zip`;
    const zipPath = path.join(this.exportsDir, zipFilename);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    const ffmpeg = await FFmpegHelper.getFfmpegPath();
    const tempDir = path.join(this.exportsDir, `temp_zip_${Date.now()}`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    return new Promise<EditorImagesZipResult>(async (resolve, reject) => {
      let imageCount = 0;
      output.on('close', async () => {
        try {
          // Clean up temp render folder
          if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
          }
        } catch {}
        const stats = fs.statSync(zipPath);
        resolve({
          success: true,
          zipUrl: `/api/editor/exports/${zipFilename}`,
          filename: zipFilename,
          imageCount,
          fileSize: stats.size
        });
      });

      archive.on('error', (err: any) => {
        reject(err);
      });

      archive.pipe(output);

      const seenFilenames = new Set<string>();

      // Check if project has timeline image clips with adjustments/effects
      const timelineImageClips = (project.clips || []).filter((c) => c.type === 'image');

      if (timelineImageClips.length > 0) {
        // Render each timeline image clip with all colorGrading (adjustments), effects, crop & transform
        for (let i = 0; i < timelineImageClips.length; i++) {
          const clip = timelineImageClips[i];
          const asset = project.assets.find((a) => a.id === clip.assetId);
          const rawUrl = asset?.url || clip.url;
          const resolvedPath = await VideoEditorService.resolveLocalMediaFile(rawUrl, tempDir);

          if (resolvedPath && fs.existsSync(resolvedPath)) {
            const ext = path.extname(resolvedPath) || '.png';
            const baseRaw = path.basename(resolvedPath, ext);
            let outName = `${String(i + 1).padStart(3, '0')}_${clip.name || baseRaw}${ext}`;
            if (seenFilenames.has(outName)) {
              outName = `${String(i + 1).padStart(3, '0')}_clip_${clip.id}${ext}`;
            }
            seenFilenames.add(outName);

            const renderedClipPath = path.join(tempDir, `rendered_${i}_${Date.now()}${ext}`);

            // Build filter chain for this clip: crop + adjust + effects
            const filters: string[] = [];
            const tf = clip.transform;
            if (tf && (tf.cropTop || tf.cropBottom || tf.cropLeft || tf.cropRight)) {
              const top = tf.cropTop || 0;
              const bottom = tf.cropBottom || 0;
              const left = tf.cropLeft || 0;
              const right = tf.cropRight || 0;
              filters.push(`crop=iw*(1-${(left + right) / 100}):ih*(1-${(top + bottom) / 100}):iw*${left / 100}:ih*${top / 100}`);
            }

            const fx = VideoEditorService.buildColorAndEffectsFilter(clip);
            if (fx) {
              // fx starts with comma, strip it
              const cleanFx = fx.startsWith(',') ? fx.slice(1) : fx;
              filters.push(cleanFx);
            }

            if (tf?.flipH) filters.push('hflip');
            if (tf?.flipV) filters.push('vflip');

            try {
              if (filters.length > 0) {
                await execFileAsync(ffmpeg, [
                  '-y',
                  '-i', resolvedPath,
                  '-vf', filters.join(','),
                  '-frames:v', '1',
                  renderedClipPath
                ], { maxBuffer: 10 * 1024 * 1024 });

                if (fs.existsSync(renderedClipPath)) {
                  archive.file(renderedClipPath, { name: outName });
                  imageCount++;
                  continue;
                }
              }
            } catch (err: any) {
              logger.warn(`Failed to render filter on clip ${clip.id}, archiving raw: ${err?.message}`);
            }

            // Fallback to raw file if no filters or render error
            archive.file(resolvedPath, { name: outName });
            imageCount++;
          }
        }
      } else {
        // Fallback: archive project image assets
        const imageAssets = project.assets.filter((a) => a.type === 'image');
        for (let i = 0; i < imageAssets.length; i++) {
          const asset = imageAssets[i];
          const resolvedPath = await VideoEditorService.resolveLocalMediaFile(asset.url, tempDir);
          if (resolvedPath && fs.existsSync(resolvedPath)) {
            let zipName = asset.name || path.basename(resolvedPath);
            if (seenFilenames.has(zipName)) {
              zipName = `${i + 1}_${zipName}`;
            }
            seenFilenames.add(zipName);
            archive.file(resolvedPath, { name: zipName });
            imageCount++;
          }
        }
      }

      archive.finalize();
    });
  }
}

async function FFprobeHelperOrPath(): Promise<string> {
  return await FFmpegHelper.getFfprobePath();
}
