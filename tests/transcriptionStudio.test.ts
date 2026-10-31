import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { SpeechRecognitionService } from '../server/src/services/speechRecognitionService';
import { ScriptConversionService } from '../server/src/services/scriptConversionService';
import { TranscriptExportHelper } from '../server/src/utils/transcriptExportHelper';
import { TranscriptionStorageService } from '../server/src/services/transcriptionStorageService';
import { TranscriptionSegment, TranscriptionProject } from '../shared/src/types';

console.log('=======================================================');
console.log(' Running Voiceover Transcription Studio Unit Tests');
console.log('=======================================================');

async function runTests() {
  // ----------------------------------------------------
  // TEST 1: Automatic Language Detection on Real Audio
  // ----------------------------------------------------
  console.log('\n[Test 1] Testing Automatic Language Detection...');

  const hindiSamplePath = path.resolve('server/temp_storage/test_hindi.mp3');
  assert(fs.existsSync(hindiSamplePath), `Test audio sample must exist at ${hindiSamplePath}`);

  const hindiBuffer = await fs.promises.readFile(hindiSamplePath);
  const hindiResult = await SpeechRecognitionService.transcribeAudio(hindiBuffer, 'test_hindi.mp3');

  assert.strictEqual(hindiResult.language_code, 'hi', `Expected detected language code 'hi', got '${hindiResult.language_code}'`);
  assert.strictEqual(hindiResult.language, 'Hindi', `Expected language name 'Hindi', got '${hindiResult.language}'`);
  assert(typeof hindiResult.language_probability === 'number' && hindiResult.language_probability > 0.8,
    `Expected confidence score > 0.8, got ${hindiResult.language_probability}`);
  assert.strictEqual(hindiResult.is_ambiguous_hindi_urdu, true, 'Hindustani speech should be flagged for user ambiguity confirmation');
  console.log(`✓ Hindi audio detected automatically: ${hindiResult.language} (${(hindiResult.language_probability! * 100).toFixed(1)}% confidence, Ambiguous: ${hindiResult.is_ambiguous_hindi_urdu})`);

  // Test English audio sample
  const englishSamplePath = path.resolve('server/models/kokoro/cloned_test.mp3');
  assert(fs.existsSync(englishSamplePath), `Test audio sample must exist at ${englishSamplePath}`);

  const engBuffer = await fs.promises.readFile(englishSamplePath);
  const engResult = await SpeechRecognitionService.transcribeAudio(engBuffer, 'cloned_test.mp3');

  assert.strictEqual(engResult.language_code, 'en', `Expected 'en', got '${engResult.language_code}'`);
  assert.strictEqual(engResult.language, 'English', `Expected 'English', got '${engResult.language}'`);
  assert.strictEqual(engResult.is_ambiguous_hindi_urdu, false, 'English audio should not be flagged as Hindi/Urdu ambiguous');
  console.log(`✓ English audio detected automatically: ${engResult.language} (${(engResult.language_probability! * 100).toFixed(1)}% confidence)`);

  // ----------------------------------------------------
  // TEST 2: Hindi & Urdu Script Selection & Transliteration
  // ----------------------------------------------------
  console.log('\n[Test 2] Testing Hindi/Urdu Script Transliteration...');

  const sampleHindiDevaSegments: TranscriptionSegment[] = [
    {
      id: 'seg_1',
      start: 0.0,
      end: 2.5,
      text: 'नमस्ते, आप कैसे हैं?',
      words: [
        { word: 'नमस्ते', start: 0.0, end: 0.8 },
        { word: 'आप', start: 0.9, end: 1.2 },
        { word: 'कैसे', start: 1.3, end: 1.8 },
        { word: 'हैं', start: 1.9, end: 2.5 }
      ]
    },
    {
      id: 'seg_2',
      start: 2.5,
      end: 4.8,
      text: 'मैं ठीक हूँ और काम कर रहा हूँ।',
      words: []
    }
  ];

  // Convert Devanagari to Urdu Roman
  const romanOutput = ScriptConversionService.convertTranscriptSegments(
    sampleHindiDevaSegments,
    'urdu_roman',
    'hi'
  );

  assert.strictEqual(romanOutput.length, 2, 'Segment count must be preserved');
  assert(romanOutput[0].text.includes('kaise') || romanOutput[0].text.includes('Namaste'),
    `Expected Roman Urdu text, got: "${romanOutput[0].text}"`);
  assert.strictEqual(romanOutput[0].start, 0.0, 'Start timestamp must remain unchanged');
  assert.strictEqual(romanOutput[0].end, 2.5, 'End timestamp must remain unchanged');
  console.log(`✓ Devanagari -> Urdu Roman conversion: "${romanOutput[0].text}" (Timestamps preserved: ${romanOutput[0].start}s - ${romanOutput[0].end}s)`);

  // Convert Perso-Arabic Urdu to Roman Urdu
  const sampleUrduArabicSegments: TranscriptionSegment[] = [
    {
      id: 'seg_u1',
      start: 1.0,
      end: 3.2,
      text: 'آپ کیسے ہیں؟ میں خیریت سے ہوں۔'
    }
  ];

  const urduRomanOutput = ScriptConversionService.convertTranscriptSegments(
    sampleUrduArabicSegments,
    'urdu_roman',
    'ur'
  );
  assert(urduRomanOutput[0].text.toLowerCase().includes('aap') || urduRomanOutput[0].text.toLowerCase().includes('kaise'),
    `Expected Roman Urdu, got: "${urduRomanOutput[0].text}"`);
  console.log(`✓ Perso-Arabic -> Urdu Roman conversion: "${urduRomanOutput[0].text}"`);

  // Convert Perso-Arabic Urdu to Devanagari (Hindi script)
  const devaOutput = ScriptConversionService.convertTranscriptSegments(
    sampleUrduArabicSegments,
    'hindi_devanagari',
    'ur'
  );
  assert(/[\u0900-\u097F]/.test(devaOutput[0].text), `Expected Devanagari script output, got: "${devaOutput[0].text}"`);
  console.log(`✓ Perso-Arabic -> Hindi Devanagari conversion: "${devaOutput[0].text}"`);

  // ----------------------------------------------------
  // TEST 3: Non-Hindi/Urdu Isolation
  // ----------------------------------------------------
  console.log('\n[Test 3] Testing Non-Hindi/Urdu Script Isolation...');

  const englishSegments: TranscriptionSegment[] = [
    { id: 'seg_e1', start: 0.0, end: 1.94, text: 'Testing character voice clone synthesis.' }
  ];

  const isolatedResult = ScriptConversionService.convertTranscriptSegments(
    englishSegments,
    'urdu_roman',
    'en' // Language is English
  );
  assert.strictEqual(isolatedResult[0].text, 'Testing character voice clone synthesis.',
    'Script choice must NOT alter non-Hindi/Urdu languages');
  console.log('✓ Script choices correctly ignored for non-Hindi/Urdu speech');

  // ----------------------------------------------------
  // TEST 4: Timestamp Validation & Chronological Integrity
  // ----------------------------------------------------
  console.log('\n[Test 4] Testing Segment & Word Timestamp Integrity...');

  assert(Array.isArray(hindiResult.segments) && hindiResult.segments.length > 0, 'Hindi result must have segments');
  const segs = hindiResult.segments;

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    assert(s.start >= 0, `Segment start (${s.start}) must be non-negative`);
    assert(s.end >= s.start, `Segment end (${s.end}) must be >= start (${s.start})`);

    if (i > 0) {
      assert(s.start >= segs[i - 1].start, `Segment timestamps must be chronological: ${s.start} >= ${segs[i - 1].start}`);
    }

    if (s.words && s.words.length > 0) {
      for (const w of s.words) {
        assert(w.start >= 0, `Word start (${w.start}) must be non-negative`);
        assert(w.end >= w.start, `Word end (${w.end}) must be >= start (${w.start})`);
      }
    }
  }
  console.log(`✓ Verified ${segs.length} segment(s) and word alignments with genuine microsecond timestamps`);

  // ----------------------------------------------------
  // TEST 5: SRT, VTT, TXT, JSON Export Formats
  // ----------------------------------------------------
  console.log('\n[Test 5] Testing SRT, VTT, TXT, JSON Exports...');

  const testSegments: TranscriptionSegment[] = [
    { id: 'seg_1', start: 2.4, end: 5.1, text: 'First spoken subtitle line.' },
    { id: 'seg_2', start: 5.5, end: 8.92, text: 'Second spoken subtitle line.' }
  ];

  // TXT Export
  const txt = TranscriptExportHelper.toTxt(testSegments, 'Sample Project');
  assert(txt.includes('[00:00:02.400 – 00:00:05.100] First spoken subtitle line.'), `Invalid TXT format: \n${txt}`);
  console.log('✓ TXT export format validated: [HH:MM:SS.mmm – HH:MM:SS.mmm] format');

  // SRT Export (must use comma separator)
  const srt = TranscriptExportHelper.toSrt(testSegments);
  assert(srt.includes('1\n00:00:02,400 --> 00:00:05,100\nFirst spoken subtitle line.'), `Invalid SRT format: \n${srt}`);
  assert(srt.includes('2\n00:00:05,500 --> 00:00:08,920\nSecond spoken subtitle line.'), `Invalid SRT block 2: \n${srt}`);
  console.log('✓ SRT export format validated: Valid comma millisecond timestamps & block numbering');

  // VTT Export (must start with WEBVTT and use period separator)
  const vtt = TranscriptExportHelper.toVtt(testSegments, 'Sample Project');
  assert(vtt.startsWith('WEBVTT'), `VTT must start with WEBVTT: \n${vtt}`);
  assert(vtt.includes('00:00:02.400 --> 00:00:05.100\nFirst spoken subtitle line.'), `Invalid VTT timestamp: \n${vtt}`);
  console.log('✓ VTT export format validated: Valid WEBVTT header & period millisecond timestamps');

  // JSON Export
  const jsonExport = TranscriptExportHelper.toJson({
    projectName: 'Test',
    language: 'Hindi',
    segments: testSegments
  });
  const parsed = JSON.parse(jsonExport);
  assert.strictEqual(parsed.segments.length, 2, 'JSON must contain 2 segments');
  assert.strictEqual(parsed.segments[0].start, 2.4, 'JSON start timestamp must be 2.4');
  console.log('✓ JSON export format validated: Structured data integrity preserved');

  // ----------------------------------------------------
  // TEST 6: Transcript Editing without Timestamp Corruption
  // ----------------------------------------------------
  console.log('\n[Test 6] Testing In-Place Transcript Editing...');

  TranscriptionStorageService.initStorage();
  const testProjId = `test_trans_${Date.now()}`;
  const testProject: TranscriptionProject = {
    id: testProjId,
    filename: 'test_audio.mp3',
    originalName: 'test_audio.mp3',
    mediaUrl: '/api/audio/file/test_audio.mp3',
    mediaType: 'audio',
    duration: 10.0,
    durationFormatted: '00:10',
    detectedLanguage: 'Hindi',
    detectedLanguageCode: 'hi',
    confidenceScore: 0.92,
    isAmbiguousHindiUrdu: true,
    selectedScript: 'hindi_devanagari',
    segments: [
      { id: 'seg_1', start: 0.0, end: 3.5, text: 'मूल पाठ' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await TranscriptionStorageService.saveProject(testProject);

  // User edits segment text without altering timestamps
  const updatedSegments: TranscriptionSegment[] = [
    { id: 'seg_1', start: 0.0, end: 3.5, text: 'संपादित पाठ (User edited text)' }
  ];

  const updatedProj = await TranscriptionStorageService.updateSegments(testProjId, updatedSegments);
  assert.ok(updatedProj, 'Project should update successfully');
  assert.strictEqual(updatedProj?.segments[0].text, 'संपादित पाठ (User edited text)', 'Text must be updated');
  assert.strictEqual(updatedProj?.segments[0].start, 0.0, 'Start timestamp must remain 0.0');
  assert.strictEqual(updatedProj?.segments[0].end, 3.5, 'End timestamp must remain 3.5');

  await TranscriptionStorageService.deleteProject(testProjId);
  console.log('✓ Transcript text editing verified: Text updated while timestamps remain strictly intact');

  console.log('\n=======================================================');
  console.log(' ALL VOICEOVER TRANSCRIPTION STUDIO TESTS PASSED!');
  console.log('=======================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TRANSCRIPTION STUDIO TEST FAILED:', err);
  process.exit(1);
});

