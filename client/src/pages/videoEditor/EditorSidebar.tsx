import React, { useState, useRef } from 'react';
import {
  Video,
  Music,
  Type,
  Sparkles,
  Wand2,
  Sliders,
  Smile,
  Plus,
  Upload,
  Play,
  Pause,
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
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Mic,
  LayoutTemplate
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
import { naturalSort } from '../../../../shared/src/bulkTimelineParser';

interface EditorSidebarProps {
  assets: MediaAsset[];
  onUploadAsset: (file: File) => Promise<void>;
  onAddClip: (asset: MediaAsset) => void;
  onAddText: (text: string, presetName?: string) => void;
  onAddMotionClip?: (template: MotionTitleTemplate, customText?: string) => void;
  onOpenMotionStudio?: () => void;
  onOpenSmartBulk?: () => void;
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
  | 'adjustment'
  | 'templates';

const TEXT_PRESETS = [
  { id: 'bold_headline', name: 'Bold Headline', sample: 'CAPCUT TITLE', font: 'Montserrat', bold: true },
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
  onOpenSmartBulk,
  selectedClip,
  onUpdateClip,
  onOpenCaptionStudio,
  projectClips = []
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaCategory, setMediaCategory] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [leftNavSection, setLeftNavSection] = useState<'import' | 'media' | 'subprojects' | 'yours' | 'library'>('import');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortAsc, setSortAsc] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePreviewAudio = (asset: MediaAsset) => {
    if (previewAudioId === asset.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewAudioId(null);
    } else {
      setPreviewAudioId(asset.id);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = asset.url;
        previewAudioRef.current.play().catch(() => {});
      }
    }
  };

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

  const sortedAssets = naturalSort(
    assets
      .filter((a) => (mediaCategory === 'all' ? true : a.type === mediaCategory))
      .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase())),
    (a) => a.name
  );

  const filteredAssets = sortAsc ? sortedAssets : [...sortedAssets].reverse();

  // Check if an asset is already placed on the timeline
  const isAssetAdded = (assetId: string) => {
    return projectClips.some((c) => c.assetId === assetId);
  };

  const formatAssetDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:04';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const navTabs: Array<{ id: SidebarTab; label: string; icon: any }> = [
    { id: 'media', label: 'Media', icon: Video },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'effects', label: 'Effects', icon: Sliders },
    { id: 'transitions', label: 'Transitions', icon: Wand2 },
    { id: 'captions', label: 'Captions', icon: Subtitles },
    { id: 'filters', label: 'Filters', icon: Palette },
    { id: 'adjustment', label: 'Adjustment', icon: SlidersHorizontal },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate }
  ];

  return (
    <aside className="w-full h-full flex flex-col bg-[#181B20] select-none text-[#E4E7EC] overflow-hidden">
      {/* 1. TOP HORIZONTAL CATEGORY NAVIGATION (CapCut exact tab strip) */}
      <div className="h-10 shrink-0 border-b border-[#262A34] bg-[#14171C] px-2 flex items-center gap-0.5 overflow-x-auto vf-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans font-medium transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'text-[#13E2CA] font-semibold bg-[#222631]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E222B]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#13E2CA]' : 'opacity-70'}`} />
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
            {/* Left Sub-sidebar: CapCut Media Navigation */}
            <div className="w-28 shrink-0 border-r border-[#262A34] bg-[#14171C] p-2 flex flex-col gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLeftNavSection('import');
                  setMediaCategory('all');
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded transition cursor-pointer font-medium ${
                  leftNavSection === 'import' && mediaCategory === 'all'
                    ? 'text-[#13E2CA] font-bold bg-[#1E222B]'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                Import
              </button>

              <button
                type="button"
                onClick={() => {
                  setLeftNavSection('media');
                  setMediaCategory('video');
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded transition cursor-pointer ${
                  mediaCategory === 'video'
                    ? 'text-[#13E2CA] font-bold bg-[#1E222B]'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                Media
              </button>

              <div className="my-1 border-t border-[#262A34]" />

              <div className="flex items-center justify-between px-2.5 py-1 text-slate-500 text-[11px] font-sans">
                <span>Yours</span>
                <ChevronDown className="w-3 h-3" />
              </div>

              <div className="flex items-center justify-between px-2.5 py-1 text-slate-500 text-[11px] font-sans">
                <span>AI media</span>
                <ChevronDown className="w-3 h-3" />
              </div>

              <div className="flex items-center justify-between px-2.5 py-1 text-slate-500 text-[11px] font-sans">
                <span>Spaces</span>
                <ChevronDown className="w-3 h-3" />
              </div>

              <div className="flex items-center justify-between px-2.5 py-1 text-slate-500 text-[11px] font-sans">
                <span>Library</span>
                <ChevronDown className="w-3 h-3" />
              </div>

              <div className="mt-auto pt-2 border-t border-[#262A34]">
                <span className="text-[11px] text-slate-500 px-2.5">Dreamina</span>
              </div>
            </div>

            {/* Right Media Grid Area (CapCut Media Browser) */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#181B20]">
              {/* Media Toolbar Header */}
              <div className="p-2 border-b border-[#262A34] flex items-center gap-1.5 bg-[#181B20]">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*,audio/*,image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* CapCut Pill Import Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#1A3838] border border-[#13E2CA]/50 text-[#13E2CA] hover:bg-[#13E2CA] hover:text-black font-sans text-xs font-semibold shadow-xs cursor-pointer transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isUploading ? 'Importing...' : 'Import'}</span>
                </button>

                {/* Smart Bulk Arrange Button (50-200 bulk images/videos) */}
                {onOpenSmartBulk && (
                  <button
                    type="button"
                    onClick={onOpenSmartBulk}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#13E2CA] to-[#00C8B3] text-black font-sans text-xs font-bold shadow-sm hover:brightness-110 cursor-pointer transition active:scale-95 shrink-0"
                    title="Smart Bulk Arrange 50–200 media files sequentially"
                  >
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Smart Bulk</span>
                  </button>
                )}

                {/* Record Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#222631] hover:bg-[#282D38] text-slate-300 hover:text-white font-sans text-xs transition cursor-pointer shrink-0"
                >
                  <Mic className="w-3 h-3 text-slate-400" />
                  <span>Record</span>
                </button>

                {/* Search Box */}
                <div className="relative flex-1 min-w-[100px]">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media"
                    className="w-full bg-[#14171C] border border-[#262A34] focus:border-[#13E2CA] rounded-full py-1 pl-8 pr-2 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                {/* Sort / View controls */}
                <button
                  type="button"
                  onClick={() => setSortAsc(!sortAsc)}
                  title="Toggle Natural Sort"
                  className="p-1.5 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center bg-[#14171C] border border-[#262A34] rounded p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded transition ${
                      viewMode === 'grid' ? 'bg-[#282D38] text-[#13E2CA]' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded transition ${
                      viewMode === 'list' ? 'bg-[#282D38] text-[#13E2CA]' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sub-header: "All" with count */}
              <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-400 font-sans border-b border-[#20242D]">
                <span className="font-semibold text-slate-300">All ({filteredAssets.length})</span>
                <span className="text-[11px] text-slate-500">Natural Numeric Order</span>
              </div>

              {/* Media Card Grid (Exact 3-column CapCut layout) */}
              <div className="flex-1 overflow-y-auto p-2.5 vf-scrollbar">
                {filteredAssets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 rounded-lg border border-dashed border-[#262A34] bg-[#14171C]/50">
                    <Upload className="w-8 h-8 mb-2 opacity-50 text-[#13E2CA]" />
                    <p className="text-xs font-semibold text-slate-300">Import media to start editing</p>
                    <p className="text-[11px] mt-1 text-slate-500">MP4, MOV, MP3, WAV, PNG, JPG supported</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-full bg-[#1A3838] border border-[#13E2CA]/50 text-[#13E2CA] hover:bg-[#13E2CA] hover:text-black font-sans text-xs font-semibold cursor-pointer shadow-sm transition"
                      >
                        + Import Media
                      </button>
                      {onOpenSmartBulk && (
                        <button
                          type="button"
                          onClick={onOpenSmartBulk}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#13E2CA] to-[#00C8B3] text-black font-sans text-xs font-bold cursor-pointer shadow-sm transition"
                        >
                          ⚡ Smart Bulk (50–200)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-3 gap-2'
                        : 'flex flex-col gap-1.5'
                    }
                  >
                    {filteredAssets.map((asset, assetIdx) => {
                      const added = isAssetAdded(asset.id);

                      if (viewMode === 'list') {
                        return (
                          <div
                            key={asset.id}
                            className="group flex items-center justify-between p-2 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded bg-black/80 flex items-center justify-center shrink-0">
                                {asset.type === 'video' ? (
                                  <Film className="w-4 h-4 text-[#13E2CA]" />
                                ) : asset.type === 'audio' ? (
                                  <Music className="w-4 h-4 text-sky-400" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-purple-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">{asset.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {formatAssetDuration(asset.duration)} · {asset.type.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {added && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/60 text-slate-300 border border-[#2D3340]">
                                  Added
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => onAddClip(asset)}
                                title="Add to Timeline"
                                className="p-1 rounded bg-[#13E2CA] hover:bg-[#00F2DC] text-black shadow-xs transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // CapCut Exact 3-column thumbnail card
                      return (
                        <div
                          key={asset.id}
                          className="group relative flex flex-col rounded bg-[#1A1D24] border border-[#262A34] hover:border-[#13E2CA] p-1 transition cursor-pointer select-none"
                          onClick={() => onAddClip(asset)}
                        >
                          {/* 16:9 Thumbnail Box */}
                          <div className="relative aspect-video w-full rounded bg-black/90 overflow-hidden flex items-center justify-center">
                            {asset.thumbnailUrl ? (
                              <img
                                src={asset.thumbnailUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : asset.type === 'video' ? (
                              <Film className="w-6 h-6 text-[#13E2CA]" />
                            ) : asset.type === 'audio' ? (
                              <Music className="w-6 h-6 text-sky-400" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-purple-400" />
                            )}

                            {/* Added badge on top-left (exact CapCut style) */}
                            {added && (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-slate-300 font-sans text-[9px] font-medium pointer-events-none">
                                Added
                              </div>
                            )}

                            {/* Duration badge on top-right (exact CapCut style) */}
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-semibold pointer-events-none">
                              {formatAssetDuration(asset.duration)}
                            </div>

                            {/* Center hover plus button */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <div className="w-7 h-7 rounded-full bg-[#13E2CA] text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                                <Plus className="w-4 h-4 stroke-[3]" />
                              </div>
                            </div>
                          </div>

                          {/* Bottom filename label (exact CapCut style) */}
                          <div className="pt-1 px-0.5">
                            <p
                              className="text-[11px] font-sans text-slate-300 truncate tracking-tight"
                              title={asset.name}
                            >
                              {asset.name}
                            </p>
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
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Sound Effects & Music</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-[#13E2CA] hover:underline"
              >
                + Import Audio
              </button>
            </div>
            <div className="space-y-1.5">
              {assets
                .filter((a) => a.type === 'audio')
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-slate-200 truncate block font-medium">{a.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatAssetDuration(a.duration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePreviewAudio(a)}
                        className="p-1 rounded hover:bg-[#282D38] text-slate-400 hover:text-white transition cursor-pointer"
                        title={previewAudioId === a.id ? 'Pause Preview' : 'Play Preview'}
                      >
                        {previewAudioId === a.id ? (
                          <Pause className="w-3.5 h-3.5 fill-current text-[#13E2CA]" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddClip(a)}
                        title="Add to Timeline"
                        className="p-1 rounded bg-[#13E2CA] text-black hover:bg-[#00F2DC] transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              {assets.filter((a) => a.type === 'audio').length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No audio tracks imported yet. Click "+ Import Audio" to add background music or voiceovers.
                </div>
              )}
            </div>
            {/* Hidden audio element for sidebar previewing */}
            <audio
              ref={previewAudioRef}
              onEnded={() => setPreviewAudioId(null)}
              className="hidden"
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TEXT */}
        {/* ========================================================= */}
        {activeTab === 'text' && (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <span className="text-xs font-semibold text-slate-300">Text Templates & Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {TEXT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => onAddText(preset.sample, preset.id)}
                  className="flex flex-col items-center justify-center p-3 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition cursor-pointer group"
                >
                  <span
                    className="text-xs text-white group-hover:text-[#13E2CA] transition mb-1 text-center"
                    style={{ fontFamily: preset.font, fontWeight: preset.bold ? 'bold' : 'normal' }}
                  >
                    {preset.sample}
                  </span>
                  <span className="text-[10px] text-slate-400">{preset.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: STICKERS */}
        {/* ========================================================= */}
        {activeTab === 'stickers' && (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <span className="text-xs font-semibold text-slate-300">Stickers & Emojis</span>
            <div className="grid grid-cols-4 gap-2">
              {STICKERS.map((stk, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAddText(stk, 'sticker')}
                  className="h-12 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] hover:bg-[#282D38] text-2xl flex items-center justify-center transition cursor-pointer"
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: EFFECTS */}
        {/* ========================================================= */}
        {activeTab === 'effects' && (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <span className="text-xs font-semibold text-slate-300">Video Effects</span>
            <div className="grid grid-cols-2 gap-2">
              {EFFECT_CATALOG.map((eff) => (
                <div
                  key={eff.id}
                  onClick={() => {
                    if (selectedClip) {
                      onUpdateClip(selectedClip.id, {
                        effects: [...(selectedClip.effects || []), { id: `eff-${Date.now()}`, type: eff.id as any, intensity: 1 }]
                      });
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition cursor-pointer"
                >
                  <Sliders className="w-5 h-5 text-[#13E2CA] mb-1" />
                  <span className="text-xs text-white font-medium">{eff.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: TRANSITIONS */}
        {/* ========================================================= */}
        {activeTab === 'transitions' && (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <span className="text-xs font-semibold text-slate-300">Transitions</span>
            <div className="grid grid-cols-2 gap-2">
              {TRANSITION_CATALOG.map((trans) => (
                <div
                  key={trans.id}
                  onClick={() => {
                    if (selectedClip) {
                      onUpdateClip(selectedClip.id, {
                        transitionIn: { type: trans.id as any, duration: 0.5 }
                      });
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition cursor-pointer"
                >
                  <Wand2 className="w-5 h-5 text-[#13E2CA] mb-1" />
                  <span className="text-xs text-white font-medium">{trans.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: CAPTIONS */}
        {/* ========================================================= */}
        {activeTab === 'captions' && (
          <div className="flex-1 flex flex-col p-4 items-center justify-center text-center space-y-3">
            <Subtitles className="w-10 h-10 text-[#13E2CA]" />
            <h4 className="text-sm font-bold text-white">VoiceForge Auto Captions</h4>
            <p className="text-xs text-slate-400 max-w-xs">
              Generate perfectly synchronized subtitles and kinetic typography with speech recognition.
            </p>
            {onOpenCaptionStudio && (
              <button
                type="button"
                onClick={onOpenCaptionStudio}
                className="px-4 py-1.5 rounded-full bg-[#13E2CA] text-black font-bold text-xs hover:bg-[#00F2DC] shadow transition cursor-pointer"
              >
                Launch Caption Studio
              </button>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: FILTERS / ADJUSTMENT */}
        {/* ========================================================= */}
        {(activeTab === 'filters' || activeTab === 'adjustment') && (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <span className="text-xs font-semibold text-slate-300">Color Grading & LUT Filters</span>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    if (selectedClip) {
                      onUpdateClip(selectedClip.id, {
                        colorGrading: { ...preset.values }
                      });
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition cursor-pointer"
                >
                  <Palette className="w-5 h-5 text-[#13E2CA] mb-1" />
                  <span className="text-xs text-white font-medium">{preset.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: TEMPLATES / MOTION GRAPHICS */}
        {/* ========================================================= */}
        {activeTab === 'templates' && (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto vf-scrollbar">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Motion Graphics & Titles</span>
              {onOpenMotionStudio && (
                <button
                  type="button"
                  onClick={onOpenMotionStudio}
                  className="text-[11px] text-[#13E2CA] hover:underline"
                >
                  Studio Editor
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {STARTER_MOTION_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => onAddMotionClip?.(tmpl)}
                  className="flex items-center justify-between p-2.5 rounded bg-[#1E222B] border border-[#262A34] hover:border-[#13E2CA] transition cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{tmpl.name}</p>
                    <p className="text-[10px] text-slate-400">{tmpl.category} · {tmpl.defaultDuration}s</p>
                  </div>
                  <Plus className="w-4 h-4 text-[#13E2CA]" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
