import React, { useState } from 'react';
import { Voice, VoiceCategory } from '../../../shared/src/types';
import { Play, Volume2, Check, Sparkles, Plus, Info, Edit3, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { ApiClient } from '../services/api';

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  onAudioPlay: (url: string) => void;
  onSaveCustomVoice?: (voice: Voice) => void;
  onDeleteCustomVoice?: (voiceId: string) => void;
  compact?: boolean;
}

const CATEGORIES: (VoiceCategory | 'My Custom Voices' | 'All')[] = [
  'All',
  'My Custom Voices',
  'Documentary',
  'Storytelling',
  'News',
  'Educational',
  'Motivational',
  'Deep',
  'Calm',
  'Energetic',
  'Cinematic'
];

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onAudioPlay,
  onSaveCustomVoice,
  onDeleteCustomVoice,
  compact = false
}) => {
  const [activeCategory, setActiveCategory] = useState<VoiceCategory | 'My Custom Voices' | 'All'>('All');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showAllVoices, setShowAllVoices] = useState<boolean>(false);
  
  // Custom Voice Modal State (for creating or editing)
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
  const [customRefId, setCustomRefId] = useState<string>('');
  const [customVoiceName, setCustomVoiceName] = useState<string>('');

  const filteredVoices = voices.filter((v) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'My Custom Voices') return v.isCustom;
    return v.category === activeCategory;
  });

  // Display only first 4 cards by default, or all if expanded
  const displayedVoices = showAllVoices ? filteredVoices : filteredVoices.slice(0, 4);

  const handleGeneratePreview = async (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setPreviewingId(voice.id);
      const res = await ApiClient.generatePreview(voice.id);
      if (res.audioUrl) {
        onAudioPlay(res.audioUrl);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate preview audio.');
    } finally {
      setPreviewingId(null);
    }
  };

  const openNewVoiceModal = () => {
    setEditingVoiceId(null);
    setCustomVoiceName('');
    setCustomRefId('');
    setShowAddCustomModal(true);
  };

  const openEditVoiceModal = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVoiceId(voice.id);
    setCustomVoiceName(voice.name);
    setCustomRefId(voice.id);
    setShowAddCustomModal(true);
  };

  const handleSaveCustomVoice = () => {
    if (!customRefId.trim() || !customVoiceName.trim()) {
      alert('Please enter both Voice Name and Fish Audio Reference ID.');
      return;
    }

    const voiceObj: Voice = {
      id: customRefId.trim(),
      name: customVoiceName.trim(),
      language: 'English',
      style: 'Custom Reference',
      gender: 'Neutral',
      description: 'Saved Fish Audio reference ID model.',
      category: 'Documentary',
      isCustom: true
    };

    if (onSaveCustomVoice) {
      onSaveCustomVoice(voiceObj);
    } else {
      onSelectVoice(voiceObj);
    }

    setCustomRefId('');
    setCustomVoiceName('');
    setEditingVoiceId(null);
    setShowAddCustomModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-studio-border pb-3">
        <div>
          <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-500" />
            <span>Narrator Voice.</span>
          </h3>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            PRESETS & SAVED REFERENCE MODELS
          </p>
        </div>

        <button
          onClick={openNewVoiceModal}
          className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:opacity-95 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Ref ID</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setShowAllVoices(false);
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition cursor-pointer ${
              activeCategory === cat
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white border border-studio-border hover:border-black dark:hover:border-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Voice Cards Grid */}
      <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"}>
        {displayedVoices.map((voice) => {
          const isSelected = selectedVoice.id === voice.id;
          const isPreviewing = previewingId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative ${
                isSelected
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md ring-2 ring-black/10 dark:ring-white/20'
                  : 'bg-white dark:bg-studio-900 border-studio-border hover:border-black dark:hover:border-white text-slate-900 dark:text-slate-100 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className={`font-serif font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white dark:text-black' : 'text-slate-900 dark:text-white'}`}>
                      {voice.name}
                    </span>
                    {voice.isCustom && (
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                          : 'bg-black text-white dark:bg-white dark:text-black'
                      }`}>
                        Saved
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-white text-black dark:bg-black dark:text-white flex items-center justify-center text-xs shadow-sm shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-2.5 font-mono">
                  <span className={`px-2 py-0.5 rounded-md border text-center ${
                    isSelected ? 'bg-white/10 border-white/20 text-white dark:bg-black/10 dark:border-black/20 dark:text-black' : 'bg-slate-100 dark:bg-studio-800 border-studio-border text-slate-700 dark:text-slate-300'
                  }`}>
                    {voice.language}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-center ${
                    isSelected ? 'bg-white/10 border-white/20 text-white dark:bg-black/10 dark:border-black/20 dark:text-black' : 'bg-slate-100 dark:bg-studio-800 border-studio-border text-slate-700 dark:text-slate-300'
                  }`}>
                    {voice.style}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-center ${
                    isSelected ? 'bg-white/10 border-white/20 text-white dark:bg-black/10 dark:border-black/20 dark:text-black' : 'bg-slate-100 dark:bg-studio-800 border-studio-border text-slate-700 dark:text-slate-300'
                  }`}>
                    {voice.gender}
                  </span>
                </div>

                <p className={`text-[11px] line-clamp-2 leading-relaxed mb-3 ${
                  isSelected ? 'text-slate-200 dark:text-slate-700' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {voice.description}
                </p>
              </div>

              <div className={`flex items-center justify-between pt-2.5 border-t gap-2 ${
                isSelected ? 'border-white/20 dark:border-black/20' : 'border-studio-border/60'
              }`}>
                <span className={`text-[9px] font-mono truncate min-w-0 flex-1 ${
                  isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500'
                }`} title={voice.id}>
                  ID: {voice.id}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {voice.isCustom && (
                    <>
                      <button
                        onClick={(e) => openEditVoiceModal(voice, e)}
                        className={`p-1.5 rounded-lg transition ${isSelected ? 'text-white hover:bg-white/20 dark:text-black dark:hover:bg-black/10' : 'text-slate-500 hover:text-black hover:bg-slate-100 dark:hover:bg-studio-800'}`}
                        title="Edit & Save Again"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteCustomVoice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete custom voice "${voice.name}"?`)) {
                              onDeleteCustomVoice(voice.id);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition ${isSelected ? 'text-rose-300 hover:bg-rose-500/20' : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
                          title="Delete saved voice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={(e) => handleGeneratePreview(voice, e)}
                    disabled={isPreviewing}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 border transition shrink-0 ${
                      isSelected
                        ? 'bg-white text-black dark:bg-black dark:text-white border-white dark:border-black shadow-sm'
                        : 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm hover:opacity-90'
                    }`}
                  >
                    {isPreviewing ? (
                      <Sparkles className="w-3 h-3 animate-spin text-white dark:text-black" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                    <span>{isPreviewing ? '...' : 'Preview'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More / Show All Voices Option */}
      {filteredVoices.length > 4 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAllVoices((prev) => !prev)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-studio-850 hover:bg-slate-200 dark:hover:bg-studio-800 text-slate-800 dark:text-slate-200 border border-studio-border hover:border-black dark:hover:border-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {showAllVoices ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Show Less (Show 4)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Show All Voices ({filteredVoices.length - 4} More)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Add / Edit Custom Voice Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Save className="w-5 h-5 text-black dark:text-white" />
              <span>{editingVoiceId ? 'Edit & Save Reference ID' : 'Save Custom Reference ID'}</span>
            </h3>

            <div className="bg-slate-100 dark:bg-studio-850 p-3 rounded-2xl border border-studio-border text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
              <p>
                Save your cloned model <code className="text-black dark:text-white font-mono bg-white dark:bg-studio-800 px-1 py-0.5 rounded border border-studio-border">reference_id</code>. It will stay saved in your studio.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Voice Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Cinematic Voiceover"
                  value={customVoiceName}
                  onChange={(e) => setCustomVoiceName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Fish Audio Reference ID</label>
                <input
                  type="text"
                  placeholder="e.g. 7f92f8afb8ec43bf81429cc1c9199cb1"
                  value={customRefId}
                  onChange={(e) => setCustomRefId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-studio-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-mono font-bold uppercase transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomVoice}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase shadow-md transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingVoiceId ? 'Update & Save' : 'Save Voice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
