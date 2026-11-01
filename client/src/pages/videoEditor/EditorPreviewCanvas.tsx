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
  Crop,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  EditorProject,
  TimelineClip,
  AspectRatio,
  TimelineTrack
} from '../../../../shared/src/videoEditorTypes';
import {
  evaluateClipKeyframes,
  EvaluatedTransformAndAudio
} from '../../../../shared/src/videoEditorKeyframes';
import {
  evaluateMotionGraphicAtTime,
  EvaluatedMotionGraphic
} from '../../../../shared/src/motionGraphicsEngine';

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
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // References to active media elements for real-time playhead synchronization
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origScale: number;
    mode: 'move' | 'scale';
  } | null>(null);

  // Check if any track is soloed
  const hasSoloTrack = project.tracks.some((t) => t.solo);

  // Filter visible active tracks
  const trackMap = new Map<string, TimelineTrack>();
  project.tracks.forEach((t) => trackMap.set(t.id, t));

  // Visual clips at current playhead position (not hidden)
  const activeVisualClips = project.clips
    .filter((c) => {
      const track = trackMap.get(c.trackId);
      if (track?.hidden) return false;
      return (
        playhead >= c.start &&
        playhead <= c.start + c.duration &&
        (c.type === 'video' || c.type === 'image' || c.type === 'text' || c.type === 'caption' || c.type === 'overlay')
      );
    })
    .sort((a, b) => {
      const trackA = trackMap.get(a.trackId)?.order ?? 0;
      const trackB = trackMap.get(b.trackId)?.order ?? 0;
      return trackA - trackB;
    });

  // Audio clips and video audio at current playhead position
  const activeAudioClips = project.clips.filter((c) => {
    const track = trackMap.get(c.trackId);
    if (track?.muted) return false;
    if (hasSoloTrack && !track?.solo) return false;
    return playhead >= c.start && playhead <= c.start + c.duration;
  });

  // Aspect ratio canvas sizing
  const getAspectRatioDimensions = (ratio: AspectRatio) => {
    switch (ratio) {
      case '9:16':
        return { aspect: '9/16', maxH: '520px', maxW: '292px' };
      case '16:9':
        return { aspect: '16/9', maxH: '480px', maxW: '853px' };
      case '1:1':
        return { aspect: '1/1', maxH: '490px', maxW: '490px' };
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

  // Synchronize active HTMLVideoElements and HTMLAudioElements with the playhead
  useEffect(() => {
    activeVisualClips.forEach((clip) => {
      if (clip.type === 'video') {
        const vEl = videoRefs.current.get(clip.id);
        if (vEl) {
          const speed = Math.max(0.25, clip.speed?.speed || 1);
          const localOffset = playhead - clip.start;
          let targetTime = (clip.sourceStart || 0) + localOffset * speed;
          if (clip.speed?.reverse) {
            targetTime = (clip.sourceStart || 0) + (clip.duration - localOffset) * speed;
          }
          if (clip.speed?.isFreezeFrame) {
            targetTime = clip.sourceStart || 0;
          }

          if (Math.abs(vEl.currentTime - targetTime) > 0.15) {
            try {
              vEl.currentTime = targetTime;
            } catch {}
          }

          if (isPlaying) {
            vEl.playbackRate = clip.speed?.isFreezeFrame ? 0 : speed;
            vEl.play().catch(() => {});
          } else {
            vEl.pause();
          }
        }
      }
    });

    // Handle audio tracks and audio playback
    activeAudioClips.forEach((clip) => {
      const aEl = audioRefs.current.get(clip.id);
      if (aEl) {
        const speed = Math.max(0.25, clip.speed?.speed || 1);
        const localOffset = playhead - clip.start;
        const targetTime = (clip.sourceStart || 0) + localOffset * speed;

        if (Math.abs(aEl.currentTime - targetTime) > 0.15) {
          try {
            aEl.currentTime = targetTime;
          } catch {}
        }

        const evalTransform = evaluateClipKeyframes(clip, playhead);
        const track = trackMap.get(clip.trackId);
        const trackMuted = track?.muted || isMuted;
        const soloSilenced = hasSoloTrack && !track?.solo;
        const finalVol = trackMuted || soloSilenced ? 0 : Math.max(0, Math.min(1, evalTransform.volume / 100));

        aEl.volume = finalVol;
        if (isPlaying) {
          aEl.playbackRate = speed;
          aEl.play().catch(() => {});
        } else {
          aEl.pause();
        }
      }
    });

    // Pause any clips that have exited active window
    videoRefs.current.forEach((el, id) => {
      if (!activeVisualClips.some((c) => c.id === id)) {
        el.pause();
      }
    });
    audioRefs.current.forEach((el, id) => {
      if (!activeAudioClips.some((c) => c.id === id)) {
        el.pause();
      }
    });
  }, [playhead, isPlaying, isMuted, activeVisualClips, activeAudioClips, hasSoloTrack]);

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
      const nextScale = Math.max(0.15, Math.min(4.0, Number((origScale + scaleDelta).toFixed(2))));
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

  // Find topmost active video for blurred background if project.background.type === 'blur'
  const primaryVideoClip = activeVisualClips.find((c) => c.type === 'video');

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
            {project.aspectRatio} · {project.fps} FPS · {formatTimecode(playhead)}
          </span>
          {activeVisualClips.length > 0 && (
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {activeVisualClips.length} active layer{activeVisualClips.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? 'Unmute Preview Audio' : 'Mute Preview Audio'}
            className={`p-1.5 rounded-lg border border-studio-border transition cursor-pointer ${
              isMuted
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border-rose-400'
                : 'bg-slate-50 dark:bg-studio-950 text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

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
            height: '100%',
            backgroundColor: project.background?.type === 'color' ? project.background.color || '#000000' : '#000000'
          }}
        >
          {/* Background Layer: Blurred Duplicate Video Background (CapCut style) */}
          {project.background?.type === 'blur' && primaryVideoClip?.url && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
              <video
                src={primaryVideoClip.url}
                className="h-full w-full object-cover blur-2xl scale-125"
                muted
              />
            </div>
          )}

          {/* Active Visual Layers */}
          {activeVisualClips.map((clip) => {
            const isSel = selectedClip?.id === clip.id;
            const tf = clip.transform || {};
            const cg = clip.colorGrading || {};

            // Dynamic keyframe & transition evaluation
            const evalTransform = evaluateClipKeyframes(clip, playhead);

            // Compute CSS Filters
            const b = 1 + (cg.brightness || 0) / 100 + evalTransform.transitionFlash;
            const c = 1 + (cg.contrast || 0) / 100;
            const s = 1 + (cg.saturation || 0) / 100;
            const hue = cg.hue || 0;
            const blurVal = evalTransform.transitionBlurPx;

            let filterStr = `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hue}deg)`;
            if (blurVal > 0) {
              filterStr += ` blur(${blurVal}px)`;
            }

            // Transform matrix
            const finalScale = evalTransform.scale * evalTransform.transitionScale;
            const finalOpacity = evalTransform.opacity * evalTransform.transitionOpacity;
            const finalX = evalTransform.x + evalTransform.transitionTranslateX;
            const finalY = evalTransform.y + evalTransform.transitionTranslateY;
            const scaleX = tf.flipH ? -finalScale : finalScale;
            const scaleY = tf.flipV ? -finalScale : finalScale;

            // Crop Inset
            const cropTop = tf.cropTop || 0;
            const cropRight = tf.cropRight || 0;
            const cropBottom = tf.cropBottom || 0;
            const cropLeft = tf.cropLeft || 0;
            const hasCrop = cropTop > 0 || cropRight > 0 || cropBottom > 0 || cropLeft > 0;
            const clipPath = hasCrop
              ? `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`
              : undefined;

            return (
              <div
                key={clip.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${finalX}px, ${finalY}px) scale(${scaleX}, ${scaleY}) rotate(${evalTransform.rotation}deg)`,
                  opacity: Math.max(0, Math.min(1, finalOpacity)),
                  filter: filterStr,
                  clipPath
                }}
              >
                {/* Media Element: Video */}
                {clip.type === 'video' && clip.url ? (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(clip.id, el);
                      else videoRefs.current.delete(clip.id);
                    }}
                    src={clip.url}
                    className={`h-full w-full ${tf.fitMode === 'fill' ? 'object-cover' : 'object-contain'}`}
                    playsInline
                    muted
                  />
                ) : clip.type === 'image' && clip.url ? (
                  <img
                    src={clip.url}
                    alt={clip.name}
                    className={`h-full w-full ${tf.fitMode === 'fill' ? 'object-cover' : 'object-contain'}`}
                  />
                ) : clip.type === 'text' || clip.type === 'caption' ? (
                  clip.titleDesign ? (
                    (() => {
                      const localTime = Math.max(0, Math.min(clip.duration, playhead - clip.start));
                      const canvasW = project.aspectRatio === '16:9' ? 1920 : 1080;
                      const canvasH = project.aspectRatio === '16:9' ? 1080 : 1920;
                      const mg = evaluateMotionGraphicAtTime(
                        clip.titleDesign,
                        localTime,
                        clip.duration,
                        canvasW,
                        canvasH
                      );
                      const td = clip.titleDesign;
                      const hasGradient = td.gradient?.enabled && td.gradient.colors.length >= 2;
                      const gradientStyle: React.CSSProperties = hasGradient
                        ? {
                            backgroundImage: `linear-gradient(${td.gradient!.angle || 90}deg, ${td.gradient!.colors.join(', ')})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }
                        : { color: td.textColor || '#FFFFFF' };

                      const textShadowStyle = td.shadow?.enabled
                        ? `${td.shadow.x || 0}px ${td.shadow.y || 4}px ${td.shadow.blur || 12}px ${td.shadow.color || '#000000'}`
                        : undefined;

                      const textStrokeStyle = td.stroke?.enabled
                        ? `${td.stroke.width || 1}px ${td.stroke.color || '#000000'}`
                        : undefined;

                      return (
                        <div
                          className="relative flex flex-col items-center justify-center select-none"
                          style={{
                            transform: `translate(${mg.translateX + mg.glitchOffsetX}px, ${mg.translateY + mg.glitchOffsetY}px) scale(${mg.scale}) rotate(${mg.rotation}deg)`,
                            opacity: mg.opacity,
                            filter: mg.blur > 0 ? `blur(${mg.blur}px)` : undefined,
                            clipPath: mg.maskClipPath !== 'none' ? mg.maskClipPath : undefined,
                            width: td.backgroundBox?.fullWidth ? '100%' : undefined
                          }}
                        >
                          {/* Optional Background Box / Pill / Banner */}
                          {mg.background.enabled && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                backgroundColor: mg.background.color || '#000000',
                                opacity: mg.background.opacity,
                                borderRadius: `${mg.background.borderRadius || 8}px`,
                                backdropFilter: mg.background.blurBackdrop ? 'blur(12px)' : undefined
                              }}
                            />
                          )}

                          {/* Content Container */}
                          <div
                            className="relative z-10 flex flex-col"
                            style={{
                              padding: mg.background.enabled
                                ? `${td.backgroundBox?.paddingY || 12}px ${td.backgroundBox?.paddingX || 24}px`
                                : undefined,
                              textAlign: td.textAlign || 'center',
                              alignItems: td.textAlign === 'left' ? 'flex-start' : td.textAlign === 'right' ? 'flex-end' : 'center'
                            }}
                          >
                            {/* Accent line/bar (left) */}
                            {mg.accent.enabled && mg.accent.position === 'left' && (
                              <div
                                className="absolute left-0 top-2 bottom-2 rounded-full"
                                style={{
                                  width: `${mg.accent.width || 4}px`,
                                  backgroundColor: mg.accent.color || '#6366f1',
                                  opacity: mg.accent.opacity
                                }}
                              />
                            )}

                            {/* Tagline / Category Tag (if present) */}
                            {td.taglineText && (
                              <span
                                className="inline-block px-2 py-0.5 mb-1 text-[11px] font-mono font-extrabold uppercase tracking-widest rounded bg-red-600 text-white"
                              >
                                {td.taglineText}
                              </span>
                            )}

                            {/* Main Title Typography */}
                            <div
                              style={{
                                fontFamily: td.fontFamily || 'sans-serif',
                                fontSize: `${Math.round(td.fontSize * 0.75)}px`,
                                fontWeight: td.fontWeight || 800,
                                letterSpacing: `${mg.letterSpacing}px`,
                                lineHeight: td.lineHeight || 1.15,
                                textShadow: textShadowStyle,
                                WebkitTextStroke: textStrokeStyle,
                                ...gradientStyle
                              }}
                            >
                              {mg.mainText}
                              {mg.typewriterCursor && <span className="animate-pulse">|</span>}
                            </div>

                            {/* Accent line (bottom) */}
                            {mg.accent.enabled && mg.accent.position === 'bottom' && (
                              <div
                                className="my-1.5 rounded-full"
                                style={{
                                  width: '60%',
                                  height: `${mg.accent.width || 3}px`,
                                  backgroundColor: mg.accent.color || '#D4AF37',
                                  opacity: mg.accent.opacity
                                }}
                              />
                            )}

                            {/* Subtitle Typography */}
                            {mg.subtitleText && (
                              <div
                                className="mt-1"
                                style={{
                                  fontFamily: td.subtitleFontFamily || 'sans-serif',
                                  fontSize: `${Math.round((td.subtitleFontSize || 16) * 0.75)}px`,
                                  fontWeight: td.subtitleFontWeight || 600,
                                  color: td.subtitleColor || '#D4AF37',
                                  letterSpacing: `${td.subtitleTracking || 3}px`
                                }}
                              >
                                {mg.subtitleText}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div
                      className="px-6 py-3 font-sans font-black text-2xl text-white text-center rounded-xl select-none"
                      style={{
                        textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)',
                        letterSpacing: '0.05em',
                        backgroundColor: clip.captionPresetId?.includes('pill') ? 'rgba(0,0,0,0.6)' : undefined
                      }}
                    >
                      {clip.text}
                    </div>
                  )
                ) : null}

                {/* Vignette Overlay if enabled on clip */}
                {clip.effects?.some((e) => e.type === 'vignette' && e.enabled) && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.75) 100%)'
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Hidden Audio Elements for Multitrack Audio Mixing */}
          {activeAudioClips.map((clip) => {
            if (clip.type === 'audio' && clip.url) {
              return (
                <audio
                  key={clip.id}
                  ref={(el) => {
                    if (el) audioRefs.current.set(clip.id, el);
                    else audioRefs.current.delete(clip.id);
                  }}
                  src={clip.url}
                  preload="auto"
                />
              );
            }
            return null;
          })}

          {/* Interactive Bounding Box for Selected Clip */}
          {selectedClip && activeVisualClips.some((c) => c.id === selectedClip.id) && (
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
                {selectedClip.transform?.rotation ? (
                  <>
                    <span>·</span>
                    <span>{selectedClip.transform.rotation}°</span>
                  </>
                ) : null}
              </div>

              {/* 4 Corner Resize Handles */}
              {['tl', 'tr', 'bl', 'br'].map((pos) => (
                <div
                  key={pos}
                  onPointerDown={(e) => handlePointerDown(e, 'scale')}
                  className={`absolute h-3.5 w-3.5 rounded-full bg-white border-2 border-indigo-600 shadow cursor-nwse-resize ${
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
        </div>
      </div>

      {/* Bottom Transport Deck */}
      <div className="mt-3 flex items-center justify-between border-t border-studio-border pt-2.5">
        <div className="flex items-center gap-1 font-mono text-xs font-bold">
          <span className="text-indigo-600 dark:text-indigo-400">{formatTimecode(playhead)}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500">{formatTimecode(project.duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, playhead - 1))}
            title="Rewind 1s"
            className="p-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-black dark:bg-white text-white dark:text-black shadow hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.min(project.duration, playhead + 1))}
            title="Forward 1s"
            className="p-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Quality indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span>Real-time Canvas</span>
        </div>
      </div>
    </div>
  );
};
