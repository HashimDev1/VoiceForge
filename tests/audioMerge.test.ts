import assert from 'assert';
import { AudioMergeService } from '../server/src/services/audioMergeService.ts';
import { sanitizeFilename, isPathSafe } from '../server/src/utils/sanitize.ts';

console.log('--- Running Audio Merge & Security Unit Tests ---');

// Test 1: Silence buffer creation
const silenceBuffer = AudioMergeService.createMp3SilenceBuffer(0.5);
assert.ok(silenceBuffer.length > 0, 'Silence buffer should have positive byte size');
assert.strictEqual(silenceBuffer[0], 0xff, 'Should contain MP3 frame sync header byte 0xFF');
assert.strictEqual(silenceBuffer[1], 0xfb, 'Should contain MP3 frame sync header byte 0xFB');

console.log(`✓ Created 0.5s MP3 silence buffer of ${silenceBuffer.length} bytes`);

// Test 2: MP3 Buffers Concatenation
const dummyBuffer1 = Buffer.from('MP3_CLIP_1_DATA');
const dummyBuffer2 = Buffer.from('MP3_CLIP_2_DATA');

AudioMergeService.mergeMp3Buffers([dummyBuffer1, dummyBuffer2], 0.25).then((merged) => {
  assert.ok(merged.length > dummyBuffer1.length + dummyBuffer2.length);
  console.log(`✓ Merged 2 MP3 clips into ${merged.length} bytes buffer`);
});

// Test 3: Filename Sanitization & Path Traversal Protection
const unsafeName = '../../etc/passwd/My Document!! (2026)#.mp3';
const clean = sanitizeFilename(unsafeName);
assert.strictEqual(clean, '_etc_passwd_my_document_2026_mp3');

const isSafe = isPathSafe('/var/storage', '/var/storage/../../etc/passwd');
assert.strictEqual(isSafe, false, 'Path traversal should be rejected');

console.log('✓ Path sanitization & security tests passed');
console.log('--- All Audio Merge Unit Tests Passed! ---');
