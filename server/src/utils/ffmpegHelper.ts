import { exec, execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from './logger';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

export interface FFmpegCapabilities {
  ffmpegAvailable: boolean;
  ffmpegPath: string;
  ffmpegVersion?: string;
  ffprobeAvailable: boolean;
  ffprobePath: string;
  subtitlesFilter: boolean;
  assFilter: boolean;
  libass: boolean;
  libmp3lame: boolean;
  libx264: boolean;
  availableFontDirs: string[];
  fontconfigReady: boolean;
}

export interface MediaProbeInfo {
  durationSec: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec?: string;
  audioCodec?: string;
}

export interface AudioChunkSlice {
  index: number;
  filePath: string;
  offsetSec: number;
  durationSec: number;
  sizeBytes: number;
}

export class FFmpegHelper {
  private static cachedFfmpegPath: string | null = null;
  private static cachedFfprobePath: string | null = null;
  private static cachedCapabilities: FFmpegCapabilities | null = null;
  private static cachedFontconfigFile: string | null = null;

  public static resetCache(): void {
    this.cachedFfmpegPath = null;
    this.cachedFfprobePath = null;
    this.cachedCapabilities = null;
  }

  /**
   * Discovers the FFmpeg executable on the host system.
   */
  public static async getFfmpegPath(): Promise<string> {
    if (this.cachedFfmpegPath && fs.existsSync(this.cachedFfmpegPath)) {
      return this.cachedFfmpegPath;
    }

    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
      this.cachedFfmpegPath = process.env.FFMPEG_PATH;
      return this.cachedFfmpegPath;
    }

    // Try ffmpeg-static npm package (portable across Windows, Linux, Docker, Render)
    try {
      const ffmpegStatic = require('ffmpeg-static');
      const staticPath = typeof ffmpegStatic === 'string' ? ffmpegStatic : (ffmpegStatic?.default || null);
      if (staticPath && fs.existsSync(staticPath)) {
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(staticPath, 0o755);
          } catch {}
        }
        this.cachedFfmpegPath = staticPath;
        return staticPath;
      }
    } catch {}

    const userProfile = process.env.USERPROFILE || 'C:\\Users\\Muhammad Hashim';
    const staticFfmpegCandidate = path.join(
      userProfile,
      'AppData',
      'Local',
      'Programs',
      'Python',
      'Python314',
      'Lib',
      'site-packages',
      'static_ffmpeg',
      'bin',
      'win32',
      'ffmpeg.EXE'
    );
    if (fs.existsSync(staticFfmpegCandidate)) {
      this.cachedFfmpegPath = staticFfmpegCandidate;
      return this.cachedFfmpegPath;
    }

    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'where ffmpeg' : 'which ffmpeg';
      const { stdout } = await execAsync(cmd);
      const lines = stdout.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (fs.existsSync(line)) {
          this.cachedFfmpegPath = line;
          return this.cachedFfmpegPath;
        }
      }
    } catch {}

    return 'ffmpeg';
  }

  /**
   * Discovers the FFprobe executable on the host system.
   */
  public static async getFfprobePath(): Promise<string> {
    if (this.cachedFfprobePath && fs.existsSync(this.cachedFfprobePath)) {
      return this.cachedFfprobePath;
    }

    if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
      this.cachedFfprobePath = process.env.FFPROBE_PATH;
      return this.cachedFfprobePath;
    }

    const userProfile = process.env.USERPROFILE || 'C:\\Users\\Muhammad Hashim';
    const staticFfprobeCandidate = path.join(
      userProfile,
      'AppData',
      'Local',
      'Programs',
      'Python',
      'Python314',
      'Lib',
      'site-packages',
      'static_ffmpeg',
      'bin',
      'win32',
      'ffprobe.EXE'
    );
    if (fs.existsSync(staticFfprobeCandidate)) {
      this.cachedFfprobePath = staticFfprobeCandidate;
      return this.cachedFfprobePath;
    }

    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'where ffprobe' : 'which ffprobe';
      const { stdout } = await execAsync(cmd);
      const lines = stdout.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (fs.existsSync(line)) {
          this.cachedFfprobePath = line;
          return this.cachedFfprobePath;
        }
      }
    } catch {}

    return 'ffprobe';
  }

  /**
   * Discovers readable system font directories across Windows, Linux (Render/Debian/Alpine), and macOS.
   */
  public static getAvailableFontDirs(): string[] {
    const candidates = process.platform === 'win32'
      ? [
          path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')
        ]
      : process.platform === 'darwin'
      ? [
          '/System/Library/Fonts',
          '/Library/Fonts'
        ]
      : [
          '/usr/share/fonts/truetype/dejavu',
          '/usr/share/fonts/TTF',
          '/usr/share/fonts/truetype',
          '/usr/share/fonts/opentype',
          '/usr/share/fonts',
          '/usr/local/share/fonts'
        ];

    return candidates.filter((dir) => {
      try {
        return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });
  }

  /**
   * Ensures a valid Fontconfig configuration is available on Linux when running static FFmpeg builds
   * (such as ffmpeg-static on Render) where /etc/fonts/fonts.conf or writable cache dirs may be absent.
   */
  public static async getSubtitleExecutionEnv(): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (process.platform === 'win32' || process.platform === 'darwin') {
      return env;
    }

    if (env.FONTCONFIG_FILE && fs.existsSync(env.FONTCONFIG_FILE)) {
      return env;
    }

    if (fs.existsSync('/etc/fonts/fonts.conf')) {
      env.FONTCONFIG_FILE = '/etc/fonts/fonts.conf';
      env.FONTCONFIG_PATH = '/etc/fonts';
      return env;
    }

    if (this.cachedFontconfigFile && fs.existsSync(this.cachedFontconfigFile)) {
      env.FONTCONFIG_FILE = this.cachedFontconfigFile;
      env.FONTCONFIG_PATH = path.dirname(this.cachedFontconfigFile);
      return env;
    }

    try {
      const fcDir = path.join(os.tmpdir(), 'voiceforge-fontconfig');
      const cacheDir = path.join(fcDir, 'cache');
      await fs.promises.mkdir(cacheDir, { recursive: true });

      const fontDirs = this.getAvailableFontDirs();
      const dirEntries = (fontDirs.length > 0 ? fontDirs : ['/usr/share/fonts'])
        .map((d) => `  <dir>${d}</dir>`)
        .join('\n');

      const confPath = path.join(fcDir, 'fonts.conf');
      const xml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
${dirEntries}
  <cachedir>${cacheDir}</cachedir>
</fontconfig>
`;
      await fs.promises.writeFile(confPath, xml, 'utf8');
      this.cachedFontconfigFile = confPath;
      env.FONTCONFIG_FILE = confPath;
      env.FONTCONFIG_PATH = fcDir;
    } catch (err) {
      logger.warn('Failed to generate fallback Fontconfig file:', err);
    }

    return env;
  }

  /**
   * Escapes paths/values embedded inside an FFmpeg libavfilter option string (e.g. subtitles=filename='...').
   */
  public static escapeSubtitlesFilterValue(value: string): string {
    return value
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  /**
   * Verifies FFmpeg, FFprobe, libass subtitles filter, encoders, and font availability.
   */
  public static async checkCapabilities(forceRefresh = false): Promise<FFmpegCapabilities> {
    if (this.cachedCapabilities && !forceRefresh) {
      return this.cachedCapabilities;
    }

    const ffmpegPath = await this.getFfmpegPath();
    const ffprobePath = await this.getFfprobePath();
    const availableFontDirs = this.getAvailableFontDirs();

    let ffmpegAvailable = false;
    let ffmpegVersion: string | undefined;
    let libass = false;
    let subtitlesFilter = false;
    let assFilter = false;
    let libmp3lame = false;
    let libx264 = false;

    try {
      const { stdout, stderr } = await execFileAsync(ffmpegPath, ['-version'], {
        timeout: 10000,
        maxBuffer: 4 * 1024 * 1024
      });
      const combined = `${stdout}\n${stderr}`;
      ffmpegAvailable = true;
      ffmpegVersion = combined.split(/\r?\n/)[0]?.trim();
      libass = /--enable-libass/i.test(combined);
    } catch {
      ffmpegAvailable = false;
    }

    if (ffmpegAvailable) {
      try {
        const { stdout } = await execFileAsync(ffmpegPath, ['-hide_banner', '-filters'], {
          timeout: 10000,
          maxBuffer: 8 * 1024 * 1024
        });
        subtitlesFilter = /\bsubtitles\b/.test(stdout);
        assFilter = /\bass\b/.test(stdout);
        if (subtitlesFilter || assFilter) {
          libass = true;
        }
      } catch {}

      try {
        const { stdout } = await execFileAsync(ffmpegPath, ['-hide_banner', '-encoders'], {
          timeout: 10000,
          maxBuffer: 8 * 1024 * 1024
        });
        libmp3lame = /\blibmp3lame\b/.test(stdout);
        libx264 = /\blibx264\b/.test(stdout);
      } catch {}
    }

    let ffprobeAvailable = false;
    try {
      await execFileAsync(ffprobePath, ['-version'], {
        timeout: 8000,
        maxBuffer: 2 * 1024 * 1024
      });
      ffprobeAvailable = true;
    } catch {
      ffprobeAvailable = false;
    }

    const fontconfigReady = process.platform === 'win32'
      || process.platform === 'darwin'
      || fs.existsSync('/etc/fonts/fonts.conf')
      || availableFontDirs.length > 0;

    this.cachedCapabilities = {
      ffmpegAvailable,
      ffmpegPath,
      ffmpegVersion,
      ffprobeAvailable,
      ffprobePath,
      subtitlesFilter,
      assFilter,
      libass,
      libmp3lame,
      libx264,
      availableFontDirs,
      fontconfigReady
    };

    return this.cachedCapabilities;
  }

  /**
   * Probes media streams (duration, video resolution, audio stream presence).
   * Works both with ffprobe and on Render native Node (ffmpeg-static without ffprobe)
   * by falling back to parsing `ffmpeg -i` stream headers.
   */
  public static async probeMedia(filePath: string): Promise<MediaProbeInfo> {
    const fallback: MediaProbeInfo = {
      durationSec: 0,
      width: 1080,
      height: 1920,
      hasVideo: false,
      hasAudio: false
    };

    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    // 1. Try ffprobe JSON inspection if available
    try {
      const ffprobe = await this.getFfprobePath();
      const { stdout } = await execFileAsync(
        ffprobe,
        ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath],
        { timeout: 15000, maxBuffer: 5 * 1024 * 1024 }
      );
      const parsed = JSON.parse(stdout || '{}');
      const streams: any[] = Array.isArray(parsed.streams) ? parsed.streams : [];
      const videoStream = streams.find((s) => s.codec_type === 'video');
      const audioStream = streams.find((s) => s.codec_type === 'audio');
      const formatDur = parseFloat(parsed.format?.duration || '0');
      const streamDur = parseFloat(videoStream?.duration || audioStream?.duration || '0');
      const durationSec = Number.isFinite(formatDur) && formatDur > 0
        ? formatDur
        : Number.isFinite(streamDur) && streamDur > 0
          ? streamDur
          : 0;

      const width = Number(videoStream?.width) > 0 ? Number(videoStream.width) : 1080;
      const height = Number(videoStream?.height) > 0 ? Number(videoStream.height) : 1920;

      return {
        durationSec,
        width,
        height,
        hasVideo: Boolean(videoStream),
        hasAudio: Boolean(audioStream),
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name
      };
    } catch {
      // Fall through to ffmpeg -i header parser (standard path when using ffmpeg-static without ffprobe)
    }

    // 2. Fallback: parse `ffmpeg -hide_banner -i <filePath>` stderr output
    try {
      const ffmpeg = await this.getFfmpegPath();
      const res: any = await execFileAsync(ffmpeg, ['-hide_banner', '-i', filePath], {
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024
      }).catch((err) => err);

      const stderr = res && res.stderr ? String(res.stderr) : '';
      let durationSec = 0;
      const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      if (durMatch) {
        durationSec =
          parseFloat(durMatch[1]) * 3600 +
          parseFloat(durMatch[2]) * 60 +
          parseFloat(durMatch[3]);
      }

      const videoLineMatch = stderr.match(/Stream\s+#\d+:\d+[^\r\n]*Video:\s*([a-zA-Z0-9_]+)[^\r\n]*/);
      const audioLineMatch = stderr.match(/Stream\s+#\d+:\d+[^\r\n]*Audio:\s*([a-zA-Z0-9_]+)[^\r\n]*/);

      let width = 1080;
      let height = 1920;
      if (videoLineMatch) {
        const resMatch = videoLineMatch[0].match(/(?:,\s*|\s)(\d{2,5})x(\d{2,5})(?=[\s,\[])/);
        if (resMatch) {
          const w = parseInt(resMatch[1], 10);
          const h = parseInt(resMatch[2], 10);
          if (w > 0 && h > 0) {
            width = w;
            height = h;
          }
        }
      }

      return {
        durationSec,
        width,
        height,
        hasVideo: Boolean(videoLineMatch),
        hasAudio: Boolean(audioLineMatch),
        videoCodec: videoLineMatch?.[1],
        audioCodec: audioLineMatch?.[1]
      };
    } catch (err) {
      logger.warn(`Failed to probe media ${path.basename(filePath)}:`, err);
      return fallback;
    }
  }

  public static async getVideoDimensions(filePath: string): Promise<{ width: number; height: number }> {
    const info = await this.probeMedia(filePath);
    return { width: info.width, height: info.height };
  }

  public static async hasAudioStream(filePath: string): Promise<boolean> {
    const info = await this.probeMedia(filePath);
    return info.hasAudio;
  }

  /**
   * Inspects an audio or video file to extract duration in seconds with microsecond accuracy.
   */
  public static async getMediaDuration(filePath: string): Promise<number> {
    const info = await this.probeMedia(filePath);
    return info.durationSec;
  }

  /**
   * Extracts speech-optimized mono 16kHz audio onto disk (compact 48kbps MP3 by default,
   * reducing upload payload >5x compared to uncompressed WAV while preserving full Whisper speech fidelity).
   */
  public static async extractSpeechAudio(
    inputPath: string,
    outputPath: string,
    options: { format?: 'mp3' | 'wav'; sampleRate?: number; bitrateKbps?: number } = {}
  ): Promise<{ outputPath: string; format: 'mp3' | 'wav'; sizeBytes: number }> {
    const caps = await this.checkCapabilities();
    const ffmpeg = caps.ffmpegPath;
    const sampleRate = options.sampleRate || 16000;
    const bitrateKbps = options.bitrateKbps || 48;
    const preferMp3 = (options.format || 'mp3') === 'mp3' && caps.libmp3lame;

    const finalFormat: 'mp3' | 'wav' = preferMp3 ? 'mp3' : 'wav';
    const finalPath = finalFormat === 'mp3'
      ? outputPath.replace(/\.[^.]+$/, '.mp3')
      : outputPath.replace(/\.[^.]+$/, '.wav');

    const codecArgs = finalFormat === 'mp3'
      ? ['-c:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`]
      : ['-c:a', 'pcm_s16le'];

    await execFileAsync(
      ffmpeg,
      ['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', String(sampleRate), ...codecArgs, finalPath],
      { maxBuffer: 30 * 1024 * 1024, timeout: 300000 }
    );

    const stat = await fs.promises.stat(finalPath);
    return {
      outputPath: finalPath,
      format: finalFormat,
      sizeBytes: stat.size
    };
  }

  /**
   * Splits a long audio file on disk into overlapping compressed speech chunks
   * so long videos never exceed cloud ASR 25 MB upload limits or exhaust server RAM.
   */
  public static async splitAudioIntoChunks(
    inputPath: string,
    outputDir: string,
    options: {
      totalDurationSec?: number;
      chunkDurationSec: number;
      overlapSec: number;
      format?: 'mp3' | 'wav';
    }
  ): Promise<AudioChunkSlice[]> {
    await fs.promises.mkdir(outputDir, { recursive: true });
    const caps = await this.checkCapabilities();
    const ffmpeg = caps.ffmpegPath;
    const totalDuration = options.totalDurationSec && options.totalDurationSec > 0
      ? options.totalDurationSec
      : await this.getMediaDuration(inputPath);

    const chunkDuration = Math.max(5, options.chunkDurationSec);
    const overlap = Math.max(0, Math.min(chunkDuration * 0.25, options.overlapSec));
    const step = Math.max(1, chunkDuration - overlap);
    const useMp3 = (options.format || 'mp3') === 'mp3' && caps.libmp3lame;
    const ext = useMp3 ? '.mp3' : '.wav';
    const codecArgs = useMp3
      ? ['-c:a', 'libmp3lame', '-b:a', '48k']
      : ['-c:a', 'pcm_s16le'];

    const slices: AudioChunkSlice[] = [];
    if (totalDuration <= 0) {
      const singlePath = path.join(outputDir, `chunk_000${ext}`);
      await execFileAsync(
        ffmpeg,
        ['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', ...codecArgs, singlePath],
        { maxBuffer: 20 * 1024 * 1024, timeout: 180000 }
      );
      const stat = await fs.promises.stat(singlePath);
      slices.push({
        index: 0,
        filePath: singlePath,
        offsetSec: 0,
        durationSec: 0,
        sizeBytes: stat.size
      });
      return slices;
    }

    let offset = 0;
    let idx = 0;
    while (offset < totalDuration - 0.05) {
      const remaining = totalDuration - offset;
      // Avoid creating a tiny trailing sliver (< 2s) if the current chunk can absorb it
      const windowDur = remaining <= chunkDuration + 2.0 ? remaining : chunkDuration;
      const chunkPath = path.join(outputDir, `chunk_${String(idx).padStart(3, '0')}${ext}`);

      await execFileAsync(
        ffmpeg,
        [
          '-y',
          '-ss', offset.toFixed(3),
          '-t', windowDur.toFixed(3),
          '-i', inputPath,
          '-vn',
          '-ac', '1',
          '-ar', '16000',
          ...codecArgs,
          chunkPath
        ],
        { maxBuffer: 20 * 1024 * 1024, timeout: 180000 }
      );

      const stat = await fs.promises.stat(chunkPath).catch(() => null);
      if (stat && stat.size > 128) {
        slices.push({
          index: idx,
          filePath: chunkPath,
          offsetSec: Number(offset.toFixed(3)),
          durationSec: Number(windowDur.toFixed(3)),
          sizeBytes: stat.size
        });
      }

      if (offset + windowDur >= totalDuration - 0.05) {
        break;
      }
      offset += step;
      idx++;
    }

    return slices;
  }

  /**
   * Extracts audio from a video or audio file into MP3 format.
   */
  public static async extractAudio(inputPath: string, outputPath: string): Promise<string> {
    const ffmpeg = await this.getFfmpegPath();
    const args = [
      '-y',
      '-i', inputPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      '-ar', '44100',
      outputPath
    ];

    logger.info(`Extracting audio with FFmpeg: ${args.join(' ')}`);
    await execFileAsync(ffmpeg, args);
    return outputPath;
  }

  /**
   * Adjusts the speed and duration of an audio file to match a target duration EXACTLY.
   * Uses atempo filtering for natural pitch-preserved speed adjustment, and apad / -t
   * so the output audio duration matches targetDurationSec down to the millisecond.
   */
  public static async adjustAudioDuration(
    inputPath: string,
    outputPath: string,
    targetDurationSec: number
  ): Promise<string> {
    const currentDuration = await this.getMediaDuration(inputPath);
    const ffmpeg = await this.getFfmpegPath();

    if (!currentDuration || currentDuration <= 0 || targetDurationSec <= 0) {
      if (inputPath !== outputPath) {
        await fs.promises.copyFile(inputPath, outputPath);
      }
      return outputPath;
    }

    const ratio = currentDuration / targetDurationSec;
    // Bound tempo stretching to natural human limits (0.6x to 1.8x)
    const clampedTempo = Math.max(0.6, Math.min(1.8, ratio));

    let filterChain = '';
    if (Math.abs(clampedTempo - 1.0) > 0.04) {
      if (clampedTempo > 2.0) {
        filterChain = `atempo=2.0,atempo=${(clampedTempo / 2.0).toFixed(4)}`;
      } else if (clampedTempo < 0.5) {
        filterChain = `atempo=0.5,atempo=${(clampedTempo / 0.5).toFixed(4)}`;
      } else {
        filterChain = `atempo=${clampedTempo.toFixed(4)}`;
      }
    }

    // Pad with silence if shorter than target, or clip if longer
    const fullFilter = filterChain ? `${filterChain},apad` : 'apad';

    const args = [
      '-y',
      '-i', inputPath,
      '-filter:a', fullFilter,
      '-t', targetDurationSec.toFixed(3),
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      outputPath
    ];

    logger.info(`Matching audio duration (${currentDuration.toFixed(2)}s -> ${targetDurationSec.toFixed(2)}s, tempo: ${clampedTempo.toFixed(2)}): ${args.join(' ')}`);
    await execFileAsync(ffmpeg, args);
    return outputPath;
  }

  /**
   * Generates a clean synthetic MP3 tone/speech file for fallback or tests.
   */
  public static async generateToneAudio(outputPath: string, durationSec: number = 3.0): Promise<string> {
    const ffmpeg = await this.getFfmpegPath();
    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `sine=frequency=440:duration=${durationSec.toFixed(3)}`,
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      outputPath
    ];
    await execFileAsync(ffmpeg, args);
    return outputPath;
  }

  /**
   * Replaces the audio track of a video with translated audio track, exporting an MP4.
   */
  public static async replaceVideoAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<string> {
    const ffmpeg = await this.getFfmpegPath();
    const args = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      outputPath
    ];

    logger.info(`Dubbing video with FFmpeg: ${args.join(' ')}`);
    await execFileAsync(ffmpeg, args);
    return outputPath;
  }
}
