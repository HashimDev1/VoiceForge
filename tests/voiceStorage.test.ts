import assert from 'assert';
import { VoiceStorageService } from '../server/src/services/voiceStorageService';
import { Voice } from '../shared/src/types';

async function runVoiceStorageTests() {
  console.log('--- Running Server-Side Voice Storage Unit Tests ---');

  const testVoiceId = `test_voice_${Date.now()}`;
  const testVoice: Voice = {
    id: testVoiceId,
    name: 'Test Narrative Voice',
    language: 'English',
    style: 'Deep / Cinematic',
    gender: 'Male',
    description: 'A test custom voice model for unit testing.',
    category: 'Documentary',
    isCustom: true
  };

  // 1. Save voice
  const savedList = await VoiceStorageService.saveCustomVoice(testVoice);
  const found = savedList.find((v) => v.id === testVoiceId);
  assert(found, 'Saved voice should exist in returned voice list');
  assert.strictEqual(found.name, 'Test Narrative Voice', 'Saved voice should have correct name');
  assert.strictEqual(found.isCustom, true, 'Saved voice should be marked as custom');
  console.log('✓ Custom Voice save and persistence verified');

  // 2. Retrieve voice
  const retrievedList = await VoiceStorageService.getCustomVoices();
  const retrievedVoice = retrievedList.find((v) => v.id === testVoiceId);
  assert(retrievedVoice, 'Retrieved custom voice should exist in data file');
  assert.strictEqual(retrievedVoice.name, 'Test Narrative Voice');
  console.log('✓ Custom Voice retrieval from server data file verified');

  // 3. Update existing voice
  const updatedVoice: Voice = {
    ...testVoice,
    name: 'Updated Test Voice Name'
  };
  const afterUpdate = await VoiceStorageService.saveCustomVoice(updatedVoice);
  const foundUpdated = afterUpdate.find((v) => v.id === testVoiceId);
  assert(foundUpdated, 'Updated voice should exist');
  assert.strictEqual(foundUpdated.name, 'Updated Test Voice Name', 'Voice name should be updated');
  console.log('✓ Custom Voice update in place verified');

  // 4. Delete voice
  const afterDelete = await VoiceStorageService.deleteCustomVoice(testVoiceId);
  const deletedCheck = afterDelete.find((v) => v.id === testVoiceId);
  assert.strictEqual(deletedCheck, undefined, 'Deleted voice should not exist in returned list');

  const verifyEmpty = await VoiceStorageService.getCustomVoices();
  assert(!verifyEmpty.some((v) => v.id === testVoiceId), 'Deleted voice should not exist in storage');
  console.log('✓ Custom Voice deletion from server verified');

  console.log('--- All Voice Storage Unit Tests Passed! ---');
}

runVoiceStorageTests().catch((err) => {
  console.error('Voice storage tests failed:', err);
  process.exit(1);
});
