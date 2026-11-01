import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Film,
  Flame,
  Type,
  Gamepad2,
  GraduationCap,
  Compass,
  Globe2,
  Bookmark,
  Check
} from 'lucide-react';
import {
  CAPTION_PRESETS,
  CaptionCategory,
  CaptionPresetDefinition,
  CATEGORY_DEFINITIONS
} from '@shared/captionPresets';
import {
  CAPTION_PRESET_PREVIEWS,
  CaptionPresetPreview
} from '@shared/captionPresetPreviews';
import { CaptionStudioSettings } from './types';

interface CaptionPresetBrowserProps {
  currentPresetId: string;
  onSelectPreset: (preset: CaptionPresetDefinition) => void;
  aiRecommendedId?: string;
  onOpenAiRecommender?: () => void;
}

export const CaptionPresetBrowser: React.FC<CaptionPresetBrowserProps> = ({
  currentPresetId,
  onSelectPreset,
  aiRecommendedId,
  onOpenAiRecommender
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<CaptionCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered presets
  const filteredPresets = useMemo(() => {
    return CAPTION_PRESETS.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.font.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryIcon = (id: CaptionCategory) => {
    switch (id) {
      case 'cinematic':
        return Film;
      case 'viral':
        return Flame;
      case 'typography':
        return Type;
      case 'gaming':
        return Gamepad2;
      case 'educational':
        return GraduationCap;
      case 'documentary':
        return Compass;
      case 'multilingual':
        return Globe2;
      case 'classics':
        return Bookmark;
      default:
        return Sparkles;
    }
  };

  return (
    <aside className="glass-panel flex flex-col h-full rounded-2xl border border-white/10 dark:border-studio-border bg-slate-950/80 dark:bg-studio-900 p-4 text-slate-100 dark:text-white shadow-xl transition-colors">
      {/* Header & AI Banner */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
              STYLE VAULT
            </span>
            <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-300">
              {CAPTION_PRESETS.length} Looks
            </span>
          </div>

          {onOpenAiRecommender && (
            <button
              type="button"
              onClick={onOpenAiRecommender}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Match</span>
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search looks, fonts, styles..."
            className="w-full rounded-xl border border-white/10 dark:border-studio-border bg-slate-900/80 dark:bg-studio-950 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-400 outline-none transition focus:border-indigo-500/50 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {CATEGORY_DEFINITIONS.map((cat) => {
          const Icon = getCategoryIcon(cat.id);
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                  : 'border border-white/10 dark:border-studio-border bg-slate-800/80 dark:bg-studio-800 text-slate-300 dark:text-slate-400 hover:bg-slate-700/80 hover:text-white'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Preset Cards Scroll Grid */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[580px] scrollbar-thin">
        {filteredPresets.map((preset) => {
          const card = CAPTION_PRESET_PREVIEWS[preset.id] || {
            tag: preset.category.toUpperCase(),
            bg: 'radial-gradient(ellipse at center, #1e2330 0%, #0d1017 100%)',
            prefix: preset.name.split(' ')[0] || 'SAMPLE',
            highlightWord: preset.name.split(' ').slice(1).join(' ') || 'STYLE',
            animLabel: preset.animation
          };

          const isSelected = currentPresetId === preset.id;
          const isAiChoice = aiRecommendedId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`group relative flex w-full flex-col rounded-2xl p-2.5 text-left transition-all duration-200 cursor-pointer shadow-sm ${
                isSelected
                  ? 'border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-950/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30 shadow-lg scale-[1.01]'
                  : 'border border-white/10 dark:border-studio-border bg-slate-900/90 dark:bg-studio-900 hover:border-slate-600 dark:hover:border-slate-700 hover:shadow-md hover:scale-[1.01]'
              }`}
            >
              {/* Card Thumbnail / Live Animation Preview Stage */}
              <div
                className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border border-black/15 dark:border-white/10 px-4 shadow-inner"
                dir={card.rtl ? 'rtl' : 'ltr'}
                style={{ background: card.bg }}
              >
                {/* Subtle cinematic sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/10 to-transparent opacity-60" />

                {/* Category & Motion Badges */}
                <div className="absolute left-2.5 top-2 flex items-center gap-1.5 z-10">
                  <span className="rounded-md bg-black/60 px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-indigo-300 backdrop-blur-md border border-white/10 shadow-sm">
                    {card.tag}
                  </span>
                  {isAiChoice && (
                    <span className="flex items-center gap-0.5 rounded-md bg-indigo-600 px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase text-white shadow-sm">
                      <Sparkles className="h-2.5 w-2.5" /> AI Pick
                    </span>
                  )}
                </div>

                <div className="absolute right-2.5 top-2 z-10">
                  <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[9px] font-bold text-white/90 backdrop-blur-md shadow-sm">
                    {card.animLabel}
                  </span>
                </div>

                {/* Rendered Text Snippet with live styling */}
                <div
                  className="flex max-w-full items-center justify-center gap-1.5 px-2 text-center"
                  style={{
                    fontFamily: card.font,
                    fontSize: card.prefix.length + card.highlightWord.length > 18 ? '13px' : '15px',
                    fontWeight: preset.bold ? 800 : 600,
                    textTransform: card.uppercase ? 'uppercase' : 'none',
                    letterSpacing: card.letterSpacing || 'normal'
                  }}
                >
                  <span
                    className="truncate"
                    style={{
                      color: card.color,
                      WebkitTextStroke:
                        preset.outline > 0
                          ? `${Math.min(0.45, Number((preset.outline * 0.09).toFixed(2)))}px ${
                              card.color === '#FFFFFF' ? '#000000' : '#111111'
                            }`
                          : 'none',
                      textShadow:
                        preset.outline > 1
                          ? `-1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000`
                          : undefined
                    }}
                  >
                    {card.prefix}
                  </span>
                  <span
                    className="truncate font-black"
                    style={{
                      color: card.highlight,
                      WebkitTextStroke:
                        preset.outline > 0
                          ? `${Math.min(0.45, Number((preset.outline * 0.09).toFixed(2)))}px ${
                              card.color === '#FFFFFF' ? '#000000' : '#111111'
                            }`
                          : 'none',
                      textShadow: card.glow
                        ? `0 0 10px ${card.glow}`
                        : preset.outline > 1
                        ? `-1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000`
                        : undefined,
                      transform: 'scale(1.08)'
                    }}
                  >
                    {card.highlightWord}
                  </span>
                </div>
              </div>

              {/* Card Meta Footer */}
              <div className="pt-2 px-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-sans font-extrabold text-[13px] text-white tracking-tight">
                    {preset.name}
                  </span>
                  {isSelected ? (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-indigo-500 text-white shadow-sm shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                      {preset.animation.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-300 border border-white/10 shrink-0">
                    {preset.font}
                  </span>
                  <span className="truncate text-[11px] text-slate-400">
                    {preset.description}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredPresets.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400">
            No presets found matching "{searchQuery}".
          </div>
        )}
      </div>
    </aside>
  );
};
