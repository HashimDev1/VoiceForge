import React from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface AudioPlayerProps {
  audioUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate?: number;
  onPlay: (url: string) => void;
  onPause: () => void;
  onSeek: (timeSec: number) => void;
  onVolumeChange: (vol: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  title?: string;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate = 1,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  title,
  compact = false
}) => {
  if (!audioUrl) {
    return null;
  }

  const handleToggle = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay(audioUrl);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-white dark:bg-studio-850 border border-studio-border rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
        <button
          onClick={handleToggle}
          className="p-1 rounded-full bg-black text-white dark:bg-white dark:text-black transition flex items-center justify-center"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 translate-x-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1 bg-slate-200 dark:bg-studio-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
          />
          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-mono">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        {onPlaybackRateChange && (
          <select
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
            className="bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 border border-studio-border rounded px-1 py-0.5 text-[10px] font-mono font-bold focus:outline-none"
            title="Playback Speed"
          >
            {SPEED_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        )}

        <a
          href={audioUrl}
          download
          className="p-1 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition"
          title="Download clip"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4 border border-studio-border shadow-md bg-white dark:bg-studio-900">
      {title && (
        <div className="mb-2 flex items-center justify-between font-mono">
          <h4 className="text-xs font-serif font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h4>
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleToggle}
          className="w-10 h-10 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-md hover:opacity-95 transition"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
          />
        </div>

        {/* Playback Rate Selector */}
        {onPlaybackRateChange && (
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              className="bg-slate-100 dark:bg-studio-800 text-slate-900 dark:text-slate-100 font-bold border border-studio-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer text-xs"
            >
              {SPEED_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Volume Control */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <button
            onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
            className="hover:text-black dark:hover:text-slate-200 transition"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
          />
        </div>

        {/* Download Direct */}
        <a
          href={audioUrl}
          download
          className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-sm transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
};
