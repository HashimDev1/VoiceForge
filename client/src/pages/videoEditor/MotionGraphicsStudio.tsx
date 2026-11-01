import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Type,
  Sliders,
  Palette,
  Play,
  Download,
  Plus,
  Upload,
  Layers,
  Wand2,
  Copy,
  Check,
  Search,
  RotateCcw,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronRight,
  Bookmark,
  Trash2,
  Activity
} from 'lucide-react';
import {
  MotionTitleDesign,
  MotionTitleTemplate,
  MotionTitleCategory,
  MotionAnimationType,
  CustomFontAsset
} from '../../../../shared/src/videoEditorTypes';
import {
  STARTER_MOTION_TEMPLATES,
  evaluateMotionGraphicAtTime
} from '../../../../shared/src/motionGraphicsEngine';
import { videoEditorApi } from '../../services/videoEditorApi';

interface MotionGraphicsStudioProps {
  onAddMotionClip: (template: MotionTitleTemplate, customText?: string) => void;
  selectedClipTitleDesign?: MotionTitleDesign | null;
  onUpdateSelectedTitleDesign?: (patch: Partial<MotionTitleDesign>) => void;
  onClose?: () => void;
}

const CATEGORIES: Array<{ id: MotionTitleCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Templates' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'news', label: 'News & Broadcast' },
  { id: 'social_media', label: 'Social & Viral' },
  { id: 'minimal', label: 'Minimalist' },
  { id: 'modern', label: 'Modern & Clean' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'dramatic', label: 'Dramatic' }
];

const FONTS = [
  'Montserrat',
  'Inter',
  'Poppins',
  'Cinzel',
  'Playfair Display',
  'Oswald',
  'Arial Black',
  'Courier New'
];

const ANIMATION_TYPES: Array<{ id: MotionAnimationType; label: string; desc: string }> = [
  { id: 'fade', label: 'Fade In / Out', desc: 'Smooth opacity dissolve' },
  { id: 'slide', label: 'Directional Slide', desc: 'Smooth kinetic entrance from edge' },
  { id: 'scale', label: 'Pop / Scale', desc: 'Dynamic scale zoom entrance' },
  { id: 'typewriter', label: 'Typewriter', desc: 'Character-by-character digital typing' },
  { id: 'tracking_reveal', label: 'Tracking Reveal', desc: 'Letter spacing expansion to rest' },
  { id: 'blur_reveal', label: 'Blur to Focus', desc: 'Gaussian blur resolving into sharp focus' },
  { id: 'mask_reveal', label: 'Mask Wipe', desc: 'Edge or center directional clip mask' },
  { id: 'word_by_word', label: 'Word by Word', desc: 'Words appearing sequentially' },
  { id: 'glitch', label: 'Cyber Glitch', desc: 'Chromatic aberration & displacement jitter' },
  { id: 'cinematic_zoom', label: 'Slow Dolly Zoom', desc: 'Continuous slow camera push' },
  { id: 'motion_blur', label: 'Motion Blur', desc: 'High-speed directional entrance streak' }
];

