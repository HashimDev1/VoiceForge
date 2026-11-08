import React, { useState, useCallback } from 'react';
import {
  ShieldCheck,
  Cpu,
  Lock,
  ImageIcon,
  Mic,
  Video as VideoIcon,
  LayoutGrid,
  List,
} from 'lucide-react';

// Image cleaner imports
import { UploadZone } from '../metadataCleaner/components/UploadZone';
import { ControlToolbar } from '../metadataCleaner/components/ControlToolbar';
import { ImageCard } from '../metadataCleaner/components/ImageCard';
import { MetadataModal } from '../metadataCleaner/components/MetadataModal';
import { BatchSummaryBar } from '../metadataCleaner/components/BatchSummaryBar';
import { InfoModal } from '../metadataCleaner/components/InfoModal';
import { ImageItem, CleaningOptions } from '../metadataCleaner/types';
import { imageProcessor } from '../metadataCleaner/processor';
import { detectFormatFromMimeOrName } from '../metadataCleaner/formatDetector';
import { extractRemovedPills } from '../metadataCleaner/pillExtractor';
import { useMetadataCleanerStore } from '../metadataCleaner/useMetadataCleanerStore';

// Audio cleaner imports
import {
  AudioItem,
  AudioCleaningOptions,
  audioProcessor,
  detectAudioFormatFromMimeOrName,
  extractAudioRemovedPills,
  AudioCard,
  AudioControlToolbar,
  AudioMetadataModal,
  AudioUploadZone,
  AudioBatchSummaryBar,
} from '../metadataCleaner/audio';

// Video cleaner imports
import {
  VideoItem,
  VideoCleaningOptions,
  videoProcessor,
  detectVideoFormatFromMimeOrName,
  extractVideoRemovedPills,
  VideoCard,
  VideoControlToolbar,
  VideoMetadataModal,
  VideoUploadZone,
  VideoBatchSummaryBar,
} from '../metadataCleaner/video';

interface MetadataCleanerStudioProps {
  theme?: 'dark' | 'light';
}

function isAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const audioExts = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'opus', 'aif', 'aiff'];
  return (
    (ext !== undefined && audioExts.includes(ext)) ||
    file.type.startsWith('audio/')
  );
}

function isVideoFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi'];
  return (
    (ext !== undefined && videoExts.includes(ext)) ||
    file.type.startsWith('video/')
  );
}

