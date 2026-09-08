import React from 'react';
import { ScriptAnalysis } from '../../../shared/src/types';
import { Clock, FileText, Hash, AlertTriangle, Layers, Zap } from 'lucide-react';

interface ScriptAnalyzerProps {
  analysis: ScriptAnalysis;
  wpm: number;
  onWpmChange: (wpm: number) => void;
}

export const ScriptAnalyzer: React.FC<ScriptAnalyzerProps> = ({ analysis, wpm, onWpmChange }) => {
  return (
    <div className="glass-panel border border-studio-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-black dark:text-white" />
          <span>Script Analysis Breakdown</span>
        </h3>

        {/* WPM Selector */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
          <span>Speed WPM:</span>
          <select
            value={wpm}
            onChange={(e) => onWpmChange(parseInt(e.target.value, 10))}
            className="bg-white dark:bg-studio-850 border border-studio-border rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-black"
          >
            <option value={120}>120 WPM (Slow / Dramatic)</option>
            <option value={130}>130 WPM (True Crime / Suspense)</option>
            <option value={140}>140 WPM (Documentary)</option>
            <option value={145}>145 WPM (YouTube Standard)</option>
            <option value={150}>150 WPM (Tech / News)</option>
            <option value={160}>160 WPM (Fast / Motivational)</option>
          </select>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-studio-850 p-3 rounded-xl border border-studio-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Word Count</p>
            <p className="text-base font-serif font-extrabold text-slate-900 dark:text-white">{analysis.wordCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-studio-850 p-3 rounded-xl border border-studio-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Characters</p>
            <p className="text-base font-serif font-extrabold text-slate-900 dark:text-white">{analysis.characterCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-studio-850 p-3 rounded-xl border border-studio-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Est. Voiceover</p>
            <p className="text-base font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{analysis.estimatedDurationFormatted}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-studio-850 p-3 rounded-xl border border-studio-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Structure</p>
            <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {analysis.chapterCount} Ch • {analysis.chunkCount} Clips
            </p>
          </div>
        </div>
      </div>

      {/* Warnings & Suggestions */}
      {analysis.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-studio-850 border border-amber-300 dark:border-amber-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>OPTIMIZATION SUGGESTIONS</span>
          </div>
          <ul className="space-y-1">
            {analysis.warnings.map((warn, idx) => (
              <li key={idx} className="text-xs text-slate-800 dark:text-slate-300 flex items-start gap-1.5 font-sans">
                <span className="text-amber-600 font-bold">•</span>
                <span>{warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chapters Preview */}
      {analysis.chapters.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-studio-border/60">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Detected Chapters</h4>
          <div className="flex items-center gap-2 flex-wrap">
            {analysis.chapters.map((ch, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 bg-white dark:bg-studio-850 rounded-lg border border-studio-border text-xs flex items-center gap-2"
              >
                <span className="text-black dark:text-white font-mono font-bold">Ch {idx + 1}</span>
                <span className="text-slate-800 dark:text-slate-200">{ch.title}</span>
                <span className="text-[10px] font-mono text-slate-500">({ch.clipCount} clips)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
