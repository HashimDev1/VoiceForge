import { Voice, ApiHealthResponse, AudioTake } from '../../../shared/src/types';

export class ApiClient {
  public static async getHealth(): Promise<ApiHealthResponse> {
    const res = await fetch('/api/health');
    return await res.json();
  }

  public static async testConnection(): Promise<{ success: boolean; message: string; model: string }> {
    const res = await fetch('/api/health/test-connection', { method: 'POST' });
    return await res.json();
  }

  public static async getVoices(): Promise<Voice[]> {
    const res = await fetch('/api/voices');
    const data = await res.json();
    return data.voices || [];
  }

  public static async saveCustomVoice(voice: Voice): Promise<Voice[]> {
    const res = await fetch('/api/voices/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voice)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save custom voice to server.');
    }
    return data.customVoices || [];
  }

  public static async deleteCustomVoice(voiceId: string): Promise<Voice[]> {
    const res = await fetch(`/api/voices/custom/${encodeURIComponent(voiceId)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete custom voice from server.');
    }
    return data.customVoices || [];
  }

  public static async generateSingleTTS(params: {
    text: string;
    reference_id?: string;
    format?: string;
    speechSpeed?: number;
    numTakes?: number;
  }): Promise<{ success: boolean; audioUrl: string; filename: string; sizeBytes: number; takes?: AudioTake[] }> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate speech chunk.');
    }
    return data;
  }

  public static async generatePreview(
    reference_id: string,
    speechSpeed?: number,
    format?: string
  ): Promise<{ audioUrl: string }> {
    const res = await fetch('/api/tts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_id, speechSpeed, format })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate voice preview.');
    }
    return data;
  }

  public static async regenerateChunk(params: {
    chunkId: string;
    text: string;
    reference_id?: string;
    speechSpeed?: number;
    format?: string;
  }): Promise<{ audioUrl: string; take?: AudioTake }> {
    const res = await fetch('/api/tts/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to regenerate chunk audio.');
    }
    return data;
  }

  public static async generateTakeForChunk(params: {
    chunkId: string;
    text: string;
    reference_id?: string;
    speechSpeed?: number;
    format?: string;
    takeNumber?: number;
  }): Promise<{ success: boolean; chunkId: string; audioUrl: string; take: AudioTake }> {
    const res = await fetch('/api/tts/generate-take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate additional take.');
    }
    return data;
  }

  public static async mergeAudio(params: {
    audioUrls: string[];
    pauseSec: number;
    projectName: string;
  }): Promise<{ audioUrl: string; filename: string }> {
    const res = await fetch('/api/audio/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to merge audio clips.');
    }
    return data;
  }

  public static async downloadZipPackage(params: {
    clips: { audioUrl?: string; chapterTitle?: string }[];
    scriptText: string;
    projectName: string;
  }): Promise<Blob> {
    const res = await fetch('/api/audio/export-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to export ZIP package.');
    }
    return await res.blob();
  }
}
