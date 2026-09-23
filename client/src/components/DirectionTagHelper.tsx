import React, { useState } from 'react';
import { SUPPORTED_DIRECTION_TAGS } from '../../../shared/src/textAnalysis';
import { Sparkles, Info } from 'lucide-react';

interface DirectionTagHelperProps {
  onInsertTag: (tag: string) => void;
}

export const DirectionTagHelper: React.FC<DirectionTagHelperProps> = ({ onInsertTag }) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'emotions' | 'delivery' | 'pace'>('all');

  const getCategory = (tag: string) => {
    if (['[laugh]', '[chuckle]', '[giggle]', '[snicker]', '[sigh]', '[gasp]', '[pant]', '[crying]', '[screaming]'].includes(tag)) {
      return 'emotions';
    }
    if (['[slow]', '[fast]', '[pause]'].includes(tag)) {
      return 'pace';
    }
    return 'delivery';
  };

  const filteredTags = SUPPORTED_DIRECTION_TAGS.filter((t) => {
    if (filterCategory === 'all') return true;
    return getCategory(t.tag) === filterCategory;
  });

  return (
    <div className="bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-slate-900 dark:text-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />
          <span>Speech Direction & Emotion Tags</span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 text-[11px]">
          {(['all', 'emotions', 'delivery', 'pace'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded-full capitalize font-medium transition ${
                filterCategory === cat
                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {filteredTags.map((dir) => (
          <button
            key={dir.tag}
            type="button"
            onClick={() => onInsertTag(dir.tag)}
            title={dir.description}
            className="px-2.5 py-1 bg-white dark:bg-studio-800 hover:border-black dark:hover:border-white text-slate-900 dark:text-slate-100 rounded-lg text-xs font-mono font-bold border border-studio-border transition flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>{dir.tag}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 font-mono">
        Click any tag to insert inline speech direction at cursor. Supported by Fish Audio s2.1 model family.
      </p>
    </div>
  );
};
