import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Voice } from '../../../shared/src/types';
import { VoiceStorageService } from '../services/voiceStorageService';
import { FishAudioService } from '../services/fishAudioService';
import { ProjectService } from '../services/projectService';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max audio
});

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

// GET /api/voices/remote - search & browse Fish Audio community/official models
router.get('/voices/remote', async (req: Request, res: Response) => {
  try {
    const { title, tag, language, self, page_number, page_size, sort_by } = req.query;

    const data = await FishAudioService.listRemoteModels({
      title: title ? String(title) : undefined,
      tag: tag ? String(tag) : undefined,
      language: language ? String(language) : undefined,
      self: self !== undefined ? String(self) === 'true' : undefined,
      page_number: page_number ? parseInt(String(page_number), 10) : 1,
      page_size: page_size ? parseInt(String(page_size), 10) : 24,
      sort_by: (sort_by as any) || 'score'
    });

    res.json({
      success: true,
      ...data
    });
  } catch (error: any) {
    logger.error('Failed to list remote models:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list remote Fish Audio models'
    });
  }
});

// POST /api/voices/clone - Instant Zero-Shot Voice Cloning via audio upload
router.post('/voices/clone', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required for voice cloning (10-30 seconds recommended).'
      });
    }

    const { title, description, text, tags, category, language, gender, style } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Voice title is required.'
      });
    }

    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch {
        parsedTags = String(tags).split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // Call Fish Audio API to create fast model
    const createdModel = await FishAudioService.createVoiceModel(
      req.file.buffer,
      req.file.originalname,
      {
        title: title.trim(),
        description: description ? description.trim() : undefined,
        text: text ? text.trim() : undefined,
        tags: parsedTags,
        visibility: 'private'
      }
    );

    // Register into local custom voices so user can immediately use it
    const newVoice: Voice = {
      id: createdModel._id,
      name: createdModel.title || title.trim(),
      language: language || (createdModel.languages && createdModel.languages[0]) || 'English',
      style: style || 'Cloned Voice',
      gender: (gender as any) || 'Neutral',
      description: description || `Cloned voice model created on ${new Date().toLocaleDateString()}`,
      category: (category as any) || 'Documentary',
      isCustom: true
    };

    const customVoices = await VoiceStorageService.saveCustomVoice(newVoice);

    res.json({
      success: true,
      voice: newVoice,
      model: createdModel,
      customVoices
    });
  } catch (error: any) {
    logger.error('Voice clone failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clone voice with Fish Audio API.'
    });
  }
});

// POST /api/voices/design - AI Prompt-Based Voice Design
router.post('/voices/design', async (req: Request, res: Response) => {
  try {
    const { instruction, reference_text, language, n = 2, speed = 1.0 } = req.body;

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Instruction prompt is required (e.g. "Elderly British narrator with a warm raspy tone").'
      });
    }

    const result = await FishAudioService.designVoice({
      instruction: instruction.trim(),
      reference_text: reference_text ? reference_text.trim() : undefined,
      language: language ? language.trim() : undefined,
      n: Math.min(Math.max(Number(n) || 2, 1), 4),
      speed: Number(speed) || 1.0
    });

    // Convert candidate audio base64 into locally accessible URLs for frontend preview
    const processedCandidates = await Promise.all(
      result.candidates.map(async (cand: any, idx: number) => {
        let audioUrl = '';
        if (cand.audio_base64) {
          const buffer = Buffer.from(cand.audio_base64, 'base64');
          const saved = await ProjectService.saveAudioFile(buffer, `design_cand_${idx}`);
          audioUrl = saved.fileUrl;
        }
        return {
          id: cand.id,
          index: cand.index,
          sampleIndex: idx,
          audioUrl,
          text: cand.text || reference_text || instruction,
          durationMs: cand.duration_ms,
          sampleRate: cand.sample_rate
        };
      })
    );

    res.json({
      success: true,
      instruction: result.instruction,
      candidates: processedCandidates
    });
  } catch (error: any) {
    logger.error('Voice design failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate voice design candidates.'
    });
  }
});

export default router;

