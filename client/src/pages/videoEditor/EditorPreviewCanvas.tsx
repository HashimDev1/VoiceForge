import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  ChevronDown,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Move,
  RotateCw as RotateIcon
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
  const stageRef = useRef<HTMLDivElement>(null);

  // References to active media elements for real-time playhead synchronization
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origScale: number;
    origRotation: number;
    centerX: number;
    centerY: number;
    mode: 'move' | 'scale' | 'rotate';
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
        return { aspect: '9/16', maxH: '100%', maxW: '320px', label: '9:16' };
      case '16:9':
        return { aspect: '16/9', maxH: '100%', maxW: '100%', label: '16:9' };
      case '1:1':
        return { aspect: '1/1', maxH: '100%', maxW: '460px', label: '1:1' };
      case '4:5':
        return { aspect: '4/5', maxH: '100%', maxW: '380px', label: '4:5' };
      default:
        return { aspect: '9/16', maxH: '100%', maxW: '320px', label: '9:16' };
    }
  };

  const dims = getAspectRatioDimensions(project.aspectRatio);

  const fps = project.fps || 30;

  // Format timecode HH:MM:SS:FF like CapCut desktop
  const formatTimecodeCapCut = (sec: number) => {
    const s = Math.max(0, sec || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * fps);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
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
  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'scale' | 'rotate') => {
    if (!selectedClip) return;
    e.preventDefault();
    e.stopPropagation();

    let centerX = 0;
    let centerY = 0;
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: selectedClip.transform?.x || 0,
      origY: selectedClip.transform?.y || 0,
      origScale: selectedClip.transform?.scale || 1,
      origRotation: selectedClip.transform?.rotation || 0,
      centerX,
      centerY,
      mode
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !selectedClip) return;
    const { startX, startY, origX, origY, origScale, origRotation, centerX, centerY, mode } = dragRef.current;
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
    } else if (mode === 'rotate') {
      const startAngle = Math.atan2(startY - centerY, startX - centerX) * (180 / Math.PI);
      const currAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const deltaAngle = Math.round(currAngle - startAngle);
      let newRot = (origRotation + deltaAngle) % 360;
      if (newRot > 180) newRot -= 360;
      if (newRot < -180) newRot += 360;
      onUpdateClip(selectedClip.id, {
        transform: {
          ...selectedClip.transform,
          rotation: newRot
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

  const stepFrame = useCallback((direction: -1 | 1) => {
    const frameDuration = 1 / fps;
    const target = Math.max(0, Math.min(project.duration, playhead + direction * frameDuration));
    onSeek(Number(target.toFixed(3)));
  }, [fps, playhead, project.duration, onSeek]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-[#15191F] border border-[#242A33] overflow-hidden select-none"
    >
      {/* 1. Header Bar: Player-Timeline 01 (CapCut Desktop style) */}
      <div className="h-9 shrink-0 bg-[#15191F] border-b border-[#242A33] px-3 flex items-center justify-between text-xs text-[#F0F3F7]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs text-[#F0F3F7] tracking-tight">Player-Timeline 01</span>
          <span className="text-[#747F90]">·</span>
          <span className="px-1.5 py-0.5 rounded bg-[#242A33] text-[10px] font-mono text-[#A4AFBD] border border-[#303740]">
            {dims.label}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#242A33] text-[10px] font-mono text-[#747F90] hidden sm:inline border border-[#303740]">
            {fps} FPS
          </span>
          {activeVisualClips.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#48C994]/15 text-[10px] font-mono font-medium text-[#48C994] border border-[#48C994]/30 hidden md:inline">
              {activeVisualClips.length} Layer{activeVisualClips.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mute Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? 'Unmute Preview Audio' : 'Mute Preview Audio'}
            className={`p-1 rounded hover:bg-[#242A33] transition-colors cursor-pointer ${
              isMuted ? 'text-[#F06B77]' : 'text-[#A4AFBD] hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Safe Zones Toggle */}
          <button
            type="button"
            onClick={() => setShowSafeZones((s) => !s)}
            title="Toggle Safe Margins"
            className={`p-1 rounded hover:bg-[#242A33] transition-colors cursor-pointer ${
              showSafeZones ? 'text-[#40D5CB] bg-[#242A33]' : 'text-[#A4AFBD] hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
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
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Center Video Viewport Area (Matte Dark Stage #0B0E13) */}
      <div className="relative flex flex-1 items-center justify-center min-h-0 bg-[#0B0E13] overflow-hidden p-2">
        {/* Aspect Ratio Canvas Stage */}
        <div
          ref={stageRef}
          className="relative bg-black rounded shadow-2xl flex items-center justify-center select-none"
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

                            {/* Tagline / Category Tag */}
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

          {/* Interactive Bounding Box for Selected Clip (CapCut Desktop style with corner + midpoint handles and rotation anchor) */}
          {selectedClip && activeVisualClips.some((c) => c.id === selectedClip.id) && (
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute z-30 cursor-move border border-white pointer-events-auto shadow-[0_0_12px_rgba(0,0,0,0.6)]"
              style={{
                width: '75%',
                height: '75%',
                transform: `translate(${selectedClip.transform?.x || 0}px, ${selectedClip.transform?.y || 0}px) scale(${selectedClip.transform?.scale || 1}) rotate(${selectedClip.transform?.rotation || 0}deg)`
              }}
            >
              {/* Floating HUD info badge above box */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded bg-[#15191F]/90 border border-[#303740] px-2 py-0.5 text-[9px] font-mono font-medium text-[#F0F3F7] whitespace-nowrap shadow backdrop-blur-sm pointer-events-none">
                <span>Scale: {Math.round((selectedClip.transform?.scale || 1) * 100)}%</span>
                <span className="text-[#747F90]">·</span>
                <span>X: {selectedClip.transform?.x || 0}</span>
                <span className="text-[#747F90]">·</span>
                <span>Y: {selectedClip.transform?.y || 0}</span>
                {selectedClip.transform?.rotation ? (
                  <>
                    <span className="text-[#747F90]">·</span>
                    <span>{selectedClip.transform.rotation}°</span>
                  </>
                ) : null}
              </div>

              {/* 4 Corner Resize Handles (white square with subtle border) */}
              {['tl', 'tr', 'bl', 'br'].map((pos) => (
                <div
                  key={pos}
                  onPointerDown={(e) => handlePointerDown(e, 'scale')}
                  className={`absolute h-2.5 w-2.5 bg-white border border-[#242A33] shadow cursor-nwse-resize ${
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

              {/* 4 Midpoint Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute top-1/2 -left-1 -translate-y-1/2 h-2.5 w-1.5 bg-white border border-[#242A33] shadow cursor-ew-resize"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute top-1/2 -right-1 -translate-y-1/2 h-2.5 w-1.5 bg-white border border-[#242A33] shadow cursor-ew-resize"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-2.5 bg-white border border-[#242A33] shadow cursor-ns-resize"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-2.5 bg-white border border-[#242A33] shadow cursor-ns-resize"
              />

              {/* Bottom Rotation Stem & Handle (Matches CapCut Reference Image) */}
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                <div className="w-px h-3 bg-white/70" />
                <button
                  type="button"
                  onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                  title="Drag to rotate"
                  className="w-5 h-5 rounded-full bg-[#1B2028] border border-white/80 shadow flex items-center justify-center text-white hover:bg-[#40D5CB] hover:text-[#0B0E13] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <RotateIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Safe Zones Overlay for TikTok/Reels/Shorts */}
          {showSafeZones && (
            <div className="pointer-events-none absolute inset-0 z-40 border border-dashed border-[#40D5CB]/40 p-4">
              <div className="flex h-full w-full flex-col justify-between">
                <div className="rounded bg-[#0B0E13]/80 px-2 py-0.5 font-mono text-[9px] text-[#40D5CB] self-center border border-[#40D5CB]/30">
                  TOP SAFE ZONE
                </div>
                <div className="rounded bg-[#0B0E13]/80 px-2 py-0.5 font-mono text-[9px] text-[#40D5CB] self-center border border-[#40D5CB]/30">
                  BOTTOM CAPTION SAFE ZONE
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Transport Deck (Compact CapCut Desktop Player Bar) */}
      <div className="h-10 shrink-0 bg-[#15191F] border-t border-[#242A33] px-3 flex items-center justify-between text-xs text-[#A4AFBD]">
        {/* Left: Timecode and Total Duration */}
        <div className="flex items-center gap-1.5 font-mono text-xs select-text">
          <span className="font-semibold text-[#40D5CB]">{formatTimecodeCapCut(playhead)}</span>
          <span className="text-[#747F90]">/</span>
          <span className="text-[#747F90]">{formatTimecodeCapCut(project.duration)}</span>
        </div>

        {/* Center: Transport Playback Controls */}
        <div className="flex items-center gap-1">
          {/* Seek to Start */}
          <button
            type="button"
            onClick={() => onSeek(0)}
            title="Go to Start (Home)"
            className="p-1 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition-colors cursor-pointer"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          {/* Previous Frame */}
          <button
            type="button"
            onClick={() => stepFrame(-1)}
            title="Previous Frame (Left Arrow)"
            className="p-1 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="mx-1 flex items-center justify-center h-7 w-7 rounded-full bg-white text-[#0B0E13] hover:bg-[#40D5CB] hover:scale-105 active:scale-95 transition-all shadow cursor-pointer"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />}
          </button>

          {/* Next Frame */}
          <button
            type="button"
            onClick={() => stepFrame(1)}
            title="Next Frame (Right Arrow)"
            className="p-1 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Seek to End */}
          <button
            type="button"
            onClick={() => onSeek(project.duration)}
            title="Go to End (End)"
            className="p-1 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white transition-colors cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Aspect ratio badge and resolution */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#747F90]">
          <span className="hidden sm:inline">1080p</span>
          <span className="px-1.5 py-0.5 rounded bg-[#242A33] text-[10px] text-[#A4AFBD] border border-[#303740]">
            {project.aspectRatio}
          </span>
        </div>
      </div>
    </div>
  );
};
