import { useState, useEffect, useRef, useCallback } from 'react';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  MediaAsset,
  AspectRatio,
  TrackType,
  Keyframe
} from '../../../../shared/src/videoEditorTypes';
import {
  createNewProject,
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS,
  ASPECT_RATIOS
} from '../../../../shared/src/videoEditorDefaults';
import { videoEditorApi } from '../../services/videoEditorApi';

export function useVideoEditor(initialProject?: EditorProject) {
  const [project, setProject] = useState<EditorProject>(
    () => initialProject || createNewProject('New Video Project', '9:16')
  );
  const [playhead, setPlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 40px per second
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<'select' | 'split'>('select');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>('All changes saved');

  // History stack for Undo/Redo
  const [undoStack, setUndoStack] = useState<EditorProject[]>([]);
  const [redoStack, setRedoStack] = useState<EditorProject[]>([]);

  const playheadRef = useRef<number>(playhead);
  playheadRef.current = playhead;

  const projectRef = useRef<EditorProject>(project);
  projectRef.current = project;

  // Record history snapshot before mutating project state
  const pushHistory = useCallback((currentProj: EditorProject) => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentProj))]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, JSON.parse(JSON.stringify(projectRef.current))]);
    setProject(prev);
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, JSON.parse(JSON.stringify(projectRef.current))]);
    setProject(next);
  }, [redoStack]);

  // Playhead animation loop when playing
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      setPlayhead((cur) => {
        const next = cur + deltaSec;
        if (next >= projectRef.current.duration) {
          setIsPlaying(false);
          return 0; // loop back or stop
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(projectRef.current.duration, time));
    setPlayhead(clamped);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  // Save project to backend API and localStorage
  const saveProject = useCallback(async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(`voiceforge_editor_${project.id}`, JSON.stringify(project));
      await videoEditorApi.saveProject(project);
      setLastSavedText(`Saved ${new Date().toLocaleTimeString()}`);
    } catch {
      setLastSavedText('Saved locally');
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  // Autosave periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProject();
    }, 15000);
    return () => clearTimeout(timer);
  }, [project, saveProject]);

  // Update Project Metadata (Name, Aspect Ratio, Duration)
  const updateProjectMeta = useCallback((patch: Partial<EditorProject>) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString()
    }));
  }, [pushHistory]);

  const setAspectRatio = useCallback((ratio: AspectRatio) => {
    const def = ASPECT_RATIOS.find((r) => r.id === ratio) || ASPECT_RATIOS[0];
    updateProjectMeta({
      aspectRatio: ratio,
      customWidth: def.width,
      customHeight: def.height
    });
  }, [updateProjectMeta]);

  // Media Asset Management
  const addAsset = useCallback((asset: MediaAsset) => {
    setProject((prev) => {
      if (prev.assets.some((a) => a.id === asset.id)) return prev;
      return {
        ...prev,
        assets: [asset, ...prev.assets]
      };
    });
  }, []);

  // Clip Management
  const addClipToTrack = useCallback((trackId: string, asset: MediaAsset, startSec?: number) => {
    pushHistory(projectRef.current);
    const targetTrack = projectRef.current.tracks.find((t) => t.id === trackId);
    const clipType = targetTrack ? targetTrack.type : (asset.type as TrackType);
    const clipDuration = Math.max(1, asset.duration || 5);
    const start = startSec !== undefined ? startSec : playheadRef.current;

    const newClip: TimelineClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      trackId,
      assetId: asset.id,
      name: asset.name,
      type: clipType,
      start,
      duration: clipDuration,
      sourceStart: 0,
      sourceDuration: clipDuration,
      url: asset.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      effects: [],
      keyframes: []
    };

    setProject((prev) => {
      const nextDuration = Math.max(prev.duration, start + clipDuration + 2);
      return {
        ...prev,
        duration: nextDuration,
        clips: [...prev.clips, newClip]
      };
    });

    setSelectedClipId(newClip.id);
  }, [pushHistory]);

  const addTextClip = useCallback((text: string, presetName?: string) => {
    pushHistory(projectRef.current);
    let textTrack = projectRef.current.tracks.find((t) => t.type === 'text');
    if (!textTrack) {
      textTrack = {
        id: `track_text_${Date.now()}`,
        name: 'Titles & Overlays',
        type: 'text',
        locked: false,
        muted: false,
        hidden: false,
        order: 2
      };
      setProject((prev) => ({ ...prev, tracks: [...prev.tracks, textTrack!] }));
    }

    const duration = 4.0;
    const start = playheadRef.current;
    const newClip: TimelineClip = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trackId: textTrack.id,
      name: text.length > 20 ? `${text.slice(0, 18)}...` : text,
      type: 'text',
      start,
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      text,
      captionPresetId: presetName,
      transform: { ...DEFAULT_TRANSFORM, y: 30, scale: 1 },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      effects: [],
      keyframes: []
    };

    setProject((prev) => {
      const nextDuration = Math.max(prev.duration, start + duration + 1);
      return {
        ...prev,
        duration: nextDuration,
        clips: [...prev.clips, newClip]
      };
    });

    setSelectedClipId(newClip.id);
  }, [pushHistory]);

  const updateClip = useCallback((clipId: string, patch: Partial<TimelineClip>) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c))
    }));
  }, []);

  const deleteClip = useCallback((clipId: string) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => c.id !== clipId)
    }));
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [pushHistory, selectedClipId]);

  const duplicateClip = useCallback((clipId: string) => {
    const orig = projectRef.current.clips.find((c) => c.id === clipId);
    if (!orig) return;
    pushHistory(projectRef.current);

    const dup: TimelineClip = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${orig.name} (Copy)`,
      start: orig.start + orig.duration + 0.1
    };

    setProject((prev) => ({
      ...prev,
      duration: Math.max(prev.duration, dup.start + dup.duration + 2),
      clips: [...prev.clips, dup]
    }));
    setSelectedClipId(dup.id);
  }, [pushHistory]);

  const splitClipAtPlayhead = useCallback((targetClipId?: string) => {
    const curTime = playheadRef.current;
    const clipToSplit = projectRef.current.clips.find((c) =>
      targetClipId ? c.id === targetClipId : curTime > c.start && curTime < c.start + c.duration
    );

    if (!clipToSplit) return;
    pushHistory(projectRef.current);

    const firstDuration = curTime - clipToSplit.start;
    const secondDuration = clipToSplit.duration - firstDuration;

    if (firstDuration < 0.1 || secondDuration < 0.1) return; // Ignore micro slivers

    const firstClip: TimelineClip = {
      ...clipToSplit,
      duration: firstDuration
    };

    const secondClip: TimelineClip = {
      ...JSON.parse(JSON.stringify(clipToSplit)),
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      start: curTime,
      duration: secondDuration,
      sourceStart: (clipToSplit.sourceStart || 0) + firstDuration * (clipToSplit.speed?.speed || 1)
    };

    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipToSplit.id ? firstClip : c)).concat(secondClip)
    }));
    setSelectedClipId(secondClip.id);
  }, [pushHistory]);

  const trimClipStart = useCallback((clipId: string, newStart: number) => {
    setProject((prev) => {
      return {
        ...prev,
        clips: prev.clips.map((c) => {
          if (c.id !== clipId) return c;
          const end = c.start + c.duration;
          const clampedStart = Math.max(0, Math.min(end - 0.2, newStart));
          const diff = clampedStart - c.start;
          const newDur = end - clampedStart;
          const newSourceStart = Math.max(0, (c.sourceStart || 0) + diff * (c.speed?.speed || 1));
          return {
            ...c,
            start: clampedStart,
            duration: newDur,
            sourceStart: newSourceStart
          };
        })
      };
    });
  }, []);

  const trimClipEnd = useCallback((clipId: string, newEnd: number) => {
    setProject((prev) => {
      return {
        ...prev,
        clips: prev.clips.map((c) => {
          if (c.id !== clipId) return c;
          const minEnd = c.start + 0.2;
          const clampedEnd = Math.max(minEnd, newEnd);
          return {
            ...c,
            duration: clampedEnd - c.start
          };
        })
      };
    });
  }, []);

  const moveClip = useCallback((clipId: string, targetTrackId: string, newStart: number) => {
    setProject((prev) => {
      let finalStart = Math.max(0, newStart);

      // Magnetic snapping to playhead or other clip edges if enabled
      if (snapEnabled) {
        const threshold = 0.3; // 300ms snap threshold
        if (Math.abs(finalStart - playheadRef.current) < threshold) {
          finalStart = playheadRef.current;
        }
        for (const other of prev.clips) {
          if (other.id !== clipId && other.trackId === targetTrackId) {
            // Snap to other clip's end
            if (Math.abs(finalStart - (other.start + other.duration)) < threshold) {
              finalStart = other.start + other.duration;
            }
            // Snap to other clip's start
            const movingClip = prev.clips.find((c) => c.id === clipId);
            if (movingClip && Math.abs(finalStart + movingClip.duration - other.start) < threshold) {
              finalStart = other.start - movingClip.duration;
            }
          }
        }
      }

      const nextClips = prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        return {
          ...c,
          trackId: targetTrackId,
          start: Math.max(0, finalStart)
        };
      });

      const maxEnd = Math.max(...nextClips.map((c) => c.start + c.duration), 10);
      return {
        ...prev,
        duration: Math.max(prev.duration, maxEnd + 2),
        clips: nextClips
      };
    });
  }, [snapEnabled]);

  const rippleDelete = useCallback((clipId: string) => {
    const clip = projectRef.current.clips.find((c) => c.id === clipId);
    if (!clip) return;
    pushHistory(projectRef.current);

    const shiftAmount = clip.duration;
    const clipStart = clip.start;
    const trackId = clip.trackId;

    setProject((prev) => ({
      ...prev,
      clips: prev.clips
        .filter((c) => c.id !== clipId)
        .map((c) => {
          if (c.trackId === trackId && c.start > clipStart) {
            return { ...c, start: Math.max(0, c.start - shiftAmount) };
          }
          return c;
        })
    }));

    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [pushHistory, selectedClipId]);

  // Track Toggles
  const toggleTrackMute = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    }));
  }, []);

  const toggleTrackLock = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    }));
  }, []);

  const toggleTrackHidden = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t))
    }));
  }, []);

  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || null;

  return {
    project,
    setProject,
    playhead,
    isPlaying,
    selectedClipId,
    setSelectedClipId,
    selectedClip,
    selectedTrackId,
    setSelectedTrackId,
    zoom,
    setZoom,
    snapEnabled,
    setSnapEnabled,
    activeTool,
    setActiveTool,
    isSaving,
    lastSavedText,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    seek,
    togglePlay,
    undo,
    redo,
    saveProject,
    updateProjectMeta,
    setAspectRatio,
    addAsset,
    addClipToTrack,
    addTextClip,
    updateClip,
    deleteClip,
    duplicateClip,
    splitClipAtPlayhead,
    trimClipStart,
    trimClipEnd,
    moveClip,
    rippleDelete,
    toggleTrackMute,
    toggleTrackLock,
    toggleTrackHidden
  };
}

