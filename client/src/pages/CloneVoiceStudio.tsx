import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Mic, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Volume2, 
  ArrowRight, 
  Cpu, 
  Zap, 
  Layers, 
  Music, 
  CheckCircle2, 
  Activity,
  Download,
  AlertCircle
} from 'lucide-react';
import { Voice } from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface CloneVoiceStudioProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  onSaveCustomVoice?: (voice: Voice) => void;
  onDeleteCustomVoice?: (voiceId: string) => void;
  onOpenCloneModal: () => void;
  onAudioPlay?: (url: string, showBottomBar?: boolean) => void;
  onAudioPause?: () => void;
  onSendToScriptStudio?: (text: string, voice: Voice) => void;
}

export const CloneVoiceStudio: React.FC<CloneVoiceStudioProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onDeleteCustomVoice,
  onOpenCloneModal,
  onAudioPlay,
  onAudioPause,
  onSendToScriptStudio
}) => {
  // Filter all custom and cloned voices
  const clonedVoices = useMemo(() => {
    return (voices || []).filter(
      (v) => v && (v.isCustom || v.isCloned || (v.id && v.id.startsWith('kokoro_cloned_')) || (v.tags && v.tags.some(t => t && t.toLowerCase().includes('clone'))))
    );
  }, [voices]);

  // Quick test synthesis state
  const [testText, setTestText] = useState(
    "Hello! I am your cloned character voice. I can read scripts, voice animations, and perform dialogue with my custom timbre."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active voice for testing
  const activeTestVoice = useMemo(() => {
    if (selectedVoice && (selectedVoice.isCustom || selectedVoice.isCloned || (selectedVoice.id && selectedVoice.id.startsWith('kokoro_cloned_')))) {
      return selectedVoice;
    }
    return clonedVoices.length > 0 ? clonedVoices[0] : selectedVoice;
  }, [selectedVoice, clonedVoices]);

  // Auto-adapt test prompt text to the active character voice's language
  useEffect(() => {
    if (!activeTestVoice) return;
    const lang = (activeTestVoice.language || '').toLowerCase();
    const isDefault = !testText || 
      testText.includes("Hello! I am your cloned character voice") || 
      testText.includes("नमस्ते! मैं आपकी क्लोन") ||
      testText.includes("السلام علیکم! میں آپ کا کلون");
    
    if (isDefault) {
      if (lang.includes('hindi')) {
        setTestText("नमस्ते! मैं आपकी क्लोन की गई आवाज़ हूँ। मैं हिंदी में कहानियाँ और संवाद बोल सकता हूँ।");
      } else if (lang.includes('urdu')) {
        setTestText("السلام علیکم! میں آپ کا کلون کیا ہوا وائس اوور ہوں۔ میں اردو میں کسی भी اسکرپٹ کو پڑھ سکتا ہوں۔");
      } else if (lang.includes('spanish')) {
        setTestText("¡Hola! Soy tu voz clonada de personaje. Puedo leer guiones, narraciones y doblajes en español.");
      } else {
        setTestText("Hello! I am your cloned character voice. I can read scripts, voice animations, and perform dialogue with my custom timbre.");
      }
    }
  }, [activeTestVoice?.id, activeTestVoice?.language]);

  const handleGenerateTest = async () => {
    if (!activeTestVoice) {
      setError('Please select or clone a character voice first.');
      return;
    }
    if (!testText.trim()) {
      setError('Please enter some text to synthesize.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Synthesize character voice via OpenSource TTS API
      const result = await ApiClient.generateOpenSourceTTS({
        text: testText,
        voiceId: activeTestVoice.id,
        speechSpeed: 1.0,
        format: 'mp3'
      });
      setGeneratedAudioUrl(result.audioUrl);
      if (onAudioPlay) {
        onAudioPlay(result.audioUrl, false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to synthesize test audio.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayVoiceSample = (audioUrl?: string) => {
    if (!audioUrl) return;
    if (currentPlayingUrl === audioUrl) {
      setCurrentPlayingUrl(null);
      if (onAudioPause) onAudioPause();
    } else {
      if (window.__voiceforge_pause_all_audio) {
        window.__voiceforge_pause_all_audio();
      }
      setCurrentPlayingUrl(audioUrl);
      if (onAudioPlay) onAudioPlay(audioUrl, false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header matching Script Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Clone Voice Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              AI Voice Cloning
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            ZERO-SHOT NEURAL VOICE CLONING & CUSTOM TIMBRE PROFILES
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCloneModal}
            className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Clone New Voice</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid matching Script Studio panel tokens */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-studio-900 border border-studio-border flex items-center gap-3 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white uppercase">100% Free & Unlimited</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Offline Kokoro-82M synthesis</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-studio-900 border border-studio-border flex items-center gap-3 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white uppercase">Acoustic Pitch Matching</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Autocorrelation & Timbre Extraction</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-studio-900 border border-studio-border flex items-center gap-3 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white uppercase">Multi-Studio Ready</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Export to Script Studio & Dubbing</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Cloned Voices Library, Right is Interactive Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Cloned Voices Library (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-studio-border pb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                Your Cloned Characters ({clonedVoices.length})
              </h2>
            </div>
            <button
              onClick={onOpenCloneModal}
              className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Clone New</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {clonedVoices.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-studio-border bg-slate-50/50 dark:bg-studio-850/50 p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
                  No cloned voices yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Upload an audio file or speak into your microphone to create your first custom AI character voice.
                </p>
              </div>
              <button
                onClick={onOpenCloneModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Clone First Character</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {clonedVoices.map((voice) => {
                const isSelected = activeTestVoice?.id === voice.id;
                const isKokoroCloned = voice.id.startsWith('kokoro_cloned_') || voice.engine === 'kokoro';

                return (
                  <div
                    key={voice.id}
                    onClick={() => onSelectVoice(voice)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-white dark:bg-studio-900 border-studio-border hover:border-amber-500/50 hover:bg-slate-50/60 dark:hover:bg-studio-850/60'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{isKokoroCloned ? 'Neural Cloned' : 'Custom Cloned'}</span>
                        </span>
                        
                        {voice.gender && (
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {voice.gender}
                          </span>
                        )}
                      </div>

                      {/* Voice Name */}
                      <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white truncate">
                        {voice.name || (voice as any).title || 'Custom Character'}
                      </h3>
                      {voice.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {voice.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions & Controls */}
                    <div className="pt-2 border-t border-studio-border/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {((voice as any).previewAudioUrl || (voice as any).sampleAudioUrl) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayVoiceSample((voice as any).previewAudioUrl || (voice as any).sampleAudioUrl);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white transition"
                            title="Play sample reference"
                          >
                            {currentPlayingUrl === ((voice as any).previewAudioUrl || (voice as any).sampleAudioUrl) ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {voice.language || 'English'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onDeleteCustomVoice && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete cloned voice "${voice.name || (voice as any).title || 'this voice'}"?`)) {
                                onDeleteCustomVoice(voice.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                            title="Delete this cloned voice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVoice(voice);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-studio-700'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Character Voice Cloning Tips Card */}
          <div className="rounded-2xl border border-studio-border bg-slate-50 dark:bg-studio-900/60 p-5 space-y-3">
            <h4 className="font-serif font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Pro Tips for Character Voice Cloning</span>
            </h4>
            <ul className="text-xs font-sans text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li><strong>Clean Audio:</strong> Use samples with minimal background music or room reverberation.</li>
              <li><strong>Length:</strong> 5 to 15 seconds of steady, expressive speech yields the highest fidelity.</li>
              <li><strong>Natural Delivery:</strong> Provide audio that highlights the character's signature pitch and emotional inflection.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live Interactive Voice Playground (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-studio-900 border border-studio-border shadow-sm space-y-5">
            <div className="border-b border-studio-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  <span>Instant Character Tester</span>
                </h3>
                <p className="text-xs font-mono text-slate-500 uppercase mt-0.5">
                  Kokoro-82M Offline Neural Synthesis
                </p>
              </div>

              {activeTestVoice && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
                  Ready
                </span>
              )}
            </div>

            {/* Currently Active Voice Indicator */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-studio-850 border border-studio-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                  {((activeTestVoice?.name || (activeTestVoice as any)?.title || 'C').charAt(0)).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Active Voice</span>
                    {activeTestVoice?.language && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 uppercase">
                        {activeTestVoice.language}
                      </span>
                    )}
                  </div>
                  <div className="font-serif font-bold text-sm text-slate-900 dark:text-white">
                    {activeTestVoice?.name || (activeTestVoice as any)?.title || 'No voice selected'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCloneModal}
                className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Change / Clone
              </button>
            </div>

            {/* Test Script Input & Multilingual Sample Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Script Text
                </label>
                <span className="text-[10px] text-slate-400 font-normal">{testText.length} chars</span>
              </div>

              {/* Language Sample Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase mr-0.5">Quick Samples:</span>
                <button
                  type="button"
                  onClick={() => setTestText("नमस्ते! मैं आपकी क्लोन की गई आवाज़ हूँ। मैं हिंदी में कहानियाँ और संवाद बोल सकता हूँ।")}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-studio-800 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 text-[10px] font-mono font-medium transition"
                >
                  🇮🇳 Hindi
                </button>
                <button
                  type="button"
                  onClick={() => setTestText("السلام علیکم! میں آپ کا کلون کیا ہوا وائس اوور ہوں۔ میں اردو میں کسی بھی اسکرپٹ کو پڑھ سکتا ہوں۔")}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-studio-800 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 text-[10px] font-mono font-medium transition"
                >
                  🇵🇰 Urdu
                </button>
                <button
                  type="button"
                  onClick={() => setTestText("Hello! I am your cloned character voice. I can read scripts, voice animations, and perform dialogue.")}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-studio-800 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 text-[10px] font-mono font-medium transition"
                >
                  🇺🇸 English
                </button>
                <button
                  type="button"
                  onClick={() => setTestText("¡Hola! Soy tu voz clonada de personaje. Puedo leer guiones, narraciones y doblajes en español.")}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-studio-800 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 text-[10px] font-mono font-medium transition"
                >
                  🇪🇸 Spanish
                </button>
              </div>

              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={4}
                className="w-full p-3 rounded-xl border border-studio-border bg-white dark:bg-studio-950 text-slate-900 dark:text-white font-sans text-xs focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-hidden transition resize-none"
                placeholder="Type anything for your character to say..."
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateTest}
              disabled={isGenerating || !activeTestVoice}
              className={`w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition ${
                isGenerating || !activeTestVoice
                  ? 'bg-slate-200 dark:bg-studio-800 text-slate-400 cursor-not-allowed'
                  : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Cloned Voice...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Generate Character Speech</span>
                </>
              )}
            </button>

            {/* Audio Result & Player */}
            {generatedAudioUrl && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800 dark:text-amber-200 uppercase">
                    <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Generated Audio Preview</span>
                  </div>
                  <a
                    href={generatedAudioUrl}
                    download="character_speech.mp3"
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition"
                    title="Download audio"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                <audio
                  src={generatedAudioUrl}
                  controls
                  className="w-full h-10 accent-amber-500 rounded-lg"
                  onPlay={() => {
                    if (onAudioPause) onAudioPause();
                  }}
                />

                {onSendToScriptStudio && activeTestVoice && (
                  <button
                    onClick={() => onSendToScriptStudio(testText, activeTestVoice)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                  >
                    <span>Use in Script Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloneVoiceStudio;