export const MetadataCleanerStudio: React.FC<MetadataCleanerStudioProps> = () => {
  // Use persistent store: data stays preserved across page navigation and is cleared when application closes or user clears it
  const {
    activeMediaTab: activeTab,
    viewMode,
    imageItems,
    audioItems,
    videoItems,
    isImageProcessing,
    isAudioProcessing,
    isVideoProcessing,
    imageProgress,
    audioProgress,
    videoProgress,
    imageOptions,
    audioOptions,
    videoOptions,
    addImageItems,
    updateImageItem,
    removeImageItem,
    clearAllImages,
    addAudioItems,
    updateAudioItem,
    removeAudioItem,
    clearAllAudio,
    addVideoItems,
    updateVideoItem,
    removeVideoItem,
    clearAllVideo,
    setActiveMediaTab: setActiveTab,
    setViewMode,
    setImageOptions,
    setAudioOptions,
    setVideoOptions,
    setIsImageProcessing,
    setImageProgress,
    setIsAudioProcessing,
    setAudioProgress,
    setIsVideoProcessing,
    setVideoProgress,
  } = useMetadataCleanerStore();

  const [inspectImageItem, setInspectImageItem] = useState<ImageItem | null>(null);
  const [inspectAudioItem, setInspectAudioItem] = useState<AudioItem | null>(null);
  const [inspectVideoItem, setInspectVideoItem] = useState<VideoItem | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // ================= IMAGE HANDLERS =================
  const handleImageFilesSelected = useCallback(
    async (files: File[]) => {
      const videoFiles = files.filter(isVideoFile);
      const audioFiles = files.filter(isAudioFile);
      const regularImages = files.filter((f) => !isAudioFile(f) && !isVideoFile(f));

      if (videoFiles.length > 0 && regularImages.length === 0) {
        setActiveTab('video');
        handleVideoFilesSelected(videoFiles);
        return;
      }

      if (audioFiles.length > 0 && regularImages.length === 0) {
        setActiveTab('audio');
        handleAudioFilesSelected(audioFiles);
        return;
      }

      const newItems: ImageItem[] = regularImages.map((file) => ({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        format: detectFormatFromMimeOrName(file.name, file.type),
        previewUrl: URL.createObjectURL(file),
        status: 'reading',
        progress: 0,
        metadata: null,
        cleanedBlob: null,
        cleanedUrl: null,
        cleanedSize: null,
        cleanedTagsRemovedCount: 0,
        verification: null,
        methodUsed: null,
      }));

      addImageItems(newItems);

      for (const item of newItems) {
        try {
          const metadata = await imageProcessor.inspect(item.file);
          updateImageItem(item.id, {
            status: 'ready',
            format: metadata.format !== 'unknown' ? metadata.format : item.format,
            metadata,
          });
        } catch (err: any) {
          updateImageItem(item.id, {
            status: 'ready',
            errorMessage: err?.message || 'Inspection error',
          });
        }
      }
    },
    [addImageItems, updateImageItem, setActiveTab]
  );

  const cleanImageItem = useCallback(
    async (item: ImageItem, customOptions?: CleaningOptions) => {
      const effectiveOptions = customOptions || imageOptions;

      updateImageItem(item.id, {
        status: 'processing',
        progress: 10,
        errorMessage: undefined,
      });

      try {
        const res = await imageProcessor.clean(
          item.file,
          effectiveOptions,
          (progressPercent) => {
            updateImageItem(item.id, { progress: progressPercent });
          }
        );

        const cleanedUrl = URL.createObjectURL(res.cleanBlob);
        const pills = extractRemovedPills(item);
        const tagsRemovedCount =
          pills.length || (item.metadata ? item.metadata.totalTagsCount : 0);

        updateImageItem(item.id, {
          status: 'done',
          progress: 100,
          cleanedBlob: res.cleanBlob,
          cleanedUrl,
          cleanedSize: res.cleanBlob.size,
          cleanedTagsRemovedCount: tagsRemovedCount,
          verification: res.verification,
          methodUsed: res.methodUsed,
          processingTimeMs: res.durationMs,
        });
      } catch (err: any) {
        updateImageItem(item.id, {
          status: 'error',
          progress: 0,
          errorMessage: err?.message || 'Failed to strip metadata',
        });
      }
    },
    [imageOptions, updateImageItem]
  );

  const cleanAllImages = useCallback(async () => {
    const uncleaned = imageItems.filter((i) => i.status !== 'done');
    if (uncleaned.length === 0) return;

    setIsImageProcessing(true);
    setImageProgress(5);

    let completed = 0;
    for (const item of uncleaned) {
      await cleanImageItem(item);
      completed++;
      setImageProgress(Math.round((completed / uncleaned.length) * 100));
    }

    setIsImageProcessing(false);
    setImageProgress(100);
  }, [imageItems, cleanImageItem, setIsImageProcessing, setImageProgress]);

  // ================= AUDIO HANDLERS =================
  const handleAudioFilesSelected = useCallback(
    async (files: File[]) => {
      const videoFiles = files.filter(isVideoFile);
      const audioFiles = files.filter(isAudioFile);
      const imageFiles = files.filter((f) => !isAudioFile(f) && !isVideoFile(f));

      if (videoFiles.length > 0 && audioFiles.length === 0) {
        setActiveTab('video');
        handleVideoFilesSelected(videoFiles);
        return;
      }

      if (imageFiles.length > 0 && audioFiles.length === 0) {
        setActiveTab('images');
        handleImageFilesSelected(imageFiles);
        return;
      }

      const newItems: AudioItem[] = audioFiles.map((file) => ({
        id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        format: detectAudioFormatFromMimeOrName(file.name, file.type),
        duration: 0,
        audioUrl: URL.createObjectURL(file),
        status: 'reading',
        progress: 0,
        metadata: null,
        cleanedBlob: null,
        cleanedUrl: null,
        cleanedSize: null,
        cleanedTagsRemovedCount: 0,
        verification: null,
        methodUsed: null,
      }));

      addAudioItems(newItems);

      for (const item of newItems) {
        try {
          const metadata = await audioProcessor.inspect(item.file);
          updateAudioItem(item.id, {
            status: 'ready',
            format: metadata.format !== 'unknown' ? metadata.format : item.format,
            duration: metadata.duration || item.duration,
            metadata,
          });
        } catch (err: any) {
          updateAudioItem(item.id, {
            status: 'ready',
            errorMessage: err?.message || 'Inspection error',
          });
        }
      }
    },
    [addAudioItems, updateAudioItem, setActiveTab, handleImageFilesSelected]
  );

  const cleanAudioItem = useCallback(
    async (item: AudioItem, customOptions?: AudioCleaningOptions) => {
      const effectiveOptions = customOptions || audioOptions;

      updateAudioItem(item.id, {
        status: 'processing',
        progress: 10,
        errorMessage: undefined,
      });

      try {
        const res = await audioProcessor.clean(
          item.file,
          effectiveOptions,
          (progressPercent) => {
            updateAudioItem(item.id, { progress: progressPercent });
          }
        );

        const cleanedUrl = URL.createObjectURL(res.cleanBlob);
        const pills = extractAudioRemovedPills(item);
        const tagsRemovedCount =
          pills.length || (item.metadata ? item.metadata.totalTagsCount : 0);

        updateAudioItem(item.id, {
          status: 'done',
          progress: 100,
          cleanedBlob: res.cleanBlob,
          cleanedUrl,
          cleanedSize: res.cleanBlob.size,
          cleanedTagsRemovedCount: tagsRemovedCount,
          verification: res.verification,
          methodUsed: res.methodUsed,
          processingTimeMs: res.durationMs,
        });
      } catch (err: any) {
        updateAudioItem(item.id, {
          status: 'error',
          progress: 0,
          errorMessage: err?.message || 'Failed to clean audio metadata',
        });
      }
    },
    [audioOptions, updateAudioItem]
  );

  const cleanAllAudio = useCallback(async () => {
    const uncleaned = audioItems.filter((i) => i.status !== 'done');
    if (uncleaned.length === 0) return;

    setIsAudioProcessing(true);
    setAudioProgress(5);

    let completed = 0;
    for (const item of uncleaned) {
      await cleanAudioItem(item);
      completed++;
      setAudioProgress(Math.round((completed / uncleaned.length) * 100));
    }

    setIsAudioProcessing(false);
    setAudioProgress(100);
  }, [audioItems, cleanAudioItem, setIsAudioProcessing, setAudioProgress]);

  const handleAudioNuclearFallback = useCallback(
    async (item: AudioItem) => {
      await cleanAudioItem(item, { ...audioOptions, nuclearReencode: true });
    },
    [cleanAudioItem, audioOptions]
  );

  // ================= VIDEO HANDLERS =================
  const handleVideoFilesSelected = useCallback(
    async (files: File[]) => {
      const audioFiles = files.filter(isAudioFile);
      const imageFiles = files.filter((f) => !isAudioFile(f) && !isVideoFile(f));
      const videoFiles = files.filter(isVideoFile);

      if (videoFiles.length === 0) {
        if (audioFiles.length > 0) {
          setActiveTab('audio');
          handleAudioFilesSelected(audioFiles);
          return;
        }
        if (imageFiles.length > 0) {
          setActiveTab('images');
          handleImageFilesSelected(imageFiles);
          return;
        }
      }

      const newItems: VideoItem[] = videoFiles.map((file) => ({
        id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        format: detectVideoFormatFromMimeOrName(file.name, file.type),
        previewUrl: URL.createObjectURL(file),
        status: 'reading',
        progress: 0,
        metadata: null,
        cleanedBlob: null,
        cleanedUrl: null,
        cleanedSize: null,
        cleanedTagsRemovedCount: 0,
        verification: null,
        methodUsed: null,
      }));

      addVideoItems(newItems);

      for (const item of newItems) {
        try {
          const metadata = await videoProcessor.inspect(item.file);
          updateVideoItem(item.id, {
            status: 'ready',
            format: metadata.format !== 'unknown' ? metadata.format : item.format,
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            metadata,
          });
        } catch (err: any) {
          updateVideoItem(item.id, {
            status: 'ready',
            errorMessage: err?.message || 'Inspection error',
          });
        }
      }
    },
    [addVideoItems, updateVideoItem, setActiveTab, handleAudioFilesSelected, handleImageFilesSelected]
  );

  const cleanVideoItem = useCallback(
    async (item: VideoItem, customOptions?: VideoCleaningOptions) => {
      const effectiveOptions = customOptions || videoOptions;

      updateVideoItem(item.id, {
        status: 'processing',
        progress: 10,
        errorMessage: undefined,
      });

      try {
        const res = await videoProcessor.clean(
          item.file,
          effectiveOptions,
          (progressPercent) => {
            updateVideoItem(item.id, { progress: progressPercent });
          }
        );

        const cleanedUrl = URL.createObjectURL(res.cleanBlob);
        const pills = extractVideoRemovedPills(item);
        const tagsRemovedCount =
          pills.length || (item.metadata ? item.metadata.totalTagsCount : 0);

        updateVideoItem(item.id, {
          status: 'done',
          progress: 100,
          cleanedBlob: res.cleanBlob,
          cleanedUrl,
          cleanedSize: res.cleanBlob.size,
          cleanedTagsRemovedCount: tagsRemovedCount,
          verification: res.verification,
          methodUsed: res.methodUsed,
          processingTimeMs: res.durationMs,
        });
      } catch (err: any) {
        updateVideoItem(item.id, {
          status: 'error',
          progress: 0,
          errorMessage: err?.message || 'Failed to clean video metadata',
        });
      }
    },
    [videoOptions, updateVideoItem]
  );

  const cleanAllVideo = useCallback(async () => {
    const uncleaned = videoItems.filter((i) => i.status !== 'done');
    if (uncleaned.length === 0) return;

    setIsVideoProcessing(true);
    setVideoProgress(5);

    let completed = 0;
    for (const item of uncleaned) {
      await cleanVideoItem(item);
      completed++;
      setVideoProgress(Math.round((completed / uncleaned.length) * 100));
    }

    setIsVideoProcessing(false);
    setVideoProgress(100);
  }, [videoItems, cleanVideoItem, setIsVideoProcessing, setVideoProgress]);

  const handleVideoNuclearFallback = useCallback(
    async (item: VideoItem) => {
      await cleanVideoItem(item, { ...videoOptions, nuclearReencode: true });
    },
    [cleanVideoItem, videoOptions]
  );

  // Derived counts
  const cleanedImageCount = imageItems.filter((i) => i.status === 'done').length;
  const uncleanedImageCount = imageItems.filter((i) => i.status !== 'done').length;
  const totalImageRemoved = imageItems
    .filter((i) => i.status === 'done')
    .reduce((acc, curr) => acc + (curr.cleanedTagsRemovedCount || 0), 0);

  const cleanedAudioCount = audioItems.filter((i) => i.status === 'done').length;
  const uncleanedAudioCount = audioItems.filter((i) => i.status !== 'done').length;
  const totalAudioRemoved = audioItems
    .filter((i) => i.status === 'done')
    .reduce((acc, curr) => acc + (curr.cleanedTagsRemovedCount || 0), 0);

  const cleanedVideoCount = videoItems.filter((i) => i.status === 'done').length;
  const uncleanedVideoCount = videoItems.filter((i) => i.status !== 'done').length;
  const totalVideoRemoved = videoItems
    .filter((i) => i.status === 'done')
    .reduce((acc, curr) => acc + (curr.cleanedTagsRemovedCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-studio-950 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-20 border-b border-studio-border bg-white/90 dark:bg-studio-900/90 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
                AI Metadata Cleaner
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                PROVENANCE STRIPPER
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Strip AI provenance tags, C2PA manifests & generator watermarks from videos, voices & images (100% Client-Side)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>100% In-Browser Privacy</span>
          </div>

          <button
            onClick={() => setIsInfoOpen(true)}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1.5"
            title="How stripping works"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Engine Details</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Studio Media Tabs: Videos vs Voices & Audio vs Images */}
        <div className="flex items-center justify-center sm:justify-start space-x-2 border-b border-slate-200 dark:border-studio-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'video'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-studio-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-studio-border'
            }`}
          >
            <VideoIcon className="w-4 h-4" />
            <span>Videos</span>
            {videoItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold ml-1">
                {videoItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'audio'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-studio-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-studio-border'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Voices & Audio</span>
            {audioItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold ml-1">
                {audioItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'images'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-studio-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-studio-border'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Images</span>
            {imageItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-bold ml-1">
                {imageItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ================= ACTIVE TAB: VIDEOS ================= */}
        {activeTab === 'video' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Video Upload Zone */}
            <VideoUploadZone
              onFilesSelected={handleVideoFilesSelected}
              isProcessing={isVideoProcessing}
              totalVideoCount={videoItems.length}
            />

            {/* Video Controls Toolbar */}
            {videoItems.length > 0 && (
              <VideoControlToolbar
                options={videoOptions}
                onOptionsChange={setVideoOptions}
                onCleanAll={cleanAllVideo}
                onClearAll={clearAllVideo}
                onLoadSample={(files) => handleVideoFilesSelected(files)}
                isProcessing={isVideoProcessing}
                totalCount={videoItems.length}
                uncleanedCount={uncleanedVideoCount}
                overallProgress={videoProgress}
              />
            )}

            {/* Cleaned Video Results List */}
            {videoItems.length > 0 && (
              <div className="space-y-4">
                {/* Header: "X videos cleaned, Y metadata items removed" + View Mode Toggle + "Clear list" */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                    {cleanedVideoCount > 0
                      ? `${cleanedVideoCount} videos cleaned, ${totalVideoRemoved} metadata items removed`
                      : `${videoItems.length} ${videoItems.length === 1 ? 'video' : 'videos'} loaded`}
                  </h3>

                  <div className="flex items-center space-x-2">
                    {/* View Switcher: Grid (3-4/row) vs List */}
                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-studio-800 p-0.5 rounded-xl border border-slate-200 dark:border-studio-border">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-studio-900 text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                        title="Grid view (3 to 4 cards on line)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid (3-4/row)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                          viewMode === 'list'
                            ? 'bg-white dark:bg-studio-900 text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                        title="List view (1 per line)"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">List</span>
                      </button>
                    </div>

                    <button
                      onClick={clearAllVideo}
                      disabled={isVideoProcessing}
                      className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40"
                    >
                      Clear list
                    </button>
                  </div>
                </div>

                {/* List of Video Cards (Responsive Grid: 3 to 4 per line on desktop) */}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-3'
                  }
                >
                  {videoItems.map((item) => (
                    <VideoCard
                      key={item.id}
                      item={item}
                      viewMode={viewMode}
                      onInspect={(i) => setInspectVideoItem(i)}
                      onClean={(i) => cleanVideoItem(i)}
                      onNuclearFallback={handleVideoNuclearFallback}
                      onRemove={removeVideoItem}
                      isProcessing={isVideoProcessing}
                    />
                  ))}
                </div>

                {/* Reference Footer: Video files are processed in your browser */}
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Video files are processed in your browser. Nothing is uploaded or stored.</span>
                </div>
              </div>
            )}

            {/* Bottom Video Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-studio-border text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Notice on Video Provenance & Watermarks:
              </p>
              <p>
                Mode A performs lossless video stream copy (strips moov.udta, C2PA manifests, XMP packets, comments, and encoder atoms without re-encoding frames). Mode B provides full re-encoding via ffmpeg.wasm to disrupt embedded pixel-level watermarks. Users are responsible for complying with local regulations and AI disclosure terms.
              </p>
            </div>
          </div>
        )}

        {/* ================= ACTIVE TAB: VOICES & AUDIO ================= */}
        {activeTab === 'audio' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Audio Upload Zone */}
            <AudioUploadZone
              onFilesSelected={handleAudioFilesSelected}
              isProcessing={isAudioProcessing}
              totalAudioCount={audioItems.length}
            />

            {/* Audio Controls Toolbar */}
            {audioItems.length > 0 && (
              <AudioControlToolbar
                options={audioOptions}
                onOptionsChange={setAudioOptions}
                onCleanAll={cleanAllAudio}
                onClearAll={clearAllAudio}
                onLoadSample={(files) => handleAudioFilesSelected(files)}
                isProcessing={isAudioProcessing}
                totalCount={audioItems.length}
                uncleanedCount={uncleanedAudioCount}
                overallProgress={audioProgress}
              />
            )}

            {/* Cleaned Audio Results List */}
            {audioItems.length > 0 && (
              <div className="space-y-4">
                {/* Header: "X audio files cleaned, Y metadata items removed" + View Mode Toggle + "Clear list" */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                    {cleanedAudioCount > 0
                      ? `${cleanedAudioCount} audio files cleaned, ${totalAudioRemoved} metadata items removed`
                      : `${audioItems.length} ${audioItems.length === 1 ? 'audio file' : 'audio files'} loaded`}
                  </h3>

                  <div className="flex items-center space-x-2">
                    {/* View Switcher: Grid (3-4/row) vs List */}
                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-studio-800 p-0.5 rounded-xl border border-slate-200 dark:border-studio-border">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-studio-900 text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                        title="Grid view (3 to 4 cards on line)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid (3-4/row)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                          viewMode === 'list'
                            ? 'bg-white dark:bg-studio-900 text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                        title="List view (1 per line)"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">List</span>
                      </button>
                    </div>

                    <button
                      onClick={clearAllAudio}
                      disabled={isAudioProcessing}
                      className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40"
                    >
                      Clear list
                    </button>
                  </div>
                </div>

                {/* List of Audio Cards (Responsive Grid: 3 to 4 per line on desktop) */}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-3'
                  }
                >
                  {audioItems.map((item) => (
                    <AudioCard
                      key={item.id}
                      item={item}
                      viewMode={viewMode}
                      onInspect={(i) => setInspectAudioItem(i)}
                      onClean={(i) => cleanAudioItem(i)}
                      onNuclearFallback={handleAudioNuclearFallback}
                      onRemove={removeAudioItem}
                      isProcessing={isAudioProcessing}
                    />
                  ))}
                </div>

                {/* Reference Footer: Audio files are processed in your browser */}
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Audio files are processed in your browser. Nothing is uploaded or stored.</span>
                </div>
              </div>
            )}

            {/* Bottom Audio Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-studio-border text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Notice on Audio Provenance & Watermarks:
              </p>
              <p>
                Mode A performs lossless container tag stripping (ID3v1, ID3v2 header, Vorbis comments, MP4 atoms, C2PA manifests). Mode B provides full re-encoding through ffmpeg.wasm to neutralize psychoacoustic watermarks. Users are responsible for complying with local regulations and AI disclosure terms.
              </p>
            </div>
          </div>
        )}

        {/* ================= ACTIVE TAB: IMAGES ================= */}
        {activeTab === 'images' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Upload Zone */}
            <UploadZone
              onFilesSelected={handleImageFilesSelected}
              isProcessing={isImageProcessing}
              totalImagesCount={imageItems.length}
            />

            {/* Controls Toolbar */}
            {imageItems.length > 0 && (
              <ControlToolbar
                options={imageOptions}
                onOptionsChange={setImageOptions}
                onCleanAll={cleanAllImages}
                onClearAll={clearAllImages}
                isProcessing={isImageProcessing}
                totalCount={imageItems.length}
                uncleanedCount={uncleanedImageCount}
                overallProgress={imageProgress}
              />
            )}

            {/* Cleaned Results List */}
            {imageItems.length > 0 && (
              <div className="space-y-4">
                {/* Header: "X images cleaned, Y metadata items removed" + View Mode Toggle + "Clear list" */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                    {cleanedImageCount > 0
                      ? `${cleanedImageCount} images cleaned, ${totalImageRemoved} metadata items removed`
                      : `${imageItems.length} ${imageItems.length === 1 ? 'image' : 'images'} loaded`}
                  </h3>

                  <div className="flex items-center space-x-2">
                    {/* View Switcher: Grid (3-4/row) vs List */}
                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-studio-800 p-0.5 rounded-xl border border-slate-200 dark:border-studio-border">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                        title="Grid view (3 to 4 cards on line)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid (3-4/row)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                          viewMode === 'list'
                            ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                        title="List view (1 per line)"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">List</span>
                      </button>
                    </div>

                    <button
                      onClick={clearAllImages}
                      disabled={isImageProcessing}
                      className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-studio-border bg-white dark:bg-studio-900 hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-800 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Clear list
                    </button>
                  </div>
                </div>

                {/* List of cards (Responsive Grid: 3 to 4 per line on desktop) */}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-3'
                  }
                >
                  {imageItems.map((item) => (
                    <ImageCard
                      key={item.id}
                      item={item}
                      viewMode={viewMode}
                      onInspect={(i) => setInspectImageItem(i)}
                      onClean={(i) => cleanImageItem(i)}
                      onNuclearFallback={(i) =>
                        cleanImageItem(i, { ...imageOptions, nuclearCanvas: true })
                      }
                      onRemove={removeImageItem}
                      isProcessing={isImageProcessing}
                    />
                  ))}
                </div>

                {/* Reference Footer: Images are processed in your browser */}
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Images are processed in your browser. Nothing is uploaded or stored.</span>
                </div>
              </div>
            )}

            {/* Bottom Image Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-studio-border text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Notice on Image Metadata:
              </p>
              <p>
                This tool removes file metadata only. It cannot remove invisible pixel-level watermarks (e.g., SynthID). Users are responsible for complying with platform policies and local laws regarding AI content disclosure.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom ZIP Bars */}
      {activeTab === 'video' ? (
        <VideoBatchSummaryBar items={videoItems} isProcessing={isVideoProcessing} />
      ) : activeTab === 'images' ? (
        <BatchSummaryBar items={imageItems} isProcessing={isImageProcessing} />
      ) : (
        <AudioBatchSummaryBar items={audioItems} isProcessing={isAudioProcessing} />
      )}

      {/* Video Inspection Modal */}
      <VideoMetadataModal
        item={inspectVideoItem}
        onClose={() => setInspectVideoItem(null)}
        onCleanItem={(i) => {
          cleanVideoItem(i);
          setInspectVideoItem(null);
        }}
        isProcessing={isVideoProcessing}
      />

      {/* Image Inspection Modal */}
      <MetadataModal
        item={inspectImageItem}
        onClose={() => setInspectImageItem(null)}
        onCleanItem={(i) => {
          cleanImageItem(i);
          setInspectImageItem(null);
        }}
        isProcessing={isImageProcessing}
      />

      {/* Audio Inspection Modal */}
      <AudioMetadataModal
        item={inspectAudioItem}
        onClose={() => setInspectAudioItem(null)}
        onCleanItem={(i) => {
          cleanAudioItem(i);
          setInspectAudioItem(null);
        }}
        isProcessing={isAudioProcessing}
      />

      {/* Engine Details Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
};
