import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, ScriptChunk, Voice, ChunkSettings, ApiHealthResponse } from '../../../shared/src/types';
import { splitScriptIntoChunks } from '../../../shared/src/chunking';
import { ApiClient } from '../services/api';

const DEFAULT_CHUNK_SETTINGS: ChunkSettings = {
  preset: 'Medium',
  maxCharacters: 300,
  preserveParagraphs: true
};

const DEFAULT_VOICE: Voice = {
  id: 'default_s21_free',
  name: 'Fish Audio Default (s2.1-pro-free)',
  language: 'English',
  style: 'Natural / Standard',
  gender: 'Neutral',
  description: 'Standard default voice provided by the Fish Audio s2.1-pro-free model.',
  category: 'Calm'
};

const PROJECTS_STORAGE_KEY = 'voiceforge_projects_v1';
const ACTIVE_PROJECT_KEY = 'voiceforge_active_project_id';

export function useProjectStore() {
  const [voices, setVoices] = useState<Voice[]>([DEFAULT_VOICE]);
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse>({
    status: 'degraded',
    fishAudioConnected: false,
    message: 'Checking Fish Audio backend status...',
    model: 's2.1-pro-free'
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeProject, setActiveProject] = useState<Project>(() => {
    const existingId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    const existing = projects.find((p) => p.id === existingId);
    if (existing) return existing;

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: 'Untitled Voiceover',
      script: '',
      selectedVoice: DEFAULT_VOICE,
      wpm: 145,
      speechSpeed: 1.0,
      audioFormat: 'mp3',
      pauseBetweenClipsSec: 0.25,
      chunkSettings: DEFAULT_CHUNK_SETTINGS,
      chunks: [],
      multiTakeEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft'
    };
    return newProj;
  });

  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const isGeneratingRef = useRef<boolean>(false);

  // Sync projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeProject.id);
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [projects, activeProject.id]);

  // Initial backend health & voice catalog check
  const refreshBackendStatus = useCallback(async () => {
    try {
      const health = await ApiClient.getHealth();
      setApiHealth(health);
      const voiceList = await ApiClient.getVoices();
      if (voiceList.length > 0) {
        setVoices(voiceList);
        const serverCustom = voiceList.filter((v) => v.isCustom);
        if (serverCustom.length > 0) {
          setCustomVoices(serverCustom);
        } else {
          // If server has none yet, check if this browser has local custom voices and sync them to server
          try {
            const saved = localStorage.getItem('voiceforge_custom_voices_v1');
            const localList: Voice[] = saved ? JSON.parse(saved) : [];
            if (localList.length > 0) {
              for (const v of localList) {
                await ApiClient.saveCustomVoice(v).catch(() => {});
              }
              const reloaded = await ApiClient.getVoices();
              setVoices(reloaded);
              setCustomVoices(reloaded.filter((v) => v.isCustom));
            }
          } catch (syncErr) {
            console.warn('Auto-sync of local custom voices failed:', syncErr);
          }
        }
      }
    } catch (e) {
      setApiHealth({
        status: 'error',
        fishAudioConnected: false,
        message: 'Backend server not connected. Ensure Express server is running on port 5000.',
        model: 's2.1-pro-free'
      });
    }
  }, []);

  useEffect(() => {
    refreshBackendStatus();
  }, [refreshBackendStatus]);

  // Project Auto-Save helper
  const updateActiveProject = useCallback((updater: (prev: Project) => Project) => {
    setActiveProject((prev) => {
      const updated = updater(prev);
      updated.updatedAt = new Date().toISOString();
      setProjects((list) => {
        const idx = list.findIndex((p) => p.id === updated.id);
        if (idx >= 0) {
          const newList = [...list];
          newList[idx] = updated;
          return newList;
        }
        return [updated, ...list];
      });
      return updated;
    });
  }, []);

  // Update Script Text and Auto Chunk
  const setScriptText = useCallback(
    (script: string) => {
      updateActiveProject((prev) => {
        let name = prev.name;
        if ((!name || name === 'Untitled Voiceover') && script.trim()) {
          const firstLine = script.trim().split('\n')[0].slice(0, 30).trim();
          if (firstLine) name = firstLine;
        }

        const { chunks } = splitScriptIntoChunks(script, prev.chunkSettings, prev.wpm);
        return {
          ...prev,
          name,
          script,
          chunks
        };
      });
    },
    [updateActiveProject]
  );

  // Re-chunk active script when chunk settings or WPM change
  const setChunkSettings = useCallback(
    (settings: ChunkSettings) => {
      updateActiveProject((prev) => {
        const { chunks } = splitScriptIntoChunks(prev.script, settings, prev.wpm);
        return { ...prev, chunkSettings: settings, chunks };
      });
    },
    [updateActiveProject]
  );

  const setWpm = useCallback(
    (wpm: number) => {
      updateActiveProject((prev) => {
        const { chunks } = splitScriptIntoChunks(prev.script, prev.chunkSettings, wpm);
        return { ...prev, wpm, chunks };
      });
    },
    [updateActiveProject]
  );

  const setVoice = useCallback(
    (voice: Voice) => {
      updateActiveProject((prev) => ({ ...prev, selectedVoice: voice }));
    },
    [updateActiveProject]
  );

  const setSpeechSpeed = useCallback(
    (speechSpeed: number) => {
      updateActiveProject((prev) => ({
        ...prev,
        speechSpeed,
        chunks: prev.chunks.map((c) => ({
          ...c,
          speechSpeed,
          status: 'idle' as const
        }))
      }));
    },
    [updateActiveProject]
  );

  const setAudioFormat = useCallback(
    (audioFormat: 'mp3' | 'wav' | 'pcm' | 'opus') => {
      updateActiveProject((prev) => ({
        ...prev,
        audioFormat,
        chunks: prev.chunks.map((c) => ({
          ...c,
          status: 'idle' as const
        }))
      }));
    },
    [updateActiveProject]
  );

  const setPauseBetweenClips = useCallback(
    (pauseSec: number) => {
      updateActiveProject((prev) => ({ ...prev, pauseBetweenClipsSec: pauseSec }));
    },
    [updateActiveProject]
  );

  // Single chunk text edit
  const updateChunkText = useCallback(
    (chunkId: string, newText: string) => {
      updateActiveProject((prev) => {
        const chunks = prev.chunks.map((c) => {
          if (c.id === chunkId) {
            const wordCount = newText.split(/\s+/).filter(Boolean).length;
            return {
              ...c,
              text: newText,
              wordCount,
              characterCount: newText.length,
              status: 'idle' as const
            };
          }
          return c;
        });
        return { ...prev, chunks };
      });
    },
    [updateActiveProject]
  );

  // Reorder chunks
  const reorderChunks = useCallback(
    (startIndex: number, endIndex: number) => {
      updateActiveProject((prev) => {
        const result = Array.from(prev.chunks);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        const updatedIndexChunks = result.map((c, i) => ({ ...c, index: i + 1 }));
        return { ...prev, chunks: updatedIndexChunks };
      });
    },
    [updateActiveProject]
  );

  // Set multi-take mode
  const setMultiTakeEnabled = useCallback(
    (enabled: boolean) => {
      updateActiveProject((prev) => ({
        ...prev,
        multiTakeEnabled: enabled
      }));
    },
    [updateActiveProject]
  );

  // Select an active take for a chunk
  const selectTake = useCallback(
    (chunkId: string, takeId: string) => {
      updateActiveProject((prev) => {
        const chunks = prev.chunks.map((c) => {
          if (c.id === chunkId && c.takes) {
            const chosen = c.takes.find((t) => t.id === takeId);
            if (chosen) {
              return {
                ...c,
                activeTakeId: takeId,
                audioUrl: chosen.audioUrl
              };
            }
          }
          return c;
        });
        return { ...prev, chunks };
      });
    },
    [updateActiveProject]
  );

  // Generate an additional take for a specific chunk on-demand
  const generateNewTake = useCallback(
    async (chunkId: string) => {
      const chunk = activeProject.chunks.find((c) => c.id === chunkId);
      if (!chunk) return;

      updateActiveProject((prev) => ({
        ...prev,
        chunks: prev.chunks.map((c) => (c.id === chunkId ? { ...c, status: 'generating', error: undefined } : c))
      }));

      try {
        const currentCount = chunk.takes?.length || (chunk.audioUrl ? 1 : 0);
        const nextTakeNumber = currentCount + 1;

        const res = await ApiClient.generateTakeForChunk({
          chunkId,
          text: chunk.text,
          reference_id: activeProject.selectedVoice.id,
          format: activeProject.audioFormat || 'mp3',
          speechSpeed: activeProject.speechSpeed || 1.0,
          takeNumber: nextTakeNumber
        });

        updateActiveProject((prev) => {
          const chunks = prev.chunks.map((c) => {
            if (c.id === chunkId) {
              const existingTakes = c.takes && c.takes.length > 0
                ? [...c.takes]
                : c.audioUrl
                ? [{ id: `take_${Date.now()}_1`, label: 'Take 1', audioUrl: c.audioUrl, createdAt: new Date().toISOString() }]
                : [];
              existingTakes.push(res.take);

              return {
                ...c,
                status: 'success' as const,
                audioUrl: res.take.audioUrl,
                takes: existingTakes,
                activeTakeId: res.take.id,
                error: undefined
              };
            }
            return c;
          });
          return { ...prev, chunks };
        });
      } catch (err: any) {
        updateActiveProject((prev) => ({
          ...prev,
          chunks: prev.chunks.map((c) =>
            c.id === chunkId ? { ...c, status: 'error', error: err.message || 'Failed to generate take' } : c
          )
        }));
      }
    },
    [activeProject, updateActiveProject]
  );

  // Regenerate single chunk
  const regenerateSingleChunk = useCallback(
    async (chunkId: string) => {
      const chunk = activeProject.chunks.find((c) => c.id === chunkId);
      if (!chunk) return;

      updateActiveProject((prev) => ({
        ...prev,
        chunks: prev.chunks.map((c) => (c.id === chunkId ? { ...c, status: 'generating', error: undefined } : c))
      }));

      try {
        const numTakes = activeProject.multiTakeEnabled ? 2 : 1;
        const result = await ApiClient.generateSingleTTS({
          text: chunk.text,
          reference_id: activeProject.selectedVoice.id,
          speechSpeed: activeProject.speechSpeed || 1.0,
          format: activeProject.audioFormat || 'mp3',
          numTakes
        });

        const takes = result.takes && result.takes.length > 0 ? result.takes : [
          { id: `take_${Date.now()}_1`, label: 'Take 1', audioUrl: result.audioUrl, createdAt: new Date().toISOString() }
        ];

        updateActiveProject((prev) => ({
          ...prev,
          chunks: prev.chunks.map((c) =>
            c.id === chunkId ? {
              ...c,
              status: 'success',
              audioUrl: result.audioUrl,
              takes,
              activeTakeId: takes[0]?.id,
              error: undefined
            } : c
          )
        }));
      } catch (err: any) {
        updateActiveProject((prev) => ({
          ...prev,
          chunks: prev.chunks.map((c) =>
            c.id === chunkId ? { ...c, status: 'error', error: err.message || 'Regeneration failed' } : c
          )
        }));
      }
    },
    [activeProject, updateActiveProject]
  );

  // Batch Generation Queue (Controlled concurrency = 2)
  const generateAllChunks = useCallback(
    async (retryOnlyFailed: boolean = false) => {
      if (isGeneratingRef.current) return;
      isGeneratingRef.current = true;
      setIsGeneratingBatch(true);

      updateActiveProject((prev) => ({ ...prev, status: 'processing' }));

      const chunksToProcess = activeProject.chunks.filter((c) => {
        if (retryOnlyFailed) return c.status === 'error';
        return c.status !== 'success';
      });

      const maxConcurrency = 2;
      let currentIndex = 0;

      const processNext = async () => {
        while (currentIndex < chunksToProcess.length) {
          const chunk = chunksToProcess[currentIndex++];
          const chunkId = chunk.id;

          // Set chunk status to generating
          updateActiveProject((prev) => ({
            ...prev,
            chunks: prev.chunks.map((c) => (c.id === chunkId ? { ...c, status: 'generating', error: undefined } : c))
          }));

          try {
            const numTakes = activeProject.multiTakeEnabled ? 2 : 1;
            const res = await ApiClient.generateSingleTTS({
              text: chunk.text,
              reference_id: activeProject.selectedVoice.id,
              format: activeProject.audioFormat || 'mp3',
              speechSpeed: activeProject.speechSpeed || 1.0,
              numTakes
            });

            const takes = res.takes && res.takes.length > 0 ? res.takes : [
              { id: `take_${Date.now()}_1`, label: 'Take 1', audioUrl: res.audioUrl, createdAt: new Date().toISOString() }
            ];

            updateActiveProject((prev) => ({
              ...prev,
              chunks: prev.chunks.map((c) =>
                c.id === chunkId ? {
                  ...c,
                  status: 'success',
                  audioUrl: res.audioUrl,
                  takes,
                  activeTakeId: takes[0]?.id,
                  error: undefined
                } : c
              )
            }));
          } catch (err: any) {
            updateActiveProject((prev) => ({
              ...prev,
              chunks: prev.chunks.map((c) =>
                c.id === chunkId ? { ...c, status: 'error', error: err.message || 'Failed' } : c
              )
            }));
          }
        }
      };

      const workers = Array.from({ length: Math.min(maxConcurrency, chunksToProcess.length) }, () => processNext());
      await Promise.all(workers);

      isGeneratingRef.current = false;
      setIsGeneratingBatch(false);

      // Determine final project status
      setActiveProject((current) => {
        const allSuccess = current.chunks.length > 0 && current.chunks.every((c) => c.status === 'success');
        const finalStatus = allSuccess ? 'completed' : 'error';
        return { ...current, status: finalStatus };
      });
    },
    [activeProject, updateActiveProject]
  );

  // Merge full voiceover audio
  const mergeFullVoiceover = useCallback(async () => {
    const successChunks = activeProject.chunks.filter((c) => c.status === 'success' && c.audioUrl);
    if (successChunks.length === 0) {
      throw new Error('No generated clips available to merge.');
    }

    const audioUrls = successChunks.map((c) => c.audioUrl!);
    const res = await ApiClient.mergeAudio({
      audioUrls,
      pauseSec: activeProject.pauseBetweenClipsSec,
      projectName: activeProject.name
    });

    updateActiveProject((prev) => ({
      ...prev,
      finalAudioUrl: res.audioUrl,
      status: 'completed'
    }));

    return res;
  }, [activeProject, updateActiveProject]);

  // Create new project
  const createNewProject = useCallback(() => {
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: 'Untitled Voiceover',
      script: '',
      selectedVoice: DEFAULT_VOICE,
      wpm: 145,
      speechSpeed: 1.0,
      audioFormat: 'mp3',
      pauseBetweenClipsSec: 0.25,
      chunkSettings: DEFAULT_CHUNK_SETTINGS,
      chunks: [],
      multiTakeEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft'
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  // Persistent Custom Voices state
  const [customVoices, setCustomVoices] = useState<Voice[]>(() => {
    try {
      const saved = localStorage.getItem('voiceforge_custom_voices_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('voiceforge_custom_voices_v1', JSON.stringify(customVoices));
    } catch (e) {
      console.warn('Failed to save custom voices to LocalStorage:', e);
    }
  }, [customVoices]);

  const saveCustomVoice = useCallback(async (voice: Voice) => {
    const customVoice: Voice = { ...voice, isCustom: true };
    // Optimistic local update
    setCustomVoices((prev) => {
      const idx = prev.findIndex((v) => v.id === customVoice.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = customVoice;
        return next;
      }
      return [customVoice, ...prev];
    });
    setVoice(customVoice);

    // Persist to backend server
    try {
      const updatedList = await ApiClient.saveCustomVoice(customVoice);
      if (updatedList && updatedList.length > 0) {
        setCustomVoices(updatedList);
      }
    } catch (err) {
      console.error('Failed to persist custom voice to server:', err);
    }
  }, [setVoice]);

  const deleteCustomVoice = useCallback(async (voiceId: string) => {
    // Optimistic local update
    setCustomVoices((prev) => prev.filter((v) => v.id !== voiceId));

    // Delete on backend server
    try {
      const updatedList = await ApiClient.deleteCustomVoice(voiceId);
      setCustomVoices(updatedList);
    } catch (err) {
      console.error('Failed to delete custom voice from server:', err);
    }
  }, []);

  // Manual Chunking Actions
  const addNewChunk = useCallback(() => {
    updateActiveProject((prev) => {
      const newIndex = prev.chunks.length + 1;
      const newChunk: ScriptChunk = {
        id: `chunk_${Date.now()}_${newIndex}`,
        index: newIndex,
        chapterIndex: 1,
        chapterTitle: 'Custom Clip',
        text: 'New narration chunk text...',
        wordCount: 4,
        characterCount: 26,
        estimatedDurationSec: 2,
        status: 'idle'
      };
      return {
        ...prev,
        chunks: [...prev.chunks, newChunk]
      };
    });
  }, [updateActiveProject]);

  const deleteChunk = useCallback((chunkId: string) => {
    updateActiveProject((prev) => {
      const remaining = prev.chunks.filter((c) => c.id !== chunkId);
      const reindexed = remaining.map((c, i) => ({ ...c, index: i + 1 }));
      return {
        ...prev,
        chunks: reindexed
      };
    });
  }, [updateActiveProject]);

  return {
    voices: [
      ...customVoices,
      ...voices.filter((v) => !v.isCustom && !customVoices.some((cv) => cv.id === v.id))
    ],
    customVoices,
    saveCustomVoice,
    deleteCustomVoice,
    apiHealth,
    projects,
    activeProject,
    isGeneratingBatch,
    refreshBackendStatus,
    setActiveProject,
    setScriptText,
    setChunkSettings,
    setWpm,
    setSpeechSpeed,
    setAudioFormat,
    setVoice,
    setPauseBetweenClips,
    setMultiTakeEnabled,
    selectTake,
    generateNewTake,
    updateChunkText,
    reorderChunks,
    addNewChunk,
    deleteChunk,
    regenerateSingleChunk,
    generateAllChunks,
    mergeFullVoiceover,
    createNewProject,
    deleteProject
  };
}
