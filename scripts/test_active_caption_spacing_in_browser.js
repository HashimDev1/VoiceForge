const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\49021b41-162c-4ec1-b6f4-231e779e3969';
const videoFixture = path.join(process.cwd(), 'fixtures', 'test_video_1.mp4');

(async () => {
  console.log('Testing Caption Stage preview with video fixture...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1500, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

  // Open Caption Studio
  await page.waitForSelector('[title="Open Caption Studio"]', { timeout: 10000 });
  await page.click('[title="Open Caption Studio"]');

  await page.waitForSelector('aside', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Upload test video file
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(videoFixture);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Switch aspect ratio to 16:9 Landscape (matching user screenshot)
  console.log('Switching to 16:9 Landscape...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn169 = btns.find(b => b.textContent && b.textContent.includes('16:9 Landscape'));
    if (btn169) btn169.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const outPath = path.join(artifactDir, 'caption_studio_stage_16_9_landscape.png');
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved screenshot to: ${outPath}`);

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

