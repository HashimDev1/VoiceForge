import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { logger } from '../utils/logger';

export class AudioMergeService {
  /**
   * Generates a buffer containing MP3 silence for specified duration (in seconds).
   * Uses standard 44.1kHz, 128kbps stereo MP3 frame header (0xFF 0xFB 0x90 0x64 ... silence payload).
   */
  public static createMp3SilenceBuffer(durationSec: number): Buffer {
    if (durationSec <= 0) {
      return Buffer.alloc(0);
    }

    // Standard MPEG-1 Layer 3 frame header for 44.1kHz, 128kbps, Stereo, 1152 samples per frame
    // Frame duration = 1152 / 44100 = ~0.026122 seconds
    // Frame size = 417 bytes at 128kbps
    const frameDuration = 1152 / 44100;
    const numFrames = Math.ceil(durationSec / frameDuration);

    const frameHeader = Buffer.from([
      0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    const frameSize = 417; // 128kbps @ 44.1kHz frame size
    const singleFrame = Buffer.alloc(frameSize, 0);
    frameHeader.copy(singleFrame, 0);

    const frames: Buffer[] = [];
    for (let i = 0; i < numFrames; i++) {
      frames.push(singleFrame);
    }

    return Buffer.concat(frames);
  }

  /**
   * Merges multiple MP3 buffers into a single MP3 file with silence pause gaps.
   */
  public static async mergeMp3Buffers(
    audioBuffers: Buffer[],
    pauseSec: number = 0.25
  ): Promise<Buffer> {
    if (!audioBuffers || audioBuffers.length === 0) {
      throw new Error('No audio buffers provided for merging.');
    }

    if (audioBuffers.length === 1 && pauseSec === 0) {
      return audioBuffers[0];
    }

    const silenceBuffer = this.createMp3SilenceBuffer(pauseSec);
    const combinedParts: Buffer[] = [];

    for (let i = 0; i < audioBuffers.length; i++) {
      combinedParts.push(audioBuffers[i]);
      if (i < audioBuffers.length - 1 && silenceBuffer.length > 0) {
        combinedParts.push(silenceBuffer);
      }
    }

    logger.info(`Merged ${audioBuffers.length} MP3 clips with ${pauseSec}s silence pause.`);
    return Buffer.concat(combinedParts);
  }

  /**
   * Creates a ZIP archive containing individual MP3 clips and script.txt
   */
  public static async createZipArchive(
    clips: { filename: string; buffer: Buffer }[],
    scriptText: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const buffers: Buffer[] = [];

      archive.on('data', (data: Buffer) => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', (err: Error) => reject(err));

      // Append script.txt
      archive.append(scriptText || '', { name: 'script.txt' });

      // Append clips
      clips.forEach((clip, index) => {
        const name = clip.filename || `${(index + 1).toString().padStart(2, '0')}.mp3`;
        archive.append(clip.buffer, { name });
      });

      archive.finalize();
    });
  }
}
