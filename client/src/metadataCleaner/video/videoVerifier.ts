import { VideoVerificationResult } from './videoTypes';

export async function verifyVideoClean(blob: Blob): Promise<VideoVerificationResult> {
  const remainingTags: Array<{ key: string; category: string; value: string }> = [];

  try {
    const buffer = await blob.slice(0, 1024 * 1024).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) str += String.fromCharCode(b);
    }

    if (str.includes('c2pa') || str.includes('urn:c2pa') || str.includes('jumb')) {
      remainingTags.push({
        key: 'C2PA Manifest',
        category: 'Provenance Box',
        value: 'Cryptographic C2PA still detected',
      });
    }

    if (str.includes('DigitalSourceType') || str.includes('trainedAlgorithmicMedia')) {
      remainingTags.push({
        key: 'DigitalSourceType',
        category: 'XMP',
        value: 'AI provenance declaration still present',
      });
    }

    if (str.includes('udta') && (str.includes('Runway') || str.includes('Sora') || str.includes('Kling'))) {
      remainingTags.push({
        key: 'udta / AI signature',
        category: 'Atom',
        value: 'Generator name found in udta box',
      });
    }
  } catch {}

  return {
    verifiedClean: remainingTags.length === 0,
    remainingTagsCount: remainingTags.length,
    remainingTags,
    verifiedAt: Date.now(),
  };
}

