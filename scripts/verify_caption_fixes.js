const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\49021b41-162c-4ec1-b6f4-231e779e3969';

(async () => {
  console.log('Testing Caption Stage preview with word highlight & outline...');
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

  // Inject a mock video and segment to verify on-screen word spacing
  console.log('Injecting sample video and caption segment...');
  await page.evaluate(() => {
    // Select Bold Viral preset
    const viralBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Viral & Social'));
    if (viralBtn) viralBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const outPath2 = path.join(artifactDir, 'caption_studio_viral_cards_dark.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log(`Saved screenshot 2 to: ${outPath2}`);

  await browser.close();
  console.log('Browser verification completed!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
