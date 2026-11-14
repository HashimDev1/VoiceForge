import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { FacelessVideoService } from '../server/src/services/facelessVideoService';
import { VideoEditorService } from '../server/src/services/videoEditorService';
import { FFmpegHelper } from '../server/src/utils/ffmpegHelper';
import { FacelessVisualStyle } from '../shared/src/videoEditorTypes';

const execFileAsync = util.promisify(execFile);

async function runFacelessTests() {
  console.log('=======================================================');
  console.log(' Running Auto Faceless Video Generator Unit Tests');
  console.log('=======================================================');

  FacelessVideoService.initStorage();
  VideoEditorService.initStorage();
  const ffmpeg = await FFmpegHelper.getFfmpegPath();
  const assetsDir = VideoEditorService.getAssetsDir();

  // -----------------------------------------------------------------
  // TEST 1: Sentence Chunking - Standard Punctuation
  // -----------------------------------------------------------------
  console.log('Test 1: Sentence Chunking - Standard punctuation');
  const script1 = 'The deep ocean holds mysterious secrets. Scientists have discovered strange creatures! Can humanity ever explore it all?';
  const sentences1 = FacelessVideoService.breakScriptIntoSentences(script1);
  assert.strictEqual(sentences1.length, 3, `Expected 3 sentences, got ${sentences1.length}`);
  assert.strictEqual(sentences1[0], 'The deep ocean holds mysterious secrets.');
  assert.strictEqual(sentences1[1], 'Scientists have discovered strange creatures!');
  assert.strictEqual(sentences1[2], 'Can humanity ever explore it all?');
  console.log('  ✓ Correctly parsed 3 sentences on ., !, ?');

  // -----------------------------------------------------------------
  // TEST 2: Sentence Chunking - Short fragment merging
  // -----------------------------------------------------------------
  console.log('Test 2: Sentence Chunking - Short fragment merging (<20 chars)');
  const script2 = 'In 1945. The war finally ended across the world and peace returned to the continent.';
  const sentences2 = FacelessVideoService.breakScriptIntoSentences(script2);
  // 'In 1945.' is under 20 chars, so it should merge with next
  assert.strictEqual(sentences2.length, 1);
  assert.ok(sentences2[0].startsWith('In 1945. The war finally ended'));
  console.log('  ✓ Short fragment merged with subsequent sentence');

  // -----------------------------------------------------------------
  // TEST 3: Sentence Chunking - Unpunctuated run-on fallback
  // -----------------------------------------------------------------
  console.log('Test 3: Sentence Chunking - Unpunctuated run-on text');
  const runOn = 'Artificial intelligence is changing the entire world at an unbelievable speed every day new models and algorithms are invented to transform human knowledge and productivity forever';
  const sentences3 = FacelessVideoService.breakScriptIntoSentences(runOn);
  assert.ok(sentences3.length >= 2, `Expected run-on text to be split into chunks, got ${sentences3.length}`);
  console.log(`  ✓ Unpunctuated text split into ${sentences3.length} scene chunks`);

  // -----------------------------------------------------------------
  // TEST 4: Visual Prompt Construction - All 7 Visual Styles
  // -----------------------------------------------------------------
  console.log('Test 4: Visual Prompt Construction across all 7 styles');
  const styles: FacelessVisualStyle[] = [
    'cinematic',
    'dark_mystery',
    'cyberpunk',
    'anime',
    'pixar_3d',
    'vintage',
    'stock_video'
  ];

  for (const style of styles) {
    const prompt = FacelessVideoService.buildVisualPrompt('In fact, a glowing neon city hovered in the clouds.', style);
    assert.ok(!prompt.startsWith('In fact,'), 'Filler words should be stripped');
    assert.ok(prompt.toLowerCase().includes('glowing neon city hovered in the clouds'));

    if (style === 'cinematic') assert.ok(prompt.includes('cinematic 35mm'));
    if (style === 'dark_mystery') assert.ok(prompt.includes('noir thriller'));
    if (style === 'cyberpunk') assert.ok(prompt.includes('cyberpunk'));
    if (style === 'anime') assert.ok(prompt.includes('Makoto Shinkai'));
    if (style === 'pixar_3d') assert.ok(prompt.includes('Disney Pixar'));
    if (style === 'vintage') assert.ok(prompt.includes('1920s vintage'));
    if (style === 'stock_video') assert.ok(prompt.includes('stock video'));
  }
  console.log('  ✓ All 7 visual styles produce customized visual prompts');

  // -----------------------------------------------------------------
  // TEST 5: Visual Asset Generation (Local Synthesis Fallback)
  // -----------------------------------------------------------------
  console.log('Test 5: Visual Asset Generation');
  const visual = await FacelessVideoService.generateVisualAsset(
    'A lone astronaut standing on Mars gazing at the Earth, cinematic 35mm',
    'cinematic',
    '9:16',
    0
  );
  assert.ok(visual.localPath, 'Visual should have a local path');
  assert.ok(fs.existsSync(visual.localPath), `File does not exist: ${visual.localPath}`);
  const stats = fs.statSync(visual.localPath);
  assert.ok(stats.size > 500, `Generated visual file is too small: ${stats.size} bytes`);
  console.log(`  ✓ Visual asset generated successfully (${stats.size} bytes, ${visual.mediaType})`);

  // -----------------------------------------------------------------
  // TEST 6: Generate Full Project from Script (Mode 1)
  // -----------------------------------------------------------------
  console.log('Test 6: Full Faceless Project from Script (Mode 1)');
  const testScript = 'Artificial intelligence is evolving at lightning speed. It powers our phones, creative studios, and future spacecraft. What will tomorrow bring?';
  const resultScript = await FacelessVideoService.generateFromScript({
    script: testScript,
    style: 'cyberpunk',
    aspectRatio: '9:16',
    projectName: 'Unit Test Cyberpunk Video',
    voiceId: 'en-US-ChristopherNeural',
    captionPreset: 'hormozi_bold'
  });

  assert.strictEqual(resultScript.success, true);
  assert.ok(resultScript.project);
  assert.strictEqual(resultScript.project.aspectRatio, '9:16');
  assert.strictEqual(resultScript.scenesCount, 3);
  assert.ok(resultScript.totalDuration > 3, `Expected duration > 3s, got ${resultScript.totalDuration}`);

  // Check tracks: text, v1, a1
  const tracks = resultScript.project.tracks;
  assert.ok(tracks.some((t) => t.id === 'track-text'));
  assert.ok(tracks.some((t) => t.id === 'track-v1'));
  assert.ok(tracks.some((t) => t.id === 'track-a1'));

  // Check voiceover clip on a1
  const voClip = resultScript.project.clips.find((c) => c.trackId === 'track-a1');
  assert.ok(voClip, 'Voiceover clip must exist on track-a1');
  assert.strictEqual(voClip.type, 'audio');
  assert.strictEqual(voClip.start, 0);

  // Check visual clips on v1
  const v1Clips = resultScript.project.clips.filter((c) => c.trackId === 'track-v1');
  assert.strictEqual(v1Clips.length, 3, 'Expected 3 visual clips on track-v1');
  for (const c of v1Clips) {
    assert.ok(c.duration > 0);
    assert.strictEqual(c.transform.fitMode, 'fill');
    // Ensure Ken Burns keyframes exist
    assert.ok(c.keyframes && c.keyframes.length >= 2, 'Visual clips should have Ken Burns scale keyframes');
  }

  // Check caption clips on track-text
  const capClips = resultScript.project.clips.filter((c) => c.trackId === 'track-text');
  assert.strictEqual(capClips.length, 3, 'Expected 3 caption subtitle clips');
  for (const cap of capClips) {
    assert.strictEqual(cap.type, 'caption');
    assert.ok(cap.text && cap.text.length > 5);
    assert.strictEqual(cap.captionPresetId, 'hormozi_bold');
  }

  // Verify project is persisted
  const loadedProj = await VideoEditorService.getProject(resultScript.project.id);
  assert.ok(loadedProj, 'Project should be saved in VideoEditorService storage');
  assert.strictEqual(loadedProj?.id, resultScript.project.id);
  console.log('  ✓ Script-to-video generated full 3-track project with Ken Burns motion & dynamic subtitles');

  // -----------------------------------------------------------------
  // TEST 7: Generate Full Project from Audio + Transcript (Mode 2)
  // -----------------------------------------------------------------
  console.log('Test 7: Full Faceless Project from Audio + Transcript (Mode 2)');
  // Create a 4.0s sine audio fixture as the input voiceover
  const audioFixturePath = path.join(assetsDir, `fixture_audio_faceless_${Date.now()}.mp3`);
  await execFileAsync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4.0',
    '-c:a', 'libmp3lame',
    audioFixturePath
  ]);

  const audioAsset = await VideoEditorService.probeMedia(audioFixturePath, 'test_voiceover.mp3');

  const customTranscript = 'Welcome to the ancient pyramids of Egypt. Pharaonic treasures were buried beneath the golden sands.';
  const resultAudio = await FacelessVideoService.generateFromAudio({
    audioUrl: audioAsset.url,
    audioAssetId: audioAsset.id,
    transcript: customTranscript,
    style: 'vintage',
    aspectRatio: '16:9',
    projectName: 'Unit Test Vintage Documentary'
  });

  assert.strictEqual(resultAudio.success, true);
  assert.ok(resultAudio.project);
  assert.strictEqual(resultAudio.project.aspectRatio, '16:9');
  assert.strictEqual(resultAudio.scenesCount, 2);

  const audioClips = resultAudio.project.clips.filter((c) => c.trackId === 'track-a1');
  assert.strictEqual(audioClips.length, 1);
  assert.ok(audioClips[0].assetId);
  assert.strictEqual(audioClips[0].url, audioAsset.url);

  const visualClipsAudio = resultAudio.project.clips.filter((c) => c.trackId === 'track-v1');
  assert.strictEqual(visualClipsAudio.length, 2);

  const captionClipsAudio = resultAudio.project.clips.filter((c) => c.trackId === 'track-text');
  assert.strictEqual(captionClipsAudio.length, 2);
  assert.ok(captionClipsAudio[0].text?.includes('Welcome to the ancient pyramids'));
  assert.ok(captionClipsAudio[1].text?.includes('Pharaonic treasures'));

  // Clean up fixture
  try {
    if (fs.existsSync(audioFixturePath)) fs.unlinkSync(audioFixturePath);
  } catch {}

  console.log('  ✓ Audio + transcript mode successfully synchronized scenes to voiceover');

  console.log('\n✅ ALL 7 FACELESS VIDEO TESTS PASSED!\n');
}

runFacelessTests().catch((err) => {
  console.error('\n❌ Faceless Video Test Failed:', err);
  process.exit(1);
});
