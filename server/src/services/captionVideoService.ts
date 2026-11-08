import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import util from 'util';
import { config } from '../config';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import { CaptionGenerationOptions, CaptionService } from './captionService';
import { CaptionPresetId, CAPTION_PRESETS, CaptionAnimation, hexToAssColor, assToHexColor } from '../../../shared/src/captionPresets';
import { TranscriptionSegment } from '../../../shared/src/types';
import { TranscriptExportHelper } from '../utils/transcriptExportHelper';

const execFileAsync = util.promisify(execFile);

export interface CaptionRenderOptions extends CaptionGenerationOptions {
  preset?: CaptionPresetId | string;
  wordHighlight?: boolean;
  uppercase?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'heavy' | number;
  letterSpacing?: string;
  lineHeight?: number;
  primaryColor?: string;
  highlightColor?: string;
  outlineColor?: string;
  shadowColor?: string;
  outlineWidth?: number;
  shadowDistance?: number;
  boxBackground?: boolean;
  boxColor?: string;
  boxOpacity?: number;
  borderRadius?: string;
  textAlign?: 'left' | 'center' | 'right';
  captionPosition?: 'bottom' | 'lower' | 'middle' | 'top';
  captionX?: number;
  captionY?: number;
  captionWidth?: number;
  animationStyle?: CaptionAnimation;
  animationIntensity?: number;
  highlightScale?: number;
  emphasisWords?: string[];
  safeZone?: boolean;
  style?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface CaptionTranscriptionResult {
  language: string;
  detected_language: string;
  provider: string;
  total_duration: number;
  total_segments: number;
  segments: TranscriptionSegment[];
  srt: string;
  ass: string;
  vtt: string;
}

export interface CaptionedVideoResult extends CaptionTranscriptionResult {
  filename: string;
  videoUrl: string;
  preset: string;
}

type Word = { word: string; start: number; end: number };
type Group = Word[];

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  return value === undefined || !Number.isFinite(value) ? fallback : Math.max(min, Math.min(max, value));
}

function assTime(seconds: number): string {
  const n = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(n / 360000);
  const m = String(Math.floor((n % 360000) / 6000)).padStart(2, '0');
  const s = String(Math.floor((n % 6000) / 100)).padStart(2, '0');
  const cs = String(n % 100).padStart(2, '0');
  return `${h}:${m}:${s}.${cs}`;
}

function assText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\r?\n/g, '\\N');
}

function toAssColor(value: string | undefined, fallback: string, opacity?: number): string {
  if (!value) return fallback;
  if (/^&H[0-9A-Fa-f]{6,8}&?$/i.test(value)) {
    return value.endsWith('&') ? value.toUpperCase() : `${value.toUpperCase()}&`;
  }
  const hex = value.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/i.test(hex)) return fallback;
  const alpha = opacity === undefined ? '00' : Math.round(255 * (1 - clamp(opacity, 0, 1, 0.88))).toString(16).padStart(2, '0');
  return `&H${alpha}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&`.toUpperCase();
}

