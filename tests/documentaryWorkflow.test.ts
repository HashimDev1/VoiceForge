import assert from 'assert';
import {
  parseScriptToScenes,
  estimateWordDuration,
  compileDocumentaryToEditorProject
} from '../shared/src/documentaryCompiler';
import { DocumentaryProject } from '../shared/src/documentaryTypes';
import { DocumentaryService } from '../server/src/services/documentaryService';
import { VideoEditorService } from '../server/src/services/videoEditorService';

async function runDocumentaryWorkflowTests() {
  console.log('=======================================================');
  console.log(' Running VoiceForge Documentary Studio Test Suite');
  console.log('=======================================================\n');

  // [Test 1] Word duration estimation
  console.log('[Test 1] Validating Narration Duration Estimation...');
  const shortText = 'Across four thousand miles of windswept desert.';
  const durShort = estimateWordDuration(shortText);
  assert(durShort >= 3.0, `Expected min 3.0s, got ${durShort}`);
  console.log(`✓ Short text (${shortText.split(' ').length} words) duration: ${durShort}s`);

  const longText = 'At the heart of the journey lay Samarkand, a city of turquoise domes, scholars, and merchants whose wealth rivaled the greatest kingdoms of Europe. Its bazaars were filled with silk, spices, and precious manuscripts from across known civilization.';
  const durLong = estimateWordDuration(longText);
  assert(durLong > 10.0, `Expected > 10.0s for long narrative, got ${durLong}`);
  console.log(`✓ Long text (${longText.split(' ').length} words) duration: ${durLong}s`);

  // [Test 2] Script Parsing into Scenes
  console.log('\n[Test 2] Testing Script Parsing & Scene Segmentation...');
  const sampleScript = `
[SCENE 1: Whispers in the Sand]
Visual: Aerial drone sweep over vast sunlit dunes
Across thousands of miles, forgotten empires traded gold, silk, and ideas.

[SCENE 2: The Great Citadel]
Visual: Close-up of ancient fortress gates opening
Here in the high mountains, merchants found refuge and scholars recorded the stars.

[SCENE 3: The Enduring Legacy]
Visual: Sun setting over weathered stone ruins
Though time eroded the walls, the wisdom preserved here survived centuries.
  `;

  const parsedScenes = parseScriptToScenes(sampleScript);
  assert.strictEqual(parsedScenes.length, 3, 'Should parse exactly 3 scenes');
  assert.strictEqual(parsedScenes[0].sceneNumber, 1);
  assert.strictEqual(parsedScenes[0].title, 'Scene 1: Whispers in the Sand');
  assert(parsedScenes[0].visualInstruction.includes('Aerial drone'), 'Should extract visual instruction');
  assert(parsedScenes[0].narrationText.includes('forgotten empires'), 'Should extract narration text');
  console.log(`✓ Successfully parsed 3 structured scenes with visual instructions and narration.`);

  // [Test 3] Default Starter Project
  console.log('\n[Test 3] Validating Default Documentary Project...');
  const defaultProj = DocumentaryService.createDefaultProject();
  assert(defaultProj.scenes.length >= 3, 'Default project must have at least 3 scenes');
  assert(defaultProj.scenes[0].motionGraphic?.enabled, 'Scene 1 must feature opening motion graphic');
  assert(defaultProj.captionSettings.enabled, 'Captions must be enabled');
  console.log(`✓ Default project "${defaultProj.name}" has ${defaultProj.scenes.length} scenes and motion titles.`);

  // [Test 4] Documentary Multitrack Compiler & Handoff
  console.log('\n[Test 4] Testing Documentary to VideoEditor Multitrack Compilation...');
  // Add mock assets to default project
  const testDoc: DocumentaryProject = {
    ...defaultProj,
    scenes: defaultProj.scenes.map((s, idx) => ({
      ...s,
      voiceoverAsset: {
        id: `vo_asset_${idx}`,
        url: `/uploads/editor_assets/test_vo_${idx}.mp3`,
        name: `Voiceover Scene ${idx + 1}`,
        duration: 5.0
      },
      visualAsset: {
        id: `vis_asset_${idx}`,
        url: `/uploads/editor_assets/test_broll_${idx}.mp4`,
        name: `B-Roll Scene ${idx + 1}`,
        type: 'video',
        duration: 5.0
      }
    })),
    backgroundMusic: {
      assetId: 'test_score',
      url: '/uploads/editor_assets/score.mp3',
      name: 'Cinematic Ambient Score',
      volume: 18
    }
  };

  const handoffResult = compileDocumentaryToEditorProject(testDoc);
  assert(handoffResult.success, 'Handoff compilation must succeed');
  const editorProj = handoffResult.editorProject;

  // Verify tracks
  assert.strictEqual(editorProj.tracks.length, 4, 'Must have 4 tracks (Titles, Visuals, VO, Music)');
  assert(editorProj.tracks.some((t) => t.id === 'track-titles'), 'Must have track-titles');
  assert(editorProj.tracks.some((t) => t.id === 'track-visuals'), 'Must have track-visuals');
  assert(editorProj.tracks.some((t) => t.id === 'track-voiceover'), 'Must have track-voiceover');
  assert(editorProj.tracks.some((t) => t.id === 'track-music'), 'Must have track-music');

  // Verify clips
  const visualClips = editorProj.clips.filter((c) => c.trackId === 'track-visuals');
  const voClips = editorProj.clips.filter((c) => c.trackId === 'track-voiceover');
  const titleClips = editorProj.clips.filter((c) => c.trackId === 'track-titles');
  const musicClips = editorProj.clips.filter((c) => c.trackId === 'track-music');

  assert.strictEqual(visualClips.length, 3, 'Must have 3 B-roll clips');
  assert.strictEqual(voClips.length, 3, 'Must have 3 voiceover narration clips');
  assert(titleClips.length >= 2, 'Must have at least 2 motion title clips');
  assert.strictEqual(musicClips.length, 1, 'Must have 1 background score clip');

  // Verify sequential alignment (no gaps)
  assert.strictEqual(visualClips[0].start, 0);
  assert.strictEqual(visualClips[1].start, 5.0);
  assert.strictEqual(visualClips[2].start, 10.0);

  assert.strictEqual(voClips[0].start, 0);
  assert.strictEqual(voClips[1].start, 5.0);
  assert.strictEqual(voClips[2].start, 10.0);

  // Verify motion title parameters
  assert(titleClips[0].titleDesign?.mainText, 'Title clip must contain MotionTitleDesign');
  console.log(`✓ Compiler produced multitrack project: ${visualClips.length} visuals, ${voClips.length} VO clips, ${titleClips.length} titles.`);

  // [Test 5] Server Storage CRUD & VideoEditor Handoff Persistence
  console.log('\n[Test 5] Testing Server CRUD & VideoEditor Handoff Persistence...');
  VideoEditorService.initStorage();
  DocumentaryService.initStorage();

  const testProjectToSave: DocumentaryProject = {
    ...defaultProj,
    id: `doc_unit_test_${Date.now()}`,
    name: 'Unit Test Silk Road'
  };

  const saved = DocumentaryService.saveProject(testProjectToSave);
  assert.strictEqual(saved.name, 'Unit Test Silk Road');

  const retrieved = DocumentaryService.getProject(testProjectToSave.id);
  assert(retrieved, 'Should retrieve saved project');
  assert.strictEqual(retrieved.id, testProjectToSave.id);

  const handoff = await DocumentaryService.compileAndHandoff(testProjectToSave);
  assert(handoff.success);
  assert(handoff.editorProject.id);

  // Verify VideoEditorService now contains the project
  const editorLoaded = await VideoEditorService.getProject(handoff.editorProject.id);
  assert(editorLoaded, 'VideoEditorService must load the handed-off documentary project');
  assert.strictEqual(editorLoaded.id, handoff.editorProject.id);
  console.log(`✓ VideoEditorService successfully received and stored handed-off project: ${editorLoaded.id}`);

  // Cleanup test documentary project
  DocumentaryService.deleteProject(testProjectToSave.id);
  await VideoEditorService.deleteProject(handoff.editorProject.id);
  console.log(`✓ Cleaned up temporary test projects.`);

  console.log('\n=======================================================');
  console.log(' ✅ ALL DOCUMENTARY WORKFLOW UNIT TESTS PASSED!');
  console.log('=======================================================');
}

runDocumentaryWorkflowTests().catch((err) => {
  console.error('\n❌ DOCUMENTARY WORKFLOW TESTS FAILED:', err);
  process.exit(1);
});
