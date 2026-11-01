const { execSync } = require('child_process');
const path = require('path');

console.log('=======================================================');
console.log(' Running VoiceForge Studio Unit Test Suite');
console.log('=======================================================');

const tsNodeCmd = `node -r ts-node/register`;

try {
  execSync(`${tsNodeCmd} tests/chunking.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/audioMerge.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/fishAudioService.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/fishAudioTasks.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/multiTake.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/voiceStorage.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/voiceTranslation.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/sentenceDubbing.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/speechRecognition.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/transcriptionStudio.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/referenceAlignment.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/openSourceTts.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/flowStudio.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/captionStudio2.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/captionSpacingAndTheme.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/videoEditor.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/motionGraphics.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/documentaryWorkflow.test.ts`, { stdio: 'inherit' });
  console.log('\n✅ ALL UNIT TESTS PASSED SUCCESSFULLY!');
} catch (err) {
  console.error('\n❌ TEST RUNNER FAILED:', err.message);
  process.exit(1);
}
