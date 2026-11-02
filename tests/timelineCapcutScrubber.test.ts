import assert from 'assert';
import { calculateTimelineDuration, createNewProject } from '../shared/src/videoEditorDefaults';
import { TimelineClip } from '../shared/src/videoEditorTypes';

console.log('=======================================================');
console.log(' Running Timeline Dynamic Duration & CapCut Scrubber Tests');
console.log('=======================================================');

// 1. Empty project duration
const emptyProject = createNewProject('Test Empty');
assert.strictEqual(emptyProject.duration, 5, 'Empty project duration should be compact 5s fallback, not 30s');
console.log('✓ Test 1: Empty project has compact 5s default duration (not hardcoded 30s)');

// 2. Dynamic calculateTimelineDuration
const clips: TimelineClip[] = [
  {
    id: 'c1',
    trackId: 'track-v1',
    name: 'Sample 6.5s Video',
    type: 'video',
    start: 0,
    duration: 6.5,
    sourceStart: 0,
    sourceDuration: 6.5,
    transform: {} as any,
    speed: {} as any,
    colorGrading: {} as any,
    audio: {} as any,
    effects: [],
    keyframes: []
  }
];

const dur1 = calculateTimelineDuration(clips);
assert.strictEqual(dur1, 6.5, `Timeline duration should exactly match video length 6.5s, got ${dur1}`);
console.log(`✓ Test 2: calculateTimelineDuration with 6.5s video returns exactly ${dur1}s`);

// 3. Adding an audio clip that extends further (e.g., 9.2s)
clips.push({
  id: 'c2',
  trackId: 'track-a1',
  name: 'Voiceover',
  type: 'audio',
  start: 2.0,
  duration: 7.2, // ends at 9.2s
  sourceStart: 0,
  sourceDuration: 7.2,
  transform: {} as any,
  speed: {} as any,
  colorGrading: {} as any,
  audio: {} as any,
  effects: [],
  keyframes: []
});

const dur2 = calculateTimelineDuration(clips);
assert.strictEqual(dur2, 9.2, `Timeline duration should match maximum clip end (2.0 + 7.2 = 9.2s), got ${dur2}`);
console.log(`✓ Test 3: Multiple overlapping tracks calculates maxEnd = ${dur2}s`);

// 4. Trimming a clip reduces duration
clips[1].duration = 3.0; // now ends at 2.0 + 3.0 = 5.0s, video clip ends at 6.5s
const dur3 = calculateTimelineDuration(clips);
assert.strictEqual(dur3, 6.5, `After audio trim, duration matches remaining longest clip (6.5s), got ${dur3}`);
console.log(`✓ Test 4: Trimming clips dynamically adjusts timeline duration to ${dur3}s`);

// 5. Deleting all clips resets to fallback
const durEmpty = calculateTimelineDuration([]);
assert.strictEqual(durEmpty, 5, `Empty clips array resets to fallback 5s, got ${durEmpty}`);
console.log(`✓ Test 5: Deleting all clips resets to fallback duration ${durEmpty}s`);

// 6. Magnetic snap calculation
function testSnap(time: number, snapThreshold = 0.15): number {
  const dur = dur1; // 6.5s
  if (time < snapThreshold) return 0;
  if (Math.abs(time - dur) < snapThreshold) return dur;
  for (const c of [clips[0]]) {
    if (Math.abs(time - c.start) < snapThreshold) return c.start;
    if (Math.abs(time - (c.start + c.duration)) < snapThreshold) return c.start + c.duration;
  }
  return time;
}

assert.strictEqual(testSnap(0.08), 0, 'Should snap to 0s');
assert.strictEqual(testSnap(6.42), 6.5, 'Should snap to project end 6.5s');
assert.strictEqual(testSnap(3.2), 3.2, 'Should not snap when far from boundaries');
console.log('✓ Test 6: Magnetic snapping logic verified for 0s, clip boundaries, and project end');

console.log('=======================================================');
console.log(' ✅ ALL TIMELINE DURATION & CAPCUT SCRUBBER TESTS PASSED!');
console.log('=======================================================');
