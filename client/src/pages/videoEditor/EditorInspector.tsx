import React, { useState, useEffect } from 'react';
import {
  Move,
  Gauge,
  Palette,
  Volume2,
  Sparkles,
  Layers,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Sliders,
  Plus,
  Trash2,
  X,
  Crop,
  Pipette,
  Layout,
  Type,
  ChevronDown,
  ChevronRight,
  Diamond,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Shield,
  Sun,
  Wand2,
  Check
} from 'lucide-react';
import {
  TimelineClip,
  ClipTransform,
  ClipSpeed,
  ColorGrading,
  ClipEffect,
  ClipAudioSettings,
  Keyframe,
  KeyframeProperty,
  MotionTitleDesign
} from '../../../../shared/src/videoEditorTypes';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS,
  COLOR_PRESETS,
  EFFECT_CATALOG
} from '../../../../shared/src/videoEditorDefaults';

interface EditorInspectorProps {
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
  playhead: number;
  onSeparateAudio?: (clipId: string) => void;
  onApplyColorToAllClips?: (grading: ColorGrading) => void;
  onApplyEffectsToAllClips?: (effects: ClipEffect[]) => void;
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({
  selectedClip,
  onUpdateClip,
  playhead,
  onSeparateAudio,
  onApplyColorToAllClips,
  onApplyEffectsToAllClips
}) => {
  const isTitleClip = selectedClip?.type === 'text' || Boolean(selectedClip?.titleDesign);
  const isAudioClip = selectedClip?.type === 'audio';

  // Primary top tab: 'video' | 'text' | 'audio' | 'speed' | 'animation' | 'adjust'
  const [activeTab, setActiveTab] = useState<'video' | 'text' | 'audio' | 'speed' | 'animation' | 'adjust'>(
    isTitleClip ? 'text' : isAudioClip ? 'audio' : 'video'
  );

  // Automatically switch tab when selecting audio or text clips
  useEffect(() => {
    if (!selectedClip) return;
    if (selectedClip.type === 'audio') {
      setActiveTab('audio');
    } else if (selectedClip.type === 'text' || selectedClip.type === 'caption') {
      setActiveTab('text');
    } else if (activeTab === 'audio' || activeTab === 'text') {
      setActiveTab('video');
    }
  }, [selectedClip?.id, selectedClip?.type]);

  // Sub-tabs under Video tab: 'basic' | 'crop'
  const [videoSubTab, setVideoSubTab] = useState<'basic' | 'crop'>('basic');

  // Collapsible accordion states
  const [transformOpen, setTransformOpen] = useState(true);
  const [blendOpen, setBlendOpen] = useState(true);
  const [uniformScale, setUniformScale] = useState(true);

  if (!selectedClip) {
    return (
      <aside className="flex flex-col h-full w-full bg-[#181B20] p-6 text-slate-400 items-center justify-center text-center select-none border-l border-[#262A34]">
        <div className="w-12 h-12 rounded-2xl bg-[#14171C] border border-[#262A34] flex items-center justify-center text-slate-500 mb-3 shadow-xs">
          <Sliders className="h-6 w-6 text-[#13E2CA]" />
        </div>
        <h3 className="font-sans font-bold text-sm text-white">
          No Clip Selected
        </h3>
        <p className="text-xs text-slate-400 max-w-[220px] mt-1 font-mono">
          Select a clip on the multitrack timeline to view and adjust its properties.
        </p>
      </aside>
    );
  }

  const tf: ClipTransform = selectedClip.transform || { ...DEFAULT_TRANSFORM };
  const sp: ClipSpeed = selectedClip.speed || { ...DEFAULT_SPEED };
  const cg: ColorGrading = selectedClip.colorGrading || { ...DEFAULT_COLOR_GRADING };
  const au: ClipAudioSettings = selectedClip.audio || { ...DEFAULT_AUDIO_SETTINGS };

  const updateTransform = (patch: Partial<ClipTransform>) => {
    onUpdateClip(selectedClip.id, { transform: { ...tf, ...patch } });
  };

  const updateSpeed = (patch: Partial<ClipSpeed>) => {
    onUpdateClip(selectedClip.id, { speed: { ...sp, ...patch } });
  };

  const updateColor = (patch: Partial<ColorGrading>) => {
    onUpdateClip(selectedClip.id, { colorGrading: { ...cg, ...patch } });
  };

  const updateAudio = (patch: Partial<ClipAudioSettings>) => {
    onUpdateClip(selectedClip.id, { audio: { ...au, ...patch } });
  };

  // Keyframe helpers
  const localTime = Math.max(0, Math.min(selectedClip.duration, playhead - selectedClip.start));
  const hasKeyframeAtCurrent = (prop: KeyframeProperty): boolean => {
    return (selectedClip.keyframes || []).some(
      (k) => k.property === prop && Math.abs(k.time - localTime) < 0.08
    );
  };

  const toggleKeyframe = (prop: KeyframeProperty, currentValue: number) => {
    const existing = (selectedClip.keyframes || []).filter(
      (k) => !(k.property === prop && Math.abs(k.time - localTime) < 0.08)
    );

    if (hasKeyframeAtCurrent(prop)) {
      // Remove it
      onUpdateClip(selectedClip.id, { keyframes: existing });
    } else {
      // Add it
      const newKeyframe: Keyframe = {
        id: `kf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        property: prop,
        time: Number(localTime.toFixed(3)),
        value: currentValue,
        easing: 'ease_out'
      };
      onUpdateClip(selectedClip.id, { keyframes: [...existing, newKeyframe] });
    }
  };

  // Alignment shortcuts
  const handleAlign = (type: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    switch (type) {
      case 'left':
        updateTransform({ x: -260 });
        break;
      case 'center-h':
        updateTransform({ x: 0 });
        break;
      case 'right':
        updateTransform({ x: 260 });
        break;
      case 'top':
        updateTransform({ y: -360 });
        break;
      case 'center-v':
        updateTransform({ y: 0 });
        break;
      case 'bottom':
        updateTransform({ y: 360 });
        break;
    }
  };

  // Primary Tabs matching CapCut Desktop Inspector
  const primaryTabs: { id: 'video' | 'text' | 'audio' | 'speed' | 'animation' | 'adjust'; label: string; icon: any }[] = isTitleClip
    ? [
        { id: 'text', label: 'Text', icon: Type },
        { id: 'animation', label: 'Animation', icon: Sparkles },
        { id: 'video', label: 'Basic', icon: Move },
        { id: 'adjust', label: 'Adjust', icon: Palette }
      ]
    : isAudioClip
    ? [
        { id: 'audio', label: 'Audio', icon: Volume2 },
        { id: 'speed', label: 'Speed', icon: Gauge }
      ]
    : [
        { id: 'video', label: 'Video', icon: Move },
        { id: 'audio', label: 'Audio', icon: Volume2 },
        { id: 'speed', label: 'Speed', icon: Gauge },
        { id: 'animation', label: 'Animation', icon: Sparkles },
        { id: 'adjust', label: 'Adjust', icon: Palette }
      ];

  return (
    <aside className="flex flex-col h-full w-full bg-[#181B20] select-none text-[#E4E7EC] overflow-hidden">
      {/* 1. Header Bar: Selected Clip Info */}
      <div className="h-10 shrink-0 bg-[#14171C] border-b border-[#262A34] px-3.5 flex items-center justify-between text-xs">
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-semibold text-xs text-white truncate max-w-[150px]">
            {selectedClip.name}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#1A3838] text-[#13E2CA] border border-[#13E2CA]/40 font-mono text-[9px] font-bold uppercase">
            {selectedClip.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-400 font-bold">
            {selectedClip.duration.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* 2. Top Tabs - CapCut Horizontal Tab Strip with Teal Underline */}
      <div className="h-10 shrink-0 border-b border-[#262A34] bg-[#181B20] px-2 flex items-center gap-1 overflow-x-auto vf-scrollbar">
        {primaryTabs.map((t) => {
          const isCurrent = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`relative px-3 py-2 text-xs font-sans font-medium transition cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? 'text-[#13E2CA] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t.label}</span>
              {isCurrent && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#13E2CA] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Sub-tabs (when Video tab active: Basic | Remove BG | Mask | Retouch - CapCut style) */}
      {activeTab === 'video' && !isTitleClip && !isAudioClip && (
        <div className="px-3 pt-2.5 pb-1 shrink-0 bg-[#181B20]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic' },
              { id: 'remove_bg', label: 'Remove BG' },
              { id: 'crop', label: 'Mask' },
              { id: 'retouch', label: 'Retouch' }
            ].map((sub) => {
              const isSelected = (videoSubTab === 'basic' && sub.id === 'basic') || (videoSubTab === 'crop' && sub.id === 'crop');
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setVideoSubTab(sub.id === 'crop' ? 'crop' : 'basic')}
                  className={`px-3 py-1 rounded-full text-xs font-sans transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#282D38] text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#222631]'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Tab Body Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5 vf-scrollbar text-xs text-slate-200">
        {/* ========================================================
            TAB: VIDEO -> BASIC (Transform & Blend)
            ======================================================== */}
        {activeTab === 'video' && videoSubTab === 'basic' && (
          <>
            {/* TRANSFORM SECTION */}
            <div className="rounded-lg bg-[#1E222B] border border-[#262A34] overflow-hidden shadow-xs">
              <div
                onClick={() => setTransformOpen((prev) => !prev)}
                className="h-8 px-3 flex items-center justify-between bg-[#1A1D24] border-b border-[#262A34] cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-sans font-semibold text-xs text-slate-200">
                  {transformOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Transform</span>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => updateTransform({ ...DEFAULT_TRANSFORM })}
                    title="Reset Transform"
                    className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleKeyframe('scale', tf.scale)}
                    title="Keyframe All Transform"
                    className={`p-1 rounded cursor-pointer ${
                      hasKeyframeAtCurrent('scale') ? 'text-[#13E2CA]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('scale') ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {transformOpen && (
                <div className="p-3 space-y-3">
                  {/* Scale */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-sans text-slate-400 font-medium">Scale</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#13E2CA]">
                          {Math.round(tf.scale * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleKeyframe('scale', tf.scale)}
                          title="Keyframe Scale"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('scale') ? 'text-[#13E2CA]' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('scale') ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.05"
                        value={tf.scale}
                        onChange={(e) => updateTransform({ scale: parseFloat(e.target.value) })}
                        className="flex-1 h-1 bg-[#2D3340] rounded appearance-none cursor-pointer accent-[#13E2CA]"
                      />
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={Math.round(tf.scale * 100)}
                        onChange={(e) => updateTransform({ scale: Math.max(0.1, (parseInt(e.target.value) || 100) / 100) })}
                        className="w-14 rounded bg-[#14171C] border border-[#262A34] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none focus:border-[#13E2CA]"
                      />
                    </div>
                  </div>

                  {/* Uniform scale switch */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="font-sans text-slate-400 font-medium">Uniform scale</span>
                    <button
                      type="button"
                      onClick={() => setUniformScale((prev) => !prev)}
                      className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                        uniformScale ? 'bg-[#13E2CA]' : 'bg-[#2D3340]'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-black absolute top-0.5 transition-transform ${
                          uniformScale ? 'left-4.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Position X and Y */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-sans text-slate-400 font-medium">Position</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toggleKeyframe('positionX', tf.x);
                            toggleKeyframe('positionY', tf.y);
                          }}
                          title="Keyframe Position"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('positionX') || hasKeyframeAtCurrent('positionY')
                              ? 'text-[#13E2CA]'
                              : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('positionX') ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center rounded bg-[#14171C] border border-[#262A34] px-2.5 py-1">
                        <span className="text-[10px] font-mono text-slate-500 mr-1.5 font-bold">X</span>
                        <input
                          type="number"
                          value={tf.x}
                          onChange={(e) => updateTransform({ x: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent font-mono text-xs text-right text-white outline-none"
                        />
                      </div>
                      <div className="flex items-center rounded bg-[#14171C] border border-[#262A34] px-2.5 py-1">
                        <span className="text-[10px] font-mono text-slate-500 mr-1.5 font-bold">Y</span>
                        <input
                          type="number"
                          value={tf.y}
                          onChange={(e) => updateTransform({ y: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent font-mono text-xs text-right text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotate */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-sans text-slate-400 font-medium">Rotate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#13E2CA]">{tf.rotation}°</span>
                        <button
                          type="button"
                          onClick={() => toggleKeyframe('rotation', tf.rotation)}
                          title="Keyframe Rotation"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('rotation') ? 'text-[#13E2CA]' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('rotation') ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={tf.rotation}
                        onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-[#2D3340] rounded appearance-none cursor-pointer accent-[#13E2CA]"
                      />
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        value={tf.rotation}
                        onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) || 0 })}
                        className="w-14 rounded bg-[#14171C] border border-[#262A34] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none focus:border-[#13E2CA]"
                      />
                    </div>
                  </div>

                  {/* Alignment Toolbar */}
                  <div className="pt-2 border-t border-[#262A34]">
                    <div className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider mb-1.5">Alignment</div>
                    <div className="grid grid-cols-6 gap-1 bg-[#14171C] p-1 rounded border border-[#262A34]">
                      <button
                        type="button"
                        onClick={() => handleAlign('left')}
                        title="Align Left"
                        className="h-7 rounded hover:bg-[#282D38] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('center-h')}
                        title="Center Horizontally"
                        className="h-7 rounded hover:bg-[#282D38] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
                      >
                        <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('right')}
                        title="Align Right"
                        className="h-7 rounded hover:bg-[#282D38] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('top')}
                        title="Align Top"
                        className="h-7 rounded hover:bg-[#282D38] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
                      >
                        <AlignLeft className="w-3.5 h-3.5 rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('center-v')}
                        title="Center Vertically"
                        className="h-7 rounded hover:bg-[#282D38] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
                      >
                        <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('bottom')}
                        title="Align Bottom"
                        className="h-7 rounded hover:bg-[#282D38] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
                      >
                        <AlignRight className="w-3.5 h-3.5 rotate-90" />
                      </button>
                    </div>
                  </div>

                  {/* Flip */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => updateTransform({ flipH: !tf.flipH })}
                      className={`flex items-center justify-center gap-1.5 h-7 rounded border text-xs font-sans font-medium cursor-pointer transition ${
                        tf.flipH
                          ? 'bg-[#1A3838] text-[#13E2CA] border-[#13E2CA]/50'
                          : 'bg-[#14171C] text-slate-300 border-[#262A34] hover:bg-[#282D38]'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Flip H</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTransform({ flipV: !tf.flipV })}
                      className={`flex items-center justify-center gap-1.5 h-7 rounded border text-xs font-sans font-medium cursor-pointer transition ${
                        tf.flipV
                          ? 'bg-[#1A3838] text-[#13E2CA] border-[#13E2CA]/50'
                          : 'bg-[#14171C] text-slate-300 border-[#262A34] hover:bg-[#282D38]'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span>Flip V</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BLEND SECTION (CapCut exact style: ☑ Blend) */}
            <div className="rounded-lg bg-[#1E222B] border border-[#262A34] overflow-hidden shadow-xs">
              <div
                onClick={() => setBlendOpen((prev) => !prev)}
                className="h-8 px-3 flex items-center justify-between bg-[#1A1D24] border-b border-[#262A34] cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-sans font-semibold text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={blendOpen}
                    onChange={(e) => {
                      e.stopPropagation();
                      setBlendOpen(e.target.checked);
                    }}
                    className="accent-[#13E2CA] w-3.5 h-3.5 rounded"
                  />
                  <span>Blend</span>
                  {blendOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => updateTransform({ opacity: 1.0 })}
                    title="Reset Opacity"
                    className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleKeyframe('opacity', tf.opacity ?? 1.0)}
                    title="Keyframe Opacity"
                    className={`p-1 rounded cursor-pointer ${
                      hasKeyframeAtCurrent('opacity') ? 'text-[#13E2CA]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('opacity') ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {blendOpen && (
                <div className="p-3 space-y-3">
                  {/* Opacity Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-sans text-slate-400 font-medium">Opacity</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#13E2CA]">
                          {Math.round((tf.opacity ?? 1.0) * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleKeyframe('opacity', tf.opacity ?? 1.0)}
                          title="Keyframe Opacity"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('opacity') ? 'text-[#13E2CA]' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('opacity') ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={tf.opacity ?? 1.0}
                        onChange={(e) => updateTransform({ opacity: parseFloat(e.target.value) })}
                        className="flex-1 h-1 bg-[#2D3340] rounded appearance-none cursor-pointer accent-[#13E2CA]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round((tf.opacity ?? 1.0) * 100)}
                        onChange={(e) => updateTransform({ opacity: Math.max(0, Math.min(1, (parseInt(e.target.value) || 0) / 100)) })}
                        className="w-14 rounded bg-[#14171C] border border-[#262A34] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none focus:border-[#13E2CA]"
                      />
                    </div>
                  </div>

                  {/* Fit Mode */}
                  <div className="pt-1">
                    <label className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Fit Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateTransform({ fitMode: 'fit' })}
                        className={`h-7 rounded text-xs font-sans font-medium border cursor-pointer transition ${
                          tf.fitMode !== 'fill'
                            ? 'bg-[#1A3838] text-[#13E2CA] border-[#13E2CA]/50'
                            : 'bg-[#14171C] text-slate-300 border-[#262A34] hover:bg-[#282D38]'
                        }`}
                      >
                        Fit (Contain)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTransform({ fitMode: 'fill' })}
                        className={`h-7 rounded text-xs font-sans font-medium border cursor-pointer transition ${
                          tf.fitMode === 'fill'
                            ? 'bg-[#1A3838] text-[#13E2CA] border-[#13E2CA]/50'
                            : 'bg-[#14171C] text-slate-300 border-[#262A34] hover:bg-[#282D38]'
                        }`}
                      >
                        Fill (Cover)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================
            TAB: VIDEO -> MASK & CROP
            ======================================================== */}
        {activeTab === 'video' && videoSubTab === 'crop' && (
          <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#262A34] pb-2">
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-white">Edge Crop (% Inset)</span>
              <button
                type="button"
                onClick={() => updateTransform({ cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 })}
                className="text-[11px] font-mono text-[#13E2CA] font-bold hover:underline cursor-pointer"
              >
                Reset Crop
              </button>
            </div>
            {/* Crop Top */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-mono text-slate-300 font-bold uppercase">Crop Top</span>
                <span className="font-mono font-bold text-[#13E2CA]">{tf.cropTop || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropTop || 0}
                onChange={(e) => updateTransform({ cropTop: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
              />
            </div>
            {/* Crop Bottom */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-mono text-slate-300 font-bold uppercase">Crop Bottom</span>
                <span className="font-mono font-bold text-[#13E2CA]">{tf.cropBottom || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropBottom || 0}
                onChange={(e) => updateTransform({ cropBottom: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
              />
            </div>
            {/* Crop Left */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-mono text-slate-300 font-bold uppercase">Crop Left</span>
                <span className="font-mono font-bold text-[#13E2CA]">{tf.cropLeft || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropLeft || 0}
                onChange={(e) => updateTransform({ cropLeft: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
              />
            </div>
            {/* Crop Right */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-mono text-slate-300 font-bold uppercase">Crop Right</span>
                <span className="font-mono font-bold text-[#13E2CA]">{tf.cropRight || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropRight || 0}
                onChange={(e) => updateTransform({ cropRight: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: TEXT / MOTION TITLES
            ======================================================== */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            {/* Main Text Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">Main Title Text</label>
              <input
                type="text"
                value={selectedClip.titleDesign?.mainText ?? (selectedClip.text || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  const currentTd: MotionTitleDesign = selectedClip.titleDesign || {
                    mainText: val,
                    fontFamily: 'Montserrat',
                    fontSize: 48,
                    fontWeight: 800,
                    letterSpacing: 2,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    textColor: '#FFFFFF',
                    animation: { type: 'fade', inDuration: 0.6, outDuration: 0.4, delay: 0, easing: 'ease_out' }
                  };
                  onUpdateClip(selectedClip.id, {
                    text: val,
                    titleDesign: { ...currentTd, mainText: val }
                  });
                }}
                className="w-full rounded bg-[#121418] border border-[#262A34] px-3 py-2 text-xs text-white outline-none focus:border-[#13E2CA] shadow-xs"
              />
            </div>

            {/* Subtitle Text */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Subtitle Text</label>
              <input
                type="text"
                value={selectedClip.titleDesign?.subtitleText || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedClip.titleDesign) {
                    onUpdateClip(selectedClip.id, {
                      titleDesign: { ...selectedClip.titleDesign, subtitleText: val }
                    });
                  }
                }}
                placeholder="Optional subtitle..."
                className="w-full rounded bg-[#121418] border border-[#262A34] px-3 py-2 text-xs text-white outline-none focus:border-[#13E2CA] shadow-xs"
              />
            </div>

            {/* Font & Size */}
            {selectedClip.titleDesign && (
              <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-3 shadow-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Font</label>
                    <select
                      value={selectedClip.titleDesign.fontFamily}
                      onChange={(e) => {
                        onUpdateClip(selectedClip.id, {
                          titleDesign: { ...selectedClip.titleDesign!, fontFamily: e.target.value }
                        });
                      }}
                      className="w-full rounded bg-[#121418] border border-[#262A34] p-2 text-xs text-white mt-1 outline-none focus:border-[#13E2CA]"
                    >
                      {['Montserrat', 'Inter', 'Poppins', 'Cinzel', 'Playfair Display', 'Oswald', 'Arial Black', 'Courier New'].map((f) => (
                        <option key={f} value={f} className="bg-[#181B20] text-white">{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      <span>Size</span>
                      <span className="text-[#13E2CA]">{selectedClip.titleDesign.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="100"
                      value={selectedClip.titleDesign.fontSize}
                      onChange={(e) => {
                        onUpdateClip(selectedClip.id, {
                          titleDesign: { ...selectedClip.titleDesign!, fontSize: parseInt(e.target.value) }
                        });
                      }}
                      className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] mt-3 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Color & Letter Spacing */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262A34]">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={selectedClip.titleDesign.textColor || '#FFFFFF'}
                        onChange={(e) => {
                          onUpdateClip(selectedClip.id, {
                            titleDesign: { ...selectedClip.titleDesign!, textColor: e.target.value }
                          });
                        }}
                        className="h-7 w-8 rounded cursor-pointer bg-transparent border border-[#262A34]"
                      />
                      <span className="font-mono text-[10px] text-slate-300 font-bold">{selectedClip.titleDesign.textColor || '#FFFFFF'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      <span>Tracking</span>
                      <span className="text-[#13E2CA]">{selectedClip.titleDesign.letterSpacing || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="30"
                      value={selectedClip.titleDesign.letterSpacing || 0}
                      onChange={(e) => {
                        onUpdateClip(selectedClip.id, {
                          titleDesign: { ...selectedClip.titleDesign!, letterSpacing: parseInt(e.target.value) }
                        });
                      }}
                      className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] mt-3 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB: AUDIO
            ======================================================== */}
        {activeTab === 'audio' && (
          <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-3 shadow-xs">
            {/* Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-300 font-bold uppercase">Volume</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#13E2CA]">
                    {Math.round(au.volume)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleKeyframe('volume', au.volume)}
                    title="Keyframe Volume"
                    className={`p-0.5 rounded cursor-pointer ${
                      hasKeyframeAtCurrent('volume') ? 'text-[#13E2CA]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('volume') ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={au.volume}
                  onChange={(e) => updateAudio({ volume: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-[#262A34] rounded appearance-none cursor-pointer accent-[#13E2CA]"
                />
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={au.volume}
                  onChange={(e) => updateAudio({ volume: parseInt(e.target.value) || 0 })}
                  className="w-14 rounded bg-[#121418] border border-[#262A34] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none focus:border-[#13E2CA]"
                />
              </div>
            </div>

            {/* Fade In & Fade Out */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#262A34]">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <span>Fade In</span>
                  <span className="text-[#13E2CA] font-mono">{(au.fadeInDuration ?? (au as any).fadeIn ?? 0).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={au.fadeInDuration ?? (au as any).fadeIn ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    updateAudio({ fadeInDuration: val, fadeIn: val } as any);
                  }}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <span>Fade Out</span>
                  <span className="text-[#13E2CA] font-mono">{(au.fadeOutDuration ?? (au as any).fadeOut ?? 0).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={au.fadeOutDuration ?? (au as any).fadeOut ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    updateAudio({ fadeOutDuration: val, fadeOut: val } as any);
                  }}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>
            </div>

            {/* Mute audio */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-slate-300 font-bold uppercase text-[11px]">Mute clip audio</span>
              <button
                type="button"
                onClick={() => updateAudio({ muted: !au.muted })}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  au.muted ? 'bg-rose-500' : 'bg-[#262A34]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                    au.muted ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Separate Audio / Extract Audio for Video Clips */}
            {selectedClip.type === 'video' && onSeparateAudio && (
              <div className="pt-2 border-t border-[#262A34]">
                <button
                  type="button"
                  onClick={() => onSeparateAudio(selectedClip.id)}
                  title="Extract audio from this video onto a dedicated audio track"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#182C38] border border-[#13E2CA]/40 text-xs font-mono font-bold text-[#13E2CA] hover:bg-[#13E2CA] hover:text-black transition cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Extract Audio to Track</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB: SPEED
            ======================================================== */}
        {activeTab === 'speed' && (
          <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-3 shadow-xs">
            {/* Speed presets */}
            <div>
              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Speed Factor</span>
                <span className="text-xs text-[#13E2CA]">{sp.speed}x</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[0.5, 1.0, 1.5, 2.0, 4.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateSpeed({ speed: s })}
                    className={`py-1.5 rounded text-xs font-mono font-bold border cursor-pointer transition ${
                      sp.speed === s
                        ? 'bg-[#13E2CA] text-black border-[#13E2CA] shadow-xs'
                        : 'bg-[#181B20] text-slate-300 border-[#262A34] hover:border-[#13E2CA]/50'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0.25"
                max="5.0"
                step="0.05"
                value={sp.speed}
                onChange={(e) => updateSpeed({ speed: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] mt-3 cursor-pointer"
              />
            </div>

            {/* Reverse & Freeze Frame */}
            <div className="space-y-2 pt-2 border-t border-[#262A34]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-300 font-bold uppercase">Reverse Playback</span>
                <button
                  type="button"
                  onClick={() => updateSpeed({ reverse: !sp.reverse })}
                  className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                    sp.reverse ? 'bg-[#13E2CA]' : 'bg-[#262A34]'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      sp.reverse ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="font-mono text-slate-300 font-bold uppercase">Preserve Pitch</span>
                <button
                  type="button"
                  onClick={() => updateSpeed({ preservePitch: sp.preservePitch === false ? true : false })}
                  className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                    sp.preservePitch !== false ? 'bg-[#13E2CA]' : 'bg-[#262A34]'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      sp.preservePitch !== false ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: ANIMATION
            ======================================================== */}
        {activeTab === 'animation' && (
          <div className="space-y-3">
            {selectedClip.titleDesign ? (
              <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-3 shadow-xs">
                <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">Motion Animation Style</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['fade', 'Fade In/Out'],
                    ['slide', 'Directional Slide'],
                    ['scale', 'Pop Scale'],
                    ['typewriter', 'Typewriter'],
                    ['tracking_reveal', 'Tracking Reveal'],
                    ['blur_reveal', 'Blur Reveal'],
                    ['mask_reveal', 'Mask Wipe'],
                    ['word_by_word', 'Word by Word'],
                    ['glitch', 'Cyber Glitch'],
                    ['cinematic_zoom', 'Cinematic Zoom']
                  ].map(([animId, animLabel]) => {
                    const isSelected = (selectedClip.titleDesign?.animation?.type || 'fade') === animId;
                    return (
                      <button
                        key={animId}
                        type="button"
                        onClick={() => {
                          onUpdateClip(selectedClip.id, {
                            titleDesign: {
                              ...selectedClip.titleDesign!,
                              animation: { ...selectedClip.titleDesign!.animation, type: animId as any }
                            }
                          });
                        }}
                        className={`p-2.5 rounded text-left text-xs font-mono font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#13E2CA]/15 text-[#13E2CA] border-[#13E2CA] shadow-xs'
                            : 'bg-[#181B20] text-slate-300 border-[#262A34] hover:border-[#13E2CA]/50'
                        }`}
                      >
                        {animLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-3 shadow-xs">
                <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">Clip Transitions</label>
                <p className="text-[11px] text-slate-400 font-mono">
                  Apply entrance and exit motion animations to this clip:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['fade', 'Crossfade'],
                    ['slide_left', 'Slide Left'],
                    ['slide_right', 'Slide Right'],
                    ['zoom_in', 'Zoom In'],
                    ['blur', 'Blur Dissolve'],
                    ['flash', 'Flash White']
                  ].map(([tId, tLabel]) => (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => {
                        onUpdateClip(selectedClip.id, {
                          transitionIn: {
                            type: tId as any,
                            duration: 0.5,
                            easing: 'ease_out'
                          }
                        });
                      }}
                      className="p-2.5 rounded bg-[#181B20] border border-[#262A34] text-left text-xs font-mono font-bold text-slate-300 hover:border-[#13E2CA] cursor-pointer transition shadow-xs"
                    >
                      {tLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB: ADJUST (Color Grading & Applied Effects)
            ======================================================== */}
        {activeTab === 'adjust' && (
          <div className="rounded-lg bg-[#14171C] border border-[#262A34] p-3 space-y-4 shadow-xs">
            {/* Quick Color Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">Color Grading Presets</span>
                <button
                  type="button"
                  onClick={() => updateColor({ ...DEFAULT_COLOR_GRADING })}
                  className="text-[10px] font-mono font-bold text-[#13E2CA] hover:underline cursor-pointer"
                >
                  Reset Color
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => updateColor(p.settings)}
                    className="p-2 rounded bg-[#181B20] border border-[#262A34] text-[10px] text-center font-mono font-bold text-slate-300 hover:border-[#13E2CA] cursor-pointer truncate transition shadow-xs"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Color Sliders */}
            <div className="space-y-3 pt-2 border-t border-[#262A34]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Basic Adjustments
                </span>
                {onApplyColorToAllClips && (
                  <button
                    type="button"
                    onClick={() => onApplyColorToAllClips(cg)}
                    title="Apply these color grading settings to all video and image clips"
                    className="text-[10px] font-mono font-bold text-[#13E2CA] hover:underline cursor-pointer"
                  >
                    Apply to All Clips
                  </button>
                )}
              </div>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Brightness</span>
                  <span className="font-mono font-bold text-[#13E2CA]">{cg.brightness || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.brightness || 0}
                  onChange={(e) => updateColor({ brightness: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Contrast</span>
                  <span className="font-mono font-bold text-[#13E2CA]">{cg.contrast || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.contrast || 0}
                  onChange={(e) => updateColor({ contrast: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Saturation</span>
                  <span className="font-mono font-bold text-[#13E2CA]">{cg.saturation || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.saturation || 0}
                  onChange={(e) => updateColor({ saturation: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Temperature (Warm/Cool)</span>
                  <span className={`font-mono font-bold ${(cg.temperature || 0) > 0 ? 'text-amber-400' : (cg.temperature || 0) < 0 ? 'text-cyan-400' : 'text-[#13E2CA]'}`}>
                    {cg.temperature || 0}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.temperature || 0}
                  onChange={(e) => updateColor({ temperature: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>

              {/* Exposure */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Exposure</span>
                  <span className="font-mono font-bold text-[#13E2CA]">{cg.exposure || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.exposure || 0}
                  onChange={(e) => updateColor({ exposure: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>

              {/* Hue */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Hue</span>
                  <span className="font-mono font-bold text-[#13E2CA]">{cg.hue || 0}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={cg.hue || 0}
                  onChange={(e) => updateColor({ hue: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>

              {/* Gamma */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase">Gamma</span>
                  <span className="font-mono font-bold text-[#13E2CA]">{(cg.gamma || 1).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={Math.round((cg.gamma || 1) * 100)}
                  onChange={(e) => updateColor({ gamma: parseInt(e.target.value) / 100 })}
                  className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                />
              </div>
            </div>

            {/* Active Effects & Filters Section */}
            <div className="space-y-3 pt-3 border-t border-[#262A34]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#13E2CA]" />
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Clip Effects & Filters ({(selectedClip.effects || []).length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onApplyEffectsToAllClips && (selectedClip.effects || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => onApplyEffectsToAllClips(selectedClip.effects || [])}
                      title="Apply these effects to all video and image clips"
                      className="text-[10px] font-mono font-bold text-[#13E2CA] hover:underline cursor-pointer"
                    >
                      Apply to All Clips
                    </button>
                  )}
                  {(selectedClip.effects || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => onUpdateClip(selectedClip.id, { effects: [] })}
                      className="text-[10px] font-mono text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* List Applied Effects */}
              <div className="space-y-2">
                {(selectedClip.effects || []).map((eff) => {
                  const meta = EFFECT_CATALOG.find((c) => c.id === eff.type) || {
                    name: eff.type,
                    category: 'effect'
                  };
                  return (
                    <div
                      key={eff.id}
                      className="p-2.5 rounded bg-[#181B20] border border-[#262A34] space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={eff.enabled !== false}
                            onChange={(e) => {
                              const nextEffects = (selectedClip.effects || []).map((item) =>
                                item.id === eff.id ? { ...item, enabled: e.target.checked } : item
                              );
                              onUpdateClip(selectedClip.id, { effects: nextEffects });
                            }}
                            className="rounded bg-[#262A34] border-[#3B4252] text-[#13E2CA] accent-[#13E2CA] cursor-pointer"
                          />
                          <span className={`text-xs font-bold ${eff.enabled !== false ? 'text-white' : 'text-slate-500 line-through'}`}>
                            {meta.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextEffects = (selectedClip.effects || []).filter((item) => item.id !== eff.id);
                            onUpdateClip(selectedClip.id, { effects: nextEffects });
                          }}
                          className="text-slate-400 hover:text-rose-400 p-0.5 transition cursor-pointer"
                          title="Remove effect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Intensity slider */}
                      <div className="space-y-1 pl-5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-mono text-slate-400">Intensity</span>
                          <span className="font-mono font-bold text-[#13E2CA]">
                            {typeof eff.intensity === 'number' ? Math.round(eff.intensity) : 50}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={typeof eff.intensity === 'number' ? Math.round(eff.intensity) : 50}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const nextEffects = (selectedClip.effects || []).map((item) =>
                              item.id === eff.id ? { ...item, intensity: val } : item
                            );
                            onUpdateClip(selectedClip.id, { effects: nextEffects });
                          }}
                          className="w-full h-1 bg-[#262A34] rounded accent-[#13E2CA] cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Effect Dropdown / Grid */}
              <div className="pt-1">
                <span className="text-[10px] font-mono text-slate-400 block mb-1.5">Add Effect:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {EFFECT_CATALOG.filter(
                    (cat) => !(selectedClip.effects || []).some((e) => e.type === cat.id)
                  ).slice(0, 6).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const nextEffects = [
                          ...(selectedClip.effects || []),
                          {
                            id: `eff-${Date.now()}-${cat.id}`,
                            type: cat.id,
                            intensity: cat.defaultIntensity || 50,
                            enabled: true
                          }
                        ];
                        onUpdateClip(selectedClip.id, { effects: nextEffects });
                      }}
                      className="px-2 py-1.5 rounded bg-[#181B20] border border-[#262A34] text-[10px] text-slate-300 hover:border-[#13E2CA] hover:text-[#13E2CA] transition text-left truncate flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{cat.name}</span>
                      <Plus className="w-3 h-3 text-[#13E2CA] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
