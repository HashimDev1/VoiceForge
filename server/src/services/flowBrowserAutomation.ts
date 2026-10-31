import fs from 'fs';
import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { FlowAccount, FlowJob } from '../../../shared/src/types';
import { FlowAccountService } from './flowAccountService';
import { FlowStorageService } from './flowStorageService';
import { logger } from '../utils/logger';

export interface FlowExecutionResult {
  success: boolean;
  outputFilePath?: string;
  mediaType: 'image' | 'video';
  error?: string;
  needsAttention?: boolean;
  actionRequired?: string;
}

export class FlowBrowserAutomation {
  private static activeBrowser: Browser | null = null;
  private static activeAccountSlot: number | null = null;

  /**
   * Connect to existing debuggable Chrome session or launch a new debuggable instance
   */
  public static async getOrLaunchSession(
    account: FlowAccount,
    targetUrl: string = 'https://flow.google.com'
  ): Promise<{ browser: Browser; page: Page }> {
    const port = FlowAccountService.getDebuggingPortForAccount(account);
    const browserUrl = `http://127.0.0.1:${port}`;

    // 1. Check if Chrome CDP is already listening
    let isReady = await FlowAccountService.isCdpReady(port);

    if (!isReady) {
      logger.info(`[FlowAutomation] Chrome CDP not detected on port ${port}. Launching Chrome...`);
      await FlowAccountService.launchChromeProfile(account.id, targetUrl);

      // Wait up to 12 seconds for CDP endpoint to respond
      const startWait = Date.now();
      while (!isReady && Date.now() - startWait < 12000) {
        await new Promise((r) => setTimeout(r, 800));
        isReady = await FlowAccountService.isCdpReady(port);
      }

      if (!isReady) {
        throw new Error(
          `Could not connect to Google Chrome via DevTools Protocol on port ${port}. Please ensure Chrome is running or click 'Open in Chrome'.`
        );
      }
    }

    // 2. Connect Puppeteer to the running Chrome instance
    let browser: Browser;
    try {
      browser = await puppeteer.connect({
        browserURL: browserUrl,
        defaultViewport: null
      });
      this.activeBrowser = browser;
      this.activeAccountSlot = account.slotNumber;
    } catch (err: any) {
      logger.error(`[FlowAutomation] Failed to connect to Chrome at ${browserUrl}:`, err);
      throw new Error(`Failed to attach to Chrome session: ${err.message}`);
    }

    // 3. Find an existing Flow tab or create one
    const pages = await browser.pages();
    let flowPage = pages.find((p) => {
      const u = p.url();
      return u.includes('flow.google.com') || u.includes('labs.google/fx/tools/flow');
    });

    if (!flowPage) {
      if (pages.length > 0 && (pages[0].url() === 'about:blank' || pages[0].url() === 'chrome://newtab/')) {
        flowPage = pages[0];
      } else {
        flowPage = await browser.newPage();
      }
      logger.info(`[FlowAutomation] Navigating to ${targetUrl}...`);
      await flowPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      await flowPage.bringToFront();
    }

    return { browser, page: flowPage };
  }

