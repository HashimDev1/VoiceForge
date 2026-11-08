import {
  VideoMetadataSummary,
  VideoTagDetail,
  VideoAiIndicator,
  VideoFormat,
} from './videoTypes';
import {
  detectVideoFormatFromBytes,
  detectVideoFormatFromMimeOrName,
} from './videoFormatDetector';
import {
  inspectVideoTagForAi,
  detectVideoAiProvenance,
} from './videoAiTagMatcher';

function scanVideoBinaryForMetadata(buffer: ArrayBuffer): {
  tags: VideoTagDetail[];
  aiIndicators: VideoAiIndicator[];
  hasC2pa: boolean;
  hasXmp: boolean;
  hasUdta: boolean;
} {
  const bytes = new Uint8Array(buffer);
  const scanLen = Math.min(bytes.length, 2 * 1024 * 1024); // Scan first 2MB for header atoms
  let text = '';
  for (let i = 0; i < scanLen; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      text += String.fromCharCode(b);
    } else {
      text += ' ';
    }
  }

  const tags: VideoTagDetail[] = [];
  const aiIndicators: VideoAiIndicator[] = [];

  const hasC2pa =
    text.includes('c2pa') ||
    text.includes('jumb') ||
    text.includes('c2ma') ||
    text.includes('urn:c2pa') ||
    text.includes('ContentCredentials');

  const hasXmp =
    text.includes('<x:xmpmeta') ||
    text.includes('http://ns.adobe.com/xap/1.0/') ||
    text.includes('DigitalSourceType');

  const hasUdta = text.includes('udta') || text.includes('moov');

  if (hasC2pa) {
    tags.push({
      key: 'C2PA Manifest',
      value: 'Content Credentials manifest embedded in video box',
      category: 'C2PA',
      isAi: true,
      aiReason: 'Cryptographic C2PA provenance manifest found',
    });
    aiIndicators.push({
      tag: 'C2PA',
      value: 'C2PA Manifest',
      source: 'c2pa',
      reason: 'Cryptographic provenance manifest found in video container',
    });
  }

  if (hasXmp) {
    const isAiSource =
      text.includes('trainedAlgorithmicMedia') ||
      text.includes('compositeWithTrainedAlgorithmicMedia');

    tags.push({
      key: 'XMP:DigitalSourceType',
      value: isAiSource
        ? 'trainedAlgorithmicMedia (AI-generated video declaration)'
        : 'Adobe XMP Video Metadata',
      category: 'XMP',
      isAi: isAiSource,
      aiReason: isAiSource ? 'XMP AI digital source type declaration' : undefined,
    });

    if (isAiSource) {
      aiIndicators.push({
        tag: 'DigitalSourceType',
        value: 'trainedAlgorithmicMedia',
        source: 'xmp',
        reason: 'Standard AI generation declaration in XMP',
      });
    }
  }

  // Scan common video metadata strings
  const commonKeys = ['encoder', 'handler_name', 'tool', 'comment', 'title', 'software'];
  for (const k of commonKeys) {
    const regex = new RegExp(`\\b${k}\\s*[:=]\\s*([^\\n\\r]{3,60})`, 'i');
    const match = text.match(regex);
    if (match) {
      const val = match[1].trim();
      const aiCheck = inspectVideoTagForAi(k, val);
      tags.push({
        key: k,
        value: val,
        category: 'Atom (udta)',
        isAi: aiCheck.isAi,
        aiReason: aiCheck.reason,
      });
      if (aiCheck.isAi) {
        aiIndicators.push({
          tag: k,
          value: val,
          source: 'atom',
          reason: aiCheck.reason || 'AI video generator trace',
        });
      }
    }
  }

  // Check known AI signatures in entire text
  const aiCheck = detectVideoAiProvenance(
    tags.concat([{ key: 'video_container_text', value: text, category: 'Other', isAi: false }])
  );
  if (aiCheck.isAi && !aiIndicators.some((i) => i.tag === 'AI Tool')) {
    aiIndicators.push({
      tag: 'AI Tool',
      value: aiCheck.toolName || 'AI Video Generator',
      source: 'other',
      reason: aiCheck.reasons[0] || 'AI signature found in video stream',
    });
  }

  return { tags, aiIndicators, hasC2pa, hasXmp, hasUdta };
}

export async function readVideoMetadata(file: File): Promise<VideoMetadataSummary> {
  const buffer = await file.slice(0, 2 * 1024 * 1024).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let detectedFormat: VideoFormat = detectVideoFormatFromBytes(bytes);
  if (detectedFormat === 'unknown') {
    detectedFormat = detectVideoFormatFromMimeOrName(file.name, file.type);
  }

  let width: number | undefined;
  let height: number | undefined;
  let duration: number | undefined;

  // Extract dimensions and duration using a lightweight video element
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const tempUrl = URL.createObjectURL(file);
    video.src = tempUrl;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        width = video.videoWidth;
        height = video.videoHeight;
        duration = video.duration;
        resolve();
      };
      video.onerror = () => resolve();
      setTimeout(resolve, 1500); // safety timeout
    });

    URL.revokeObjectURL(tempUrl);
  } catch {}

  const scan = scanVideoBinaryForMetadata(buffer);
  const aiCheck = detectVideoAiProvenance(scan.tags);

  return {
    format: detectedFormat,
    mimeType: file.type || `video/${detectedFormat}`,
    width,
    height,
    duration,
    hasC2pa: scan.hasC2pa,
    hasXmp: scan.hasXmp,
    hasUdta: scan.hasUdta,
    hasAiProvenance: scan.aiIndicators.length > 0 || aiCheck.isAi,
    aiToolDetected: aiCheck.toolName,
    aiIndicators: scan.aiIndicators,
    totalTagsCount: scan.tags.length,
    tags: scan.tags,
    rawSummary: {
      atomCount: scan.tags.length,
      c2paDetected: scan.hasC2pa,
      xmpDetected: scan.hasXmp,
    },
  };
}

