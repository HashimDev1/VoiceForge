import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  MediaAsset,
  TransitionType,
  ClipTransform,
  TrackType
} from './videoEditorTypes';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS,
  calculateTimelineDuration
} from './videoEditorDefaults';
import {
  BulkMediaItem,
  BulkTimingRecord,
  BulkDurationMode,
  BulkVideoShortfallBehavior,
  BulkInsertionPlacement,
  BulkMissingDurationPolicy,
  VoiceoverSegmentInput,
  BulkArrangementPreset,
  BulkArrangementProposal
} from './bulkTimelineTypes';
import { naturalSort, matchTimingRecordsToMedia } from './bulkTimelineParser';

/**
 * Snap seconds to nearest integer frame at specified fps.
 * Eliminates floating point drift across 50-200 sequential clips.
 */
export function snapToFrame(seconds: number, fps: number = 30): number {
  if (fps <= 0) fps = 30;
  return Math.round(seconds * fps) / fps;
}

export function secondsToFrames(seconds: number, fps: number = 30): number {
  if (fps <= 0) fps = 30;
  return Math.round(seconds * fps);
}

export function framesToSeconds(frames: number, fps: number = 30): number {
  if (fps <= 0) fps = 30;
  return frames / fps;
}

/**
 * Builds an initial bulk media queue from an array of MediaAssets with natural numeric ordering.
 */
export function buildBulkMediaQueue(
  assets: MediaAsset[],
  options: {
    ordering?: 'natural_numeric' | 'import_order' | 'alphabetical';
    defaultDuration?: number;
    fps?: number;
  } = {}
): BulkMediaItem[] {
  const fps = options.fps || 30;
  const defDur = options.defaultDuration || 4.0;
  const ordering = options.ordering || 'natural_numeric';

  let orderedAssets = [...assets];
  if (ordering === 'natural_numeric') {
    orderedAssets = naturalSort(orderedAssets, (a) => a.name);
  } else if (ordering === 'alphabetical') {
    orderedAssets.sort((a, b) => a.name.localeCompare(b.name));
  }
  // 'import_order' leaves orderedAssets untouched

  let currentStartFrames = 0;

  return orderedAssets.map((asset, index) => {
    const seq = index + 1;
    const mediaType: 'image' | 'video' | 'audio' =
      asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'image';

    const sourceDuration =
      mediaType === 'video' && asset.duration > 0
        ? asset.duration
        : defDur;

    const assignedDuration = snapToFrame(
      mediaType === 'video' ? sourceDuration : defDur,
      fps
    );

    const durFrames = secondsToFrames(assignedDuration, fps);
    const startSec = framesToSeconds(currentStartFrames, fps);
    const endSec = framesToSeconds(currentStartFrames + durFrames, fps);
    currentStartFrames += durFrames;

    return {
      id: `bulk_${Date.now()}_${seq}_${Math.random().toString(36).substring(2, 6)}`,
      sequenceNumber: seq,
      asset,
      filename: asset.name,
      mediaType,
      sourceDuration,
      assignedDuration,
      startTime: startSec,
      endTime: endSec,
      status: 'valid'
    };
  });
}

/**
 * Re-indexes sequence numbers and recalculates start/end times across the queue.
 */
export function recalculateQueueTimings(
  items: BulkMediaItem[],
  fps: number = 30
): BulkMediaItem[] {
  let currentStartFrames = 0;
  return items.map((item, index) => {
    const seq = index + 1;
    const durFrames = Math.max(1, secondsToFrames(item.assignedDuration, fps));
    const assignedDuration = framesToSeconds(durFrames, fps);
    const startSec = framesToSeconds(currentStartFrames, fps);
    const endSec = framesToSeconds(currentStartFrames + durFrames, fps);
    currentStartFrames += durFrames;

    return {
      ...item,
      sequenceNumber: seq,
      assignedDuration,
      startTime: startSec,
      endTime: endSec
    };
  });
}

/**
 * Applies fixed duration to all items in the queue (or selected items).
 */
