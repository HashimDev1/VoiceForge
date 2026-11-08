import exifr from 'exifr';
import { detectFormatFromBuffer, detectFormatFromMimeOrName } from './formatDetector';
import { detectC2paManifest } from './c2paDetector';
import { checkIsAiTag } from './aiTagMatcher';
import { ImageMetadataSummary, TagDetail, AiIndicator } from './types';

function flattenObject(
  obj: any,
  prefix = '',
  result: Array<{ key: string; value: any }> = []
): Array<{ key: string; value: any }> {
  if (!obj || typeof obj !== 'object') {
    if (prefix) result.push({ key: prefix, value: obj });
    return result;
  }

  if (obj instanceof Uint8Array || (obj.buffer && obj.byteLength !== undefined)) {
    result.push({ key: prefix, value: `[Binary data: ${obj.byteLength} bytes]` });
    return result;
  }

  for (const [k, v] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      flattenObject(v, newKey, result);
    } else if (Array.isArray(v)) {
      if (v.every((item) => typeof item !== 'object')) {
        result.push({ key: newKey, value: v.join(', ') });
      } else {
        flattenObject(v, newKey, result);
      }
    } else {
      result.push({ key: newKey, value: v });
    }
  }

  return result;
}

function scanRawBufferForAiTraces(buffer: Uint8Array): {
  extraTags: Array<{ key: string; value: string; isAi: boolean; reason?: string }>;
  detectedTool?: string;
} {
  const extraTags: Array<{ key: string; value: string; isAi: boolean; reason?: string }> = [];
  let detectedTool: string | undefined;

  try {
    const scanSize = Math.min(buffer.length, 10 * 1024 * 1024);
    const text = new TextDecoder('latin1').decode(buffer.subarray(0, scanSize));
    const textLower = text.toLowerCase();

    // 1. DigitalSourceType
    if (textLower.includes('trainedalgorithmicmedia')) {
      extraTags.push({
        key: 'IPTC.DigitalSourceType',
        value: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
        isAi: true,
        reason: 'IPTC provenance standard for AI-generated images',
      });
    } else if (textLower.includes('compositewithtrainedalgorithmicmedia')) {
      extraTags.push({
        key: 'IPTC.DigitalSourceType',
        value: 'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
        isAi: true,
        reason: 'IPTC provenance standard for AI-composite images',
      });
    }

    // 2. Identify Generator Tool
    if (
      textLower.includes('google llc') ||
      textLower.includes('google c2pa') ||
      textLower.includes('google generative ai') ||
      textLower.includes('google media processing') ||
      textLower.includes('pki.goog') ||
      textLower.includes('imagen') ||
      textLower.includes('gemini') ||
      textLower.includes('deepmind') ||
      textLower.includes('ai.google')
    ) {
      detectedTool = 'Google (Gemini / Imagen)';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'Google (Gemini / Imagen)',
        isAi: true,
        reason: 'Identified Google Generative AI / Imagen provenance headers',
      });
    } else if (
      textLower.includes('openai') ||
      textLower.includes('dall-e') ||
      textLower.includes('dall·e') ||
      textLower.includes('dalle') ||
      textLower.includes('chatgpt')
    ) {
      detectedTool = 'OpenAI (DALL·E)';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'OpenAI (DALL·E)',
        isAi: true,
        reason: 'Identified OpenAI / DALL-E generation provenance',
      });
    } else if (textLower.includes('midjourney')) {
      detectedTool = 'Midjourney';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'Midjourney',
        isAi: true,
        reason: 'Identified Midjourney generation parameters/tool',
      });
    } else if (
      textLower.includes('stable diffusion') ||
      textLower.includes('stablediffusion') ||
      textLower.includes('comfyui') ||
      textLower.includes('automatic1111') ||
      textLower.includes('steps:')
    ) {
      detectedTool = 'Stable Diffusion / ComfyUI';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'Stable Diffusion / ComfyUI',
        isAi: true,
        reason: 'Identified Stable Diffusion workflow / parameters',
      });
    } else if (textLower.includes('firefly') || textLower.includes('adobe generative')) {
      detectedTool = 'Adobe Firefly';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'Adobe Firefly',
        isAi: true,
        reason: 'Identified Adobe Firefly Content Credentials',
      });
    } else if (textLower.includes('flux.1') || textLower.includes('black forest labs')) {
      detectedTool = 'Flux.1';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'Flux.1',
        isAi: true,
        reason: 'Identified Black Forest Labs Flux.1 generation model',
      });
    } else if (textLower.includes('copilot') || textLower.includes('microsoft designer') || textLower.includes('bing image creator')) {
      detectedTool = 'Microsoft Copilot / Designer';
      extraTags.push({
        key: 'AI.ToolTrace',
        value: 'Microsoft Copilot / Designer',
        isAi: true,
        reason: 'Identified Microsoft Copilot / Designer signatures',
      });
    }
  } catch (e) {
    // ignore
  }

  return { extraTags, detectedTool };
}

