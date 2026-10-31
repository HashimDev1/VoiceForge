import { CAPTION_PRESETS, CaptionPresetDefinition, assToHexColor } from './captionPresets';

export interface CaptionPresetPreview {
  id: string;
  name: string;
  desc: string;
  prefix: string;
  highlightWord: string;
  tag: string;
  bg: string;
  color: string;
  highlight: string;
  font: string;
  boxColor?: string;
  boxBackground?: boolean;
  boxOpacity?: number;
  glow?: string;
  animLabel: string;
  animation: string;
  uppercase: boolean;
  rtl?: boolean;
  defaultSize: number;
  letterSpacing?: string;
  fontStyle?: 'normal' | 'italic';
  effect?: string;
}

const PREVIEW_OVERRIDES: Record<string, Partial<CaptionPresetPreview>> = {
  // A. Cinematic
  doc_white: {
    prefix: 'VOICEFORGE',
    highlightWord: 'CINEMA',
    tag: 'CINEMATIC',
    bg: 'radial-gradient(ellipse at center, #1c2128 0%, #0d1117 100%)',
    animLabel: 'Fade'
  },
  historical_gold: {
    prefix: 'EMPIRES OF',
    highlightWord: 'GOLD',
    tag: 'HISTORIC',
    bg: 'radial-gradient(ellipse at center, #261b0d 0%, #0e0a05 100%)',
    animLabel: 'Fade'
  },
  cinematic_serif: {
    prefix: 'THE SILENT',
    highlightWord: 'MEMORY',
    tag: 'DRAMA',
    bg: 'radial-gradient(ellipse at center, #211915 0%, #0d0a08 100%)',
    animLabel: 'Fade'
  },
  minimal_film: {
    prefix: 'SCENE 01 ·',
    highlightWord: 'DISCOVERY',
    tag: '35MM',
    bg: '#111317',
    animLabel: 'Slide'
  },
  dramatic_shadow: {
    prefix: 'UNDERCOVER',
    highlightWord: 'DOSSIER',
    tag: 'IMPACT',
    bg: 'linear-gradient(135deg, #18191c 0%, #090a0c 100%)',
    animLabel: 'Zoom'
  },
  luxury_editorial: {
    prefix: 'HAUTE',
    highlightWord: 'CHRONICLE',
    tag: 'LUXURY',
    bg: 'radial-gradient(ellipse at center, #1b2019 0%, #0b0e0a 100%)',
    animLabel: 'Underline'
  },
  vintage_doc: {
    prefix: 'YEAR 1942 ·',
    highlightWord: 'ARCHIVES',
    tag: 'VINTAGE',
    bg: 'radial-gradient(ellipse at center, #241d14 0%, #0f0c08 100%)',
    animLabel: 'Fade'
  },
  netflix_doc: {
    prefix: 'INSIDE THE',
    highlightWord: 'EVIDENCE',
    tag: 'NETFLIX DOC',
    bg: 'radial-gradient(ellipse at center, #240c0e 0%, #0a0405 100%)',
    animLabel: 'Crimson'
  },

  // B. Viral & Social Media
  bold_viral: {
    prefix: 'DON’T MISS',
    highlightWord: 'THIS!',
    tag: 'TIKTOK',
    bg: 'linear-gradient(135deg, #0e2213 0%, #061108 100%)',
    animLabel: 'Pop'
  },
  dynamic_pop: {
    prefix: 'WATCH THIS',
    highlightWord: 'HAPPEN',
    tag: 'REELS',
    bg: 'linear-gradient(135deg, #082126 0%, #040e11 100%)',
    animLabel: 'Pop'
  },
  creator_highlight: {
    prefix: '3 SECRETS TO',
    highlightWord: 'GROW',
    tag: 'CREATOR',
    bg: 'linear-gradient(135deg, #24162e 0%, #0f0814 100%)',
    animLabel: 'Punch'
  },
  podcast_punch: {
    prefix: 'DEEP',
    highlightWord: 'CONVERSATION',
    tag: 'PODCAST',
    bg: 'linear-gradient(135deg, #241614 0%, #0e0908 100%)',
    animLabel: 'Glass Pill'
  },
  reaction_captions: {
    prefix: 'WAIT FOR THE',
    highlightWord: 'DROP!!',
    tag: 'REACTION',
    bg: 'linear-gradient(135deg, #2a0b22 0%, #0f030c 100%)',
    animLabel: 'Bounce'
  },
  high_contrast: {
    prefix: 'PAY FULL',
    highlightWord: 'ATTENTION',
    tag: 'CONTRAST',
    bg: '#0a0a0a',
    animLabel: 'Contrast'
  },
  fast_emphasis: {
    prefix: 'NEVER STOP',
    highlightWord: 'PUSHING',
    tag: 'FAST CUTS',
    bg: 'linear-gradient(135deg, #091e2b 0%, #030a0f 100%)',
    animLabel: 'Punch'
  },
  minimal_creator: {
    prefix: 'EVERYDAY',
    highlightWord: 'AESTHETIC',
    tag: 'MINIMAL',
    bg: 'linear-gradient(135deg, #101c18 0%, #080e0c 100%)',
    animLabel: 'Glass'
  },

  // C. Typography
  modern_sans: {
    prefix: 'CLEAN',
    highlightWord: 'STUDIO',
    tag: 'MODERN',
    bg: 'linear-gradient(135deg, #12182b 0%, #080b14 100%)',
    animLabel: 'Grotesque'
  },
  elegant_serif: {
    prefix: 'TIMELESS',
    highlightWord: 'ELEGANCE',
    tag: 'SERIF',
    bg: 'radial-gradient(ellipse at center, #241b1e 0%, #0f0a0c 100%)',
    animLabel: 'Rose Gold'
  },
  editorial_magazine: {
    prefix: 'ISSUE 04 ·',
    highlightWord: 'MANIFESTO',
    tag: 'MAGAZINE',
    bg: '#141414',
    animLabel: 'Editorial'
  },
  typewriter_clean: {
    prefix: 'TERMINAL:',
    highlightWord: 'LOG_ACTIVE',
    tag: 'MONO',
    bg: '#0a0d0a',
    animLabel: 'Type'
  },
  condensed_bold: {
    prefix: 'UNSTOPPABLE',
    highlightWord: 'ENERGY',
    tag: 'CONDENSED',
    bg: 'linear-gradient(135deg, #281408 0%, #0f0703 100%)',
    animLabel: 'Pop'
  },
  geometric_minimal: {
    prefix: 'PROTOCOL //',
    highlightWord: '01_SYNC',
    tag: 'CYBER MONO',
    bg: '#081014',
    animLabel: 'Type'
  },
  retro_typography: {
    prefix: 'GOOD',
    highlightWord: 'VIBRATIONS',
    tag: 'RETRO 70S',
    bg: 'linear-gradient(135deg, #2a1a0c 0%, #120b05 100%)',
    animLabel: 'Bounce'
  },
  luxury_typography: {
    prefix: 'MAJESTY &',
    highlightWord: 'HERITAGE',
    tag: 'SOVEREIGN',
    bg: 'radial-gradient(ellipse at center, #1e1e24 0%, #0a0a0d 100%)',
    animLabel: 'Platinum'
  },

  // D. Gaming & Energetic
  neon_pulse: {
    prefix: 'CYBER',
    highlightWord: 'NIGHTS',
    tag: 'NEON GLOW',
    bg: 'radial-gradient(ellipse at center, #1f0b2e 0%, #090210 100%)',
    animLabel: 'Pulse'
  },
  electric_impact: {
    prefix: 'VOLTAGE',
    highlightWord: 'SURGE!',
    tag: 'LIGHTNING',
    bg: 'linear-gradient(135deg, #1c1a06 0%, #080c18 100%)',
    animLabel: 'Impact'
  },
  glitch_typography: {
    prefix: 'SYSTEM',
    highlightWord: 'OVERRIDE',
    tag: 'GLITCH',
    bg: 'linear-gradient(135deg, #14051a 0%, #050108 100%)',
    animLabel: 'Glitch'
  },
  rgb_highlight: {
    prefix: 'RGB',
    highlightWord: 'OVERCLOCK',
    tag: 'GAMING',
    bg: 'radial-gradient(ellipse at center, #1b092a 0%, #080210 100%)',
    animLabel: 'Spectrum'
  },
  gaming_bold: {
    prefix: 'LEVEL UP',
    highlightWord: 'VICTORY!',
    tag: 'ESPORTS',
    bg: 'linear-gradient(135deg, #091a0b 0%, #030c04 100%)',
    animLabel: 'Toxic'
  },
  energy_burst: {
    prefix: 'BURNING',
    highlightWord: 'INFERNO',
    tag: 'BURST',
    bg: 'linear-gradient(135deg, #2b1104 0%, #100601 100%)',
    animLabel: 'Flame'
  },

  // E. Educational
  clean_learning: {
    prefix: 'LESSON 01:',
    highlightWord: 'FOUNDATION',
    tag: 'EDUCATION',
    bg: 'linear-gradient(135deg, #141720 0%, #090b10 100%)',
    animLabel: 'Clarity'
  },
  lecture_notes: {
    prefix: 'KEY CONCEPT:',
    highlightWord: 'SYNAPSE',
    tag: 'ACADEMIC',
    bg: 'linear-gradient(135deg, #0e1728 0%, #060a12 100%)',
    animLabel: 'Slide'
  },
  keyword_focus: {
    prefix: 'REMEMBER THIS',
    highlightWord: 'FORMULA',
    tag: 'FOCUS',
    bg: 'linear-gradient(135deg, #121c24 0%, #080c10 100%)',
    animLabel: 'Badge'
  },
  explainer_pro: {
    prefix: 'HOW IT',
    highlightWord: 'WORKS',
    tag: 'EXPLAINER',
    bg: 'linear-gradient(135deg, #091f1d 0%, #040e0d 100%)',
    animLabel: 'Teal'
  },
  prof_presentation: {
    prefix: 'EXECUTIVE',
    highlightWord: 'SUMMARY',
    tag: 'CORPORATE',
    bg: 'linear-gradient(135deg, #0f172a 0%, #080c17 100%)',
    animLabel: 'Glass'
  },
  minimal_academic: {
    prefix: 'HISTORICAL',
    highlightWord: 'ANALYSIS',
    tag: 'SCHOLARLY',
    bg: '#141416',
    animLabel: 'Serif'
  },

  // F. Documentary & Storytelling
  historical_archive: {
    prefix: 'CHRONICLES OF',
    highlightWord: 'CIVILIZATION',
    tag: 'ARCHIVE',
    bg: 'radial-gradient(ellipse at center, #241c10 0%, #0d0a06 100%)',
    animLabel: 'Bronze'
  },
  ancient_gold: {
    prefix: 'TREASURES OF',
    highlightWord: 'EGYPT',
    tag: 'ANCIENT',
    bg: 'radial-gradient(ellipse at center, #261908 0%, #0d0802 100%)',
    animLabel: 'Gold'
  },
  investigation: {
    prefix: 'CASE FILE #',
    highlightWord: '891-CLASSIFIED',
    tag: 'DOSSIER',
    bg: '#0f0f10',
    animLabel: 'Dossier'
  },
  mystery_dark: {
    prefix: 'THE WHISPER IN',
    highlightWord: 'SHADOWS',
    tag: 'NOIR',
    bg: 'radial-gradient(ellipse at center, #091824 0%, #02070d 100%)',
    animLabel: 'Focus Blur'
  },
  news_documentary: {
    prefix: 'BREAKING',
    highlightWord: 'REPORT',
    tag: 'BROADCAST',
    bg: '#141416',
    animLabel: 'Bulletin'
  },
  dark_cinematic: {
    prefix: 'IN THE DEPTHS OF',
    highlightWord: 'SOLITUDE',
    tag: 'CINEMATIC',
    bg: 'radial-gradient(ellipse at center, #161a22 0%, #090b0e 100%)',
    animLabel: 'Silver'
  },
  epic_storytelling: {
    prefix: 'LEGENDS OF THE',
    highlightWord: 'VALIANT',
    tag: 'EPIC',
    bg: 'radial-gradient(ellipse at center, #261214 0%, #0d0607 100%)',
    animLabel: 'Crimson Gold'
  },
  narrator_focus: {
    prefix: 'AND THEN SHE',
    highlightWord: 'SPOKE',
    tag: 'NARRATIVE',
    bg: 'linear-gradient(135deg, #181920 0%, #0b0c10 100%)',
    animLabel: 'Glass Pill'
  },

  // G. Multilingual & Urdu / Hindi
  urdu_nastaliq: {
    prefix: 'داستانِ',
    highlightWord: 'محبت',
    tag: 'اردو نستعلیق',
    bg: 'radial-gradient(ellipse at center, #1b261f 0%, #0a110d 100%)',
    animLabel: 'نستعلیق',
    rtl: true
  },
  urdu_naskh: {
    prefix: 'اہم خبریں اور',
    highlightWord: 'تجزیہ',
    tag: 'اردو نسخ',
    bg: 'linear-gradient(135deg, #18242c 0%, #091116 100%)',
    animLabel: 'نسخ',
    rtl: true
  },
  urdu_modern: {
    prefix: 'طاقتور اور',
    highlightWord: 'جدید انداز',
    tag: 'جدید اردو',
    bg: 'linear-gradient(135deg, #28152e 0%, #100713 100%)',
    animLabel: 'جدید',
    rtl: true
  },
  roman_urdu_viral: {
    prefix: 'YE VIDEO',
    highlightWord: 'VIRAL HAI!',
    tag: 'ROMAN URDU',
    bg: 'linear-gradient(135deg, #0e2213 0%, #051008 100%)',
    animLabel: 'Neon Mint'
  },
  roman_hindi_bold: {
    prefix: 'AB AAYEGA',
    highlightWord: 'MAZA!',
    tag: 'DESI REELS',
    bg: 'linear-gradient(135deg, #241c09 0%, #0f0b03 100%)',
    animLabel: 'Yellow'
  },
  roman_shayari: {
    prefix: 'Teri Yaad Ka',
    highlightWord: 'Samandar',
    tag: 'SHAYARI',
    bg: 'radial-gradient(ellipse at center, #24191f 0%, #0e090c 100%)',
    animLabel: 'Poetry'
  },
  roman_desi_hype: {
    prefix: 'FULL TO',
    highlightWord: 'DHAMAKA!',
    tag: 'DESI STREET',
    bg: 'linear-gradient(135deg, #280a14 0%, #100307 100%)',
    animLabel: 'Glow'
  },
  roman_chill_vibes: {
    prefix: 'CHILL SHAAM KI',
    highlightWord: 'CHAI',
    tag: 'DESI CHILL',
    bg: 'linear-gradient(135deg, #131d24 0%, #080d11 100%)',
    animLabel: 'Glass'
  },
  roman_bollywood: {
    prefix: 'PICTURE ABHI',
    highlightWord: 'BAAKI HAI!',
    tag: 'BOLLYWOOD',
    bg: 'linear-gradient(135deg, #280a22 0%, #10020d 100%)',
    animLabel: 'Masala'
  },
  // 2026 Ultra-Premium Overrides
  mrbeast_punch: {
    prefix: 'I SPENT',
    highlightWord: '$1,000,000!',
    tag: 'MRBEAST',
    bg: 'radial-gradient(ellipse at center, #241a04 0%, #0d0c07 100%)',
    animLabel: 'Punch'
  },
  hormozi_pill: {
    prefix: 'DO THIS',
    highlightWord: 'EVERY DAY',
    tag: 'HORMOZI',
    bg: 'linear-gradient(135deg, #2b2203 0%, #0d0b03 100%)',
    animLabel: 'Pop'
  },
  ali_abdaal_aesthetic: {
    prefix: 'PRODUCTIVE',
    highlightWord: 'HABIT',
    tag: 'STUDIO',
    bg: 'linear-gradient(135deg, #101c24 0%, #090e13 100%)',
    animLabel: 'Fade'
  },
  cyberpunk_hud: {
    prefix: 'OVERRIDE',
    highlightWord: '[SYSTEM]',
    tag: 'CYBER',
    bg: 'radial-gradient(ellipse at center, #1f082e 0%, #08000f 100%)',
    animLabel: 'Glitch'
  },
  iman_gadzhi_luxury: {
    prefix: 'THE ART OF',
    highlightWord: 'FOCUS',
    tag: 'LUXURY',
    bg: 'radial-gradient(ellipse at center, #1c1d1f 0%, #0c0d0e 100%)',
    animLabel: 'Editorial'
  },
  submagic_gradient: {
    prefix: 'GOING',
    highlightWord: 'VIRAL NOW!',
    tag: 'SUBMAGIC',
    bg: 'radial-gradient(ellipse at center, #1e0933 0%, #0c0414 100%)',
    animLabel: 'Pulse'
  },
  retro_synthwave_80s: {
    prefix: 'NEON',
    highlightWord: 'HORIZON',
    tag: 'SYNTH',
    bg: 'linear-gradient(135deg, #2e082b 0%, #0f0212 100%)',
    animLabel: 'Bounce'
  },
  notion_minimal_card: {
    prefix: 'NOTE 01 ·',
    highlightWord: 'EXECUTE',
    tag: 'NOTION',
    bg: 'linear-gradient(135deg, #0f172a 0%, #050811 100%)',
    animLabel: 'Type'
  },

  // H. Classics & Creator Favourites
  classic_white: {
    prefix: 'TIMELESS',
    highlightWord: 'SUBTITLE',
    tag: 'CLEAN',
    bg: 'radial-gradient(ellipse at center, #1e2330 0%, #0d1017 100%)',
    animLabel: 'Fade'
  },
  bold_yellow: {
    prefix: 'PAY FULL',
    highlightWord: 'ATTENTION!',
    tag: 'HIGH IMPACT',
    bg: 'linear-gradient(135deg, #2b2203 0%, #0d0a01 100%)',
    animLabel: 'Pop'
  },
  viral_pop: {
    prefix: 'CAN YOU',
    highlightWord: 'BELIEVE THIS?',
    tag: 'VIRAL',
    bg: 'linear-gradient(135deg, #0e2417 0%, #040f09 100%)',
    animLabel: 'Pop'
  },
  hormozi: {
    prefix: 'MAKE YOUR',
    highlightWord: 'FIRST $1M',
    tag: 'HORMOZI',
    bg: 'linear-gradient(135deg, #2b2004 0%, #0f0b02 100%)',
    animLabel: 'Punch'
  },
  karaoke_flow: {
    prefix: 'SING THE',
    highlightWord: 'MELODY',
    tag: 'KARAOKE',
    bg: 'radial-gradient(ellipse at center, #260c2b 0%, #0d040f 100%)',
    animLabel: 'Flow'
  },
  mrbeast: {
    prefix: 'I SURVIVED',
    highlightWord: '100 DAYS!',
    tag: 'BEAST',
    bg: 'radial-gradient(ellipse at center, #2b1f06 0%, #100b02 100%)',
    animLabel: 'Punch'
  },
  podcast_pro: {
    prefix: 'EPISODE 42 ·',
    highlightWord: 'DEEP DIVE',
    tag: 'PODCAST',
    bg: 'linear-gradient(135deg, #151b26 0%, #0a0d13 100%)',
    animLabel: 'Glass'
  },
  football_hype: {
    prefix: 'CHAMPIONS',
    highlightWord: 'LEAGUE!',
    tag: 'SPORTS',
    bg: 'linear-gradient(135deg, #09261a 0%, #03110b 100%)',
    animLabel: 'Punch'
  },
  goal_explosion: {
    prefix: 'WHAT AN',
    highlightWord: 'INSANE GOAL!',
    tag: 'EXPLOSION',
    bg: 'linear-gradient(135deg, #2b1207 0%, #120602 100%)',
    animLabel: 'Burst'
  },
  cinematic_gold: {
    prefix: 'CHRONICLES OF',
    highlightWord: 'DESTINY',
    tag: 'CINEMA',
    bg: 'radial-gradient(ellipse at center, #291f0a 0%, #0f0b04 100%)',
    animLabel: 'Gold'
  },
  typewriter: {
    prefix: 'RECORDING',
    highlightWord: 'MEMORIES...',
    tag: 'VINTAGE',
    bg: 'radial-gradient(ellipse at center, #222224 0%, #0c0c0d 100%)',
    animLabel: 'Type'
  },
  bounce_words: {
    prefix: 'BOUNCE WITH',
    highlightWord: 'THE RHYTHM',
    tag: 'BOUNCE',
    bg: 'linear-gradient(135deg, #180d2b 0%, #0a0412 100%)',
    animLabel: 'Bounce'
  },
  zoom_punch: {
    prefix: 'MAXIMUM',
    highlightWord: 'VELOCITY!',
    tag: 'DYNAMIC',
    bg: 'linear-gradient(135deg, #260914 0%, #110308 100%)',
    animLabel: 'Punch'
  },
  comic_bubble: {
    prefix: 'POW!',
    highlightWord: 'KAPOW!',
    tag: 'COMIC',
    bg: 'linear-gradient(135deg, #261f06 0%, #0f0b02 100%)',
    animLabel: 'Pop'
  },
  minimal_black_box: {
    prefix: 'ESSENTIAL',
    highlightWord: 'INSIGHT',
    tag: 'MINIMAL',
    bg: 'radial-gradient(ellipse at center, #171a22 0%, #0a0c10 100%)',
    animLabel: 'Box'
  },
  gradient_modern: {
    prefix: 'NEXT GEN',
    highlightWord: 'CREATIVE',
    tag: 'GRADIENT',
    bg: 'radial-gradient(ellipse at center, #210a2f 0%, #0a0310 100%)',
    animLabel: 'Modern'
  },
  clean_documentary: {
    prefix: 'EXPLORING THE',
    highlightWord: 'OCEAN',
    tag: 'DOCS',
    bg: 'radial-gradient(ellipse at center, #0e1e28 0%, #050d12 100%)',
    animLabel: 'Fade'
  },
  creator_glass: {
    prefix: 'CREATOR',
    highlightWord: 'STUDIO PRO',
    tag: 'GLASS',
    bg: 'linear-gradient(135deg, #16202c 0%, #090e13 100%)',
    animLabel: 'Glass'
  },
  retro_terminal: {
    prefix: '> RUN',
    highlightWord: 'SYNTAX.EXE',
    tag: 'TERMINAL',
    bg: 'radial-gradient(ellipse at center, #0a2613 0%, #020d06 100%)',
    animLabel: 'Phosphor'
  },
  bubblegum_pop: {
    prefix: 'CANDY SWEET',
    highlightWord: 'ENERGY!',
    tag: 'POP CANDY',
    bg: 'linear-gradient(135deg, #2b0821 0%, #11020d 100%)',
    animLabel: 'Pop'
  },
  light_pop: {
    prefix: 'FRESH CLEAN',
    highlightWord: 'AESTHETIC',
    tag: 'MINT POP',
    bg: 'linear-gradient(135deg, #09261c 0%, #03100b 100%)',
    animLabel: 'Pop'
  },
  ae_kinetic_type: {
    prefix: 'KINETIC',
    highlightWord: 'AFTER EFFECTS',
    tag: 'MOTION',
    bg: 'linear-gradient(135deg, #261507 0%, #0f0702 100%)',
    animLabel: 'Kinetic'
  },
  ae_neon_pulse: {
    prefix: 'LASER BEAM',
    highlightWord: 'OVERDRIVE',
    tag: 'NEON LASER',
    bg: 'radial-gradient(ellipse at center, #26082e 0%, #0c0210 100%)',
    animLabel: 'Laser'
  },
  marker_card: {
    prefix: 'HIGHLIGHTED',
    highlightWord: 'KEYWORD',
    tag: 'HIGHLIGHT',
    bg: 'radial-gradient(ellipse at center, #261e09 0%, #0e0a03 100%)',
    animLabel: 'Card'
  },
  tiktok_burst: {
    prefix: 'WAIT FOR',
    highlightWord: 'THE END!',
    tag: 'TIKTOK',
    bg: 'linear-gradient(135deg, #28091a 0%, #0e0309 100%)',
    animLabel: 'Burst'
  }
};

