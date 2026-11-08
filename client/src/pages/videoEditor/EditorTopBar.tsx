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
  ChevronDown,
  Layout,
  Maximize2,
  Sliders,
  FolderOpen
} from 'lucide-react';
import { EditorProject, AspectRatio } from '../../../../shared/src/videoEditorTypes';
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
  onOpenCaptionStudio?: () => void;
  workspaceMode?: WorkspaceMode;
  onSelectWorkspaceMode?: (mode: WorkspaceMode) => void;
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
  onOpenCaptionStudio,
  workspaceMode = 'default',
  onSelectWorkspaceMode
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateMeta({ name: titleInput.trim() });
    } else {
      setTitleInput(project.name);
    }
  };

  return (
    <header className="h-11 w-full flex-shrink-0 bg-[#15191F] border-b border-[#303740] px-3 flex items-center justify-between text-[#F0F3F7] select-none z-30">
      {/* LEFT SIDE: Brand, Menu, Project Name, Undo/Redo */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* VoiceForge Studio Brand Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded bg-[#242A33] border border-[#303740] flex items-center justify-center text-[#40D5CB] shadow-xs">
            <Film className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs tracking-tight text-white hidden md:inline">VoiceForge</span>
        </div>

        {/* Menu Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#A4AFBD] hover:text-white hover:bg-[#242A33] transition-colors cursor-pointer"
          >
            <span>Menu</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-48 rounded-lg bg-[#1B2028] border border-[#303740] shadow-xl py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSave();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#303842] text-[#F0F3F7] flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-[#40D5CB]" />
                  <span>Save Project (Ctrl+S)</span>
                </button>
                {onOpenCaptionStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCaptionStudio();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#303842] text-[#F0F3F7] flex items-center gap-2 cursor-pointer"
                  >
                    <Subtitles className="w-3.5 h-3.5 text-[#8B79F1]" />
                    <span>Open Caption Studio</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenExport();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#303842] text-[#F0F3F7] flex items-center gap-2 cursor-pointer border-t border-[#303740] mt-1 pt-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#40D5CB]" />
                  <span>Export Video</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Real Autosave Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B2028] border border-[#242A33] text-[11px] text-[#A4AFBD]">
          {isSaving ? (
            <>
              <Loader2 className="w-2.5 h-2.5 text-[#40D5CB] animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#48C994] shadow-[0_0_6px_rgba(72,201,148,0.6)]" />
              <span className="truncate max-w-[140px]">{lastSavedText || 'Auto saved'}</span>
            </>
          )}
        </div>

        {/* Project Name (Editable on click) */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[200px] sm:max-w-xs">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="text-xs font-semibold text-white bg-[#0B0E13] border border-[#40D5CB] rounded px-1.5 py-0.5 outline-none w-full"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename project"
              className="text-xs font-semibold text-[#F0F3F7] hover:text-[#40D5CB] cursor-pointer truncate transition-colors"
            >
              {project.name}
            </span>
          )}
        </div>

        {/* Undo / Redo buttons */}
        <div className="flex items-center gap-0.5 border-l border-[#303740] pl-2">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-[#A4AFBD] hover:text-white hover:bg-[#242A33] disabled:opacity-25 transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-[#A4AFBD] hover:text-white hover:bg-[#242A33] disabled:opacity-25 transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CENTER: Aspect Ratio Switcher */}
      <div className="hidden md:flex items-center gap-1 bg-[#1B2028] border border-[#303740] rounded-md p-0.5 text-xs">
        {ASPECT_RATIOS.map((ratio) => {
          const isSelected = project.aspectRatio === ratio.id;
          return (
            <button
              key={ratio.id}
              type="button"
              onClick={() => onUpdateMeta({ aspectRatio: ratio.id, customWidth: ratio.width, customHeight: ratio.height })}
              title={ratio.description}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#242A33] text-[#40D5CB] shadow-xs'
                  : 'text-[#A4AFBD] hover:text-white'
              }`}
            >
              {ratio.id === '9:16' ? (
                <Smartphone className="w-3 h-3" />
              ) : ratio.id === '16:9' ? (
                <Tv className="w-3 h-3" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              <span>{ratio.id}</span>
            </button>
          );
        })}
      </div>

      {/* RIGHT SIDE: Layout Modes, Quality, Save, Export */}
      <div className="flex items-center gap-2">
        {/* Workspace Layout Selector */}
        {onSelectWorkspaceMode && (
          <div className="hidden xl:flex items-center gap-0.5 bg-[#1B2028] border border-[#303740] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => onSelectWorkspaceMode('default')}
              title="Default Layout (Balanced)"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                workspaceMode === 'default' ? 'bg-[#242A33] text-[#40D5CB]' : 'text-[#A4AFBD] hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectWorkspaceMode('focus-preview')}
              title="Focus Preview (Enlarged Canvas)"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                workspaceMode === 'focus-preview' ? 'bg-[#242A33] text-[#40D5CB]' : 'text-[#A4AFBD] hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectWorkspaceMode('focus-timeline')}
              title="Focus Timeline (Taller Multitrack)"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                workspaceMode === 'focus-timeline' ? 'bg-[#242A33] text-[#40D5CB]' : 'text-[#A4AFBD] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quality Selector */}
        <select
          value={project.previewQuality || '720p'}
          onChange={(e) => onUpdateMeta({ previewQuality: e.target.value as any })}
          className="bg-[#1B2028] border border-[#303740] rounded px-1.5 py-1 text-[11px] font-mono text-[#A4AFBD] hover:text-white outline-none cursor-pointer"
        >
          <option value="360p">360p Draft</option>
          <option value="720p">720p HD</option>
          <option value="1080p">1080p Pro</option>
        </select>

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          title="Save project locally & server"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1B2028] hover:bg-[#242A33] text-xs font-medium text-[#F0F3F7] border border-[#303740] transition-colors cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#40D5CB]" /> : <Save className="w-3.5 h-3.5 text-[#A4AFBD]" />}
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* PROMINENT EXPORT BUTTON (CapCut Cyan/Teal #40D5CB) */}
        <button
          type="button"
          onClick={onOpenExport}
          title="Export video project"
          className="flex items-center gap-1.5 px-3.5 py-1 rounded-md bg-[#40D5CB] hover:bg-[#35BDB3] active:scale-95 text-[#0B0E13] text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