export const MotionGraphicsStudio: React.FC<MotionGraphicsStudioProps> = ({
  onAddMotionClip,
  selectedClipTitleDesign,
  onUpdateSelectedTitleDesign,
  onClose
}) => {
  const [activeCategory, setActiveCategory] = useState<MotionTitleCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<MotionTitleTemplate[]>(STARTER_MOTION_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<MotionTitleTemplate>(STARTER_MOTION_TEMPLATES[0]);
  const [customFonts, setCustomFonts] = useState<CustomFontAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'designer' | 'animation' | 'graph'>('templates');
  const [copiedAnimation, setCopiedAnimation] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewTime, setPreviewTime] = useState(1.2);
  const [isUploadingFont, setIsUploadingFont] = useState(false);

  const fontInputRef = useRef<HTMLInputElement>(null);

  // Active working title design
  const design: MotionTitleDesign = selectedClipTitleDesign || selectedTemplate.design;

  // Load custom fonts and templates from server on mount
  useEffect(() => {
    let isMounted = true;
    videoEditorApi.listFonts().then((fonts) => {
      if (isMounted) setCustomFonts(fonts);
    }).catch(() => {});

    videoEditorApi.listMotionTemplates().then((tpls) => {
      if (isMounted && tpls && tpls.length > 0) setTemplates(tpls);
    }).catch(() => {});

    return () => { isMounted = false; };
  }, []);

  // Update working design helper
  const handleUpdateDesign = (patch: Partial<MotionTitleDesign>) => {
    if (selectedClipTitleDesign && onUpdateSelectedTitleDesign) {
      onUpdateSelectedTitleDesign(patch);
    } else {
      setSelectedTemplate((prev) => ({
        ...prev,
        design: { ...prev.design, ...patch }
      }));
    }
  };

  // Upload custom font
  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFont(true);
    try {
      const font = await videoEditorApi.uploadFont(file);
      setCustomFonts((prev) => [font, ...prev]);
      // Inject font into DOM
      const fontFace = new FontFace(font.fontFamily, `url(${font.url})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      handleUpdateDesign({ fontFamily: font.fontFamily });
    } catch (err) {
      console.error('Font upload failed:', err);
    } finally {
      setIsUploadingFont(false);
      if (fontInputRef.current) fontInputRef.current.value = '';
    }
  };

  // Save current design as a new reusable template
  const handleSaveAsTemplate = async () => {
    try {
      const newTemplate: MotionTitleTemplate = {
        id: `tpl_${Date.now()}`,
        name: design.name || `${design.mainText.slice(0, 18)} Preset`,
        category: design.category || 'modern',
        description: 'Custom user designed motion graphic template',
        design: { ...design },
        duration: 4.5,
        isCustom: true
      };
      const saved = await videoEditorApi.saveMotionTemplate(newTemplate);
      setTemplates((prev) => [saved, ...prev]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const matchQuery =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.design.mainText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // Evaluate preview at current time
  const evaluated = evaluateMotionGraphicAtTime(design, previewTime, selectedTemplate.duration || 4.5, 800, 450);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm overflow-hidden text-xs text-slate-900 dark:text-white transition-colors">
      {/* Hidden custom font uploader input */}
      <input
        ref={fontInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={handleFontUpload}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-studio-border px-4 py-3 bg-slate-50 dark:bg-studio-950">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm font-bold">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Motion Graphics Studio
            </span>
            <span className="ml-2 font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">
              PHASE 3
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-200 dark:bg-studio-800 p-0.5 border border-studio-border text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('designer')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'designer'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Typography
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('animation')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'animation'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Animations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'graph'
                ? 'bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Curves
          </button>
        </div>
      </div>

      {/* Main Interactive Stage & Preview Card */}
      <div className="p-4 border-b border-studio-border bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden h-48 select-none">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(circle, #38BDF8 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Live Evaluated Title Graphic */}
        <div
          className="relative z-10 flex flex-col items-center justify-center transition-all duration-75 max-w-full px-4"
          style={{
            transform: `translate(${evaluated.translateX}px, ${evaluated.translateY}px) scale(${evaluated.scale}) rotate(${evaluated.rotation}deg)`,
            opacity: evaluated.opacity,
            filter: evaluated.blur > 0 ? `blur(${evaluated.blur}px)` : undefined,
            clipPath: evaluated.maskClipPath !== 'none' ? evaluated.maskClipPath : undefined
          }}
        >
          {/* Background Box / Pill / Banner */}
          {evaluated.background.enabled && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: evaluated.background.color || '#000000',
                opacity: evaluated.background.opacity,
                borderRadius: `${evaluated.background.borderRadius || 8}px`,
                backdropFilter: evaluated.background.blurBackdrop ? 'blur(12px)' : undefined
              }}
            />
          )}

          {/* Text Container */}
          <div
            className="relative z-10 flex flex-col"
            style={{
              padding: evaluated.background.enabled
                ? `${design.backgroundBox?.paddingY || 10}px ${design.backgroundBox?.paddingX || 20}px`
                : undefined,
              textAlign: design.textAlign || 'center',
              alignItems: design.textAlign === 'left' ? 'flex-start' : design.textAlign === 'right' ? 'flex-end' : 'center'
            }}
          >
            {/* Tagline / Category Tag */}
            {design.taglineText && (
              <span className="inline-block px-2 py-0.5 mb-1 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded bg-red-600 text-white">
                {design.taglineText}
              </span>
            )}

            {/* Main Title */}
            <div
              style={{
                fontFamily: design.fontFamily,
                fontSize: `${Math.round(design.fontSize * 0.45)}px`,
                fontWeight: design.fontWeight,
                letterSpacing: `${evaluated.letterSpacing * 0.5}px`,
                lineHeight: design.lineHeight || 1.15,
                color: design.textColor || '#FFFFFF',
                textShadow: design.shadow?.enabled ? '0 2px 8px rgba(0,0,0,0.8)' : undefined
              }}
            >
              {evaluated.mainText}
              {evaluated.typewriterCursor && <span className="animate-pulse">|</span>}
            </div>

            {/* Accent Line (Bottom) */}
            {evaluated.accent.enabled && evaluated.accent.position === 'bottom' && (
              <div
                className="my-1 rounded-full"
                style={{
                  width: '50%',
                  height: `${evaluated.accent.width}px`,
                  backgroundColor: evaluated.accent.color,
                  opacity: evaluated.accent.opacity
                }}
              />
            )}

            {/* Subtitle */}
            {evaluated.subtitleText && (
              <div
                className="mt-0.5"
                style={{
                  fontFamily: design.subtitleFontFamily || 'Inter',
                  fontSize: `${Math.round((design.subtitleFontSize || 14) * 0.5)}px`,
                  fontWeight: design.subtitleFontWeight || 600,
                  color: design.subtitleColor || '#D4AF37',
                  letterSpacing: `${(design.subtitleTracking || 3) * 0.5}px`
                }}
              >
                {evaluated.subtitleText}
              </div>
            )}
          </div>
        </div>

        {/* Time Scrubber Slider for Motion Graphic Preview */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center gap-2 z-20">
          <span className="font-mono text-[10px] text-slate-400">{previewTime.toFixed(2)}s</span>
          <input
            type="range"
            min="0"
            max={selectedTemplate.duration || 4.5}
            step="0.05"
            value={previewTime}
            onChange={(e) => setPreviewTime(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="font-mono text-[10px] text-slate-400">{(selectedTemplate.duration || 4.5).toFixed(1)}s</span>
        </div>
      </div>

      {/* Main Tab Viewports */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 max-h-[460px] scrollbar-thin">
        {/* =========================================================
            TAB 1: TEMPLATE BROWSER (22 STARTER TEMPLATES)
            ========================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates (documentary, news, cinematic, lower thirds)..."
                className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white outline-none shadow-xs"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-xs'
                      : 'border border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplate.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setPreviewTime(0.8);
                    }}
                    className={`group relative rounded-xl border p-3 flex flex-col justify-between transition cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-300 dark:hover:border-studio-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs truncate text-slate-900 dark:text-white">
                          {tpl.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-200 dark:bg-studio-800 text-slate-600 dark:text-slate-300">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Mini Preview Spec */}
                    <div className="mt-2 pt-2 border-t border-studio-border/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{tpl.design.fontFamily}</span>
                      <span className="capitalize">{tpl.design.animation?.type?.replace('_', ' ')}</span>
                      <span>{tpl.duration}s</span>
                    </div>

                    {/* Quick Add Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddMotionClip(tpl);
                      }}
                      title="Add to Timeline"
                      className="absolute right-2 bottom-2 h-6 w-6 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow hover:scale-105 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: TYPOGRAPHY & DESIGN CONTROLS
            ========================================================= */}
        {activeTab === 'designer' && (
          <div className="space-y-3.5">
            {/* Text Inputs */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                  Main Title
                </label>
                <input
                  type="text"
                  value={design.mainText}
                  onChange={(e) => handleUpdateDesign({ mainText: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    Subtitle / Role
                  </label>
                  <input
                    type="text"
                    value={design.subtitleText || ''}
                    onChange={(e) => handleUpdateDesign({ subtitleText: e.target.value })}
                    placeholder="Subtitle..."
                    className="w-full mt-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    Tagline / Badge
                  </label>
                  <input
                    type="text"
                    value={design.taglineText || ''}
                    onChange={(e) => handleUpdateDesign({ taglineText: e.target.value })}
                    placeholder="Badge..."
                    className="w-full mt-1 rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Typography & Fonts */}
            <div className="space-y-2 border-t border-studio-border pt-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                  Font Family
                </label>
                <button
                  type="button"
                  onClick={() => fontInputRef.current?.click()}
                  disabled={isUploadingFont}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  <span>{isUploadingFont ? 'Uploading...' : 'Upload Font'}</span>
                </button>
              </div>

              <select
                value={design.fontFamily}
                onChange={(e) => handleUpdateDesign({ fontFamily: e.target.value })}
                className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2 text-xs font-bold outline-none cursor-pointer"
              >
                <optgroup label="Standard Fonts">
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </optgroup>
                {customFonts.length > 0 && (
                  <optgroup label="Custom Uploaded Fonts">
                    {customFonts.map((cf) => (
                      <option key={cf.id} value={cf.fontFamily}>
                        {cf.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Size ({design.fontSize}px)</label>
                  <input
                    type="range"
                    min="18"
                    max="100"
                    value={design.fontSize}
                    onChange={(e) => handleUpdateDesign({ fontSize: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Weight ({design.fontWeight})</label>
                  <select
                    value={design.fontWeight}
                    onChange={(e) => handleUpdateDesign({ fontWeight: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-950 p-1.5 text-[11px] font-bold"
                  >
                    <option value={400}>Regular 400</option>
                    <option value={600}>SemiBold 600</option>
                    <option value={700}>Bold 700</option>
                    <option value={800}>ExtraBold 800</option>
                    <option value={900}>Black 900</option>
                  </select>
                </div>
              </div>

              {/* Letter Spacing & Alignment */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Tracking ({design.letterSpacing || 0}px)</label>
                  <input
                    type="range"
                    min="-2"
                    max="30"
                    value={design.letterSpacing || 0}
                    onChange={(e) => handleUpdateDesign({ letterSpacing: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div className="flex items-end gap-1">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => handleUpdateDesign({ textAlign: align })}
                      className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center cursor-pointer ${
                        design.textAlign === align
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                          : 'border-studio-border text-slate-400'
                      }`}
                    >
                      {align === 'left' ? <AlignLeft className="h-3 w-3" /> : align === 'center' ? <AlignCenter className="h-3 w-3" /> : <AlignRight className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colors, Gradient & Background Box */}
            <div className="space-y-2 border-t border-studio-border pt-2.5">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                Styling & Banners
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Text Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={design.textColor || '#FFFFFF'}
                      onChange={(e) => handleUpdateDesign({ textColor: e.target.value })}
                      className="h-7 w-7 rounded cursor-pointer border border-studio-border"
                    />
                    <span className="font-mono text-[11px]">{design.textColor || '#FFFFFF'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500">Subtitle Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={design.subtitleColor || '#D4AF37'}
                      onChange={(e) => handleUpdateDesign({ subtitleColor: e.target.value })}
                      className="h-7 w-7 rounded cursor-pointer border border-studio-border"
                    />
                    <span className="font-mono text-[11px]">{design.subtitleColor || '#D4AF37'}</span>
                  </div>
                </div>
              </div>

              {/* Background Box Switch */}
              <div className="flex items-center justify-between rounded-xl border border-studio-border p-2 bg-slate-50 dark:bg-studio-950">
                <span className="text-[11px] font-bold">Background Banner / Pill</span>
                <input
                  type="checkbox"
                  checked={design.backgroundBox?.enabled || false}
                  onChange={(e) =>
                    handleUpdateDesign({
                      backgroundBox: {
                        enabled: e.target.checked,
                        color: design.backgroundBox?.color || '#000000',
                        opacity: design.backgroundBox?.opacity ?? 0.85,
                        paddingX: design.backgroundBox?.paddingX || 20,
                        paddingY: design.backgroundBox?.paddingY || 12,
                        borderRadius: design.backgroundBox?.borderRadius || 8
                      }
                    })
                  }
                  className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: ANIMATION ENGINE CONTROLS
            ========================================================= */}
        {activeTab === 'animation' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
              Motion Animation Type
            </span>

            {/* Animation presets grid */}
            <div className="grid grid-cols-2 gap-2">
              {ANIMATION_TYPES.map((anim) => {
                const isCurrent = design.animation?.type === anim.id;
                return (
                  <button
                    key={anim.id}
                    type="button"
                    onClick={() => {
                      handleUpdateDesign({
                        animation: {
                          ...design.animation,
                          type: anim.id
                        }
                      });
                      setPreviewTime(0);
                    }}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      isCurrent
                        ? 'border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                        : 'border-studio-border bg-slate-50 dark:bg-studio-950 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold text-xs">{anim.label}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{anim.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Animation Timings */}
            <div className="space-y-2 border-t border-studio-border pt-2.5">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                Animation Parameters
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">
                    Entrance Duration ({(design.animation?.inDuration || 0.6).toFixed(1)}s)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.5"
                    step="0.05"
                    value={design.animation?.inDuration || 0.6}
                    onChange={(e) =>
                      handleUpdateDesign({
                        animation: { ...design.animation, inDuration: parseFloat(e.target.value) }
                      })
                    }
                    className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">
                    Exit Duration ({(design.animation?.outDuration || 0.4).toFixed(1)}s)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={design.animation?.outDuration || 0.4}
                    onChange={(e) =>
                      handleUpdateDesign({
                        animation: { ...design.animation, outDuration: parseFloat(e.target.value) }
                      })
                    }
                    className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Direction & Easing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Direction</label>
                  <select
                    value={design.animation?.direction || 'up'}
                    onChange={(e) =>
                      handleUpdateDesign({
                        animation: { ...design.animation, direction: e.target.value as any }
                      })
                    }
                    className="w-full rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-950 p-1.5 text-[11px] font-bold"
                  >
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Easing Curve</label>
                  <select
                    value={design.animation?.easing || 'ease_out'}
                    onChange={(e) =>
                      handleUpdateDesign({
                        animation: { ...design.animation, easing: e.target.value as any }
                      })
                    }
                    className="w-full rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-950 p-1.5 text-[11px] font-bold"
                  >
                    <option value="linear">Linear</option>
                    <option value="ease_in">Ease In</option>
                    <option value="ease_out">Ease Out</option>
                    <option value="ease_in_out">Ease In/Out</option>
                    <option value="bezier">Bézier Curve</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: VISUAL KEYFRAME BEZIER GRAPH
            ========================================================= */}
        {activeTab === 'graph' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                Visual Bezier Interpolation Graph
              </span>
              <span className="font-mono text-[10px] text-indigo-500 font-bold">
                {design.animation?.easing?.toUpperCase() || 'EASE_OUT'}
              </span>
            </div>

            {/* Interactive SVG Curve Visualizer */}
            <div className="h-44 w-full rounded-xl border border-studio-border bg-slate-950 p-3 flex flex-col justify-between relative overflow-hidden">
              <svg className="w-full h-32 overflow-visible">
                {/* Grid guidelines */}
                <line x1="0" y1="20" x2="100%" y2="20" stroke="#334155" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="100%" y2="60" stroke="#334155" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="100%" y2="100" stroke="#334155" strokeDasharray="3 3" />

                {/* Animated progress indicator vertical line */}
                <line
                  x1={`${Math.min(100, (previewTime / (selectedTemplate.duration || 4.5)) * 100)}%`}
                  y1="0"
                  x2={`${Math.min(100, (previewTime / (selectedTemplate.duration || 4.5)) * 100)}%`}
                  y2="120"
                  stroke="#818CF8"
                  strokeWidth="2"
                />

                {/* Dynamic Curve */}
                <path
                  d="M 20 100 C 60 100, 100 20, 240 20"
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="3.5"
                />

                {/* Control points */}
                <circle cx="20" cy="100" r="5" fill="#FFFFFF" />
                <circle cx="240" cy="20" r="5" fill="#818CF8" />
              </svg>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>0.0s (Start)</span>
                <span>{(selectedTemplate.duration || 4.5).toFixed(1)}s (End)</span>
              </div>
            </div>

            {/* Quick Curve Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                ['ease_out', 'Ease Out'],
                ['ease_in', 'Ease In'],
                ['ease_in_out', 'Smooth'],
                ['linear', 'Linear']
              ].map(([curve, label]) => (
                <button
                  key={curve}
                  type="button"
                  onClick={() =>
                    handleUpdateDesign({
                      animation: { ...design.animation, easing: curve as any }
                    })
                  }
                  className={`py-1.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                    design.animation?.easing === curve
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                      : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between border-t border-studio-border p-3 bg-slate-50 dark:bg-studio-950">
        <div className="flex items-center gap-2">
          {/* Save as Template */}
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            className="flex items-center gap-1.5 rounded-xl border border-studio-border bg-white dark:bg-studio-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition shadow-xs cursor-pointer"
          >
            {savedSuccess ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Bookmark className="h-3.5 w-3.5" />}
            <span>{savedSuccess ? 'Saved!' : 'Save Preset'}</span>
          </button>
        </div>

        {/* Primary Action: Add to Timeline */}
        <button
          type="button"
          onClick={() => onAddMotionClip(selectedTemplate, design.mainText)}
          className="flex items-center gap-2 rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add to Timeline</span>
        </button>
      </div>
    </div>
  );
};

