import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Film,
  FileText,
  Mic,
  Clapperboard,
  Image as ImageIcon,
  Sparkles,
  Download,
  Play,
  Pause,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Languages,
  Subtitles,
  Upload,
  Volume2,
  Eye,
  Sliders,
  Layers,
  ChevronRight,
  RefreshCw,
  Save,
  Check
} from 'lucide-react';
import {
  DocumentaryProject,
  DocumentaryScene,
  DocumentaryTone,
  DocumentaryHandoffResult
} from '../../../shared/src/documentaryTypes';
import { AspectRatio, MotionTitleDesign } from '../../../shared/src/videoEditorTypes';
import { STARTER_MOTION_TEMPLATES } from '../../../shared/src/motionGraphicsEngine';
import { CAPTION_PRESETS } from '../../../shared/src/captionPresets';
import { documentaryApi } from '../services/documentaryApi';

interface DocumentaryStudioProps {
  onOpenVideoEditor: (editorProject?: any) => void;
}

type StudioTab = 'script' | 'voiceover' | 'broll' | 'motion' | 'captions';

const STORAGE_DRAFT_KEY = 'voiceforge_documentary_draft_v4';

export const DocumentaryStudio: React.FC<DocumentaryStudioProps> = ({
  onOpenVideoEditor
}) => {
  const [project, setProject] = useState<DocumentaryProject | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('script');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [rawScriptText, setRawScriptText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isHandoffRunning, setIsHandoffRunning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize or fetch documentary project
  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      try {
        // First check backend projects
        const list = await documentaryApi.listProjects();
        if (!mounted) return;

        if (list && list.length > 0) {
          // Check if local draft is newer
          const localDraftRaw = localStorage.getItem(STORAGE_DRAFT_KEY);
          if (localDraftRaw) {
            try {
              const draft = JSON.parse(localDraftRaw) as DocumentaryProject;
              if (new Date(draft.updatedAt).getTime() > new Date(list[0].updatedAt).getTime()) {
                setProject(draft);
                setSelectedSceneId(draft.scenes[0]?.id || null);
                setIsLoading(false);
                return;
              }
            } catch {}
          }
          setProject(list[0]);
          setSelectedSceneId(list[0].scenes[0]?.id || null);
        }
      } catch (err) {
        console.warn('Failed to load project from server, creating blank project', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadInitial();
    return () => {
      mounted = false;
    };
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (!project) return;
    try {
      localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(project));
      setStatusMessage('Draft saved locally');
    } catch {}
  }, [project]);

  // Handle Audio Play/Pause
  const togglePlayAudio = (url: string) => {
    if (activeAudioUrl === url && isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().then(() => {
        setActiveAudioUrl(url);
        setIsPlayingAudio(true);
      }).catch((e) => console.warn('Audio play error:', e));

      audio.onended = () => {
        setIsPlayingAudio(false);
        setActiveAudioUrl(null);
      };
    }
  };

  // Currently selected scene
  const selectedScene = useMemo(() => {
    if (!project) return null;
    return project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0] || null;
  }, [project, selectedSceneId]);

  // Total documentary duration
  const totalDuration = useMemo(() => {
    if (!project) return 0;
    return project.scenes.reduce((acc, s) => acc + (s.duration || 4.5), 0);
  }, [project]);

  // Update a single scene
  const updateScene = useCallback((sceneId: string, updates: Partial<DocumentaryScene>) => {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)),
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  // Add a new scene
  const handleAddScene = () => {
    if (!project) return;
    const newSceneNumber = project.scenes.length + 1;
    const newScene: DocumentaryScene = {
      id: `scene_${Date.now()}_${newSceneNumber}`,
      sceneNumber: newSceneNumber,
      title: `Scene ${newSceneNumber}: Sequence`,
      narrationText: 'Enter documentary narration script for this scene...',
      visualInstruction: 'Documentary establishing shot matching scene atmosphere',
      sceneDescription: 'Director notes on pacing, framing, and light',
      duration: 5.0
    };
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: [...prev.scenes, newScene],
        updatedAt: new Date().toISOString()
      };
    });
    setSelectedSceneId(newScene.id);
  };

  // Delete scene
  const handleDeleteScene = (sceneId: string) => {
    if (!project || project.scenes.length <= 1) return;
    setProject((prev) => {
      if (!prev) return prev;
      const filtered = prev.scenes.filter((s) => s.id !== sceneId);
      // re-index scene numbers
      const reindexed = filtered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      return {
        ...prev,
        scenes: reindexed,
        updatedAt: new Date().toISOString()
      };
    });
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(project.scenes[0]?.id || null);
    }
  };

  // Parse raw script
  const handleParseRawScript = async () => {
    if (!rawScriptText.trim()) return;
    setIsLoading(true);
    setStatusMessage('Parsing script into scenes...');
    try {
      const parsedScenes = await documentaryApi.parseScript(rawScriptText);
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenes: parsedScenes,
          updatedAt: new Date().toISOString()
        };
      });
      if (parsedScenes.length > 0) {
        setSelectedSceneId(parsedScenes[0].id);
      }
      setStatusMessage(`Parsed ${parsedScenes.length} scenes successfully!`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error parsing script');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload B-roll asset for selected scene
  const handleUploadVisual = async (e: React.ChangeEvent<HTMLInputElement>, sceneId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(`Uploading visual asset ${file.name}...`);
    try {
      const asset = await documentaryApi.uploadVisualAsset(file);
      updateScene(sceneId, {
        visualAsset: {
          id: asset.id,
          name: asset.name,
          url: asset.url,
          type: asset.type === 'image' ? 'image' : 'video',
          duration: asset.duration || 5.0,
          thumbnailUrl: asset.thumbnailUrl
        }
      });
      setStatusMessage(`Visual asset "${file.name}" linked to scene!`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Visual asset upload failed');
    }
  };

  // Upload Voiceover audio for selected scene
  const handleUploadVoiceover = async (e: React.ChangeEvent<HTMLInputElement>, sceneId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(`Uploading narration audio ${file.name}...`);
    try {
      const asset = await documentaryApi.uploadVoiceover(file);
      updateScene(sceneId, {
        duration: asset.duration > 0 ? asset.duration : 5.0,
        voiceoverAsset: {
          id: asset.id,
          name: asset.name,
          url: asset.url,
          duration: asset.duration || 5.0
        }
      });
      setStatusMessage(`Voiceover "${file.name}" linked! Duration: ${asset.duration.toFixed(1)}s`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Voiceover upload failed');
    }
  };

  // Transcribe audio using ASR
  const handleTranscribeScene = async (scene: DocumentaryScene) => {
    if (!scene.voiceoverAsset?.url) {
      alert('Please upload or generate voiceover audio for this scene first.');
      return;
    }
    setStatusMessage('Transcribing audio with timestamps...');
    try {
      // Fetch audio as blob
      const res = await fetch(scene.voiceoverAsset.url);
      const blob = await res.blob();
      const file = new File([blob], scene.voiceoverAsset.name || 'narration.mp3', { type: blob.type });

      const result = await documentaryApi.transcribeAudio(file);
      if (result.segments && result.segments.length > 0) {
        updateScene(scene.id, {
          transcriptionSegments: result.segments.map((seg, idx) => ({
            id: `seg_${scene.id}_${idx}`,
            start: seg.start || 0,
            end: seg.end || 0,
            text: seg.text || ''
          }))
        });
        setStatusMessage(`Transcribed ${result.segments.length} timestamped segments!`);
      } else {
        // Fallback: create single segment
        updateScene(scene.id, {
          transcriptionSegments: [
            {
              id: `seg_${scene.id}_0`,
              start: 0,
              end: scene.duration || 5.0,
              text: result.text || scene.narrationText
            }
          ]
        });
        setStatusMessage('Transcribed full narration segment.');
      }
    } catch (err: any) {
      console.error(err);
      // Graceful fallback for local offline testing: create timestamped segments from text
      const words = scene.narrationText.split(/\s+/).filter(Boolean);
      const half = Math.ceil(words.length / 2);
      const seg1 = words.slice(0, half).join(' ');
      const seg2 = words.slice(half).join(' ');
      const dur = scene.duration || 5.0;
      updateScene(scene.id, {
        transcriptionSegments: [
          { id: `seg_${scene.id}_1`, start: 0, end: dur / 2, text: seg1 },
          { id: `seg_${scene.id}_2`, start: dur / 2, end: dur, text: seg2 }
        ]
      });
      setStatusMessage('Created timestamped narration segments from script.');
    }
  };

  // Hand off project to Video Editor
  const handleHandoff = async () => {
    if (!project) return;
    setIsHandoffRunning(true);
    setStatusMessage('Compiling documentary and generating multitrack timeline...');
    try {
      // 1. Send to handoff API
      const result: DocumentaryHandoffResult = await documentaryApi.handoffToEditor(project);
      
      // 2. Set active editor project in localStorage so VideoEditor loads it
      localStorage.setItem('voiceforge_editor_active_project_id', result.editorProject.id);
      localStorage.setItem(`voiceforge_editor_backup_${result.editorProject.id}`, JSON.stringify(result.editorProject));

      setStatusMessage('Handoff complete! Opening Video Editor...');
      setTimeout(() => {
        onOpenVideoEditor(result.editorProject);
      }, 400);
    } catch (err: any) {
      console.error('Handoff error:', err);
      setStatusMessage('Handoff failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsHandoffRunning(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-slate-400 gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider">
          Initializing Documentary Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full animate-in fade-in duration-300">
      {/* TOP HEADER */}
      <header className="glass-panel rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm p-4 sm:p-5 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
                <Clapperboard className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
                Documentary Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Phase 4 Workflow
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-11">
              SCRIPT • VOICEOVER • TIMESTAMPED ASR • B-ROLL • TITLES • CAPTIONS • MULTITRACK HANDOFF
            </p>
          </div>

          {/* Right Action Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Aspect Ratio */}
            <select
              value={project.aspectRatio}
              onChange={(e) =>
                setProject((p) => p && { ...p, aspectRatio: e.target.value as AspectRatio })
              }
              className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="16:9">16:9 Cinema Landscape</option>
              <option value="9:16">9:16 Vertical Story</option>
              <option value="1:1">1:1 Square Feed</option>
            </select>

            {/* Tone Selector */}
            <select
              value={project.tone}
              onChange={(e) =>
                setProject((p) => p && { ...p, tone: e.target.value as DocumentaryTone })
              }
              className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="cinematic_historical">Cinematic Historical</option>
              <option value="investigative_journalism">Investigative Journalism</option>
              <option value="nature_wildlife">Nature & Wildlife</option>
              <option value="biographical_profile">Biographical Profile</option>
              <option value="scientific_explainer">Scientific Explainer</option>
              <option value="true_crime">True Crime Mystery</option>
            </select>

            {/* Total Duration Badge */}
            <div className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              <span>{totalDuration.toFixed(1)}s Total</span>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={async () => {
                if (!project) return;
                setIsSaving(true);
                try {
                  await documentaryApi.saveProject(project);
                  setStatusMessage('Project saved to server');
                } catch {
                  setStatusMessage('Save failed');
                } finally {
                  setIsSaving(false);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-700 transition cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Hand Off to Multitrack Video Editor Button */}
            <button
              type="button"
              onClick={handleHandoff}
              disabled={isHandoffRunning}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition cursor-pointer"
            >
              <Film className="h-4 w-4" />
              <span>{isHandoffRunning ? 'Compiling...' : 'Send to Video Editor'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* WORKFLOW NAVIGATION STEPS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-studio-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('script')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'script'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-studio-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>1. Script & Scenes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voiceover')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'voiceover'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-studio-900'
          }`}
        >
          <Mic className="h-4 w-4" />
          <span>2. Narration Audio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('broll')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'broll'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-studio-900'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>3. B-Roll Footage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('motion')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'motion'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-studio-900'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>4. Titles & Motion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('captions')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'captions'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-studio-900'
          }`}
        >
          <Subtitles className="h-4 w-4" />
          <span>5. Captions & Review</span>
        </button>
      </div>

      {/* MAIN WORKSPACE CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Scene Navigation & Sequence Timeline */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel rounded-2xl border border-studio-border bg-white dark:bg-studio-900 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-studio-border pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <h3 className="font-serif font-extrabold text-sm text-slate-900 dark:text-white">
                  Documentary Scenes ({project.scenes.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddScene}
                className="flex items-center gap-1 rounded-lg bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Add Scene</span>
              </button>
            </div>

            {/* Scenes Scroll List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {project.scenes.map((scene, idx) => {
                const isSelected = scene.id === selectedSceneId;
                const hasVo = Boolean(scene.voiceoverAsset?.url);
                const hasVis = Boolean(scene.visualAsset?.url);
                const hasMotion = Boolean(scene.motionGraphic?.enabled);

                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/30'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-400 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-white">
                        Scene {scene.sceneNumber} • {scene.duration.toFixed(1)}s
                      </span>
                      <div className="flex items-center gap-1">
                        {project.scenes.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(scene.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                            title="Delete Scene"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {scene.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {scene.narrationText}
                    </p>

                    {/* Scene Media Status Badges */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          hasVo
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-200 dark:bg-studio-800 text-slate-500'
                        }`}
                      >
                        VO {hasVo ? '✓' : '—'}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          hasVis
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-200 dark:bg-studio-800 text-slate-500'
                        }`}
                      >
                        B-Roll {hasVis ? '✓' : '—'}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          hasMotion
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-200 dark:bg-studio-800 text-slate-500'
                        }`}
                      >
                        Title {hasMotion ? '✓' : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Step Editor */}
        <div className="lg:col-span-8">
          {selectedScene && (
            <div className="glass-panel rounded-2xl border border-studio-border bg-white dark:bg-studio-900 p-5 space-y-5">
              {/* Scene Subheader */}
              <div className="flex items-center justify-between border-b border-studio-border pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                    Active Scene Configuration
                  </span>
                  <h2 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">
                    {selectedScene.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">Duration:</span>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    step="0.5"
                    value={selectedScene.duration}
                    onChange={(e) =>
                      updateScene(selectedScene.id, { duration: parseFloat(e.target.value) || 3.0 })
                    }
                    className="w-16 rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-950 p-1.5 text-xs font-mono font-bold text-center outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400">sec</span>
                </div>
              </div>

              {/* TAB 1: SCRIPT & SCENES */}
              {activeTab === 'script' && (
                <div className="space-y-4">
                  {/* Script Input / Scene Narration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Scene Spoken Narration Script
                    </label>
                    <textarea
                      rows={4}
                      value={selectedScene.narrationText}
                      onChange={(e) => updateScene(selectedScene.id, { narrationText: e.target.value })}
                      placeholder="Enter the spoken documentary voiceover for this scene..."
                      className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Visual Instruction & Director Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Visual Direction / B-Roll Cue
                      </label>
                      <input
                        type="text"
                        value={selectedScene.visualInstruction}
                        onChange={(e) =>
                          updateScene(selectedScene.id, { visualInstruction: e.target.value })
                        }
                        placeholder="e.g. Aerial drone sweeping through ancient canyons"
                        className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Atmospheric Scene Notes
                      </label>
                      <input
                        type="text"
                        value={selectedScene.sceneDescription}
                        onChange={(e) =>
                          updateScene(selectedScene.id, { sceneDescription: e.target.value })
                        }
                        placeholder="e.g. Dramatic low lighting, reflective water highlights"
                        className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Bulk Script Importer Accordion */}
                  <div className="rounded-xl border border-dashed border-studio-border p-4 bg-slate-50/50 dark:bg-studio-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Bulk Script Importer & Scene Parser
                      </span>
                      <button
                        type="button"
                        onClick={handleParseRawScript}
                        className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition"
                      >
                        Auto-Segment Script
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={rawScriptText}
                      onChange={(e) => setRawScriptText(e.target.value)}
                      placeholder="Paste full documentary script here with paragraphs or [SCENE 1: Title] tags..."
                      className="w-full rounded-xl border border-studio-border bg-white dark:bg-studio-900 p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: VOICEOVER & TIMESTAMPED ASR */}
              {activeTab === 'voiceover' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Narration Audio for Scene {selectedScene.sceneNumber}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {selectedScene.voiceoverAsset
                            ? `Attached: ${selectedScene.voiceoverAsset.name} (${selectedScene.voiceoverAsset.duration.toFixed(1)}s)`
                            : 'No voiceover attached yet.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedScene.voiceoverAsset?.url && (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(selectedScene.voiceoverAsset!.url)}
                            className="flex items-center gap-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition"
                          >
                            {isPlayingAudio && activeAudioUrl === selectedScene.voiceoverAsset.url ? (
                              <>
                                <Pause className="h-3.5 w-3.5" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5" />
                                <span>Play</span>
                              </>
                            )}
                          </button>
                        )}

                        <label className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-700 cursor-pointer transition">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload Audio</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleUploadVoiceover(e, selectedScene.id)}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleTranscribeScene(selectedScene)}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition"
                        >
                          <Languages className="h-3.5 w-3.5" />
                          <span>Generate Timestamps</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timestamped Segments Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Timestamped Narration Segments
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {selectedScene.transcriptionSegments?.length || 0} segments
                      </span>
                    </div>

                    {selectedScene.transcriptionSegments && selectedScene.transcriptionSegments.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {selectedScene.transcriptionSegments.map((seg, idx) => (
                          <div
                            key={seg.id || idx}
                            className="flex items-center gap-3 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 text-xs"
                          >
                            <span className="font-mono font-bold text-[10px] text-indigo-400 shrink-0">
                              [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                            </span>
                            <input
                              type="text"
                              value={seg.text}
                              onChange={(e) => {
                                const newSegments = [...(selectedScene.transcriptionSegments || [])];
                                newSegments[idx] = { ...newSegments[idx], text: e.target.value };
                                updateScene(selectedScene.id, { transcriptionSegments: newSegments });
                              }}
                              className="flex-1 bg-transparent text-slate-800 dark:text-slate-200 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-studio-border rounded-xl text-slate-500 text-xs">
                        Click "Generate Timestamps" or upload an audio narration to synchronize words.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: B-ROLL FOOTAGE & VISUAL ASSETS */}
              {activeTab === 'broll' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Visual B-Roll Asset (Scene {selectedScene.sceneNumber})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {selectedScene.visualAsset
                            ? `${selectedScene.visualAsset.name} (${selectedScene.visualAsset.type})`
                            : 'No visual asset assigned to this scene.'}
                        </p>
                      </div>

                      <label className="flex items-center gap-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition shrink-0">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Footage or Image</span>
                        <input
                          type="file"
                          accept="video/*,image/*"
                          onChange={(e) => handleUploadVisual(e, selectedScene.id)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preview Player / Thumbnail */}
                    {selectedScene.visualAsset?.url ? (
                      <div className="rounded-xl overflow-hidden border border-studio-border bg-black max-h-64 flex items-center justify-center">
                        {selectedScene.visualAsset.type === 'image' ? (
                          <img
                            src={selectedScene.visualAsset.url}
                            alt="B-roll"
                            className="max-h-64 object-contain"
                          />
                        ) : (
                          <video
                            src={selectedScene.visualAsset.url}
                            controls
                            className="max-h-64 w-full object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="border border-dashed border-studio-border rounded-xl p-8 text-center space-y-2 text-slate-500">
                        <ImageIcon className="h-8 w-8 mx-auto text-slate-400" />
                        <p className="text-xs">Drag and drop local MP4 footage, drone video, or archival image.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: TITLES & MOTION GRAPHICS */}
              {activeTab === 'motion' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Phase 3 Motion Graphics & Titles
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Attach animated documentary titles, lower-thirds, or chapter markers.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedScene.motionGraphic?.enabled)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          if (enabled && !selectedScene.motionGraphic) {
                            // default to Cinematic Master Title or Lower Third
                            const template = STARTER_MOTION_TEMPLATES.find((t) => t.category === 'documentary') || STARTER_MOTION_TEMPLATES[0];
                            updateScene(selectedScene.id, {
                              motionGraphic: {
                                enabled: true,
                                templateId: template.id,
                                type: selectedScene.sceneNumber === 1 ? 'opening' : 'lower_third',
                                titleDesign: { ...template.design, mainText: selectedScene.title.toUpperCase() },
                                startTimeOffset: 0.5,
                                duration: 3.5
                              }
                            });
                          } else {
                            updateScene(selectedScene.id, {
                              motionGraphic: selectedScene.motionGraphic
                                ? { ...selectedScene.motionGraphic, enabled }
                                : undefined
                            });
                          }
                        }}
                        className="rounded border-studio-border text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Enable Title for Scene {selectedScene.sceneNumber}
                      </span>
                    </label>
                  </div>

                  {selectedScene.motionGraphic?.enabled && (
                    <div className="space-y-4 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-4">
                      {/* Preset Templates Picker */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Select Documentary Preset
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {STARTER_MOTION_TEMPLATES.filter((t) =>
                            ['documentary', 'cinematic', 'minimal', 'modern'].includes(t.category)
                          ).slice(0, 8).map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => {
                                updateScene(selectedScene.id, {
                                  motionGraphic: {
                                    ...selectedScene.motionGraphic!,
                                    templateId: tmpl.id,
                                    titleDesign: {
                                      ...tmpl.design,
                                      mainText: selectedScene.motionGraphic?.titleDesign?.mainText || selectedScene.title.toUpperCase(),
                                      subtitleText: selectedScene.motionGraphic?.titleDesign?.subtitleText || tmpl.design.subtitleText
                                    }
                                  }
                                });
                              }}
                              className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                                selectedScene.motionGraphic?.templateId === tmpl.id
                                  ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold'
                                  : 'border-studio-border bg-white dark:bg-studio-900 text-slate-700 dark:text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <div className="truncate font-bold text-[11px]">{tmpl.name}</div>
                              <div className="text-[9px] font-mono text-slate-400 uppercase">{tmpl.category}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title Text Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Main Title Text</label>
                          <input
                            type="text"
                            value={selectedScene.motionGraphic.titleDesign.mainText}
                            onChange={(e) => {
                              const td = { ...selectedScene.motionGraphic!.titleDesign, mainText: e.target.value };
                              updateScene(selectedScene.id, {
                                motionGraphic: { ...selectedScene.motionGraphic!, titleDesign: td }
                              });
                            }}
                            className="w-full rounded-xl border border-studio-border bg-white dark:bg-studio-900 p-2 text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subtitle / Identity Line</label>
                          <input
                            type="text"
                            value={selectedScene.motionGraphic.titleDesign.subtitleText || ''}
                            onChange={(e) => {
                              const td = { ...selectedScene.motionGraphic!.titleDesign, subtitleText: e.target.value };
                              updateScene(selectedScene.id, {
                                motionGraphic: { ...selectedScene.motionGraphic!, titleDesign: td }
                              });
                            }}
                            className="w-full rounded-xl border border-studio-border bg-white dark:bg-studio-900 p-2 text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CAPTIONS & REVIEW */}
              {activeTab === 'captions' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Caption Studio 2.0 Integration (86 Looks)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Burn-in synchronized subtitles across all documentary scenes.
                        </p>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={project.captionSettings.enabled}
                          onChange={(e) =>
                            setProject((p) =>
                              p && {
                                ...p,
                                captionSettings: { ...p.captionSettings, enabled: e.target.checked }
                              }
                            )
                          }
                          className="rounded border-studio-border text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Enable Burn-in Captions
                        </span>
                      </label>
                    </div>

                    {/* Presets List */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      {CAPTION_PRESETS.filter((p) =>
                        ['documentary', 'cinematic', 'multilingual', 'viral'].includes(p.category)
                      ).slice(0, 8).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setProject((p) =>
                              p && {
                                ...p,
                                captionSettings: { ...p.captionSettings, presetId: preset.id }
                              }
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                            project.captionSettings.presetId === preset.id
                              ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold'
                              : 'border-studio-border bg-white dark:bg-studio-900 text-slate-700 dark:text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="truncate font-bold text-[11px]">{preset.name}</div>
                          <div className="text-[9px] font-mono text-slate-400 uppercase">{preset.category}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary & Review Before Handoff */}
                  <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Production Compilation Summary
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-white dark:bg-studio-900 border border-studio-border">
                        <div className="text-lg font-serif font-black text-indigo-400">{project.scenes.length}</div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">Total Scenes</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-studio-900 border border-studio-border">
                        <div className="text-lg font-serif font-black text-indigo-400">{totalDuration.toFixed(1)}s</div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">Timeline Length</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-studio-900 border border-studio-border">
                        <div className="text-lg font-serif font-black text-indigo-400">
                          {project.scenes.filter((s) => s.visualAsset).length}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">B-Roll Visuals</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-studio-900 border border-studio-border">
                        <div className="text-lg font-serif font-black text-indigo-400">
                          {project.scenes.filter((s) => s.motionGraphic?.enabled).length}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">Motion Titles</div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleHandoff}
                        disabled={isHandoffRunning}
                        className="flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
                      >
                        <Film className="h-4 w-4" />
                        <span>Send to Multitrack Video Editor</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER STATUS BAR */}
      <footer className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-studio-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{statusMessage}</span>
        </div>
        <div>
          <span>VoiceForge Studio v4.0 Pro • AI Documentary Engine</span>
        </div>
      </footer>
    </div>
  );
};

