import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { VideoEditorService } from '../server/src/services/videoEditorService';
import { createNewProject, COLOR_PRESETS, TRANSITION_CATALOG, EFFECT_CATALOG, ASPECT_RATIOS } from '../shared/src/videoEditorDefaults';
import { EditorProject, EditorExportOptions } from '../shared/src/videoEditorTypes';

async function runTests() {
  console.log('=======================================================');
  console.log(' Running Video Editor Architecture & Engine Unit Tests');
  console.log('=======================================================');

  // Test 1: Storage initialization
  console.log('\n[Test 1] Testing VideoEditorService Storage Initialization...');
  VideoEditorService.initStorage();
  const assetsDir = VideoEditorService.getAssetsDir();
  const exportsDir = VideoEditorService.getExportsDir();
  assert.ok(fs.existsSync(assetsDir), 'Assets directory must exist');
  assert.ok(fs.existsSync(exportsDir), 'Exports directory must exist');
  console.log('✓ Storage directories verified.');

  // Test 2: Project Creation & Defaults
  console.log('\n[Test 2] Testing Default Project Factories & Catalogs...');
  const project = createNewProject('Test Shorts Video', '9:16');
  assert.strictEqual(project.name, 'Test Shorts Video');
  assert.strictEqual(project.aspectRatio, '9:16');
  assert.strictEqual(project.tracks.length, 5, 'Must have 5 initial default tracks');
  assert.strictEqual(COLOR_PRESETS.length >= 8, true, 'Must have at least 8 color presets');
  assert.strictEqual(TRANSITION_CATALOG.length >= 12, true, 'Must have at least 12 transitions');
  assert.strictEqual(EFFECT_CATALOG.length >= 10, true, 'Must have at least 10 effects');
  console.log('✓ Defaults, tracks, and catalogs verified.');

  // Test 3: Project CRUD
  console.log('\n[Test 3] Testing Project CRUD (Save, List, Get, Duplicate, Delete)...');
  const saved = await VideoEditorService.saveProject(project);
  assert.strictEqual(saved.id, project.id);

  const fetched = await VideoEditorService.getProject(project.id);
  assert.strictEqual(fetched.name, 'Test Shorts Video');

  const list = await VideoEditorService.listProjects();
  const found = list.find((p) => p.id === project.id);
  assert.ok(found, 'Saved project must appear in list');

  const duplicated = await VideoEditorService.duplicateProject(project.id);
  assert.ok(duplicated.id !== project.id, 'Duplicate must have new ID');
  assert.strictEqual(duplicated.name, 'Test Shorts Video (Copy)');

  const deleted1 = await VideoEditorService.deleteProject(project.id);
  const deleted2 = await VideoEditorService.deleteProject(duplicated.id);
  assert.strictEqual(deleted1, true);
  assert.strictEqual(deleted2, true);
  console.log('✓ Project persistence CRUD verified.');

  // Test 4: Blank Canvas Synthesis (FFmpeg)
  console.log('\n[Test 4] Testing Multi-Track FFmpeg Synthesis...');
  const renderProject = createNewProject('Render Test Project', '9:16');
  renderProject.duration = 2.0; // 2 second short test

  const job = await VideoEditorService.startExport(renderProject, {
    resolution: '720p',
    fps: 30,
    codec: 'h264'
  });

  assert.ok(job.id, 'Must produce a valid job ID');
  console.log(`✓ Export job launched (${job.id}). Polling completion...`);

  let finished = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = VideoEditorService.getExportJob(job.id);
    if (status && status.status === 'completed') {
      finished = true;
      assert.ok(status.outputUrl, 'Must have outputUrl');
      assert.ok(status.filename, 'Must have filename');
      const exportedPath = path.join(exportsDir, status.filename!);
      assert.ok(fs.existsSync(exportedPath), 'Output file must exist on disk');
      console.log(`✓ Export verified: ${status.outputUrl} (${(fs.statSync(exportedPath).size / 1024).toFixed(1)} KB)`);
      // Clean up test file
      fs.unlinkSync(exportedPath);
      break;
    }
    if (status && status.status === 'failed') {
      throw new Error(`Export job failed: ${status.error}`);
    }
  }

  assert.ok(finished, 'Export must complete within 30 seconds');

  console.log('\n=======================================================');
  console.log(' ALL VIDEO EDITOR BACKEND TESTS PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});

