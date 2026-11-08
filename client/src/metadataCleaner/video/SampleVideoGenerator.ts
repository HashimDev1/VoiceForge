/**
 * Generates synthetic sample MP4 videos in-memory with AI metadata tags
 * (Runway Gen-3, OpenAI Sora, C2PA) for 1-click test stripping.
 */

function createSyntheticMp4Bytes(toolName: string, prompt: string): Uint8Array {
  const commentText = `${toolName}. Prompt: ${prompt}. DigitalSourceType: trainedAlgorithmicMedia. C2PA: manifest.`;
  const commentBytes = Array.from(commentText).map((c) => c.charCodeAt(0));

  // 'ftyp' box
  const ftyp = [
    0x00, 0x00, 0x00, 0x20, // size 32
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // 'isom'
    0x00, 0x00, 0x02, 0x00, // minor_version
    0x69, 0x73, 0x6f, 0x6d, // compatible brands: isom
    0x69, 0x73, 0x6f, 0x32, // iso2
    0x61, 0x76, 0x63, 0x31, // avc1
    0x6d, 0x70, 0x34, 0x31, // mp41
  ];

  // 'udta' box containing AI comment
  const udtaPayload = [
    0x00, 0x00, 0x00, commentBytes.length + 8,
    0xa9, 0x63, 0x6d, 0x74, // '©cmt'
    ...commentBytes,
  ];

  const udtaBox = [
    0x00, 0x00, 0x00, udtaPayload.length + 8,
    0x75, 0x64, 0x74, 0x61, // 'udta'
    ...udtaPayload,
  ];

  // 'moov' box containing 'mvhd' + 'udta'
  const mvhdBox = [
    0x00, 0x00, 0x00, 0x6c, // 108 bytes
    0x6d, 0x76, 0x68, 0x64, // 'mvhd'
    ...new Array(100).fill(0),
  ];

  const moovPayload = [...mvhdBox, ...udtaBox];
  const moovBox = [
    0x00, 0x00, 0x00, moovPayload.length + 8,
    0x6d, 0x6f, 0x6f, 0x76, // 'moov'
    ...moovPayload,
  ];

  // 'mdat' box (dummy payload)
  const mdatSize = 512;
  const mdatBox = [
    0x00, 0x00, 0x02, 0x08, // 520 bytes
    0x6d, 0x64, 0x61, 0x74, // 'mdat'
    ...new Array(mdatSize).fill(0xaa),
  ];

  const total = [...ftyp, ...moovBox, ...mdatBox];
  return new Uint8Array(total);
}

export function createSampleRunwayVideo(): File {
  const bytes = createSyntheticMp4Bytes('Runway Gen-3 Alpha', 'cinematic drone flythrough over cyberpunk neo-tokyo');
  return new File([bytes.buffer], 'Runway_Gen3_Cyberpunk_Tokyo_1080p.mp4', { type: 'video/mp4' });
}

export function createSampleSoraVideo(): File {
  const bytes = createSyntheticMp4Bytes('OpenAI Sora Video', 'hyper-realistic wooly mammoth walking in snow');
  return new File([bytes.buffer], 'OpenAI_Sora_Mammoth_Snow_4K.mp4', { type: 'video/mp4' });
}

