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
  RotateCcw
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

  return (
    <section className="flex flex-col h-full w-full bg-[#15191F] border border-[#242A33] overflow-hidden select-none text-[#F0F3F7]">
      {/* 1. Timeline Toolbar Deck (CapCut Desktop style: 36px) */}
      <div className="h-9 shrink-0 bg-[#1B2028] border-b border-[#242A33] px-3 flex items-center justify-between text-xs">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Select Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            title="Selection Tool (V)"
            className={`flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-[#242A33] text-[#40D5CB] border border-[#303740]'
                : 'text-[#A4AFBD] hover:text-white hover:bg-[#242A33]/50'
            }`}
          >
            <MousePointer className="h-3 w-3" />
            <span>Select (V)</span>
          </button>

          {/* Razor / Split Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('split')}
            title="Split Tool (C)"
            className={`flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium transition cursor-pointer ${
              activeTool === 'split'
                ? 'bg-[#242A33] text-[#40D5CB] border border-[#303740]'
                : 'text-[#A4AFBD] hover:text-white hover:bg-[#242A33]/50'
            }`}
          >
            <Scissors className="h-3 w-3" />
            <span>Split Tool (C)</span>
          </button>

          <div className="w-px h-4 bg-[#303740] mx-1" />

          {/* Quick Split at Playhead */}
          <button
            type="button"
            onClick={() => onSplitClip()}
            title="Split selected clip at playhead (S)"
            className="flex items-center gap-1 h-7 px-2 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition cursor-pointer"
          >
            <Scissors className="h-3.5 w-3.5 text-[#40D5CB]" />
            <span>Split (S)</span>
          </button>

          {/* Freeze Frame */}
          <button
            type="button"
            onClick={() => onFreezeFrame(primarySelectedClipId || undefined)}
            title="Insert Freeze Frame (3s still) at playhead (F)"
            className="flex items-center gap-1 h-7 px-2 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#E6AC57]" />
            <span>Freeze (F)</span>
          </button>

          {/* Duplicate Clip */}
          {selectedClipIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (primarySelectedClipId) onDuplicateClip(primarySelectedClipId);
              }}
              title="Duplicate selected clip (Ctrl+D)"
              className="flex items-center gap-1 h-7 px-2 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-[#48C994]" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Delete Clip / Multi Delete */}
          {selectedClipIds.length > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete selected clip(s) (Del)"
              className="flex items-center gap-1 h-7 px-2 rounded hover:bg-[#242A33] text-[#F06B77] hover:text-white transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}

          {/* Ripple Delete */}
          {primarySelectedClipId && (
            <button
              type="button"
              onClick={() => onRippleDelete(primarySelectedClipId)}
              title="Ripple delete (shift subsequent clips backward, Shift+Del)"
              className="h-7 px-2 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition cursor-pointer"
            >
              Ripple Del
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
            className={`flex items-center gap-1 h-7 px-2 rounded text-xs font-medium transition cursor-pointer ${
              snapEnabled
                ? 'bg-[#242A33] text-[#40D5CB] border border-[#40D5CB]/40'
                : 'text-[#747F90] hover:text-white hover:bg-[#242A33]/50'
            }`}
          >
            <Magnet className="h-3.5 w-3.5" />
            <span>Snap</span>
          </button>

          <div className="w-px h-4 bg-[#303740] mx-0.5" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#15191F] px-1 py-0.5 rounded border border-[#303740]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
              title="Zoom out"
              className="p-1 rounded text-[#747F90] hover:text-white hover:bg-[#242A33] cursor-pointer"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="w-8 text-center font-mono text-[10px] text-[#A4AFBD]">
              {zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.2).toFixed(1))))}
              title="Zoom in"
              className="p-1 rounded text-[#747F90] hover:text-white hover:bg-[#242A33] cursor-pointer"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Multitrack Workspace Grid */}
      <div className="flex min-w-0 flex-1 overflow-hidden relative">
        {/* Left Track Headers Deck */}
        <div className="w-44 sm:w-48 shrink-0 border-r border-[#242A33] bg-[#15191F] flex flex-col z-20">
          {/* Header spacer aligned with time ruler */}
          <div className="h-6 border-b border-[#242A33] bg-[#1B2028] px-2.5 flex items-center justify-between font-mono text-[9px] text-[#747F90] uppercase tracking-wider">
            <span>TRACKS ({project.tracks.length})</span>
            <span className="text-[8px] text-[#40D5CB]">M · L · V</span>
          </div>

          {/* Scrollable Track Header List (synchronized with tracks) */}
          <div
            ref={trackHeadersRef}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {project.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`h-14 shrink-0 border-b border-[#242A33]/70 px-2.5 flex items-center justify-between transition cursor-pointer ${
                  selectedTrackId === track.id ? 'bg-[#242A33]/70' : 'hover:bg-[#1B2028]/60'
                }`}
              >
                <div className="min-w-0 flex-1 pr-1">
                  <div className="truncate text-xs font-semibold text-[#F0F3F7]">
                    {track.name}
                  </div>
                  <div className="text-[9px] font-mono text-[#747F90] uppercase flex items-center gap-1">
                    <span>{track.type}</span>
                    {track.solo && <span className="text-[#E6AC57] font-bold">[SOLO]</span>}
                  </div>
                </div>

                {/* Track Toggles: Mute, Solo, Lock, Hide */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Mute */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackMute(track.id);
                    }}
                    title={track.muted ? 'Unmute track' : 'Mute track'}
                    className={`p-1 rounded hover:bg-[#242A33] ${
                      track.muted ? 'text-[#F06B77]' : 'text-[#747F90] hover:text-white'
                    }`}
                  >
                    {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </button>

                  {/* Lock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackLock(track.id);
                    }}
                    title={track.locked ? 'Unlock track' : 'Lock track'}
                    className={`p-1 rounded hover:bg-[#242A33] ${
                      track.locked ? 'text-[#E6AC57]' : 'text-[#747F90] hover:text-white'
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
                    className={`p-1 rounded hover:bg-[#242A33] ${
                      track.hidden ? 'text-[#747F90]' : 'text-[#A4AFBD] hover:text-white'
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
          className="relative min-w-0 flex-1 overflow-x-auto overflow-y-auto select-none bg-[#0B0E13] scrollbar-thin"
        >
          <div style={{ width: `${totalWidthPx}px` }} className="relative flex flex-col min-h-full">
            {/* 1. Time Ruler Deck with Drag-Scrubbing */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              title="Click or drag to scrub playhead"
              className="sticky top-0 z-30 h-6 border-b border-[#242A33] bg-[#1B2028] cursor-ew-resize overflow-hidden select-none"
            >
              {ticks.map((t) => {
                const left = t * pxPerSecond;
                return (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 border-l border-[#303740] pl-1 pointer-events-none"
                    style={{ left: `${left}px` }}
                  >
                    <span className="font-mono text-[9px] text-[#747F90] select-none">
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
                    className={`relative h-14 shrink-0 border-b border-[#242A33]/70 transition-colors ${
                      track.locked
                        ? 'bg-[#15191F]/80 opacity-70'
                        : 'bg-[#15191F]/40 hover:bg-[#1B2028]/30'
                    }`}
                  >
                    {/* Horizontal second grid lines */}
                    {ticks.map((t) => (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 border-l border-[#242A33]/40 pointer-events-none"
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
                          className={`group absolute top-1 bottom-1 rounded overflow-hidden border shadow-xs transition-all cursor-move select-none flex flex-col justify-between p-1.5 ${
                            isSel
                              ? 'ring-2 ring-[#40D5CB] border-white z-20'
                              : 'border-[#303740] z-10'
                          } ${
                            clip.type === 'video'
                              ? 'bg-[#1B2838] text-white border-[#2A475E]'
                              : clip.type === 'audio'
                              ? 'bg-[#163328] text-white border-[#235843]'
                              : clip.type === 'text' || clip.type === 'caption'
                              ? 'bg-[#342247] text-white border-[#533475]'
                              : 'bg-[#382A1B] text-white border-[#61492A]'
                          }`}
                        >
                          {/* Top clip meta header */}
                          <div className="flex items-center justify-between gap-1 pointer-events-none">
                            <span className="truncate font-sans text-[11px] font-semibold tracking-tight text-white">
                              {clip.name}
                            </span>
                            <span className="shrink-0 font-mono text-[9px] text-[#A4AFBD]">
                              {clip.duration.toFixed(1)}s
                            </span>
                          </div>

                          {/* Audio Waveform visualization for audio/video clips */}
                          {(clip.type === 'audio' || clip.type === 'video') && (
                            <div className="h-2.5 w-full flex items-center gap-0.5 opacity-70 overflow-hidden pointer-events-none">
                              {Array.from({ length: Math.min(60, Math.floor(width / 5)) }).map((_, idx) => {
                                const pseudoH = 20 + Math.sin(idx * 0.8 + clip.start) * 40 + Math.cos(idx * 1.5) * 30;
                                return (
                                  <div
                                    key={idx}
                                    style={{ height: `${Math.max(15, Math.min(100, pseudoH))}%` }}
                                    className={`w-0.5 rounded-full ${
                                      clip.type === 'audio' ? 'bg-[#48C994]' : 'bg-[#40D5CB]'
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
                                    className="absolute h-2 w-2 -translate-x-1 rotate-45 bg-[#40D5CB] border border-[#0B0E13] shadow-xs"
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Transitions Badge */}
                          {clip.transitionIn && clip.transitionIn.type !== 'none' && (
                            <div className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[8px] font-mono text-[#40D5CB] pointer-events-none">
                              {clip.transitionIn.type}
                            </div>
                          )}

                          {/* Left Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-start')}
                            className="absolute top-0 bottom-0 left-0 w-2.5 bg-white/20 hover:bg-[#40D5CB] cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-l flex items-center justify-center"
                          >
                            <div className="w-0.5 h-3 bg-white rounded-full" />
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-end')}
                            className="absolute top-0 bottom-0 right-0 w-2.5 bg-white/20 hover:bg-[#40D5CB] cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-r flex items-center justify-center"
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
              <div className="h-6 px-1.5 flex items-center bg-[#1B2028] text-[9px] font-mono font-medium text-[#A4AFBD] border-l-2 border-[#40D5CB] shadow-sm">
                END ({formatTimecode(projectDur)})
              </div>
              <div className="w-0.5 flex-1 border-r border-dashed border-[#747F90]/50" />
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

            {/* 3. Global Playhead Line with CapCut-style Draggable Scrubber Head */}
            <div
              style={{ left: `${playhead * pxPerSecond}px` }}
              className="absolute top-0 bottom-0 z-30 flex flex-col items-center -translate-x-1/2 pointer-events-none"
            >
              {/* Floating Tooltip Pill showing timecode when scrubbing or hovering */}
              {(isScrubbing || isNeedleHovered) && (
                <div className="absolute -top-6 whitespace-nowrap rounded bg-[#40D5CB] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#0B0E13] shadow-lg pointer-events-none z-50">
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
                className="pointer-events-auto group relative flex h-6 w-6 items-center justify-center cursor-ew-resize z-40"
              >
                {/* Visual Head Badge */}
                <div
                  className={`w-3 h-4 bg-[#40D5CB] hover:bg-[#5CE5DC] active:bg-[#34B3AA] border border-white rounded-t-xs shadow-md flex items-center justify-center transition-transform ${
                    isScrubbing ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                >
                  <div className="w-0.5 h-1.5 bg-[#0B0E13] rounded-full" />
                </div>
                {/* Downward chevron pointer directly over the line */}
                <div className="absolute top-[15px] w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] border-t-[#40D5CB] pointer-events-none" />
              </div>

              {/* Cyan Scrubber Needle Line extending down across all tracks */}
              <div className="w-0.5 flex-1 bg-[#40D5CB] shadow-[0_0_8px_rgba(64,213,203,0.8)] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
