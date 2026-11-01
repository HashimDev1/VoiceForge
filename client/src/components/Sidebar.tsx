import React from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  FileText, 
  FolderKanban, 
  History, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Sun,
  Moon,
  Globe,
  Subtitles,
  Cpu,
  Film,
  Video,
  Clapperboard
} from 'lucide-react';
import { ApiHealthResponse } from '../../../shared/src/types';

export type TabType =
  | 'dashboard'
  | 'documentary-studio'
  | 'video-editor'
  | 'captions'
  | 'google-flow'
  | 'clone-voice'
  | 'open-source-tts'
  | 'voice-generator'
  | 'voice-translator'
  | 'script-studio'
  | 'projects'
  | 'history'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  apiHealth: ApiHealthResponse;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onNewProject: () => void;
  onOpenCloneVoice?: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  apiHealth,
  collapsed,
  setCollapsed,
  onNewProject,
  onOpenCloneVoice,
  mobileOpen,
  setMobileOpen,
  theme,
  onToggleTheme
}) => {
  const serviceItems: NavItem[] = [
    { id: 'documentary-studio', label: 'Documentary Studio', icon: Clapperboard },
    { id: 'video-editor', label: 'Video Editor', icon: Video },
    { id: 'google-flow', label: 'Flow Studio', icon: Film },
    { id: 'captions', label: 'Caption Studio', icon: Subtitles },
    { id: 'clone-voice', label: 'Clone Voice', icon: Sparkles },
    { id: 'open-source-tts', label: 'Open-Source TTS', icon: Cpu },
    { id: 'voice-generator', label: 'Fish Audio Studio', icon: Mic },
    { id: 'voice-translator', label: 'Transcription Studio', icon: Subtitles },
    { id: 'script-studio', label: 'Script Studio', icon: FileText }
  ];

  const managementItems: NavItem[] = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleSelectTab = (tabId: TabType) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => handleSelectTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
          isActive
            ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-bold'
            : 'text-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850'
        } ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
        title={collapsed && !mobileOpen ? item.label : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${
              isActive
                ? 'text-white dark:text-black'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          />
          {(!collapsed || mobileOpen) && (
            <span className="truncate">{item.label}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar Container matching Script Studio theme tokens */}
      <aside
        className={`fixed top-0 bottom-0 z-50 bg-white dark:bg-studio-900 border-r border-studio-border transition-all duration-300 flex flex-col justify-between shadow-sm ${
          mobileOpen ? 'left-0 w-72' : '-left-full md:left-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Top Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-studio-border">
            {(!collapsed || mobileOpen) ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm font-mono">
                  ◆
                </div>
                <div>
                  <h1 className="font-serif font-extrabold tracking-tight text-lg leading-tight text-slate-900 dark:text-white">
                    VoiceForge
                  </h1>
                  <span className="text-[9px] font-mono tracking-widest text-slate-500 dark:text-slate-400 font-bold uppercase block mt-0.5">
                    AI VOICE-OVER STUDIO
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm mx-auto shadow-sm font-mono">
                ◆
              </div>
            )}

            {/* Desktop Collapse Toggle / Mobile Close */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden md:flex p-1.5 rounded-lg text-slate-600 hover:text-black dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition cursor-pointer"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Buttons matching Script Studio button styles */}
          <div className="p-3 space-y-2 border-b border-studio-border/60">
            <button
              onClick={() => {
                onNewProject();
                setMobileOpen(false);
              }}
              className={`w-full py-2.5 px-3 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                collapsed && !mobileOpen ? 'px-0' : ''
              }`}
              title="New Voiceover Project"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              {(!collapsed || mobileOpen) && <span>New Voiceover</span>}
            </button>

            <button
              onClick={() => {
                handleSelectTab('clone-voice');
                if (onOpenCloneVoice) {
                  onOpenCloneVoice();
                }
                setMobileOpen(false);
              }}
              className={`w-full py-2 px-3 bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl font-mono font-bold text-xs uppercase tracking-wider border border-studio-border flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                collapsed && !mobileOpen ? 'px-0' : ''
              }`}
              title="Clone Character Voice"
            >
              <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />
              {(!collapsed || mobileOpen) && <span>Clone Voice</span>}
            </button>
          </div>

          {/* Navigation Section */}
          <nav className="p-2 space-y-3">
            {/* Overview / Dashboard */}
            <div className="space-y-0.5">
              {renderNavButton({
                id: 'dashboard',
                label: 'Dashboard',
                icon: LayoutDashboard
              })}
            </div>

            {/* Studio Services */}
            <div>
              {(!collapsed || mobileOpen) && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  STUDIO SERVICES
                </div>
              )}
              <div className="space-y-0.5">
                {serviceItems.map(renderNavButton)}
              </div>
            </div>

            {/* Management */}
            <div>
              {(!collapsed || mobileOpen) && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  MANAGEMENT
                </div>
              )}
              <div className="space-y-0.5">
                {managementItems.map(renderNavButton)}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Theme Toggle & Engine Status */}
        <div className="p-3 border-t border-studio-border space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`w-full py-2 px-3 bg-white dark:bg-studio-900 hover:border-black border border-studio-border rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between text-slate-900 dark:text-slate-100 transition shadow-sm cursor-pointer ${
              collapsed && !mobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Toggle Light / Dark Mode"
          >
            {(!collapsed || mobileOpen) ? (
              <>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">THEME</span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  {theme === 'dark' ? (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>DARK</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>LIGHT</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Engine Status Pill */}
          <div
            className={`bg-white dark:bg-studio-900 border border-studio-border rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm ${
              collapsed && !mobileOpen ? 'justify-center p-2' : ''
            }`}
          >
            <span
              className={`block w-2 h-2 rounded-full flex-shrink-0 ${
                apiHealth.fishAudioConnected
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                  : 'bg-emerald-500'
              }`}
            />

            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                  ENGINE
                </span>
                <span
                  className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-studio-border bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300"
                >
                  READY
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
