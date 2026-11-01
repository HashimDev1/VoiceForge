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
  Palette
} from 'lucide-react';
import {
  MediaAsset,
  TransitionType,
  EffectType,
  TimelineClip
} from '../../../../shared/src/videoEditorTypes';
import {
  TRANSITION_CATALOG,
  EFFECT_CATALOG,
  COLOR_PRESETS
} from '../../../../shared/src/videoEditorDefaults';
import { videoEditorApi } from '../../services/videoEditorApi';

interface EditorSidebarProps {
  assets: MediaAsset[];
  onUploadAsset: (file: File) => Promise<void>;
  onAddClip: (asset: MediaAsset) => void;
  onAddText: (text: string, presetName?: string) => void;
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
  onOpenCaptionStudio?: () => void;
}

type SidebarTab = 'media' | 'audio' | 'text' | 'transitions' | 'effects' | 'color' | 'stickers';

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
  selectedClip,
  onUpdateClip,
  onOpenCaptionStudio
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('media');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="glass-panel flex flex-col h-full rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm p-3.5 transition-colors">
      {/* Top Navigation Tabs */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-studio-800 border border-studio-border mb-3">
        {[
          ['media', 'Media', Video],
          ['audio', 'Audio', Music],
          ['text', 'Text', Type],
          ['transitions', 'Transit', Wand2],
          ['effects', 'Effects', Sparkles],
          ['color', 'Color', Palette],
          ['stickers', 'Stickers', Sticker]
        ].map(([tabId, label, Icon]: any) => {
          const isCurrent = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 px-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[580px] scrollbar-thin text-xs">
        {/* ==========================================
            TAB 1: MEDIA POOL & UPLOAD
            ========================================== */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Upload Action Area */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-studio-border bg-slate-50 dark:bg-studio-950/60 p-4 text-center hover:border-indigo-500/60 hover:bg-slate-100 dark:hover:bg-studio-800/40 transition cursor-pointer"
            >
              <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isUploading ? 'Uploading & Probing...' : 'Import Video / Audio / Image'}
              </span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white outline-none shadow-sm"
              />
            </div>

            {/* Asset Items Grid */}
            <div className="grid grid-cols-2 gap-2">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative flex flex-col rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 shadow-sm hover:border-indigo-400 transition"
                >
                  {/* Thumbnail / Icon Stage */}
                  <div className="relative h-20 w-full overflow-hidden rounded-lg bg-black/80 flex items-center justify-center">
                    {asset.thumbnailUrl ? (
                      <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-cover" />
                    ) : asset.type === 'video' ? (
                      <Film className="h-6 w-6 text-indigo-400" />
                    ) : asset.type === 'audio' ? (
                      <Music className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-purple-400" />
                    )}

                    {/* Duration badge */}
                    {asset.duration > 0 && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[9px] text-white">
                        {asset.duration.toFixed(1)}s
                      </span>
                    )}

                    {/* Hover Insert Button (+) */}
                    <button
                      type="button"
                      onClick={() => onAddClip(asset)}
                      title="Add to Timeline"
                      className="absolute inset-0 m-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-white opacity-0 group-hover:opacity-100 transition shadow hover:scale-110 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-1.5 truncate text-[11px] font-bold text-slate-900 dark:text-white">
                    {asset.name}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between">
                    <span className="uppercase">{asset.type}</span>
                    {asset.width && asset.height && <span>{asset.width}x{asset.height}</span>}
                  </div>
                </div>
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No imported assets yet. Drag and drop video or audio files above.
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 2: AUDIO & MUSIC
            ========================================== */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Audio Tracks & Beats
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Import audio files directly or use VoiceForge AI voices for narration.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black py-1.5 text-xs font-bold cursor-pointer shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import Audio File</span>
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: TEXT & TITLES
            ========================================== */}
        {activeTab === 'text' && (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Title & Caption Templates
            </span>
            <div className="grid grid-cols-1 gap-2">
              {TEXT_PRESETS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onAddText(t.sample, t.id)}
                  className="group flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 hover:border-indigo-500 cursor-pointer shadow-sm transition"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white" style={{ fontFamily: t.font }}>
                      {t.sample}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t.name} · {t.font}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: TRANSITIONS
            ========================================== */}
        {activeTab === 'transitions' && (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Scene Transitions ({TRANSITION_CATALOG.length})
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
                    className={`flex flex-col text-left rounded-xl border p-2.5 transition cursor-pointer shadow-sm ${
                      isSelected
                        ? 'border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{tr.name}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">{tr.description}</div>
                  </button>
                );
              })}
            </div>
            {!selectedClip && (
              <p className="text-[10px] text-slate-400 italic text-center pt-2">
                Select a clip on the timeline to attach transition.
              </p>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 5: EFFECTS & FILTERS
            ========================================== */}
        {activeTab === 'effects' && (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
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
                          effects: [...current, { id: `eff_${Date.now()}`, type: eff.id, intensity: eff.defaultIntensity, enabled: true }]
                        });
                      }
                    }}
                    className={`flex flex-col text-left rounded-xl border p-2.5 transition cursor-pointer shadow-sm ${
                      hasEffect
                        ? 'border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate">{eff.name}</span>
                      {hasEffect && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">{eff.description}</div>
                  </button>
                );
              })}
            </div>
            {!selectedClip && (
              <p className="text-[10px] text-slate-400 italic text-center pt-2">
                Select a clip on the timeline to toggle effects.
              </p>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 6: COLOR PRESETS
            ========================================== */}
        {activeTab === 'color' && (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Cinematic Color Grading Looks
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
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer shadow-sm ${
                      isCurrent
                        ? 'border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{cp.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Contrast: {cp.settings.contrast || 0}% · Sat: {cp.settings.saturation || 0}%
                      </div>
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 7: STICKERS & OVERLAYS
            ========================================== */}
        {activeTab === 'stickers' && (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Quick Graphic Stickers
            </span>
            <div className="grid grid-cols-4 gap-2">
              {STICKERS.map((stk, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAddText(stk, 'sticker')}
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 text-2xl hover:scale-110 active:scale-95 transition cursor-pointer shadow-sm"
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
