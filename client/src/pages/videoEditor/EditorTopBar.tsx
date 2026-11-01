import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  Film,
  Download,
  Smartphone,
  Tv,
  Square,
  Sparkles,
  Subtitles,
  Check,
  Loader2,
  Layers
} from 'lucide-react';
import { EditorProject, AspectRatio } from '../../../../shared/src/videoEditorTypes';
import { ASPECT_RATIOS } from '../../../../shared/src/videoEditorDefaults';

interface EditorTopBarProps {
  project: EditorProject;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  isSaving: boolean;
  lastSavedText: string;
  onUpdateMeta: (patch: Partial<EditorProject>) => void;
  onOpenExport: () => void;
  onOpenCaptionStudio?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  project,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  isSaving,
  lastSavedText,
  onUpdateMeta,
  onOpenExport,
  onOpenCaptionStudio
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateMeta({ name: titleInput.trim() });
    } else {
      setTitleInput(project.name);
    }
  };

  return (
    <header className="glass-panel rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm p-3.5 sm:p-4 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Branding & Project Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
            <Film className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="text-lg sm:text-xl font-serif font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-studio-800 border border-studio-border rounded-lg px-2 py-0.5 outline-none"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename project"
                className="text-lg sm:text-xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight cursor-pointer hover:underline flex items-center gap-1.5"
              >
                <span>{project.name}</span>
                <span className="text-indigo-600 dark:text-indigo-400">.</span>
              </h1>
            )}

            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Studio Pro
            </span>
          </div>

          {/* Undo / Redo controls */}
          <div className="flex items-center gap-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-1 ml-2">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-studio-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center / Right Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 p-1">
            {ASPECT_RATIOS.map((ratio) => {
              const isSelected = project.aspectRatio === ratio.id;
              return (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => onUpdateMeta({ aspectRatio: ratio.id, customWidth: ratio.width, customHeight: ratio.height })}
                  title={ratio.description}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ratio.id === '9:16' ? (
                    <Smartphone className="h-3 w-3" />
                  ) : ratio.id === '16:9' ? (
                    <Tv className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  <span>{ratio.id}</span>
                </button>
              );
            })}
          </div>

          {/* Quality Selector */}
          <select
            value={project.previewQuality || '720p'}
            onChange={(e) => onUpdateMeta({ previewQuality: e.target.value as any })}
            className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer shadow-sm"
          >
            <option value="360p">360p Draft</option>
            <option value="720p">720p HD</option>
            <option value="1080p">1080p Pro</option>
          </select>

          {/* Caption Studio Bridge Shortcut */}
          {onOpenCaptionStudio && (
            <button
              type="button"
              onClick={onOpenCaptionStudio}
              title="Open Caption Studio for Auto Subtitles & Word Animations"
              className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>Captions</span>
            </button>
          )}

          {/* Save Button & Status */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 shadow-sm transition cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* Export Primary Action Button */}
          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Video</span>
          </button>
        </div>
      </div>
    </header>
  );
};

