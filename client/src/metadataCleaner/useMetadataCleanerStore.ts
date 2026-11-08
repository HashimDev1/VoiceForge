import { useSyncExternalStore } from 'react';
import { ImageItem, CleaningOptions } from './types';
import { AudioItem, AudioCleaningOptions } from './audio/audioTypes';
import { VideoItem, VideoCleaningOptions } from './video/videoTypes';

export interface CleanerStoreState {
  activeMediaTab: 'images' | 'audio' | 'video';
  viewMode: 'grid' | 'list';
  imageItems: ImageItem[];
  audioItems: AudioItem[];
  videoItems: VideoItem[];
  isImageProcessing: boolean;
  isAudioProcessing: boolean;
  isVideoProcessing: boolean;
  imageProgress: number;
  audioProgress: number;
  videoProgress: number;
  imageOptions: CleaningOptions;
  audioOptions: AudioCleaningOptions;
  videoOptions: VideoCleaningOptions;
}

const defaultImageOptions: CleaningOptions = {
  stripExif: true,
  stripXmp: true,
  stripIptc: true,
  stripC2pa: true,
  stripIcc: true,
  stripComments: true,
  nuclearCanvas: false,
  nuclearQuality: 0.95,
};

const defaultAudioOptions: AudioCleaningOptions = {
  stripId3: true,
  stripVorbis: true,
  stripMp4Atoms: true,
  stripRiffInfo: true,
  stripC2pa: true,
  stripXmp: true,
  nuclearReencode: false,
  nuclearFormat: 'mp3',
  nuclearBitrate: '192k',
};

const defaultVideoOptions: VideoCleaningOptions = {
  stripUdta: true,
  stripXmp: true,
  stripC2pa: true,
  stripMetadataAtoms: true,
  nuclearReencode: false,
  nuclearResolution: 'original',
  nuclearCrf: 20,
};

