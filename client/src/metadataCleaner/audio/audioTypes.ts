export type AudioFormat =
  | 'mp3'
  | 'wav'
  | 'flac'
  | 'm4a'
  | 'aac'
  | 'ogg'
  | 'opus'
  | 'aiff'
  | 'unknown';

export interface AudioAiIndicator {
  tag: string;
  value: string;
  source: 'id3' | 'vorbis' | 'mp4' | 'c2pa' | 'riff' | 'comment' | 'other';
  reason: string;
}

export interface AudioTagDetail {
  key: string;
  value: any;
  category: 'ID3v2' | 'ID3v1' | 'Vorbis' | 'MP4' | 'RIFF' | 'C2PA' | 'XMP' | 'Other';
  isAi: boolean;
  aiReason?: string;
}

export interface AudioMetadataSummary {
  format: AudioFormat;
  mimeType: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  numberOfChannels?: number;
  hasId3v2: boolean;
  hasId3v1: boolean;
  hasVorbis: boolean;
  hasMp4Atoms: boolean;
  hasRiffInfo: boolean;
  hasC2pa: boolean;
  hasAiProvenance: boolean;
  aiToolDetected: string | null;
  aiIndicators: AudioAiIndicator[];
  totalTagsCount: number;
  tags: AudioTagDetail[];
  rawSummary: {
    id3TagCount: number;
    vorbisTagCount: number;
    mp4AtomCount: number;
    riffChunkCount: number;
    c2paDetected: boolean;
  };
}

export interface AudioCleaningOptions {
  stripId3: boolean;
  stripVorbis: boolean;
  stripMp4Atoms: boolean;
  stripRiffInfo: boolean;
  stripC2pa: boolean;
  stripXmp: boolean;
  nuclearReencode: boolean;
  nuclearFormat: 'mp3' | 'wav';
  nuclearBitrate: string;
}

export interface AudioVerificationResult {
  verifiedClean: boolean;
  remainingTagsCount: number;
  remainingTags: Array<{ key: string; category: string; value: string }>;
  verifiedAt: number;
}

export interface AudioItem {
  id: string;
  file: File;
  name: string;
  size: number;
  format: AudioFormat;
  duration?: number;
  audioUrl: string;
  status: 'idle' | 'reading' | 'ready' | 'processing' | 'done' | 'error';
  progress: number;
  metadata: AudioMetadataSummary | null;
  cleanedBlob: Blob | null;
  cleanedUrl: string | null;
  cleanedSize: number | null;
  cleanedTagsRemovedCount: number;
  verification: AudioVerificationResult | null;
  methodUsed:
    | 'lossless-mp3-strip'
    | 'lossless-flac-strip'
    | 'lossless-wav-strip'
    | 'ffmpeg-streamcopy'
    | 'ffmpeg-nuclear-reencode'
    | null;
  errorMessage?: string;
  processingTimeMs?: number;
}

