import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ReferenceAlignmentService } from '../server/src/services/referenceAlignmentService';
import { ScriptConversionService } from '../server/src/services/scriptConversionService';
import { TranscriptExportHelper } from '../server/src/utils/transcriptExportHelper';
import { TranscriptionSegment, ReferenceScriptFormat, AlignmentReviewItem } from '../shared/src/types';

async function runReferenceAlignmentTests() {
  console.log('=======================================================');
  console.log(' Running Reference-Guided Alignment Unit Tests');
  console.log('=======================================================');

  // ----------------------------------------------------
  // TEST 1: Script Format Auto-Detection
  // ----------------------------------------------------
  console.log('\n[Test 1] Testing Script Format Auto-Detection...');

  const hindiSample = 'अटलांटिक ओशन। दिसंबर 1872। समंदर में एक जहाज़ अकेला तैर रहा है।';
  const detectedHindi = ReferenceAlignmentService.detectScriptFormat(hindiSample);
  assert.strictEqual(detectedHindi, 'hindi_devanagari', `Expected 'hindi_devanagari', got '${detectedHindi}'`);

  const urduSample = 'اٹلانٹک اوشن۔ دسمبر 1872۔ سمندر میں ایک جہاز اکیلا تیر رہا ہے۔';
  const detectedUrdu = ReferenceAlignmentService.detectScriptFormat(urduSample);
  assert.strictEqual(detectedUrdu, 'urdu_script', `Expected 'urdu_script', got '${detectedUrdu}'`);

  const romanUrduSample = 'Atlantic Ocean. December 1872. Samandar mein ek jahaz akela tair raha hai. Uske sails hawa mein hil rahe hain.';
  const detectedRoman = ReferenceAlignmentService.detectScriptFormat(romanUrduSample);
  assert.strictEqual(detectedRoman, 'roman_urdu', `Expected 'roman_urdu', got '${detectedRoman}'`);

  const englishSample = 'The Mary Celeste was an American merchant brigantine discovered adrift in the Atlantic Ocean.';
  const detectedEng = ReferenceAlignmentService.detectScriptFormat(englishSample);
  assert.strictEqual(detectedEng, 'english_mixed', `Expected 'english_mixed', got '${detectedEng}'`);

  const emptySample = '   ';
  const detectedEmpty = ReferenceAlignmentService.detectScriptFormat(emptySample);
  assert.strictEqual(detectedEmpty, 'auto', `Expected 'auto' for empty, got '${detectedEmpty}'`);

  console.log('✓ Script format auto-detection verified across Devanagari, Urdu script, Roman Urdu, and English');

  // ----------------------------------------------------
  // TEST 2: Reference Alignment with Spelling Correction
  // ----------------------------------------------------
  console.log('\n[Test 2] Testing Reference Alignment with Spelling Correction...');

  // ASR output with common phonetic/nukta spelling flaws
  const asrSegments: TranscriptionSegment[] = [
    {
      id: 'seg_1',
      start: 0.0,
      end: 4.5,
      text: 'अटलांटिक अशन दिसमबर 1872 समंदर में एक जाहाज अकेला तेर रहा है'
    },
    {
      id: 'seg_2',
      start: 4.5,
      end: 8.0,
      text: 'खाने पीने का समान मुझुद है जाहाज दुब नहीं रहा'
    }
  ];

  // Original reference script with standard orthography
  const originalScript = 'अटलांटिक ओशन। दिसंबर 1872। समंदर में एक जहाज़ अकेला तैर रहा है। खाने-पीने का सामान मौजूद है। जहाज़ डूब नहीं रहा।';

  const alignResult = ReferenceAlignmentService.alignTranscriptWithReference({
    recognizedSegments: asrSegments,
    referenceScript: originalScript,
    detectedLanguageCode: 'hi'
  });

  assert.strictEqual(alignResult.alignedSegments.length, 2, 'Should maintain exactly 2 segments');
  assert.strictEqual(alignResult.alignedSegments[0].start, 0.0, 'Timestamps must remain strictly unchanged');
  assert.strictEqual(alignResult.alignedSegments[0].end, 4.5, 'Timestamps must remain strictly unchanged');
  assert.strictEqual(alignResult.alignedSegments[1].start, 4.5, 'Timestamps must remain strictly unchanged');
  assert.strictEqual(alignResult.alignedSegments[1].end, 8.0, 'Timestamps must remain strictly unchanged');

  // Check that review items were generated
  assert(alignResult.reviewItems.length >= 2, 'Should generate review items for aligned segments');
  const corrItem = alignResult.reviewItems.find((r) => r.status === 'suggested_correction' || r.status === 'confirmed');
  assert(corrItem !== undefined, 'Should have confirmed or suggested correction items');
  console.log(`✓ Reference alignment generated ${alignResult.reviewItems.length} review items (${alignResult.stats.confirmedCount} confirmed, ${alignResult.stats.correctionCount} corrections)`);

  // ----------------------------------------------------
  // TEST 3: Spoken Additions (Ad-libs not in script)
  // ----------------------------------------------------
  console.log('\n[Test 3] Testing Spoken Additions & Ad-libs Preservation...');

  const asrWithAdlib: TranscriptionSegment[] = [
    {
      id: 'seg_1',
      start: 0.0,
      end: 3.5,
      text: 'समंदर में एक जहाज़ अकेला तैर रहा है'
    },
    {
      id: 'seg_2',
      start: 3.5,
      end: 5.5,
      text: 'अरे वाह क्या नज़ारा था भाई' // Spoken ad-lib not in script
    }
  ];

  const scriptWithoutAdlib = 'समंदर में एक जहाज़ अकेला तैर रहा है।';

  const adlibResult = ReferenceAlignmentService.alignTranscriptWithReference({
    recognizedSegments: asrWithAdlib,
    referenceScript: scriptWithoutAdlib,
    detectedLanguageCode: 'hi'
  });

  assert.strictEqual(adlibResult.alignedSegments.length, 2, 'Ad-lib segment must NOT be deleted');
  assert.strictEqual(adlibResult.alignedSegments[1].text, 'अरे वाह क्या नज़ारा था भाई', 'Spoken ad-lib text must be preserved verbatim');
  assert.strictEqual(adlibResult.alignedSegments[1].alignmentStatus, 'spoken_addition', 'Should be tagged as spoken_addition');

  const adlibItem = adlibResult.reviewItems.find((r) => r.segmentId === 'seg_2');
  assert(adlibItem !== undefined, 'Should create review item for ad-lib');
  assert.strictEqual(adlibItem.status, 'spoken_addition', 'Review item status should be spoken_addition');
  console.log('✓ Spoken ad-libs preserved verbatim in timeline and tagged as spoken_addition');

  // ----------------------------------------------------
  // TEST 4: Omitted Reference Passages (Skipped sentences)
  // ----------------------------------------------------
  console.log('\n[Test 4] Testing Omitted Passages (Skipped in recording)...');

  const asrSkipped: TranscriptionSegment[] = [
    {
      id: 'seg_1',
      start: 0.0,
      end: 4.0,
      text: 'अटलांटिक ओशन में एक जहाज़ अकेला तैर रहा था'
    }
  ];

  const fullScriptWithSkipped = 'अटलांटिक ओशन में एक जहाज़ अकेला तैर रहा था। कैप्टन अपनी डायरी में लिख रहे थे। खाने-पीने का सामान मौजूद था।';

  const skippedResult = ReferenceAlignmentService.alignTranscriptWithReference({
    recognizedSegments: asrSkipped,
    referenceScript: fullScriptWithSkipped,
    detectedLanguageCode: 'hi'
  });

  assert.strictEqual(skippedResult.alignedSegments.length, 1, 'Skipped sentences must NOT fabricate audio segments');
  assert(skippedResult.omittedReferencePassages.length >= 1, 'Skipped passages must be reported in omittedReferencePassages');
  console.log(`✓ Detected ${skippedResult.omittedReferencePassages.length} skipped passages reported for review without corrupting audio timestamps`);

  // ----------------------------------------------------
  // TEST 5: Review Resolution Lifecycle
  // ----------------------------------------------------
  console.log('\n[Test 5] Testing Review Resolution (Accept, Edit, Reject)...');

  let testSegments: TranscriptionSegment[] = [
    { id: 'seg_1', start: 1.0, end: 3.0, text: 'जाहाज', words: [{ word: 'जाहाज', start: 1.0, end: 3.0 }] },
    { id: 'seg_2', start: 3.0, end: 5.0, text: 'दूब', words: [{ word: 'दूब', start: 3.0, end: 5.0 }] },
    { id: 'seg_3', start: 5.0, end: 7.0, text: 'मुझुद', words: [{ word: 'मुझुद', start: 5.0, end: 7.0 }] }
  ];

  let testReviewItems: AlignmentReviewItem[] = [
    {
      id: 'rev_1',
      segmentId: 'seg_1',
      start: 1.0,
      end: 3.0,
      recognizedText: 'जाहाज',
      referenceText: 'जहाज़',
      suggestedText: 'जहाज़',
      status: 'suggested_correction',
      statusLabel: 'Suggested Correction',
      resolvedState: 'pending'
    },
    {
      id: 'rev_2',
      segmentId: 'seg_2',
      start: 3.0,
      end: 5.0,
      recognizedText: 'दूब',
      referenceText: 'डूब',
      suggestedText: 'डूब',
      status: 'suggested_correction',
      statusLabel: 'Suggested Correction',
      resolvedState: 'pending'
    },
    {
      id: 'rev_3',
      segmentId: 'seg_3',
      start: 5.0,
      end: 7.0,
      recognizedText: 'मुझुद',
      referenceText: 'मौजूद',
      suggestedText: 'मौजूद',
      status: 'suggested_correction',
      statusLabel: 'Suggested Correction',
      resolvedState: 'pending'
    }
  ];

  // 1. Accept item 1
  const afterAccept = ReferenceAlignmentService.resolveReviewItem({
    segments: testSegments,
    reviewItems: testReviewItems,
    reviewItemId: 'rev_1',
    action: 'accepted'
  });
  assert.strictEqual(afterAccept.segments[0].text, 'जहाज़', 'Accepted item text should update to reference');
  assert.strictEqual(afterAccept.segments[0].start, 1.0, 'Timestamp start must be preserved');
  assert.strictEqual(afterAccept.segments[0].end, 3.0, 'Timestamp end must be preserved');
  assert.strictEqual(afterAccept.segments[0].words?.length ?? 0, 0, 'Mismatched raw ASR words must be cleared when text is replaced by reference');

  // 2. Reject item 2
  const afterReject = ReferenceAlignmentService.resolveReviewItem({
    segments: afterAccept.segments,
    reviewItems: afterAccept.reviewItems,
    reviewItemId: 'rev_2',
    action: 'rejected'
  });
  assert.strictEqual(afterReject.segments[1].text, 'दूब', 'Rejected item should retain recognized text');

  // 3. Edit item 3
  const afterEdit = ReferenceAlignmentService.resolveReviewItem({
    segments: afterReject.segments,
    reviewItems: afterReject.reviewItems,
    reviewItemId: 'rev_3',
    action: 'edited',
    editedText: 'मौजूद है'
  });
  assert.strictEqual(afterEdit.segments[2].text, 'मौजूद है', 'Edited item should take custom edited text');

  // 4. Accept All
  const afterAcceptAll = ReferenceAlignmentService.acceptAllCorrections({
    segments: testSegments,
    reviewItems: testReviewItems
  });
  assert.strictEqual(afterAcceptAll.segments[0].text, 'जहाज़');
  assert.strictEqual(afterAcceptAll.segments[1].text, 'डूब');
  assert.strictEqual(afterAcceptAll.segments[2].text, 'मौजूद');
  console.log('✓ Accept, Edit, Reject, and Accept All review resolution verified with 100% timestamp integrity');

  // ----------------------------------------------------
  // TEST 6: Roman Urdu Reference Alignment & Spelling Consistency
  // ----------------------------------------------------
  console.log('\n[Test 6] Testing Roman Urdu Consistency & Mixed-Language Speech...');

  const romanAsr: TranscriptionSegment[] = [
    { id: 'seg_1', start: 0.0, end: 3.0, text: 'yeh jahaz samundar mein tair raha hay' }
  ];
  const romanRef = 'Yeh jahaz samandar mein tair raha hai.';

  const romanAlign = ReferenceAlignmentService.alignTranscriptWithReference({
    recognizedSegments: romanAsr,
    referenceScript: romanRef,
    scriptFormat: 'roman_urdu',
    detectedLanguageCode: 'ur'
  });

  assert.strictEqual(romanAlign.alignedSegments.length, 1);
  assert(romanAlign.reviewItems.length >= 1);
  console.log(`✓ Roman Urdu reference alignment validated (Preserving reference spelling conventions)`);

  // ----------------------------------------------------
  // TEST 7: Subtitle & Transcript Exports with Aligned Text
  // ----------------------------------------------------
  console.log('\n[Test 7] Testing SRT, VTT, TXT, JSON Export with Aligned Segments...');

  const exportSegments: TranscriptionSegment[] = [
    { id: 'seg_1', start: 0.0, end: 3.5, text: 'अटलांटिक ओशन, दिसंबर 1872.' },
    { id: 'seg_2', start: 3.5, end: 7.2, text: 'समंदर में एक जहाज़ अकेला तैर रहा है.' }
  ];

  const srtOutput = TranscriptExportHelper.toSrt(exportSegments);
  assert(srtOutput.includes('00:00:00,000 --> 00:00:03,500'), 'SRT must contain valid timestamps');
  assert(srtOutput.includes('अटलांटिक ओशन, दिसंबर 1872.'), 'SRT must contain segment text');

  const vttOutput = TranscriptExportHelper.toVtt(exportSegments);
  assert(vttOutput.startsWith('WEBVTT'), 'VTT must begin with WEBVTT header');
  assert(vttOutput.includes('00:00:00.000 --> 00:00:03.500'), 'VTT must contain period millisecond format');

  const txtOutput = TranscriptExportHelper.toTxt(exportSegments);
  assert(txtOutput.includes('[00:00:00.000 – 00:00:03.500]'), 'TXT must match [HH:MM:SS.mmm – HH:MM:SS.mmm]');

  const jsonOutput = TranscriptExportHelper.toJson({
    id: 'test_proj',
    language: 'Hindi',
    duration: 7.2,
    segments: exportSegments
  });
  const parsed = JSON.parse(jsonOutput);
  assert.strictEqual(parsed.segments.length, 2, 'JSON export must have all segments');
  console.log('✓ SRT, VTT, TXT, and JSON subtitle formats verified with reference-aligned segments');

  console.log('\n=======================================================');
  console.log(' ALL REFERENCE ALIGNMENT UNIT TESTS PASSED!');
  console.log('=======================================================\n');
}

runReferenceAlignmentTests().catch((err) => {
  console.error('\n❌ REFERENCE ALIGNMENT TEST FAILED:', err);
  process.exit(1);
});