function splitGroups(words: Word[], max: number): Group[] {
  const isComplete = max >= 16;
  const limit = isComplete ? 40 : Math.max(1, Math.min(25, Math.round(max)));
  const groups: Group[] = [];
  let current: Group = [];
  const sentence = /[.!?]["”’۔؟]*$/;
  const clause = /[,;:\u2014-]$/;
  for (const word of words) {
    const prev = current[current.length - 1];
    const isPause = prev && word.start - prev.end > (isComplete ? 0.75 : 0.55);
    const isComma = !isComplete && limit <= 3 && prev && clause.test(prev.word) && current.length >= 2;

    if (
      current.length &&
      (current.length >= limit || isPause || isComma)
    ) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    if (sentence.test(word.word)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function animationTags(animation: CaptionAnimation, intensity: number, scale: number): string {
  const base = Math.round(scale * 100);
  const punch = Math.round(scale * 124);
  const tDuration = Math.round(75 / intensity);

  switch (animation) {
    case 'pop':
      return `\\fscx${base}\\fscy${base}\\t(0,${tDuration},\\fscx100\\fscy100)`;
    case 'zoom_punch':
      return `\\fscx${punch}\\fscy${punch}\\t(0,${Math.round(90 / intensity)},\\fscx100\\fscy100)`;
    case 'bounce':
      return `\\fscx105\\fscy125\\t(0,${Math.round(50 / intensity)},\\fscx100\\fscy92)\\t(${Math.round(50 / intensity)},${Math.round(110 / intensity)},\\fscx100\\fscy100)`;
    case 'pulse':
      return `\\fscx114\\fscy114\\t(0,${Math.round(60 / intensity)},\\fscx95\\fscy95)\\t(${Math.round(60 / intensity)},${Math.round(120 / intensity)},\\fscx100\\fscy100)`;
    case 'zoom':
      return `\\fscx130\\fscy130\\t(0,${Math.round(90 / intensity)},\\fscx100\\fscy100)`;
    case 'blur_focus':
      return `\\blur4\\t(0,${Math.round(80 / intensity)},\\blur0)`;
    case 'glitch':
      return `\\fscx108\\fscy96\\t(0,${Math.round(40 / intensity)},\\fscx98\\fscy104)\\t(${Math.round(40 / intensity)},${Math.round(85 / intensity)},\\fscx100\\fscy100)`;
    case 'slide_up':
      return `\\fad(25,15)`;
    case 'typewriter':
      return '\\fad(25,0)';
    case 'mask_reveal':
    case 'gradient_reveal':
      return `\\fscx${base}\\fscy${base}\\t(0,${tDuration},\\fscx100\\fscy100)`;
    case 'fade':
      return '\\fad(30,30)';
    default:
      return '';
  }
}

export function assDocument(
  captions: TranscriptionSegment[],
  options: CaptionRenderOptions,
  width = 1080,
  height = 1920
): string {
  const aliases: Record<string, string> = {
    clean_white: 'classic_white',
    viral: 'viral_pop',
    karaoke: 'karaoke_flow',
    karaoke_highlight: 'karaoke_flow',
    clean: 'clean_learning',
    minimal: 'minimal_film',
    minimal_clean: 'minimal_film',
    podcast: 'podcast_punch',
    cinematic: 'cinematic_gold',
    cinematic_white: 'doc_white',
    roman_urdu: 'roman_urdu_viral',
    roman_hindi: 'roman_hindi_bold',
    hinglish: 'roman_hindi_bold'
  };

  const key = options.preset || options.style || 'doc_white';
  const resolvedKey = aliases[key] || key;
  const preset = CAPTION_PRESETS.find((p) => p.id === resolvedKey) || CAPTION_PRESETS[0];

  // Font family
  const font = (options.fontFamily || preset.font).replace(/[,\r\n]/g, '').slice(0, 80) || 'Arial';

  // Resolution-aware scale factor relative to 1080x1920 vertical reference canvas
  const isLandscape = width > height;
  const resScale = isLandscape ? Math.min(1.2, height / 1080) : width / 1080;

  const rawSize = clamp(options.fontSize, 16, 160, preset.size);
  const size = Math.round(rawSize * (isLandscape ? 0.8 : 1.0));

  const bold =
    options.fontWeight === 'normal'
      ? 0
      : options.fontWeight === 'heavy' || options.fontWeight === 'bold'
        ? -1
        : typeof options.fontWeight === 'number'
          ? options.fontWeight >= 700
            ? -1
            : 0
          : preset.bold;

  const primary = toAssColor(options.primaryColor, preset.primary);
  const highlight = toAssColor(options.highlightColor, preset.highlight);
  const outlineColor = toAssColor(options.outlineColor, preset.outlineColor);
  const shadowColor = toAssColor(options.shadowColor, preset.shadowColor);

  const outline = clamp(options.outlineWidth, 0, 16, preset.outline) * resScale;
  const shadow = clamp(options.shadowDistance, 0, 16, preset.shadow) * resScale;

  const box = options.boxBackground ?? preset.boxBackground ?? false;
  const back = options.boxColor
    ? toAssColor(options.boxColor, preset.boxColor || '&H9912151D&', options.boxOpacity ?? preset.boxOpacity ?? 0.88)
    : preset.boxColor || shadowColor;

  // Letter spacing in pixels for ASS (\fsp tag or style Spacing)
  let letterSpacing = 0;
  if (options.letterSpacing || preset.letterSpacing) {
    const spVal = parseFloat(options.letterSpacing || preset.letterSpacing || '0');
    letterSpacing = Math.round(spVal * size);
  }

  const widthPct = clamp(options.captionWidth, 0.3, 1, 0.88);
  const margin = Math.max(20, Math.round((width * (1 - widthPct)) / 2));
  const align = options.textAlign === 'left' ? 1 : options.textAlign === 'right' ? 3 : 2;

  // Position defaults tailored for vertical vs horizontal video
  const pos = options.captionPosition || 'bottom';
  const defaultY =
    pos === 'top'
      ? 0.16
      : pos === 'middle'
        ? 0.5
        : pos === 'lower'
          ? 0.76
          : isLandscape
            ? 0.86
            : options.safeZone === false
              ? 0.92
              : 0.83; // 83% safe zone on 9:16 clears TikTok/Reels bottom action strip!

  const x = Math.round(width * clamp(options.captionX, 0.08, 0.92, 0.5));
  const y = Math.round(height * clamp(options.captionY, 0.06, 0.94, defaultY));
  const posTag = `\\an${align}\\pos(${x},${y})`;

  const animation = options.animationStyle || preset.animation;
  const intensity = clamp(options.animationIntensity, 0.5, 2.5, 1);
  const scale = clamp(options.highlightScale, 1.0, 1.8, 1.16);
  const upper = options.uppercase ?? preset.uppercase;
  const maxWords = Math.round(clamp(options.maxWords, 1, 20, 3));

  const emphasis = new Set(
    (Array.isArray(options.emphasisWords) ? options.emphasisWords : [])
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean)
  );

  const isRtl = preset.rtl === true;
  const fade = ['fade', 'pop', 'bounce', 'slide_up'].includes(animation) ? '\\fad(25,25)' : '';

  const events: string[] = [];

  for (const caption of captions) {
    let words = (caption.words || []).filter((w) => w.word.trim() && w.end > w.start);
    if (!words.length && caption.text && caption.text.trim()) {
      const tokens = caption.text.trim().split(/\s+/).filter(Boolean);
      const span = Math.max(0.01, caption.end - caption.start);
      words = tokens.map((word, idx) => ({
        word,
        start: caption.start + (span * idx) / Math.max(1, tokens.length),
        end: caption.start + (span * (idx + 1)) / Math.max(1, tokens.length)
      }));
    }
    if (!words.length) {
      const textToRender = upper ? caption.text.toUpperCase() : caption.text;
      events.push(
        `Dialogue: 0,${assTime(caption.start)},${assTime(caption.end)},Default,,0,0,0,,{\\fs${size}${posTag}${fade}}${assText(textToRender)}`
      );
      continue;
    }

    for (const group of splitGroups(words, maxWords)) {
      const start = group[0].start;
      const end = group[group.length - 1].end;
      if (end <= start) continue;

      const chars = group.reduce((n, w) => n + w.word.length + 1, 0);
      const split = group.length > 4 || chars > 24 ? Math.ceil(group.length / 2) : group.length;
      const longest = Math.max(
        group.slice(0, split).reduce((n, w) => n + w.word.length + 1, 0),
        group.slice(split).reduce((n, w) => n + w.word.length + 1, 0)
      );
      const maxLineWidth = Math.round(width * widthPct * 0.95);
      const fontSize = Math.min(size, Math.max(22, Math.floor(maxLineWidth / Math.max(1, longest) / 0.62)));

      const windows =
        options.wordHighlight === false
          ? [{ start, end, active: -1 }]
          : group.map((w, i) => ({
            start: i === 0 ? start : w.start,
            end: i + 1 < group.length ? Math.max(w.start + 0.03, group[i + 1].start) : end,
            active: i
          }));

      for (const window of windows) {
        if (window.end <= window.start) continue;

        const pieces = group.map((w, i) => {
          const rawWord = upper ? w.word.toUpperCase() : w.word;
          const text = assText(rawWord);
          const keyword = w.word.toUpperCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

          if (i === window.active) {
            return `{\\c${highlight}${animationTags(animation, intensity, scale)}}${text}{\\c${primary}\\fscx100\\fscy100}`;
          }
          if (emphasis.has(keyword)) {
            return `{\\c${highlight}\\fscx116\\fscy116}${text}{\\c${primary}\\fscx100\\fscy100}`;
          }
          return text;
        });

        // For RTL text, ensure words maintain appropriate reading flow
        const displayPieces = isRtl ? [...pieces].reverse() : pieces;

        const line =
          displayPieces.slice(0, split).join(' ') +
          (split < displayPieces.length ? `\\N${displayPieces.slice(split).join(' ')}` : '');

        events.push(
          `Dialogue: 0,${assTime(window.start)},${assTime(window.end)},Default,,0,0,0,,{\\fs${fontSize}${posTag}${fade}}${line}`
        );
      }
    }
  }

  return `[Script Info]
Title: VoiceForge Caption Studio 2.0
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${size},${primary},${highlight},${outlineColor},${back},${bold},0,0,0,100,100,${letterSpacing},0,${box ? 3 : 1},${outline.toFixed(1)},${shadow.toFixed(1)},${align},${margin},${margin},100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;
}

function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export class CaptionVideoService {
  public static async getVideoSize(inputPath: string): Promise<{ width: number; height: number }> {
    try {
      const ffprobe = await FFmpegHelper.getFfprobePath();
      const { stdout } = await execFileAsync(
        ffprobe,
        ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', inputPath],
        { maxBuffer: 1024 * 1024 }
      );
      const [width, height] = stdout.trim().split('x').map(Number);
      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
        return { width, height };
      }
    } catch { }
    return { width: 1080, height: 1920 };
  }

  public static async transcribeInput(
    inputPath: string,
    originalName: string,
    options: CaptionRenderOptions
  ): Promise<CaptionTranscriptionResult> {
    const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-caption-asr-'));
    const audio = path.join(temp, 'audio.wav');
    try {
      const ffmpeg = await FFmpegHelper.getFfmpegPath();
      await execFileAsync(
        ffmpeg,
        ['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audio],
        { maxBuffer: 30 * 1024 * 1024 }
      );

      const audioStat = await fs.promises.stat(audio).catch(() => null);
      if (!audioStat || audioStat.size < 500) {
        throw new Error('The uploaded video does not contain an audio track. Please upload a video with speech audio.');
      }

      const generated = await CaptionService.generateFromAudio(
        await fs.promises.readFile(audio),
        'source-audio.wav',
        options
      );
      if (!generated.segments.length) {
        throw new Error('No speech was detected in this video. Please ensure the video contains audible speech or set a free GROQ_API_KEY / FISH_API_KEY in your server environment.');
      }

      const { width, height } = await this.getVideoSize(inputPath);
      const ass = assDocument(generated.segments, options, width, height);
      return {
        ...generated,
        language: options.language || generated.language,
        ass,
        vtt: TranscriptExportHelper.toVtt(generated.segments, originalName)
      };
    } finally {
      await fs.promises.rm(temp, { recursive: true, force: true }).catch(() => { });
    }
  }

  public static async transcribeVideo(
    inputPath: string,
    originalName: string,
    options: CaptionRenderOptions = {}
  ): Promise<CaptionTranscriptionResult> {
    return this.transcribeInput(inputPath, originalName, options);
  }

  public static async renderVideo(
    inputPath: string,
    segments: TranscriptionSegment[],
    options: CaptionRenderOptions = {}
  ): Promise<{ filename: string; videoUrl: string; ass: string }> {
    const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-caption-render-'));
    const assPath = path.join(temp, 'captions.ass');
    const out = path.join(temp, 'captioned.mp4');
    let saved = '';
    try {
      if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error('Caption segments are required before rendering.');
      }
      if (segments.length > 20000) throw new Error('Too many caption segments.');
      for (const s of segments) {
        if (!Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < 0 || s.end <= s.start || typeof s.text !== 'string') {
          throw new Error('Each caption needs valid text and start/end times.');
        }
      }

      const { width, height } = await this.getVideoSize(inputPath);
      const ass = assDocument(segments, options, width, height);
      await fs.promises.writeFile(assPath, ass, 'utf8');

      const ffmpeg = await FFmpegHelper.getFfmpegPath();
      await execFileAsync(
        ffmpeg,
        [
          '-y',
          '-i', inputPath,
          '-vf', `subtitles=filename='${escapeFilterPath(assPath)}'`,
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '20',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          out
        ],
        { maxBuffer: 30 * 1024 * 1024 }
      );

      await fs.promises.mkdir(config.storageDir, { recursive: true });
      const filename = `captioned_${Date.now()}_${randomUUID().slice(0, 8)}.mp4`;
      saved = path.join(config.storageDir, filename);
      await fs.promises.copyFile(out, saved);
      return { filename, videoUrl: `/api/captions/videos/${filename}`, ass };
    } catch (error) {
      if (saved && fs.existsSync(saved)) await fs.promises.unlink(saved).catch(() => { });
      throw error;
    } finally {
      await fs.promises.rm(temp, { recursive: true, force: true }).catch(() => { });
    }
  }

  public static async generateCaptionedVideo(
    inputPath: string,
    originalName: string,
    options: CaptionRenderOptions = {}
  ): Promise<CaptionedVideoResult> {
    const captions = await this.transcribeInput(inputPath, originalName, options);
    const output = await this.renderVideo(inputPath, captions.segments, options);
    return { ...captions, ...output, preset: options.preset || options.style || 'doc_white' };
  }
}
