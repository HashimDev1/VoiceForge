const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\bf778c05-056d-4cfe-9e80-eb40f2062fb6';
const outputPath = path.join(artifactDir, 'capcut_editor_with_clips.png');

async function run() {
  const debugPort = 9222;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1440,900',
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

    // Click on the "Text" tab in the Left Sidebar
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const textTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Text');
          if (textTab) {
            textTab.click();
            return 'text tab clicked';
          }
          return 'text tab not found';
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Click on the first Text preset to add a clip to the timeline
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const presetCards = Array.from(document.querySelectorAll('div, button')).filter(el => el.textContent && el.textContent.includes('CAPCUT TITLE'));
          if (presetCards.length > 0) {
            presetCards[0].click();
            return 'preset clicked';
          }
          return 'preset not found';
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Select the newly added clip on the timeline
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const clip = document.querySelector('[data-clip-id]');
          if (clip) {
            clip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            return 'clip clicked';
          }
          return 'clip not found';
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      fs.writeFileSync(outputPath, Buffer.from(shot.data, 'base64'));
      console.log('Populated CapCut Editor screenshot written to:', outputPath);
    }

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

run();
