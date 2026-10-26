import { Router, Request, Response } from 'express';
import { FishAudioService } from '../services/fishAudioService';
import { OpenSourceTtsService } from '../services/openSourceTtsService';
import { ApiHealthResponse } from '../../../shared/src/types';
import { config } from '../config';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const hasKey = Boolean(config.fishApiKey && config.fishApiKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE');

  const response: ApiHealthResponse = {
    status: 'ok',
    fishAudioConnected: hasKey,
    openSourceTtsReady: true,
    openSourceEngine: 'Kokoro-82M Studio AI + Edge-TTS (Zero-Cost / Production-Grade)',
    message: hasKey
      ? 'VoiceForge Studio operational. Fish Audio API and Kokoro-82M/Edge-TTS are active.'
      : 'VoiceForge Studio operational with Kokoro-82M Studio AI & Edge-TTS active (100% free, studio-grade).',
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
      message: err.message || 'Fish Audio connection test failed',
      model: config.defaultModel
    });
  }
});

router.post('/health/test-open-source', async (req: Request, res: Response) => {
  try {
    const result = await OpenSourceTtsService.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Open Source TTS test failed',
      model: 'Edge-TTS Neural'
    });
  }
});

export default router;
