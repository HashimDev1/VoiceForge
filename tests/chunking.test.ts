import assert from 'assert';
import { splitScriptIntoChunks, detectChapterHeading } from '../shared/src/chunking.ts';
import { analyzeScript } from '../shared/src/textAnalysis.ts';

console.log('--- Running Script Chunking & Analysis Unit Tests ---');

// Test 1: Chapter Heading Detection
const ch1 = detectChapterHeading('# INTRODUCTION TO ANCIENT EGYPT');
assert.strictEqual(ch1.isHeading, true);
assert.strictEqual(ch1.title, 'INTRODUCTION TO ANCIENT EGYPT');

const ch2 = detectChapterHeading('CHAPTER 2: THE DISCOVERY');
assert.strictEqual(ch2.isHeading, true);
assert.strictEqual(ch2.title, 'CHAPTER 2: THE DISCOVERY');

const normalSentence = detectChapterHeading('On the night of October 14th, everything changed.');
assert.strictEqual(normalSentence.isHeading, false);

console.log('✓ Chapter Heading Detection passed');

// Test 2: Smart Chunking avoiding date fragmentation
const testScript = `
INTRODUCTION

On the night of October 14th, everything changed. Nobody knew what was happening in the city. The streets were silent.

THE DISCOVERY

Dr. Smith found an ancient artifact at 3.14 km depth. It was remarkable.
`;

const result = splitScriptIntoChunks(testScript, {
  preset: 'Medium',
  maxCharacters: 300,
  preserveParagraphs: true
}, 145);

assert.ok(result.chunks.length >= 2, 'Should create at least 2 chunks');
assert.ok(result.chapters.length >= 2, 'Should detect at least 2 chapters');

// Verify "October 14th" is preserved without bad cuts
const chunk1Text = result.chunks[0].text;
assert.ok(chunk1Text.includes('October 14th'), 'Should preserve October 14th in chunk');

console.log('✓ Smart Chunking & Date preservation passed');

// Test 3: Text Analysis calculation with speech speed
const analysisNormal = analyzeScript(testScript, {
  preset: 'Medium',
  maxCharacters: 300,
  preserveParagraphs: true
}, 145, 1.0);

const analysisFast = analyzeScript(testScript, {
  preset: 'Medium',
  maxCharacters: 300,
  preserveParagraphs: true
}, 145, 1.5);

assert.ok(analysisNormal.wordCount > 10);
assert.ok(analysisNormal.characterCount > 50);
assert.strictEqual(analysisNormal.chapterCount, 2);
assert.ok(analysisFast.estimatedDurationSec < analysisNormal.estimatedDurationSec, '1.5x fast speed should decrease estimated duration');

console.log('✓ Script Text Analysis with Speech Speed passed');
console.log('--- All Chunking Unit Tests Passed! ---');
