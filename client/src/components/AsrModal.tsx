import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Upload, FileText, Loader2, Copy, Check, AlertCircle, Square, Volume2 } from 'lucide-react';
import { ApiClient } from '../services/api';

interface AsrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (text: string, mode: 'replace' | 'append') => void;
}

export const AsrModal: React.FC<AsrModalProps> = ({
  isOpen,
  onClose,
  onApplyScript
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setError(null);
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i)) {
      setError('Please select a valid audio file (.mp3, .wav, .m4a, .ogg).');
      return;
    }
    setAudioFile(file);
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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError('Please select or record an audio file first.');
      return;
    }

    try {
      setIsTranscribing(true);
      setError(null);

      const formData = new FormData();
      formData.append('audio', audioFile);
      if (language.trim()) formData.append('language', language.trim());

      const res = await ApiClient.transcribeAudio(formData);
      setTranscribedText(res.text || '');
      setDuration(res.duration || null);
      setDetectedLang(res.language || null);
    } catch (err: any) {
      setError(err.message || 'Speech-to-text transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-border flex items-center justify-between bg-slate-50 dark:bg-studio-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Transcribe Audio to Script</h2>
              <p className="text-xs text-slate-500 font-mono">Fish Audio Speech-to-Text (/v1/asr)</p>
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Audio Input Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select or Record Audio to Transcribe
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
                <span>Record Microphone</span>
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
                  {audioFile ? audioFile.name : 'Click to select or drag & drop spoken audio'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports MP3, WAV, M4A, OGG, FLAC up to 50MB
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
                    `Recorded audio ready (${(audioFile.size / 1024).toFixed(1)} KB)`
                  ) : (
                    'Click microphone to record voice note or script'
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transcribe Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTranscribe}
              disabled={isTranscribing || !audioFile}
              className="flex-1 py-2.5 px-4 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transcribing with Fish Audio ASR...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Transcribe Spoken Audio</span>
                </>
              )}
            </button>
          </div>

          {/* Transcribed Output Result */}
          {transcribedText && (
            <div className="pt-3 border-t border-studio-border space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Transcribed Text
                  </span>
                  {detectedLang && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
                      {detectedLang}
                    </span>
                  )}
                  {duration && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({duration.toFixed(1)}s audio)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-studio-border bg-slate-50/50 dark:bg-studio-950 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              />

              {/* Action buttons to apply to Script Studio */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onApplyScript(transcribedText, 'append');
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-studio-border text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 transition"
                >
                  Append to Current Script
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyScript(transcribedText, 'replace');
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition shadow-sm"
                >
                  Replace Script with Transcription
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
