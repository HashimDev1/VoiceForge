const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\bf778c05-056d-4cfe-9e80-eb40f2062fb6';

async function run() {
  const debugPort = 9222;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1920,1080',
    '--hide-scrollbars',
    'http://localhost:3000'
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${debugPort}/json`, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (msg) => {
          const parsed = JSON.parse(msg);
          if (parsed.id === id) {
            ws.off('message', handler);
            resolve(parsed.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Open video editor
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[title="Open Video Editor"]');
          if (btn) btn.click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Click "Text" tab
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const textTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Text');
          if (textTab) textTab.click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Click on preset to add clip
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const presetCards = Array.from(document.querySelectorAll('div, button')).filter(el => el.textContent && el.textContent.includes('CAPCUT TITLE'));
          if (presetCards.length > 0) presetCards[0].click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Click on clip to select it and show dark CapCut inspector
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const clip = document.querySelector('[data-clip-id]');
          if (clip) clip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Screenshot 1: CapCut Editor with selected clip and dark inspector
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    if (shot1 && shot1.data) {
      fs.writeFileSync(path.join(artifactDir, 'final_capcut_editor_dark.png'), Buffer.from(shot1.data, 'base64'));
      console.log('Saved final_capcut_editor_dark.png');
    }

    // Now click Smart Bulk button in sidebar to verify dark modal
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Switch back to Media tab
          const mediaTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Media');
          if (mediaTab) mediaTab.click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1000));

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const bulkBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Smart Bulk'));
          if (bulkBtn) bulkBtn.click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Screenshot 2: Smart Bulk modal in dark CapCut style
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    if (shot2 && shot2.data) {
      fs.writeFileSync(path.join(artifactDir, 'final_smart_bulk_dark.png'), Buffer.from(shot2.data, 'base64'));
      console.log('Saved final_smart_bulk_dark.png');
    }

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    try { chromeProc.kill(); } catch {}
  }
}

run();

