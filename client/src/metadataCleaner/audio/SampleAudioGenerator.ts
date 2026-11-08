/**
 * Generates synthetic sample audio files in-memory containing AI provenance metadata
 * (e.g., Suno AI, ElevenLabs, OpenAI TTS, and XMP trainedAlgorithmicMedia)
 * for immediate one-click testing.
 */

function createSineWavBytes(durationSeconds = 1.0, sampleRate = 22050): Uint8Array {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * bytesPerSample;

  // Metadata text
  const artist = 'Suno AI Music Studio';
  const comment =
    'Prompt: upbeat cyberpunk beat. DigitalSourceType: trainedAlgorithmicMedia. Generator: Suno v3.5';

  // Build LIST / INFO chunk
  const infoData: number[] = [];
  // 'INFO'
  infoData.push(0x49, 0x4e, 0x46, 0x4f);
  // 'IART' (Artist)
  infoData.push(0x49, 0x41, 0x52, 0x54);
  infoData.push(artist.length + 1, 0, 0, 0);
  for (let i = 0; i < artist.length; i++) infoData.push(artist.charCodeAt(i));
  infoData.push(0);
  if ((artist.length + 1) % 2 !== 0) infoData.push(0);

  // 'ICMT' (Comment)
  infoData.push(0x49, 0x43, 0x4d, 0x54);
  infoData.push(comment.length + 1, 0, 0, 0);
  for (let i = 0; i < comment.length; i++) infoData.push(comment.charCodeAt(i));
  infoData.push(0);
  if ((comment.length + 1) % 2 !== 0) infoData.push(0);

  const listChunkSize = infoData.length;
  const totalRiffSize = 4 + (8 + 16) + (8 + dataSize) + (8 + listChunkSize);

  const buffer = new Uint8Array(8 + totalRiffSize);
  let pos = 0;

  // 'RIFF'
  buffer[pos++] = 0x52;
  buffer[pos++] = 0x49;
  buffer[pos++] = 0x46;
  buffer[pos++] = 0x46;

  // Total size
  buffer[pos++] = totalRiffSize & 0xff;
  buffer[pos++] = (totalRiffSize >> 8) & 0xff;
  buffer[pos++] = (totalRiffSize >> 16) & 0xff;
  buffer[pos++] = (totalRiffSize >> 24) & 0xff;

  // 'WAVE'
  buffer[pos++] = 0x57;
  buffer[pos++] = 0x41;
  buffer[pos++] = 0x56;
  buffer[pos++] = 0x45;

  // 'fmt ' chunk
  buffer[pos++] = 0x66;
  buffer[pos++] = 0x6d;
  buffer[pos++] = 0x74;
  buffer[pos++] = 0x20;
  buffer[pos++] = 16;
  buffer[pos++] = 0;
  buffer[pos++] = 0;
  buffer[pos++] = 0; // Chunk size = 16
  buffer[pos++] = 1;
  buffer[pos++] = 0; // PCM format (1)
  buffer[pos++] = 1;
  buffer[pos++] = 0; // Mono (1 channel)
  buffer[pos++] = sampleRate & 0xff;
  buffer[pos++] = (sampleRate >> 8) & 0xff;
  buffer[pos++] = (sampleRate >> 16) & 0xff;
  buffer[pos++] = (sampleRate >> 24) & 0xff;

  const byteRate = sampleRate * bytesPerSample;
  buffer[pos++] = byteRate & 0xff;
  buffer[pos++] = (byteRate >> 8) & 0xff;
  buffer[pos++] = (byteRate >> 16) & 0xff;
  buffer[pos++] = (byteRate >> 24) & 0xff;

  buffer[pos++] = bytesPerSample;
  buffer[pos++] = 0; // Block align
  buffer[pos++] = 16;
  buffer[pos++] = 0; // Bits per sample (16)

  // 'data' chunk
  buffer[pos++] = 0x64;
  buffer[pos++] = 0x61;
  buffer[pos++] = 0x74;
  buffer[pos++] = 0x61;
  buffer[pos++] = dataSize & 0xff;
  buffer[pos++] = (dataSize >> 8) & 0xff;
  buffer[pos++] = (dataSize >> 16) & 0xff;
  buffer[pos++] = (dataSize >> 24) & 0xff;

  // Generate pleasant 440Hz sine wave tone
  const freq = 440;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.floor(Math.sin(2 * Math.PI * freq * t) * 16000);
    buffer[pos++] = sample & 0xff;
    buffer[pos++] = (sample >> 8) & 0xff;
  }

  // 'LIST' chunk
  buffer[pos++] = 0x4c;
  buffer[pos++] = 0x49;
  buffer[pos++] = 0x53;
  buffer[pos++] = 0x54;
  buffer[pos++] = listChunkSize & 0xff;
  buffer[pos++] = (listChunkSize >> 8) & 0xff;
  buffer[pos++] = (listChunkSize >> 16) & 0xff;
  buffer[pos++] = (listChunkSize >> 24) & 0xff;

  for (let i = 0; i < infoData.length; i++) {
    buffer[pos++] = infoData[i];
  }

  return buffer;
}

