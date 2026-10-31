import fs from 'fs';
import path from 'path';
import { FlowJob, FlowAccount } from '../../../shared/src/types';
import { FlowStorageService } from './flowStorageService';
import { FlowAccountService } from './flowAccountService';
import { FlowSchedulerService } from './flowSchedulerService';
import { FlowBrowserAutomation } from './flowBrowserAutomation';
import { logger } from '../utils/logger';

export class FlowIntegrationAdapter {
  /**
   * Main entry point called by FlowSchedulerService
   */
  public static async runJob(job: FlowJob, account: FlowAccount): Promise<void> {
    logger.info(`[FlowAdapter] Starting job ${job.id} on account ${account.name} (Profile: ${account.profileDirectory})`);

    try {
      job.stageMessage = `Connecting to Google Flow Pro session for ${account.name}...`;
      job.progressPercent = 10;
      job.updatedAt = new Date().toISOString();
      await FlowSchedulerService.saveJob(job);

      const chromePath = FlowAccountService.getChromeExecutablePath();
      if (!chromePath) {
        job.status = 'failed';
        job.stageMessage = 'Google Chrome executable not detected.';
        job.errorDetails =
          'Google Chrome could not be found in standard Windows directories. Please verify Chrome is installed.';
        await FlowSchedulerService.saveJob(job);
        await FlowAccountService.setAccountStatus(account.id, 'ready', 'Chrome not detected.');
        return;
      }

      // Execute genuine Google Flow automation
      const result = await FlowBrowserAutomation.executeJob(
        job,
        account,
        async (progressPct, stageMsg) => {
          job.progressPercent = progressPct;
          job.stageMessage = stageMsg;
          job.updatedAt = new Date().toISOString();
          await FlowSchedulerService.saveJob(job);
        }
      );

      if (result.needsAttention) {
        job.status = 'needs_attention';
        job.stageMessage = 'User action or sign-in required in Google Flow session.';
        job.manualActionRequired =
          result.actionRequired || 'Please check the open Google Flow Chrome window and click Resume.';
        job.updatedAt = new Date().toISOString();
        await FlowSchedulerService.saveJob(job);
        await FlowAccountService.setAccountStatus(account.id, 'needs_auth', job.manualActionRequired);
        return;
      }

      if (!result.success || !result.outputFilePath) {
        job.status = 'failed';
        job.stageMessage = 'Google Flow generation failed.';
        job.errorDetails = result.error || 'Unknown error occurred during generation.';
        job.updatedAt = new Date().toISOString();
        await FlowSchedulerService.saveJob(job);
        await FlowAccountService.setAccountStatus(account.id, 'ready', 'Job failed.');
        return;
      }

      // Finalize job with genuine media file
      await this.completeJobWithMedia(job.id, result.outputFilePath, result.mediaType, account.id);
    } catch (err: any) {
      logger.error(`[FlowAdapter] Error running job ${job.id}:`, err);
      job.status = 'failed';
      job.errorDetails = err.message || 'Unknown error occurred during Flow integration execution.';
      job.stageMessage = 'Execution failed.';
      job.updatedAt = new Date().toISOString();
      await FlowSchedulerService.saveJob(job);
      await FlowAccountService.setAccountStatus(account.id, 'ready', 'Job failed.');
    }
  }

  /**
   * Finalize job when genuine media is verified or imported
   */
  public static async completeJobWithMedia(
    jobId: string,
    sourceFilePath: string,
    mediaType: 'image' | 'video' = 'video',
    accountId?: string
  ): Promise<FlowJob> {
    const job = await FlowSchedulerService.getJobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);

    FlowStorageService.initStorage();
    const ext = path.extname(sourceFilePath).toLowerCase() || (mediaType === 'video' ? '.mp4' : '.jpg');
    const destinationFileName = `${jobId}${ext}`;
    const destinationPath =
      mediaType === 'video'
        ? FlowStorageService.getSafeVideoPath(destinationFileName)
        : FlowStorageService.getSafeImagePath(destinationFileName);

    if (sourceFilePath !== destinationPath && fs.existsSync(sourceFilePath)) {
      await fs.promises.copyFile(sourceFilePath, destinationPath);
    }
    const stats = await fs.promises.stat(destinationPath);

    job.status = 'completed';
    job.progressPercent = 100;
    job.stageMessage = `${mediaType === 'video' ? 'Video' : 'Image'} generation completed and verified in gallery.`;
    job.manualActionRequired = undefined;
    job.outputFilePath = destinationPath;
    if (mediaType === 'video') {
      job.videoUrl = `/api/flow/video-file/${destinationFileName}`;
    } else {
      job.imageUrl = `/api/flow/image-file/${destinationFileName}`;
    }
    job.fileSizeBytes = stats.size;
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    await FlowSchedulerService.saveJob(job);

    const targetAccountId = accountId || job.accountId;
    if (targetAccountId) {
      const acc = await FlowAccountService.getAccountById(targetAccountId);
      if (acc) {
        await FlowAccountService.updateAccount(targetAccountId, {
          status: 'ready',
          dailyJobsCount: (acc.dailyJobsCount || 0) + 1,
          lastUsed: new Date().toISOString(),
          notes: `Completed job ${job.id}. Ready for next assignment.`
        });
      }
    }

    logger.info(`[FlowAdapter] Job ${job.id} (${mediaType}) successfully completed! Saved to ${destinationPath}`);
    return job;
  }

  /**
   * Backwards-compatible alias for existing video endpoints and tests
   */
  public static async completeJobWithVideo(
    jobId: string,
    sourceFilePath: string,
    accountId?: string
  ): Promise<FlowJob> {
    return this.completeJobWithMedia(jobId, sourceFilePath, 'video', accountId);
  }
}