  /**
   * Verify if the active page has an authenticated Google Flow session
   */
  public static async verifyAuthentication(page: Page): Promise<{
    authenticated: boolean;
    redirectUrl?: string;
    message?: string;
  }> {
    const currentUrl = page.url();

    // Check if redirected to Google Accounts login, verification, or landing about page
    if (
      currentUrl.includes('accounts.google.com') ||
      currentUrl.includes('/signin') ||
      currentUrl.includes('/ServiceLogin') ||
      currentUrl.includes('google.com/auth') ||
      currentUrl.includes('flow.google.com/about')
    ) {
      return {
        authenticated: false,
        redirectUrl: currentUrl,
        message: 'Google Flow requires sign-in. Please log in with your Google Flow Pro account in the open Chrome window.'
      };
    }

    // Check for sign-in button or link prompts inside page
    const hasSignInPrompt = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const hasSignInEl = links.some((el) => {
        const htmlEl = el as HTMLElement;
        const text = (htmlEl.innerText || htmlEl.textContent || htmlEl.getAttribute('aria-label') || '').trim().toLowerCase();
        const href = (htmlEl.getAttribute('href') || '').toLowerCase();
        return (
          text === 'sign in' ||
          text.includes('sign in to continue') ||
          text.includes('sign in with google') ||
          href.includes('accounts.google.com/servicelogin')
        );
      });
      return hasSignInEl;
    }).catch(() => false);

    if (hasSignInPrompt) {
      return {
        authenticated: false,
        message: 'Google Flow sign-in prompt detected. Please sign in in the open Chrome window.'
      };
    }

    return { authenticated: true };
  }

  /**
   * Configure isolated download directory for this specific job via CDP
   */
  public static async configureDownloadDirectory(page: Page, jobId: string): Promise<string> {
    FlowStorageService.initStorage();
    const jobDownloadDir = path.resolve(FlowStorageService.tempDir, 'downloads', jobId);
    if (!fs.existsSync(jobDownloadDir)) {
      fs.mkdirSync(jobDownloadDir, { recursive: true });
    }

    try {
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: jobDownloadDir
      });
    } catch (e: any) {
      logger.warn(`[FlowAutomation] Could not set download behavior via CDP: ${e.message}`);
    }

    return jobDownloadDir;
  }

  /**
   * Main generation runner in Google Flow Pro
   */
  public static async executeJob(
    job: FlowJob,
    account: FlowAccount,
    onProgress: (percent: number, message: string) => Promise<void>
  ): Promise<FlowExecutionResult> {
    const mediaType: 'image' | 'video' = job.mediaType || (job.imageUrl && !job.videoUrl ? 'video' : 'video');
    const isVideo = mediaType === 'video';

    await onProgress(15, `Connecting to Google Chrome session for ${account.name}...`);

    let session: { browser: Browser; page: Page };
    try {
      session = await this.getOrLaunchSession(account);
    } catch (connErr: any) {
      return {
        success: false,
        mediaType,
        needsAttention: true,
        actionRequired: connErr.message || 'Please launch Chrome with the Flow profile.'
      };
    }

    const { page } = session;

    // 1. Verify user authentication
    await onProgress(25, 'Checking Google Flow Pro authentication status...');
    const authStatus = await this.verifyAuthentication(page);
    if (!authStatus.authenticated) {
      return {
        success: false,
        mediaType,
        needsAttention: true,
        actionRequired: authStatus.message || 'Please sign in to Google Flow in the open Chrome window and click Resume.'
      };
    }

    // 2. Set up isolated download directory
    const jobDownloadDir = await this.configureDownloadDirectory(page, job.id);

    // 3. Listen for media responses over CDP
    let capturedMediaBuffer: { buffer: Buffer; mimeType: string; filename?: string } | null = null;
    const responseListener = async (response: any) => {
      try {
        const ct = (response.headers()['content-type'] || '').toLowerCase();
        const url = response.url().toLowerCase();

        // Capture genuine video stream or high-res image
        const isCandidateVideo = ct.includes('video/') || url.includes('.mp4') || url.includes('.webm');
        const isCandidateImage =
          (ct.includes('image/jpeg') || ct.includes('image/png') || ct.includes('image/webp')) &&
          !url.includes('avatar') &&
          !url.includes('icon') &&
          !url.includes('favicon') &&
          !url.includes('.svg');

        if ((isVideo && isCandidateVideo) || (!isVideo && isCandidateImage)) {
          if (response.status() === 200) {
            const buf = await response.buffer();
            if (buf && buf.length > 30000) {
              capturedMediaBuffer = {
                buffer: buf,
                mimeType: ct || (isVideo ? 'video/mp4' : 'image/jpeg')
              };
              logger.info(`[FlowAutomation] Captured genuine media response over CDP (${buf.length} bytes, ${ct})`);
            }
          }
        }
      } catch (e) {
        // Stream reading errors from aborted / non-bufferable responses can be safely ignored
      }
    };

    page.on('response', responseListener);

    try {
      await onProgress(40, `Staging prompt in Google Flow: "${job.prompt.slice(0, 50)}..."`);

      // 4. Inject prompt into Google Flow interactive UI
      const inputSuccess = await this.injectPrompt(page, job.prompt);
      if (!inputSuccess) {
        logger.warn('[FlowAutomation] Could not auto-detect standard prompt input. Leaving tab open for user review.');
        await onProgress(50, 'Prompt ready. Waiting for generation trigger in Google Flow...');
      } else {
        await onProgress(60, 'Prompt submitted. Generation initiated in Google Flow Pro...');
        await this.triggerGenerate(page);
      }

      // 5. Monitor for completion (isolated download file, network capture, or DOM export)
      await onProgress(75, `Generating ${isVideo ? 'video' : 'image'} in Google Flow Pro... Monitoring output.`);

      const finalFile = await this.waitForMediaOutput(
        page,
        job.id,
        jobDownloadDir,
        isVideo,
        () => capturedMediaBuffer,
        async (pct, msg) => {
          await onProgress(pct, msg);
        }
      );

      page.off('response', responseListener);

      if (!finalFile) {
        return {
          success: false,
          mediaType,
          needsAttention: true,
          actionRequired:
            'Generation did not produce a downloadable file within the timeout. If completed in Google Flow, you can use "Import Result" to save it.'
        };
      }

      // 6. Save genuine output into FlowStorageService permanent directory
      const ext = path.extname(finalFile).toLowerCase() || (isVideo ? '.mp4' : '.jpg');
      const safeFilename = `${job.id}${ext}`;
      let targetPath: string;

      if (isVideo) {
        targetPath = FlowStorageService.getSafeVideoPath(safeFilename);
      } else {
        targetPath = FlowStorageService.getSafeImagePath(safeFilename);
      }

      await fs.promises.copyFile(finalFile, targetPath);
      logger.info(`[FlowAutomation] Successfully finalized genuine Flow output to ${targetPath}`);

      // If image, register into flow_images.json
      if (!isVideo) {
        try {
          const currentImages = await FlowStorageService.readJsonFile<any[]>(FlowStorageService.imagesFilePath, []);
          const imageRecord = {
            id: `img_${Date.now()}`,
            title: job.prompt.slice(0, 48) + '...',
            prompt: job.prompt,
            filename: safeFilename,
            aspectRatio: job.settings.aspectRatio,
            modelUsed: 'Google Flow Pro Session',
            accountName: account.name,
            createdAt: new Date().toISOString()
          };
          await FlowStorageService.writeJsonFile(FlowStorageService.imagesFilePath, [imageRecord, ...currentImages]);
        } catch (e) {
          logger.warn('[FlowAutomation] Could not update flow_images.json:', e);
        }
      }

      // Clean up isolated temporary download folder
      try {
        if (fs.existsSync(jobDownloadDir)) {
          await fs.promises.rm(jobDownloadDir, { recursive: true, force: true });
        }
      } catch (rmErr) {}

      return {
        success: true,
        outputFilePath: targetPath,
        mediaType
      };
    } catch (executionErr: any) {
      page.off('response', responseListener);
      logger.error(`[FlowAutomation] Error during Flow job execution:`, executionErr);
      return {
        success: false,
        mediaType,
        error: executionErr.message || 'Flow generation failed'
      };
    }
  }

  /**
   * Helper: Enter prompt text into Google Flow prompt input
   */
  private static async injectPrompt(page: Page, prompt: string): Promise<boolean> {
    try {
      // Look for textarea, contenteditable, or input fields
      const selector = 'textarea, [contenteditable="true"], input[placeholder*="prompt" i], [aria-label*="prompt" i]';
      const element = await page.waitForSelector(selector, { timeout: 6000 }).catch(() => null);

      if (!element) {
        return false;
      }

      await element.click();
      await page.evaluate((el: any, val: string) => {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.isContentEditable) {
          el.innerText = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, element, prompt);

      return true;
    } catch (e) {
      logger.warn('[FlowAutomation] Error injecting prompt:', e);
      return false;
    }
  }

  /**
   * Helper: Trigger generation button
   */
  private static async triggerGenerate(page: Page): Promise<boolean> {
    try {
      // Look for primary action button or enter key
      const buttonSelector =
        'button.flow-button-primary, button[aria-label*="generate" i], button[aria-label*="create" i], button[type="submit"]';
      const button = await page.$(buttonSelector);

      if (button) {
        await button.click();
        return true;
      } else {
        // Press Enter as fallback
        await page.keyboard.press('Enter');
        return true;
      }
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper: Wait for media output via file download, captured buffer, or DOM elements
   */
  private static async waitForMediaOutput(
    page: Page,
    jobId: string,
    downloadDir: string,
    isVideo: boolean,
    getCapturedBuffer: () => { buffer: Buffer; mimeType: string } | null,
    onProgress: (pct: number, msg: string) => Promise<void>
  ): Promise<string | null> {
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes max wait for Google Flow rendering

    while (Date.now() - startTime < maxWaitTime) {
      // 1. Check if captured buffer was received
      const captured = getCapturedBuffer();
      if (captured && captured.buffer && captured.buffer.length > 30000) {
        const ext = isVideo ? '.mp4' : captured.mimeType.includes('png') ? '.png' : '.jpg';
        const tempPath = path.join(downloadDir, `captured_${jobId}${ext}`);
        await fs.promises.writeFile(tempPath, captured.buffer);
        return tempPath;
      }

      // 2. Check if a downloaded file arrived in the isolated directory
      if (fs.existsSync(downloadDir)) {
        const files = fs.readdirSync(downloadDir);
        for (const file of files) {
          if (file.endsWith('.crdownload') || file.endsWith('.tmp')) continue;
          const ext = path.extname(file).toLowerCase();
          const isExpected = isVideo
            ? ext === '.mp4' || ext === '.webm'
            : ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';

          if (isExpected) {
            const fullPath = path.join(downloadDir, file);
            const stat = fs.statSync(fullPath);
            if (stat.size > 20000) {
              // Wait 1.5s to confirm write finished
              await new Promise((r) => setTimeout(r, 1500));
              const statAfter = fs.statSync(fullPath);
              if (statAfter.size === stat.size) {
                return fullPath;
              }
            }
          }
        }
      }

      // 3. Check for Google Flow error or content policy rejection in the DOM
      const pageError = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        if (text.includes('violates our content policy') || text.includes('safety policy')) {
          return 'Prompt was flagged by Google safety and content guidelines.';
        }
        if (text.includes('quota exceeded') || text.includes('limit reached')) {
          return 'Google Flow Pro generation quota or rate limit reached.';
        }
        return null;
      }).catch(() => null);

      if (pageError) {
        throw new Error(pageError);
      }

      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      await onProgress(
        Math.min(95, 75 + Math.floor(elapsedSec / 15)),
        `Waiting for Google Flow generation (${elapsedSec}s elapsed)...`
      );

      await new Promise((r) => setTimeout(r, 3000));
    }

    return null;
  }
}

