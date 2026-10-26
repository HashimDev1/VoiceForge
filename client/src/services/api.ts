import {
  Voice,
  ApiHealthResponse,
  AudioTake,
  FishAudioModelSearchQuery,
  FishAudioModelListResponse,
  VoiceDesignRequestPayload,
  VoiceDesignResult,
  AsrTranscriptionResult,
  VoiceTranslationProject,
  TranslationOutput,
  VoiceAnalysisResult
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
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response (status ${res.status}): ${text.slice(0, 150)}`);
  }
}

export class ApiClient {
  public static async getHealth(): Promise<ApiHealthResponse> {
    const res = await fetch('/api/health');
    return await safeJson(res);
  }

  public static async testConnection(): Promise<{ success: boolean; message: string; model: string }> {
    const res = await fetch('/api/health/test-connection', { method: 'POST' });
    return await safeJson(res);
  }

  public static async testOpenSourceConnection(): Promise<{ success: boolean; message: string; model: string }> {
    const res = await fetch('/api/open-source-tts/test', { method: 'POST' });
    return await safeJson(res);
  }

  // Standalone Open-Source TTS Service API
  public static async getOpenSourceVoices(): Promise<Voice[]> {
    const res = await fetch('/api/open-source-tts/voices');
    const data = await safeJson(res);
    return data.voices || [];
  }

  public static async generateOpenSourceTTS(params: {
    text: string;
    voiceId?: string;
    voice?: string;
    speechSpeed?: number;
    pitch?: string;
    volume?: string;
    format?: string;
    numTakes?: number;
  }): Promise<{ success: boolean; audioUrl: string; filename: string; duration: number; sizeBytes: number; takes?: AudioTake[] }> {
    const res = await fetch('/api/open-source-tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate Open-Source TTS speech.');
    }
    return data;
  }

  public static async generateOpenSourcePreview(params: {
    voiceId: string;
    previewText?: string;
    speechSpeed?: number;
    format?: string;
  }): Promise<{ audioUrl: string; duration?: number }> {
    const res = await fetch('/api/open-source-tts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate Open-Source TTS preview.');
    }
    return data;
  }

  public static async getVoices(): Promise<Voice[]> {
    const res = await fetch('/api/voices');
    const data = await safeJson(res);
    return data.voices || [];
  }

  public static async saveCustomVoice(voice: Voice): Promise<Voice[]> {
    const res = await fetch('/api/voices/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voice)
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save custom voice to server.');
    }
    return data.customVoices || [];
  }

  public static async deleteCustomVoice(voiceId: string): Promise<Voice[]> {
    const res = await fetch(`/api/voices/custom/${encodeURIComponent(voiceId)}`, {
      method: 'DELETE'
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete custom voice from server.');
    }
    return data.customVoices || [];
  }

  public static async generateSingleTTS(params: {
    text: string;
    reference_id?: string;
    format?: string;
    provider?: 'fish-audio' | 'open-source-tts';
    speechSpeed?: number;
    numTakes?: number;
  }): Promise<{ success: boolean; audioUrl: string; filename: string; sizeBytes: number; takes?: AudioTake[]; providerUsed?: string }> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate speech chunk.');
    }
    return data;
  }

  public static async generatePreview(
    reference_id: string,
    speechSpeed?: number,
    format?: string,
    provider?: 'fish-audio' | 'open-source-tts'
  ): Promise<{ audioUrl: string; providerUsed?: string }> {
    const res = await fetch('/api/tts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_id, speechSpeed, format, provider })
    });

    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate voice preview.');
    }
    return data;
  }

  public static async regenerateChunk(params: {
    chunkId: string;
    text: string;
    reference_id?: string;
    provider?: 'fish-audio' | 'open-source-tts';
    speechSpeed?: number;
    format?: string;
  }): Promise<{ audioUrl: string; take?: AudioTake; providerUsed?: string }> {
    const res = await fetch('/api/tts/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to regenerate chunk audio.');
    }
    return data;
  }

  public static async generateTakeForChunk(params: {
    chunkId: string;
    text: string;
    reference_id?: string;
    provider?: 'fish-audio' | 'open-source-tts';
    speechSpeed?: number;
    format?: string;
    takeNumber?: number;
  }): Promise<{ success: boolean; chunkId: string; audioUrl: string; take: AudioTake; providerUsed?: string }> {
    const res = await fetch('/api/tts/generate-take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await safeJson(res);
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

    const data = await safeJson(res);
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
      const err = await safeJson(res).catch(() => ({}));
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
    const data = await safeJson(res);
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
    const data = await safeJson(res);
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
    const data = await safeJson(res);
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
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to transcribe audio.');
    }
    return data;
  }

  // ==========================================
  // VOICE TRANSLATOR STUDIO API CLIENT
  // ==========================================

  public static async uploadTranslationMedia(formData: FormData): Promise<{
    success: boolean;
    file: { filename: string; url: string; originalName: string; sizeBytes: number; mimeType?: string };
    sourceFileType: 'audio' | 'video';
    analysis: VoiceAnalysisResult;
  }> {
    const res = await fetch('/api/translation/upload', {
      method: 'POST',
      body: formData
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload media file.');
    }
    return data;
  }

  public static async importYouTubeMedia(url: string, downloadVideo: boolean = false): Promise<{
    success: boolean;
    file: { filename: string; url: string; originalName: string; sizeBytes: number };
    sourceFileType: 'audio' | 'video';
    analysis: VoiceAnalysisResult;
  }> {
    const res = await fetch('/api/translation/import-youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, downloadVideo })
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to import YouTube audio/video.');
    }
    return data;
  }

  public static async getTranslationProjects(): Promise<VoiceTranslationProject[]> {
    const res = await fetch('/api/translation/projects');
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch translation projects.');
    }
    return data.projects || [];
  }

  public static async getTranslationProject(id: string): Promise<VoiceTranslationProject> {
    const res = await fetch(`/api/translation/projects/${encodeURIComponent(id)}`);
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch translation project.');
    }
    return data.project;
  }

  public static async createTranslationProject(payload: any): Promise<VoiceTranslationProject> {
    const res = await fetch('/api/translation/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to start AI translation.');
    }
    return data.project;
  }

  public static async deleteTranslationProject(id: string): Promise<void> {
    const res = await fetch(`/api/translation/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete translation project.');
    }
  }

  public static async deleteTranslationOutput(projectId: string, outputId: string): Promise<VoiceTranslationProject> {
    const res = await fetch(`/api/translation/projects/${encodeURIComponent(projectId)}/outputs/${encodeURIComponent(outputId)}`, {
      method: 'DELETE'
    });
    const data = await safeJson(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete translation output.');
    }
    return data.project;
  }
}
