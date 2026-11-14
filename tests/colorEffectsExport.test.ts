import { VideoEditorService } from '../server/src/services/videoEditorService';
import { EditorProject, TimelineClip } from '../shared/src/videoEditorTypes';
import { createNewProject, COLOR_PRESETS, EFFECT_CATALOG, DEFAULT_COLOR_GRADING, DEFAULT_TRANSFORM } from '../shared/src/videoEditorDefaults';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('=======================================================');
  console.log(' Running Video Editor Color Grading & Effects Export Tests');
  console.log('=======================================================\n');

  // Test 1: Verify filter string generation for Color Presets
  console.log('[Test 1] Testing filter string generation for all Color Presets...');
  for (const preset of COLOR_PRESETS) {
    const dummyClip: any = {
      id: 'clip-1',
      trackId: 'track-v1',
      assetId: 'asset-1',
      name: 'Test Clip',
      type: 'image',
      start: 0,
      duration: 3,
      colorGrading: { ...DEFAULT_COLOR_GRADING, ...preset.settings },
      effects: []
    };
    const filter = VideoEditorService.buildColorAndEffectsFilter(dummyClip);
    if (!filter || !filter.includes('eq=')) {
      throw new Error(`Color filter failed for preset ${preset.name}: ${filter}`);
    }
  }
  console.log('✓ All 5 Color Presets generate valid eq/colortemperature filter strings.');

  // Test 2: Verify filter string generation for all Effects
  console.log('\n[Test 2] Testing filter string generation for all Catalog Effects...');
  for (const eff of EFFECT_CATALOG) {
    const dummyClip: any = {
      id: 'clip-2',
      trackId: 'track-v1',
      assetId: 'asset-1',
      name: 'Test Clip 2',
      type: 'image',
      start: 0,
      duration: 3,
      effects: [{
        id: `eff-${eff.id}`,
        type: eff.id,
        intensity: eff.defaultIntensity || 50,
        enabled: true
      }]
    };
    const filter = VideoEditorService.buildColorAndEffectsFilter(dummyClip);
    if (!filter) {
      throw new Error(`Effect filter generated empty string for effect ${eff.name}`);
    }
  }
  console.log('✓ All 12 Effects generate valid FFmpeg filter strings.');

  // Test 3: Still frame export with color grading + vignette effect
  console.log('\n[Test 3] Testing Still Frame export with Color Grading + Vignette...');
  const testProject = createNewProject('Color & Effects Test', '16:9');
  
  // Create a solid test image file in temp
  const tempDir = path.join(__dirname, '../temp_storage');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const testImgPath = path.join(tempDir, 'test_source.png');

  // Generate test image with ffmpeg
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  const { FFmpegHelper } = require('../server/src/utils/ffmpegHelper');
  const ffmpeg = await FFmpegHelper.getFfmpegPath();

  await execFileAsync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=navy:s=640x360:d=1', '-frames:v', '1', testImgPath]);

  testProject.assets = [{
    id: 'asset-test-img',
    name: 'test_source.png',
    type: 'image',
    url: testImgPath,
    duration: 5,
    width: 640,
    height: 360,
    createdAt: new Date().toISOString()
  } as any];

  testProject.clips = [{
    id: 'clip-test-img',
    trackId: 'track-v1',
    assetId: 'asset-test-img',
    name: 'test_source.png',
    type: 'image',
    start: 0,
    duration: 3,
    sourceStart: 0,
    sourceDuration: 3,
    transform: { ...DEFAULT_TRANSFORM },
    colorGrading: {
      ...DEFAULT_COLOR_GRADING,
      brightness: 20,
      contrast: 30,
      saturation: 40,
      temperature: 25,
      exposure: 15,
      hue: 10,
      gamma: 1.1
    },
    effects: [
      { id: 'eff-vignette', type: 'vignette', intensity: 60, enabled: true },
      { id: 'eff-grain', type: 'film_grain', intensity: 25, enabled: true }
    ]
  } as any];

  const frameResult = await VideoEditorService.exportFrame(testProject, {
    time: 1.0,
    format: 'png',
    resolution: '720p'
  });

  if (!frameResult.success || !frameResult.frameUrl) {
    throw new Error(`Frame export failed: ${frameResult.error}`);
  }
  console.log(`✓ Frame exported successfully with Color Grading & Effects: ${frameResult.filename} (${frameResult.width}x${frameResult.height}, ${frameResult.fileSize} bytes)`);

  // Test 4: Images ZIP export with applied color grading & effects
  console.log('\n[Test 4] Testing Images ZIP export with applied color grading & effects...');
  const zipResult = await VideoEditorService.exportImagesZip(testProject);
  if (!zipResult.success || !zipResult.zipUrl || zipResult.imageCount < 1) {
    throw new Error(`Images ZIP export failed or empty: ${JSON.stringify(zipResult)}`);
  }
  console.log(`✓ Images ZIP exported with ${zipResult.imageCount} processed image(s): ${zipResult.filename} (${zipResult.fileSize} bytes)`);

  console.log('\n=======================================================');
  console.log(' ✅ ALL COLOR & EFFECTS EXPORT TESTS PASSED!');
  console.log('=======================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
