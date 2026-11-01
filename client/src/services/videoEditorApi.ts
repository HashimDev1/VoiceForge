import { EditorProject, MediaAsset, EditorExportOptions, EditorExportJob } from '../../../shared/src/videoEditorTypes';

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
  }
};

