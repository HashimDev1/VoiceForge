import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpegInstance(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    isLoading = true;
    const ffmpeg = new FFmpeg();

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (err) {
      console.warn('Failed to load ffmpeg.wasm from unpkg, trying local fallback:', err);
      try {
        await ffmpeg.load();
        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (innerErr) {
        throw new Error(
          'ffmpeg.wasm engine could not be initialized in this browser. Native byte stripping will be used for MP3/WAV/FLAC.'
        );
      }
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function cleanAudioWithFFmpeg(
  file: File,
  options: {
    mode: 'stream-copy' | 'nuclear-reencode';
    targetFormat?: string;
    bitrate?: string;
  },
  onProgress?: (pct: number) => void
): Promise<{ cleanBlob: Blob; method: string }> {
  const ffmpeg = await getFFmpegInstance(onProgress);

  const buffer = await file.arrayBuffer();
  const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  const inputName = `input_${Date.now()}.${inputExt}`;

  let outputExt = inputExt;
  if (options.targetFormat) {
    outputExt = options.targetFormat;
  }
  const outputName = `output_${Date.now()}.${outputExt}`;

  // Write input file to ffmpeg virtual FS
  await ffmpeg.writeFile(inputName, new Uint8Array(buffer));

  const args: string[] = ['-i', inputName, '-map_metadata', '-1'];

  if (options.mode === 'stream-copy') {
    args.push('-codec', 'copy');
  } else {
    // Mode B: Nuclear Re-encode (re-encodes audio samples, breaking watermarks)
    if (outputExt === 'mp3') {
      args.push('-codec:a', 'libmp3lame', '-b:a', options.bitrate || '192k');
    } else if (outputExt === 'wav') {
      args.push('-codec:a', 'pcm_s16le');
    } else {
      args.push('-b:a', options.bitrate || '192k');
    }
  }

  args.push(outputName);

  // Execute FFmpeg command
  await ffmpeg.exec(args);

  // Read cleaned output from ffmpeg FS
  const data = (await ffmpeg.readFile(outputName)) as Uint8Array;

  // Clean up virtual files
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {}

  let mimeType = file.type;
  if (outputExt === 'mp3') mimeType = 'audio/mpeg';
  else if (outputExt === 'wav') mimeType = 'audio/wav';
  else if (outputExt === 'flac') mimeType = 'audio/flac';
  else if (outputExt === 'm4a') mimeType = 'audio/mp4';
  else if (outputExt === 'ogg') mimeType = 'audio/ogg';

  const cleanBlob = new Blob([data.buffer], { type: mimeType });

  return {
    cleanBlob,
    method: options.mode === 'stream-copy' ? 'ffmpeg-streamcopy' : 'ffmpeg-nuclear-reencode',
  };
}

