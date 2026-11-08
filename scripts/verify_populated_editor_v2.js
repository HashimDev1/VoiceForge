const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\49021b41-162c-4ec1-b6f4-231e779e3969';

(async () => {
  console.log('Testing Documentary Handoff into Pro Desktop Video Editor V2...');
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

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    // Click on Documentary Studio card on Dashboard
    console.log('Finding Documentary Studio card...');
    await page.evaluate(() => {
      const el = document.querySelector('[title="Open Documentary Studio"]') ||
        Array.from(document.querySelectorAll('button, [role="button"], div'))
          .find(b => (b.getAttribute('title') || '').includes('Documentary') || (b.textContent || '').includes('Documentary Studio'));
      if (el) el.click();
    });

    // Wait for "Send to Video Editor" button in Documentary Studio
    console.log('Waiting for "Send to Video Editor" button...');
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('Send to Video Editor'));
    }, { timeout: 15000 });

    const sendBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('Send to Video Editor'));
    });

    console.log('Clicking "Send to Video Editor"...');
    await sendBtn.click();

    // Wait for Video Editor to load with populated clips
    console.log('Waiting for Video Editor to load handed-off timeline...');
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-clip-id]').length >= 2;
    }, { timeout: 15000 });

    await new Promise(r => setTimeout(r, 1500));
    console.log('✓ Handed-off multitrack project loaded in Pro Desktop Video Editor!');

    // Capture populated 5-Region desktop workspace
    const shotPath1 = path.join(artifactDir, 'desktop_workspace_v2_populated_timeline.png');
    await page.screenshot({ path: shotPath1, fullPage: false });
    console.log(`✓ Saved populated timeline screenshot: ${shotPath1}`);

    // Click on the first clip to select it
    const clips = await page.$$('[data-clip-id]');
    console.log(`Found ${clips.length} clips on timeline`);
    if (clips.length > 0) {
      console.log('Clicking first clip to select it...');
      await clips[0].click();
      await new Promise(r => setTimeout(r, 1000));

      const shotPath2 = path.join(artifactDir, 'desktop_workspace_v2_clip_selected_inspector.png');
      await page.screenshot({ path: shotPath2, fullPage: false });
      console.log(`✓ Saved selected clip screenshot with inspector: ${shotPath2}`);
    }

    console.log('✅ Visual verification complete!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
})();
