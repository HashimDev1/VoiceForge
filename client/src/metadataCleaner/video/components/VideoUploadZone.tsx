import React, { useRef, useState } from 'react';
import { UploadCloud, Video, ShieldCheck } from 'lucide-react';

interface VideoUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  totalVideoCount: number;
}

export const VideoUploadZone: React.FC<VideoUploadZoneProps> = ({
  onFilesSelected,
  isProcessing,
  totalVideoCount,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 sm:p-10 text-center ${
        isDragOver
          ? 'border-purple-500 bg-purple-500/5 scale-[1.005]'
          : 'border-slate-300 dark:border-studio-border hover:border-purple-400 dark:hover:border-purple-600 bg-white dark:bg-studio-900/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp4,.mov,.webm,.mkv,.avi,video/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <p className="font-mono text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            Drop AI-generated videos here, or{' '}
            <span className="text-purple-600 dark:text-purple-400 underline underline-offset-2">
              browse files
            </span>
          </p>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Supports MP4, MOV, WEBM, MKV up to 500MB each
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-studio-800 border border-slate-200 dark:border-studio-border">
            Runway &bull; Sora &bull; Kling &bull; Luma &bull; Pika &bull; Haiper
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Client-Side Privacy</span>
          </span>
        </div>
      </div>
    </div>
  );
};

