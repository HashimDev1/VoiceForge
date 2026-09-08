import { ScriptAnalysis, ScriptPreset, SpeechDirection, ChunkSettings } from './types';
import { splitScriptIntoChunks } from './chunking';

export const SUPPORTED_DIRECTION_TAGS: SpeechDirection[] = [
  { tag: '[whisper]', label: 'Whisper', description: 'Low, intimate whispered delivery', supported: true },
  { tag: '[slow]', label: 'Slow Pace', description: 'Slower, deliberate speaking pace', supported: true },
  { tag: '[fast]', label: 'Fast Pace', description: 'Faster, rapid speaking rate', supported: true },
  { tag: '[chuckle]', label: 'Chuckle', description: 'Light laugh / chuckling tone', supported: true },
  { tag: '[emphasis]', label: 'Emphasis', description: 'Stress on words', supported: true },
  { tag: '[sigh]', label: 'Sigh', description: 'Exhale or sigh pause', supported: true },
  { tag: '[gasp]', label: 'Gasp', description: 'Sudden intake of breath', supported: true },
  { tag: '[excited]', label: 'Excited', description: 'Energetic and enthusiastic tone', supported: true },
  { tag: '[sad]', label: 'Melancholic', description: 'Somber or emotional delivery', supported: true },
  { tag: '[angry]', label: 'Intense', description: 'Firm, forceful or angry emotion', supported: true },
  { tag: '[calm]', label: 'Calm', description: 'Soothing and relaxed pace', supported: true },
  { tag: '[pause]', label: 'Pause', description: 'Brief natural hesitation', supported: true }
];

export const SCRIPT_PRESETS: ScriptPreset[] = [
  {
    id: 'YouTube Documentary',
    name: 'YouTube Documentary',
    description: 'Slow, cinematic narration with clear sentence breaks and deeper pauses.',
    recommendedWpm: 135,
    recommendedCategory: 'Documentary',
    defaultChunkPreset: 'Medium'
  },
  {
    id: 'YouTube Story',
    name: 'YouTube Storytelling',
    description: 'Engaging, expressive tone suited for fiction, Reddit stories, and lore.',
    recommendedWpm: 145,
    recommendedCategory: 'Storytelling',
    defaultChunkPreset: 'Medium'
  },
  {
    id: 'True Crime',
    name: 'True Crime / Mystery',
    description: 'Deep, dramatic, and suspenseful voiceover pacing.',
    recommendedWpm: 130,
    recommendedCategory: 'Deep',
    defaultChunkPreset: 'Small'
  },
  {
    id: 'History',
    name: 'History & Lore',
    description: 'Authoritative, clear, and articulate educational voiceover.',
    recommendedWpm: 140,
    recommendedCategory: 'Educational',
    defaultChunkPreset: 'Medium'
  },
  {
    id: 'Technology',
    name: 'Tech & Science',
    description: 'Modern, upbeat, and informative pace.',
    recommendedWpm: 150,
    recommendedCategory: 'Educational',
    defaultChunkPreset: 'Medium'
  },
  {
    id: 'Motivation',
    name: 'Motivational & Fitness',
    description: 'Energetic, bold, and high-impact speech.',
    recommendedWpm: 160,
    recommendedCategory: 'Energetic',
    defaultChunkPreset: 'Large'
  }
];

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return '00:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}:${remMinutes < 10 ? '0' : ''}${remMinutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function analyzeScript(
  scriptText: string,
  chunkSettings: ChunkSettings,
  wpm: number = 145,
  speechSpeed: number = 1.0
): ScriptAnalysis {
  if (!scriptText || !scriptText.trim()) {
    return {
      wordCount: 0,
      characterCount: 0,
      estimatedDurationSec: 0,
      estimatedDurationFormatted: '00:00',
      chapterCount: 0,
      chunkCount: 0,
      longSentenceCount: 0,
      awkwardParagraphCount: 0,
      chapters: [],
      warnings: ['Script is empty. Paste or type your script to analyze.']
    };
  }

  const cleanText = scriptText.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const characterCount = cleanText.length;

  const effectiveWpm = Math.max(wpm * (speechSpeed || 1.0), 30);
  const estimatedDurationSec = Math.round((wordCount / effectiveWpm) * 60);
  const estimatedDurationFormatted = formatDuration(estimatedDurationSec);

  const { chunks, chapters } = splitScriptIntoChunks(cleanText, chunkSettings, wpm);

  // Analyze long sentences (>35 words)
  const sentences = cleanText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 35);
  const longSentenceCount = longSentences.length;

  // Analyze awkward paragraphs (>1200 characters without paragraph breaks)
  const paragraphs = cleanText.split(/\n\s*\n/).filter(Boolean);
  const awkwardParagraphs = paragraphs.filter((p) => p.length > 1200);
  const awkwardParagraphCount = awkwardParagraphs.length;

  const warnings: string[] = [];
  if (longSentenceCount > 0) {
    warnings.push(
      `Found ${longSentenceCount} exceptionally long sentence(s) (>35 words). Consider splitting them for smoother voice synthesis.`
    );
  }
  if (awkwardParagraphCount > 0) {
    warnings.push(
      `Found ${awkwardParagraphCount} very large paragraph(s). Adding paragraph breaks helps structure natural speech pauses.`
    );
  }
  if (characterCount > 50000) {
    warnings.push(
      `Large script detected (${characterCount.toLocaleString()} characters). Generation will run in batch mode with controlled queueing.`
    );
  }

  return {
    wordCount,
    characterCount,
    estimatedDurationSec,
    estimatedDurationFormatted,
    chapterCount: chapters.length,
    chunkCount: chunks.length,
    longSentenceCount,
    awkwardParagraphCount,
    chapters: chapters.map((c) => ({ title: c.title, clipCount: c.chunks.length })),
    warnings
  };
}
