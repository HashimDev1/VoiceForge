import {
  CleaningOptions,
  ImageMetadataSummary,
  VerificationResult,
} from './types';
import { readImageMetadata } from './metadataReader';
import { processImageCleaning } from './cleaners';
import { verifyCleanliness } from './verifier';

class ImageProcessorService {
  public async inspect(file: File): Promise<ImageMetadataSummary> {
    return readImageMetadata(file, file.name, file.type);
  }

  public async clean(
    file: File,
    options: CleaningOptions,
    onProgress?: (percent: number) => void
  ): Promise<{
    cleanBlob: Blob;
    verification: VerificationResult;
    methodUsed: 'lossless' | 'nuclear' | 'heic-converted';
    durationMs: number;
  }> {
    const startTime = performance.now();
    onProgress?.(20);

    const res = await processImageCleaning(file, file.name, options);
    onProgress?.(70);

    const verification = await verifyCleanliness(res.blob, options);
    onProgress?.(100);

    return {
      cleanBlob: res.blob,
      verification,
      methodUsed: res.methodUsed,
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}

export const imageProcessor = new ImageProcessorService();