// Global in-memory singleton state preserved across page navigation
let storeState: CleanerStoreState = {
  activeMediaTab: 'images',
  viewMode: 'list',
  imageItems: [],
  audioItems: [],
  videoItems: [],
  isImageProcessing: false,
  isAudioProcessing: false,
  isVideoProcessing: false,
  imageProgress: 0,
  audioProgress: 0,
  videoProgress: 0,
  imageOptions: defaultImageOptions,
  audioOptions: defaultAudioOptions,
  videoOptions: defaultVideoOptions,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const metadataCleanerStore = {
  getState(): CleanerStoreState {
    return storeState;
  },

  setState(
    partial:
      | Partial<CleanerStoreState>
      | ((prev: CleanerStoreState) => Partial<CleanerStoreState>)
  ) {
    const next = typeof partial === 'function' ? partial(storeState) : partial;
    storeState = { ...storeState, ...next };
    notify();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Image helpers
  addImageItems(items: ImageItem[]) {
    storeState = {
      ...storeState,
      imageItems: [...storeState.imageItems, ...items],
    };
    notify();
  },

  updateImageItem(id: string, updates: Partial<ImageItem>) {
    storeState = {
      ...storeState,
      imageItems: storeState.imageItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
    notify();
  },

  removeImageItem(id: string) {
    const target = storeState.imageItems.find((i) => i.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      if (target.cleanedUrl) URL.revokeObjectURL(target.cleanedUrl);
    }
    storeState = {
      ...storeState,
      imageItems: storeState.imageItems.filter((i) => i.id !== id),
    };
    notify();
  },

  clearAllImages() {
    storeState.imageItems.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.cleanedUrl) URL.revokeObjectURL(item.cleanedUrl);
    });
    storeState = {
      ...storeState,
      imageItems: [],
      imageProgress: 0,
      isImageProcessing: false,
    };
    notify();
  },

  // Audio helpers
  addAudioItems(items: AudioItem[]) {
    storeState = {
      ...storeState,
      audioItems: [...storeState.audioItems, ...items],
    };
    notify();
  },

  updateAudioItem(id: string, updates: Partial<AudioItem>) {
    storeState = {
      ...storeState,
      audioItems: storeState.audioItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
    notify();
  },

  removeAudioItem(id: string) {
    const target = storeState.audioItems.find((i) => i.id === id);
    if (target) {
      URL.revokeObjectURL(target.audioUrl);
      if (target.cleanedUrl) URL.revokeObjectURL(target.cleanedUrl);
    }
    storeState = {
      ...storeState,
      audioItems: storeState.audioItems.filter((i) => i.id !== id),
    };
    notify();
  },

  clearAllAudio() {
    storeState.audioItems.forEach((item) => {
      URL.revokeObjectURL(item.audioUrl);
      if (item.cleanedUrl) URL.revokeObjectURL(item.cleanedUrl);
    });
    storeState = {
      ...storeState,
      audioItems: [],
      audioProgress: 0,
      isAudioProcessing: false,
    };
    notify();
  },

  // Video helpers
  addVideoItems(items: VideoItem[]) {
    storeState = {
      ...storeState,
      videoItems: [...storeState.videoItems, ...items],
    };
    notify();
  },

  updateVideoItem(id: string, updates: Partial<VideoItem>) {
    storeState = {
      ...storeState,
      videoItems: storeState.videoItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
    notify();
  },

  removeVideoItem(id: string) {
    const target = storeState.videoItems.find((i) => i.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      if (target.cleanedUrl) URL.revokeObjectURL(target.cleanedUrl);
    }
    storeState = {
      ...storeState,
      videoItems: storeState.videoItems.filter((i) => i.id !== id),
    };
    notify();
  },

  clearAllVideo() {
    storeState.videoItems.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.cleanedUrl) URL.revokeObjectURL(item.cleanedUrl);
    });
    storeState = {
      ...storeState,
      videoItems: [],
      videoProgress: 0,
      isVideoProcessing: false,
    };
    notify();
  },

  setActiveMediaTab(tab: 'images' | 'audio' | 'video') {
    storeState = { ...storeState, activeMediaTab: tab };
    notify();
  },

  setViewMode(mode: 'grid' | 'list') {
    storeState = { ...storeState, viewMode: mode };
    notify();
  },

  setImageOptions(options: CleaningOptions) {
    storeState = { ...storeState, imageOptions: options };
    notify();
  },

  setAudioOptions(options: AudioCleaningOptions) {
    storeState = { ...storeState, audioOptions: options };
    notify();
  },

  setVideoOptions(options: VideoCleaningOptions) {
    storeState = { ...storeState, videoOptions: options };
    notify();
  },

  setIsImageProcessing(val: boolean) {
    storeState = { ...storeState, isImageProcessing: val };
    notify();
  },

  setImageProgress(val: number) {
    storeState = { ...storeState, imageProgress: val };
    notify();
  },

  setIsAudioProcessing(val: boolean) {
    storeState = { ...storeState, isAudioProcessing: val };
    notify();
  },

  setAudioProgress(val: number) {
    storeState = { ...storeState, audioProgress: val };
    notify();
  },

  setIsVideoProcessing(val: boolean) {
    storeState = { ...storeState, isVideoProcessing: val };
    notify();
  },

  setVideoProgress(val: number) {
    storeState = { ...storeState, videoProgress: val };
    notify();
  },
};

export function useMetadataCleanerStore() {
  const state = useSyncExternalStore(
    metadataCleanerStore.subscribe,
    metadataCleanerStore.getState,
    metadataCleanerStore.getState
  );

  return {
    ...state,
    addImageItems: metadataCleanerStore.addImageItems,
    updateImageItem: metadataCleanerStore.updateImageItem,
    removeImageItem: metadataCleanerStore.removeImageItem,
    clearAllImages: metadataCleanerStore.clearAllImages,
    addAudioItems: metadataCleanerStore.addAudioItems,
    updateAudioItem: metadataCleanerStore.updateAudioItem,
    removeAudioItem: metadataCleanerStore.removeAudioItem,
    clearAllAudio: metadataCleanerStore.clearAllAudio,
    addVideoItems: metadataCleanerStore.addVideoItems,
    updateVideoItem: metadataCleanerStore.updateVideoItem,
    removeVideoItem: metadataCleanerStore.removeVideoItem,
    clearAllVideo: metadataCleanerStore.clearAllVideo,
    setActiveMediaTab: metadataCleanerStore.setActiveMediaTab,
    setViewMode: metadataCleanerStore.setViewMode,
    setImageOptions: metadataCleanerStore.setImageOptions,
    setAudioOptions: metadataCleanerStore.setAudioOptions,
    setVideoOptions: metadataCleanerStore.setVideoOptions,
    setIsImageProcessing: metadataCleanerStore.setIsImageProcessing,
    setImageProgress: metadataCleanerStore.setImageProgress,
    setIsAudioProcessing: metadataCleanerStore.setIsAudioProcessing,
    setAudioProgress: metadataCleanerStore.setAudioProgress,
    setIsVideoProcessing: metadataCleanerStore.setIsVideoProcessing,
    setVideoProgress: metadataCleanerStore.setVideoProgress,
  };
}
