const puppeteer = require('puppeteer-core');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
    console.log('Page loaded');

    const card = await page.waitForSelector('[title="Open Video Editor"]', { timeout: 10000 });
    console.log('Card found, clicking...');
    await card.click();

    await new Promise(r => setTimeout(r, 2000));
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body text snippet:\n', bodyText.slice(0, 500));
    
    await page.screenshot({ path: 'scripts/debug_click.png' });
    console.log('Screenshot saved to scripts/debug_click.png');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Debug script failed:', err);
  process.exit(1);
});

