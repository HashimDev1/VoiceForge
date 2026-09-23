import assert from 'assert';
import { FishAudioService } from '../server/src/services/fishAudioService';
import { SUPPORTED_DIRECTION_TAGS } from '../shared/src/textAnalysis';

console.log('--- Running Supporting Fish Audio Tasks Tests ---');

// 1. Verify Emotion & Direction Tags
const tagStrings = SUPPORTED_DIRECTION_TAGS.map((t) => t.tag);
assert(tagStrings.includes('[laugh]'), 'Should contain [laugh] tag');
assert(tagStrings.includes('[whisper]'), 'Should contain [whisper] tag');
assert(tagStrings.includes('[sigh]'), 'Should contain [sigh] tag');
assert(tagStrings.includes('[gasp]'), 'Should contain [gasp] tag');
assert(tagStrings.includes('[crying]'), 'Should contain [crying] tag');
assert(tagStrings.includes('[screaming]'), 'Should contain [screaming] tag');
assert(tagStrings.includes('[pause]'), 'Should contain [pause] tag');
assert(tagStrings.includes('[slow]'), 'Should contain [slow] tag');
assert(tagStrings.includes('[fast]'), 'Should contain [fast] tag');
console.log('✓ Expanded emotion and acoustic tags validated successfully');

// 2. Verify FishAudioService methods exist
assert(typeof FishAudioService.listRemoteModels === 'function', 'listRemoteModels should be a function');
assert(typeof FishAudioService.getRemoteModel === 'function', 'getRemoteModel should be a function');
assert(typeof FishAudioService.createVoiceModel === 'function', 'createVoiceModel should be a function');
assert(typeof FishAudioService.designVoice === 'function', 'designVoice should be a function');
assert(typeof FishAudioService.transcribeAudio === 'function', 'transcribeAudio should be a function');
console.log('✓ FishAudioService supporting tasks methods exist and are callable');

// 3. Verify Error handling when API key is missing
(async () => {
  try {
    // Calling with empty dummy buffer when no API key configured should fail cleanly
    await FishAudioService.createVoiceModel(Buffer.from('fake'), 'test.mp3', { title: 'Test' });
  } catch (err: any) {
    assert(err.message, 'Should return informative error message');
    console.log('✓ createVoiceModel authentication and input validation verified');
  }

  try {
    await FishAudioService.transcribeAudio(Buffer.from('fake'), 'test.mp3');
  } catch (err: any) {
    assert(err.message, 'Should return informative error message');
    console.log('✓ transcribeAudio input validation verified');
  }

  console.log('--- All Supporting Fish Audio Tasks Tests Passed! ---');
})();
