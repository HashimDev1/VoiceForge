import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sanitizeFilename, isPathSafe } from '../utils/sanitize';

export class ProjectService {
  private static storageInitialized = false;

  public static initStorage(): void {
    if (!this.storageInitialized) {
      if (!fs.existsSync(config.storageDir)) {
        fs.mkdirSync(config.storageDir, { recursive: true });
      }
      this.storageInitialized = true;
      logger.info(`Storage directory initialized at ${config.storageDir}`);
    }
  }

  /**
   * Saves an audio buffer to local temporary storage and returns a relative file URL.
   */
  public static async saveAudioFile(
    buffer: Buffer,
    prefix: string = 'clip'
  ): Promise<{ filename: string; fileUrl: string }> {
    this.initStorage();
    const cleanPrefix = sanitizeFilename(prefix);
    const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
    const filePath = path.join(config.storageDir, filename);

    if (!isPathSafe(config.storageDir, filePath)) {
      throw new Error('Invalid file path detected.');
    }

    await fs.promises.writeFile(filePath, buffer);
    return {
      filename,
      fileUrl: `/api/audio/file/${filename}`
    };
  }

  /**
   * Retrieves an audio file buffer from temporary storage.
   */
  public static async getAudioFileBuffer(filename: string): Promise<Buffer> {
    this.initStorage();
    const cleanFilename = path.basename(filename);
    const filePath = path.join(config.storageDir, cleanFilename);

    if (!isPathSafe(config.storageDir, filePath)) {
      throw new Error('Invalid file path detected.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${cleanFilename}`);
    }

    return await fs.promises.readFile(filePath);
  }

  /**
   * Automatically cleans up temporary files older than maxAgeHours.
   */
  public static async cleanupOldFiles(maxAgeHours: number = 24): Promise<number> {
    this.initStorage();
    let cleanedCount = 0;
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    const files = await fs.promises.readdir(config.storageDir);
    for (const file of files) {
      if (!file.endsWith('.mp3') && !file.endsWith('.zip')) {
        continue;
      }
      const filePath = path.join(config.storageDir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(filePath);
          cleanedCount++;
        }
      } catch (err) {
        logger.warn(`Failed to inspect/delete file ${file}:`, err);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired audio file(s).`);
    }
    return cleanedCount;
  }
}
