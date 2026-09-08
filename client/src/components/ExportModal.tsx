import React, { useState } from 'react';
import { Project } from '../../../shared/src/types';
import { 
  Download, 
  Play, 
  Pause, 
  CheckCircle2, 
  FileArchive, 
  Sparkles, 
  Layers, 
  Video, 
  X,
  Volume2
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface ExportModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onAudioPlay: (url: string) => void;
  onAudioPause: () => void;
  isPlaying: boolean;
  currentAudioUrl: string | null;
  onSetPause: (pauseSec: number) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  isOpen,
  onClose,
  onAudioPlay,
  onAudioPause,
  isPlaying,
  currentAudioUrl,
  onSetPause
}) => {
  const [isMerging, setIsMerging] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [mergedUrl, setMergedUrl] = useState<string | null>(project.finalAudioUrl || null);

  if (!isOpen) return null;

  const completedChunks = project.chunks.filter((c) => c.status === 'success' && c.audioUrl);
  const totalSec = completedChunks.reduce((acc, c) => acc + (c.estimatedDurationSec || 5), 0);

  const handleMergeAudio = async () => {
    try {
      setIsMerging(true);
      const res = await ApiClient.mergeAudio({
        audioUrls: completedChunks.map((c) => c.audioUrl!),
        pauseSec: project.pauseBetweenClipsSec,
        projectName: project.name
      });
      setMergedUrl(res.audioUrl);
    } catch (err: any) {
      alert(err.message || 'Failed to merge audio clips.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsExportingZip(true);
      const blob = await ApiClient.downloadZipPackage({
        clips: completedChunks,
        scriptText: project.script,
        projectName: project.name
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_all_clips.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to generate ZIP package.');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-studio-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-black dark:text-white" />
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">EXPORT FINAL VOICEOVER</h2>
            </div>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
              Combine all narration clips into high quality MP3 format.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Metrics Overview Card */}
        <div className="bg-slate-50 dark:bg-studio-850 p-4 rounded-2xl border border-studio-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Clips Ready</p>
            <p className="text-base font-serif font-extrabold text-slate-900 dark:text-white">{completedChunks.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Est. Duration</p>
            <p className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatDuration(totalSec)}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Selected Voice</p>
            <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate" title={project.selectedVoice.name}>
              {project.selectedVoice.name}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Format</p>
            <p className="text-xs font-mono font-bold text-black dark:text-white">MP3 (Stereo)</p>
          </div>
        </div>

        {/* Pause Between Clips Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Pause Silence Between Clips
          </label>
          <div className="grid grid-cols-6 gap-1.5 font-mono">
            {[0, 0.25, 0.5, 1, 1.5, 2].map((pause) => (
              <button
                key={pause}
                onClick={() => onSetPause(pause)}
                className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                  project.pauseBetweenClipsSec === pause
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm'
                    : 'bg-white dark:bg-studio-850 text-slate-700 dark:text-slate-300 hover:border-black border-studio-border'
                }`}
              >
                {pause}s
              </button>
            ))}
          </div>
        </div>

        {/* Merge Trigger Button */}
        <div className="space-y-3">
          <button
            onClick={handleMergeAudio}
            disabled={isMerging || completedChunks.length === 0}
            className={`w-full py-3.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition ${
              isMerging
                ? 'bg-slate-200 dark:bg-studio-800 text-slate-400 border border-studio-border cursor-not-allowed'
                : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-95'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${isMerging ? 'animate-spin' : ''}`} />
            <span>{isMerging ? 'Merging MP3 Audio Clips...' : 'MERGE FINAL MP3 VOICEOVER'}</span>
          </button>

          {mergedUrl && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Voiceover Ready!</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                    {project.name}_final.mp3
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    isPlaying && currentAudioUrl === mergedUrl
                      ? onAudioPause()
                      : onAudioPlay(mergedUrl)
                  }
                  className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5"
                >
                  {isPlaying && currentAudioUrl === mergedUrl ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Play</span>
                </button>

                <a
                  href={mergedUrl}
                  download={`${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_final.mp3`}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-studio-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 border border-studio-border"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP3</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Alternative Export Option: ZIP Package */}
        <div className="pt-3 border-t border-studio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-black dark:text-white" />
            <div>
              <p className="text-xs font-serif font-bold text-slate-900 dark:text-slate-100">Download All Clips as ZIP</p>
              <p className="text-[10px] font-mono text-slate-500">Includes individual MP3s + script.txt</p>
            </div>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isExportingZip || completedChunks.length === 0}
            className="px-3.5 py-2 bg-slate-100 dark:bg-studio-850 hover:border-black text-slate-900 dark:text-slate-100 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border border-studio-border transition"
          >
            <Download className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>{isExportingZip ? 'Packaging ZIP...' : 'Download ZIP'}</span>
          </button>
        </div>

        {/* CapCut Workflow Banner */}
        <div className="bg-slate-50 dark:bg-studio-850 p-3.5 rounded-2xl border border-studio-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-studio-800 text-slate-900 dark:text-slate-100 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-serif font-bold text-slate-900 dark:text-white">Ready for CapCut & Premiere Pro</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Download your merged MP3 or ZIP package and drag directly into your video editor timeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
