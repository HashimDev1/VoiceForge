import { exec, execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

export class FFmpegHelper {
  private static cachedFfmpegPath: string | null = null;
  private static cachedFfprobePath: string | null = null;

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
   * Inspects an audio or video file to extract duration in seconds with microsecond accuracy.
   */
  public static async getMediaDuration(filePath: string): Promise<number> {
    if (!fs.existsSync(filePath)) {
      return 0;
    }

    // 1. Try ffprobe for exact float seconds
    try {
      const ffprobe = await this.getFfprobePath();
      const { stdout } = await execFileAsync(ffprobe, [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);
      const dur = parseFloat(stdout.trim());
      if (!isNaN(dur) && dur > 0) {
        return dur;
      }
    } catch {}

    // 2. Fallback to ffmpeg -i parsing
    try {
      const ffmpeg = await this.getFfmpegPath();
      const res: any = await execFileAsync(ffmpeg, ['-i', filePath], {
        maxBuffer: 10 * 1024 * 1024
      }).catch((err) => err);

      const stderr = (res && res.stderr) ? String(res.stderr) : '';
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      if (match) {
        const hours = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const seconds = parseFloat(match[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }
    } catch (err) {
      logger.warn(`Failed to inspect duration for ${filePath}:`, err);
    }
    return 0;
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
