import { getFFmpegInstance } from '../../audio/cleaners/ffmpegAudioCleaner';
import { VideoCleaningOptions, VideoItem } from '../videoTypes';

export async function cleanVideoWithFFmpeg(
  file: File,
  options: VideoCleaningOptions,
  onProgress?: (progressPercent: number) => void
): Promise<{ cleanBlob: Blob; method: VideoItem['methodUsed'] }> {
  const ffmpeg = await getFFmpegInstance(onProgress);

  const buffer = await file.arrayBuffer();
  const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const inputName = `input_vid_${Date.now()}.${inputExt}`;
  const outputExt = inputExt === 'mov' ? 'mov' : 'mp4';
  const outputName = `output_vid_${Date.now()}.${outputExt}`;

  // Write video to ffmpeg virtual FS
  await ffmpeg.writeFile(inputName, new Uint8Array(buffer));

  const args: string[] = ['-i', inputName, '-map_metadata', '-1'];

  if (options.nuclearReencode) {
    // Mode B: Nuclear Re-encode (rewrites video pixels to defeat watermarks)
    args.push('-c:v', 'libx264', '-crf', String(options.nuclearCrf || 20), '-preset', 'ultrafast');

    if (options.nuclearResolution === '1080p') {
      args.push('-vf', 'scale=-2:1080');
    } else if (options.nuclearResolution === '720p') {
      args.push('-vf', 'scale=-2:720');
    }

    args.push('-c:a', 'copy');
  } else {
    // Mode A: Lossless Stream Copy (default - 100% video/audio quality preserved)
    args.push('-codec', 'copy');
  }

  args.push(outputName);

  await ffmpeg.exec(args);

  const data = (await ffmpeg.readFile(outputName)) as Uint8Array;

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {}

  const mimeType = outputExt === 'mov' ? 'video/quicktime' : 'video/mp4';
  const cleanBlob = new Blob([data.buffer], { type: mimeType });

  return {
    cleanBlob,
    method: options.nuclearReencode ? 'ffmpeg-nuclear-reencode' : 'ffmpeg-streamcopy',
  };
}

/**
 * Native MP4 Box fallback: strips 'udta' and 'uuid' metadata boxes directly from the ArrayBuffer
 */
export function nativeStripMp4Boxes(buffer: Uint8Array): Uint8Array {
  if (buffer.length < 16) return buffer;

  // Verify 'ftyp'
  if (
    buffer[4] !== 0x66 ||
    buffer[5] !== 0x74 ||
    buffer[6] !== 0x79 ||
    buffer[7] !== 0x70
  ) {
    return buffer;
  }

  let offset = 0;
  const retainedChunks: Uint8Array[] = [];

  while (offset + 8 <= buffer.length) {
    const boxSize =
      (buffer[offset] << 24) |
      (buffer[offset + 1] << 16) |
      (buffer[offset + 2] << 8) |
      buffer[offset + 3];

    const boxType = String.fromCharCode(
      buffer[offset + 4],
      buffer[offset + 5],
      buffer[offset + 6],
      buffer[offset + 7]
    );

    const actualSize = boxSize === 1 ? buffer.length - offset : boxSize;
    if (actualSize <= 0 || offset + actualSize > buffer.length) {
      // Malformed or end of stream, keep remainder
      retainedChunks.push(buffer.subarray(offset));
      break;
    }

    // Filter metadata boxes
    if (boxType === 'udta' || boxType === 'uuid' || boxType === 'meta') {
      // Strip this metadata box
    } else {
      retainedChunks.push(buffer.subarray(offset, offset + actualSize));
    }

    offset += actualSize;
  }

  let totalLen = 0;
  for (const c of retainedChunks) totalLen += c.length;

  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of retainedChunks) {
    result.set(c, pos);
    pos += c.length;
  }

  return result;
}
