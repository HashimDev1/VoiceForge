export type JobStatus = 'review' | 'waiting' | 'generating' | 'completed' | 'failed' | 'animating' | 'animated';

export interface GenerationJob {
  id: string;
  index: number;
  sceneNumber: string; // e.g., "001"
  prompt: string;
  status: JobStatus;
  imageUrl?: string;
  imageMediaId?: string;
  videoUrl?: string;
  videoMediaId?: string;
  error?: string;
  usedModel?: string;
}

export interface AppSettings {
  imageModelQueue: string[];
  imageUniversalPrompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  
  videoModelQueue: string[];
  videoUniversalPrompt: string;
  videoDuration: number;
  
  batchSize: number;
  currentBatchIndex: number;
}
