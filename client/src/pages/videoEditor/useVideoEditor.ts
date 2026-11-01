import { useState, useEffect, useRef, useCallback } from 'react';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  MediaAsset,
  AspectRatio,
  TrackType,
  Keyframe,
  ClipTransform,
  ProjectBackground,
  ProjectVersionSnapshot,
  MotionTitleDesign,
  MotionTitleTemplate,
  MotionAnimationConfig
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
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = ~45px per second
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<'select' | 'split' | 'crop'>('select');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>('All changes saved');
  const [recoveryAvailable, setRecoveryAvailable] = useState<boolean>(false);

  // History stack for Undo/Redo
  const [undoStack, setUndoStack] = useState<EditorProject[]>([]);
  const [redoStack, setRedoStack] = useState<EditorProject[]>([]);

  // Clipboard for Copy / Paste
  const clipboardClipsRef = useRef<TimelineClip[]>([]);
  const copiedAnimationSettingsRef = useRef<MotionAnimationConfig | null>(null);

  const playheadRef = useRef<number>(playhead);
  playheadRef.current = playhead;

  const projectRef = useRef<EditorProject>(project);
  projectRef.current = project;

  // Single primary selected clip (for Inspector controls)
  const primarySelectedClipId = selectedClipIds[0] || null;
  const selectedClip = project.clips.find((c) => c.id === primarySelectedClipId) || null;

  // Synchronize when initialProject is handed off
  useEffect(() => {
    if (initialProject && initialProject.id && initialProject.id !== project.id) {
      setProject(initialProject);
      setPlayhead(0);
      setIsPlaying(false);
      setSelectedClipIds([]);
    }
  }, [initialProject]);

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

  // Check for auto-save recovery on startup
  useEffect(() => {
    try {
      const backupRaw = localStorage.getItem(`voiceforge_editor_backup_${project.id}`);
      if (backupRaw) {
        const backupData = JSON.parse(backupRaw);
        if (
          backupData &&
          backupData.updatedAt &&
          new Date(backupData.updatedAt).getTime() > new Date(project.updatedAt).getTime()
        ) {
          setRecoveryAvailable(true);
        }
      }
    } catch {}
  }, [project.id, project.updatedAt]);

  const restoreFromBackup = useCallback(() => {
    try {
      const backupRaw = localStorage.getItem(`voiceforge_editor_backup_${project.id}`);
      if (backupRaw) {
        const backupData = JSON.parse(backupRaw) as EditorProject;
        pushHistory(projectRef.current);
        setProject(backupData);
        setRecoveryAvailable(false);
        setLastSavedText('Restored from autosave');
      }
    } catch {}
  }, [project.id, pushHistory]);

  const dismissRecovery = useCallback(() => {
    setRecoveryAvailable(false);
  }, []);

  // Save project to backend API and localStorage with version history snapshot
  const saveProject = useCallback(async () => {
    setIsSaving(true);
    try {
      const updatedProj: EditorProject = {
        ...projectRef.current,
        updatedAt: new Date().toISOString()
      };

      // Store in local storage backup
      localStorage.setItem(`voiceforge_editor_backup_${updatedProj.id}`, JSON.stringify(updatedProj));

      // Persist to backend server
      await videoEditorApi.saveProject(updatedProj);
      setLastSavedText(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    } catch {
      setLastSavedText('Saved locally');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Autosave periodically every 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProject();
    }, 10000);
    return () => clearTimeout(timer);
  }, [project, saveProject]);

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
          return 0; // loop back to start
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

  // Selection Handling
  const selectClip = useCallback((clipId: string | null, isMulti: boolean = false) => {
    if (!clipId) {
      setSelectedClipIds([]);
      return;
    }
    if (isMulti) {
      setSelectedClipIds((prev) =>
        prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId]
      );
    } else {
      setSelectedClipIds([clipId]);
    }
  }, []);

  const selectAllClips = useCallback(() => {
    setSelectedClipIds(projectRef.current.clips.map((c) => c.id));
  }, []);

  // Copy & Paste
  const copySelection = useCallback(() => {
    const toCopy = projectRef.current.clips.filter((c) => selectedClipIds.includes(c.id));
    if (toCopy.length > 0) {
      clipboardClipsRef.current = JSON.parse(JSON.stringify(toCopy));
      setLastSavedText(`Copied ${toCopy.length} clip(s)`);
    }
  }, [selectedClipIds]);

  const pasteClips = useCallback(() => {
    if (clipboardClipsRef.current.length === 0) return;
    pushHistory(projectRef.current);

    const minOrigStart = Math.min(...clipboardClipsRef.current.map((c) => c.start));
    const targetBaseStart = playheadRef.current;
    const newClips: TimelineClip[] = [];

    clipboardClipsRef.current.forEach((orig) => {
      const offset = orig.start - minOrigStart;
      const pasted: TimelineClip = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: `${orig.name} (Copy)`,
        start: targetBaseStart + offset
      };
      newClips.push(pasted);
    });

    setProject((prev) => {
      const maxEnd = Math.max(...newClips.map((c) => c.start + c.duration));
      return {
        ...prev,
        duration: Math.max(prev.duration, maxEnd + 2),
        clips: [...prev.clips, ...newClips]
      };
    });

    setSelectedClipIds(newClips.map((c) => c.id));
    setLastSavedText(`Pasted ${newClips.length} clip(s)`);
  }, [pushHistory]);

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

  const setProjectBackground = useCallback((bg: ProjectBackground) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      background: bg,
      updatedAt: new Date().toISOString()
    }));
  }, [pushHistory]);

  // Create Named Version Snapshot
  const createVersionSnapshot = useCallback((name: string) => {
    const snapshot: ProjectVersionSnapshot = {
      id: `v_${Date.now()}`,
      name: name.trim() || `Version ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      clipsCount: projectRef.current.clips.length
    };
    setProject((prev) => ({
      ...prev,
      versions: [snapshot, ...(prev.versions || []).slice(0, 15)]
    }));
    setLastSavedText(`Snapshot '${snapshot.name}' created`);
  }, []);

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

    setSelectedClipIds([newClip.id]);
  }, [pushHistory]);

  const addMotionGraphicClip = useCallback((template: MotionTitleTemplate, customText?: string) => {
    pushHistory(projectRef.current);
    let textTrack = projectRef.current.tracks.find((t) => t.type === 'text');
    if (!textTrack) {
      textTrack = {
        id: `track_text_${Date.now()}`,
        name: 'Titles & Captions',
        type: 'text',
        locked: false,
        muted: false,
        hidden: false,
        order: 2
      };
      setProject((prev) => ({ ...prev, tracks: [...prev.tracks, textTrack!] }));
    }

    const duration = template.duration || 4.5;
    const start = playheadRef.current;
    const titleDesign: MotionTitleDesign = {
      ...template.design,
      mainText: customText || template.design.mainText
    };

    const newClip: TimelineClip = {
      id: `motion_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trackId: textTrack.id,
      name: template.name,
      type: 'text',
      start,
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      text: titleDesign.mainText,
      titleDesign,
      transform: { ...DEFAULT_TRANSFORM },
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

    setSelectedClipIds([newClip.id]);
    setLastSavedText(`Added '${template.name}' to timeline`);
  }, [pushHistory]);

  const updateTitleDesign = useCallback((clipId: string, patch: Partial<MotionTitleDesign>) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id === clipId && c.titleDesign) {
          const updatedDesign: MotionTitleDesign = { ...c.titleDesign, ...patch };
          return {
            ...c,
            name: patch.mainText ? (patch.mainText.length > 22 ? `${patch.mainText.slice(0, 20)}...` : patch.mainText) : c.name,
            text: updatedDesign.mainText,
            titleDesign: updatedDesign
          };
        }
        return c;
      })
    }));
  }, []);

  const copyAnimationSettings = useCallback((clipId: string) => {
    const clip = projectRef.current.clips.find((c) => c.id === clipId);
    if (clip?.titleDesign?.animation) {
      copiedAnimationSettingsRef.current = JSON.parse(JSON.stringify(clip.titleDesign.animation));
      setLastSavedText(`Animation settings copied`);
    }
  }, []);

  const pasteAnimationSettings = useCallback((targetClipId: string) => {
    if (!copiedAnimationSettingsRef.current) return;
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id === targetClipId && c.titleDesign) {
          return {
            ...c,
            titleDesign: {
              ...c.titleDesign,
              animation: JSON.parse(JSON.stringify(copiedAnimationSettingsRef.current))
            }
          };
        }
        return c;
      })
    }));
    setLastSavedText(`Animation settings applied`);
  }, [pushHistory]);

  const addTextClip = useCallback((text: string, presetName?: string) => {
    pushHistory(projectRef.current);
    let textTrack = projectRef.current.tracks.find((t) => t.type === 'text');
    if (!textTrack) {
      textTrack = {
        id: `track_text_${Date.now()}`,
        name: 'Titles & Captions',
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

    setSelectedClipIds([newClip.id]);
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
    setSelectedClipIds((prev) => prev.filter((id) => id !== clipId));
  }, [pushHistory]);

  const deleteSelectedClips = useCallback(() => {
    if (selectedClipIds.length === 0) return;
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => !selectedClipIds.includes(c.id))
    }));
    setSelectedClipIds([]);
  }, [pushHistory, selectedClipIds]);

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
    setSelectedClipIds([dup.id]);
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

    if (firstDuration < 0.1 || secondDuration < 0.1) return; // Prevent micro slivers

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
    setSelectedClipIds([secondClip.id]);
  }, [pushHistory]);

  // Freeze Frame tool: splits clip at playhead and inserts a 3s still frame
  const freezeFrame = useCallback((targetClipId?: string) => {
    const curTime = playheadRef.current;
    const clip = projectRef.current.clips.find((c) =>
      targetClipId ? c.id === targetClipId : curTime >= c.start && curTime <= c.start + c.duration
    );
    if (!clip) return;
    pushHistory(projectRef.current);

    const freezeDuration = 3.0;
    const freezeSourceOffset = (curTime - clip.start) * (clip.speed?.speed || 1) + (clip.sourceStart || 0);

    const freezeClip: TimelineClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `freeze_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${clip.name} (Freeze)`,
      start: curTime,
      duration: freezeDuration,
      sourceStart: freezeSourceOffset,
      speed: {
        ...clip.speed,
        speed: 0.001,
        isFreezeFrame: true
      }
    };

    // Push subsequent clips on same track forward by freezeDuration
    setProject((prev) => {
      const nextClips = prev.clips.map((c) => {
        if (c.trackId === clip.trackId && c.start >= curTime && c.id !== clip.id) {
          return { ...c, start: c.start + freezeDuration };
        }
        return c;
      });

      // Split the original clip into head and tail if playhead was inside it
      if (curTime > clip.start && curTime < clip.start + clip.duration) {
        const headDur = curTime - clip.start;
        const tailDur = clip.duration - headDur;
        const headClip: TimelineClip = { ...clip, duration: headDur };
        const tailClip: TimelineClip = {
          ...JSON.parse(JSON.stringify(clip)),
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          start: curTime + freezeDuration,
          duration: tailDur,
          sourceStart: (clip.sourceStart || 0) + headDur * (clip.speed?.speed || 1)
        };
        const finalClips = nextClips
          .filter((c) => c.id !== clip.id)
          .concat([headClip, freezeClip, tailClip]);
        return {
          ...prev,
          duration: Math.max(prev.duration, curTime + freezeDuration + tailDur + 2),
          clips: finalClips
        };
      }

      return {
        ...prev,
        duration: Math.max(prev.duration, curTime + freezeDuration + 2),
        clips: [...nextClips, freezeClip]
      };
    });

    setSelectedClipIds([freezeClip.id]);
    setLastSavedText('Inserted freeze frame');
  }, [pushHistory]);

  // Reverse Video toggle
  const toggleReverseVideo = useCallback((clipId: string) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        return {
          ...c,
          speed: {
            ...c.speed,
            reverse: !c.speed.reverse
          }
        };
      })
    }));
  }, [pushHistory]);

  // Speed adjustment
  const setClipSpeed = useCallback((clipId: string, speedValue: number) => {
    pushHistory(projectRef.current);
    const speed = Math.max(0.25, Math.min(4.0, speedValue));
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        const currentSpeed = c.speed?.speed || 1;
        const newDuration = (c.duration * currentSpeed) / speed;
        return {
          ...c,
          duration: Math.max(0.2, newDuration),
          speed: {
            ...c.speed,
            speed
          }
        };
      })
    }));
  }, [pushHistory]);

  // Picture in Picture preset
  const applyPictureInPicture = useCallback((clipId: string) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        return {
          ...c,
          transform: {
            ...c.transform,
            scale: 0.35,
            x: 50,
            y: 50
          }
        };
      })
    }));
  }, [pushHistory]);

  // Rotate 90 degrees
  const rotateClip90 = useCallback((clipId: string) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        const nextRot = ((c.transform?.rotation || 0) + 90) % 360;
        return {
          ...c,
          transform: {
            ...c.transform,
            rotation: nextRot
          }
        };
      })
    }));
  }, [pushHistory]);

  // Flip Horizontal / Vertical
  const flipClipHorizontal = useCallback((clipId: string) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        return {
          ...c,
          transform: {
            ...c.transform,
            flipH: !c.transform?.flipH
          }
        };
      })
    }));
  }, [pushHistory]);

  const flipClipVertical = useCallback((clipId: string) => {
    pushHistory(projectRef.current);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        return {
          ...c,
          transform: {
            ...c.transform,
            flipV: !c.transform?.flipV
          }
        };
      })
    }));
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
        const threshold = 0.35; // 350ms snap threshold
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

    setSelectedClipIds((prev) => prev.filter((id) => id !== clipId));
  }, [pushHistory]);

  // Track Toggles: Mute, Lock, Solo, Hidden
  const toggleTrackMute = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    }));
  }, []);

  const toggleTrackSolo = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t))
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

  return {
    project,
    setProject,
    playhead,
    isPlaying,
    selectedClipIds,
    setSelectedClipIds,
    selectedClipId: primarySelectedClipId,
    setSelectedClipId: (id: string | null) => selectClip(id, false),
    selectClip,
    selectAllClips,
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
    recoveryAvailable,
    restoreFromBackup,
    dismissRecovery,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    seek,
    togglePlay,
    undo,
    redo,
    saveProject,
    updateProjectMeta,
    setAspectRatio,
    setProjectBackground,
    createVersionSnapshot,
    addAsset,
    addClipToTrack,
    addTextClip,
    addMotionGraphicClip,
    updateTitleDesign,
    copyAnimationSettings,
    pasteAnimationSettings,
    updateClip,
    deleteClip,
    deleteSelectedClips,
    duplicateClip,
    splitClipAtPlayhead,
    freezeFrame,
    toggleReverseVideo,
    setClipSpeed,
    applyPictureInPicture,
    rotateClip90,
    flipClipHorizontal,
    flipClipVertical,
    trimClipStart,
    trimClipEnd,
    moveClip,
    rippleDelete,
    copySelection,
    pasteClips,
    toggleTrackMute,
    toggleTrackSolo,
    toggleTrackLock,
    toggleTrackHidden
  };
}
