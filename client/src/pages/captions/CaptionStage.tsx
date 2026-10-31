import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Smartphone,
  Tv,
  Square,
  ShieldAlert,
  Minus,
  Plus,
  Scaling
} from 'lucide-react';
import { CaptionStudioSettings, CaptionSegment } from './types';
import { CaptionAnimation, assToHexColor } from '@shared/captionPresets';

interface CaptionStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoSrc: string;
  settings: CaptionStudioSettings;
  onUpdateSettings: <K extends keyof CaptionStudioSettings>(
    key: K,
    val: CaptionStudioSettings[K]
  ) => void;
  segments: CaptionSegment[];
  playhead: number;
  duration: number;
  onSeek: (time: number) => void;
  selectedSegmentId: string;
  onSelectSegment: (id: string) => void;
  isResultVideo: boolean;
  onRemoveVideo: () => void;
}

function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds || 0);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  const wholeSec = Math.floor(remSec);
  const millis = Math.floor((remSec - wholeSec) * 100);
  return `${String(m).padStart(2, '0')}:${String(wholeSec).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

function getAnimationClass(style: CaptionAnimation): string {
  switch (style) {
    case 'pop':
      return 'caption-pop';
    case 'zoom_punch':
      return 'caption-punch';
    case 'bounce':
      return 'caption-bounce';
    case 'pulse':
      return 'caption-pulse';
    case 'zoom':
      return 'caption-zoom';
    case 'slide_up':
      return 'caption-slide';
    case 'typewriter':
      return 'caption-type';
    case 'blur_focus':
      return 'caption-blur-focus';
    case 'glitch':
      return 'caption-glitch';
    case 'fade':
      return 'caption-fade';
    default:
      return 'caption-fade';
  }
}

/**
 * Normalizes any hex or ASS color string into safe CSS rgba(...)
 */
function toCssRgba(colorStr: string | undefined, opacity: number = 1): string {
  if (!colorStr) return `rgba(18, 21, 29, ${opacity})`;
  let hex = colorStr.trim();
  if (hex.startsWith('&H') || hex.startsWith('&h')) {
    hex = assToHexColor(hex);
  }
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length >= 6) {
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    const a = Math.max(0, Math.min(1, opacity));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgba(18, 21, 29, ${opacity})`;
}

/**
 * Computes a multi-point circular text-shadow outline that is drawn 100% BEHIND
 * the text glyphs, leaving the glyph interior/fill completely untouched.
 */
function computeCaptionShadowAndStroke(
  outlineWidth: number,
  outlineColor: string,
  shadowDistance: number,
  shadowColor: string,
  neonGlow: boolean,
  glowOrFillColor: string
): { textShadow: string; webkitTextStroke: string } {
  const parts: string[] = [];
  const r = Math.max(0, outlineWidth);

  if (r >= 0.25) {
    const steps = r > 1.8 ? 16 : 12;
    for (let i = 0; i < steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      const x = Number((r * Math.cos(angle)).toFixed(2));
      const y = Number((r * Math.sin(angle)).toFixed(2));
      parts.push(`${x}px ${y}px 0 ${outlineColor}`);
    }

    if (r > 1.4) {
      const halfR = Number((r * 0.5).toFixed(2));
      for (let i = 0; i < 8; i++) {
        const angle = (i * 2 * Math.PI) / 8;
        const x = Number((halfR * Math.cos(angle)).toFixed(2));
        const y = Number((halfR * Math.sin(angle)).toFixed(2));
        parts.push(`${x}px ${y}px 0 ${outlineColor}`);
      }
    }
  }

  // Drop shadow
  const s = Math.max(0, shadowDistance);
  if (s >= 0.25) {
    const sX = Number((s * 0.5).toFixed(2));
    const sY = Number(s.toFixed(2));
    const blur = Number((s * 1.5).toFixed(2));
    parts.push(`${sX}px ${sY}px ${blur}px ${shadowColor}`);
  }

  // Neon glow
  if (neonGlow) {
    parts.push(
      `0 0 8px ${glowOrFillColor}`,
      `0 0 16px ${glowOrFillColor}`,
      `0 0 24px ${glowOrFillColor}80`
    );
  }

  // Clamp -webkit-text-stroke to subtle edge smoothing (max 0.6px)
  const safeStrokeWidth = r > 0 ? Math.min(0.6, Number((r * 0.2).toFixed(2))) : 0;
  const webkitTextStroke =
    safeStrokeWidth > 0 ? `${safeStrokeWidth}px ${outlineColor}` : 'none';

  return {
    textShadow: parts.length > 0 ? parts.join(', ') : 'none',
    webkitTextStroke
  };
}

