import React from 'react';
import { Project } from '../../../shared/src/types';
import { TabType } from '../components/Sidebar';
import { 
  FileText, 
  Sparkles, 
  Zap, 
  Globe, 
  Mic, 
  Film, 
  Radio, 
  Cpu, 
  Languages, 
  Layers, 
  Sun, 
  Moon,
  Video,
  Subtitles,
  Clapperboard,
  ShieldCheck
} from 'lucide-react';

interface DashboardProps {
  projects?: Project[];
  onOpenProject?: (project: Project) => void;
  onNewVoiceover?: () => void;
  onOpenScriptStudio?: () => void;
  onNavigateTab?: (tab: TabType) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface CapabilityItem {
  id: string;
  label: string;
  badge?: string;
  targetTab: TabType;
  renderIllustration: () => React.ReactNode;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenScriptStudio,
  onNavigateTab,
  theme,
  onToggleTheme
}) => {
  const handleCardLaunch = (item: CapabilityItem) => {
    if (onNavigateTab) {
      onNavigateTab(item.targetTab);
    } else if (onOpenScriptStudio) {
      onOpenScriptStudio();
    }
  };

  // 6 core production service cards matching Script Studio visual tokens
  const capabilities: CapabilityItem[] = [
    // 0. Documentary Studio (AI Documentary Production Workflow)
    {
      id: 'documentary-studio',
      label: 'Documentary Studio',
      badge: 'Phase 4',
      targetTab: 'documentary-studio',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Clapperboard className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 0.5. Video Editor (CapCut Desktop Studio)
    {
      id: 'video-editor',
      label: 'Video Editor',
      badge: 'PRO',
      targetTab: 'video-editor',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 0.5. Caption Studio (86 Motion Subtitle Looks)
    {
      id: 'captions',
      label: 'Caption Studio',
      badge: '2.0',
      targetTab: 'captions',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Subtitles className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-xs">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 1. Flow Studio
    {
      id: 'google-flow',
      label: 'Flow Studio',
      badge: 'Video',
      targetTab: 'google-flow',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 1.5. AI Metadata Cleaner
    {
      id: 'metadata-cleaner',
      label: 'AI Metadata Cleaner',
      badge: 'PRIVACY',
      targetTab: 'metadata-cleaner',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-cyan-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 2. Clone Voice
    {
      id: 'clone-voice',
      label: 'Clone Voice',
      badge: 'AI Free',
      targetTab: 'clone-voice',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Radio className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 3. Open-Source TTS
    {
      id: 'open-source-tts',
      label: 'Open-Source TTS',
      badge: 'New',
      targetTab: 'open-source-tts',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 4. Fish Audio Studio
    {
      id: 'fish-audio',
      label: 'Fish Audio Studio',
      targetTab: 'voice-generator',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Mic className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      )
    },

    // 5. Voice Translator
    {
      id: 'voice-translator',
      label: 'Voice Translator',
      badge: 'New',
      targetTab: 'voice-translator',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Languages className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 6. Script Studio
    {
      id: 'script-studio',
      label: 'Script Studio',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full">
      {/* Top Header matching Script Studio styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              VoiceForge Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Core Services
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            SELECT A PRODUCTION WORKFLOW TO LAUNCH INTO THE STUDIO
          </p>
        </div>

        {onToggleTheme && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3.5 py-2 bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-studio-border transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 6 Service Cards Grid - Unified with Script Studio panel & font styles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 pt-2">
        {capabilities.map((item) => {
          return (
            <div
              key={item.id}
              onClick={() => handleCardLaunch(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardLaunch(item);
                }
              }}
              title={`Open ${item.label}`}
              className="h-44 rounded-2xl border border-studio-border bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white p-5 shadow-sm transition-all duration-200 flex flex-col items-center justify-between cursor-pointer group hover:-translate-y-1 relative"
            >
              {/* Badge matching Script Studio genre preset badges */}
              {item.badge && (
                <span
                  className="absolute top-3.5 right-3.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-studio-border bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300"
                >
                  {item.badge}
                </span>
              )}

              {/* Illustration Canvas */}
              <div className="flex-1 w-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                {item.renderIllustration()}
              </div>

              {/* Title matching Script Studio font-mono font-bold uppercase */}
              <div className="w-full text-center border-t border-studio-border/60 pt-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white transition-colors">
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
