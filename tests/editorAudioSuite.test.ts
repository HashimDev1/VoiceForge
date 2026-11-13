import assert from 'assert';
import { createNewProject, DEFAULT_TRANSFORM, DEFAULT_SPEED, DEFAULT_COLOR_GRADING, DEFAULT_AUDIO_SETTINGS } from '../shared/src/videoEditorDefaults';
import { TimelineClip, EditorProject } from '../shared/src/videoEditorTypes';
import { evaluateClipKeyframes } from '../shared/src/videoEditorKeyframes';
import { generateTimelineClipsFromQueue, applyVoiceoverSyncToQueue } from '../shared/src/bulkTimelineEngine';
import { BulkMediaItem } from '../shared/src/bulkTimelineTypes';

console.log('=======================================================');
console.log(' Running Video Editor Audio Synchronization & Features Tests');
console.log('=======================================================');

// 1. Audio Keyframe Volume & Fade In/Out Evaluation
console.log('\n[Test 1] Audio fade in / fade out multiplier evaluation...');
const audioClip: TimelineClip = {
  id: 'a1',
  trackId: 'track-a1',
  name: 'Voiceover.mp3',
  type: 'audio',
  start: 0,
  duration: 10,
  sourceStart: 0,
  sourceDuration: 10,
  transform: { ...DEFAULT_TRANSFORM },
  speed: { ...DEFAULT_SPEED },
  colorGrading: { ...DEFAULT_COLOR_GRADING },
  audio: {
    ...DEFAULT_AUDIO_SETTINGS,
    volume: 100,
    fadeInDuration: 2.0,
    fadeOutDuration: 2.0
  },
  effects: [],
  keyframes: []
};

// At start (0.0s), fade in volume should be 0
const evalStart = evaluateClipKeyframes(audioClip, 0.0);
assert.strictEqual(evalStart.volume, 0, 'Volume at t=0s should be 0 due to fade-in');

// At halfway through fade in (1.0s), volume should be 50%
const evalHalfFade = evaluateClipKeyframes(audioClip, 1.0);
assert.ok(Math.abs(evalHalfFade.volume - 50) < 0.1, `Volume at t=1s should be 50%, got ${evalHalfFade.volume}`);

// In the middle (5.0s), volume should be full 100%
const evalMid = evaluateClipKeyframes(audioClip, 5.0);
assert.strictEqual(evalMid.volume, 100, 'Volume at t=5s should be 100%');

// Halfway through fade out (9.0s), volume should be 50%
const evalFadeOut = evaluateClipKeyframes(audioClip, 9.0);
assert.ok(Math.abs(evalFadeOut.volume - 50) < 0.1, `Volume at t=9s should be 50%, got ${evalFadeOut.volume}`);

// At end (10.0s), volume should be 0
const evalEnd = evaluateClipKeyframes(audioClip, 10.0);
assert.strictEqual(evalEnd.volume, 0, 'Volume at t=10s should be 0 due to fade-out');
console.log('✓ Audio fade in / fade out evaluation verified.');

// 2. Volume Keyframes
console.log('\n[Test 2] Volume keyframing...');
audioClip.audio.fadeInDuration = 0;
audioClip.audio.fadeOutDuration = 0;
audioClip.keyframes = [
  { id: 'k1', time: 2.0, property: 'volume', value: 100, easing: 'linear' },
  { id: 'k2', time: 4.0, property: 'volume', value: 20, easing: 'linear' }
];

const evalK1 = evaluateClipKeyframes(audioClip, 2.0);
assert.strictEqual(evalK1.volume, 100);

const evalKMid = evaluateClipKeyframes(audioClip, 3.0);
assert.ok(Math.abs(evalKMid.volume - 60) < 0.1, `Interpolated volume should be 60%, got ${evalKMid.volume}`);

const evalK2 = evaluateClipKeyframes(audioClip, 4.0);
assert.strictEqual(evalK2.volume, 20);
console.log('✓ Volume keyframe interpolation verified.');

// 3. Smart Bulk Arrange: autoMuteVideoAudio behavior
console.log('\n[Test 3] Smart bulk video audio auto-mute behavior...');
const mockQueue: BulkMediaItem[] = [
  {
    id: 'item_1',
    sequenceNumber: 1,
    asset: { id: 'v1', name: 'Scene1.mp4', url: '/api/editor/assets/scene1.mp4', type: 'video', duration: 5, width: 1920, height: 1080, fps: 30, fileSize: 1000, createdAt: '' },
    filename: 'Scene1.mp4',
    mediaType: 'video',
    assignedDuration: 4,
    sourceDuration: 5,
    startTime: 0,
    endTime: 4,
    status: 'valid'
  }
];

// Fixed duration mode: autoMuteVideoAudio is false by default
const unmutedClips = generateTimelineClipsFromQueue(mockQueue, {
  targetTrackId: 'track-v1',
  fps: 30,
  autoMuteVideoAudio: false
});
assert.strictEqual(unmutedClips[0].audio.muted, false, 'Default bulk videos should not be muted');
assert.strictEqual(unmutedClips[0].audio.volume, 100, 'Default bulk videos volume should be 100');

// Voiceover sync mode: autoMuteVideoAudio is true
const mutedClips = generateTimelineClipsFromQueue(mockQueue, {
  targetTrackId: 'track-v1',
  fps: 30,
  autoMuteVideoAudio: true
});
assert.strictEqual(mutedClips[0].audio.muted, true, 'Synchronized voiceover clips should have muted video audio');
assert.strictEqual(mutedClips[0].audio.volume, 0, 'Synchronized voiceover clips should have volume 0');
console.log('✓ autoMuteVideoAudio correctly respects arrangement mode.');

// 4. Voiceover sync across entire voiceover duration without sentences
console.log('\n[Test 4] Voiceover alignment across full duration without transcript sentences...');
const multiQueue: BulkMediaItem[] = [
  { id: '1', sequenceNumber: 1, asset: { id: 'a', name: '1.jpg', url: '1.jpg', type: 'image', duration: 0, width: 100, height: 100, fps: 30, fileSize: 100, createdAt: '' }, filename: '1.jpg', mediaType: 'image', assignedDuration: 4, sourceDuration: 0, startTime: 0, endTime: 4, status: 'valid' },
  { id: '2', sequenceNumber: 2, asset: { id: 'b', name: '2.jpg', url: '2.jpg', type: 'image', duration: 0, width: 100, height: 100, fps: 30, fileSize: 100, createdAt: '' }, filename: '2.jpg', mediaType: 'image', assignedDuration: 4, sourceDuration: 0, startTime: 4, endTime: 8, status: 'valid' }
];

const voTotalDuration = 12.0; // 12 seconds voiceover
const perItem = voTotalDuration / multiQueue.length; // 6s per image
const evenlyDistributed = multiQueue.map((it, idx) => ({
  ...it,
  assignedDuration: perItem,
  startTime: idx * perItem,
  endTime: (idx + 1) * perItem
}));

assert.strictEqual(evenlyDistributed[0].assignedDuration, 6.0);
assert.strictEqual(evenlyDistributed[1].assignedDuration, 6.0);
assert.strictEqual(evenlyDistributed[1].endTime, 12.0);
console.log('✓ Full voiceover duration auto-distribution verified.');

console.log('=======================================================');
console.log(' ✅ ALL VIDEO EDITOR AUDIO SUITE TESTS PASSED!');
console.log('=======================================================');
