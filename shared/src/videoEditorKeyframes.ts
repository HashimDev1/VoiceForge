import {
  TimelineClip,
  Keyframe,
  KeyframeProperty,
  ClipTransition
} from './videoEditorTypes';

/**
 * Solves cubic bezier curve for progress t (0 to 1)
 */
export function solveCubicBezier(
  t: number,
  p1x: number = 0.25,
  p1y: number = 0.1,
  p2x: number = 0.25,
  p2y: number = 1.0
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Approximate Newton-Raphson
  let currentT = t;
  for (let i = 0; i < 5; i++) {
    const currentX =
      3 * (1 - currentT) * (1 - currentT) * currentT * p1x +
      3 * (1 - currentT) * currentT * currentT * p2x +
      currentT * currentT * currentT;
    const dx = currentX - t;
    if (Math.abs(dx) < 0.001) break;
    const derivative =
      3 * (1 - currentT) * (1 - currentT) * p1x +
      6 * (1 - currentT) * currentT * (p2x - p1x) +
      3 * currentT * currentT * (1 - p2x);
    if (Math.abs(derivative) < 1e-6) break;
    currentT -= dx / derivative;
  }
  currentT = Math.max(0, Math.min(1, currentT));

  return (
    3 * (1 - currentT) * (1 - currentT) * currentT * p1y +
    3 * (1 - currentT) * currentT * currentT * p2y +
    currentT * currentT * currentT
  );
}

/**
 * Evaluates easing curves
 */
export function applyEasing(
  progress: number,
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bezier',
  bezier?: [number, number, number, number]
): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'linear':
      return p;
    case 'ease_in':
      return p * p;
    case 'ease_out':
      return p * (2 - p);
    case 'ease_in_out':
      return p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    case 'bezier':
      if (bezier && bezier.length === 4) {
        return solveCubicBezier(p, bezier[0], bezier[1], bezier[2], bezier[3]);
      }
      return p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    default:
      return p;
  }
}

/**
 * Returns default base value for a property if not specified
 */
function getClipBasePropertyValue(clip: TimelineClip, property: KeyframeProperty): number {
  switch (property) {
    case 'positionX':
      return clip.transform?.x || clip.titleDesign?.positionX || 0;
    case 'positionY':
      return clip.transform?.y || clip.titleDesign?.positionY || 0;
    case 'scale':
      return clip.transform?.scale || clip.titleDesign?.scale || 1.0;
    case 'rotation':
      return clip.transform?.rotation || clip.titleDesign?.rotation || 0;
    case 'opacity':
      return clip.transform?.opacity ?? 1.0;
    case 'volume':
      return clip.audio?.volume ?? 100;
    case 'blur':
      return 0;
    case 'letterSpacing':
    case 'tracking':
      return clip.titleDesign?.letterSpacing || 0;
    case 'shadowIntensity':
      return clip.titleDesign?.shadow ? clip.titleDesign.shadow.opacity * 100 : 0;
    default:
      return 0;
  }
}

/**
 * Interpolates a specific keyframe property for a clip at local clip time
 */
export function interpolateProperty(
  clip: TimelineClip,
  property: KeyframeProperty,
  localTimeSec: number
): number {
  const matchingKeyframes = (clip.keyframes || [])
    .filter((k) => k.property === property)
    .sort((a, b) => a.time - b.time);

  if (matchingKeyframes.length === 0) {
    return getClipBasePropertyValue(clip, property);
  }

  // Before first keyframe
  if (localTimeSec <= matchingKeyframes[0].time) {
    return matchingKeyframes[0].value;
  }

  // After last keyframe
  const lastKf = matchingKeyframes[matchingKeyframes.length - 1];
  if (localTimeSec >= lastKf.time) {
    return lastKf.value;
  }

  // Find bounding keyframes
  for (let i = 0; i < matchingKeyframes.length - 1; i++) {
    const kfA = matchingKeyframes[i];
    const kfB = matchingKeyframes[i + 1];

    if (localTimeSec >= kfA.time && localTimeSec <= kfB.time) {
      const span = kfB.time - kfA.time;
      if (span <= 0) return kfA.value;
      const rawProgress = (localTimeSec - kfA.time) / span;
      const easedProgress = applyEasing(rawProgress, kfB.easing, kfB.bezier);
      return kfA.value + easedProgress * (kfB.value - kfA.value);
    }
  }

  return matchingKeyframes[0].value;
}

export interface EvaluatedTransformAndAudio {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
  blur: number;
  letterSpacing: number;
  shadowIntensity: number;
  transitionScale: number;
  transitionOpacity: number;
  transitionTranslateX: number;
  transitionTranslateY: number;
  transitionBlurPx: number;
  transitionFlash: number;
}

/**
 * Evaluates all transform, keyframe, and transition properties of a clip at the current playhead
 */
