const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fixturesDir = path.join(process.cwd(), 'fixtures');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1050 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    const card = await page.waitForSelector('[title="Open Video Editor"]', { timeout: 10000 });
    await card.click();

    await page.waitForFunction(() => document.body.innerText.includes('New Video Project'), { timeout: 10000 });

    const files = [
      path.join(fixturesDir, 'test_video_1.mp4'),
      path.join(fixturesDir, 'test_video_2.mp4'),
      path.join(fixturesDir, 'test_overlay.png'),
      path.join(fixturesDir, 'test_voiceover.wav'),
      path.join(fixturesDir, 'test_bg_music.mp3')
    ];

    for (const f of files) {
      const fileInput = await page.$('input[type="file"]');
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/editor/upload') && r.status() === 200, { timeout: 20000 }),
        fileInput.uploadFile(f)
      ]);
      await new Promise(r => setTimeout(r, 400));
    }

    console.log('Assets uploaded. Clicking "Add to Timeline" for remaining assets...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[title="Add to Timeline"]'));
      // The first video was already added on empty timeline, but let's click all other add buttons
      // Assets in order: bg_music, voiceover, overlay, video_2, video_1 (reversed or sorted)
      btns.forEach((btn, idx) => {
        // click assets
        btn.click();
      });
    });
    await new Promise(r => setTimeout(r, 600));

    // Click "Text" tab and add a text caption
    console.log('Adding animated text title...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('aside button'));
      const textTab = tabs.find(t => t.textContent && t.textContent.includes('Text'));
      if (textTab) textTab.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Click first text preset
    await page.evaluate(() => {
      const presets = Array.from(document.querySelectorAll('aside .group'));
      if (presets.length > 0) presets[0].click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Check timeline clips
    const clipsCount = await page.evaluate(() => {
      return document.querySelectorAll('[class*="group absolute"][class*="rounded-lg"]').length;
    });
    console.log(`Clips currently on timeline: ${clipsCount}`);

    // Click a clip to select it
    await page.evaluate(() => {
      const clip = document.querySelector('[class*="group absolute"][class*="rounded-lg"]');
      if (clip) clip.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Attach Transition: Click Transit tab and pick Cross Dissolve
    console.log('Attaching transition...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('aside button'));
      const transTab = tabs.find(t => t.textContent && t.textContent.includes('Transit'));
      if (transTab) transTab.click();
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      const transBtns = Array.from(document.querySelectorAll('aside button'));
      const dissolve = transBtns.find(b => b.textContent && b.textContent.includes('Cross Dissolve'));
      if (dissolve) dissolve.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Attach Color / Effect: Click Effects tab and pick Vignette
    console.log('Attaching effect...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('aside button'));
      const effTab = tabs.find(t => t.textContent && t.textContent.includes('Effects'));
      if (effTab) effTab.click();
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      const effBtns = Array.from(document.querySelectorAll('aside button'));
      const vignette = effBtns.find(b => b.textContent && b.textContent.includes('Vignette'));
      if (vignette) vignette.click();
    });
    await new Promise(r => setTimeout(r, 400));

    await page.screenshot({ path: 'scripts/debug_composed.png' });
    console.log('Screenshot saved to scripts/debug_composed.png');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Compose test failed:', err);
  process.exit(1);
});

