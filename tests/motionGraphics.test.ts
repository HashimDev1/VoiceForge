import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  STARTER_MOTION_TEMPLATES,
  evaluateMotionGraphicAtTime,
  motionGraphicToAssEvents,
  EvaluatedMotionGraphic
} from '../shared/src/motionGraphicsEngine';
import {
  MotionTitleDesign,
  MotionAnimationConfig,
  MotionTitleTemplate,
  TimelineClip
} from '../shared/src/videoEditorTypes';
import { evaluateClipKeyframes } from '../shared/src/videoEditorKeyframes';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS
} from '../shared/src/videoEditorDefaults';
import { VideoEditorService } from '../server/src/services/videoEditorService';

async function runTestSuite() {
  console.log('=======================================================');
  console.log(' Running VoiceForge Motion Graphics Studio Test Suite');
  console.log('=======================================================');

  // -------------------------------------------------------------
  // Test 1: Starter Motion Templates Library Validation
  // -------------------------------------------------------------
  console.log('\n[Test 1] Validating Starter Motion Templates Library...');
  assert(Array.isArray(STARTER_MOTION_TEMPLATES), 'STARTER_MOTION_TEMPLATES must be an array');
  assert(
    STARTER_MOTION_TEMPLATES.length >= 22,
    `Expected at least 22 starter templates, got ${STARTER_MOTION_TEMPLATES.length}`
  );

  const requiredCategories = [
    'cinematic',
    'documentary',
    'minimal',
    'modern',
    'news',
    'corporate',
    'social_media',
    'dramatic'
  ];

  const foundCategories = new Set(STARTER_MOTION_TEMPLATES.map((t) => t.category));
  for (const cat of requiredCategories) {
    assert(foundCategories.has(cat as any), `Missing starter template category: ${cat}`);
  }

  for (const tmpl of STARTER_MOTION_TEMPLATES) {
    assert(tmpl.id, `Template missing id: ${JSON.stringify(tmpl)}`);
    assert(tmpl.name, `Template ${tmpl.id} missing name`);
    assert(tmpl.design, `Template ${tmpl.id} missing design`);
    assert(tmpl.design.mainText, `Template ${tmpl.id} missing mainText`);
    assert(tmpl.design.fontFamily, `Template ${tmpl.id} missing fontFamily`);
    assert(tmpl.design.fontSize > 0, `Template ${tmpl.id} invalid fontSize`);
    assert(tmpl.design.textColor, `Template ${tmpl.id} missing textColor`);
    assert(tmpl.design.animation, `Template ${tmpl.id} missing animation config`);
    assert(tmpl.design.animation.type, `Template ${tmpl.id} missing animation type`);
    assert(tmpl.design.animation.inDuration > 0, `Template ${tmpl.id} invalid inDuration`);
  }
  console.log(`✓ All ${STARTER_MOTION_TEMPLATES.length} starter templates validated across all 8 required categories.`);

  // -------------------------------------------------------------
  // Test 2: Animation Engine Mathematical Evaluation
  // -------------------------------------------------------------
  console.log('\n[Test 2] Testing evaluateMotionGraphicAtTime across animation types...');

  const baseDesign: MotionTitleDesign = {
    mainText: 'VOICEFORGE MOTION GRAPHICS',
    subtitleText: 'Next Gen Video Engine',
    fontFamily: 'Montserrat',
    fontSize: 48,
    fontWeight: 700,
    letterSpacing: 2,
    lineHeight: 1.2,
    textAlign: 'center',
    textColor: '#FFFFFF',
    positionX: 0,
    positionY: 0,
    scale: 1,
    rotation: 0,
    animation: {
      type: 'fade',
      inDuration: 1.0,
      outDuration: 1.0,
      delay: 0,
      easing: 'ease_in_out'
    }
  };

  // 2A: Fade in, sustain, and fade out
  {
    const stateStart = evaluateMotionGraphicAtTime(baseDesign, 0, 5.0);
    assert(stateStart.opacity <= 0.05, `Expected start opacity ~0, got ${stateStart.opacity}`);

    const stateMidIn = evaluateMotionGraphicAtTime(baseDesign, 0.5, 5.0);
    assert(
      stateMidIn.opacity > 0.2 && stateMidIn.opacity < 0.8,
      `Expected mid-in opacity ~0.5, got ${stateMidIn.opacity}`
    );

    const stateSustain = evaluateMotionGraphicAtTime(baseDesign, 2.5, 5.0);
    assert.strictEqual(stateSustain.opacity, 1.0, `Expected sustain opacity 1.0, got ${stateSustain.opacity}`);

    const stateOut = evaluateMotionGraphicAtTime(baseDesign, 4.8, 5.0);
    assert(stateOut.opacity < 0.4, `Expected out opacity < 0.4, got ${stateOut.opacity}`);
    console.log('✓ Fade in / sustain / out transitions correctly evaluated.');
  }

  // 2B: Typewriter progressive text revealing
  {
    const typewriterDesign: MotionTitleDesign = {
      ...baseDesign,
      animation: {
        type: 'typewriter',
        inDuration: 2.0,
        outDuration: 0.1,
        delay: 0,
        easing: 'linear'
      }
    };

    const fullText = typewriterDesign.mainText;
    const state0 = evaluateMotionGraphicAtTime(typewriterDesign, 0.05, 5.0);
    assert(state0.mainText.length <= 2, `Expected first 1-2 chars, got "${state0.mainText}"`);

    const stateHalf = evaluateMotionGraphicAtTime(typewriterDesign, 1.0, 5.0);
    const expectedHalfLen = Math.floor(fullText.length * 0.5);
    assert(
      Math.abs(stateHalf.mainText.length - expectedHalfLen) <= 2,
      `Expected ~half chars (${expectedHalfLen}), got ${stateHalf.mainText.length}`
    );

    const stateFull = evaluateMotionGraphicAtTime(typewriterDesign, 2.2, 5.0);
    assert.strictEqual(stateFull.mainText, fullText, 'Typewriter must reveal full text after inDuration');
    console.log('✓ Typewriter character revelation verified at exact time boundaries.');
  }

  // 2C: Word by word reveal
  {
    const wordDesign: MotionTitleDesign = {
      ...baseDesign,
      mainText: 'One Two Three Four',
      animation: {
        type: 'word_by_word',
        inDuration: 2.0,
        outDuration: 0.1,
        delay: 0,
        easing: 'linear'
      }
    };

    const state0 = evaluateMotionGraphicAtTime(wordDesign, 0.2, 4.0);
    assert.strictEqual(state0.mainText, 'One', `Expected "One", got "${state0.mainText}"`);

    const stateHalf = evaluateMotionGraphicAtTime(wordDesign, 0.8, 4.0);
    assert.strictEqual(stateHalf.mainText, 'One Two', `Expected "One Two", got "${stateHalf.mainText}"`);

    const stateAll = evaluateMotionGraphicAtTime(wordDesign, 2.0, 4.0);
    assert.strictEqual(stateAll.mainText, 'One Two Three Four', `Expected all words, got "${stateAll.mainText}"`);
    console.log('✓ Word-by-word reveal verified at progressive intervals.');
  }

  // 2D: Blur Reveal
  {
    const blurDesign: MotionTitleDesign = {
      ...baseDesign,
      animation: {
        type: 'blur_reveal',
        inDuration: 1.0,
        outDuration: 0.1,
        delay: 0,
        easing: 'ease_out'
      }
    };

    const stateStart = evaluateMotionGraphicAtTime(blurDesign, 0.1, 4.0);
    assert(stateStart.blur > 10, `Expected blur > 10px at start, got ${stateStart.blur}`);

    const stateEnd = evaluateMotionGraphicAtTime(blurDesign, 1.2, 4.0);
    assert.strictEqual(stateEnd.blur, 0, `Expected 0 blur after reveal, got ${stateEnd.blur}`);
    console.log('✓ Blur reveal transition verified.');
  }

  // 2E: Tracking Reveal (Letter spacing expansion)
  {
    const trackingDesign: MotionTitleDesign = {
      ...baseDesign,
      animation: {
        type: 'tracking_reveal',
        inDuration: 1.0,
        outDuration: 0.1,
        delay: 0,
        easing: 'ease_out'
      }
    };

    const stateStart = evaluateMotionGraphicAtTime(trackingDesign, 0.1, 4.0);
    assert(stateStart.letterSpacing > 8, `Expected expanded letterSpacing at start, got ${stateStart.letterSpacing}`);

    const stateEnd = evaluateMotionGraphicAtTime(trackingDesign, 1.2, 4.0);
    assert(stateEnd.letterSpacing <= baseDesign.letterSpacing, `Expected normal letterSpacing after reveal, got ${stateEnd.letterSpacing}`);
    console.log('✓ Tracking reveal letter spacing expansion verified.');
  }

  // 2F: Slide, Scale, Mask, and Glitch animations
  {
    const allTypes: Array<MotionAnimationConfig['type']> = [
      'slide',
      'scale',
      'mask_reveal',
      'glitch',
      'cinematic_zoom',
      'motion_blur',
      'letter_by_letter'
    ];

    for (const t of allTypes) {
      const customDesign: MotionTitleDesign = {
        ...baseDesign,
        animation: {
          type: t,
          inDuration: 1.0,
          outDuration: 0.5,
          delay: 0,
          easing: 'ease_in_out',
          direction: 'up'
        }
      };
      const s1 = evaluateMotionGraphicAtTime(customDesign, 0.2, 4.0);
      const s2 = evaluateMotionGraphicAtTime(customDesign, 2.0, 4.0);
      const s3 = evaluateMotionGraphicAtTime(customDesign, 3.8, 4.0);
      assert(s1 && s2 && s3, `Evaluation failed for type ${t}`);
      if (t === 'mask_reveal') {
        assert(s1.maskClipPath, `Expected maskClipPath for mask_reveal`);
      }
      if (t === 'glitch') {
        assert(typeof s1.glitchOffsetX === 'number', `Expected numeric glitchOffsetX for glitch`);
      }
    }
    console.log('✓ All 12 animation types successfully evaluated without errors.');
  }

  // -------------------------------------------------------------
  // Test 3: Keyframe Engine Extensions (Blur, Letter Spacing, Shadow)
  // -------------------------------------------------------------
  console.log('\n[Test 3] Testing Keyframe Engine Extensions...');

  const keyframedClip: TimelineClip = {
    id: 'clip_kf_test',
    trackId: 'track_text_1',
    name: 'Keyframe Title',
    type: 'text',
    start: 0,
    duration: 5.0,
    sourceStart: 0,
    sourceDuration: 5.0,
    text: 'Keyframed Typography',
    titleDesign: {
      ...baseDesign,
      letterSpacing: 2
    },
    transform: { ...DEFAULT_TRANSFORM },
    speed: { ...DEFAULT_SPEED },
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    audio: { ...DEFAULT_AUDIO_SETTINGS },
    effects: [],
    keyframes: [
      { id: 'kf1', time: 0.0, property: 'blur', value: 20, easing: 'linear' },
      { id: 'kf2', time: 2.0, property: 'blur', value: 0, easing: 'linear' },
      { id: 'kf3', time: 0.0, property: 'letterSpacing', value: 40, easing: 'ease_out' },
      { id: 'kf4', time: 2.0, property: 'letterSpacing', value: 2, easing: 'ease_out' },
      { id: 'kf5', time: 0.0, property: 'shadowIntensity', value: 0.0, easing: 'linear' },
      { id: 'kf6', time: 2.0, property: 'shadowIntensity', value: 1.0, easing: 'linear' }
    ]
  };

  const kfValues = evaluateClipKeyframes(keyframedClip, 1.0);
  assert(kfValues.blur !== undefined, 'blur keyframe value should be defined');
  assert(Math.abs(kfValues.blur - 10) < 0.5, `Expected blur ~10, got ${kfValues.blur}`);

  assert(kfValues.letterSpacing !== undefined, 'letterSpacing keyframe value should be defined');
  assert(kfValues.letterSpacing < 40 && kfValues.letterSpacing > 2, `Expected letterSpacing between 2 and 40, got ${kfValues.letterSpacing}`);

  assert(kfValues.shadowIntensity !== undefined, 'shadowIntensity keyframe value should be defined');
  assert(Math.abs(kfValues.shadowIntensity - 0.5) < 0.1, `Expected shadowIntensity ~0.5, got ${kfValues.shadowIntensity}`);
  console.log('✓ Advanced keyframes for blur, letterSpacing, and shadowIntensity verified.');

  // -------------------------------------------------------------
  // Test 4: ASS Subtitle Vector Event Generation
  // -------------------------------------------------------------
  console.log('\n[Test 4] Testing ASS Subtitle Vector Event Generation...');

  const titleClip: TimelineClip = {
    ...keyframedClip,
    start: 1.0,
    duration: 4.0,
    titleDesign: {
      ...baseDesign,
      backgroundBox: {
        enabled: true,
        color: '#0F172A',
        opacity: 0.85,
        paddingX: 20,
        paddingY: 10,
        borderRadius: 8
      },
      accentElement: {
        enabled: true,
        type: 'bar',
        color: '#38BDF8',
        position: 'bottom',
        width: 120,
        height: 4,
        opacity: 1.0
      }
    }
  };

  const assDoc = motionGraphicToAssEvents([titleClip], 6.0, 1920, 1080);
  assert(typeof assDoc === 'string', 'motionGraphicToAssEvents must return a string');
  assert(assDoc.includes('[Script Info]'), 'ASS document must have [Script Info]');
  assert(assDoc.includes('PlayResX: 1920'), 'ASS document must match target width 1920');
  assert(assDoc.includes('PlayResY: 1080'), 'ASS document must match target height 1080');
  assert(assDoc.includes('Dialogue:'), 'ASS document must contain Dialogue events');
  assert(assDoc.includes('VOICEFORGE'), 'ASS document must contain main title text');
  assert(assDoc.includes('\\p1'), 'ASS document must contain \\p1 vector drawing for background banner');
  console.log('✓ ASS export generated complete document with vector box and accent lines.');

  // -------------------------------------------------------------
  // Test 5: Reusable Motion Template Storage Service
  // -------------------------------------------------------------
  console.log('\n[Test 5] Testing Template Storage CRUD Service...');

  const customTemplate: MotionTitleTemplate = {
    id: `custom_test_${Date.now()}`,
    name: 'Custom Documentary Title',
    category: 'documentary',
    description: 'Custom verified template',
    duration: 5.0,
    design: {
      ...baseDesign,
      mainText: 'DOCUMENTARY DISCOVERY'
    }
  };

  const savedTmpl = await VideoEditorService.saveMotionTemplate(customTemplate);
  assert(savedTmpl.id, 'Saved template must have an ID');
  assert.strictEqual(savedTmpl.name, customTemplate.name);

  const templatesList = await VideoEditorService.listMotionTemplates();
  const found = templatesList.find((t) => t.id === savedTmpl.id);
  assert(found, `Saved template ${savedTmpl.id} must appear in listMotionTemplates`);
  assert.strictEqual(found?.design.mainText, 'DOCUMENTARY DISCOVERY');

  const deleted = await VideoEditorService.deleteMotionTemplate(savedTmpl.id);
  assert.strictEqual(deleted, true, 'deleteMotionTemplate should return true');

  const afterDelete = await VideoEditorService.listMotionTemplates();
  assert(!afterDelete.some((t) => t.id === savedTmpl.id), 'Deleted template must not appear in list');
  console.log('✓ Motion template creation, file persistence, retrieval, and deletion verified.');

  // -------------------------------------------------------------
  // Test 6: Custom Font Assets Detection
  // -------------------------------------------------------------
  console.log('\n[Test 6] Testing Custom Font Assets Detection...');

  const fonts = await VideoEditorService.listFonts();
  assert(Array.isArray(fonts), 'listFonts must return an array');
  console.log(`✓ listFonts returned ${fonts.length} installed/custom fonts.`);

  // -------------------------------------------------------------
  // Test 7: 4K & 1080p Export Dimension Calculations
  // -------------------------------------------------------------
  console.log('\n[Test 7] Validating 4K UHD Export Dimension Support...');

  const ass4kLand = motionGraphicToAssEvents([titleClip], 6.0, 3840, 2160);
  assert(ass4kLand.includes('PlayResX: 3840'), '4K landscape must specify PlayResX: 3840');
  assert(ass4kLand.includes('PlayResY: 2160'), '4K landscape must specify PlayResY: 2160');

  const ass4kPort = motionGraphicToAssEvents([titleClip], 6.0, 2160, 3840);
  assert(ass4kPort.includes('PlayResX: 2160'), '4K portrait must specify PlayResX: 2160');
  assert(ass4kPort.includes('PlayResY: 3840'), '4K portrait must specify PlayResY: 3840');
  console.log('✓ 4K UHD (3840x2160 & 2160x3840) vector resolution calculations verified.');

  console.log('\n=======================================================');
  console.log(' ✅ ALL MOTION GRAPHICS STUDIO UNIT TESTS PASSED!');
  console.log('=======================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ MOTION GRAPHICS TEST FAILED:', err);
  process.exit(1);
});
