import assert from 'assert';
import { FishAudioTTSParams } from '../server/src/services/fishAudioService.ts';

console.log('--- Running Fish Audio Service Interface Tests ---');

// Test 1: Request Payload Structure
const params: FishAudioTTSParams = {
  text: 'Welcome to VoiceForge Studio.',
  reference_id: '7f92f8afb8ec43bf81429cc1c9199cb1',
  format: 'mp3',
  model: 's2.1-pro-free',
  speechSpeed: 1.25,
  prosody: {
    speed: 1.25
  }
};

assert.strictEqual(params.text, 'Welcome to VoiceForge Studio.');
assert.strictEqual(params.reference_id, '7f92f8afb8ec43bf81429cc1c9199cb1');
assert.strictEqual(params.format, 'mp3');
assert.strictEqual(params.model, 's2.1-pro-free');
assert.strictEqual(params.speechSpeed, 1.25);
assert.strictEqual(params.prosody?.speed, 1.25);

console.log('✓ Fish Audio Request & Prosody Speed parameters validated');
console.log('--- All Fish Audio Interface Tests Passed! ---');
