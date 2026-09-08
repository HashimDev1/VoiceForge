import React from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  FileText, 
  FolderKanban, 
  History, 
  Settings, 
  Radio, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { ApiHealthResponse } from '../../../shared/src/types';

export type TabType = 'dashboard' | 'script-studio' | 'voice-generator' | 'projects' | 'history' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  apiHealth: ApiHealthResponse;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onNewProject: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  apiHealth,
  collapsed,
  setCollapsed,
  onNewProject,
  mobileOpen,
  setMobileOpen,
  theme,
  onToggleTheme
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'script-studio', label: 'Script Studio', icon: FileText },
    { id: 'voice-generator', label: 'Voice Generator', icon: Mic },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleSelectTab = (tabId: TabType) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 z-50 bg-studio-900 border-r border-studio-border transition-all duration-300 flex flex-col justify-between ${
          /* Mobile Drawer Position */
          mobileOpen ? 'left-0 w-72' : '-left-full md:left-0'
        } ${
          /* Desktop Width */
          collapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div>
          {/* Top Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-studio-border">
            {(!collapsed || mobileOpen) ? (
              <div className="flex items-center gap-2.5">
                {/* Geometric Minimal Icon matching screenshot */}
                <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-extrabold text-sm shadow-md font-mono">
                  ◆
                </div>
                <div>
                  <h1 className="font-serif font-extrabold tracking-tight text-lg leading-none text-slate-900 dark:text-white">
                    VoiceForge
                  </h1>
                  <span className="text-[9px] font-mono tracking-widest text-slate-700 dark:text-slate-400 font-bold uppercase block mt-0.5">
                    AI VOICE-OVER STUDIO
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-extrabold text-sm mx-auto shadow-md font-mono">
                ◆
              </div>
            )}

            {/* Desktop Collapse Toggle / Mobile Close */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden md:flex p-1.5 rounded-lg text-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-studio-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="p-3">
            <button
              onClick={() => {
                onNewProject();
                setMobileOpen(false);
              }}
              className={`w-full py-2.5 px-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition group ${
                collapsed && !mobileOpen ? 'px-0' : ''
              }`}
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              {(!collapsed || mobileOpen) && <span>New Voiceover</span>}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="px-2 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id as TabType)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'text-slate-600 hover:text-black dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850'
                  } ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-black' : 'text-slate-500 dark:text-slate-400'}`} />
                  {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status Card & Theme Switcher */}
        <div className="p-3 border-t border-studio-border space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`w-full py-2 px-3 bg-slate-100 dark:bg-studio-850 border border-studio-border rounded-xl text-xs font-mono font-bold flex items-center justify-between text-slate-800 dark:text-slate-200 hover:border-black transition ${
              collapsed && !mobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Toggle Light / Dark Mode"
          >
            {(!collapsed || mobileOpen) ? (
              <>
                <span className="uppercase text-[10px] tracking-wider font-bold text-slate-600 dark:text-slate-400">Theme</span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  {theme === 'dark' ? (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Fish Audio Provider Badge */}
          <div
            className={`bg-slate-100 dark:bg-studio-850 border border-studio-border rounded-xl p-3 flex items-center gap-3 ${
              collapsed && !mobileOpen ? 'justify-center p-2' : ''
            }`}
          >
            <div className="relative">
              <span
                className={`block w-2.5 h-2.5 rounded-full ${
                  apiHealth.fishAudioConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-rose-500 animate-ping'
                }`}
              />
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-800 dark:text-slate-200">Fish Audio</span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      apiHealth.fishAudioConnected
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {apiHealth.fishAudioConnected ? 'CONNECTED' : 'KEY MISSING'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono" title={apiHealth.message}>
                  {apiHealth.fishAudioConnected ? `MODEL ${apiHealth.model}` : 'Set FISH_API_KEY'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
