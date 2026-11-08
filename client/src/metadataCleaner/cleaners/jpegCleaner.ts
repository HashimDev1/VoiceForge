import piexif from 'piexifjs';
import { CleaningOptions } from '../types';

export function stripJpegSegmentsDirect(
  inputBytes: Uint8Array,
  options: CleaningOptions
): Uint8Array {
  if (inputBytes.length < 4 || inputBytes[0] !== 0xff || inputBytes[1] !== 0xd8) {
    throw new Error('Invalid JPEG stream: Missing SOI (0xFFD8) marker');
  }

  const chunks: Uint8Array[] = [];
  chunks.push(new Uint8Array([0xff, 0xd8]));

  let offset = 2;
  let sosReached = false;

  while (offset < inputBytes.length) {
    if (inputBytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    while (offset < inputBytes.length && inputBytes[offset] === 0xff) {
      offset++;
    }

    if (offset >= inputBytes.length) break;

    const marker = inputBytes[offset];
    offset++;

    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(new Uint8Array([0xff, marker]));
      continue;
    }

    if (marker === 0xd9) {
      chunks.push(new Uint8Array([0xff, 0xd9]));
      break;
    }

    if (offset + 2 > inputBytes.length) break;

    const length = (inputBytes[offset] << 8) | inputBytes[offset + 1];
    if (length < 2) break;

    const segmentEnd = offset + length;
    if (segmentEnd > inputBytes.length) break;

    if (marker === 0xda) {
      chunks.push(inputBytes.subarray(offset - 2, inputBytes.length));
      sosReached = true;
      break;
    }

    let shouldStrip = false;

    // APP1 (E1): EXIF & XMP
    if (marker === 0xe1 && (options.stripExif || options.stripXmp)) {
      shouldStrip = true;
    }
    // APP2 (E2): ICC profile
    else if (marker === 0xe2 && options.stripIcc) {
      shouldStrip = true;
    }
    // APP11 (EB): C2PA / JUMBF manifests
    else if (marker === 0xeb && options.stripC2pa) {
      shouldStrip = true;
    }
    // APP13 (ED): IPTC / Photoshop IRB
    else if (marker === 0xed && options.stripIptc) {
      shouldStrip = true;
    }
    // COM (FE): Comment segment
    else if (marker === 0xfe && options.stripComments) {
      shouldStrip = true;
    }
    // APP3 through APP10, APP12, APP15 (other vendor metadata)
    else if (
      (marker >= 0xe3 && marker <= 0xea) ||
      marker === 0xec ||
      marker === 0xef
    ) {
      shouldStrip = true;
    }

    if (!shouldStrip) {
      const segment = inputBytes.subarray(offset - 2, segmentEnd);
      chunks.push(segment);
    }

    offset = segmentEnd;
  }

  if (!sosReached && chunks.length <= 1) {
    return inputBytes;
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

function uint8ToBinaryString(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 32768;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunkSize, len)) as unknown as number[]
    );
  }
  return binary;
}

function binaryStringToUint8(binary: string): Uint8Array {
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function cleanJpeg(
  inputBytes: Uint8Array,
  options: CleaningOptions
): Uint8Array {
  let currentBytes = inputBytes;

  if (options.stripExif) {
    try {
      const binaryStr = uint8ToBinaryString(currentBytes);
      const dataUrl = 'data:image/jpeg;base64,' + btoa(binaryStr);
      const removedDataUrl = piexif.remove(dataUrl);
      const base64Data = removedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
      const rawBinary = atob(base64Data);
      currentBytes = binaryStringToUint8(rawBinary);
    } catch (e) {
      console.warn('[cleanJpeg] piexif.remove non-fatal fallback:', e);
    }
  }

  return stripJpegSegmentsDirect(currentBytes, options);
}

