import {
  VideoMetadataSummary,
  VideoCleaningOptions,
  VideoItem,
  VideoVerificationResult,
} from './videoTypes';
import { readVideoMetadata } from './videoMetadataReader';
import { cleanVideoWithFFmpeg, nativeStripMp4Boxes } from './cleaners/videoCleaner';
import { verifyVideoClean } from './videoVerifier';

export interface CleanVideoResult {
  cleanBlob: Blob;
  methodUsed: VideoItem['methodUsed'];
  verification: VideoVerificationResult;
  durationMs: number;
  originalSize: number;
  cleanedSize: number;
}

export class VideoProcessor {
  async inspect(file: File): Promise<VideoMetadataSummary> {
    return await readVideoMetadata(file);
  }

  async clean(
    file: File,
    options: VideoCleaningOptions,
    onProgress?: (progressPercent: number) => void
  ): Promise<CleanVideoResult> {
    const startTime = performance.now();
    if (onProgress) onProgress(15);

    let cleanBlob: Blob;
    let methodUsed: VideoItem['methodUsed'] = null;

    try {
      const res = await cleanVideoWithFFmpeg(file, options, onProgress);
      cleanBlob = res.cleanBlob;
      methodUsed = res.method;
    } catch (err) {
      console.warn('ffmpeg video cleaning failed, falling back to native MP4 box strip:', err);
      const buffer = await file.arrayBuffer();
      const strippedBytes = nativeStripMp4Boxes(new Uint8Array(buffer));
      cleanBlob = new Blob([strippedBytes.buffer], { type: file.type || 'video/mp4' });
      methodUsed = 'native-mp4-strip';
    }

    if (onProgress) onProgress(85);

    const verification = await verifyVideoClean(cleanBlob);

    if (onProgress) onProgress(100);

    const endTime = performance.now();
    return {
      cleanBlob,
      methodUsed,
      verification,
      durationMs: Math.round(endTime - startTime),
      originalSize: file.size,
      cleanedSize: cleanBlob.size,
    };
  }
}

export const videoProcessor = new VideoProcessor();

