import { ImageFormat, CleaningOptions } from '../types';
import { detectFormatFromBuffer, detectFormatFromMimeOrName } from '../formatDetector';
import { cleanJpeg } from './jpegCleaner';
import { cleanPng } from './pngCleaner';
import { cleanWebp } from './webpCleaner';
import { cleanHeic } from './heicCleaner';
import { nuclearCanvasReencode } from './nuclearCleaner';

export interface CleanResult {
  blob: Blob;
  format: ImageFormat;
  methodUsed: 'lossless' | 'nuclear' | 'heic-converted';
  durationMs: number;
}

export async function processImageCleaning(
  fileOrBlob: File | Blob,
  fileName: string,
  options: CleaningOptions
): Promise<CleanResult> {
  const startTime = performance.now();
  const ab = await fileOrBlob.arrayBuffer();
  const uint8 = new Uint8Array(ab);

  let format = detectFormatFromBuffer(uint8);
  if (format === 'unknown') {
    format = detectFormatFromMimeOrName(fileName, fileOrBlob.type);
  }

  if (options.nuclearCanvas && format !== 'heic') {
    const targetFormat = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpeg';
    const nuclearBlob = await nuclearCanvasReencode(
      fileOrBlob,
      targetFormat,
      options.nuclearQuality
    );
    const durationMs = Math.round(performance.now() - startTime);
    return {
      blob: nuclearBlob,
      format: targetFormat,
      methodUsed: 'nuclear',
      durationMs,
    };
  }

  try {
    if (format === 'jpeg') {
      const cleanBytes = cleanJpeg(uint8, options);
      const cleanBlob = new Blob([cleanBytes], { type: 'image/jpeg' });
      return {
        blob: cleanBlob,
        format: 'jpeg',
        methodUsed: 'lossless',
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (format === 'png') {
      const cleanBytes = cleanPng(uint8, options);
      const cleanBlob = new Blob([cleanBytes], { type: 'image/png' });
      return {
        blob: cleanBlob,
        format: 'png',
        methodUsed: 'lossless',
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (format === 'webp') {
      const cleanBytes = cleanWebp(uint8, options);
      const cleanBlob = new Blob([cleanBytes], { type: 'image/webp' });
      return {
        blob: cleanBlob,
        format: 'webp',
        methodUsed: 'lossless',
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (format === 'heic') {
      const cleanBlob = await cleanHeic(fileOrBlob, options);
      return {
        blob: cleanBlob,
        format: 'jpeg',
        methodUsed: 'heic-converted',
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    const fallbackBlob = await nuclearCanvasReencode(fileOrBlob, 'jpeg', 0.95);
    return {
      blob: fallbackBlob,
      format: 'jpeg',
      methodUsed: 'nuclear',
      durationMs: Math.round(performance.now() - startTime),
    };
  } catch (err) {
    console.warn('[processImageCleaning] Fallback to nuclear canvas re-encode:', err);
    const fallbackBlob = await nuclearCanvasReencode(fileOrBlob, 'jpeg', 0.95);
    return {
      blob: fallbackBlob,
      format: 'jpeg',
      methodUsed: 'nuclear',
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}

