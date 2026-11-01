const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    const el = document.querySelector('[title="Open Documentary Studio"]');
    if (el) el.click();
  });
  
  await new Promise(r => setTimeout(r, 1500));
  console.log('Documentary Studio opened. Now clicking Send to Video Editor...');

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Send to Video Editor'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 2500));
  const text = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT AFTER HANDOFF:\n', text.substring(0, 800));
  await browser.close();
}

test().catch(console.error);
