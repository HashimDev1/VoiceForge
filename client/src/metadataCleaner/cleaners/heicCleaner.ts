import { cleanJpeg } from './jpegCleaner';
import { CleaningOptions } from '../types';

export async function cleanHeic(
  fileOrBlob: Blob,
  options: CleaningOptions
): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: fileOrBlob,
    toType: 'image/jpeg',
    quality: 0.98,
  });

  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  const ab = await jpegBlob.arrayBuffer();
  const uint8 = new Uint8Array(ab);

  const cleanBytes = cleanJpeg(uint8, options);
  return new Blob([cleanBytes], { type: 'image/jpeg' });
}

