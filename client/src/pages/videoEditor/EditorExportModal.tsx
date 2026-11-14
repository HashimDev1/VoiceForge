import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  Image as ImageIcon,
  Archive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  EditorProject,
  EditorExportOptions,
  EditorExportJob,
  ExportMediaType,
  EditorFrameExportOptions,
  EditorFrameExportResult,
  EditorImagesZipResult
} from '../../../../shared/src/videoEditorTypes';
import { videoEditorApi } from '../../services/videoEditorApi';

interface EditorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EditorProject;
  playhead?: number;
  initialMode?: ExportMediaType;
}

export const EditorExportModal: React.FC<EditorExportModalProps> = ({
  isOpen,
  onClose,
  project,
  playhead = 0,
  initialMode = 'video'
}) => {
  // Export Mode: 'video' | 'image' | 'images_zip'
  const [activeTab, setActiveTab] = useState<ExportMediaType>(initialMode);

  // Video Options
  const [resolution, setResolution] = useState<'1080x1920' | '1920x1080' | '1080x1080' | '720p' | '4k'>('1080x1920');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [videoBitrate, setVideoBitrate] = useState('10M');
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [codec, setCodec] = useState<'h264' | 'hevc'>('h264');

  // Video Job State
  const [job, setJob] = useState<EditorExportJob | null>(null);
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  // Still Frame Options
  const [frameTime, setFrameTime] = useState<number>(playhead);
  const [frameFormat, setFrameFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [frameResolution, setFrameResolution] = useState<'original' | '1080p' | '720p' | '4k'>('original');
  const [isExportingFrame, setIsExportingFrame] = useState(false);
  const [frameResult, setFrameResult] = useState<EditorFrameExportResult | null>(null);

  // Images Zip State
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipResult, setZipResult] = useState<EditorImagesZipResult | null>(null);

  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize initial mode & playhead when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setFrameTime(playhead);
      setErrorMessage('');
    }
  }, [isOpen, initialMode, playhead]);

  // Default resolution based on project aspect ratio
  useEffect(() => {
    if (project.aspectRatio === '16:9') setResolution('1920x1080');
    else if (project.aspectRatio === '1:1') setResolution('1080x1080');
    else setResolution('1080x1920');
  }, [project.aspectRatio]);

  // Polling video export status
  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;

    const timer = setInterval(async () => {
      try {
        const latest = await videoEditorApi.getExportStatus(job.id);
        setJob(latest);
        if (latest.status === 'completed' || latest.status === 'failed') {
          setIsExportingVideo(false);
        }
      } catch (err: any) {
        setIsExportingVideo(false);
        setErrorMessage(err.message || 'Error checking export status');
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [job]);

  if (!isOpen) return null;

  // 1. Start Video Export
  const handleStartVideoExport = async () => {
    setIsExportingVideo(true);
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
      setIsExportingVideo(false);
      setErrorMessage(err.message || 'Failed to start video export');
    }
  };

  // 2. Export Still Frame
  const handleExportFrame = async () => {
    setIsExportingFrame(true);
    setErrorMessage('');
    setFrameResult(null);
    try {
      const options: EditorFrameExportOptions = {
        projectId: project.id,
        time: frameTime,
        format: frameFormat,
        resolution: frameResolution,
        filename: `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_frame_${Math.round(frameTime * 100)}.${frameFormat === 'jpeg' ? 'jpg' : frameFormat}`
      };
      const result = await videoEditorApi.exportFrame(project, options);
      if (!result.success || !result.frameUrl) {
        throw new Error(result.error || 'Failed to capture frame');
      }
      setFrameResult(result);

      // Trigger automatic browser download
      const a = document.createElement('a');
      a.href = result.frameUrl;
      a.download = result.filename || `frame_${Date.now()}.${frameFormat === 'jpeg' ? 'jpg' : frameFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export frame');
    } finally {
      setIsExportingFrame(false);
    }
  };

  // 3. Export All Images as ZIP
  const handleExportZip = async () => {
    setIsExportingZip(true);
    setErrorMessage('');
    setZipResult(null);
    try {
      const result = await videoEditorApi.exportImagesZip(project);
      if (!result.success || !result.zipUrl) {
        throw new Error(result.error || 'Failed to bundle images');
      }
      setZipResult(result);

      const a = document.createElement('a');
      a.href = result.zipUrl;
      a.download = result.filename || `images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export images ZIP');
    } finally {
      setIsExportingZip(false);
    }
  };

  const imageAssetsCount = project.assets.filter((a) => a.type === 'image').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#2D3340] bg-[#181B20] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D3340] bg-[#1E222B] px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#13E2CA] to-[#00F2DC] text-black font-extrabold shadow-sm">
              {activeTab === 'video' ? (
                <Film className="h-5 w-5" />
              ) : activeTab === 'image' ? (
                <Camera className="h-5 w-5" />
              ) : (
                <Archive className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest text-[#13E2CA]">
                CAPCUT EXPORT STUDIO
              </span>
              <h2 className="text-sm font-sans font-bold text-white">
                {activeTab === 'video'
                  ? 'Export Video (MP4 / MOV)'
                  : activeTab === 'image'
                  ? 'Export Still Frame (PNG / JPG)'
                  : 'Export All Project Images (ZIP)'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#282D38] hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex border-b border-[#2D3340] bg-[#14161B] px-4 pt-2 gap-2 text-xs font-sans">
          <button
            type="button"
            onClick={() => { setActiveTab('video'); setErrorMessage(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'video'
                ? 'border-[#13E2CA] text-[#13E2CA] bg-[#181B20]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video (MP4)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('image'); setErrorMessage(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'image'
                ? 'border-[#13E2CA] text-[#13E2CA] bg-[#181B20]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Still Frame (PNG / JPG)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('images_zip'); setErrorMessage(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'images_zip'
                ? 'border-[#13E2CA] text-[#13E2CA] bg-[#181B20]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>All Images ({imageAssetsCount})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs font-sans">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: VIDEO EXPORT */}
          {/* ========================================================= */}
          {activeTab === 'video' && (
            <>
              {job?.status === 'completed' ? (
                /* Completed Screen with Download */
                <div className="space-y-4 text-center py-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">Video Rendered Successfully!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ready with all visual layers, synchronized audio, effects, and captions.
                    </p>
                  </div>

                  {job.outputUrl && (
                    <div className="rounded-xl overflow-hidden border border-[#2D3340] bg-black max-h-52">
                      <video src={job.outputUrl} controls className="w-full h-full object-contain" autoPlay={false} />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2.5 pt-2">
                    <a
                      href={job.outputUrl}
                      download={job.filename || 'rendered_video.mp4'}
                      className="flex items-center gap-2 rounded-xl bg-[#13E2CA] hover:bg-[#00F2DC] text-black px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
                    >
                      <Download className="h-4 w-4 stroke-[2.5]" />
                      <span>Download Video (.MP4)</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setJob(null)}
                      className="rounded-xl border border-[#2D3340] bg-[#222631] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-[#282D38] transition cursor-pointer"
                    >
                      New Export
                    </button>
                  </div>
                </div>
              ) : isExportingVideo || job?.status === 'rendering' ? (
                /* Progress Screen */
                <div className="space-y-4 py-6 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#13E2CA]" />
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {job?.stage || 'Synthesizing multitrack video with FFmpeg...'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Progress: {job?.progress || 15}%
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#1E222B] border border-[#2D3340]">
                    <div
                      className="h-full bg-gradient-to-r from-[#13E2CA] to-[#00F2DC] transition-all duration-300"
                      style={{ width: `${job?.progress || 15}%` }}
                    />
                  </div>

                  {job && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (job?.id) {
                            await videoEditorApi.cancelExport(job.id);
                            setIsExportingVideo(false);
                            setErrorMessage('Export was cancelled.');
                          }
                        }}
                        className="rounded-xl border border-rose-900 bg-rose-950/40 px-4 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-900/60 transition cursor-pointer"
                      >
                        Cancel Export
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Export Settings Form */
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Resolution</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as any)}
                      className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2.5 text-xs font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="1080x1920">1080x1920 (9:16 Shorts / Reels / TikTok)</option>
                      <option value="1920x1080">1920x1080 (16:9 Cinema / YouTube Landscape)</option>
                      <option value="1080x1080">1080x1080 (1:1 Square Feed)</option>
                      <option value="4k">4K Ultra HD (3840x2160 / 2160x3840 Master)</option>
                      <option value="720p">720p Fast Export</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Frame Rate</label>
                      <select
                        value={fps}
                        onChange={(e) => setFps(parseInt(e.target.value) as any)}
                        className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2 text-xs font-bold text-white outline-none cursor-pointer"
                      >
                        <option value={24}>24 FPS (Cinematic)</option>
                        <option value={30}>30 FPS (Standard)</option>
                        <option value={60}>60 FPS (Ultra Smooth)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Encoder Codec</label>
                      <select
                        value={codec}
                        onChange={(e) => setCodec(e.target.value as any)}
                        className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2 text-xs font-bold text-white outline-none cursor-pointer"
                      >
                        <option value="h264">H.264 / AVC (Universally Compatible)</option>
                        <option value="hevc">H.265 / HEVC</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Video Bitrate</label>
                      <select
                        value={videoBitrate}
                        onChange={(e) => setVideoBitrate(e.target.value)}
                        className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2 text-xs font-bold text-white outline-none cursor-pointer"
                      >
                        <option value="6M">6 Mbps (Balanced)</option>
                        <option value="10M">10 Mbps (High Quality)</option>
                        <option value="18M">18 Mbps (Master / Pristine)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Audio Quality</label>
                      <select
                        value={audioBitrate}
                        onChange={(e) => setAudioBitrate(e.target.value)}
                        className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2 text-xs font-bold text-white outline-none cursor-pointer"
                      >
                        <option value="128k">128 kbps</option>
                        <option value="192k">192 kbps (Studio)</option>
                        <option value="320k">320 kbps (Audiophile)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2D3340]">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-[#2D3340] px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleStartVideoExport}
                      className="flex items-center gap-2 rounded-xl bg-[#13E2CA] hover:bg-[#00F2DC] text-black px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow active:scale-95 transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Export Video (.MP4)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STILL FRAME / IMAGE EXPORT */}
          {/* ========================================================= */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#1E222B] border border-[#2D3340] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Capture Current Playhead Frame</span>
                  <span className="text-[11px] text-slate-400">
                    Saves full composite canvas including images, titles, and effects.
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-[#13E2CA]">
                    {frameTime.toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* Time scrub / quick selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Frame Timecode:</span>
                  <span>{frameTime.toFixed(2)}s / {(project.duration || 10).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, project.duration || 10)}
                  step={0.05}
                  value={frameTime}
                  onChange={(e) => setFrameTime(parseFloat(e.target.value))}
                  className="w-full accent-[#13E2CA] cursor-pointer"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFrameTime(0)}
                    className="px-2 py-0.5 rounded bg-[#222631] text-[10px] text-slate-300 hover:text-white"
                  >
                    Start (0.0s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrameTime(playhead)}
                    className="px-2 py-0.5 rounded bg-[#222631] text-[10px] text-[#13E2CA] font-bold"
                  >
                    Current Playhead ({playhead.toFixed(2)}s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrameTime(Math.max(0, (project.duration || 10) - 0.1))}
                    className="px-2 py-0.5 rounded bg-[#222631] text-[10px] text-slate-300 hover:text-white"
                  >
                    End
                  </button>
                </div>
              </div>

              {/* Image Format & Resolution */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Image Format</label>
                  <select
                    value={frameFormat}
                    onChange={(e) => setFrameFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2 text-xs font-bold text-white outline-none cursor-pointer"
                  >
                    <option value="png">PNG (Lossless / Crisp Graphic)</option>
                    <option value="jpeg">JPG (High Quality Photo)</option>
                    <option value="webp">WebP (Modern Web Format)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Resolution</label>
                  <select
                    value={frameResolution}
                    onChange={(e) => setFrameResolution(e.target.value as any)}
                    className="w-full rounded-xl border border-[#2D3340] bg-[#1E222B] p-2 text-xs font-bold text-white outline-none cursor-pointer"
                  >
                    <option value="original">Original Project Size</option>
                    <option value="1080p">1080p FHD</option>
                    <option value="4k">4K Ultra HD (3840×2160)</option>
                    <option value="720p">720p HD</option>
                  </select>
                </div>
              </div>

              {/* Result Preview if captured */}
              {frameResult?.frameUrl && (
                <div className="space-y-2 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Frame Exported Successfully!</span>
                  </div>
                  <img
                    src={frameResult.frameUrl}
                    alt="Exported Frame"
                    className="mx-auto rounded-lg max-h-40 border border-[#2D3340] shadow-md object-contain"
                  />
                  <a
                    href={frameResult.frameUrl}
                    download={frameResult.filename || 'frame.png'}
                    className="inline-flex items-center gap-1.5 text-[#13E2CA] hover:underline font-mono text-[11px] font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Click here if download did not start automatically</span>
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2D3340]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#2D3340] px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExportFrame}
                  disabled={isExportingFrame}
                  className="flex items-center gap-2 rounded-xl bg-[#13E2CA] hover:bg-[#00F2DC] text-black px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {isExportingFrame ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Export Frame ({frameFormat.toUpperCase()})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ALL IMAGES ZIP */}
          {/* ========================================================= */}
          {activeTab === 'images_zip' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1E222B] border border-[#2D3340] text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#13E2CA]/10 border border-[#13E2CA]/30 text-[#13E2CA] flex items-center justify-center mx-auto">
                  <Archive className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-white">Batch Export All Timeline Images</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Download all {imageAssetsCount} media images currently used in this project packaged as a clean ZIP archive.
                </p>
              </div>

              {zipResult?.zipUrl && (
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ZIP Package Created! ({zipResult.imageCount} images)</span>
                  </div>
                  <a
                    href={zipResult.zipUrl}
                    download={zipResult.filename || 'images.zip'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#13E2CA] text-black px-4 py-2 font-mono font-bold text-xs uppercase"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ZIP ({((zipResult.fileSize || 0) / (1024 * 1024)).toFixed(1)} MB)</span>
                  </a>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2D3340]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#2D3340] px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={isExportingZip || imageAssetsCount === 0}
                  className="flex items-center gap-2 rounded-xl bg-[#13E2CA] hover:bg-[#00F2DC] text-black px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {isExportingZip ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Download All Images (.ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
