export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic' | 'unknown';

export interface AiIndicator {
  tag: string;
  value: string;
  source: 'xmp' | 'exif' | 'iptc' | 'c2pa' | 'comment' | 'other';
  reason: string;
}

export interface TagDetail {
  key: string;
  value: any;
  category: 'EXIF' | 'XMP' | 'IPTC' | 'ICC' | 'JFIF' | 'C2PA' | 'Other';
  isAi: boolean;
  aiReason?: string;
}

export interface ImageMetadataSummary {
  format: ImageFormat;
  mimeType: string;
  width?: number;
  height?: number;
  hasExif: boolean;
  hasXmp: boolean;
  hasIptc: boolean;
  hasIcc: boolean;
  hasC2pa: boolean;
  c2paManifestFound: boolean;
  hasAiProvenance: boolean;
  aiIndicators: AiIndicator[];
  totalTagsCount: number;
  tags: TagDetail[];
  rawSummary: {
    exifTagCount: number;
    xmpTagCount: number;
    iptcTagCount: number;
    iccPresent: boolean;
    c2paDetected: boolean;
  };
}

export interface CleaningOptions {
  stripExif: boolean;
  stripXmp: boolean;
  stripIptc: boolean;
  stripC2pa: boolean;
  stripIcc: boolean;
  stripComments: boolean;
  nuclearCanvas: boolean;
  nuclearQuality: number;
}

export interface VerificationResult {
  verifiedClean: boolean;
  remainingTagsCount: number;
  remainingTags: Array<{ key: string; category: string; value: string }>;
  verifiedAt: number;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  format: ImageFormat;
  previewUrl: string;
  status: 'idle' | 'reading' | 'ready' | 'processing' | 'done' | 'error';
  progress: number;
  metadata: ImageMetadataSummary | null;
  cleanedBlob: Blob | null;
  cleanedUrl: string | null;
  cleanedSize: number | null;
  cleanedTagsRemovedCount: number;
  verification: VerificationResult | null;
  methodUsed: 'lossless' | 'nuclear' | 'heic-converted' | null;
  errorMessage?: string;
  processingTimeMs?: number;
}

