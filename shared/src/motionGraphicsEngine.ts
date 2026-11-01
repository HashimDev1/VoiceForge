import {
  MotionTitleDesign,
  MotionTitleTemplate,
  MotionTitleCategory,
  MotionAnimationType,
  MotionAnimationConfig,
  TimelineClip
} from './videoEditorTypes';
import { applyEasing } from './videoEditorKeyframes';

export interface EvaluatedMotionGraphic {
  mainText: string;
  subtitleText: string;
  taglineText: string;
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
  opacity: number;
  blur: number;
  letterSpacing: number;
  maskClipPath: string;
  typewriterCursor: boolean;
  glitchOffsetX: number;
  glitchOffsetY: number;
  lightLeakOpacity: number;
  background: {
    enabled: boolean;
    color: string;
    opacity: number;
    paddingX: number;
    paddingY: number;
    borderRadius: number;
    blurBackdrop?: boolean;
    fullWidth?: boolean;
  };
  accent: {
    enabled: boolean;
    type: 'line' | 'bar' | 'badge' | 'bracket' | 'pill';
    color: string;
    position: 'left' | 'top' | 'bottom' | 'right';
    width: number;
    height?: number;
    opacity: number;
  };
}

/**
 * Deterministically evaluates all visual parameters of a Motion Graphic at an exact local time.
 */
