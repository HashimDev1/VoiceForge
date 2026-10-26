import assert from 'assert';
import { OpenSourceTtsService, OPEN_SOURCE_VOICES, KOKORO_VOICES, EDGE_VOICES } from '../server/src/services/openSourceTtsService';

async function runTests() {
  console.log('\n--- Testing OpenSourceTtsService (Kokoro-82M & Edge-TTS Neural) ---');

  // Test 1: Open-source voice catalog validation
  console.log('1. Checking open source voices list...');
  assert(Array.isArray(OPEN_SOURCE_VOICES), 'OPEN_SOURCE_VOICES must be an array');
  assert(OPEN_SOURCE_VOICES.length >= 25, `Expected at least 25 open source voices, got ${OPEN_SOURCE_VOICES.length}`);

  // Validate Kokoro Voices
  const heart = OPEN_SOURCE_VOICES.find((v) => v.id === 'kokoro_af_heart');
  assert(heart, 'Kokoro Heart voice must exist');
  assert.strictEqual(heart?.provider, 'open-source-tts');
  assert.strictEqual(heart?.isFree, true);
  console.log(`   Found Kokoro: ${heart?.name} (category: ${heart?.category})`);

  const adam = OPEN_SOURCE_VOICES.find((v) => v.id === 'kokoro_am_adam');
  assert(adam, 'Kokoro Adam voice must exist');
  assert.strictEqual(adam?.category, 'Documentary');
  console.log(`   Found Kokoro: ${adam?.name}`);

  // Validate Edge-TTS Voices
  const christopher = OPEN_SOURCE_VOICES.find((v) => v.id.includes('ChristopherNeural'));
  assert(christopher, 'Christopher Neural voice must exist');
  assert.strictEqual(christopher?.provider, 'open-source-tts');
  assert.strictEqual(christopher?.isFree, true);
  console.log(`   Found Edge: ${christopher?.name}`);

  // Test 2: Voice detection & normalization
  console.log('2. Checking voice detection and normalization...');
  assert.strictEqual(OpenSourceTtsService.isOpenSourceVoice('kokoro_af_heart'), true);
  assert.strictEqual(OpenSourceTtsService.isOpenSourceVoice('kokoro_am_adam'), true);
  assert.strictEqual(OpenSourceTtsService.isKokoroVoice('kokoro_af_heart'), true);
  assert.strictEqual(OpenSourceTtsService.isKokoroVoice('edge_en-US-ChristopherNeural'), false);
  assert.strictEqual(OpenSourceTtsService.isOpenSourceVoice('edge_en-US-ChristopherNeural'), true);
  assert.strictEqual(OpenSourceTtsService.isOpenSourceVoice('7f92f8afb8ec43bf81429cc1c9199cb1'), false);

  assert.strictEqual(
    OpenSourceTtsService.normalizeKokoroVoiceName('kokoro_af_heart'),
    'af_heart'
  );
  assert.strictEqual(
    OpenSourceTtsService.normalizeVoiceName('edge_en-US-ChristopherNeural'),
    'en-US-ChristopherNeural'
  );
  assert.strictEqual(
    OpenSourceTtsService.formatRate(1.2),
    '+20%'
  );

  // Test 3: Actual synthesis via Kokoro-82M Studio AI worker
  console.log('3. Synthesizing audio via Kokoro-82M Studio AI...');
  const kokoroRes = await OpenSourceTtsService.generateTTS({
    text: 'VoiceForge Studio is powered by Kokoro 82M studio quality neural model.',
    voiceId: 'kokoro_af_heart',
    speechSpeed: 1.0,
    format: 'mp3'
  });

  assert(kokoroRes.audioBuffer && kokoroRes.audioBuffer.length > 500, 'Kokoro audioBuffer must be greater than 500 bytes');
  assert(kokoroRes.duration > 0, 'Kokoro duration must be positive');
  assert.strictEqual(kokoroRes.engine, 'kokoro');
  console.log(`   Kokoro audio: ${kokoroRes.sizeBytes} bytes, duration: ${kokoroRes.duration.toFixed(2)}s`);

  // Test 4: Actual synthesis via Edge-TTS worker
  console.log('4. Synthesizing audio via Edge-TTS...');
  const edgeRes = await OpenSourceTtsService.generateTTS({
    text: 'VoiceForge Studio is generating YouTube voiceovers with zero cost.',
    voiceId: 'edge_en-US-ChristopherNeural',
    speechSpeed: 1.05
  });

  assert(edgeRes.audioBuffer && edgeRes.audioBuffer.length > 500, 'Edge audioBuffer must be greater than 500 bytes');
  assert(edgeRes.duration > 0, 'Edge duration must be positive');
  assert.strictEqual(edgeRes.engine, 'edge-tts');
  console.log(`   Edge audio: ${edgeRes.sizeBytes} bytes, duration: ${edgeRes.duration.toFixed(2)}s`);

  // Test 5: Health & connection test
  console.log('5. Running testConnection...');
  const healthTest = await OpenSourceTtsService.testConnection();
  assert.strictEqual(healthTest.success, true);
  console.log(`   Health check message: ${healthTest.message}`);
  console.log(`   Engine models: ${healthTest.model}`);

  console.log('✅ OpenSourceTtsService (Kokoro + Edge-TTS) tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ OpenSourceTtsService test failed:', err);
  process.exit(1);
});
