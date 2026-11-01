import React, { useState } from 'react';
import {
  Type,
  Palette,
  Sparkles,
  Box,
  Move,
  BookmarkPlus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  X,
  Wand2,
  Layers
} from 'lucide-react';
import { CaptionStudioSettings, UserSavedPreset } from './types';
import { CaptionAnimation } from '@shared/captionPresets';

interface CaptionInspectorProps {
  settings: CaptionStudioSettings;
  onUpdate: <K extends keyof CaptionStudioSettings>(
    key: K,
    val: CaptionStudioSettings[K]
  ) => void;
  savedPresets: UserSavedPreset[];
  onSavePreset: (name: string) => void;
  onLoadSavedPreset: (saved: UserSavedPreset) => void;
  onDeleteSavedPreset: (id: string) => void;
  onAutoScanKeywords: () => void;
}

const FONTS = [
  'Inter',
  'Cinzel',
  'Montserrat',
  'Poppins',
  'Bebas Neue',
  'Impact',
  'Arial Black',
  'Arial',
  'Oswald',
  'Outfit',
  'Playfair Display',
  'Rubik',
  'Georgia',
  'Courier New',
  'Space Mono',
  'Noto Nastaliq Urdu',
  'Noto Sans Arabic',
  'Noto Naskh Arabic'
];

const ANIMATION_OPTIONS: Array<{ id: CaptionAnimation; label: string }> = [
  { id: 'pop', label: 'Pop Scale-In' },
  { id: 'zoom_punch', label: 'Zoom Punch Snap' },
  { id: 'bounce', label: 'Dynamic Word Bounce' },
  { id: 'pulse', label: 'Rhythmic Pulse' },
  { id: 'zoom', label: 'Smooth Zoom' },
  { id: 'slide_up', label: 'Slide Up Reveal' },
  { id: 'typewriter', label: 'Typewriter Progressive' },
  { id: 'blur_focus', label: 'Blur-to-Focus Cinema' },
  { id: 'glitch', label: 'Glitch Cyberpunk' },
  { id: 'mask_reveal', label: 'Mask Wipe Reveal' },
  { id: 'gradient_reveal', label: 'Gradient Reveal' },
  { id: 'fade', label: 'Cinematic Subtitle Fade' },
  { id: 'none', label: 'Static Text' }
];