export async function readImageMetadata(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  fileName = 'image.jpg',
  mimeType = ''
): Promise<ImageMetadataSummary> {
  let uint8: Uint8Array;
  if (fileOrBuffer instanceof Uint8Array) {
    uint8 = fileOrBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    uint8 = new Uint8Array(fileOrBuffer);
  } else {
    const ab = await fileOrBuffer.arrayBuffer();
    uint8 = new Uint8Array(ab);
  }

  const format =
    detectFormatFromBuffer(uint8) !== 'unknown'
      ? detectFormatFromBuffer(uint8)
      : detectFormatFromMimeOrName(fileName, mimeType);

  const tags: TagDetail[] = [];
  const aiIndicators: AiIndicator[] = [];

  // Deep C2PA Inspection
  const c2paCheck = detectC2paManifest(uint8);
  if (c2paCheck.detected) {
    aiIndicators.push({
      tag: 'C2PA Manifest / Content Credentials',
      value: c2paCheck.details || 'Detected',
      source: 'c2pa',
      reason: 'Cryptographic provenance manifest found in image header (APP11/caBX/JUMB)',
    });
    tags.push({
      key: 'C2PA.Manifest',
      value: c2paCheck.details || 'C2PA Provenance Manifest present',
      category: 'C2PA',
      isAi: true,
      aiReason: 'Cryptographic provenance manifest found in image header (APP11/caBX/JUMB)',
    });

    if (c2paCheck.signer) {
      tags.push({
        key: 'C2PA.Signer',
        value: c2paCheck.signer,
        category: 'C2PA',
        isAi: true,
        aiReason: `Signed by AI vendor: ${c2paCheck.signer}`,
      });
    }

    if (c2paCheck.toolName) {
      tags.push({
        key: 'AI.GeneratorTool',
        value: c2paCheck.toolName,
        category: 'C2PA',
        isAi: true,
        aiReason: `Image was generated with: ${c2paCheck.toolName}`,
      });
      aiIndicators.push({
        tag: 'AI Generator Model',
        value: c2paCheck.toolName,
        source: 'c2pa',
        reason: `Image generated by ${c2paCheck.toolName}`,
      });
    }

    if (c2paCheck.hasTrainedAlgorithmicMedia) {
      tags.push({
        key: 'C2PA.DigitalSourceType',
        value: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
        category: 'C2PA',
        isAi: true,
        aiReason: 'IPTC trainedAlgorithmicMedia provenance token found in C2PA assertion',
      });
    }
  }

  // Deep Raw Scan for AI Traces
  const { extraTags, detectedTool } = scanRawBufferForAiTraces(uint8);
  for (const extra of extraTags) {
    if (!tags.some((t) => t.key === extra.key)) {
      tags.push({
        key: extra.key,
        value: extra.value,
        category: extra.key.startsWith('IPTC') ? 'IPTC' : 'Other',
        isAi: extra.isAi,
        aiReason: extra.reason,
      });
      if (extra.isAi) {
        aiIndicators.push({
          tag: extra.key,
          value: extra.value,
          source: 'other',
          reason: extra.reason || 'AI Provenance signature',
        });
      }
    }
  }

  let exifData: any = null;
  let iptcData: any = null;
  let xmpData: any = null;
  let iccData: any = null;
  let jfifData: any = null;

  try {
    const parsed = await exifr.parse(uint8, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: true,
      mergeOutput: false,
    });

    if (parsed) {
      exifData = parsed.ifd0 || parsed.exif || null;
      iptcData = parsed.iptc || null;
      xmpData = parsed.xmp || null;
      iccData = parsed.icc || null;
      jfifData = parsed.jfif || null;
    }
  } catch (err) {
    console.warn('[MetadataReader] exifr.parse non-fatal error:', err);
  }

  // 1. Process EXIF
  if (exifData) {
    const flatExif = flattenObject(exifData);
    for (const item of flatExif) {
      const ai = checkIsAiTag(item.key, item.value, 'exif');
      if (ai.isAi && ai.indicator) aiIndicators.push(ai.indicator);
      tags.push({
        key: `EXIF.${item.key}`,
        value: item.value,
        category: 'EXIF',
        isAi: ai.isAi,
        aiReason: ai.indicator?.reason,
      });
    }
  }

  // 2. Process XMP
  if (xmpData) {
    const flatXmp = flattenObject(xmpData);
    for (const item of flatXmp) {
      const ai = checkIsAiTag(item.key, item.value, 'xmp');
      if (ai.isAi && ai.indicator) aiIndicators.push(ai.indicator);
      tags.push({
        key: `XMP.${item.key}`,
        value: item.value,
        category: 'XMP',
        isAi: ai.isAi,
        aiReason: ai.indicator?.reason,
      });
    }
  }

  // 3. Process IPTC
  if (iptcData) {
    const flatIptc = flattenObject(iptcData);
    for (const item of flatIptc) {
      const ai = checkIsAiTag(item.key, item.value, 'iptc');
      if (ai.isAi && ai.indicator) aiIndicators.push(ai.indicator);
      tags.push({
        key: `IPTC.${item.key}`,
        value: item.value,
        category: 'IPTC',
        isAi: ai.isAi,
        aiReason: ai.indicator?.reason,
      });
    }
  }

  // 4. Process ICC
  if (iccData) {
    tags.push({
      key: 'ICC.ProfileDescription',
      value: iccData.ProfileDescription || iccData.deviceModelDesc || 'Embedded ICC Color Profile',
      category: 'ICC',
      isAi: false,
    });
  }

  // 5. Process JFIF
  if (jfifData) {
    tags.push({
      key: 'JFIF.Version',
      value: `${jfifData.version || '1.1'} (Density: ${jfifData.Xdensity}x${jfifData.Ydensity})`,
      category: 'JFIF',
      isAi: false,
    });
  }

  return {
    format,
    mimeType: mimeType || `image/${format}`,
    hasExif: Boolean(exifData && Object.keys(exifData).length > 0),
    hasXmp: Boolean((xmpData && Object.keys(xmpData).length > 0) || tags.some((t) => t.category === 'XMP')),
    hasIptc: Boolean((iptcData && Object.keys(iptcData).length > 0) || tags.some((t) => t.category === 'IPTC')),
    hasIcc: Boolean(iccData),
    hasC2pa: c2paCheck.detected,
    c2paManifestFound: c2paCheck.detected,
    hasAiProvenance: aiIndicators.length > 0 || Boolean(detectedTool),
    aiIndicators,
    totalTagsCount: tags.length,
    tags,
    rawSummary: {
      exifTagCount: exifData ? Object.keys(exifData).length : 0,
      xmpTagCount: xmpData ? Object.keys(xmpData).length : 0,
      iptcTagCount: iptcData ? Object.keys(iptcData).length : 0,
      iccPresent: Boolean(iccData),
      c2paDetected: c2paCheck.detected,
    },
  };
}
