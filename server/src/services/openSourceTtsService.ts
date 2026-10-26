import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Voice } from '../../../shared/src/types';
import { logger } from '../utils/logger';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import { VoiceStorageService } from './voiceStorageService';

export interface OpenSourceTtsOptions {
  text: string;
  voiceId?: string;
  speechSpeed?: number;
  pitch?: string;
  volume?: string;
  format?: 'mp3' | 'wav' | 'pcm' | 'opus';
  takeIndex?: number;
}

export interface OpenSourceTtsResult {
  audioBuffer: Buffer;
  duration: number;
  format: string;
  voiceId: string;
  sizeBytes: number;
  engine?: 'kokoro' | 'edge-tts';
}

export const KOKORO_VOICES: Voice[] = [
  // Top-Tier Production American Voices
  {
    id: 'kokoro_af_heart',
    name: 'Heart (Studio Golden Benchmark)',
    language: 'English',
    style: 'Warm / Emotional / Studio Grade',
    gender: 'Female',
    description: 'Gold-standard studio female narrator with natural breathing, warmth, and cadence rivaling ElevenLabs (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_am_adam',
    name: 'Adam (Deep Cinematic Narrator)',
    language: 'English',
    style: 'Deep / Resonant Bass',
    gender: 'Male',
    description: 'Rich, authoritative baritone narrator crafted for high-end mystery, history, and documentary YouTube video essays (Kokoro 82M Offline Neural).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_am_michael',
    name: 'Michael (Authoritative Explainer)',
    language: 'English',
    style: 'Crisp / Professional',
    gender: 'Male',
    description: 'Clear, modern explainer voice for tech breakdowns, finance essays, and educational content (Kokoro 82M Offline Neural).',
    category: 'News',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_af_bella',
    name: 'Bella (Dynamic Commercial & Lifestyle)',
    language: 'English',
    style: 'Bright / Expressive',
    gender: 'Female',
    description: 'Vibrant, upbeat voice for ads, lifestyle vlogs, and captivating storytelling (Kokoro 82M Offline Neural).',
    category: 'Energetic',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_af_sarah',
    name: 'Sarah (Gentle Educator)',
    language: 'English',
    style: 'Articulate / Trustworthy',
    gender: 'Female',
    description: 'Calm, soothing instructor voice ideal for long-form tutorials, audiobooks, and guided content (Kokoro 82M Offline Neural).',
    category: 'Educational',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_af_nicole',
    name: 'Nicole (Smooth Podcast Host)',
    language: 'English',
    style: 'Engaging / Conversational',
    gender: 'Female',
    description: 'Effortless conversational tone for interview podcasts, top-10 commentary, and discussions (Kokoro 82M Offline Neural).',
    category: 'Calm',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_af_nova',
    name: 'Nova (Viral Shorts & Reels)',
    language: 'English',
    style: 'Fast / Punchy',
    gender: 'Female',
    description: 'High retention delivery tuned for viral YouTube Shorts, TikToks, and high-impact hooks (Kokoro 82M Offline Neural).',
    category: 'Motivational',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_af_river',
    name: 'River (Meditation & Sleep Lore)',
    language: 'English',
    style: 'Soft / Intimate',
    gender: 'Female',
    description: 'Gentle, soothing voice with delicate pacing for sleep stories, relaxation, and calm narratives (Kokoro 82M Offline Neural).',
    category: 'Calm',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_am_eric',
    name: 'Eric (Modern Tech Reviewer)',
    language: 'English',
    style: 'Conversational / Confident',
    gender: 'Male',
    description: 'Contemporary tech-savvy tone for gadget reviews, gaming recaps, and video essays (Kokoro 82M Offline Neural).',
    category: 'News',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_am_fenrir',
    name: 'Fenrir (Dark Lore & Mythology)',
    language: 'English',
    style: 'Intense / Suspenseful',
    gender: 'Male',
    description: 'Gripping, mysterious narrator tone for fantasy lore, true crime, and horror stories (Kokoro 82M Offline Neural).',
    category: 'Deep',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_am_onyx',
    name: 'Onyx (Cinematic Trailer Baritone)',
    language: 'English',
    style: 'Heavy Bass / Epic',
    gender: 'Male',
    description: 'Ultra-deep cinematic voice designed for epic trailers, movie intros, and dramatic proclamations (Kokoro 82M Offline Neural).',
    category: 'Cinematic',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_am_puck',
    name: 'Puck (Expressive & Character)',
    language: 'English',
    style: 'Dynamic / Animated',
    gender: 'Male',
    description: 'Expressive personality voice for character dialogue, storytelling, and comedy (Kokoro 82M Offline Neural).',
    category: 'Energetic',
    provider: 'open-source-tts',
    isFree: true
  },
  // British Production Voices
  {
    id: 'kokoro_bm_george',
    name: 'George (BBC Documentary Master)',
    language: 'English',
    style: 'Sophisticated / BBC Style',
    gender: 'Male',
    description: 'Prestigious British documentary narrator tone for wildlife, nature, and historical epics (Kokoro 82M Offline Neural).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_bf_emma',
    name: 'Emma (British Elegant Storyteller)',
    language: 'English',
    style: 'Warm / Refined',
    gender: 'Female',
    description: 'Elegant British narration for literature, audiobooks, and luxury brand stories (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_bm_lewis',
    name: 'Lewis (British Historical Essay)',
    language: 'English',
    style: 'Academic / Authoritative',
    gender: 'Male',
    description: 'Thoughtful British cadence for philosophy, philosophy video essays, and deep dives (Kokoro 82M Offline Neural).',
    category: 'Educational',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_bf_isabella',
    name: 'Isabella (British Prestige Drama)',
    language: 'English',
    style: 'Rich / Theatrical',
    gender: 'Female',
    description: 'Theatrical British voice with emotional range for fiction, poetry, and character roles (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  // Multilingual Kokoro Voices
  {
    id: 'kokoro_hf_alpha',
    name: 'Alpha (Hindi Studio Female)',
    language: 'Hindi',
    style: 'Warm / Melodic',
    gender: 'Female',
    description: 'Studio Hindi female narrator for stories, educational explainers, and poetry (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_hm_omega',
    name: 'Omega (Hindi Studio Male)',
    language: 'Hindi',
    style: 'Deep / Resonant',
    gender: 'Male',
    description: 'Commanding Hindi male narrator for history, documentaries, and news (Kokoro 82M Offline Neural).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_ef_dora',
    name: 'Dora (Spanish Studio Female)',
    language: 'Spanish',
    style: 'Expressive / Warm',
    gender: 'Female',
    description: 'Natural Spanish female narrator for podcasts and stories (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_em_alex',
    name: 'Alex (Spanish Studio Male)',
    language: 'Spanish',
    style: 'Deep / Authoritative',
    gender: 'Male',
    description: 'Spanish documentary male voice for video essays and journalism (Kokoro 82M Offline Neural).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_ff_siwis',
    name: 'Siwis (French Studio Narration)',
    language: 'French',
    style: 'Elegant / Fluid',
    gender: 'Female',
    description: 'Polished French studio narration for culture, science, and literature (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_if_sara',
    name: 'Sara (Italian Studio Narration)',
    language: 'Italian',
    style: 'Melodic / Expressive',
    gender: 'Female',
    description: 'Expressive Italian female voice for cultural essays and storytelling (Kokoro 82M Offline Neural).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_jf_alpha',
    name: 'Alpha (Japanese Studio Narration)',
    language: 'Japanese',
    style: 'Calm / Clear',
    gender: 'Female',
    description: 'Crystal clear Japanese narration for anime breakdowns, games, and guides (Kokoro 82M Offline Neural).',
    category: 'Calm',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'kokoro_zf_xiaobei',
    name: 'Xiaobei (Chinese Studio Narration)',
    language: 'Chinese',
    style: 'Articulate / Crisp',
    gender: 'Female',
    description: 'Clear Mandarin narration for documentaries and educational videos (Kokoro 82M Offline Neural).',
    category: 'Educational',
    provider: 'open-source-tts',
    isFree: true
  }
];

export const EDGE_VOICES: Voice[] = [
  {
    id: 'edge_en-US-ChristopherNeural',
    name: 'Christopher Neural (Documentary & Crime)',
    language: 'English',
    style: 'Deep / Cinematic',
    gender: 'Male',
    description: 'Deep, resonant documentary tone suited for mystery, history, and narrative video essays (Edge-TTS Free).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-GuyNeural',
    name: 'Guy Neural (Explainer & Tech)',
    language: 'English',
    style: 'Crisp / Professional',
    gender: 'Male',
    description: 'Casual, modern explainer tone ideal for tech reviews, top-10 lists, and finance (Edge-TTS Free).',
    category: 'News',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-AndrewNeural',
    name: 'Andrew Neural (Energetic Shorts & TikTok)',
    language: 'English',
    style: 'High Energy / Fast',
    gender: 'Male',
    description: 'Punchy, fast-paced voice designed for viral YouTube Shorts, TikToks, and Reels (Edge-TTS Free).',
    category: 'Motivational',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-JennyNeural',
    name: 'Jenny Neural (Professional & Clean)',
    language: 'English',
    style: 'Articulate / Clear',
    gender: 'Female',
    description: 'Clean, trustworthy female narrator for tutorials, lifestyle, and explainer channels (Edge-TTS Free).',
    category: 'Educational',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-AriaNeural',
    name: 'Aria Neural (Warm Storyteller)',
    language: 'English',
    style: 'Engaging / Expressive',
    gender: 'Female',
    description: 'Warm, emotional storyteller delivery with rich natural pauses for narratives (Edge-TTS Free).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-EricNeural',
    name: 'Eric Neural (Deep Narrative & History)',
    language: 'English',
    style: 'Authoritative / Deep',
    gender: 'Male',
    description: 'Commanding baritone voice for history documentaries, war lore, and essays (Edge-TTS Free).',
    category: 'Deep',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-BrianNeural',
    name: 'Brian Neural (British Documentary Master)',
    language: 'English',
    style: 'Sophisticated / BBC Style',
    gender: 'Male',
    description: 'Prestigious British accent for high-end nature, science, and history documentaries (Edge-TTS Free).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-EmmaNeural',
    name: 'Emma Neural (British Conversational)',
    language: 'English',
    style: 'Warm / Friendly',
    gender: 'Female',
    description: 'Elegant British storyteller voice for literature, travel, and lifestyle (Edge-TTS Free).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-RogerNeural',
    name: 'Roger Neural (Radio & Podcast)',
    language: 'English',
    style: 'Resonant / Broadcaster',
    gender: 'Male',
    description: 'Classic radio broadcaster style for trailers, true crime, and podcasts (Edge-TTS Free).',
    category: 'Cinematic',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-SteffanNeural',
    name: 'Steffan Neural (Conversational & Calm)',
    language: 'English',
    style: 'Relaxed / Friendly',
    gender: 'Male',
    description: 'Friendly, unhurried voice for tutorials, guided reviews, and casual vlogs (Edge-TTS Free).',
    category: 'Calm',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_en-US-AnaNeural',
    name: 'Ana Neural (Youth / Dynamic)',
    language: 'English',
    style: 'Bright / Cheerful',
    gender: 'Female',
    description: 'Youthful and energetic voice for upbeat shorts and gaming content (Edge-TTS Free).',
    category: 'Energetic',
    provider: 'open-source-tts',
    isFree: true
  },
  // Multilingual Edge voices
  {
    id: 'edge_es-ES-AlvaroNeural',
    name: 'Alvaro Neural (Spanish Documentary)',
    language: 'Spanish',
    style: 'Deep / Serious',
    gender: 'Male',
    description: 'Spanish documentary and narrative voice (Edge-TTS Free).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_es-ES-ElviraNeural',
    name: 'Elvira Neural (Spanish Storyteller)',
    language: 'Spanish',
    style: 'Expressive / Warm',
    gender: 'Female',
    description: 'Spanish storytelling female voice (Edge-TTS Free).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_fr-FR-HenriNeural',
    name: 'Henri Neural (French Narration)',
    language: 'French',
    style: 'Elegant / Narrative',
    gender: 'Male',
    description: 'French narration and documentary voice (Edge-TTS Free).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_de-DE-ConradNeural',
    name: 'Conrad Neural (German Documentary)',
    language: 'German',
    style: 'Precise / Authoritative',
    gender: 'Male',
    description: 'German clear and authoritative documentary voice (Edge-TTS Free).',
    category: 'Educational',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_hi-IN-MadhurNeural',
    name: 'Madhur Neural (Hindi Narrative)',
    language: 'Hindi',
    style: 'Expressive / Warm',
    gender: 'Male',
    description: 'Hindi narrative male voice for stories and explainers (Edge-TTS Free).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_ur-PK-AsadNeural',
    name: 'Asad Neural (Urdu Narrative)',
    language: 'Urdu',
    style: 'Melodic / Narrative',
    gender: 'Male',
    description: 'Urdu narrative voice for poetry, history, and stories (Edge-TTS Free).',
    category: 'Storytelling',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_ar-SA-HamedNeural',
    name: 'Hamed Neural (Arabic Classical)',
    language: 'Arabic',
    style: 'Formal / Resonant',
    gender: 'Male',
    description: 'Formal Arabic documentary narration (Edge-TTS Free).',
    category: 'Documentary',
    provider: 'open-source-tts',
    isFree: true
  },
  {
    id: 'edge_ja-JP-KeitaNeural',
    name: 'Keita Neural (Japanese Narrative)',
    language: 'Japanese',
    style: 'Calm / Clear',
    gender: 'Male',
    description: 'Japanese clear narration for guides and essays (Edge-TTS Free).',
    category: 'Calm',
    provider: 'open-source-tts',
    isFree: true
  }
];

export const OPEN_SOURCE_VOICES: Voice[] = [
  ...KOKORO_VOICES,
  ...EDGE_VOICES
];

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

export class OpenSourceTtsService {
  /**
   * Check if a voice ID represents a Kokoro voice
   */
  public static isKokoroVoice(voiceId?: string): boolean {
    if (!voiceId) return false;
    return voiceId.startsWith('kokoro_') || KOKORO_VOICES.some((v) => v.id === voiceId);
  }

  /**
   * Check if a voice ID represents an open source voice (Kokoro or Edge-TTS)
   */
  public static isOpenSourceVoice(voiceId?: string): boolean {
    if (!voiceId) return false;
    if (voiceId.startsWith('kokoro_') || voiceId.startsWith('edge_')) return true;
    if (voiceId.includes('Neural')) return true;
    if (OPEN_SOURCE_VOICES.some((v) => v.id === voiceId)) return true;
    return false;
  }

  /**
   * Normalize voice ID to raw Edge-TTS voice name
   */
  public static normalizeEdgeVoiceName(voiceId?: string): string {
    if (!voiceId) return 'en-US-ChristopherNeural';
    let clean = voiceId.replace(/^edge_/, '');
    if (clean.includes('Neural')) return clean;

    const matched = EDGE_VOICES.find((v) => v.id === voiceId);
    if (matched) {
      return matched.id.replace(/^edge_/, '');
    }

    return 'en-US-ChristopherNeural';
  }

  /**
   * Normalize voice ID (legacy alias for normalizeEdgeVoiceName)
   */
  public static normalizeVoiceName(voiceId?: string): string {
    return this.normalizeEdgeVoiceName(voiceId);
  }

  /**
   * Normalize voice ID to raw Kokoro voice identifier
   */
  public static normalizeKokoroVoiceName(voiceId?: string): string {
    if (!voiceId) return 'af_heart';
    return voiceId.replace(/^kokoro_/, '');
  }

  /**
   * Converts numeric speed multiplier (0.5 - 2.0x) to Edge-TTS rate string format
   */
  public static formatRate(speed?: number): string {
    if (!speed || speed === 1.0) return '+0%';
    const pct = Math.round((speed - 1.0) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }

  /**
   * Generates TTS speech audio via Open-Source engine (Kokoro-82M or Edge-TTS)
   */
  public static async generateTTS(options: OpenSourceTtsOptions): Promise<OpenSourceTtsResult> {
    const { text, voiceId, speechSpeed = 1.0, format = 'mp3', takeIndex = 1 } = options;

    if (!text || !text.trim()) {
      throw new Error('Text parameter is required for TTS synthesis.');
    }

    const tempDir = path.resolve(process.cwd(), 'temp_storage');
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Multilingual check for cloned characters or non-English script (Hindi, Urdu, Spanish, etc.)
    const isHindiText = /[\u0900-\u097F]/.test(text);
    const isUrduText = /[\u0600-\u06FF]/.test(text);

    let isMultilingualClone = false;
    let targetEdgeVoice = '';

    if (voiceId && voiceId.startsWith('kokoro_cloned_')) {
      const customVoices: Voice[] = await VoiceStorageService.getCustomVoices().catch(() => []);
      const matched = customVoices.find((v: Voice) => v.id === voiceId);
      const cloneLang = (matched?.language || '').toLowerCase();
      const cloneGender = matched?.gender || 'Neutral';

      if (cloneLang.includes('hindi') || isHindiText) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'hi-IN-SwaraNeural' : 'hi-IN-MadhurNeural';
      } else if (cloneLang.includes('urdu') || isUrduText) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'ur-PK-UzmaNeural' : 'ur-PK-AsadNeural';
      } else if (cloneLang.includes('spanish')) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'es-ES-ElviraNeural' : 'es-ES-AlvaroNeural';
      } else if (cloneLang.includes('french')) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'fr-FR-DeniseNeural' : 'fr-FR-HenriNeural';
      } else if (cloneLang.includes('german')) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'de-DE-KatjaNeural' : 'de-DE-ConradNeural';
      } else if (cloneLang.includes('japanese')) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'ja-JP-NanamiNeural' : 'ja-JP-KeitaNeural';
      } else if (cloneLang.includes('arabic')) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'ar-SA-ZariyahNeural' : 'ar-SA-HamedNeural';
      } else if (cloneLang.includes('chinese')) {
        isMultilingualClone = true;
        targetEdgeVoice = cloneGender === 'Female' ? 'zh-CN-XiaoxiaoNeural' : 'zh-CN-YunxiNeural';
      }
    } else if (isHindiText && !this.isOpenSourceVoice(voiceId)) {
      isMultilingualClone = true;
      targetEdgeVoice = 'hi-IN-MadhurNeural';
    } else if (isUrduText && !this.isOpenSourceVoice(voiceId)) {
      isMultilingualClone = true;
      targetEdgeVoice = 'ur-PK-AsadNeural';
    }

    if (isMultilingualClone && targetEdgeVoice) {
      // Synthesize non-English cloned character speech via Edge-TTS multilingual neural engine
      const scriptPath = resolveScriptPath('synthesize_edge_tts.py');
      const tempFilename = `cloned_multi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
      const outputPath = path.join(tempDir, tempFilename);
      const rate = this.formatRate(speechSpeed);

      const payload = {
        text: text.trim(),
        voice: targetEdgeVoice,
        rate,
        pitch: '+0Hz',
        volume: '+0%',
        outputPath
      };

      logger.info(`[MultilingualClonedVoice] Synthesizing "${text.trim().slice(0, 35)}..." via native neural voice ${targetEdgeVoice} (rate: ${rate})`);

      const resultOutput = await new Promise<string>((resolve, reject) => {
        const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d) => { stdout += d.toString(); });
        py.stderr.on('data', (d) => { stderr += d.toString(); });
        py.on('error', (err) => reject(new Error(`Failed to spawn Edge-TTS Python process: ${err.message}`)));
        py.on('close', (code) => {
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(`Edge-TTS Python worker failed (code ${code}): ${stderr || stdout}`));
          } else {
            resolve(stdout);
          }
        });

        py.stdin.write(JSON.stringify(payload));
        py.stdin.end();
      });

      let parsed: any = {};
      try {
        parsed = JSON.parse(resultOutput || '{}');
      } catch {
        throw new Error(`Failed to parse multilingual Edge-TTS response: ${resultOutput}`);
      }

      if (!parsed.success) {
        throw new Error(parsed.error || 'Multilingual speech synthesis failed.');
      }

      const audioBuffer = await fs.promises.readFile(outputPath);
      try { await fs.promises.unlink(outputPath); } catch {}

      const approxDuration = Math.max(0.5, (text.trim().length / 15) / speechSpeed);

      return {
        audioBuffer,
        duration: approxDuration,
        format,
        voiceId: voiceId || targetEdgeVoice,
        sizeBytes: audioBuffer.length,
        engine: 'edge-tts'
      };
    }

    const isKokoro = this.isKokoroVoice(voiceId);

    if (isKokoro) {
      // ----------------------------------------------------
      // Kokoro-82M Offline Neural Studio Generation
      // ----------------------------------------------------
      const voice = this.normalizeKokoroVoiceName(voiceId);
      const scriptPath = resolveScriptPath('synthesize_kokoro.py');
      const tempFilename = `kokoro_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
      const outputPath = path.join(tempDir, tempFilename);

      // Multi-take subtle natural tempo variation
      let effectiveSpeed = speechSpeed;
      if (takeIndex === 2) {
        effectiveSpeed = Math.min(2.0, speechSpeed * 1.05);
      } else if (takeIndex === 3) {
        effectiveSpeed = Math.max(0.6, speechSpeed * 0.95);
      }

      const payload = {
        text: text.trim(),
        voice: `kokoro_${voice}`,
        speechSpeed: effectiveSpeed,
        format,
        outputPath
      };

      logger.info(`[KokoroStudio] Synthesizing "${text.trim().slice(0, 35)}..." using voice kokoro_${voice} (speed: ${effectiveSpeed.toFixed(2)}x)`);

      const resultOutput = await new Promise<string>((resolve, reject) => {
        const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d) => { stdout += d.toString(); });
        py.stderr.on('data', (d) => { stderr += d.toString(); });

        py.on('error', (err) => reject(new Error(`Failed to spawn Kokoro Python process: ${err.message}`)));

        py.on('close', (code) => {
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(`Kokoro TTS worker failed (code ${code}): ${stderr || stdout}`));
          } else {
            resolve(stdout);
          }
        });

        py.stdin.write(JSON.stringify(payload));
        py.stdin.end();
      });

      let parsed: any = {};
      try {
        parsed = JSON.parse(resultOutput || '{}');
      } catch (parseErr: any) {
        throw new Error(`Failed to parse Kokoro TTS response: ${resultOutput}`);
      }

      if (!parsed.success) {
        throw new Error(parsed.error || 'Failed to synthesize speech using Kokoro 82M engine.');
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error('Expected Kokoro TTS output file was not created.');
      }

      const audioBuffer = await fs.promises.readFile(outputPath);
      const duration = parsed.duration || Math.max(1, (text.trim().split(/\s+/).length / 2.5));

      try {
        await fs.promises.unlink(outputPath);
      } catch {}

      logger.info(`[KokoroStudio] Synthesized ${audioBuffer.length} bytes (${duration.toFixed(2)}s) with kokoro_${voice}`);

      return {
        audioBuffer,
        duration,
        format,
        voiceId: `kokoro_${voice}`,
        sizeBytes: audioBuffer.length,
        engine: 'kokoro'
      };
    } else {
      // ----------------------------------------------------
      // Edge-TTS Cloud / Edge Neural Generation
      // ----------------------------------------------------
      const voice = this.normalizeEdgeVoiceName(voiceId);
      const scriptPath = resolveScriptPath('synthesize_edge_tts.py');
      const tempFilename = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
      const outputPath = path.join(tempDir, tempFilename);

      let rate = options.speechSpeed ? this.formatRate(options.speechSpeed) : '+0%';
      let pitch = options.pitch || '+0Hz';
      const volume = options.volume || '+0%';

      if (takeIndex === 2) {
        pitch = options.pitch || '+3Hz';
        if (rate === '+0%') rate = '+4%';
      } else if (takeIndex === 3) {
        pitch = options.pitch || '-2Hz';
        if (rate === '+0%') rate = '-3%';
      }

      const payload = {
        text: text.trim(),
        voice,
        rate,
        pitch,
        volume,
        outputPath
      };

      logger.info(`[EdgeTTS] Synthesizing "${text.trim().slice(0, 35)}..." using voice ${voice} (rate: ${rate}, pitch: ${pitch})`);

      const resultOutput = await new Promise<string>((resolve, reject) => {
        const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d) => { stdout += d.toString(); });
        py.stderr.on('data', (d) => { stderr += d.toString(); });

        py.on('error', (err) => reject(new Error(`Failed to spawn Edge-TTS Python process: ${err.message}`)));

        py.on('close', (code) => {
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(`Edge-TTS Python worker failed (code ${code}): ${stderr || stdout}`));
          } else {
            resolve(stdout);
          }
        });

        py.stdin.write(JSON.stringify(payload));
        py.stdin.end();
      });

      let parsed: any = {};
      try {
        parsed = JSON.parse(resultOutput || '{}');
      } catch (parseErr: any) {
        throw new Error(`Failed to parse Edge-TTS response: ${resultOutput}`);
      }

      if (!parsed.success) {
        throw new Error(parsed.error || 'Failed to synthesize speech using Edge-TTS engine.');
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error('Expected Edge-TTS output file was not created.');
      }

      const audioBuffer = await fs.promises.readFile(outputPath);
      let duration = 0;
      try {
        duration = await FFmpegHelper.getMediaDuration(outputPath);
      } catch {
        duration = Math.max(1, (text.trim().split(/\s+/).length / 2.5));
      }

      try {
        await fs.promises.unlink(outputPath);
      } catch {}

      logger.info(`[EdgeTTS] Synthesized ${audioBuffer.length} bytes (${duration.toFixed(2)}s) with ${voice}`);

      return {
        audioBuffer,
        duration,
        format,
        voiceId: `edge_${voice}`,
        sizeBytes: audioBuffer.length,
        engine: 'edge-tts'
      };
    }
  }

  /**
   * Health/Connection verification for OpenSource TTS engines
   */
  public static async testConnection(): Promise<{ success: boolean; message: string; model: string; engines: any }> {
    let kokoroStatus = false;
    let edgeStatus = false;
    let details: string[] = [];

    // Test Kokoro
    try {
      const resKokoro = await this.generateTTS({
        text: 'VoiceForge Studio Kokoro neural engine active.',
        voiceId: 'kokoro_af_heart'
      });
      kokoroStatus = true;
      details.push(`Kokoro 82M: Online (${resKokoro.sizeBytes} bytes generated)`);
    } catch (kErr: any) {
      details.push(`Kokoro 82M: Unavailable (${kErr.message})`);
    }

    // Test Edge
    try {
      const resEdge = await this.generateTTS({
        text: 'VoiceForge Studio Edge-TTS engine online.',
        voiceId: 'edge_en-US-ChristopherNeural'
      });
      edgeStatus = true;
      details.push(`Edge-TTS: Online (${resEdge.sizeBytes} bytes generated)`);
    } catch (eErr: any) {
      details.push(`Edge-TTS: Offline (${eErr.message})`);
    }

    const success = kokoroStatus || edgeStatus;
    const message = success
      ? `Open-Source Studio Engines verified! ${details.join(' • ')}`
      : `Open-Source TTS check failed: ${details.join(' • ')}`;

    return {
      success,
      message,
      model: kokoroStatus ? 'Kokoro-82M Studio AI (Offline Neural) + Edge-TTS' : 'Edge-TTS Neural v7.3',
      engines: {
        kokoro: kokoroStatus,
        edgeTts: edgeStatus
      }
    };
  }

  /**
   * List all available open-source voices
   */
  public static getAllVoices(): Voice[] {
    return OPEN_SOURCE_VOICES;
  }
}
