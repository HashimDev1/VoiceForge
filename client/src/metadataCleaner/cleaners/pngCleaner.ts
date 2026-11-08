import { CleaningOptions } from '../types';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function cleanPng(
  inputBytes: Uint8Array,
  options: CleaningOptions
): Uint8Array {
  if (inputBytes.length < 8) {
    throw new Error('Invalid PNG: file too short');
  }

  for (let i = 0; i < 8; i++) {
    if (inputBytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG: signature mismatch');
    }
  }

  const chunksToKeep: Uint8Array[] = [];
  chunksToKeep.push(inputBytes.subarray(0, 8));

  let offset = 8;
  const len = inputBytes.length;

  while (offset < len) {
    if (offset + 8 > len) break;

    const chunkLength =
      ((inputBytes[offset] << 24) |
        (inputBytes[offset + 1] << 16) |
        (inputBytes[offset + 2] << 8) |
        inputBytes[offset + 3]) >>>
      0;

    const chunkType = String.fromCharCode(
      inputBytes[offset + 4],
      inputBytes[offset + 5],
      inputBytes[offset + 6],
      inputBytes[offset + 7]
    );

    const totalChunkBytes = 12 + chunkLength;
    if (offset + totalChunkBytes > len) {
      chunksToKeep.push(inputBytes.subarray(offset));
      break;
    }

    let stripThis = false;

    if (
      (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') &&
      (options.stripXmp || options.stripExif || options.stripComments)
    ) {
      stripThis = true;
    } else if (chunkType === 'eXIf' && options.stripExif) {
      stripThis = true;
    } else if (chunkType === 'iCCP' && options.stripIcc) {
      stripThis = true;
    } else if ((chunkType === 'caBX' || chunkType === 'caDA') && options.stripC2pa) {
      stripThis = true;
    } else if (chunkType === 'dSIG' && options.stripC2pa) {
      stripThis = true;
    }

    if (!stripThis) {
      chunksToKeep.push(inputBytes.subarray(offset, offset + totalChunkBytes));
    }

    if (chunkType === 'IEND') {
      break;
    }

    offset += totalChunkBytes;
  }

  const totalLength = chunksToKeep.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunksToKeep) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

