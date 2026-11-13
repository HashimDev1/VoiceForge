import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  Clock,
  FileText,
  Mic,
  Sliders,
  Play,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Check,
  AlertTriangle,
  X,
  Plus,
  Layers,
  Wand2,
  Save,
  Film,
  Music,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import {
  MediaAsset,
  TransitionType,
  TrackType
} from '../../../../../shared/src/videoEditorTypes';
import {
  BulkMediaItem,
  BulkDurationMode,
  BulkVideoShortfallBehavior,
  BulkInsertionPlacement,
  BulkMissingDurationPolicy,
  BulkArrangementPreset,
  BulkArrangementProposal,
  VoiceoverSegmentInput
} from '../../../../../shared/src/bulkTimelineTypes';
import {
  naturalSort,
  parseCustomTimingText,
  matchTimingRecordsToMedia
} from '../../../../../shared/src/bulkTimelineParser';
import {
  buildBulkMediaQueue,
  recalculateQueueTimings,
  applyFixedDurationToQueue,
  applyCustomTimingToQueue,
  applyVoiceoverSyncToQueue,
  snapToFrame
} from '../../../../../shared/src/bulkTimelineEngine';
import {
  DEFAULT_BULK_PRESETS,
  loadSavedBulkPresets,
  saveCustomBulkPreset
} from '../../../../../shared/src/bulkTimelinePresets';
import { videoEditorApi } from '../../../services/videoEditorApi';

interface SmartBulkArrangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAssets: MediaAsset[];
  onUploadAssets: (files: File[]) => Promise<MediaAsset[]>;
  onApplyProposal: (proposal: BulkArrangementProposal & {
    imagePanZoom?: boolean;
    videoShortfall?: BulkVideoShortfallBehavior;
    autoMuteVideoAudio?: boolean;
    defaultTransition?: TransitionType;
    transitionDuration?: number;
  }) => void;
  targetTracks: Array<{ id: string; name: string; type: TrackType }>;
  playhead: number;
  projectFps?: number;
}

