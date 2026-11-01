export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | 'custom';

export type TrackType = 'video' | 'audio' | 'image' | 'text' | 'caption' | 'overlay';

export type MediaType = 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: MediaType;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  fileSize?: number;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ClipTransform {
  x: number; // offset in percentage (-100 to 100) or pixels
  y: number;
  scale: number; // 1 = 100%
  rotation: number; // degrees -180 to 180
  opacity: number; // 0.0 to 1.0
  flipH: boolean;
  flipV: boolean;
  cropTop: number; // percentage 0-100
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  fitMode: 'fit' | 'fill' | 'custom';
}

export interface ClipSpeed {
  speed: number; // 0.25 to 4.0
  reverse: boolean;
  preservePitch: boolean;
  isFreezeFrame?: boolean;
}

export interface ColorGrading {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  temperature: number; // -100 to 100 (warm/cool)
  tint: number; // -100 to 100 (green/magenta)
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  whites: number; // -100 to 100
  blacks: number; // -100 to 100
  gamma: number; // 0.1 to 3.0
  hue: number; // 0 to 360
  preset?: string;
}

export interface ClipAudioSettings {
  volume: number; // 0 to 200
  muted: boolean;
  fadeInDuration: number; // seconds
  fadeOutDuration: number; // seconds
  ducking: boolean;
  duckingAmount?: number;
  pitch: number; // -12 to +12 semitones
  equalizer?: 'flat' | 'bass_boost' | 'vocal_clarity' | 'warm' | 'treble';
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'zoom_in'
  | 'zoom_out'
  | 'slide_left'
  | 'slide_right'
  | 'push_up'
  | 'push_down'
  | 'blur'
  | 'glitch'
  | 'wipe_left'
  | 'wipe_right'
  | 'flash'
  | 'light_leak';

export interface ClipTransition {
  type: TransitionType;
  duration: number; // seconds (0.1 to 2.0)
  easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
}

export type EffectType =
  | 'film_grain'
  | 'gaussian_blur'
  | 'motion_blur'
  | 'glow'
  | 'vignette'
  | 'sharpen'
  | 'chromatic_aberration'
  | 'rgb_split'
  | 'glitch'
  | 'vhs'
  | 'noise'
  | 'light_leak';

export interface ClipEffect {
  id: string;
  type: EffectType;
  intensity: number; // 0 to 100
  enabled: boolean;
}

export type KeyframeProperty =
  | 'positionX'
  | 'positionY'
  | 'scale'
  | 'rotation'
  | 'opacity'
  | 'volume';

export interface Keyframe {
  id: string;
  time: number; // offset in seconds from clip start
  property: KeyframeProperty;
  value: number;
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId?: string;
  name: string;
  type: TrackType;
  start: number; // timeline start time in seconds
  duration: number; // duration on timeline in seconds
  sourceStart: number; // trim offset from original source media in seconds
  sourceDuration: number; // source duration
  url?: string;
  text?: string;
  captionPresetId?: string;
  transform: ClipTransform;
  speed: ClipSpeed;
  colorGrading: ColorGrading;
  audio: ClipAudioSettings;
  transitionIn?: ClipTransition;
  transitionOut?: ClipTransition;
  effects: ClipEffect[];
  keyframes: Keyframe[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  solo?: boolean;
  order: number;
}

export interface EditorProject {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  customWidth?: number;
  customHeight?: number;
  duration: number;
  fps: number;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  assets: MediaAsset[];
  createdAt: string;
  updatedAt: string;
  previewQuality: '360p' | '720p' | '1080p';
}

export interface EditorExportOptions {
  projectId?: string;
  resolution: '1080x1920' | '1920x1080' | '1080x1080' | '1080x1350' | '720p' | '1080p';
  fps: 24 | 30 | 60;
  videoBitrate?: string;
  audioBitrate?: string;
  codec: 'h264' | 'hevc';
  filename?: string;
}

export interface EditorExportJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  stage: string;
  outputUrl?: string;
  filename?: string;
  error?: string;
  createdAt: string;
}

