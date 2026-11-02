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
  Radio
} from 'lucide-react';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  TrackType
} from '../../../../shared/src/videoEditorTypes';

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
  onPasteClips
}) => {
  const timelineTracksRef = useRef<HTMLDivElement>(null);
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
    const { clipId, mode, startX, startY, origStart, origDuration, trackId } = dragRef.current;
    const deltaPx = e.clientX - startX;
    const deltaSec = deltaPx / pxPerSecond;

    if (mode === 'move') {
      const nextStart = Math.max(0, origStart + deltaSec);

      // Detect which track row is under the mouse cursor for vertical track drag
      let targetTrackId = trackId;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const trackRowEl = el?.closest('[data-track-id]');
      if (trackRowEl) {
        const foundId = trackRowEl.getAttribute('data-track-id');
        if (foundId) {
          // Check track type compatibility
          const movingClip = project.clips.find((c) => c.id === clipId);
          const candidateTrack = project.tracks.find((t) => t.id === foundId);
          if (movingClip && candidateTrack) {
            // Audio clips stay in audio tracks, visual clips in visual tracks
            if (
              (movingClip.type === 'audio' && candidateTrack.type === 'audio') ||
              (movingClip.type !== 'audio' && candidateTrack.type !== 'audio')
            ) {
              targetTrackId = foundId;
            }
          }
        }
      }

      onMoveClip(clipId, targetTrackId, nextStart);
    } else if (mode === 'trim-start') {
      const nextStart = Math.max(0, origStart + deltaSec);
      onTrimClipStart(clipId, nextStart);
    } else if (mode === 'trim-end') {
      const nextEnd = Math.max(origStart + 0.2, origStart + origDuration + deltaSec);
      onTrimClipEnd(clipId, nextEnd);
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

  const primarySelectedClipId = selectedClipIds[0] || null;

  return (
    <section className="glass-panel flex flex-col rounded-2xl border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm transition-colors">
      {/* Timeline Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-studio-border px-5 py-3">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Select Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            title="Selection Tool (V)"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-extrabold'
                : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600 dark:text-slate-400'
            }`}
          >
            Select (V)
          </button>

          {/* Razor / Split Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('split')}
            title="Split Tool (C)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTool === 'split'
                ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Split Tool (C)</span>
          </button>

          {/* Quick Split at Playhead */}
          <button
            type="button"
            onClick={() => onSplitClip()}
            title="Split selected clip at playhead (S)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
          >
            <Scissors className="h-3.5 w-3.5 text-indigo-500" />
            <span>Split (S)</span>
          </button>

          {/* Freeze Frame */}
          <button
            type="button"
            onClick={() => onFreezeFrame(primarySelectedClipId || undefined)}
            title="Insert Freeze Frame (3s still) at playhead"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Freeze</span>
          </button>

          {/* Duplicate Clip */}
          {selectedClipIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (primarySelectedClipId) onDuplicateClip(primarySelectedClipId);
              }}
              title="Duplicate selected clip (Ctrl+D)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-emerald-500" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Delete Clip / Multi Delete */}
          {selectedClipIds.length > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete selected clip(s) (Del)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete ({selectedClipIds.length})</span>
            </button>
          )}

          {/* Ripple Delete */}
          {primarySelectedClipId && (
            <button
              type="button"
              onClick={() => onRippleDelete(primarySelectedClipId)}
              title="Ripple delete (shift subsequent clips backward)"
              className="px-2.5 py-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition cursor-pointer"
            >
              Ripple Delete
            </button>
          )}
        </div>

        {/* Right Tools: Magnetic Snap & Zoom */}
        <div className="flex items-center gap-2">
          {/* Magnetic Snap Toggle */}
          <button
            type="button"
            onClick={onToggleSnap}
            title={snapEnabled ? 'Magnetic snapping ON' : 'Magnetic snapping OFF'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              snapEnabled
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-500'
            }`}
          >
            <Magnet className="h-3.5 w-3.5" />
            <span>Snap</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
              title="Zoom out"
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.2).toFixed(1))))}
              title="Zoom in"
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Multitrack Workspace Grid */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Left Track Headers Deck */}
        <div className="w-48 sm:w-56 shrink-0 border-r border-studio-border bg-slate-50/70 dark:bg-studio-950/70">
          {/* Header spacer aligned with time ruler */}
          <div className="h-7 border-b border-studio-border px-3 flex items-center justify-between font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>TRACKS ({project.tracks.length})</span>
            <span className="text-[9px] text-indigo-500 font-bold">M / S / L / V</span>
          </div>

          {/* Track Header Items */}
          <div className="flex flex-col">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`h-16 border-b border-studio-border px-3 flex items-center justify-between transition cursor-pointer ${
                  selectedTrackId === track.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {track.name}
                  </div>
                  <div className="text-[9px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
                    <span>{track.type}</span>
                    {track.solo && <span className="text-amber-500 font-extrabold">[SOLO]</span>}
                  </div>
                </div>

                {/* Track Toggles: Mute, Solo, Lock, Hide */}
                <div className="flex items-center gap-0.5 shrink-0 ml-1">
                  {/* Mute */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackMute(track.id);
                    }}
                    title={track.muted ? 'Unmute track' : 'Mute track'}
                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-studio-800 ${
                      track.muted ? 'text-rose-500 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </button>

                  {/* Solo */}
                  {onToggleTrackSolo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTrackSolo(track.id);
                      }}
                      title={track.solo ? 'Disable Solo' : 'Solo Track'}
                      className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold ${
                        track.solo
                          ? 'bg-amber-500 text-black'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      S
                    </button>
                  )}

                  {/* Lock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackLock(track.id);
                    }}
                    title={track.locked ? 'Unlock track' : 'Lock track'}
                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-studio-800 ${
                      track.locked ? 'text-amber-500' : 'text-slate-400'
                    }`}
                  >
                    {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>

                  {/* Hidden */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackHidden(track.id);
                    }}
                    title={track.hidden ? 'Show track' : 'Hide track'}
                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-studio-800 ${
                      track.hidden ? 'text-slate-300' : 'text-slate-400'
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
          className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden select-none bg-slate-100/50 dark:bg-studio-950/50"
        >
          <div style={{ width: `${totalWidthPx}px` }} className="relative flex flex-col">
            {/* 1. Time Ruler Deck with Drag-Scrubbing */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              title="Click or drag to scrub playhead"
              className="relative h-7 border-b border-studio-border bg-slate-100 dark:bg-studio-950 cursor-ew-resize overflow-hidden select-none"
            >
              {ticks.map((t) => {
                const left = t * pxPerSecond;
                return (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 border-l border-slate-300 dark:border-studio-800 pl-1 pointer-events-none"
                    style={{ left: `${left}px` }}
                  >
                    <span className="font-mono text-[9px] font-bold text-slate-400 select-none">
                      {Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, '0')}s
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 2. Track Lanes (Click empty space to seek) */}
            <div
              onPointerDown={handleTracksPointerDown}
              className="relative flex flex-col"
            >
              {project.tracks.map((track) => {
                const trackClips = project.clips.filter((c) => c.trackId === track.id);

                return (
                  <div
                    key={track.id}
                    data-track-id={track.id}
                    className={`relative h-16 border-b border-studio-border/60 transition-colors ${
                      track.locked
                        ? 'bg-slate-200/40 dark:bg-studio-900/40 opacity-70'
                        : 'hover:bg-slate-50/40 dark:hover:bg-studio-900/20'
                    }`}
                  >
                    {/* Horizontal second grid lines */}
                    {ticks.map((t) => (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 border-l border-slate-200/50 dark:border-studio-800/30 pointer-events-none"
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
                          className={`group absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden border shadow-xs transition-all cursor-move select-none flex flex-col justify-between p-1.5 ${
                            isSel
                              ? 'ring-2 ring-indigo-500 shadow-md border-indigo-400 z-20'
                              : 'border-studio-border z-10'
                          } ${
                            clip.type === 'video'
                              ? 'bg-indigo-950/80 text-indigo-100 border-indigo-700/60'
                              : clip.type === 'audio'
                              ? 'bg-emerald-950/80 text-emerald-100 border-emerald-700/60'
                              : clip.type === 'text' || clip.type === 'caption'
                              ? 'bg-amber-950/80 text-amber-100 border-amber-700/60'
                              : 'bg-cyan-950/80 text-cyan-100 border-cyan-700/60'
                          }`}
                        >
                          {/* Top clip meta header */}
                          <div className="flex items-center justify-between gap-1 pointer-events-none">
                            <span className="truncate font-sans text-[11px] font-extrabold tracking-tight">
                              {clip.name}
                            </span>
                            <span className="shrink-0 font-mono text-[9px] opacity-75">
                              {clip.duration.toFixed(1)}s
                            </span>
                          </div>

                          {/* Audio Waveform visualization for audio/video clips */}
                          {(clip.type === 'audio' || clip.type === 'video') && (
                            <div className="h-3 w-full flex items-center gap-0.5 opacity-60 overflow-hidden pointer-events-none">
                              {Array.from({ length: Math.min(60, Math.floor(width / 5)) }).map((_, idx) => {
                                const pseudoH = 20 + Math.sin(idx * 0.8 + clip.start) * 40 + Math.cos(idx * 1.5) * 30;
                                return (
                                  <div
                                    key={idx}
                                    style={{ height: `${Math.max(15, Math.min(100, pseudoH))}%` }}
                                    className={`w-0.5 rounded-full ${
                                      clip.type === 'audio' ? 'bg-emerald-400' : 'bg-indigo-400'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Keyframe diamond markers */}
                          {clip.keyframes && clip.keyframes.length > 0 && (
                            <div className="absolute bottom-1 left-2 right-2 flex items-center pointer-events-none">
                              {clip.keyframes.map((kf) => {
                                const kfPercent = (kf.time / clip.duration) * 100;
                                return (
                                  <div
                                    key={kf.id}
                                    style={{ left: `${kfPercent}%` }}
                                    title={`Keyframe: ${kf.property} at ${kf.time.toFixed(2)}s`}
                                    className="absolute h-2 w-2 -translate-x-1 rotate-45 bg-amber-400 border border-black shadow-xs"
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Transitions Badge */}
                          {clip.transitionIn && clip.transitionIn.type !== 'none' && (
                            <div className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[8px] font-mono text-cyan-300 pointer-events-none">
                              {clip.transitionIn.type}
                            </div>
                          )}

                          {/* Left Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-start')}
                            className="absolute top-0 bottom-0 left-0 w-2.5 bg-white/20 hover:bg-indigo-400 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg flex items-center justify-center"
                          >
                            <div className="w-0.5 h-4 bg-white/70 rounded-full" />
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-end')}
                            className="absolute top-0 bottom-0 right-0 w-2.5 bg-white/20 hover:bg-indigo-400 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-r-lg flex items-center justify-center"
                          >
                            <div className="w-0.5 h-4 bg-white/70 rounded-full" />
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
              <div className="h-7 px-1.5 flex items-center bg-slate-800/90 text-[9px] font-mono font-bold text-slate-200 border-l-2 border-indigo-500 shadow-sm rounded-r">
                END ({formatTimecode(projectDur)})
              </div>
              <div className="w-0.5 flex-1 border-r border-dashed border-slate-400/60 dark:border-studio-700/80" />
            </div>

            {/* Out-of-bounds dimmed area beyond project duration */}
            {totalWidthPx > projectDur * pxPerSecond && (
              <div
                style={{
                  left: `${projectDur * pxPerSecond}px`,
                  width: `${totalWidthPx - projectDur * pxPerSecond}px`
                }}
                className="absolute top-0 bottom-0 pointer-events-none opacity-20 dark:opacity-30 bg-[repeating-linear-gradient(45deg,#000,#000_10px,transparent_10px,transparent_20px)]"
              />
            )}

            {/* 3. Global Playhead Line with CapCut-style Draggable Scrubber Head */}
            <div
              style={{ left: `${playhead * pxPerSecond}px` }}
              className="absolute top-0 bottom-0 z-30 flex flex-col items-center -translate-x-1/2 pointer-events-none"
            >
              {/* Floating Tooltip Pill showing timecode when scrubbing or hovering */}
              {(isScrubbing || isNeedleHovered) && (
                <div className="absolute -top-6 whitespace-nowrap rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white shadow-lg pointer-events-none z-50">
                  {formatTimecode(playhead)}
                </div>
              )}

              {/* Scrubber Needle Head - CapCut iconic draggable badge */}
              <div
                onPointerDown={handleScrubberPointerDown}
                onPointerMove={handleScrubberPointerMove}
                onPointerUp={handleScrubberPointerUp}
                onMouseEnter={() => setIsNeedleHovered(true)}
                onMouseLeave={() => setIsNeedleHovered(false)}
                title={`Playhead: ${formatTimecode(playhead)} (Drag to scrub)`}
                className="pointer-events-auto group relative flex h-7 w-7 items-center justify-center cursor-ew-resize z-40"
              >
                {/* Visual Head Badge */}
                <div
                  className={`w-3.5 h-4.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-300 border-2 border-white rounded-t-xs shadow-md flex items-center justify-center transition-transform ${
                    isScrubbing ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                >
                  <div className="w-0.5 h-2 bg-white/90 rounded-full" />
                </div>
                {/* Downward chevron pointer directly over the line */}
                <div className="absolute top-[18px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-indigo-500 pointer-events-none" />
              </div>

              {/* Red/Indigo Scrubber Needle Line extending down across all tracks */}
              <div className="w-0.5 flex-1 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
