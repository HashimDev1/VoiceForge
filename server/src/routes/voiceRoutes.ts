import { Router, Request, Response } from 'express';
import { Voice } from '../../../shared/src/types';
import { VoiceStorageService } from '../services/voiceStorageService';
import { logger } from '../utils/logger';

const router = Router();

// Built-in voice configurations with application metadata
const CONFIGURED_VOICES: Voice[] = [
  {
    id: '7f92f8afb8ec43bf81429cc1c9199cb1',
    name: 'Documentary Male (Cinematic)',
    language: 'English',
    style: 'Deep / Cinematic',
    gender: 'Male',
    description: 'Deep, resonant documentary tone suited for mystery, history, and narrative video essays.',
    category: 'Documentary'
  },
  {
    id: 'e4538965824c4786a3411b402868ff18',
    name: 'Storyteller Narrative',
    language: 'English',
    style: 'Engaging / Warm',
    gender: 'Male',
    description: 'Warm and expressive story narration with natural dynamic pacing.',
    category: 'Storytelling'
  },
  {
    id: '3643b177897241289196e19199aa5fb0',
    name: 'True Crime Mystery',
    language: 'English',
    style: 'Suspenseful / Dark',
    gender: 'Male',
    description: 'Low-pitched, tense delivery ideal for true crime investigations and mysterious stories.',
    category: 'Deep'
  },
  {
    id: '9f2a74c4314c46fa9b47e5b565a0dbd2',
    name: 'Tech & Modern News',
    language: 'English',
    style: 'Crisp / Professional',
    gender: 'Female',
    description: 'Clear, modern female voice for tech reviews, news digests, and video tutorials.',
    category: 'News'
  },
  {
    id: 'b1e847c2098d4924a4f89d343461234a',
    name: 'Educational Academic',
    language: 'English',
    style: 'Articulate / Calm',
    gender: 'Female',
    description: 'Calm and articulate speech tailored for educational documentaries and explainer channels.',
    category: 'Educational'
  },
  {
    id: 'd903f8a42b104928a38a7c29bc982001',
    name: 'Motivational Bold',
    language: 'English',
    style: 'Energetic / Powerful',
    gender: 'Male',
    description: 'High energy, persuasive tone designed to inspire action and keep viewer attention.',
    category: 'Motivational'
  },
  {
    id: 'default_s21_free',
    name: 'Fish Audio Default (s2.1-pro-free)',
    language: 'English',
    style: 'Natural / Standard',
    gender: 'Neutral',
    description: 'Standard default voice provided by the Fish Audio s2.1-pro-free model.',
    category: 'Calm'
  }
];

// GET /api/voices - returns both server-saved custom voices and built-in voices
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const customVoices = await VoiceStorageService.getCustomVoices();
    res.json({
      success: true,
      voices: [...customVoices, ...CONFIGURED_VOICES],
      customVoices,
      configuredVoices: CONFIGURED_VOICES
    });
  } catch (error: any) {
    logger.error('Failed to get voices:', error);
    res.json({
      success: true,
      voices: CONFIGURED_VOICES,
      customVoices: [],
      configuredVoices: CONFIGURED_VOICES
    });
  }
});

// GET /api/voices/custom - returns custom voices saved on the server
router.get('/voices/custom', async (req: Request, res: Response) => {
  try {
    const customVoices = await VoiceStorageService.getCustomVoices();
    res.json({
      success: true,
      customVoices
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve custom voices' });
  }
});

// POST /api/voices/custom - save or update a custom reference ID voice on the server
router.post('/voices/custom', async (req: Request, res: Response) => {
  try {
    const { id, name, language, style, gender, description, category } = req.body;
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Voice ID (Fish Audio reference_id) and Voice Name are required.'
      });
    }

    const voice: Voice = {
      id: String(id).trim(),
      name: String(name).trim(),
      language: language || 'English',
      style: style || 'Custom Reference',
      gender: gender || 'Neutral',
      description: description || 'Saved Fish Audio reference ID model.',
      category: category || 'Documentary',
      isCustom: true
    };

    const customVoices = await VoiceStorageService.saveCustomVoice(voice);
    res.json({
      success: true,
      voice,
      customVoices
    });
  } catch (error: any) {
    logger.error('Failed to save custom voice:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save custom voice'
    });
  }
});

// DELETE /api/voices/custom/:id - delete a custom voice from the server
router.delete('/voices/custom/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Voice ID is required.' });
    }

    const customVoices = await VoiceStorageService.deleteCustomVoice(id);
    res.json({
      success: true,
      customVoices
    });
  } catch (error: any) {
    logger.error('Failed to delete custom voice:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete custom voice'
    });
  }
});

export default router;
