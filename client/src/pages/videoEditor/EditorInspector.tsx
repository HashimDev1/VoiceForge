import React, { useState } from 'react';
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
  COLOR_PRESETS
} from '../../../../shared/src/videoEditorDefaults';

interface EditorInspectorProps {
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
  playhead: number;
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({
  selectedClip,
  onUpdateClip,
  playhead
}) => {
  const isTitleClip = selectedClip?.type === 'text' || Boolean(selectedClip?.titleDesign);
  const isAudioClip = selectedClip?.type === 'audio';

  // Primary top tab: 'video' | 'text' | 'audio' | 'speed' | 'animation' | 'adjust'
  const [activeTab, setActiveTab] = useState<'video' | 'text' | 'audio' | 'speed' | 'animation' | 'adjust'>(
    isTitleClip ? 'text' : isAudioClip ? 'audio' : 'video'
  );

  // Sub-tabs under Video tab: 'basic' | 'crop'
  const [videoSubTab, setVideoSubTab] = useState<'basic' | 'crop'>('basic');

  // Collapsible accordion states
  const [transformOpen, setTransformOpen] = useState(true);
  const [blendOpen, setBlendOpen] = useState(true);
  const [uniformScale, setUniformScale] = useState(true);

  if (!selectedClip) {
    return (
      <aside className="flex flex-col h-full w-full bg-[#15191F] border border-[#242A33] p-4 text-[#A4AFBD] items-center justify-center text-center select-none">
        <Sliders className="h-8 w-8 text-[#747F90] mb-2 opacity-50" />
        <h3 className="font-semibold text-xs text-[#F0F3F7]">
          No Clip Selected
        </h3>
        <p className="text-[11px] text-[#747F90] max-w-[220px] mt-1">
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

  // Primary Tabs
  const primaryTabs: { id: 'video' | 'text' | 'audio' | 'speed' | 'animation' | 'adjust'; label: string }[] = isTitleClip
    ? [
        { id: 'text', label: 'Text' },
        { id: 'animation', label: 'Animation' },
        { id: 'video', label: 'Transform' },
        { id: 'adjust', label: 'Adjust' }
      ]
    : isAudioClip
    ? [
        { id: 'audio', label: 'Audio' },
        { id: 'speed', label: 'Speed' }
      ]
    : [
        { id: 'video', label: 'Video' },
        { id: 'audio', label: 'Audio' },
        { id: 'speed', label: 'Speed' },
        { id: 'animation', label: 'Animation' },
        { id: 'adjust', label: 'Adjust' }
      ];

  return (
    <aside className="flex flex-col h-full w-full bg-[#15191F] border border-[#242A33] overflow-hidden select-none text-[#F0F3F7]">
      {/* 1. Header Bar: Selected Clip Info */}
      <div className="h-9 shrink-0 bg-[#15191F] border-b border-[#242A33] px-3 flex items-center justify-between text-xs">
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-semibold text-xs text-[#F0F3F7] truncate max-w-[150px]">
            {selectedClip.name}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#242A33] text-[9px] font-mono font-medium text-[#A4AFBD] border border-[#303740] uppercase">
            {selectedClip.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[#747F90]">
            {selectedClip.duration.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* 2. Top Tabs (CapCut Desktop style: Video | Audio | Speed | Animation | Adjust) */}
      <div className="h-9 shrink-0 bg-[#1B2028] border-b border-[#242A33] px-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {primaryTabs.map((t) => {
          const isCurrent = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isCurrent
                  ? 'bg-[#242A33] text-[#40D5CB] shadow-xs'
                  : 'text-[#A4AFBD] hover:text-[#F0F3F7] hover:bg-[#242A33]/50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 3. Sub-tabs (when Video tab active: Basic | Crop) */}
      {activeTab === 'video' && !isTitleClip && (
        <div className="h-8 shrink-0 bg-[#15191F] border-b border-[#242A33] px-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVideoSubTab('basic')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              videoSubTab === 'basic' ? 'bg-[#242A33] text-white border border-[#303740]' : 'text-[#747F90] hover:text-white'
            }`}
          >
            Basic
          </button>
          <button
            type="button"
            onClick={() => setVideoSubTab('crop')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              videoSubTab === 'crop' ? 'bg-[#242A33] text-white border border-[#303740]' : 'text-[#747F90] hover:text-white'
            }`}
          >
            Mask & Crop
          </button>
        </div>
      )}

      {/* 4. Tab Body Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5 scrollbar-thin text-xs text-[#F0F3F7]">
        {/* ========================================================
            TAB: VIDEO -> BASIC (Transform & Blend)
            ======================================================== */}
        {activeTab === 'video' && videoSubTab === 'basic' && (
          <>
            {/* TRANSFORM SECTION */}
            <div className="rounded-lg bg-[#1B2028] border border-[#242A33] overflow-hidden">
              <div
                onClick={() => setTransformOpen((prev) => !prev)}
                className="h-8 px-2.5 flex items-center justify-between bg-[#1F252E] border-b border-[#242A33] cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#F0F3F7]">
                  {transformOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#747F90]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#747F90]" />}
                  <span>Transform</span>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => updateTransform({ ...DEFAULT_TRANSFORM })}
                    title="Reset Transform"
                    className="p-1 rounded text-[#747F90] hover:text-white hover:bg-[#242A33] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {transformOpen && (
                <div className="p-3 space-y-3">
                  {/* Scale */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#A4AFBD]">Scale</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#40D5CB]">
                          {Math.round(tf.scale * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleKeyframe('scale', tf.scale)}
                          title="Keyframe Scale"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('scale') ? 'text-[#40D5CB]' : 'text-[#747F90] hover:text-white'
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
                        className="flex-1 h-1 bg-[#242A33] rounded appearance-none cursor-pointer accent-[#40D5CB]"
                      />
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={Math.round(tf.scale * 100)}
                        onChange={(e) => updateTransform({ scale: Math.max(0.1, (parseInt(e.target.value) || 100) / 100) })}
                        className="w-14 rounded bg-[#15191F] border border-[#303740] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Uniform scale switch */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#A4AFBD]">Uniform scale</span>
                    <button
                      type="button"
                      onClick={() => setUniformScale((prev) => !prev)}
                      className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                        uniformScale ? 'bg-[#40D5CB]' : 'bg-[#303740]'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                          uniformScale ? 'left-4.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Position X and Y */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#A4AFBD]">Position</span>
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
                              ? 'text-[#40D5CB]'
                              : 'text-[#747F90] hover:text-white'
                          }`}
                        >
                          <Diamond className={`w-3 h-3 ${hasKeyframeAtCurrent('positionX') ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center rounded bg-[#15191F] border border-[#303740] px-2 py-1">
                        <span className="text-[10px] font-mono text-[#747F90] mr-1">X</span>
                        <input
                          type="number"
                          value={tf.x}
                          onChange={(e) => updateTransform({ x: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent font-mono text-xs text-right text-white outline-none"
                        />
                      </div>
                      <div className="flex items-center rounded bg-[#15191F] border border-[#303740] px-2 py-1">
                        <span className="text-[10px] font-mono text-[#747F90] mr-1">Y</span>
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
                      <span className="text-[#A4AFBD]">Rotate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#40D5CB]">{tf.rotation}°</span>
                        <button
                          type="button"
                          onClick={() => toggleKeyframe('rotation', tf.rotation)}
                          title="Keyframe Rotation"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('rotation') ? 'text-[#40D5CB]' : 'text-[#747F90] hover:text-white'
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
                        className="flex-1 h-1 bg-[#242A33] rounded appearance-none cursor-pointer accent-[#40D5CB]"
                      />
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        value={tf.rotation}
                        onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) || 0 })}
                        className="w-14 rounded bg-[#15191F] border border-[#303740] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Alignment Toolbar (CapCut Desktop style: 6 alignment buttons) */}
                  <div className="pt-2 border-t border-[#242A33]">
                    <div className="text-[10px] text-[#747F90] uppercase tracking-wider mb-1.5">Alignment</div>
                    <div className="grid grid-cols-6 gap-1 bg-[#15191F] p-1 rounded border border-[#303740]">
                      <button
                        type="button"
                        onClick={() => handleAlign('left')}
                        title="Align Left"
                        className="h-7 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('center-h')}
                        title="Center Horizontally"
                        className="h-7 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('right')}
                        title="Align Right"
                        className="h-7 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('top')}
                        title="Align Top"
                        className="h-7 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <AlignLeft className="w-3.5 h-3.5 rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('center-v')}
                        title="Center Vertically"
                        className="h-7 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('bottom')}
                        title="Align Bottom"
                        className="h-7 rounded hover:bg-[#242A33] text-[#A4AFBD] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <AlignRight className="w-3.5 h-3.5 rotate-90" />
                      </button>
                    </div>
                  </div>

                  {/* Flip & Fit */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => updateTransform({ flipH: !tf.flipH })}
                      className={`flex items-center justify-center gap-1.5 h-8 rounded border text-xs font-medium cursor-pointer transition-colors ${
                        tf.flipH
                          ? 'bg-[#40D5CB]/20 text-[#40D5CB] border-[#40D5CB]/50'
                          : 'bg-[#15191F] text-[#A4AFBD] border-[#303740] hover:text-white'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Flip H</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTransform({ flipV: !tf.flipV })}
                      className={`flex items-center justify-center gap-1.5 h-8 rounded border text-xs font-medium cursor-pointer transition-colors ${
                        tf.flipV
                          ? 'bg-[#40D5CB]/20 text-[#40D5CB] border-[#40D5CB]/50'
                          : 'bg-[#15191F] text-[#A4AFBD] border-[#303740] hover:text-white'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span>Flip V</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BLEND SECTION */}
            <div className="rounded-lg bg-[#1B2028] border border-[#242A33] overflow-hidden">
              <div
                onClick={() => setBlendOpen((prev) => !prev)}
                className="h-8 px-2.5 flex items-center justify-between bg-[#1F252E] border-b border-[#242A33] cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#F0F3F7]">
                  {blendOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#747F90]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#747F90]" />}
                  <span>Blend</span>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => updateTransform({ opacity: 1.0 })}
                    title="Reset Opacity"
                    className="p-1 rounded text-[#747F90] hover:text-white hover:bg-[#242A33] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {blendOpen && (
                <div className="p-3 space-y-3">
                  {/* Opacity Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#A4AFBD]">Opacity</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#40D5CB]">
                          {Math.round((tf.opacity ?? 1.0) * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleKeyframe('opacity', tf.opacity ?? 1.0)}
                          title="Keyframe Opacity"
                          className={`p-0.5 rounded cursor-pointer ${
                            hasKeyframeAtCurrent('opacity') ? 'text-[#40D5CB]' : 'text-[#747F90] hover:text-white'
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
                        className="flex-1 h-1 bg-[#242A33] rounded appearance-none cursor-pointer accent-[#40D5CB]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round((tf.opacity ?? 1.0) * 100)}
                        onChange={(e) => updateTransform({ opacity: Math.max(0, Math.min(1, (parseInt(e.target.value) || 0) / 100)) })}
                        className="w-14 rounded bg-[#15191F] border border-[#303740] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Fit Mode */}
                  <div className="pt-1">
                    <label className="text-[10px] text-[#747F90] uppercase tracking-wider block mb-1">Fit Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateTransform({ fitMode: 'fit' })}
                        className={`h-7 rounded text-xs font-medium border cursor-pointer ${
                          tf.fitMode !== 'fill'
                            ? 'bg-[#242A33] text-[#40D5CB] border-[#40D5CB]/40'
                            : 'bg-[#15191F] text-[#747F90] border-[#303740] hover:text-white'
                        }`}
                      >
                        Fit (Contain)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTransform({ fitMode: 'fill' })}
                        className={`h-7 rounded text-xs font-medium border cursor-pointer ${
                          tf.fitMode === 'fill'
                            ? 'bg-[#242A33] text-[#40D5CB] border-[#40D5CB]/40'
                            : 'bg-[#15191F] text-[#747F90] border-[#303740] hover:text-white'
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
          <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-[#242A33] pb-2">
              <span className="font-semibold text-xs text-white">Edge Crop (% Inset)</span>
              <button
                type="button"
                onClick={() => updateTransform({ cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 })}
                className="text-[11px] text-[#40D5CB] hover:underline cursor-pointer"
              >
                Reset Crop
              </button>
            </div>
            {/* Crop Top */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A4AFBD]">Crop Top</span>
                <span className="font-mono text-[#40D5CB]">{tf.cropTop || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropTop || 0}
                onChange={(e) => updateTransform({ cropTop: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
              />
            </div>
            {/* Crop Bottom */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A4AFBD]">Crop Bottom</span>
                <span className="font-mono text-[#40D5CB]">{tf.cropBottom || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropBottom || 0}
                onChange={(e) => updateTransform({ cropBottom: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
              />
            </div>
            {/* Crop Left */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A4AFBD]">Crop Left</span>
                <span className="font-mono text-[#40D5CB]">{tf.cropLeft || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropLeft || 0}
                onChange={(e) => updateTransform({ cropLeft: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
              />
            </div>
            {/* Crop Right */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A4AFBD]">Crop Right</span>
                <span className="font-mono text-[#40D5CB]">{tf.cropRight || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={tf.cropRight || 0}
                onChange={(e) => updateTransform({ cropRight: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
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
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#F0F3F7]">Main Title Text</label>
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
                className="w-full rounded bg-[#1B2028] border border-[#303740] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#40D5CB]"
              />
            </div>

            {/* Subtitle Text */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#A4AFBD]">Subtitle Text</label>
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
                className="w-full rounded bg-[#1B2028] border border-[#303740] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#40D5CB]"
              />
            </div>

            {/* Font & Size */}
            {selectedClip.titleDesign && (
              <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#747F90]">Font</label>
                    <select
                      value={selectedClip.titleDesign.fontFamily}
                      onChange={(e) => {
                        onUpdateClip(selectedClip.id, {
                          titleDesign: { ...selectedClip.titleDesign!, fontFamily: e.target.value }
                        });
                      }}
                      className="w-full rounded bg-[#15191F] border border-[#303740] p-1.5 text-[11px] text-white mt-1"
                    >
                      {['Montserrat', 'Inter', 'Poppins', 'Cinzel', 'Playfair Display', 'Oswald', 'Arial Black', 'Courier New'].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[#747F90]">
                      <span>Size</span>
                      <span className="text-[#40D5CB]">{selectedClip.titleDesign.fontSize}px</span>
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
                      className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB] mt-2.5"
                    />
                  </div>
                </div>

                {/* Color & Letter Spacing */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#242A33]">
                  <div>
                    <label className="text-[10px] text-[#747F90]">Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={selectedClip.titleDesign.textColor || '#FFFFFF'}
                        onChange={(e) => {
                          onUpdateClip(selectedClip.id, {
                            titleDesign: { ...selectedClip.titleDesign!, textColor: e.target.value }
                          });
                        }}
                        className="h-6 w-7 rounded cursor-pointer bg-transparent border border-[#303740]"
                      />
                      <span className="font-mono text-[10px] text-[#A4AFBD]">{selectedClip.titleDesign.textColor || '#FFFFFF'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[#747F90]">
                      <span>Tracking</span>
                      <span className="text-[#40D5CB]">{selectedClip.titleDesign.letterSpacing || 0}px</span>
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
                      className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB] mt-2.5"
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
          <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3.5">
            {/* Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A4AFBD]">Volume</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#40D5CB]">
                    {Math.round(au.volume)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleKeyframe('volume', au.volume)}
                    title="Keyframe Volume"
                    className={`p-0.5 rounded cursor-pointer ${
                      hasKeyframeAtCurrent('volume') ? 'text-[#40D5CB]' : 'text-[#747F90] hover:text-white'
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
                  className="flex-1 h-1 bg-[#242A33] rounded appearance-none cursor-pointer accent-[#40D5CB]"
                />
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={au.volume}
                  onChange={(e) => updateAudio({ volume: parseInt(e.target.value) || 0 })}
                  className="w-14 rounded bg-[#15191F] border border-[#303740] px-1.5 py-0.5 font-mono text-center text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Fade In & Fade Out */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#242A33]">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#747F90]">
                  <span>Fade In</span>
                  <span className="text-[#40D5CB] font-mono">{(au.fadeIn || 0).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={au.fadeIn || 0}
                  onChange={(e) => updateAudio({ fadeIn: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#747F90]">
                  <span>Fade Out</span>
                  <span className="text-[#40D5CB] font-mono">{(au.fadeOut || 0).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={au.fadeOut || 0}
                  onChange={(e) => updateAudio({ fadeOut: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
                />
              </div>
            </div>

            {/* Mute audio */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#A4AFBD]">Mute clip audio</span>
              <button
                type="button"
                onClick={() => updateAudio({ muted: !au.muted })}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  au.muted ? 'bg-[#F06B77]' : 'bg-[#303740]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                    au.muted ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: SPEED
            ======================================================== */}
        {activeTab === 'speed' && (
          <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3.5">
            {/* Speed presets */}
            <div>
              <div className="flex justify-between text-[11px] text-[#A4AFBD] mb-1.5">
                <span>Speed Factor</span>
                <span className="font-mono text-xs text-[#40D5CB]">{sp.speed}x</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[0.5, 1.0, 1.5, 2.0, 4.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateSpeed({ speed: s })}
                    className={`py-1 rounded text-xs font-mono font-medium border cursor-pointer ${
                      sp.speed === s
                        ? 'bg-[#242A33] text-[#40D5CB] border-[#40D5CB]/40'
                        : 'bg-[#15191F] text-[#747F90] border-[#303740] hover:text-white'
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
                className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB] mt-3"
              />
            </div>

            {/* Reverse & Freeze Frame */}
            <div className="space-y-2 pt-2 border-t border-[#242A33]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A4AFBD]">Reverse Playback</span>
                <button
                  type="button"
                  onClick={() => updateSpeed({ reverse: !sp.reverse })}
                  className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                    sp.reverse ? 'bg-[#40D5CB]' : 'bg-[#303740]'
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
                <span className="text-[#A4AFBD]">Preserve Pitch</span>
                <button
                  type="button"
                  onClick={() => updateSpeed({ preservePitch: sp.preservePitch === false ? true : false })}
                  className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                    sp.preservePitch !== false ? 'bg-[#40D5CB]' : 'bg-[#303740]'
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
              <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3">
                <label className="text-[11px] font-semibold text-white block">Motion Animation Style</label>
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
                        className={`p-2 rounded text-left text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#242A33] text-[#40D5CB] border-[#40D5CB]/50'
                            : 'bg-[#15191F] text-[#A4AFBD] border-[#303740] hover:text-white'
                        }`}
                      >
                        {animLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3">
                <label className="text-[11px] font-semibold text-white block">Clip Transitions</label>
                <p className="text-[11px] text-[#747F90]">
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
                      className="p-2 rounded bg-[#15191F] border border-[#303740] text-left text-xs font-medium text-[#A4AFBD] hover:text-white hover:border-[#40D5CB]/40 cursor-pointer"
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
            TAB: ADJUST (Color Grading)
            ======================================================== */}
        {activeTab === 'adjust' && (
          <div className="rounded-lg bg-[#1B2028] border border-[#242A33] p-3 space-y-3.5">
            {/* Quick Color Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-white">Color Grading Presets</span>
                <button
                  type="button"
                  onClick={() => updateColor({ ...DEFAULT_COLOR_GRADING })}
                  className="text-[10px] text-[#40D5CB] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => updateColor(p.settings)}
                    className="p-1.5 rounded bg-[#15191F] border border-[#303740] text-[10px] text-center font-medium text-[#A4AFBD] hover:text-white hover:border-[#40D5CB]/40 cursor-pointer truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Sliders */}
            <div className="space-y-2.5 pt-2 border-t border-[#242A33]">
              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#A4AFBD]">Brightness</span>
                  <span className="font-mono text-[#40D5CB]">{cg.brightness || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.brightness || 0}
                  onChange={(e) => updateColor({ brightness: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#A4AFBD]">Contrast</span>
                  <span className="font-mono text-[#40D5CB]">{cg.contrast || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.contrast || 0}
                  onChange={(e) => updateColor({ contrast: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#A4AFBD]">Saturation</span>
                  <span className="font-mono text-[#40D5CB]">{cg.saturation || 0}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={cg.saturation || 0}
                  onChange={(e) => updateColor({ saturation: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
                />
              </div>

              {/* Hue */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#A4AFBD]">Hue</span>
                  <span className="font-mono text-[#40D5CB]">{cg.hue || 0}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={cg.hue || 0}
                  onChange={(e) => updateColor({ hue: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#242A33] rounded accent-[#40D5CB]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
