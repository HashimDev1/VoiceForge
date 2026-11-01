import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ShieldAlert,
  Move,
  Crop
} from 'lucide-react';
import {
  EditorProject,
  TimelineClip,
  AspectRatio
} from '../../../../shared/src/videoEditorTypes';

interface EditorPreviewCanvasProps {
  project: EditorProject;
  playhead: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
}

export const EditorPreviewCanvas: React.FC<EditorPreviewCanvasProps> = ({
  project,
  playhead,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedClip,
  onUpdateClip
}) => {
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origScale: number;
    mode: 'move' | 'scale';
  } | null>(null);

  // Active clips at current playhead position
  const activeClips = project.clips
    .filter((c) => playhead >= c.start && playhead <= c.start + c.duration)
    .sort((a, b) => {
      // Order by track order
      const trackA = project.tracks.find((t) => t.id === a.trackId)?.order ?? 0;
      const trackB = project.tracks.find((t) => t.id === b.trackId)?.order ?? 0;
      return trackA - trackB;
    });

  // Aspect ratio canvas sizing
  const getAspectRatioDimensions = (ratio: AspectRatio) => {
    switch (ratio) {
      case '9:16':
        return { aspect: '9/16', maxH: '520px', maxW: '292px' };
      case '16:9':
        return { aspect: '16/9', maxH: '480px', maxW: '853px' };
      case '1:1':
        return { aspect: '1/1', maxH: '500px', maxW: '500px' };
      case '4:5':
        return { aspect: '4/5', maxH: '520px', maxW: '416px' };
      default:
        return { aspect: '9/16', maxH: '520px', maxW: '292px' };
    }
  };

  const dims = getAspectRatioDimensions(project.aspectRatio);

  const formatTimecode = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const remS = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // On-screen bounding box interactive drag handling
  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'scale') => {
    if (!selectedClip) return;
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: selectedClip.transform?.x || 0,
      origY: selectedClip.transform?.y || 0,
      origScale: selectedClip.transform?.scale || 1,
      mode
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !selectedClip) return;
    const { startX, startY, origX, origY, origScale, mode } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (mode === 'move') {
      onUpdateClip(selectedClip.id, {
        transform: {
          ...selectedClip.transform,
          x: Math.round(origX + deltaX),
          y: Math.round(origY + deltaY)
        }
      });
    } else if (mode === 'scale') {
      const scaleDelta = (deltaX + deltaY) * 0.005;
      const nextScale = Math.max(0.2, Math.min(3.5, Number((origScale + scaleDelta).toFixed(2))));
      onUpdateClip(selectedClip.id, {
        transform: {
          ...selectedClip.transform,
          scale: nextScale
        }
      });
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

  return (
    <div
      ref={containerRef}
      className="glass-panel flex flex-col rounded-2xl border border-studio-border bg-white dark:bg-studio-900 p-4 text-slate-900 dark:text-white shadow-sm transition-colors"
    >
      {/* Top Canvas Bar */}
      <div className="mb-3 flex items-center justify-between border-b border-studio-border pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            VIEWPORT
          </span>
          <span className="rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border px-2 py-0.5 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300">
            {project.aspectRatio} · {project.fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Safe Zones Toggle */}
          <button
            type="button"
            onClick={() => setShowSafeZones((s) => !s)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
              showSafeZones
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Safe Zones</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                containerRef.current?.requestFullscreen();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsFullscreen(false);
              }
            }}
            className="p-1.5 rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Center Video Viewport Area */}
      <div className="relative flex flex-1 items-center justify-center min-h-[460px] bg-slate-100 dark:bg-studio-950 rounded-xl overflow-hidden p-4">
        {/* Aspect Ratio Canvas Stage */}
        <div
          className="relative bg-black rounded-xl overflow-hidden shadow-2xl flex items-center justify-center select-none"
          style={{
            aspectRatio: dims.aspect,
            maxHeight: dims.maxH,
            maxWidth: dims.maxW,
            width: '100%',
            height: '100%'
          }}
        >
          {/* Active Visual Layers */}
          {activeClips.map((clip) => {
            const isSel = selectedClip?.id === clip.id;
            const tf = clip.transform || {};
            const cg = clip.colorGrading || {};

            // Compute CSS Filter String
            const b = 1 + (cg.brightness || 0) / 100;
            const c = 1 + (cg.contrast || 0) / 100;
            const s = 1 + (cg.saturation || 0) / 100;
            const hue = cg.hue || 0;
            const filterStr = `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hue}deg)`;

            const posX = tf.x || 0;
            const posY = tf.y || 0;
            const scale = tf.scale || 1;
            const rotation = tf.rotation || 0;
            const opacity = tf.opacity ?? 1;

            return (
              <div
                key={clip.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`,
                  opacity,
                  filter: filterStr
                }}
              >
                {/* Media Element */}
                {clip.type === 'video' && clip.url ? (
                  <video
                    src={clip.url}
                    className="h-full w-full object-contain"
                    muted
                  />
                ) : clip.type === 'image' && clip.url ? (
                  <img src={clip.url} alt={clip.name} className="h-full w-full object-contain" />
                ) : clip.type === 'text' ? (
                  <div className="px-4 py-2 font-black text-2xl text-white text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {clip.text}
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Interactive Bounding Box for Selected Clip */}
          {selectedClip && (
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute z-30 cursor-move border-2 border-indigo-500 rounded-sm pointer-events-auto shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              style={{
                width: '75%',
                height: '75%',
                transform: `translate(${selectedClip.transform?.x || 0}px, ${selectedClip.transform?.y || 0}px) scale(${selectedClip.transform?.scale || 1}) rotate(${selectedClip.transform?.rotation || 0}deg)`
              }}
            >
              {/* Floating HUD info badge above box */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono font-bold text-white whitespace-nowrap shadow backdrop-blur-sm pointer-events-none">
                <span>Scale: {Math.round((selectedClip.transform?.scale || 1) * 100)}%</span>
                <span>·</span>
                <span>X: {selectedClip.transform?.x || 0}</span>
                <span>·</span>
                <span>Y: {selectedClip.transform?.y || 0}</span>
              </div>

              {/* 4 Corner Resize Handles */}
              {['tl', 'tr', 'bl', 'br'].map((pos) => (
                <div
                  key={pos}
                  onPointerDown={(e) => handlePointerDown(e, 'scale')}
                  className={`absolute h-3 w-3 rounded-full bg-white border-2 border-indigo-600 shadow cursor-nwse-resize ${
                    pos === 'tl'
                      ? '-top-1.5 -left-1.5'
                      : pos === 'tr'
                      ? '-top-1.5 -right-1.5'
                      : pos === 'bl'
                      ? '-bottom-1.5 -left-1.5'
                      : '-bottom-1.5 -right-1.5'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Safe Zones Overlay for TikTok/Reels/Shorts */}
          {showSafeZones && (
            <div className="pointer-events-none absolute inset-0 z-40 border-2 border-dashed border-cyan-400/40 p-4">
              <div className="flex h-full w-full flex-col justify-between">
                <div className="rounded bg-black/40 px-2 py-0.5 font-mono text-[9px] text-cyan-300 self-center">
                  TOP SAFE ZONE
                </div>
                <div className="rounded bg-black/40 px-2 py-0.5 font-mono text-[9px] text-cyan-300 self-center">
                  BOTTOM CAPTION SAFE ZONE
                </div>
              </div>
            </div>
          )}

          {/* Empty Canvas Notice */}
          {activeClips.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">
              [Canvas Ready · Add media to timeline]
            </div>
          )}
        </div>
      </div>

      {/* Transport Deck Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-4 py-2.5 transition-colors">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, playhead - 1))}
            title="Step back 1 second (←)"
            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.min(project.duration, playhead + 1))}
            title="Step forward 1 second (→)"
            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Playhead Timecode */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {formatTimecode(playhead)}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-slate-600 dark:text-slate-400 font-semibold">
            {formatTimecode(project.duration)}
          </span>
        </div>

        {/* Jump Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSeek(0)}
            className="rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-2 py-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer shadow-sm"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => onSeek(project.duration)}
            className="rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-2 py-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer shadow-sm"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
};

