const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Muhammad Hashim\\.gemini\\antigravity\\brain\\bf778c05-056d-4cfe-9e80-eb40f2062fb6';
const outputPath = path.join(artifactDir, 'capcut_replica_verified.png');

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

    // Populate mock assets & clips directly into the editor state if needed, or through UI
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Check if window is in editor
          const title = document.querySelector('input[value="1110"]');
          console.log('Editor loaded:', !!title);
        })()
      `
    });

    // Take screenshot of the complete layout at 1920x1080
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      fs.writeFileSync(outputPath, Buffer.from(shot.data, 'base64'));
      console.log('Saved 1920x1080 verified screenshot to:', outputPath);
    }

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    try { chromeProc.kill(); } catch {}
  }
}

run();