export function applyFixedDurationToQueue(
  items: BulkMediaItem[],
  duration: number,
  fps: number = 30,
  onlySelected: boolean = false
): BulkMediaItem[] {
  const snapped = snapToFrame(Math.max(0.1, duration), fps);
  const updated = items.map((it) => {
    if (onlySelected && !it.isSelected) return it;
    return {
      ...it,
      assignedDuration: snapped,
      status: 'valid' as const,
      statusMessage: undefined
    };
  });

  return recalculateQueueTimings(updated, fps);
}

/**
 * Applies custom parsed timing records to media items with fallback policies.
 */
export function applyCustomTimingToQueue(
  items: BulkMediaItem[],
  records: BulkTimingRecord[],
  missingPolicy: BulkMissingDurationPolicy = 'use_default',
  defaultDuration: number = 4.0,
  fps: number = 30
): { items: BulkMediaItem[]; warnings: string[] } {
  const matchResult = matchTimingRecordsToMedia(items, records, missingPolicy, defaultDuration);
  const updatedItems = matchResult.matchedItems.map((it) => ({
    ...it,
    assignedDuration: snapToFrame(Math.max(0.1, it.assignedDuration), fps)
  }));

  const timedItems = recalculateQueueTimings(updatedItems, fps);
  return {
    items: timedItems,
    warnings: matchResult.warnings
  };
}

/**
 * Synchronizes queue items with voiceover transcript sentence segments.
 */
export function applyVoiceoverSyncToQueue(
  items: BulkMediaItem[],
  segments: VoiceoverSegmentInput[],
  fps: number = 30,
  defaultDuration: number = 4.0
): { items: BulkMediaItem[]; warnings: string[] } {
  const warnings: string[] = [];
  if (segments.length === 0) {
    warnings.push('Voiceover contains no valid segments or speech timestamps.');
    return { items, warnings };
  }

  const updated: BulkMediaItem[] = [...items];

  // Map each segment to an item sequentially
  for (let i = 0; i < updated.length; i++) {
    const item = { ...updated[i] };
    if (i < segments.length) {
      const seg = segments[i];
      const dur = Math.max(0.2, seg.duration || (seg.end - seg.start));
      item.assignedDuration = snapToFrame(dur, fps);
      item.transcriptText = seg.text;
      item.status = 'valid';
    } else {
      // More media items than voiceover segments
      item.assignedDuration = snapToFrame(defaultDuration, fps);
      item.status = 'warning';
      item.statusMessage = `Exceeds voiceover segments. Defaulted to ${defaultDuration}s.`;
      warnings.push(`Item #${item.sequenceNumber} (${item.filename}) exceeds voiceover duration.`);
    }
    updated[i] = item;
  }

  if (segments.length > updated.length) {
    warnings.push(
      `Voiceover has ${segments.length} segments, but only ${updated.length} media items were imported.`
    );
  }

  return {
    items: recalculateQueueTimings(updated, fps),
    warnings
  };
}

/**
 * Generates Ken Burns pan/zoom keyframes or transforms for still images.
 */
export function createKenBurnsEffect(
  sequenceIndex: number,
  duration: number
): {
  transform: ClipTransform;
  keyframes: Array<{ id: string; time: number; property: 'scale' | 'x' | 'y' | 'opacity' | 'rotation'; value: number }>;
} {
  const pattern = sequenceIndex % 4;
  let startScale = 1.0;
  let endScale = 1.15;
  let startX = 0;
  let endX = 0;
  let startY = 0;
  let endY = 0;

  switch (pattern) {
    case 0: // Zoom In slowly
      startScale = 1.0;
      endScale = 1.15;
      break;
    case 1: // Zoom Out slowly
      startScale = 1.15;
      endScale = 1.0;
      break;
    case 2: // Pan Left to Right with subtle zoom
      startScale = 1.1;
      endScale = 1.1;
      startX = -5;
      endX = 5;
      break;
    case 3: // Pan Right to Left with subtle zoom
      startScale = 1.1;
      endScale = 1.1;
      startX = 5;
      endX = -5;
      break;
  }

  return {
    transform: {
      ...DEFAULT_TRANSFORM,
      scale: startScale,
      x: startX,
      y: startY,
      fitMode: 'fill'
    },
    keyframes: [
      {
        id: `kf_${sequenceIndex}_scale_start`,
        time: 0,
        property: 'scale',
        value: startScale
      },
      {
        id: `kf_${sequenceIndex}_scale_end`,
        time: duration,
        property: 'scale',
        value: endScale
      },
      {
        id: `kf_${sequenceIndex}_x_start`,
        time: 0,
        property: 'x',
        value: startX
      },
      {
        id: `kf_${sequenceIndex}_x_end`,
        time: duration,
        property: 'x',
        value: endX
      }
    ]
  };
}

