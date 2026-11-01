import React, { useState, useEffect, useCallback } from 'react';
import { useVideoEditor } from './videoEditor/useVideoEditor';
import { EditorTopBar } from './videoEditor/EditorTopBar';
import { EditorSidebar } from './videoEditor/EditorSidebar';
import { EditorPreviewCanvas } from './videoEditor/EditorPreviewCanvas';
import { EditorTimeline } from './videoEditor/EditorTimeline';
import { EditorInspector } from './videoEditor/EditorInspector';
import { EditorExportModal } from './videoEditor/EditorExportModal';
import { videoEditorApi } from '../services/videoEditorApi';
import { MediaAsset } from '../../../shared/src/videoEditorTypes';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

interface VideoEditorStudioProps {
  onOpenCaptionStudio?: () => void;
}

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  onOpenCaptionStudio
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
    toggleTrackHidden
  } = useVideoEditor();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

      // Left / Right Arrow: Seek 1 sec (or 5s with Shift)
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seek(Math.max(0, playhead - delta));
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seek(Math.min(project.duration, playhead + delta));
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
    project.duration
  ]);

  return (
    <div className="flex flex-col gap-3.5 pb-20 select-none">
      {/* Auto-Save Recovery Notice Banner */}
      {recoveryAvailable && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              An unsaved session was recovered from your browser. Would you like to restore it?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreFromBackup}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={dismissRecovery}
              className="rounded-lg p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-200/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP STUDIO BAR */}
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
      />

      {/* 2. 3-PANEL EDITING WORKSPACE */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-3.5 lg:grid-cols-[310px_minmax(0,1fr)_340px] xl:grid-cols-[340px_minmax(0,1fr)_370px]">
        {/* Left Panel: Media Pool, Audio, Text, Transitions, Effects */}
        <div className="min-w-0 h-[640px]">
          <EditorSidebar
            assets={project.assets}
            onUploadAsset={handleUploadAsset}
            onAddClip={(asset) => {
              const targetTrack =
                project.tracks.find((t) => t.type === asset.type) ||
                project.tracks.find((t) => t.type === 'video') ||
                project.tracks[0];
              if (targetTrack) addClipToTrack(targetTrack.id, asset);
            }}
            onAddText={addTextClip}
            selectedClip={selectedClip}
            onUpdateClip={updateClip}
            onOpenCaptionStudio={onOpenCaptionStudio}
          />
        </div>

        {/* Center Panel: Video Viewport & Playback Stage */}
        <div className="min-w-0 flex flex-col gap-3.5">
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

        {/* Right Panel: Contextual Clip Inspector */}
        <div className="min-w-0 h-[640px]">
          <EditorInspector
            selectedClip={selectedClip}
            onUpdateClip={updateClip}
            playhead={playhead}
          />
        </div>
      </div>

      {/* 3. MULTITRACK EDITING TIMELINE */}
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

      {/* 4. EXPORT MODAL */}
      <EditorExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />
    </div>
  );
};
