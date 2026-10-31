import { CaptionPresetId, CAPTION_PRESETS } from './captionPresets';
import { TranscriptionSegment } from './types';

export interface CaptionAnalysisResult {
  recommendedPreset: CaptionPresetId;
  recommendedPresetName: string;
  confidence: number; // 0.0 - 1.0
  tone: string;
  pacingWpm: number;
  recommendedWordsPerCaption: number;
  rationale: string;
  keyPhrases: string[];
  secondaryRecommendations: Array<{
    id: CaptionPresetId;
    name: string;
    score: number;
    reason: string;
  }>;
  suggestedHighlightColor?: string;
  isRtl?: boolean;
}

const HISTORICAL_WORDS = new Set([
  'history', 'historical', 'ancient', 'century', 'centuries', 'empire', 'empires',
  'king', 'queen', 'dynasty', 'pharaoh', 'war', 'battle', 'civilization', 'archaeological',
  'monument', 'ruins', 'timeline', 'archives', 'conquest', 'reign', 'pyramids',
  'relic', 'tales', 'legend', 'chronicle', 'antiquity', 'medieval', 'gladiator',
  'تاریخ', 'قدیم', 'سلطنت', 'بادشاہ', 'تہذیب', 'نوادرات', 'آثار'
]);

const MYSTERY_WORDS = new Set([
  'mystery', 'mysterious', 'secret', 'classified', 'dossier', 'investigation',
  'crime', 'killer', 'suspect', 'evidence', 'unsolved', 'whisper', 'shadow',
  'shadows', 'darkness', 'conspiracy', 'clue', 'haunted', 'stranger', 'disappeared',
  'راز', 'خفیہ', 'تفتیش', 'ثبوت', 'پراسرار'
]);

const VIRAL_GAMING_WORDS = new Set([
  'insane', 'crazy', 'omg', 'epic', 'huge', 'unbelievable', 'win', 'winner',
  'fail', 'clutch', 'boss', 'level', 'gameplay', 'hack', 'secret', 'viral',
  'subscribe', 'follow', 'smash', 'drop', 'reaction', 'hype', 'boom', 'lets go',
  'goal', 'penalty', 'missed', 'scores', 'knockout', 'tiktok', 'reels', 'views'
]);

const EDUCATIONAL_WORDS = new Set([
  'learn', 'lesson', 'concept', 'understand', 'step', 'steps', 'formula',
  'tutorial', 'guide', 'definition', 'science', 'scientific', 'method',
  'example', 'analysis', 'research', 'experiment', 'principle', 'fundamental',
  'process', 'how to', 'summary', 'technique', 'study',
  'سبق', 'سائنس', 'اصول', 'تحقیق', 'سمجھیں'
]);

const PODCAST_WORDS = new Set([
  'podcast', 'interview', 'episode', 'guest', 'honestly', 'i think', 'you know',
  'welcome back', 'conversation', 'talk', 'perspective', 'thoughts', 'discuss',
  'discussion', 'agree', 'disagree', 'host', 'chat', 'audience'
]);

const POETIC_WORDS = new Set([
  'love', 'heart', 'soul', 'forever', 'tears', 'remember', 'lonely', 'beauty',
  'ishq', 'muhabbat', 'dil', 'yaad', 'shayari', 'dard', 'zindagi', 'khwab',
  'aankhein', 'chaand', 'rooh', 'tanhai', 'tasveer', 'wafa',
  'محبت', 'عشق', 'دل', 'یاد', 'یادوں', 'شاعری', 'درد', 'زندگی', 'خواب', 'تنہائی', 'وفا', 'داستان', 'داستانِ'
]);

