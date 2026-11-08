import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Search,
  ShieldAlert,
  Sparkles,
  FileText,
} from 'lucide-react';
import { ImageItem } from '../types';

interface MetadataModalProps {
  item: ImageItem | null;
  onClose: () => void;
  onCleanItem: (item: ImageItem) => void;
  isProcessing: boolean;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({
  item,
  onClose,
  onCleanItem,
  isProcessing,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'xmp' | 'exif' | 'iptc' | 'c2pa'>('all');

  if (!item) return null;

  const metadata = item.metadata;
  const allTags = metadata?.tags || [];
  const aiIndicators = metadata?.aiIndicators || [];

  const filteredTags = allTags.filter((t) => {
    if (activeTab === 'ai' && !t.isAi) return false;
    if (activeTab === 'xmp' && t.category !== 'XMP') return false;
    if (activeTab === 'exif' && t.category !== 'EXIF') return false;
    if (activeTab === 'iptc' && t.category !== 'IPTC') return false;
    if (activeTab === 'c2pa' && t.category !== 'C2PA') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchKey = t.key.toLowerCase().includes(q);
      const matchVal = String(t.value).toLowerCase().includes(q);
      return matchKey || matchVal;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-studio-900 border border-studio-border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-border flex items-center justify-between bg-slate-50 dark:bg-studio-850">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-studio-800 border border-studio-border flex-shrink-0 flex items-center justify-center">
              <img
                src={item.previewUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-mono font-bold text-sm sm:text-base truncate text-slate-900 dark:text-white">
                  {item.name}
                </h3>
                <span className="uppercase text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border">
                  {item.format}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Found {metadata?.totalTagsCount || 0} metadata tags &bull;{' '}
                {aiIndicators.length > 0 ? (
                  <span className="text-rose-500 font-bold">
                    {aiIndicators.length} AI Provenance flags detected
                  </span>
                ) : (
                  <span className="text-emerald-500 font-medium">No obvious AI flags</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {item.status !== 'done' && (
              <button
                onClick={() => onCleanItem(item)}
                disabled={isProcessing}
                className="px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-xs disabled:opacity-40 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>Clean Now</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Detection Banner */}
        {aiIndicators.length > 0 && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-3.5 text-xs text-rose-600 dark:text-rose-400 font-mono">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-bold text-sm">
                  ⚠️ AI Provenance Traces Detected ({aiIndicators.length})
                </p>
                <p className="mt-0.5 opacity-90 text-[11px]">
                  Social media platforms (Meta, Facebook, Instagram, Threads) inspect these specific fields to attach the automatic <span className="font-bold underline">"Made with AI"</span> label. Stripping them prevents automated detection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls: Search & Tabs */}
        <div className="px-6 py-3 border-b border-studio-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-studio-900">
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 font-mono text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                activeTab === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-studio-800'
              }`}
            >
              All Tags ({allTags.length})
            </button>

            {aiIndicators.length > 0 && (
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 font-bold ${
                  activeTab === 'ai'
                    ? 'bg-rose-500 text-white'
                    : 'text-rose-500 hover:bg-rose-500/10'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>AI Flags ({aiIndicators.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('xmp')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                activeTab === 'xmp'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-studio-800'
              }`}
            >
              XMP
            </button>

            <button
              onClick={() => setActiveTab('exif')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                activeTab === 'exif'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-studio-800'
              }`}
            >
              EXIF
            </button>

            <button
              onClick={() => setActiveTab('iptc')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                activeTab === 'iptc'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-studio-800'
              }`}
            >
              IPTC
            </button>

            {metadata?.c2paManifestFound && (
              <button
                onClick={() => setActiveTab('c2pa')}
                className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                  activeTab === 'c2pa'
                    ? 'bg-rose-500 text-white'
                    : 'text-rose-500 hover:bg-rose-500/10'
                }`}
              >
                C2PA
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tag or value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-mono pl-8 pr-3 py-1.5 rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>
        </div>

        {/* Tag List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredTags.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No metadata tags found in this view.</p>
            </div>
          ) : (
            filteredTags.map((tag, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-colors ${
                  tag.isAi
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-slate-50 dark:bg-studio-850 border-studio-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {tag.key}
                    </span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                        tag.isAi
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tag.category}
                    </span>
                    {tag.isAi && (
                      <span className="text-[10px] text-rose-500 font-mono font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        AI TRIGGER
                      </span>
                    )}
                  </div>
                  {tag.aiReason && (
                    <span className="text-[11px] font-mono text-rose-500 italic">
                      {tag.aiReason}
                    </span>
                  )}
                </div>

                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-studio-900 p-2 rounded-lg break-all border border-studio-border">
                  {typeof tag.value === 'object'
                    ? JSON.stringify(tag.value, null, 2)
                    : String(tag.value)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-studio-border flex justify-between items-center bg-slate-50 dark:bg-studio-850 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>Showing {filteredTags.length} of {allTags.length} tags</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-studio-border hover:bg-white dark:hover:bg-studio-800 font-bold text-slate-900 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

