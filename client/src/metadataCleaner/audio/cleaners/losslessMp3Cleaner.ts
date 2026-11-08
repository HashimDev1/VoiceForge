/**
 * Lossless MP3 Metadata Stripper
 *
 * Strips ID3v2 header (10 bytes header + syncsafe integer body size + optional footer),
 * trailing ID3v1 (128 bytes ending with 'TAG'), and trailing APE tags.
 * Preserves 100% of MPEG Layer III audio frames byte-for-byte with zero quality degradation.
 */
export function stripMp3Metadata(buffer: Uint8Array): {
  cleanBytes: Uint8Array;
  id3v2Stripped: boolean;
  id3v1Stripped: boolean;
  bytesRemoved: number;
} {
  let startOffset = 0;
  let endOffset = buffer.length;
  let id3v2Stripped = false;
  let id3v1Stripped = false;

  // 1. Strip ID3v2 tag(s) at start
  while (startOffset + 10 <= endOffset) {
    if (
      buffer[startOffset] === 0x49 && // 'I'
      buffer[startOffset + 1] === 0x44 && // 'D'
      buffer[startOffset + 2] === 0x33 // '3'
    ) {
      const flags = buffer[startOffset + 5];
      const hasFooter = (flags & 0x10) !== 0;

      // 4-byte syncsafe integer: each byte has 7 bits of size data
      const b0 = buffer[startOffset + 6];
      const b1 = buffer[startOffset + 7];
      const b2 = buffer[startOffset + 8];
      const b3 = buffer[startOffset + 9];

      const tagBodySize = ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
      const totalTagLength = 10 + tagBodySize + (hasFooter ? 10 : 0);

      startOffset += totalTagLength;
      id3v2Stripped = true;
    } else {
      break;
    }
  }

  // Find first MPEG sync frame (0xFF 0xFB, 0xFF 0xF3, etc.) if there's any junk padding
  let syncFound = false;
  for (let i = startOffset; i < Math.min(startOffset + 4096, endOffset - 1); i++) {
    if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
      startOffset = i;
      syncFound = true;
      break;
    }
  }
  if (!syncFound && id3v2Stripped) {
    // Keep startOffset as calculated
  }

  // 2. Strip trailing ID3v1 tag (128 bytes at end starting with "TAG")
  if (endOffset - startOffset >= 128) {
    const tagIndex = endOffset - 128;
    if (
      buffer[tagIndex] === 0x54 && // 'T'
      buffer[tagIndex + 1] === 0x41 && // 'A'
      buffer[tagIndex + 2] === 0x47 // 'G'
    ) {
      endOffset -= 128;
      id3v1Stripped = true;
    }
  }

  // 3. Strip trailing APEv2 tag if present ("APETAGEX")
  if (endOffset - startOffset >= 32) {
    const apeIndex = endOffset - 32;
    const isApe =
      buffer[apeIndex] === 0x41 &&
      buffer[apeIndex + 1] === 0x50 &&
      buffer[apeIndex + 2] === 0x45 &&
      buffer[apeIndex + 3] === 0x54 &&
      buffer[apeIndex + 4] === 0x41 &&
      buffer[apeIndex + 5] === 0x47 &&
      buffer[apeIndex + 6] === 0x45 &&
      buffer[apeIndex + 7] === 0x58;

    if (isApe) {
      // Read 4-byte LE tag size from apeIndex + 12
      const tagSize =
        buffer[apeIndex + 12] |
        (buffer[apeIndex + 13] << 8) |
        (buffer[apeIndex + 14] << 16) |
        (buffer[apeIndex + 15] << 24);
      if (tagSize > 0 && endOffset - tagSize >= startOffset) {
        endOffset -= tagSize;
      }
    }
  }

  const cleanBytes = buffer.subarray(startOffset, endOffset);
  const bytesRemoved = buffer.length - cleanBytes.length;

  return {
    cleanBytes,
    id3v2Stripped,
    id3v1Stripped,
    bytesRemoved,
  };
}

