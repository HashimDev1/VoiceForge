import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or server folder
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export type AsrProviderId = 'local' | 'groq' | 'openai' | 'fish_audio';

const VALID_ASR_PROVIDERS: ReadonlySet<string> = new Set([
  'local',
  'groq',
  'openai',
  'fish_audio'
]);

export function resolveAsrProviderPriority(rawPriority?: string, nodeEnv?: string): AsrProviderId[] {
  const envVal = (rawPriority ?? process.env.ASR_PROVIDER_PRIORITY ?? '').trim();
  if (envVal) {
    const parsed = envVal
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .map((p) => (p === 'fish' || p === 'fishaudio' ? 'fish_audio' : p))
      .filter((p): p is AsrProviderId => VALID_ASR_PROVIDERS.has(p));
    if (parsed.length > 0) {
      return Array.from(new Set(parsed));
    }
  }

  const effectiveEnv = (nodeEnv ?? process.env.NODE_ENV ?? 'development').toLowerCase();
  if (effectiveEnv === 'production') {
    return ['groq', 'openai', 'fish_audio', 'local'];
  }
  return ['local', 'groq', 'openai', 'fish_audio'];
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  fishApiKey: process.env.FISH_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '',
  asrProviderPriority: resolveAsrProviderPriority(),
  asrRequestTimeoutMs: parseInt(process.env.ASR_REQUEST_TIMEOUT_MS || '90000', 10),
  asrMaxRetries: parseInt(process.env.ASR_MAX_RETRIES || '2', 10),
  asrMaxUploadBytes: parseInt(process.env.ASR_MAX_UPLOAD_BYTES || String(24 * 1024 * 1024), 10),
  asrChunkDurationSec: parseInt(process.env.ASR_CHUNK_DURATION_SEC || '600', 10),
  asrChunkOverlapSec: parseFloat(process.env.ASR_CHUNK_OVERLAP_SEC || '1.5'),
  maxConcurrentTts: parseInt(process.env.MAX_CONCURRENT_TTS || '2', 10),
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(process.cwd(), process.env.STORAGE_DIR)
    : path.resolve(process.cwd(), 'temp_storage'),
  fishApiBaseUrl: 'https://api.fish.audio/v1',
  fishApiRootUrl: 'https://api.fish.audio',
  defaultModel: 's2.1-pro-free'
};
