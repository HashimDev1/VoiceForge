import React from 'react';
import {
  Download,
  Trash2,
  Eye,
  RotateCw,
  Flame,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { ImageItem } from '../types';
import { downloadSingleImage } from '../zipManager';
import { extractRemovedPills } from '../pillExtractor';

interface ImageCardProps {
  item: ImageItem;
  viewMode?: 'grid' | 'list';
  onInspect: (item: ImageItem) => void;
  onClean: (item: ImageItem) => void;
  onNuclearFallback: (item: ImageItem) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  viewMode = 'grid',
  onInspect,
  onClean,
  onNuclearFallback,
  onRemove,
  isProcessing,
}) => {
  const isDone = item.status === 'done';
  const isWorking = item.status === 'processing';
  const isError = item.status === 'error';
  const removedPills = extractRemovedPills(item);
  const itemsRemovedCount = item.cleanedTagsRemovedCount || removedPills.length;

  // ================= GRID CARD (3 to 4 on a line) =================
  if (viewMode === 'grid') {
    return (
      <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-border rounded-2xl p-3.5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between group h-full">
        {/* Top Section */}
        <div className="space-y-2.5">
          {/* Card Preview Image */}
          <div
            onClick={() => onInspect(item)}
            className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-studio-800 border border-slate-200/80 dark:border-studio-border flex-shrink-0 cursor-pointer relative group/thumb"
            title="Click to inspect metadata"
          >
            <img
              src={isDone && item.cleanedUrl ? item.cleanedUrl : item.previewUrl}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
            />

            {/* Format Badge (Top-Right) */}
            <span className="absolute top-2 right-2 uppercase text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white border border-white/20 shadow-xs">
              {item.format}
            </span>

            {/* Verified Badge (Bottom-Left) */}
            {isDone && item.verification?.verifiedClean && (
              <span className="absolute bottom-2 left-2 inline-flex items-center space-x-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs">
                <CheckCircle className="w-2.5 h-2.5" />
                <span>Verified Clean ✓</span>
              </span>
            )}

            {/* Spinner Overlay */}
            {isWorking && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white backdrop-blur-xs">
                <RotateCw className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            )}
          </div>

          {/* Details Area */}
          <div className="space-y-1">
            {/* Title */}
            <h4
              onClick={() => onInspect(item)}
              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
              title={item.name}
            >
              {item.name}
            </h4>

            {/* Metrics */}
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1 flex-wrap">
              <span>
                {formatBytes(item.size)}
                {isDone && item.cleanedSize ? (
                  <>
                    {' '}
                    &rarr;{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      {formatBytes(item.cleanedSize)}
                    </span>
                  </>
                ) : null}
              </span>

              {isDone ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {itemsRemovedCount} {itemsRemovedCount === 1 ? 'item' : 'items'} removed
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  {removedPills.length} items
                </span>
              )}
            </div>

            {/* Strikethrough Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 min-h-[26px]">
              {removedPills.map((pill, idx) => (
                <span
                  key={idx}
                  className="relative inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f5f3ff] text-slate-900 dark:bg-purple-950/50 dark:text-purple-200 border border-[#ddd6fe] dark:border-purple-800/70 shadow-2xs transition-all"
                >
                  <span className="relative inline-block">
                    <span className={isDone ? 'opacity-85' : ''}>{pill.label}</span>
                    {isDone && (
                      <span className="absolute inset-x-[-3px] top-1/2 -translate-y-1/2 h-[2px] bg-[#6d28d9] dark:bg-purple-400 pointer-events-none rounded-full" />
                    )}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-studio-border flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onInspect(item)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 transition-colors"
              title="Inspect metadata"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onRemove(item.id)}
              disabled={isProcessing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
              title="Remove from list"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {isDone ? (
            <button
              onClick={() => downloadSingleImage(item)}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 shadow-sm transition-all flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          ) : (
            <button
              onClick={() => onClean(item)}
              disabled={isProcessing || isWorking}
              className="px-4 py-1.5 text-xs font-bold font-mono rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:opacity-100 transition-opacity disabled:opacity-40 flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Clean</span>
            </button>
          )}
        </div>

        {/* Error Fallback */}
        {isError && (
          <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-500 flex flex-col gap-1.5">
            <span>{item.errorMessage || 'Failed to strip metadata'}</span>
            <button
              onClick={() => onNuclearFallback(item)}
              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center space-x-1"
            >
              <Flame className="w-3 h-3" />
              <span>Force Re-encode via Canvas</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= LIST VIEW (Wide Horizontal Card) =================
  return (
    <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-border rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start sm:items-center space-x-3.5 sm:space-x-4 min-w-0 flex-1">
          {/* Square rounded thumbnail */}
          <div
            onClick={() => onInspect(item)}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-studio-800 border border-slate-200 dark:border-studio-border flex-shrink-0 cursor-pointer relative group"
            title="Click to inspect metadata"
          >
            <img
              src={isDone && item.cleanedUrl ? item.cleanedUrl : item.previewUrl}
              alt={item.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {isWorking && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                <RotateCw className="w-5 h-5 animate-spin text-cyan-400" />
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* Title */}
            <div className="flex items-center space-x-2">
              <h4
                onClick={() => onInspect(item)}
                className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                title={item.name}
              >
                {item.name}
              </h4>
              <span className="uppercase text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-studio-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-studio-border flex-shrink-0">
                {item.format}
              </span>
            </div>

            {/* Metrics line: 1.88 MB -> 1.86 MB. 3 items removed */}
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <span>{formatBytes(item.size)}</span>
              {isDone && item.cleanedSize ? (
                <>
                  <span>&rarr;</span>
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">
                    {formatBytes(item.cleanedSize)}.
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">
                    {itemsRemovedCount} {itemsRemovedCount === 1 ? 'item' : 'items'} removed
                  </span>
                </>
              ) : (
                <span>&bull; {removedPills.length} items detected</span>
              )}
            </div>

            {/* Strikethrough pills showing removed tags */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1.5">
              {removedPills.map((pill, idx) => (
                <span
                  key={idx}
                  className="relative inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f5f3ff] text-slate-900 dark:bg-purple-950/50 dark:text-purple-200 border border-[#ddd6fe] dark:border-purple-800/70 shadow-2xs transition-all"
                >
                  <span className="relative inline-block">
                    <span className={isDone ? 'opacity-85' : ''}>{pill.label}</span>
                    {isDone && (
                      <span className="absolute inset-x-[-3px] top-1/2 -translate-y-1/2 h-[2px] bg-[#6d28d9] dark:bg-purple-400 pointer-events-none rounded-full" />
                    )}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2 sm:self-center flex-shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-studio-border">
          <button
            onClick={() => onInspect(item)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 transition-colors"
            title="Inspect tags"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onRemove(item.id)}
            disabled={isProcessing}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            title="Remove from list"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {isDone ? (
            <button
              onClick={() => downloadSingleImage(item)}
              className="px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          ) : (
            <button
              onClick={() => onClean(item)}
              disabled={isProcessing || isWorking}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold font-mono rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:opacity-100 transition-opacity disabled:opacity-40 flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Clean</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Fallback */}
      {isError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-500 flex items-center justify-between gap-2">
          <span>{item.errorMessage || 'Failed to strip metadata'}</span>
          <button
            onClick={() => onNuclearFallback(item)}
            className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center space-x-1"
          >
            <Flame className="w-3 h-3" />
            <span>Force Re-encode via Canvas</span>
          </button>
        </div>
      )}
    </div>
  );
};