export interface GenerateClipsOptions {
  targetTrackId: string;
  fps?: number;
  imagePanZoom?: boolean;
  videoShortfall?: BulkVideoShortfallBehavior;
  autoMuteVideoAudio?: boolean;
  defaultTransition?: TransitionType;
  transitionDuration?: number;
  startOffset?: number;
}

/**
 * Converts queue items into fully configured TimelineClips ready for insertion into EditorProject.
 */
export function generateTimelineClipsFromQueue(
  items: BulkMediaItem[],
  options: GenerateClipsOptions
): TimelineClip[] {
  const fps = options.fps || 30;
  const startOffsetFrames = secondsToFrames(options.startOffset || 0, fps);
  let currentStartFrames = startOffsetFrames;

  return items.map((item, index) => {
    const isImage = item.mediaType === 'image';
    const isVideo = item.mediaType === 'video';
    const isAudio = item.mediaType === 'audio';

    const durFrames = Math.max(1, secondsToFrames(item.assignedDuration, fps));
    const duration = framesToSeconds(durFrames, fps);
    const start = framesToSeconds(currentStartFrames, fps);
    currentStartFrames += durFrames;

    let sourceStart = 0;
    let sourceDuration = duration;
    let clipSpeed = { ...DEFAULT_SPEED };
    let shortfallAction = options.videoShortfall || 'hold_frame';

    if (isVideo && item.sourceDuration > 0) {
      if (item.sourceDuration < duration) {
        // Video is shorter than assigned timeline duration
        if (shortfallAction === 'slow_motion') {
          // Slow down video so source duration fills assigned duration
          const speedVal = Math.max(0.25, Math.min(4.0, Number((item.sourceDuration / duration).toFixed(2))));
          clipSpeed = { ...DEFAULT_SPEED, speed: speedVal };
          sourceDuration = item.sourceDuration;
        } else if (shortfallAction === 'loop') {
          // Keep normal speed, video player will loop
          sourceDuration = item.sourceDuration;
        } else {
          // hold_frame or warn: video source plays, last frame holds
          sourceDuration = item.sourceDuration;
        }
      } else {
        // Video is longer than assigned duration: trim smoothly
        sourceDuration = duration;
      }
    }

    // Audio settings: auto-mute video audio if requested
    const audioSettings = {
      ...DEFAULT_AUDIO_SETTINGS,
      muted: isVideo && options.autoMuteVideoAudio ? true : false,
      volume: isVideo && options.autoMuteVideoAudio ? 0 : 100
    };

    // Transform and Ken Burns keyframes for still images
    let transform: ClipTransform = { ...DEFAULT_TRANSFORM, fitMode: 'fill' };
    let keyframes: any[] = [];

    if (isImage && options.imagePanZoom) {
      const kb = createKenBurnsEffect(index, duration);
      transform = kb.transform;
      keyframes = kb.keyframes;
    }

    // Optional transition (except on first clip)
    let transitionIn: any = undefined;
    if (
      index > 0 &&
      options.defaultTransition &&
      options.defaultTransition !== 'none'
    ) {
      transitionIn = {
        type: options.defaultTransition,
        duration: snapToFrame(options.transitionDuration || 0.5, fps)
      };
    }

    return {
      id: `clip_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      trackId: options.targetTrackId,
      assetId: item.asset.id,
      name: item.filename,
      type: isImage ? 'image' : isAudio ? 'audio' : 'video',
      start,
      duration,
      sourceStart,
      sourceDuration,
      url: item.asset.url,
      text: item.transcriptText,
      transform,
      speed: clipSpeed,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: audioSettings,
      effects: [],
      keyframes,
      transitionIn
    };
  });
}

/**
 * Inserts generated clips into the EditorProject according to specified insertion placement.
 * Ensures single atomic state update and precise duration calculation.
 */
export function insertClipsIntoProject(
  project: EditorProject,
  newClips: TimelineClip[],
  placement: BulkInsertionPlacement,
  targetTrackId?: string,
  playhead: number = 0,
  fps: number = 30
): EditorProject {
  if (newClips.length === 0) return project;

  let tracks = [...project.tracks];
  let targetTrack = tracks.find((t) => t.id === targetTrackId);

  // If new track requested or no matching track exists
  if (placement === 'new_track' || !targetTrack) {
    const videoTrackCount = tracks.filter((t) => t.type === 'video' || t.type === 'overlay').length;
    const newTrackId = `track-v${videoTrackCount + 1}_${Date.now()}`;
    const newTrack: TimelineTrack = {
      id: newTrackId,
      name: `Video Track ${videoTrackCount + 1}`,
      type: 'video',
      locked: false,
      muted: false,
      hidden: false,
      order: videoTrackCount
    };
    tracks.push(newTrack);
    targetTrack = newTrack;
  }

  const assignedTargetTrackId = targetTrack.id;

  // Calculate start position based on placement mode
  let startSec = 0;
  if (placement === 'playhead') {
    startSec = snapToFrame(playhead, fps);
  } else if (placement === 'append') {
    const existingTrackClips = project.clips.filter((c) => c.trackId === assignedTargetTrackId);
    if (existingTrackClips.length > 0) {
      const maxEnd = Math.max(...existingTrackClips.map((c) => c.start + c.duration));
      startSec = snapToFrame(maxEnd, fps);
    } else {
      startSec = 0;
    }
  } else {
    // 'timeline_start' or 'replace_selection'
    startSec = 0;
  }

  // Offset new clips so they begin at startSec
  const totalNewDuration = newClips.reduce((acc, c) => acc + c.duration, 0);
  let offsetClips = newClips.map((c) => ({
    ...c,
    trackId: assignedTargetTrackId,
    start: snapToFrame(c.start + startSec, fps)
  }));

  let updatedClips: TimelineClip[] = [];

  if (placement === 'replace_selection') {
    // Filter out clips on target track that overlap with the new clips range
    const rangeStart = startSec;
    const rangeEnd = startSec + totalNewDuration;
    const remainingClips = project.clips.filter(
      (c) => c.trackId !== assignedTargetTrackId || c.start + c.duration <= rangeStart || c.start >= rangeEnd
    );
    updatedClips = [...remainingClips, ...offsetClips];
  } else if (placement === 'playhead' || placement === 'timeline_start') {
    // Ripple shift downstream clips on the same track
    const shiftDelta = totalNewDuration;
    const existingClips = project.clips.map((c) => {
      if (c.trackId === assignedTargetTrackId && c.start >= startSec) {
        return {
          ...c,
          start: snapToFrame(c.start + shiftDelta, fps)
        };
      }
      return c;
    });
    updatedClips = [...existingClips, ...offsetClips];
  } else {
    // 'append' or 'new_track': simply add
    updatedClips = [...project.clips, ...offsetClips];
  }

  const newProjectDuration = calculateTimelineDuration(updatedClips);

  return {
    ...project,
    tracks,
    clips: updatedClips,
    duration: newProjectDuration
  };
}

// =========================================================================
// CapCut-Style Timeline Bulk Editing Operations
// =========================================================================

/**
 * Bulk set exact duration for selected clips, with optional ripple shifting of downstream clips.
 */
export function bulkSetClipsDuration(
  allClips: TimelineClip[],
  targetClipIds: string[],
  newDuration: number,
  ripple: boolean = true,
  fps: number = 30
): TimelineClip[] {
  const targetSet = new Set(targetClipIds);
  const durSnapped = snapToFrame(Math.max(0.1, newDuration), fps);

  // Group by track to calculate ripple shifts per track
  const trackMap = new Map<string, TimelineClip[]>();
  for (const clip of allClips) {
    if (!trackMap.has(clip.trackId)) trackMap.set(clip.trackId, []);
    trackMap.get(clip.trackId)!.push(clip);
  }

  const resultClips: TimelineClip[] = [];

  for (const [_trackId, trackClips] of trackMap.entries()) {
    const sorted = [...trackClips].sort((a, b) => a.start - b.start);
    let cumulativeShift = 0;

    for (const clip of sorted) {
      if (targetSet.has(clip.id)) {
        const delta = durSnapped - clip.duration;
        const newStart = ripple ? snapToFrame(clip.start + cumulativeShift, fps) : clip.start;
        resultClips.push({
          ...clip,
          start: newStart,
          duration: durSnapped
        });
        if (ripple) cumulativeShift += delta;
      } else {
        const newStart = ripple ? snapToFrame(clip.start + cumulativeShift, fps) : clip.start;
        resultClips.push({
          ...clip,
          start: newStart
        });
      }
    }
  }

  return resultClips;
}

/**
 * Bulk scale duration of selected clips proportionally by scaleFactor (e.g. 1.5x or 0.8x).
 */
export function bulkScaleClipsDuration(
  allClips: TimelineClip[],
  targetClipIds: string[],
  scaleFactor: number,
  ripple: boolean = true,
  fps: number = 30
): TimelineClip[] {
  const targetSet = new Set(targetClipIds);
  const factor = Math.max(0.1, Math.min(10.0, scaleFactor));

  const trackMap = new Map<string, TimelineClip[]>();
  for (const clip of allClips) {
    if (!trackMap.has(clip.trackId)) trackMap.set(clip.trackId, []);
    trackMap.get(clip.trackId)!.push(clip);
  }

  const resultClips: TimelineClip[] = [];

  for (const [_trackId, trackClips] of trackMap.entries()) {
    const sorted = [...trackClips].sort((a, b) => a.start - b.start);
    let cumulativeShift = 0;

    for (const clip of sorted) {
      if (targetSet.has(clip.id)) {
        const newDur = snapToFrame(Math.max(0.1, clip.duration * factor), fps);
        const delta = newDur - clip.duration;
        const newStart = ripple ? snapToFrame(clip.start + cumulativeShift, fps) : clip.start;
        resultClips.push({
          ...clip,
          start: newStart,
          duration: newDur
        });
        if (ripple) cumulativeShift += delta;
      } else {
        const newStart = ripple ? snapToFrame(clip.start + cumulativeShift, fps) : clip.start;
        resultClips.push({
          ...clip,
          start: newStart
        });
      }
    }
  }

  return resultClips;
}

/**
 * Bulk update transform (scale, position, fit) on selected clips.
 */
export function bulkSetClipsTransform(
  allClips: TimelineClip[],
  targetClipIds: string[],
  patch: Partial<ClipTransform>
): TimelineClip[] {
  const targetSet = new Set(targetClipIds);
  return allClips.map((clip) => {
    if (!targetSet.has(clip.id)) return clip;
    return {
      ...clip,
      transform: {
        ...(clip.transform || DEFAULT_TRANSFORM),
        ...patch
      }
    };
  });
}

/**
 * Bulk set fit mode on selected clips.
 */
export function bulkSetClipsFitMode(
  allClips: TimelineClip[],
  targetClipIds: string[],
  fit: 'cover' | 'contain' | 'fill' | 'fit' | 'custom'
): TimelineClip[] {
  const fitMode: 'fit' | 'fill' | 'custom' =
    fit === 'contain' ? 'fit' : fit === 'cover' ? 'fill' : (fit as any);
  return bulkSetClipsTransform(allClips, targetClipIds, { fitMode });
}

/**
 * Bulk apply transition to all selected clips.
 */
export function bulkApplyClipsTransition(
  allClips: TimelineClip[],
  targetClipIds: string[],
  transitionType: TransitionType,
  duration: number = 0.5,
  fps: number = 30
): TimelineClip[] {
  const targetSet = new Set(targetClipIds);
  const durSnapped = snapToFrame(duration, fps);

  return allClips.map((clip) => {
    if (!targetSet.has(clip.id)) return clip;
    return {
      ...clip,
      transitionIn:
        transitionType === 'none'
          ? undefined
          : {
              type: transitionType,
              duration: durSnapped
            }
    };
  });
}

/**
 * Bulk update color grading presets/adjustments on selected clips.
 */
export function bulkSetClipsColorGrading(
  allClips: TimelineClip[],
  targetClipIds: string[],
  patch: any
): TimelineClip[] {
  const targetSet = new Set(targetClipIds);
  return allClips.map((clip) => {
    if (!targetSet.has(clip.id)) return clip;
    return {
      ...clip,
      colorGrading: {
        ...(clip.colorGrading || DEFAULT_COLOR_GRADING),
        ...patch
      }
    };
  });
}

/**
 * Bulk mute/unmute audio across selected clips.
 */
export function bulkMuteClipsAudio(
  allClips: TimelineClip[],
  targetClipIds: string[],
  muted: boolean
): TimelineClip[] {
  const targetSet = new Set(targetClipIds);
  return allClips.map((clip) => {
    if (!targetSet.has(clip.id)) return clip;
    return {
      ...clip,
      audio: {
        ...(clip.audio || DEFAULT_AUDIO_SETTINGS),
        muted,
        volume: muted ? 0 : 100
      }
    };
  });
}

/**
 * Ripple delete multiple selected clips, automatically closing gaps on each affected track.
 */
export function bulkRippleDeleteClips(
  allClips: TimelineClip[],
  clipIdsToDelete: string[],
  fps: number = 30
): TimelineClip[] {
  const deleteSet = new Set(clipIdsToDelete);

  // Group by track
  const trackMap = new Map<string, TimelineClip[]>();
  for (const clip of allClips) {
    if (!trackMap.has(clip.trackId)) trackMap.set(clip.trackId, []);
    trackMap.get(clip.trackId)!.push(clip);
  }

  const resultClips: TimelineClip[] = [];

  for (const [_trackId, trackClips] of trackMap.entries()) {
    const sorted = [...trackClips].sort((a, b) => a.start - b.start);
    let cumulativeShift = 0;

    for (const clip of sorted) {
      if (deleteSet.has(clip.id)) {
        cumulativeShift += clip.duration;
      } else {
        resultClips.push({
          ...clip,
          start: snapToFrame(Math.max(0, clip.start - cumulativeShift), fps)
        });
      }
    }
  }

  return resultClips;
}

/**
 * Reverse the sequential order of selected clips along the timeline.
 */
export function bulkReverseClipsOrder(
  allClips: TimelineClip[],
  targetClipIds: string[],
  fps: number = 30
): TimelineClip[] {
  if (targetClipIds.length < 2) return allClips;
  const targetSet = new Set(targetClipIds);

  const selectedClips = allClips
    .filter((c) => targetSet.has(c.id))
    .sort((a, b) => a.start - b.start);

  if (selectedClips.length < 2) return allClips;

  const minStart = selectedClips[0].start;
  const reversed = [...selectedClips].reverse();

  let curStart = minStart;
  const newPositions = new Map<string, number>();

  for (const clip of reversed) {
    newPositions.set(clip.id, snapToFrame(curStart, fps));
    curStart += clip.duration;
  }

  return allClips.map((clip) => {
    if (newPositions.has(clip.id)) {
      return {
        ...clip,
        start: newPositions.get(clip.id)!
      };
    }
    return clip;
  });
}

/**
 * Shuffle the order of selected clips randomly along the timeline.
 */
export function bulkShuffleClipsOrder(
  allClips: TimelineClip[],
  targetClipIds: string[],
  fps: number = 30
): TimelineClip[] {
  if (targetClipIds.length < 2) return allClips;
  const targetSet = new Set(targetClipIds);

  const selectedClips = allClips
    .filter((c) => targetSet.has(c.id))
    .sort((a, b) => a.start - b.start);

  if (selectedClips.length < 2) return allClips;

  const minStart = selectedClips[0].start;

  // Fisher-Yates shuffle
  const shuffled = [...selectedClips];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let curStart = minStart;
  const newPositions = new Map<string, number>();

  for (const clip of shuffled) {
    newPositions.set(clip.id, snapToFrame(curStart, fps));
    curStart += clip.duration;
  }

  return allClips.map((clip) => {
    if (newPositions.has(clip.id)) {
      return {
        ...clip,
        start: newPositions.get(clip.id)!
      };
    }
    return clip;
  });
}
