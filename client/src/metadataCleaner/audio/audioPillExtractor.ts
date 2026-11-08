import { AudioItem } from './audioTypes';

export interface AudioRemovedPill {
  label: string;
  type: 'c2pa' | 'ai-tool' | 'xmp' | 'tag';
}

export function extractAudioRemovedPills(item: AudioItem): AudioRemovedPill[] {
  const pills: AudioRemovedPill[] = [];
  const meta = item.metadata;

  if (!meta) {
    // If not inspected yet or fallback
    return [{ label: 'Audio metadata tags', type: 'tag' }];
  }

  // 1. C2PA pill
  if (meta.hasC2pa) {
    pills.push({
      label: 'C2PA / Content Credentials',
      type: 'c2pa',
    });
  }

  // 2. AI tool trace pill
  if (meta.aiToolDetected) {
    pills.push({
      label: `AI tool trace: ${meta.aiToolDetected}`,
      type: 'ai-tool',
    });
  } else if (meta.hasAiProvenance) {
    pills.push({
      label: 'AI generation provenance tags',
      type: 'ai-tool',
    });
  }

  // 3. XMP / DigitalSourceType
  const hasDigitalSource = meta.tags.some(
    (t) => t.key.toLowerCase().includes('digitalsourcetype') || t.isAi
  );
  if (hasDigitalSource && !meta.aiToolDetected) {
    pills.push({
      label: 'XMP "trainedAlgorithmicMedia"',
      type: 'xmp',
    });
  }

  // 4. Format-specific metadata tags
  if (meta.hasId3v2 || meta.hasId3v1) {
    pills.push({
      label: 'ID3 metadata & encoder tags',
      type: 'tag',
    });
  } else if (meta.hasVorbis) {
    pills.push({
      label: 'Vorbis comment & picture tags',
      type: 'tag',
    });
  } else if (meta.hasMp4Atoms) {
    pills.push({
      label: 'MP4 metadata atoms (©too, ©nam)',
      type: 'tag',
    });
  } else if (meta.hasRiffInfo) {
    pills.push({
      label: 'RIFF INFO & bext metadata',
      type: 'tag',
    });
  } else if (meta.totalTagsCount > 0) {
    pills.push({
      label: `${meta.totalTagsCount} metadata tags`,
      type: 'tag',
    });
  }

  if (pills.length === 0) {
    pills.push({
      label: 'File metadata container tags',
      type: 'tag',
    });
  }

  return pills;
}

