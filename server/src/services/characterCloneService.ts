import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Voice, VoiceCategory } from '../../../shared/src/types';
import { VoiceStorageService } from './voiceStorageService';
import { ProjectService } from './projectService';
import { logger } from '../utils/logger';

export interface CloneCharacterOptions {
  title: string;
  description?: string;
  gender?: 'Male' | 'Female' | 'Neutral';
  category?: VoiceCategory;
  language?: string;
  style?: string;
}

export interface CloneCharacterResult {
  success: boolean;
  voice: Voice;
  acoustics?: {
    pitchHz: number;
    gender: string;
    spectralCentroid: number;
    blendDescription?: string;
  };
}

function resolveScriptPath(scriptName: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'server/src/scripts', scriptName),
    path.resolve(process.cwd(), 'src/scripts', scriptName),
    path.resolve(process.cwd(), 'server/dist/server/src/scripts', scriptName),
    path.resolve(__dirname, '../scripts', scriptName),
    path.resolve(__dirname, '../../src/scripts', scriptName),
    path.resolve(__dirname, '../../../../server/src/scripts', scriptName),
    path.resolve(__dirname, '../../../server/src/scripts', scriptName)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.resolve(process.cwd(), 'server/src/scripts', scriptName);
}

export class CharacterCloneService {
  /**
   * Clone a character's voice from an audio buffer using local neural acoustic matching & Kokoro ONNX
   */
  public static async cloneCharacter(
    audioBuffer: Buffer,
    originalName: string,
    options: CloneCharacterOptions
  ): Promise<CloneCharacterResult> {
    const cleanId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const scriptPath = resolveScriptPath('clone_character_voice.py');

    const tempDir = path.resolve(process.cwd(), 'temp_storage');
    const clonedDir = path.resolve(process.cwd(), 'data', 'cloned_voices');
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.mkdir(clonedDir, { recursive: true });

    // Save input audio temporarily
    const ext = path.extname(originalName) || '.mp3';
    const tempInputPath = path.join(tempDir, `raw_${cleanId}${ext}`);
    const outputNpyPath = path.join(clonedDir, `${cleanId}.npy`);
    const outputPreviewPath = path.join(tempDir, `preview_${cleanId}.mp3`);

    await fs.promises.writeFile(tempInputPath, audioBuffer);

    logger.info(`[CharacterClone] Initiating neural voice cloning for "${options.title}" (${audioBuffer.length} bytes)`);

    const payload = {
      audioPath: tempInputPath,
      characterName: options.title.trim(),
      voiceId: cleanId,
      gender: options.gender,
      language: options.language || 'English',
      outputNpyPath,
      outputPreviewPath
    };

    const pyOutput = await new Promise<string>((resolve, reject) => {
      const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (d) => { stdout += d.toString(); });
      py.stderr.on('data', (d) => { stderr += d.toString(); });

      py.on('error', (err) => reject(new Error(`Failed to spawn Python clone script: ${err.message}`)));

      py.on('close', (code) => {
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`Python character clone worker failed (code ${code}): ${stderr || stdout}`));
        } else {
          resolve(stdout);
        }
      });

      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(pyOutput || '{}');
    } catch {
      throw new Error(`Failed to parse character clone response: ${pyOutput}`);
    }

    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to clone character voice.');
    }

    // Save preview audio and reference audio to ProjectService
    let previewUrl: string | undefined = undefined;
    if (fs.existsSync(outputPreviewPath)) {
      const prevBuf = await fs.promises.readFile(outputPreviewPath);
      const saved = await ProjectService.saveAudioFile(prevBuf, `clone_preview_${cleanId}`);
      previewUrl = saved.fileUrl;
      try { await fs.promises.unlink(outputPreviewPath); } catch {}
    }

    // Save reference audio
    let refAudioUrl: string | undefined = undefined;
    try {
      const savedRef = await ProjectService.saveAudioFile(audioBuffer, `clone_ref_${cleanId}`);
      refAudioUrl = savedRef.fileUrl;
    } catch {}

    try { await fs.promises.unlink(tempInputPath); } catch {}

    const genderVal = (options.gender && options.gender !== 'Neutral')
      ? options.gender
      : (parsed.gender as any) || 'Neutral';

    const voiceLanguage = options.language || parsed.language || 'English';

    const newVoice: Voice = {
      id: `kokoro_cloned_${cleanId}`,
      name: options.title.trim(),
      language: voiceLanguage,
      style: options.style || `${genderVal} Character (${parsed.pitchHz || 140}Hz)`,
      gender: genderVal,
      description: options.description || `Cloned neural character voice (${parsed.blendDescription || 'Custom Blend'})`,
      category: options.category || (genderVal === 'Female' ? 'Storytelling' : 'Documentary'),
      previewAudioUrl: previewUrl,
      provider: 'open-source-tts',
      isCustom: true,
      isCloned: true,
      isFree: true
    };

    await VoiceStorageService.saveCustomVoice(newVoice);
    logger.info(`[CharacterClone] Voice "${newVoice.name}" successfully cloned and saved with ID: ${newVoice.id}`);

    return {
      success: true,
      voice: newVoice,
      acoustics: {
        pitchHz: parsed.pitchHz,
        gender: parsed.gender,
        spectralCentroid: parsed.spectralCentroid,
        blendDescription: parsed.blendDescription
      }
    };
  }
}
