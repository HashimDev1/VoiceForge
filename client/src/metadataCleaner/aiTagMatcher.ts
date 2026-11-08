import { AiIndicator } from './types';

const AI_KEYWORDS = [
  'midjourney',
  'dall-e',
  'dall·e',
  'dalle',
  'openai',
  'chatgpt',
  'stable diffusion',
  'stablediffusion',
  'stability.ai',
  'stability ai',
  'automatic1111',
  'a1111',
  'comfyui',
  'invokeai',
  'novelai',
  'diffusers',
  'sdxl',
  'flux.1',
  'flux',
  'firefly',
  'adobe firefly',
  'generative fill',
  'generative remove',
  'gemini',
  'imagen',
  'google ai',
  'bing image creator',
  'copilot',
  'microsoft designer',
  'leonardo.ai',
  'ideogram',
  'playground ai',
  'nightcafe',
  'krea',
  'magnific',
  'runway',
  'luma',
  'c2pa',
  'trainedalgorithmicmedia',
  'compositewithtrainedalgorithmicmedia',
  'algorithmicmedia',
];

const AI_PROVENANCE_TERMS = [
  'trainedalgorithmicmedia',
  'compositewithtrainedalgorithmicmedia',
  'algorithmicmedia',
  'virtualrecording',
  'datadrivenmedia',
];

export function checkIsAiTag(
  key: string,
  value: any,
  source: 'xmp' | 'exif' | 'iptc' | 'c2pa' | 'comment' | 'other' = 'other'
): { isAi: boolean; indicator?: AiIndicator } {
  const keyLower = key.toLowerCase();
  const valStr = typeof value === 'string' ? value : JSON.stringify(value);
  const valLower = valStr.toLowerCase();

  // 1. DigitalSourceType IPTC / XMP check
  if (
    keyLower.includes('digitalsourcetype') ||
    keyLower.includes('sourcetype') ||
    keyLower.includes('provenance')
  ) {
    for (const term of AI_PROVENANCE_TERMS) {
      if (valLower.includes(term)) {
        return {
          isAi: true,
          indicator: {
            tag: key,
            value: valStr,
            source,
            reason: `Matches IPTC/C2PA AI provenance standard: "${term}" (used by Meta/FB/IG for "Made with AI" badge)`,
          },
        };
      }
    }
  }

  // 2. Direct AI term detection
  for (const term of AI_PROVENANCE_TERMS) {
    if (valLower.includes(term)) {
      return {
        isAi: true,
        indicator: {
          tag: key,
          value: valStr,
          source,
          reason: `AI Provenance token detected: "${term}"`,
        },
      };
    }
  }

  // 3. Known AI tool / generator detection
  const suspiciousKey =
    keyLower.includes('software') ||
    keyLower.includes('creatortool') ||
    keyLower.includes('artist') ||
    keyLower.includes('description') ||
    keyLower.includes('usercomment') ||
    keyLower.includes('xpcomment') ||
    keyLower.includes('parameters') ||
    keyLower.includes('prompt') ||
    keyLower.includes('workflow') ||
    keyLower.includes('credit') ||
    keyLower.includes('source') ||
    keyLower.includes('make') ||
    keyLower.includes('model') ||
    keyLower.includes('c2pa');

  for (const kw of AI_KEYWORDS) {
    if (valLower.includes(kw) || (suspiciousKey && keyLower.includes(kw))) {
      return {
        isAi: true,
        indicator: {
          tag: key,
          value: valStr,
          source,
          reason: `Contains reference to AI generator or model: "${kw}"`,
        },
      };
    }
  }

  // 4. Stable Diffusion / ComfyUI parameters
  if (
    valLower.includes('steps:') &&
    (valLower.includes('sampler:') || valLower.includes('cfg scale:'))
  ) {
    return {
      isAi: true,
      indicator: {
        tag: key,
        value: valStr.length > 120 ? valStr.substring(0, 120) + '...' : valStr,
        source,
        reason: 'Matches Stable Diffusion generation parameters pattern (Steps, Sampler, CFG scale)',
      },
    };
  }

  return { isAi: false };
}

