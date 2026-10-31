import {
  FlowAccount,
  FlowJob,
  FlowImageItem,
  FlowStudioOverview,
  FlowCreateJobPayload,
  FlowSaveSessionPayload,
  FlowBulkImportSessionsPayload
} from '../../../shared/src/types';

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}: ${res.statusText || 'Backend offline'}`);
    }
    return {};
  }
  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }
    return data;
  } catch (e: any) {
    if (!res.ok) {
      throw new Error(e.message || `Server returned status ${res.status}`);
    }
    throw new Error(`Invalid JSON response: ${text.slice(0, 150)}`);
  }
}

export class FlowApi {
  public static async getOverview(): Promise<FlowStudioOverview> {
    const res = await fetch('/api/flow/overview');
    return await safeJson(res);
  }

  public static async getAccounts(): Promise<FlowAccount[]> {
    const res = await fetch('/api/flow/accounts');
    const data = await safeJson(res);
    return data.accounts || [];
  }

  public static async updateAccount(id: string, updates: Partial<FlowAccount>): Promise<FlowAccount> {
    const res = await fetch(`/api/flow/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await safeJson(res);
    return data.account;
  }

  public static async saveAccountSession(id: string, payload: FlowSaveSessionPayload): Promise<FlowAccount> {
    const res = await fetch(`/api/flow/accounts/${id}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(res);
    return data.account;
  }

  public static async verifyAccountSession(id: string): Promise<{
    success: boolean;
    status: 'connected' | 'expired' | 'invalid';
    message: string;
    account: FlowAccount;
  }> {
    const res = await fetch(`/api/flow/accounts/${id}/verify-session`, {
      method: 'POST'
    });
    return await safeJson(res);
  }

  public static async deleteAccountSession(id: string): Promise<FlowAccount> {
    const res = await fetch(`/api/flow/accounts/${id}/session`, {
      method: 'DELETE'
    });
    const data = await safeJson(res);
    return data.account;
  }

  public static async bulkImportSessions(payload: FlowBulkImportSessionsPayload): Promise<{
    importedCount: number;
    accounts: FlowAccount[];
  }> {
    const res = await fetch('/api/flow/accounts/bulk-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await safeJson(res);
  }

  public static async exportSessions(): Promise<any[]> {
    const res = await fetch('/api/flow/accounts/export-sessions');
    const data = await safeJson(res);
    return data.sessions || [];
  }

  public static async launchChromeProfile(
    id: string,
    targetUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/flow/accounts/${id}/launch-chrome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl })
    });
    return await safeJson(res);
  }

  public static async checkAccountStatus(id: string): Promise<FlowAccount> {
    const res = await fetch(`/api/flow/accounts/${id}/check-status`, {
      method: 'POST'
    });
    const data = await safeJson(res);
    return data.account;
  }

  public static async getJobs(): Promise<FlowJob[]> {
    const res = await fetch('/api/flow/jobs');
    const data = await safeJson(res);
    return data.jobs || [];
  }

  public static async getJobById(id: string): Promise<FlowJob> {
    const res = await fetch(`/api/flow/jobs/${id}`);
    const data = await safeJson(res);
    return data.job;
  }

  public static async createJob(payload: FlowCreateJobPayload): Promise<FlowJob> {
    const res = await fetch('/api/flow/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(res);
    return data.job;
  }

  public static async createBatchJobs(jobs: FlowCreateJobPayload[]): Promise<FlowJob[]> {
    const res = await fetch('/api/flow/jobs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs })
    });
    const data = await safeJson(res);
    return data.jobs || [];
  }

  public static async retryJob(id: string): Promise<FlowJob> {
    const res = await fetch(`/api/flow/jobs/${id}/retry`, {
      method: 'POST'
    });
    const data = await safeJson(res);
    return data.job;
  }

  public static async resumeJob(id: string): Promise<FlowJob> {
    const res = await fetch(`/api/flow/jobs/${id}/resume`, {
      method: 'POST'
    });
    const data = await safeJson(res);
    return data.job;
  }

  public static async cancelJob(id: string): Promise<FlowJob> {
    const res = await fetch(`/api/flow/jobs/${id}/cancel`, {
      method: 'POST'
    });
    const data = await safeJson(res);
    return data.job;
  }

  public static async deleteJob(id: string): Promise<void> {
    const res = await fetch(`/api/flow/jobs/${id}`, {
      method: 'DELETE'
    });
    await safeJson(res);
  }

  public static async importResult(id: string, file: File): Promise<FlowJob> {
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch(`/api/flow/jobs/${id}/import-result`, {
      method: 'POST',
      body: formData
    });
    const data = await safeJson(res);
    return data.job;
  }

  public static async getVideos(): Promise<FlowJob[]> {
    const res = await fetch('/api/flow/videos');
    const data = await safeJson(res);
    return data.videos || [];
  }

  public static async getImages(): Promise<FlowImageItem[]> {
    const res = await fetch('/api/flow/images');
    const data = await safeJson(res);
    return data.images || [];
  }

  public static async deleteImage(id: string): Promise<void> {
    const res = await fetch(`/api/flow/images/${id}`, {
      method: 'DELETE'
    });
    await safeJson(res);
  }
}
