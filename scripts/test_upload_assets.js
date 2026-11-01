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
    console.log('Video Editor ready. Uploading fixtures...');

    const files = [
      path.join(fixturesDir, 'test_video_1.mp4'),
      path.join(fixturesDir, 'test_video_2.mp4'),
      path.join(fixturesDir, 'test_overlay.png'),
      path.join(fixturesDir, 'test_voiceover.wav'),
      path.join(fixturesDir, 'test_bg_music.mp3')
    ];

    for (const f of files) {
      console.log('Uploading:', path.basename(f));
      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) throw new Error('File input not found');

      const [res] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/editor/upload') && r.status() === 200, { timeout: 20000 }),
        fileInput.uploadFile(f)
      ]);
      console.log('Upload response status:', res.status());
      await new Promise(r => setTimeout(r, 600));
    }

    const assetsCount = await page.evaluate(() => {
      // Find all asset cards in sidebar
      return document.querySelectorAll('button[title="Add to Timeline"]').length;
    });
    console.log(`Uploaded assets count in sidebar: ${assetsCount}`);

    await page.screenshot({ path: 'scripts/debug_uploaded.png' });
    console.log('Screenshot saved to scripts/debug_uploaded.png');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Upload test failed:', err);
  process.exit(1);
});