export function evaluateMotionGraphicAtTime(
  design: MotionTitleDesign,
  localTimeSec: number,
  clipDurationSec: number,
  canvasWidth: number = 1080,
  canvasHeight: number = 1920
): EvaluatedMotionGraphic {
  const duration = Math.max(0.5, clipDurationSec);
  const t = Math.max(0, Math.min(duration, localTimeSec));
  const anim = design.animation || {
    type: 'fade',
    inDuration: 0.6,
    outDuration: 0.4,
    delay: 0,
    easing: 'ease_out'
  };

  const inDur = Math.max(0.05, anim.inDuration || 0.6);
  const outDur = Math.max(0.05, anim.outDuration || 0.4);
  const delay = Math.max(0, anim.delay || 0);
  const outStart = Math.max(inDur + delay, duration - outDur);

  // Entrance progress (0 -> 1)
  let inProgress = 1.0;
  if (t < delay) {
    inProgress = 0.0;
  } else if (t < delay + inDur) {
    const raw = (t - delay) / inDur;
    inProgress = applyEasing(raw, anim.easing, anim.bezier);
  }

  // Exit progress (1 -> 0)
  let outProgress = 1.0;
  if (t > outStart) {
    const raw = (t - outStart) / outDur;
    outProgress = 1.0 - applyEasing(raw, anim.easing, anim.bezier);
  }

  const combinedAlpha = Math.max(0, Math.min(1, inProgress * outProgress));

  // Defaults
  let translateX = design.positionX || 0;
  let translateY = design.positionY || 0;
  let scale = design.scale || 1.0;
  let rotation = design.rotation || 0;
  let opacity = combinedAlpha;
  let blur = 0;
  let letterSpacing = design.letterSpacing || 0;
  let maskClipPath = 'none';
  let typewriterCursor = false;
  let glitchOffsetX = 0;
  let glitchOffsetY = 0;
  let lightLeakOpacity = 0;

  let mainText = design.mainText;
  let subtitleText = design.subtitleText || '';
  let taglineText = design.taglineText || '';

  const direction = anim.direction || 'up';
  const intensity = (anim.intensity ?? 50) / 50;

  switch (anim.type) {
    case 'fade': {
      opacity = combinedAlpha;
      break;
    }

    case 'slide': {
      const dist = 80 * intensity;
      if (t < delay + inDur) {
        const offset = (1 - inProgress) * dist;
        if (direction === 'up') translateY += offset;
        else if (direction === 'down') translateY -= offset;
        else if (direction === 'left') translateX += offset;
        else if (direction === 'right') translateX -= offset;
      } else if (t > outStart) {
        const offset = (1 - outProgress) * dist;
        if (direction === 'up') translateY -= offset;
        else if (direction === 'down') translateY += offset;
        else if (direction === 'left') translateX -= offset;
        else if (direction === 'right') translateX += offset;
      }
      opacity = combinedAlpha;
      break;
    }

    case 'scale': {
      if (t < delay + inDur) {
        scale = (0.2 + 0.8 * inProgress) * (design.scale || 1.0);
      } else if (t > outStart) {
        scale = (0.2 + 0.8 * outProgress) * (design.scale || 1.0);
      }
      opacity = combinedAlpha;
      break;
    }

    case 'typewriter': {
      const chars = design.mainText.length;
      if (t < delay + inDur) {
        const count = Math.min(chars, Math.floor(chars * inProgress));
        mainText = design.mainText.substring(0, count);
        typewriterCursor = inProgress < 1.0 || (Math.floor(t * 3) % 2 === 0);
      } else if (t > outStart) {
        opacity = outProgress;
      }
      break;
    }

    case 'tracking_reveal': {
      if (t < delay + inDur) {
        const startTracking = (design.letterSpacing || 0) + 24 * intensity;
        letterSpacing = startTracking - (startTracking - (design.letterSpacing || 0)) * inProgress;
      }
      opacity = combinedAlpha;
      break;
    }

    case 'blur_reveal': {
      if (t < delay + inDur) {
        blur = Math.round((1 - inProgress) * 20 * intensity);
      } else if (t > outStart) {
        blur = Math.round((1 - outProgress) * 20 * intensity);
      }
      opacity = combinedAlpha;
      break;
    }

    case 'mask_reveal': {
      if (t < delay + inDur) {
        const pct = Math.round(inProgress * 100);
        if (direction === 'left') maskClipPath = `inset(0 ${100 - pct}% 0 0)`;
        else if (direction === 'right') maskClipPath = `inset(0 0 0 ${100 - pct}%)`;
        else if (direction === 'down') maskClipPath = `inset(0 0 ${100 - pct}% 0)`;
        else maskClipPath = `inset(${100 - pct}% 0 0 0)`;
      } else if (t > outStart) {
        opacity = outProgress;
      }
      break;
    }

    case 'word_by_word': {
      const words = design.mainText.split(' ');
      if (t < delay + inDur) {
        const wordCount = Math.max(1, Math.min(words.length, Math.ceil(words.length * inProgress)));
        mainText = words.slice(0, wordCount).join(' ');
      }
      opacity = combinedAlpha;
      break;
    }

    case 'letter_by_letter': {
      const letters = design.mainText.length;
      if (t < delay + inDur) {
        const count = Math.max(1, Math.min(letters, Math.ceil(letters * inProgress)));
        mainText = design.mainText.substring(0, count);
      }
      opacity = combinedAlpha;
      break;
    }

    case 'glitch': {
      if (t < delay + inDur && inProgress < 0.95) {
        const seed = Math.sin(t * 120);
        glitchOffsetX = seed * 12 * intensity;
        glitchOffsetY = Math.cos(t * 80) * 4 * intensity;
        opacity = 0.7 + Math.abs(seed) * 0.3;
      } else {
        opacity = combinedAlpha;
      }
      break;
    }

    case 'cinematic_zoom': {
      // Continuous slow zoom across entire duration
      const zoomRatio = t / duration;
      scale = (1.0 + 0.15 * zoomRatio * intensity) * (design.scale || 1.0);
      opacity = combinedAlpha;
      break;
    }

    case 'motion_blur': {
      if (t < delay + inDur) {
        translateY += (1 - inProgress) * 120 * intensity;
        blur = (1 - inProgress) * 8 * intensity;
      } else if (t > outStart) {
        translateY -= (1 - outProgress) * 80 * intensity;
        blur = (1 - outProgress) * 6 * intensity;
      }
      opacity = combinedAlpha;
      break;
    }

    default:
      opacity = combinedAlpha;
      break;
  }

  // Accent & Background
  const bg = design.backgroundBox || {
    enabled: false,
    color: '#000000',
    opacity: 0.8,
    paddingX: 20,
    paddingY: 10,
    borderRadius: 8
  };

  const accent = design.accentElement || {
    enabled: false,
    type: 'bar',
    color: '#6366f1',
    position: 'left',
    width: 4,
    opacity: 1
  };

  return {
    mainText,
    subtitleText,
    taglineText,
    translateX,
    translateY,
    scale,
    rotation,
    opacity,
    blur,
    letterSpacing,
    maskClipPath,
    typewriterCursor,
    glitchOffsetX,
    glitchOffsetY,
    lightLeakOpacity,
    background: {
      ...bg,
      opacity: bg.enabled ? (bg.opacity ?? 0.8) * combinedAlpha : 0
    },
    accent: {
      ...accent,
      opacity: accent.enabled ? ((accent.opacity ?? 1.0) * combinedAlpha) : 0
    }
  };
}

/**
 * 22 Production-Ready Motion Graphics Starter Templates
 */
