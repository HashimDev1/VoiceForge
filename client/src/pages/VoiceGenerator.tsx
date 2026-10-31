import React, { useState } from 'react';
import { Voice } from '../../../shared/src/types';
import { VoiceSelector } from '../components/VoiceSelector';
import { CommunityVoiceBrowser } from '../components/CommunityVoiceBrowser';
import { VoiceCloneModal } from '../components/VoiceCloneModal';
import { VoiceDesignModal } from '../components/VoiceDesignModal';
import { Mic, Globe, Sparkles, Wand2, Plus } from 'lucide-react';

interface VoiceGeneratorProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  onAudioPlay: (url: string, showBottomBar?: boolean) => void;
  onAudioPause?: () => void;
  currentAudioUrl?: string | null;
  isPlaying?: boolean;
  onSaveCustomVoice?: (voice: Voice) => void;
  onDeleteCustomVoice?: (voiceId: string) => void;
}

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onAudioPlay,
  onAudioPause,
  currentAudioUrl,
  isPlaying,
  onSaveCustomVoice,
  onDeleteCustomVoice
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'my-voices' | 'community'>('my-voices');
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [designModalOpen, setDesignModalOpen] = useState(false);

  const savedVoiceIds = new Set(voices.map((v) => v.id));

  const handleVoiceCreated = (newVoice: Voice) => {
    if (onSaveCustomVoice) {
      onSaveCustomVoice(newVoice);
    }
    onSelectVoice(newVoice);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Quick Action CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Fish Audio Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Fish Audio V1.4
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            PRESET NARRATORS • ZERO-SHOT CLONING • COMMUNITY VOICES • AI VOICE DESIGN
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCloneModalOpen(true)}
            className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black rounded-xl hover:opacity-90 transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clone Voice</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignModalOpen(true)}
            className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl border border-studio-border transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Design Voice</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-studio-border pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('my-voices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'my-voices'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>My Voices & Presets ({voices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('community')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'community'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Explore Community Voices</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="glass-panel rounded-2xl p-6 border border-studio-border shadow-sm bg-white dark:bg-studio-900">
        {activeSubTab === 'my-voices' ? (
          <VoiceSelector
            voices={voices}
            selectedVoice={selectedVoice}
            onSelectVoice={onSelectVoice}
            onAudioPlay={onAudioPlay}
            onAudioPause={onAudioPause}
            currentAudioUrl={currentAudioUrl}
            isPlaying={isPlaying}
            onSaveCustomVoice={onSaveCustomVoice}
            onDeleteCustomVoice={onDeleteCustomVoice}
          />
        ) : (
          <CommunityVoiceBrowser
            onSelectVoice={onSelectVoice}
            onSaveCustomVoice={onSaveCustomVoice}
            savedVoiceIds={savedVoiceIds}
          />
        )}
      </div>

      {/* Modals */}
      <VoiceCloneModal
        isOpen={cloneModalOpen}
        onClose={() => setCloneModalOpen(false)}
        onVoiceCreated={handleVoiceCreated}
      />

      <VoiceDesignModal
        isOpen={designModalOpen}
        onClose={() => setDesignModalOpen(false)}
        onVoiceSaved={handleVoiceCreated}
      />
    </div>
  );
};

export default VoiceGenerator;
