import React from 'react';
import {
  Sparkles,
  X,
  Gauge,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { CaptionAnalysisResult } from '@shared/aiCaptionStyler';
import { CAPTION_PRESET_PREVIEWS } from '@shared/captionPresetPreviews';
import { CaptionPresetId } from '@shared/captionPresets';

interface AiStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: CaptionAnalysisResult | null;
  onApplyRecommendation: (
    presetId: CaptionPresetId,
    wordsPerCaption: number,
    keywords: string[]
  ) => void;
}

export const AiStyleModal: React.FC<AiStyleModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onApplyRecommendation
}) => {
  if (!isOpen || !analysis) return null;

  const primaryCard = CAPTION_PRESET_PREVIEWS[analysis.recommendedPreset];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-2xl">
        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-studio-border bg-slate-50 dark:bg-studio-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-sm font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  AI CAPTION STYLER
                </span>
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                  {Math.round(analysis.confidence * 100)}% Confidence
                </span>
              </div>
              <h2 className="text-lg font-serif font-extrabold text-slate-900 dark:text-white">
                Tone & Cadence Analysis
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-4 p-6 text-xs">
          {/* Tone & Cadence Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Detected Tone</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-white truncate">
                {analysis.tone}
              </div>
            </div>

            <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Gauge className="h-3.5 w-3.5 text-amber-500" />
                <span>Speech Rhythm</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                {analysis.pacingWpm} WPM ({analysis.pacingWpm > 160 ? 'Fast Paced' : analysis.pacingWpm < 130 ? 'Measured' : 'Conversational'})
              </div>
            </div>

            <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Pacing Cadence</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                {analysis.recommendedWordsPerCaption} words / caption
              </div>
            </div>
          </div>

          {/* Rationale Callout */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-slate-700 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">AI Assessment: </span>
            {analysis.rationale}
          </div>

          {/* Primary Recommendation Card */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Top Recommended Style Look
            </span>

            <div className="relative overflow-hidden rounded-xl border-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-studio-950 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {analysis.recommendedPresetName}
                    </span>
                    <span className="rounded bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 px-2 py-0.5 text-[9px] font-bold uppercase text-indigo-800 dark:text-indigo-200">
                      Best Match
                    </span>
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400 text-[11px]">
                    {primaryCard?.desc || 'Optimized typography for this transcript'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onApplyRecommendation(
                      analysis.recommendedPreset,
                      analysis.recommendedWordsPerCaption,
                      analysis.keyPhrases
                    );
                    onClose();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-bold shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
                >
                  <span>Apply Style</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Live Preview Sample */}
              {primaryCard && (
                <div
                  className="mt-3 flex h-14 items-center justify-center rounded-lg border border-studio-border px-4"
                  dir={analysis.isRtl ? 'rtl' : 'ltr'}
                  style={{ background: primaryCard.bg }}
                >
                  <span
                    className="flex items-center gap-1.5 text-sm font-bold"
                    style={{ fontFamily: primaryCard.font }}
                  >
                    <span style={{ color: primaryCard.color }}>
                      {primaryCard.prefix}
                    </span>
                    <span
                      className="font-black"
                      style={{
                        color: primaryCard.highlight,
                        transform: 'scale(1.1)'
                      }}
                    >
                      {primaryCard.highlightWord}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Emphasis Keywords */}
          {analysis.keyPhrases.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <Tag className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span>Extracted Focal Keywords (Auto-emphasized in video)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.keyPhrases.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Secondary Recommendations */}
          {analysis.secondaryRecommendations.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Alternative Recommendations
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {analysis.secondaryRecommendations.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      onApplyRecommendation(
                        sec.id,
                        analysis.recommendedWordsPerCaption,
                        analysis.keyPhrases
                      );
                      onClose();
                    }}
                    className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 text-left transition hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{sec.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        {sec.reason}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
                      Use →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
