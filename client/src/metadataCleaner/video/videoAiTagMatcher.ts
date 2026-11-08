export interface DetectedVideoAiInfo {
  isAi: boolean;
  toolName: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface AiVideoSignature {
  name: string;
  patterns: RegExp[];
  confidence: 'high' | 'medium';
}

const AI_VIDEO_SIGNATURES: AiVideoSignature[] = [
  {
    name: 'Runway (Gen-2 / Gen-3 Alpha)',
    patterns: [
      /\brunway(ml)?\b/i,
      /\bgen-?2\b/i,
      /\bgen-?3(\s*alpha)?\b/i,
      /\brunway\s*research\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'OpenAI Sora',
    patterns: [
      /\bsora\b/i,
      /\bopenai\s*sora\b/i,
      /\bsora\s*model\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Luma Dream Machine',
    patterns: [
      /\bluma(\s*labs)?\b/i,
      /\bdream\s*machine\b/i,
      /\bluma\s*ray\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Kling AI',
    patterns: [
      /\bkling(\s*ai)?\b/i,
      /\bklingai\.com\b/i,
      /\bkuaishou\s*video\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Pika Labs',
    patterns: [
      /\bpika(\s*labs)?\b/i,
      /\bpika\.art\b/i,
      /\bpika\s*v?[12]\.[0-9]\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Haiper AI',
    patterns: [
      /\bhaiper(\.ai)?\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Vidu AI',
    patterns: [
      /\bvidu(\.studio)?\b/i,
      /\bshengshu\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Minimax / Hailuo AI',
    patterns: [
      /\bminimax\b/i,
      /\bhailuo(\s*ai)?\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Stable Video Diffusion (SVD)',
    patterns: [
      /\bstable\s*video\s*diffusion\b/i,
      /\bsvd(-xt)?\b/i,
      /\bstability\.ai\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Google Veo / Imagen Video',
    patterns: [
      /\bveo\b/i,
      /\bgoogle\s*veo\b/i,
      /\bimagen\s*video\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'ComfyUI / AnimateDiff',
    patterns: [
      /\banimatediff\b/i,
      /\bcomfyui\b/i,
      /\bprompt:\s*masterpiece\b/i,
    ],
    confidence: 'medium',
  },
  {
    name: 'Synthesia / HeyGen AI',
    patterns: [
      /\bsynthesia\b/i,
      /\bheygen\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'AI Generated Provenance',
    patterns: [
      /digitalsourcetype/i,
      /trainedalgorithmicmedia/i,
      /compositewithtrainedalgorithmicmedia/i,
      /syntheticmedia/i,
      /ai-generated/i,
    ],
    confidence: 'high',
  },
];

export function inspectVideoTagForAi(
  tagKey: string,
  tagValue: any
): { isAi: boolean; toolName: string | null; reason?: string } {
  const strVal = typeof tagValue === 'string' ? tagValue : JSON.stringify(tagValue);
  const combined = `${tagKey} ${strVal}`;

  for (const sig of AI_VIDEO_SIGNATURES) {
    for (const pat of sig.patterns) {
      if (pat.test(combined)) {
        return {
          isAi: true,
          toolName: sig.name,
          reason: `Matched "${sig.name}" in [${tagKey}]`,
        };
      }
    }
  }

  const lk = tagKey.toLowerCase();
  if (
    lk.includes('encoder') ||
    lk.includes('comment') ||
    lk.includes('handler') ||
    lk.includes('software') ||
    lk.includes('title')
  ) {
    if (/\b(prompt|seed|cfg|model|synthesizer|ai\s*video|txt2vid|img2vid)\b/i.test(strVal)) {
      return {
        isAi: true,
        toolName: 'AI Video Model',
        reason: `AI generation parameter found in [${tagKey}]`,
      };
    }
  }

  return { isAi: false, toolName: null };
}

export function detectVideoAiProvenance(
  tags: Array<{ key: string; value: any; category?: string }>
): DetectedVideoAiInfo {
  const reasons: string[] = [];
  let detectedTool: string | null = null;
  let highestConfidence: 'high' | 'medium' | 'low' = 'low';

  for (const t of tags) {
    const res = inspectVideoTagForAi(t.key, t.value);
    if (res.isAi) {
      reasons.push(res.reason || `AI tag detected in ${t.key}`);
      if (!detectedTool && res.toolName) {
        detectedTool = res.toolName;
      }
      highestConfidence = 'high';
    }
  }

  return {
    isAi: reasons.length > 0,
    toolName: detectedTool,
    confidence: highestConfidence,
    reasons,
  };
}

