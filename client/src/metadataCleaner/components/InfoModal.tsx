import React from 'react';
import { X, Cpu, Binary, Layers, Flame, ShieldCheck } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-studio-900 border border-studio-border w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-studio-border flex items-center justify-between bg-slate-50 dark:bg-studio-850">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-base text-slate-900 dark:text-white">
                How Metadata Stripping Works
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Technical architecture & byte-level cleaning documentation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-studio-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-500" />
              1. Why do Meta & Instagram label images as "Made with AI"?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Social platforms do not re-run computer vision algorithms on every uploaded photo. Instead, their ingestion pipeline inspects specific metadata headers:
            </p>
            <ul className="text-xs space-y-1 list-disc pl-5 text-slate-500 dark:text-slate-400">
              <li>
                <strong className="text-slate-900 dark:text-white">XMP DigitalSourceType:</strong> Tags matching{' '}
                <code className="text-cyan-600 dark:text-cyan-400 font-bold">trainedAlgorithmicMedia</code> or{' '}
                <code className="text-cyan-600 dark:text-cyan-400 font-bold">compositeWithTrainedAlgorithmicMedia</code> (IPTC 2024 standard).
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">C2PA Manifests:</strong> JUMBF embedded in APP11 segments by Adobe Firefly, DALL-E 3, etc.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Software / CreatorTool:</strong> References to Midjourney, Stable Diffusion, ComfyUI, Imagen, Flux, etc.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              2. JPEG Segment-Stripping Byte Logic
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              JPEGs begin with marker <code className="text-slate-900 dark:text-white">0xFFD8</code> (SOI) and terminate with{' '}
              <code className="text-slate-900 dark:text-white">0xFFD9</code> (EOI). Between them are variable-length marker segments:
            </p>
            <div className="p-3 bg-slate-50 dark:bg-studio-850 rounded-xl text-xs text-slate-500 dark:text-slate-400 space-y-1 border border-studio-border">
              <p className="text-rose-500 font-bold">• APP1 (0xFFE1): Stripped (Contains EXIF, XMP, Extended XMP)</p>
              <p className="text-rose-500 font-bold">• APP11 (0xFFEB): Stripped (Contains C2PA / JUMBF manifests)</p>
              <p className="text-rose-500 font-bold">• APP13 (0xFFED): Stripped (Contains IPTC & Photoshop IRB)</p>
              <p className="text-rose-500 font-bold">• COM (0xFFFE): Stripped (Contains comments)</p>
              <p className="text-amber-500">• APP2 (0xFFE2): Stripped if user selects "Strip ICC"</p>
              <p className="text-emerald-500">• APP0 (0xFFE0), DQT, SOF0, DHT, SOS: Strictly preserved without lossy recompression!</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              3. The "Nuclear Option" (Canvas Pixel Re-encode)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Re-renders pixels through an HTML5 Canvas at 95% quality. Completely destroys invisible watermarks and resets the pixel grid.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              4. Verification Step
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              After cleaning, each file is re-parsed with exifr. Only when 0 metadata tags remain is the green <strong className="text-emerald-500">Verified Clean ✓</strong> badge displayed.
            </p>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-studio-border flex justify-end bg-slate-50 dark:bg-studio-850">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs transition-opacity hover:opacity-90"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

