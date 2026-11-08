import React, { useState } from 'react';
import { Archive, CheckCircle2 } from 'lucide-react';
import { VideoItem } from '../videoTypes';
import { downloadVideoBatchAsZip } from '../videoZipManager';

interface VideoBatchSummaryBarProps {
  items: VideoItem[];
  isProcessing: boolean;
}

export const VideoBatchSummaryBar: React.FC<VideoBatchSummaryBarProps> = ({
  items,
  isProcessing,
}) => {
  const [isZipping, setIsZipping] = useState(false);

  const cleanedItems = items.filter((i) => i.status === 'done' && i.cleanedBlob);
  if (cleanedItems.length === 0) return null;

  const totalRemoved = cleanedItems.reduce(
    (acc, curr) => acc + (curr.cleanedTagsRemovedCount || 0),
    0
  );

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadVideoBatchAsZip(cleanedItems, 'clean_videos_batch.zip');
    } catch (err) {
      console.error('ZIP generation failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="sticky bottom-4 z-30 max-w-7xl mx-auto w-full px-4 sm:px-6 pointer-events-none">
      <div className="bg-slate-900/95 dark:bg-studio-900/95 backdrop-blur-md text-white border border-slate-700/60 dark:border-studio-border rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center space-x-3 text-xs sm:text-sm font-mono">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white">
              {cleanedItems.length} {cleanedItems.length === 1 ? 'video' : 'videos'} cleaned
            </span>
            <span className="text-slate-400 ml-1.5">
              &bull; {totalRemoved} metadata tags removed
            </span>
          </div>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isProcessing || isZipping}
          className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold font-mono rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Archive className="w-4 h-4" />
          <span>{isZipping ? 'Creating ZIP...' : `Download All (${cleanedItems.length}) as ZIP`}</span>
        </button>
      </div>
    </div>
  );
};