export const STARTER_MOTION_TEMPLATES: MotionTitleTemplate[] = [
  // 1. Documentary Master Title
  {
    id: 'doc_master_title',
    name: 'Documentary Master Title',
    category: 'documentary',
    description: 'Majestic Cinzel serif title with tracking expansion and gold underline',
    duration: 5.0,
    design: {
      mainText: 'CHRONICLES OF ANCIENT ROME',
      subtitleText: 'AN UNTOLD EMPIRE SAGA',
      fontFamily: 'Cinzel',
      fontSize: 54,
      fontWeight: 700,
      letterSpacing: 8,
      lineHeight: 1.2,
      textAlign: 'center',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 16,
      subtitleFontWeight: 500,
      subtitleColor: '#D4AF37',
      subtitleTracking: 6,
      shadow: { enabled: true, color: '#000000', blur: 14, x: 0, y: 4, opacity: 0.85 },
      accentElement: { enabled: true, type: 'line', color: '#D4AF37', position: 'bottom', width: 3 },
      animation: { type: 'tracking_reveal', inDuration: 1.2, outDuration: 0.6, delay: 0, easing: 'ease_out' },
      positionX: 0,
      positionY: 0
    }
  },

  // 2. Historical Documentary Opening
  {
    id: 'hist_doc_opening',
    name: 'Historical Documentary Opening',
    category: 'documentary',
    description: 'Timeless Playfair Display editorial title with slow cinematic zoom',
    duration: 6.0,
    design: {
      mainText: 'THE LOST EXPEDITION',
      subtitleText: 'ARCHIVAL PAPERS · 1912',
      fontFamily: 'Playfair Display',
      fontSize: 58,
      fontWeight: 800,
      letterSpacing: 4,
      lineHeight: 1.15,
      textAlign: 'center',
      textColor: '#FFF9EE',
      subtitleFontFamily: 'Courier New',
      subtitleFontSize: 18,
      subtitleColor: '#CBB282',
      subtitleTracking: 4,
      shadow: { enabled: true, color: '#000000', blur: 18, x: 0, y: 6, opacity: 0.9 },
      animation: { type: 'cinematic_zoom', inDuration: 0.8, outDuration: 0.8, delay: 0, easing: 'linear', intensity: 30 },
      positionX: 0,
      positionY: -20
    }
  },

  // 3. Breaking News Lower Third
  {
    id: 'breaking_news_l3',
    name: 'Breaking News Lower Third',
    category: 'news',
    description: 'Urgent broadcast lower third with red badge and animated banner',
    duration: 5.0,
    design: {
      mainText: 'MARKETS HIT HISTORIC HIGHS',
      subtitleText: 'LIVE BROADCAST REPORT · GLOBAL ECONOMIC SUMMIT',
      taglineText: 'BREAKING',
      fontFamily: 'Montserrat',
      fontSize: 32,
      fontWeight: 900,
      letterSpacing: 1,
      lineHeight: 1.2,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 14,
      subtitleFontWeight: 700,
      subtitleColor: '#F87171',
      subtitleTracking: 2,
      backgroundBox: {
        enabled: true,
        color: '#0F172A',
        opacity: 0.95,
        paddingX: 24,
        paddingY: 16,
        borderRadius: 4,
        fullWidth: true
      },
      accentElement: { enabled: true, type: 'bar', color: '#EF4444', position: 'left', width: 6 },
      animation: { type: 'slide', inDuration: 0.4, outDuration: 0.3, delay: 0, easing: 'ease_out', direction: 'left' },
      positionX: 0,
      positionY: 520
    }
  },

  // 4. Cinematic Opening Credits
  {
    id: 'cinema_credits_intro',
    name: 'Cinematic Opening Credits',
    category: 'cinematic',
    description: 'High-drama condensed title with soft glow and blur reveal',
    duration: 5.5,
    design: {
      mainText: 'DIRECTED BY CHRISTOPHER NOLAN',
      subtitleText: 'A SYNCRO MEDIA PRODUCTION',
      fontFamily: 'Montserrat',
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: 12,
      lineHeight: 1.3,
      textAlign: 'center',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 13,
      subtitleColor: '#94A3B8',
      subtitleTracking: 8,
      shadow: { enabled: true, color: '#38BDF8', blur: 22, x: 0, y: 0, opacity: 0.5 },
      animation: { type: 'blur_reveal', inDuration: 1.0, outDuration: 0.6, delay: 0.2, easing: 'ease_out' },
      positionX: 0,
      positionY: 0
    }
  },

  // 5. YouTube Channel Intro
  {
    id: 'yt_intro_banner',
    name: 'YouTube Channel Intro',
    category: 'social_media',
    description: 'High-energy punchy typography with pop scale bounce and neon gradient',
    duration: 4.0,
    design: {
      mainText: 'TECH LAB EXPLORER',
      subtitleText: 'EPISODE 42 · NEXT GEN CREATOR TOOLS',
      fontFamily: 'Poppins',
      fontSize: 52,
      fontWeight: 900,
      letterSpacing: -1,
      lineHeight: 1.1,
      textAlign: 'center',
      textColor: '#38BDF8',
      gradient: { enabled: true, colors: ['#38BDF8', '#818CF8', '#C084FC'], angle: 45 },
      stroke: { enabled: true, color: '#0F172A', width: 4 },
      shadow: { enabled: true, color: '#6366F1', blur: 24, x: 0, y: 8, opacity: 0.7 },
      animation: { type: 'scale', inDuration: 0.5, outDuration: 0.4, delay: 0, easing: 'ease_in_out' },
      positionX: 0,
      positionY: -40
    }
  },

  // 6. Podcast Speaker Identification
  {
    id: 'podcast_speaker_id',
    name: 'Podcast Speaker Identification',
    category: 'documentary',
    description: 'Translucent rounded pill card for host and guest nameplates',
    duration: 4.5,
    design: {
      mainText: 'DR. ARYA KHAN, MD',
      subtitleText: 'NEUROSCIENTIST & AUTHOR · @ARYAKHAN',
      fontFamily: 'Inter',
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: 1,
      lineHeight: 1.2,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 13,
      subtitleFontWeight: 500,
      subtitleColor: '#A5B4FC',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#1E1B4B',
        opacity: 0.88,
        paddingX: 20,
        paddingY: 12,
        borderRadius: 14,
        blurBackdrop: true
      },
      accentElement: { enabled: true, type: 'pill', color: '#6366F1', position: 'left', width: 4 },
      animation: { type: 'slide', inDuration: 0.5, outDuration: 0.4, delay: 0, easing: 'ease_out', direction: 'up' },
      positionX: -140,
      positionY: 480
    }
  },

  // 7. Broadcast Interview Lower Third
  {
    id: 'broadcast_interview_l3',
    name: 'Broadcast Interview Lower Third',
    category: 'news',
    description: 'Professional two-tier nameplate with crisp blue brand stripe',
    duration: 5.0,
    design: {
      mainText: 'MARCUS VANCE',
      subtitleText: 'CHIEF TECHNOLOGY OFFICER · VOICEFORGE AI',
      fontFamily: 'Montserrat',
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: 2,
      lineHeight: 1.2,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 13,
      subtitleFontWeight: 600,
      subtitleColor: '#60A5FA',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#0B1120',
        opacity: 0.92,
        paddingX: 22,
        paddingY: 14,
        borderRadius: 6
      },
      accentElement: { enabled: true, type: 'bar', color: '#2563EB', position: 'left', width: 5 },
      animation: { type: 'mask_reveal', inDuration: 0.5, outDuration: 0.4, delay: 0, easing: 'ease_out', direction: 'left' },
      positionX: -160,
      positionY: 460
    }
  },

  // 8. Location Identifier
  {
    id: 'location_geo_tag',
    name: 'Location Identifier',
    category: 'minimal',
    description: 'Precision typewriter coordinate tag for documentary location markers',
    duration: 4.0,
    design: {
      mainText: 'KYOTO, JAPAN',
      subtitleText: '35.0116° N, 135.7681° E · ELEV 52M',
      fontFamily: 'Courier New',
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 3,
      lineHeight: 1.3,
      textAlign: 'left',
      textColor: '#F1F5F9',
      subtitleFontFamily: 'Courier New',
      subtitleFontSize: 12,
      subtitleColor: '#94A3B8',
      subtitleTracking: 2,
      backgroundBox: {
        enabled: true,
        color: '#000000',
        opacity: 0.75,
        paddingX: 16,
        paddingY: 10,
        borderRadius: 4
      },
      accentElement: { enabled: true, type: 'line', color: '#38BDF8', position: 'left', width: 2 },
      animation: { type: 'typewriter', inDuration: 0.8, outDuration: 0.4, delay: 0, easing: 'linear' },
      positionX: -260,
      positionY: -580
    }
  },

  // 9. Chapter Transition Card
  {
    id: 'chapter_transition',
    name: 'Chapter Transition Card',
    category: 'minimal',
    description: 'Elegant chapter divider card with roman numeral tag',
    duration: 3.5,
    design: {
      mainText: 'CHAPTER II',
      subtitleText: 'THE UNEXPECTED TURN',
      fontFamily: 'Cinzel',
      fontSize: 48,
      fontWeight: 800,
      letterSpacing: 10,
      lineHeight: 1.2,
      textAlign: 'center',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 18,
      subtitleFontWeight: 600,
      subtitleColor: '#94A3B8',
      subtitleTracking: 6,
      accentElement: { enabled: true, type: 'line', color: '#FFFFFF', position: 'bottom', width: 2 },
      animation: { type: 'fade', inDuration: 0.6, outDuration: 0.6, delay: 0, easing: 'ease_in_out' },
      positionX: 0,
      positionY: 0
    }
  },

  // 10. Cinematic End Credits Block
  {
    id: 'end_credits_block',
    name: 'Cinematic End Credits Block',
    category: 'cinematic',
    description: 'Clean centered cast and crew credit block with gentle fade out',
    duration: 6.0,
    design: {
      mainText: 'EXECUTIVE PRODUCER',
      subtitleText: 'MUHAMMAD HASHIM · VOICEFORGE STUDIOS',
      fontFamily: 'Montserrat',
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 8,
      lineHeight: 1.5,
      textAlign: 'center',
      textColor: '#F8FAFC',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 16,
      subtitleFontWeight: 400,
      subtitleColor: '#94A3B8',
      subtitleTracking: 4,
      animation: { type: 'fade', inDuration: 0.8, outDuration: 0.8, delay: 0.2, easing: 'ease_in_out' },
      positionX: 0,
      positionY: 100
    }
  },

  // 11. Minimalist Modern Lower Third
  {
    id: 'minimal_lower_third',
    name: 'Minimalist Modern Lower Third',
    category: 'minimal',
    description: 'Ultra-clean Swiss typography with subtle left rule and soft slide',
    duration: 4.5,
    design: {
      mainText: 'SARAH CONNOR',
      subtitleText: 'HEAD OF DIGITAL STRATEGY',
      fontFamily: 'Inter',
      fontSize: 28,
      fontWeight: 800,
      letterSpacing: 1,
      lineHeight: 1.2,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 13,
      subtitleFontWeight: 500,
      subtitleColor: '#CBD5E1',
      subtitleTracking: 1,
      accentElement: { enabled: true, type: 'bar', color: '#FFFFFF', position: 'left', width: 3 },
      animation: { type: 'slide', inDuration: 0.5, outDuration: 0.35, delay: 0, easing: 'ease_out', direction: 'right' },
      positionX: -200,
      positionY: 480
    }
  },

  // 12. Cyberpunk Neon Glitch
  {
    id: 'cyberpunk_neon_glitch',
    name: 'Cyberpunk Neon Glitch',
    category: 'social_media',
    description: 'Electric cyber neon with chromatic RGB jitter on entrance',
    duration: 4.5,
    design: {
      mainText: 'CYBER HORIZON // 2099',
      subtitleText: 'QUANTUM PROTOCOL ACTIVE',
      fontFamily: 'Arial Black',
      fontSize: 44,
      fontWeight: 900,
      letterSpacing: 2,
      lineHeight: 1.1,
      textAlign: 'center',
      textColor: '#22D3EE',
      gradient: { enabled: true, colors: ['#22D3EE', '#F43F5E'], angle: 90 },
      shadow: { enabled: true, color: '#F43F5E', blur: 20, x: 0, y: 0, opacity: 0.8 },
      animation: { type: 'glitch', inDuration: 0.7, outDuration: 0.4, delay: 0, easing: 'linear', intensity: 75 },
      positionX: 0,
      positionY: -50
    }
  },

  // 13. Corporate Executive Nameplate
  {
    id: 'corporate_exec_nameplate',
    name: 'Corporate Executive Nameplate',
    category: 'corporate',
    description: 'Polished navy executive banner with rich gold accent frame',
    duration: 5.0,
    design: {
      mainText: 'JONATHAN REED',
      subtitleText: 'MANAGING PARTNER · GLOBAL VENTURES',
      fontFamily: 'Montserrat',
      fontSize: 28,
      fontWeight: 800,
      letterSpacing: 2,
      lineHeight: 1.2,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 13,
      subtitleFontWeight: 600,
      subtitleColor: '#E2E8F0',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#0A192F',
        opacity: 0.94,
        paddingX: 24,
        paddingY: 14,
        borderRadius: 4
      },
      accentElement: { enabled: true, type: 'bar', color: '#F59E0B', position: 'left', width: 5 },
      animation: { type: 'slide', inDuration: 0.5, outDuration: 0.4, delay: 0, easing: 'ease_out', direction: 'left' },
      positionX: -180,
      positionY: 470
    }
  },

  // 14. Documentary Quote Card
  {
    id: 'documentary_quote_card',
    name: 'Documentary Quote Card',
    category: 'documentary',
    description: 'Editorial italic quote with large quotation marks and citation',
    duration: 6.0,
    design: {
      mainText: '“THE ONLY TRUE WISDOM IS IN KNOWING YOU KNOW NOTHING.”',
      subtitleText: '— SOCRATES · CLASSICAL GREECE',
      fontFamily: 'Playfair Display',
      fontSize: 32,
      fontWeight: 600,
      letterSpacing: 2,
      lineHeight: 1.4,
      textAlign: 'center',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 15,
      subtitleFontWeight: 600,
      subtitleColor: '#93C5FD',
      subtitleTracking: 4,
      shadow: { enabled: true, color: '#000000', blur: 20, x: 0, y: 6, opacity: 0.9 },
      animation: { type: 'word_by_word', inDuration: 1.4, outDuration: 0.6, delay: 0.1, easing: 'ease_out' },
      positionX: 0,
      positionY: 20
    }
  },

  // 15. Viral Reel Hook Banner
  {
    id: 'viral_reel_hook',
    name: 'Viral Reel Hook Banner',
    category: 'social_media',
    description: 'High-contrast solar yellow pill designed for short-form retention',
    duration: 3.5,
    design: {
      mainText: 'STOP MAKING THIS MISTAKE!',
      subtitleText: '3 TIPS TO DOUBLE YOUR RETENTION',
      fontFamily: 'Arial Black',
      fontSize: 38,
      fontWeight: 900,
      letterSpacing: 0,
      lineHeight: 1.1,
      textAlign: 'center',
      textColor: '#000000',
      subtitleFontFamily: 'Montserrat',
      subtitleFontSize: 16,
      subtitleFontWeight: 800,
      subtitleColor: '#000000',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#FACC15',
        opacity: 0.98,
        paddingX: 28,
        paddingY: 16,
        borderRadius: 20
      },
      shadow: { enabled: true, color: '#000000', blur: 16, x: 0, y: 8, opacity: 0.4 },
      animation: { type: 'scale', inDuration: 0.35, outDuration: 0.3, delay: 0, easing: 'ease_out' },
      positionX: 0,
      positionY: -220
    }
  },

  // 16. Minimalist Section Title
  {
    id: 'minimal_section_title',
    name: 'Minimalist Section Title',
    category: 'minimal',
    description: 'Centered uppercase title with expanding hairline accent rule',
    duration: 4.0,
    design: {
      mainText: 'PRODUCT ARCHITECTURE',
      subtitleText: 'CORE FOUNDATION & DATA FLOW',
      fontFamily: 'Montserrat',
      fontSize: 42,
      fontWeight: 800,
      letterSpacing: 6,
      lineHeight: 1.2,
      textAlign: 'center',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 14,
      subtitleFontWeight: 600,
      subtitleColor: '#94A3B8',
      subtitleTracking: 4,
      accentElement: { enabled: true, type: 'line', color: '#6366F1', position: 'bottom', width: 3 },
      animation: { type: 'tracking_reveal', inDuration: 0.9, outDuration: 0.5, delay: 0, easing: 'ease_out' },
      positionX: 0,
      positionY: 0
    }
  },

  // 17. Sports Stat & Player Card
  {
    id: 'sports_stat_card',
    name: 'Sports Stat & Player Card',
    category: 'news',
    description: 'High-impact athletic badge with bold player numbering and metrics',
    duration: 4.5,
    design: {
      mainText: 'ALEX RIVERA #10',
      subtitleText: 'MATCH WINNER · 3 GOALS · 42 ASSISTS',
      fontFamily: 'Oswald',
      fontSize: 38,
      fontWeight: 800,
      letterSpacing: 2,
      lineHeight: 1.1,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Montserrat',
      subtitleFontSize: 14,
      subtitleFontWeight: 700,
      subtitleColor: '#38BDF8',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#0284C7',
        opacity: 0.92,
        paddingX: 24,
        paddingY: 14,
        borderRadius: 8
      },
      accentElement: { enabled: true, type: 'bar', color: '#FACC15', position: 'left', width: 6 },
      animation: { type: 'slide', inDuration: 0.4, outDuration: 0.35, delay: 0, easing: 'ease_out', direction: 'left' },
      positionX: -140,
      positionY: 480
    }
  },

  // 18. Luxury Editorial Title
  {
    id: 'luxury_editorial_title',
    name: 'Luxury Editorial Title',
    category: 'cinematic',
    description: 'High-fashion editorial typography with wide letter tracking and blur reveal',
    duration: 5.5,
    design: {
      mainText: 'MAISON ÉLÉGANCE',
      subtitleText: 'HAUTE COUTURE · PARIS 2026',
      fontFamily: 'Cinzel',
      fontSize: 48,
      fontWeight: 600,
      letterSpacing: 14,
      lineHeight: 1.2,
      textAlign: 'center',
      textColor: '#FAF8F5',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 14,
      subtitleFontWeight: 500,
      subtitleColor: '#D1D5DB',
      subtitleTracking: 8,
      shadow: { enabled: true, color: '#000000', blur: 16, x: 0, y: 4, opacity: 0.75 },
      animation: { type: 'blur_reveal', inDuration: 1.1, outDuration: 0.6, delay: 0, easing: 'ease_out' },
      positionX: 0,
      positionY: -20
    }
  },

  // 19. Retro VHS Terminal Log
  {
    id: 'retro_terminal_log',
    name: 'Retro VHS Terminal Log',
    category: 'dramatic',
    description: 'Analog CRT phosphor green monospace with scanline typewriter effect',
    duration: 4.5,
    design: {
      mainText: '> SYSTEM OVERRIDE PROTOCOL',
      subtitleText: 'NODE // 192.168.1.104 [ACCESS GRANTED]',
      fontFamily: 'Courier New',
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: 2,
      lineHeight: 1.3,
      textAlign: 'left',
      textColor: '#4ADE80',
      subtitleFontFamily: 'Courier New',
      subtitleFontSize: 13,
      subtitleColor: '#22C55E',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#052E16',
        opacity: 0.9,
        paddingX: 18,
        paddingY: 12,
        borderRadius: 4
      },
      accentElement: { enabled: true, type: 'line', color: '#4ADE80', position: 'left', width: 3 },
      animation: { type: 'typewriter', inDuration: 0.9, outDuration: 0.4, delay: 0, easing: 'linear' },
      positionX: -160,
      positionY: -350
    }
  },

  // 20. Dramatic Countdown Slam
  {
    id: 'dramatic_countdown_slam',
    name: 'Dramatic Countdown Slam',
    category: 'dramatic',
    description: 'Heavy bold title slamming down with rapid scale and motion blur',
    duration: 3.5,
    design: {
      mainText: 'THE FINALE',
      subtitleText: 'BEGINS NOW',
      fontFamily: 'Montserrat',
      fontSize: 68,
      fontWeight: 900,
      letterSpacing: 4,
      lineHeight: 1.0,
      textAlign: 'center',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Montserrat',
      subtitleFontSize: 20,
      subtitleFontWeight: 800,
      subtitleColor: '#EF4444',
      subtitleTracking: 8,
      stroke: { enabled: true, color: '#000000', width: 4 },
      shadow: { enabled: true, color: '#DC2626', blur: 28, x: 0, y: 0, opacity: 0.8 },
      animation: { type: 'motion_blur', inDuration: 0.4, outDuration: 0.35, delay: 0, easing: 'ease_out', intensity: 80 },
      positionX: 0,
      positionY: -30
    }
  },

  // 21. Social Media Handle Tag
  {
    id: 'social_handle_tag',
    name: 'Social Media Handle Tag',
    category: 'social_media',
    description: 'Floating creator username tag with subtle accent dot and slide up',
    duration: 4.0,
    design: {
      mainText: '@VOICEFORGE_STUDIO',
      subtitleText: 'FOLLOW FOR DAILY AI VIDEO TIPS',
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: 1,
      lineHeight: 1.2,
      textAlign: 'left',
      textColor: '#FFFFFF',
      subtitleFontFamily: 'Inter',
      subtitleFontSize: 12,
      subtitleFontWeight: 500,
      subtitleColor: '#94A3B8',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#0F172A',
        opacity: 0.88,
        paddingX: 18,
        paddingY: 10,
        borderRadius: 12,
        blurBackdrop: true
      },
      accentElement: { enabled: true, type: 'pill', color: '#38BDF8', position: 'left', width: 4 },
      animation: { type: 'slide', inDuration: 0.45, outDuration: 0.35, delay: 0, easing: 'ease_out', direction: 'up' },
      positionX: -180,
      positionY: 520
    }
  },

  // 22. Tech Spec Readout
  {
    id: 'tech_specs_readout',
    name: 'Tech Spec Readout',
    category: 'modern',
    description: 'Precision engineering telemetry readout with corner brackets',
    duration: 5.0,
    design: {
      mainText: 'NEURAL AUDIO SYNTHESIZER V3',
      subtitleText: 'LATENCY: 12MS · CODEC: 48KHZ 24-BIT FLAC · STATUS: ACTIVE',
      fontFamily: 'Courier New',
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 2,
      lineHeight: 1.3,
      textAlign: 'center',
      textColor: '#38BDF8',
      subtitleFontFamily: 'Courier New',
      subtitleFontSize: 12,
      subtitleColor: '#64748B',
      subtitleTracking: 1,
      backgroundBox: {
        enabled: true,
        color: '#0B132B',
        opacity: 0.85,
        paddingX: 20,
        paddingY: 12,
        borderRadius: 6
      },
      accentElement: { enabled: true, type: 'bracket', color: '#38BDF8', position: 'bottom', width: 2 },
      animation: { type: 'typewriter', inDuration: 0.8, outDuration: 0.4, delay: 0, easing: 'linear' },
      positionX: 0,
      positionY: 480
    }
  }
];

