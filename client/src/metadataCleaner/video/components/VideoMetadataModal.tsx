import React from 'react';
import {
  X,
  Bot,
  Tag,
  Film,
  Sparkles,
  Maximize2,
  Clock,
} from 'lucide-react';
import { VideoItem } from '../videoTypes';

interface VideoMetadataModalProps {
  item: VideoItem | null;
  onClose: () => void;
  onCleanItem: (item: VideoItem) => void;
  isProcessing: boolean;
}

export const VideoMetadataModal: React.FC<VideoMetadataModalProps> = ({
  item,
  onClose,
  onCleanItem,
  isProcessing,
}) => {
  if (!item) return null;

  const meta = item.metadata;
  const isDone = item.status === 'done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-border rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-studio-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-md">
                {item.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Video Metadata Inspection &bull; {item.format.toUpperCase()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Stream details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-border">
              <span className="text-slate-400 block text-[10px] uppercase">Format</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{item.format.toUpperCase()}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-border">
              <span className="text-slate-400 block text-[10px] uppercase">Resolution</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {item.height ? `${item.width}x${item.height}` : 'Unknown'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-border">
              <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {item.duration ? `${item.duration.toFixed(1)}s` : 'Unknown'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-border">
              <span className="text-slate-400 block text-[10px] uppercase">File Size</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {(item.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          {/* AI Detection Banner */}
          {meta?.hasAiProvenance && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start space-x-3">
              <Bot className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold font-mono">
                  {meta.aiToolDetected
                    ? `AI Video Model Detected: ${meta.aiToolDetected}`
                    : 'AI Provenance Tags Detected'}
                </h4>
                <p className="mt-0.5 text-rose-600/90 dark:text-rose-400/90">
                  This video contains provenance signatures, comments, or C2PA tags indicating AI generation. These will be cleanly stripped.
                </p>
              </div>
            </div>
          )}

          {/* Tags Table */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <h4 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                <span>Extracted Atoms & Tags ({meta?.tags?.length || 0})</span>
              </h4>
            </div>

            {meta && meta.tags && meta.tags.length > 0 ? (
              <div className="border border-slate-200 dark:border-studio-border rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-studio-border text-xs font-mono">
                {meta.tags.map((tag, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 ${
                      tag.isAi
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-studio-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-200 dark:bg-studio-700 text-slate-700 dark:text-slate-300">
                        {tag.category}
                      </span>
                      <span className="font-bold truncate">{tag.key}</span>
                      {tag.isAi && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold uppercase">
                          AI Tag
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-sm" title={String(tag.value)}>
                      {String(tag.value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-studio-border rounded-xl text-slate-400 dark:text-slate-500 text-xs font-mono">
                No embedded metadata tags detected in this video container.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-studio-border flex items-center justify-between bg-slate-50 dark:bg-studio-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-studio-border hover:bg-white dark:hover:bg-studio-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </button>

          {!isDone && (
            <button
              onClick={() => onCleanItem(item)}
              disabled={isProcessing}
              className="px-5 py-2 text-xs sm:text-sm font-bold font-mono rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-md shadow-purple-600/20 transition-all disabled:opacity-40 flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clean This Video</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

