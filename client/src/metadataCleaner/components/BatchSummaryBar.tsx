import React from 'react';
import { Archive, CheckCheck } from 'lucide-react';
import { ImageItem } from '../types';
import { downloadAllAsZip } from '../zipManager';

interface BatchSummaryBarProps {
  items: ImageItem[];
  isProcessing: boolean;
}

export const BatchSummaryBar: React.FC<BatchSummaryBarProps> = ({
  items,
  isProcessing,
}) => {
  const cleanedItems = items.filter((i) => i.status === 'done' && i.cleanedBlob);
  if (cleanedItems.length === 0) return null;

  const totalTagsRemoved = cleanedItems.reduce(
    (acc, curr) => acc + (curr.cleanedTagsRemovedCount || 0),
    0
  );

  const aiImagesCleaned = cleanedItems.filter(
    (i) => i.metadata?.hasAiProvenance
  ).length;

  const handleDownloadZip = () => {
    downloadAllAsZip(cleanedItems);
  };

  return (
    <div className="sticky bottom-4 z-30 max-w-5xl mx-auto w-full px-4 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white/95 dark:bg-studio-900/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
              <span>Ready for download</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Verified Clean ✓
              </span>
            </h4>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              Removed <strong className="text-slate-900 dark:text-white">{totalTagsRemoved}</strong> metadata tags from{' '}
              <strong className="text-slate-900 dark:text-white">{cleanedItems.length}</strong> {cleanedItems.length === 1 ? 'image' : 'images'}
              {aiImagesCleaned > 0 && (
                <span> ({aiImagesCleaned} with AI provenance neutralized)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={handleDownloadZip}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold font-mono text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Archive className="w-4 h-4" />
            <span>Download All as ZIP ({cleanedItems.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

