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
  execSync(`${tsNodeCmd} tests/multiTake.test.ts`, { stdio: 'inherit' });
  execSync(`${tsNodeCmd} tests/voiceStorage.test.ts`, { stdio: 'inherit' });
  console.log('\n✅ ALL UNIT TESTS PASSED SUCCESSFULLY!');
} catch (err) {
  console.error('\n❌ TEST RUNNER FAILED:', err.message);
  process.exit(1);
}
