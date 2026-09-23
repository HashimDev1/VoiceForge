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
  onAudioPlay: (url: string) => void;
  onSaveCustomVoice?: (voice: Voice) => void;
  onDeleteCustomVoice?: (voiceId: string) => void;
}

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onAudioPlay,
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
      <div className="border-b border-studio-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-black dark:text-white" />
            <span>Fish Audio Voice Studio.</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-0.5">
            PRESET NARRATORS • ZERO-SHOT CLONING • COMMUNITY VOICES • AI VOICE DESIGN
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCloneModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded-xl hover:opacity-90 transition flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clone Voice</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-2 shadow-sm"
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
