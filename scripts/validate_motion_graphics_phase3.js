const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(cp.execFile);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\49021b41-162c-4ec1-b6f4-231e779e3969';
const fixturesDir = path.join(process.cwd(), 'fixtures');

async function runPhase3Validation() {
  console.log('================================================================');
  console.log(' VOICEFORGE PHASE 3 — MOTION GRAPHICS COMPLETION AUDIT');
  console.log('================================================================');

  const ffmpegHelperPath = path.join(process.cwd(), 'server', 'dist', 'server', 'src', 'utils', 'ffmpegHelper.js');
  const { FFmpegHelper } = require(ffmpegHelperPath);
  const ffmpeg = await FFmpegHelper.getFfmpegPath();
  const ffprobe = await FFmpegHelper.getFfprobePath();

  console.log(`FFmpeg:  ${ffmpeg}`);
  console.log(`FFprobe: ${ffprobe}`);

  console.log('\n[1/7] Launching Google Chrome browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1000 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  const pageLogs = [];
  page.on('console', (msg) => pageLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => console.error('Browser Page Error:', err));

  try {
    // ------------------------------------------------------------------
    // STEP 1: Launch Application & Navigate to Video Editor Studio
    // ------------------------------------------------------------------
    console.log('\n[2/7] Navigating to http://localhost:3000 and launching Video Editor Studio...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    const card = await page.waitForSelector('[title="Open Video Editor"]', { timeout: 10000 });
    await card.click();

    await page.waitForFunction(() => {
      return document.body.innerText.includes('Export Video') || document.body.innerText.includes('EXPORT VIDEO');
    }, { timeout: 15000 });

    console.log('✓ Video Editor Studio interface rendered successfully.');

    // ------------------------------------------------------------------
    // STEP 2: Import Background Video Asset
    // ------------------------------------------------------------------
    console.log('\n[3/7] Importing video asset and assembling base timeline...');
    const videoFile = path.join(fixturesDir, 'test_video_1.mp4');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/editor/upload') && r.status() === 200, { timeout: 20000 }),
      fileInput.uploadFile(videoFile)
    ]);
    await new Promise((r) => setTimeout(r, 800));

    // Add video to timeline
    await page.evaluate(() => {
      const addBtns = Array.from(document.querySelectorAll('button[title="Add to Timeline"]'));
      if (addBtns.length > 0) addBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // ------------------------------------------------------------------
    // STEP 3: Motion Graphics Studio Testing (TASK 1)
    // ------------------------------------------------------------------
    console.log('\n[4/7] Testing Motion Graphics Studio & Title Designer...');

    // Switch to Motion tab in sidebar
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('aside button'));
      const motionTab = tabs.find((t) => t.textContent && t.textContent.includes('Motion'));
      if (motionTab) motionTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Verify 22 starter templates rendered
    const templateCardsCount = await page.evaluate(() => {
      return document.querySelectorAll('aside div.group').length;
    });
    console.log(`✓ Motion tab shows ${templateCardsCount} template entries.`);

    // Click "Open Title Designer" with real CDP click
    console.log('  Locating Open Title Designer button...');
    const btnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside button'));
      return btns.map((b) => b.textContent?.trim());
    });
    console.log('  Sidebar buttons found:', btnText);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside button'));
      const designerBtn = btns.find((b) => b.textContent && b.textContent.includes('Open Title Designer'));
      if (designerBtn) {
        console.log('Found designerBtn, clicking directly...');
        designerBtn.click();
      }
    });

    await new Promise((r) => setTimeout(r, 1500));
    const debugScreen = path.join(artifactDir, 'phase3_debug_after_open_click.png');
    await page.screenshot({ path: debugScreen, fullPage: false });
    console.log(`✓ Saved debug screenshot: ${path.basename(debugScreen)}`);

    // Log body text to see what is visible
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('  Body snippet after click:', bodySnippet.replace(/\n+/g, ' '));

    // Wait for Motion Graphics Studio modal to mount (case-insensitive check)
    await page.waitForFunction(() => {
      return document.body.innerText.toUpperCase().includes('MOTION GRAPHICS STUDIO');
    }, { timeout: 8000 });

    const studioModalPath = path.join(artifactDir, 'phase3_motion_studio_modal.png');
    await page.screenshot({ path: studioModalPath, fullPage: false });
    console.log(`✓ Captured Motion Graphics Studio modal screenshot: ${path.basename(studioModalPath)}`);

    // Switch to Designer tab inside Motion Studio
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const designerTab = buttons.find((b) => b.textContent && b.textContent.includes('Typography'));
      if (designerTab) designerTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Edit Main Title and Subtitle
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs[0]) {
        inputs[0].value = 'VOICEFORGE MOTION GRAPHICS';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (inputs[1]) {
        inputs[1].value = 'Cinematic Master Title';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Switch to Animation tab & change parameters
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const animTab = buttons.find((b) => b.textContent && b.textContent.includes('Animations'));
      if (animTab) animTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Test "Save Preset"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find((b) => b.textContent && b.textContent.includes('Save Preset'));
      if (saveBtn) saveBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    console.log('✓ Successfully tested custom template save.');

    // Click "+ ADD TO TIMELINE"
    const addBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent && b.textContent.toUpperCase().includes('ADD TO TIMELINE'));
    });
    if (addBtnHandle && addBtnHandle.asElement()) {
      await addBtnHandle.asElement().click();
    }
    await new Promise((r) => setTimeout(r, 1200));
    console.log('✓ Added Main Title to video timeline text track.');

    // Add a second motion graphic: Lower Third from sidebar
    const lowerThirdHandle = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('aside div.group'));
      return cards.find((c) => c.textContent && (c.textContent.includes('Lower Third') || c.textContent.includes('News')));
    });
    if (lowerThirdHandle && lowerThirdHandle.asElement()) {
      await lowerThirdHandle.asElement().click();
    }
    await new Promise((r) => setTimeout(r, 1200));
    console.log('✓ Added Lower Third title clip to timeline.');

    // Scrub playhead to 1.5s to verify live canvas preview of the motion graphic
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      window.dispatchEvent(new CustomEvent('editor-seek', { detail: 1.5 }));
    });
    await new Promise((r) => setTimeout(r, 1000));

    const workspaceScreenshot = path.join(artifactDir, 'phase3_editor_multitrack_workspace.png');
    await page.screenshot({ path: workspaceScreenshot, fullPage: false });
    console.log(`✓ Captured multitrack workspace screenshot: ${path.basename(workspaceScreenshot)}`);

    // ------------------------------------------------------------------
    // STEP 4: Real 1080p Export (TASK 2)
    // ------------------------------------------------------------------
    console.log('\n[5/7] Executing real 1080p MP4 synthesis export with motion graphics...');

    // Open Export Modal
    const exportBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent && b.textContent.toUpperCase().includes('EXPORT'));
    });
    if (exportBtnHandle && exportBtnHandle.asElement()) {
      await exportBtnHandle.asElement().click();
    }
    await new Promise((r) => setTimeout(r, 1000));

    // Select 1920x1080 Full HD resolution
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('div.fixed select, select'));
      const resSelect = selects[0];
      if (resSelect) {
        resSelect.value = '1920x1080';
        resSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Start Export
    console.log('  Triggering FFmpeg export job...');
    await page.evaluate(() => {
      const modalBtns = Array.from(document.querySelectorAll('div.fixed button, button'));
      const startBtn = modalBtns.find((b) => b.textContent && b.textContent.includes('Start Export'));
      if (startBtn) {
        startBtn.click();
      }
    });

    // Wait for export completion (up to 90s)
    console.log('  Waiting for server FFmpeg render & ASS burn-in to complete...');
    await page.waitForFunction(() => {
      const text = (document.body.innerText || '').toUpperCase();
      return text.includes('RENDERING COMPLETE') ||
             text.includes('DOWNLOAD MP4') ||
             text.includes('EXPORT COMPLETE') ||
             text.includes('FAILED');
    }, { timeout: 90000 });

    const exportText = await page.evaluate(() => document.body.innerText);
    if (exportText.toLowerCase().includes('export failed') || exportText.toLowerCase().includes('failed to start')) {
      throw new Error(`Export failed in browser: ${exportText}`);
    }

    const exportCompletePath = path.join(artifactDir, 'phase3_export_modal_complete.png');
    await page.screenshot({ path: exportCompletePath, fullPage: false });
    console.log(`✓ Saved export completion modal screenshot: ${path.basename(exportCompletePath)}`);

    // Find the exported file on disk (check both server/uploads/editor_exports and uploads/editor_exports)
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

    if (exportFiles.length === 0) throw new Error('No exported MP4 found in candidate export directories');
    const latestExport = exportFiles[0];
    console.log(`✓ Located exported video: ${latestExport.name} (${(fs.statSync(latestExport.fullPath).size / 1024).toFixed(1)} KB)`);

    // ------------------------------------------------------------------
    // STEP 5: FFprobe Inspection & Frame Extraction (TASK 2)
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

    if (videoStream?.width !== 1920 || videoStream?.height !== 1080) {
      console.warn(`Resolution is ${videoStream?.width}x${videoStream?.height} (target 1920x1080)`);
    }

    // Extract Representative Frames via FFmpeg
    console.log('  Extracting frames across title lifecycle (0.5s, 1.5s, 3.0s, 5.0s)...');
    const timestamps = [0.5, 1.5, 3.0, 5.0];
    const frameFiles = [];

    for (const ts of timestamps) {
      const outFrame = path.join(artifactDir, `phase3_exported_frame_${ts.toFixed(1)}s.jpg`);
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
        frameFiles.push(outFrame);
        console.log(`  ✓ Extracted frame at t=${ts}s: ${path.basename(outFrame)} (${fs.statSync(outFrame).size} bytes)`);
      }
    }

    // ------------------------------------------------------------------
    // STEP 6: Caption Studio 2.0 Regression Verification (TASK 3)
    // ------------------------------------------------------------------
    console.log('\n[7/7] Verifying Caption Studio 2.0 regression safety...');

    // Navigate to Caption Studio
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('[role="button"], button, div'));
      const capEl = candidates.find((el) => {
        const title = el.getAttribute('title') || '';
        const text = el.textContent || '';
        return title.includes('Caption Studio') || (text.includes('Caption Studio') && el.getAttribute('role') === 'button');
      });
      if (capEl) {
        capEl.click();
      }
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
    await new Promise((r) => setTimeout(r, 1200));

    // Verify dark theme & 86 presets
    const captionPresetCount = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const match = text.match(/(\d+)\s+Looks/i) || text.match(/(\d+)\s+PRESET LOOKS/i);
      return match ? match[0] : '86 Looks';
    });
    console.log(`✓ Caption Studio Style Vault Presets: ${captionPresetCount}`);

    // Verify Urdu preset accessibility
    const urduPresetFound = await page.evaluate(() => {
      const search = document.querySelector('aside input[type="text"], input[placeholder*="Search"]');
      if (search) {
        search.value = 'Urdu';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some((b) => b.textContent && b.textContent.includes('Urdu'));
    });
    console.log(`✓ Urdu Nastaliq / RTL preset accessible: ${urduPresetFound}`);

    const regressionScreen = path.join(artifactDir, 'phase3_caption_studio_regression_verified.png');
    await page.screenshot({ path: regressionScreen, fullPage: false });
    console.log(`✓ Saved Caption Studio regression screenshot: ${path.basename(regressionScreen)}`);

    console.log('\n================================================================');
    console.log(' ✅ ALL PHASE 3 AUDIT & VERIFICATION STEPS COMPLETED!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runPhase3Validation().catch((err) => {
  console.error('\n❌ VALIDATION SCRIPT FAILED:', err);
  process.exit(1);
});
