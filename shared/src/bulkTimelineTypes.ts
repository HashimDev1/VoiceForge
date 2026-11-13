import {
  MediaAsset,
  TimelineClip,
  TrackType,
  TransitionType,
  AspectRatio
} from './videoEditorTypes';

export type BulkDurationMode = 'fixed' | 'numbered_list' | 'voiceover_sync';

export type BulkVideoShortfallBehavior =
  | 'hold_frame'
  | 'loop'
  | 'slow_motion'
  | 'warn';

export type BulkInsertionPlacement =
  | 'timeline_start'
  | 'playhead'
  | 'append'
  | 'new_track'
  | 'replace_selection';

export type BulkMissingDurationPolicy =
  | 'use_default'
  | 'keep_existing'
  | 'require_manual';

export interface BulkMediaItem {
  id: string; // unique item id in queue
  sequenceNumber: number; // 1-based sequence order
  asset: MediaAsset;
  filename: string;
  mediaType: 'image' | 'video' | 'audio';
  sourceDuration: number; // original source media duration in seconds
  assignedDuration: number; // timeline duration assigned to this item
  startTime: number; // computed start time in preview/timeline
  endTime: number; // computed end time in preview/timeline
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
  transcriptText?: string;
  shortfallAction?: BulkVideoShortfallBehavior;
  customSpeed?: number;
  isSelected?: boolean;
}

export interface BulkTimingRecord {
  sequenceNumber?: number;
  filename?: string;
  duration: number;
  start?: number;
  end?: number;
  text?: string;
  rawLine?: string;
}

export interface BulkTimingParseResult {
  success: boolean;
  records: BulkTimingRecord[];
  formatDetected: 'numbered_list' | 'csv' | 'key_value' | 'srt' | 'vtt' | 'timestamped_text' | 'unknown';
  errors: string[];
  warnings: string[];
  matchedCount: number;
  unmatchedCount: number;
}

export interface VoiceoverSegmentInput {
  index: number;
  start: number;
  end: number;
  duration: number;
  text: string;
}

export interface BulkArrangementPreset {
  id: string;
  name: string;
  description: string;
  durationMode: BulkDurationMode;
  defaultDuration: number;
  orderingMode: 'natural_numeric' | 'import_order' | 'alphabetical';
  imagePanZoom: boolean;
  videoShortfall: BulkVideoShortfallBehavior;
  autoMuteVideoAudio: boolean;
  defaultTransition: TransitionType;
  transitionDuration: number;
  placement: BulkInsertionPlacement;
  targetTrackType: TrackType;
  isCustom?: boolean;
}

export interface BulkArrangementProposal {
  items: BulkMediaItem[];
  totalDuration: number;
  totalClipsCount: number;
  imagesCount: number;
  videosCount: number;
  placement: BulkInsertionPlacement;
  targetTrackId?: string;
  targetTrackName?: string;
  voiceoverAsset?: MediaAsset;
  voiceoverTrackId?: string;
  hasErrors: boolean;
  warnings: string[];
  fps: number;
}

