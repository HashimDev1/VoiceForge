import {
  EditorProject,
  TimelineTrack,
  TimelineClip,
  ClipTransform,
  ClipSpeed,
  ColorGrading,
  ClipAudioSettings,
  AspectRatio,
  TransitionType,
  EffectType
} from './videoEditorTypes';

export const DEFAULT_TRANSFORM: ClipTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  flipH: false,
  flipV: false,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  fitMode: 'fit'
};

export const DEFAULT_SPEED: ClipSpeed = {
  speed: 1,
  reverse: false,
  preservePitch: true,
  isFreezeFrame: false
};

export const DEFAULT_COLOR_GRADING: ColorGrading = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  gamma: 1,
  hue: 0
};

export const DEFAULT_AUDIO_SETTINGS: ClipAudioSettings = {
  volume: 100,
  muted: false,
  fadeInDuration: 0,
  fadeOutDuration: 0,
  ducking: false,
  pitch: 0,
  equalizer: 'flat'
};

export const COLOR_PRESETS: Array<{ id: string; name: string; settings: Partial<ColorGrading> }> = [
  { id: 'original', name: 'Original (Neutral)', settings: { ...DEFAULT_COLOR_GRADING } },
  {
    id: 'teal_orange',
    name: 'Teal & Orange (Cinematic)',
    settings: {
      temperature: 15,
      tint: -10,
      contrast: 18,
      saturation: 12,
      highlights: 10,
      shadows: -15,
      gamma: 0.95
    }
  },
  {
    id: 'moody_noir',
    name: 'Moody Noir',
    settings: {
      brightness: -10,
      contrast: 28,
      saturation: -30,
      temperature: -15,
      shadows: -25,
      gamma: 0.9
    }
  },
  {
    id: 'vintage_film',
    name: 'Vintage 35mm Film',
    settings: {
      contrast: 10,
      saturation: -15,
      temperature: 20,
      tint: 8,
      whites: -10,
      blacks: 15,
      gamma: 1.05
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    settings: {
      contrast: 32,
      saturation: 40,
      tint: 25,
      temperature: -10,
      highlights: 20,
      shadows: -20,
      gamma: 1.1
    }
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour Glow',
    settings: {
      brightness: 5,
      temperature: 35,
      tint: -5,
      saturation: 15,
      contrast: 8,
      highlights: 12,
      gamma: 1.0
    }
  },
  {
    id: 'clean_pop',
    name: 'Clean Social Pop',
    settings: {
      brightness: 8,
      contrast: 15,
      saturation: 25,
      exposure: 6,
      whites: 5,
      gamma: 1.0
    }
  },
  {
    id: 'bleach_bypass',
    name: 'Bleach Bypass',
    settings: {
      contrast: 40,
      saturation: -45,
      brightness: -5,
      whites: 15,
      blacks: -10,
      gamma: 0.9
    }
  },
  {
    id: 'monochrome',
    name: 'High Contrast B&W',
    settings: {
      saturation: -100,
      contrast: 30,
      brightness: 0,
      highlights: 10,
      shadows: -10,
      gamma: 0.95
    }
  }
];

export const TRANSITION_CATALOG: Array<{
  id: TransitionType;
  name: string;
  category: 'dissolve' | 'motion' | 'creative';
  description: string;
}> = [
  { id: 'none', name: 'No Transition', category: 'dissolve', description: 'Cut without transition' },
  { id: 'fade', name: 'Fade Black', category: 'dissolve', description: 'Smooth fade through black' },
  { id: 'dissolve', name: 'Cross Dissolve', category: 'dissolve', description: 'Gentle blend between clips' },
  { id: 'zoom_in', name: 'Zoom In Snap', category: 'motion', description: 'Dynamic zoom into incoming clip' },
  { id: 'zoom_out', name: 'Zoom Out Pull', category: 'motion', description: 'Smooth pull back reveal' },
  { id: 'slide_left', name: 'Slide Left', category: 'motion', description: 'Horizontal cinematic slide' },
  { id: 'slide_right', name: 'Slide Right', category: 'motion', description: 'Horizontal cinematic slide reverse' },
  { id: 'push_up', name: 'Push Up', category: 'motion', description: 'Vertical upward scene push' },
  { id: 'push_down', name: 'Push Down', category: 'motion', description: 'Vertical downward scene push' },
  { id: 'blur', name: 'Focus Blur', category: 'creative', description: 'Dreamy optical defocus transition' },
  { id: 'glitch', name: 'Digital Glitch', category: 'creative', description: 'Electronic signal distortion wipe' },
  { id: 'flash', name: 'White Flash', category: 'creative', description: 'High-energy studio light flash' },
  { id: 'wipe_left', name: 'Linear Wipe Left', category: 'creative', description: 'Clean geometric horizontal wipe' },
  { id: 'wipe_right', name: 'Linear Wipe Right', category: 'creative', description: 'Clean geometric horizontal wipe reverse' },
  { id: 'light_leak', name: 'Light Leak Flare', category: 'creative', description: 'Warm organic 35mm optical flare' }
];

export const EFFECT_CATALOG: Array<{
  id: EffectType;
  name: string;
  category: 'cinematic' | 'retro' | 'optical';
  description: string;
  defaultIntensity: number;
}> = [
  { id: 'film_grain', name: 'Film Grain 35mm', category: 'cinematic', description: 'Authentic analog photochemical texture', defaultIntensity: 35 },
  { id: 'vignette', name: 'Cinema Vignette', category: 'cinematic', description: 'Soft dark outer focal edge falloff', defaultIntensity: 45 },
  { id: 'glow', name: 'Diffusion Glow', category: 'optical', description: 'Soft luminous blooming on specular highlights', defaultIntensity: 40 },
  { id: 'gaussian_blur', name: 'Gaussian Blur', category: 'optical', description: 'Soft uniform optical defocus', defaultIntensity: 25 },
  { id: 'motion_blur', name: 'Motion Blur', category: 'optical', description: 'Directional kinetic shutter simulation', defaultIntensity: 30 },
  { id: 'sharpen', name: 'Edge Sharpen', category: 'optical', description: 'Crisp micro-contrast enhancement', defaultIntensity: 30 },
  { id: 'chromatic_aberration', name: 'Chromatic Aberration', category: 'optical', description: 'Prismatic RGB lens refraction', defaultIntensity: 35 },
  { id: 'rgb_split', name: 'RGB Split', category: 'retro', description: 'Color separation offset glitch', defaultIntensity: 40 },
  { id: 'glitch', name: 'Cyber Glitch', category: 'retro', description: 'Digital scanline tearing & displacement', defaultIntensity: 50 },
  { id: 'vhs', name: 'VHS Tape 1990s', category: 'retro', description: 'Analog magnetic tape tape artifacts & noise', defaultIntensity: 55 },
  { id: 'noise', name: 'Digital Sensor Noise', category: 'retro', description: 'Subtle high-ISO camera sensor static', defaultIntensity: 25 },
  { id: 'light_leak', name: 'Solar Light Leak', category: 'cinematic', description: 'Warm golden edge light bleeding', defaultIntensity: 40 }
];

export const ASPECT_RATIOS: Array<{
  id: AspectRatio;
  label: string;
  width: number;
  height: number;
  iconName: string;
  description: string;
}> = [
  { id: '9:16', label: '9:16 Shorts / Reels', width: 1080, height: 1920, iconName: 'Smartphone', description: 'TikTok, Instagram Reels, YouTube Shorts' },
  { id: '16:9', label: '16:9 Cinema / Landscape', width: 1920, height: 1080, iconName: 'Tv', description: 'YouTube, Television, Cinema Landscape' },
  { id: '1:1', label: '1:1 Square Feed', width: 1080, height: 1080, iconName: 'Square', description: 'Instagram Post, Square Video Feed' },
  { id: '4:5', label: '4:5 Portrait Feed', width: 1080, height: 1350, iconName: 'Smartphone', description: 'Instagram Portrait Feed' }
];

export function calculateTimelineDuration(clips?: TimelineClip[], fallbackMin: number = 5): number {
  if (!clips || clips.length === 0) return fallbackMin;
  const maxEnd = Math.max(...clips.map((c) => (c.start || 0) + (c.duration || 0)));
  return Math.max(0.5, Number(maxEnd.toFixed(2)));
}

export function createNewProject(name: string = 'Untitled Project', aspectRatio: AspectRatio = '9:16'): EditorProject {
  const defaultRatio = ASPECT_RATIOS.find((r) => r.id === aspectRatio) || ASPECT_RATIOS[0];
  const initialTracks: TimelineTrack[] = [
    { id: 'track-v2', name: 'Overlay / B-Roll (V2)', type: 'overlay', locked: false, muted: false, hidden: false, order: 0 },
    { id: 'track-v1', name: 'Main Video (V1)', type: 'video', locked: false, muted: false, hidden: false, order: 1 },
    { id: 'track-text', name: 'Titles & Captions', type: 'text', locked: false, muted: false, hidden: false, order: 2 },
    { id: 'track-a1', name: 'Voiceover / Speech (A1)', type: 'audio', locked: false, muted: false, hidden: false, order: 3 },
    { id: 'track-a2', name: 'Background Music (A2)', type: 'audio', locked: false, muted: false, hidden: false, order: 4 }
  ];

  return {
    id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    aspectRatio,
    customWidth: defaultRatio.width,
    customHeight: defaultRatio.height,
    duration: 5, // compact default; automatically matches video length when media is added
    fps: 30,
    tracks: initialTracks,
    clips: [],
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    previewQuality: '720p'
  };
}

