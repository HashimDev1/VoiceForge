export interface C2paDetectionResult {
  detected: boolean;
  type?: 'jpeg_app11' | 'png_cabx' | 'webp_jumb' | 'xmp_c2pa' | 'raw_signature';
  signer?: string;
  toolName?: string;
  hasTrainedAlgorithmicMedia?: boolean;
  details?: string;
}

/**
 * Deep inspection of C2PA / JUMBF manifests to detect presence AND extract the AI generator identity
 * (Google Gemini/Imagen, OpenAI DALL-E, Adobe Firefly, Midjourney, Stable Diffusion, etc.)
 */
export function detectC2paManifest(buffer: Uint8Array): C2paDetectionResult {
  // Scan full header / container up to 10MB
  const scanLimit = Math.min(buffer.length, 10 * 1024 * 1024);
  const rawText = new TextDecoder('latin1').decode(buffer.subarray(0, scanLimit));
  const textLower = rawText.toLowerCase();

  const c2paFound =
    textLower.includes('c2pa') ||
    textLower.includes('jumb') ||
    textLower.includes('urn:c2pa') ||
    textLower.includes('c2pa.manifest') ||
    textLower.includes('contentcredentials.org') ||
    textLower.includes('content credentials');

  if (!c2paFound) {
    return { detected: false };
  }

  // Detect which AI provider / signer created the C2PA manifest
  let toolName: string | undefined;
  let signer: string | undefined;

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
    toolName = 'Google (Gemini / Imagen)';
    signer = 'Google LLC (Google C2PA Media Services)';
  } else if (
    textLower.includes('openai') ||
    textLower.includes('dall-e') ||
    textLower.includes('dall·e') ||
    textLower.includes('dalle') ||
    textLower.includes('chatgpt')
  ) {
    toolName = 'OpenAI (DALL·E)';
    signer = 'OpenAI';
  } else if (
    textLower.includes('adobe firefly') ||
    textLower.includes('adobe systems') ||
    textLower.includes('firefly') ||
    textLower.includes('photoshop generative fill')
  ) {
    toolName = 'Adobe Firefly';
    signer = 'Adobe Inc.';
  } else if (
    textLower.includes('microsoft corporation') ||
    textLower.includes('bing image creator') ||
    textLower.includes('microsoft designer') ||
    textLower.includes('copilot')
  ) {
    toolName = 'Microsoft Copilot / Designer';
    signer = 'Microsoft Corporation';
  } else if (
    textLower.includes('meta platforms') ||
    textLower.includes('imagine with meta ai') ||
    textLower.includes('meta ai')
  ) {
    toolName = 'Meta AI';
    signer = 'Meta Platforms, Inc.';
  } else if (textLower.includes('midjourney')) {
    toolName = 'Midjourney';
  } else if (
    textLower.includes('stable diffusion') ||
    textLower.includes('stablediffusion') ||
    textLower.includes('stability ai') ||
    textLower.includes('comfyui')
  ) {
    toolName = 'Stable Diffusion / ComfyUI';
  } else if (textLower.includes('flux.1') || textLower.includes('black forest labs')) {
    toolName = 'Flux.1';
  }

  const hasTrainedAlgorithmicMedia =
    textLower.includes('trainedalgorithmicmedia') ||
    textLower.includes('compositewithtrainedalgorithmicmedia');

  return {
    detected: true,
    type: 'jpeg_app11',
    signer,
    toolName,
    hasTrainedAlgorithmicMedia,
    details: toolName
      ? `C2PA Content Credentials created by ${toolName}`
      : 'C2PA Content Credentials Manifest present',
  };
}
