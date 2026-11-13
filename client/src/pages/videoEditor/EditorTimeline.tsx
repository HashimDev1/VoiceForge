import React, { useRef, useState, useMemo } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Plus,
  ArrowRight,
  Maximize2,
  Sparkles,
  Music,
  Radio,
  MousePointer,
  RotateCcw,
  Shuffle,
  Layers,
  Clock,
  SlidersHorizontal,
  ArrowLeftRight,
  CheckSquare,
  Film
} from 'lucide-react';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  TrackType
} from '../../../../shared/src/videoEditorTypes';
import { unlockAudio } from '../../lib/audioUnlocker';

interface EditorTimelineProps {
  project: EditorProject;
  playhead: number;
  onSeek: (time: number) => void;
  selectedClipIds: string[];
  onSelectClip: (clipId: string | null, isMulti?: boolean) => void;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  activeTool: 'select' | 'split' | 'crop';
  setActiveTool: (tool: 'select' | 'split' | 'crop') => void;
  onSplitClip: (clipId?: string) => void;
  onDeleteClip: (clipId: string) => void;
  onDeleteSelected: () => void;
  onDuplicateClip: (clipId: string) => void;
  onRippleDelete: (clipId: string) => void;
  onFreezeFrame: (clipId?: string) => void;
  onTrimClipStart: (clipId: string, newStart: number) => void;
  onTrimClipEnd: (clipId: string, newEnd: number) => void;
  onMoveClip: (clipId: string, targetTrackId: string, newStart: number) => void;
  onToggleTrackLock: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackSolo?: (trackId: string) => void;
  onToggleTrackHidden: (trackId: string) => void;
  onCopySelection?: () => void;
  onPasteClips?: () => void;
  onSelectAllClips?: () => void;
  onBulkSetDuration?: (clipIds: string[], duration: number, ripple?: boolean) => void;
  onBulkScaleDuration?: (clipIds: string[], scaleFactor: number, ripple?: boolean) => void;
  onBulkSetFitMode?: (clipIds: string[], fit: 'cover' | 'contain' | 'fill') => void;
  onBulkApplyTransition?: (clipIds: string[], transitionType: any, duration?: number) => void;
  onBulkMuteAudio?: (clipIds: string[], muted: boolean) => void;
  onBulkRippleDeleteSelected?: () => void;
  onBulkReverseSelected?: () => void;
  onBulkShuffleSelected?: () => void;
  onSeparateAudio?: (clipId: string) => void;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  project,
  playhead,
  onSeek,
  selectedClipIds,
  onSelectClip,
  selectedTrackId,
  onSelectTrack,
  zoom,
  setZoom,
  snapEnabled,
  onToggleSnap,
  activeTool,
  setActiveTool,
  onSplitClip,
  onDeleteClip,
  onDeleteSelected,
  onDuplicateClip,
  onRippleDelete,
  onFreezeFrame,
  onTrimClipStart,
  onTrimClipEnd,
  onMoveClip,
  onToggleTrackLock,
  onToggleTrackMute,
  onToggleTrackSolo,
  onToggleTrackHidden,
  onCopySelection,
  onPasteClips,
  onSelectAllClips,
  onBulkSetDuration,
  onBulkScaleDuration,
  onBulkSetFitMode,
  onBulkApplyTransition,
  onBulkMuteAudio,
  onBulkRippleDeleteSelected,
  onBulkReverseSelected,
  onBulkShuffleSelected,
  onSeparateAudio
}) => {
  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    clipId: string;
    mode: 'move' | 'trim-start' | 'trim-end';
    startX: number;
    startY: number;
    origStart: number;
    origDuration: number;
    trackId: string;
  } | null>(null);

  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isNeedleHovered, setIsNeedleHovered] = useState<boolean>(false);
  const [bulkDurationOpen, setBulkDurationOpen] = useState<boolean>(false);
  const [bulkDurValue, setBulkDurValue] = useState<string>('3.0');
  const scrubberDragRef = useRef<boolean>(false);
  const rulerDragRef = useRef<boolean>(false);

  const formatTimecode = (seconds: number): string => {
    const s = Math.max(0, seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const pxPerSecond = 45 * zoom;
  const projectDur = Math.max(1, project.duration || 5);
  const totalWidthPx = Math.max(900, Math.ceil((projectDur + 2) * pxPerSecond));

  // Ruler tick marks (every 1s, 2s, or 5s depending on zoom)
  const step = zoom >= 2 ? 1 : zoom >= 0.8 ? 2 : 5;
  const ticks = useMemo(() => {
    const list = [];
    const maxTick = Math.ceil(projectDur + 1);
    for (let t = 0; t <= maxTick; t += step) {
      list.push(t);
    }
    return list;
  }, [projectDur, step]);

  const getTimeFromClientX = (clientX: number): number => {
    if (!timelineTracksRef.current) return 0;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const scrollLeft = timelineTracksRef.current.scrollLeft || 0;
    const x = clientX - rect.left + scrollLeft;
    const dur = project.duration || 5;
    let time = Math.max(0, Math.min(dur, x / pxPerSecond));

    // Magnetic snapping if enabled
    if (snapEnabled) {
      const snapThreshold = 0.15; // 150ms snap threshold
      if (time < snapThreshold) {
        time = 0;
      } else if (Math.abs(time - dur) < snapThreshold) {
        time = dur;
      } else {
        for (const clip of project.clips) {
          if (Math.abs(time - clip.start) < snapThreshold) {
            time = clip.start;
            break;
          }
          if (Math.abs(time - (clip.start + clip.duration)) < snapThreshold) {
            time = clip.start + clip.duration;
            break;
          }
        }
      }
    }
    return Number(time.toFixed(2));
  };

  const handleScrubberPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    unlockAudio();
    scrubberDragRef.current = true;
    setIsScrubbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const time = getTimeFromClientX(e.clientX);
    onSeek(time);
  };

  const handleScrubberPointerMove = (e: React.PointerEvent) => {
    if (!scrubberDragRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const time = getTimeFromClientX(e.clientX);
    onSeek(time);
  };

  const handleScrubberPointerUp = (e: React.PointerEvent) => {
    if (scrubberDragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      scrubberDragRef.current = false;
      setIsScrubbing(false);
    }
  };

  const handleRulerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    unlockAudio();
    rulerDragRef.current = true;
    setIsScrubbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const time = getTimeFromClientX(e.clientX);
    onSeek(time);
  };

  const handleRulerPointerMove = (e: React.PointerEvent) => {
    if (!rulerDragRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const time = getTimeFromClientX(e.clientX);
    onSeek(time);
  };

  const handleRulerPointerUp = (e: React.PointerEvent) => {
    if (rulerDragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      rulerDragRef.current = false;
      setIsScrubbing(false);
    }
  };

  const handleTracksPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-clip-id]') || target.closest('button')) {
      return;
    }
    unlockAudio();
    const time = getTimeFromClientX(e.clientX);
    onSeek(time);
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (activeTool === 'split') {
      onSplitClip(clip.id);
      return;
    }

    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    onSelectClip(clip.id, isMulti);
    onSelectTrack(clip.trackId);

    dragRef.current = {
      clipId: clip.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origStart: clip.start,
      origDuration: clip.duration,
      trackId: clip.trackId
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { clipId, mode, startX, origStart, origDuration, trackId } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaTime = deltaX / pxPerSecond;

    if (mode === 'move') {
      let newStart = Math.max(0, origStart + deltaTime);
      if (snapEnabled) {
        if (newStart < 0.1) newStart = 0;
        for (const c of project.clips) {
          if (c.id === clipId) continue;
          if (Math.abs(newStart - (c.start + c.duration)) < 0.15) {
            newStart = c.start + c.duration;
            break;
          }
          if (Math.abs(newStart + origDuration - c.start) < 0.15) {
            newStart = Math.max(0, c.start - origDuration);
            break;
          }
        }
      }
      onMoveClip(clipId, trackId, Number(newStart.toFixed(2)));
    } else if (mode === 'trim-start') {
      const candidateStart = origStart + deltaTime;
      const candidateDuration = origDuration - deltaTime;
      if (candidateDuration >= 0.2 && candidateStart >= 0) {
        onTrimClipStart(clipId, Number(candidateStart.toFixed(2)));
      }
    } else if (mode === 'trim-end') {
      const candidateDuration = Math.max(0.2, origDuration + deltaTime);
      onTrimClipEnd(clipId, Number((origStart + candidateDuration).toFixed(2)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragRef.current = null;
    }
  };

  // Synchronize vertical scroll between track headers and timeline lanes
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (trackHeadersRef.current) {
      trackHeadersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const primarySelectedClipId = selectedClipIds[0] || null;
  const primarySelectedClip = project.clips.find((c) => c.id === primarySelectedClipId);
  const allSelectedMuted =
    selectedClipIds.length > 0 &&
    selectedClipIds.every((id) => Boolean(project.clips.find((c) => c.id === id)?.audio?.muted));

  return (
    <section className="flex flex-col h-full w-full bg-[#181B20] overflow-hidden select-none text-[#E4E7EC]">
      {/* 1. Timeline Toolbar Deck (CapCut Exact Layout) */}
      <div className="h-9 shrink-0 bg-[#181B20] border-b border-[#262A34] px-3 flex items-center justify-between text-xs">
        {/* Left Action Buttons: +, Select, Split, Delete, Freeze, Reverse, Crop */}
        <div className="flex items-center gap-1">
          {/* Add Track (+) */}
          <button
            type="button"
            onClick={() => onSelectClip(null)}
            title="Add Media / New Track"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* Select Tool (V) */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            title="Selection Tool (V)"
            className={`p-1.5 rounded transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-[#282D38] text-[#13E2CA]'
                : 'text-slate-400 hover:text-white hover:bg-[#222631]'
            }`}
          >
            <MousePointer className="h-3.5 w-3.5" />
          </button>

          {/* Razor / Split Tool (C / Ctrl+B) */}
          <button
            type="button"
            onClick={() => setActiveTool('split')}
            title="Split Tool (C / Ctrl+B)"
            className={`p-1.5 rounded transition cursor-pointer ${
              activeTool === 'split'
                ? 'bg-[#282D38] text-[#13E2CA]'
                : 'text-slate-400 hover:text-white hover:bg-[#222631]'
            }`}
          >
            <Scissors className="h-3.5 w-3.5" />
          </button>

          {/* Quick Split at Playhead */}
          <button
            type="button"
            onClick={() => onSplitClip()}
            title="Split at Playhead (S)"
            className="p-1.5 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Scissors className="h-3.5 w-3.5 text-[#13E2CA]" />
          </button>

          {/* Delete (Del) */}
          {selectedClipIds.length > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete Selected Clip(s) (Del)"
              className="p-1.5 rounded hover:bg-[#282D38] text-rose-400 hover:text-rose-300 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Freeze Frame (F) */}
          <button
            type="button"
            onClick={() => onFreezeFrame(primarySelectedClipId || undefined)}
            title="Freeze Frame at playhead (F)"
            className="p-1.5 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </button>

          {/* Reverse Selected Video */}
          {onBulkReverseSelected && (
            <button
              type="button"
              onClick={onBulkReverseSelected}
              title="Reverse Selected Clip"
              className="p-1.5 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Crop Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('crop')}
            title="Crop Clip"
            className={`p-1.5 rounded transition cursor-pointer ${
              activeTool === 'crop'
                ? 'bg-[#282D38] text-[#13E2CA]'
                : 'text-slate-400 hover:text-white hover:bg-[#222631]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>

          {/* Mute / Unmute Selected Audio */}
          {onBulkMuteAudio && selectedClipIds.length > 0 && (
            <button
              type="button"
              onClick={() => onBulkMuteAudio(selectedClipIds, !allSelectedMuted)}
              title={allSelectedMuted ? 'Unmute Selected Audio' : 'Mute Selected Audio'}
              className={`p-1.5 rounded transition cursor-pointer ${
                allSelectedMuted
                  ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-950/60'
                  : 'text-slate-400 hover:text-white hover:bg-[#282D38]'
              }`}
            >
              {allSelectedMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Separate Audio from Video (Extract Audio Track) */}
          {onSeparateAudio && primarySelectedClip?.type === 'video' && (
            <button
              type="button"
              onClick={() => onSeparateAudio(primarySelectedClip.id)}
              title="Separate Audio: Extract video audio to dedicated audio track"
              className="p-1.5 rounded hover:bg-[#282D38] text-sky-400 hover:text-sky-300 transition cursor-pointer"
            >
              <Music className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Bulk Editing Strip (When multiple clips selected) */}
          {selectedClipIds.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#14171C] px-2 py-0.5 rounded border border-[#262A34] ml-2">
              <span className="text-[10px] font-sans font-bold text-[#13E2CA]">
                {selectedClipIds.length} Selected
              </span>

              {/* Bulk Mute / Unmute Toggle */}
              {onBulkMuteAudio && (
                <button
                  type="button"
                  onClick={() => onBulkMuteAudio(selectedClipIds, !allSelectedMuted)}
                  title={allSelectedMuted ? 'Unmute All Selected Clips' : 'Mute All Selected Clips'}
                  className={`flex items-center gap-1 h-5 px-1.5 rounded border text-[10px] font-mono cursor-pointer transition ${
                    allSelectedMuted
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                      : 'bg-[#1A3838] border-[#13E2CA]/40 text-[#13E2CA]'
                  }`}
                >
                  {allSelectedMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                  <span>{allSelectedMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              )}

              {/* Bulk Duration Popover Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBulkDurationOpen((v) => !v)}
                  title="Bulk Set Duration for selected clips"
                  className="flex items-center gap-1 h-5 px-1.5 rounded bg-[#1A3838] border border-[#13E2CA]/40 text-[10px] font-mono text-[#13E2CA] cursor-pointer"
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>Duration</span>
                </button>

                {bulkDurationOpen && (
                  <div className="absolute top-7 left-0 z-50 rounded-lg border border-[#2D3340] bg-[#1E222B] p-2.5 shadow-2xl flex flex-col gap-2 w-48 animate-in fade-in text-xs">
                    <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase">
                      Set Duration ({selectedClipIds.length} clips)
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[2, 3, 4, 5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            if (onBulkSetDuration) onBulkSetDuration(selectedClipIds, d, true);
                            setBulkDurationOpen(false);
                          }}
                          className="py-1 rounded bg-[#14171C] hover:bg-[#13E2CA] hover:text-black text-slate-200 font-mono text-xs font-bold cursor-pointer transition"
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        step="0.25"
                        min="0.1"
                        value={bulkDurValue}
                        onChange={(e) => setBulkDurValue(e.target.value)}
                        className="w-16 bg-[#14171C] border border-[#262A34] rounded px-1.5 py-0.5 text-xs font-mono text-white outline-none focus:border-[#13E2CA]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(bulkDurValue);
                          if (val > 0 && onBulkSetDuration) {
                            onBulkSetDuration(selectedClipIds, val, true);
                            setBulkDurationOpen(false);
                          }
                        }}
                        className="flex-1 py-1 rounded bg-[#13E2CA] hover:bg-[#00F2DC] text-black font-sans text-xs font-bold cursor-pointer transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Fit Mode */}
              {onBulkSetFitMode && (
                <div className="flex items-center gap-0.5 bg-[#1E222B] rounded p-0.5 text-[10px] border border-[#262A34]">
                  <button
                    type="button"
                    onClick={() => onBulkSetFitMode(selectedClipIds, 'cover')}
                    title="Fit Cover (fill frame without bars)"
                    className="px-1.5 py-0.5 rounded hover:bg-[#282D38] text-slate-300 font-medium cursor-pointer transition"
                  >
                    Cover
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkSetFitMode(selectedClipIds, 'contain')}
                    title="Fit Contain (letterbox full image)"
                    className="px-1.5 py-0.5 rounded hover:bg-[#282D38] text-slate-300 font-medium cursor-pointer transition"
                  >
                    Fit
                  </button>
                </div>
              )}

              {/* Bulk Ripple Delete */}
              {onBulkRippleDeleteSelected && (
                <button
                  type="button"
                  onClick={onBulkRippleDeleteSelected}
                  title="Ripple delete all selected clips"
                  className="p-1 rounded hover:bg-[#282D38] text-rose-400 cursor-pointer transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Tools: Mic, Auto-Snapping, Track Link, Magnet, Zoom (CapCut exact right cluster) */}
        <div className="flex items-center gap-1.5">
          {/* Record / Mic */}
          <button
            type="button"
            title="Record Voiceover"
            className="p-1.5 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5" />
          </button>

          {/* Auto Snapping [>|<] */}
          <button
            type="button"
            onClick={onToggleSnap}
            title={snapEnabled ? 'Auto Snapping ON' : 'Auto Snapping OFF'}
            className={`p-1.5 rounded transition cursor-pointer ${
              snapEnabled ? 'bg-[#1E2C33] text-[#13E2CA]' : 'text-slate-400 hover:text-white hover:bg-[#282D38]'
            }`}
          >
            <Magnet className="h-3.5 w-3.5" />
          </button>

          {/* Track Magnet / Ripple Edit */}
          <button
            type="button"
            onClick={onToggleSnap}
            title="Main Track Magnet ON"
            className="p-1.5 rounded bg-[#1E2C33] text-[#13E2CA] transition cursor-pointer"
          >
            <span className="font-bold text-[11px] leading-none">[🧲]</span>
          </button>

          {/* Track Link */}
          <button
            type="button"
            title="Link / Group Clips"
            className="p-1.5 rounded bg-[#1E2C33] text-[#13E2CA] transition cursor-pointer"
          >
            <span className="font-bold text-[11px] leading-none">[🔗]</span>
          </button>

          <div className="w-px h-3.5 bg-[#262A34] mx-1" />

          {/* Zoom Slider */}
          <div className="flex items-center gap-1 bg-[#14171C] px-1.5 py-0.5 rounded border border-[#262A34]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
              title="Zoom out"
              className="p-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <input
              type="range"
              min="0.4"
              max="4.0"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#2D3340] rounded appearance-none cursor-pointer accent-[#13E2CA]"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.2).toFixed(1))))}
              title="Zoom in"
              className="p-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Multitrack Workspace Grid */}
      <div className="flex min-w-0 flex-1 overflow-hidden relative bg-[#121418]">
        {/* Left Track Headers Deck (CapCut Cover Button + Track Controls) */}
        <div className="w-36 shrink-0 border-r border-[#262A34] bg-[#14171C] flex flex-col z-20">
          {/* Header spacer aligned with time ruler */}
          <div className="h-6 border-b border-[#262A34] bg-[#181B20] px-2 flex items-center justify-between text-[10px] font-sans text-slate-400 font-medium">
            <span>TRACKS</span>
            <span className="text-[9px] text-[#13E2CA]">M · L · V</span>
          </div>

          {/* Scrollable Track Header List */}
          <div
            ref={trackHeadersRef}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {project.tracks.map((track, trackIdx) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`h-14 shrink-0 border-b border-[#20242D] px-2 flex items-center justify-between transition cursor-pointer ${
                  selectedTrackId === track.id
                    ? 'bg-[#1E222B] border-l-2 border-l-[#13E2CA]'
                    : 'hover:bg-[#1A1D24]'
                }`}
              >
                {/* Top Track (Main Track) has CapCut "Cover" Button */}
                {trackIdx === 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-8 rounded bg-[#222631] border border-[#2D3340] flex flex-col items-center justify-center text-[9px] text-slate-300 shadow-xs">
                      <Film className="w-3 h-3 text-[#13E2CA]" />
                      <span className="text-[8px] font-sans">Cover</span>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 pr-1">
                    <div className="truncate text-xs font-sans text-slate-300 font-medium">
                      {track.name}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase">
                      {track.type}
                    </div>
                  </div>
                )}

                {/* Track Toggles: Mute, Solo, Lock, Hide */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Lock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackLock(track.id);
                    }}
                    title={track.locked ? 'Unlock track' : 'Lock track'}
                    className={`p-1 rounded transition ${
                      track.locked ? 'text-amber-400' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>

                  {/* Mute */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackMute(track.id);
                    }}
                    title={track.muted ? 'Unmute track' : 'Mute track'}
                    className={`p-1 rounded transition ${
                      track.muted ? 'text-rose-400' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </button>

                  {/* Hidden */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackHidden(track.id);
                    }}
                    title={track.hidden ? 'Show track' : 'Hide track'}
                    className={`p-1 rounded transition ${
                      track.hidden ? 'text-slate-600' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {track.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          ref={timelineTracksRef}
          onScroll={handleTimelineScroll}
          className="relative min-w-0 flex-1 overflow-x-auto overflow-y-auto select-none bg-[#121418] scrollbar-thin"
        >
          <div style={{ width: `${totalWidthPx}px` }} className="relative flex flex-col min-h-full">
            {/* 1. Time Ruler Deck with Drag-Scrubbing (CapCut Dark Ruler) */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              title="Click or drag to scrub playhead"
              className="sticky top-0 z-30 h-6 border-b border-[#262A34] bg-[#181B20] cursor-ew-resize overflow-hidden select-none"
            >
              {ticks.map((t) => {
                const left = t * pxPerSecond;
                return (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 border-l border-[#262A34] pl-1 pointer-events-none"
                    style={{ left: `${left}px` }}
                  >
                    <span className="font-mono text-[9px] font-medium text-slate-400 select-none">
                      {Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, '0')}s
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 2. Track Lanes */}
            <div
              onPointerDown={handleTracksPointerDown}
              className="relative flex flex-col bg-[#121418]"
            >
              {project.tracks.map((track) => {
                const trackClips = project.clips.filter((c) => c.trackId === track.id);

                return (
                  <div
                    key={track.id}
                    data-track-id={track.id}
                    className={`relative h-14 shrink-0 border-b border-[#20242D] transition-colors ${
                      track.locked
                        ? 'bg-[#14171C]/80 opacity-70'
                        : 'bg-[#14171C]/40 hover:bg-[#1A1D24]/60'
                    }`}
                  >
                    {/* Horizontal second grid lines */}
                    {ticks.map((t) => (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 border-l border-[#20242D] pointer-events-none"
                        style={{ left: `${t * pxPerSecond}px` }}
                      />
                    ))}

                    {/* Clips positioned on this track */}
                    {trackClips.map((clip) => {
                      const isSel = selectedClipIds.includes(clip.id);
                      const left = clip.start * pxPerSecond;
                      const width = Math.max(16, clip.duration * pxPerSecond);

                      return (
                        <div
                          key={clip.id}
                          data-clip-id={clip.id}
                          onPointerDown={(e) => handlePointerDown(e, clip, 'move')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`
                          }}
                          className={`group absolute top-1 bottom-1 rounded overflow-hidden border shadow-xs transition-all cursor-move select-none flex flex-col justify-between p-1 z-10 ${
                            isSel
                              ? 'border-2 border-white ring-2 ring-[#13E2CA] shadow-md shadow-[#13E2CA]/25 z-20'
                              : 'border-black/30'
                          } ${
                            clip.type === 'video' || clip.type === 'image'
                              ? 'bg-[#0D4B4A] text-white border-[#13E2CA]/40'
                              : clip.type === 'audio'
                              ? 'bg-[#152A54] text-white border-blue-500/50'
                              : clip.type === 'caption'
                              ? 'bg-sky-900/90 text-white border-sky-400/60'
                              : 'bg-amber-900/90 text-white border-amber-400/60'
                          }`}
                        >
                          {/* CapCut Filmstrip Thumbnail Strip for Visual Clips */}
                          {(clip.type === 'video' || clip.type === 'image') && (
                            <div className="absolute inset-0 flex overflow-hidden opacity-35 pointer-events-none">
                              {Array.from({ length: Math.max(1, Math.floor(width / 45)) }).map((_, fIdx) => (
                                <div
                                  key={fIdx}
                                  className="w-[45px] h-full shrink-0 border-r border-black/50 overflow-hidden flex items-center justify-center bg-black/40"
                                >
                                  {clip.thumbnailUrl || clip.url ? (
                                    <img
                                      src={clip.thumbnailUrl || clip.url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Film className="w-3.5 h-3.5 text-[#13E2CA] opacity-60" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Top clip meta header */}
                          <div className="relative z-10 flex items-center justify-between gap-1 pointer-events-none">
                            <span className="truncate font-sans text-[11px] font-semibold tracking-tight text-white drop-shadow">
                              {clip.name}
                            </span>
                            <span className="shrink-0 font-mono text-[9px] font-medium text-slate-200 drop-shadow">
                              {clip.duration.toFixed(1)}s
                            </span>
                          </div>

                          {/* Audio Waveform visualization (CapCut bright blue waveform on navy track) */}
                          {(clip.type === 'audio' || clip.type === 'video') && (
                            <div className={`relative z-10 ${clip.type === 'audio' ? 'h-7 my-auto' : 'h-3'} w-full flex items-center gap-0.5 opacity-90 overflow-hidden pointer-events-none`}>
                              {Array.from({ length: Math.min(120, Math.floor(width / (clip.type === 'audio' ? 3 : 4))) }).map((_, idx) => {
                                const pseudoH = 20 + Math.abs(Math.sin(idx * 0.7 + clip.start * 2)) * 50 + Math.cos(idx * 1.3) * 25;
                                return (
                                  <div
                                    key={idx}
                                    style={{ height: `${Math.max(15, Math.min(100, pseudoH))}%` }}
                                    className={`w-[2px] rounded-full shrink-0 ${
                                      clip.type === 'audio' ? 'bg-[#38BDF8]' : 'bg-[#13E2CA]'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Keyframe diamond markers */}
                          {clip.keyframes && clip.keyframes.length > 0 && (
                            <div className="absolute bottom-1 left-2 right-2 flex items-center pointer-events-none z-15">
                              {clip.keyframes.map((kf) => {
                                const kfPercent = (kf.time / clip.duration) * 100;
                                return (
                                  <div
                                    key={kf.id}
                                    style={{ left: `${kfPercent}%` }}
                                    title={`Keyframe: ${kf.property} at ${kf.time.toFixed(2)}s`}
                                    className="absolute h-2 w-2 -translate-x-1 rotate-45 bg-[#13E2CA] border border-black shadow-xs"
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Transitions Badge */}
                          {clip.transitionIn && clip.transitionIn.type !== 'none' && (
                            <div className="absolute top-1 left-1 rounded bg-black/80 px-1.5 py-0.2 text-[8px] font-mono font-bold text-[#13E2CA] pointer-events-none z-15">
                              {clip.transitionIn.type}
                            </div>
                          )}

                          {/* Left Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-start')}
                            className="absolute top-0 bottom-0 left-0 w-2.5 bg-white/20 hover:bg-[#13E2CA] cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-l flex items-center justify-center z-20"
                          >
                            <div className="w-0.5 h-3 bg-white rounded-full" />
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-end')}
                            className="absolute top-0 bottom-0 right-0 w-2.5 bg-white/20 hover:bg-[#13E2CA] cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-r flex items-center justify-center z-20"
                          >
                            <div className="w-0.5 h-3 bg-white rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Project End Boundary Marker */}
            <div
              style={{ left: `${projectDur * pxPerSecond}px` }}
              className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col"
            >
              <div className="h-6 px-2 flex items-center bg-[#181B20] text-[9px] font-mono font-bold text-slate-300 border-l-2 border-[#13E2CA] shadow-sm">
                END ({formatTimecode(projectDur)})
              </div>
              <div className="w-0.5 flex-1 border-r border-dashed border-[#13E2CA]/40" />
            </div>

            {/* Out-of-bounds dimmed area beyond project duration */}
            {totalWidthPx > projectDur * pxPerSecond && (
              <div
                style={{
                  left: `${projectDur * pxPerSecond}px`,
                  width: `${totalWidthPx - projectDur * pxPerSecond}px`
                }}
                className="absolute top-0 bottom-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(45deg,#000,#000_10px,transparent_10px,transparent_20px)]"
              />
            )}

            {/* 3. Global Playhead Line with Draggable Scrubber Head (CapCut White Needle & Diamond Head) */}
            <div
              style={{ left: `${playhead * pxPerSecond}px` }}
              className="absolute top-0 bottom-0 z-30 flex flex-col items-center -translate-x-1/2 pointer-events-none"
            >
              {/* Floating Tooltip Pill showing timecode when scrubbing or hovering */}
              {(isScrubbing || isNeedleHovered) && (
                <div className="absolute -top-6 whitespace-nowrap rounded bg-[#13E2CA] px-2 py-0.5 text-[9px] font-mono font-bold text-black shadow-lg pointer-events-none z-50">
                  {formatTimecode(playhead)}
                </div>
              )}

              {/* Scrubber Needle Head (White diamond head with downward pointer) */}
              <div
                onPointerDown={handleScrubberPointerDown}
                onPointerMove={handleScrubberPointerMove}
                onPointerUp={handleScrubberPointerUp}
                onMouseEnter={() => setIsNeedleHovered(true)}
                onMouseLeave={() => setIsNeedleHovered(false)}
                title={`Playhead: ${formatTimecode(playhead)} (Drag to scrub)`}
                className="pointer-events-auto group relative flex h-6 w-6 items-center justify-center cursor-ew-resize z-40"
              >
                {/* Visual Head Badge */}
                <div
                  className={`w-3.5 h-4 bg-white border border-slate-800 rounded-t-xs shadow-md flex items-center justify-center transition-transform ${
                    isScrubbing ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                >
                  <div className="w-0.5 h-1.5 bg-black rounded-full" />
                </div>
                {/* Downward chevron pointer directly over the line */}
                <div className="absolute top-[15px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white pointer-events-none" />
              </div>

              {/* Scrubber Needle Line in Crisp White */}
              <div className="w-0.5 flex-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
