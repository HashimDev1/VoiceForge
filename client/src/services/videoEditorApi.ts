import {
  EditorProject,
  MediaAsset,
  EditorExportOptions,
  EditorExportJob,
  EditorFrameExportOptions,
  EditorFrameExportResult,
  EditorImagesZipResult,
  CustomFontAsset,
  MotionTitleTemplate,
  FacelessScriptRequest,
  FacelessAudioRequest,
  FacelessGenerationResult,
  FacelessVisualStyle
} from '../../../shared/src/videoEditorTypes';

const API_BASE = '/api/editor';

export const videoEditorApi = {
  async listProjects(): Promise<Array<{
    id: string;
    name: string;
    aspectRatio: string;
    duration: number;
    updatedAt: string;
    clipsCount: number;
    assetsCount: number;
  }>> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to list projects');
    const data = await res.json();
    return data.projects || [];
  },

  async getProject(id: string): Promise<EditorProject> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error(`Failed to load project ${id}`);
    const data = await res.json();
    return data.project;
  },

  async saveProject(project: EditorProject): Promise<EditorProject> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    if (!res.ok) throw new Error('Failed to save project');
    const data = await res.json();
    return data.project;
  },

  async deleteProject(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
    const data = await res.json();
    return data.deleted;
  },

  async duplicateProject(id: string): Promise<EditorProject> {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate project');
    const data = await res.json();
    return data.project;
  },

  async verifyAssets(projectId: string): Promise<{ project: EditorProject; missingCount: number }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/verify-assets`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to verify project assets');
    return await res.json();
  },

  async uploadMedia(file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload media');
    }
    const data = await res.json();
    return data.asset;
  },

  async uploadBulkMedia(files: File[]): Promise<MediaAsset[]> {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const res = await fetch(`${API_BASE}/upload-bulk`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload bulk media');
    }
    const data = await res.json();
    return data.assets || [];
  },

  async startExport(project: EditorProject, options: EditorExportOptions): Promise<EditorExportJob> {
    const res = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, options })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start export');
    }
    const data = await res.json();
    return data.job;
  },

  async getExportStatus(jobId: string): Promise<EditorExportJob> {
    const res = await fetch(`${API_BASE}/export/status/${jobId}`);
    if (!res.ok) throw new Error('Failed to check export status');
    const data = await res.json();
    return data.job;
  },

  async cancelExport(jobId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/export/cancel/${jobId}`, { method: 'POST' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success;
  },

  async exportFrame(project: EditorProject, options: EditorFrameExportOptions): Promise<EditorFrameExportResult> {
    const res = await fetch(`${API_BASE}/export-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, options })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export frame');
    }
    return await res.json();
  },

  async exportImagesZip(project: EditorProject): Promise<EditorImagesZipResult> {
    const res = await fetch(`${API_BASE}/export-images-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export images zip');
    }
    return await res.json();
  },

  async listFonts(): Promise<CustomFontAsset[]> {
    const res = await fetch(`${API_BASE}/fonts`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.fonts || [];
  },

  async uploadFont(file: File): Promise<CustomFontAsset> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/fonts/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload custom font');
    }
    const data = await res.json();
    return data.font;
  },

  async listMotionTemplates(): Promise<MotionTitleTemplate[]> {
    const res = await fetch(`${API_BASE}/motion-templates`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.templates || [];
  },

  async saveMotionTemplate(template: MotionTitleTemplate): Promise<MotionTitleTemplate> {
    const res = await fetch(`${API_BASE}/motion-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!res.ok) throw new Error('Failed to save motion template');
    const data = await res.json();
    return data.template;
  },

  async deleteMotionTemplate(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/motion-templates/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success;
  },

  async generateFacelessFromScript(req: FacelessScriptRequest): Promise<FacelessGenerationResult> {
    const res = await fetch(`${API_BASE}/faceless/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate faceless video from script');
    }
    return await res.json();
  },

  async generateFacelessFromAudio(req: FacelessAudioRequest): Promise<FacelessGenerationResult> {
    const res = await fetch(`${API_BASE}/faceless/generate-from-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate visuals from audio');
    }
    return await res.json();
  },

  async previewFacelessPrompts(script: string, style: FacelessVisualStyle): Promise<Array<{ index: number; sentence: string; visualPrompt: string }>> {
    const res = await fetch(`${API_BASE}/faceless/preview-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, style })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.scenes || [];
  },

  async getFacelessConfig(): Promise<any> {
    const res = await fetch(`${API_BASE}/faceless/config`);
    if (!res.ok) return null;
    return await res.json();
  }
};
