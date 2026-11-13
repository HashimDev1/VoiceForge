import { BulkArrangementPreset } from './bulkTimelineTypes';

export const DEFAULT_BULK_PRESETS: BulkArrangementPreset[] = [
  {
    id: 'documentary_pace',
    name: 'Documentary Pace',
    description: '4–6 sec per image, gentle Ken Burns pan & zoom, smooth cross-dissolves.',
    durationMode: 'fixed',
    defaultDuration: 5.0,
    orderingMode: 'natural_numeric',
    imagePanZoom: true,
    videoShortfall: 'hold_frame',
    autoMuteVideoAudio: true,
    defaultTransition: 'fade',
    transitionDuration: 0.8,
    placement: 'append',
    targetTrackType: 'video'
  },
  {
    id: 'shorts_tiktok',
    name: 'Shorts & TikTok Pace',
    description: '1.5–2.5 sec rapid pacing, dynamic zoom, punchy quick cuts for social media.',
    durationMode: 'fixed',
    defaultDuration: 2.0,
    orderingMode: 'natural_numeric',
    imagePanZoom: true,
    videoShortfall: 'slow_motion',
    autoMuteVideoAudio: true,
    defaultTransition: 'none',
    transitionDuration: 0,
    placement: 'append',
    targetTrackType: 'video'
  },
  {
    id: 'slideshow_presentation',
    name: 'Slideshow Presentation',
    description: '5 sec per slide, clean wipe/fade transitions, full presentation clarity.',
    durationMode: 'fixed',
    defaultDuration: 5.0,
    orderingMode: 'natural_numeric',
    imagePanZoom: false,
    videoShortfall: 'hold_frame',
    autoMuteVideoAudio: false,
    defaultTransition: 'wipe_right',
    transitionDuration: 0.6,
    placement: 'append',
    targetTrackType: 'video'
  },
  {
    id: 'cinematic_montage',
    name: 'Cinematic Montage',
    description: '3–4 sec cinematic sequences with letterbox fit and subtle zoom drift.',
    durationMode: 'fixed',
    defaultDuration: 3.5,
    orderingMode: 'natural_numeric',
    imagePanZoom: true,
    videoShortfall: 'slow_motion',
    autoMuteVideoAudio: true,
    defaultTransition: 'fade',
    transitionDuration: 0.5,
    placement: 'append',
    targetTrackType: 'video'
  },
  {
    id: 'fast_beat_sync',
    name: 'Fast Music Beat Sync',
    description: '1 sec rapid-fire cuts matched to rhythm or fast soundtrack beats.',
    durationMode: 'fixed',
    defaultDuration: 1.0,
    orderingMode: 'natural_numeric',
    imagePanZoom: false,
    videoShortfall: 'loop',
    autoMuteVideoAudio: true,
    defaultTransition: 'none',
    transitionDuration: 0,
    placement: 'append',
    targetTrackType: 'video'
  }
];

const STORAGE_KEY_CUSTOM_PRESETS = 'voiceforge_bulk_custom_presets';

export function loadSavedBulkPresets(): BulkArrangementPreset[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS) : null;
    if (raw) {
      const parsed: BulkArrangementPreset[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...DEFAULT_BULK_PRESETS, ...parsed];
      }
    }
  } catch {}
  return [...DEFAULT_BULK_PRESETS];
}

export function saveCustomBulkPreset(preset: BulkArrangementPreset): BulkArrangementPreset[] {
  try {
    const current = loadSavedBulkPresets().filter((p) => p.isCustom);
    const updated = [...current.filter((p) => p.id !== preset.id), { ...preset, isCustom: true }];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
    }
    return [...DEFAULT_BULK_PRESETS, ...updated];
  } catch {
    return [...DEFAULT_BULK_PRESETS];
  }
}

export function deleteCustomBulkPreset(presetId: string): BulkArrangementPreset[] {
  try {
    const current = loadSavedBulkPresets().filter((p) => p.isCustom && p.id !== presetId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(current));
    }
    return [...DEFAULT_BULK_PRESETS, ...current];
  } catch {
    return [...DEFAULT_BULK_PRESETS];
  }
}
