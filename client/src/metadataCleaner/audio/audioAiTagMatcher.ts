export interface DetectedAudioAiInfo {
  isAi: boolean;
  toolName: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface AiToolSignature {
  name: string;
  patterns: RegExp[];
  confidence: 'high' | 'medium';
}

const AI_AUDIO_SIGNATURES: AiToolSignature[] = [
  {
    name: 'Suno AI',
    patterns: [
      /\bsuno(\.ai)?\b/i,
      /\bchirp\b/i,
      /\bsuno\s*v[1-4]\b/i,
      /\bgenre:\s*suno\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Udio AI',
    patterns: [
      /\budio(\.com)?\b/i,
      /\budio\s*v[1-2]\b/i,
      /\bprompt:\s*udio\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'ElevenLabs',
    patterns: [
      /\belevenlabs(\.io)?\b/i,
      /\beleven_multilingual\b/i,
      /\bhistory_item_id\b/i,
      /\bvoice_id:\s*[a-zA-Z0-9_-]{10,}\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'OpenAI (TTS-1 / ChatGPT)',
    patterns: [
      /\bopenai\b/i,
      /\btts-1(-hd)?\b/i,
      /\bchatgpt\s*voice\b/i,
      /\bwhisper\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Google Cloud (TTS / Wavenet / Gemini)',
    patterns: [
      /\bgoogle\s*(text-to-speech|tts|cloud\s*tts)\b/i,
      /\bwavenet\b/i,
      /\bjourney\s*voice\b/i,
      /\bgemini\s*voice\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Fish Audio',
    patterns: [
      /\bfish\s*audio\b/i,
      /\bfishaudio\b/i,
      /\bfish-speech\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Murf AI',
    patterns: [
      /\bmurf(\.ai)?\b/i,
      /\bmurf\s*studio\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'PlayHT',
    patterns: [
      /\bplay(\.ht|ht|-ht)\b/i,
      /\bplayht\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Resemble AI',
    patterns: [
      /\bresemble(\.ai)?\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Speechify',
    patterns: [
      /\bspeechify\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'Amazon Polly',
    patterns: [
      /\bamazon\s*polly\b/i,
      /\baws\s*polly\b/i,
      /\bpolly\s*neural\b/i,
    ],
    confidence: 'high',
  },
  {
    name: 'RVC / Voice Conversion',
    patterns: [
      /\bretrieval-based-voice-conversion\b/i,
      /\brvc(-v[12])?\b/i,
      /\bvoice\s*clone\b/i,
    ],
    confidence: 'medium',
  },
  {
    name: 'AI Generated Provenance',
    patterns: [
      /digitalsourcetype/i,
      /trainedalgorithmicmedia/i,
      /compositewithtrainedalgorithmicmedia/i,
      /syntheticmedia/i,
      /ai-generated/i,
      /generated\s*by\s*ai/i,
    ],
    confidence: 'high',
  },
];

export function inspectAudioTagForAi(
  tagKey: string,
  tagValue: any
): { isAi: boolean; toolName: string | null; reason?: string } {
  const strVal = typeof tagValue === 'string' ? tagValue : JSON.stringify(tagValue);
  const combined = `${tagKey} ${strVal}`;

  // Check against known AI tools
  for (const sig of AI_AUDIO_SIGNATURES) {
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

  // Common AI fields check
  const lk = tagKey.toLowerCase();
  if (
    lk.includes('comment') ||
    lk.includes('encoder') ||
    lk.includes('tool') ||
    lk.includes('software') ||
    lk.includes('artist') ||
    lk.includes('composer')
  ) {
    if (/\b(prompt|lyrics|seed|cfg|model|synthesizer|ai\s*voice)\b/i.test(strVal)) {
      return {
        isAi: true,
        toolName: 'AI Voice Model',
        reason: `AI generation parameter found in [${tagKey}]`,
      };
    }
  }

  return { isAi: false, toolName: null };
}

export function detectAudioAiProvenance(
  tags: Array<{ key: string; value: any; category?: string }>
): DetectedAudioAiInfo {
  const reasons: string[] = [];
  let detectedTool: string | null = null;
  let highestConfidence: 'high' | 'medium' | 'low' = 'low';

  for (const t of tags) {
    const res = inspectAudioTagForAi(t.key, t.value);
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

