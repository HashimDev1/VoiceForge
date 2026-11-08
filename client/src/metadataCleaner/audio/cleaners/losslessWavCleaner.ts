/**
 * Lossless WAV Metadata Stripper
 *
 * Scans RIFF chunks and removes metadata chunks (LIST/INFO, id3, bext, XMP, JUMBF/C2PA)
 * while preserving mandatory audio chunks ('fmt ', 'data', 'fact').
 * Rewrites the 32-bit RIFF length header to match the new stripped payload.
 */
export function stripWavMetadata(buffer: Uint8Array): {
  cleanBytes: Uint8Array;
  chunksRemoved: string[];
  bytesRemoved: number;
} {
  if (buffer.length < 12) {
    return { cleanBytes: buffer, chunksRemoved: [], bytesRemoved: 0 };
  }

  // Verify 'RIFF' and 'WAVE'
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWave =
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45;

  if (!isRiff || !isWave) {
    return { cleanBytes: buffer, chunksRemoved: [], bytesRemoved: 0 };
  }

  let offset = 12;
  const retainedChunks: Uint8Array[] = [];
  const chunksRemoved: string[] = [];

  const METADATA_CHUNK_IDS = new Set([
    'LIST',
    'id3 ',
    'ID3 ',
    'bext',
    '_PMX',
    'XMP ',
    'JUMB',
    'c2pa',
    'DISP',
    'JUNK',
    'PAD ',
  ]);

  while (offset + 8 <= buffer.length) {
    const chunkId = String.fromCharCode(
      buffer[offset],
      buffer[offset + 1],
      buffer[offset + 2],
      buffer[offset + 3]
    );

    const chunkSize =
      buffer[offset + 4] |
      (buffer[offset + 5] << 8) |
      (buffer[offset + 6] << 16) |
      (buffer[offset + 7] << 24);

    const padByte = chunkSize % 2 !== 0 ? 1 : 0;
    const totalChunkBytes = 8 + chunkSize + padByte;

    if (offset + totalChunkBytes > buffer.length + 1) {
      // Malformed or truncated chunk, break to avoid overrun
      break;
    }

    if (METADATA_CHUNK_IDS.has(chunkId)) {
      chunksRemoved.push(chunkId.trim());
    } else {
      // Retain this chunk
      retainedChunks.push(buffer.subarray(offset, Math.min(offset + totalChunkBytes, buffer.length)));
    }

    offset += totalChunkBytes;
  }

  // Calculate new total file size: 4 ('WAVE') + sum of retained chunks
  let totalDataLength = 4; // for 'WAVE'
  for (const c of retainedChunks) {
    totalDataLength += c.length;
  }

  const cleanBytes = new Uint8Array(8 + totalDataLength);

  // 'RIFF'
  cleanBytes[0] = 0x52;
  cleanBytes[1] = 0x49;
  cleanBytes[2] = 0x46;
  cleanBytes[3] = 0x46;

  // New 32-bit LE length = totalDataLength
  cleanBytes[4] = totalDataLength & 0xff;
  cleanBytes[5] = (totalDataLength >> 8) & 0xff;
  cleanBytes[6] = (totalDataLength >> 16) & 0xff;
  cleanBytes[7] = (totalDataLength >> 24) & 0xff;

  // 'WAVE'
  cleanBytes[8] = 0x57;
  cleanBytes[9] = 0x41;
  cleanBytes[10] = 0x56;
  cleanBytes[11] = 0x45;

  let writeOffset = 12;
  for (const c of retainedChunks) {
    cleanBytes.set(c, writeOffset);
    writeOffset += c.length;
  }

  const bytesRemoved = buffer.length - cleanBytes.length;

  return {
    cleanBytes,
    chunksRemoved,
    bytesRemoved,
  };
}

