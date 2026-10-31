import React, { useState, useEffect, useRef } from 'react';
import {
  Subtitles,
  Upload,
  Video,
  FileAudio,
  FileVideo,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  Edit3,
  Sliders,
  CheckCircle2,
  Trash2,
  ArrowRight,
  HelpCircle,
  FileText,
  CheckCheck,
  X,
  Filter,
  AlertTriangle,
  BookOpen,
  Volume2
} from 'lucide-react';
import {
  Voice,
  TranscriptionProject,
  TranscriptionSegment,
  ScriptChoice,
  ReferenceScriptFormat,
  AlignmentReviewItem
} from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface VoiceTranslatorProps {
  voices?: Voice[];
  onAudioPlay?: (url: string, showBottomBar?: boolean) => void;
  onAudioPause?: () => void;
  currentAudioUrl?: string | null;
  isPlaying?: boolean;
}

export const VoiceTranslator: React.FC<VoiceTranslatorProps> = () => {
  // Upload and file state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{
    filename: string;
    url: string;
    originalName: string;
    sizeBytes: number;
    mimeType?: string;
  } | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentProject, setCurrentProject] = useState<TranscriptionProject | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  // Script selection state
  const [selectedScript, setSelectedScript] = useState<ScriptChoice>('original');
  const [isConvertingScript, setIsConvertingScript] = useState(false);

  // Language override/correction state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [manualLangCode, setManualLangCode] = useState<string>('auto');

  // Playback & seeking state
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  // Editing state
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<TranscriptionProject[]>([]);
  const [expandedWordSegments, setExpandedWordSegments] = useState<Record<string, boolean>>({});

  // Original Voiceover Script state
  const [originalScriptText, setOriginalScriptText] = useState<string>('');
  const [scriptFormat, setScriptFormat] = useState<ReferenceScriptFormat>('auto');
  const [detectedScriptFormat, setDetectedScriptFormat] = useState<ReferenceScriptFormat>('auto');
  const [scriptUploadError, setScriptUploadError] = useState<string | null>(null);

  // Review Workflow state
  const [activeReviewFilter, setActiveReviewFilter] = useState<'all' | 'corrections' | 'additions' | 'omitted'>('all');
  const [isResolvingReview, setIsResolvingReview] = useState(false);
  const [reviewEditingId, setReviewEditingId] = useState<string | null>(null);
  const [reviewEditText, setReviewEditText] = useState<string>('');

  // Load recent transcription projects on mount
  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    try {
      const list = await ApiClient.getTranscriptionProjects();
      setRecentProjects(list);
    } catch {
      // ignore
    }
  };

  // Format seconds to [HH:MM:SS.mmm]
  const formatTime = (sec: number): string => {
    const s = Math.max(0, Number(sec || 0));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);

    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(3, '0');

    return `${hStr}:${mStr}:${sStr}.${msStr}`;
  };

  // Handle script text change and auto-detect format
  const handleScriptTextChange = async (val: string) => {
    setOriginalScriptText(val);
    setScriptUploadError(null);
    if (scriptFormat === 'auto' && val.trim().length > 5) {
      try {
        const detected = await ApiClient.detectScriptFormat(val);
        setDetectedScriptFormat(detected);
      } catch {
        // ignore
      }
    }
  };

  // Handle upload of .txt or .md script file
  const handleScriptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScriptUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const scriptFile = e.target.files[0];
      const ext = scriptFile.name.toLowerCase();
      if (!ext.endsWith('.txt') && !ext.endsWith('.md')) {
        setScriptUploadError('Please select a valid .txt or .md script document.');
        return;
      }

      if (scriptFile.size > 5 * 1024 * 1024) {
        setScriptUploadError('Script file size exceeds 5MB limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const content = String(evt.target?.result || '');
        if (!content.trim()) {
          setScriptUploadError('Uploaded script file is empty.');
          return;
        }
        setOriginalScriptText(content);
        try {
          const detected = await ApiClient.detectScriptFormat(content);
          setDetectedScriptFormat(detected);
        } catch {
          // ignore
        }
      };
      reader.onerror = () => {
        setScriptUploadError('Failed to read the selected script file.');
      };
      reader.readAsText(scriptFile);
    }
  };

  // Handle media file upload
  const handleFileUpload = async (selectedFile: File) => {
    setTranscriptionError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('media', selectedFile);

      const res = await fetch('/api/translation/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload media file.');
      }

      setFile(selectedFile);
      setUploadedMedia(data.file);
      setMediaType(data.sourceFileType || 'audio');

      // Automatically trigger transcription with reference script if present
      await runTranscription(data.file.filename, selectedFile.name, data.sourceFileType);
    } catch (err: any) {
      setTranscriptionError(err.message || 'Media upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Run speech recognition
  const runTranscription = async (
    filename: string,
    originalName: string,
    type: 'audio' | 'video',
    overrideLang?: string,
    overrideScript?: ScriptChoice,
    overrideRefScript?: string,
    overrideRefFormat?: ReferenceScriptFormat
  ) => {
    setIsTranscribing(true);
    setTranscriptionError(null);

    const refText = overrideRefScript !== undefined ? overrideRefScript : originalScriptText;
    const refFormat = overrideRefFormat !== undefined ? overrideRefFormat : scriptFormat;

    try {
      const project = await ApiClient.transcribeMedia({
        filename,
        originalName,
        mediaType: type,
        languageCode: overrideLang && overrideLang !== 'auto' ? overrideLang : undefined,
        scriptChoice: overrideScript || 'original',
        originalScript: refText && refText.trim().length > 0 ? refText.trim() : undefined,
        scriptFormat: refFormat
      });

      setCurrentProject(project);
      setSelectedScript(project.selectedScript || 'original');
      if (project.detectedScriptFormat) {
        setDetectedScriptFormat(project.detectedScriptFormat);
      }
      await loadRecentProjects();
    } catch (err: any) {
      setTranscriptionError(err.message || 'Transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Switch Hindi/Urdu script
  const handleScriptChange = async (newScript: ScriptChoice) => {
    if (!currentProject || isConvertingScript) return;
    setIsConvertingScript(true);
    try {
      const updated = await ApiClient.convertTranscriptionScript({
        projectId: currentProject.id,
        scriptChoice: newScript
      });
      setCurrentProject(updated);
      setSelectedScript(newScript);
    } catch (err: any) {
      setTranscriptionError(err.message || 'Failed to switch script.');
    } finally {
      setIsConvertingScript(false);
    }
  };

  // Correct or adjust detected language
  const handleApplyLanguageCorrection = async () => {
    if (!uploadedMedia) return;
    setIsLanguageModalOpen(false);
    await runTranscription(
      uploadedMedia.filename,
      uploadedMedia.originalName,
      mediaType,
      manualLangCode,
      selectedScript,
      originalScriptText,
      scriptFormat
    );
  };

  // Resolve single review item (accept, reject, edit)
  const handleResolveReviewItem = async (
    reviewItemId: string,
    action: 'accepted' | 'rejected' | 'edited',
    customText?: string
  ) => {
    if (!currentProject) return;
    setIsResolvingReview(true);
    try {
      const updated = await ApiClient.resolveReviewItem({
        projectId: currentProject.id,
        reviewItemId,
        action,
        editedText: customText
      });
      setCurrentProject(updated);
      setReviewEditingId(null);
    } catch (err: any) {
      setTranscriptionError(err.message || 'Failed to update review item.');
    } finally {
      setIsResolvingReview(false);
    }
  };

  // Accept all pending corrections with one click
  const handleAcceptAllCorrections = async () => {
    if (!currentProject) return;
    setIsResolvingReview(true);
    try {
      const updated = await ApiClient.resolveReviewItem({
        projectId: currentProject.id,
        acceptAll: true
      });
      setCurrentProject(updated);
    } catch (err: any) {
      setTranscriptionError(err.message || 'Failed to accept all corrections.');
    } finally {
      setIsResolvingReview(false);
    }
  };

  // Update a single segment text
  const handleSegmentTextChange = (segId: string, newText: string) => {
    if (!currentProject) return;
    const updatedSegments = currentProject.segments.map((s) => {
      if (s.id === segId) {
        return { ...s, text: newText };
      }
      return s;
    });

    setCurrentProject({
      ...currentProject,
      segments: updatedSegments
    });
  };

  // Save edited segments to server
  const handleSaveSegments = async () => {
    if (!currentProject) return;
    try {
      const updated = await ApiClient.updateTranscriptSegments(
        currentProject.id,
        currentProject.segments
      );
      setCurrentProject(updated);
      setEditingSegmentId(null);
    } catch (err: any) {
      setTranscriptionError(err.message || 'Failed to save transcript changes.');
    }
  };

  // Seek media player to timestamp
  const handleSeekToSegment = (startSec: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = startSec;
      mediaRef.current.play();
      setIsPlayingMedia(true);
    }
  };

  // Toggle playback
  const togglePlayMedia = () => {
    if (!mediaRef.current) return;
    if (isPlayingMedia) {
      mediaRef.current.pause();
      setIsPlayingMedia(false);
    } else {
      mediaRef.current.play();
      setIsPlayingMedia(true);
    }
  };

  // Copy full transcript text
  const handleCopyTranscript = () => {
    if (!currentProject) return;
    const fullText = currentProject.segments
      .map((s) => `[${formatTime(s.start)} – ${formatTime(s.end)}] ${s.text}`)
      .join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Download exported file
  const handleDownloadExport = (format: 'txt' | 'srt' | 'vtt' | 'json') => {
    if (!currentProject) return;
    setIsExportMenuOpen(false);
    const url = ApiClient.getExportDownloadUrl(currentProject.id, format);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Determine if active language is Hindi or Urdu
  const isHindiOrUrdu = currentProject
    ? ['hi', 'ur'].includes((currentProject.detectedLanguageCode || '').toLowerCase())
    : false;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Subtitles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                Voiceover Transcription Studio
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  AI Offline Engine
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Automatic language detection, precision millisecond timestamps, Hindi/Urdu script conversion & subtitle exports.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          {currentProject && (
            <>
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer"
                title="Copy full transcript with timestamps"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedAll ? 'Copied!' : 'Copy Transcript'}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 opacity-80" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-50 animate-fadeIn">
                    <button
                      onClick={() => handleDownloadExport('srt')}
                      className="w-full text-left px-3 py-2 text-xs font-mono rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span>SubRip Subtitle</span>
                      <span className="text-[10px] uppercase font-bold text-indigo-500">.SRT</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExport('vtt')}
                      className="w-full text-left px-3 py-2 text-xs font-mono rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span>WebVTT Subtitle</span>
                      <span className="text-[10px] uppercase font-bold text-indigo-500">.VTT</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExport('txt')}
                      className="w-full text-left px-3 py-2 text-xs font-mono rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span>Timestamped Text</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">.TXT</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExport('json')}
                      className="w-full text-left px-3 py-2 text-xs font-mono rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span>Structured Data</span>
                      <span className="text-[10px] uppercase font-bold text-amber-500">.JSON</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {uploadedMedia && (
            <button
              onClick={() => {
                setUploadedMedia(null);
                setCurrentProject(null);
                setFile(null);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Upload new media"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {transcriptionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-bold">Error: </span>
            {transcriptionError}
          </div>
        </div>
      )}

      {/* SECTION 0: OPTIONAL ORIGINAL VOICEOVER SCRIPT */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Original Voiceover Script
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold border border-slate-200 dark:border-slate-700">
                  Optional Linguistic Reference
                </span>
                {detectedScriptFormat && detectedScriptFormat !== 'auto' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/20">
                    Detected: {detectedScriptFormat === 'hindi_devanagari' ? 'Hindi (Devanagari)' : detectedScriptFormat === 'urdu_script' ? 'Urdu (Nastaliq)' : detectedScriptFormat === 'roman_urdu' ? 'Roman Urdu' : 'English / Mixed'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paste or upload your script to resolve ASR spelling and punctuation errors. The audio recording remains authoritative.
              </p>
            </div>
          </div>

          {/* Script format selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label htmlFor="script-format-select" className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Format:
            </label>
            <select
              id="script-format-select"
              value={scriptFormat}
              onChange={(e) => setScriptFormat(e.target.value as ReferenceScriptFormat)}
              className="text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="auto">Auto-detect</option>
              <option value="hindi_devanagari">Hindi — Devanagari</option>
              <option value="urdu_script">Urdu — Urdu script</option>
              <option value="roman_urdu">Roman Urdu</option>
              <option value="english_mixed">English / mixed-language reference</option>
            </select>
          </div>
        </div>

        {/* Script Text Editor */}
        <div className="space-y-2">
          <textarea
            rows={4}
            value={originalScriptText}
            onChange={(e) => handleScriptTextChange(e.target.value)}
            placeholder={"Paste original voiceover script here (Devanagari Hindi, Urdu script, Roman Urdu, or English)...\nExample: 'अटलांटिक ओशन। दिसंबर 1872। समंदर में एक जहाज़ अकेला तैर रहा है।'"}
            className="w-full text-xs sm:text-sm font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-y"
          />

          {scriptUploadError && (
            <p className="text-xs text-rose-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {scriptUploadError}
            </p>
          )}

          {/* Script Upload & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="script-file-upload"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={handleScriptFileUpload}
                className="hidden"
              />
              <label
                htmlFor="script-file-upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .txt or .md</span>
              </label>

              {originalScriptText && (
                <button
                  onClick={() => {
                    setOriginalScriptText('');
                    setDetectedScriptFormat('auto');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-rose-500 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>
                {originalScriptText.trim() ? originalScriptText.trim().split(/\s+/).length : 0} words
              </span>
              <span>•</span>
              <span>{originalScriptText.length} characters</span>

              {/* Re-align button if media is already loaded */}
              {uploadedMedia && (
                <button
                  onClick={() => {
                    runTranscription(
                      uploadedMedia.filename,
                      uploadedMedia.originalName,
                      mediaType,
                      manualLangCode,
                      selectedScript,
                      originalScriptText,
                      scriptFormat
                    );
                  }}
                  disabled={isTranscribing}
                  className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isTranscribing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Align with Script</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: MEDIA UPLOAD OR ACTIVE MEDIA PLAYER */}
      {!uploadedMedia ? (
        <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center hover:border-indigo-500/50 transition">
          <input
            type="file"
            id="media-uploader"
            className="hidden"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,.mkv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <label htmlFor="media-uploader" className="cursor-pointer block space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
              {isUploading ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isUploading ? 'Uploading Media...' : 'Upload Audio or Video for Voiceover Transcription'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Supports MP3, WAV, M4A, OGG, MP4, MOV, WEBM (up to 250MB). Audio will be extracted automatically from video files.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition">
                Select File
              </span>
            </div>
          </label>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Active media card header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {mediaType === 'video' ? <FileVideo className="w-6 h-6" /> : <FileAudio className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {uploadedMedia.originalName}
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="uppercase font-semibold text-indigo-500">{mediaType}</span>
                  <span>•</span>
                  <span>{(uploadedMedia.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  {currentProject && (
                    <>
                      <span>•</span>
                      <span>{currentProject.durationFormatted} Duration</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Language & Ambiguity Banner */}
            {currentProject && (
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Detected Language Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Detected:
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {currentProject.detectedLanguage}
                  </span>
                  {typeof currentProject.confidenceScore === 'number' && currentProject.confidenceScore > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {(currentProject.confidenceScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {/* Ambiguity Alert Button */}
                {currentProject.isAmbiguousHindiUrdu && (
                  <button
                    onClick={() => setIsLanguageModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium hover:bg-amber-500/20 transition cursor-pointer"
                    title="Click to clarify Hindi or Urdu detection"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Ambiguous Hindi/Urdu</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Media Player View */}
          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center">
            {mediaType === 'video' ? (
              <video
                ref={mediaRef as any}
                src={uploadedMedia.url}
                className="w-full max-w-2xl max-h-72 rounded-2xl bg-black object-contain shadow-md"
                controls
                onTimeUpdate={() => {
                  if (mediaRef.current) {
                    setCurrentPlaybackTime(mediaRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (mediaRef.current) {
                    setMediaDuration(mediaRef.current.duration);
                  }
                }}
                onPlay={() => setIsPlayingMedia(true)}
                onPause={() => setIsPlayingMedia(false)}
              />
            ) : (
              <div className="w-full max-w-xl p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <audio
                  ref={mediaRef as any}
                  src={uploadedMedia.url}
                  className="hidden"
                  onTimeUpdate={() => {
                    if (mediaRef.current) {
                      setCurrentPlaybackTime(mediaRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (mediaRef.current) {
                      setMediaDuration(mediaRef.current.duration);
                    }
                  }}
                  onPlay={() => setIsPlayingMedia(true)}
                  onPause={() => setIsPlayingMedia(false)}
                />

                <button
                  onClick={togglePlayMedia}
                  className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow transition cursor-pointer"
                >
                  {isPlayingMedia ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>{formatTime(currentPlaybackTime).slice(3, 8)}</span>
                    <span>{formatTime(mediaDuration).slice(3, 8)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={mediaDuration || 100}
                    step={0.05}
                    value={currentPlaybackTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCurrentPlaybackTime(val);
                      if (mediaRef.current) {
                        mediaRef.current.currentTime = val;
                      }
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: HINDI / URDU SCRIPT SELECTION PILLS */}
      {currentProject && isHindiOrUrdu && (
        <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Hindi / Urdu Script Choice
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Convert orthography without translating or modifying original spoken words:
              </p>
            </div>

            {isConvertingScript && (
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Converting script...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Hindi Devanagari */}
            <button
              onClick={() => handleScriptChange('hindi_devanagari')}
              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                selectedScript === 'hindi_devanagari'
                  ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedScript === 'hindi_devanagari' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Hindi Script (Devanagari)
                  </span>
                  <span className="text-[10px] font-mono text-indigo-500 font-semibold">हिन्दी</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Transcribes in native Devanagari script preserving exact words and sentence order.
                </p>
              </div>
            </button>

            {/* Urdu Roman */}
            <button
              onClick={() => handleScriptChange('urdu_roman')}
              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                selectedScript === 'urdu_roman'
                  ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedScript === 'urdu_roman' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Subtitles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Urdu Roman (Latin Alphabet)
                  </span>
                  <span className="text-[10px] font-mono text-purple-500 font-semibold">Roman Urdu</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Transcribes using intuitive, standardized Latin letters (e.g., &quot;Aap kaise hain?&quot;).
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2.5: ACCURACY & SCRIPT REVIEW WORKFLOW */}
      {currentProject && ((currentProject.reviewItems && currentProject.reviewItems.length > 0) || (currentProject.omittedReferencePassages && currentProject.omittedReferencePassages.length > 0)) && (
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Accuracy & Script Review
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                    Reference Alignment Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Audio remains the source of truth. Review suggested corrections, additions, and omitted passages.
                </p>
              </div>
            </div>

            {/* Accept All Button */}
            <button
              onClick={handleAcceptAllCorrections}
              disabled={isResolvingReview}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {isResolvingReview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              <span>Accept All Corrections</span>
            </button>
          </div>

          {/* Review Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setActiveReviewFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
                activeReviewFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Items ({currentProject.reviewItems?.length || 0})
            </button>
            <button
              onClick={() => setActiveReviewFilter('corrections')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
                activeReviewFilter === 'corrections'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              Suggested Corrections ({currentProject.reviewItems?.filter((r) => r.status === 'suggested_correction').length || 0})
            </button>
            <button
              onClick={() => setActiveReviewFilter('additions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
                activeReviewFilter === 'additions'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              Spoken Ad-libs ({currentProject.reviewItems?.filter((r) => r.status === 'spoken_addition').length || 0})
            </button>
            {currentProject.omittedReferencePassages && currentProject.omittedReferencePassages.length > 0 && (
              <button
                onClick={() => setActiveReviewFilter('omitted')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
                  activeReviewFilter === 'omitted'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                }`}
              >
                Omitted from Recording ({currentProject.omittedReferencePassages.length})
              </button>
            )}
          </div>

          {/* Omitted Passages Panel */}
          {activeReviewFilter === 'omitted' && currentProject.omittedReferencePassages && (
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400 font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Passages in Script Skipped by Speaker ({currentProject.omittedReferencePassages.length})</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                These sentences appeared in your original script but were not detected in the recorded audio. Because the audio is authoritative, they are omitted from audio timestamps rather than fabricated into the timeline.
              </p>
              <div className="space-y-1.5">
                {currentProject.omittedReferencePassages.map((p, pIdx) => (
                  <div key={pIdx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/60 text-xs text-slate-800 dark:text-slate-200 line-through opacity-80">
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtered Review Cards */}
          {activeReviewFilter !== 'omitted' && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {currentProject.reviewItems
                ?.filter((item) => {
                  if (activeReviewFilter === 'corrections') return item.status === 'suggested_correction';
                  if (activeReviewFilter === 'additions') return item.status === 'spoken_addition';
                  return true;
                })
                .map((item) => {
                  const isEditing = reviewEditingId === item.id;
                  const isAccepted = item.resolvedState === 'accepted';
                  const isRejected = item.resolvedState === 'rejected';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isAccepted
                          ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isRejected
                          ? 'border-slate-200 dark:border-slate-800 opacity-60'
                          : item.status === 'suggested_correction'
                          ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10'
                          : item.status === 'spoken_addition'
                          ? 'border-purple-300 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Seek Button */}
                          <button
                            onClick={() => handleSeekToSegment(item.start)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-[11px] font-mono text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            title="Click to seek media player"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>[{formatTime(item.start).slice(3, 8)} – {formatTime(item.end).slice(3, 8)}]</span>
                          </button>

                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold ${
                              item.status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : item.status === 'suggested_correction'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : item.status === 'spoken_addition'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {item.statusLabel}
                          </span>

                          {item.confidence !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {(item.confidence * 100).toFixed(0)}% match
                            </span>
                          )}

                          {isAccepted && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                              <Check className="w-3 h-3" /> Accepted
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {item.status === 'suggested_correction' && !isAccepted && (
                            <button
                              onClick={() => handleResolveReviewItem(item.id, 'accepted')}
                              disabled={isResolvingReview}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1"
                              title="Accept suggested correction"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                          )}

                          {!isRejected && item.status === 'suggested_correction' && (
                            <button
                              onClick={() => handleResolveReviewItem(item.id, 'rejected')}
                              disabled={isResolvingReview}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono transition cursor-pointer"
                              title="Keep recognized speech verbatim"
                            >
                              <span>Reject</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (isEditing) {
                                handleResolveReviewItem(item.id, 'edited', reviewEditText);
                              } else {
                                setReviewEditingId(item.id);
                                setReviewEditText(item.suggestedText || item.recognizedText);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isEditing ? 'Save' : 'Edit'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Content diff / comparison */}
                      <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                            Spoken Audio (Recognized):
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {item.recognizedText}
                          </span>
                        </div>

                        {item.referenceText && (
                          <div className="p-2.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40">
                            <span className="text-[10px] font-mono uppercase text-indigo-500 font-bold block mb-1">
                              Reference Script Suggestion:
                            </span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={reviewEditText}
                                onChange={(e) => setReviewEditText(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg p-1 text-xs text-slate-900 dark:text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="text-slate-900 dark:text-slate-100 font-medium">
                                {item.suggestedText || item.referenceText}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: TIMESTAMPED TRANSCRIPT SEGMENTS LIST */}
      {isTranscribing ? (
        <div className="p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Transcribing Media Audio...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Running speech recognition, detecting spoken language, and calculating exact acoustic segment timestamps.
            </p>
          </div>
        </div>
      ) : currentProject ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
                Transcript Segments ({currentProject.segments.length})
              </span>
            </div>

            {editingSegmentId && (
              <button
                onClick={handleSaveSegments}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </button>
            )}
          </div>

          {currentProject.segments.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
              No speech segments were recognized in this audio track.
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentProject.segments.map((seg, idx) => {
                const isActive = currentPlaybackTime >= seg.start && currentPlaybackTime <= seg.end;
                const isExpanded = Boolean(expandedWordSegments[seg.id]);

                return (
                  <div
                    key={seg.id || idx}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Timestamp seek pill & alignment status */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <button
                          onClick={() => handleSeekToSegment(seg.start)}
                          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700'
                          }`}
                          title="Click to seek media player here"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>[{formatTime(seg.start)} – {formatTime(seg.end)}]</span>
                        </button>

                        {seg.alignmentStatus === 'confirmed' && (
                          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Confirmed script match">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {seg.alignmentStatus === 'suggested_correction' && (
                          <span className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Script correction suggested">
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {seg.alignmentStatus === 'spoken_addition' && (
                          <span className="p-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400" title="Spoken ad-lib / not in script">
                            <Volume2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      {/* Editable Text Area */}
                      <div className="flex-1 min-w-0">
                        <textarea
                          rows={2}
                          value={seg.text}
                          onChange={(e) => {
                            setEditingSegmentId(seg.id);
                            handleSegmentTextChange(seg.id, e.target.value);
                          }}
                          className="w-full text-sm font-sans text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:ring-0 p-0 resize-none leading-relaxed"
                          placeholder="Transcript text..."
                        />

                        {/* Word-level timestamps expander */}
                        {seg.words && seg.words.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <button
                              onClick={() => {
                                setExpandedWordSegments((prev) => ({
                                  ...prev,
                                  [seg.id]: !prev[seg.id]
                                }));
                              }}
                              className="text-[10px] font-mono text-slate-400 hover:text-indigo-500 transition cursor-pointer flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide' : 'Show'} Word Timestamps ({seg.words.length})</span>
                            </button>

                            {isExpanded && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {seg.words.map((w, wIdx) => (
                                  <span
                                    key={wIdx}
                                    onClick={() => handleSeekToSegment(w.start)}
                                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 hover:bg-indigo-500 hover:text-white transition cursor-pointer"
                                    title={`Click to seek (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)`}
                                  >
                                    {w.word}
                                    <span className="opacity-50 text-[9px] ml-1">
                                      {w.start.toFixed(1)}s
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Language Correction Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Correct Detected Language
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Because Hindi and Urdu share Hindustani phonetics, you can explicitly designate the source language:
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="lang_override"
                  value="hi"
                  checked={manualLangCode === 'hi'}
                  onChange={() => setManualLangCode('hi')}
                  className="accent-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Hindi (हिन्दी)</div>
                  <div className="text-[11px] text-slate-500">Spoken in India (Devanagari register)</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="lang_override"
                  value="ur"
                  checked={manualLangCode === 'ur'}
                  onChange={() => setManualLangCode('ur')}
                  className="accent-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Urdu (اردو)</div>
                  <div className="text-[11px] text-slate-500">Spoken in Pakistan / South Asia</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="lang_override"
                  value="en"
                  checked={manualLangCode === 'en'}
                  onChange={() => setManualLangCode('en')}
                  className="accent-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">English</div>
                  <div className="text-[11px] text-slate-500">Standard English audio</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsLanguageModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyLanguageCorrection}
                className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Apply & Retranscribe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
