import fs from 'fs';
import path from 'path';
import { 
  FlowJob, 
  FlowJobStatus, 
  FlowCreateJobPayload, 
  FlowAccount,
  FlowJobSettings 
} from '../../../shared/src/types';
import { FlowStorageService } from './flowStorageService';
import { FlowAccountService } from './flowAccountService';
import { logger } from '../utils/logger';

export class FlowSchedulerService {
  private static processingQueue = false;
  private static activeExecutionIds = new Set<string>();

  public static async init(): Promise<void> {
    FlowStorageService.initStorage();
    await this.recoverInterruptedJobs();
  }

  /**
   * Safe recovery after application restart:
   * Any jobs left in 'running' status are marked 'needs_attention' with safe recovery notes
   */
  public static async recoverInterruptedJobs(): Promise<void> {
    try {
      const jobs = await this.getAllJobs();
      let updated = false;

      for (const job of jobs) {
        if (job.status === 'running') {
          job.status = 'needs_attention';
          job.updatedAt = new Date().toISOString();
          job.manualActionRequired = 'Application restarted while generation was in progress. Please verify the generation state in the selected Chrome profile and click Resume or Import Video.';
          job.stageMessage = 'Interrupted by application restart.';
          updated = true;
          logger.warn(`Recovered interrupted Flow job ${job.id}: marked as needs_attention`);
        }
      }

      if (updated) {
        await FlowStorageService.writeJsonFile(FlowStorageService.jobsFilePath, jobs);
      }

      // Reset any accounts left in 'in_use' back to 'ready' if no active job exists
      const accounts = await FlowAccountService.getAccounts();
      for (const acc of accounts) {
        if (acc.status === 'in_use') {
          const hasRunningJob = jobs.some(j => j.status === 'running' && j.accountId === acc.id);
          if (!hasRunningJob) {
            await FlowAccountService.setAccountStatus(acc.id, 'ready', 'Recovered session status after restart.');
          }
        }
      }
    } catch (err) {
      logger.error('Failed to recover interrupted jobs:', err);
    }
  }

  public static async getAllJobs(): Promise<FlowJob[]> {
    FlowStorageService.initStorage();
    return FlowStorageService.readJsonFile<FlowJob[]>(FlowStorageService.jobsFilePath, []);
  }

  public static async getJobById(id: string): Promise<FlowJob | null> {
    const jobs = await this.getAllJobs();
    return jobs.find((j) => j.id === id) || null;
  }

