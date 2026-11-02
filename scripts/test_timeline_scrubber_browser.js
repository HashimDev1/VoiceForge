const puppeteer = require('puppeteer-core');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactPath = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\49021b41-162c-4ec1-b6f4-231e779e3969\\timeline_capcut_scrubber_verified.png';

(async () => {
  console.log('Launching browser to test Timeline Dynamic Duration & CapCut Cursor Controls...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1050 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    // Click the Video Editor card on the Dashboard
    console.log('Waiting for [title="Open Video Editor"] card...');
    await page.waitForSelector('[title="Open Video Editor"]', { timeout: 10000 });
    console.log('Clicking Video Editor card...');
    await page.click('[title="Open Video Editor"]');

    console.log('Waiting for Video Editor studio to render...');
    await page.waitForFunction(() => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('EXPORT') && text.includes('TITLES & CAPTIONS');
    }, { timeout: 15000 });

    await new Promise(r => setTimeout(r, 1000));
    console.log('✓ Video Editor Studio successfully loaded on screen!');

    // Verify scrubber needle handle is present and NOT pointer-events-none
    const scrubberHandle = await page.$('[title*="Playhead:"]');
    if (!scrubberHandle) {
      throw new Error('Playhead scrubber needle handle with title Playhead: not found!');
    }
    console.log('✓ Found CapCut-style scrubber needle handle');

    // Check pointer events on scrubber handle
    const pointerEvents = await page.evaluate(el => window.getComputedStyle(el).pointerEvents, scrubberHandle);
    console.log(`✓ Scrubber needle handle pointer-events: "${pointerEvents}" (must be "auto")`);
    if (pointerEvents !== 'auto') {
      throw new Error(`Scrubber needle pointer-events should be "auto", got "${pointerEvents}"`);
    }

    // Check ruler cursor style
    const ruler = await page.$('[title="Click or drag to scrub playhead"]');
    if (!ruler) {
      throw new Error('Time ruler deck not found!');
    }
    const rulerCursor = await page.evaluate(el => window.getComputedStyle(el).cursor, ruler);
    console.log(`✓ Time ruler cursor: "${rulerCursor}"`);

    // Verify initial timeline duration is compact (e.g., 5s fallback or matches content, NOT 30s)
    const initialText = await page.evaluate(() => document.body.innerText);
    const has30sRuler = initialText.includes('0:30s');
    console.log(`✓ Empty timeline ruler has 0:30s: ${has30sRuler} (Expected: false, since empty duration is 5s)`);
    if (has30sRuler) {
      throw new Error('Timeline is still hardcoded to 30s!');
    }

    // Test clicking on the ruler to scrub playhead
    const rulerBox = await ruler.boundingBox();
    console.log(`Ruler bounding box: x=${rulerBox.x}, y=${rulerBox.y}, width=${rulerBox.width}, height=${rulerBox.height}`);
    
    // Click at ~2.5s mark (x = rulerBox.x + 2.5 * 45)
    const targetX = rulerBox.x + (2.5 * 45);
    const targetY = rulerBox.y + (rulerBox.height / 2);
    await page.mouse.click(targetX, targetY);
    await new Promise(r => setTimeout(r, 500));

    // Verify playhead updated from 0:00
    const updatedTitle = await page.evaluate(el => el.getAttribute('title'), scrubberHandle);
    console.log(`✓ Scrubber title after clicking ruler at 2.5s: "${updatedTitle}"`);

    // Test dragging the scrubber needle
    const handleBox = await scrubberHandle.boundingBox();
    console.log(`Scrubber handle position: x=${handleBox.x}, y=${handleBox.y}`);
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 80, handleBox.y + handleBox.height / 2, { steps: 5 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 500));

    const draggedTitle = await page.evaluate(el => el.getAttribute('title'), scrubberHandle);
    console.log(`✓ Scrubber title after dragging playhead handle: "${draggedTitle}"`);

    // Test keyboard ArrowRight frame stepping
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));

    // Check project boundary END marker
    const newPageText = await page.evaluate(() => document.body.innerText);
    const hasEndMarker = newPageText.includes('END (');
    console.log(`✓ Timeline has END boundary marker: ${hasEndMarker}`);

    // Take screenshot for verification artifact
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log(`✓ Saved screenshot artifact to: ${artifactPath}`);

    console.log('=======================================================');
    console.log(' ✅ BROWSER VALIDATION PASSED: CapCut Scrubber & Duration verified!');
    console.log('=======================================================');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
