import {
  Voice,
  ApiHealthResponse,
  AudioTake,
  FishAudioModelSearchQuery,
  FishAudioModelListResponse,
  VoiceDesignRequestPayload,
  VoiceDesignResult,
  AsrTranscriptionResult
} from '../../../shared/src/types';

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

  /**
   * Search / Browse remote and community Fish Audio models
   */
  public static async getRemoteVoices(params: FishAudioModelSearchQuery): Promise<FishAudioModelListResponse> {
    const query = new URLSearchParams();
    if (params.title) query.set('title', params.title);
    if (params.tag) query.set('tag', params.tag);
    if (params.language) query.set('language', params.language);
    if (params.self !== undefined) query.set('self', String(params.self));
    if (params.page_number) query.set('page_number', String(params.page_number));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.sort_by) query.set('sort_by', params.sort_by);

    const res = await fetch(`/api/voices/remote?${query.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch community voices from Fish Audio.');
    }
    return {
      total: data.total || 0,
      items: data.items || [],
      page_number: data.page_number || 1,
      page_size: data.page_size || 20
    };
  }

  /**
   * Instant Zero-Shot Voice Cloning (Upload or Recorded Audio)
   */
  public static async cloneVoice(formData: FormData): Promise<{
    success: boolean;
    voice: Voice;
    customVoices: Voice[];
  }> {
    const res = await fetch('/api/voices/clone', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to clone voice with Fish Audio.');
    }
    return data;
  }

  /**
   * Voice Design: Generate voices from natural language prompts
   */
  public static async designVoice(payload: VoiceDesignRequestPayload): Promise<VoiceDesignResult> {
    const res = await fetch('/api/voices/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to design voice.');
    }
    return data;
  }

  /**
   * Speech to Text (ASR) Audio Transcription
   */
  public static async transcribeAudio(formData: FormData): Promise<AsrTranscriptionResult> {
    const res = await fetch('/api/asr/transcribe', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to transcribe audio.');
    }
    return data;
  }
}

