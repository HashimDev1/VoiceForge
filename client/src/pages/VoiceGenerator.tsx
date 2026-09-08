import React from 'react';
import { Voice } from '../../../shared/src/types';
import { VoiceSelector } from '../components/VoiceSelector';
import { Mic, Sparkles } from 'lucide-react';

interface VoiceGeneratorProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  onAudioPlay: (url: string) => void;
}

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onAudioPlay
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="border-b border-studio-border pb-4">
        <h1 className="text-2xl font-serif font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Mic className="w-5 h-5 text-black dark:text-white" />
          <span>Fish Audio Voice Studio.</span>
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-0.5">
          PRESET NARRATORS & CLONED REFERENCE MODELS
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-studio-border shadow-sm bg-white dark:bg-studio-900">
        <VoiceSelector
          voices={voices}
          selectedVoice={selectedVoice}
          onSelectVoice={onSelectVoice}
          onAudioPlay={onAudioPlay}
        />
      </div>
    </div>
  );
};