export const CaptionInspector: React.FC<CaptionInspectorProps> = ({
  settings,
  onUpdate,
  savedPresets,
  onSavePreset,
  onLoadSavedPreset,
  onDeleteSavedPreset,
  onAutoScanKeywords
}) => {
  const [activeTab, setActiveTab] = useState<
    'type' | 'colors' | 'motion' | 'box' | 'placement' | 'saved'
  >('type');
  const [customPresetName, setCustomPresetName] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const addKeyword = () => {
    const clean = keywordInput.trim().toUpperCase();
    if (clean && !settings.emphasisWords.includes(clean)) {
      onUpdate('emphasisWords', [...settings.emphasisWords, clean]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (word: string) => {
    onUpdate(
      'emphasisWords',
      settings.emphasisWords.filter((w) => w !== word)
    );
  };

  return (
    <aside className="glass-panel flex flex-col h-full rounded-2xl border border-white/10 dark:border-studio-border bg-slate-950/80 dark:bg-studio-900 p-4 text-slate-100 dark:text-white shadow-xl transition-colors">
      {/* Inspector Tab Bar - 6 Column Grid, never truncated or scrolled off */}
      <div className="mb-4 grid grid-cols-6 gap-1 p-1 rounded-xl bg-slate-900/90 dark:bg-studio-800 border border-white/10 dark:border-studio-border">
        {[
          ['type', 'Type', Type],
          ['colors', 'Color', Palette],
          ['motion', 'Motion', Sparkles],
          ['box', 'Effects', Box],
          ['placement', 'Pos', Move],
          ['saved', 'Saved', Layers]
        ].map(([tabId, label, Icon]) => {
          const isCurrent = activeTab === tabId;
          return (
            <button
              key={tabId as string}
              type="button"
              onClick={() => setActiveTab(tabId as any)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg py-1.5 px-0.5 text-[11px] font-bold transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[580px] scrollbar-thin text-xs">
        {/* ==========================================
            TAB 1: TYPOGRAPHY
            ========================================== */}
        {activeTab === 'type' && (
          <div className="space-y-3.5">
            {/* Font Family */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Font Family
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => onUpdate('fontFamily', e.target.value)}
                className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 shadow-sm cursor-pointer"
              >
                {FONTS.map((font) => (
                  <option key={font} value={font} className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Stepper */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Font Size
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{settings.fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="20"
                  max="140"
                  step="2"
                  value={settings.fontSize}
                  onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
                  className="flex-1 accent-indigo-600 dark:accent-indigo-400"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate('fontSize', Math.max(16, settings.fontSize - 4))
                    }
                    className="rounded-lg border border-studio-border bg-slate-100 dark:bg-studio-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-700 cursor-pointer"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate('fontSize', Math.min(160, settings.fontSize + 4))
                    }
                    className="rounded-lg border border-studio-border bg-slate-100 dark:bg-studio-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Font Weight */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Weight
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['normal', 'bold', 'heavy'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onUpdate('fontWeight', w)}
                    className={`rounded-lg py-1.5 text-center font-bold capitalize transition cursor-pointer ${
                      settings.fontWeight === w
                        ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                        : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Letter Spacing */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Letter Spacing
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {settings.letterSpacing || 'normal'}
                </span>
              </div>
              <input
                type="range"
                min="-0.02"
                max="0.16"
                step="0.01"
                value={parseFloat(settings.letterSpacing || '0')}
                onChange={(e) =>
                  onUpdate('letterSpacing', `${e.target.value}em`)
                }
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />
            </div>

            {/* Line Height */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Line Height
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {settings.lineHeight.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.8"
                step="0.05"
                value={settings.lineHeight}
                onChange={(e) => onUpdate('lineHeight', Number(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />
            </div>

            {/* Text Alignment */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Text Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  ['left', AlignLeft],
                  ['center', AlignCenter],
                  ['right', AlignRight]
                ].map(([alignVal, Icon]: any) => (
                  <button
                    key={alignVal}
                    type="button"
                    onClick={() => onUpdate('textAlign', alignVal)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-bold transition cursor-pointer ${
                      settings.textAlign === alignVal
                        ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                        : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="capitalize">{alignVal}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Transform & Opacity */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 shadow-sm cursor-pointer">
                <span className="font-semibold text-slate-800 dark:text-slate-200">ALL CAPS</span>
                <input
                  type="checkbox"
                  checked={settings.uppercase}
                  onChange={(e) => onUpdate('uppercase', e.target.checked)}
                  className="rounded accent-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 shadow-sm cursor-pointer">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Highlight Active</span>
                <input
                  type="checkbox"
                  checked={settings.wordHighlight}
                  onChange={(e) => onUpdate('wordHighlight', e.target.checked)}
                  className="rounded accent-indigo-600"
                />
              </label>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: COLORS & STROKE
            ========================================== */}
        {activeTab === 'colors' && (
          <div className="space-y-3.5">
            {/* Color Pickers Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 shadow-sm cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Primary Text
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => onUpdate('primaryColor', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">{settings.primaryColor}</span>
                </div>
              </label>

              <label className="flex flex-col gap-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 shadow-sm cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Word
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.highlightColor}
                    onChange={(e) => onUpdate('highlightColor', e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">{settings.highlightColor}</span>
                </div>
              </label>
            </div>

            {/* Quick Palette Swatches */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Quick Highlight Swatches
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  ['#FFE600', 'Solar Gold'],
                  ['#22C55E', 'Neon Mint'],
                  ['#00F0FF', 'Electric Cyan'],
                  ['#FF007F', 'Hot Pink'],
                  ['#FF6B6B', 'Coral Punch'],
                  ['#A855F7', 'Ultraviolet'],
                  ['#38BDF8', 'Sky Blue'],
                  ['#FFFFFF', 'Pristine White']
                ].map(([color, label]) => (
                  <button
                    key={color}
                    type="button"
                    title={label}
                    onClick={() => onUpdate('highlightColor', color)}
                    className={`h-6 w-6 rounded-lg transition-transform hover:scale-110 cursor-pointer shadow-sm ${
                      settings.highlightColor.toUpperCase() === color
                        ? 'ring-2 ring-indigo-600 ring-offset-1 ring-offset-white dark:ring-offset-studio-900'
                        : 'border border-slate-300 dark:border-studio-border'
                    }`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            {/* Outline / Stroke Width & Color */}
            <div className="space-y-2 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Outline Width
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{settings.outlineWidth}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                step="0.5"
                value={settings.outlineWidth}
                onChange={(e) => onUpdate('outlineWidth', Number(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Outline Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.outlineColor}
                    onChange={(e) => onUpdate('outlineColor', e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {settings.outlineColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Shadow Distance & Color */}
            <div className="space-y-2 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Shadow Distance
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{settings.shadowDistance}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                step="0.5"
                value={settings.shadowDistance}
                onChange={(e) => onUpdate('shadowDistance', Number(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Shadow Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.shadowColor}
                    onChange={(e) => onUpdate('shadowColor', e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {settings.shadowColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Neon Glow Toggle */}
            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm cursor-pointer">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">Neon Glow Effect</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Adds multi-layered glowing halo to active words
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.neonGlow}
                onChange={(e) => onUpdate('neonGlow', e.target.checked)}
                className="rounded accent-indigo-600 cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* ==========================================
            TAB 3: MOTION & ANIMATION
            ========================================== */}
        {activeTab === 'motion' && (
          <div className="space-y-3.5">
            {/* Animation Style Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Word Animation Engine
              </label>
              <select
                value={settings.animationStyle}
                onChange={(e) =>
                  onUpdate('animationStyle', e.target.value as CaptionAnimation)
                }
                className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 shadow-sm cursor-pointer"
              >
                {ANIMATION_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-white text-slate-900 dark:bg-studio-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Animation Intensity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Animation Speed & Intensity
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {settings.animationIntensity.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.animationIntensity}
                onChange={(e) =>
                  onUpdate('animationIntensity', Number(e.target.value))
                }
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />
            </div>

            {/* Active Word Scale Multiplier */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Active Word Scale
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {settings.highlightScale.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="1.6"
                step="0.05"
                value={settings.highlightScale}
                onChange={(e) =>
                  onUpdate('highlightScale', Number(e.target.value))
                }
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />
            </div>

            {/* Words Per Caption Preset */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Caption Length / Display Mode
                </label>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {settings.maxWords >= 16 ? 'Complete Sentence' : `${settings.maxWords} Words`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate('maxWords', 20)}
                  className={`col-span-3 rounded-lg py-1.5 text-center text-xs font-bold transition cursor-pointer ${
                    settings.maxWords >= 16
                      ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                      : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800'
                  }`}
                >
                  Complete Sentence (Full Natural Flow)
                </button>
                {[2, 3, 4, 6, 8, 12].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onUpdate('maxWords', count)}
                    className={`rounded-lg py-1.5 text-center text-xs font-bold transition cursor-pointer ${
                      settings.maxWords === count
                        ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                        : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800'
                    }`}
                  >
                    {count} Words
                  </button>
                ))}
              </div>
            </div>

            {/* Keyword Emphasis Engine */}
            <div className="space-y-2 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Emphasis Keywords ({settings.emphasisWords.length})
                </label>
                <button
                  type="button"
                  onClick={onAutoScanKeywords}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
                >
                  <Wand2 className="h-3 w-3" /> Auto Scan
                </button>
              </div>

              {/* Keyword chips list */}
              <div className="flex flex-wrap gap-1.5 min-h-8 max-h-24 overflow-y-auto pr-1">
                {settings.emphasisWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => removeKeyword(word)}
                      className="hover:text-rose-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {settings.emphasisWords.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">
                    No custom keywords added yet.
                  </span>
                )}
              </div>

              {/* Add Keyword Input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Add keyword (e.g. GOAL, CRAZY)..."
                  className="flex-1 rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none shadow-sm"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  disabled={!keywordInput.trim()}
                  className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs font-bold disabled:opacity-40 shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: BOX & CREATIVE EFFECTS
            ========================================== */}
        {activeTab === 'box' && (
          <div className="space-y-3.5">
            {/* Box Background Toggle */}
            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm cursor-pointer">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">Backing Pill / Box</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Adds protective background plate behind text
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.boxBackground}
                onChange={(e) => onUpdate('boxBackground', e.target.checked)}
                className="rounded accent-indigo-600 cursor-pointer"
              />
            </label>

            {settings.boxBackground && (
              <div className="space-y-3 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
                {/* Box Color & Opacity */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Box Color
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.boxColor}
                      onChange={(e) => onUpdate('boxColor', e.target.value)}
                      className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">{settings.boxColor}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Box Opacity
                    </span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {Math.round((settings.boxOpacity || 0.88) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.boxOpacity || 0.88}
                    onChange={(e) => onUpdate('boxOpacity', Number(e.target.value))}
                    className="w-full accent-indigo-600 dark:accent-indigo-400"
                  />
                </div>

                {/* Border Radius Presets */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Corner Style
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      ['4px', 'Sharp'],
                      ['12px', 'Rounded'],
                      ['999px', 'Pill']
                    ].map(([rad, label]) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() => onUpdate('borderRadius', rad)}
                        className={`rounded-lg py-1.5 text-center text-xs font-bold cursor-pointer ${
                          settings.borderRadius === rad
                            ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                            : 'border border-studio-border bg-white dark:bg-studio-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Editorial Underline Effect */}
            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm cursor-pointer">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">Editorial Underline</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Crisp underline under active highlighted words
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.editorialUnderline}
                onChange={(e) =>
                  onUpdate('editorialUnderline', e.target.checked)
                }
                className="rounded accent-indigo-600 cursor-pointer"
              />
            </label>

            {/* Word Spotlight Effect */}
            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm cursor-pointer">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">Active Word Spotlight</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Subtle luminescent tag backing behind active words
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.wordSpotlight}
                onChange={(e) => onUpdate('wordSpotlight', e.target.checked)}
                className="rounded accent-indigo-600 cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* ==========================================
            TAB 5: PLACEMENT & POSITION
            ========================================== */}
        {activeTab === 'placement' && (
          <div className="space-y-3.5">
            {/* Quick Placement Zones */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Preset Placement Zone
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['bottom', 'Bottom Safe', 0.83],
                  ['lower', 'Lower Third', 0.74],
                  ['middle', 'Screen Center', 0.5],
                  ['top', 'Top Header', 0.16]
                ].map(([posVal, label, yCoord]: any) => (
                  <button
                    key={posVal}
                    type="button"
                    onClick={() => {
                      onUpdate('captionPosition', posVal);
                      onUpdate('captionY', yCoord);
                    }}
                    className={`rounded-lg py-2 text-center font-bold cursor-pointer transition ${
                      settings.captionPosition === posVal
                        ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                        : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal & Vertical Sliders */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Horizontal Center (X)
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {Math.round(settings.captionX * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.01"
                value={settings.captionX}
                disabled={settings.captionLocked}
                onChange={(e) => onUpdate('captionX', Number(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-400 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Vertical Height (Y)
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {Math.round(settings.captionY * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.08"
                max="0.92"
                step="0.01"
                value={settings.captionY}
                disabled={settings.captionLocked}
                onChange={(e) => onUpdate('captionY', Number(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-400 disabled:opacity-40"
              />
            </div>

            {/* Max Caption Width */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Max Caption Width
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {Math.round(settings.captionWidth * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.98"
                step="0.02"
                value={settings.captionWidth}
                onChange={(e) => onUpdate('captionWidth', Number(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />
            </div>

            {/* Center Snap & Reset */}
            <div className="pt-1 space-y-2">
              <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 shadow-sm cursor-pointer">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Snap to Center Guides
                </span>
                <input
                  type="checkbox"
                  checked={settings.snapToCenter}
                  onChange={(e) => onUpdate('snapToCenter', e.target.checked)}
                  className="rounded accent-indigo-600 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  onUpdate('captionX', 0.5);
                  onUpdate('captionY', 0.83);
                  onUpdate('captionWidth', 0.88);
                  onUpdate('captionPosition', 'bottom');
                }}
                className="w-full rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-700 transition cursor-pointer"
              >
                Reset Position to Center Bottom
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 6: SAVED LOOKS MANAGER
            ========================================== */}
        {activeTab === 'saved' && (
          <div className="space-y-3.5">
            {/* Save Current Style Form */}
            <div className="space-y-2 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Save Current Look
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPresetName}
                  onChange={(e) => setCustomPresetName(e.target.value)}
                  placeholder="e.g. My Podcast Look"
                  className="flex-1 rounded-xl border border-studio-border bg-white dark:bg-studio-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customPresetName.trim()) {
                      onSavePreset(customPresetName.trim());
                      setCustomPresetName('');
                    }
                  }}
                  disabled={!customPresetName.trim()}
                  className="flex items-center gap-1 rounded-xl bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-xs font-bold disabled:opacity-40 shadow-sm cursor-pointer"
                >
                  <BookmarkPlus className="h-4 w-4" /> Save
                </button>
              </div>
            </div>

            {/* List of Saved Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Your Saved Custom Looks ({savedPresets.length})
              </span>
              {savedPresets.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {saved.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {saved.settings.fontFamily} · {saved.settings.animationStyle}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLoadSavedPreset(saved)}
                      className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedPreset(saved.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {savedPresets.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No saved custom looks yet. Customize typography & effects above and save your favorite styles.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
