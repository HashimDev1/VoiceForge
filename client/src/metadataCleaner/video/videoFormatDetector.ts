import { VideoFormat } from './videoTypes';

export function detectVideoFormatFromBytes(bytes: Uint8Array): VideoFormat {
  if (bytes.length < 12) return 'unknown';

  // Check MP4 / MOV (ftyp box)
  if (
    bytes[4] === 0x66 && // 'f'
    bytes[5] === 0x74 && // 't'
    bytes[6] === 0x79 && // 'y'
    bytes[7] === 0x70    // 'p'
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand.includes('qt')) return 'mov';
    return 'mp4';
  }

  // Check WebM / MKV (EBML header 1A 45 DF A3)
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    const scanLen = Math.min(bytes.length, 256);
    let str = '';
    for (let i = 4; i < scanLen; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    if (str.includes('webm')) return 'webm';
    if (str.includes('matroska')) return 'mkv';
    return 'webm';
  }

  // Check AVI (RIFF....AVI )
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x41 &&
    bytes[9] === 0x56 &&
    bytes[10] === 0x49
  ) {
    return 'avi';
  }

  return 'unknown';
}

export function detectVideoFormatFromMimeOrName(
  filename: string,
  mimeType?: string
): VideoFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'mp4';
  if (ext === 'mov') return 'mov';
  if (ext === 'webm') return 'webm';
  if (ext === 'mkv') return 'mkv';
  if (ext === 'avi') return 'avi';

  if (mimeType) {
    if (mimeType.includes('video/mp4')) return 'mp4';
    if (mimeType.includes('video/quicktime')) return 'mov';
    if (mimeType.includes('video/webm')) return 'webm';
    if (mimeType.includes('video/x-matroska')) return 'mkv';
    if (mimeType.includes('video/x-msvideo') || mimeType.includes('video/avi')) return 'avi';
  }

  return 'unknown';
}

