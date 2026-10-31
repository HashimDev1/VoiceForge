import React, { useState } from 'react';
import { GenerationJob } from '../types';
import { PillButton } from './Primitives';
import { Flow } from 'flow-sdk';
import { motion } from 'motion/react';

interface JobCardProps {
  job: GenerationJob;
  onGenerate: () => void;
  onAnimate: () => void;
  onUpdatePrompt: (prompt: string) => void;
  onInspect: (job: GenerationJob) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onGenerate, onAnimate, onUpdatePrompt, onInspect }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(job.prompt);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');

  const handleDownload = async (type: 'image' | 'video') => {
    const url = type === 'video' ? job.videoUrl : job.imageUrl;
    if (!url || downloadState === 'downloading') return;

    setDownloadState('downloading');
    try {
      const parts = url.split(',');
      const base64 = parts[1];
      const mimeType = (url.split(';')[0].split(':')[1] || (type === 'video' ? 'video/mp4' : 'image/png')) as any;
      const ext = type === 'video' ? 'mp4' : (mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png');
      
      await Flow.download({
        base64,
        mimeType,
        filename: `scene_${job.sceneNumber}_${type}.${ext}`
      });
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadState('error');
      setTimeout(() => setDownloadState('idle'), 3000);
    }
  };

  const statusMap = {
    review: { label: 'Review', class: 'text-white/30' },
    waiting: { label: 'Standby', class: 'text-white/40' },
    generating: { label: 'Rendering Image', class: 'text-amber-400 animate-pulse' },
    animating: { label: 'Synthesizing Motion', class: 'text-cyan-400 animate-pulse' },
    completed: { label: 'Image Ready', class: 'text-emerald-400' },
    animated: { label: 'Motion Ready', class: 'text-cyan-400' },
    failed: { label: 'Pipeline Error', class: 'text-red-400' },
  };

  const status = statusMap[job.status] || statusMap.waiting;
  const displayImage = job.imageUrl || (job.status === 'completed' ? `/api/flow/image-file/roman_scene_${job.sceneNumber}.jpg` : undefined);

  return (
    <motion.div 
      layout
      className="bg-white dark:bg-studio-900 border border-studio-border rounded-2xl overflow-hidden flex flex-col h-[430px] transition-all hover:border-black dark:hover:border-white shadow-sm group relative text-slate-900 dark:text-white"
    >
      {/* Preview Area */}
      <div className="h-44 bg-slate-950 relative shimmer-bg flex items-center justify-center border-b border-studio-border">
        <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md border border-white/20 text-[9px] font-mono font-bold text-white tracking-[1.5px]">
          #{job.sceneNumber}
        </div>

        {job.usedModel && (
          <div className="absolute top-3 right-3 z-20 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-md text-[8px] text-white font-mono font-semibold truncate max-w-[120px]">
            {job.usedModel}
          </div>
        )}

        {job.status === 'failed' && (
          <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center p-4 text-center z-10">
            <span className="material-symbols-outlined text-red-400 mb-1 text-[24px]">warning</span>
            <p className="text-[10px] font-bold text-red-300 line-clamp-2 px-2">{job.error || 'Failed'}</p>
            <PillButton variant="outline" className="mt-2 scale-90" onClick={onGenerate}>Retry</PillButton>
          </div>
        )}

        {(job.status === 'generating' || job.status === 'animating') && (
          <div className="z-10 flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-[10px] font-mono text-white/80 tracking-wider">
              {job.status === 'generating' ? 'GENERATING...' : 'ANIMATING...'}
            </span>
          </div>
        )}

        {displayImage ? (
          <div className="w-full h-full relative group">
            {job.videoUrl ? (
              <video src={job.videoUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            ) : (
              <img 
                src={displayImage} 
                className="w-full h-full object-cover" 
                alt={`Scene ${job.sceneNumber}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/api/flow/image-file/roman_scene_001.jpg';
                }}
              />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <PillButton 
                variant="solid" 
                className="h-8 px-3 text-[11px]" 
                icon={<span className="material-symbols-outlined text-[16px]">open_in_full</span>} 
                onClick={() => onInspect(job)}
              >
                Inspect
              </PillButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-600">
            <span className="material-symbols-outlined text-[44px]">image</span>
            <span className="text-[9px] uppercase tracking-widest font-mono">Pending Render</span>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${job.status === 'animated' ? 'bg-cyan-500' : job.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${status.class}`}>{status.label}</span>
            </div>
            {job.prompt && (
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className="text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                title="Edit prompt text"
              >
                <span className="material-symbols-outlined text-[13px]">{isEditing ? 'done' : 'edit'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto dark-scrollbar pr-1 min-h-[70px]">
            {isEditing ? (
              <textarea 
                autoFocus
                className="w-full h-full bg-slate-50 dark:bg-studio-950 border border-studio-border rounded-xl p-2.5 text-[11px] text-slate-900 dark:text-white outline-none resize-none focus:border-black dark:focus:border-white transition-colors"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => { onUpdatePrompt(editValue); setIsEditing(false); }}
              />
            ) : (
              <p 
                className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors cursor-text font-normal"
                onClick={() => setIsEditing(true)}
              >
                {job.prompt}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 flex items-center gap-1.5 border-t border-studio-border mt-auto">
          {(job.status === 'waiting' || job.status === 'failed' || job.status === 'review') ? (
            <PillButton 
              className="flex-1 bg-amber-400 hover:bg-amber-300 text-black h-9 text-[11px] font-semibold" 
              icon={<span className="material-symbols-outlined text-[16px]">bolt</span>} 
              onClick={onGenerate}
            >
              Generate Image
            </PillButton>
          ) : job.status === 'completed' ? (
            <>
              <PillButton 
                className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-black h-9 text-[11px] font-semibold" 
                icon={<span className="material-symbols-outlined text-[16px]">movie</span>} 
                onClick={onAnimate}
              >
                Animate
              </PillButton>
              <PillButton 
                variant="outline" 
                className="w-9 h-9 p-0 flex items-center justify-center shrink-0" 
                disabled={downloadState === 'downloading'}
                icon={<span className="material-symbols-outlined text-[16px]">{downloadState === 'done' ? 'check' : 'download'}</span>} 
                onClick={() => handleDownload('image')} 
              />
              <PillButton 
                variant="outline" 
                className="w-9 h-9 p-0 flex items-center justify-center shrink-0" 
                icon={<span className="material-symbols-outlined text-[16px]">refresh</span>} 
                onClick={onGenerate} 
              />
            </>
          ) : job.status === 'animated' ? (
            <>
              <PillButton 
                variant="outline" 
                className="flex-1 h-9 text-[11px]" 
                icon={<span className="material-symbols-outlined text-[16px]">replay</span>} 
                onClick={onAnimate}
              >
                Re-animate
              </PillButton>
              <PillButton 
                variant="solid" 
                className="w-9 h-9 p-0 flex items-center justify-center shrink-0" 
                disabled={downloadState === 'downloading'}
                icon={<span className="material-symbols-outlined text-[16px]">{downloadState === 'done' ? 'check' : 'download'}</span>} 
                onClick={() => handleDownload('video')} 
              />
              <PillButton 
                variant="outline" 
                className="w-9 h-9 p-0 flex items-center justify-center shrink-0" 
                icon={<span className="material-symbols-outlined text-[16px]">refresh</span>} 
                onClick={onGenerate} 
              />
            </>
          ) : (
            <div className="flex-1 h-9 flex items-center justify-center opacity-40">
              <span className="text-[10px] font-mono uppercase tracking-widest">Processing...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
