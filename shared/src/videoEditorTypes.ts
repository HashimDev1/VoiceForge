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
  isMissing?: boolean;
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
  | 'volume'
  | 'blur'
  | 'letterSpacing'
  | 'tracking'
  | 'shadowIntensity';

export type MotionTitleCategory =
  | 'cinematic'
  | 'documentary'
  | 'minimal'
  | 'modern'
  | 'news'
  | 'corporate'
  | 'social_media'
  | 'dramatic';

export type MotionAnimationType =
  | 'none'
  | 'fade'
  | 'slide'
  | 'scale'
  | 'typewriter'
  | 'tracking_reveal'
  | 'blur_reveal'
  | 'mask_reveal'
  | 'word_by_word'
  | 'letter_by_letter'
  | 'glitch'
  | 'cinematic_zoom'
  | 'motion_blur';

export interface MotionAnimationConfig {
  type: MotionAnimationType;
  inDuration: number; // e.g. 0.6s
  outDuration: number; // e.g. 0.4s
  delay: number; // e.g. 0s
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bezier';
  bezier?: [number, number, number, number];
  direction?: 'left' | 'right' | 'up' | 'down' | 'center';
  intensity?: number; // 0 to 100
}

export interface MotionTitleDesign {
  id?: string;
  name?: string;
  category?: MotionTitleCategory;
  mainText: string;
  subtitleText?: string;
  taglineText?: string;

  // Typography
  fontFamily: string;
  fontSize: number; // in px
  fontWeight: number; // 300 to 900
  letterSpacing: number; // in px (-5 to 40)
  lineHeight: number; // relative
  textAlign: 'left' | 'center' | 'right';
  textColor: string; // hex or rgba

  // Subtitle Typography
  subtitleFontFamily?: string;
  subtitleFontSize?: number;
  subtitleFontWeight?: number;
  subtitleColor?: string;
  subtitleTracking?: number;

  // Gradient Text
  gradient?: {
    enabled: boolean;
    colors: string[];
    angle: number; // degrees
  };

  // Stroke / Outline
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
  };

  // Shadow
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    x: number;
    y: number;
    opacity: number;
  };

  // Background Box / Banner / Pill
  backgroundBox?: {
    enabled: boolean;
    color: string;
    opacity: number;
    paddingX: number;
    paddingY: number;
    borderRadius: number;
    blurBackdrop?: boolean;
    fullWidth?: boolean;
  };

  // Decorative Accent
  accentElement?: {
    enabled: boolean;
    type: 'line' | 'bar' | 'badge' | 'bracket' | 'pill';
    color: string;
    position: 'left' | 'top' | 'bottom' | 'right';
    width: number;
    height?: number;
    opacity?: number;
  };

  // Animation
  animation: MotionAnimationConfig;

  // Additional transform adjustments
  positionX?: number; // offset in px or %
  positionY?: number;
  scale?: number;
  rotation?: number;
}

export interface MotionTitleTemplate {
  id: string;
  name: string;
  category: MotionTitleCategory;
  description: string;
  design: MotionTitleDesign;
  duration: number; // default duration in seconds
  isCustom?: boolean;
  thumbnailUrl?: string;
}

export interface CustomFontAsset {
  id: string;
  name: string;
  fontFamily: string;
  filename: string;
  url: string;
  format: 'truetype' | 'opentype' | 'woff' | 'woff2';
  uploadedAt: string;
}

export interface Keyframe {
  id: string;
  time: number; // offset in seconds from clip start
  property: KeyframeProperty;
  value: number;
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bezier';
  bezier?: [number, number, number, number];
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
  titleDesign?: MotionTitleDesign;
  captionPresetId?: string;
  captionStyle?: any;
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

export interface ProjectBackground {
  type: 'color' | 'blur' | 'image';
  color?: string;
  imageUrl?: string;
  blurAmount?: number;
}

export interface ProjectVersionSnapshot {
  id: string;
  name: string;
  timestamp: string;
  clipsCount: number;
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
  background?: ProjectBackground;
  versions?: ProjectVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
  previewQuality: '360p' | '720p' | '1080p';
}

export interface EditorExportOptions {
  projectId?: string;
  resolution: '1080x1920' | '1920x1080' | '1080x1080' | '1080x1350' | '720p' | '1080p' | '4k' | '2160x3840' | '3840x2160';
  fps: 24 | 30 | 60;
  videoBitrate?: string;
  audioBitrate?: string;
  codec: 'h264' | 'hevc';
  filename?: string;
}

export type ExportMediaType = 'video' | 'image' | 'images_zip';

export interface EditorFrameExportOptions {
  projectId?: string;
  time: number; // playhead position in seconds
  format: 'png' | 'jpeg' | 'webp';
  resolution?: 'original' | '1080p' | '720p' | '4k';
  filename?: string;
}

export interface EditorFrameExportResult {
  success: boolean;
  frameUrl?: string;
  filename?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  error?: string;
}

export interface EditorImagesZipResult {
  success: boolean;
  zipUrl?: string;
  filename?: string;
  imageCount: number;
  fileSize?: number;
  error?: string;
}

export interface EditorExportJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  outputUrl?: string;
  filename?: string;
  error?: string;
  createdAt: string;
}

// ==========================================
// AUTO FACELESS VIDEO STUDIO TYPES
// ==========================================

export type FacelessVisualStyle =
  | 'cinematic'
  | 'dark_mystery'
  | 'cyberpunk'
  | 'anime'
  | 'pixar_3d'
  | 'vintage'
  | 'stock_video';

export interface FacelessScenePrompt {
  index: number;
  sentence: string;
  start: number;
  duration: number;
  visualPrompt: string;
  style: FacelessVisualStyle;
  assetUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface FacelessScriptRequest {
  script: string;
  voiceId?: string;
  style: FacelessVisualStyle;
  aspectRatio: AspectRatio;
  captionPreset?: string;
  customPrompts?: string[];
  projectName?: string;
}

export interface FacelessAudioRequest {
  audioUrl?: string;
  audioAssetId?: string;
  transcriptText?: string;
  transcript?: string;
  style: FacelessVisualStyle;
  aspectRatio: AspectRatio;
  captionPreset?: string;
  customPrompts?: string[];
  projectName?: string;
}

export interface FacelessGenerationResult {
  success: boolean;
  project: EditorProject;
  scenesCount: number;
  totalDuration: number;
  voiceoverUrl?: string;
  error?: string;
}

