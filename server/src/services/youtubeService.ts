import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

const execFileAsync = util.promisify(execFile);

export interface YouTubeMediaResult {
  title: string;
  duration: number;
  audioPath: string;
  videoPath?: string;
  thumbnail?: string;
  filename: string;
}

export class YouTubeService {
  private static cachedYtDlpPath: string | null = null;

  public static async getYtDlpPath(): Promise<string> {
    if (this.cachedYtDlpPath && fs.existsSync(this.cachedYtDlpPath)) {
      return this.cachedYtDlpPath;
    }

    const userProfile = process.env.USERPROFILE || 'C:\\Users\\Muhammad Hashim';
    const candidate = path.join(
      userProfile,
      'AppData',
      'Local',
      'Programs',
      'Python',
      'Python314',
      'Scripts',
      'yt-dlp.exe'
    );
    if (fs.existsSync(candidate)) {
      this.cachedYtDlpPath = candidate;
      return this.cachedYtDlpPath;
    }

    return 'yt-dlp';
  }

  /**
   * Imports YouTube video, downloading audio and video tracks into temporary storage.
   */
  public static async importYouTubeVideo(
    url: string,
    options: { downloadVideo?: boolean } = {}
  ): Promise<YouTubeMediaResult> {
    const ytdlp = await this.getYtDlpPath();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const outputPrefix = path.join(config.storageDir, `yt_${id}`);

    logger.info(`Fetching YouTube video metadata for: ${url}`);
    let title = 'YouTube Video';
    let duration = 0;
    let thumbnail = '';

    try {
      const { stdout } = await execFileAsync(ytdlp, ['--dump-json', '--no-playlist', url], {
        maxBuffer: 10 * 1024 * 1024
      });
      const meta = JSON.parse(stdout);
      title = meta.title || title;
      duration = Number(meta.duration) || 0;
      thumbnail = meta.thumbnail || '';
    } catch (err) {
      logger.warn('Failed to parse YouTube metadata JSON, proceeding with direct download:', err);
    }

    const audioOutTemplate = `${outputPrefix}_audio.%(ext)s`;
    const audioArgs = [
      '-x',
      '--audio-format', 'mp3',
      '--no-playlist',
      '-o', audioOutTemplate,
      url
    ];

    logger.info(`Downloading YouTube audio via yt-dlp: ${audioArgs.join(' ')}`);
    await execFileAsync(ytdlp, audioArgs, { maxBuffer: 20 * 1024 * 1024 });

    const expectedAudioPath = `${outputPrefix}_audio.mp3`;
    if (!fs.existsSync(expectedAudioPath)) {
      throw new Error('yt-dlp finished but output audio file was not generated.');
    }

    let videoPath: string | undefined;
    if (options.downloadVideo) {
      const videoOutTemplate = `${outputPrefix}_video.mp4`;
      const videoArgs = [
        '-f', 'mp4[height<=720]/best[ext=mp4]/best',
        '--no-playlist',
        '-o', videoOutTemplate,
        url
      ];
      try {
        logger.info(`Downloading YouTube video stream via yt-dlp: ${videoArgs.join(' ')}`);
        await execFileAsync(ytdlp, videoArgs, { maxBuffer: 20 * 1024 * 1024 });
        if (fs.existsSync(videoOutTemplate)) {
          videoPath = videoOutTemplate;
        }
      } catch (videoErr) {
        logger.warn('Video stream download failed or skipped, continuing with audio only:', videoErr);
      }
    }

    return {
      title,
      duration,
      audioPath: expectedAudioPath,
      videoPath,
      thumbnail,
      filename: path.basename(expectedAudioPath)
    };
  }
}
