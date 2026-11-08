import React, { useState, useRef } from 'react';
import {
  Video,
  Music,
  Type,
  Sparkles,
  Wand2,
  Sliders,
  Sticker,
  Plus,
  Upload,
  Play,
  Film,
  Image as ImageIcon,
  Check,
  Search,
  Layers,
  Palette,
  Folder,
  LayoutGrid,
  List,
  Volume2,
  SlidersHorizontal,
  Subtitles,
  ExternalLink
} from 'lucide-react';
import {
  MediaAsset,
  TransitionType,
  EffectType,
  TimelineClip,
  MotionTitleTemplate
} from '../../../../shared/src/videoEditorTypes';
import {
  TRANSITION_CATALOG,
  EFFECT_CATALOG,
  COLOR_PRESETS
} from '../../../../shared/src/videoEditorDefaults';
import { STARTER_MOTION_TEMPLATES } from '../../../../shared/src/motionGraphicsEngine';

interface EditorSidebarProps {
  assets: MediaAsset[];
  onUploadAsset: (file: File) => Promise<void>;
  onAddClip: (asset: MediaAsset) => void;
  onAddText: (text: string, presetName?: string) => void;
  onAddMotionClip?: (template: MotionTitleTemplate, customText?: string) => void;
  onOpenMotionStudio?: () => void;
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
  onOpenCaptionStudio?: () => void;
  projectClips?: TimelineClip[];
}

export type SidebarTab =
  | 'media'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'transitions'
  | 'captions'
  | 'filters'
  | 'motion';

const TEXT_PRESETS = [
  { id: 'bold_headline', name: 'Bold Headline', sample: 'BREAKING NEWS', font: 'Montserrat', bold: true },
  { id: 'minimal_lower', name: 'Minimal Lower Third', sample: 'DOCUMENTARY SCENE', font: 'Inter', bold: false },
  { id: 'neon_glow', name: 'Neon Cyberpunk', sample: 'NEON HORIZON', font: 'Arial Black', bold: true },
  { id: 'luxury_serif', name: 'Luxury Editorial', sample: 'TIMELESS BEAUTY', font: 'Cinzel', bold: true },
  { id: 'bubble_pop', name: 'Bubblegum Pop', sample: 'CANDY SWEET', font: 'Poppins', bold: true },
  { id: 'retro_terminal', name: 'Retro Terminal', sample: '> SYSTEM.INIT', font: 'Courier New', bold: false }
];

