const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\bf778c05-056d-4cfe-9e80-eb40f2062fb6';
const outputPath = path.join(artifactDir, 'capcut_editor_redesign.png');

// Use chrome headless with remote debugging to navigate to video-editor and take a full screenshot
async function run() {
  const debugPort = 9222;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1440,900',
    '--hide-scrollbars',
    'http://localhost:3000'
  ]);

  console.log('Chrome spawned, waiting for debugging port...');
  await new Promise((r) => setTimeout(r, 2000));

  try {
    // Get list of targets
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${debugPort}/json`, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const wsUrl = pageTarget.webSocketDebuggerUrl;
    console.log('Connecting to WebSocket:', wsUrl);

    // Simple WebSocket client using built-in or basic ws
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);

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

    // Wait for page load
    await new Promise((r) => setTimeout(r, 1500));

    // Execute script to click Video Editor card on Dashboard
    const clickResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[title="Open Video Editor"]');
          if (btn) {
            btn.click();
            return 'clicked';
          }
          return 'not found';
        })()
      `
    });
    console.log('Click result:', clickResult);

    // Click "Smart Bulk" button to show the Smart Bulk arrangement dialog, or add sample media
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Check if Smart Bulk button exists
          const smartBulkBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Smart Bulk'));
          if (smartBulkBtns.length > 0) {
            smartBulkBtns[0].click();
            return 'smart bulk opened';
          }
          return 'button not found';
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Capture screenshot of Smart Bulk Arrange Modal
    const shotModal = await send('Page.captureScreenshot', { format: 'png' });
    if (shotModal && shotModal.data) {
      const modalPath = path.join(artifactDir, 'capcut_smart_bulk_modal.png');
      fs.writeFileSync(modalPath, Buffer.from(shotModal.data, 'base64'));
      console.log('Smart Bulk Modal screenshot written to:', modalPath);
    }

    // Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      fs.writeFileSync(outputPath, Buffer.from(shot.data, 'base64'));
      console.log('Screenshot successfully written to:', outputPath);
    }
    ws.close();
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

run();
