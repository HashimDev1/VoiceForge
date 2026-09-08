import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or server folder
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  fishApiKey: process.env.FISH_API_KEY || '',
  maxConcurrentTts: parseInt(process.env.MAX_CONCURRENT_TTS || '2', 10),
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(process.cwd(), process.env.STORAGE_DIR)
    : path.resolve(process.cwd(), 'temp_storage'),
  fishApiBaseUrl: 'https://api.fish.audio/v1',
  defaultModel: 's2.1-pro-free'
};
