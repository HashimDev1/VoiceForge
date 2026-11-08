import React from 'react';
import {
  Sparkles,
  Trash2,
  Flame,
  Shield,
  Layers,
  Music2,
  FileAudio,
} from 'lucide-react';
import { AudioCleaningOptions } from '../audioTypes';
import { createSampleSunoWav, createSampleElevenLabsMp3 } from '../SampleAudioGenerator';

interface AudioControlToolbarProps {
  options: AudioCleaningOptions;
  onOptionsChange: (newOptions: AudioCleaningOptions) => void;
  onCleanAll: () => void;
  onClearAll: () => void;
  onLoadSample: (files: File[]) => void;
  isProcessing: boolean;
  totalCount: number;
  uncleanedCount: number;
  overallProgress: number;
}

export const AudioControlToolbar: React.FC<AudioControlToolbarProps> = ({
  options,
  onOptionsChange,
  onCleanAll,
  onClearAll,
  onLoadSample,
  isProcessing,
  totalCount,
  uncleanedCount,
  overallProgress,
}) => {
  return (
    <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top row: Mode toggle + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Cleaning Engine Mode Tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-studio-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, nuclearReencode: false })}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
              !options.nuclearReencode
                ? 'bg-white dark:bg-studio-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-500" />
            <span>Mode A: Lossless Metadata Strip (100% Quality)</span>
          </button>

          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, nuclearReencode: true })}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
              options.nuclearReencode
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Mode B: Nuclear Re-encode (Breaks Watermarks)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onClearAll}
            disabled={isProcessing || totalCount === 0}
            className="px-3.5 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40 flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={onCleanAll}
            disabled={isProcessing || uncleanedCount === 0}
            className="px-5 py-2 text-xs sm:text-sm font-bold font-mono rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-md shadow-purple-600/20 transition-all disabled:opacity-40 flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Processing...'
                : uncleanedCount > 0
                ? `Clean All (${uncleanedCount})`
                : 'All Audio Cleaned'}
            </span>
          </button>
        </div>
      </div>

      {/* Mode B Options Info */}
      {options.nuclearReencode && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-700 dark:text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              Nuclear Mode uses ffmpeg.wasm to re-encode audio at 192kbps. This wipes metadata AND defeats sample-level watermarks.
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <label className="text-[11px] font-bold">Bitrate:</label>
            <select
              value={options.nuclearBitrate}
              onChange={(e) => onOptionsChange({ ...options, nuclearBitrate: e.target.value })}
              className="px-2 py-1 text-xs rounded bg-white dark:bg-studio-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white"
            >
              <option value="128k">128 kbps</option>
              <option value="192k">192 kbps (Standard)</option>
              <option value="256k">256 kbps (High)</option>
              <option value="320k">320 kbps (Maximum)</option>
            </select>
          </div>
        </div>
      )}

      {/* Quick Test Samples */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-studio-border text-xs font-mono text-slate-500 dark:text-slate-400">
        <span className="flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-purple-500" />
          <span>Quick test with synthetic AI audio samples:</span>
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onLoadSample([createSampleSunoWav()])}
            className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors flex items-center space-x-1"
          >
            <Music2 className="w-3 h-3" />
            <span>+ Suno AI WAV</span>
          </button>
          <button
            type="button"
            onClick={() => onLoadSample([createSampleElevenLabsMp3()])}
            className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors flex items-center space-x-1"
          >
            <FileAudio className="w-3 h-3" />
            <span>+ ElevenLabs MP3</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="w-full bg-slate-100 dark:bg-studio-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-purple-600 h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};

