export type CaptionAnimation =
  | 'pop'
  | 'bounce'
  | 'zoom_punch'
  | 'typewriter'
  | 'fade'
  | 'pulse'
  | 'zoom'
  | 'slide_up'
  | 'blur_focus'
  | 'mask_reveal'
  | 'gradient_reveal'
  | 'glitch'
  | 'none';

export type CaptionCategory =
  | 'all'
  | 'cinematic'
  | 'viral'
  | 'typography'
  | 'gaming'
  | 'educational'
  | 'documentary'
  | 'multilingual'
  | 'classics';

export type CaptionPresetId =
  // Category A: Cinematic
  | 'doc_white'
  | 'historical_gold'
  | 'cinematic_serif'
  | 'minimal_film'
  | 'dramatic_shadow'
  | 'luxury_editorial'
  | 'vintage_doc'
  | 'netflix_doc'
  // Category B: Viral & Social Media
  | 'bold_viral'
  | 'dynamic_pop'
  | 'creator_highlight'
  | 'podcast_punch'
  | 'reaction_captions'
  | 'high_contrast'
  | 'fast_emphasis'
  | 'minimal_creator'
  // Category C: Typography
  | 'modern_sans'
  | 'elegant_serif'
  | 'editorial_magazine'
  | 'typewriter_clean'
  | 'condensed_bold'
  | 'geometric_minimal'
  | 'retro_typography'
  | 'luxury_typography'
  // Category D: Gaming & Energetic
  | 'neon_pulse'
  | 'electric_impact'
  | 'glitch_typography'
  | 'rgb_highlight'
  | 'gaming_bold'
  | 'energy_burst'
  // Category E: Educational
  | 'clean_learning'
  | 'lecture_notes'
  | 'keyword_focus'
  | 'explainer_pro'
  | 'prof_presentation'
  | 'minimal_academic'
  // Category F: Documentary & Storytelling
  | 'historical_archive'
  | 'ancient_gold'
  | 'investigation'
  | 'mystery_dark'
  | 'news_documentary'
  | 'dark_cinematic'
  | 'epic_storytelling'
  | 'narrator_focus'
  // Category G: Multilingual & Urdu / Hindi
  | 'urdu_nastaliq'
  | 'urdu_naskh'
  | 'urdu_modern'
  | 'roman_urdu_viral'
  | 'roman_hindi_bold'
  | 'roman_shayari'
  | 'roman_desi_hype'
  | 'roman_chill_vibes'
  | 'roman_bollywood'
  // Backwards compatibility classics
  | 'classic_white'
  | 'bold_yellow'
  | 'viral_pop'
  | 'hormozi'
  | 'karaoke_flow'
  | 'mrbeast'
  | 'podcast_pro'
  | 'football_hype'
  | 'goal_explosion'
  | 'cinematic_gold'
  | 'typewriter'
  | 'bounce_words'
  | 'zoom_punch'
  | 'comic_bubble'
  | 'minimal_black_box'
  | 'gradient_modern'
  | 'clean_documentary'
  | 'creator_glass'
  | 'retro_terminal'
  | 'bubblegum_pop'
  | 'light_pop'
  | 'ae_kinetic_type'
  | 'ae_neon_pulse'
  | 'marker_card'
  | 'tiktok_burst'
  // New 2026 Ultra-Premium Creator Presets
  | 'mrbeast_punch'
  | 'hormozi_pill'
  | 'ali_abdaal_aesthetic'
  | 'cyberpunk_hud'
  | 'iman_gadzhi_luxury'
  | 'submagic_gradient'
  | 'retro_synthwave_80s'
  | 'notion_minimal_card';

export interface CaptionPresetDefinition {
  id: CaptionPresetId;
  name: string;
  category: CaptionCategory;
  description: string;
  font: string;
  size: number;
  outline: number;
  shadow: number;
  bold: number;
  primary: string; // ASS &HBBGGRR& or Hex #RRGGBB
  highlight: string;
  outlineColor: string;
  shadowColor: string;
  animation: CaptionAnimation;
  uppercase: boolean;
  boxBackground?: boolean;
  boxColor?: string;
  boxOpacity?: number;
  borderRadius?: string;
  letterSpacing?: string;
  fontStyle?: 'normal' | 'italic';
  glow?: string;
  gradientText?: boolean;
  gradientColors?: [string, string];
  effect?: 'underline' | 'spotlight' | 'dual_color' | 'box' | 'glass' | 'glitch' | 'none';
  rtl?: boolean;
}

/** Convert CSS Hex (#RRGGBB) to ASS color format (&H00BBGGRR&) */
export function hexToAssColor(hex: string, alpha = '00'): string {
  const clean = hex.replace('#', '').trim();
  if (/^&H[0-9A-Fa-f]{6,8}&?$/.test(hex)) {
    return hex.endsWith('&') ? hex : `${hex}&`;
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return '&H00FFFFFF&';
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H${alpha}${b}${g}${r}&`.toUpperCase();
}

/** Convert ASS color format (&H[AA]BBGGRR&) to CSS Hex (#RRGGBB) */
export function assToHexColor(assColor: string): string {
  if (!assColor) return '#FFFFFF';
  if (assColor.startsWith('#')) return assColor;
  const stripped = assColor.replace(/^&H/i, '').replace(/&$/, '');
  const bgr = stripped.length === 8 ? stripped.slice(2) : stripped;
  if (/^[0-9A-Fa-f]{6}$/.test(bgr)) {
    const b = bgr.slice(0, 2);
    const g = bgr.slice(2, 4);
    const r = bgr.slice(4, 6);
    return `#${r}${g}${b}`.toUpperCase();
  }
  return '#FFFFFF';
}

