import {
  AspectRatio,
  MotionTitleDesign,
  EditorProject
} from './videoEditorTypes';

export type DocumentaryTone =
  | 'cinematic_historical'
  | 'investigative_journalism'
  | 'nature_wildlife'
  | 'biographical_profile'
  | 'scientific_explainer'
  | 'true_crime'
  | 'modern_essay';

export interface DocumentaryScene {
  id: string;
  sceneNumber: number;
  title: string;
  narrationText: string;
  visualInstruction: string;
  sceneDescription: string;
  duration: number; // in seconds (minimum 1.0)
  voiceoverAsset?: {
    id: string;
    url: string;
    name: string;
    duration: number;
  };
  transcriptionSegments?: Array<{
    id: string;
    start: number; // relative to voiceover/scene start
    end: number;
    text: string;
    speaker?: string;
  }>;
  visualAsset?: {
    id: string;
    url: string;
    name: string;
    type: 'video' | 'image';
    duration?: number;
    thumbnailUrl?: string;
  };
  motionGraphic?: {
    enabled: boolean;
    templateId: string;
    type: 'opening' | 'heading' | 'lower_third' | 'closing';
    titleDesign: MotionTitleDesign;
    startTimeOffset: number; // offset in seconds from scene start
    duration: number; // display duration in seconds
  };
}

export interface DocumentaryProject {
  id: string;
  name: string;
  synopsis: string;
  tone: DocumentaryTone;
  aspectRatio: AspectRatio;
  scenes: DocumentaryScene[];
  captionSettings: {
    enabled: boolean;
    presetId: string;
    fontFamily?: string;
    fontSize?: number;
    activeColor?: string;
  };
  backgroundMusic?: {
    assetId?: string;
    url?: string;
    name?: string;
    volume: number; // 0 to 100
  };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentaryHandoffResult {
  success: boolean;
  editorProject: EditorProject;
  stats: {
    totalDuration: number;
    sceneCount: number;
    visualClipsCount: number;
    voiceoverClipsCount: number;
    titleClipsCount: number;
    captionCount: number;
  };
}

