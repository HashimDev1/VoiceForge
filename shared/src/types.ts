export type VoiceCategory =
  | 'Documentary'
  | 'Storytelling'
  | 'News'
  | 'Educational'
  | 'Motivational'
  | 'Female'
  | 'Male'
  | 'Deep'
  | 'Calm'
  | 'Energetic'
  | 'Cinematic';

export interface Voice {
  id: string; // Fish Audio reference_id or default model marker
  name: string;
  language: string;
  style: string;
  gender: 'Male' | 'Female' | 'Neutral';
  description: string;
  category: VoiceCategory;
  previewAudioUrl?: string;
  isCustom?: boolean;
}

export type ChunkSizePreset = 'Small' | 'Medium' | 'Large' | 'Single Chunk' | 'Custom';

export interface ChunkSettings {
  preset: ChunkSizePreset;
  maxCharacters: number; // e.g. Small: 150, Medium: 300, Large: 600, Single Chunk: 100000
  preserveParagraphs: boolean;
  autoChunk?: boolean;
}

export interface SpeechDirection {
  tag: string;
  label: string;
  description: string;
  supported: boolean;
}

export interface AudioTake {
  id: string; // e.g. "take_1", "take_2"
  label: string; // e.g. "Take 1", "Take 2"
  audioUrl: string;
  createdAt: string;
  durationSec?: number;
}

export interface ScriptChunk {
  id: string;
  index: number;
  chapterIndex: number;
  chapterTitle: string;
  text: string;
  wordCount: number;
  characterCount: number;
  estimatedDurationSec: number;
  status: 'idle' | 'generating' | 'success' | 'error';
  audioUrl?: string;
  audioDurationSec?: number;
  error?: string;
  speechSpeed?: number;
  takes?: AudioTake[];
  activeTakeId?: string;
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  chunks: ScriptChunk[];
}

export type ScriptPresetType =
  | 'YouTube Documentary'
  | 'YouTube Story'
  | 'True Crime'
  | 'History'
  | 'Technology'
  | 'Motivation'
  | 'News'
  | 'Education';

export interface ScriptPreset {
  id: ScriptPresetType;
  name: string;
  description: string;
  recommendedWpm: number;
  recommendedCategory: VoiceCategory;
  defaultChunkPreset: ChunkSizePreset;
}

export interface ScriptAnalysis {
  wordCount: number;
  characterCount: number;
  estimatedDurationSec: number;
  estimatedDurationFormatted: string;
  chapterCount: number;
  chunkCount: number;
  longSentenceCount: number;
  awkwardParagraphCount: number;
  chapters: { title: string; clipCount: number }[];
  warnings: string[];
}

export interface Project {
  id: string;
  name: string;
  script: string;
  selectedVoice: Voice;
  wpm: number;
  speechSpeed?: number; // 0.5 to 2.0x (default 1.0)
  audioFormat?: 'mp3' | 'wav' | 'pcm' | 'opus';
  pauseBetweenClipsSec: number;
  chunkSettings: ChunkSettings;
  chunks: ScriptChunk[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  finalAudioUrl?: string;
  finalAudioDurationSec?: number;
  multiTakeEnabled?: boolean;
}

export interface TTSRequestPayload {
  text: string;
  reference_id?: string;
  format?: 'mp3' | 'wav' | 'pcm' | 'opus';
  model?: string;
  speechSpeed?: number;
  numTakes?: number;
  prosody?: {
    speed?: number;
    volume?: number;
  };
}

export interface AudioMergePayload {
  clipUrls: string[];
  pauseSec: number;
  projectId?: string;
}

export interface ApiHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  fishAudioConnected: boolean;
  message: string;
  model: string;
}
