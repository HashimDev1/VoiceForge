import { AudioFormat } from './audioTypes';

export function detectAudioFormatFromBytes(bytes: Uint8Array): AudioFormat {
  if (bytes.length < 4) return 'unknown';

  // MP3 ID3 header
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'mp3';
  }

  // FLAC magic bytes: "fLaC"
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return 'flac';
  }

  // Ogg magic bytes: "OggS"
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'ogg';
  }

  // WAV magic bytes: "RIFF" .... "WAVE"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12
  ) {
    if (
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    ) {
      return 'wav';
    }
  }

  // AIFF magic bytes: "FORM" .... "AIFF"
  if (
    bytes[0] === 0x46 &&
    bytes[1] === 0x4f &&
    bytes[2] === 0x52 &&
    bytes[3] === 0x4d &&
    bytes.length >= 12
  ) {
    if (
      (bytes[8] === 0x41 && bytes[9] === 0x49 && bytes[10] === 0x46 && bytes[11] === 0x46) ||
      (bytes[8] === 0x41 && bytes[9] === 0x49 && bytes[10] === 0x46 && bytes[11] === 0x43)
    ) {
      return 'aiff';
    }
  }

  // MP4 / M4A (ftyp atom)
  if (bytes.length >= 12) {
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand.includes('M4A') || brand.includes('mp4') || brand.includes('isom')) {
        return 'm4a';
      }
      return 'm4a';
    }
  }

  // MP3 Sync frame without ID3
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    // Check layer bits (bits 1-2 of second byte)
    const layer = (bytes[1] >> 1) & 0x03;
    if (layer === 1) {
      return 'mp3'; // Layer III
    }
    // AAC ADTS
    if ((bytes[1] & 0x06) === 0x00) {
      return 'aac';
    }
  }

  return 'unknown';
}

export function detectAudioFormatFromMimeOrName(
  filename: string,
  mimeType?: string
): AudioFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'mp3') return 'mp3';
  if (ext === 'wav') return 'wav';
  if (ext === 'flac') return 'flac';
  if (ext === 'm4a') return 'm4a';
  if (ext === 'aac') return 'aac';
  if (ext === 'ogg' || ext === 'oga') return 'ogg';
  if (ext === 'opus') return 'opus';
  if (ext === 'aif' || ext === 'aiff') return 'aiff';

  if (mimeType) {
    if (mimeType.includes('audio/mpeg') || mimeType.includes('audio/mp3')) return 'mp3';
    if (mimeType.includes('audio/wav') || mimeType.includes('audio/x-wav')) return 'wav';
    if (mimeType.includes('audio/flac') || mimeType.includes('audio/x-flac')) return 'flac';
    if (mimeType.includes('audio/mp4') || mimeType.includes('audio/x-m4a')) return 'm4a';
    if (mimeType.includes('audio/aac')) return 'aac';
    if (mimeType.includes('audio/ogg')) return 'ogg';
    if (mimeType.includes('audio/opus')) return 'opus';
    if (mimeType.includes('audio/aiff') || mimeType.includes('audio/x-aiff')) return 'aiff';
  }

  return 'unknown';
}

