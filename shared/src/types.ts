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

// Remote Fish Audio Model / Community Model Types
export interface FishAudioSampleEntity {
  audio: string;
  title?: string;
  text?: string;
}

export interface FishAudioAuthorEntity {
  _id?: string;
  nickname?: string;
  avatar?: string;
}

export interface FishAudioRemoteModel {
  _id: string;
  title: string;
  description?: string;
  type?: 'tts' | 'svc';
  train_mode?: 'fast' | 'full';
  state?: 'created' | 'training' | 'trained' | 'failed';
  tags?: string[];
  languages?: string[];
  visibility?: 'public' | 'unlist' | 'private';
  like_count?: number;
  task_count?: number;
  samples?: FishAudioSampleEntity[];
  author?: FishAudioAuthorEntity;
  created_at?: string;
  updated_at?: string;
}

export interface FishAudioModelSearchQuery {
  title?: string;
  tag?: string;
  language?: string;
  self?: boolean;
  page_number?: number;
  page_size?: number;
  sort_by?: 'score' | 'task_count' | 'created_at';
}

export interface FishAudioModelListResponse {
  total: number;
  items: FishAudioRemoteModel[];
  page_number: number;
  page_size: number;
}

// Voice Design Types
export interface VoiceDesignRequestPayload {
  instruction: string;
  reference_text?: string;
  language?: string;
  n?: number;
  speed?: number;
  num_step?: number;
  guidance_scale?: number;
}

export interface VoiceDesignCandidate {
  audioUrl: string;
  signature?: string;
  sampleIndex: number;
  previewUrl?: string;
}

export interface VoiceDesignResult {
  success: boolean;
  candidates: VoiceDesignCandidate[];
  instruction: string;
}

// Speech to Text (ASR) Types
export interface AsrTranscriptionResult {
  success: boolean;
  text: string;
  duration?: number;
  language?: string;
}

// Voice Clone Payload
export interface CloneVoicePayload {
  title: string;
  description?: string;
  text?: string;
  language?: string;
  tags?: string[];
}

// ==========================================
// VOICE TRANSLATOR STUDIO TYPES
// ==========================================

export type TranslationProjectStatus =
  | 'uploading'
  | 'processing'
  | 'generating'
  | 'completed'
  | 'failed';

export type TimingControlMode = 'same-duration' | 'natural' | 'short-form';

export interface VoicePreservationSettings {
  voiceSimilarity: number; // 0 - 100
  emotionMatching: number; // 0 - 100
  accentPreservation: number; // 0 - 100
  keepVoiceIdentity: boolean;
  keepEmotion: boolean;
  keepPauses: boolean;
  keepSpeakingStyle: boolean;
  keepGender: boolean;
}

export interface VoiceAnalysisResult {
  gender: 'Male' | 'Female' | 'Neutral';
  ageStyle: 'Adult' | 'Young' | 'Senior';
  tone: string;
  detectedLanguage: string;
  durationSec: number;
  durationFormatted: string;
  voiceId?: string;
}

export interface TranslationOutput {
  id: string;
  projectId: string;
  language: string;
  audioFile: string;
  videoFile?: string;
  duration: number;
  durationFormatted: string;
  createdAt: string;
}

export interface DubbingSegment {
  id: number | string;
  start_time: number;
  end_time: number;
  original_text: string;
  translated_text?: string;
  duration: number;
  audioUrl?: string;
  status?: 'pending' | 'translating' | 'generating' | 'matching' | 'completed' | 'error';
}

export interface DubbingProgress {
  currentSegment: number;
  totalSegments: number;
  currentPhase:
    | 'Extracting Audio'
    | 'Speech Recognition'
    | 'Sentence Segmentation'
    | 'Translating'
    | 'Generating Voice'
    | 'Matching Timing'
    | 'Merging Sentences'
    | 'Completed'
    | 'Idle';
  currentLanguage?: string;
  percent: number;
  message?: string;
}

export interface VoiceTranslationProject {
  id: string;
  userId: string;
  projectName: string;
  sourceFile: {
    filename: string;
    url: string;
    originalName: string;
    sizeBytes: number;
    mimeType?: string;
  };
  sourceFileType: 'audio' | 'video';
  sourceLanguage: string;
  targetLanguages: string[];
  voiceId: string;
  voiceName?: string;
  duration: number;
  durationFormatted: string;
  status: TranslationProjectStatus;
  settings: VoicePreservationSettings;
  timingMode: TimingControlMode;
  analysis?: VoiceAnalysisResult;
  segments?: DubbingSegment[];
  progress?: DubbingProgress;
  outputs: TranslationOutput[];
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface TranslationStepInfo {
  step: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface SpeechSegment {
  start: number;
  end: number;
  text: string;
}

