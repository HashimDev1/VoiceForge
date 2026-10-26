import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Sparkles, 
  Loader2, 
  Volume2, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { Voice, VoiceCategory } from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCreated: (voice: Voice) => void;
}

export const LANGUAGE_OPTIONS = [
  { id: 'auto', name: 'Auto-Detect (Automatic Audio Analysis)', flag: '🌐' },
  { id: 'Hindi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { id: 'Urdu', name: 'Urdu (اردو)', flag: '🇵🇰' },
  { id: 'English', name: 'English (US / UK / Global)', flag: '🇺🇸' },
  { id: 'Spanish', name: 'Spanish (Español)', flag: '🇪🇸' },
  { id: 'French', name: 'French (Français)', flag: '🇫🇷' },
  { id: 'German', name: 'German (Deutsch)', flag: '🇩🇪' },
  { id: 'Japanese', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { id: 'Arabic', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { id: 'Chinese', name: 'Chinese (Mandarin 中文)', flag: '🇨🇳' },
  { id: 'Portuguese', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { id: 'Russian', name: 'Russian (Русский)', flag: '🇷🇺' },
  { id: 'Italian', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { id: 'Korean', name: 'Korean (한국어)', flag: '🇰🇷' },
  { id: 'Bengali', name: 'Bengali (বাংলা)', flag: '🇧🇩' },
  { id: 'Tamil', name: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { id: 'Turkish', name: 'Turkish (Türkçe)', flag: '🇹🇷' }
];

const CATEGORIES: VoiceCategory[] = [
  'Documentary',
  'Storytelling',
  'News',
  'Educational',
  'Motivational',
  'Deep',
  'Calm',
  'Energetic',
  'Cinematic',
  'Male',
  'Female'
];

export const VoiceCloneModal: React.FC<VoiceCloneModalProps> = ({
  isOpen,
  onClose,
  onVoiceCreated
}) => {
  const [engine, setEngine] = useState<'kokoro' | 'fish-audio'>('kokoro');
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VoiceCategory>('Storytelling');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Neutral'>('Male');
  const [language, setLanguage] = useState('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isDetectingLang, setIsDetectingLang] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  const [tags, setTags] = useState('character, clone, neural');

  // Status & Results
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clonedResult, setClonedResult] = useState<{ voice: Voice; acoustics?: any } | null>(null);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioPreviewUrl]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setError(null);
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i)) {
      setError('Please select a valid audio file (.mp3, .wav, .m4a, .ogg).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be under 25MB.');
      return;
    }

    setAudioFile(file);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);

    // Auto fill title if empty
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Automatically detect language from audio
    detectAudioLanguage(file);
  };

  const detectAudioLanguage = async (file: File) => {
    try {
      setIsDetectingLang(true);
      const formData = new FormData();
      formData.append('audio', file);
      const res = await ApiClient.transcribeAudio(formData);
      if (res && res.language) {
        setDetectedLanguage(res.language);
        if (language === 'auto' || language === 'English') {
          setLanguage(res.language);
        }
      }
      if (res && res.text && !referenceText) {
        setReferenceText(res.text);
      }
    } catch (e) {
      console.warn('Auto language detection skipped:', e);
    } finally {
      setIsDetectingLang(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(file);

        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        const url = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(url);

        stream.getTracks().forEach((track) => track.stop());

        // Auto detect language from recorded audio
        detectAudioLanguage(file);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or audio device not found.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioPreviewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioPreviewUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePreviewPlayback = (url: string) => {
    if (!previewAudioRef.current || previewAudioRef.current.src !== url) {
      previewAudioRef.current = new Audio(url);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
    }
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleAutoTranscribe = async () => {
    if (!audioFile) return;
    try {
      setIsTranscribing(true);
      setError(null);
      const formData = new FormData();
      formData.append('audio', audioFile);
      const res = await ApiClient.transcribeAudio(formData);
      if (res && res.text) {
        setReferenceText(res.text);
      }
    } catch (err: any) {
      setError('Transcription failed. You can type or leave it blank.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setError('Please provide reference character audio (5–30s clean speech works best).');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a character voice title.');
      return;
    }

    try {
      setIsCloning(true);
      setError(null);

      const finalLanguage = language === 'auto' ? (detectedLanguage || 'English') : language;

      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('title', title.trim());
      formData.append('engine', engine);
      if (description.trim()) formData.append('description', description.trim());
      if (referenceText.trim()) formData.append('text', referenceText.trim());
      formData.append('category', category);
      formData.append('gender', gender);
      formData.append('language', finalLanguage);
      formData.append('style', 'Cloned Character');
      formData.append('tags', JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)));

      const res = await ApiClient.cloneVoice(formData);

      setClonedResult({ voice: res.voice, acoustics: (res as any).acoustics });
      onVoiceCreated(res.voice);

      // If preview audio was returned, play it
      if (res.voice.previewAudioUrl) {
        togglePreviewPlayback(res.voice.previewAudioUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Character voice cloning failed.');
    } finally {
      setIsCloning(false);
    }
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-studio-border flex items-center justify-between bg-slate-50 dark:bg-studio-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Character Voice Cloner.</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                  ZERO-SHOT
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">Clone character voices with high fidelity and zero distortion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleCloneSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner & Generated Character Preview Card */}
          {clonedResult && (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Character "{clonedResult.voice.name}" successfully cloned!</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Done / Use in Studio
                </button>
              </div>

              {clonedResult.acoustics && (
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-white dark:bg-studio-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                  <div>
                    <span className="text-slate-400 block">Pitch (F0):</span>
                    <span className="font-bold text-slate-800 dark:text-white">{clonedResult.acoustics.pitchHz} Hz</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Vocal Profile:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{clonedResult.acoustics.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Timbre:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{clonedResult.acoustics.spectralCentroid} Hz</span>
                  </div>
                </div>
              )}

              {clonedResult.voice.previewAudioUrl && (
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-studio-900 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePreviewPlayback(clonedResult.voice.previewAudioUrl!)}
                      className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-700 transition"
                    >
                      {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />}
                    </button>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Generated Character Voice Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase">
                    Ready to Generate
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Engine Selection Strip */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Cloning AI Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEngine('kokoro')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  engine === 'kokoro'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500 shadow-sm'
                    : 'border-studio-border bg-slate-50 dark:bg-studio-850 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Kokoro Neural Cloner</span>
                  </div>
                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    100% FREE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Local offline acoustic matching & neural style adaptation. Unlimited characters, zero API fees.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEngine('fish-audio')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  engine === 'fish-audio'
                    ? 'border-black dark:border-white bg-slate-100 dark:bg-studio-800 ring-1 ring-black shadow-sm'
                    : 'border-studio-border bg-slate-50 dark:bg-studio-850 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Fish Audio Cloud</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-studio-750 text-slate-600 dark:text-slate-400">
                    API KEY
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Cloud zero-shot model creation. Requires Fish Audio API key and developer credits.
                </p>
              </button>
            </div>
          </div>

          {/* Reference Audio Source Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              2. Reference Character Audio (5–30s clean speech)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                  activeTab === 'upload'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                    : 'bg-slate-50 dark:bg-studio-800 border-studio-border text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Character Audio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                  activeTab === 'record'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                    : 'bg-slate-50 dark:bg-studio-800 border-studio-border text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Record with Microphone</span>
              </button>
            </div>

            {activeTab === 'upload' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-studio-border rounded-xl p-5 text-center bg-slate-50/50 dark:bg-studio-950/40 hover:bg-slate-50 dark:hover:bg-studio-900 transition cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                <Volume2 className="w-7 h-7 mx-auto text-indigo-500 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {audioFile ? audioFile.name : 'Click to select or drag & drop your character voice file'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports MP3, WAV, M4A, OGG up to 25MB (clean character voice with minimal music yields the best fidelity)
                </p>
              </div>
            )}

            {activeTab === 'record' && (
              <div className="border border-studio-border rounded-xl p-5 text-center bg-slate-50/50 dark:bg-studio-950/40 flex flex-col items-center justify-center">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition transform hover:scale-105"
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg animate-pulse"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </button>
                )}
                <div className="mt-3 text-xs font-mono text-slate-700 dark:text-slate-300">
                  {isRecording ? (
                    <span className="text-red-500 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Recording Character Voice... {formatSec(recordDuration)}
                    </span>
                  ) : audioFile ? (
                    `Recorded sample ready (${(audioFile.size / 1024).toFixed(1)} KB)`
                  ) : (
                    'Click microphone to record your character voice sample'
                  )}
                </div>
              </div>
            )}

            {/* Audio Preview Strip */}
            {audioPreviewUrl && (
              <div className="mt-3 flex items-center justify-between p-2.5 bg-slate-100 dark:bg-studio-800 rounded-lg text-xs">
                <div className="flex items-center gap-2 truncate">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="w-7 h-7 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                    {audioFile?.name || 'Reference Audio Preview'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                  {audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Voice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Character Voice Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Captain Drake, Anime Hero, Dark Lore"
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VoiceCategory)}
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Character Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Neutral">Neutral (Auto-Detect Pitch)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Language</span>
                </label>
                {audioFile && (
                  <button
                    type="button"
                    onClick={() => detectAudioLanguage(audioFile)}
                    disabled={isDetectingLang}
                    className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    title="Auto-detect language from audio"
                  >
                    {isDetectingLang ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        <span>Auto-Detect</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.flag} {opt.name}
                  </option>
                ))}
              </select>

              {detectedLanguage && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Auto-Detected: <strong>{detectedLanguage}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Character Description / Lore (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Gritty, battle-hardened fantasy warrior voice"
              className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-studio-border flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{engine === 'kokoro' ? 'Offline Zero-Cost Cloning' : 'Cloud Zero-Shot'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCloning || !audioFile || !title.trim()}
                className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow hover:opacity-95 transition disabled:opacity-50 flex items-center gap-2 font-sans"
              >
                {isCloning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing & Cloning Character...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Clone Character Voice Instantly</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
