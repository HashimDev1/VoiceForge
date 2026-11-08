import * as mm from 'music-metadata-browser';
import { AudioVerificationResult } from './audioTypes';

export async function verifyAudioClean(blob: Blob): Promise<AudioVerificationResult> {
  const remainingTags: Array<{ key: string; category: string; value: string }> = [];

  try {
    const parsed = await mm.parseBlob(blob, { duration: false });

    if (parsed.common) {
      for (const [k, v] of Object.entries(parsed.common)) {
        if (v === undefined || v === null || k === 'picture') continue;
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        if (valStr.trim().length > 0) {
          remainingTags.push({
            key: k,
            category: 'Common Tag',
            value: valStr,
          });
        }
      }
    }

    if (parsed.native) {
      for (const [family, tags] of Object.entries(parsed.native)) {
        for (const t of tags) {
          if (t.id && t.value) {
            remainingTags.push({
              key: t.id,
              category: family,
              value: String(t.value),
            });
          }
        }
      }
    }
  } catch (err) {
    // If parse succeeds with no tags or minimal headers, that's fine
  }

  // Also verify binary for C2PA / DigitalSourceType
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const scanLen = Math.min(bytes.length, 512 * 1024);
    let str = '';
    for (let i = 0; i < scanLen; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) str += String.fromCharCode(b);
    }

    if (str.includes('c2pa') || str.includes('DigitalSourceType')) {
      remainingTags.push({
        key: 'C2PA / DigitalSourceType',
        category: 'Provenance Box',
        value: 'Detected in container',
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

