import React, { useRef, useState } from 'react';
import { UploadCloud, Sparkles } from 'lucide-react';
import { createSampleAiJpeg } from '../SampleAiGenerator';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  totalImagesCount: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  isProcessing,
  totalImagesCount,
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
      filterAndEmitFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      filterAndEmitFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const filterAndEmitFiles = (files: File[]) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    const validFiles: File[] = [];

    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (validExtensions.includes(ext) || f.type.startsWith('image/')) {
        if (f.size <= 50 * 1024 * 1024) {
          validFiles.push(f);
        } else {
          alert(`File "${f.name}" exceeds the 50MB limit.`);
        }
      }
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleLoadSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sample = createSampleAiJpeg();
    onFilesSelected([sample]);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 transition-all duration-300 text-center ${
        isDragOver
          ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-800 hover:border-cyan-500/60 bg-white dark:bg-studio-900/60'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFileChange}
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto pointer-events-none">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8 text-cyan-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
            ✓
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Drop images here or click to browse
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supports <strong className="text-slate-800 dark:text-slate-200">JPG, PNG, WEBP, HEIC, HEIF</strong> up to 50MB. Multi-file batch processing.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-studio-800">
            Strips XMP DigitalSourceType
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-studio-800">
            Removes C2PA Manifests
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-studio-800">
            Clears EXIF & IPTC
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center pointer-events-auto">
        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 transition-all shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Test with Sample AI Image (XMP trainedAlgorithmicMedia)</span>
        </button>
      </div>
    </div>
  );
};

