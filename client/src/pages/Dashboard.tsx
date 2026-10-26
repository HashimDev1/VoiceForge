import React, { useState } from 'react';
import { Project } from '../../../shared/src/types';
import { TabType } from '../components/Sidebar';
import { 
  ArrowRight, 
  Volume2, 
  Plus, 
  FileText, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  FolderKanban,
  Zap,
  Globe,
  Mic,
  Layers,
  Wand2,
  Download,
  Check
} from 'lucide-react';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface DashboardProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onNewVoiceover: () => void;
  onOpenScriptStudio: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

interface CapabilityItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  targetTab: TabType;
  renderIllustration: () => React.ReactNode;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onOpenProject,
  onNewVoiceover,
  onOpenScriptStudio,
  onNavigateTab
}) => {
  // Pre-selected items representing VoiceForge's core workflows
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(['voiceovers', 'opensource-tts', 'dubbing'])
  );

  const [showProjectsDrawer, setShowProjectsDrawer] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (!onNavigateTab) {
      onOpenScriptStudio();
      return;
    }

    if (selectedIds.has('dubbing') || selectedIds.has('asr')) {
      onNavigateTab('voice-translator');
    } else if (selectedIds.has('opensource-tts')) {
      onNavigateTab('open-source-tts');
    } else if (selectedIds.has('export')) {
      onNavigateTab('projects');
    } else {
      onNavigateTab('script-studio');
    }
  };

  const handleCardLaunch = (item: CapabilityItem) => {
    if (onNavigateTab) {
      onNavigateTab(item.targetTab);
    } else {
      onOpenScriptStudio();
    }
  };

  const capabilities: CapabilityItem[] = [
    // 1. YouTube Voiceovers
    {
      id: 'voiceovers',
      label: 'YouTube Voiceovers',
      badge: 'POPULAR',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Video Preview Card */}
          <div className="w-12 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-studio-700 bg-gradient-to-t from-slate-900 via-indigo-950 to-slate-800 -rotate-6 shadow-xs flex flex-col justify-between p-1.5">
            <div className="w-4 h-1 bg-white/40 rounded-full" />
            <div className="w-full flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                <svg className="w-2.5 h-2.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
            <div className="w-full h-1 bg-indigo-400 rounded-full" />
          </div>
          {/* Purple speech bubble badge */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-xs">
            <Mic className="w-3 h-3" />
          </div>
          {/* Waveform pill */}
          <div className="absolute -bottom-1 w-12 h-3.5 bg-purple-600 rounded-full flex items-center justify-center gap-0.5 px-1 shadow-xs">
            <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
            <div className="w-0.5 h-2.5 bg-white rounded-full" />
            <div className="w-0.5 h-2 bg-white rounded-full" />
            <div className="w-0.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      )
    },

    // 2. Open-Source TTS (100% Free)
    {
      id: 'opensource-tts',
      label: 'Open-Source TTS',
      badge: '100% FREE',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      targetTab: 'open-source-tts',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Speech document sheet */}
          <div className="w-14 h-10 bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 rounded-lg p-1.5 flex flex-col justify-between shadow-xs">
            <div className="w-6 h-1 bg-emerald-500 rounded-full" />
            <div className="w-10 h-1 bg-slate-200 dark:bg-studio-700 rounded-full" />
            <div className="w-8 h-1 bg-slate-200 dark:bg-studio-700 rounded-full" />
          </div>
          {/* Emerald lightning bolt badge */}
          <div className="absolute -bottom-1 -left-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xs">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
      )
    },

    // 3. AI Video Dubbing & Translation
    {
      id: 'dubbing',
      label: 'AI Video Dubbing',
      badge: 'NEW',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      targetTab: 'voice-translator',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Video Scene Thumbnail */}
          <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-studio-700 bg-gradient-to-br from-amber-700 via-orange-800 to-amber-950 flex items-center justify-center shadow-xs">
            <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Globe className="w-2.5 h-2.5" />
            </div>
          </div>
          {/* Translation character badge */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-xs">
            文A
          </div>
          {/* Time-matched audio equalizer */}
          <div className="absolute -bottom-1 w-12 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center gap-0.5 px-1 shadow-xs">
            <div className="w-0.5 h-1.5 bg-white rounded-full" />
            <div className="w-0.5 h-2.5 bg-white rounded-full" />
            <div className="w-0.5 h-2 bg-white rounded-full" />
            <div className="w-0.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      )
    },

    // 4. Voice Cloning
    {
      id: 'cloning',
      label: 'Voice Cloning',
      badge: 'OFFLINE AI',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      targetTab: 'clone-voice',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Left clone card */}
          <div className="w-9 h-9 rounded-xl bg-teal-500 shadow-xs flex items-center justify-center text-white -rotate-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
          {/* Right clone card with lightning */}
          <div className="w-9 h-9 rounded-xl bg-teal-400 shadow-xs flex items-center justify-center text-white rotate-6 -ml-2">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      )
    },

    // 5. Script Studio & Chunking
    {
      id: 'script-studio',
      label: 'Script Studio',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Chunk cards stacked */}
          <div className="w-13 h-7 bg-slate-100 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 rounded-lg p-1 shadow-xs absolute -top-1 rotate-3 flex items-center gap-1">
            <span className="text-[8px] font-mono text-slate-400">#01</span>
            <div className="w-6 h-1 bg-slate-300 dark:bg-studio-600 rounded-full" />
          </div>
          <div className="w-14 h-8 bg-white dark:bg-studio-850 border border-slate-200 dark:border-studio-700 rounded-lg p-1.5 shadow-xs flex items-center justify-between z-10">
            <div className="space-y-1">
              <div className="w-8 h-1 bg-black dark:bg-white rounded-full" />
              <div className="w-5 h-1 bg-slate-300 dark:bg-studio-600 rounded-full" />
            </div>
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>
      )
    },

    // 6. Voice Design (Prompt-to-Voice)
    {
      id: 'voice-design',
      label: 'Voice Design',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Prompt capsule bar */}
          <div className="w-15 h-6 bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 rounded-full flex items-center px-2 shadow-xs gap-1">
            <span className="text-[9px] font-mono text-indigo-600 font-bold">AI</span>
            <div className="w-7 h-1 bg-slate-300 dark:bg-studio-600 rounded-full" />
          </div>
          {/* Magic wand badge */}
          <div className="absolute -bottom-1 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xs">
            <Wand2 className="w-3 h-3" />
          </div>
        </div>
      )
    },

    // 7. Multi-Take Studio
    {
      id: 'multi-take',
      label: 'Multi-Take Studio',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Take 1 Card */}
          <div className="w-10 h-11 bg-white dark:bg-studio-800 border border-slate-200 dark:border-studio-700 rounded-lg p-1 shadow-xs -rotate-6 flex flex-col justify-between">
            <span className="text-[7px] font-mono font-bold text-slate-400">TAKE 1</span>
            <div className="w-full h-1 bg-blue-400 rounded-full" />
          </div>
          {/* Take 2 Card */}
          <div className="w-10 h-11 bg-black dark:bg-white text-white dark:text-black rounded-lg p-1 shadow-xs rotate-6 -ml-2 flex flex-col justify-between z-10">
            <span className="text-[7px] font-mono font-bold text-emerald-400 dark:text-emerald-700">TAKE 2</span>
            <div className="w-full h-1 bg-emerald-400 rounded-full" />
          </div>
        </div>
      )
    },

    // 8. Speech to Text (ASR)
    {
      id: 'asr',
      label: 'Speech to Text',
      targetTab: 'voice-translator',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex flex-col items-center justify-center">
          {/* Audio wave capsule */}
          <div className="w-13 h-4 bg-pink-500 rounded-full flex items-center justify-center gap-0.5 px-1 shadow-xs -rotate-6 mb-1">
            <div className="w-0.5 h-2 bg-white rounded-full" />
            <div className="w-0.5 h-3 bg-white rounded-full" />
            <div className="w-0.5 h-1.5 bg-white rounded-full" />
            <div className="w-0.5 h-2.5 bg-white rounded-full" />
          </div>
          {/* Transcript document */}
          <div className="w-13 h-9 bg-slate-50 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 rounded-lg p-1.5 flex flex-col justify-around shadow-xs">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <div className="w-7 h-1 bg-slate-300 dark:bg-studio-600 rounded-full" />
            </div>
            <div className="w-9 h-1 bg-slate-200 dark:bg-studio-700 rounded-full ml-2.5" />
          </div>
        </div>
      )
    },

    // 9. Community Voices
    {
      id: 'community',
      label: 'Community Voices',
      targetTab: 'script-studio',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Avatar bubbles */}
          <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white dark:border-studio-900 flex items-center justify-center text-white text-[10px] shadow-xs">
            🎙️
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white dark:border-studio-900 flex items-center justify-center text-white text-[10px] shadow-xs -ml-2">
            ✨
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white dark:border-studio-900 flex items-center justify-center text-white text-[10px] shadow-xs -ml-2">
            🌟
          </div>
        </div>
      )
    },

    // 10. Master Audio Export
    {
      id: 'export',
      label: 'Audio Master Export',
      targetTab: 'projects',
      renderIllustration: () => (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Audio Master Track */}
          <div className="w-14 h-11 bg-slate-900 rounded-xl p-1.5 flex flex-col justify-between text-white shadow-xs border border-slate-700">
            <div className="flex items-center justify-between text-[7px] font-mono text-slate-400">
              <span>MASTER</span>
              <span className="text-emerald-400">WAV</span>
            </div>
            <div className="w-full flex items-end gap-0.5 h-4">
              <div className="w-0.5 h-2 bg-indigo-400 rounded-full" />
              <div className="w-0.5 h-3.5 bg-indigo-300 rounded-full" />
              <div className="w-0.5 h-4 bg-white rounded-full" />
              <div className="w-0.5 h-2.5 bg-indigo-400 rounded-full" />
            </div>
          </div>
          {/* Download badge */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-xs">
            <Download className="w-3 h-3" />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-between max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Header Section customized for VoiceForge */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-studio-850 border border-studio-border text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>VoiceForge Studio • AI Audio Production</span>
        </div>

        <h1 className="text-2xl sm:text-[34px] font-semibold text-slate-900 dark:text-white tracking-tight">
          What would you like to create with VoiceForge?
        </h1>
        <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
          Select your workflow tools or click Continue to launch into the studio
        </p>
      </div>

      {/* 10 VoiceForge Capability Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4 w-full max-w-4xl">
        {capabilities.map((item) => {
          const isSelected = selectedIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              onDoubleClick={() => handleCardLaunch(item)}
              title="Click to select, double-click to launch"
              className={`h-36 sm:h-40 rounded-[22px] flex flex-col items-center justify-between p-3.5 cursor-pointer transition-all duration-150 select-none relative group ${
                isSelected
                  ? 'border-[2px] border-black dark:border-white bg-white dark:bg-studio-900 shadow-sm'
                  : 'border border-slate-200 dark:border-studio-800 bg-white dark:bg-studio-900 hover:border-slate-300 dark:hover:border-studio-700 hover:shadow-xs'
              }`}
            >
              {/* Optional Pill Badge */}
              {item.badge && (
                <span className={`absolute top-2.5 right-2.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                  {item.badge}
                </span>
              )}

              {/* Illustration Canvas */}
              <div className="flex-1 w-full flex items-center justify-center">
                {item.renderIllustration()}
              </div>

              {/* Title Label */}
              <span className="text-[13px] font-medium text-slate-900 dark:text-white text-center pb-0.5">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Controls: Back & Continue buttons */}
      <div className="flex items-center justify-center gap-4 mt-10">
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white px-5 py-2.5 cursor-pointer transition"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="px-8 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition shadow-sm cursor-pointer flex items-center gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pagination Indicator Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-8">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="w-4 h-1.5 rounded-full bg-black dark:bg-white" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Collapsible Recent Projects Drawer */}
      <div className="w-full max-w-4xl mt-12 pt-6 border-t border-slate-200 dark:border-studio-800">
        <button
          type="button"
          onClick={() => setShowProjectsDrawer((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:hover:text-white py-2 cursor-pointer transition"
        >
          <span className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            <span>Saved Voiceover Projects ({projects.length})</span>
          </span>
          <span className="flex items-center gap-1">
            <span>{showProjectsDrawer ? 'Hide Projects' : 'Show Projects'}</span>
            {showProjectsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showProjectsDrawer && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-sans">
                Jump directly into your saved script projects or create a fresh voiceover clip.
              </p>
              <button
                type="button"
                onClick={onNewVoiceover}
                className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Project</span>
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-studio-800 text-xs text-slate-500">
                No saved projects yet. Click <strong>Continue</strong> or <strong>New Project</strong> to start generating speech.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.slice(0, 6).map((proj) => {
                  const completed = proj.chunks.filter((c) => c.status === 'success').length;
                  const total = proj.chunks.length;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => onOpenProject(proj)}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-studio-800 bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white cursor-pointer transition flex flex-col justify-between space-y-2 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {proj.name || 'Untitled Project'}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300">
                            {proj.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {proj.script || 'No script text entered.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-studio-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{completed}/{total} Clips</span>
                        <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
