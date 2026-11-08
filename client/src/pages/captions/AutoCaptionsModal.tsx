import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Languages,
  Layers,
  Wand2,
  Check,
  Type,
  Zap,
  Loader2,
  FileText
} from 'lucide-react';
import { CAPTION_PRESETS } from '@shared/captionPresets';

interface AutoCaptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: {
    language: string;
    maxWords: number;
    presetId: string;
    wordHighlight: boolean;
    uppercase: boolean;
    customTranscript?: string;
  }) => void;
  isGenerating: boolean;
  generatingStage: string;
  initialLanguage?: string;
  initialMaxWords?: number;
  initialPresetId?: string;
}

const LANGUAGES = [
  { code: '', label: '✨ Auto-Detect (Multilingual AI)' },
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'ur_roman', label: 'Urdu Roman (English alphabet)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'hi_roman', label: 'Hinglish / Roman Hindi' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'pt', label: 'Portuguese (Português)' },
];

const WORD_COUNT_PRESETS = [
  { count: 1, label: '1 Word', desc: 'Punchy TikTok single word' },
  { count: 2, label: '2 Words', desc: 'Fast dynamic rhythm' },
  { count: 3, label: '3 Words', desc: '⭐ CapCut Default (Viral Shorts)', popular: true },
  { count: 4, label: '4 Words', desc: 'Balanced readability' },
  { count: 6, label: '6 Words', desc: 'Storytelling phrases' },
  { count: 20, label: 'Full Sentence', desc: 'Natural narrative flow' },
];

const TOP_LOOKS = [
  { id: 'doc_clean', name: 'Documentary White', color: '#FFFFFF', highlight: '#38BDF8' },
  { id: 'tiktok_yellow', name: 'TikTok Bold Yellow', color: '#FDE047', highlight: '#FFFFFF' },
  { id: 'hormozi_bold', name: 'Hormozi Punch', color: '#22C55E', highlight: '#FDE047' },
  { id: 'cyber_glow', name: 'Neon Cyber Glow', color: '#06B6D4', highlight: '#EC4899' },
  { id: 'beast_pop', name: 'MrBeast Pop', color: '#F97316', highlight: '#FACC15' },
  { id: 'cinema_gold', name: 'Cinema Gold', color: '#EAB308', highlight: '#FFFFFF' },
];

export const AutoCaptionsModal: React.FC<AutoCaptionsModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  generatingStage,
  initialLanguage = '',
  initialMaxWords = 3,
  initialPresetId = 'doc_clean',
}) => {
  const [language, setLanguage] = useState(initialLanguage);
  const [maxWords, setMaxWords] = useState(initialMaxWords);
  const [presetId, setPresetId] = useState(initialPresetId);
  const [wordHighlight, setWordHighlight] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [customTranscript, setCustomTranscript] = useState('');
  const [showCustomTranscript, setShowCustomTranscript] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLanguage(initialLanguage);
      setMaxWords(initialMaxWords);
      setPresetId(initialPresetId);
    }
  }, [isOpen, initialLanguage, initialMaxWords, initialPresetId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      language,
      maxWords,
      presetId,
      wordHighlight,
      uppercase,
      customTranscript: showCustomTranscript ? customTranscript : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-2xl p-6 sm:p-7 overflow-hidden transition-all text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-studio-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-extrabold tracking-tight">
                  Auto Captions
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                  CapCut Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transcribe speech across the entire video into animated word chunks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* 1. Language Selection */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-500" />
                Spoken Language
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Auto-detection supported
              </span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Caption Length / Words Per Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Words Per Caption (Display Length)
              </label>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {maxWords >= 16 ? 'Full Sentence' : `${maxWords} Words on Screen`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WORD_COUNT_PRESETS.map((p) => {
                const isSelected = maxWords === p.count;
                return (
                  <button
                    key={p.count}
                    type="button"
                    onClick={() => setMaxWords(p.count)}
                    disabled={isGenerating}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-indigo-600 text-white shadow-2xs">
                        CapCut
                      </span>
                    )}
                    <div className="font-mono text-xs font-bold flex items-center justify-between">
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Subtitle Look / Template Preview */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
              Starting Style Look
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOP_LOOKS.map((look) => {
                const isSelected = presetId === look.id;
                return (
                  <button
                    key={look.id}
                    type="button"
                    onClick={() => setPresetId(look.id)}
                    disabled={isGenerating}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center space-x-2.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: look.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold truncate block">
                        {look.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Motion Options Checkboxes */}
          <div className="pt-2 border-t border-studio-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wordHighlight}
                onChange={(e) => setWordHighlight(e.target.checked)}
                disabled={isGenerating}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Word-by-word active spotlight
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                disabled={isGenerating}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ALL CAPS (Reels & Shorts style)
              </span>
            </label>
          </div>

          {/* Optional: Paste Transcript / Script Accordion */}
          <div className="pt-2 border-t border-studio-border">
            <button
              type="button"
              onClick={() => setShowCustomTranscript(!showCustomTranscript)}
              className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Or paste your script / dialogue text directly (Optional)</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-500">
                {showCustomTranscript ? 'Hide' : '+ Paste Text'}
              </span>
            </button>

            {showCustomTranscript && (
              <div className="mt-2 space-y-1">
                <textarea
                  value={customTranscript}
                  onChange={(e) => setCustomTranscript(e.target.value)}
                  placeholder="Paste dialogue or narration text here. Words will be auto-divided into 3-word animated chunks across the video timeline..."
                  rows={3}
                  className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 resize-none"
                />
                <p className="text-[10px] text-slate-400">
                  Ideal for videos with low speech volume or background music.
                </p>
              </div>
            )}
          </div>

          {/* Footer Submit Button */}
          <div className="pt-3 border-t border-studio-border flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-mono font-semibold rounded-xl border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-2.5 text-xs font-mono font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{generatingStage || 'Transcribing Speech...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Generate Auto Captions ({maxWords >= 16 ? 'Full' : `${maxWords} Words`})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
