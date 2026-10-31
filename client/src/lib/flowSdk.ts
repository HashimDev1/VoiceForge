/**
 * Flow SDK - Production Client Implementation for Google Flow Pro Sessions
 * Directly communicates with VoiceForge Studio's backend scheduler and Google Flow browser automation.
 */

export interface FlowImageParams {
  prompt: string;
  modelDisplayName?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  onProgress?: (progress: number, stageMessage: string) => void;
}

export interface FlowVideoParams {
  prompt: string;
  modelDisplayName?: string;
  firstFrameImageMediaId?: string;
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  onProgress?: (progress: number, stageMessage: string) => void;
}

export interface FlowDownloadParams {
  url?: string;
  base64?: string;
  mimeType?: string;
  filename: string;
}

export interface FlowMediaResult {
  mediaId: string;
  imageUrl?: string;
  videoUrl?: string;
  base64?: string;
  mimeType?: string;
}

async function pollJobUntilDone(
  jobId: string,
  onProgress?: (progress: number, stageMessage: string) => void
): Promise<any> {
  const start = Date.now();
  const timeoutMs = 6 * 60 * 1000; // 6 minutes max

  while (Date.now() - start < timeoutMs) {
    let job: any = null;
    try {
      const res = await fetch(`/api/flow/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        job = data.job;
      }
    } catch (netErr) {
      // transient network fetch error, retry next tick
    }

    if (job) {
      if (onProgress) {
        onProgress(job.progressPercent || 0, job.stageMessage || 'Processing in Google Flow...');
      }

      if (job.status === 'completed') {
        return job;
      }

      if (job.status === 'failed') {
        throw new Error(job.errorDetails || 'Google Flow Pro generation failed.');
      }

      if (job.status === 'needs_attention') {
        throw new Error(
          job.manualActionRequired ||
            job.stageMessage ||
            'Action required in Google Flow session. Please check the open Chrome window.'
        );
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error('Generation timed out awaiting Google Flow output.');
}

/**
 * Universal Flow SDK Object
 */
export const Flow = {
  generate: {
    image: async (params: FlowImageParams): Promise<FlowMediaResult> => {
      const response = await fetch('/api/flow/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          mediaType: 'image',
          selectionMode: 'auto',
          settings: {
            aspectRatio: params.aspectRatio || '16:9'
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit image job to Google Flow scheduler.');
      }

      const { job } = await response.json();
      const completedJob = await pollJobUntilDone(job.id, params.onProgress);

      return {
        mediaId: completedJob.id,
        imageUrl: completedJob.imageUrl,
        mimeType: 'image/jpeg'
      };
    },

    video: async (params: FlowVideoParams): Promise<FlowMediaResult> => {
      const response = await fetch('/api/flow/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          mediaType: 'video',
          selectionMode: 'auto',
          settings: {
            aspectRatio: params.aspectRatio || '16:9',
            durationSeconds: params.durationSeconds || 6
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit video job to Google Flow scheduler.');
      }

      const { job } = await response.json();
      const completedJob = await pollJobUntilDone(job.id, params.onProgress);

      return {
        mediaId: completedJob.id,
        videoUrl: completedJob.videoUrl,
        mimeType: 'video/mp4'
      };
    }
  },

  /**
   * Clean file download supporting direct media URLs and blobs
   */
  download: async (params: FlowDownloadParams): Promise<void> => {
    // 1. Direct URL download
    if (params.url) {
      const a = document.createElement('a');
      a.href = params.url;
      a.download = params.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 150);
      return;
    }

    // 2. Base64 binary blob conversion
    if (params.base64) {
      const rawBase64 = params.base64.includes(',') ? params.base64.split(',')[1] : params.base64;
      const byteChars = atob(rawBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: params.mimeType || 'application/octet-stream' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = params.filename;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }, 150);
    }
  }
};

export default Flow;
