import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class FlowStorageService {
  private static initialized = false;

  public static getRootDirectory(): string {
    return fs.existsSync(path.resolve(process.cwd(), 'server'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');
  }

  public static get dataDir(): string {
    return path.resolve(this.getRootDirectory(), 'data');
  }

  public static get accountsFilePath(): string {
    return path.resolve(this.dataDir, 'flow_accounts.json');
  }

  public static get jobsFilePath(): string {
    return path.resolve(this.dataDir, 'flow_jobs.json');
  }

  public static get videosDir(): string {
    return path.resolve(this.dataDir, 'flow_studio', 'videos');
  }

  public static get imagesDir(): string {
    return path.resolve(this.dataDir, 'flow_studio', 'images');
  }

  public static get imagesFilePath(): string {
    return path.resolve(this.dataDir, 'flow_images.json');
  }

  public static get tempDir(): string {
    return path.resolve(this.getRootDirectory(), 'temp_storage');
  }

  public static initStorage(): void {
    if (!this.initialized) {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.videosDir)) {
        fs.mkdirSync(this.videosDir, { recursive: true });
      }
      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
      }
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      if (!fs.existsSync(this.accountsFilePath)) {
        fs.writeFileSync(this.accountsFilePath, JSON.stringify([], null, 2), 'utf-8');
      }
      if (!fs.existsSync(this.jobsFilePath)) {
        fs.writeFileSync(this.jobsFilePath, JSON.stringify([], null, 2), 'utf-8');
      }
      if (!fs.existsSync(this.imagesFilePath)) {
        fs.writeFileSync(this.imagesFilePath, JSON.stringify([], null, 2), 'utf-8');
      }
      this.initialized = true;
      logger.info(`Google Flow Studio storage initialized at ${this.dataDir}`);
    }
  }

  public static sanitizeFilename(filename: string): string {
    return path.basename(filename).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  }

  public static getSafeVideoPath(filename: string): string {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Access denied: directory traversal detected.');
    }
    const safeName = this.sanitizeFilename(filename);
    const resolved = path.resolve(this.videosDir, safeName);
    if (!resolved.startsWith(this.videosDir)) {
      throw new Error('Access denied: directory traversal detected.');
    }
    return resolved;
  }

  public static getSafeImagePath(filename: string): string {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Access denied: directory traversal detected.');
    }
    const safeName = this.sanitizeFilename(filename);
    const resolved = path.resolve(this.imagesDir, safeName);
    if (!resolved.startsWith(this.imagesDir)) {
      throw new Error('Access denied: directory traversal detected.');
    }
    return resolved;
  }

  public static async readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    this.initStorage();
    try {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.error(`Error reading ${filePath}:`, err);
      return fallback;
    }
  }

  public static async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    this.initStorage();
    const tempPath = `${filePath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      
      // On Windows, rename can briefly conflict with read handles; retry up to 5 times
      let renamed = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await fs.promises.rename(tempPath, filePath);
          renamed = true;
          break;
        } catch (renameErr: any) {
          if (renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') {
            await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
          } else {
            throw renameErr;
          }
        }
      }

      if (!renamed) {
        // Fallback: direct write if rename remained locked
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.promises.unlink(tempPath).catch(() => {});
      }
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath).catch(() => {});
      }
      logger.error(`Error writing ${filePath}:`, err);
      throw err;
    }
  }
}
