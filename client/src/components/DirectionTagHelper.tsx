import React from 'react';
import { SUPPORTED_DIRECTION_TAGS } from '../../../shared/src/textAnalysis';
import { Sparkles, Info } from 'lucide-react';

interface DirectionTagHelperProps {
  onInsertTag: (tag: string) => void;
}

export const DirectionTagHelper: React.FC<DirectionTagHelperProps> = ({ onInsertTag }) => {
  return (
    <div className="bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-slate-900 dark:text-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />
          <span>Speech Direction Tags</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-500" />
          Supported by Fish Audio s2.1 model
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {SUPPORTED_DIRECTION_TAGS.map((dir) => (
          <button
            key={dir.tag}
            type="button"
            onClick={() => onInsertTag(dir.tag)}
            title={dir.description}
            className="px-2.5 py-1 bg-white dark:bg-studio-800 hover:border-black text-slate-900 dark:text-slate-100 rounded-lg text-xs font-mono font-bold border border-studio-border transition flex items-center gap-1 shadow-sm"
          >
            <span>{dir.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
