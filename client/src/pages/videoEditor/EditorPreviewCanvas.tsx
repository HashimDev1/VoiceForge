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
import { unlockAudio } from '../../lib/audioUnlocker';

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!viewportRef.current) return;
    const updateSize = () => {
      if (viewportRef.current) {
        const { clientWidth, clientHeight } = viewportRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setViewportDims({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportDims({ width, height });
        }
      }
    });
    ro.observe(viewportRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // References to active media elements for real-time playhead synchronization
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const prevIsPlayingRef = useRef(false);
  // Set of media clip IDs currently instructed to play to eliminate continuous seek/abort loops
  const playingMediaIdsRef = useRef<Set<string>>(new Set());

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
        return { aspect: '9/16', num: 9 / 16, label: '9:16' };
      case '16:9':
        return { aspect: '16/9', num: 16 / 9, label: '16:9' };
      case '1:1':
        return { aspect: '1/1', num: 1, label: '1:1' };
      case '4:5':
        return { aspect: '4/5', num: 4 / 5, label: '4:5' };
      default:
        return { aspect: '16/9', num: 16 / 9, label: '16:9' };
    }
  };

  const dims = getAspectRatioDimensions(project.aspectRatio);

  let stageStyle: React.CSSProperties = {
    aspectRatio: dims.aspect,
    maxWidth: '100%',
    maxHeight: '100%',
    backgroundColor: project.background?.type === 'color' ? project.background.color || '#000000' : '#000000'
  };

  if (viewportDims.width > 0 && viewportDims.height > 0) {
    const pad = 24;
    const maxW = Math.max(100, viewportDims.width - pad);
    const maxH = Math.max(100, viewportDims.height - pad);
    let targetW = maxW;
    let targetH = targetW / dims.num;
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * dims.num;
    }
    stageStyle = {
      ...stageStyle,
      width: `${Math.round(targetW)}px`,
      height: `${Math.round(targetH)}px`
    };
  } else {
    stageStyle = {
      ...stageStyle,
      width: dims.aspect === '16/9' ? '100%' : 'auto',
      height: dims.aspect === '9/16' ? '100%' : 'auto'
    };
  }

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

  // Synchronize active HTMLVideoElements and HTMLAudioElements with the playhead smoothly
  useEffect(() => {
    const isPlayingJustChanged = prevIsPlayingRef.current !== isPlaying;
    prevIsPlayingRef.current = isPlaying;

    if (!isPlaying) {
      // Clear playback tracking
      playingMediaIdsRef.current.clear();

      // Pause and align active visual video clips
      activeVisualClips.forEach((clip) => {
        if (clip.type === 'video') {
          const vEl = videoRefs.current.get(clip.id);
          if (vEl) {
            if (!vEl.paused) {
              try { vEl.pause(); } catch {}
            }
            const speed = Math.max(0.25, clip.speed?.speed || 1);
            const localOffset = playhead - clip.start;
            let targetTime = (clip.sourceStart || 0) + localOffset * speed;
            if (clip.speed?.reverse) {
              targetTime = (clip.sourceStart || 0) + (clip.duration - localOffset) * speed;
            }
            if (clip.speed?.isFreezeFrame) {
              targetTime = clip.sourceStart || 0;
            }
            if (Math.abs(vEl.currentTime - targetTime) > 0.04) {
              try { vEl.currentTime = targetTime; } catch {}
            }
          }
        }
      });

      // Pause and align all audio clips
      project.clips.forEach((clip) => {
        if (clip.type === 'audio') {
          const aEl = audioRefs.current.get(clip.id);
          if (aEl) {
            if (!aEl.paused) {
              try { aEl.pause(); } catch {}
            }
            const speed = Math.max(0.25, clip.speed?.speed || 1);
            const localOffset = playhead - clip.start;
            const targetTime = (clip.sourceStart || 0) + localOffset * speed;
            if (Math.abs(aEl.currentTime - targetTime) > 0.04) {
              try { aEl.currentTime = targetTime; } catch {}
            }
          }
        }
      });

      return;
    }

    // -------------------------------------------------------------
    // PLAYING STATE (isPlaying === true)
    // -------------------------------------------------------------

    // 1. Synchronize Video elements (visual clips)
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

          // Evaluate video audio settings (volume, mute, fade, keyframes)
          const evalTransform = evaluateClipKeyframes(clip, playhead);
          const track = trackMap.get(clip.trackId);
          const trackMuted = track?.muted || isMuted;
          const soloSilenced = hasSoloTrack && !track?.solo;
          const clipMuted = Boolean(clip.audio?.muted);
          const isVideoMuted = trackMuted || soloSilenced || clipMuted;
          const finalVol = isVideoMuted ? 0 : Math.max(0, Math.min(1, (evalTransform.volume ?? 100) / 100));

          vEl.muted = isVideoMuted;
          vEl.volume = finalVol;

          const isAlreadyPlaying = playingMediaIdsRef.current.has(clip.id);

          if (!isAlreadyPlaying || isPlayingJustChanged) {
            playingMediaIdsRef.current.add(clip.id);
            vEl.playbackRate = clip.speed?.isFreezeFrame ? 0 : speed;
            try { vEl.currentTime = targetTime; } catch {}
            vEl.play().catch(() => {});
          } else {
            // Smooth playback: check drift
            const drift = Math.abs(vEl.currentTime - targetTime);
            if (drift > 0.45 && !vEl.seeking) {
              // Large drift (user scrubbed or skipped ahead): hard re-sync
              try { vEl.currentTime = targetTime; } catch {}
            } else if (drift > 0.05 && !clip.speed?.isFreezeFrame) {
              // Smooth micro-nudge playbackRate to close drift gap without buffer interruption
              vEl.playbackRate = speed * (targetTime > vEl.currentTime ? 1.04 : 0.96);
            } else if (!clip.speed?.isFreezeFrame) {
              vEl.playbackRate = speed;
            }
          }
        }
      }
    });

    // 2. Synchronize Audio elements (all audio track clips)
    project.clips.forEach((clip) => {
      if (clip.type === 'audio') {
        const aEl = audioRefs.current.get(clip.id);
        if (aEl) {
          const isActive = playhead >= clip.start && playhead <= clip.start + clip.duration;
          const speed = Math.max(0.25, clip.speed?.speed || 1);
          const localOffset = playhead - clip.start;
          const targetTime = (clip.sourceStart || 0) + localOffset * speed;

          if (!isActive) {
            if (playingMediaIdsRef.current.has(clip.id)) {
              playingMediaIdsRef.current.delete(clip.id);
              try { aEl.pause(); } catch {}
            }
          } else {
            const evalTransform = evaluateClipKeyframes(clip, playhead);
            const track = trackMap.get(clip.trackId);
            const trackMuted = track?.muted || isMuted;
            const soloSilenced = hasSoloTrack && !track?.solo;
            const clipMuted = Boolean(clip.audio?.muted);
            const isAudioMuted = trackMuted || soloSilenced || clipMuted;
            const finalVol = isAudioMuted ? 0 : Math.max(0, Math.min(1, (evalTransform.volume ?? 100) / 100));

            aEl.muted = isAudioMuted;
            aEl.volume = finalVol;

            const isAlreadyPlaying = playingMediaIdsRef.current.has(clip.id);

            if (!isAlreadyPlaying || isPlayingJustChanged) {
              playingMediaIdsRef.current.add(clip.id);
              aEl.playbackRate = speed;
              try { aEl.currentTime = targetTime; } catch {}
              aEl.play().catch(() => {});
            } else {
              // Smooth audio playback: check drift
              const drift = Math.abs(aEl.currentTime - targetTime);
              if (drift > 0.45 && !aEl.seeking) {
                // Large drift (scrub or jump): hard seek
                try { aEl.currentTime = targetTime; } catch {}
              } else if (drift > 0.05) {
                // Micro-nudge playbackRate to keep audio sample-accurate without buffer drops or clicks
                aEl.playbackRate = speed * (targetTime > aEl.currentTime ? 1.04 : 0.96);
              } else {
                aEl.playbackRate = speed;
              }
            }
          }
        }
      }
    });

    // 3. Pause visual video clips that are no longer active
    videoRefs.current.forEach((el, id) => {
      if (!activeVisualClips.some((c) => c.id === id)) {
        if (playingMediaIdsRef.current.has(id)) {
          playingMediaIdsRef.current.delete(id);
          try { el.pause(); } catch {}
        }
      }
    });
  }, [playhead, isPlaying, isMuted, activeVisualClips, project.clips, hasSoloTrack]);

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
      className="flex flex-col h-full w-full bg-[#181B20] overflow-hidden select-none"
    >
      {/* 1. Header Bar: Player-Timeline 01 (CapCut exact layout) */}
      <div className="h-10 shrink-0 bg-[#181B20] border-b border-[#262A34] px-3 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans font-semibold text-xs text-slate-200 tracking-tight">Player-Timeline 01</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? 'Unmute Preview Audio' : 'Mute Preview Audio'}
            className={`p-1 rounded hover:bg-[#282D38] transition cursor-pointer ${
              isMuted ? 'text-rose-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Safe Zones Toggle */}
          <button
            type="button"
            onClick={() => setShowSafeZones((s) => !s)}
            title="Toggle Safe Margins"
            className={`p-1 rounded transition cursor-pointer ${
              showSafeZones
                ? 'text-[#13E2CA] bg-[#1E2C33]'
                : 'text-slate-400 hover:text-white hover:bg-[#282D38]'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
          </button>

          {/* Hamburger Menu Icon */}
          <button
            type="button"
            title="Player Options"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <span className="text-base leading-none font-bold">≡</span>
          </button>
        </div>
      </div>

      {/* 2. Center Video Viewport Area (Matte Dark Stage) */}
      <div
        ref={viewportRef}
        className="relative flex flex-1 items-center justify-center min-h-0 min-w-0 bg-[#0E1013] overflow-hidden p-3"
      >
        {/* Aspect Ratio Canvas Stage */}
        <div
          ref={stageRef}
          className="relative bg-black rounded shadow-2xl flex items-center justify-center select-none overflow-hidden shrink-0"
          style={stageStyle}
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
                    muted={
                      isMuted ||
                      trackMap.get(clip.trackId)?.muted ||
                      (hasSoloTrack && !trackMap.get(clip.trackId)?.solo) ||
                      Boolean(clip.audio?.muted)
                    }
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

          {/* Hidden Persistent Audio Elements for Multitrack Audio Mixing */}
          {project.clips
            .filter((c) => c.type === 'audio' && c.url)
            .map((clip) => (
              <audio
                key={clip.id}
                ref={(el) => {
                  if (el) audioRefs.current.set(clip.id, el);
                  else audioRefs.current.delete(clip.id);
                }}
                src={clip.url}
                preload="auto"
                playsInline
                muted={
                  isMuted ||
                  trackMap.get(clip.trackId)?.muted ||
                  (hasSoloTrack && !trackMap.get(clip.trackId)?.solo) ||
                  Boolean(clip.audio?.muted)
                }
              />
            ))}

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
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 text-[9px] font-mono font-bold text-white whitespace-nowrap shadow backdrop-blur-sm pointer-events-none">
                <span>Scale: {Math.round((selectedClip.transform?.scale || 1) * 100)}%</span>
                <span className="text-slate-500">·</span>
                <span>X: {selectedClip.transform?.x || 0}</span>
                <span className="text-slate-500">·</span>
                <span>Y: {selectedClip.transform?.y || 0}</span>
                {selectedClip.transform?.rotation ? (
                  <>
                    <span className="text-slate-500">·</span>
                    <span>{selectedClip.transform.rotation}°</span>
                  </>
                ) : null}
              </div>

              {/* 4 Corner Resize Handles */}
              {['tl', 'tr', 'bl', 'br'].map((pos) => (
                <div
                  key={pos}
                  onPointerDown={(e) => handlePointerDown(e, 'scale')}
                  className={`absolute h-2.5 w-2.5 bg-white border border-slate-900 shadow cursor-nwse-resize rounded-xs ${
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
                className="absolute top-1/2 -left-1 -translate-y-1/2 h-2.5 w-1.5 bg-white border border-slate-900 shadow cursor-ew-resize rounded-xs"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute top-1/2 -right-1 -translate-y-1/2 h-2.5 w-1.5 bg-white border border-slate-900 shadow cursor-ew-resize rounded-xs"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-2.5 bg-white border border-slate-900 shadow cursor-ns-resize rounded-xs"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'scale')}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-2.5 bg-white border border-slate-900 shadow cursor-ns-resize rounded-xs"
              />

              {/* Bottom Rotation Stem & Semi-Circular Arch Handle (CapCut exact style) */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                <div className="w-px h-2.5 bg-white" />
                <button
                  type="button"
                  onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                  title="Drag to rotate"
                  className="w-5 h-3 border-t-2 border-l-2 border-r-2 border-white hover:border-[#13E2CA] rounded-t-full flex items-center justify-center cursor-grab active:cursor-grabbing transition"
                />
              </div>
            </div>
          )}

          {/* Safe Zones Overlay for TikTok/Reels/Shorts */}
          {showSafeZones && (
            <div className="pointer-events-none absolute inset-0 z-40 border border-dashed border-[#13E2CA]/40 p-4">
              <div className="flex h-full w-full flex-col justify-between">
                <div className="rounded-full bg-black/80 px-2.5 py-0.5 font-mono text-[9px] font-bold text-[#13E2CA] self-center border border-[#13E2CA]/30">
                  TOP SAFE ZONE
                </div>
                <div className="rounded-full bg-black/80 px-2.5 py-0.5 font-mono text-[9px] font-bold text-[#13E2CA] self-center border border-[#13E2CA]/30">
                  BOTTOM CAPTION SAFE ZONE
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Transport Deck (Exact CapCut Layout) */}
      <div className="h-10 shrink-0 bg-[#181B20] border-t border-[#262A34] px-4 flex items-center justify-between text-xs text-slate-300">
        {/* Left: Bright Cyan/Teal Timecode and Total Duration */}
        <div className="flex items-center gap-1.5 font-mono text-xs select-text">
          <span className="font-bold text-[#13E2CA] tracking-wider">{formatTimecodeCapCut(playhead)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400 font-medium tracking-wider">{formatTimecodeCapCut(project.duration)}</span>
        </div>

        {/* Center: Transport Playback Controls */}
        <div className="flex items-center gap-1.5">
          {/* Seek to Start */}
          <button
            type="button"
            onClick={() => onSeek(0)}
            title="Go to Start (Home)"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <SkipBack className="h-3 w-3" />
          </button>

          {/* Previous Frame */}
          <button
            type="button"
            onClick={() => stepFrame(-1)}
            title="Previous Frame (Left Arrow)"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Play / Pause Primary Button (CapCut Solid White Circle) */}
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              onTogglePlay();
            }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="mx-1 flex items-center justify-center h-7 w-7 rounded-full bg-white text-black hover:bg-slate-200 active:scale-95 transition cursor-pointer shadow-md"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-black stroke-black" /> : <Play className="h-3.5 w-3.5 ml-0.5 fill-black stroke-black" />}
          </button>

          {/* Next Frame */}
          <button
            type="button"
            onClick={() => stepFrame(1)}
            title="Next Frame (Right Arrow)"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Seek to End */}
          <button
            type="button"
            onClick={() => onSeek(project.duration)}
            title="Go to End (End)"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <SkipForward className="h-3 w-3" />
          </button>
        </div>

        {/* Right: Quality, Aspect Ratio & Fullscreen */}
        <div className="flex items-center gap-2 text-[11px] font-sans text-slate-400">
          <span className="hidden sm:inline font-medium hover:text-white cursor-pointer">Full ▾</span>
          <span className="px-2 py-0.5 rounded bg-[#222631] text-[10px] font-mono text-slate-300 border border-[#2D3340]">
            {project.aspectRatio}
          </span>
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
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
