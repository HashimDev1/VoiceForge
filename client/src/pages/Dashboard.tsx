import React from 'react';
import { Project } from '../../../shared/src/types';
import { TabType } from '../components/Sidebar';
import { 
  FileText, 
  Sparkles, 
  Zap, 
  Globe, 
  Mic, 
  Radio, 
  Cpu, 
  Languages, 
  Layers, 
  Sun, 
  Moon,
  Video,
  Subtitles,
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

  // Core production service cards
  const capabilities: CapabilityItem[] = [
    // 1. Video Editor (CapCut Desktop Studio)
    {
      id: 'video-editor',
      label: 'Video Editor',
      badge: 'PRO',
      targetTab: 'video-editor',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 2. Caption Studio (86 Motion Subtitle Looks)
    {
      id: 'captions',
      label: 'Caption Studio',
      badge: '2.0',
      targetTab: 'captions',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Subtitles className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-xs">
            <Zap className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 3. AI Metadata Cleaner
    {
      id: 'metadata-cleaner',
      label: 'AI Metadata Cleaner',
      badge: 'PRIVACY',
      targetTab: 'metadata-cleaner',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 6. Clone Voice
    {
      id: 'clone-voice',
      label: 'Clone Voice',
      badge: 'AI Free',
      targetTab: 'clone-voice',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Radio className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 7. Open-Source TTS
    {
      id: 'open-source-tts',
      label: 'Open-Source TTS',
      badge: 'New',
      targetTab: 'open-source-tts',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 8. Fish Audio Studio
    {
      id: 'fish-audio',
      label: 'Fish Audio Studio',
      targetTab: 'voice-generator',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      )
    },

    // 9. Voice Translator
    {
      id: 'voice-translator',
      label: 'Voice Translator',
      badge: 'New',
      targetTab: 'voice-translator',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Languages className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 10. Script Studio
    {
      id: 'script-studio',
      label: 'Script Studio',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black p-0.5 shadow-sm flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border text-slate-900 dark:text-white flex items-center justify-center shadow-xs">
            <Layers className="w-3 h-3" />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto w-full select-none">
      {/* Top Header matching Script Studio styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-studio-border pb-3 sm:pb-3.5 pt-0">
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              VoiceForge Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Core Services
            </span>
          </div>
          <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-9.5 sm:pl-11">
            SELECT A PRODUCTION WORKFLOW TO LAUNCH INTO THE STUDIO
          </p>
        </div>

        {onToggleTheme && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3 py-1.5 bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-studio-border transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 10 Service Cards Grid - 5 columns x 2 rows on desktop to fit on single page without scrolling */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-3.5 pt-1">
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
              className="h-32 sm:h-34 lg:h-36 rounded-2xl border border-studio-border bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white p-3 sm:p-3.5 shadow-sm transition-all duration-200 flex flex-col items-center justify-between cursor-pointer group hover:-translate-y-0.5 relative"
            >
              {/* Badge matching Script Studio genre preset badges */}
              {item.badge && (
                <span
                  className="absolute top-2.5 right-2.5 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-studio-border bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 pointer-events-none"
                >
                  {item.badge}
                </span>
              )}

              {/* Illustration Canvas */}
              <div className="flex-1 w-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                {item.renderIllustration()}
              </div>

              {/* Title matching Script Studio font-mono font-bold uppercase */}
              <div className="w-full text-center border-t border-studio-border/60 pt-2 pb-0.5">
                <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white transition-colors truncate block">
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
