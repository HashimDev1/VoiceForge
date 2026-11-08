export type VideoFormat = 'mp4' | 'mov' | 'webm' | 'mkv' | 'avi' | 'unknown';

export interface VideoAiIndicator {
  tag: string;
  value: string;
  source: 'atom' | 'xmp' | 'c2pa' | 'comment' | 'other';
  reason: string;
}

export interface VideoTagDetail {
  key: string;
  value: any;
  category: 'Atom (udta)' | 'C2PA' | 'XMP' | 'QuickTime' | 'EBML' | 'Other';
  isAi: boolean;
  aiReason?: string;
}

export interface VideoMetadataSummary {
  format: VideoFormat;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  hasC2pa: boolean;
  hasXmp: boolean;
  hasUdta: boolean;
  hasAiProvenance: boolean;
  aiToolDetected: string | null;
  aiIndicators: VideoAiIndicator[];
  totalTagsCount: number;
  tags: VideoTagDetail[];
  rawSummary: {
    atomCount: number;
    c2paDetected: boolean;
    xmpDetected: boolean;
  };
}

export interface VideoCleaningOptions {
  stripUdta: boolean;
  stripXmp: boolean;
  stripC2pa: boolean;
  stripMetadataAtoms: boolean;
  nuclearReencode: boolean;
  nuclearResolution: 'original' | '1080p' | '720p';
  nuclearCrf: number;
}

export interface VideoVerificationResult {
  verifiedClean: boolean;
  remainingTagsCount: number;
  remainingTags: Array<{ key: string; category: string; value: string }>;
  verifiedAt: number;
}

export interface VideoItem {
  id: string;
  file: File;
  name: string;
  size: number;
  format: VideoFormat;
  width?: number;
  height?: number;
  duration?: number;
  previewUrl: string;
  status: 'idle' | 'reading' | 'ready' | 'processing' | 'done' | 'error';
  progress: number;
  metadata: VideoMetadataSummary | null;
  cleanedBlob: Blob | null;
  cleanedUrl: string | null;
  cleanedSize: number | null;
  cleanedTagsRemovedCount: number;
  verification: VideoVerificationResult | null;
  methodUsed: 'ffmpeg-streamcopy' | 'ffmpeg-nuclear-reencode' | 'native-mp4-strip' | null;
  errorMessage?: string;
  processingTimeMs?: number;
}

