import React, { useState, useRef } from 'react';
import { X, Sparkles, Loader2, Play, Pause, BookmarkPlus, Check, Volume2, AlertCircle, Wand2 } from 'lucide-react';
import { Voice, VoiceDesignCandidate } from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface VoiceDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceSaved: (voice: Voice) => void;
}

const INSTRUCTION_PRESETS = [
  {
    title: 'Cinematic Documentary',
    prompt: 'Deep, resonant, dramatic male voice with steady measured breathing, ideal for historical documentaries and mysteries.'
  },
  {
    title: 'True Crime Detective',
    prompt: 'Low-pitched, suspenseful male narrator with an investigative, gravelly edge.'
  },
  {
    title: 'Modern Tech Reviewer',
    prompt: 'Crisp, articulate female voice with youthful energy and natural, modern pacing.'
  },
  {
    title: 'Wise Ancient Storyteller',
    prompt: 'Elderly storyteller voice, warm, slightly raspy, with gentle pauses and deep emotional nuance.'
  }
];

export const VoiceDesignModal: React.FC<VoiceDesignModalProps> = ({
  isOpen,
  onClose,
  onVoiceSaved
}) => {
  const [instruction, setInstruction] = useState('');
  const [referenceText, setReferenceText] = useState("In the deepest part of the ocean, secrets await those bold enough to listen.");
  const [language, setLanguage] = useState('en');
  const [candidatesCount, setCandidatesCount] = useState(2);
  const [speed, setSpeed] = useState(1.0);

  const [isDesigning, setIsDesigning] = useState(false);
  const [candidates, setCandidates] = useState<VoiceDesignCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio Playback
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Saving state
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedCandidates, setSavedCandidates] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) {
      setError('Please provide a voice design prompt describing the voice.');
      return;
    }

    try {
      setIsDesigning(true);
      setError(null);
      setCandidates([]);
      setSavedCandidates(new Set());

      const res = await ApiClient.designVoice({
        instruction: instruction.trim(),
        reference_text: referenceText.trim() || undefined,
        language: language.trim() || undefined,
        n: candidatesCount,
        speed
      });

      setCandidates(res.candidates || []);
    } catch (err: any) {
      setError(err.message || 'Voice design failed.');
    } finally {
      setIsDesigning(false);
    }
  };

  const handleTogglePlay = (candidate: VoiceDesignCandidate) => {
    if (!candidate.audioUrl) return;

    if (activeCandidateId === candidate.id && isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(candidate.audioUrl);
    audioRef.current = audio;
    setActiveCandidateId(candidate.id);
    setIsPlaying(true);

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);

    audio.play().catch(() => setIsPlaying(false));
  };

  const handleSaveCandidateAsVoice = async (cand: VoiceDesignCandidate, index: number) => {
    try {
      setSavingIndex(index);
      setError(null);

      // Fetch the generated candidate audio from audioUrl as blob to clone it into a permanent model
      const audioRes = await fetch(cand.audioUrl);
      const audioBlob = await audioRes.blob();

      const shortTitle = instruction.slice(0, 30).trim() + ` (Candidate ${index + 1})`;
      const file = new File([audioBlob], `designed_voice_${index + 1}.mp3`, { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('title', shortTitle);
      formData.append('description', instruction);
      formData.append('text', referenceText);
      formData.append('category', 'Cinematic');
      formData.append('gender', 'Neutral');
      formData.append('language', language);
      formData.append('style', 'AI Designed Voice');
      formData.append('tags', JSON.stringify(['voice-design', 'ai']));

      const res = await ApiClient.cloneVoice(formData);
      setSavedCandidates((prev) => new Set([...prev, index]));
      onVoiceSaved(res.voice);
    } catch (err: any) {
      setError('Failed to save designed voice: ' + err.message);
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-border flex items-center justify-between bg-slate-50 dark:bg-studio-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Voice Design Studio</h2>
              <p className="text-xs text-slate-500 font-mono">Fish Audio Prompt-to-Voice Generation (/v1/voice-design)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleGenerate} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Inspiration Prompts
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INSTRUCTION_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInstruction(p.prompt)}
                  className="text-left p-2.5 rounded-lg border border-studio-border bg-slate-50/60 dark:bg-studio-950/40 hover:border-slate-400 dark:hover:border-slate-600 transition"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.title}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Instruction Prompt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Describe the Voice in Natural Language *
            </label>
            <textarea
              rows={3}
              required
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. A warm, engaging 30-year-old male narrator with a slight Scottish accent, clear articulation, and cinematic depth."
              className="w-full text-xs p-3 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>

          {/* Reference sentence for preview */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Audition Script (Sample sentence the designed voice will speak)
            </label>
            <input
              type="text"
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>

          {/* Advanced Controls: Candidates, Speed, Language */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Candidates
              </label>
              <select
                value={candidatesCount}
                onChange={(e) => setCandidatesCount(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              >
                <option value={1}>1 Candidate</option>
                <option value={2}>2 Candidates</option>
                <option value={3}>3 Candidates</option>
                <option value={4}>4 Candidates</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Speed Multiplier ({speed}x)
              </label>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Language Hint
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              >
                <option value="en">English (en)</option>
                <option value="zh">Chinese (zh)</option>
                <option value="ja">Japanese (ja)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={isDesigning || !instruction.trim()}
            className="w-full py-2.5 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDesigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Voice Candidates with Fish Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Voice Candidates</span>
              </>
            )}
          </button>

          {/* Generated Candidates Results */}
          {candidates.length > 0 && (
            <div className="pt-3 border-t border-studio-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Audition Generated Candidates
              </h3>
              <div className="space-y-2.5">
                {candidates.map((cand, idx) => {
                  const isPlayingThis = isPlaying && activeCandidateId === cand.id;
                  const isSaved = savedCandidates.has(idx);
                  const isSavingThis = savingIndex === idx;

                  return (
                    <div
                      key={cand.id || idx}
                      className="p-3.5 rounded-xl border border-studio-border bg-slate-50/70 dark:bg-studio-950/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePlay(cand)}
                          className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-sm"
                        >
                          {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Candidate #{idx + 1}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            "{referenceText}"
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveCandidateAsVoice(cand, idx)}
                        disabled={isSaved || isSavingThis}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                          isSaved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                        }`}
                      >
                        {isSavingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isSaved ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <BookmarkPlus className="w-3.5 h-3.5" />
                        )}
                        <span>{isSaved ? 'Saved as Voice' : 'Save as Custom Voice'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
