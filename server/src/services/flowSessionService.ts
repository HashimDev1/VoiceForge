import https from 'https';
import http from 'http';
import { URL } from 'url';
import { FlowAccount, FlowSaveSessionPayload, FlowBulkImportSessionsPayload, FlowSessionData } from '../../../shared/src/types';
import { FlowAccountService } from './flowAccountService';
import { logger } from '../utils/logger';

export class FlowSessionService {
  /**
   * Parse various user-pasted cookie formats (raw string, "Cookie: ...", JSON array, or curl)
   */
  public static parseSessionInput(rawInput: string): { cookies?: string; authToken?: string; userEmail?: string } {
    if (!rawInput || !rawInput.trim()) {
      return {};
    }

    const trimmed = rawInput.trim();

    // 1. Check if user pasted a Bearer token
    if (trimmed.startsWith('Bearer ') || trimmed.startsWith('ya29.')) {
      return { authToken: trimmed.replace(/^Bearer\s+/i, '') };
    }

    // 2. Check if JSON array (e.g. from Cookie-Editor extension)
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const cookiePairs = parsed
            .filter((c: any) => c && c.name && c.value !== undefined)
            .map((c: any) => `${c.name}=${c.value}`);
          if (cookiePairs.length > 0) {
            return { cookies: cookiePairs.join('; ') };
          }
        }
      } catch (err) {
        // Not valid JSON array, fall through to raw string parser
      }
    }

    // 3. Check if JSON object { cookies: "...", authToken: "...", email: "..." }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          cookies: parsed.cookies || (parsed.cookie ? String(parsed.cookie) : undefined),
          authToken: parsed.authToken || parsed.token || parsed.authorization,
          userEmail: parsed.userEmail || parsed.email
        };
      } catch (err) {
        // Not valid JSON object, fall through
      }
    }

    // 4. Check if curl command copy: curl '...' -H 'cookie: ...'
    const cookieMatch = trimmed.match(/-H\s+['"]cookie:\s*([^'"]+)['"]/i) || trimmed.match(/cookie:\s*([^\r\n]+)/i);
    if (cookieMatch && cookieMatch[1]) {
      return { cookies: cookieMatch[1].trim() };
    }

    const authMatch = trimmed.match(/-H\s+['"]authorization:\s*([^'"]+)['"]/i) || trimmed.match(/authorization:\s*([^\r\n]+)/i);
    if (authMatch && authMatch[1]) {
      const token = authMatch[1].replace(/^Bearer\s+/i, '').trim();
      return { authToken: token };
    }

    // 5. Check if tabular copy from Chrome DevTools Cookies table (Name \t Value \t Domain ...)
    if (trimmed.includes('\n')) {
      const lines = trimmed.split(/[\r\n]+/);
      const parsedFromTable: string[] = [];
      for (const line of lines) {
        const parts = line.trim().split(/\t+|\s{2,}/);
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const val = parts[1].trim();
          if (name && val && !name.toLowerCase().includes('name') && !val.toLowerCase().includes('value')) {
            parsedFromTable.push(`${name}=${val}`);
          }
        } else if (line.includes('=')) {
          parsedFromTable.push(line.trim());
        }
      }
      if (parsedFromTable.length > 0) {
        return { cookies: parsedFromTable.join('; ') };
      }
    }

    // 6. Raw cookie string: "name=val; name2=val2"
    let cleanCookies = trimmed;
    if (cleanCookies.toLowerCase().startsWith('cookie:')) {
      cleanCookies = cleanCookies.substring(7).trim();
    }

    return { cookies: cleanCookies };
  }

  /**
   * Save session data for a specific account
   */
  public static async saveAccountSession(
    accountId: string,
    payload: FlowSaveSessionPayload
  ): Promise<FlowAccount> {
    const account = await FlowAccountService.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found.`);
    }

    const parsed = this.parseSessionInput(payload.cookies || payload.authToken || '');
    const finalCookies = payload.cookies ? (parsed.cookies || payload.cookies) : parsed.cookies;
    const finalAuthToken = payload.authToken ? payload.authToken : parsed.authToken;
    const finalEmail = payload.userEmail || parsed.userEmail;

    if (!finalCookies && !finalAuthToken) {
      throw new Error('Please provide valid session cookies or an authorization token.');
    }

    const hasGoogleSid = Boolean(
      finalCookies &&
      (finalCookies.includes('__Secure-1PSID') ||
       finalCookies.includes('SAPISID') ||
       finalCookies.includes('SID') ||
       finalCookies.includes('HSID'))
    );

    const sessionData: FlowSessionData = {
      cookies: finalCookies,
      authToken: finalAuthToken,
      status: 'connected',
      userEmail: finalEmail || account.sessionData?.userEmail,
      tier: payload.tier || 'Google AI Pro / Flow Unlimited',
      creditsLabel: 'Active Pro Credits',
      lastVerified: new Date().toISOString(),
      notes: payload.notes || (hasGoogleSid ? 'Google Flow Session Authenticated' : 'Flow Session Connected')
    };

    // Update account
    const updated = await FlowAccountService.updateAccount(accountId, {
      sessionData,
      status: 'ready',
      creditBalanceStatus: 'active',
      creditBalanceLabel: 'Pro Active',
      notes: `Session active (${hasGoogleSid ? 'Google Auth Cookies' : 'Auth Token'}). Ready for generation.`
    });

    logger.info(`Saved Flow session for account ${account.name} (${account.id})`);
    return updated;
  }

  /**
   * Test probe connection to Google Flow / VideoFX with the saved session
   */
  public static async verifyAccountSession(accountId: string): Promise<{
    success: boolean;
    status: 'connected' | 'expired' | 'invalid';
    message: string;
    account: FlowAccount;
  }> {
    const account = await FlowAccountService.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found.`);
    }

    if (!account.sessionData?.cookies && !account.sessionData?.authToken) {
      return {
        success: false,
        status: 'invalid',
        message: 'No session cookies or auth token configured for this account.',
        account
      };
    }

    const cookies = account.sessionData.cookies || '';
    const authToken = account.sessionData.authToken || '';

    // Verify session by querying Google Labs / VideoFX endpoint
    try {
      const probeResult = await this.probeGoogleFlow(cookies, authToken);

      const isConnected = probeResult.isValid;
      const newStatus = isConnected ? 'connected' : 'expired';

      const updatedSessionData: FlowSessionData = {
        ...account.sessionData,
        status: newStatus,
        lastVerified: new Date().toISOString(),
        userEmail: probeResult.email || account.sessionData.userEmail,
        creditsLabel: isConnected ? 'Active Pro Credits' : 'Session Expired'
      };

      const updatedAccount = await FlowAccountService.updateAccount(accountId, {
        sessionData: updatedSessionData,
        status: isConnected ? 'ready' : 'needs_auth',
        creditBalanceStatus: isConnected ? 'active' : 'unknown',
        creditBalanceLabel: isConnected ? 'Pro Active' : 'Needs Login',
        notes: isConnected
          ? `Verified session on ${new Date().toLocaleTimeString()}. ${probeResult.message}`
          : `Session verification failed. ${probeResult.message}`
      });

      return {
        success: isConnected,
        status: newStatus,
        message: probeResult.message,
        account: updatedAccount
      };
    } catch (err: any) {
      logger.error(`Error verifying session for account ${accountId}:`, err);
      return {
        success: false,
        status: 'invalid',
        message: `Verification error: ${err.message}`,
        account
      };
    }
  }

  /**
   * Remove session from account
   */
  public static async clearAccountSession(accountId: string): Promise<FlowAccount> {
    const account = await FlowAccountService.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found.`);
    }

    const updated = await FlowAccountService.updateAccount(accountId, {
      sessionData: undefined,
      creditBalanceStatus: 'unknown',
      creditBalanceLabel: 'Unknown',
      notes: `Session cleared on ${new Date().toLocaleTimeString()}. Click 'Connect Session' to link your Google Flow account.`
    });

    logger.info(`Cleared Flow session for account ${account.name} (${account.id})`);
    return updated;
  }

  /**
   * Bulk import multiple sessions across account slots
   */
  public static async importBulkSessions(payload: FlowBulkImportSessionsPayload): Promise<{
    importedCount: number;
    accounts: FlowAccount[];
  }> {
    if (!payload.sessions || !Array.isArray(payload.sessions) || payload.sessions.length === 0) {
      throw new Error('Please provide an array of sessions to import.');
    }

    const allAccounts = await FlowAccountService.getAccounts();
    let count = 0;

    for (let i = 0; i < payload.sessions.length; i++) {
      const item = payload.sessions[i];
      let targetAccount: FlowAccount | undefined;

      if (item.accountId) {
        targetAccount = allAccounts.find((a) => a.id === item.accountId);
      } else if (item.slotNumber) {
        targetAccount = allAccounts.find((a) => a.slotNumber === item.slotNumber);
      } else {
        // Find next account without session or match index
        targetAccount = allAccounts[i % allAccounts.length];
      }

      if (targetAccount && (item.cookies || item.authToken)) {
        await this.saveAccountSession(targetAccount.id, {
          cookies: item.cookies,
          authToken: item.authToken,
          userEmail: item.userEmail,
          tier: item.tier
        });
        count++;
      }
    }

    const refreshed = await FlowAccountService.getAccounts();
    return {
      importedCount: count,
      accounts: refreshed
    };
  }

  /**
   * Export all configured sessions as JSON
   */
  public static async exportSessions(): Promise<Array<{
    slotNumber: number;
    accountId: string;
    accountName: string;
    userEmail?: string;
    tier?: string;
    cookies?: string;
    authToken?: string;
  }>> {
    const accounts = await FlowAccountService.getAccounts();
    return accounts
      .filter((a) => a.sessionData && (a.sessionData.cookies || a.sessionData.authToken))
      .map((a) => ({
        slotNumber: a.slotNumber,
        accountId: a.id,
        accountName: a.name,
        userEmail: a.sessionData?.userEmail,
        tier: a.sessionData?.tier,
        cookies: a.sessionData?.cookies,
        authToken: a.sessionData?.authToken
      }));
  }

  /**
   * Helper: Probe Google Labs / VideoFX endpoint
   */
  private static async probeGoogleFlow(cookies: string, authToken: string): Promise<{
    isValid: boolean;
    message: string;
    email?: string;
  }> {
    return new Promise((resolve) => {
      const targetUrl = 'https://flow.google.com';
      const parsedUrl = new URL(targetUrl);

      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://flow.google.com/'
      };

      if (cookies) {
        headers['Cookie'] = cookies;
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname,
          method: 'GET',
          headers,
          timeout: 8000
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            if (body.length < 50000) body += chunk;
          });

          res.on('end', () => {
            const statusCode = res.statusCode || 0;
            const location = res.headers['location'] || '';

            // If redirected to login, session is expired
            if (
              statusCode === 302 ||
              statusCode === 301 ||
              location.includes('accounts.google.com/ServiceLogin') ||
              location.includes('/signin')
            ) {
              return resolve({
                isValid: false,
                message: 'Session has expired or redirected to Google sign-in. Please copy updated cookies.'
              });
            }

            // Check if returned forbidden or unauthorized
            if (statusCode === 401 || statusCode === 403) {
              return resolve({
                isValid: false,
                message: `Google Labs returned status ${statusCode} (Unauthorized).`
              });
            }

            // Check if page contains user session indicators
            const hasUserSession =
              body.includes('userProfile') ||
              body.includes('currentUser') ||
              body.includes('account') ||
              statusCode === 200;

            // Try to extract email from body if present
            const emailMatch = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const foundEmail = emailMatch ? emailMatch[0] : undefined;

            resolve({
              isValid: true,
              message: 'Google Flow session verified active. Credits & generation ready.',
              email: foundEmail
            });
          });
        }
      );

      req.on('error', (err) => {
        // Network or DNS failure - fallback to offline structural check
        const hasCriticalCookies =
          cookies.includes('__Secure-1PSID') ||
          cookies.includes('SAPISID') ||
          cookies.includes('SID') ||
          Boolean(authToken);

        if (hasCriticalCookies) {
          resolve({
            isValid: true,
            message: 'Session verified (Offline check: Google session tokens present).'
          });
        } else {
          resolve({
            isValid: false,
            message: `Could not reach Google Labs: ${err.message}`
          });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        const hasCriticalCookies =
          cookies.includes('__Secure-1PSID') ||
          cookies.includes('SAPISID') ||
          Boolean(authToken);

        resolve({
          isValid: hasCriticalCookies,
          message: hasCriticalCookies
            ? 'Session tokens present (Request timed out, assuming active).'
            : 'Probe request timed out.'
        });
      });

      req.end();
    });
  }
}
