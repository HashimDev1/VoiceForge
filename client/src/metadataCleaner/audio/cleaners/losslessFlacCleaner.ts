/**
 * Lossless FLAC Metadata Stripper
 *
 * Scans FLAC METADATA_BLOCKs after the "fLaC" 4-byte header.
 * Retains mandatory STREAMINFO (type 0) and SEEKTABLE (type 3),
 * stripping VORBIS_COMMENT (type 4), PICTURE (type 6), and APPLICATION blocks (type 2).
 * Marks the last retained metadata block with the isLastBlock flag (bit 7 = 1)
 * and preserves 100% of the raw FLAC audio frames byte-for-byte.
 */
export function stripFlacMetadata(buffer: Uint8Array): {
  cleanBytes: Uint8Array;
  blocksRemoved: string[];
  bytesRemoved: number;
} {
  if (buffer.length < 42) {
    return { cleanBytes: buffer, blocksRemoved: [], bytesRemoved: 0 };
  }

  // Check 'fLaC' marker
  if (
    buffer[0] !== 0x66 ||
    buffer[1] !== 0x4c ||
    buffer[2] !== 0x61 ||
    buffer[3] !== 0x43
  ) {
    return { cleanBytes: buffer, blocksRemoved: [], bytesRemoved: 0 };
  }

  let offset = 4;
  let isLast = false;
  const retainedBlocks: { header: Uint8Array; body: Uint8Array; type: number }[] = [];
  const blocksRemoved: string[] = [];

  const BLOCK_NAMES: Record<number, string> = {
    0: 'STREAMINFO',
    1: 'PADDING',
    2: 'APPLICATION',
    3: 'SEEKTABLE',
    4: 'VORBIS_COMMENT',
    5: 'CUESHEET',
    6: 'PICTURE',
  };

  while (offset + 4 <= buffer.length && !isLast) {
    const headerByte0 = buffer[offset];
    isLast = (headerByte0 & 0x80) !== 0;
    const blockType = headerByte0 & 0x7f;

    const length =
      (buffer[offset + 1] << 16) |
      (buffer[offset + 2] << 8) |
      buffer[offset + 3];

    const blockStart = offset;
    const blockEnd = offset + 4 + length;

    if (blockEnd > buffer.length) {
      break;
    }

    const typeName = BLOCK_NAMES[blockType] || `BLOCK_${blockType}`;

    // Retain STREAMINFO (0) and optionally SEEKTABLE (3)
    if (blockType === 0 || blockType === 3) {
      const header = new Uint8Array(buffer.subarray(blockStart, blockStart + 4));
      const body = new Uint8Array(buffer.subarray(blockStart + 4, blockEnd));
      retainedBlocks.push({ header, body, type: blockType });
    } else {
      blocksRemoved.push(typeName);
    }

    offset = blockEnd;
  }

  // The rest of the buffer is the untouched audio frames
  const audioFrames = buffer.subarray(offset);

  // Mark the last retained block's header with isLastBlock = 1 (bit 7)
  if (retainedBlocks.length > 0) {
    const lastBlock = retainedBlocks[retainedBlocks.length - 1];
    lastBlock.header[0] = lastBlock.header[0] | 0x80;
  }

  // Calculate new total size: 4 ('fLaC') + sum of retained blocks + audio frames
  let totalLength = 4 + audioFrames.length;
  for (const b of retainedBlocks) {
    totalLength += b.header.length + b.body.length;
  }

  const cleanBytes = new Uint8Array(totalLength);
  // 'fLaC'
  cleanBytes[0] = 0x66;
  cleanBytes[1] = 0x4c;
  cleanBytes[2] = 0x61;
  cleanBytes[3] = 0x43;

  let writeOffset = 4;
  for (const b of retainedBlocks) {
    cleanBytes.set(b.header, writeOffset);
    writeOffset += b.header.length;
    cleanBytes.set(b.body, writeOffset);
    writeOffset += b.body.length;
  }

  cleanBytes.set(audioFrames, writeOffset);
  const bytesRemoved = buffer.length - cleanBytes.length;

  return {
    cleanBytes,
    blocksRemoved,
    bytesRemoved,
  };
}