  public static async saveJob(job: FlowJob): Promise<FlowJob> {
    const jobs = await this.getAllJobs();
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = job;
    } else {
      jobs.unshift(job);
    }
    await FlowStorageService.writeJsonFile(FlowStorageService.jobsFilePath, jobs);
    return job;
  }

  public static async createJob(payload: FlowCreateJobPayload): Promise<FlowJob> {
    if (!payload.prompt || !payload.prompt.trim()) {
      throw new Error('Prompt is required for video generation.');
    }

    const defaultSettings: FlowJobSettings = {
      aspectRatio: '16:9',
      motionIntensity: 5,
      cameraMovement: 'cinematic',
      stylePreset: 'Cinematic',
      durationSeconds: 5
    };

    const nowIso = new Date().toISOString();
    const jobId = `flow_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let chosenAccount: FlowAccount | null = null;
    if (payload.selectionMode === 'manual') {
      if (!payload.accountId) {
        throw new Error('Account ID is required in manual selection mode.');
      }
      chosenAccount = await FlowAccountService.getAccountById(payload.accountId);
      if (!chosenAccount) {
        throw new Error(`Specified account ${payload.accountId} does not exist.`);
      }
    }

    const newJob: FlowJob = {
      id: jobId,
      createdAt: nowIso,
      updatedAt: nowIso,
      prompt: payload.prompt.trim(),
      mediaType: payload.mediaType || 'video',
      sceneNumber: payload.sceneNumber,
      batchId: payload.batchId,
      imageUrl: payload.imageUrl,
      settings: {
        ...defaultSettings,
        ...(payload.settings || {})
      },
      selectionMode: payload.selectionMode || 'auto',
      accountId: chosenAccount?.id,
      accountName: chosenAccount?.name,
      status: 'pending',
      progressPercent: 0,
      stageMessage: 'Job queued and awaiting account scheduler.',
      retryCount: 0,
      maxRetries: 3
    };

    await this.saveJob(newJob);
    logger.info(`Queued new Flow job: ${newJob.id} [${newJob.mediaType}] (Mode: ${newJob.selectionMode}, Account: ${newJob.accountName || 'Auto'})`);

    // Trigger queue processing asynchronously
    setTimeout(() => {
      this.processNextPendingJobs().catch((err) => logger.error('Queue processing error:', err));
    }, 100);

    return newJob;
  }

  public static async createBatchJobs(payloads: FlowCreateJobPayload[]): Promise<FlowJob[]> {
    const batchId = `batch_${Date.now()}`;
    const createdJobs: FlowJob[] = [];
    for (const p of payloads) {
      const job = await this.createJob({
        ...p,
        batchId: p.batchId || batchId
      });
      createdJobs.push(job);
    }
    return createdJobs;
  }

  /**
   * Find the next eligible account for a job
   * Respects priority, round-robin lastUsed, and strictly avoids multiple concurrent jobs per account.
   */
  public static async selectEligibleAccount(
    preferredAccountId?: string
  ): Promise<{ account: FlowAccount | null; reason?: string }> {
    const accounts = await FlowAccountService.getAccounts();
    const jobs = await this.getAllJobs();

    // Accounts currently executing a job
    const busyAccountIds = new Set<string>(
      jobs.filter((j) => j.status === 'running' && j.accountId).map((j) => j.accountId!)
    );

    if (preferredAccountId) {
      const acc = accounts.find((a) => a.id === preferredAccountId);
      if (!acc) {
        return { account: null, reason: `Account ${preferredAccountId} does not exist.` };
      }
      if (acc.status === 'disabled') {
        return { account: null, reason: `Account ${acc.name} is currently disabled.` };
      }
      if (acc.status === 'needs_auth') {
        return { account: null, reason: `Account ${acc.name} requires manual authentication in Chrome.` };
      }
      if (busyAccountIds.has(acc.id) || acc.status === 'in_use') {
        return { account: null, reason: `Account ${acc.name} is currently processing another job. Strict single-job concurrency enforced.` };
      }
      return { account: acc };
    }

    // Automatic mode: filter eligible accounts
    const eligible = accounts.filter((a) => {
      if (a.status !== 'ready') return false;
      if (busyAccountIds.has(a.id)) return false;
      return true;
    });

    if (eligible.length === 0) {
      return {
        account: null,
        reason: 'All 10 accounts are currently busy, cooling down, or requiring sign-in. Waiting for an account to become available.'
      };
    }

    // Sort by priority (1 is highest), then by least recently used (round-robin)
    eligible.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const timeA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const timeB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return timeA - timeB;
    });

    return { account: eligible[0] };
  }

  /**
   * Main Queue Dispatcher - Strictly sequential (1 active interactive Flow generation at a time)
   */
  public static async processNextPendingJobs(): Promise<void> {
    if (this.processingQueue) return;
    // CRITICAL: Chrome DevTools Protocol port 9222 and interactive Flow tab can only run ONE job at a time.
    if (this.activeExecutionIds.size > 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const jobs = await this.getAllJobs();
      const pendingJobs = jobs
        .filter((j) => j.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (pendingJobs.length === 0) {
        return;
      }

      // Pick strictly ONE pending job to execute sequentially
      const job = pendingJobs[0];
      if (this.activeExecutionIds.has(job.id)) {
        return;
      }

      const { account, reason } = await this.selectEligibleAccount(
        job.selectionMode === 'manual' ? job.accountId : undefined
      );

      if (!account) {
        job.stageMessage = reason || 'Waiting for an eligible account...';
        job.updatedAt = new Date().toISOString();
        await this.saveJob(job);
        return;
      }

      // Lock job and account
      this.activeExecutionIds.add(job.id);
      job.status = 'running';
      job.accountId = account.id;
      job.accountName = account.name;
      job.updatedAt = new Date().toISOString();
      job.progressPercent = 10;
      job.stageMessage = `Assigned to ${account.name}. Initializing Flow integration adapter...`;
      await this.saveJob(job);

      await FlowAccountService.setAccountStatus(
        account.id, 
        'in_use', 
        `Executing job ${job.id}`, 
        job.id
      );

      // Execute job via the FlowIntegrationAdapter asynchronously
      // Dynamic import to prevent circular dependency
      const { FlowIntegrationAdapter } = await import('./flowIntegrationAdapter');
      FlowIntegrationAdapter.runJob(job, account)
        .catch((err) => logger.error(`Error in Flow job ${job.id}:`, err))
        .finally(async () => {
          this.activeExecutionIds.delete(job.id);
          // Re-check queue for next waiting jobs sequentially
          setTimeout(() => {
            this.processNextPendingJobs().catch(() => {});
          }, 300);
        });
    } catch (err) {
      logger.error('Error in processNextPendingJobs:', err);
    } finally {
      this.processingQueue = false;
    }
  }

  public static async retryJob(jobId: string): Promise<FlowJob> {
    const job = await this.getJobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);

    if (job.status === 'running') {
      throw new Error('Cannot retry a job that is currently running.');
    }

    job.status = 'pending';
    job.retryCount += 1;
    job.progressPercent = 0;
    job.stageMessage = `Retrying job (Attempt ${job.retryCount + 1})...`;
    job.errorDetails = undefined;
    job.manualActionRequired = undefined;
    job.updatedAt = new Date().toISOString();

    await this.saveJob(job);
    logger.info(`Job ${job.id} reset to pending for retry.`);

    setTimeout(() => {
      this.processNextPendingJobs().catch(() => {});
    }, 100);

    return job;
  }

  public static async resumeJob(jobId: string): Promise<FlowJob> {
    const job = await this.getJobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);

    if (job.status !== 'needs_attention') {
      throw new Error(`Job ${jobId} is in status ${job.status}, not needs_attention.`);
    }

    job.status = 'pending';
    job.stageMessage = 'Resuming job after user confirmation...';
    job.manualActionRequired = undefined;
    job.updatedAt = new Date().toISOString();

    await this.saveJob(job);
    logger.info(`Job ${job.id} resumed from needs_attention.`);

    setTimeout(() => {
      this.processNextPendingJobs().catch(() => {});
    }, 100);

    return job;
  }

  public static async cancelJob(jobId: string): Promise<FlowJob> {
    const job = await this.getJobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);

    if (job.status === 'completed') {
      throw new Error('Cannot cancel an already completed job.');
    }

    job.status = 'failed';
    job.stageMessage = 'Job cancelled by user.';
    job.errorDetails = 'Cancelled by user.';
    job.updatedAt = new Date().toISOString();

    if (job.accountId) {
      await FlowAccountService.setAccountStatus(job.accountId, 'ready', 'Job cancelled.');
    }

    this.activeExecutionIds.delete(job.id);
    await this.saveJob(job);
    return job;
  }

  public static async deleteJob(jobId: string): Promise<void> {
    const jobs = await this.getAllJobs();
    const target = jobs.find((j) => j.id === jobId);
    if (!target) throw new Error(`Job ${jobId} not found.`);

    // If output file exists, delete it
    if (target.outputFilePath && fs.existsSync(target.outputFilePath)) {
      try {
        await fs.promises.unlink(target.outputFilePath);
      } catch (e) {
        logger.warn(`Could not delete output file ${target.outputFilePath}:`, e);
      }
    }

    if (target.accountId && target.status === 'running') {
      await FlowAccountService.setAccountStatus(target.accountId, 'ready');
    }

    const filtered = jobs.filter((j) => j.id !== jobId);
    await FlowStorageService.writeJsonFile(FlowStorageService.jobsFilePath, filtered);
    this.activeExecutionIds.delete(jobId);
    logger.info(`Deleted Flow job ${jobId}`);
  }
}
