import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { SentenceDubbingService } from '../server/src/services/sentenceDubbingService';
import { FFmpegHelper } from '../server/src/utils/ffmpegHelper';

console.log('--- Running Sentence-Level AI Dubbing Service Unit Tests ---');

async function runTests() {
  // Test 1: splitIntoSegments()
  console.log('Testing splitIntoSegments()...');
  const sampleScript = 'Welcome to my channel. In this video, we explore AI voice dubbing! It works sentence by sentence.';
  const segments = SentenceDubbingService.splitIntoSegments(sampleScript, [], 12.0);

  assert.ok(segments.length >= 3, `Expected at least 3 sentences, got ${segments.length}`);
  assert.strictEqual(segments[0].id, 1);
  assert.strictEqual(segments[0].original_text, 'Welcome to my channel.');
  assert.ok(typeof segments[0].start_time === 'number', 'start_time must be number');
  assert.ok(typeof segments[0].end_time === 'number', 'end_time must be number');
  assert.ok(typeof segments[0].duration === 'number', 'duration must be number');
  assert.ok(segments[0].duration > 0, 'duration must be positive');

  console.log(`✓ Split transcript into ${segments.length} sentence segments:`);
  segments.forEach((s) => {
    console.log(`  [Segment ${s.id}] (${s.start_time}s - ${s.end_time}s, dur: ${s.duration}s): "${s.original_text}"`);
  });

  // Test 1b: ASR Segments with Timestamps
  console.log('Testing splitIntoSegments() with ASR timestamp inputs...');
  const asrRaw = [
    { start: 0.0, end: 2.2, text: 'Hello everyone.' },
    { start: 2.5, end: 6.0, text: 'Welcome to the presentation.' }
  ];
  const asrSegments = SentenceDubbingService.splitIntoSegments('', asrRaw, 6.0);
  assert.strictEqual(asrSegments.length, 2);
  assert.strictEqual(asrSegments[0].start_time, 0.0);
  assert.strictEqual(asrSegments[0].original_text, 'Hello everyone.');
  assert.strictEqual(asrSegments[1].start_time, 2.5);
  assert.strictEqual(asrSegments[1].original_text, 'Welcome to the presentation.');
  console.log('✓ ASR timestamp parsing and segment isolation verified');

  // Test 2: translateSegment()
  console.log('Testing translateSegment()...');
  const testSeg = { ...segments[0] };
  const translated = await SentenceDubbingService.translateSegment(testSeg, 'English', 'Spanish');
  assert.ok(translated && translated.length > 0, 'Translated text should not be empty');
  assert.strictEqual(testSeg.translated_text, translated);
  console.log(`✓ Translated sentence: "${translated}"`);

  // Test 3: adjustSegmentDuration() with FFmpeg atempo
  console.log('Testing adjustSegmentDuration() with atempo speed adjustment...');
  const tempDir = path.resolve(process.cwd(), 'temp_storage');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tonePath = path.join(tempDir, `test_tone_${Date.now()}.mp3`);
  const adjustedPath = path.join(tempDir, `test_adjusted_${Date.now()}.mp3`);

  // Generate 6.5s audio
  await FFmpegHelper.generateToneAudio(tonePath, 6.5);
  const toneDur = await FFmpegHelper.getMediaDuration(tonePath);
  console.log(`  Initial duration: ${toneDur.toFixed(2)}s`);

  // Adjust to 5.0s (Target: match 5 seconds)
  await SentenceDubbingService.adjustSegmentDuration(tonePath, adjustedPath, 5.0);
  const adjustedDur = await FFmpegHelper.getMediaDuration(adjustedPath);
  console.log(`  Adjusted duration: ${adjustedDur.toFixed(2)}s (Target: 5.00s)`);
  assert.ok(Math.abs(adjustedDur - 5.0) < 0.1, `Expected ~5.0s, got ${adjustedDur}`);
  console.log('✓ FFmpeg atempo duration matching verified');

  // Test 4: mergeSegments()
  console.log('Testing mergeSegments()...');
  const seg1 = path.join(tempDir, `merge_seg1_${Date.now()}.mp3`);
  const seg2 = path.join(tempDir, `merge_seg2_${Date.now()}.mp3`);
  const mergedPath = path.join(tempDir, `merged_master_${Date.now()}.mp3`);

  await FFmpegHelper.generateToneAudio(seg1, 2.0);
  await FFmpegHelper.generateToneAudio(seg2, 3.0);

  await SentenceDubbingService.mergeSegments([seg1, seg2], mergedPath);
  const mergedDur = await FFmpegHelper.getMediaDuration(mergedPath);
  console.log(`  Merged audio duration: ${mergedDur.toFixed(2)}s (Expected ~5.0s)`);
  assert.ok(Math.abs(mergedDur - 5.0) < 0.25, `Expected ~5.0s, got ${mergedDur}`);
  console.log('✓ Sentence segments merging verified');

  // Test 5: Simulation with 5-minute and 30-minute videos
  console.log('Testing 5-minute and 30-minute video segmentation scaling...');
  const long5MinSentences = Array(50).fill('This is a professional YouTube documentary sentence.').join(' ');
  const segments5Min = SentenceDubbingService.splitIntoSegments(long5MinSentences, [], 300.0);
  assert.strictEqual(segments5Min.length, 50, '5-minute video should divide into 50 segments');
  assert.strictEqual(segments5Min[49].id, 50);
  console.log(`✓ 5-minute video (300s): successfully divided into ${segments5Min.length} sentence segments`);

  const long30MinSentences = Array(300).fill('Exploring historical events and scientific discoveries in depth.').join(' ');
  const segments30Min = SentenceDubbingService.splitIntoSegments(long30MinSentences, [], 1800.0);
  assert.strictEqual(segments30Min.length, 300, '30-minute video should divide into 300 segments');
  assert.strictEqual(segments30Min[299].id, 300);
  console.log(`✓ 30-minute video (1800s): successfully divided into ${segments30Min.length} sentence segments without memory strain`);

  // Cleanup test files
  [tonePath, adjustedPath, seg1, seg2, mergedPath].forEach((p) => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  console.log('--- All Sentence-Level AI Dubbing Unit Tests Passed Successfully! ---');
}

runTests().catch((err) => {
  console.error('❌ Sentence dubbing unit tests failed:', err);
  process.exit(1);
});