const FIXED_PRESETS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const SmartBulkArrangeModal: React.FC<SmartBulkArrangeModalProps> = ({
  isOpen,
  onClose,
  availableAssets,
  onUploadAssets,
  onApplyProposal,
  targetTracks,
  playhead,
  projectFps = 30
}) => {
  const [items, setItems] = useState<BulkMediaItem[]>([]);
  const [mode, setMode] = useState<BulkDurationMode>('fixed');
  const [fixedDuration, setFixedDuration] = useState<number>(4.0);
  const [customDurationInput, setCustomDurationInput] = useState<string>('4.0');
  
  // Custom timing text & policies
  const [timingText, setTimingText] = useState<string>('');
  const [missingPolicy, setMissingPolicy] = useState<BulkMissingDurationPolicy>('use_default');
  const [timingErrors, setTimingErrors] = useState<string[]>([]);
  const [timingWarnings, setTimingWarnings] = useState<string[]>([]);

  // Voiceover options
  const [selectedVoAssetId, setSelectedVoAssetId] = useState<string>('');
  const [voTranscriptText, setVoTranscriptText] = useState<string>('');

  // Placement & Engine options
  const [placement, setPlacement] = useState<BulkInsertionPlacement>('append');
  const [targetTrackId, setTargetTrackId] = useState<string>(() => {
    const vTrack = targetTracks.find((t) => t.type === 'video');
    return vTrack ? vTrack.id : targetTracks[0]?.id || 'track-v1';
  });
  const [imagePanZoom, setImagePanZoom] = useState<boolean>(true);
  const [videoShortfall, setVideoShortfall] = useState<BulkVideoShortfallBehavior>('hold_frame');
  const [autoMuteVideoAudio, setAutoMuteVideoAudio] = useState<boolean>(false);
  const [defaultTransition, setDefaultTransition] = useState<TransitionType>('none');
  const [transitionDuration, setTransitionDuration] = useState<number>(0.5);

  // Presets
  const [presets, setPresets] = useState<BulkArrangementPreset[]>(DEFAULT_BULK_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('documentary_pace');
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  // Uploading state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragOverQueue, setDragOverQueue] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timingFileInputRef = useRef<HTMLInputElement>(null);

  // Load presets on mount
  useEffect(() => {
    setPresets(loadSavedBulkPresets());
  }, []);

  // Initialize queue from available visual assets if queue is empty
  useEffect(() => {
    if (isOpen && items.length === 0 && availableAssets.length > 0) {
      const visualAssets = availableAssets.filter((a) => a.type === 'image' || a.type === 'video');
      if (visualAssets.length > 0) {
        const queue = buildBulkMediaQueue(visualAssets, {
          ordering: 'natural_numeric',
          defaultDuration: fixedDuration,
          fps: projectFps
        });
        setItems(queue);
      }
    }
  }, [isOpen]);

  // Recalculate duration whenever fixed duration changes
  const handleApplyFixedDuration = (duration: number) => {
    const valid = Math.max(0.1, duration);
    setFixedDuration(valid);
    setCustomDurationInput(String(valid));
    setItems((prev) => applyFixedDurationToQueue(prev, valid, projectFps));
  };

  // Preset Selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;

    setMode(p.durationMode);
    setFixedDuration(p.defaultDuration);
    setCustomDurationInput(String(p.defaultDuration));
    setImagePanZoom(p.imagePanZoom);
    setVideoShortfall(p.videoShortfall);
    setAutoMuteVideoAudio(p.autoMuteVideoAudio);
    setDefaultTransition(p.defaultTransition);
    setTransitionDuration(p.transitionDuration);
    setPlacement(p.placement);

    // Apply duration to queue
    setItems((prev) => {
      let sorted = [...prev];
      if (p.orderingMode === 'natural_numeric') {
        sorted = naturalSort(sorted, (i) => i.filename);
      }
      return applyFixedDurationToQueue(sorted, p.defaultDuration, projectFps);
    });
  };

  // Handle custom timing text parse & match
  const handleParseCustomTiming = () => {
    setTimingErrors([]);
    setTimingWarnings([]);

    const parseRes = parseCustomTimingText(timingText);
    if (!parseRes.success && parseRes.errors.length > 0) {
      setTimingErrors(parseRes.errors);
      return;
    }

    const { items: updated, warnings } = applyCustomTimingToQueue(
      items,
      parseRes.records,
      missingPolicy,
      fixedDuration,
      projectFps
    );

    setItems(updated);
    setTimingWarnings([...parseRes.warnings, ...warnings]);
  };

  // Handle Voiceover sync
  const handleApplyVoiceoverSync = () => {
    const voAsset = availableAssets.find((a) => a.id === selectedVoAssetId);

    // If transcript sentences are provided, align to sentences
    if (voTranscriptText.trim()) {
      // Split transcript by punctuation (. ! ? \n)
      const sentences = voTranscriptText
        .split(/(?<=[.!?\n])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const segments: VoiceoverSegmentInput[] = sentences.map((s, idx) => {
        // Estimate 3 words per second (0.33s per word), minimum 1.5s
        const wordCount = s.split(/\s+/).length;
        const estimatedDuration = Math.max(1.8, Number((wordCount * 0.38).toFixed(2)));
        return {
          index: idx + 1,
          start: 0,
          end: estimatedDuration,
          duration: estimatedDuration,
          text: s
        };
      });

      const { items: updated, warnings } = applyVoiceoverSyncToQueue(
        items,
        segments,
        projectFps,
        fixedDuration
      );

      setItems(updated);
      setTimingWarnings(warnings);
      setTimingErrors([]);
      return;
    }

    // If no transcript text is entered, but a voiceover audio asset is selected,
    // evenly distribute the queue items across the entire voiceover duration
    if (voAsset && voAsset.duration > 0 && items.length > 0) {
      const totalVoDur = voAsset.duration;
      const perItemDur = snapToFrame(totalVoDur / items.length, projectFps);
      const updated = items.map((it, idx) => {
        const itemStart = snapToFrame(idx * perItemDur, projectFps);
        return {
          ...it,
          assignedDuration: perItemDur,
          timelineStart: itemStart,
          timelineEnd: itemStart + perItemDur,
          status: 'valid' as const
        };
      });
      setItems(recalculateQueueTimings(updated, projectFps));
      setTimingWarnings([`Evenly aligned ${items.length} media clips across full voiceover duration (${totalVoDur.toFixed(1)}s).`]);
      setTimingErrors([]);
      return;
    }

    setTimingErrors(['Please select a voiceover audio track or enter transcript sentences to sync.']);
  };

  // Reordering functions
  const handleSortNatural = (ascending: boolean = true) => {
    setItems((prev) => {
      const sorted = naturalSort(prev, (i) => i.filename);
      if (!ascending) sorted.reverse();
      return recalculateQueueTimings(sorted, projectFps);
    });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    setItems((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return recalculateQueueTimings(next, projectFps);
    });
  };

  const handleUpdateItemDuration = (index: number, newDur: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        assignedDuration: snapToFrame(Math.max(0.1, newDur), projectFps)
      };
      return recalculateQueueTimings(next, projectFps);
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return recalculateQueueTimings(next, projectFps);
    });
  };

  // Bulk File Upload
  const handleBulkUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedAssets = await onUploadAssets(fileArray);
      // Append to queue
      const newItems = buildBulkMediaQueue(uploadedAssets, {
        ordering: 'natural_numeric',
        defaultDuration: fixedDuration,
        fps: projectFps
      });

      setItems((prev) => {
        const merged = [...prev, ...newItems];
        return recalculateQueueTimings(naturalSort(merged, (i) => i.filename), projectFps);
      });
    } catch (err) {
      console.error('Bulk upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Timing list file upload (TXT, CSV, SRT, VTT)
  const handleTimingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTimingText(content);
      }
    };
    reader.readAsText(file);
    if (timingFileInputRef.current) timingFileInputRef.current.value = '';
  };

  // Summary Metrics
  const totalClips = items.length;
  const imageCount = items.filter((i) => i.mediaType === 'image').length;
  const videoCount = items.filter((i) => i.mediaType === 'video').length;
  const totalDuration = items.reduce((acc, it) => acc + it.assignedDuration, 0);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}s`;
  };

  // Apply to timeline handler
  const handleApply = () => {
    if (items.length === 0) return;

    const voAsset = availableAssets.find((a) => a.id === selectedVoAssetId);

    const proposal: BulkArrangementProposal = {
      items,
      totalDuration,
      totalClipsCount: totalClips,
      imagesCount: imageCount,
      videosCount: videoCount,
      placement,
      targetTrackId,
      voiceoverAsset: voAsset,
      hasErrors: items.some((i) => i.status === 'error'),
      warnings: timingWarnings,
      fps: projectFps
    };

    onApplyProposal({
      ...proposal,
      imagePanZoom,
      videoShortfall,
      autoMuteVideoAudio,
      defaultTransition,
      transitionDuration
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-7xl h-[92vh] max-h-[850px] overflow-hidden rounded-xl border border-[#262A34] bg-[#181B20] flex flex-col text-[#E4E7EC] shadow-2xl">
        {/* HEADER BAR (CapCut Desktop Dark Aesthetic) */}
        <div className="h-14 shrink-0 border-b border-[#262A34] bg-[#14171C] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#181B20] border border-[#262A34] text-[#13E2CA] flex items-center justify-center font-bold shadow-sm">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-sans font-bold text-white flex items-center gap-2">
                <span>Smart Bulk Timeline Arrange</span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#14171C] text-[#13E2CA] border border-[#13E2CA]/30 uppercase">
                  50–200 Assets
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Arrangement Preset Picker */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] font-bold uppercase">Preset:</span>
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-[#121418] border border-[#262A34] text-white rounded-lg px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-[#13E2CA] shadow-xs"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#181B20] text-white">
                    {p.name} ({p.defaultDuration}s)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#262A34] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN WORKSPACE BODY */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* ========================================================= */}
          {/* COLUMN 1: MEDIA QUEUE (42% width) */}
          {/* ========================================================= */}
          <div
            className={`w-[42%] shrink-0 border-r border-[#262A34] flex flex-col min-h-0 bg-[#121418] transition-colors ${
              dragOverQueue ? 'ring-2 ring-[#13E2CA] ring-inset bg-[#13E2CA]/10' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverQueue(true);
            }}
            onDragLeave={() => setDragOverQueue(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverQueue(false);
              if (e.dataTransfer.files) {
                handleBulkUploadFiles(e.dataTransfer.files);
              }
            }}
          >
            {/* Queue Toolbar */}
            <div className="p-3 border-b border-[#262A34] bg-[#14171C] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Media Queue ({items.length})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {imageCount} imgs · {videoCount} vids
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Natural Numeric Sort */}
                <button
                  type="button"
                  onClick={() => handleSortNatural(true)}
                  title="Natural Numeric Sort (1, 2, 10 or scene_1, scene_2, scene_10)"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181B20] border border-[#262A34] hover:border-[#13E2CA] text-slate-300 text-xs font-mono font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <ArrowUpDown className="w-3 h-3 text-[#13E2CA]" />
                  <span>Sort 1-9</span>
                </button>

                {/* Import More Files */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handleBulkUploadFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-[#13E2CA] hover:bg-[#0fd0b9] text-black text-xs font-mono font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isUploading ? 'Importing...' : 'Add Files'}</span>
                </button>

                {/* Clear queue */}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    title="Clear queue"
                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-[#262A34] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Queue List Items */}
            <div className="flex-1 overflow-y-auto p-2.5 vf-scrollbar flex flex-col gap-1.5">
              {items.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-full border-2 border-dashed border-[#262A34] rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-[#13E2CA]/60 bg-[#14171C]/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#181B20] border border-[#262A34] text-[#13E2CA] flex items-center justify-center mb-3 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-sans font-bold text-white">Drag & Drop 50–200 Images or Videos here</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Supports JPG, PNG, WebP, MP4, MOV, WebM with automatic numbered sorting
                  </p>
                  <span className="mt-4 px-4 py-2 rounded-lg bg-[#13E2CA] hover:bg-[#0fd0b9] text-black font-mono text-xs font-bold shadow-sm transition">
                    Select Media Files
                  </span>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all shadow-xs ${
                      item.status === 'error'
                        ? 'bg-rose-950/20 border-rose-500/50'
                        : item.status === 'warning'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-[#181B20] border-[#262A34] hover:border-[#13E2CA]/50'
                    }`}
                  >
                    {/* Left: Sequence # + Thumbnail + Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Sequence Pill */}
                      <span className="w-7 text-center font-mono text-[10px] font-bold text-[#13E2CA] bg-[#14171C] border border-[#13E2CA]/30 py-0.5 rounded-full shrink-0">
                        #{item.sequenceNumber}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-12 h-8 rounded bg-black/80 shrink-0 overflow-hidden flex items-center justify-center border border-white/10 relative shadow-xs">
                        {item.asset.thumbnailUrl ? (
                          <img
                            src={item.asset.thumbnailUrl}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : item.mediaType === 'video' ? (
                          <Film className="w-4 h-4 text-[#13E2CA]" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-sky-400" />
                        )}
                        <span className="absolute bottom-0 right-0 px-1 text-[7px] font-mono font-bold bg-black/80 text-white rounded-tl">
                          {item.mediaType === 'video' ? 'VID' : 'IMG'}
                        </span>
                      </div>

                      {/* Filename & Info */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-white" title={item.filename}>
                          {item.filename}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                          <span>
                            {item.startTime.toFixed(1)}s → {item.endTime.toFixed(1)}s
                          </span>
                          {item.mediaType === 'video' && item.sourceDuration > 0 && (
                            <span className="text-amber-400 font-bold">
                              (src: {item.sourceDuration.toFixed(1)}s)
                            </span>
                          )}
                          {item.transcriptText && (
                            <span className="truncate max-w-[120px] text-[#13E2CA] font-bold">
                              "{item.transcriptText}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Assigned Duration Input + Up/Down + Remove */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <div className="flex items-center gap-1 bg-[#121418] px-2 py-0.5 rounded border border-[#262A34]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={item.assignedDuration}
                          onChange={(e) =>
                            handleUpdateItemDuration(idx, parseFloat(e.target.value) || 1.0)
                          }
                          className="w-12 bg-transparent text-right font-mono text-xs font-bold text-white outline-none"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">s</span>
                      </div>

                      {/* Move up / down */}
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#262A34] disabled:opacity-20 cursor-pointer transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, 'down')}
                        disabled={idx === items.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#262A34] disabled:opacity-20 cursor-pointer transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-[#262A34] cursor-pointer transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: CENTER SEQUENCE VISUALIZER & STATS (30% width) */}
          {/* ========================================================= */}
          <div className="w-[30%] shrink-0 border-r border-[#262A34] flex flex-col min-h-0 bg-[#14171C]">
            <div className="p-3 border-b border-[#262A34] bg-[#121418] flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Arrangement Summary
              </span>
              <span className="text-xs font-mono font-bold text-[#13E2CA]">
                {formatTime(totalDuration)}
              </span>
            </div>

            <div className="p-3.5 flex flex-col gap-3.5 flex-1 overflow-y-auto vf-scrollbar">
              {/* Metrics Card */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-[#181B20] border border-[#262A34] shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                    Total Clips
                  </span>
                  <div className="text-xl font-mono font-bold text-white mt-0.5">{totalClips}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {imageCount} Still · {videoCount} Motion
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#181B20] border border-[#262A34] shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                    Total Runtime
                  </span>
                  <div className="text-xl font-mono font-bold text-[#13E2CA] mt-0.5">
                    {formatTime(totalDuration)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    ~{Math.round(totalDuration * projectFps)} frames @ {projectFps}fps
                  </div>
                </div>
              </div>

              {/* Visual Strip Preview */}
              <div className="rounded-lg bg-[#181B20] border border-[#262A34] p-3 flex flex-col gap-2 shadow-xs">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                  Timeline Sequence Preview
                </span>
                <div className="h-20 w-full rounded bg-[#121418] p-1.5 overflow-x-auto vf-scrollbar flex items-center gap-1">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        width: `${Math.max(28, Math.min(80, it.assignedDuration * 12))}px`
                      }}
                      className="h-full rounded bg-[#0D4B4A] border border-[#13E2CA]/40 shrink-0 overflow-hidden flex flex-col justify-between p-1.5 relative shadow-xs"
                    >
                      <span className="text-[8px] font-mono font-bold text-[#13E2CA]">#{it.sequenceNumber}</span>
                      <span className="text-[8px] font-mono font-bold text-slate-200 text-right">
                        {it.assignedDuration.toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings / Error Callouts */}
              {timingErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs shadow-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Parsing Errors</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-mono">
                    {timingErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {timingWarnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs shadow-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Arrangement Notices</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-mono">
                    {timingWarnings.slice(0, 4).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {timingWarnings.length > 4 && (
                      <li>+ {timingWarnings.length - 4} more notices</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 3: TIMING MODES & PLACEMENT CONTROLS (28% width) */}
          {/* ========================================================= */}
          <div className="w-[28%] shrink-0 flex flex-col min-h-0 bg-[#181B20]">
            {/* Timing Mode Tabs */}
            <div className="h-12 shrink-0 border-b border-[#262A34] bg-[#14171C] px-2.5 flex items-center gap-1.5">
              {[
                { id: 'fixed', label: 'Fixed Dur', icon: Clock },
                { id: 'numbered_list', label: 'Timing List', icon: FileText },
                { id: 'voiceover_sync', label: 'Voiceover', icon: Mic }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      const nextMode = tab.id as BulkDurationMode;
                      setMode(nextMode);
                      if (nextMode === 'voiceover_sync') {
                        setAutoMuteVideoAudio(true);
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#13E2CA] text-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode Specific Controls Body */}
            <div className="flex-1 p-3.5 overflow-y-auto vf-scrollbar flex flex-col gap-3.5">
              {/* TAB 1: FIXED DURATION */}
              {mode === 'fixed' && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Preset Durations</span>
                  {/* Preset Buttons 2s - 10s */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {FIXED_PRESETS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => handleApplyFixedDuration(dur)}
                        className={`py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer shadow-xs ${
                          fixedDuration === dur
                            ? 'bg-[#13E2CA] text-black font-bold'
                            : 'bg-[#14171C] text-slate-300 border border-[#262A34] hover:border-[#13E2CA]/50'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>

                  {/* Custom Decimal Field (e.g. 2.5s, 3.5s, 4.75s, 6.25s) */}
                  <div className="mt-1 flex flex-col gap-1.5">
                    <span className="text-[11px] font-mono text-slate-400">Custom Duration (decimals supported):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        min="0.1"
                        max="60"
                        value={customDurationInput}
                        onChange={(e) => {
                          setCustomDurationInput(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (val > 0) handleApplyFixedDuration(val);
                        }}
                        className="flex-1 bg-[#121418] border border-[#262A34] focus:border-[#13E2CA] rounded px-3 py-1.5 text-xs text-white font-mono outline-none shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(customDurationInput);
                          if (val > 0) handleApplyFixedDuration(val);
                        }}
                        className="px-3 py-1.5 rounded bg-[#13E2CA] hover:bg-[#0fd0b9] text-black text-xs font-mono font-bold cursor-pointer shadow-xs transition"
                      >
                        Apply All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM NUMBERED TIMING LIST */}
              {mode === 'numbered_list' && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Timing List</span>
                    <input
                      ref={timingFileInputRef}
                      type="file"
                      accept=".txt,.csv,.srt,.vtt"
                      className="hidden"
                      onChange={handleTimingFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => timingFileInputRef.current?.click()}
                      className="text-xs font-mono font-bold text-[#13E2CA] hover:underline cursor-pointer"
                    >
                      Upload File
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={timingText}
                    onChange={(e) => setTimingText(e.target.value)}
                    placeholder="1. 3.5 sec&#10;2. 4.0 sec&#10;03_scene.jpg, 2.5&#10;04_scene.mp4 : 5.0s"
                    className="w-full bg-[#121418] border border-[#262A34] focus:border-[#13E2CA] rounded p-2.5 text-xs font-mono text-white outline-none resize-none vf-scrollbar shadow-xs"
                  />

                  {/* Missing duration policy */}
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[11px] font-mono text-slate-400">Missing Duration Policy:</span>
                    <select
                      value={missingPolicy}
                      onChange={(e) => setMissingPolicy(e.target.value as BulkMissingDurationPolicy)}
                      className="bg-[#121418] border border-[#262A34] text-xs font-mono rounded p-2 text-white outline-none shadow-xs"
                    >
                      <option value="use_default" className="bg-[#181B20]">Default to {fixedDuration}s</option>
                      <option value="keep_existing" className="bg-[#181B20]">Keep current duration</option>
                      <option value="require_manual" className="bg-[#181B20]">Flag for manual fix</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleParseCustomTiming}
                    className="w-full py-2 rounded bg-[#13E2CA] hover:bg-[#0fd0b9] text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-sm transition active:scale-95"
                  >
                    Parse & Apply Timings
                  </button>
                </div>
              )}

              {/* TAB 3: VOICEOVER SYNCHRONIZATION */}
              {mode === 'voiceover_sync' && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Voiceover Alignment</span>
                  {/* Select Voiceover Audio Asset */}
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[11px] font-mono text-slate-400">Voiceover Audio Track:</span>
                    <select
                      value={selectedVoAssetId}
                      onChange={(e) => setSelectedVoAssetId(e.target.value)}
                      className="bg-[#121418] border border-[#262A34] text-xs font-mono rounded p-2 text-white outline-none shadow-xs"
                    >
                      <option value="" className="bg-[#181B20]">-- No Voiceover Audio --</option>
                      {availableAssets
                        .filter((a) => a.type === 'audio')
                        .map((a) => (
                          <option key={a.id} value={a.id} className="bg-[#181B20]">
                            {a.name} ({a.duration.toFixed(1)}s)
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Transcript Sentences */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-mono text-slate-400">Transcript Sentences:</span>
                    <textarea
                      rows={5}
                      value={voTranscriptText}
                      onChange={(e) => setVoTranscriptText(e.target.value)}
                      placeholder="Enter narration script or transcript. Media clips will be sized to match spoken sentences."
                      className="w-full bg-[#121418] border border-[#262A34] focus:border-[#13E2CA] rounded p-2.5 text-xs font-mono text-white outline-none resize-none vf-scrollbar shadow-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyVoiceoverSync}
                    className="w-full py-2 rounded bg-[#13E2CA] hover:bg-[#0fd0b9] text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-sm transition active:scale-95"
                  >
                    Sync Sequence to Spoken Audio
                  </button>
                </div>
              )}

              {/* DIVIDER */}
              <div className="w-full h-px bg-[#262A34]" />

              {/* PLACEMENT & ENGINE OPTIONS */}
              <div className="flex flex-col gap-2.5 text-xs">
                <span className="font-mono font-bold text-white uppercase tracking-wider">Timeline Placement</span>

                {/* Placement mode */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono text-slate-400">Insertion Position:</span>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as BulkInsertionPlacement)}
                    className="bg-[#121418] border border-[#262A34] text-xs font-mono rounded p-2 text-white outline-none shadow-xs"
                  >
                    <option value="append" className="bg-[#181B20]">Append to End of Timeline</option>
                    <option value="playhead" className="bg-[#181B20]">Insert at Playhead ({playhead.toFixed(1)}s)</option>
                    <option value="timeline_start" className="bg-[#181B20]">Insert at Beginning (0:00)</option>
                    <option value="new_track" className="bg-[#181B20]">Create New Video Track</option>
                    <option value="replace_selection" className="bg-[#181B20]">Replace Selected Clips</option>
                  </select>
                </div>

                {/* Target Track */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono text-slate-400">Target Track:</span>
                  <select
                    value={targetTrackId}
                    onChange={(e) => setTargetTrackId(e.target.value)}
                    className="bg-[#121418] border border-[#262A34] text-xs font-mono rounded p-2 text-white outline-none shadow-xs"
                  >
                    {targetTracks.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#181B20]">
                        {t.name} ({t.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ken Burns Pan & Zoom */}
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={imagePanZoom}
                    onChange={(e) => setImagePanZoom(e.target.checked)}
                    className="rounded bg-[#121418] border-[#262A34] text-[#13E2CA] focus:ring-0"
                  />
                  <span className="text-slate-300 font-medium">Ken Burns Pan & Zoom for Still Images</span>
                </label>

                {/* Video Shortfall Behavior */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] font-mono text-slate-400">Video Shortfall Behavior:</span>
                  <select
                    value={videoShortfall}
                    onChange={(e) =>
                      setVideoShortfall(e.target.value as BulkVideoShortfallBehavior)
                    }
                    className="bg-[#121418] border border-[#262A34] text-xs font-mono rounded p-2 text-white outline-none shadow-xs"
                  >
                    <option value="hold_frame" className="bg-[#181B20]">Hold Last Frame (Freeze)</option>
                    <option value="slow_motion" className="bg-[#181B20]">Slow Motion (Match Duration)</option>
                    <option value="loop" className="bg-[#181B20]">Loop Video to Fill</option>
                    <option value="warn" className="bg-[#181B20]">Warn Only</option>
                  </select>
                </div>

                {/* Auto Mute Video Audio */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMuteVideoAudio}
                    onChange={(e) => setAutoMuteVideoAudio(e.target.checked)}
                    className="rounded bg-[#121418] border-[#262A34] text-[#13E2CA] focus:ring-0"
                  />
                  <span className="text-slate-300 font-medium">Auto-mute Video Audio (for VO/BGM)</span>
                </label>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="p-3.5 border-t border-[#262A34] bg-[#14171C] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded border border-[#262A34] bg-[#181B20] hover:bg-[#262A34] text-slate-300 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition shadow-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={items.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#13E2CA] hover:bg-[#0fd0b9] text-black text-xs font-mono font-bold uppercase tracking-wider shadow-md disabled:opacity-30 cursor-pointer transition active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Place {items.length} Clips on Timeline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