/** Build comprehensive preset preview cards mapped by ID */
export function buildPresetPreviews(): Record<string, CaptionPresetPreview> {
  const result: Record<string, CaptionPresetPreview> = {};

  for (const preset of CAPTION_PRESETS) {
    const override = PREVIEW_OVERRIDES[preset.id] || {};
    const primaryHex = assToHexColor(preset.primary);
    const highlightHex = assToHexColor(preset.highlight);
    const boxHex = preset.boxColor ? assToHexColor(preset.boxColor) : '#12151D';

    const defaultAnimLabel =
      preset.animation === 'pop'
        ? 'Pop'
        : preset.animation === 'zoom_punch'
        ? 'Punch'
        : preset.animation === 'bounce'
        ? 'Bounce'
        : preset.animation === 'pulse'
        ? 'Pulse'
        : preset.animation === 'typewriter'
        ? 'Type'
        : preset.animation === 'slide_up'
        ? 'Slide'
        : preset.animation === 'blur_focus'
        ? 'Blur'
        : preset.animation === 'glitch'
        ? 'Glitch'
        : 'Fade';

    const nameWords = preset.name.split(' ');
    const fallbackPrefix = nameWords.length > 1 ? nameWords.slice(0, -1).join(' ').toUpperCase() : 'PREMIUM';
    const fallbackHighlight = (nameWords[nameWords.length - 1] || 'CAPTION').toUpperCase();

    result[preset.id] = {
      id: preset.id,
      name: preset.name,
      desc: preset.description,
      prefix: override.prefix || fallbackPrefix,
      highlightWord: override.highlightWord || fallbackHighlight,
      tag: override.tag || preset.category.toUpperCase(),
      bg: override.bg || 'radial-gradient(ellipse at center, #1e2330 0%, #0d1017 100%)',
      color: primaryHex,
      highlight: highlightHex,
      font: preset.font,
      boxColor: boxHex,
      boxBackground: preset.boxBackground ?? override.boxBackground,
      boxOpacity: preset.boxOpacity ?? 0.88,
      glow: preset.glow || override.glow,
      animLabel: override.animLabel || defaultAnimLabel,
      animation: preset.animation,
      uppercase: preset.uppercase,
      rtl: preset.rtl ?? override.rtl ?? false,
      defaultSize: preset.size,
      letterSpacing: preset.letterSpacing,
      fontStyle: preset.fontStyle,
      effect: preset.effect
    };
  }

  return result;
}

export const CAPTION_PRESET_PREVIEWS: Record<string, CaptionPresetPreview> = buildPresetPreviews();
