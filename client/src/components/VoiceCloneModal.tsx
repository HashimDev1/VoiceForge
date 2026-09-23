import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Mic, Square, Play, Pause, Sparkles, Loader2, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Voice, VoiceCategory } from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCreated: (voice: Voice) => void;
}

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
  const [category, setCategory] = useState<VoiceCategory>('Documentary');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Neutral'>('Neutral');
  const [language, setLanguage] = useState('English');
  const [referenceText, setReferenceText] = useState('');
  const [tags, setTags] = useState('clone, custom');

  // Status
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or not available: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAutoTranscribe = async () => {
    if (!audioFile) {
      setError('Please upload or record reference audio first.');
      return;
    }
    try {
      setIsTranscribing(true);
      setError(null);
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (language) formData.append('language', language);

      const result = await ApiClient.transcribeAudio(formData);
      if (result.text) {
        setReferenceText(result.text);
      }
    } catch (err: any) {
      setError('Auto-transcription failed: ' + err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current && audioPreviewUrl) {
      audioRef.current = new Audio(audioPreviewUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setError('Please provide reference audio (10–30s recommended).');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a voice title.');
      return;
    }

    try {
      setIsCloning(true);
      setError(null);

      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (referenceText.trim()) formData.append('text', referenceText.trim());
      formData.append('category', category);
      formData.append('gender', gender);
      formData.append('language', language);
      formData.append('style', 'Cloned Voice');
      formData.append('tags', JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)));

      const res = await ApiClient.cloneVoice(formData);

      setSuccess(true);
      setTimeout(() => {
        onVoiceCreated(res.voice);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Voice cloning failed.');
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
            <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Instant Voice Cloning</h2>
              <p className="text-xs text-slate-500 font-mono">Fish Audio Zero-Shot Fast Model Creation</p>
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

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Voice model cloned successfully! Adding to your narrators...</span>
            </div>
          )}

          {/* Reference Audio Source Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Reference Audio Sample (10–30s recommended)
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
                <span>Upload Audio File</span>
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
                className="border-2 border-dashed border-studio-border rounded-xl p-5 text-center bg-slate-50/50 dark:bg-studio-950/40 hover:bg-slate-50 transition cursor-pointer"
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
                <Volume2 className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {audioFile ? audioFile.name : 'Click to select or drag & drop sample audio'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports MP3, WAV, M4A, OGG up to 25MB (clean speech with minimal background music works best)
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
                      Recording... {formatSec(recordDuration)}
                    </span>
                  ) : audioFile ? (
                    `Recorded sample ready (${(audioFile.size / 1024).toFixed(1)} KB)`
                  ) : (
                    'Click red microphone to start recording 10–30s of speech'
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

          {/* Reference Audio Transcript + ASR Helper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Reference Transcript (Optional but improves fidelity)
              </label>
              {audioFile && (
                <button
                  type="button"
                  onClick={handleAutoTranscribe}
                  disabled={isTranscribing}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Transcribing via ASR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Transcribe with Fish ASR</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="What does the speaker say in this reference audio clip? (Leave blank to let Fish Audio auto-detect)"
              className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>

          {/* Voice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Voice Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Documentary Voice"
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VoiceCategory)}
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
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
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Language
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English, Spanish, Japanese"
                className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cloned from personal studio mic recording"
              className="w-full text-xs p-2.5 rounded-lg border border-studio-border bg-white dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-studio-border flex items-center justify-end gap-2.5">
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
              className="px-5 py-2 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded-lg shadow hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cloning via Fish Audio Fast Model...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Clone Voice Instantly</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
