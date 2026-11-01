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
  Maximize2
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
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  activeTool: 'select' | 'split';
  setActiveTool: (tool: 'select' | 'split') => void;
  onSplitClip: (clipId?: string) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onRippleDelete: (clipId: string) => void;
  onTrimClipStart: (clipId: string, newStart: number) => void;
  onTrimClipEnd: (clipId: string, newEnd: number) => void;
  onMoveClip: (clipId: string, targetTrackId: string, newStart: number) => void;
  onToggleTrackLock: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackHidden: (trackId: string) => void;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  project,
  playhead,
  onSeek,
  selectedClipId,
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
  onDuplicateClip,
  onRippleDelete,
  onTrimClipStart,
  onTrimClipEnd,
  onMoveClip,
  onToggleTrackLock,
  onToggleTrackMute,
  onToggleTrackHidden
}) => {
  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    clipId: string;
    mode: 'move' | 'trim-start' | 'trim-end';
    startX: number;
    origStart: number;
    origDuration: number;
    trackId: string;
  } | null>(null);

  const pxPerSecond = 45 * zoom;
  const totalWidthPx = Math.max(800, (project.duration || 30) * pxPerSecond);

  // Ruler tick marks (every 1s, 5s, or 10s depending on zoom)
  const step = zoom >= 2 ? 1 : zoom >= 0.8 ? 2 : 5;
  const ticks = useMemo(() => {
    const list = [];
    for (let t = 0; t <= (project.duration || 30); t += step) {
      list.push(t);
    }
    return list;
  }, [project.duration, step]);

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

    onSelectClip(clip.id);
    onSelectTrack(clip.trackId);

    dragRef.current = {
      clipId: clip.id,
      mode,
      startX: e.clientX,
      origStart: clip.start,
      origDuration: clip.duration,
      trackId: clip.trackId
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { clipId, mode, startX, origStart, origDuration, trackId } = dragRef.current;
    const deltaPx = e.clientX - startX;
    const deltaSec = deltaPx / pxPerSecond;

    if (mode === 'move') {
      const nextStart = Math.max(0, origStart + deltaSec);
      onMoveClip(clipId, trackId, nextStart);
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

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, clickX / pxPerSecond);
    onSeek(time);
  };

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
            title="Split selected clip at playhead"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
          >
            <Scissors className="h-3.5 w-3.5 text-indigo-500" />
            <span>Split (S)</span>
          </button>

          {/* Duplicate Clip */}
          {selectedClipId && (
            <button
              type="button"
              onClick={() => onDuplicateClip(selectedClipId)}
              title="Duplicate selected clip"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-emerald-500" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Delete Clip */}
          {selectedClipId && (
            <button
              type="button"
              onClick={() => onDeleteClip(selectedClipId)}
              title="Delete selected clip"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}

          {/* Ripple Delete */}
          {selectedClipId && (
            <button
              type="button"
              onClick={() => onRippleDelete(selectedClipId)}
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
          <div className="h-7 border-b border-studio-border px-3 flex items-center font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            TRACKS ({project.tracks.length})
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
                  <div className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                    {track.type}
                  </div>
                </div>

                {/* Track Toggles: Mute, Lock, Hide */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackMute(track.id);
                    }}
                    title={track.muted ? 'Unmute track' : 'Mute track'}
                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-studio-800 ${
                      track.muted ? 'text-rose-500' : 'text-slate-400'
                    }`}
                  >
                    {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </button>

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

        {/* Right Scrollable Timeline Lanes */}
        <div
          ref={timelineTracksRef}
          className="flex-1 overflow-x-auto relative select-none scrollbar-thin bg-slate-100 dark:bg-studio-950"
        >
          <div style={{ width: `${totalWidthPx}px` }} className="relative min-h-[300px]">
            {/* Time Ruler Bar */}
            <div
              onClick={handleRulerClick}
              className="h-7 border-b border-studio-border bg-slate-50 dark:bg-studio-900/60 relative cursor-pointer"
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: `${t * pxPerSecond}px` }}
                >
                  <span className="font-mono text-[9px] text-slate-400 pl-1">
                    {Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, '0')}
                  </span>
                  <div className="h-2 w-px bg-slate-300 dark:bg-studio-700" />
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            <div className="flex flex-col">
              {project.tracks.map((track) => {
                const trackClips = project.clips.filter((c) => c.trackId === track.id);

                return (
                  <div
                    key={track.id}
                    className={`h-16 border-b border-studio-border relative ${
                      track.locked ? 'bg-slate-200/30 dark:bg-studio-900/30' : ''
                    }`}
                  >
                    {/* Render clips on this track */}
                    {trackClips.map((clip) => {
                      const isSelected = selectedClipId === clip.id;
                      const leftPx = clip.start * pxPerSecond;
                      const widthPx = Math.max(20, clip.duration * pxPerSecond);

                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) => handlePointerDown(e, clip, 'move')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          className={`absolute top-1.5 h-13 rounded-xl border flex items-center overflow-hidden transition-shadow shadow-sm cursor-grab active:cursor-grabbing ${
                            isSelected
                              ? 'z-20 border-2 border-indigo-600 dark:border-indigo-400 bg-indigo-600 text-white shadow-md'
                              : clip.type === 'video'
                              ? 'border-indigo-300/60 dark:border-indigo-900 bg-indigo-500/90 text-white'
                              : clip.type === 'audio'
                              ? 'border-emerald-300/60 dark:border-emerald-900 bg-emerald-600/90 text-white'
                              : clip.type === 'text'
                              ? 'border-purple-300/60 dark:border-purple-900 bg-purple-600/90 text-white'
                              : 'border-studio-border bg-white dark:bg-studio-800 text-slate-800 dark:text-slate-200'
                          }`}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`
                          }}
                        >
                          {/* Left Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-start')}
                            className="h-full w-2 shrink-0 cursor-ew-resize bg-black/20 hover:bg-black/40"
                          />

                          {/* Clip Content Label */}
                          <div className="flex-1 truncate px-2 text-center text-xs font-bold leading-tight">
                            <span className="block truncate">{clip.name}</span>
                            <span className="block font-mono text-[9px] opacity-75">
                              {clip.duration.toFixed(1)}s
                            </span>
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, clip, 'trim-end')}
                            className="h-full w-2 shrink-0 cursor-ew-resize bg-black/20 hover:bg-black/40"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Red Scrubbing Playhead Line */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-rose-500 shadow-[0_0_8px_#f43f5e]"
              style={{ left: `${playhead * pxPerSecond}px` }}
            >
              <div className="absolute -left-1.5 -top-1 h-3.5 w-3.5 rotate-45 rounded-sm bg-rose-500 shadow" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

