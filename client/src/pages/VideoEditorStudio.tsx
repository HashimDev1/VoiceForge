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
import { SmartBulkArrangeModal } from './videoEditor/smartBulk/SmartBulkArrangeModal';
import {
  WorkspaceMode,
  WORKSPACE_PRESETS,
  WORKSPACE_CONSTRAINTS,
  clampLeftWidth,
  clampInspectorWidth,
  clampTimelineHeight
} from './videoEditor/EditorWorkspacePresets';
import { videoEditorApi } from '../services/videoEditorApi';
import { MediaAsset, ExportMediaType } from '../../../shared/src/videoEditorTypes';
import { unlockAudio } from '../lib/audioUnlocker';
import {
  AlertCircle,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles
} from 'lucide-react';

interface VideoEditorStudioProps {
  onOpenCaptionStudio?: () => void;
  onExitEditor?: () => void;
  initialProject?: any;
}

const STORAGE_KEY_DIMENSIONS = 'voiceforge_editor_v3_dimensions';
const STORAGE_KEY_MODE = 'voiceforge_editor_v3_mode';

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  onOpenCaptionStudio,
  onExitEditor,
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
    pasteAnimationSettings,
    bulkArrangeOnTimeline,
    bulkSetDuration,
    bulkScaleDuration,
    bulkSetFitMode,
    bulkSetTransform,
    bulkApplyTransition,
    bulkSetColorGrading,
    bulkMuteAudio,
    bulkRippleDeleteSelected,
    bulkReverseSelected,
    bulkShuffleSelected,
    separateAudioFromClip
  } = useVideoEditor(initialProject);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalMode, setExportModalMode] = useState<ExportMediaType>('video');
  const [isMotionStudioOpen, setIsMotionStudioOpen] = useState(false);
  const [isSmartBulkModalOpen, setIsSmartBulkModalOpen] = useState(false);

  const handleOpenExportVideo = () => {
    setExportModalMode('video');
    setIsExportModalOpen(true);
  };

  const handleOpenExportImage = () => {
    setExportModalMode('image');
    setIsExportModalOpen(true);
  };

  const handleOpenExportZip = () => {
    setExportModalMode('images_zip');
    setIsExportModalOpen(true);
  };

  // Collapsible Panel States with LocalStorage Persistence
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voiceforge_editor_left_collapsed') === 'true';
    } catch {}
    return false;
  });
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voiceforge_editor_inspector_collapsed') === 'true';
    } catch {}
    return false;
  });
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voiceforge_editor_timeline_collapsed') === 'true';
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('voiceforge_editor_left_collapsed', String(isLeftCollapsed));
      localStorage.setItem('voiceforge_editor_inspector_collapsed', String(isInspectorCollapsed));
      localStorage.setItem('voiceforge_editor_timeline_collapsed', String(isTimelineCollapsed));
    } catch {}
  }, [isLeftCollapsed, isInspectorCollapsed, isTimelineCollapsed]);

  const handleBulkUploadAssets = async (files: File[]) => {
    const uploaded = await videoEditorApi.uploadBulkMedia(files);
    for (const a of uploaded) {
      addAsset(a);
    }
    return uploaded;
  };

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
        if (typeof parsed.leftWidth === 'number' && parsed.leftWidth > 0) {
          return clampLeftWidth(parsed.leftWidth);
        }
      }
    } catch {}
    return WORKSPACE_PRESETS.default.leftWidth;
  });

  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DIMENSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.inspectorWidth === 'number' && parsed.inspectorWidth > 0) {
          return clampInspectorWidth(parsed.inspectorWidth);
        }
      }
    } catch {}
    return WORKSPACE_PRESETS.default.inspectorWidth;
  });

  const [timelineHeight, setTimelineHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DIMENSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timelineHeight === 'number' && parsed.timelineHeight > 0) {
          return clampTimelineHeight(parsed.timelineHeight);
        }
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
    setLeftWidth(clampLeftWidth(preset.leftWidth));
    setInspectorWidth(clampInspectorWidth(preset.inspectorWidth));
    setTimelineHeight(clampTimelineHeight(preset.timelineHeight));
    try {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch {}
  };

  // Reset layout to factory defaults
  const handleResetLayout = () => {
    const preset = WORKSPACE_PRESETS[workspaceMode] || WORKSPACE_PRESETS.default;
    setLeftWidth(preset.leftWidth);
    setInspectorWidth(preset.inspectorWidth);
    setTimelineHeight(preset.timelineHeight);
    setIsLeftCollapsed(false);
    setIsInspectorCollapsed(false);
    setIsTimelineCollapsed(false);
    try {
      localStorage.removeItem(STORAGE_KEY_DIMENSIONS);
      localStorage.removeItem('voiceforge_editor_v2_dimensions');
      localStorage.removeItem('voiceforge_editor_left_collapsed');
      localStorage.removeItem('voiceforge_editor_inspector_collapsed');
      localStorage.removeItem('voiceforge_editor_timeline_collapsed');
    } catch {}
  };

  // Ensure window is scrolled to top on mount for perfect full-screen viewport alignment
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle uploading media files to project
  const handleUploadAsset = async (file: File) => {
    const asset = await videoEditorApi.uploadMedia(file);
    addAsset(asset);
    // If timeline is empty, automatically place it on appropriate track
    if (project.clips.length === 0) {
      if (asset.type === 'video') {
        const videoTrack = project.tracks.find((t) => t.type === 'video') || project.tracks[1];
        if (videoTrack) addClipToTrack(videoTrack.id, asset, 0);
      } else if (asset.type === 'audio') {
        const audioTrack = project.tracks.find((t) => t.type === 'audio') || project.tracks.find((t) => t.id === 'track-a1');
        if (audioTrack) addClipToTrack(audioTrack.id, asset, 0);
      }
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
        unlockAudio();
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
    <div className="flex flex-col h-full w-full bg-[#121418] text-[#E4E7EC] p-0 gap-0 overflow-hidden select-none">
      {/* Auto-Save Recovery Notice Banner */}
      {recoveryAvailable && (
        <div className="shrink-0 flex items-center justify-between border-b border-amber-500/40 bg-amber-950/80 px-4 py-1.5 text-xs text-amber-200 z-40">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-medium">
              An unsaved session was recovered from your browser. Would you like to restore it?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreFromBackup}
              className="flex items-center gap-1 rounded bg-amber-500 hover:bg-amber-400 px-2.5 py-0.5 text-xs font-mono font-bold text-black cursor-pointer shadow-xs transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={dismissRecovery}
              className="rounded p-0.5 text-amber-400 hover:bg-amber-900/60 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* REGION A: TOP APPLICATION TOOLBAR (CapCut Top Bar) */}
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
        onOpenExport={handleOpenExportVideo}
        onOpenExportImage={handleOpenExportImage}
        onOpenExportZip={handleOpenExportZip}
        onOpenCaptionStudio={onOpenCaptionStudio}
        onOpenSmartBulk={() => setIsSmartBulkModalOpen(true)}
        onExitEditor={onExitEditor}
        workspaceMode={workspaceMode}
        onSelectWorkspaceMode={handleSelectWorkspaceMode}
        onResetLayout={handleResetLayout}
      />

      {/* 5-REGION DESKTOP WORKSPACE LAYOUT */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative">
        {/* REGION B: LEFT MEDIA & CREATIVE TOOLS WORKSPACE */}
        {isLeftCollapsed ? (
          <div className="w-10 shrink-0 h-full border-r border-[#262A34] bg-[#181B20] flex flex-col items-center py-2.5 gap-2 z-20">
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(false)}
              title="Expand Media Library"
              className="p-1.5 rounded bg-[#222631] hover:bg-[#282D38] text-[#13E2CA] cursor-pointer transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsSmartBulkModalOpen(true)}
              title="Smart Bulk Arrange 50–200 media files"
              className="p-1.5 rounded bg-[#1A3838] border border-[#13E2CA]/40 text-[#13E2CA] hover:bg-[#13E2CA] hover:text-black cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            style={{ width: `${leftWidth}px`, minWidth: '320px', maxWidth: '560px' }}
            className="h-full shrink-0 min-h-0 border-r border-[#262A34] bg-[#181B20] flex flex-col overflow-hidden relative"
          >
            {/* Quick Collapse Button in Header */}
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(true)}
              title="Collapse Media Panel"
              className="absolute top-2 right-2 z-30 p-1 rounded bg-[#222631] hover:bg-[#282D38] text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>

            <EditorSidebar
              assets={project.assets}
              onUploadAsset={handleUploadAsset}
              onOpenSmartBulk={() => setIsSmartBulkModalOpen(true)}
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
              onSelectClip={(id) => setSelectedClipIds([id])}
              onOpenCaptionStudio={onOpenCaptionStudio}
              projectClips={project.clips}
            />
          </div>
        )}

        {/* SPLITTER 1: Between Left Media Workspace and Right Workspace */}
        {!isLeftCollapsed && (
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
        )}

        {/* RIGHT EDITING WORKSPACE: UPPER ROW (Preview + Inspector) & LOWER ROW (Timeline) */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* UPPER ROW: Preview Canvas (Region C) & Inspector (Region D) */}
          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative">
            {/* REGION C: CENTER VIDEO PREVIEW PLAYER CANVAS */}
            <div className="flex-1 min-w-0 min-h-0 h-full border-r border-[#262A34] bg-[#181B20] overflow-hidden flex flex-col relative">
              <EditorPreviewCanvas
                project={project}
                playhead={playhead}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onSeek={seek}
                selectedClip={selectedClip}
                onUpdateClip={updateClip}
                onExportFrame={handleOpenExportImage}
              />

              {/* Restore Inspector button when inspector is collapsed */}
              {isInspectorCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsInspectorCollapsed(false)}
                  title="Expand Inspector"
                  className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222631] hover:bg-[#282D38] border border-[#2D3340] text-xs font-sans text-slate-300 hover:text-white cursor-pointer transition-colors shadow-md"
                >
                  <PanelRightOpen className="w-3.5 h-3.5 text-[#13E2CA]" />
                  <span>Inspector</span>
                </button>
              )}
            </div>

            {/* SPLITTER 2: Between Preview and Inspector */}
            {!isInspectorCollapsed && (
              <EditorPanelSplitter
                direction="horizontal"
                onResize={(delta) => {
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
            )}

            {/* REGION D: RIGHT PROPERTIES INSPECTOR */}
            {!isInspectorCollapsed && (
              <div
                style={{ width: `${inspectorWidth}px`, minWidth: '280px', maxWidth: '500px' }}
                className="h-full shrink-0 min-h-0 bg-[#181B20] overflow-hidden flex flex-col relative"
              >
                {/* Collapse Inspector Button */}
                <button
                  type="button"
                  onClick={() => setIsInspectorCollapsed(true)}
                  title="Collapse Inspector"
                  className="absolute top-2 left-2 z-30 p-1 rounded bg-[#222631] hover:bg-[#282D38] text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>

                <EditorInspector
                  selectedClip={selectedClip}
                  onUpdateClip={updateClip}
                  playhead={playhead}
                  onSeparateAudio={separateAudioFromClip}
                  onApplyColorToAllClips={(grading) => {
                    project.clips.forEach((c) => {
                      if (c.type === 'video' || c.type === 'image' || c.type === 'overlay') {
                        updateClip(c.id, { colorGrading: grading });
                      }
                    });
                  }}
                  onApplyEffectsToAllClips={(effects) => {
                    project.clips.forEach((c) => {
                      if (c.type === 'video' || c.type === 'image' || c.type === 'overlay') {
                        updateClip(c.id, { effects });
                      }
                    });
                  }}
                />
              </div>
            )}
          </div>

          {/* SPLITTER 3: Horizontal splitter between Upper Region and Timeline */}
          {!isTimelineCollapsed && (
            <EditorPanelSplitter
              direction="vertical"
              onResize={(delta) => {
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
          )}

          {/* REGION E: MULTITRACK TIMELINE */}
          {isTimelineCollapsed ? (
            <div className="h-9 shrink-0 w-full border-t border-[#262A34] bg-[#181B20] px-4 flex items-center justify-between text-xs">
              <span className="font-sans font-medium text-slate-400 text-xs">
                Timeline ({project.clips.length} clips · {project.duration.toFixed(1)}s)
              </span>
              <button
                type="button"
                onClick={() => setIsTimelineCollapsed(false)}
                className="flex items-center gap-1.5 text-[#13E2CA] hover:underline font-sans font-semibold text-xs cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
                <span>Expand Timeline</span>
              </button>
            </div>
          ) : (
            <div
              style={{ height: `${timelineHeight}px`, minHeight: '180px' }}
              className="w-full shrink-0 min-w-0 border-t border-[#262A34] bg-[#181B20] overflow-hidden flex flex-col relative"
            >
              {/* Collapse Timeline Button */}
              <button
                type="button"
                onClick={() => setIsTimelineCollapsed(true)}
                title="Collapse Timeline"
                className="absolute top-2 right-2 z-30 p-1 rounded bg-[#222631] hover:bg-[#282D38] text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

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
                onSelectAllClips={selectAllClips}
                onBulkSetDuration={bulkSetDuration}
                onBulkScaleDuration={bulkScaleDuration}
                onBulkSetFitMode={bulkSetFitMode}
                onBulkApplyTransition={bulkApplyTransition}
                onBulkMuteAudio={bulkMuteAudio}
                onBulkRippleDeleteSelected={bulkRippleDeleteSelected}
                onBulkReverseSelected={bulkReverseSelected}
                onBulkShuffleSelected={bulkShuffleSelected}
                onSeparateAudio={separateAudioFromClip}
              />
            </div>
          )}
        </div>
      </div>

      {/* SMART BULK ARRANGE MODAL */}
      <SmartBulkArrangeModal
        isOpen={isSmartBulkModalOpen}
        onClose={() => setIsSmartBulkModalOpen(false)}
        availableAssets={project.assets}
        onUploadAssets={handleBulkUploadAssets}
        onApplyProposal={bulkArrangeOnTimeline}
        targetTracks={project.tracks}
        playhead={playhead}
        projectFps={project.fps || 30}
      />

      {/* EXPORT MODAL */}
      <EditorExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        playhead={playhead}
        initialMode={exportModalMode}
      />

      {/* MOTION GRAPHICS STUDIO MODAL */}
      {isMotionStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[90vh] overflow-hidden rounded-xl border border-[#262A34] bg-[#181B20] text-white shadow-2xl">
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
