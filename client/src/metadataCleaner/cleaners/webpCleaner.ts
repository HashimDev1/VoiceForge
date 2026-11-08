import { CleaningOptions } from '../types';

export function cleanWebp(
  inputBytes: Uint8Array,
  options: CleaningOptions
): Uint8Array {
  if (inputBytes.length < 12) {
    throw new Error('Invalid WEBP: file too short');
  }

  const riff = String.fromCharCode(inputBytes[0], inputBytes[1], inputBytes[2], inputBytes[3]);
  const webp = String.fromCharCode(inputBytes[8], inputBytes[9], inputBytes[10], inputBytes[11]);
  if (riff !== 'RIFF' || webp !== 'WEBP') {
    throw new Error('Invalid WEBP: Missing RIFF/WEBP signature');
  }

  const retainedChunks: Uint8Array[] = [];
  let offset = 12;
  const len = inputBytes.length;

  while (offset < len) {
    if (offset + 8 > len) break;

    const fourCC = String.fromCharCode(
      inputBytes[offset],
      inputBytes[offset + 1],
      inputBytes[offset + 2],
      inputBytes[offset + 3]
    );

    const chunkSize =
      inputBytes[offset + 4] |
      (inputBytes[offset + 5] << 8) |
      (inputBytes[offset + 6] << 16) |
      (inputBytes[offset + 7] << 24);

    const paddedSize = chunkSize + (chunkSize % 2);
    const totalChunkBytes = 8 + paddedSize;

    if (offset + totalChunkBytes > len) {
      retainedChunks.push(inputBytes.subarray(offset));
      break;
    }

    let shouldStrip = false;

    if (fourCC === 'EXIF' && options.stripExif) {
      shouldStrip = true;
    } else if (fourCC === 'XMP ' && options.stripXmp) {
      shouldStrip = true;
    } else if (fourCC === 'ICCP' && options.stripIcc) {
      shouldStrip = true;
    } else if ((fourCC === 'JUMB' || fourCC === 'caBX') && options.stripC2pa) {
      shouldStrip = true;
    }

    if (!shouldStrip) {
      if (fourCC === 'VP8X' && chunkSize >= 10) {
        const vp8xChunk = new Uint8Array(inputBytes.subarray(offset, offset + totalChunkBytes));
        let flags = vp8xChunk[8];

        if (options.stripExif) flags &= ~0x08;
        if (options.stripXmp) flags &= ~0x04;
        if (options.stripIcc) flags &= ~0x20;

        vp8xChunk[8] = flags;
        retainedChunks.push(vp8xChunk);
      } else {
        retainedChunks.push(inputBytes.subarray(offset, offset + totalChunkBytes));
      }
    }

    offset += totalChunkBytes;
  }

  const totalBodyLength = retainedChunks.reduce((acc, c) => acc + c.length, 0);
  const totalFileSize = 12 + totalBodyLength;

  const result = new Uint8Array(totalFileSize);
  result.set([0x52, 0x49, 0x46, 0x46], 0);

  const sizeMinus8 = totalFileSize - 8;
  result[4] = sizeMinus8 & 0xff;
  result[5] = (sizeMinus8 >> 8) & 0xff;
  result[6] = (sizeMinus8 >> 16) & 0xff;
  result[7] = (sizeMinus8 >> 24) & 0xff;

  result.set([0x57, 0x45, 0x42, 0x50], 8);

  let pos = 12;
  for (const chunk of retainedChunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

