import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { SpeechRecognitionService } from '../server/src/services/speechRecognitionService';

async function runSpeechRecognitionTests() {
  console.log('--- Running Speech Recognition Service Unit Tests ---');

  assert(typeof SpeechRecognitionService.transcribeAudio === 'function', 'transcribeAudio must be a function');

  // Test 1: Real audio transcription
  const samplePath = path.resolve('server/models/kokoro/cloned_test.mp3');
  assert(fs.existsSync(samplePath), `Sample audio must exist at ${samplePath}`);

  const realBuffer = await fs.promises.readFile(samplePath);
  const realRes = await SpeechRecognitionService.transcribeAudio(realBuffer, 'cloned_test.mp3');

  assert(typeof realRes.text === 'string' && realRes.text.length > 0, 'Transcription result text should be non-empty for real audio');
  assert(['local', 'groq', 'openai', 'fish_audio', 'huggingface'].includes(realRes.provider), `Valid provider returned: ${realRes.provider}`);
  assert(Array.isArray(realRes.segments) && realRes.segments.length > 0, 'Real audio must produce genuine segments');
  console.log(`✓ Genuine audio transcription verified (Provider: ${realRes.provider}, Text: "${realRes.text}")`);

  // Test 2: Honest handling of corrupted/silent buffer (must not invent fake text)
  const fakeAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....');
  const fakeRes = await SpeechRecognitionService.transcribeAudio(fakeAudioBuffer, 'test.wav', 'Spanish');
  assert(fakeRes.provider === 'fallback', 'Invalid audio should trigger fallback state');
  assert(fakeRes.error || fakeRes.text === '', 'Invalid audio should report error without fake speech');
  console.log(`✓ Corrupted audio resilience verified without fake placeholder speech`);

  console.log('--- All Speech Recognition Unit Tests Passed! ---');
}

runSpeechRecognitionTests().catch((err) => {
  console.error('Speech recognition test failed:', err);
  process.exit(1);
});
