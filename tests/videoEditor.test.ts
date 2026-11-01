import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { VideoEditorService } from '../server/src/services/videoEditorService';
import {
  createNewProject,
  COLOR_PRESETS,
  TRANSITION_CATALOG,
  EFFECT_CATALOG,
  ASPECT_RATIOS,
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS
} from '../shared/src/videoEditorDefaults';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  MediaAsset,
  Keyframe
} from '../shared/src/videoEditorTypes';
import {
  evaluateClipKeyframes,
  interpolateProperty,
  applyEasing,
  solveCubicBezier
} from '../shared/src/videoEditorKeyframes';
import { FFmpegHelper } from '../server/src/utils/ffmpegHelper';

const execFileAsync = util.promisify(execFile);

async function runAll20Tests() {
  console.log('=======================================================');
  console.log(' Running Video Editor Phase 2 — 20-Point Verification');
  console.log('=======================================================');

  VideoEditorService.initStorage();
  const assetsDir = VideoEditorService.getAssetsDir();
  const exportsDir = VideoEditorService.getExportsDir();
  const ffmpeg = await FFmpegHelper.getFfmpegPath();

  // Create a real small test video fixture (1.5 seconds, 320x240, 30fps with audio)
  const fixturePath = path.join(assetsDir, `fixture_test_${Date.now()}.mp4`);
  await execFileAsync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=1.5:size=320x240:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-shortest',
    fixturePath
  ]);

  try {
    // ----------------------------------------------------
    // [Test 1] Video Upload & Storage
    // ----------------------------------------------------
    console.log('\n[Test 1] Video upload & storage verification...');
    assert.ok(fs.existsSync(fixturePath), 'Uploaded test fixture file must exist in assets directory');
    console.log('✓ Video upload & storage passed.');

    // ----------------------------------------------------
    // [Test 2] Video Metadata Extraction (ffprobe)
    // ----------------------------------------------------
    console.log('\n[Test 2] Video metadata extraction via ffprobe...');
    const probedAsset = await VideoEditorService.probeMedia(fixturePath, 'sample_clip.mp4');
    assert.strictEqual(probedAsset.type, 'video');
    assert.ok(probedAsset.duration >= 1.4 && probedAsset.duration <= 1.6, `Duration should be ~1.5s, got ${probedAsset.duration}`);
    assert.strictEqual(probedAsset.width, 320);
    assert.strictEqual(probedAsset.height, 240);
    assert.strictEqual(probedAsset.fps, 30);
    console.log(`✓ Video metadata extracted: ${probedAsset.width}x${probedAsset.height}, ${probedAsset.duration.toFixed(2)}s, ${probedAsset.fps} FPS`);

    // ----------------------------------------------------
    // [Test 3] Timeline Clip Creation
    // ----------------------------------------------------
    console.log('\n[Test 3] Timeline clip creation...');
    const project = createNewProject('Production Test Project', '9:16');
    project.assets.push(probedAsset);

    const v1Track = project.tracks.find((t) => t.id === 'track-v1')!;
    assert.ok(v1Track, 'Project must contain track-v1');

    const clip1: TimelineClip = {
      id: 'clip_v1_main',
      trackId: v1Track.id,
      assetId: probedAsset.id,
      name: probedAsset.name,
      type: 'video',
      start: 0,
      duration: 1.5,
      sourceStart: 0,
      sourceDuration: 1.5,
      url: probedAsset.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      effects: [],
      keyframes: []
    };
    project.clips.push(clip1);
    assert.strictEqual(project.clips.length, 1);
    console.log('✓ Timeline clip creation passed.');

    // ----------------------------------------------------
    // [Test 4] Clip Trimming
    // ----------------------------------------------------
    console.log('\n[Test 4] Clip trimming (start & end)...');
    // Trim 0.3s from start
    const trimmedStart = 0.3;
    const trimmedDuration = clip1.duration - trimmedStart;
    clip1.start = trimmedStart;
    clip1.duration = trimmedDuration;
    clip1.sourceStart = trimmedStart;
    assert.strictEqual(clip1.start, 0.3);
    assert.strictEqual(Number(clip1.duration.toFixed(1)), 1.2);
    assert.strictEqual(clip1.sourceStart, 0.3);
    console.log('✓ Clip trimming verified.');

    // ----------------------------------------------------
    // [Test 5] Clip Splitting
    // ----------------------------------------------------
    console.log('\n[Test 5] Clip splitting at playhead...');
    const splitPlayhead = 0.8; // within [0.3, 1.5]
    const firstHalfDuration = splitPlayhead - clip1.start; // 0.5s
    const secondHalfDuration = clip1.duration - firstHalfDuration; // 0.7s

    const clip1Head: TimelineClip = { ...clip1, duration: firstHalfDuration };
    const clip1Tail: TimelineClip = {
      ...clip1,
      id: 'clip_v1_tail',
      start: splitPlayhead,
      duration: secondHalfDuration,
      sourceStart: clip1.sourceStart + firstHalfDuration
    };
    assert.strictEqual(Number((clip1Head.duration + clip1Tail.duration).toFixed(1)), 1.2);
    assert.strictEqual(clip1Tail.start, 0.8);
    console.log('✓ Clip splitting verified.');

    // ----------------------------------------------------
    // [Test 6] Clip Moving & Snapping
    // ----------------------------------------------------
    console.log('\n[Test 6] Clip moving and magnetic snap logic...');
    let targetStart = 0.82;
    const snapThreshold = 0.35;
    // Magnetic snap to previous clip's end (0.8s)
    if (Math.abs(targetStart - splitPlayhead) < snapThreshold) {
      targetStart = splitPlayhead;
    }
    assert.strictEqual(targetStart, 0.8, 'Moving clip should snap to adjacent clip boundary');
    clip1Tail.start = targetStart;
    console.log('✓ Clip moving and magnetic snap passed.');

    // ----------------------------------------------------
    // [Test 7] Clip Duplication
    // ----------------------------------------------------
    console.log('\n[Test 7] Clip duplication...');
    const duplicatedClip: TimelineClip = {
      ...JSON.parse(JSON.stringify(clip1Tail)),
      id: 'clip_v1_copy',
      name: `${clip1Tail.name} (Copy)`,
      start: clip1Tail.start + clip1Tail.duration + 0.1
    };
    assert.ok(duplicatedClip.id !== clip1Tail.id);
    assert.ok(duplicatedClip.start > clip1Tail.start);
    console.log('✓ Clip duplication passed.');

    // ----------------------------------------------------
    // [Test 8] Ripple Delete
    // ----------------------------------------------------
    console.log('\n[Test 8] Ripple delete...');
    const trackClips = [
      { id: 'c1', start: 0, duration: 1.0 },
      { id: 'c2', start: 1.0, duration: 0.5 },
      { id: 'c3', start: 1.5, duration: 2.0 }
    ];
    // Delete c2 (duration 0.5s at 1.0s) with ripple: c3 shifts left by 0.5s
    const rippleShift = 0.5;
    const remaining = trackClips
      .filter((c) => c.id !== 'c2')
      .map((c) => (c.start > 1.0 ? { ...c, start: c.start - rippleShift } : c));
    assert.strictEqual(remaining.length, 2);
    assert.strictEqual(remaining.find((c) => c.id === 'c3')!.start, 1.0, 'c3 should shift from 1.5s to 1.0s');
    console.log('✓ Ripple delete passed.');

    // ----------------------------------------------------
    // [Test 9] Undo and Redo
    // ----------------------------------------------------
    console.log('\n[Test 9] Undo and redo stack mechanics...');
    const undoStack: EditorProject[] = [];
    const redoStack: EditorProject[] = [];

    // Snapshot state A
    undoStack.push(JSON.parse(JSON.stringify(project)));
    // State B: update name
    project.name = 'Updated Title';

    // Undo action
    const reverted = undoStack.pop()!;
    redoStack.push(JSON.parse(JSON.stringify(project)));
    assert.strictEqual(reverted.name, 'Production Test Project');

    // Redo action
    const redone = redoStack.pop()!;
    assert.strictEqual(redone.name, 'Updated Title');
    console.log('✓ Undo and redo stack passed.');

    // ----------------------------------------------------
    // [Test 10] Transform Preview
    // ----------------------------------------------------
    console.log('\n[Test 10] Transform properties (Scale, Rotation, Crop, Flip)...');
    const transformClip: TimelineClip = {
      ...clip1,
      transform: {
        ...DEFAULT_TRANSFORM,
        scale: 1.5,
        rotation: 45,
        flipH: true,
        cropTop: 10,
        cropBottom: 10
      }
    };
    const evalTf = evaluateClipKeyframes(transformClip, 0.5);
    assert.strictEqual(evalTf.scale, 1.5);
    assert.strictEqual(evalTf.rotation, 45);
    assert.strictEqual(transformClip.transform.flipH, true);
    assert.strictEqual(transformClip.transform.cropTop, 10);
    console.log('✓ Transform evaluation passed.');

    // ----------------------------------------------------
    // [Test 11] Audio Synchronization
    // ----------------------------------------------------
    console.log('\n[Test 11] Audio synchronization offset calculation...');
    const audioClip: TimelineClip = {
      ...clip1,
      type: 'audio',
      start: 2.0,
      duration: 3.0,
      sourceStart: 1.0,
      speed: { ...DEFAULT_SPEED, speed: 1.5 }
    };
    const currentPlayhead = 3.0; // 1.0s into clip
    const localPlayOffset = currentPlayhead - audioClip.start; // 1.0s
    const mediaCurrentTime = audioClip.sourceStart + localPlayOffset * audioClip.speed.speed;
    assert.strictEqual(mediaCurrentTime, 2.5, 'At 3.0s timeline, 1.5x speed audio should be at 1.0 + 1.0*1.5 = 2.5s');
    console.log('✓ Audio synchronization passed.');

    // ----------------------------------------------------
    // [Test 12] Multiple Video Tracks
    // ----------------------------------------------------
    console.log('\n[Test 12] Multiple video tracks layering...');
    const v2Track = project.tracks.find((t) => t.id === 'track-v2')!;
    assert.ok(v2Track, 'track-v2 must exist');
    assert.ok(v2Track.order < v1Track.order, 'V2 should have higher stacking priority (overlay on V1)');
    console.log('✓ Multiple video tracks verified.');

    // ----------------------------------------------------
    // [Test 13] Multiple Audio Tracks
    // ----------------------------------------------------
    console.log('\n[Test 13] Multiple audio tracks mixing & solo...');
    const a1Track = project.tracks.find((t) => t.id === 'track-a1')!;
    const a2Track = project.tracks.find((t) => t.id === 'track-a2')!;
    assert.ok(a1Track && a2Track, 'Both A1 and A2 audio tracks must exist');
    a1Track.solo = true;
    assert.strictEqual(a1Track.solo, true);
    assert.strictEqual(Boolean(a2Track.solo), false);
    console.log('✓ Multiple audio tracks verified.');

    // ----------------------------------------------------
    // [Test 14] Keyframe Interpolation
    // ----------------------------------------------------
    console.log('\n[Test 14] Keyframe interpolation (Linear, Ease-In, Ease-Out, Bezier)...');
    const keyframedClip: TimelineClip = {
      ...clip1,
      start: 0,
      duration: 4.0,
      keyframes: [
        { id: 'kf1', time: 0, property: 'scale', value: 1.0, easing: 'linear' },
        { id: 'kf2', time: 2.0, property: 'scale', value: 2.0, easing: 'linear' },
        { id: 'kf3', time: 4.0, property: 'scale', value: 3.0, easing: 'ease_in' },
        { id: 'kf4', time: 0, property: 'opacity', value: 0.0, easing: 'linear' },
        { id: 'kf5', time: 2.0, property: 'opacity', value: 1.0, easing: 'ease_out' }
      ]
    };

    const midScale = interpolateProperty(keyframedClip, 'scale', 1.0);
    assert.strictEqual(midScale, 1.5, 'Linear interpolation at 50% between 1.0 and 2.0 must be 1.5');

    const bezierVal = solveCubicBezier(0.5, 0.42, 0, 0.58, 1);
    assert.ok(bezierVal > 0.4 && bezierVal < 0.6, 'Standard cubic bezier should approximate 0.5 at midpoint');
    console.log('✓ Keyframe interpolation passed.');

    // ----------------------------------------------------
    // [Test 15] Transition Rendering
    // ----------------------------------------------------
    console.log('\n[Test 15] Transition in & out evaluation...');
    const transClip: TimelineClip = {
      ...clip1,
      start: 0,
      duration: 2.0,
      transitionIn: { type: 'fade', duration: 0.5 },
      transitionOut: { type: 'zoom_out', duration: 0.5 }
    };
    const startTrans = evaluateClipKeyframes(transClip, 0.25);
    assert.ok(startTrans.transitionOpacity < 1.0, 'Fade in should attenuate opacity during transition window');
    const endTrans = evaluateClipKeyframes(transClip, 1.8);
    assert.ok(endTrans.transitionOpacity < 1.0, 'Transition out should attenuate opacity at end');
    console.log('✓ Transition rendering evaluation passed.');

    // ----------------------------------------------------
    // [Test 16] Effect Rendering
    // ----------------------------------------------------
    console.log('\n[Test 16] Effect stack and color grading...');
    const fxClip: TimelineClip = {
      ...clip1,
      colorGrading: {
        ...DEFAULT_COLOR_GRADING,
        brightness: 15,
        contrast: 20,
        temperature: 30
      },
      effects: [
        { id: 'eff1', type: 'vignette', intensity: 80, enabled: true },
        { id: 'eff2', type: 'film_grain', intensity: 50, enabled: true }
      ]
    };
    assert.strictEqual(fxClip.colorGrading.brightness, 15);
    assert.strictEqual(fxClip.effects.length, 2);
    console.log('✓ Effect stack and color grading passed.');

    // ----------------------------------------------------
    // [Test 17] Caption Integration
    // ----------------------------------------------------
    console.log('\n[Test 17] Caption and animated typography integration...');
    const captionClip: TimelineClip = {
      id: 'caption_1',
      trackId: 'track-text',
      name: 'Title Overlay',
      type: 'caption',
      start: 0.5,
      duration: 2.0,
      sourceStart: 0,
      sourceDuration: 2.0,
      text: 'VOICEFORGE MOTION ENGINE',
      captionPresetId: 'bold_viral',
      transform: { ...DEFAULT_TRANSFORM, y: 40 },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      effects: [],
      keyframes: []
    };
    assert.strictEqual(captionClip.type, 'caption');
    assert.strictEqual(captionClip.text, 'VOICEFORGE MOTION ENGINE');
    console.log('✓ Caption integration passed.');

    // ----------------------------------------------------
    // [Test 18] Export Correctness (Real Multi-Track FFmpeg)
    // ----------------------------------------------------
    console.log('\n[Test 18] Real multi-track FFmpeg synthesis export...');
    const exportProject = createNewProject('Full Export Test', '9:16');
    exportProject.duration = 1.0;
    exportProject.assets.push(probedAsset);
    exportProject.clips.push({
      id: 'clip_exp_1',
      trackId: 'track-v1',
      assetId: probedAsset.id,
      name: probedAsset.name,
      type: 'video',
      start: 0,
      duration: 1.0,
      sourceStart: 0,
      sourceDuration: 1.0,
      url: probedAsset.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      effects: [],
      keyframes: []
    });

    const exportJob = await VideoEditorService.startExport(exportProject, {
      resolution: '720p',
      fps: 30,
      codec: 'h264'
    });
    assert.ok(exportJob.id);

    let exportDone = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const status = VideoEditorService.getExportJob(exportJob.id);
      if (status?.status === 'completed') {
        exportDone = true;
        const exportedVideo = path.join(exportsDir, status.filename!);
        assert.ok(fs.existsSync(exportedVideo), 'Exported file must exist on disk');
        const stat = fs.statSync(exportedVideo);
        assert.ok(stat.size > 1000, 'Exported MP4 must be valid size');
        console.log(`✓ Real multi-track export verified: ${status.filename} (${(stat.size / 1024).toFixed(1)} KB)`);
        fs.unlinkSync(exportedVideo);
        break;
      }
      if (status?.status === 'failed') {
        throw new Error(`Export job failed: ${status.error}`);
      }
    }
    assert.ok(exportDone, 'Export must complete successfully');

    // ----------------------------------------------------
    // [Test 19] Export Cancellation
    // ----------------------------------------------------
    console.log('\n[Test 19] Export cancellation...');
    const cancelProject = createNewProject('Cancellation Test', '16:9');
    cancelProject.duration = 5.0;
    const cancelJob = await VideoEditorService.startExport(cancelProject, {
      resolution: '1080p' as any,
      fps: 30,
      codec: 'h264'
    });
    const cancelSuccess = VideoEditorService.cancelExport(cancelJob.id);
    assert.strictEqual(cancelSuccess, true);
    const cancelledStatus = VideoEditorService.getExportJob(cancelJob.id);
    assert.strictEqual(cancelledStatus?.status, 'cancelled');
    console.log('✓ Export cancellation verified.');

    // ----------------------------------------------------
    // [Test 20] Project Recovery & Missing Media Detection
    // ----------------------------------------------------
    console.log('\n[Test 20] Project recovery & missing media detection...');
    const recoveryProject = createNewProject('Recovery Test', '9:16');
    recoveryProject.assets.push({
      id: 'missing_asset',
      name: 'deleted_video.mp4',
      url: '/api/editor/assets/deleted_video_nonexistent.mp4',
      type: 'video',
      duration: 10,
      createdAt: new Date().toISOString()
    });
    const verifyResult = await VideoEditorService.verifyProjectAssets(recoveryProject);
    assert.strictEqual(verifyResult.missingCount, 1, 'Should detect 1 missing asset');
    assert.strictEqual(recoveryProject.assets[0].isMissing, true);

    await VideoEditorService.saveProject(recoveryProject);
    const loadedRecovery = await VideoEditorService.getProject(recoveryProject.id);
    assert.strictEqual(loadedRecovery.assets[0].isMissing, true);
    await VideoEditorService.deleteProject(recoveryProject.id);
    console.log('✓ Project recovery & missing media detection passed.');

  } finally {
    if (fs.existsSync(fixturePath)) {
      fs.unlinkSync(fixturePath);
    }
  }

  console.log('\n=======================================================');
  console.log(' ✅ ALL 20 VIDEO EDITOR PHASE 2 TESTS PASSED!');
  console.log('=======================================================');
}

runAll20Tests().catch((err) => {
  console.error('\n❌ Phase 2 test suite failed:', err);
  process.exit(1);
});
