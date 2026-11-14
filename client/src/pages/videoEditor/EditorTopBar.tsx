import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Share2,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  RotateCcw,
  Film,
  Diamond,
  Smartphone,
  Tv,
  Square,
  Loader2
} from 'lucide-react';
import { EditorProject } from '../../../../shared/src/videoEditorTypes';
import { ASPECT_RATIOS } from '../../../../shared/src/videoEditorDefaults';
import { WorkspaceMode } from './EditorWorkspacePresets';

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
  onOpenExportImage?: () => void;
  onOpenExportZip?: () => void;
  onOpenCaptionStudio?: () => void;
  onOpenSmartBulk?: () => void;
  onExitEditor?: () => void;
  workspaceMode?: WorkspaceMode;
  onSelectWorkspaceMode?: (mode: WorkspaceMode) => void;
  onResetLayout?: () => void;
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
  onOpenExportImage,
  onOpenExportZip,
  onOpenCaptionStudio,
  onOpenSmartBulk,
  onExitEditor,
  workspaceMode = 'default',
  onSelectWorkspaceMode,
  onResetLayout
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRatioDropdownOpen, setIsRatioDropdownOpen] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateMeta({ name: titleInput.trim() });
    } else {
      setTitleInput(project.name);
    }
  };

  return (
    <header className="h-10 shrink-0 w-full bg-[#181B20] border-b border-[#262A34] px-3 flex items-center justify-between select-none z-30 text-[#E4E7EC]">
      {/* 1. LEFT: CapCut Logo + Brand + Menu Dropdown + Auto-Saved Pulse */}
      <div className="flex items-center gap-3">
        {/* Brand & CapCut Style Logo */}
        <div
          onClick={onExitEditor}
          title={onExitEditor ? 'Back to Dashboard' : undefined}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
        >
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#13E2CA] to-[#00F2DC] flex items-center justify-center text-black font-extrabold shadow-sm">
            <Film className="w-3 h-3 text-black stroke-[2.5]" />
          </div>
          <span className="font-bold text-xs tracking-tight text-white font-sans">CapCut</span>
        </div>

        {/* Menu Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#222631] hover:bg-[#282D38] text-[11px] font-sans text-slate-300 hover:text-white transition cursor-pointer"
          >
            <span>Menu</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1 w-48 rounded-lg bg-[#1E222B] border border-[#2D3340] py-1 shadow-2xl z-50 text-xs"
              onMouseLeave={() => setIsMenuOpen(false)}
            >
              {onExitEditor && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExitEditor();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-slate-200 transition font-medium"
                >
                  ← Back to Dashboard
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onSave();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-slate-200 transition"
              >
                Save Project (Ctrl+S)
              </button>
              {onOpenSmartBulk && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSmartBulk();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-[#13E2CA] font-medium transition"
                >
                  Smart Bulk Arrange...
                </button>
              )}
              {onOpenCaptionStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCaptionStudio();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-slate-200 transition"
                >
                  Open Caption Studio...
                </button>
              )}
              <div className="my-1 border-t border-[#2D3340]" />
              <button
                type="button"
                onClick={() => {
                  onOpenExport();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-[#13E2CA] font-medium transition"
              >
                Export Video (MP4)...
              </button>
              {onOpenExportImage && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenExportImage();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-slate-200 transition"
                >
                  Export Still Frame (PNG/JPG)...
                </button>
              )}
              {onOpenExportZip && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenExportZip();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-slate-200 transition"
                >
                  Export All Media Images (ZIP)...
                </button>
              )}
              <div className="my-1 border-t border-[#2D3340]" />
              {onResetLayout && (
                <button
                  type="button"
                  onClick={() => {
                    onResetLayout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282D38] text-slate-400 hover:text-white transition"
                >
                  Reset Workspace Layout
                </button>
              )}
            </div>
          )}
        </div>

        {/* CapCut Glowing Auto-saved Badge */}
        <div className="flex items-center gap-1.5 text-[11px] font-sans text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#13E2CA] shadow-[0_0_8px_#13E2CA] animate-pulse" />
          <span>
            {isSaving ? 'Saving...' : `Auto saved: ${lastSavedText || '01:23:42'}`}
          </span>
        </div>

        {/* Undo / Redo icon buttons */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white disabled:opacity-25 transition cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white disabled:opacity-25 transition cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. CENTER: Clean Minimalist Project Title (Editable) */}
      <div className="flex items-center">
        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-[#222631] text-white font-medium text-xs px-2 py-0.5 rounded border border-[#13E2CA] outline-none text-center min-w-[120px]"
          />
        ) : (
          <span
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename project"
            className="text-xs font-semibold text-slate-200 hover:text-white hover:underline cursor-pointer tracking-wide"
          >
            {project.name || '1110'}
          </span>
        )}
      </div>

      {/* 3. RIGHT: Layout Icons + Aspect Pill + Pro Diamond + Share + Export CTA */}
      <div className="flex items-center gap-2">
        {/* Layout Switcher Shortcut */}
        <div className="flex items-center gap-0.5 text-slate-400">
          <button
            type="button"
            onClick={() => onSelectWorkspaceMode?.('default')}
            title="Default Layout"
            className={`p-1 rounded hover:bg-[#282D38] hover:text-white transition ${
              workspaceMode === 'default' ? 'text-[#13E2CA]' : ''
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aspect Ratio Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRatioDropdownOpen(!isRatioDropdownOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#222631] hover:bg-[#282D38] text-[11px] font-mono text-slate-300 hover:text-white transition cursor-pointer"
          >
            <span>{project.aspectRatio}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isRatioDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-28 rounded-lg bg-[#1E222B] border border-[#2D3340] py-1 shadow-2xl z-50 text-xs"
              onMouseLeave={() => setIsRatioDropdownOpen(false)}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => {
                    onUpdateMeta({
                      aspectRatio: ratio.id,
                      customWidth: ratio.width,
                      customHeight: ratio.height
                    });
                    setIsRatioDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#282D38] transition font-mono ${
                    project.aspectRatio === ratio.id ? 'text-[#13E2CA] font-bold' : 'text-slate-300'
                  }`}
                >
                  <span>{ratio.id}</span>
                  {ratio.id === '9:16' ? (
                    <Smartphone className="w-3 h-3 opacity-60" />
                  ) : ratio.id === '16:9' ? (
                    <Tv className="w-3 h-3 opacity-60" />
                  ) : (
                    <Square className="w-3 h-3 opacity-60" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* VIP / Pro Badge (matching CapCut Desktop screenshot: "Unlock for R200") */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222631] text-[11px] font-sans font-medium text-purple-300 border border-purple-500/30">
          <Diamond className="w-3 h-3 text-purple-400 fill-purple-400" />
          <span>PRO</span>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          title="Share Project"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222631] hover:bg-[#282D38] text-[11px] font-sans text-slate-300 hover:text-white transition cursor-pointer"
        >
          <Share2 className="w-3 h-3" />
          <span>Share</span>
        </button>

        {/* Primary Export Button in Solid CapCut Bright Teal */}
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-4 py-1 rounded bg-[#13E2CA] hover:bg-[#00F2DC] text-black font-sans font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
