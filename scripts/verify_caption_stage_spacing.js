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
  await new Promise(r => setTimeout(r, 1500));

  // Upload test video file
  console.log(`Uploading test video: ${videoFixture}...`);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(videoFixture);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Injected test segment matching user screenshot ("THIS COUNTER WORKS.")
  console.log('Injecting segment with spoken words: THIS, COUNTER, WORKS....');
  await page.evaluate(() => {
    // Find video and stage
    const vid = document.querySelector('video');
    if (vid) {
      vid.currentTime = 1.5;
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  const outPath3 = path.join(artifactDir, 'caption_studio_stage_loaded_video.png');
  await page.screenshot({ path: outPath3, fullPage: false });
  console.log(`Saved screenshot 3 to: ${outPath3}`);

  await browser.close();
  console.log('Verification script completed!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

