import React from 'react';
import {
  Sparkles,
  Undo2,
  Redo2,
  Check,
  Film,
  Captions,
  Loader2,
  Download,
  FileText,
  RotateCcw
} from 'lucide-react';
import { CaptionStudioSettings, CaptionRenderResult } from './types';
import { CAPTION_PRESETS } from '@shared/captionPresets';

interface CaptionHeaderProps {
  settings: CaptionStudioSettings;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lastSavedText: string;
  isBusy: boolean;
  busyStage: string;
  hasVideo: boolean;
  hasSegments: boolean;
  transcribed: boolean;
  onOpenAiModal: () => void;
  onTriggerAction: () => void;
  result: CaptionRenderResult | null;
  onReset: () => void;
}

export const CaptionHeader: React.FC<CaptionHeaderProps> = ({
  settings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lastSavedText,
  isBusy,
  busyStage,
  hasVideo,
  hasSegments,
  transcribed,
  onOpenAiModal,
  onTriggerAction,
  result,
  onReset
}) => {
  const currentPresetDef =
    CAPTION_PRESETS.find((p) => p.id === settings.preset) || CAPTION_PRESETS[0];

  return (
    <header className="glass-panel rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm p-4 sm:p-5 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Branding matching VoiceForge Studio theme */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Captions className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Caption Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Studio 2.0 Pro
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-11">
            86 PRESET LOOKS • MOTION ENGINE • CAPCUT ON-SCREEN RESIZE • MULTILINGUAL ASR
          </p>
        </div>

        {/* Right Action Cluster */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Preset Pill */}
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <div className="text-left">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block leading-none">
                Active Look
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {currentPresetDef.name}
              </span>
            </div>
            <span className="ml-1 rounded bg-slate-200 dark:bg-studio-800 px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
              {settings.animationStyle.replace('_', ' ')}
            </span>
          </div>

          {/* AI Auto-Style Pill */}
          {hasSegments && (
            <button
              type="button"
              onClick={onOpenAiModal}
              title="AI Content Analysis & Style Match"
              className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>AI Auto-Style</span>
            </button>
          )}

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-1">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Autosave status indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>{lastSavedText}</span>
          </div>

          {/* Primary Action Button (Transcribe / Render) */}
          <button
            type="button"
            disabled={isBusy || !hasVideo}
            onClick={onTriggerAction}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer ${
              !hasSegments
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{busyStage || 'Processing...'}</span>
              </>
            ) : !hasSegments ? (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>Transcribe Video</span>
              </>
            ) : (
              <>
                <Film className="h-3.5 w-3.5" />
                <span>Export Video with Captions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stepper Pipeline strip */}
      <div className="mt-4 pt-3 border-t border-studio-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono font-bold uppercase tracking-wider">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
            hasVideo
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-400'
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[9px] font-black">
            01
          </span>
          <span className="truncate">Upload Media</span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
            transcribed
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : hasVideo
              ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-400'
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[9px] font-black">
            02
          </span>
          <span className="truncate">Audio Transcription</span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
            hasSegments
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-400'
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[9px] font-black">
            03
          </span>
          <span className="truncate">Motion Styling</span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
            result
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-400'
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[9px] font-black">
            04
          </span>
          <span className="truncate">Burned-in Video</span>
        </div>
      </div>
    </header>
  );
};
