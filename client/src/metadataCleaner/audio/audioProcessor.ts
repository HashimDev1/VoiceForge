import {
  AudioMetadataSummary,
  AudioCleaningOptions,
  AudioItem,
  AudioVerificationResult,
} from './audioTypes';
import { readAudioMetadata } from './audioMetadataReader';
import { stripMp3Metadata } from './cleaners/losslessMp3Cleaner';
import { stripWavMetadata } from './cleaners/losslessWavCleaner';
import { stripFlacMetadata } from './cleaners/losslessFlacCleaner';
import { cleanAudioWithFFmpeg } from './cleaners/ffmpegAudioCleaner';
import { verifyAudioClean } from './audioVerifier';
import { detectAudioFormatFromBytes, detectAudioFormatFromMimeOrName } from './audioFormatDetector';

export interface CleanAudioResult {
  cleanBlob: Blob;
  methodUsed: AudioItem['methodUsed'];
  verification: AudioVerificationResult;
  durationMs: number;
  originalSize: number;
  cleanedSize: number;
}

export class AudioProcessor {
  async inspect(file: File): Promise<AudioMetadataSummary> {
    return await readAudioMetadata(file);
  }

  async clean(
    file: File,
    options: AudioCleaningOptions,
    onProgress?: (progressPercent: number) => void
  ): Promise<CleanAudioResult> {
    const startTime = performance.now();
    if (onProgress) onProgress(10);

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let format = detectAudioFormatFromBytes(bytes);
    if (format === 'unknown') {
      format = detectAudioFormatFromMimeOrName(file.name, file.type);
    }

    let cleanBlob: Blob;
    let methodUsed: AudioItem['methodUsed'] = null;

    // Mode B: Nuclear Re-encode (Defeats sample-level watermarks)
    if (options.nuclearReencode) {
      if (onProgress) onProgress(30);
      try {
        const res = await cleanAudioWithFFmpeg(
          file,
          {
            mode: 'nuclear-reencode',
            targetFormat: options.nuclearFormat || (format === 'wav' ? 'wav' : 'mp3'),
            bitrate: options.nuclearBitrate || '192k',
          },
          (p) => {
            if (onProgress) onProgress(30 + Math.round(p * 0.5));
          }
        );
        cleanBlob = res.cleanBlob;
        methodUsed = 'ffmpeg-nuclear-reencode';
      } catch (err: any) {
        console.warn('ffmpeg nuclear reencode failed, falling back to lossless byte strip:', err);
        // Fall back to lossless byte strip if ffmpeg cannot be loaded
        cleanBlob = this.losslessNativeStrip(bytes, format, file.type);
        methodUsed = format === 'mp3' ? 'lossless-mp3-strip' : format === 'flac' ? 'lossless-flac-strip' : 'lossless-wav-strip';
      }
    } else {
      // Mode A: Lossless metadata strip (default)
      if (format === 'mp3') {
        if (onProgress) onProgress(40);
        const stripped = stripMp3Metadata(bytes);
        cleanBlob = new Blob([stripped.cleanBytes.buffer], { type: 'audio/mpeg' });
        methodUsed = 'lossless-mp3-strip';
      } else if (format === 'wav') {
        if (onProgress) onProgress(40);
        const stripped = stripWavMetadata(bytes);
        cleanBlob = new Blob([stripped.cleanBytes.buffer], { type: 'audio/wav' });
        methodUsed = 'lossless-wav-strip';
      } else if (format === 'flac') {
        if (onProgress) onProgress(40);
        const stripped = stripFlacMetadata(bytes);
        cleanBlob = new Blob([stripped.cleanBytes.buffer], { type: 'audio/flac' });
        methodUsed = 'lossless-flac-strip';
      } else {
        // M4A, AAC, OGG, OPUS, AIFF -> Use ffmpeg stream copy
        if (onProgress) onProgress(30);
        try {
          const res = await cleanAudioWithFFmpeg(
            file,
            { mode: 'stream-copy' },
            (p) => {
              if (onProgress) onProgress(30 + Math.round(p * 0.5));
            }
          );
          cleanBlob = res.cleanBlob;
          methodUsed = 'ffmpeg-streamcopy';
        } catch (err: any) {
          console.warn('ffmpeg stream-copy failed, trying native byte strip fallback:', err);
          cleanBlob = this.losslessNativeStrip(bytes, format, file.type);
          methodUsed = 'lossless-mp3-strip';
        }
      }
    }

    if (onProgress) onProgress(85);

    // Verification step
    const verification = await verifyAudioClean(cleanBlob);

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

  private losslessNativeStrip(bytes: Uint8Array, format: string, defaultMime: string): Blob {
    if (format === 'mp3') {
      const stripped = stripMp3Metadata(bytes);
      return new Blob([stripped.cleanBytes.buffer], { type: 'audio/mpeg' });
    }
    if (format === 'wav') {
      const stripped = stripWavMetadata(bytes);
      return new Blob([stripped.cleanBytes.buffer], { type: 'audio/wav' });
    }
    if (format === 'flac') {
      const stripped = stripFlacMetadata(bytes);
      return new Blob([stripped.cleanBytes.buffer], { type: 'audio/flac' });
    }
    return new Blob([bytes.buffer], { type: defaultMime });
  }
}

export const audioProcessor = new AudioProcessor();

