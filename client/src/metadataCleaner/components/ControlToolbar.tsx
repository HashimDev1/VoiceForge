import React, { useState } from 'react';
import {
  Sparkles,
  Trash2,
  Settings2,
  Flame,
} from 'lucide-react';
import { CleaningOptions } from '../types';

interface ControlToolbarProps {
  options: CleaningOptions;
  onOptionsChange: (newOptions: CleaningOptions) => void;
  onCleanAll: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
  totalCount: number;
  uncleanedCount: number;
  overallProgress: number;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  options,
  onOptionsChange,
  onCleanAll,
  onClearAll,
  isProcessing,
  totalCount,
  uncleanedCount,
  overallProgress,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleOption = (key: keyof CleaningOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              Cleaning Configuration
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totalCount} {totalCount === 1 ? 'image' : 'images'} loaded ({uncleanedCount} pending cleaning)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            {showAdvanced ? 'Hide Options' : 'Customize Stripping'}
          </button>

          <button
            onClick={onClearAll}
            disabled={isProcessing || totalCount === 0}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={onCleanAll}
            disabled={isProcessing || uncleanedCount === 0}
            className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>{isProcessing ? 'Cleaning...' : `Clean All (${uncleanedCount})`}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Processing images...</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-studio-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Nuclear Option Banner */}
      <div
        className={`rounded-xl p-3.5 border transition-all ${
          options.nuclearCanvas
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-slate-50 dark:bg-studio-850 border-studio-border'
        }`}
      >
        <div className="flex items-start space-x-3">
          <button
            onClick={() => toggleOption('nuclearCanvas')}
            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
              options.nuclearCanvas
                ? 'bg-amber-500 border-amber-600 text-white font-bold text-xs'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-studio-900 text-transparent'
            }`}
          >
            ✓
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Nuclear Option: Canvas Pixel Re-encode (95% quality)
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Breaks Invisible Watermarks
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Re-renders pixels through an HTML5 canvas element. Destroys 100% of metadata AND disrupts subtle invisible pixel perturbations. Causes slight (~5%) imperceptible quality recompression.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Tag Toggles */}
      {showAdvanced && (
        <div className="pt-2 border-t border-studio-border grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.stripExif}
              onChange={() => toggleOption('stripExif')}
              className="rounded text-black dark:text-white"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Strip EXIF</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.stripXmp}
              onChange={() => toggleOption('stripXmp')}
              className="rounded text-black dark:text-white"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Strip XMP</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.stripIptc}
              onChange={() => toggleOption('stripIptc')}
              className="rounded text-black dark:text-white"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Strip IPTC</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.stripC2pa}
              onChange={() => toggleOption('stripC2pa')}
              className="rounded text-black dark:text-white"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Strip C2PA</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none" title="Uncheck to keep color calibration">
            <input
              type="checkbox"
              checked={options.stripIcc}
              onChange={() => toggleOption('stripIcc')}
              className="rounded text-black dark:text-white"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Strip ICC</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.stripComments}
              onChange={() => toggleOption('stripComments')}
              className="rounded text-black dark:text-white"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Strip Comments</span>
          </label>
        </div>
      )}
    </div>
  );
};

