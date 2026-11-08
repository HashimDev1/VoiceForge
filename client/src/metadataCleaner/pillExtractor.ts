import { ImageItem } from './types';

export interface RemovedPill {
  label: string;
  isAi: boolean;
  category: 'c2pa' | 'iptc' | 'tool' | 'exif' | 'icc' | 'other';
}

/**
 * Extracts human-friendly tags/items removed from an image (as shown in reference screenshot)
 */
export function extractRemovedPills(item: ImageItem): RemovedPill[] {
  const pills: RemovedPill[] = [];
  const metadata = item.metadata;
  if (!metadata) {
    return [{ label: 'File metadata stripped', isAi: false, category: 'other' }];
  }

  const addedLabels = new Set<string>();
  const addPill = (pill: RemovedPill) => {
    if (!addedLabels.has(pill.label)) {
      addedLabels.add(pill.label);
      pills.push(pill);
    }
  };

  // 1. C2PA / Content Credentials
  if (metadata.hasC2pa || metadata.c2paManifestFound) {
    addPill({
      label: 'C2PA / Content Credentials',
      isAi: true,
      category: 'c2pa',
    });
  }

  // 2. IPTC / XMP DigitalSourceType AI Label
  const hasIptcAi = metadata.tags.some(
    (t) =>
      t.key.toLowerCase().includes('digitalsourcetype') ||
      String(t.value).toLowerCase().includes('trainedalgorithmicmedia') ||
      String(t.value).toLowerCase().includes('compositewithtrainedalgorithmicmedia') ||
      String(t.value).toLowerCase().includes('algorithmicmedia')
  );
  if (hasIptcAi) {
    addPill({
      label: 'IPTC "AI-generated" label',
      isAi: true,
      category: 'iptc',
    });
  }

  // 3. AI tool traces
  const allText = metadata.tags.map((t) => `${t.key} ${String(t.value)}`).join(' ').toLowerCase();

  if (
    allText.includes('gemini') ||
    allText.includes('imagen') ||
    allText.includes('pki.goog') ||
    allText.includes('deepmind') ||
    (allText.includes('google') && metadata.hasAiProvenance) ||
    metadata.aiIndicators?.some(
      (i) =>
        i.value?.toLowerCase().includes('google') ||
        i.value?.toLowerCase().includes('imagen') ||
        i.value?.toLowerCase().includes('gemini')
    )
  ) {
    addPill({
      label: 'AI tool trace: Google (Gemini / Imagen)',
      isAi: true,
      category: 'tool',
    });
  }

  if (allText.includes('midjourney')) {
    addPill({
      label: 'AI tool trace: Midjourney',
      isAi: true,
      category: 'tool',
    });
  }

  if (allText.includes('dall-e') || allText.includes('dall·e') || allText.includes('dalle') || allText.includes('openai')) {
    addPill({
      label: 'AI tool trace: OpenAI (DALL·E)',
      isAi: true,
      category: 'tool',
    });
  }

  if (
    allText.includes('stable diffusion') ||
    allText.includes('stablediffusion') ||
    allText.includes('comfyui') ||
    allText.includes('automatic1111') ||
    allText.includes('steps:')
  ) {
    addPill({
      label: 'AI tool trace: Stable Diffusion / ComfyUI',
      isAi: true,
      category: 'tool',
    });
  }

  if (allText.includes('firefly') || allText.includes('generative fill')) {
    addPill({
      label: 'AI tool trace: Adobe Firefly',
      isAi: true,
      category: 'tool',
    });
  }

  if (allText.includes('flux.1') || allText.includes('flux')) {
    addPill({
      label: 'AI tool trace: Flux.1',
      isAi: true,
      category: 'tool',
    });
  }

  if (allText.includes('copilot') || allText.includes('bing image creator')) {
    addPill({
      label: 'AI tool trace: Microsoft Copilot / Designer',
      isAi: true,
      category: 'tool',
    });
  }

  // Generic AI provenance fallback if none of specific tools matched
  if (metadata.hasAiProvenance && pills.filter((p) => p.isAi).length === 0) {
    addPill({
      label: 'Generative AI metadata markers',
      isAi: true,
      category: 'tool',
    });
  }

  // 4. Standard EXIF / Camera metadata
  if (metadata.hasExif) {
    const count = metadata.rawSummary.exifTagCount;
    addPill({
      label: count > 0 ? `EXIF Camera & Date (${count} tags)` : 'EXIF Camera & Date',
      isAi: false,
      category: 'exif',
    });
  }

  // 5. ICC Color Profile
  if (metadata.hasIcc) {
    addPill({
      label: 'ICC Color Profile',
      isAi: false,
      category: 'icc',
    });
  }

  // 6. IPTC Editorial metadata (if not already covered by AI label)
  if (metadata.hasIptc && !hasIptcAi) {
    addPill({
      label: 'IPTC editorial tags',
      isAi: false,
      category: 'iptc',
    });
  }

  // Fallback if no specific tags found
  if (pills.length === 0) {
    pills.push({
      label: `${metadata.totalTagsCount || 1} metadata items`,
      isAi: false,
      category: 'other',
    });
  }

  return pills;
}

