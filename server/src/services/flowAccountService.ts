import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn, execSync } from 'child_process';
import { FlowAccount, FlowAccountStatus } from '../../../shared/src/types';
import { FlowStorageService } from './flowStorageService';
import { logger } from '../utils/logger';

export class FlowAccountService {
  private static cachedChromePath: string | null = null;
  private static cachedAvailableProfiles: string[] = [];

  /**
   * Resolve Google Chrome binary path on Windows / Host OS
   */
  public static getChromeExecutablePath(): string | null {
    if (this.cachedChromePath && fs.existsSync(this.cachedChromePath)) {
      return this.cachedChromePath;
    }

    const candidatePaths: string[] = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        this.cachedChromePath = p;
        return p;
      }
    }

    return null;
  }

  /**
   * Get default Chrome User Data Directory on Windows
   */
  public static getDefaultChromeUserDataDir(): string {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
    return path.join(localAppData, 'Google', 'Chrome', 'User Data');
  }

  /**
   * Get dedicated isolated Chrome User Data Directory for VoiceForge Flow Pro sessions
   * This guarantees that studio Chrome runs both localhost:3000 and Google Flow in the exact same window,
   * while complying with Chrome's mandatory requirement that remote debugging requires a non-default user-data-dir.
   */
  public static getDedicatedStudioUserDataDir(_slotNumber: number = 1): string {
    const root = FlowStorageService.getRootDirectory();
    const dir = path.resolve(root, 'data', 'chrome_flow_userdata', 'slot_1');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Discover available profile directories in Google Chrome
   */
  public static discoverAvailableProfiles(): string[] {
    const userDataDir = this.getDefaultChromeUserDataDir();
    const profiles: string[] = [];

    try {
      if (fs.existsSync(userDataDir)) {
        const entries = fs.readdirSync(userDataDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (entry.name === 'Default' || /^Profile\s*\d+$/i.test(entry.name)) {
              profiles.push(entry.name);
            }
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to read Chrome User Data folder:', err);
    }

    // Sort profiles naturally: Default first, then Profile 1, Profile 2, etc.
    profiles.sort((a, b) => {
      if (a === 'Default') return -1;
      if (b === 'Default') return 1;
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    this.cachedAvailableProfiles = profiles;
    return profiles;
  }

  /**
   * Initialize 10 dedicated Google AI Pro accounts if not already saved
   */
  public static async initAccounts(): Promise<FlowAccount[]> {
    FlowStorageService.initStorage();
    const existing = await FlowStorageService.readJsonFile<FlowAccount[]>(
      FlowStorageService.accountsFilePath,
      []
    );

    const availableProfiles = this.discoverAvailableProfiles();

    if (existing && existing.length >= 10) {
      return existing;
    }

    // Populate exactly 10 slots, mapping to detected profiles where possible
    const accounts: FlowAccount[] = [];
    for (let slot = 1; slot <= 10; slot++) {
      const existingAccount = existing.find((a) => a.slotNumber === slot);
      if (existingAccount) {
        accounts.push(existingAccount);
        continue;
      }

      // Map to an existing profile if available, otherwise assign a profile name
      let mappedProfile = 'Default';
      if (availableProfiles.length > 0) {
        if (slot === 1) {
          mappedProfile = availableProfiles.includes('Default') ? 'Default' : availableProfiles[0];
        } else {
          const profileName = `Profile ${slot}`;
          const exactMatch = availableProfiles.find((p) => p.toLowerCase() === profileName.toLowerCase());
          if (exactMatch) {
            mappedProfile = exactMatch;
          } else if (availableProfiles[slot - 1]) {
            mappedProfile = availableProfiles[slot - 1];
          } else {
            mappedProfile = `Profile ${slot}`;
          }
        }
      } else {
        mappedProfile = slot === 1 ? 'Default' : `Profile ${slot}`;
      }

      accounts.push({
        id: `acc_${slot}`,
        slotNumber: slot,
        name: `Google AI Pro ${slot}`,
        profileDirectory: mappedProfile,
        status: 'ready',
        creditBalanceStatus: 'active',
        creditBalanceLabel: 'Pro Active',
        priority: slot,
        dailyJobsCount: 0,
        notes: `Configured for ${mappedProfile}. Click 'Open in Chrome' to verify or sign in.`
      });
    }

    await FlowStorageService.writeJsonFile(FlowStorageService.accountsFilePath, accounts);
    logger.info(`Initialized 10 Google Flow accounts in ${FlowStorageService.accountsFilePath}`);
    return accounts;
  }

  public static async getAccounts(): Promise<FlowAccount[]> {
    return this.initAccounts();
  }

  public static async getAccountById(id: string): Promise<FlowAccount | null> {
    const accounts = await this.getAccounts();
    return accounts.find((a) => a.id === id) || null;
  }

  public static async updateAccount(id: string, updates: Partial<FlowAccount>): Promise<FlowAccount> {
    const accounts = await this.getAccounts();
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Account ${id} not found.`);
    }

    // Disallow overriding slotNumber or id
    const current = accounts[index];
    const updated: FlowAccount = {
      ...current,
      ...updates,
      id: current.id,
      slotNumber: current.slotNumber
    };

    accounts[index] = updated;
    await FlowStorageService.writeJsonFile(FlowStorageService.accountsFilePath, accounts);
    logger.info(`Updated Google Flow account: ${updated.name} (${updated.id})`);
    return updated;
  }

  public static async setAccountStatus(id: string, status: FlowAccountStatus, notes?: string, activeJobId?: string): Promise<FlowAccount> {
    const updates: Partial<FlowAccount> = { status };
    if (notes !== undefined) updates.notes = notes;
    if (activeJobId !== undefined) updates.activeJobId = activeJobId;
    if (status === 'ready') updates.activeJobId = undefined;
    return this.updateAccount(id, updates);
  }

  /**
   * Designated Chrome DevTools Protocol port for browser automation
   */
  public static getDebuggingPortForAccount(account?: FlowAccount | null): number {
    return 9222;
  }

  /**
   * Check if Chrome DevTools Protocol is reachable on the given port
   */
  public static async isCdpReady(port: number = 9222): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1500 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Launch native Google Chrome with the selected profile
   * Never asks for passwords, never copies cookies. Uses Chrome's native isolated profile directory.
   */
  public static async launchChromeProfile(
    id: string,
    targetUrl: string = 'https://flow.google.com'
  ): Promise<{ success: boolean; message: string; chromePid?: number; debugPort?: number }> {
    const account = await this.getAccountById(id);
    if (!account) {
      throw new Error(`Account ${id} not found.`);
    }

    const chromePath = this.getChromeExecutablePath();
    if (!chromePath) {
      throw new Error('Google Chrome executable was not found on this system. Please ensure Chrome is installed in Program Files.');
    }

    const userDataDir = account.customUserDataDir || this.getDedicatedStudioUserDataDir(account.slotNumber || 1);
    const profileDir = 'Default';
    const debugPort = this.getDebuggingPortForAccount(account);

    logger.info(`Launching unified Studio Chrome for ${account.name} (Port: ${debugPort}) with localhost:3000 and Flow`);

    const args = [
      `--user-data-dir=${userDataDir}`,
      `--profile-directory=${profileDir}`,
      `--remote-debugging-port=${debugPort}`,
      '--remote-debugging-address=127.0.0.1',
      '--remote-allow-origins=*',
      '--no-first-run',
      '--no-default-browser-check',
      'http://localhost:3000',
      targetUrl
    ];

    try {
      const psArgs = ['-NoProfile', '-Command', `Start-Process -FilePath "${chromePath}" -ArgumentList @(${args.map(a => `'${a}'`).join(', ')})`];
      const child = spawn('powershell.exe', psArgs, {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      await this.updateAccount(id, {
        lastChecked: new Date().toISOString(),
        notes: `Opened in Chrome on ${new Date().toLocaleTimeString()} (CDP Port: ${debugPort}) for session authentication/inspection.`
      });

      return {
        success: true,
        message: `Chrome opened with profile "${profileDir}". You can sign in or manage Google Flow Pro directly.`,
        chromePid: child.pid,
        debugPort
      };
    } catch (err: any) {
      logger.error(`Failed to launch Chrome for account ${id}:`, err);
      throw new Error(`Failed to launch Chrome: ${err.message}`);
    }
  }

  /**
   * Non-invasive verification of profile status
   */
  public static async checkAccountStatus(id: string): Promise<FlowAccount> {
    const account = await this.getAccountById(id);
    if (!account) {
      throw new Error(`Account ${id} not found.`);
    }

    const userDataDir = account.customUserDataDir || this.getDefaultChromeUserDataDir();
    const profilePath = path.join(userDataDir, account.profileDirectory);
    const nowIso = new Date().toISOString();

    const exists = fs.existsSync(profilePath);
    let status: FlowAccountStatus = account.status;
    let notes = account.notes;

    if (!exists) {
      status = 'needs_auth';
      notes = `Profile folder "${account.profileDirectory}" does not exist yet. Launch Chrome to create it.`;
    } else {
      // Check for lockfile / Preferences
      const prefFile = path.join(profilePath, 'Preferences');
      if (fs.existsSync(prefFile)) {
        if (account.status === 'error' || account.status === 'needs_auth') {
          status = 'ready';
        }
        notes = `Verified profile "${account.profileDirectory}". Session ready.`;
      } else {
        notes = `Profile exists. Click 'Open in Chrome' to log in to Google AI Pro.`;
      }
    }

    return this.updateAccount(id, {
      status,
      lastChecked: nowIso,
      notes
    });
  }

  public static async getOverviewData() {
    const accounts = await this.getAccounts();
    const chromePath = this.getChromeExecutablePath();
    const availableProfiles = this.discoverAvailableProfiles();
    const userDataPath = this.getDefaultChromeUserDataDir();

    return {
      accounts,
      chrome: {
        detected: Boolean(chromePath),
        path: chromePath || undefined,
        availableProfiles,
        userDataPath
      }
    };
  }
}
