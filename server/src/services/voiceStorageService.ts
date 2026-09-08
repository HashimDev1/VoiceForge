import fs from 'fs';
import path from 'path';
import { Voice } from '../../../shared/src/types';
import { logger } from '../utils/logger';

export class VoiceStorageService {
  private static getRootDirectory(): string {
    return fs.existsSync(path.resolve(process.cwd(), 'server'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');
  }

  private static get dataDir(): string {
    return path.resolve(this.getRootDirectory(), 'data');
  }

  private static get filePath(): string {
    return path.resolve(this.getRootDirectory(), 'data', 'custom_voices.json');
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
      logger.info(`Custom voice storage initialized at ${this.filePath}`);
    }
  }

  public static async getCustomVoices(): Promise<Voice[]> {
    this.initStorage();
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const content = await fs.promises.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (err) {
      logger.error('Error reading custom voices file:', err);
      return [];
    }
  }

  public static async saveCustomVoice(voice: Voice): Promise<Voice[]> {
    this.initStorage();
    try {
      const voices = await this.getCustomVoices();
      const existingIdx = voices.findIndex((v) => v.id === voice.id);

      const newVoice: Voice = {
        id: String(voice.id).trim(),
        name: String(voice.name).trim(),
        language: voice.language || 'English',
        style: voice.style || 'Custom Reference',
        gender: voice.gender || 'Neutral',
        description: voice.description || 'Saved Fish Audio reference ID model.',
        category: voice.category || 'Documentary',
        isCustom: true
      };

      let updatedVoices: Voice[];
      if (existingIdx >= 0) {
        updatedVoices = [...voices];
        updatedVoices[existingIdx] = newVoice;
      } else {
        updatedVoices = [newVoice, ...voices];
      }

      await fs.promises.writeFile(this.filePath, JSON.stringify(updatedVoices, null, 2), 'utf-8');
      logger.info(`Saved custom voice to server: ${newVoice.name} (${newVoice.id})`);
      return updatedVoices;
    } catch (err) {
      logger.error('Error saving custom voice to server:', err);
      throw err;
    }
  }

  public static async deleteCustomVoice(voiceId: string): Promise<Voice[]> {
    this.initStorage();
    try {
      const voices = await this.getCustomVoices();
      const filtered = voices.filter((v) => v.id !== voiceId);
      await fs.promises.writeFile(this.filePath, JSON.stringify(filtered, null, 2), 'utf-8');
      logger.info(`Deleted custom voice ID from server: ${voiceId}`);
      return filtered;
    } catch (err) {
      logger.error('Error deleting custom voice from server:', err);
      throw err;
    }
  }
}
