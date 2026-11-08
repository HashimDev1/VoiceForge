import exifr from 'exifr';
import { detectC2paManifest } from './c2paDetector';
import { VerificationResult, CleaningOptions } from './types';

export async function verifyCleanliness(
  cleanBlob: Blob,
  options: CleaningOptions
): Promise<VerificationResult> {
  const ab = await cleanBlob.arrayBuffer();
  const uint8 = new Uint8Array(ab);

  const remainingTags: Array<{ key: string; category: string; value: string }> = [];

  const c2paCheck = detectC2paManifest(uint8);
  if (c2paCheck.detected) {
    remainingTags.push({
      key: 'C2PA.Manifest',
      category: 'C2PA',
      value: c2paCheck.details || 'Detected',
    });
  }

  try {
    const parsed = await exifr.parse(uint8, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: false,
      mergeOutput: false,
    });

    if (parsed) {
      if (parsed.ifd0 && Object.keys(parsed.ifd0).length > 0) {
        for (const [k, v] of Object.entries(parsed.ifd0)) {
          remainingTags.push({ key: `EXIF.${k}`, category: 'EXIF', value: String(v) });
        }
      }
      if (parsed.exif && Object.keys(parsed.exif).length > 0) {
        for (const [k, v] of Object.entries(parsed.exif)) {
          remainingTags.push({ key: `EXIF.${k}`, category: 'EXIF', value: String(v) });
        }
      }
      if (parsed.xmp && Object.keys(parsed.xmp).length > 0) {
        for (const [k, v] of Object.entries(parsed.xmp)) {
          remainingTags.push({ key: `XMP.${k}`, category: 'XMP', value: String(v) });
        }
      }
      if (parsed.iptc && Object.keys(parsed.iptc).length > 0) {
        for (const [k, v] of Object.entries(parsed.iptc)) {
          remainingTags.push({ key: `IPTC.${k}`, category: 'IPTC', value: String(v) });
        }
      }
      if (options.stripIcc && parsed.icc) {
        remainingTags.push({
          key: 'ICC.Profile',
          category: 'ICC',
          value: 'Color profile detected',
        });
      }
    }
  } catch (err) {
    // Normal if no EXIF header present
  }

  return {
    verifiedClean: remainingTags.length === 0,
    remainingTagsCount: remainingTags.length,
    remainingTags,
    verifiedAt: Date.now(),
  };
}

