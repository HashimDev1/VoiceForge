import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Upload,
  Video,
  Youtube,
  Mic,
  Play,
  Pause,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  Sliders,
  Settings2,
  ArrowRight,
  RefreshCw,
  FileAudio,
  FileVideo,
  Volume2,
  Check,
  ChevronRight,
  Layers,
  Crown,
  Share2,
  Subtitles,
  Zap,
  FolderOpen
} from 'lucide-react';
import {
  Voice,
  VoiceTranslationProject,
  TranslationOutput,
  VoiceAnalysisResult,
  VoicePreservationSettings,
  TimingControlMode,
  DubbingProgress,
  DubbingSegment
} from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface VoiceTranslatorProps {
  voices: Voice[];
  onAudioPlay: (url: string) => void;
  currentAudioUrl?: string | null;
  isPlaying?: boolean;
}

const SUPPORTED_TARGET_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' }
];

export const VoiceTranslator: React.FC<VoiceTranslatorProps> = ({
  voices,
  onAudioPlay,
  currentAudioUrl,
  isPlaying
}) => {
  // Input Method: 1. audio, 2. video, 3. youtube, 4. existing voice
  const [inputMethod, setInputMethod] = useState<'audio' | 'video' | 'youtube' | 'existing'>('audio');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImportingYoutube, setIsImportingYoutube] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Source Media File State
  const [uploadedFile, setUploadedFile] = useState<{
    filename: string;
    url: string;
    originalName: string;
    sizeBytes: number;
  } | null>(null);
  const [sourceFileType, setSourceFileType] = useState<'audio' | 'video'>('audio');

  // Source File Analysis
  const [analysis, setAnalysis] = useState<VoiceAnalysisResult>({
    gender: 'Male',
    ageStyle: 'Adult',
    tone: 'Deep / Neutral',
    detectedLanguage: 'English',
    durationSec: 184,
    durationFormatted: '03:04'
  });

  // Section 3: Voice Model Selection
  const [voiceSource, setVoiceSource] = useState<'uploaded' | 'saved'>('uploaded');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(voices[0]?.id || 'documentary_male');

  // Section 4: Target Languages
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Arabic', 'Urdu', 'Hindi']);

  // Section 5: Voice Preservation Settings
  const [preservation, setPreservation] = useState<VoicePreservationSettings>({
    voiceSimilarity: 90,
    emotionMatching: 85,
    accentPreservation: 80,
    keepVoiceIdentity: true,
    keepEmotion: true,
    keepPauses: true,
    keepSpeakingStyle: true,
    keepGender: true
  });

  // Section 6: Timing Control
  const [timingMode, setTimingMode] = useState<TimingControlMode>('same-duration');

  // Processing & Live Step Tracker
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<DubbingProgress | null>(null);

  // Active Project & Projects List
  const [currentProject, setCurrentProject] = useState<VoiceTranslationProject | null>(null);
  const [projectsList, setProjectsList] = useState<VoiceTranslationProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline 8 Steps definition
  const pipelineSteps = [
    { step: 1, label: 'Extract audio', desc: 'Separating high-fidelity audio track' },
    { step: 2, label: 'Speech recognition', desc: 'Whisper AI multi-pass ASR' },
    { step: 3, label: 'Detect timestamps', desc: 'Isolating sentence & word timings' },
    { step: 4, label: 'Convert speech into text', desc: 'Transcribing speech semantics' },
    { step: 5, label: 'Translate text', desc: 'Target language translation engine' },
    { step: 6, label: 'Generate cloned voice', desc: 'Fish Audio voice clone synthesis' },
    { step: 7, label: 'Match timing', desc: 'FFmpeg acoustic stretch & pause sync' },
    { step: 8, label: 'Create final audio', desc: 'Generating multilingual master audio & video' }
  ];

  // Maps backend pipeline phases directly to 8 visualizer steps
  const mapPhaseToStep = (phase?: string, status?: string): number => {
    if (status === 'completed') return 9; // all 8 complete
    if (!phase) return 1;
    const p = phase.toLowerCase();
    if (p.includes('extract')) return 1;
    if (p.includes('speech recognition') || p.includes('asr') || p.includes('transcrib')) return 2;
    if (p.includes('segment') || p.includes('split') || p.includes('timestamp')) return 3;
    if (p.includes('convert speech') || p.includes('text')) return 4;
    if (p.includes('translat')) return 5;
    if (p.includes('generat') || p.includes('voice') || p.includes('synthesiz')) return 6;
    if (p.includes('matching') || p.includes('timing')) return 7;
    if (p.includes('merg') || p.includes('final') || p.includes('media') || p.includes('master') || p.includes('video')) return 8;
    if (p.includes('complet')) return 9;
    return 1;
  };

  // Load existing projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const list = await ApiClient.getTranslationProjects();
      setProjectsList(list);
      if (list.length > 0 && !currentProject) {
        // Set latest completed project as default if available
        const completed = list.find((p) => p.status === 'completed') || list[0];
        setCurrentProject(completed);
      }
    } catch (err) {
      console.error('Failed to load translation projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Handle local audio or video upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProcessingError(null);

    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await ApiClient.uploadTranslationMedia(formData);
      setUploadedFile(res.file);
      setSourceFileType(res.sourceFileType);
      if (res.analysis) {
        setAnalysis(res.analysis);
      }
    } catch (err: any) {
      setProcessingError(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle YouTube URL Import
  const handleImportYouTube = async () => {
    if (!youtubeUrl.trim()) return;
    setIsImportingYoutube(true);
    setProcessingError(null);

    try {
      const res = await ApiClient.importYouTubeMedia(youtubeUrl.trim(), true);
      setUploadedFile(res.file);
      setSourceFileType(res.sourceFileType);
      if (res.analysis) {
        setAnalysis(res.analysis);
      }
    } catch (err: any) {
      setProcessingError(err.message || 'Failed to import YouTube video.');
    } finally {
      setIsImportingYoutube(false);
    }
  };

  // Toggle language selection
  const toggleLanguage = (langName: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langName) ? prev.filter((l) => l !== langName) : [...prev, langName]
    );
  };

  // Select all common languages
  const handleSelectAllLanguages = () => {
    if (selectedLanguages.length === SUPPORTED_TARGET_LANGUAGES.length) {
      setSelectedLanguages(['Spanish']);
    } else {
      setSelectedLanguages(SUPPORTED_TARGET_LANGUAGES.map((l) => l.name));
    }
  };

  // START AI DUBBING
  const handleStartDubbing = async () => {
    const effectiveFile = uploadedFile || {
      filename: 'sample_speech.mp3',
      url: '/api/audio/file/sample_speech.mp3',
      originalName: 'voice_recording.mp3',
      sizeBytes: 2048000
    };

    if (!uploadedFile) {
      setUploadedFile(effectiveFile);
    }

    if (selectedLanguages.length === 0) {
      setProcessingError('Please select at least one target language to translate into.');
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setActiveStep(1);

    const selectedVoiceObj = voices.find((v) => v.id === selectedVoiceId);
    const chosenVoiceName = voiceSource === 'uploaded' ? 'Uploaded Voice Clone' : (selectedVoiceObj?.name || 'Selected Clone');

    try {
      // Gentle initial step timer while awaiting first response
      const stepTimer = setInterval(() => {
        setActiveStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 1500);

      const payload = {
        projectName: `Dubbed - ${effectiveFile.originalName} (${selectedLanguages.length} Languages)`,
        sourceFile: effectiveFile,
        sourceFileType,
        sourceLanguage: analysis.detectedLanguage || 'English',
        targetLanguages: selectedLanguages,
        voiceId: voiceSource === 'uploaded' ? 'reference_uploaded' : selectedVoiceId,
        voiceName: chosenVoiceName,
        duration: analysis.durationSec,
        durationFormatted: analysis.durationFormatted,
        settings: preservation,
        timingMode,
        analysis
      };

      const project = await ApiClient.createTranslationProject(payload);

      // Poll until project is completed or failed (750ms interval for smooth real-time bar)
      const pollInterval = setInterval(async () => {
        try {
          const freshProject = await ApiClient.getTranslationProject(project.id);
          if (freshProject.progress) {
            setCurrentProgress(freshProject.progress);
            const dynamicStep = mapPhaseToStep(freshProject.progress.currentPhase, freshProject.status);
            setActiveStep((prev) => Math.max(prev, dynamicStep));
          }
          if (freshProject.status === 'completed') {
            clearInterval(pollInterval);
            clearInterval(stepTimer);
            setActiveStep(9); // All 8 steps completed & green
            setCurrentProject(freshProject);
            setIsProcessing(false);
            loadProjects();

            // Smoothly reveal results section
            setTimeout(() => {
              const el = document.getElementById('dubbing-results-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 300);
          } else if (freshProject.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(stepTimer);
            setProcessingError(freshProject.error || 'AI Dubbing pipeline failed.');
            setIsProcessing(false);
            setActiveStep(0);
            loadProjects();
          }
        } catch (pollErr) {
          console.warn('Poll error:', pollErr);
        }
      }, 750);

      // Generous safety timeout (15 minutes for long 5-30 min videos)
      setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(stepTimer);
        setIsProcessing((prev) => {
          if (prev) {
            console.warn('Safety poll timeout reached after 15 minutes.');
          }
          return false;
        });
      }, 900000);
    } catch (err: any) {
      setProcessingError(err.message || 'Dubbing process encountered an error.');
      setIsProcessing(false);
      setActiveStep(0);
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string) => {
    try {
      await ApiClient.deleteTranslationProject(id);
      setProjectsList((prev) => prev.filter((p) => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  // Delete single output
  const handleDeleteOutput = async (outputId: string) => {
    if (!currentProject) return;
    try {
      const updated = await ApiClient.deleteTranslationOutput(currentProject.id, outputId);
      setCurrentProject(updated);
      setProjectsList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to delete output.');
    }
  };

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* ======================================================== */}
      {/* PAGE HEADER & TAGLINE */}
      {/* ======================================================== */}
      <div className="border-b border-studio-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌍</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Voice Translator Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-black text-white dark:bg-white dark:text-black">
              AI CLONING
            </span>
          </div>
          <p className="text-xs sm:text-sm font-sans text-slate-600 dark:text-slate-400 mt-1">
            Convert your voice into any language using AI voice cloning technology.
          </p>
        </div>

        {/* Tagline Pill */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-studio-850 border border-studio-border px-3.5 py-2 rounded-2xl shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wide text-slate-800 dark:text-slate-200">
            &ldquo;Your Voice. Any Language. Same Identity.&rdquo;
          </span>
        </div>
      </div>

      {/* Error Alert if any */}
      {processingError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center justify-between">
          <span>⚠️ {processingError}</span>
          <button onClick={() => setProcessingError(null)} className="underline hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: INPUT SOURCE */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Select Input Method
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 uppercase">AUDIO • VIDEO • YOUTUBE</span>
        </div>

        {/* 4 Method Selection Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Option 1: Upload Audio */}
          <button
            type="button"
            onClick={() => {
              setInputMethod('audio');
              fileInputRef.current?.click();
            }}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              inputMethod === 'audio'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <FileAudio className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300">
                MP3 / WAV / M4A
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">1. Upload Audio</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">High fidelity speech audio</p>
            </div>
          </button>

          {/* Option 2: Upload Video */}
          <button
            type="button"
            onClick={() => {
              setInputMethod('video');
              fileInputRef.current?.click();
            }}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              inputMethod === 'video'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Video className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300">
                MP4 / MOV
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">2. Upload Video</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Full video dubbing</p>
            </div>
          </button>

          {/* Option 3: YouTube URL */}
          <button
            type="button"
            onClick={() => setInputMethod('youtube')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              inputMethod === 'youtube'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Youtube className="w-5 h-5 text-rose-500" />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                yt-dlp
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">3. YouTube URL</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Paste link to import</p>
            </div>
          </button>

          {/* Option 4: Existing Voice Model */}
          <button
            type="button"
            onClick={() => setInputMethod('existing')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              inputMethod === 'existing'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Mic className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300">
                VoiceForge Clones
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">4. Existing Voice Model</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Connect with saved voices</p>
            </div>
          </button>
        </div>

        {/* Hidden file input for Audio / Video */}
        <input
          ref={fileInputRef}
          type="file"
          accept={inputMethod === 'video' ? 'video/mp4,video/quicktime' : 'audio/mp3,audio/wav,audio/m4a,audio/*'}
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Input Details Sub-Panel */}
        <div className="mt-4 pt-4 border-t border-studio-border">
          {inputMethod === 'youtube' && (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>
              <button
                type="button"
                onClick={handleImportYouTube}
                disabled={isImportingYoutube || !youtubeUrl.trim()}
                className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isImportingYoutube ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>IMPORT VIDEO</span>
              </button>
            </div>
          )}

          {(inputMethod === 'audio' || inputMethod === 'video') && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-studio-border hover:border-black dark:hover:border-white rounded-xl p-5 text-center cursor-pointer transition bg-slate-50/50 dark:bg-studio-850/50"
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {isUploading ? 'Uploading & Analyzing...' : `Click to Browse ${inputMethod === 'video' ? 'Video' : 'Audio'} or Drag and Drop`}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {inputMethod === 'video' ? 'Supported formats: MP4, MOV (up to 250MB)' : 'Supported formats: MP3, WAV, M4A'}
              </p>
            </div>
          )}

          {inputMethod === 'existing' && (
            <div className="flex flex-wrap gap-2">
              {voices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVoiceId(v.id);
                    setUploadedFile({
                      filename: `sample_${v.id}.mp3`,
                      url: v.previewAudioUrl || `/api/audio/file/sample_${v.id}.mp3`,
                      originalName: `${v.name}_sample.mp3`,
                      sizeBytes: 1542000
                    });
                  }}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-2 ${
                    selectedVoiceId === v.id
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                      : 'border-studio-border bg-slate-50 dark:bg-studio-850 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{v.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: SOURCE FILE ANALYSIS */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Source File Analysis
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-500 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> AI RECOGNIZED
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* File Card */}
          <div className="p-3 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">File</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1" title={uploadedFile?.originalName || 'example_voice.mp3'}>
              {uploadedFile?.originalName || 'example_voice.mp3'}
            </p>
          </div>

          {/* Duration Card */}
          <div className="p-3 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Duration</span>
            <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">
              {analysis.durationFormatted || '05:32'}
            </p>
          </div>

          {/* Detected Language */}
          <div className="p-3 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Detected Language</span>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
              <span>🇺🇸</span> {analysis.detectedLanguage || 'English'}
            </p>
          </div>

          {/* Gender */}
          <div className="p-3 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Gender</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              {analysis.gender}
            </p>
          </div>

          {/* Age Style */}
          <div className="p-3 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Age Style</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              {analysis.ageStyle}
            </p>
          </div>

          {/* Tone & Reference ID */}
          <div className="p-3 bg-slate-50 dark:bg-studio-850 border border-studio-border rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Tone / Voice ID</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1" title={analysis.tone}>
              {analysis.tone}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: VOICE MODEL SELECTION */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Voice Model Selection
            </h2>
          </div>

          {/* Radio toggle: Use Uploaded Voice vs Use Saved Clone */}
          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="voiceSource"
                checked={voiceSource === 'uploaded'}
                onChange={() => setVoiceSource('uploaded')}
                className="w-3.5 h-3.5 text-black accent-black dark:accent-white"
              />
              <span>( ) Use Uploaded Voice</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="voiceSource"
                checked={voiceSource === 'saved'}
                onChange={() => setVoiceSource('saved')}
                className="w-3.5 h-3.5 text-black accent-black dark:accent-white"
              />
              <span>( ) Use Saved Clone</span>
            </label>
          </div>
        </div>

        {voiceSource === 'saved' ? (
          <div>
            <p className="text-xs font-mono uppercase text-slate-500 mb-3 font-bold">
              Saved Voices: Select Fish Audio voice clone to speak the translated text
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {voices.slice(0, 8).map((v) => {
                const isSelected = selectedVoiceId === v.id;
                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                        : 'border-studio-border bg-white dark:bg-studio-900 hover:border-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300">
                          {v.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{v.gender}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{v.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{v.style}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-studio-border">
                      {v.previewAudioUrl && (
                        <button
                          type="button"
                          onClick={() => onAudioPlay(v.previewAudioUrl!)}
                          className="p-1.5 rounded-lg border border-studio-border hover:bg-slate-200 dark:hover:bg-studio-800 transition"
                          title="Preview Voice"
                        >
                          <Play className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedVoiceId(v.id)}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-mono font-bold uppercase transition ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'border border-studio-border hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-studio-850 border border-studio-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-mono font-bold text-xs">
                AI
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Zero-Shot Instant Speaker Cloning Enabled
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fish Audio will clone the unique vocal timbre, vocal folds, and accent of the uploaded voice directly into all target languages.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: LANGUAGE CONVERSION */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
              4
            </span>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Convert Into (Multi-Select Language Grid)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllLanguages}
              className="text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white underline font-bold"
            >
              {selectedLanguages.length === SUPPORTED_TARGET_LANGUAGES.length ? 'Deselect All' : 'Select All (13)'}
            </button>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-studio-850 text-slate-800 dark:text-slate-200 border border-studio-border">
              {selectedLanguages.length} Selected
            </span>
          </div>
        </div>

        {/* 13 Language Multi-select Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {SUPPORTED_TARGET_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.name);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.name)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'border-studio-border bg-slate-50 dark:bg-studio-850 hover:border-slate-400 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg leading-none">{lang.flag}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold">{lang.name}</h4>
                  <span className={`text-[10px] font-mono block ${isSelected ? 'opacity-80' : 'text-slate-500'}`}>
                    {lang.native}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Example Pipeline Preview Pills */}
        <div className="mt-4 pt-3 border-t border-studio-border flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Planned Outputs:</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-studio-850 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-studio-border">
            Source: {analysis.detectedLanguage || 'English'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          {selectedLanguages.map((l) => (
            <span
              key={l}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-500/20"
            >
              {l} Version
            </span>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5: VOICE PRESERVATION SETTINGS */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
              5
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Voice Preservation Settings
            </h2>
          </div>
          <Sliders className="w-4 h-4 text-slate-400" />
        </div>

        {/* Sliders: Voice Similarity, Emotion Matching, Accent Preservation (0 - 100) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Slider 1 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-studio-850 border border-studio-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">Voice Similarity</label>
              <span className="text-xs font-mono font-bold">{preservation.voiceSimilarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={preservation.voiceSimilarity}
              onChange={(e) =>
                setPreservation((prev) => ({ ...prev, voiceSimilarity: parseInt(e.target.value, 10) }))
              }
              className="w-full h-1.5 bg-slate-300 dark:bg-studio-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>0 (Flexible)</span>
              <span>100 (Exact Timbre)</span>
            </div>
          </div>

          {/* Slider 2 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-studio-850 border border-studio-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">Emotion Matching</label>
              <span className="text-xs font-mono font-bold">{preservation.emotionMatching}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={preservation.emotionMatching}
              onChange={(e) =>
                setPreservation((prev) => ({ ...prev, emotionMatching: parseInt(e.target.value, 10) }))
              }
              className="w-full h-1.5 bg-slate-300 dark:bg-studio-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>0 (Neutral)</span>
              <span>100 (Full Inflection)</span>
            </div>
          </div>

          {/* Slider 3 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-studio-850 border border-studio-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">Accent Preservation</label>
              <span className="text-xs font-mono font-bold">{preservation.accentPreservation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={preservation.accentPreservation}
              onChange={(e) =>
                setPreservation((prev) => ({ ...prev, accentPreservation: parseInt(e.target.value, 10) }))
              }
              className="w-full h-1.5 bg-slate-300 dark:bg-studio-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>0 (Native Target)</span>
              <span>100 (Source Accent)</span>
            </div>
          </div>
        </div>

        {/* 5 Checkboxes */}
        <div className="pt-4 border-t border-studio-border">
          <p className="text-[10px] font-mono uppercase text-slate-500 font-bold mb-3">Identity Retention Guarantees:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: 'keepVoiceIdentity', label: 'Keep same voice identity' },
              { key: 'keepEmotion', label: 'Keep same emotion' },
              { key: 'keepPauses', label: 'Keep same pauses' },
              { key: 'keepSpeakingStyle', label: 'Keep same speaking style' },
              { key: 'keepGender', label: 'Keep same gender' }
            ].map(({ key, label }) => {
              const checked = (preservation as any)[key];
              return (
                <label
                  key={key}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                    checked
                      ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 text-slate-900 dark:text-white'
                      : 'border-studio-border text-slate-500 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setPreservation((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-black accent-black dark:accent-white"
                  />
                  <span className="text-xs font-bold leading-tight">{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 6: TIMING CONTROL */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
              6
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Timing Control
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-bold uppercase text-[10px]">Original Audio Length:</span>
            <span className="font-bold text-slate-900 dark:text-white">{analysis.durationFormatted || '05:32'}</span>
          </div>
        </div>

        {/* 3 Timing Control Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Same Duration */}
          <button
            type="button"
            onClick={() => setTimingMode('same-duration')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              timingMode === 'same-duration'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                  OPTION 1
                </span>
                {timingMode === 'same-duration' && <Check className="w-4 h-4 text-emerald-500" />}
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Same Duration</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Translated voice matches original length precisely using FFmpeg atempo stretching and pause synchronization.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-studio-border text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              IDEAL FOR VIDEO DUBBING & LIP SYNC
            </div>
          </button>

          {/* Option 2: Natural Translation */}
          <button
            type="button"
            onClick={() => setTimingMode('natural')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              timingMode === 'natural'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                  OPTION 2
                </span>
                {timingMode === 'natural' && <Check className="w-4 h-4 text-emerald-500" />}
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Natural Translation</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Allows language natural speaking speed without synthetic stretching. Best cadence and organic pronunciation.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-studio-border text-[10px] font-mono text-slate-500 font-bold">
              IDEAL FOR PODCASTS & AUDIOBOOKS
            </div>
          </button>

          {/* Option 3: Short Form */}
          <button
            type="button"
            onClick={() => setTimingMode('short-form')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              timingMode === 'short-form'
                ? 'border-black dark:border-white bg-slate-50 dark:bg-studio-850 ring-1 ring-black dark:ring-white'
                : 'border-studio-border hover:border-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                  OPTION 3
                </span>
                {timingMode === 'short-form' && <Check className="w-4 h-4 text-emerald-500" />}
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Short Form</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Optimized for social media (TikTok, Reels, Shorts). 1.15x tempo with compressed pauses for maximum retention.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-studio-border text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              IDEAL FOR YOUTUBE SHORTS & TIKTOK
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 7: PROCESS BUTTON & PIPELINE STEPS */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-serif font-extrabold text-slate-900 dark:text-white">
              Ready to Dub Your Media
            </h2>
            <p className="text-xs font-mono text-slate-500 uppercase mt-0.5">
              8-STAGE AUTOMATED PIPELINE • FISH AUDIO TTS CLONE • MULTILINGUAL AUDIO
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartDubbing}
            disabled={isProcessing}
            className="w-full sm:w-auto px-8 py-4 bg-black text-white dark:bg-white dark:text-black font-mono font-extrabold text-sm uppercase tracking-wider rounded-2xl hover:opacity-90 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-3 group"
          >
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            )}
            <span>{isProcessing ? 'AI DUBBING IN PROGRESS...' : 'START AI DUBBING'}</span>
          </button>
        </div>

        {/* 8 Processing Steps Visualizer */}
        <div className="pt-5 border-t border-studio-border">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-3">
            Processing Steps Pipeline:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {pipelineSteps.map((s) => {
              const isCompleted = currentProject?.status === 'completed' || activeStep >= 9;
              const isDone = isCompleted || activeStep > s.step;
              const isCurrent = !isCompleted && activeStep === s.step;
              return (
                <div
                  key={s.step}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col justify-between ${
                    isCurrent
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black shadow-md scale-105'
                      : isDone
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-studio-border bg-slate-50 dark:bg-studio-850 opacity-60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-bold">{s.step}.</span>
                    {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {isCurrent && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </div>
                  <p className="text-[11px] font-bold leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* All 8 Steps Completed Celebration Banner */}
          {(currentProject?.status === 'completed' || activeStep >= 9) && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    All 8 Dubbing Pipeline Steps Completed Successfully!
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    {currentProject?.projectName || 'Project'} is ready with {currentProject?.outputs?.length || 1} translated voice versions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('dubbing-results-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold transition shadow-sm whitespace-nowrap self-stretch sm:self-auto text-center"
              >
                VIEW RESULTS & PREVIEWS ↓
              </button>
            </div>
          )}

          {/* Live Sentence Dubbing Progress Monitor */}
          {isProcessing && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-studio-850 border border-studio-border animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {currentProgress?.totalSegments && currentProgress.totalSegments > 0
                      ? `Processing Segment ${currentProgress.currentSegment}/${currentProgress.totalSegments}`
                      : 'Processing Sentence Dubbing Pipeline...'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                    {currentProgress?.currentPhase || 'Generating Voice'}
                  </span>
                  <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">
                    {currentProgress?.percent || 15}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-studio-700 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-black dark:bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, currentProgress?.percent || 15)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{currentProgress?.message || 'Processing sentence-by-sentence with Fish Audio voice clone...'}</span>
                <span>Exact Timing Alignment Active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 8: RESULTS & DOWNLOAD PAGE */}
      {/* ======================================================== */}
      {currentProject && currentProject.outputs && currentProject.outputs.length > 0 && (
        <div id="dubbing-results-section" className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block">
                COMPLETED MULTILINGUAL OUTPUTS
              </span>
              <h2 className="text-base font-serif font-extrabold text-slate-900 dark:text-white mt-0.5">
                {currentProject.projectName}
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {currentProject.outputs.length} Language Versions Ready
            </span>
          </div>

          {/* Original Audio Reference Card */}
          <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-studio-850 border border-studio-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                🇺🇸
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Original Master:</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentProject.sourceFile.originalName || 'English.mp3'}
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  {currentProject.durationFormatted || '05:32'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAudioPlay(currentProject.sourceFile.url)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-studio-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition text-xs font-mono font-bold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>PLAY ORIGINAL</span>
              </button>
            </div>
          </div>

          {/* Generated Outputs Grid */}
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-3">
            Generated Cloned Voices:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentProject.outputs.map((out) => {
              const langMeta = SUPPORTED_TARGET_LANGUAGES.find((l) => l.name === out.language);
              const isCurrentlyPlaying = currentAudioUrl === out.audioFile && isPlaying;

              return (
                <div
                  key={out.id}
                  className="p-4 rounded-xl border border-studio-border bg-slate-50/50 dark:bg-studio-850/50 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{langMeta?.flag || '🌍'}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{out.language}.mp3</h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          Duration: {out.durationFormatted}
                        </span>
                      </div>
                    </div>
                    {out.videoFile && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        VIDEO + AUDIO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-studio-border">
                    {/* Play Button */}
                    <button
                      type="button"
                      onClick={() => onAudioPlay(out.audioFile)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                        isCurrentlyPlaying
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                      }`}
                    >
                      {isCurrentlyPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isCurrentlyPlaying ? 'PAUSE' : 'PLAY'}</span>
                    </button>

                    {/* Download Button */}
                    <a
                      href={out.videoFile || out.audioFile}
                      download={`${out.language}_translated.${out.videoFile ? 'mp4' : 'mp3'}`}
                      className="p-2 rounded-lg border border-studio-border hover:bg-slate-200 dark:hover:bg-studio-800 transition"
                      title="Download File"
                    >
                      <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    </a>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteOutput(out.id)}
                      className="p-2 rounded-lg border border-studio-border hover:bg-rose-500/10 hover:text-rose-600 transition"
                      title="Delete Output"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Inline Audio Player for Direct 1-Click Playback */}
                  <div className="mt-2.5">
                    <audio
                      controls
                      src={out.audioFile}
                      preload="metadata"
                      className="w-full h-8 rounded-lg outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 8B: SENTENCE-BY-SENTENCE DUBBING BREAKDOWN */}
      {/* ======================================================== */}
      {currentProject && currentProject.segments && currentProject.segments.length > 0 && (
        <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs flex items-center justify-center">
                ✓
              </span>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Sentence-by-Sentence AI Dubbing Studio ({currentProject.segments.length} Sentences)
                </h2>
                <span className="text-[11px] text-slate-500 font-mono">
                  Exact start/end timestamp alignment & Fish Audio cloned speech per sentence
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              PRECISION TIMING
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-studio-border text-slate-500 uppercase text-[10px]">
                  <th className="pb-3 font-bold w-12">#</th>
                  <th className="pb-3 font-bold w-28">Timestamp</th>
                  <th className="pb-3 font-bold w-20">Duration</th>
                  <th className="pb-3 font-bold">Original Sentence</th>
                  <th className="pb-3 font-bold">Translated Sentence</th>
                  <th className="pb-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-border">
                {currentProject.segments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-slate-50 dark:hover:bg-studio-850 transition">
                    <td className="py-3 font-bold text-slate-400">{seg.id}</td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                      {seg.start_time.toFixed(1)}s - {seg.end_time.toFixed(1)}s
                    </td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-studio-800 text-[10px] font-bold">
                        {seg.duration.toFixed(2)}s
                      </span>
                    </td>
                    <td className="py-3 text-slate-900 dark:text-white max-w-xs">{seg.original_text}</td>
                    <td className="py-3 text-emerald-700 dark:text-emerald-300 max-w-xs font-sans">
                      {seg.translated_text || '—'}
                    </td>
                    <td className="py-3 text-right">
                      {seg.audioUrl ? (
                        <button
                          type="button"
                          onClick={() => onAudioPlay(seg.audioUrl!)}
                          className="p-1.5 rounded-lg border border-studio-border hover:bg-slate-200 dark:hover:bg-studio-800 transition"
                          title="Play Sentence Audio"
                        >
                          <Play className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">✓ Synced</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 9: TRANSLATION PROJECTS LIST */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-studio-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Translation Projects ({projectsList.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={loadProjects}
            className="text-xs font-mono text-slate-500 hover:text-black dark:hover:text-white flex items-center gap-1 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProjects ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>

        {projectsList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No previous translation projects. Upload media above to start your first AI dubbing project!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-studio-border text-slate-500 uppercase text-[10px]">
                  <th className="pb-3 font-bold">Project Name</th>
                  <th className="pb-3 font-bold">Original File</th>
                  <th className="pb-3 font-bold">Languages</th>
                  <th className="pb-3 font-bold">Voice Used</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Created Date</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-border">
                {projectsList.map((p) => {
                  const isCurrent = currentProject?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setCurrentProject(p)}
                      className={`hover:bg-slate-50 dark:hover:bg-studio-850 cursor-pointer transition ${
                        isCurrent ? 'bg-slate-50/80 dark:bg-studio-850/80' : ''
                      }`}
                    >
                      <td className="py-3 font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {p.projectName}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                        {p.sourceFile?.originalName || 'voice.mp3'}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {p.targetLanguages.slice(0, 3).map((l) => (
                            <span key={l} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-studio-800 text-[10px]">
                              {l}
                            </span>
                          ))}
                          {p.targetLanguages.length > 3 && (
                            <span className="text-[10px] text-slate-500">+{p.targetLanguages.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{p.voiceName || 'Uploaded Voice'}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : p.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 10: PREMIUM FEATURES SHOWCASE */}
      {/* ======================================================== */}
      <div className="bg-slate-50 dark:bg-studio-900/60 border border-dashed border-studio-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Future Studio Capabilities & Add-ons
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            ROADMAP
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { title: '1. Lip Sync AI', icon: Video, desc: 'Facial synchronization' },
            { title: '2. Subtitles', icon: Subtitles, desc: 'Auto SRT generation' },
            { title: '3. YouTube Auto', icon: Share2, desc: 'Direct channel publish' },
            { title: '4. Batch Mode', icon: Layers, desc: 'Bulk queue translation' },
            { title: '5. Emotion Transfer', icon: Sparkles, desc: 'Expressive tone map' },
            { title: '6. Style Presets', icon: Settings2, desc: 'Cinematic narrator profiles' },
            { title: '7. Team Workspace', icon: Crown, desc: 'Multi-seat collaboration' }
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-3 bg-white dark:bg-studio-850 border border-studio-border rounded-xl text-left"
              >
                <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{feature.title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default VoiceTranslator;
