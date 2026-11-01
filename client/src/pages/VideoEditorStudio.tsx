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
    canUndo,
    canRedo,
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

      // Delete or Backspace: Delete selected clip
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          deleteClip(selectedClipId);
        }
      }

      // Ctrl+Z or Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
      ) {
        e.preventDefault();
        redo();
      }

      // Left / Right Arrow: Seek 1 sec
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(0, playhead - 1));
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        seek(Math.min(project.duration, playhead + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    splitClipAtPlayhead,
    selectedClipId,
    deleteClip,
    undo,
    redo,
    seek,
    playhead,
    project.duration
  ]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1720px] space-y-3.5 font-sans select-none pb-12">
      {/* 1. TOP TOOLBAR */}
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
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
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
        onDuplicateClip={duplicateClip}
        onRippleDelete={rippleDelete}
        onTrimClipStart={trimClipStart}
        onTrimClipEnd={trimClipEnd}
        onMoveClip={moveClip}
        onToggleTrackLock={toggleTrackLock}
        onToggleTrackMute={toggleTrackMute}
        onToggleTrackHidden={toggleTrackHidden}
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

