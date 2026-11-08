import React, { useState, useEffect, useCallback } from 'react';
import './videoEditor/editorDesignTokens.css';
import { useVideoEditor } from './videoEditor/useVideoEditor';
import { EditorTopBar } from './videoEditor/EditorTopBar';
import { EditorSidebar } from './videoEditor/EditorSidebar';
import { EditorPreviewCanvas } from './videoEditor/EditorPreviewCanvas';
import { EditorTimeline } from './videoEditor/EditorTimeline';
import { EditorInspector } from './videoEditor/EditorInspector';
import { EditorExportModal } from './videoEditor/EditorExportModal';
import { MotionGraphicsStudio } from './videoEditor/MotionGraphicsStudio';
import { EditorPanelSplitter } from './videoEditor/EditorPanelSplitter';
import {
  WorkspaceMode,
  WORKSPACE_PRESETS,
  WORKSPACE_CONSTRAINTS
} from './videoEditor/EditorWorkspacePresets';
import { videoEditorApi } from '../services/videoEditorApi';
import { MediaAsset } from '../../../shared/src/videoEditorTypes';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

interface VideoEditorStudioProps {
  onOpenCaptionStudio?: () => void;
  initialProject?: any;
}

const STORAGE_KEY_DIMENSIONS = 'voiceforge_editor_v2_dimensions';
const STORAGE_KEY_MODE = 'voiceforge_editor_v2_mode';

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  onOpenCaptionStudio,
  initialProject
}) => {
  const {
    project,
    setProject,
    playhead,
    isPlaying,
    selectedClipIds,
    setSelectedClipIds,
    selectedClipId,
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
    canUndo,
    canRedo,
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
    toggleTrackHidden,
    addMotionGraphicClip,
    updateTitleDesign,
    copyAnimationSettings,
    pasteAnimationSettings
  } = useVideoEditor(initialProject);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMotionStudioOpen, setIsMotionStudioOpen] = useState(false);

  // 5-Region Workspace Layout & Dimension States
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
      if (savedMode === 'default' || savedMode === 'focus-preview' || savedMode === 'focus-timeline') {
        return savedMode;
      }
    } catch {}
    return 'default';
  });

  const [leftWidth, setLeftWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DIMENSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.leftWidth === 'number') return parsed.leftWidth;
      }
    } catch {}
    return WORKSPACE_PRESETS.default.leftWidth;
  });

  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DIMENSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.inspectorWidth === 'number') return parsed.inspectorWidth;
      }
    } catch {}
    return WORKSPACE_PRESETS.default.inspectorWidth;
  });

  const [timelineHeight, setTimelineHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DIMENSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timelineHeight === 'number') return parsed.timelineHeight;
      }
    } catch {}
    return WORKSPACE_PRESETS.default.timelineHeight;
  });

  // Save dimensions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_DIMENSIONS,
        JSON.stringify({ leftWidth, inspectorWidth, timelineHeight })
      );
    } catch {}
  }, [leftWidth, inspectorWidth, timelineHeight]);

  // Handle Workspace mode switching
  const handleSelectWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    const preset = WORKSPACE_PRESETS[mode];
    setLeftWidth(preset.leftWidth);
    setInspectorWidth(preset.inspectorWidth);
    setTimelineHeight(preset.timelineHeight);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch {}
  };

  // Handle uploading media files to project
  const handleUploadAsset = async (file: File) => {
    const asset = await videoEditorApi.uploadMedia(file);
    addAsset(asset);
    // If it's a video and timeline is empty, automatically place it on Main Video Track (V1)
    const videoTrack = project.tracks.find((t) => t.type === 'video') || project.tracks[1];
    if (project.clips.length === 0 && videoTrack) {
      addClipToTrack(videoTrack.id, asset, 0);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Space: Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }

      // S or C: Split clip
      if (e.code === 'KeyS' || e.code === 'KeyC') {
        e.preventDefault();
        splitClipAtPlayhead(selectedClipId || undefined);
      }

      // F: Freeze frame
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        freezeFrame(selectedClipId || undefined);
      }

      // V: Select tool
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('select');
      }

      // Delete or Backspace: Delete selected clip(s)
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (e.shiftKey && selectedClipId) {
          e.preventDefault();
          rippleDelete(selectedClipId);
        } else if (selectedClipIds.length > 0) {
          e.preventDefault();
          deleteSelectedClips();
        }
      }

      // Ctrl+D: Duplicate
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        if (selectedClipId) {
          e.preventDefault();
          duplicateClip(selectedClipId);
        }
      }

      // Ctrl+C: Copy
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        copySelection();
      }

      // Ctrl+V: Paste
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        pasteClips();
      }

      // Ctrl+A: Select All
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        selectAllClips();
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
      ) {
        e.preventDefault();
        redo();
      }

      // Home: Seek to project start (0:00)
      if (e.code === 'Home') {
        e.preventDefault();
        seek(0);
      }

      // End: Seek to project end
      if (e.code === 'End') {
        e.preventDefault();
        seek(project.duration || 0);
      }

      // Left / Right Arrow: CapCut-style precision frame stepping
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const frameTime = 1 / (project.fps || 30);
        const delta = e.shiftKey ? 1.0 : frameTime;
        seek(Math.max(0, Number((playhead - delta).toFixed(3))));
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const frameTime = 1 / (project.fps || 30);
        const delta = e.shiftKey ? 1.0 : frameTime;
        seek(Math.min(project.duration, Number((playhead + delta).toFixed(3))));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    splitClipAtPlayhead,
    selectedClipId,
    selectedClipIds,
    deleteClip,
    deleteSelectedClips,
    rippleDelete,
    duplicateClip,
    copySelection,
    pasteClips,
    selectAllClips,
    freezeFrame,
    setActiveTool,
    undo,
    redo,
    seek,
    playhead,
    project.duration,
    project.fps
  ]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0E13] overflow-hidden select-none">
      {/* Auto-Save Recovery Notice Banner */}
      {recoveryAvailable && (
        <div className="shrink-0 flex items-center justify-between border-b border-amber-500/40 bg-amber-950/80 px-4 py-2 text-xs text-amber-200 z-40">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              An unsaved session was recovered from your browser. Would you like to restore it?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreFromBackup}
              className="flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={dismissRecovery}
              className="rounded p-1 text-amber-400 hover:bg-amber-900/60 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* REGION A: TOP APPLICATION TOOLBAR (44px fixed height) */}
      <EditorTopBar
        project={project}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={saveProject}
        isSaving={isSaving}
        lastSavedText={lastSavedText}
        onUpdateMeta={updateProjectMeta}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenCaptionStudio={onOpenCaptionStudio}
        workspaceMode={workspaceMode}
        onSelectWorkspaceMode={handleSelectWorkspaceMode}
      />

      {/* 5-REGION DESKTOP WORKSPACE LAYOUT */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative">
        {/* REGION B: LEFT MEDIA & CREATIVE TOOLS WORKSPACE (Full height down to bottom) */}
        <div
          style={{ width: `${leftWidth}px` }}
          className="h-full shrink-0 min-h-0 flex flex-col overflow-hidden"
        >
          <EditorSidebar
            assets={project.assets}
            onUploadAsset={handleUploadAsset}
            onAddClip={(asset) => {
              let targetTrack;
              if (asset.type === 'image') {
                targetTrack =
                  project.tracks.find((t) => t.type === 'overlay') ||
                  project.tracks.find((t) => t.type === 'video');
              } else if (asset.type === 'audio') {
                const a1HasClips = project.clips.some((c) => c.trackId === 'track-a1');
                targetTrack = a1HasClips
                  ? project.tracks.find((t) => t.id === 'track-a2') || project.tracks.find((t) => t.type === 'audio')
                  : project.tracks.find((t) => t.id === 'track-a1') || project.tracks.find((t) => t.type === 'audio');
              } else {
                targetTrack =
                  project.tracks.find((t) => t.type === asset.type) ||
                  project.tracks.find((t) => t.type === 'video') ||
                  project.tracks[0];
              }
              if (targetTrack) addClipToTrack(targetTrack.id, asset);
            }}
            onAddText={addTextClip}
            onAddMotionClip={(template, customText) => addMotionGraphicClip(template, customText)}
            onOpenMotionStudio={() => setIsMotionStudioOpen(true)}
            selectedClip={selectedClip}
            onUpdateClip={updateClip}
            onOpenCaptionStudio={onOpenCaptionStudio}
          />
        </div>

        {/* SPLITTER 1: Between Left Media Workspace and Right Workspace */}
        <EditorPanelSplitter
          direction="horizontal"
          onResize={(delta) => {
            setLeftWidth((w) =>
              Math.max(
                WORKSPACE_CONSTRAINTS.minLeftWidth,
                Math.min(WORKSPACE_CONSTRAINTS.maxLeftWidth, w + delta)
              )
            );
          }}
          onReset={() => setLeftWidth(WORKSPACE_PRESETS[workspaceMode].leftWidth)}
          title="Drag to resize Media Panel (Double-click to reset)"
        />

        {/* RIGHT EDITING WORKSPACE: UPPER ROW (Preview + Inspector) & LOWER ROW (Timeline) */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* UPPER ROW: Preview Canvas (Region C) & Inspector (Region D) */}
          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
            {/* REGION C: CENTER VIDEO PREVIEW PLAYER CANVAS */}
            <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden">
              <EditorPreviewCanvas
                project={project}
                playhead={playhead}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onSeek={seek}
                selectedClip={selectedClip}
                onUpdateClip={updateClip}
              />
            </div>

            {/* SPLITTER 2: Between Preview and Inspector */}
            <EditorPanelSplitter
              direction="horizontal"
              onResize={(delta) => {
                // Dragging right decreases inspector width; dragging left increases it
                setInspectorWidth((w) =>
                  Math.max(
                    WORKSPACE_CONSTRAINTS.minInspectorWidth,
                    Math.min(WORKSPACE_CONSTRAINTS.maxInspectorWidth, w - delta)
                  )
                );
              }}
              onReset={() => setInspectorWidth(WORKSPACE_PRESETS[workspaceMode].inspectorWidth)}
              title="Drag to resize Inspector Panel (Double-click to reset)"
            />

            {/* REGION D: RIGHT PROPERTIES INSPECTOR */}
            <div
              style={{ width: `${inspectorWidth}px` }}
              className="h-full shrink-0 min-h-0 overflow-hidden"
            >
              <EditorInspector
                selectedClip={selectedClip}
                onUpdateClip={updateClip}
                playhead={playhead}
              />
            </div>
          </div>

          {/* SPLITTER 3: Horizontal splitter between Upper Region and Timeline */}
          <EditorPanelSplitter
            direction="vertical"
            onResize={(delta) => {
              // Dragging down decreases timeline height; dragging up increases it
              setTimelineHeight((h) =>
                Math.max(
                  WORKSPACE_CONSTRAINTS.minTimelineHeight,
                  Math.min(
                    window.innerHeight * WORKSPACE_CONSTRAINTS.maxTimelineHeightRatio,
                    h - delta
                  )
                )
              );
            }}
            onReset={() => setTimelineHeight(WORKSPACE_PRESETS[workspaceMode].timelineHeight)}
            title="Drag to resize Timeline (Double-click to reset)"
          />

          {/* REGION E: MULTITRACK TIMELINE (Spans horizontally under Preview and Inspector) */}
          <div
            style={{ height: `${timelineHeight}px` }}
            className="w-full shrink-0 min-w-0 overflow-hidden"
          >
            <EditorTimeline
              project={project}
              playhead={playhead}
              onSeek={seek}
              selectedClipIds={selectedClipIds}
              onSelectClip={selectClip}
              selectedTrackId={selectedTrackId}
              onSelectTrack={setSelectedTrackId}
              zoom={zoom}
              setZoom={setZoom}
              snapEnabled={snapEnabled}
              onToggleSnap={() => setSnapEnabled((s) => !s)}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onSplitClip={splitClipAtPlayhead}
              onDeleteClip={deleteClip}
              onDeleteSelected={deleteSelectedClips}
              onDuplicateClip={duplicateClip}
              onRippleDelete={rippleDelete}
              onFreezeFrame={freezeFrame}
              onTrimClipStart={trimClipStart}
              onTrimClipEnd={trimClipEnd}
              onMoveClip={moveClip}
              onToggleTrackLock={toggleTrackLock}
              onToggleTrackMute={toggleTrackMute}
              onToggleTrackSolo={toggleTrackSolo}
              onToggleTrackHidden={toggleTrackHidden}
              onCopySelection={copySelection}
              onPasteClips={pasteClips}
            />
          </div>
        </div>
      </div>

      {/* EXPORT MODAL */}
      <EditorExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />

      {/* MOTION GRAPHICS STUDIO MODAL */}
      {isMotionStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[90vh] overflow-hidden rounded-xl shadow-2xl border border-[#303740] bg-[#15191F]">
            <MotionGraphicsStudio
              onAddMotionClip={(template, customText) => {
                addMotionGraphicClip(template, customText);
                setIsMotionStudioOpen(false);
              }}
              selectedClipTitleDesign={selectedClip?.titleDesign}
              onUpdateSelectedTitleDesign={(patch) => {
                if (selectedClip) updateTitleDesign(selectedClip.id, patch);
              }}
              onClose={() => setIsMotionStudioOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
