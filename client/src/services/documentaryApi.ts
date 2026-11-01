import {
  DocumentaryProject,
  DocumentaryScene,
  DocumentaryHandoffResult
} from '../../../shared/src/documentaryTypes';
import { MediaAsset } from '../../../shared/src/videoEditorTypes';

const API_BASE = '/api/documentary';

export const documentaryApi = {
  async listProjects(): Promise<DocumentaryProject[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to list documentary projects');
    const data = await res.json();
    return data.projects || [];
  },

  async getProject(id: string): Promise<DocumentaryProject> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error(`Failed to load documentary project ${id}`);
    const data = await res.json();
    return data.project;
  },

  async saveProject(project: DocumentaryProject): Promise<DocumentaryProject> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    if (!res.ok) throw new Error('Failed to save documentary project');
    const data = await res.json();
    return data.project;
  },

  async deleteProject(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete documentary project');
    const data = await res.json();
    return data.deleted;
  },

  async parseScript(scriptText: string): Promise<DocumentaryScene[]> {
    const res = await fetch(`${API_BASE}/parse-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText })
    });
    if (!res.ok) throw new Error('Failed to parse documentary script');
    const data = await res.json();
    return data.scenes || [];
  },

  async handoffToEditor(project: DocumentaryProject): Promise<DocumentaryHandoffResult> {
    const res = await fetch(`${API_BASE}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    if (!res.ok) throw new Error('Failed to hand off project to video editor');
    return await res.json();
  },

  async uploadVisualAsset(file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/editor/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload visual asset');
    const data = await res.json();
    return data.asset;
  },

  async uploadVoiceover(file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/editor/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload voiceover audio');
    const data = await res.json();
    return data.asset;
  },

  async transcribeAudio(file: File, language?: string): Promise<{ text: string; segments?: any[] }> {
    const formData = new FormData();
    formData.append('audio', file);
    if (language) formData.append('language', language);
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to transcribe narration audio');
    return await res.json();
  }
};

