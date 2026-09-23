import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { TranslationEngineService, SUPPORTED_LANGUAGES } from '../server/src/services/translationEngineService';
import { FFmpegHelper } from '../server/src/utils/ffmpegHelper';
import { VoiceTranslationStorageService } from '../server/src/services/voiceTranslationStorageService';
import { VoiceTranslationProject, TranslationOutput } from '../shared/src/types';

console.log('--- Running Voice Translator Studio Unit Tests ---');

async function runTests() {
  // Test 1: Supported Languages & Normalization
  console.log('Testing Supported Languages & Normalization...');
  assert.strictEqual(SUPPORTED_LANGUAGES.length, 13, 'Expected 13 supported languages');
  assert.strictEqual(TranslationEngineService.normalizeLangCode('English'), 'en');
  assert.strictEqual(TranslationEngineService.normalizeLangCode('Arabic'), 'ar');
  assert.strictEqual(TranslationEngineService.normalizeLangCode('Urdu'), 'ur');
  assert.strictEqual(TranslationEngineService.normalizeLangCode('Hindi'), 'hi');
  assert.strictEqual(TranslationEngineService.normalizeLangCode('Spanish'), 'es');
  assert.strictEqual(TranslationEngineService.getLanguageName('es'), 'Spanish');
  console.log('✓ Language normalization and mappings passed');

  // Test 2: Translation Engine Functionality
  console.log('Testing Translation Engine translate()...');
  const identical = await TranslationEngineService.translate('Hello world', 'en', 'en');
  assert.strictEqual(identical, 'Hello world', 'Source and target same should return unchanged text');

  const fallbackTr = await TranslationEngineService.translate('Welcome to my channel', 'en', 'es');
  assert.ok(fallbackTr && fallbackTr.length > 0, 'Translation should produce non-empty text');
  console.log(`✓ Translation engine produced: "${fallbackTr}"`);

  // Test 3: FFmpeg Detection
  console.log('Testing FFmpeg Binary Detection...');
  const ffmpegPath = await FFmpegHelper.getFfmpegPath();
  assert.ok(ffmpegPath && ffmpegPath.length > 0, 'FFmpeg binary path should be resolved');
  console.log(`✓ FFmpeg resolved path: ${ffmpegPath}`);

  // Test 4: Voice Translation Storage CRUD
  console.log('Testing Translation Project Storage Service...');
  VoiceTranslationStorageService.initStorage();

  const testProjId = `test_proj_${Date.now()}`;
  const testProject: VoiceTranslationProject = {
    id: testProjId,
    userId: 'test_user',
    projectName: 'Unit Test Dubbing Project',
    sourceFile: {
      filename: 'sample_unit_test.mp3',
      url: '/api/audio/file/sample_unit_test.mp3',
      originalName: 'sample_unit_test.mp3',
      sizeBytes: 1024
    },
    sourceFileType: 'audio',
    sourceLanguage: 'English',
    targetLanguages: ['Arabic', 'Urdu', 'Hindi'],
    voiceId: 'documentary_male',
    voiceName: 'Documentary Male',
    duration: 120,
    durationFormatted: '02:00',
    status: 'uploading',
    settings: {
      voiceSimilarity: 90,
      emotionMatching: 85,
      accentPreservation: 80,
      keepVoiceIdentity: true,
      keepEmotion: true,
      keepPauses: true,
      keepSpeakingStyle: true,
      keepGender: true
    },
    timingMode: 'same-duration',
    outputs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save project
  await VoiceTranslationStorageService.saveProject(testProject);
  let retrieved = await VoiceTranslationStorageService.getProjectById(testProjId);
  assert.ok(retrieved, 'Project should be saved and retrievable');
  assert.strictEqual(retrieved?.projectName, 'Unit Test Dubbing Project');

  // Update status
  await VoiceTranslationStorageService.updateProjectStatus(testProjId, 'completed');
  retrieved = await VoiceTranslationStorageService.getProjectById(testProjId);
  assert.strictEqual(retrieved?.status, 'completed', 'Project status should be updated to completed');

  // Add output
  const testOutput: TranslationOutput = {
    id: `out_${Date.now()}`,
    projectId: testProjId,
    language: 'Arabic',
    audioFile: '/api/audio/file/arabic.mp3',
    duration: 120,
    durationFormatted: '02:00',
    createdAt: new Date().toISOString()
  };
  await VoiceTranslationStorageService.addOutput(testProjId, testOutput);
  retrieved = await VoiceTranslationStorageService.getProjectById(testProjId);
  assert.strictEqual(retrieved?.outputs.length, 1, 'Should have 1 translation output');
  assert.strictEqual(retrieved?.outputs[0].language, 'Arabic');

  // Delete output
  await VoiceTranslationStorageService.deleteOutput(testProjId, testOutput.id);
  retrieved = await VoiceTranslationStorageService.getProjectById(testProjId);
  assert.strictEqual(retrieved?.outputs.length, 0, 'Output should be deleted');

  // Delete project
  const deleted = await VoiceTranslationStorageService.deleteProject(testProjId);
  assert.strictEqual(deleted, true, 'Project should be deleted');
  const checkDeleted = await VoiceTranslationStorageService.getProjectById(testProjId);
  assert.strictEqual(checkDeleted, null, 'Deleted project should no longer exist');

  console.log('✓ Voice Translation storage CRUD tests passed');
  console.log('--- All Voice Translator Studio Unit Tests Passed Successfully! ---');
}

runTests().catch((err) => {
  console.error('❌ Voice Translator unit tests failed:', err);
  process.exit(1);
});
