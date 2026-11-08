import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Upload,
  Film,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Captions
} from 'lucide-react';
import {
  CAPTION_PRESETS,
  CaptionPresetDefinition,
  assToHexColor,
  CaptionPresetId,
  CaptionCategory,
  CaptionAnimation
} from '@shared/captionPresets';
import { AiCaptionStyler, CaptionAnalysisResult } from '@shared/aiCaptionStyler';
import {
  CaptionStudioSettings,
  CaptionSegment,
  CaptionWord,
  CaptionRenderResult,
  UserSavedPreset
} from './captions/types';
import { CaptionHeader } from './captions/CaptionHeader';
import { CaptionStage } from './captions/CaptionStage';
import { CaptionPresetBrowser } from './captions/CaptionPresetBrowser';
import { CaptionInspector } from './captions/CaptionInspector';
import { CaptionTimeline } from './captions/CaptionTimeline';
import { AiStyleModal } from './captions/AiStyleModal';
import { AutoCaptionsModal } from './captions/AutoCaptionsModal';

const STORAGE_SAVED_PRESETS = 'voiceforge_caption_saved_presets_v2';
const STORAGE_PROJECT_STATE = 'voiceforge_caption_studio_autosave_v2';

const defaultSettings = (): CaptionStudioSettings => {
  const p = CAPTION_PRESETS[0]; // Documentary White
  return {
    preset: p.id,
    category: p.category,
    language: '',
    maxWords: 3,
    wordHighlight: true,
    uppercase: p.uppercase,
    fontFamily: p.font,
    fontSize: p.size,
    fontWeight: 'bold',
    letterSpacing: p.letterSpacing || 'normal',
    lineHeight: 1.15,
    textOpacity: 1,
    primaryColor: assToHexColor(p.primary),
    highlightColor: assToHexColor(p.highlight),
    gradientText: false,
    gradientSecondaryColor: '#FDE047',
    outlineColor: assToHexColor(p.outlineColor),
    shadowColor: assToHexColor(p.shadowColor),
    outlineWidth: p.outline,
    shadowDistance: p.shadow,
    neonGlow: Boolean(p.glow),
    boxBackground: Boolean(p.boxBackground),
    boxColor: p.boxColor ? assToHexColor(p.boxColor) : '#12151D',
    boxOpacity: p.boxOpacity ?? 0.88,
    borderRadius: p.borderRadius || '12px',
    editorialUnderline: p.effect === 'underline',
    wordSpotlight: p.effect === 'spotlight',
    textAlign: 'center',
    captionPosition: 'bottom',
    captionX: 0.5,
    captionY: 0.83,
    captionWidth: 0.88,
    captionLocked: false,
    snapToCenter: true,
    animationStyle: p.animation,
    animationIntensity: 1,
    highlightScale: 1.16,
    emphasisWords: [],
    safeZone: true,
    aspectRatio: '9:16'
  };
};

const settingsFromPreset = (
  current: CaptionStudioSettings,
  p: CaptionPresetDefinition
): CaptionStudioSettings => {
  return {
    ...current,
    preset: p.id,
    category: p.category,
    fontFamily: p.font,
    fontSize: p.size,
    fontWeight: p.bold ? 'bold' : 'normal',
    letterSpacing: p.letterSpacing || 'normal',
    primaryColor: assToHexColor(p.primary),
    highlightColor: assToHexColor(p.highlight),
    outlineColor: assToHexColor(p.outlineColor),
    shadowColor: assToHexColor(p.shadowColor),
    outlineWidth: p.outline,
    shadowDistance: p.shadow,
    boxBackground: Boolean(p.boxBackground),
    boxColor: p.boxColor ? assToHexColor(p.boxColor) : '#12151D',
    boxOpacity: p.boxOpacity ?? 0.88,
    borderRadius: p.borderRadius || '12px',
    animationStyle: p.animation,
    uppercase: p.uppercase,
    neonGlow: Boolean(p.glow),
    editorialUnderline: p.effect === 'underline',
    wordSpotlight: p.effect === 'spotlight'
  };
};

