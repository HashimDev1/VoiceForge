const puppeteer = require('puppeteer-core');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('Launching browser test...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1050 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded, current title:', await page.title());

    // Click Video Editor card
    console.log('Waiting for [title="Open Video Editor"]...');
    const card = await page.waitForSelector('[title="Open Video Editor"]', { timeout: 10000 });
    console.log('Card found, clicking...');
    await card.click();

    console.log('Waiting for Video Editor studio to render...');
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Export Video') && document.body.innerText.includes('Titles & Captions');
    }, { timeout: 15000 });

    console.log('SUCCESS! Video Editor Studio loaded in browser!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