/**
 * Converts a Motion Graphic title clip into an ASS subtitle file string for FFmpeg export
 */
export function motionGraphicToAssEvents(
  clips: TimelineClip[],
  projectDuration: number,
  targetWidth: number,
  targetHeight: number,
  customFontsDir?: string
): string {
  const header = `[Script Info]
Title: VoiceForge Motion Graphics
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: ${targetWidth}
PlayResY: ${targetHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TitleMaster,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,5,10,10,10,1
Style: SubtitleMaster,Arial,24,&H00D4AF37,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,1,1,5,10,10,10,1
Style: BackgroundBox,Arial,20,&H00000000,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];

  clips.forEach((clip, index) => {
    const design = clip.titleDesign;
    if (!design) return;

    const startSec = clip.start;
    const endSec = clip.start + clip.duration;
    const startAss = formatAssTime(startSec);
    const endAss = formatAssTime(endSec);

    // Center coordinates
    const posX = Math.round(targetWidth / 2 + (design.positionX || 0));
    const posY = Math.round(targetHeight / 2 + (design.positionY || 0));

    // Convert hex color to ASS format (&HBBGGRR&)
    const primaryAssColor = hexToAssColor(design.textColor || '#FFFFFF');
    const outlineColor = design.stroke?.enabled ? hexToAssColor(design.stroke.color) : '&H00000000';
    const outlineWidth = design.stroke?.enabled ? design.stroke.width : (design.shadow?.enabled ? 2 : 0);
    const shadowDist = design.shadow?.enabled ? 3 : 0;
    const tracking = design.letterSpacing || 0;
    const fontName = design.fontFamily || 'Arial';
    const fontSize = Math.round(design.fontSize * (targetWidth / 1080));

    // Entrance and Exit fade timings
    const inMs = Math.round((design.animation?.inDuration || 0.6) * 1000);
    const outMs = Math.round((design.animation?.outDuration || 0.4) * 1000);

    // 1. Optional Background Box Drawing (using ASS \p1 vector drawing)
    if (design.backgroundBox?.enabled) {
      const bgWidth = Math.min(targetWidth, Math.round((design.mainText.length * fontSize * 0.62) + (design.backgroundBox.paddingX * 2)));
      const bgHeight = Math.round(fontSize * 1.6 + (design.subtitleText ? 40 : 0) + (design.backgroundBox.paddingY * 2));
      const bgLeft = -Math.round(bgWidth / 2);
      const bgTop = -Math.round(bgHeight / 2);
      const bgRight = Math.round(bgWidth / 2);
      const bgBottom = Math.round(bgHeight / 2);

      const bgAssColor = hexToAssColor(design.backgroundBox.color || '#000000');
      const bgAlphaHex = Math.round((1 - (design.backgroundBox.opacity ?? 0.8)) * 255).toString(16).padStart(2, '0').toUpperCase();

      const bgVector = `{\\an5\\pos(${posX},${posY})\\fad(${inMs},${outMs})\\1c${bgAssColor}\\1a&H${bgAlphaHex}&\\bord0\\shad0\\p1}m ${bgLeft} ${bgTop} l ${bgRight} ${bgTop} l ${bgRight} ${bgBottom} l ${bgLeft} ${bgBottom}{\\p0}`;
      events.push(`Dialogue: 1,${startAss},${endAss},BackgroundBox,,0,0,0,,${bgVector}`);
    }

    // 2. Main Title Text Line
    const safeMainText = design.mainText.replace(/[{}]/g, '');
    let mainAssTags = `{\\an5\\pos(${posX},${posY})\\fn${fontName}\\fs${fontSize}\\b${design.fontWeight >= 700 ? 1 : 0}\\1c${primaryAssColor}\\3c${outlineColor}\\bord${outlineWidth}\\shad${shadowDist}\\fsp${tracking}\\fad(${inMs},${outMs})}`;

    // Animation tags
    if (design.animation?.type === 'slide') {
      const dist = 60;
      const startX = design.animation.direction === 'left' ? posX + dist : design.animation.direction === 'right' ? posX - dist : posX;
      const startY = design.animation.direction === 'up' ? posY + dist : design.animation.direction === 'down' ? posY - dist : posY;
      mainAssTags = `{\\an5\\move(${startX},${startY},${posX},${posY},0,${inMs})\\fn${fontName}\\fs${fontSize}\\b${design.fontWeight >= 700 ? 1 : 0}\\1c${primaryAssColor}\\3c${outlineColor}\\bord${outlineWidth}\\shad${shadowDist}\\fsp${tracking}\\fad(${inMs},${outMs})}`;
    }

    events.push(`Dialogue: 2,${startAss},${endAss},TitleMaster,,0,0,0,,${mainAssTags}${safeMainText}`);

    // 3. Optional Subtitle Line
    if (design.subtitleText) {
      const subFontSize = Math.round((design.subtitleFontSize || 16) * (targetWidth / 1080));
      const subPosY = posY + Math.round(fontSize * 0.7) + 14;
      const subColor = hexToAssColor(design.subtitleColor || '#D4AF37');
      const subFont = design.subtitleFontFamily || 'Arial';
      const subTracking = design.subtitleTracking || 3;
      const subText = design.subtitleText.replace(/[{}]/g, '');

      const subTags = `{\\an5\\pos(${posX},${subPosY})\\fn${subFont}\\fs${subFontSize}\\1c${subColor}\\bord1\\shad1\\fsp${subTracking}\\fad(${inMs + 100},${outMs})}`;
      events.push(`Dialogue: 3,${startAss},${endAss},SubtitleMaster,,0,0,0,,${subTags}${subText}`);
    }
  });

  return header + events.join('\n') + '\n';
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function hexToAssColor(hex: string): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length >= 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H00${b}${g}${r}&`;
  }
  return '&H00FFFFFF&';
}
