import fs from 'fs';
import path from 'path';
import { DocumentaryProject, DocumentaryHandoffResult } from '../../../shared/src/documentaryTypes';
import { compileDocumentaryToEditorProject, parseScriptToScenes } from '../../../shared/src/documentaryCompiler';
import { VideoEditorService } from './videoEditorService';
import { logger } from '../utils/logger';

export class DocumentaryService {
  private static storageFile: string = path.join(process.cwd(), 'data', 'documentary_projects.json');

  public static initStorage(): void {
    const dataDir = path.dirname(this.storageFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.storageFile)) {
      const initialProject: DocumentaryProject = this.createDefaultProject();
      fs.writeFileSync(this.storageFile, JSON.stringify([initialProject], null, 2), 'utf-8');
      logger.info(`Initialized documentary project storage at ${this.storageFile}`);
    }
  }

  public static createDefaultProject(): DocumentaryProject {
    return {
      id: `doc_proj_${Date.now()}_default`,
      name: 'Chronicles of the Ancient Silk Road',
      synopsis: 'An investigative historical journey through the trade routes and forgotten fortresses that connected East and West.',
      tone: 'cinematic_historical',
      aspectRatio: '16:9',
      scenes: [
        {
          id: 'scene_1_intro',
          sceneNumber: 1,
          title: 'Prologue: Whispers in the Dust',
          narrationText: 'Across four thousand miles of windswept desert, an ancient network of routes connected empires and reshaped the destiny of mankind.',
          visualInstruction: 'Cinematic wide aerial drone shot drifting over sprawling mountain passes and sunlit desert ruins.',
          sceneDescription: 'Epic historical overture setting the grand scale of the documentary.',
          duration: 5.5,
          motionGraphic: {
            enabled: true,
            templateId: 'cinematic_master_title',
            type: 'opening',
            titleDesign: {
              mainText: 'SILK ROAD CHRONICLES',
              subtitleText: 'AN INVESTIGATIVE HISTORICAL JOURNEY',
              fontFamily: 'Cinzel',
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: 8,
              lineHeight: 1.2,
              textAlign: 'center',
              textColor: '#E2E8F0',
              subtitleFontFamily: 'Inter',
              subtitleFontSize: 16,
              subtitleColor: '#F59E0B',
              animation: {
                type: 'tracking_reveal',
                inDuration: 0.8,
                outDuration: 0.5,
                delay: 0,
                easing: 'ease_out'
              }
            },
            startTimeOffset: 0.5,
            duration: 4.5
          }
        },
        {
          id: 'scene_2_discovery',
          sceneNumber: 2,
          title: 'The Great Oasis of Samarkand',
          narrationText: 'At the heart of the journey lay Samarkand, a city of turquoise domes, scholars, and merchants whose wealth rivaled the greatest kingdoms of Europe.',
          visualInstruction: 'Slow tracking shot showcasing monumental archways, intricate Islamic calligraphy, and dusty desert roads.',
          sceneDescription: 'Focus on architectural wonder, wealth, and cultural crossroads.',
          duration: 6.0,
          motionGraphic: {
            enabled: true,
            templateId: 'documentary_lower_third',
            type: 'lower_third',
            titleDesign: {
              mainText: 'SAMARKAND, CENTRAL ASIA',
              subtitleText: 'Trading Crossroads • 14th Century',
              fontFamily: 'Montserrat',
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
              lineHeight: 1.2,
              textAlign: 'left',
              textColor: '#FFFFFF',
              subtitleFontFamily: 'Inter',
              subtitleFontSize: 13,
              subtitleColor: '#CBD5E1',
              backgroundBox: {
                enabled: true,
                color: '#0F172A',
                opacity: 0.85,
                paddingX: 18,
                paddingY: 10,
                borderRadius: 8
              },
              animation: {
                type: 'slide',
                inDuration: 0.6,
                outDuration: 0.4,
                delay: 0,
                easing: 'ease_out',
                direction: 'left'
              }
            },
            startTimeOffset: 1.0,
            duration: 4.0
          }
        },
        {
          id: 'scene_3_legacy',
          sceneNumber: 3,
          title: 'Epilogue: Legacy of Knowledge',
          narrationText: 'Though the ancient trade routes fell silent centuries ago, the ideas, paper, and mathematics they carried forward continue to define our modern world.',
          visualInstruction: 'Sun setting over ancient ruins, with golden hour dust motes floating into twilight.',
          sceneDescription: 'Contemplative conclusion highlighting enduring human achievement.',
          duration: 5.5,
          motionGraphic: {
            enabled: true,
            templateId: 'modern_lower_third',
            type: 'heading',
            titleDesign: {
              mainText: 'THE ENDURING LEGACY',
              subtitleText: 'VoiceForge Studio AI Documentary Production',
              fontFamily: 'Inter',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
              lineHeight: 1.2,
              textAlign: 'center',
              textColor: '#F8FAFC',
              animation: {
                type: 'fade',
                inDuration: 0.7,
                outDuration: 0.5,
                delay: 0,
                easing: 'ease_in_out'
              }
            },
            startTimeOffset: 0.5,
            duration: 4.0
          }
        }
      ],
      captionSettings: {
        enabled: true,
        presetId: 'doc_classic',
        fontFamily: 'Inter',
        fontSize: 34,
        activeColor: '#38BDF8'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private static readData(): DocumentaryProject[] {
    this.initStorage();
    try {
      const raw = fs.readFileSync(this.storageFile, 'utf-8');
      return JSON.parse(raw) as DocumentaryProject[];
    } catch (err) {
      logger.error('Failed to read documentary projects:', err);
      return [];
    }
  }

  private static writeData(projects: DocumentaryProject[]): void {
    this.initStorage();
    fs.writeFileSync(this.storageFile, JSON.stringify(projects, null, 2), 'utf-8');
  }

  public static listProjects(): DocumentaryProject[] {
    return this.readData();
  }

  public static getProject(id: string): DocumentaryProject | null {
    const list = this.readData();
    return list.find((p) => p.id === id) || null;
  }

  public static saveProject(project: DocumentaryProject): DocumentaryProject {
    const list = this.readData();
    const updated: DocumentaryProject = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    const idx = list.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }

    this.writeData(list);
    return updated;
  }

  public static deleteProject(id: string): boolean {
    const list = this.readData();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this.writeData(filtered);
      return true;
    }
    return false;
  }

  public static parseScript(scriptText: string) {
    return parseScriptToScenes(scriptText);
  }

  public static async compileAndHandoff(docProject: DocumentaryProject): Promise<DocumentaryHandoffResult> {
    // 1. Compile documentary to multitrack EditorProject
    const handoffResult = compileDocumentaryToEditorProject(docProject);
    
    // 2. Persist documentary project changes
    this.saveProject(docProject);

    // 3. Save resulting editor project into VideoEditorService storage
    await VideoEditorService.saveProject(handoffResult.editorProject);
    logger.info(`Documentary project "${docProject.name}" handed off to VideoEditor as "${handoffResult.editorProject.id}" (${handoffResult.stats.totalDuration}s, ${handoffResult.stats.sceneCount} scenes)`);

    return handoffResult;
  }
}

