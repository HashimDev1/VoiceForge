import { VideoItem } from './videoTypes';

export interface VideoRemovedPill {
  label: string;
  type: 'c2pa' | 'ai-tool' | 'xmp' | 'atom';
}

export function extractVideoRemovedPills(item: VideoItem): VideoRemovedPill[] {
  const pills: VideoRemovedPill[] = [];
  const meta = item.metadata;

  if (!meta) {
    return [{ label: 'Video metadata atoms', type: 'atom' }];
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
      label: 'AI video generation tags',
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

  // 4. MP4 udta / metadata atoms
  if (meta.hasUdta || meta.tags.length > 0) {
    pills.push({
      label: 'MP4 Metadata Atoms (udta/meta)',
      type: 'atom',
    });
  }

  if (pills.length === 0) {
    pills.push({
      label: 'Container metadata stream',
      type: 'atom',
    });
  }

  return pills;
}

