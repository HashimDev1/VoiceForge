import React, { useState } from 'react';
import { Project } from '../../../shared/src/types';
import { Sparkles, Edit3, Check, Disc, Menu, Radio } from 'lucide-react';

interface NavbarProps {
  activeProject: Project;
  onUpdateProjectName: (name: string) => void;
  onGenerateAll: () => void;
  isGenerating: boolean;
  onOpenMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeProject,
  onUpdateProjectName,
  onGenerateAll,
  isGenerating,
  onOpenMobileMenu
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(activeProject.name);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onUpdateProjectName(nameInput.trim());
    }
    setIsEditing(false);
  };

  const totalChunks = activeProject.chunks.length;
  const completedChunks = activeProject.chunks.filter((c) => c.status === 'success').length;

  return (
    <header className="h-16 border-b border-studio-border bg-studio-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-studio-800 transition"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Project Title Editor with Serif Display Font */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              autoFocus
              className="bg-white dark:bg-studio-850 border border-black rounded-xl px-3 py-1 text-xs text-slate-900 dark:text-white focus:outline-none font-serif font-bold"
            />
            <button
              onClick={handleSaveName}
              className="p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
            <h2 className="text-sm font-serif font-extrabold text-slate-900 dark:text-white group-hover:text-slate-600 transition truncate max-w-[140px] sm:max-w-xs">
              {activeProject.name || 'Untitled Voiceover'}
            </h2>
            <Edit3 className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </div>
        )}

        {/* Status & Version Pill (Matching screenshot design) */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-studio-850 border border-slate-300 dark:border-studio-border text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          <Disc className="w-3 h-3 text-black dark:text-white" />
          <span>
            {totalChunks === 0
              ? 'NO CLIPS'
              : `${completedChunks}/${totalChunks} CLIPS`}
          </span>
          <span className="text-slate-500">|</span>
          <span className="bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 rounded text-[9px]">
            v1.3.0
          </span>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onGenerateAll}
          disabled={isGenerating || totalChunks === 0}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition ${
            isGenerating
              ? 'bg-studio-800 text-slate-400 border border-studio-border cursor-not-allowed'
              : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-95'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden xs:inline">{isGenerating ? 'Generating...' : 'Generate Voice'}</span>
          <span className="xs:hidden">{isGenerating ? '...' : 'Generate'}</span>
        </button>
      </div>
    </header>
  );
};
