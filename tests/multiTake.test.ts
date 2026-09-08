import assert from 'assert';
import { ScriptChunk, AudioTake } from '../shared/src/types';

console.log('--- Running Multi-Take Unit Tests ---');

// Test 1: ScriptChunk with 2 takes
const take1: AudioTake = {
  id: 'take_1',
  label: 'Take 1',
  audioUrl: '/api/audio/file/take1_123.mp3',
  createdAt: new Date().toISOString()
};

const take2: AudioTake = {
  id: 'take_2',
  label: 'Take 2',
  audioUrl: '/api/audio/file/take2_456.mp3',
  createdAt: new Date().toISOString()
};

const chunk: ScriptChunk = {
  id: 'chunk_1',
  index: 1,
  chapterIndex: 1,
  chapterTitle: 'Introduction',
  text: 'This is the opening scene.',
  wordCount: 5,
  characterCount: 26,
  estimatedDurationSec: 2,
  status: 'success',
  audioUrl: take1.audioUrl,
  takes: [take1, take2],
  activeTakeId: take1.id
};

assert.strictEqual(chunk.takes?.length, 2);
assert.strictEqual(chunk.activeTakeId, 'take_1');
assert.strictEqual(chunk.audioUrl, '/api/audio/file/take1_123.mp3');

// Test 2: Selecting Take 2 switches active audioUrl
const selectedTake = chunk.takes?.find((t) => t.id === 'take_2');
assert(selectedTake !== undefined);
chunk.activeTakeId = selectedTake.id;
chunk.audioUrl = selectedTake.audioUrl;

assert.strictEqual(chunk.activeTakeId, 'take_2');
assert.strictEqual(chunk.audioUrl, '/api/audio/file/take2_456.mp3');

// Test 3: Adding a 3rd take on-demand
const take3: AudioTake = {
  id: 'take_3',
  label: 'Take 3',
  audioUrl: '/api/audio/file/take3_789.mp3',
  createdAt: new Date().toISOString()
};

chunk.takes.push(take3);
assert.strictEqual(chunk.takes.length, 3);
assert.strictEqual(chunk.takes[2].label, 'Take 3');

console.log('✓ Multi-take data model and take switching validated');
console.log('--- All Multi-Take Unit Tests Passed! ---');