const STICKERS = [
  '🔥', '⚡', '✨', '🎯', '🚀', '💯', '💥', '🏆', '👀', '🚨', '❤️', '👏', '🎬', '🌟', '💎', '🎉'
];

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  assets,
  onUploadAsset,
  onAddClip,
  onAddText,
  onAddMotionClip,
  onOpenMotionStudio,
  selectedClip,
  onUpdateClip,
  onOpenCaptionStudio,
  projectClips = []
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaCategory, setMediaCategory] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [motionCategory, setMotionCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUploadAsset(file);
    } catch (err) {
      console.error('Asset upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredAssets = assets
    .filter((a) => (mediaCategory === 'all' ? true : a.type === mediaCategory))
    .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Check if an asset is already placed on the timeline
  const isAssetAdded = (assetId: string) => {
    return projectClips.some((c) => c.assetId === assetId);
  };

  const navTabs: Array<{ id: SidebarTab; label: string; icon: any }> = [
    { id: 'media', label: 'Media', icon: Video },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Sticker },
    { id: 'effects', label: 'Effects', icon: Sliders },
    { id: 'transitions', label: 'Transitions', icon: Wand2 },
    { id: 'captions', label: 'Captions', icon: Subtitles },
    { id: 'filters', label: 'Filters', icon: Palette },
    { id: 'motion', label: 'Motion', icon: Sparkles }
  ];

  return (
    <aside className="w-full h-full flex flex-col bg-[#15191F] border-r border-[#303740] select-none text-[#F0F3F7] overflow-hidden">
      {/* 1. TOP HORIZONTAL CATEGORY NAVIGATION */}
      <div className="h-10 shrink-0 border-b border-[#303740] bg-[#15191F] px-1 flex items-center overflow-x-auto vf-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#242A33] text-[#40D5CB]'
                  : 'text-[#A4AFBD] hover:text-white hover:bg-[#1B2028]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#40D5CB]' : 'opacity-70'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. MAIN CATEGORY WORKSPACE CONTENT */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ========================================================= */}
        {/* TAB 1: MEDIA POOL */}
        {/* ========================================================= */}
        {activeTab === 'media' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sub-sidebar: Media Folders */}
            <div className="w-28 shrink-0 border-r border-[#303740] bg-[#11141A] p-2 flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider px-2 py-1">
                Library
              </span>
              {[
                { id: 'all', label: 'All Media', count: assets.length },
                { id: 'video', label: 'Videos', count: assets.filter((a) => a.type === 'video').length },
                { id: 'image', label: 'Photos', count: assets.filter((a) => a.type === 'image').length },
                { id: 'audio', label: 'Audio', count: assets.filter((a) => a.type === 'audio').length }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMediaCategory(cat.id as any)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer ${
                    mediaCategory === cat.id
                      ? 'bg-[#242A33] text-[#40D5CB] font-bold'
                      : 'text-[#A4AFBD] hover:text-white hover:bg-[#1B2028]'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <span className="text-[10px] opacity-60 font-mono">{cat.count}</span>
                </button>
              ))}

              <div className="mt-auto border-t border-[#303740] pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-[#242A33] hover:bg-[#303842] text-[#40D5CB] text-[11px] font-bold cursor-pointer transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import</span>
                </button>
              </div>
            </div>

            {/* Right Media Grid Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#15191F]">
              {/* Media Toolbar Header */}
              <div className="p-2.5 border-b border-[#303740] flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*,image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Import Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#40D5CB] hover:bg-[#35BDB3] text-[#0B0E13] text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isUploading ? 'Importing...' : 'Import'}</span>
                </button>

                {/* Search field */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#747F90]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media..."
                    className="w-full bg-[#1B2028] border border-[#303740] focus:border-[#40D5CB] rounded-md py-1 pl-8 pr-2 text-xs text-[#F0F3F7] outline-none"
                  />
                </div>

                {/* Grid / List view toggle */}
                <div className="flex items-center bg-[#1B2028] border border-[#303740] rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[#242A33] text-[#40D5CB]' : 'text-[#747F90] hover:text-white'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#242A33] text-[#40D5CB]' : 'text-[#747F90] hover:text-white'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Media Card Grid (3 Columns on typical width) */}
              <div className="flex-1 overflow-y-auto p-2.5 vf-scrollbar">
                {filteredAssets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#747F90]">
                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs font-medium text-[#A4AFBD]">Import media to start editing</p>
                    <p className="text-[11px] mt-1 text-[#747F90]">MP4, MOV, MP3, WAV, PNG, JPG supported</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 px-3 py-1.5 rounded-md bg-[#242A33] hover:bg-[#303842] text-[#40D5CB] text-xs font-bold cursor-pointer"
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
                        : 'flex flex-col gap-1.5'
                    }
                  >
                    {filteredAssets.map((asset) => {
                      const added = isAssetAdded(asset.id);

                      if (viewMode === 'list') {
                        return (
                          <div
                            key={asset.id}
                            className="group flex items-center justify-between p-1.5 rounded-md bg-[#1B2028] border border-[#303740] hover:border-[#40D5CB] transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded bg-black/60 flex items-center justify-center shrink-0">
                                {asset.type === 'video' ? <Film className="w-4 h-4 text-[#40D5CB]" /> : asset.type === 'audio' ? <Music className="w-4 h-4 text-[#48C994]" /> : <ImageIcon className="w-4 h-4 text-[#8B79F1]" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#F0F3F7] truncate">{asset.name}</p>
                                <p className="text-[10px] text-[#747F90] font-mono">
                                  {asset.duration > 0 ? `${asset.duration.toFixed(1)}s · ` : ''}
                                  {asset.type.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {added && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#242A33] text-[#40D5CB] border border-[#303740]">
                                  Added
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => onAddClip(asset)}
                                title="Add to Timeline"
                                className="p-1 rounded bg-[#242A33] hover:bg-[#40D5CB] text-[#F0F3F7] hover:text-[#0B0E13] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={asset.id}
                          className="group relative flex flex-col rounded-lg bg-[#1B2028] border border-[#303740] hover:border-[#40D5CB] p-1.5 transition-all cursor-pointer"
                        >
                          {/* 16:9 Thumbnail Box */}
                          <div className="relative aspect-video w-full rounded bg-black/80 overflow-hidden flex items-center justify-center">
                            {asset.thumbnailUrl ? (
                              <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                            ) : asset.type === 'video' ? (
                              <Film className="w-6 h-6 text-[#40D5CB]/80" />
                            ) : asset.type === 'audio' ? (
                              <Music className="w-6 h-6 text-[#48C994]/80" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-[#8B79F1]/80" />
                            )}

                            {/* Added Badge (like CapCut desktop reference) */}
                            {added && (
                              <div className="absolute top-1 left-1 px-1 rounded bg-[#0B0E13]/85 text-[#40D5CB] font-mono text-[8px] font-bold border border-[#40D5CB]/40">
                                Added
                              </div>
                            )}

                            {/* Duration Badge in top right corner */}
                            {asset.duration > 0 && (
                              <div className="absolute top-1 right-1 px-1 rounded bg-black/75 font-mono text-[9px] text-white">
                                {Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}
                              </div>
                            )}

                            {/* Hover Quick Add Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <button
                                type="button"
                                onClick={() => onAddClip(asset)}
                                title="Add to Timeline"
                                className="w-7 h-7 rounded-full bg-[#40D5CB] text-[#0B0E13] flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>

                          {/* Asset Filename underneath */}
                          <div className="mt-1 truncate text-[11px] font-medium text-[#F0F3F7]">
                            {asset.name}
                          </div>
                          <div className="text-[9px] text-[#747F90] flex items-center justify-between">
                            <span className="uppercase">{asset.type}</span>
                            {asset.width && asset.height && <span>{asset.width}x{asset.height}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: AUDIO */}
        {/* ========================================================= */}
        {activeTab === 'audio' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-3">
            <div className="p-3 rounded-lg bg-[#1B2028] border border-[#303740] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Import Custom Audio</h4>
                <p className="text-[11px] text-[#747F90]">Add background tracks, voiceovers, or SFX</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#40D5CB] text-[#0B0E13] text-xs font-bold cursor-pointer hover:bg-[#35BDB3]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
            </div>

            <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider">
              Project Audio Tracks
            </span>

            <div className="flex flex-col gap-1.5">
              {assets.filter((a) => a.type === 'audio').map((au) => (
                <div
                  key={au.id}
                  className="flex items-center justify-between p-2 rounded-md bg-[#1B2028] border border-[#303740] hover:border-[#48C994] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-[#242A33] flex items-center justify-center text-[#48C994]">
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{au.name}</p>
                      <p className="text-[10px] text-[#747F90] font-mono">{au.duration.toFixed(1)}s</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddClip(au)}
                    className="p-1 rounded bg-[#242A33] hover:bg-[#48C994] text-white hover:text-black transition-colors cursor-pointer"
                    title="Add to Timeline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {assets.filter((a) => a.type === 'audio').length === 0 && (
                <div className="text-center py-6 text-xs text-[#747F90]">
                  No audio files in project yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TEXT & TITLES */}
        {/* ========================================================= */}
        {activeTab === 'text' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-3">
            <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider">
              Standard Typography Presets
            </span>
            <div className="grid grid-cols-1 gap-2">
              {TEXT_PRESETS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onAddText(t.sample, t.id)}
                  className="group flex items-center justify-between p-3 rounded-lg bg-[#1B2028] border border-[#303740] hover:border-[#40D5CB] cursor-pointer transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-white" style={{ fontFamily: t.font }}>
                      {t.sample}
                    </div>
                    <div className="text-[10px] text-[#747F90]">
                      {t.name} · {t.font}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded bg-[#242A33] group-hover:bg-[#40D5CB] group-hover:text-black text-white flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MOTION GRAPHICS (Phase 3 Engine) */}
        {/* ========================================================= */}
        {activeTab === 'motion' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-3">
            {onOpenMotionStudio && (
              <button
                type="button"
                onClick={onOpenMotionStudio}
                className="w-full py-2 px-3 rounded-lg bg-[#8B79F1] hover:bg-[#7A67E6] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Advanced Title Designer</span>
              </button>
            )}

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 vf-scrollbar">
              {['all', 'cinematic', 'documentary', 'minimal', 'modern', 'news', 'corporate', 'social', 'dramatic'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMotionCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    motionCategory === cat
                      ? 'bg-[#242A33] text-[#40D5CB] border border-[#40D5CB]/40'
                      : 'bg-[#1B2028] text-[#747F90] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {STARTER_MOTION_TEMPLATES.filter((tpl) => motionCategory === 'all' || tpl.category === motionCategory).map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => onAddMotionClip?.(tpl)}
                  className="group p-2.5 rounded-lg bg-[#1B2028] border border-[#303740] hover:border-[#8B79F1] cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate">{tpl.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#242A33] text-[#8B79F1] uppercase">
                      {tpl.category}
                    </span>
                  </div>
                  <div
                    className="text-xs font-bold text-[#8B79F1] truncate"
                    style={{ fontFamily: tpl.design.fontFamily }}
                  >
                    {tpl.design.mainText}
                  </div>
                  <p className="text-[9px] text-[#747F90] line-clamp-1 mt-0.5">{tpl.description}</p>
                  <div className="mt-2 pt-1 border-t border-[#242A33] flex items-center justify-between text-[9px] text-[#747F90]">
                    <span className="capitalize">{tpl.design.animation?.type?.replace('_', ' ')}</span>
                    <span className="text-[#8B79F1] font-bold group-hover:underline">+ Add to Timeline</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: TRANSITIONS */}
        {/* ========================================================= */}
        {activeTab === 'transitions' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-2.5">
            <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider">
              Transitions Catalog ({TRANSITION_CATALOG.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {TRANSITION_CATALOG.map((tr) => {
                const isSelected = selectedClip?.transitionIn?.type === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      if (selectedClip) {
                        onUpdateClip(selectedClip.id, {
                          transitionIn: { type: tr.id, duration: 0.5, easing: 'ease_in_out' }
                        });
                      }
                    }}
                    className={`flex flex-col text-left p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#242A33] border-[#40D5CB] text-white shadow-xs'
                        : 'bg-[#1B2028] border-[#303740] hover:border-[#747F90] text-[#A4AFBD]'
                    }`}
                  >
                    <div className="font-bold text-xs truncate text-[#F0F3F7]">{tr.name}</div>
                    <div className="text-[9px] text-[#747F90] mt-0.5 truncate">{tr.description}</div>
                  </button>
                );
              })}
            </div>
            {!selectedClip && (
              <p className="text-[10px] text-[#747F90] italic text-center pt-2">
                Select a clip on the timeline to attach transition.
              </p>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: EFFECTS */}
        {/* ========================================================= */}
        {activeTab === 'effects' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-2.5">
            <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider">
              Visual Effects Engine ({EFFECT_CATALOG.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {EFFECT_CATALOG.map((eff) => {
                const hasEffect = selectedClip?.effects?.some((e) => e.type === eff.id && e.enabled);
                return (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() => {
                      if (!selectedClip) return;
                      const current = selectedClip.effects || [];
                      const exists = current.find((e) => e.type === eff.id);
                      if (exists) {
                        onUpdateClip(selectedClip.id, {
                          effects: current.filter((e) => e.type !== eff.id)
                        });
                      } else {
                        onUpdateClip(selectedClip.id, {
                          effects: [
                            ...current,
                            { id: `eff_${Date.now()}`, type: eff.id, intensity: eff.defaultIntensity, enabled: true }
                          ]
                        });
                      }
                    }}
                    className={`flex flex-col text-left p-2 rounded-lg border transition-all cursor-pointer ${
                      hasEffect
                        ? 'bg-[#242A33] border-[#40D5CB] text-white shadow-xs'
                        : 'bg-[#1B2028] border-[#303740] hover:border-[#747F90] text-[#A4AFBD]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate text-[#F0F3F7]">{eff.name}</span>
                      {hasEffect && <Check className="w-3.5 h-3.5 text-[#40D5CB] shrink-0" />}
                    </div>
                    <div className="text-[9px] text-[#747F90] mt-0.5 truncate">{eff.description}</div>
                  </button>
                );
              })}
            </div>
            {!selectedClip && (
              <p className="text-[10px] text-[#747F90] italic text-center pt-2">
                Select a clip on the timeline to toggle effects.
              </p>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: FILTERS / COLOR LOOKS */}
        {/* ========================================================= */}
        {activeTab === 'filters' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-2.5">
            <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider">
              Color Grading Looks ({COLOR_PRESETS.length})
            </span>
            <div className="grid grid-cols-1 gap-2">
              {COLOR_PRESETS.map((cp) => {
                const isCurrent = selectedClip?.colorGrading?.preset === cp.id;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => {
                      if (selectedClip) {
                        onUpdateClip(selectedClip.id, {
                          colorGrading: {
                            ...selectedClip.colorGrading,
                            ...cp.settings,
                            preset: cp.id
                          }
                        });
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#242A33] border-[#40D5CB] text-white shadow-xs'
                        : 'bg-[#1B2028] border-[#303740] hover:border-[#747F90] text-[#A4AFBD]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#F0F3F7]">{cp.name}</div>
                      <div className="text-[10px] text-[#747F90]">
                        Contrast: {cp.settings.contrast || 0}% · Saturation: {cp.settings.saturation || 0}%
                      </div>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-[#40D5CB] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: CAPTIONS */}
        {/* ========================================================= */}
        {activeTab === 'captions' && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto vf-scrollbar space-y-3 text-center">
            <Subtitles className="w-8 h-8 text-[#40D5CB] mx-auto opacity-80" />
            <h4 className="text-xs font-bold text-white">VoiceForge Caption Studio 2.0</h4>
            <p className="text-[11px] text-[#747F90] max-w-xs mx-auto">
              Generate synchronized word-by-word captions, kinetic subtitles, and apply 86 styling looks.
            </p>
            {onOpenCaptionStudio && (
              <button
                type="button"
                onClick={onOpenCaptionStudio}
                className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#40D5CB] hover:bg-[#35BDB3] text-[#0B0E13] text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Caption Studio</span>
              </button>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: STICKERS */}
        {/* ========================================================= */}
        {activeTab === 'stickers' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto vf-scrollbar space-y-2.5">
            <span className="text-[10px] font-bold text-[#747F90] uppercase tracking-wider">
              Quick Graphic Stickers
            </span>
            <div className="grid grid-cols-4 gap-2">
              {STICKERS.map((stk, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAddText(stk, 'sticker')}
                  className="flex h-12 items-center justify-center rounded-lg bg-[#1B2028] border border-[#303740] hover:border-[#40D5CB] text-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