export function evaluateClipKeyframes(
  clip: TimelineClip,
  playheadSec: number
): EvaluatedTransformAndAudio {
  const localTime = Math.max(0, Math.min(clip.duration, playheadSec - clip.start));

  const x = interpolateProperty(clip, 'positionX', localTime);
  const y = interpolateProperty(clip, 'positionY', localTime);
  const scale = interpolateProperty(clip, 'scale', localTime);
  const rotation = interpolateProperty(clip, 'rotation', localTime);
  const opacity = interpolateProperty(clip, 'opacity', localTime);
  const baseVolume = interpolateProperty(clip, 'volume', localTime);
  const blur = interpolateProperty(clip, 'blur', localTime);
  const letterSpacing = interpolateProperty(clip, 'letterSpacing', localTime);
  const shadowIntensity = interpolateProperty(clip, 'shadowIntensity', localTime);

  // Transition In & Out modifiers
  let transitionScale = 1.0;
  let transitionOpacity = 1.0;
  let transitionTranslateX = 0;
  let transitionTranslateY = 0;
  let transitionBlurPx = 0;
  let transitionFlash = 0;

  // Transition In (at beginning of clip)
  if (clip.transitionIn && clip.transitionIn.type !== 'none' && clip.transitionIn.duration > 0) {
    const inDur = clip.transitionIn.duration;
    if (localTime < inDur) {
      const alpha = applyEasing(localTime / inDur, clip.transitionIn.easing || 'ease_out');
      switch (clip.transitionIn.type) {
        case 'fade':
        case 'dissolve':
          transitionOpacity *= alpha;
          break;
        case 'zoom_in':
          transitionScale *= 0.5 + 0.5 * alpha;
          transitionOpacity *= alpha;
          break;
        case 'zoom_out':
          transitionScale *= 1.5 - 0.5 * alpha;
          transitionOpacity *= alpha;
          break;
        case 'slide_left':
          transitionTranslateX += (1 - alpha) * 100;
          break;
        case 'slide_right':
          transitionTranslateX -= (1 - alpha) * 100;
          break;
        case 'push_up':
          transitionTranslateY += (1 - alpha) * 100;
          break;
        case 'push_down':
          transitionTranslateY -= (1 - alpha) * 100;
          break;
        case 'blur':
          transitionBlurPx += (1 - alpha) * 12;
          transitionOpacity *= alpha;
          break;
        case 'flash':
          transitionFlash += (1 - alpha) * 2;
          break;
        case 'glitch':
          transitionTranslateX += (Math.random() - 0.5) * (1 - alpha) * 30;
          break;
      }
    }
  }

  // Transition Out (at end of clip)
  if (clip.transitionOut && clip.transitionOut.type !== 'none' && clip.transitionOut.duration > 0) {
    const outDur = clip.transitionOut.duration;
    const timeFromEnd = clip.duration - localTime;
    if (timeFromEnd < outDur && timeFromEnd >= 0) {
      const beta = applyEasing(timeFromEnd / outDur, clip.transitionOut.easing || 'ease_in');
      switch (clip.transitionOut.type) {
        case 'fade':
        case 'dissolve':
          transitionOpacity *= beta;
          break;
        case 'zoom_in':
          transitionScale *= 1.0 + (1 - beta) * 0.5;
          transitionOpacity *= beta;
          break;
        case 'zoom_out':
          transitionScale *= 0.5 + 0.5 * beta;
          transitionOpacity *= beta;
          break;
        case 'slide_left':
          transitionTranslateX -= (1 - beta) * 100;
          break;
        case 'slide_right':
          transitionTranslateX += (1 - beta) * 100;
          break;
        case 'push_up':
          transitionTranslateY -= (1 - beta) * 100;
          break;
        case 'push_down':
          transitionTranslateY += (1 - beta) * 100;
          break;
        case 'blur':
          transitionBlurPx += (1 - beta) * 12;
          transitionOpacity *= beta;
          break;
        case 'flash':
          transitionFlash += (1 - beta) * 2;
          break;
        case 'glitch':
          transitionTranslateX += (Math.random() - 0.5) * (1 - beta) * 30;
          break;
      }
    }
  }

  // Audio Fade In / Fade Out multiplier
  let volume = baseVolume;
  if (clip.audio) {
    if (clip.audio.fadeInDuration > 0 && localTime < clip.audio.fadeInDuration) {
      volume *= localTime / clip.audio.fadeInDuration;
    }
    const timeFromEnd = clip.duration - localTime;
    if (clip.audio.fadeOutDuration > 0 && timeFromEnd < clip.audio.fadeOutDuration) {
      volume *= Math.max(0, timeFromEnd / clip.audio.fadeOutDuration);
    }
  }

  return {
    x,
    y,
    scale,
    rotation,
    opacity,
    volume,
    blur,
    letterSpacing,
    shadowIntensity,
    transitionScale,
    transitionOpacity,
    transitionTranslateX,
    transitionTranslateY,
    transitionBlurPx,
    transitionFlash
  };
}

