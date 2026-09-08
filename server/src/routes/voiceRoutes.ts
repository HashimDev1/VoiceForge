import { Router, Request, Response } from 'express';
import { Voice } from '../../../shared/src/types';

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

router.get('/voices', (req: Request, res: Response) => {
  res.json({
    success: true,
    voices: CONFIGURED_VOICES
  });
});

export default router;