export const CaptionStage: React.FC<CaptionStageProps> = ({
  videoRef,
  videoSrc,
  settings,
  onUpdateSettings,
  segments,
  playhead,
  duration,
  onSeek,
  selectedSegmentId,
  onSelectSegment,
  isResultVideo,
  onRemoveVideo
}) => {
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const resizingRef = useRef<{
    startDist: number;
    startFontSize: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(settings.safeZone);
  const [snappedX, setSnappedX] = useState(false);
  const [snappedY, setSnappedY] = useState(false);
  const [stageHeight, setStageHeight] = useState(520);
  const [isResizing, setIsResizing] = useState(false);

  // Dynamically observe stage container height to maintain perfect typography scaling
  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientHeight > 0) {
        setStageHeight(el.clientHeight);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.aspectRatio]);

  // Sync isPlaying state with video
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    return () => {
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
    };
  }, [videoRef, videoSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const stepTime = (delta: number) => {
    const target = Math.max(0, Math.min(duration, playhead + delta));
    onSeek(target);
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // ----------------------------------------------------
  // On-Screen Caption Drag (Position Move)
  // ----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (settings.captionLocked || resizingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // If resizing with mouse, handle dynamic font scaling
    if (resizingRef.current) {
      e.preventDefault();
      const { startDist, startFontSize, centerX, centerY } = resizingRef.current;
      const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const ratio = currentDist / Math.max(15, startDist);
      const newSize = Math.max(18, Math.min(160, Math.round(startFontSize * ratio)));
      if (newSize !== settings.fontSize) {
        onUpdateSettings('fontSize', newSize);
      }
      return;
    }

    // Normal position dragging
    if (!draggingRef.current || !stageContainerRef.current) return;
    const rect = stageContainerRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    // Constrain within stage
    x = Math.max(0.08, Math.min(0.92, x));
    y = Math.max(0.06, Math.min(0.94, y));

    // Snapping guides
    let isSnapX = false;
    let isSnapY = false;
    if (settings.snapToCenter) {
      if (Math.abs(x - 0.5) < 0.04) {
        x = 0.5;
        isSnapX = true;
      }
      if (Math.abs(y - 0.5) < 0.04) {
        y = 0.5;
        isSnapY = true;
      }
    }

    setSnappedX(isSnapX);
    setSnappedY(isSnapY);

    onUpdateSettings('captionX', x);
    onUpdateSettings('captionY', y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingRef.current) {
      resizingRef.current = null;
      setIsResizing(false);
    }
    draggingRef.current = false;
    setSnappedX(false);
    setSnappedY(false);
  };

  // ----------------------------------------------------
  // CapCut Interactive On-Screen Resize Engine
  // ----------------------------------------------------
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    corner: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    if (settings.captionLocked) return;
    e.preventDefault();
    e.stopPropagation();

    const pill = pillRef.current;
    if (!pill) return;
    const rect = pill.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    resizingRef.current = {
      startDist: Math.max(20, startDist),
      startFontSize: settings.fontSize,
      centerX,
      centerY
    };
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const { startDist, startFontSize, centerX, centerY } = resizingRef.current;
    const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const ratio = currentDist / Math.max(15, startDist);
    const newSize = Math.max(18, Math.min(160, Math.round(startFontSize * ratio)));
    if (newSize !== settings.fontSize) {
      onUpdateSettings('fontSize', newSize);
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingRef.current) {
      resizingRef.current = null;
      setIsResizing(false);
    }
  };

  // Mouse wheel scaling on caption pill
  const handleWheelResize = (e: React.WheelEvent<HTMLDivElement>) => {
    if (settings.captionLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 2 : -2;
    const newSize = Math.max(18, Math.min(160, settings.fontSize + delta));
    onUpdateSettings('fontSize', newSize);
  };

  // Smart Active Segment Resolution:
  // 1. Exact timestamp match
  // 2. Bridge brief speech pauses (up to 0.85s) so captions don't flicker/vanish between words
  // 3. Fallback to selected segment in timeline
  // 4. Fallback to first segment at video start (playhead near 0)
  // 5. Fallback to nearest segment within 1.5s when scrubbing/paused
  const activeSegment = React.useMemo(() => {
    if (!segments || segments.length === 0) return null;

    // 1. Direct timestamp match
    const exact = segments.find(
      (seg) => playhead >= seg.start && playhead <= seg.end
    );
    if (exact) return exact;

    // 2. Bridge brief pauses between segments (up to 0.85s) so captions stay visible
    const bridged = segments.find((seg, idx) => {
      const next = segments[idx + 1];
      if (!next) return false;
      return (
        playhead >= seg.end &&
        playhead < next.start &&
        next.start - seg.end <= 0.85
      );
    });
    if (bridged) return bridged;

    // 3. If a segment is explicitly selected in timeline/editor, show it!
    if (selectedSegmentId) {
      const selected = segments.find((seg) => seg.id === selectedSegmentId);
      if (selected) return selected;
    }

    // 4. Near start of video (first 0.3s), display the first caption so the canvas is never empty
    if (playhead < (segments[0].start || 0) + 0.35) {
      return segments[0];
    }

    // 5. Nearest segment within 1.5s
    let nearest = segments[0];
    let minDiff = Infinity;
    for (const seg of segments) {
      const diff = Math.min(
        Math.abs(playhead - seg.start),
        Math.abs(playhead - seg.end)
      );
      if (diff < minDiff) {
        minDiff = diff;
        nearest = seg;
      }
    }
    if (minDiff < 1.5) {
      return nearest;
    }

    return segments[0] || null;
  }, [segments, playhead, selectedSegmentId]);

  const isRtl = settings.preset.startsWith('urdu_');

  // Aspect ratio class
  const aspectClass =
    settings.aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[580px]'
      : settings.aspectRatio === '1:1'
      ? 'aspect-square max-h-[540px]'
      : 'aspect-video max-h-[540px]';

  // Scaled typography calculations matching canvas preview dimensions (reference 1080p canvas)
  const scaleRatio = Math.max(0.25, Math.min(1.0, stageHeight / 1080));
  const previewFontSize = Math.max(
    14,
    Math.min(76, Math.round(settings.fontSize * scaleRatio))
  );

  // Scaled outline and shadow
  const displayOutlineWidth = Math.max(
    0.3,
    Number((settings.outlineWidth * scaleRatio).toFixed(2))
  );
  const displayShadowDist = Math.max(
    0.4,
    Number((settings.shadowDistance * scaleRatio).toFixed(2))
  );

  const animClass = getAnimationClass(settings.animationStyle);

  // Dynamic vertical anchor:
  // When placed near the bottom (> 0.65), anchor to bottom so extra lines expand UPWARDS into the frame!
  // When placed near the top (< 0.35), anchor to top so extra lines expand DOWNWARDS.
  const captionTransform =
    settings.captionY > 0.65
      ? 'translate(-50%, -100%)'
      : settings.captionY < 0.35
      ? 'translate(-50%, 0%)'
      : 'translate(-50%, -50%)';

  return (
    <div className="glass-panel flex flex-col rounded-2xl border border-studio-border bg-white dark:bg-studio-900 p-4 text-slate-900 dark:text-white shadow-sm transition-colors">
      {/* Stage Toolbar: Aspect Ratio & Safe Zone Selector */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-studio-border pb-3">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 p-1">
          <button
            type="button"
            onClick={() => onUpdateSettings('aspectRatio', '9:16')}
            title="9:16 Vertical (Shorts, Reels, TikTok)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              settings.aspectRatio === '9:16'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>9:16 Vertical</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings('aspectRatio', '16:9')}
            title="16:9 Landscape (YouTube, Cinema)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              settings.aspectRatio === '16:9'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            <span>16:9 Landscape</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings('aspectRatio', '1:1')}
            title="1:1 Square (Instagram Feed, Square Video)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              settings.aspectRatio === '1:1'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Square className="h-3.5 w-3.5" />
            <span>1:1 Square</span>
          </button>
        </div>

        {/* Overlays & Lock Toggles */}
        <div className="flex items-center gap-2">
          {/* Safe Zones Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !showSafeZones;
              setShowSafeZones(next);
              onUpdateSettings('safeZone', next);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              showSafeZones
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                : 'border-studio-border bg-slate-100 dark:bg-studio-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Safe Zones</span>
          </button>

          {/* Position Lock */}
          <button
            type="button"
            onClick={() => onUpdateSettings('captionLocked', !settings.captionLocked)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              settings.captionLocked
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-studio-border bg-slate-100 dark:bg-studio-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {settings.captionLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Interactive (CapCut Mode)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Video Viewport Canvas */}
      <div className="relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-xl bg-black">
        <div
          ref={stageContainerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative mx-auto flex w-full items-center justify-center overflow-hidden bg-black select-none ${aspectClass}`}
        >
          {/* Real Video Element */}
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            muted={isMuted}
            onClick={togglePlay}
            className="h-full w-full object-contain cursor-pointer"
          />

          {/* Center Snap Guide Lines */}
          {snappedX && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2 border-l border-dashed border-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          )}
          {snappedY && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 h-px -translate-y-1/2 border-t border-dashed border-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          )}

          {/* Safe Zones Overlay (TikTok / Reels Action & Header Buffer) */}
          {showSafeZones && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between border-2 border-dashed border-cyan-500/30 p-4">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1 text-[9px] font-mono text-cyan-400/60 uppercase">
                <span>Top Safe Zone (96px)</span>
                <span>Title Safe</span>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                  Canvas Center
                </span>
              </div>

              <div className="border-t border-rose-500/30 pt-1 text-[9px] font-mono text-rose-400/70 uppercase">
                <span>Reels / TikTok Action Margin (Keep captions above)</span>
              </div>
            </div>
          )}

          {/* Live Rendered Caption Overlay */}
          {!isResultVideo && activeSegment && (
            <div
              className="absolute pointer-events-none select-none transition-[left,top]"
              style={{
                left: `${settings.captionX * 100}%`,
                top: `${settings.captionY * 100}%`,
                transform: captionTransform,
                width: `${settings.captionWidth * 100}%`,
                maxWidth: '96%',
                maxHeight: '88%',
                display: 'flex',
                justifyContent:
                  settings.textAlign === 'left'
                    ? 'flex-start'
                    : settings.textAlign === 'right'
                    ? 'flex-end'
                    : 'center',
                direction: isRtl ? 'rtl' : 'ltr'
              }}
            >
              {/* Inner Pill Wrapper with CapCut On-Screen Resize Box */}
              <div
                ref={pillRef}
                onPointerDown={handlePointerDown}
                onWheel={handleWheelResize}
                className={`caption-pill-wrapper group relative inline-flex flex-wrap items-center justify-center max-w-full text-center pointer-events-auto select-none transition-shadow ${
                  settings.captionLocked
                    ? 'cursor-default'
                    : 'cursor-move'
                }`}
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: `${previewFontSize}px`,
                  fontWeight:
                    settings.fontWeight === 'normal'
                      ? 500
                      : settings.fontWeight === 'heavy'
                      ? 950
                      : 800,
                  letterSpacing:
                    settings.letterSpacing ||
                    (settings.fontFamily === 'Impact' ? '0.03em' : 'normal'),
                  lineHeight: settings.lineHeight || 1.15,
                  textTransform: settings.uppercase ? 'uppercase' : 'none',
                  textAlign: settings.textAlign,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  opacity: settings.textOpacity ?? 1,
                  background: settings.boxBackground
                    ? toCssRgba(settings.boxColor, settings.boxOpacity ?? 0.88)
                    : 'transparent',
                  borderRadius: settings.boxBackground
                    ? settings.borderRadius || '12px'
                    : undefined,
                  padding: settings.boxBackground
                    ? '0.35em 0.85em'
                    : '0.05em 0.1em',
                  backdropFilter: settings.boxBackground
                    ? 'blur(10px)'
                    : 'none',
                  boxShadow: settings.boxBackground
                    ? `0 6px 20px ${toCssRgba(settings.boxColor, 0.5)}`
                    : 'none',
                  animation:
                    settings.animationStyle === 'none'
                      ? 'none'
                      : `${animClass} ${Math.max(
                          0.18,
                          0.48 / settings.animationIntensity
                        )}s cubic-bezier(0.2, 0.8, 0.2, 1) both`
                }}
              >
                {/* ====================================================
                    CapCut Interactive On-Screen Selection & Scale Controls
                    ==================================================== */}
                {!settings.captionLocked && (
                  <>
                    {/* Active Bounding Selection Box */}
                    <div
                      className={`pointer-events-none absolute -inset-2 rounded-xl border transition-all ${
                        isResizing
                          ? 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.6)]'
                          : 'border-cyan-400/40 group-hover:border-cyan-400/90 group-hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                      }`}
                    />

                    {/* Top Floating CapCut Size HUD Toolbar */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/90 px-2.5 py-1 text-xs font-mono font-bold text-white shadow-2xl backdrop-blur-md select-none opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        type="button"
                        title="Decrease Font Size (-2px)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSettings(
                            'fontSize',
                            Math.max(18, settings.fontSize - 2)
                          );
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-slate-200 hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="flex items-center gap-1 text-[11px] text-cyan-300 px-1">
                        <Scaling className="h-3 w-3 text-cyan-400" />
                        <span>{settings.fontSize}px</span>
                      </span>

                      <button
                        type="button"
                        title="Increase Font Size (+2px)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSettings(
                            'fontSize',
                            Math.min(160, settings.fontSize + 2)
                          );
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-slate-200 hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* 4 Corner Scale Drag Handles */}
                    {/* Top-Left */}
                    <div
                      title="Drag corner to scale size"
                      onPointerDown={(e) => handleResizePointerDown(e, 'tl')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      onPointerCancel={handleResizePointerUp}
                      className="absolute -top-3.5 -left-3.5 h-3.5 w-3.5 rounded-full border-2 border-cyan-400 bg-white shadow-[0_0_8px_#22d3ee] cursor-nwse-resize hover:scale-125 transition-transform"
                    />

                    {/* Top-Right */}
                    <div
                      title="Drag corner to scale size"
                      onPointerDown={(e) => handleResizePointerDown(e, 'tr')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      onPointerCancel={handleResizePointerUp}
                      className="absolute -top-3.5 -right-3.5 h-3.5 w-3.5 rounded-full border-2 border-cyan-400 bg-white shadow-[0_0_8px_#22d3ee] cursor-nesw-resize hover:scale-125 transition-transform"
                    />

                    {/* Bottom-Left */}
                    <div
                      title="Drag corner to scale size"
                      onPointerDown={(e) => handleResizePointerDown(e, 'bl')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      onPointerCancel={handleResizePointerUp}
                      className="absolute -bottom-3.5 -left-3.5 h-3.5 w-3.5 rounded-full border-2 border-cyan-400 bg-white shadow-[0_0_8px_#22d3ee] cursor-nesw-resize hover:scale-125 transition-transform"
                    />

                    {/* Bottom-Right */}
                    <div
                      title="Drag corner to scale size"
                      onPointerDown={(e) => handleResizePointerDown(e, 'br')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      onPointerCancel={handleResizePointerUp}
                      className="absolute -bottom-3.5 -right-3.5 h-3.5 w-3.5 rounded-full border-2 border-cyan-400 bg-white shadow-[0_0_8px_#22d3ee] cursor-nwse-resize hover:scale-125 transition-transform"
                    />
                  </>
                )}

                {/* Spoken Word Chips */}
                {activeSegment.words && activeSegment.words.length > 0 ? (
                  activeSegment.words.map((w, i) => {
                    const isActiveWord = playhead >= w.start && playhead <= w.end;
                    const cleanUpper = w.word
                      .toUpperCase()
                      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                    const isKeyword = settings.emphasisWords.includes(cleanUpper);

                    const wordHighlight =
                      (settings.wordHighlight && isActiveWord) || isKeyword;

                    const wordColor = wordHighlight
                      ? settings.highlightColor
                      : settings.primaryColor;

                    const { textShadow, webkitTextStroke } =
                      computeCaptionShadowAndStroke(
                        displayOutlineWidth,
                        settings.outlineColor,
                        displayShadowDist,
                        settings.shadowColor,
                        settings.neonGlow,
                        wordColor
                      );

                    return (
                      <span
                        key={`${activeSegment.id}-word-${i}`}
                        style={{
                          display: 'inline-block',
                          verticalAlign: 'middle',
                          margin: '0 0.16em',
                          color: wordColor,
                          WebkitTextStroke: webkitTextStroke,
                          textShadow,
                          transform: wordHighlight
                            ? `scale(${
                                isKeyword
                                  ? Math.max(1.12, settings.highlightScale)
                                  : settings.highlightScale
                              })`
                            : 'scale(1)',
                          zIndex: wordHighlight ? 10 : 1,
                          position: 'relative',
                          borderBottom:
                            settings.editorialUnderline && wordHighlight
                              ? `${Math.max(2, 3 * scaleRatio)}px solid ${
                                  settings.highlightColor
                                }`
                              : undefined,
                          backgroundColor:
                            settings.wordSpotlight && wordHighlight
                              ? 'rgba(255,255,255,0.18)'
                              : undefined,
                          borderRadius: settings.wordSpotlight ? '4px' : undefined,
                          padding: settings.wordSpotlight ? '0 0.15em' : undefined,
                          transition: 'transform 120ms ease, color 120ms ease'
                        }}
                      >
                        {settings.uppercase ? w.word.toUpperCase() : w.word}
                      </span>
                    );
                  })
                ) : (
                  (() => {
                    const { textShadow, webkitTextStroke } =
                      computeCaptionShadowAndStroke(
                        displayOutlineWidth,
                        settings.outlineColor,
                        displayShadowDist,
                        settings.shadowColor,
                        settings.neonGlow,
                        settings.primaryColor
                      );
                    return (
                      <span
                        style={{
                          color: settings.primaryColor,
                          WebkitTextStroke: webkitTextStroke,
                          textShadow
                        }}
                      >
                        {settings.uppercase
                          ? activeSegment.text.toUpperCase()
                          : activeSegment.text}
                      </span>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Transport Deck Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-4 py-2.5 transition-colors">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => stepTime(-1)}
            title="Step back 1 second (←)"
            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-md transition-all hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => stepTime(1)}
            title="Step forward 1 second (→)"
            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white transition"
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
          <span className="text-slate-600 dark:text-slate-400 font-semibold">{formatTimecode(duration)}</span>
        </div>

        {/* Speed & Volume Tools */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <select
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            defaultValue="1"
            className="rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-2 py-1 font-mono text-[11px] text-slate-800 dark:text-slate-200 outline-none hover:border-slate-400 dark:hover:border-slate-600 shadow-sm cursor-pointer"
          >
            <option value="0.5" className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
              0.5×
            </option>
            <option value="1" className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
              1.0×
            </option>
            <option value="1.25" className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
              1.25×
            </option>
            <option value="1.5" className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
              1.5×
            </option>
            <option value="2" className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
              2.0×
            </option>
          </select>

          {/* Mute Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-rose-500" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
