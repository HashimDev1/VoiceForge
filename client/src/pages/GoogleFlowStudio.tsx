import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Sparkles,
  Users,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Trash2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Upload,
  ChevronRight,
  Info,
  Check,
  Pause,
  AlertTriangle,
  FileVideo,
  Copy,
  Key,
  Image as ImageIcon,
  Eye,
  Wand2,
  X
} from 'lucide-react';
import {
  FlowAccount,
  FlowJob,
  FlowImageItem,
  FlowStudioOverview,
  FlowJobSettings,
  FlowSelectionMode
} from '../../../shared/src/types';
import { FlowApi } from '../services/flowApi';
import { BulkStudio } from '../flowStudio/BulkStudio';
import { FlowSessionModal } from '../components/FlowSessionModal';

type StudioSubTab = 'generate' | 'batch' | 'images' | 'accounts' | 'queue' | 'gallery';

const DEMO_PROMPT =
  'A fluffy orange cat dancing happily on two legs in a colorful living room, playful choreography, cinematic lighting, smooth camera movement, high detail.';

export const GoogleFlowStudio: React.FC = () => {
  const [subTab, setSubTab] = useState<StudioSubTab>('images');
  const [overview, setOverview] = useState<FlowStudioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Flow Images Gallery state
  const [images, setImages] = useState<FlowImageItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<FlowImageItem | null>(null);

  // Session Vault modal state
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionModalTargetAccId, setSessionModalTargetAccId] = useState<string | undefined>(undefined);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectionMode, setSelectionMode] = useState<FlowSelectionMode>('auto');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [cameraMovement, setCameraMovement] = useState<
    'static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'cinematic'
  >('cinematic');
  const [stylePreset, setStylePreset] = useState('Cinematic');
  const [motionIntensity, setMotionIntensity] = useState(6);
  const [submitting, setSubmitting] = useState(false);

  // Account editing state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editProfile, setEditProfile] = useState('');
  const [editPriority, setEditPriority] = useState(1);

  // File import state for needs_attention jobs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImportJobId, setActiveImportJobId] = useState<string | null>(null);

  // Queue filter
  const [queueFilter, setQueueFilter] = useState<string>('all');

  const fetchOverview = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const data = await FlowApi.getOverview();
      setOverview(data);
      if (!selectedAccountId && data.accounts.length > 0) {
        setSelectedAccountId(data.accounts[0].id);
      }
      setErrorMsg(null);
    } catch (err: any) {
      if (!isBackground) {
        setErrorMsg(err.message || 'Failed to load Google Flow Studio data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchImages = async () => {
    try {
      setLoadingImages(true);
      const data = await FlowApi.getImages();
      setImages(data);
    } catch (err: any) {
      console.warn('Failed to load Flow images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await FlowApi.deleteImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      setSuccessMsg('Image removed from Flow Gallery.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete image');
    }
  };

  const handleAnimateImage = (img: FlowImageItem) => {
    setPrompt(img.prompt);
    setImageUrl(img.imageUrl || '');
    setSubTab('generate');
    setSuccessMsg(`"${img.title}" loaded as motion reference! Select an account and generate video.`);
  };

  useEffect(() => {
    fetchOverview();
    fetchImages();
    // Poll queue every 4 seconds when jobs are active
    const interval = setInterval(() => {
      fetchOverview(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUseDemoPrompt = () => {
    setPrompt(DEMO_PROMPT);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setErrorMsg('Please enter a video prompt description.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await FlowApi.createJob({
        prompt: prompt.trim(),
        imageUrl: imageUrl.trim() || undefined,
        selectionMode,
        accountId: selectionMode === 'manual' ? selectedAccountId : undefined,
        settings: {
          aspectRatio,
          cameraMovement,
          stylePreset,
          motionIntensity
        }
      });

      setSuccessMsg(`Video generation job queued: ${created.id}`);
      setPrompt('');
      await fetchOverview();
      setSubTab('queue');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to queue video generation job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLaunchChrome = async (accountId: string) => {
    try {
      const result = await FlowApi.launchChromeProfile(accountId);
      setSuccessMsg(result.message);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to launch Chrome');
    }
  };

  const handleCheckAccount = async (accountId: string) => {
    try {
      const updated = await FlowApi.checkAccountStatus(accountId);
      setSuccessMsg(`Status updated for ${updated.name}: ${updated.status}`);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to check account status');
    }
  };

  const handleStartEditAccount = (acc: FlowAccount) => {
    setEditingAccountId(acc.id);
    setEditName(acc.name);
    setEditProfile(acc.profileDirectory);
    setEditPriority(acc.priority);
  };

  const handleSaveAccount = async (accountId: string) => {
    try {
      await FlowApi.updateAccount(accountId, {
        name: editName,
        profileDirectory: editProfile,
        priority: editPriority
      });
      setEditingAccountId(null);
      setSuccessMsg('Account configuration updated successfully.');
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update account');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await FlowApi.retryJob(jobId);
      setSuccessMsg(`Job ${jobId} queued for retry.`);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retry job');
    }
  };

  const handleResumeJob = async (jobId: string) => {
    try {
      await FlowApi.resumeJob(jobId);
      setSuccessMsg(`Job ${jobId} resumed.`);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resume job');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await FlowApi.cancelJob(jobId);
      setSuccessMsg(`Job ${jobId} cancelled.`);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel job');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job and its media?')) return;
    try {
      await FlowApi.deleteJob(jobId);
      setSuccessMsg(`Job deleted.`);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete job');
    }
  };

  const handleTriggerImport = (jobId: string) => {
    setActiveImportJobId(jobId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileImported = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportJobId) return;

    try {
      setRefreshing(true);
      await FlowApi.importResult(activeImportJobId, file);
      setSuccessMsg('Video result imported successfully! Added to gallery.');
      setActiveImportJobId(null);
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import video file');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredJobs = (overview?.jobs || []).filter((j) => {
    if (queueFilter === 'all') return true;
    if (queueFilter === 'running') return j.status === 'running';
    if (queueFilter === 'pending') return j.status === 'pending';
    if (queueFilter === 'needs_attention') return j.status === 'needs_attention';
    if (queueFilter === 'completed') return j.status === 'completed';
    if (queueFilter === 'failed') return j.status === 'failed';
    return true;
  });

  const completedVideos = (overview?.jobs || []).filter(
    (j) => j.status === 'completed' && j.videoUrl
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hidden file input for manual video import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImported}
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
      />

      {/* Page Header matching Script Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Flow Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Video Production
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            MULTI-PROFILE VIDEO GENERATION ORCHESTRATION & CENTRALIZED GALLERY
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOverview()}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-studio-border transition flex items-center gap-2 shadow-sm cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Metrics Grid matching Script Studio panel tokens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-studio-900 p-3.5 rounded-2xl border border-studio-border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
            <span>Accounts</span>
            <Users className="w-4 h-4 text-slate-900 dark:text-white" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
            {overview?.stats.activeAccounts || 0}{' '}
            <span className="text-xs font-normal text-slate-500">Ready</span>
          </div>
        </div>

        <div className="bg-white dark:bg-studio-900 p-3.5 rounded-2xl border border-studio-border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
            <span>Active</span>
            <Clock className="w-4 h-4 text-slate-900 dark:text-white" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
            {overview?.stats.runningJobs || 0}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({overview?.stats.pendingJobs || 0} queued)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-studio-900 p-3.5 rounded-2xl border border-studio-border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {overview?.stats.completedJobs || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-studio-900 p-3.5 rounded-2xl border border-studio-border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
            <span>Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
            {overview?.stats.needsAttentionJobs || 0}
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Studio Sub-Navigation Tabs matching Script Studio Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-studio-border">
        <button
          onClick={() => setSubTab('generate')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer ${
            subTab === 'generate'
              ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
              : 'bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black border border-studio-border'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate Video</span>
        </button>

        <button
          onClick={() => setSubTab('batch')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer ${
            subTab === 'batch'
              ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
              : 'bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black border border-studio-border'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Batch Studio</span>
          <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-mono ${subTab === 'batch' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-slate-100 dark:bg-studio-800 text-slate-600 dark:text-slate-400'}`}>BATCH</span>
        </button>

        <button
          onClick={() => setSubTab('images')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer ${
            subTab === 'images'
              ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
              : 'bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black border border-studio-border'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Images Gallery</span>
          <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-mono ${subTab === 'images' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-bold'}`}>
            {images.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('accounts')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer ${
            subTab === 'accounts'
              ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
              : 'bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black border border-studio-border'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Account Profiles</span>
          <span className="px-1.5 py-0.2 text-[9px] bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 rounded-full font-mono">{overview?.stats.totalAccounts || 10}</span>
        </button>

        <button
          onClick={() => setSubTab('queue')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer ${
            subTab === 'queue'
              ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
              : 'bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black border border-studio-border'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Queue & History</span>
          {(overview?.stats.runningJobs || 0) + (overview?.stats.pendingJobs || 0) > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] bg-amber-500 text-white rounded-full font-mono animate-pulse">
              {(overview?.stats.runningJobs || 0) + (overview?.stats.pendingJobs || 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('gallery')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer ${
            subTab === 'gallery'
              ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
              : 'bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black border border-studio-border'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Video Gallery</span>
          <span className="px-1.5 py-0.2 text-[9px] bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 rounded-full font-mono">
            {completedVideos.length}
          </span>
        </button>
      </div>

      {/* TAB: BATCH STUDIO (Optional batch workstation) */}
      {subTab === 'batch' && (
        <div className="w-full min-h-[680px]">
          <BulkStudio />
        </div>
      )}

      {/* TAB: IMAGES GALLERY (Flow Generated Scenes) */}
      {subTab === 'images' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-studio-border pb-4">
              <div>
                <h2 className="text-base font-serif font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  <span>Google Flow Generated Images</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                    {images.length} Scenes Loaded
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Synchronized from your Google Flow workstation. Click any image to preview in 4K, copy prompt, or animate into video.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchImages}
                  disabled={loadingImages}
                  className="px-3.5 py-2 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 border border-studio-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingImages ? 'animate-spin' : ''}`} />
                  <span>Refresh Images</span>
                </button>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-400" />
                <h3 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">
                  No Generated Images Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-mono">
                  Images generated with Flow models will be cataloged and viewable here with full lightbox preview and 1-click video animation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group bg-white dark:bg-studio-900 border border-studio-border hover:border-black dark:hover:border-white rounded-2xl overflow-hidden shadow-sm transition flex flex-col justify-between"
                  >
                    {/* Image Preview & Hover Actions */}
                    <div
                      className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                      onClick={() => setLightboxImage(img)}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-between p-3">
                        <span className="text-[11px] font-mono text-white flex items-center gap-1 font-bold">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Expand 4K Lightbox</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-white backdrop-blur-xs">
                          {img.aspectRatio}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{img.modelUsed}</span>
                          <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                        </div>

                        <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white line-clamp-1">
                          {img.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
                          "{img.prompt}"
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-3 border-t border-studio-border flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleAnimateImage(img)}
                          className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="Send to Generate Video pipeline"
                        >
                          <Wand2 className="w-3 h-3 text-amber-400 dark:text-amber-600" />
                          <span>Animate Video</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(img.prompt);
                              setSuccessMsg('Prompt copied to clipboard!');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition cursor-pointer"
                            title="Copy prompt"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={img.imageUrl}
                            download={img.filename}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition cursor-pointer"
                            title="Download high-res image"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                            title="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: GENERATE VIDEO */}
      {subTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Prompt Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Text-to-Video Prompt</span>
                  <span className="text-xs font-normal text-slate-500">(Required)</span>
                </label>

                <button
                  type="button"
                  onClick={handleUseDemoPrompt}
                  className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 hover:border-black dark:hover:border-white bg-slate-100 dark:bg-studio-800 rounded-lg border border-studio-border transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-black dark:text-white" />
                  <span>Insert Cat Demo Prompt</span>
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene in detail: subjects, setting, lighting, camera motion, and visual style..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition text-sm resize-none font-mono"
              />

              {/* Image to Video Input */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Image-to-Video Initial Frame (Optional)</span>
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL or leave empty for text-to-video generation..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black dark:focus:border-white font-mono"
                />
              </div>

              {/* Aspect Ratio Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2 font-mono uppercase tracking-wider">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: '16:9', label: '16:9 Landscape', desc: 'YouTube & Desktop' },
                    { id: '9:16', label: '9:16 Vertical', desc: 'Shorts, Reels, TikTok' },
                    { id: '1:1', label: '1:1 Square', desc: 'Instagram Feed' }
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer shadow-xs ${
                        aspectRatio === ratio.id
                          ? 'border-black dark:border-white bg-slate-100 dark:bg-studio-800 text-slate-900 dark:text-white font-bold'
                          : 'border-studio-border hover:border-black dark:hover:border-white bg-white dark:bg-studio-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{ratio.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{ratio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Motion & Style Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 font-mono uppercase tracking-wider">
                    Camera Movement
                  </label>
                  <select
                    value={cameraMovement}
                    onChange={(e) => setCameraMovement(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                  >
                    <option value="cinematic">Cinematic Dynamic</option>
                    <option value="zoom_in">Slow Zoom In</option>
                    <option value="zoom_out">Slow Zoom Out</option>
                    <option value="pan_left">Pan Left</option>
                    <option value="pan_right">Pan Right</option>
                    <option value="static">Static Stable Frame</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 font-mono uppercase tracking-wider">
                    Visual Style Preset
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                  >
                    <option value="Cinematic">Cinematic Movie Lighting</option>
                    <option value="Photorealistic">Photorealistic 8K</option>
                    <option value="Anime">Studio Ghibli Anime</option>
                    <option value="3D Animation">3D Pixar Render</option>
                    <option value="Hyper-detail">Hyper-detailed Wildlife</option>
                    <option value="Cyberpunk">Cyberpunk Neon</option>
                  </select>
                </div>
              </div>

              {/* Motion Intensity */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                  <span className="font-semibold font-mono uppercase tracking-wider">Motion Dynamics Intensity:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{motionIntensity} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(parseInt(e.target.value, 10))}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleCreateJob}
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl font-mono font-bold uppercase tracking-wider text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Job to Scheduler...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>Generate Video with Google Flow Studio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Account Selection Card */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Account Selection Mode</span>
              </h2>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode('auto')}
                  className={`w-full p-3 rounded-xl border text-left transition cursor-pointer shadow-xs ${
                    selectionMode === 'auto'
                      ? 'border-black dark:border-white bg-slate-100 dark:bg-studio-800 text-slate-900 dark:text-white'
                      : 'border-studio-border hover:border-black dark:hover:border-white text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Automatic Smart Scheduling</span>
                    {selectionMode === 'auto' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Selects next eligible Google AI Pro account via priority & round-robin. Strictly avoids concurrent collision.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectionMode('manual')}
                  className={`w-full p-3 rounded-xl border text-left transition cursor-pointer shadow-xs ${
                    selectionMode === 'manual'
                      ? 'border-black dark:border-white bg-slate-100 dark:bg-studio-800 text-slate-900 dark:text-white'
                      : 'border-studio-border hover:border-black dark:hover:border-white text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Manual Account Selection</span>
                    {selectionMode === 'manual' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Choose an explicit Google AI Pro account profile for this specific generation.
                  </div>
                </button>
              </div>

              {/* Manual Account Selector */}
              {selectionMode === 'manual' && (
                <div className="pt-2 border-t border-studio-border space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Target Google Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-studio-border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-mono"
                  >
                    {(overview?.accounts || []).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.sessionData?.status === 'connected' ? '• [✓ Session Connected]' : '• [No Session]'} ({acc.profileDirectory})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSessionModalTargetAccId(selectedAccountId);
                        setSessionModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-2.5 bg-slate-100 dark:bg-studio-800 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition border border-studio-border cursor-pointer shadow-xs"
                    >
                      <Key className="w-3 h-3 text-amber-500" />
                      <span>Connect Session</span>
                    </button>

                    {selectedAccountId && (
                      <button
                        type="button"
                        onClick={() => handleLaunchChrome(selectedAccountId)}
                        className="py-1.5 px-2.5 bg-slate-100 dark:bg-studio-800 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition border border-studio-border cursor-pointer shadow-xs"
                        title="Open Chrome Profile"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Chrome</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Security info note */}
              <div className="p-3 bg-slate-50 dark:bg-studio-950/60 rounded-xl border border-studio-border text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-mono">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Direct Session & Profile Vault</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Use your Google Flow accounts in VoiceForge Studio by pasting session cookies or launching isolated profiles. Credits remain in your accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT MANAGER */}
      {subTab === 'accounts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-studio-border pb-4">
              <div>
                <h2 className="text-base font-serif font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Google AI Pro Accounts Manager</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                    Session Vault
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Connect your Google Flow accounts via session cookies or isolated Chrome profiles to use credits directly inside the tool.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSessionModalTargetAccId(undefined);
                    setSessionModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Connect Flow Session</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSessionModalTargetAccId(undefined);
                    setSessionModalOpen(true);
                  }}
                  className="px-3 py-2 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 border border-studio-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Bulk Import or Export sessions"
                >
                  <span>Bulk Sync</span>
                </button>
              </div>
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(overview?.accounts || []).map((acc) => {
                const isEditing = editingAccountId === acc.id;

                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl border border-studio-border bg-slate-50/50 dark:bg-studio-950/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold flex items-center justify-center border border-studio-border">
                          #{acc.slotNumber}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white font-bold"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {acc.name}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase ${
                          acc.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : acc.status === 'in_use'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse'
                            : acc.status === 'needs_auth'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </div>

                    {/* Profile Mapping & Details */}
                    <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Chrome Profile:</span>
                        {isEditing ? (
                          <select
                            value={editProfile}
                            onChange={(e) => setEditProfile(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white font-mono"
                          >
                            {(overview?.chrome.availableProfiles || []).map((prof) => (
                              <option key={prof} value={prof}>
                                {prof}
                              </option>
                            ))}
                            <option value="Profile 1">Profile 1</option>
                            <option value="Profile 2">Profile 2</option>
                            <option value="Profile 3">Profile 3</option>
                            <option value="Profile 4">Profile 4</option>
                            <option value="Profile 5">Profile 5</option>
                            <option value="Profile 6">Profile 6</option>
                            <option value="Profile 7">Profile 7</option>
                            <option value="Profile 8">Profile 8</option>
                            <option value="Profile 9">Profile 9</option>
                            <option value="Profile 10">Profile 10</option>
                          </select>
                        ) : (
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {acc.profileDirectory}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Priority Rank:</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={editPriority}
                            onChange={(e) => setEditPriority(parseInt(e.target.value, 10))}
                            className="w-16 px-2 py-0.5 text-xs rounded border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white"
                          />
                        ) : (
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            Rank {acc.priority}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Credit Balance:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {acc.creditBalanceLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Flow Session:</span>
                        {acc.sessionData?.status === 'connected' ? (
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{acc.sessionData.userEmail || 'Active Pro Credits'}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSessionModalTargetAccId(acc.id);
                              setSessionModalOpen(true);
                            }}
                            className="text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Key className="w-3 h-3" />
                            <span>Connect Session</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Jobs Today:</span>
                        <span className="font-mono">{acc.dailyJobsCount} completed</span>
                      </div>

                      {acc.notes && (
                        <p className="text-[11px] text-slate-500 italic pt-1 truncate">
                          {acc.notes}
                        </p>
                      )}
                    </div>

                    {/* Account Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-studio-border">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveAccount(acc.id)}
                            className="flex-1 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAccountId(null)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSessionModalTargetAccId(acc.id);
                              setSessionModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-studio-800 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border border-studio-border flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            title={acc.sessionData?.status === 'connected' ? 'Manage Flow Session' : 'Connect Flow Session'}
                          >
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                            <span>{acc.sessionData?.status === 'connected' ? 'Session' : 'Connect'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLaunchChrome(acc.id)}
                            className="flex-1 py-1.5 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border border-studio-border flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            title="Open native Chrome with this isolated profile to sign in or inspect"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Chrome</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCheckAccount(acc.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 rounded-lg transition border border-studio-border cursor-pointer"
                            title="Verify profile status"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditAccount(acc)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800 rounded-lg transition border border-studio-border cursor-pointer"
                            title="Edit friendly name & profile mapping"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUEUE & HISTORY */}
      {subTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Jobs' },
              { id: 'running', label: 'Running' },
              { id: 'pending', label: 'Pending' },
              { id: 'needs_attention', label: 'Needs Attention' },
              { id: 'completed', label: 'Completed' },
              { id: 'failed', label: 'Failed' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setQueueFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer shadow-xs ${
                  queueFilter === f.id
                    ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
                    : 'bg-white dark:bg-studio-900 border border-studio-border text-slate-600 dark:text-slate-400 hover:border-black'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-sm">
              <Clock className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-semibold font-serif text-slate-900 dark:text-white">No jobs found matching this filter.</p>
              <button
                onClick={() => setSubTab('generate')}
                className="text-xs font-mono font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
              >
                Generate a new video job →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className={`bg-white dark:bg-studio-900 border rounded-2xl p-5 shadow-sm space-y-3 transition ${
                    job.status === 'needs_attention'
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : job.status === 'running'
                      ? 'border-black dark:border-white'
                      : 'border-studio-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">{job.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </span>
                      {job.accountName && (
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 border border-studio-border rounded font-bold">
                          {job.accountName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : job.status === 'running'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse'
                            : job.status === 'needs_attention'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : job.status === 'failed'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-studio-800 dark:text-slate-300'
                        }`}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Prompt Text */}
                  <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2">
                    "{job.prompt}"
                  </p>

                  {/* Settings tags */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-studio-800 border border-studio-border rounded">
                      Ratio: {job.settings.aspectRatio}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-studio-800 border border-studio-border rounded">
                      Camera: {job.settings.cameraMovement}
                    </span>
                    {job.settings.stylePreset && (
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-studio-800 border border-studio-border rounded">
                        Style: {job.settings.stylePreset}
                      </span>
                    )}
                  </div>

                  {/* Stage Message */}
                  {job.stageMessage && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span>{job.stageMessage}</span>
                    </div>
                  )}

                  {/* Needs Attention Instruction Box */}
                  {job.status === 'needs_attention' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Manual Interaction Required</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {job.manualActionRequired ||
                          'Please review the Google Flow Studio tab in Chrome to complete generation.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {job.accountId && (
                          <button
                            type="button"
                            onClick={() => handleLaunchChrome(job.accountId!)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open in Chrome</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResumeJob(job.id)}
                          className="px-2.5 py-1 bg-slate-200 dark:bg-studio-800 text-slate-900 dark:text-white hover:bg-slate-300 rounded-lg text-xs font-semibold"
                        >
                          Resume Job
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerImport(job.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Import Video File</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-studio-border text-xs">
                    <div className="flex items-center gap-2">
                      {job.videoUrl && (
                        <a
                          href={job.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-900 dark:text-white font-mono font-bold hover:underline flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>View Video</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {job.status === 'failed' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded transition"
                          title="Retry job"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(job.status === 'running' || job.status === 'pending') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded transition"
                          title="Cancel job"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition"
                        title="Delete job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: VIDEO GALLERY */}
      {subTab === 'gallery' && (
        <div className="space-y-4">
          {completedVideos.length === 0 ? (
            <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl p-16 text-center text-slate-500 space-y-3 shadow-sm">
              <Film className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">
                No Completed Videos in Gallery
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto font-mono">
                Completed video generations from Google Flow will be automatically cataloged and playable here with full preview, download, and metadata.
              </p>
              <button
                onClick={() => setSubTab('generate')}
                className="mt-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-sm"
              >
                Create Your First Video →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  {/* Video Player */}
                  <div className="relative bg-black aspect-video flex items-center justify-center">
                    <video
                      src={video.videoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Metadata Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">{video.accountName || 'Google AI Pro'}</span>
                        <span className="font-mono">{video.completedAt ? new Date(video.completedAt).toLocaleDateString() : ''}</span>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-3 font-medium">
                        "{video.prompt}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-studio-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 rounded font-bold border border-studio-border">
                          {video.settings.aspectRatio}
                        </span>
                        {video.fileSizeBytes && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(video.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(video.prompt);
                            setSuccessMsg('Prompt copied to clipboard!');
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                          title="Copy prompt"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={video.videoUrl}
                          download={`flow_${video.id}.mp4`}
                          className="p-1.5 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white transition cursor-pointer"
                          title="Download video"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteJob(video.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Delete from gallery"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flow Session Vault Modal */}
      <FlowSessionModal
        accounts={overview?.accounts || []}
        initialAccountId={sessionModalTargetAccId}
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onSessionUpdated={async () => {
          await fetchOverview(true);
        }}
      />

      {/* Lightbox Modal for 4K Image Inspection */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-5xl w-full bg-white dark:bg-studio-900 border border-studio-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-studio-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">
                  {lightboxImage.title}
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {lightboxImage.modelUsed} • {lightboxImage.aspectRatio}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden max-h-[60vh]">
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="p-4 border-t border-studio-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-studio-950/50">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-mono line-clamp-2 max-w-2xl">
                "{lightboxImage.prompt}"
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxImage.imageUrl}
                  download={lightboxImage.filename}
                  className="px-3.5 py-2 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-800 dark:text-slate-200 border border-studio-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    handleAnimateImage(lightboxImage);
                    setLightboxImage(null);
                  }}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                  <span>Animate Video</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GoogleFlowStudio;
