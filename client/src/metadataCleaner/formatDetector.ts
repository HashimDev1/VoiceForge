import { ImageFormat } from './types';

export function detectFormatFromBuffer(buffer: ArrayBuffer | Uint8Array): ImageFormat {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 12) return 'unknown';

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // WEBP: RIFF .... WEBP
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'webp';
  }

  // HEIC / HEIF / AVIF: [offset 4]: 'ftyp'
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (ftyp === 'ftyp') {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    const heicBrands = ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1', 'avif'];
    if (heicBrands.some((b) => brand.includes(b))) {
      return 'heic';
    }
  }

  return 'unknown';
}

export function detectFormatFromMimeOrName(fileName: string, mimeType?: string): ImageFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'jpg' || ext === 'jpeg' || mimeType === 'image/jpeg') return 'jpeg';
  if (ext === 'png' || mimeType === 'image/png') return 'png';
  if (ext === 'webp' || mimeType === 'image/webp') return 'webp';
  if (
    ext === 'heic' ||
    ext === 'heif' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif'
  ) {
    return 'heic';
  }
  return 'unknown';
}

