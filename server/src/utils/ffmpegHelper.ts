import { exec, execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

export class FFmpegHelper {
  private static cachedFfmpegPath: string | null = null;

  /**
   * Discovers the FFmpeg executable on the host system.
   */
  public static async getFfmpegPath(): Promise<string> {
    if (this.cachedFfmpegPath && fs.existsSync(this.cachedFfmpegPath)) {
      return this.cachedFfmpegPath;
    }

    // 1. Check explicit environment variable
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
      this.cachedFfmpegPath = process.env.FFMPEG_PATH;
      return this.cachedFfmpegPath;
    }

    // 2. Check Python static_ffmpeg installation on Windows
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
      logger.info(`FFmpeg resolved to static_ffmpeg binary: ${this.cachedFfmpegPath}`);
      return this.cachedFfmpegPath;
    }

    // 3. Check system PATH via 'where' or 'which'
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
    } catch {
      // Ignored
    }

    // Default to 'ffmpeg' in PATH if nothing found
    return 'ffmpeg';
  }

  /**
   * Inspects an audio or video file to extract duration in seconds.
   */
  public static async getMediaDuration(filePath: string): Promise<number> {
    try {
      const ffmpeg = await this.getFfmpegPath();
      // Use ffmpeg -i to probe duration from stderr
      const { stderr } = await execFileAsync(ffmpeg, ['-i', filePath], { maxBuffer: 10 * 1024 * 1024 }).catch((err) => err);
      const match = (stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
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
   * Adjusts the speed of an audio file to match a target duration using atempo filter.
   * FFmpeg's atempo accepts values between 0.5 and 2.0. Multiple filters are chained for larger ratios.
   */
  public static async adjustAudioDuration(
    inputPath: string,
    outputPath: string,
    targetDurationSec: number
  ): Promise<string> {
    const currentDuration = await this.getMediaDuration(inputPath);
    if (!currentDuration || currentDuration <= 0 || targetDurationSec <= 0) {
      // If duration couldn't be determined, copy original
      await fs.promises.copyFile(inputPath, outputPath);
      return outputPath;
    }

    const ratio = currentDuration / targetDurationSec;
    // Bound ratio to realistic speech stretching (0.5x to 2.5x)
    const clampedRatio = Math.max(0.5, Math.min(2.5, ratio));

    // If change is negligible (< 3%), don't re-encode
    if (Math.abs(clampedRatio - 1.0) < 0.03) {
      await fs.promises.copyFile(inputPath, outputPath);
      return outputPath;
    }

    let filterChain = '';
    if (clampedRatio > 2.0) {
      filterChain = `atempo=2.0,atempo=${(clampedRatio / 2.0).toFixed(4)}`;
    } else if (clampedRatio < 0.5) {
      filterChain = `atempo=0.5,atempo=${(clampedRatio / 0.5).toFixed(4)}`;
    } else {
      filterChain = `atempo=${clampedRatio.toFixed(4)}`;
    }

    const ffmpeg = await this.getFfmpegPath();
    const args = [
      '-y',
      '-i', inputPath,
      '-filter:a', filterChain,
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      outputPath
    ];

    logger.info(`Stretching audio duration (current: ${currentDuration.toFixed(2)}s -> target: ${targetDurationSec.toFixed(2)}s, ratio: ${clampedRatio.toFixed(2)}): ${filterChain}`);
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