export const CAPTION_PRESETS: CaptionPresetDefinition[] = [
  // ==========================================
  // A. CINEMATIC
  // ==========================================
  {
    id: 'doc_white',
    name: 'Documentary White',
    category: 'cinematic',
    description: 'Pristine cinematic white typography with balanced charcoal outline and soft ambient shadow.',
    font: 'Cinzel',
    size: 58,
    outline: 2.2,
    shadow: 1.8,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00E2E8F0&',
    outlineColor: '&H00141618&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.04em'
  },
  {
    id: 'historical_gold',
    name: 'Historical Gold',
    category: 'cinematic',
    description: 'Rich royal gold headlines paired with ivory narrative text for epic historical storytelling.',
    font: 'Cinzel',
    size: 60,
    outline: 2.5,
    shadow: 2.5,
    bold: -1,
    primary: '&H00EEF8FF&', // Warm ivory
    highlight: '&H0020D0FF&', // Gold (&H00BBGGRR& = #FFD020)
    outlineColor: '&H0009131C&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.05em'
  },
  {
    id: 'cinematic_serif',
    name: 'Cinematic Serif',
    category: 'cinematic',
    description: 'Refined high-contrast serif with warm amber emphasis for emotional documentaries.',
    font: 'Playfair Display',
    size: 62,
    outline: 2.2,
    shadow: 2.0,
    bold: 0,
    primary: '&H00F0F8FF&',
    highlight: '&H003CA9E5&',
    outlineColor: '&H00101418&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    fontStyle: 'italic'
  },
  {
    id: 'minimal_film',
    name: 'Minimal Film',
    category: 'cinematic',
    description: 'Understated 35mm film subtitle aesthetic with wide letter-spacing and smooth vertical slide.',
    font: 'Inter',
    size: 48,
    outline: 1.6,
    shadow: 1.2,
    bold: 0,
    primary: '&H00F5F5F5&',
    highlight: '&H00FFFFFF&',
    outlineColor: '&H001A1A1A&',
    shadowColor: '&H00000000&',
    animation: 'slide_up',
    uppercase: false,
    letterSpacing: '0.08em'
  },
  {
    id: 'dramatic_shadow',
    name: 'Dramatic Shadow',
    category: 'cinematic',
    description: 'Heavy architectural drop-shadow with bold condensed lettering for high-stakes narratives.',
    font: 'Bebas Neue',
    size: 78,
    outline: 3.5,
    shadow: 5.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00E53E3E&',
    outlineColor: '&H000A0A0A&',
    shadowColor: '&H00000000&',
    animation: 'zoom',
    uppercase: true,
    letterSpacing: '0.04em'
  },
  {
    id: 'luxury_editorial',
    name: 'Luxury Editorial',
    category: 'cinematic',
    description: 'High-fashion champagne typography with emerald keyword highlights and an editorial underline.',
    font: 'Playfair Display',
    size: 58,
    outline: 1.8,
    shadow: 2.2,
    bold: -1,
    primary: '&H00ABF3E5&',
    highlight: '&H0078C850&',
    outlineColor: '&H00181F18&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    effect: 'underline'
  },
  {
    id: 'vintage_doc',
    name: 'Vintage Documentary',
    category: 'cinematic',
    description: 'Warm sepia tones and classic literary typography evoking historical archives and memoirs.',
    font: 'Georgia',
    size: 56,
    outline: 2.0,
    shadow: 1.8,
    bold: 0,
    primary: '&H00D8ECF4&',
    highlight: '&H0086C5DA&',
    outlineColor: '&H000C1D2B&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'netflix_doc',
    name: 'Netflix Doc Inspired',
    category: 'cinematic',
    description: 'Sleek, modern documentary sans with iconic crimson emphasis and cinematic edge sharpness.',
    font: 'Inter',
    size: 56,
    outline: 2.2,
    shadow: 2.2,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H001409E5&', // Crimson #E50914
    outlineColor: '&H00111111&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.02em'
  },

  // ==========================================
  // B. VIRAL & SOCIAL MEDIA
  // ==========================================
  {
    id: 'bold_viral',
    name: 'Bold Viral',
    category: 'viral',
    description: 'High-impact uppercase sans with electric neon-lime punch built for TikTok and Reels retention.',
    font: 'Montserrat',
    size: 78,
    outline: 5.5,
    shadow: 2.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H005EC522&', // Neon lime #22C55E
    outlineColor: '&H000D1A0D&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true,
    letterSpacing: '0.02em'
  },
  {
    id: 'dynamic_pop',
    name: 'Dynamic Pop',
    category: 'viral',
    description: 'Heavy display weight snapping into place with electric cyan word acceleration.',
    font: 'Arial Black',
    size: 76,
    outline: 5.0,
    shadow: 2.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00FFF000&', // Electric cyan #00F0FF
    outlineColor: '&H00121212&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true
  },
  {
    id: 'creator_highlight',
    name: 'Creator Highlight',
    category: 'viral',
    description: 'Warm lavender body type with bright sunflower yellow keyword scaling.',
    font: 'Poppins',
    size: 74,
    outline: 4.8,
    shadow: 2.2,
    bold: -1,
    primary: '&H00F5E6FF&',
    highlight: '&H0024BFFB&', // #FBBF24
    outlineColor: '&H00160F1F&',
    shadowColor: '&H00000000&',
    animation: 'zoom_punch',
    uppercase: true
  },
  {
    id: 'podcast_punch',
    name: 'Podcast Punch',
    category: 'viral',
    description: 'Sleek conversational typography encased in a translucent dark pill with warm coral punch.',
    font: 'Inter',
    size: 62,
    outline: 1.8,
    shadow: 2.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H006B6BFF&', // Coral #FF6B6B
    outlineColor: '&H0012141A&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H9912151D&',
    boxOpacity: 0.88,
    borderRadius: '16px',
    effect: 'glass'
  },
  {
    id: 'reaction_captions',
    name: 'Reaction Captions',
    category: 'viral',
    description: 'Explosive reaction-style typography with hot electric magenta pop and dynamic bounce.',
    font: 'Impact',
    size: 82,
    outline: 6.0,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H007F00FF&', // Magenta #FF007F
    outlineColor: '&H00120516&',
    shadowColor: '&H00000000&',
    animation: 'bounce',
    uppercase: true,
    letterSpacing: '0.03em'
  },
  {
    id: 'high_contrast',
    name: 'High Contrast',
    category: 'viral',
    description: 'Maximum contrast black outline and intense solar yellow for extreme readability.',
    font: 'Impact',
    size: 80,
    outline: 6.8,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0000FFFF&', // Pure yellow #FFFF00
    outlineColor: '&H00000000&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true,
    letterSpacing: '0.03em'
  },
  {
    id: 'fast_emphasis',
    name: 'Fast Emphasis',
    category: 'viral',
    description: 'Ultra-condensed rapid-fire captions snapping words into place in sky blue.',
    font: 'Bebas Neue',
    size: 84,
    outline: 5.0,
    shadow: 2.2,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00F8BD38&', // #38BDF8
    outlineColor: '&H000D1520&',
    shadowColor: '&H00000000&',
    animation: 'zoom_punch',
    uppercase: true,
    letterSpacing: '0.03em'
  },
  {
    id: 'minimal_creator',
    name: 'Minimal Creator',
    category: 'viral',
    description: 'Modern aesthetic pastel mint highlights floating in a subtle glassmorphic backdrop.',
    font: 'Outfit',
    size: 60,
    outline: 1.8,
    shadow: 1.5,
    bold: -1,
    primary: '&H00FAF8F5&',
    highlight: '&H00B7E76E&', // Mint #6EE7B7
    outlineColor: '&H00101820&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H8810141C&',
    boxOpacity: 0.85,
    borderRadius: '12px'
  },

  // ==========================================
  // C. TYPOGRAPHY
  // ==========================================
  {
    id: 'modern_sans',
    name: 'Modern Sans',
    category: 'typography',
    description: 'Clean grotesque sans typography with deep indigo emphasis and balanced tracking.',
    font: 'Inter',
    size: 64,
    outline: 2.5,
    shadow: 1.5,
    bold: -1,
    primary: '&H00F8FAFC&',
    highlight: '&H00F16663&', // Indigo #6366F1
    outlineColor: '&H00141724&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.01em'
  },
  {
    id: 'elegant_serif',
    name: 'Elegant Serif',
    category: 'typography',
    description: 'Artistic editorial serif with rose-gold metallic tones and sophisticated high contrast.',
    font: 'Playfair Display',
    size: 62,
    outline: 2.0,
    shadow: 2.0,
    bold: 0,
    primary: '&H00F7FDFE&',
    highlight: '&H0096A9E0&', // Rose Gold #E0A996
    outlineColor: '&H001F181B&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'editorial_magazine',
    name: 'Editorial Magazine',
    category: 'typography',
    description: 'Monochrome haute-couture magazine typography with carmine red accenting.',
    font: 'Cinzel',
    size: 58,
    outline: 2.2,
    shadow: 1.8,
    bold: -1,
    primary: '&H00F5F5F5&',
    highlight: '&H002626DC&', // Carmine Red #DC2626
    outlineColor: '&H00111111&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: true,
    letterSpacing: '0.08em',
    effect: 'underline'
  },
  {
    id: 'typewriter_clean',
    name: 'Typewriter',
    category: 'typography',
    description: 'Authentic monospaced mechanical typewriter with progressive character reveal.',
    font: 'Courier New',
    size: 56,
    outline: 2.0,
    shadow: 1.5,
    bold: -1,
    primary: '&H000BF5F5&', // Warm amber #F59E0B
    highlight: '&H00FFFFFF&',
    outlineColor: '&H001A1208&',
    shadowColor: '&H00000000&',
    animation: 'typewriter',
    uppercase: false
  },
  {
    id: 'condensed_bold',
    name: 'Condensed Bold',
    category: 'typography',
    description: 'Compact display lettering with bold fire-orange punch and punchy scale-in.',
    font: 'Oswald',
    size: 78,
    outline: 4.8,
    shadow: 2.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H003C92FB&', // Orange #FB923C
    outlineColor: '&H0018100C&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true,
    letterSpacing: '0.03em'
  },
  {
    id: 'geometric_minimal',
    name: 'Geometric Minimal',
    category: 'typography',
    description: 'Technical futuristic monospace with phosphor cyan accents.',
    font: 'Space Mono',
    size: 56,
    outline: 2.2,
    shadow: 1.8,
    bold: -1,
    primary: '&H00E2E8F0&',
    highlight: '&H00EED322&', // Cyan #22D3EE
    outlineColor: '&H000A151C&',
    shadowColor: '&H00000000&',
    animation: 'typewriter',
    uppercase: false
  },
  {
    id: 'retro_typography',
    name: 'Retro Typography',
    category: 'typography',
    description: 'Warm 70s groove rounded typography with mustard yellow and terracotta accents.',
    font: 'Rubik',
    size: 72,
    outline: 4.8,
    shadow: 2.8,
    bold: -1,
    primary: '&H00FFFBF0&',
    highlight: '&H000B9EF5&', // Amber #F59E0B
    outlineColor: '&H000C1D2B&',
    shadowColor: '&H00000000&',
    animation: 'bounce',
    uppercase: true
  },
  {
    id: 'luxury_typography',
    name: 'Luxury Typography',
    category: 'typography',
    description: 'Grand platinum display type with wide tracking and sovereign gold highlights.',
    font: 'Cinzel',
    size: 60,
    outline: 2.2,
    shadow: 2.2,
    bold: -1,
    primary: '&H00F0E8E2&',
    highlight: '&H0008B3EA&', // Gold #EAB308
    outlineColor: '&H00141618&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: true,
    letterSpacing: '0.12em'
  },

  // ==========================================
  // D. GAMING & ENERGETIC
  // ==========================================
  {
    id: 'neon_pulse',
    name: 'Neon Pulse',
    category: 'gaming',
    description: 'Electric cyber-cyan typography illuminated by an intense rhythmic magenta halo.',
    font: 'Arial Black',
    size: 74,
    outline: 3.5,
    shadow: 6.0,
    bold: -1,
    primary: '&H00FFFFE0&',
    highlight: '&H00FFFF00&', // Cyan
    outlineColor: '&H00441033&',
    shadowColor: '&H00FF00FF&', // Magenta glow
    animation: 'pulse',
    uppercase: true,
    glow: '#FF00FF'
  },
  {
    id: 'electric_impact',
    name: 'Electric Impact',
    category: 'gaming',
    description: 'Lightning yellow display text snapping forward with energetic electric blue aura.',
    font: 'Impact',
    size: 80,
    outline: 5.5,
    shadow: 4.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0015CCFA&', // Lightning Yellow #FACC15
    outlineColor: '&H001A1800&',
    shadowColor: '&H00F6823B&', // Electric Blue glow
    animation: 'zoom_punch',
    uppercase: true,
    glow: '#3B82F6'
  },
  {
    id: 'glitch_typography',
    name: 'Glitch Typography',
    category: 'gaming',
    description: 'Cyberpunk chromatic aberration effect with rapid sub-frame jitter transitions.',
    font: 'Rubik',
    size: 76,
    outline: 4.5,
    shadow: 4.0,
    bold: -1,
    primary: '&H00E0FFFF&',
    highlight: '&H003B30FF&',
    outlineColor: '&H00120520&',
    shadowColor: '&H00FF0033&',
    animation: 'glitch',
    uppercase: true,
    effect: 'glitch'
  },
  {
    id: 'rgb_highlight',
    name: 'RGB Highlight',
    category: 'gaming',
    description: 'Multi-spectrum energetic gaming subtitles with vivid ultraviolet active word accent.',
    font: 'Montserrat',
    size: 74,
    outline: 5.0,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00F755A8&', // Violet #A855F7
    outlineColor: '&H00100A18&',
    shadowColor: '&H00AA32FF&',
    animation: 'pop',
    uppercase: true,
    glow: '#A855F7'
  },
  {
    id: 'gaming_bold',
    name: 'Gaming Bold',
    category: 'gaming',
    description: 'Heavy battle-ready lettering featuring radioactive green word acceleration.',
    font: 'Impact',
    size: 82,
    outline: 6.0,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0080DE4A&', // Toxic Green #4ADE80
    outlineColor: '&H00081C08&',
    shadowColor: '&H00000000&',
    animation: 'bounce',
    uppercase: true
  },
  {
    id: 'energy_burst',
    name: 'Energy Burst',
    category: 'gaming',
    description: 'Explosive solar flare colors transitioning from scorching orange to bright yellow.',
    font: 'Arial Black',
    size: 78,
    outline: 5.5,
    shadow: 4.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H001673F9&', // Orange #F97316
    outlineColor: '&H00240C00&',
    shadowColor: '&H0000D0FF&', // Gold glow
    animation: 'zoom_punch',
    uppercase: true,
    gradientText: true,
    gradientColors: ['#F97316', '#FDE047']
  },

  // ==========================================
  // E. EDUCATIONAL
  // ==========================================
  {
    id: 'clean_learning',
    name: 'Clean Learning',
    category: 'educational',
    description: 'Dyslexia-friendly high-clarity typography on a soft dark pill with clear yellow focus.',
    font: 'Inter',
    size: 58,
    outline: 1.5,
    shadow: 1.2,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0047E0FD&', // Soft yellow #FDE047
    outlineColor: '&H0014161C&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H9912151D&',
    boxOpacity: 0.88,
    borderRadius: '12px'
  },
  {
    id: 'lecture_notes',
    name: 'Lecture Notes',
    category: 'educational',
    description: 'Structured academic presentation subtitles with royal blue emphasis and clean baseline.',
    font: 'Poppins',
    size: 60,
    outline: 2.2,
    shadow: 1.5,
    bold: -1,
    primary: '&H00F0F4F8&',
    highlight: '&H00EBE625&', // Royal Blue #2563EB
    outlineColor: '&H00101824&',
    shadowColor: '&H00000000&',
    animation: 'slide_up',
    uppercase: false
  },
  {
    id: 'keyword_focus',
    name: 'Keyword Focus',
    category: 'educational',
    description: 'Neutral white educational phrasing with active terms highlighted in a distinct accent box.',
    font: 'Montserrat',
    size: 64,
    outline: 2.5,
    shadow: 2.0,
    bold: -1,
    primary: '&H00FAF8F5&',
    highlight: '&H00F6823B&', // Blue #3B82F6
    outlineColor: '&H00161C24&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: false,
    effect: 'spotlight'
  },
  {
    id: 'explainer_pro',
    name: 'Explainer',
    category: 'educational',
    description: 'Friendly, accessible modern sans with refreshing electric teal highlights for product explainers.',
    font: 'Outfit',
    size: 62,
    outline: 2.0,
    shadow: 1.5,
    bold: -1,
    primary: '&H00F8FAFC&',
    highlight: '&H00A6B814&', // Teal #14B8A6
    outlineColor: '&H000E1C1A&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'prof_presentation',
    name: 'Professional Presentation',
    category: 'educational',
    description: 'Executive corporate styling with frosted glass badge and champagne gold highlights.',
    font: 'Inter',
    size: 54,
    outline: 1.5,
    shadow: 1.5,
    bold: -1,
    primary: '&H00F1F5F9&',
    highlight: '&H000B9EF5&', // Amber #F59E0B
    outlineColor: '&H000F172A&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H900F172A&',
    boxOpacity: 0.85,
    borderRadius: '10px',
    effect: 'glass'
  },
  {
    id: 'minimal_academic',
    name: 'Minimal Academic',
    category: 'educational',
    description: 'Scholarly Georgia serif subtitles crafted for historical, literary, and scientific lectures.',
    font: 'Georgia',
    size: 52,
    outline: 1.8,
    shadow: 1.2,
    bold: 0,
    primary: '&H00F8FAFC&',
    highlight: '&H0086C5DA&',
    outlineColor: '&H00181614&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },

  // ==========================================
  // F. DOCUMENTARY & STORYTELLING
  // ==========================================
  {
    id: 'historical_archive',
    name: 'Historical Archive',
    category: 'documentary',
    description: 'Aged parchment tones and warm amber script tailored for archival museum and historical videos.',
    font: 'Cinzel',
    size: 58,
    outline: 2.2,
    shadow: 2.0,
    bold: -1,
    primary: '&H00C7F3FE&', // Warm cream #FEF3C7
    highlight: '&H000677D9&', // Bronze #D97706
    outlineColor: '&H000D1B2A&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.04em'
  },
  {
    id: 'ancient_gold',
    name: 'Ancient Gold',
    category: 'documentary',
    description: 'Regal golden typography evoking ancient civilizations, monuments, and timeless relics.',
    font: 'Cinzel',
    size: 64,
    outline: 2.8,
    shadow: 3.0,
    bold: -1,
    primary: '&H00F5F5FF&',
    highlight: '&H000B9EF5&', // Gold #F59E0B
    outlineColor: '&H000B111A&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.06em'
  },
  {
    id: 'investigation',
    name: 'Investigation',
    category: 'documentary',
    description: 'Classified true-crime dossier styling with red alert emphasis and typewriter timing.',
    font: 'Space Mono',
    size: 56,
    outline: 2.2,
    shadow: 1.8,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H004444EF&', // Caution Red #EF4444
    outlineColor: '&H00101010&',
    shadowColor: '&H00000000&',
    animation: 'typewriter',
    uppercase: false
  },
  {
    id: 'mystery_dark',
    name: 'Mystery',
    category: 'documentary',
    description: 'Haunting atmospheric noir with spectral ice-blue highlights emerging from deep shadows.',
    font: 'Playfair Display',
    size: 62,
    outline: 2.2,
    shadow: 3.0,
    bold: 0,
    primary: '&H00F0F8FF&',
    highlight: '&H00FCF3A5&', // Ice cyan #A5F3FC
    outlineColor: '&H00120703&',
    shadowColor: '&H00000000&',
    animation: 'blur_focus',
    uppercase: false,
    fontStyle: 'italic'
  },
  {
    id: 'news_documentary',
    name: 'News Documentary',
    category: 'documentary',
    description: 'Authoritative broadcast journalism captions with red news-bulletin accenting.',
    font: 'Arial Black',
    size: 64,
    outline: 3.5,
    shadow: 2.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H002626DC&', // Red #DC2626
    outlineColor: '&H00121212&',
    shadowColor: '&H00000000&',
    animation: 'slide_up',
    uppercase: true
  },
  {
    id: 'dark_cinematic',
    name: 'Dark Cinematic',
    category: 'documentary',
    description: 'Heavy atmospheric silver typography with deep vignette shadows for immersive storytelling.',
    font: 'Inter',
    size: 68,
    outline: 2.5,
    shadow: 3.5,
    bold: -1,
    primary: '&H00F0E8E2&',
    highlight: '&H00D0C586&',
    outlineColor: '&H000E1218&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    letterSpacing: '0.03em'
  },
  {
    id: 'epic_storytelling',
    name: 'Epic Storytelling',
    category: 'documentary',
    description: 'Grand mythological typography with amber flares and deep crimson contrast.',
    font: 'Cinzel',
    size: 66,
    outline: 3.0,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0024BFFB&', // Amber #FBBF24
    outlineColor: '&H001D1D7F&', // Crimson outline #7F1D1D
    shadowColor: '&H00000000&',
    animation: 'zoom_punch',
    uppercase: true,
    letterSpacing: '0.05em'
  },
  {
    id: 'narrator_focus',
    name: 'Narrator Focus',
    category: 'documentary',
    description: 'Rich narrative voiceover subtitles resting on a warm translucent glass pill.',
    font: 'Georgia',
    size: 58,
    outline: 1.8,
    shadow: 1.8,
    bold: 0,
    primary: '&H00FAF7F0&',
    highlight: '&H000B9EF5&', // Amber #F59E0B
    outlineColor: '&H0014161C&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H9014161C&',
    boxOpacity: 0.86,
    borderRadius: '12px'
  },

  // ==========================================
  // G. MULTILINGUAL & URDU / HINDI
  // ==========================================
  {
    id: 'urdu_nastaliq',
    name: 'Urdu Nastaliq',
    category: 'multilingual',
    description: 'Traditional flowing Urdu calligraphy with golden cyan emphasis and authentic RTL rendering.',
    font: 'Noto Nastaliq Urdu',
    size: 64,
    outline: 3.0,
    shadow: 1.8,
    bold: -1,
    primary: '&H00FFF8E8&',
    highlight: '&H00F4C96B&', // #6BC9F4
    outlineColor: '&H001B2117&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    rtl: true
  },
  {
    id: 'urdu_naskh',
    name: 'Urdu Naskh',
    category: 'multilingual',
    description: 'Crisp classical Arabic & Urdu Naskh type for high-legibility Quranic, news, and daily subtitles.',
    font: 'Noto Naskh Arabic',
    size: 64,
    outline: 3.0,
    shadow: 1.5,
    bold: -1,
    primary: '&H00F3FAFF&',
    highlight: '&H0048D6C7&', // #C7D648
    outlineColor: '&H002D2310&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    rtl: true
  },
  {
    id: 'urdu_modern',
    name: 'Urdu Modern',
    category: 'multilingual',
    description: 'Contemporary bold Arabic sans lettering for high-energy modern reels, podcasts, and shorts.',
    font: 'Noto Sans Arabic',
    size: 66,
    outline: 3.5,
    shadow: 1.8,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00D9A7FF&', // #FFA7D9
    outlineColor: '&H00371621&',
    shadowColor: '&H001B0B12&',
    animation: 'pop',
    uppercase: false,
    rtl: true
  },
  {
    id: 'roman_urdu_viral',
    name: 'Roman Urdu Viral',
    category: 'multilingual',
    description: 'Bold Poppins lettering with a neon mint reels aesthetic crafted for Roman Urdu creators.',
    font: 'Poppins',
    size: 76,
    outline: 5.0,
    shadow: 2.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0064EBB4&',
    outlineColor: '&H00121212&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true
  },
  {
    id: 'roman_hindi_bold',
    name: 'Roman Hindi Bold',
    category: 'multilingual',
    description: 'Tall Bebas Neue lettering with vivid energetic yellow punch for Hinglish and Desi creators.',
    font: 'Bebas Neue',
    size: 82,
    outline: 5.5,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0000E6FF&',
    outlineColor: '&H00101010&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true
  },
  {
    id: 'roman_shayari',
    name: 'Roman Shayari',
    category: 'multilingual',
    description: 'Elegant Playfair Display typography crafted for Roman Urdu poetry, quotes, and deep emotions.',
    font: 'Playfair Display',
    size: 62,
    outline: 2.5,
    shadow: 2.0,
    bold: 0,
    primary: '&H00FFF8F0&',
    highlight: '&H00FFD700&',
    outlineColor: '&H00161218&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    fontStyle: 'italic'
  },
  {
    id: 'roman_desi_hype',
    name: 'Desi Street Hype',
    category: 'multilingual',
    description: 'Heavy Montserrat type with flaming crimson-pink highlights and golden ambient glow.',
    font: 'Montserrat',
    size: 78,
    outline: 6.0,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00FF2A55&',
    outlineColor: '&H000A0A0A&',
    shadowColor: '&H00FFAA00&',
    animation: 'zoom_punch',
    uppercase: true,
    glow: '#FFAA00'
  },
  {
    id: 'roman_chill_vibes',
    name: 'Roman Chill Aesthetic',
    category: 'multilingual',
    description: 'Sleek Outfit typography inside a frosted glass panel for lifestyle and ambient reels.',
    font: 'Outfit',
    size: 60,
    outline: 2.0,
    shadow: 0,
    bold: -1,
    primary: '&H00E0F7FA&',
    highlight: '&H00FF8A80&',
    outlineColor: '&H00181410&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H80181410&',
    boxOpacity: 0.85
  },
  {
    id: 'roman_bollywood',
    name: 'Bollywood Masala',
    category: 'multilingual',
    description: 'Rounded energetic Rubik lettering with vibrant cyan and celebratory gold punch.',
    font: 'Rubik',
    size: 76,
    outline: 5.0,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0000F0FF&',
    outlineColor: '&H00150824&',
    shadowColor: '&H00FFDE00&',
    animation: 'bounce',
    uppercase: true,
    glow: '#00DEFF'
  },

  // ==========================================
  // H. CLASSICS & COMPATIBILITY
  // ==========================================
  {
    id: 'classic_white',
    name: 'Classic White',
    category: 'classics',
    description: 'Clean white subtitles with a crisp dark outline for universal readability.',
    font: 'Arial',
    size: 64,
    outline: 3.5,
    shadow: 1.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00FFFFFF&',
    outlineColor: '&H00101010&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'bold_yellow',
    name: 'Bold Yellow',
    category: 'classics',
    description: 'Large yellow text with a heavy dark stroke for maximum visibility.',
    font: 'Arial Black',
    size: 74,
    outline: 5.5,
    shadow: 2.5,
    bold: -1,
    primary: '&H0000E6FF&',
    highlight: '&H0000E6FF&',
    outlineColor: '&H00101010&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true
  },
  {
    id: 'viral_pop',
    name: 'Viral Pop',
    category: 'classics',
    description: 'Bold uppercase text with energetic neon mint emphasis.',
    font: 'Arial Black',
    size: 76,
    outline: 5.0,
    shadow: 2.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0064EBB4&',
    outlineColor: '&H00121212&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true
  },
  {
    id: 'hormozi',
    name: 'Hormozi Inspired',
    category: 'classics',
    description: 'High contrast captions with bright yellow word emphasis.',
    font: 'Impact',
    size: 78,
    outline: 5.5,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0000E6FF&',
    outlineColor: '&H000A0A0A&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true
  },
  {
    id: 'karaoke_flow',
    name: 'Karaoke Flow',
    category: 'classics',
    description: 'Active spoken words illuminate in electric cyan as the speaker speaks.',
    font: 'Arial',
    size: 68,
    outline: 4.0,
    shadow: 2.0,
    bold: -1,
    primary: '&H00D0D0D0&',
    highlight: '&H00FFF020&',
    outlineColor: '&H00141414&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: false
  },
  {
    id: 'mrbeast',
    name: 'MrBeast Inspired',
    category: 'classics',
    description: 'Colorful display type with punchy pink highlights and cyan glow.',
    font: 'Impact',
    size: 78,
    outline: 6.0,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H005500FF&',
    outlineColor: '&H00000000&',
    shadowColor: '&H00FFDE00&',
    animation: 'zoom_punch',
    uppercase: true,
    glow: '#00DEFF'
  },
  {
    id: 'podcast_pro',
    name: 'Podcast Pro',
    category: 'classics',
    description: 'Minimal white subtitles with a subtle shadow and warm coral punch.',
    font: 'Arial',
    size: 56,
    outline: 2.5,
    shadow: 2.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H003080FF&',
    outlineColor: '&H00121212&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'football_hype',
    name: 'Football Hype',
    category: 'classics',
    description: 'Bold yellow and white captions for exciting sports commentary and reactions.',
    font: 'Impact',
    size: 76,
    outline: 5.5,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0000D7FF&',
    outlineColor: '&H00122E0A&',
    shadowColor: '&H00000000&',
    animation: 'bounce',
    uppercase: true
  },
  {
    id: 'goal_explosion',
    name: 'Goal Explosion',
    category: 'classics',
    description: 'Explosive captions with crimson highlights and gold glow for sports moments.',
    font: 'Impact',
    size: 82,
    outline: 6.0,
    shadow: 4.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00303BFF&',
    outlineColor: '&H00000020&',
    shadowColor: '&H0000AAFF&',
    animation: 'zoom_punch',
    uppercase: true,
    glow: '#FFAA00'
  },
  {
    id: 'cinematic_gold',
    name: 'Cinematic Gold',
    category: 'classics',
    description: 'Elegant warm ivory and gold cinematic typography.',
    font: 'Georgia',
    size: 52,
    outline: 2.0,
    shadow: 2.0,
    bold: 0,
    primary: '&H00EEFFFD&',
    highlight: '&H0000D7FF&',
    outlineColor: '&H000E161C&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'typewriter',
    name: 'Typewriter Classic',
    category: 'classics',
    description: 'Retro monospace captions with progressive word reveal in terminal green.',
    font: 'Courier New',
    size: 58,
    outline: 2.5,
    shadow: 1.5,
    bold: -1,
    primary: '&H0033FF33&',
    highlight: '&H00FFFFFF&',
    outlineColor: '&H00051505&',
    shadowColor: '&H00000000&',
    animation: 'typewriter',
    uppercase: false
  },
  {
    id: 'bounce_words',
    name: 'Bounce Words',
    category: 'classics',
    description: 'Active words bounce with vibrant violet-pink accents.',
    font: 'Arial',
    size: 68,
    outline: 4.0,
    shadow: 2.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H008B6BFF&',
    outlineColor: '&H0016101A&',
    shadowColor: '&H00000000&',
    animation: 'bounce',
    uppercase: false
  },
  {
    id: 'zoom_punch',
    name: 'Zoom Punch',
    category: 'classics',
    description: 'Important words scale up quickly and snap into place.',
    font: 'Impact',
    size: 76,
    outline: 5.0,
    shadow: 2.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H000099FF&',
    outlineColor: '&H00101010&',
    shadowColor: '&H00000000&',
    animation: 'zoom_punch',
    uppercase: true
  },
  {
    id: 'comic_bubble',
    name: 'Comic Bubble',
    category: 'classics',
    description: 'Comic ink lettering with a bright yellow bubble backing.',
    font: 'Impact',
    size: 66,
    outline: 4.0,
    shadow: 2.0,
    bold: -1,
    primary: '&H00101010&',
    highlight: '&H000000D6&',
    outlineColor: '&H00FFFFFF&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true,
    boxBackground: true,
    boxColor: '&H0033E8FF&'
  },
  {
    id: 'minimal_black_box',
    name: 'Minimal Black Box',
    category: 'classics',
    description: 'White captions on a translucent dark background panel.',
    font: 'Arial',
    size: 58,
    outline: 1.5,
    shadow: 0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0064EBB4&',
    outlineColor: '&H00101010&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H80101010&'
  },
  {
    id: 'gradient_modern',
    name: 'Gradient Modern',
    category: 'classics',
    description: 'Modern bold type with violet highlights and magenta glow.',
    font: 'Arial Black',
    size: 74,
    outline: 4.5,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00E0519B&',
    outlineColor: '&H002E101E&',
    shadowColor: '&H00B52D6C&',
    animation: 'pop',
    uppercase: true,
    glow: '#E0519B'
  },
  {
    id: 'clean_documentary',
    name: 'Clean Documentary',
    category: 'classics',
    description: 'Understated professional subtitles for educational and documentary clips.',
    font: 'Arial',
    size: 52,
    outline: 2.0,
    shadow: 1.2,
    bold: 0,
    primary: '&H00EAEAEA&',
    highlight: '&H00DAC586&',
    outlineColor: '&H00181614&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false
  },
  {
    id: 'creator_glass',
    name: 'Creator Glass',
    category: 'classics',
    description: 'Soft ivory captions inside a frosted creator-style glass panel.',
    font: 'Inter',
    size: 60,
    outline: 1.5,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FAF7E0&',
    highlight: '&H008AFFD3&',
    outlineColor: '&H0025303A&',
    shadowColor: '&H80181410&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&HA0181410&'
  },
  {
    id: 'retro_terminal',
    name: 'Retro Terminal',
    category: 'classics',
    description: 'Monospace phosphor green with a progressive terminal reveal.',
    font: 'Courier New',
    size: 58,
    outline: 2.5,
    shadow: 5.0,
    bold: -1,
    primary: '&H0075FF75&',
    highlight: '&H00E0FFE0&',
    outlineColor: '&H00041004&',
    shadowColor: '&H0040FF40&',
    animation: 'typewriter',
    uppercase: false,
    glow: '#40FF40'
  },
  {
    id: 'bubblegum_pop',
    name: 'Bubblegum Pop',
    category: 'classics',
    description: 'Candy pink display type, white ink stroke, and punchy yellow emphasis.',
    font: 'Arial Black',
    size: 72,
    outline: 5.0,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FF78D8&',
    highlight: '&H0000F5FF&',
    outlineColor: '&H00FFFFFF&',
    shadowColor: '&H00AA32FF&',
    animation: 'pop',
    uppercase: true,
    glow: '#AA32FF'
  },
  {
    id: 'light_pop',
    name: 'Light Pop',
    category: 'classics',
    description: 'Bright clean captions with a soft mint pop for the active word.',
    font: 'Inter',
    size: 64,
    outline: 2.0,
    shadow: 1.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H009AFFD8&',
    outlineColor: '&H0022202A&',
    shadowColor: '&H008DFFCE&',
    animation: 'pop',
    uppercase: false
  },
  {
    id: 'ae_kinetic_type',
    name: 'AE Kinetic Type',
    category: 'classics',
    description: 'After Effects inspired kinetic typography with a quick punch scale.',
    font: 'Impact',
    size: 78,
    outline: 4.5,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0040C8FF&',
    outlineColor: '&H00171021&',
    shadowColor: '&H00FF7D42&',
    animation: 'zoom_punch',
    uppercase: true
  },
  {
    id: 'ae_neon_pulse',
    name: 'AE Neon Pulse',
    category: 'classics',
    description: 'Electric cyan lettering with a violet halo and rhythmic pulse.',
    font: 'Arial Black',
    size: 70,
    outline: 3.0,
    shadow: 6.0,
    bold: -1,
    primary: '&H00EFFFFF&',
    highlight: '&H0040F0FF&',
    outlineColor: '&H00251044&',
    shadowColor: '&H00FF55DD&',
    animation: 'pulse',
    uppercase: true,
    glow: '#FF55DD'
  },
  {
    id: 'marker_card',
    name: 'Marker Card',
    category: 'classics',
    description: 'A crisp editorial label on a bright marker-yellow backing.',
    font: 'Montserrat',
    size: 60,
    outline: 1.0,
    shadow: 1.0,
    bold: -1,
    primary: '&H00181818&',
    highlight: '&H002626D8&',
    outlineColor: '&H00FFFFFF&',
    shadowColor: '&H006EDFFF&',
    animation: 'pop',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H0055E8FF&'
  },
  {
    id: 'tiktok_burst',
    name: 'TikTok Burst',
    category: 'classics',
    description: 'Fast short-form captions with hot-pink emphasis and cyan glow.',
    font: 'Arial Black',
    size: 76,
    outline: 5.0,
    shadow: 5.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00FF45D8&',
    outlineColor: '&H0010101A&',
    shadowColor: '&H00FFFF30&',
    animation: 'bounce',
    uppercase: true,
    glow: '#FF45D8'
  },
  // ==========================================
  // NEW 2026 ULTRA-PREMIUM SIGNATURE PRESETS
  // ==========================================
  {
    id: 'mrbeast_punch',
    name: 'MrBeast Punch Pro',
    category: 'viral',
    description: 'Ultra-punchy high-retention YouTube viral style with deep drop stroke and solar yellow active pop.',
    font: 'Montserrat',
    size: 84,
    outline: 6.0,
    shadow: 3.5,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H0000D4FF&', // Solar Yellow #FFD400 (BGR)
    outlineColor: '&H000A0A0A&',
    shadowColor: '&H00000000&',
    animation: 'zoom_punch',
    uppercase: true,
    letterSpacing: '0.02em'
  },
  {
    id: 'hormozi_pill',
    name: 'Hormozi Kinetic Pill',
    category: 'viral',
    description: 'Iconic Alex Hormozi high-impact contrast look with crisp black type encased in a vibrant solar yellow pill.',
    font: 'Impact',
    size: 78,
    outline: 1.5,
    shadow: 2.0,
    bold: -1,
    primary: '&H00121212&', // Dense black
    highlight: '&H00FFFFFF&', // Flash white on active
    outlineColor: '&H00000000&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    uppercase: true,
    boxBackground: true,
    boxColor: '&H0000E6FF&', // Pure Gold #FFE600
    boxOpacity: 0.95,
    borderRadius: '12px'
  },
  {
    id: 'ali_abdaal_aesthetic',
    name: 'Ali Abdaal Studio',
    category: 'educational',
    description: 'Clean, elegant productivity aesthetic on a soft paper glass pill with pastel mint word accents.',
    font: 'Outfit',
    size: 60,
    outline: 1.2,
    shadow: 1.5,
    bold: -1,
    primary: '&H00FAF8F5&', // Warm ivory
    highlight: '&H0099F6C8&', // Mint pastel #C8F699
    outlineColor: '&H0010141E&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H88141824&', // Translucent deep navy glass
    boxOpacity: 0.86,
    borderRadius: '16px',
    effect: 'glass'
  },
  {
    id: 'cyberpunk_hud',
    name: 'Cyberpunk 2077 HUD',
    category: 'gaming',
    description: 'Futuristic sci-fi cyber HUD monospace typography with electric cyan body and hot magenta glitch.',
    font: 'Space Mono',
    size: 66,
    outline: 3.5,
    shadow: 4.0,
    bold: -1,
    primary: '&H00FFFF00&', // Electric cyan #00FFFF
    highlight: '&H00FF00FF&', // Hot magenta #FF00FF
    outlineColor: '&H00240018&',
    shadowColor: '&H00FF00AA&',
    animation: 'glitch',
    glow: '#00FFFF',
    uppercase: true,
    letterSpacing: '0.04em'
  },
  {
    id: 'iman_gadzhi_luxury',
    name: 'Iman Gadzhi Luxury',
    category: 'cinematic',
    description: 'High-ticket cinematic editorial serif with platinum body, muted champagne gold keywords, and subtle underline.',
    font: 'Cinzel',
    size: 64,
    outline: 2.2,
    shadow: 3.0,
    bold: -1,
    primary: '&H00F0F4F8&',
    highlight: '&H005CD4D8&', // Champagne Gold #D8D45C
    outlineColor: '&H000C1014&',
    shadowColor: '&H00000000&',
    animation: 'fade',
    uppercase: true,
    effect: 'underline',
    letterSpacing: '0.06em'
  },
  {
    id: 'submagic_gradient',
    name: 'Submagic Pulse',
    category: 'viral',
    description: 'Trending social short-form style with electric violet keyword punch and smooth word pop acceleration.',
    font: 'Poppins',
    size: 76,
    outline: 4.5,
    shadow: 3.0,
    bold: -1,
    primary: '&H00FFFFFF&',
    highlight: '&H00FF3388&', // Electric violet #8833FF
    outlineColor: '&H0012051E&',
    shadowColor: '&H00000000&',
    animation: 'pop',
    glow: '#8833FF',
    uppercase: true
  },
  {
    id: 'retro_synthwave_80s',
    name: 'Retro Synthwave 80s',
    category: 'typography',
    description: 'Nostalgic 1980s neon chrome typography with hot sunset amber keywords and neon pulse motion.',
    font: 'Rubik',
    size: 72,
    outline: 4.0,
    shadow: 4.0,
    bold: -1,
    primary: '&H00FFEBEC&',
    highlight: '&H000099FF&', // Sunset amber #FF9900
    outlineColor: '&H00330033&',
    shadowColor: '&H00CC00FF&',
    animation: 'bounce',
    glow: '#FF00CC',
    uppercase: true
  },
  {
    id: 'notion_minimal_card',
    name: 'Notion Minimalist',
    category: 'educational',
    description: 'Monospace architectural subtitles encased in a clean graphite rounded capsule with sky blue emphasis.',
    font: 'Space Mono',
    size: 54,
    outline: 1.0,
    shadow: 1.2,
    bold: 0,
    primary: '&H00E2E8F0&',
    highlight: '&H00F8BD38&', // Sky cyan #38BDF8
    outlineColor: '&H000A0E17&',
    shadowColor: '&H00000000&',
    animation: 'typewriter',
    uppercase: false,
    boxBackground: true,
    boxColor: '&H900F172A&', // Slate 900
    boxOpacity: 0.90,
    borderRadius: '10px'
  }
];

export const CATEGORY_DEFINITIONS: Array<{ id: CaptionCategory; name: string; icon: string }> = [
  { id: 'all', name: 'All Looks', icon: 'Sparkles' },
  { id: 'cinematic', name: 'Cinematic', icon: 'Film' },
  { id: 'viral', name: 'Viral & Social', icon: 'Flame' },
  { id: 'typography', name: 'Typography', icon: 'Type' },
  { id: 'gaming', name: 'Gaming & Energetic', icon: 'Gamepad2' },
  { id: 'educational', name: 'Educational', icon: 'GraduationCap' },
  { id: 'documentary', name: 'Documentary', icon: 'Compass' },
  { id: 'multilingual', name: 'Urdu & Multilingual', icon: 'Globe2' },
  { id: 'classics', name: 'Studio Classics', icon: 'Bookmark' }
];
