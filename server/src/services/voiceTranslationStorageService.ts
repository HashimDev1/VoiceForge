import fs from 'fs';
import path from 'path';
import { VoiceTranslationProject, TranslationOutput } from '../../../shared/src/types';
import { logger } from '../utils/logger';

export class VoiceTranslationStorageService {
  private static getRootDirectory(): string {
    return fs.existsSync(path.resolve(process.cwd(), 'server'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');
  }

  private static get dataDir(): string {
    return path.resolve(this.getRootDirectory(), 'data');
  }

  private static get filePath(): string {
    return path.resolve(this.getRootDirectory(), 'data', 'voice_translation_projects.json');
  }

  private static initialized = false;

  public static initStorage(): void {
    if (!this.initialized) {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      }
      this.initialized = true;
      logger.info(`Voice translation projects storage initialized at ${this.filePath}`);
    }
  }

  public static async getAllProjects(): Promise<VoiceTranslationProject[]> {
    this.initStorage();
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      logger.error('Failed to read translation projects:', err);
      return [];
    }
  }

  public static async getProjectById(id: string): Promise<VoiceTranslationProject | null> {
    const list = await this.getAllProjects();
    return list.find((p) => p.id === id) || null;
  }

  public static async saveProject(project: VoiceTranslationProject): Promise<VoiceTranslationProject> {
    this.initStorage();
    const list = await this.getAllProjects();
    const existingIndex = list.findIndex((p) => p.id === project.id);

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...project, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(project);
    }

    await fs.promises.writeFile(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    logger.info(`Saved translation project: ${project.projectName} (${project.id})`);
    return existingIndex >= 0 ? list[existingIndex] : project;
  }

  public static async updateProjectStatus(
    id: string,
    status: VoiceTranslationProject['status'],
    error?: string
  ): Promise<VoiceTranslationProject | null> {
    const project = await this.getProjectById(id);
    if (!project) return null;

    project.status = status;
    if (error) project.error = error;
    project.updatedAt = new Date().toISOString();

    return await this.saveProject(project);
  }

  public static async addOutput(
    projectId: string,
    output: TranslationOutput
  ): Promise<VoiceTranslationProject | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    if (!project.outputs) project.outputs = [];
    const existingIdx = project.outputs.findIndex((o) => o.language === output.language);
    if (existingIdx >= 0) {
      project.outputs[existingIdx] = output;
    } else {
      project.outputs.push(output);
    }
    project.updatedAt = new Date().toISOString();

    return await this.saveProject(project);
  }

  public static async deleteOutput(
    projectId: string,
    outputId: string
  ): Promise<VoiceTranslationProject | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    project.outputs = (project.outputs || []).filter((o) => o.id !== outputId);
    project.updatedAt = new Date().toISOString();

    return await this.saveProject(project);
  }

  public static async deleteProject(id: string): Promise<boolean> {
    this.initStorage();
    const list = await this.getAllProjects();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) {
      return false;
    }

    await fs.promises.writeFile(this.filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    logger.info(`Deleted translation project ID: ${id}`);
    return true;
  }
}
