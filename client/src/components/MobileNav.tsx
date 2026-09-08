import React from 'react';
import { LayoutDashboard, FileText, Mic, FolderKanban, Settings } from 'lucide-react';
import { TabType } from './Sidebar';

interface MobileNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'script-studio', label: 'Studio', icon: FileText },
    { id: 'voice-generator', label: 'Voices', icon: Mic },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-studio-900/95 backdrop-blur-md border-t border-studio-border px-2 py-1.5 flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              isActive
                ? 'text-indigo-500 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-mono tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
