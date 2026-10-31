import { CaptionPresetId, CaptionCategory, CaptionAnimation } from '@shared/captionPresets';

export interface CaptionStudioSettings {
  preset: CaptionPresetId;
  category: CaptionCategory;
  language: string;
  maxWords: number;
  wordHighlight: boolean;
  uppercase: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'heavy';
  letterSpacing: string;
  lineHeight: number;
  textOpacity: number;
  primaryColor: string;
  highlightColor: string;
  gradientText: boolean;
  gradientSecondaryColor: string;
  outlineColor: string;
  shadowColor: string;
  outlineWidth: number;
  shadowDistance: number;
  neonGlow: boolean;
  boxBackground: boolean;
  boxColor: string;
  boxOpacity: number;
  borderRadius: string;
  editorialUnderline: boolean;
  wordSpotlight: boolean;
  textAlign: 'left' | 'center' | 'right';
  captionPosition: 'bottom' | 'lower' | 'middle' | 'top';
  captionX: number;
  captionY: number;
  captionWidth: number;
  captionLocked: boolean;
  snapToCenter: boolean;
  animationStyle: CaptionAnimation;
  animationIntensity: number;
  highlightScale: number;
  emphasisWords: string[];
  safeZone: boolean;
  aspectRatio: '9:16' | '16:9' | '1:1';
}

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words?: CaptionWord[];
  customStyle?: Partial<CaptionStudioSettings>;
}

export interface CaptionRenderResult {
  videoUrl: string;
  filename: string;
  srt: string;
  ass: string;
  vtt: string;
  total_segments: number;
  detected_language: string;
}

export interface UserSavedPreset {
  id: string;
  name: string;
  createdAt: string;
  settings: CaptionStudioSettings;
}