function createMp3BytesWithId3(): Uint8Array {
  // Construct ID3v2.3 tag containing ElevenLabs & OpenAI TTS provenance
  const artist = 'ElevenLabs AI Synthesizer (eleven_multilingual_v2)';
  const comment =
    'AI Voice Generated. Prompt: narrate intro. trainedAlgorithmicMedia. C2PA manifest attached.';

  // Build ID3 frames
  const frames: number[] = [];

  // TPE1 (Artist) frame
  const tpe1Data = [0x00, ...Array.from(artist).map((c) => c.charCodeAt(0))];
  frames.push(0x54, 0x50, 0x45, 0x31); // 'TPE1'
  frames.push(0, 0, 0, tpe1Data.length); // 4-byte size
  frames.push(0, 0); // flags
  frames.push(...tpe1Data);

  // COMM (Comment) frame
  const commData = [
    0x00, // encoding: ISO-8859-1
    0x65,
    0x6e,
    0x67, // 'eng' language
    0x00, // empty short desc null terminator
    ...Array.from(comment).map((c) => c.charCodeAt(0)),
  ];
  frames.push(0x43, 0x4f, 0x4d, 0x4d); // 'COMM'
  frames.push(0, 0, 0, commData.length);
  frames.push(0, 0);
  frames.push(...commData);

  // TENC (Encoded by) frame
  const tencData = [0x00, ...Array.from('OpenAI tts-1-hd (whisper compatible)').map((c) => c.charCodeAt(0))];
  frames.push(0x54, 0x45, 0x4e, 0x43); // 'TENC'
  frames.push(0, 0, 0, tencData.length);
  frames.push(0, 0);
  frames.push(...tencData);

  const tagBodySize = frames.length;

  // Syncsafe size for header
  const b0 = (tagBodySize >> 21) & 0x7f;
  const b1 = (tagBodySize >> 14) & 0x7f;
  const b2 = (tagBodySize >> 7) & 0x7f;
  const b3 = tagBodySize & 0x7f;

  const id3Header = [
    0x49, 0x44, 0x33, // 'ID3'
    0x03, 0x00, // version 2.3
    0x00, // flags
    b0, b1, b2, b3,
  ];

  // Dummy MPEG Layer 3 audio frames (418 bytes per frame at 128kbps / 44.1kHz)
  // Header: 0xFF 0xFB 0x90 0x64 (MPEG-1 Layer III, 128 kbps, 44100 Hz)
  const numFrames = 30;
  const frameLength = 418;
  const mpegBytes: number[] = [];
  for (let f = 0; f < numFrames; f++) {
    mpegBytes.push(0xff, 0xfb, 0x90, 0x64);
    for (let i = 4; i < frameLength; i++) {
      mpegBytes.push(0x55); // payload pattern
    }
  }

  // Trailing ID3v1 tag (128 bytes)
  const id3v1: number[] = new Array(128).fill(0);
  id3v1[0] = 0x54;
  id3v1[1] = 0x41;
  id3v1[2] = 0x47; // 'TAG'
  const title1 = 'ElevenLabs AI Track';
  for (let i = 0; i < title1.length; i++) id3v1[3 + i] = title1.charCodeAt(i);

  const total = [...id3Header, ...frames, ...mpegBytes, ...id3v1];
  return new Uint8Array(total);
}

export function createSampleSunoWav(): File {
  const bytes = createSineWavBytes(1.5, 22050);
  return new File([bytes.buffer], 'Suno_AI_Generated_Track_v3.wav', { type: 'audio/wav' });
}

export function createSampleElevenLabsMp3(): File {
  const bytes = createMp3BytesWithId3();
  return new File([bytes.buffer], 'ElevenLabs_AI_Voiceover_2026.mp3', { type: 'audio/mpeg' });
}