export class AiCaptionStyler {
  /** Analyze transcription segments or raw text to generate an intelligent styling recommendation */
  public static analyze(
    segments: TranscriptionSegment[],
    totalDurationSeconds?: number,
    detectedLanguage?: string
  ): CaptionAnalysisResult {
    // 1. Gather all text and timing
    const fullText = segments.map((s) => s.text || '').join(' ').trim();
    const words = fullText
      .split(/\s+/)
      .map((w) => w.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”]/g, '').trim())
      .filter(Boolean);

    const duration =
      totalDurationSeconds && totalDurationSeconds > 0
        ? totalDurationSeconds
        : segments.reduce((max, s) => Math.max(max, s.end || 0), 0) || Math.max(1, words.length * 0.4);

    const wpm = Math.round((words.length / Math.max(1, duration)) * 60);

    // 2. Check for RTL Urdu / Arabic characters
    const hasUrduArabic = /[\u0600-\u06FF]/.test(fullText);

    // 3. Score categories based on dictionary match & linguistic cadence
    let historicalScore = 0;
    let mysteryScore = 0;
    let viralScore = 0;
    let educationalScore = 0;
    let podcastScore = 0;
    let poeticScore = 0;

    const lowerWords = words.map((w) => w.toLowerCase());
    const matchedKeywords: string[] = [];

    for (const word of lowerWords) {
      if (HISTORICAL_WORDS.has(word)) {
        historicalScore += 2.5;
        matchedKeywords.push(word.toUpperCase());
      }
      if (MYSTERY_WORDS.has(word)) {
        mysteryScore += 2.5;
        matchedKeywords.push(word.toUpperCase());
      }
      if (VIRAL_GAMING_WORDS.has(word)) {
        viralScore += 2.0;
        matchedKeywords.push(word.toUpperCase());
      }
      if (EDUCATIONAL_WORDS.has(word)) {
        educationalScore += 2.0;
        matchedKeywords.push(word.toUpperCase());
      }
      if (PODCAST_WORDS.has(word)) {
        podcastScore += 2.0;
        matchedKeywords.push(word.toUpperCase());
      }
      if (POETIC_WORDS.has(word)) {
        poeticScore += 3.0;
        matchedKeywords.push(word.toUpperCase());
      }
    }

    // Pacing adjustments
    if (wpm > 165) {
      viralScore += 3.5;
    } else if (wpm < 130 && wpm > 60) {
      historicalScore += 1.5;
      educationalScore += 1.2;
    }

    // Exclamation / excitement factor
    const exclamationCount = (fullText.match(/!/g) || []).length;
    if (exclamationCount >= 2) {
      viralScore += Math.min(5, exclamationCount * 1.5);
    }

    // Urdu / Arabic priority
    if (hasUrduArabic || detectedLanguage === 'ur' || detectedLanguage === 'ar') {
      const isPoetic = poeticScore > 1.5;
      const rec = isPoetic ? 'urdu_nastaliq' : 'urdu_modern';
      return {
        recommendedPreset: rec,
        recommendedPresetName: rec === 'urdu_nastaliq' ? 'Urdu Nastaliq' : 'Urdu Modern',
        confidence: 0.95,
        tone: isPoetic ? 'Poetic Narrative (Urdu Nastaliq)' : 'Modern Urdu Media',
        pacingWpm: wpm,
        recommendedWordsPerCaption: 3,
        rationale: isPoetic
          ? 'Detected Urdu poetic expression and flowing cadence. Recommended traditional Nastaliq calligraphy.'
          : 'Detected Urdu speech. Recommended high-legibility modern Urdu sans with RTL alignment.',
        keyPhrases: Array.from(new Set(matchedKeywords)).slice(0, 5),
        secondaryRecommendations: [
          { id: 'urdu_naskh', name: 'Urdu Naskh', score: 0.88, reason: 'Classic Naskh script for everyday subtitles.' },
          { id: 'roman_urdu_viral', name: 'Roman Urdu Viral', score: 0.82, reason: 'High-energy Roman Urdu alternative.' }
        ],
        isRtl: true
      };
    }

    // Roman Urdu / Hindi Detection
    const hasDesiRoman = lowerWords.some((w) =>
      ['kya', 'hai', 'bhai', 'yaar', 'nahi', 'karna', 'karo', 'dekho', 'mera', 'meri', 'aaj', 'video', 'dosto'].includes(w)
    );
    if (hasDesiRoman || detectedLanguage === 'ur_roman' || detectedLanguage === 'hi_roman') {
      const isHype = viralScore > 2 || wpm > 150;
      const rec = isHype ? 'roman_urdu_viral' : 'roman_hindi_bold';
      return {
        recommendedPreset: rec,
        recommendedPresetName: rec === 'roman_urdu_viral' ? 'Roman Urdu Viral' : 'Roman Hindi Bold',
        confidence: 0.92,
        tone: isHype ? 'High-Energy Roman Desi' : 'Bold Hindi / Hinglish',
        pacingWpm: wpm,
        recommendedWordsPerCaption: isHype ? 2 : 3,
        rationale: 'Detected Roman Urdu / Hindi speech cadence. Tuned for punchy social media retention.',
        keyPhrases: Array.from(new Set(matchedKeywords)).slice(0, 5),
        secondaryRecommendations: [
          { id: 'roman_desi_hype', name: 'Desi Street Hype', score: 0.89, reason: 'Heavy Montserrat display with ambient glow.' },
          { id: 'roman_shayari', name: 'Roman Shayari', score: 0.84, reason: 'Refined serif for emotional storytelling.' }
        ],
        isRtl: false
      };
    }

    // Determine category winner for English / Global speech
    const categories = [
      { id: 'historical', score: historicalScore },
      { id: 'mystery', score: mysteryScore },
      { id: 'viral', score: viralScore },
      { id: 'educational', score: educationalScore },
      { id: 'podcast', score: podcastScore },
      { id: 'poetic', score: poeticScore }
    ].sort((a, b) => b.score - a.score);

    const winner = categories[0].score > 0 ? categories[0].id : (wpm > 150 ? 'viral' : 'documentary');

    let recommendedPreset: CaptionPresetId = 'doc_white';
    let tone = 'Cinematic Documentary';
    let rationale = 'Clean, authoritative presentation with measured pacing.';
    let recommendedWords = 3;
    let secondary: Array<{ id: CaptionPresetId; name: string; score: number; reason: string }> = [];

    switch (winner) {
      case 'historical':
        recommendedPreset = 'historical_gold';
        tone = 'Historical & Cultural Narrative';
        rationale = `Detected historical markers and measured storytelling rhythm (${wpm} WPM). Gold headlines add sovereign cinematic grandeur.`;
        recommendedWords = 3;
        secondary = [
          { id: 'ancient_gold', name: 'Ancient Gold', score: 0.91, reason: 'Regal golden typography for monuments & relics.' },
          { id: 'doc_white', name: 'Documentary White', score: 0.88, reason: 'Neutral crisp cinematic alternative.' }
        ];
        break;

      case 'mystery':
        recommendedPreset = 'investigation';
        tone = 'True Crime & Mystery Dossier';
        rationale = `Detected suspenseful and investigative vocabulary. Classified dossier styling with alert-red emphasis.`;
        recommendedWords = 3;
        secondary = [
          { id: 'mystery_dark', name: 'Mystery Dark', score: 0.92, reason: 'Atmospheric noir with spectral ice-blue highlights.' },
          { id: 'dramatic_shadow', name: 'Dramatic Shadow', score: 0.87, reason: 'Bold architectural drop shadows.' }
        ];
        break;

      case 'viral':
        recommendedPreset = 'bold_viral';
        tone = 'High-Retention Short-Form';
        rationale = `Fast-paced delivery (${wpm} WPM) with high excitement markers. Built for TikTok, Reels, and Shorts algorithm retention.`;
        recommendedWords = 2; // Punchy 2 words per caption
        secondary = [
          { id: 'dynamic_pop', name: 'Dynamic Pop', score: 0.92, reason: 'Electric cyan acceleration.' },
          { id: 'reaction_captions', name: 'Reaction Captions', score: 0.88, reason: 'Energetic bounce and hot magenta punch.' }
        ];
        break;

      case 'educational':
        recommendedPreset = 'clean_learning';
        tone = 'Educational & Explainer';
        rationale = `Structured informative language detected. High-legibility pill backdrop and clear focal yellow highlights.`;
        recommendedWords = 4;
        secondary = [
          { id: 'keyword_focus', name: 'Keyword Focus', score: 0.90, reason: 'Spotlight styling for crucial terminology.' },
          { id: 'prof_presentation', name: 'Professional Presentation', score: 0.86, reason: 'Executive corporate styling.' }
        ];
        break;

      case 'podcast':
        recommendedPreset = 'podcast_punch';
        tone = 'Conversational & Interview';
        rationale = `Conversational pacing (${wpm} WPM) and dialogue markers. Frosted glass badge keeps subtitles clean against studio lighting.`;
        recommendedWords = 3;
        secondary = [
          { id: 'creator_highlight', name: 'Creator Highlight', score: 0.90, reason: 'Warm lavender and sun-yellow scaling.' },
          { id: 'minimal_creator', name: 'Minimal Creator', score: 0.87, reason: 'Pastel mint aesthetic.' }
        ];
        break;

      case 'poetic':
        recommendedPreset = 'cinematic_serif';
        tone = 'Poetic & Emotional Cinema';
        rationale = `Heartfelt poetic themes and contemplative rhythm. Refined serif italic styling evokes timeless emotion.`;
        recommendedWords = 3;
        secondary = [
          { id: 'luxury_editorial', name: 'Luxury Editorial', score: 0.91, reason: 'High-fashion champagne typography.' },
          { id: 'historical_gold', name: 'Historical Gold', score: 0.87, reason: 'Majestic golden narrative look.' }
        ];
        break;

      default:
        recommendedPreset = 'doc_white';
        tone = 'Universal Cinematic';
        rationale = 'Balanced universal subtitle typography suitable for all visual content.';
        recommendedWords = 3;
        secondary = [
          { id: 'netflix_doc', name: 'Netflix Doc Inspired', score: 0.91, reason: 'Iconic crimson punch.' },
          { id: 'modern_sans', name: 'Modern Sans', score: 0.88, reason: 'Clean grotesque sans styling.' }
        ];
    }

    const matchedDef = CAPTION_PRESETS.find((p) => p.id === recommendedPreset) || CAPTION_PRESETS[0];

    // Extract significant emphasis words if none were matched
    if (matchedKeywords.length === 0) {
      const candidates = words
        .filter((w) => w.length >= 6)
        .slice(0, 4)
        .map((w) => w.toUpperCase());
      matchedKeywords.push(...candidates);
    }

    return {
      recommendedPreset,
      recommendedPresetName: matchedDef.name,
      confidence: 0.91,
      tone,
      pacingWpm: wpm,
      recommendedWordsPerCaption: recommendedWords,
      rationale,
      keyPhrases: Array.from(new Set(matchedKeywords)).slice(0, 6),
      secondaryRecommendations: secondary,
      isRtl: false
    };
  }
}
