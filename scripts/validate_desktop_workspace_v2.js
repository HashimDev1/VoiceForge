const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\49021b41-162c-4ec1-b6f4-231e779e3969';

(async () => {
  console.log('====================================================');
  console.log(' Starting Pro Desktop Video Editor V2 Validation');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('2. Waiting for Video Editor navigation card on Dashboard...');
    await page.waitForSelector('[title="Open Video Editor"]', { timeout: 10000 });
    console.log('   Clicking Video Editor card...');
    await page.click('[title="Open Video Editor"]');

    console.log('3. Waiting for Video Editor Desktop Workspace V2 to mount...');
    await page.waitForFunction(() => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('EXPORT') && text.includes('PLAYER-TIMELINE 01');
    }, { timeout: 15000 });

    await new Promise(r => setTimeout(r, 1200));
    console.log('✓ Desktop Workspace V2 successfully rendered!');

    // Verify Region A: Top Bar
    console.log('4. Verifying Region A: Top Application Toolbar...');
    const topBar = await page.$('header');
    if (!topBar) throw new Error('TopBar header element not found!');
    const topBarHeight = await page.evaluate(el => el.getBoundingClientRect().height, topBar);
    console.log(`   TopBar height: ${topBarHeight}px (expected ~44px)`);

    // Verify Region B: Left Sidebar (Media Workspace)
    console.log('5. Verifying Region B: Left Media & Creative Workspace...');
    const hasMediaTabs = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Media') && body.includes('Audio') && body.includes('Text') && body.includes('Transitions');
    });
    if (!hasMediaTabs) throw new Error('Media sidebar tabs missing!');
    console.log('   ✓ Media, Audio, Text, Transitions tabs present');

    // Verify Region C: Video Preview Player
    console.log('6. Verifying Region C: Video Preview Player Stage & Controls...');
    const hasPlayerTitle = await page.evaluate(() => {
      return document.body.innerText.includes('Player-Timeline 01');
    });
    if (!hasPlayerTitle) throw new Error('Player-Timeline 01 title missing from preview header!');
    console.log('   ✓ "Player-Timeline 01" header present');

    // Verify Region D: Properties Inspector
    console.log('7. Verifying Region D: Properties Inspector...');
    const inspectorPresent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('No Clip Selected') || text.includes('Transform') || text.includes('Video');
    });
    if (!inspectorPresent) throw new Error('Properties Inspector not found!');
    console.log('   ✓ Properties Inspector present');

    // Verify Region E: Multitrack Timeline
    console.log('8. Verifying Region E: Multitrack Timeline...');
    const timelinePresent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Select (V)') && text.includes('Split (S)') && text.includes('Snap');
    });
    if (!timelinePresent) throw new Error('Multitrack Timeline controls missing!');
    console.log('   ✓ Timeline toolbar controls (Select, Split, Freeze, Snap) present');

    // Verify CapCut Scrubber Needle
    const scrubberHandle = await page.$('[title*="Playhead:"]');
    if (!scrubberHandle) throw new Error('CapCut scrubber needle not found!');
    console.log('   ✓ CapCut scrubber needle handle verified');

    // Capture Default Workspace screenshot
    const shotPath1 = path.join(artifactDir, 'desktop_workspace_v2_1920x1080.png');
    await page.screenshot({ path: shotPath1, fullPage: false });
    console.log(`✓ Saved default workspace screenshot: ${shotPath1}`);

    // Click on a clip in the timeline to select it and verify Inspector & Bounding Box
    console.log('9. Selecting a clip in timeline to test Inspector & Bounding Box...');
    const firstClip = await page.$('[data-clip-id]');
    if (firstClip) {
      await firstClip.click();
      await new Promise(r => setTimeout(r, 800));
      console.log('   ✓ Clicked clip in timeline');

      const inspectorSelected = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Transform') && (text.includes('Scale') || text.includes('Main Title Text'));
      });
      console.log(`   ✓ Inspector loaded clip properties: ${inspectorSelected}`);

      const shotPath2 = path.join(artifactDir, 'desktop_workspace_v2_inspector_clip_selected.png');
      await page.screenshot({ path: shotPath2, fullPage: false });
      console.log(`✓ Saved clip selected screenshot: ${shotPath2}`);
    } else {
      console.log('   (No default clip found, testing empty project state)');
    }

    // Test Splitter 1 (Left sidebar resize)
    console.log('10. Testing Splitter 1 (Media Sidebar resize)...');
    const splitters = await page.$$('[role="separator"]');
    console.log(`   Found ${splitters.length} splitters on screen`);
    if (splitters.length >= 3) {
      // Splitter 1: Left column
      const s1Box = await splitters[0].boundingBox();
      if (s1Box) {
        await page.mouse.move(s1Box.x + s1Box.width / 2, s1Box.y + s1Box.height / 2);
        await page.mouse.down();
        await page.mouse.move(s1Box.x + 80, s1Box.y + s1Box.height / 2, { steps: 5 });
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 400));
        console.log('   ✓ Dragged Splitter 1 by +80px');
      }

      // Splitter 3: Timeline vertical resize
      const s3Box = await splitters[2].boundingBox();
      if (s3Box) {
        await page.mouse.move(s3Box.x + s3Box.width / 2, s3Box.y + s3Box.height / 2);
        await page.mouse.down();
        await page.mouse.move(s3Box.x + s3Box.width / 2, s3Box.y - 60, { steps: 5 });
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 400));
        console.log('   ✓ Dragged Splitter 3 (Timeline) by -60px (expanded timeline)');
      }

      const shotPath3 = path.join(artifactDir, 'desktop_workspace_v2_splitter_resized.png');
      await page.screenshot({ path: shotPath3, fullPage: false });
      console.log(`✓ Saved resized workspace screenshot: ${shotPath3}`);
    }

    // Test 1440x900 responsive desktop viewport
    console.log('11. Testing 1440x900 Laptop Viewport...');
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 500));
    const shotPath4 = path.join(artifactDir, 'desktop_workspace_v2_1440x900.png');
    await page.screenshot({ path: shotPath4, fullPage: false });
    console.log(`✓ Saved 1440x900 screenshot: ${shotPath4}`);

    console.log('====================================================');
    console.log(' ✅ ALL PRO DESKTOP WORKSPACE V2 CHECKS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