function regroupWords(items: CaptionSegment[], maxWords: number): CaptionSegment[] {
  const words: CaptionWord[] = items
    .flatMap((seg) =>
      seg.words && seg.words.length > 0
        ? seg.words
        : seg.text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((word, idx, arr) => {
              const span = Math.max(0.01, seg.end - seg.start);
              return {
                word,
                start: seg.start + (span * idx) / Math.max(1, arr.length),
                end: seg.start + (span * (idx + 1)) / Math.max(1, arr.length)
              };
            })
    )
    .sort((a, b) => a.start - b.start);

  // maxWords >= 16 indicates "Complete Sentence / Natural Speech Flow" mode
  const isCompleteSentenceMode = maxWords >= 16;
  const limit = isCompleteSentenceMode ? 40 : Math.max(1, Math.min(25, Math.round(maxWords)));
  const groups: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  const sentenceEnd = /[.!?]["'’“”؟۔]*$/;
  const clauseEnd = /[,;:\u2014-]$/;

  for (const word of words) {
    const prevWord = current[current.length - 1];
    const isSpeechPause = prevWord && word.start - prevWord.end > (isCompleteSentenceMode ? 0.75 : 0.55);
    const isCommaSplit = !isCompleteSentenceMode && limit <= 3 && prevWord && clauseEnd.test(prevWord.word) && current.length >= 2;

    if (
      current.length &&
      (current.length >= limit || isSpeechPause || isCommaSplit)
    ) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    if (sentenceEnd.test(word.word)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);

  return groups.map((grp, idx) => {
    const nextGrp = groups[idx + 1];
    const rawEnd = grp[grp.length - 1].end;
    const seamlessEnd = nextGrp
      ? Math.min(nextGrp[0].start, rawEnd + 0.35)
      : rawEnd;
    return {
      id: `caption-group-${idx}-${grp[0].start.toFixed(2)}`,
      start: grp[0].start,
      end: Math.max(grp[0].start + 0.1, seamlessEnd),
      text: grp.map((w) => w.word.trim()).join(' '),
      words: grp
    };
  });
}

export const CaptionsStudio: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Core Media State
  const [file, setFile] = useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [transcribed, setTranscribed] = useState(false);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState('');

  // Settings & Custom Styles
  const [settings, setSettings] = useState<CaptionStudioSettings>(defaultSettings);
  const [savedPresets, setSavedPresets] = useState<UserSavedPreset[]>([]);

  // Processing & Results
  const [isBusy, setIsBusy] = useState(false);
  const [busyStage, setBusyStage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [renderResult, setRenderResult] = useState<CaptionRenderResult | null>(null);

  // AI Style Recommendation
  const [aiAnalysis, setAiAnalysis] = useState<CaptionAnalysisResult | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // CapCut Auto Captions Modal
  const [isAutoCaptionsOpen, setIsAutoCaptionsOpen] = useState(false);

  // Undo / Redo History Stack
  const [undoStack, setUndoStack] = useState<
    Array<{ segments: CaptionSegment[]; settings: CaptionStudioSettings }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ segments: CaptionSegment[]; settings: CaptionStudioSettings }>
  >([]);
  const [lastSavedText, setLastSavedText] = useState('All changes saved locally');

  // Load Saved Presets from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_PRESETS);
      if (raw) setSavedPresets(JSON.parse(raw));
    } catch {}
  }, []);

  // Sync Saved Presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_PRESETS, JSON.stringify(savedPresets));
    } catch {}
  }, [savedPresets]);

  // Video object URL management
  useEffect(() => {
    if (!file) {
      setLocalVideoUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Push state to Undo Stack
  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-30), { segments, settings }]);
    setRedoStack([]);
  }, [segments, settings]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, { segments, settings }]);
    setUndoStack((prev) => prev.slice(0, -1));
    setSegments(last.segments);
    setSettings(last.settings);
  }, [undoStack, segments, settings]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, { segments, settings }]);
    setRedoStack((prev) => prev.slice(0, -1));
    setSegments(next.segments);
    setSettings(next.settings);
  }, [redoStack, segments, settings]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement).tagName
        )
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const target = Math.max(0, playhead - 1);
        if (videoRef.current) videoRef.current.currentTime = target;
        setPlayhead(target);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const target = Math.min(duration, playhead + 1);
        if (videoRef.current) videoRef.current.currentTime = target;
        setPlayhead(target);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playhead, duration, handleUndo, handleRedo]);

  const handleSelectSegmentWithSeek = useCallback((id: string) => {
    setSelectedSegmentId(id);
    const target = segments.find((s) => s.id === id);
    if (target && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, target.start + 0.02);
      setPlayhead(Math.max(0, target.start + 0.02));
    }
  }, [segments]);

  // Video time updates
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      const t = el.currentTime;
      setPlayhead(t);
      const active = segments.find((s) => t >= s.start && t <= s.end);
      if (active && active.id !== selectedSegmentId) {
        setSelectedSegmentId(active.id);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(el.duration || 0);
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [segments, selectedSegmentId, file, localVideoUrl, renderResult]);

  // Update Settings property
  const updateSettings = useCallback(
    <K extends keyof CaptionStudioSettings>(key: K, val: CaptionStudioSettings[K]) => {
      pushUndoSnapshot();
      setSettings((prev) => {
        const next = { ...prev, [key]: val };
        // If changing maxWords (e.g. 3 Words), regroup all segments into that word count immediately!
        if (key === 'maxWords' && segments.length > 0) {
          setSegments((cur) => regroupWords(cur, Number(val)));
        }
        return next;
      });
      setLastSavedText(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    },
    [pushUndoSnapshot, segments]
  );

  // Apply Preset
  const handleSelectPreset = useCallback(
    (preset: CaptionPresetDefinition) => {
      pushUndoSnapshot();
      setSettings((prev) => settingsFromPreset(prev, preset));
    },
    [pushUndoSnapshot]
  );

  // Update Segment
  const handleUpdateSegment = useCallback(
    (index: number, patch: Partial<CaptionSegment>) => {
      pushUndoSnapshot();
      setSegments((items) =>
        items.map((seg, idx) => {
          if (idx !== index) return seg;
          const updated = { ...seg, ...patch };
          const oldWords = seg.words || [];

          // If text was modified, re-tokenize words while preserving start/end boundaries
          if (patch.text !== undefined) {
            const tokens = patch.text.trim().split(/\s+/).filter(Boolean);
            const span = Math.max(0.01, updated.end - updated.start);
            updated.words = tokens.map((word, n) => {
              const s =
                oldWords.length === tokens.length
                  ? oldWords[n].start
                  : updated.start + (span * n) / Math.max(1, tokens.length);
              const e =
                oldWords.length === tokens.length
                  ? oldWords[n].end
                  : updated.start + (span * (n + 1)) / Math.max(1, tokens.length);
              return { word, start: s, end: e };
            });
          }
          // If start or end shifted, scale word timestamps proportionally
          else if (
            (patch.start !== undefined || patch.end !== undefined) &&
            oldWords.length > 0
          ) {
            const oldSpan = Math.max(0.01, seg.end - seg.start);
            const newSpan = Math.max(0.01, updated.end - updated.start);
            updated.words = oldWords.map((w) => ({
              word: w.word,
              start: updated.start + ((w.start - seg.start) / oldSpan) * newSpan,
              end: updated.start + ((w.end - seg.start) / oldSpan) * newSpan
            }));
          }
          return updated;
        })
      );
    },
    [pushUndoSnapshot]
  );

  // Add Segment
  const handleAddSegment = useCallback(() => {
    pushUndoSnapshot();
    const start = segments.length === 0 ? 0 : Math.max(0, Math.min(playhead, duration || playhead));
    const defaultSpan = Math.max(2.5, Math.min(duration || 3.5, 3.5));
    const end = Math.min(duration || start + defaultSpan, start + defaultSpan);
    const mid = start + (end - start) / 2;
    const newId = `caption-${Date.now()}`;
    const newSeg: CaptionSegment = {
      id: newId,
      start,
      end,
      text: 'New Subtitle',
      words: [
        { word: 'New', start, end: mid },
        { word: 'Subtitle', start: mid, end }
      ]
    };
    setSegments((items) => [...items, newSeg].sort((a, b) => a.start - b.start));
    setSelectedSegmentId(newId);
  }, [playhead, duration, segments.length, pushUndoSnapshot]);

  // Delete Segment
  const handleDeleteSegment = useCallback(
    (index: number) => {
      pushUndoSnapshot();
      setSegments((items) => items.filter((_, idx) => idx !== index));
      setSelectedSegmentId('');
    },
    [pushUndoSnapshot]
  );

  // Split Segment at Playhead
  const handleSplitSegment = useCallback(() => {
    const selIdx = segments.findIndex((s) => s.id === selectedSegmentId);
    if (selIdx < 0) return;
    const seg = segments[selIdx];
    if (!seg.words || seg.words.length < 2) return;

    pushUndoSnapshot();
    const cutIdx = Math.max(
      1,
      Math.min(
        seg.words.length - 1,
        seg.words.findIndex((w) => w.start >= playhead) > 0
          ? seg.words.findIndex((w) => w.start >= playhead)
          : Math.ceil(seg.words.length / 2)
      )
    );

    const grpA = seg.words.slice(0, cutIdx);
    const grpB = seg.words.slice(cutIdx);

    const segA: CaptionSegment = {
      ...seg,
      id: `caption-${Date.now()}-a`,
      start: grpA[0].start,
      end: grpA[grpA.length - 1].end,
      text: grpA.map((w) => w.word).join(' '),
      words: grpA
    };

    const segB: CaptionSegment = {
      ...seg,
      id: `caption-${Date.now()}-b`,
      start: grpB[0].start,
      end: grpB[grpB.length - 1].end,
      text: grpB.map((w) => w.word).join(' '),
      words: grpB
    };

    setSegments((items) => [
      ...items.slice(0, selIdx),
      segA,
      segB,
      ...items.slice(selIdx + 1)
    ]);
    setSelectedSegmentId(segA.id);
  }, [segments, selectedSegmentId, playhead, pushUndoSnapshot]);

  // Merge with Next Segment
  const handleMergeSegment = useCallback(() => {
    const selIdx = segments.findIndex((s) => s.id === selectedSegmentId);
    if (selIdx < 0 || selIdx >= segments.length - 1) return;

    pushUndoSnapshot();
    const a = segments[selIdx];
    const b = segments[selIdx + 1];

    const merged: CaptionSegment = {
      ...a,
      end: b.end,
      text: `${a.text} ${b.text}`.trim(),
      words: [...(a.words || []), ...(b.words || [])]
    };

    setSegments((items) => [
      ...items.slice(0, selIdx),
      merged,
      ...items.slice(selIdx + 2)
    ]);
    setSelectedSegmentId(merged.id);
  }, [segments, selectedSegmentId, pushUndoSnapshot]);

  // Tag word as emphasis keyword
  const handleTagKeyword = useCallback(
    (word: string) => {
      pushUndoSnapshot();
      const clean = word.toUpperCase().trim();
      setSettings((prev) => {
        const exists = prev.emphasisWords.includes(clean);
        return {
          ...prev,
          emphasisWords: exists
            ? prev.emphasisWords.filter((w) => w !== clean)
            : [...prev.emphasisWords, clean]
        };
      });
    },
    [pushUndoSnapshot]
  );

  // Auto-scan transcript for keywords
  const handleAutoScanKeywords = useCallback(() => {
    if (segments.length === 0) return;
    const analysis = AiCaptionStyler.analyze(segments, duration, settings.language);
    pushUndoSnapshot();
    setSettings((prev) => ({
      ...prev,
      emphasisWords: Array.from(
        new Set([...prev.emphasisWords, ...analysis.keyPhrases])
      )
    }));
  }, [segments, duration, settings.language, pushUndoSnapshot]);

  // Save custom look preset
  const handleSavePreset = useCallback(
    (name: string) => {
      const newPreset: UserSavedPreset = {
        id: `preset-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        settings: { ...settings }
      };
      setSavedPresets((prev) => [newPreset, ...prev]);
    },
    [settings]
  );

  const handleLoadSavedPreset = useCallback(
    (saved: UserSavedPreset) => {
      pushUndoSnapshot();
      setSettings({ ...saved.settings });
    },
    [pushUndoSnapshot]
  );

  const handleDeleteSavedPreset = useCallback((id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Transcribe Video API
  const handleTranscribe = async (customSettings?: CaptionStudioSettings) => {
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    const activeSettings = customSettings || settings;
    setIsBusy(true);
    setBusyStage('Transcribing audio via Speech Recognition...');
    setErrorMessage('');
    setRenderResult(null);

    try {
      const form = new FormData();
      form.append('video', file);
      form.append('settings', JSON.stringify(activeSettings));

      const response = await fetch('/api/captions/transcribe-video', {
        method: 'POST',
        body: form
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to transcribe video speech.');
      }

      const receivedSegments: CaptionSegment[] = data.segments || [];
      setSegments(receivedSegments);
      setTranscribed(true);
      setDuration(data.total_duration || 0);

      // Automatically run AI style recommendation on transcript!
      const aiRec = AiCaptionStyler.analyze(
        receivedSegments,
        data.total_duration,
        data.detected_language
      );
      setAiAnalysis(aiRec);
    } catch (err: any) {
      setErrorMessage(err.message || 'Video transcription failed.');
    } finally {
      setIsBusy(false);
      setBusyStage('');
    }
  };

  // CapCut Auto Captions Handler
  const handleGenerateAutoCaptions = async (options: {
    language: string;
    maxWords: number;
    presetId: string;
    wordHighlight: boolean;
    uppercase: boolean;
  }) => {
    const matchedPreset =
      CAPTION_PRESETS.find((p) => p.id === options.presetId) || CAPTION_PRESETS[0];

    pushUndoSnapshot();
    const updatedSettings: CaptionStudioSettings = {
      ...settingsFromPreset(settings, matchedPreset),
      language: options.language,
      maxWords: options.maxWords,
      wordHighlight: options.wordHighlight,
      uppercase: options.uppercase
    };
    setSettings(updatedSettings);

    // If already transcribed and language is the same, regroup existing words instantly!
    if (transcribed && segments.length > 0 && options.language === settings.language) {
      setSegments((cur) => regroupWords(cur, options.maxWords));
      setIsAutoCaptionsOpen(false);
      setLastSavedText(`Regrouped into ${options.maxWords}-word captions`);
      return;
    }

    // Otherwise, transcribe speech from the video file
    try {
      await handleTranscribe(updatedSettings);
      setIsAutoCaptionsOpen(false);
    } catch {
      // error handled inside handleTranscribe
    }
  };

  // Render Video API
  const handleRenderVideo = async () => {
    if (!file || segments.length === 0) return;
    setIsBusy(true);
    setBusyStage('Rendering burned-in subtitles via FFmpeg engine...');
    setErrorMessage('');

    try {
      const form = new FormData();
      form.append('video', file);
      form.append('settings', JSON.stringify(settings));
      form.append('segments', JSON.stringify(segments));

      const response = await fetch('/api/captions/render-video', {
        method: 'POST',
        body: form
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to render captioned video.');
      }

      setRenderResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Video render failed.');
    } finally {
      setIsBusy(false);
      setBusyStage('');
    }
  };

  // Apply AI Recommendation
  const handleApplyAiRecommendation = (
    presetId: CaptionPresetId,
    wordsPerCaption: number,
    keywords: string[]
  ) => {
    const matchedPreset =
      CAPTION_PRESETS.find((p) => p.id === presetId) || CAPTION_PRESETS[0];

    pushUndoSnapshot();
    setSettings((prev) => {
      const updated = settingsFromPreset(prev, matchedPreset);
      return {
        ...updated,
        maxWords: wordsPerCaption,
        emphasisWords: Array.from(new Set([...prev.emphasisWords, ...keywords]))
      };
    });

    if (transcribed) {
      setSegments((cur) => regroupWords(cur, wordsPerCaption));
    }
  };

  // Subtitle Download Helper
  const downloadFile = (content: string, filename: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const videoBaseName = file?.name.replace(/\.[^.]+$/, '') || 'voiceforge_captions';

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1720px] space-y-4 font-sans select-none pb-12">
      {/* Top Header Bar */}
      <CaptionHeader
        settings={settings}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastSavedText={lastSavedText}
        isBusy={isBusy}
        busyStage={busyStage}
        hasVideo={Boolean(file)}
        hasSegments={segments.length > 0}
        transcribed={transcribed}
        onOpenAutoCaptions={() => {
          if (!file) {
            fileInputRef.current?.click();
          } else {
            setIsAutoCaptionsOpen(true);
          }
        }}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onTriggerAction={transcribed ? handleRenderVideo : handleTranscribe}
        result={renderResult}
        onReset={() => {
          setFile(null);
          setSegments([]);
          setTranscribed(false);
          setRenderResult(null);
        }}
      />

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="rounded p-1 hover:bg-rose-200 dark:hover:bg-rose-900/40"
          >
            ×
          </button>
        </div>
      )}

      {/* Render Result Banner */}
      {renderResult && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-slate-900 dark:text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono">
                Render Successful
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {renderResult.total_segments} Subtitle Windows Burned ·{' '}
                {renderResult.detected_language.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={renderResult.videoUrl}
              download={renderResult.filename}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Download MP4</span>
            </a>

            <button
              type="button"
              onClick={() =>
                downloadFile(renderResult.srt, `${videoBaseName}.srt`)
              }
              className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-white dark:bg-studio-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 shadow-sm transition cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>SRT</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadFile(renderResult.ass, `${videoBaseName}.ass`)
              }
              className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-white dark:bg-studio-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 shadow-sm transition cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Styled ASS</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadFile(
                  renderResult.vtt,
                  `${videoBaseName}.vtt`,
                  'text/vtt;charset=utf-8'
                )
              }
              className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-white dark:bg-studio-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 shadow-sm transition cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>VTT</span>
            </button>

            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(renderResult.srt)}
              className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-white dark:bg-studio-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 shadow-sm transition cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy SRT</span>
            </button>
          </div>
        </div>
      )}

      {/* Main 3-Panel Studio Layout */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[330px_minmax(0,1fr)_340px] xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        {/* ==========================================
            LEFT PANEL: PRESETS & AI RECOMMENDER
            ========================================== */}
        <div className="min-w-0 h-[660px]">
          <CaptionPresetBrowser
            currentPresetId={settings.preset}
            onSelectPreset={handleSelectPreset}
            aiRecommendedId={aiAnalysis?.recommendedPreset}
            onOpenAiRecommender={() => {
              if (segments.length > 0) {
                const rec = AiCaptionStyler.analyze(
                  segments,
                  duration,
                  settings.language
                );
                setAiAnalysis(rec);
                setIsAiModalOpen(true);
              }
            }}
          />
        </div>

        {/* ==========================================
            CENTER PANEL: VIDEO STAGE & CANVAS
            ========================================== */}
        <div className="min-w-0 flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.m4v,.webm,.mkv,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                setFile(selectedFile);
                setSegments([]);
                setTranscribed(false);
                setRenderResult(null);
                setErrorMessage('');
                setIsAutoCaptionsOpen(true);
              }
            }}
          />

          {!file ? (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) {
                  setFile(droppedFile);
                  setSegments([]);
                  setTranscribed(false);
                  setRenderResult(null);
                  setErrorMessage('');
                  setIsAutoCaptionsOpen(true);
                }
              }}
              className="glass-panel group flex min-h-[540px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-studio-border bg-white dark:bg-studio-900 p-8 text-center transition-all hover:border-indigo-500/60 hover:bg-slate-50 dark:hover:bg-studio-800/60 shadow-sm"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black transition-transform group-hover:scale-110 shadow-sm">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-base font-serif font-extrabold text-slate-900 dark:text-white">
                Upload Video to Caption & Style
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Drag and drop your video file here, or click to browse. Supports MP4, MOV, WEBM, MKV up to 500 MB.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full border border-studio-border bg-slate-100 dark:bg-studio-800 px-3 py-1 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  9:16 Shorts / Reels
                </span>
                <span className="rounded-full border border-studio-border bg-slate-100 dark:bg-studio-800 px-3 py-1 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  16:9 Cinema
                </span>
                <span className="rounded-full border border-studio-border bg-slate-100 dark:bg-studio-800 px-3 py-1 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  1:1 Square
                </span>
              </div>
            </div>
          ) : (
            /* Active Video Stage */
            <CaptionStage
              videoRef={videoRef}
              videoSrc={renderResult?.videoUrl || localVideoUrl}
              settings={settings}
              onUpdateSettings={updateSettings}
              segments={segments}
              playhead={playhead}
              duration={duration}
              onSeek={(t) => {
                if (videoRef.current) videoRef.current.currentTime = t;
                setPlayhead(t);
              }}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={handleSelectSegmentWithSeek}
              isResultVideo={Boolean(renderResult)}
              onRemoveVideo={() => {
                setFile(null);
                setSegments([]);
                setTranscribed(false);
                setRenderResult(null);
              }}
            />
          )}
        </div>

        {/* ==========================================
            RIGHT PANEL: PRO INSPECTOR
            ========================================== */}
        <div className="min-w-0 h-[660px]">
          <CaptionInspector
            settings={settings}
            onUpdate={updateSettings}
            savedPresets={savedPresets}
            onSavePreset={handleSavePreset}
            onLoadSavedPreset={handleLoadSavedPreset}
            onDeleteSavedPreset={handleDeleteSavedPreset}
            onAutoScanKeywords={handleAutoScanKeywords}
          />
        </div>
      </div>

      {/* ==========================================
          BOTTOM PANEL: AUDIO WAVEFORM & TIMELINE TRACK
          ========================================== */}
      {(Boolean(file) || segments.length > 0) && (
        <CaptionTimeline
          segments={segments}
          duration={duration}
          playhead={playhead}
          onSeek={(t) => {
            if (videoRef.current) videoRef.current.currentTime = t;
            setPlayhead(t);
          }}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={handleSelectSegmentWithSeek}
          onUpdateSegment={handleUpdateSegment}
          onAddSegment={handleAddSegment}
          onDeleteSegment={handleDeleteSegment}
          onSplitSegment={handleSplitSegment}
          onMergeSegment={handleMergeSegment}
          onTagKeyword={handleTagKeyword}
          emphasisWords={settings.emphasisWords}
          maxWords={settings.maxWords}
          onRegroupAll={(count) => {
            pushUndoSnapshot();
            setSettings((prev) => ({ ...prev, maxWords: count }));
            setSegments((cur) => regroupWords(cur, count));
            setLastSavedText(`Regrouped into ${count >= 16 ? 'full sentence' : `${count}-word`} captions`);
          }}
        />
      )}

      {/* AI Style Recommender Modal */}
      <AiStyleModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        analysis={aiAnalysis}
        onApplyRecommendation={handleApplyAiRecommendation}
      />

      {/* CapCut-style Auto Captions Modal */}
      <AutoCaptionsModal
        isOpen={isAutoCaptionsOpen}
        onClose={() => setIsAutoCaptionsOpen(false)}
        onGenerate={handleGenerateAutoCaptions}
        isGenerating={isBusy}
        generatingStage={busyStage}
        initialLanguage={settings.language}
        initialMaxWords={settings.maxWords}
        initialPresetId={settings.preset}
      />
    </div>
  );
};
