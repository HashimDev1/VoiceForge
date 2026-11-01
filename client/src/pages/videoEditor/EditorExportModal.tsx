import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play
} from 'lucide-react';
import {
  EditorProject,
  EditorExportOptions,
  EditorExportJob
} from '../../../../shared/src/videoEditorTypes';
import { videoEditorApi } from '../../services/videoEditorApi';

interface EditorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EditorProject;
}

export const EditorExportModal: React.FC<EditorExportModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const [resolution, setResolution] = useState<'1080x1920' | '1920x1080' | '1080x1080' | '720p'>('1080x1920');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [videoBitrate, setVideoBitrate] = useState('10M');
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [codec, setCodec] = useState<'h264' | 'hevc'>('h264');

  const [job, setJob] = useState<EditorExportJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Default resolution based on project aspect ratio
  useEffect(() => {
    if (project.aspectRatio === '16:9') setResolution('1920x1080');
    else if (project.aspectRatio === '1:1') setResolution('1080x1080');
    else setResolution('1080x1920');
  }, [project.aspectRatio]);

  // Polling export status
  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;

    const timer = setInterval(async () => {
      try {
        const latest = await videoEditorApi.getExportStatus(job.id);
        setJob(latest);
        if (latest.status === 'completed' || latest.status === 'failed') {
          setIsExporting(false);
        }
      } catch (err: any) {
        setIsExporting(false);
        setErrorMessage(err.message || 'Error checking export status');
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [job]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMessage('');
    try {
      const options: EditorExportOptions = {
        projectId: project.id,
        resolution,
        fps,
        videoBitrate,
        audioBitrate,
        codec,
        filename: `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.mp4`
      };
      const initialJob = await videoEditorApi.startExport(project, options);
      setJob(initialJob);
    } catch (err: any) {
      setIsExporting(false);
      setErrorMessage(err.message || 'Failed to start export');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-studio-border bg-slate-50 dark:bg-studio-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-sm font-bold">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                EXPORT ENGINE
              </span>
              <h2 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">
                Render Video with Multitrack FFmpeg
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 p-3 text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {job?.status === 'completed' ? (
            /* Completed Screen with Download */
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">
                  Rendering Complete!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your video is ready with all multitrack layers, effects, and audio synchronized.
                </p>
              </div>

              {job.outputUrl && (
                <div className="rounded-xl overflow-hidden border border-studio-border bg-black max-h-56">
                  <video src={job.outputUrl} controls className="w-full h-full object-contain" />
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-2">
                <a
                  href={job.outputUrl}
                  download={job.filename || 'rendered_video.mp4'}
                  className="flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-95 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download MP4</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : isExporting || job?.status === 'rendering' ? (
            /* Progress Screen */
            <div className="space-y-4 py-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {job?.stage || 'Synthesizing multitrack video...'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Progress: {job?.progress || 10}%
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${job?.progress || 10}%` }}
                />
              </div>

              {/* Cancel Button */}
              {job && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (job?.id) {
                        await videoEditorApi.cancelExport(job.id);
                        setIsExporting(false);
                        setErrorMessage('Export was cancelled by user.');
                      }
                    }}
                    className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                  >
                    Cancel Export
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Export Settings Form */
            <div className="space-y-3.5">
              {/* Resolution */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Export Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="1080x1920">1080x1920 (9:16 Shorts / Reels / TikTok)</option>
                  <option value="1920x1080">1920x1080 (16:9 Cinema / YouTube Landscape)</option>
                  <option value="1080x1080">1080x1080 (1:1 Square Feed)</option>
                  <option value="720p">720p Fast Export</option>
                </select>
              </div>

              {/* Framerate & Codec */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(parseInt(e.target.value) as any)}
                    className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none"
                  >
                    <option value={24}>24 FPS (Cinematic)</option>
                    <option value={30}>30 FPS (Standard)</option>
                    <option value={60}>60 FPS (Ultra Smooth)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Encoder Codec</label>
                  <select
                    value={codec}
                    onChange={(e) => setCodec(e.target.value as any)}
                    className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none"
                  >
                    <option value="h264">H.264 / AVC (Universally Compatible)</option>
                    <option value="hevc">H.265 / HEVC</option>
                  </select>
                </div>
              </div>

              {/* Bitrate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Video Bitrate</label>
                  <select
                    value={videoBitrate}
                    onChange={(e) => setVideoBitrate(e.target.value)}
                    className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none"
                  >
                    <option value="6M">6 Mbps (Balanced)</option>
                    <option value="10M">10 Mbps (High Quality)</option>
                    <option value="18M">18 Mbps (Master / Pristine)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Audio Quality</label>
                  <select
                    value={audioBitrate}
                    onChange={(e) => setAudioBitrate(e.target.value)}
                    className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none"
                  >
                    <option value="128k">128 kbps</option>
                    <option value="192k">192 kbps (Studio)</option>
                    <option value="320k">320 kbps (Audiophile)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-studio-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-studio-border px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Start Export</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

