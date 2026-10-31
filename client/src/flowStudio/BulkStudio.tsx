import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Flow } from 'flow-sdk';
import { FlowApi } from '../services/flowApi';
import { motion, AnimatePresence } from 'motion/react';
import { GenerationJob, AppSettings } from './types';
import { IMAGE_MODELS, VIDEO_MODELS } from './constants';
import { parseScriptToPrompts } from './lib/parser';
import { JobCard } from './components/JobCard';
import { SectionLabel, PillButton, FieldDropdown, DragNumberField } from './components/Primitives';

export const BulkStudio: React.FC = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    imageModelQueue: ['🍌 Nano Banana Pro', '🍌 Nano Banana 2.1'],
    imageUniversalPrompt: 'Cinematic realistic photography, ultra detailed, 8K quality, professional studio lighting',
    aspectRatio: '16:9',
    videoModelQueue: ['Omni 1.1 Flash', 'Veo 3.1 - Lite'],
    videoUniversalPrompt: 'Smooth cinematic camera movement, realistic motion, professional film aesthetic',
    videoDuration: 6,
    batchSize: 20,
    currentBatchIndex: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [inspectJob, setInspectJob] = useState<GenerationJob | null>(null);
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<string | null>(null);

  useEffect(() => {
    const id = 'studio-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .dark-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
      .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .dark-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      .dark-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .shimmer-bg { position: relative; overflow: hidden; }
      .shimmer-bg::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent); animation: shimmer 2s infinite; }
      @keyframes dropdown-enter { from { opacity: 0; transform: scale(0.95) translateY(-5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      .animate-dropdown { animation: dropdown-enter 0.15s ease-out forwards; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleFileUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const text = re.target?.result as string;
        const prompts = parseScriptToPrompts(text);
        const newJobs: GenerationJob[] = prompts.map((p, i) => ({
          id: crypto.randomUUID(),
          index: i,
          sceneNumber: String(i + 1).padStart(3, '0'),
          prompt: p,
          status: 'review'
        }));
        setJobs(newJobs);
        setSettings(s => ({ ...s, currentBatchIndex: 0 }));
        setIsReviewMode(true);
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleCreateSampleScript = () => {
    const samples = [
      'An astronaut walking across a crystal neon surface on a forgotten lunar moon, bioluminescent atmosphere.',
      'Close-up cinematic macro shot of ancient cybernetic circuitry pulsating with golden liquid light.',
      'A vast floating architectural sanctuary amidst crimson volumetric clouds at dusk.',
      'A solitary samurai standing in heavy rain under neon signs in futuristic Tokyo street.'
    ];
    const newJobs: GenerationJob[] = samples.map((p, i) => ({
      id: crypto.randomUUID(),
      index: i,
      sceneNumber: String(i + 1).padStart(3, '0'),
      prompt: p,
      status: 'waiting'
    }));
    setJobs(newJobs);
    setSettings(s => ({ ...s, currentBatchIndex: 0 }));
  };

  const totalBatches = Math.max(1, Math.ceil(jobs.length / settings.batchSize));
  
  const currentBatchJobs = useMemo(() => {
    const start = settings.currentBatchIndex * settings.batchSize;
    return jobs.slice(start, start + settings.batchSize);
  }, [jobs, settings.currentBatchIndex, settings.batchSize]);

  const runTaskWithFallback = async (jobId: string, type: 'image' | 'video') => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setActiveJobId(jobId);
    
    setJobs(prev => prev.map(j => j.id === jobId ? { 
      ...j, 
      status: type === 'image' ? 'generating' : 'animating', 
      error: undefined 
    } : j));

    try {
      if (type === 'image') {
        const fullPrompt = settings.imageUniversalPrompt 
          ? `${settings.imageUniversalPrompt}\n\n${job.prompt}`
          : job.prompt;

        const res = await Flow.generate.image({
          prompt: fullPrompt,
          aspectRatio: settings.aspectRatio
        });

        setJobs(prev => prev.map(j => j.id === jobId ? { 
          ...j, 
          status: 'completed', 
          imageUrl: res.imageUrl,
          imageMediaId: res.mediaId,
          usedModel: 'Google Flow Pro Session'
        } : j));
      } else {
        const fullPrompt = settings.videoUniversalPrompt
          ? `${settings.videoUniversalPrompt}\n\n${job.prompt}`
          : job.prompt;

        const res = await Flow.generate.video({
          prompt: fullPrompt,
          firstFrameImageMediaId: job.imageMediaId,
          durationSeconds: settings.videoDuration,
          aspectRatio: settings.aspectRatio === '1:1' ? '16:9' : (settings.aspectRatio as any)
        });

        setJobs(prev => prev.map(j => j.id === jobId ? { 
          ...j, 
          status: 'animated', 
          videoUrl: res.videoUrl,
          videoMediaId: res.mediaId,
          usedModel: 'Google Flow Pro Session'
        } : j));
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Google Flow Pro generation error';
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed', error: errorMsg } : j));
    } finally {
      setActiveJobId(null);
    }
  };

  const processBatch = async (mode: 'current' | 'all' | 'next') => {
    setIsProcessing(true);
    let targetJobs: GenerationJob[] = [];
    
    if (mode === 'current') {
      targetJobs = currentBatchJobs;
    } else if (mode === 'all') {
      targetJobs = jobs;
    } else if (mode === 'next') {
      const nextIdx = Math.min(settings.currentBatchIndex + 1, totalBatches - 1);
      setSettings(s => ({ ...s, currentBatchIndex: nextIdx }));
      const start = nextIdx * settings.batchSize;
      targetJobs = jobs.slice(start, start + settings.batchSize);
    }
    
    for (const job of targetJobs) {
      if (job.status !== 'completed' && job.status !== 'animated' && job.status !== 'generating') {
        await runTaskWithFallback(job.id, 'image');
      }
    }
    setIsProcessing(false);
  };

  const animateBatch = async (mode: 'current' | 'all') => {
    setIsProcessing(true);
    const targetJobs = mode === 'current' ? currentBatchJobs : jobs;
    for (const job of targetJobs) {
      if (job.status === 'completed' && job.imageMediaId) {
        await runTaskWithFallback(job.id, 'video');
      }
    }
    setIsProcessing(false);
  };

  const downloadAllBatchMedia = async () => {
    const readyItems = currentBatchJobs.filter(j => j.imageUrl || j.videoUrl);
    if (readyItems.length === 0) return;

    setBulkDownloadStatus(`Downloading 0 / ${readyItems.length}...`);
    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      const isVideo = Boolean(item.videoUrl);
      const url = item.videoUrl || item.imageUrl!;
      const ext = isVideo ? 'mp4' : 'jpg';
      
      try {
        await Flow.download({
          url: url.startsWith('/') ? url : undefined,
          base64: url.startsWith('data:') ? url : undefined,
          filename: `batch_${settings.currentBatchIndex + 1}_scene_${item.sceneNumber}.${ext}`
        });
      } catch (e) {
        console.error('Download item failed', e);
      }
      setBulkDownloadStatus(`Downloading ${i + 1} / ${readyItems.length}...`);
    }
    setBulkDownloadStatus('Batch export complete!');
    setTimeout(() => setBulkDownloadStatus(null), 3000);
  };

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed' || j.status === 'animated').length,
    generating: jobs.filter(j => j.status === 'generating' || j.status === 'animating').length,
    failed: jobs.filter(j => j.status === 'failed').length
  };

  const batchOptions = useMemo(() => {
    return Array.from({ length: totalBatches }, (_, i) => `Batch ${i + 1}`);
  }, [totalBatches]);

  return (
    <div className="flex h-full w-full bg-white dark:bg-studio-900 text-slate-900 dark:text-white overflow-hidden rounded-2xl border border-studio-border shadow-sm min-h-[720px]">
      {/* Settings Panel */}
      <aside className="w-[320px] border-r border-studio-border flex flex-col h-full bg-slate-50/70 dark:bg-studio-950/70 z-20 shrink-0">
        <div className="p-4 border-b border-studio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-black dark:text-white text-[20px]">movie_edit</span>
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">Batch Pipeline</span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-studio-800 font-mono text-slate-600 dark:text-slate-400 border border-studio-border font-bold">SDK v2</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 dark-scrollbar">
          <div className="space-y-2">
            <SectionLabel>Pipeline Source</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <PillButton 
                variant="outline" 
                icon={<span className="material-symbols-outlined text-[16px]">upload_file</span>} 
                onClick={handleFileUpload}
              >
                Import TXT
              </PillButton>
              <PillButton 
                variant="outline" 
                icon={<span className="material-symbols-outlined text-[16px]">auto_awesome</span>} 
                onClick={handleCreateSampleScript}
              >
                Sample Script
              </PillButton>
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Flow Pro Session</SectionLabel>
            <PillButton 
              variant="outline" 
              className="w-full justify-center"
              icon={<span className="material-symbols-outlined text-[16px]">open_in_new</span>} 
              onClick={async () => {
                try {
                  await FlowApi.launchChromeProfile('acc_1');
                } catch (e: any) {
                  alert(e.message || 'Failed to open Chrome');
                }
              }}
            >
              Open Flow Chrome
            </PillButton>
            <p className="text-[10px] text-slate-500 font-mono px-1">
              Isolated studio profile. Log in once at flow.google.com.
            </p>
          </div>

          <div className="space-y-3">
            <SectionLabel>Image Stage</SectionLabel>
            <div className="p-3 bg-white dark:bg-studio-900 rounded-xl border border-studio-border space-y-3 shadow-xs">
              <div className="space-y-1">
                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Model Fallback Queue</p>
                {settings.imageModelQueue.map((m, i) => (
                  <div key={m} className="flex items-center gap-2 text-[10px] bg-slate-100 dark:bg-studio-800 p-2 rounded-lg border border-studio-border text-slate-800 dark:text-slate-200">
                    <span className="text-slate-400 dark:text-slate-500 font-bold">{i + 1}</span>
                    <span className="truncate flex-1 font-mono font-medium">{m}</span>
                    <button 
                      onClick={() => setSettings(s => ({...s, imageModelQueue: s.imageModelQueue.filter(x => x !== m)}))} 
                      className="material-symbols-outlined text-[14px] text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      close
                    </button>
                  </div>
                ))}
              </div>
              <FieldDropdown 
                label="Add Fallback Model" 
                value="Select model..." 
                options={IMAGE_MODELS.filter(m => !settings.imageModelQueue.includes(m))} 
                onChange={m => setSettings(s => ({...s, imageModelQueue: [...s.imageModelQueue, m]}))} 
              />
            </div>

            <div className="flex gap-2">
              <FieldDropdown 
                label="Aspect Ratio" 
                value={settings.aspectRatio} 
                options={['16:9', '9:16', '1:1']} 
                onChange={v => setSettings({...settings, aspectRatio: v as any})} 
                className="flex-1" 
              />
              <DragNumberField 
                label="Batch Size" 
                value={settings.batchSize} 
                min={1} 
                max={100} 
                step={1} 
                onChange={v => setSettings(s => ({...s, batchSize: v, currentBatchIndex: 0}))} 
                className="flex-1" 
              />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">Universal Style Injection</p>
              <textarea 
                className="w-full h-16 bg-white dark:bg-studio-900 border border-studio-border hover:border-black dark:hover:border-white focus:border-black dark:focus:border-white rounded-xl p-2.5 text-[11px] text-slate-800 dark:text-slate-200 outline-none resize-none transition-all font-mono"
                value={settings.imageUniversalPrompt}
                onChange={e => setSettings({...settings, imageUniversalPrompt: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>Motion / Animation Stage</SectionLabel>
            <div className="p-3 bg-white dark:bg-studio-900 rounded-xl border border-studio-border space-y-3 shadow-xs">
              <div className="space-y-1">
                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Video Model Queue</p>
                {settings.videoModelQueue.map((m, i) => (
                  <div key={m} className="flex items-center gap-2 text-[10px] bg-slate-100 dark:bg-studio-800 p-2 rounded-lg border border-studio-border text-slate-800 dark:text-slate-200">
                    <span className="text-slate-400 dark:text-slate-500 font-bold">{i + 1}</span>
                    <span className="truncate flex-1 font-mono font-medium">{m}</span>
                    <button 
                      onClick={() => setSettings(s => ({...s, videoModelQueue: s.videoModelQueue.filter(x => x !== m)}))} 
                      className="material-symbols-outlined text-[14px] text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      close
                    </button>
                  </div>
                ))}
              </div>
              <FieldDropdown 
                label="Add Video Model" 
                value="Select model..." 
                options={VIDEO_MODELS.filter(m => !settings.videoModelQueue.includes(m))} 
                onChange={m => setSettings(s => ({...s, videoModelQueue: [...s.videoModelQueue, m]}))} 
              />
            </div>

            <FieldDropdown 
              label="Motion Duration" 
              value={`${settings.videoDuration}s`} 
              options={['4s', '6s', '8s', '10s']} 
              onChange={v => setSettings({...settings, videoDuration: parseInt(v)})} 
            />

            <div className="space-y-1">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">Universal Motion Context</p>
              <textarea 
                className="w-full h-16 bg-white dark:bg-studio-900 border border-studio-border hover:border-black dark:hover:border-white focus:border-black dark:focus:border-white rounded-xl p-2.5 text-[11px] text-slate-800 dark:text-slate-200 outline-none resize-none transition-all font-mono"
                value={settings.videoUniversalPrompt}
                onChange={e => setSettings({...settings, videoUniversalPrompt: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-studio-border bg-slate-100/50 dark:bg-studio-950/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <PillButton 
              variant="solid" 
              disabled={isProcessing || jobs.length === 0} 
              onClick={() => processBatch('current')}
            >
              Batch Images
            </PillButton>
            <PillButton 
              variant="outline" 
              disabled={isProcessing || jobs.length === 0} 
              onClick={() => processBatch('all')}
            >
              All Images
            </PillButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PillButton 
              variant="outline" 
              disabled={isProcessing || jobs.length === 0} 
              onClick={() => animateBatch('current')}
            >
              Batch Video
            </PillButton>
            <PillButton 
              variant="outline" 
              disabled={isProcessing || jobs.length === 0} 
              onClick={() => animateBatch('all')}
            >
              All Video
            </PillButton>
          </div>
          <PillButton 
            variant="outline" 
            className="w-full" 
            disabled={jobs.filter(j => j.imageUrl || j.videoUrl).length === 0} 
            icon={<span className="material-symbols-outlined text-[16px]">file_download</span>}
            onClick={downloadAllBatchMedia}
          >
            {bulkDownloadStatus || 'Export Batch Media'}
          </PillButton>
        </div>
      </aside>

      {/* Main Production View */}
      <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-studio-950/40 min-w-0">
        <header className="h-[64px] border-b border-studio-border flex items-center justify-between px-6 bg-white dark:bg-studio-900 z-10 shrink-0">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[18px] font-mono font-bold text-slate-900 dark:text-white">{stats.total}</span>
              <span className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest">Scenes</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[18px] font-mono font-bold text-amber-500">{stats.generating}</span>
              <span className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest">Active</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[18px] font-mono font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
              <span className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest">Completed</span>
            </div>
            {stats.failed > 0 && (
              <div className="flex flex-col">
                <span className="text-[18px] font-mono font-bold text-rose-500">{stats.failed}</span>
                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest">Failed</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white dark:bg-studio-900 p-1 rounded-xl border border-studio-border shadow-xs">
              <button 
                disabled={settings.currentBatchIndex === 0}
                onClick={() => setSettings(s => ({...s, currentBatchIndex: s.currentBatchIndex - 1}))}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-studio-800 rounded-lg disabled:opacity-20 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              
              <div className="min-w-[130px]">
                <FieldDropdown 
                  label="" 
                  value={`Batch ${settings.currentBatchIndex + 1} / ${totalBatches}`} 
                  options={batchOptions} 
                  onChange={(val) => {
                    const idx = parseInt(val.split(' ')[1]) - 1;
                    setSettings(s => ({ ...s, currentBatchIndex: idx }));
                  }}
                  className="border-none bg-transparent"
                />
              </div>

              <button 
                disabled={settings.currentBatchIndex >= totalBatches - 1}
                onClick={() => setSettings(s => ({...s, currentBatchIndex: s.currentBatchIndex + 1}))}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-studio-800 rounded-lg disabled:opacity-20 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 dark-scrollbar relative">
          <AnimatePresence mode="popLayout">
            {jobs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto py-16"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-studio-800 border border-studio-border flex items-center justify-center text-slate-900 dark:text-white shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">movie_filter</span>
                </div>
                <h3 className="text-base font-serif font-extrabold text-slate-900 dark:text-white">No Scenes In Production</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-mono">
                  Import a text script with scene numbers (e.g. "Scene 1: ...") or load a sample script to generate shots in bulk with automated model fallbacks.
                </p>
                <div className="flex gap-3 pt-2">
                  <PillButton variant="solid" onClick={handleFileUpload}>Import Script</PillButton>
                  <PillButton variant="outline" onClick={handleCreateSampleScript}>Load Sample</PillButton>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
              >
                {currentBatchJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onGenerate={() => runTaskWithFallback(job.id, 'image')}
                    onAnimate={() => runTaskWithFallback(job.id, 'video')}
                    onUpdatePrompt={(p) => setJobs(prev => prev.map(j => j.id === job.id ? { ...j, prompt: p } : j))}
                    onInspect={(j) => setInspectJob(j)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* In-app Fullscreen Inspector */}
      {inspectJob && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-studio-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono font-bold text-slate-900 dark:text-white">Scene #{inspectJob.sceneNumber}</span>
                {inspectJob.usedModel && (
                  <span className="text-[10px] text-slate-400 font-mono">• {inspectJob.usedModel}</span>
                )}
              </div>
              <button 
                onClick={() => setInspectJob(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-studio-800 flex items-center justify-center transition-colors text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
              {inspectJob.videoUrl ? (
                <video src={inspectJob.videoUrl} controls autoPlay loop className="max-h-[55vh] max-w-full rounded-lg" />
              ) : inspectJob.imageUrl ? (
                <img src={inspectJob.imageUrl} alt={`Scene ${inspectJob.sceneNumber}`} className="max-h-[55vh] max-w-full object-contain rounded-lg" />
              ) : null}
            </div>

            <div className="p-4 border-t border-studio-border bg-slate-50 dark:bg-studio-950 flex items-center justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate max-w-[70%]">{inspectJob.prompt}</p>
              <PillButton 
                variant="solid" 
                icon={<span className="material-symbols-outlined text-[16px]">download</span>}
                onClick={async () => {
                  const isVideo = Boolean(inspectJob.videoUrl);
                  const url = inspectJob.videoUrl || inspectJob.imageUrl!;
                  const isDirectUrl = url.startsWith('/') || url.startsWith('http');
                  const ext = isVideo ? 'mp4' : 'jpg';
                  await Flow.download({
                    url: isDirectUrl ? url : undefined,
                    base64: url.startsWith('data:') ? url : undefined,
                    filename: `scene_${inspectJob.sceneNumber}.${ext}`
                  });
                }}
              >
                Download
              </PillButton>
            </div>
          </div>
        </div>
      )}

      {/* Script Review Overlay */}
      {isReviewMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/75 backdrop-blur-sm animate-dropdown">
          <div className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-studio-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">Script Segment Analyzer</h2>
                <p className="text-xs font-mono text-slate-500">Review detected storyboard scenes before rendering</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{jobs.length}</p>
                  <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Detected Scenes</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 dark-scrollbar space-y-3 bg-slate-50/50 dark:bg-studio-950/50">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 bg-white dark:bg-studio-900 border border-studio-border rounded-xl shadow-xs">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">Scene {job.sceneNumber}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">{job.prompt}</p>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-studio-border flex justify-end gap-3 bg-slate-50 dark:bg-studio-950">
              <PillButton variant="outline" className="px-8 h-10" onClick={() => { setJobs([]); setIsReviewMode(false); }}>Discard</PillButton>
              <PillButton variant="solid" className="px-10 h-10" onClick={() => {
                setJobs(prev => prev.map(j => ({ ...j, status: 'waiting' })));
                setIsReviewMode(false);
              }}>Start Production</PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkStudio;
