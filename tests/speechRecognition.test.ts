import assert from 'assert';
import { SpeechRecognitionService } from '../server/src/services/speechRecognitionService';

async function runSpeechRecognitionTests() {
  console.log('--- Running Speech Recognition Service Unit Tests ---');

  assert(typeof SpeechRecognitionService.transcribeAudio === 'function', 'transcribeAudio must be a function');

  // Test fallback resilience with simulated buffer
  const fakeAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....');
  const res = await SpeechRecognitionService.transcribeAudio(fakeAudioBuffer, 'test.wav', 'Spanish');

  assert(typeof res.text === 'string' && res.text.length > 0, 'Transcription result text should be non-empty');
  assert(['groq', 'openai', 'fish_audio', 'huggingface', 'fallback'].includes(res.provider), 'Valid provider returned');

  console.log(`✓ SpeechRecognitionService fallback and interface verified (Provider: ${res.provider})`);
  console.log('--- All Speech Recognition Unit Tests Passed! ---');
}

runSpeechRecognitionTests().catch((err) => {
  console.error('Speech recognition test failed:', err);
  process.exit(1);
});
