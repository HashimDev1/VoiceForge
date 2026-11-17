import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { VideoEditorService } from '../server/src/services/videoEditorService';
import { createNewProject, DEFAULT_TRANSFORM, DEFAULT_SPEED, DEFAULT_COLOR_GRADING, DEFAULT_AUDIO_SETTINGS } from '../shared/src/videoEditorDefaults';
import { TimelineClip, MediaAsset } from '../shared/src/videoEditorTypes';
import { FFmpegHelper } from '../server/src/utils/ffmpegHelper';

const execFileAsync = util.promisify(execFile);

async function runMultiSceneExportTest() {
  console.log('=======================================================');
  console.log(' Running 49-Scene Multi-Track Video Export Verification');
  console.log('=======================================================');

  VideoEditorService.initStorage();
  const assetsDir = VideoEditorService.getAssetsDir();
  const ffmpeg = await FFmpegHelper.getFfmpegPath();

  // Create a 1-frame dummy image fixture
  const fixtureImg = path.join(assetsDir, `fixture_49scene_${Date.now()}.png`);
  await execFileAsync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'color=c=navy:s=640x360:d=1',
    '-vframes', '1',
    fixtureImg
  ]);

  // Create a 1-second dummy audio fixture
  const fixtureAudio = path.join(assetsDir, `fixture_audio_${Date.now()}.wav`);
  await execFileAsync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=10',
    fixtureAudio
  ]);

  try {
    const sceneCount = 49;
    const sceneDuration = 0.2; // 0.2s per scene for quick test = 9.8s total
    const totalDuration = sceneCount * sceneDuration;

    const project = createNewProject('49 Scene Stress Export Test', '16:9');
    project.duration = totalDuration;

    const imgAsset: MediaAsset = {
      id: 'asset_scene_img',
      name: 'scene_img.png',
      url: `/api/editor/assets/${path.basename(fixtureImg)}`,
      type: 'image',
      duration: 5,
      width: 640,
      height: 360,
      fps: 30,
      fileSize: fs.statSync(fixtureImg).size,
      isMissing: false,
      createdAt: new Date().toISOString()
    };

    const audioAsset: MediaAsset = {
      id: 'asset_vo',
      name: 'voiceover.wav',
      url: `/api/editor/assets/${path.basename(fixtureAudio)}`,
      type: 'audio',
      duration: 10,
      width: 0,
      height: 0,
      fps: 0,
      fileSize: fs.statSync(fixtureAudio).size,
      isMissing: false,
      createdAt: new Date().toISOString()
    };

    project.assets.push(imgAsset, audioAsset);

    // Add 49 visual clips and 49 caption clips
    for (let i = 0; i < sceneCount; i++) {
      const start = i * sceneDuration;

      // Visual scene clip on track-v1
      project.clips.push({
        id: `clip_v_${i}`,
        trackId: 'track-v1',
        assetId: imgAsset.id,
        name: `Scene ${i + 1} (anime)`,
        type: 'image',
        start,
        duration: sceneDuration,
        sourceStart: 0,
        sourceDuration: sceneDuration,
        url: imgAsset.url,
        transform: { ...DEFAULT_TRANSFORM },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS },
        effects: [],
        keyframes: []
      });

      // Caption clip on track-text
      project.clips.push({
        id: `clip_cap_${i}`,
        trackId: 'track-text',
        name: `Caption: Scene ${i + 1}`,
        type: 'caption',
        start,
        duration: sceneDuration,
        sourceStart: 0,
        sourceDuration: sceneDuration,
        text: `Cinematic scene ${i + 1} subtitle caption`,
        captionPresetId: 'hormozi_bold',
        transform: { ...DEFAULT_TRANSFORM },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS },
        effects: [],
        keyframes: []
      });
    }

    // Add voiceover audio clip on track-a1
    project.clips.push({
      id: 'clip_vo_main',
      trackId: 'track-a1',
      assetId: audioAsset.id,
      name: 'Voiceover',
      type: 'audio',
      start: 0,
      duration: totalDuration,
      sourceStart: 0,
      sourceDuration: totalDuration,
      url: audioAsset.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS, volume: 100 },
      effects: [],
      keyframes: []
    });

    console.log(`Starting export with ${sceneCount} scenes, ${sceneCount} captions, and voiceover audio...`);
    const startTime = Date.now();

    const job = await VideoEditorService.startExport(project, {
      resolution: '720p',
      fps: 30,
      codec: 'h264'
    });

    // Poll until complete
    while (true) {
      await new Promise(r => setTimeout(r, 400));
      const current = VideoEditorService.getExportJob(job.id);
      if (!current) break;
      console.log(`  -> Progress: ${current.progress}% | Stage: ${current.stage}`);
      if (current.status === 'completed') {
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`\n✓ Export successfully finished in ${elapsed.toFixed(1)}s!`);
        console.log(`✓ Output file: ${current.outputUrl}`);
        assert.ok(current.outputUrl, 'Job must have output URL');
        const exportFile = path.join(VideoEditorService.getExportsDir(), current.filename || '');
        assert.ok(fs.existsSync(exportFile), 'Exported MP4 file must exist on disk');
        const size = fs.statSync(exportFile).size;
        console.log(`✓ Exported file size: ${size} bytes`);
        assert.ok(size > 10000, 'Exported MP4 must be valid and non-empty');
        // Clean up
        try { fs.unlinkSync(exportFile); } catch {}
        break;
      }
      if (current.status === 'failed') {
        throw new Error(`Export job failed: ${current.error}`);
      }
    }

    console.log('\n=======================================================');
    console.log(' ✅ 49-SCENE MULTI-TRACK EXPORT VERIFIED PERFECTLY!');
    console.log('=======================================================');
  } finally {
    try { fs.unlinkSync(fixtureImg); } catch {}
    try { fs.unlinkSync(fixtureAudio); } catch {}
  }
}

runMultiSceneExportTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
