import fs from 'fs';
import path from 'path';
import { TranscriptionProject, TranscriptionSegment } from '../../../shared/src/types';
import { logger } from '../utils/logger';

export class TranscriptionStorageService {
  private static readonly STORAGE_FILE = path.resolve(process.cwd(), 'data/transcription_projects.json');
  private static isInitialized = false;

  public static initStorage(): void {
    if (this.isInitialized) return;
    try {
      const dir = path.dirname(this.STORAGE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.STORAGE_FILE)) {
        fs.writeFileSync(this.STORAGE_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
      this.isInitialized = true;
      logger.info(`Transcription storage initialized at ${this.STORAGE_FILE}`);
    } catch (err) {
      logger.error('Failed to initialize transcription storage:', err);
    }
  }

  public static async getAllProjects(): Promise<TranscriptionProject[]> {
    this.initStorage();
    try {
      if (!fs.existsSync(this.STORAGE_FILE)) return [];
      const data = await fs.promises.readFile(this.STORAGE_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      logger.error('Failed to read transcription projects:', err);
      return [];
    }
  }

  public static async getProjectById(id: string): Promise<TranscriptionProject | null> {
    const list = await this.getAllProjects();
    return list.find((p) => p.id === id) || null;
  }

  public static async saveProject(project: TranscriptionProject): Promise<TranscriptionProject> {
    this.initStorage();
    const list = await this.getAllProjects();
    const existingIndex = list.findIndex((p) => p.id === project.id);

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...project,
        updatedAt: new Date().toISOString()
      };
    } else {
      list.unshift(project);
    }

    await this.writeProjectsWithRetry(list);
    return project;
  }

  public static async updateSegments(projectId: string, segments: TranscriptionSegment[]): Promise<TranscriptionProject | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    project.segments = segments;
    project.updatedAt = new Date().toISOString();
    return this.saveProject(project);
  }

  public static async deleteProject(id: string): Promise<boolean> {
    this.initStorage();
    const list = await this.getAllProjects();
    const initialLen = list.length;
    const filtered = list.filter((p) => p.id !== id);

    if (filtered.length !== initialLen) {
      await this.writeProjectsWithRetry(filtered);
      return true;
    }
    return false;
  }

  private static async writeProjectsWithRetry(data: TranscriptionProject[]): Promise<void> {
    const tmpFile = `${this.STORAGE_FILE}.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const content = JSON.stringify(data, null, 2);

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await fs.promises.writeFile(tmpFile, content, 'utf-8');
        await fs.promises.rename(tmpFile, this.STORAGE_FILE);
        return;
      } catch (err: any) {
        if (fs.existsSync(tmpFile)) {
          await fs.promises.unlink(tmpFile).catch(() => {});
        }
        if (attempt === 5) {
          logger.error('Failed to write transcription projects after 5 attempts:', err);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }
  }
}

