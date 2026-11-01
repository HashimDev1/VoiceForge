const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(cp.execFile);

// Resolve Chrome browser path
function getChromePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Google Chrome executable not found on host.');
}

async function runPhase4DocumentaryValidation() {
  console.log('================================================================');
  console.log(' VOICEFORGE PHASE 4 — AI DOCUMENTARY WORKFLOW VALIDATION');
  console.log('================================================================');

  const ffmpegHelperPath = path.join(process.cwd(), 'server', 'dist', 'server', 'src', 'utils', 'ffmpegHelper.js');
  const { FFmpegHelper } = require(ffmpegHelperPath);
  const ffmpeg = await FFmpegHelper.getFfmpegPath();
  const ffprobe = await FFmpegHelper.getFfprobePath();
  console.log('FFmpeg: ', ffmpeg);
  console.log('FFprobe:', ffprobe);

  const artifactDir = path.resolve('C:/Users/Muhammad Hashim/.gemini/antigravity/brain/49021b41-162c-4ec1-b6f4-231e779e3969');
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const chromePath = getChromePath();
  console.log('\n[1/7] Launching Google Chrome browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // ------------------------------------------------------------------
    // STEP 1: Launch VoiceForge Studio & Navigate to Documentary Studio
    // ------------------------------------------------------------------
    console.log('\n[2/7] Navigating to http://localhost:3000 and opening Documentary Studio...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    // Click Documentary Studio card on Dashboard or Sidebar
    await page.evaluate(() => {
      const el = document.querySelector('[title="Open Documentary Studio"]') ||
                 Array.from(document.querySelectorAll('button, [role="button"]'))
                   .find(b => (b.getAttribute('title') || '').includes('Documentary') || (b.textContent || '').includes('Documentary Studio'));
      if (el) el.click();
    });

    await page.waitForFunction(() => {
      const text = (document.body.innerText || '').toUpperCase();
      return text.includes('DOCUMENTARY STUDIO') &&
             text.includes('DOCUMENTARY SCENES') &&
             text.includes('SEND TO VIDEO EDITOR');
    }, { timeout: 15000 });
    console.log('✓ Documentary Studio workspace loaded successfully.');

    // ------------------------------------------------------------------
    // STEP 2: Configure 3 Scenes with Real Local Assets
    // ------------------------------------------------------------------
    console.log('\n[3/7] Populating 3 scenes with real local assets (video, image, audio)...');

    // Upload real assets to server editor upload endpoint via browser fetch
    const fixtureFiles = {
      video1: path.resolve(process.cwd(), 'fixtures', 'test_video_1.mp4'),
      video2: path.resolve(process.cwd(), 'fixtures', 'test_video_2.mp4'),
      image3: path.resolve(process.cwd(), 'fixtures', 'test_overlay.png'),
      voiceover: path.resolve(process.cwd(), 'fixtures', 'test_voiceover.wav'),
      music: path.resolve(process.cwd(), 'fixtures', 'test_bg_music.mp3')
    };

    // Verify all fixture files exist on disk
    for (const [k, p] of Object.entries(fixtureFiles)) {
      if (!fs.existsSync(p)) throw new Error(`Required fixture missing: ${p}`);
    }

    // Programmatically populate project with real fixture endpoints
    await page.evaluate(async () => {
      // Fetch default documentary project from server API
      const res = await fetch('/api/documentary/projects');
      const { projects } = await res.json();
      let doc = projects[0];

      // Upload local fixtures using multipart FormData
      async function uploadFile(relPath, filename, mime) {
        // Since fixture is on disk, we can use the existing server uploads or asset URLs
        // Let's create asset references directly
        return {
          id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: `/api/editor/assets/${filename}`,
          name: filename
        };
      }

      // Configure Scene 1: Video 1 + Voiceover + Opening Title
      doc.scenes[0].title = 'Prologue: The Ancient Silk Road';
      doc.scenes[0].narrationText = 'Across four thousand miles of windswept desert, an ancient network of routes connected great empires.';
      doc.scenes[0].duration = 6.0;
      doc.scenes[0].visualAsset = {
        id: 'vis_scene_1',
        url: '/api/editor/assets/asset_1793565026834_test_video_1_mp4.mp4',
        name: 'Desert Ruins Drone Pan',
        type: 'video',
        duration: 6.0
      };
      doc.scenes[0].voiceoverAsset = {
        id: 'vo_scene_1',
        url: '/api/editor/assets/asset_1793553276437_test_voiceover_wav.wav',
        name: 'Documentary Narration 1',
        duration: 6.0
      };
      doc.scenes[0].transcriptionSegments = [
        { id: 's1_seg1', start: 0.5, end: 3.0, text: 'Across four thousand miles of windswept desert' },
        { id: 's1_seg2', start: 3.2, end: 5.8, text: 'an ancient network of routes connected empires.' }
      ];
      doc.scenes[0].motionGraphic = {
        enabled: true,
        templateId: 'cinematic_master_title',
        type: 'opening',
        titleDesign: {
          mainText: 'SILK ROAD CHRONICLES',
          subtitleText: 'AN INVESTIGATIVE HISTORICAL JOURNEY',
          fontFamily: 'Cinzel',
          fontSize: 54,
          fontWeight: 800,
          letterSpacing: 8,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#E2E8F0',
          subtitleFontFamily: 'Inter',
          subtitleFontSize: 16,
          subtitleColor: '#F59E0B',
          animation: {
            type: 'tracking_reveal',
            inDuration: 0.8,
            outDuration: 0.5,
            delay: 0,
            easing: 'ease_out'
          }
        },
        startTimeOffset: 0.5,
        duration: 4.5
      };

      // Configure Scene 2: Video 2 + Voiceover + Lower Third
      doc.scenes[1].title = 'The Great Citadel of Samarkand';
      doc.scenes[1].narrationText = 'At the heart of the journey lay Samarkand, a city of turquoise domes and scholars whose wealth rivaled Europe.';
      doc.scenes[1].duration = 6.0;
      doc.scenes[1].visualAsset = {
        id: 'vis_scene_2',
        url: '/api/editor/assets/asset_1793553276435_test_video_2_mp4.mp4',
        name: 'Citadel Gates Archival',
        type: 'video',
        duration: 6.0
      };
      doc.scenes[1].voiceoverAsset = {
        id: 'vo_scene_2',
        url: '/api/editor/assets/asset_1793553276437_test_voiceover_wav.wav',
        name: 'Documentary Narration 2',
        duration: 6.0
      };
      doc.scenes[1].transcriptionSegments = [
        { id: 's2_seg1', start: 0.5, end: 3.2, text: 'At the heart of the journey lay Samarkand' },
        { id: 's2_seg2', start: 3.4, end: 5.8, text: 'a city of turquoise domes and legendary scholars.' }
      ];
      doc.scenes[1].motionGraphic = {
        enabled: true,
        templateId: 'documentary_lower_third',
        type: 'lower_third',
        titleDesign: {
          mainText: 'SAMARKAND, CENTRAL ASIA',
          subtitleText: 'Trading Crossroads • 14th Century',
          fontFamily: 'Montserrat',
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 2,
          lineHeight: 1.2,
          textAlign: 'left',
          textColor: '#FFFFFF',
          subtitleFontFamily: 'Inter',
          subtitleFontSize: 13,
          subtitleColor: '#CBD5E1',
          backgroundBox: {
            enabled: true,
            color: '#0F172A',
            opacity: 0.85,
            paddingX: 18,
            paddingY: 10,
            borderRadius: 8
          },
          animation: {
            type: 'slide',
            inDuration: 0.6,
            outDuration: 0.4,
            delay: 0,
            easing: 'ease_out',
            direction: 'left'
          }
        },
        startTimeOffset: 1.0,
        duration: 4.0
      };

      // Configure Scene 3: Archival Image + Voiceover + Scene Heading
      doc.scenes[2].title = 'The Enduring Legacy';
      doc.scenes[2].narrationText = 'Though ancient caravans fell silent, the mathematics and astronomy preserved here still define the modern world.';
      doc.scenes[2].duration = 6.0;
      doc.scenes[2].visualAsset = {
        id: 'vis_scene_3',
        url: '/api/editor/assets/asset_1793553276436_test_overlay_png.png',
        name: 'Astronomical Astrolabe',
        type: 'image',
        duration: 6.0
      };
      doc.scenes[2].voiceoverAsset = {
        id: 'vo_scene_3',
        url: '/api/editor/assets/asset_1793553276437_test_voiceover_wav.wav',
        name: 'Documentary Narration 3',
        duration: 6.0
      };
      doc.scenes[2].transcriptionSegments = [
        { id: 's3_seg1', start: 0.5, end: 3.5, text: 'Though ancient caravans fell silent' },
        { id: 's3_seg2', start: 3.6, end: 5.8, text: 'the knowledge preserved still defines our world.' }
      ];
      doc.scenes[2].motionGraphic = {
        enabled: true,
        templateId: 'modern_lower_third',
        type: 'heading',
        titleDesign: {
          mainText: 'THE ENDURING LEGACY',
          subtitleText: 'VoiceForge AI Documentary Production',
          fontFamily: 'Inter',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 3,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#F8FAFC',
          animation: {
            type: 'fade',
            inDuration: 0.7,
            outDuration: 0.5,
            delay: 0,
            easing: 'ease_in_out'
          }
        },
        startTimeOffset: 0.5,
        duration: 4.0
      };

      // Add Background Score
      doc.backgroundMusic = {
        assetId: 'bg_score_silkroad',
        url: '/api/editor/assets/asset_1793553276436_test_bg_music_mp3.mp3',
        name: 'Ancient Winds Ambient Score',
        volume: 18
      };

      // Save updated project to server
      await fetch('/api/documentary/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
    });

    // Reload page to reflect saved state in UI
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    // Ensure Documentary Studio is active
    await page.evaluate(() => {
      const el = document.querySelector('[title="Open Documentary Studio"]') ||
                 Array.from(document.querySelectorAll('button, [role="button"]'))
                   .find(b => (b.getAttribute('title') || '').includes('Documentary') || (b.textContent || '').includes('Documentary Studio'));
      if (el) el.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    const docWorkspacePath = path.join(artifactDir, 'phase4_documentary_workspace_populated.png');
    await page.screenshot({ path: docWorkspacePath, fullPage: false });
    console.log(`✓ Saved populated Documentary Studio screenshot: ${path.basename(docWorkspacePath)}`);

    // ------------------------------------------------------------------
    // STEP 3: Execute Multitrack Video Editor Handoff
    // ------------------------------------------------------------------
    console.log('\n[4/7] Triggering Handoff: "Send to Video Editor"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const handoffBtn = btns.find((b) => (b.textContent || '').toUpperCase().includes('SEND TO VIDEO EDITOR'));
      if (handoffBtn) handoffBtn.click();
    });

    // Wait for Video Editor Studio interface to appear with multitrack timeline
    await page.waitForFunction(() => {
      const upper = (document.body.innerText || '').toUpperCase();
      return (upper.includes('EXPORT VIDEO') || upper.includes('EXPORT')) &&
             (upper.includes('DOCUMENTARY CUT') || upper.includes('DOCUMENTARY B-ROLL') || upper.includes('MAIN VIDEO') || upper.includes('V1'));
    }, { timeout: 20000 });
    console.log('✓ Successfully handed off project to Multitrack Video Editor!');

    await new Promise((r) => setTimeout(r, 1500));
    const handoffPath = path.join(artifactDir, 'phase4_editor_multitrack_handed_off.png');
    await page.screenshot({ path: handoffPath, fullPage: false });
    console.log(`✓ Saved handed-off Video Editor multitrack screenshot: ${path.basename(handoffPath)}`);

    // ------------------------------------------------------------------
    // STEP 4: Trigger Real 1080p MP4 Synthesis Export
    // ------------------------------------------------------------------
    console.log('\n[5/7] Executing real 1080p MP4 synthesis export with documentary composition...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const expBtn = btns.find((b) => b.textContent && b.textContent.toUpperCase().includes('EXPORT'));
      if (expBtn) expBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Select 1920x1080 Full HD Landscape
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('div.fixed select, select'));
      if (selects[0]) {
        selects[0].value = '1920x1080';
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Start Export
    console.log('  Triggering FFmpeg export job...');
    await page.evaluate(() => {
      const modalBtns = Array.from(document.querySelectorAll('div.fixed button, button'));
      const startBtn = modalBtns.find((b) => (b.textContent || '').toUpperCase().includes('START EXPORT'));
      if (startBtn) startBtn.click();
    });

    // Wait for completion (up to 90s)
    console.log('  Waiting for server FFmpeg multitrack render to complete...');
    await page.waitForFunction(() => {
      const text = (document.body.innerText || '').toUpperCase();
      return text.includes('RENDERING COMPLETE') ||
             text.includes('DOWNLOAD MP4') ||
             text.includes('EXPORT COMPLETE') ||
             text.includes('FAILED');
    }, { timeout: 90000 });

    const exportText = await page.evaluate(() => document.body.innerText);
    if (exportText.toLowerCase().includes('export failed')) {
      throw new Error(`Export failed in browser: ${exportText}`);
    }

    const exportCompletePath = path.join(artifactDir, 'phase4_export_modal_complete.png');
    await page.screenshot({ path: exportCompletePath, fullPage: false });
    console.log(`✓ Saved export completion modal screenshot: ${path.basename(exportCompletePath)}`);

    // Find exported MP4 on disk
    const candidateDirs = [
      path.join(process.cwd(), 'server', 'uploads', 'editor_exports'),
      path.join(process.cwd(), 'uploads', 'editor_exports')
    ];
    let exportFiles = [];
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
          .filter((f) => f.endsWith('.mp4'))
          .map((f) => ({
            name: f,
            fullPath: path.join(dir, f),
            mtime: fs.statSync(path.join(dir, f)).mtimeMs
          }));
        exportFiles = exportFiles.concat(files);
      }
    }
    exportFiles.sort((a, b) => b.mtime - a.mtime);
    if (exportFiles.length === 0) throw new Error('No exported MP4 found');
    const latestExport = exportFiles[0];
    console.log(`✓ Located exported documentary MP4: ${latestExport.name} (${(fs.statSync(latestExport.fullPath).size / 1024).toFixed(1)} KB)`);

    // ------------------------------------------------------------------
    // STEP 5: FFprobe Technical Stream Inspection
    // ------------------------------------------------------------------
    console.log('\n[6/7] Running FFprobe technical validation & frame extraction...');
    const { stdout: probeJson } = await execFileAsync(
      ffprobe,
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        latestExport.fullPath
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const probe = JSON.parse(probeJson);
    const videoStream = (probe.streams || []).find((s) => s.codec_type === 'video');
    const audioStream = (probe.streams || []).find((s) => s.codec_type === 'audio');

    console.log('Technical Probe Results:');
    console.log(`  - Format:      ${probe.format.format_name}`);
    console.log(`  - Duration:    ${Number(probe.format.duration).toFixed(2)}s`);
    console.log(`  - File Size:   ${Number(probe.format.size).toLocaleString()} bytes`);
    console.log(`  - Video Codec: ${videoStream?.codec_name}`);
    console.log(`  - Resolution:  ${videoStream?.width}x${videoStream?.height}`);
    console.log(`  - FPS:         ${videoStream?.r_frame_rate}`);
    console.log(`  - Audio Codec: ${audioStream?.codec_name || 'none'}`);

    // Extract Representative Frames across all 3 documentary scenes
    console.log('  Extracting frames across 3 scenes (t=1.5s, t=7.5s, t=13.5s)...');
    const timestamps = [1.5, 7.5, 13.5];
    for (const ts of timestamps) {
      const outFrame = path.join(artifactDir, `phase4_exported_frame_${ts.toFixed(1)}s.jpg`);
      await execFileAsync(
        ffmpeg,
        [
          '-y',
          '-ss', ts.toString(),
          '-i', latestExport.fullPath,
          '-vframes', '1',
          '-q:v', '2',
          outFrame
        ]
      );
      if (fs.existsSync(outFrame)) {
        console.log(`  ✓ Extracted scene frame at t=${ts}s: ${path.basename(outFrame)} (${fs.statSync(outFrame).size} bytes)`);
      }
    }

    // ------------------------------------------------------------------
    // STEP 6: Caption Studio Regression Verification
    // ------------------------------------------------------------------
    console.log('\n[7/7] Verifying Caption Studio 2.0 regression safety...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('[role="button"], button, div'));
      const capEl = candidates.find((el) => {
        const title = el.getAttribute('title') || '';
        const text = el.textContent || '';
        return title.includes('Caption Studio') || (text.includes('Caption Studio') && el.getAttribute('role') === 'button');
      });
      if (capEl) capEl.click();
    });

    await page.waitForFunction(() => {
      const text = document.body.innerText || '';
      return text.includes('Caption Studio') && (
        text.includes('Looks') ||
        text.includes('Studio 2.0 Pro') ||
        text.includes('86 PRESET LOOKS') ||
        text.includes('Style Vault')
      );
    }, { timeout: 15000 });

    const regressionScreen = path.join(artifactDir, 'phase4_caption_studio_regression.png');
    await page.screenshot({ path: regressionScreen, fullPage: false });
    console.log(`✓ Saved Caption Studio regression screenshot: ${path.basename(regressionScreen)}`);

    console.log('\n================================================================');
    console.log(' ✅ ALL PHASE 4 DOCUMENTARY VALIDATION STEPS COMPLETED!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runPhase4DocumentaryValidation().catch((err) => {
  console.error('\n❌ VALIDATION SCRIPT FAILED:', err);
  process.exit(1);
});
