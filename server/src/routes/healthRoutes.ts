import { Router, Request, Response } from 'express';
import { FishAudioService } from '../services/fishAudioService';
import { ApiHealthResponse } from '../../../shared/src/types';
import { config } from '../config';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const hasKey = Boolean(config.fishApiKey && config.fishApiKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE');
  
  const response: ApiHealthResponse = {
    status: hasKey ? 'ok' : 'degraded',
    fishAudioConnected: hasKey,
    message: hasKey 
      ? 'Server operational. Fish Audio API key is present.' 
      : 'Server operational. FISH_API_KEY missing from backend .env file.',
    model: config.defaultModel
  };

  res.json(response);
});

router.post('/health/test-connection', async (req: Request, res: Response) => {
  try {
    const result = await FishAudioService.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Connection test failed',
      model: config.defaultModel
    });
  }
});

export default router;
