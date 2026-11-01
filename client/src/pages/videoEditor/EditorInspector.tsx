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
  X
} from 'lucide-react';
import {
  TimelineClip,
  ClipTransform,
  ClipSpeed,
  ColorGrading,
  ClipAudioSettings,
  Keyframe
} from '../../../../shared/src/videoEditorTypes';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS,
  TRANSITION_CATALOG
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
  const [activeTab, setActiveTab] = useState<'transform' | 'speed' | 'color' | 'audio' | 'effects' | 'keyframes'>('transform');

  if (!selectedClip) {
    return (
      <aside className="glass-panel flex flex-col h-full rounded-2xl border border-studio-border bg-white dark:bg-studio-900 p-4 text-slate-900 dark:text-white shadow-sm items-center justify-center text-center">
        <Sliders className="h-8 w-8 text-slate-400 mb-2" />
        <h3 className="font-serif font-extrabold text-sm text-slate-700 dark:text-slate-300">
          No Clip Selected
        </h3>
        <p className="text-[11px] text-slate-400 max-w-xs mt-1">
          Click on any video, audio, or text clip on the multitrack timeline to inspect and customize its properties.
        </p>
      </aside>
    );
  }

  const tf = selectedClip.transform || { ...DEFAULT_TRANSFORM };
  const sp = selectedClip.speed || { ...DEFAULT_SPEED };
  const cg = selectedClip.colorGrading || { ...DEFAULT_COLOR_GRADING };
  const au = selectedClip.audio || { ...DEFAULT_AUDIO_SETTINGS };

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

  return (
    <aside className="glass-panel flex flex-col h-full rounded-2xl border border-studio-border bg-white dark:bg-studio-900 p-4 text-slate-900 dark:text-white shadow-sm transition-colors">
      {/* Clip Header Title */}
      <div className="mb-3 border-b border-studio-border pb-2.5 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
            SELECTED CLIP ({selectedClip.type.toUpperCase()})
          </span>
          <h2 className="text-sm font-bold truncate text-slate-900 dark:text-white">
            {selectedClip.name}
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 dark:bg-studio-800 border border-studio-border px-2 py-0.5 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300">
          {selectedClip.duration.toFixed(2)}s
        </span>
      </div>

      {/* Inspector Tab Bar */}
      <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-studio-800 border border-studio-border mb-3">
        {[
          ['transform', 'Transform', Move],
          ['speed', 'Speed', Gauge],
          ['color', 'Color', Palette],
          ['audio', 'Audio', Volume2],
          ['effects', 'FX', Sparkles],
          ['keyframes', 'Keys', Layers]
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
              <Icon className="h-3 w-3" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 max-h-[580px] scrollbar-thin text-xs">
        {/* ==========================================
            TAB 1: TRANSFORM CONTROLS
            ========================================== */}
        {activeTab === 'transform' && (
          <div className="space-y-3">
            {/* Scale Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Scale</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {Math.round(tf.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={tf.scale}
                onChange={(e) => updateTransform({ scale: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Rotation Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Rotation</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{tf.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={tf.rotation}
                onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Position X and Y Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="font-semibold text-[10px] text-slate-500 uppercase">Position X</span>
                <input
                  type="number"
                  value={tf.x}
                  onChange={(e) => updateTransform({ x: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-[10px] text-slate-500 uppercase">Position Y</span>
                <input
                  type="number"
                  value={tf.y}
                  onChange={(e) => updateTransform({ y: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white outline-none"
                />
              </label>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Opacity</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {Math.round((tf.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={tf.opacity ?? 1}
                onChange={(e) => updateTransform({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Flip Horizontal / Vertical */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => updateTransform({ flipH: !tf.flipH })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border font-bold text-xs cursor-pointer ${
                  tf.flipH
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
                <span>Flip Horizontal</span>
              </button>

              <button
                type="button"
                onClick={() => updateTransform({ flipV: !tf.flipV })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border font-bold text-xs cursor-pointer ${
                  tf.flipV
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FlipVertical className="h-3.5 w-3.5" />
                <span>Flip Vertical</span>
              </button>
            </div>

            {/* Reset Transform */}
            <button
              type="button"
              onClick={() => updateTransform(DEFAULT_TRANSFORM)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Transform</span>
            </button>
          </div>
        )}

        {/* ==========================================
            TAB 2: SPEED CONTROLS
            ========================================== */}
        {activeTab === 'speed' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Playback Speed</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{sp.speed.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="4.0"
                step="0.05"
                value={sp.speed}
                onChange={(e) => updateSpeed({ speed: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Quick Speed Pills */}
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => updateSpeed({ speed: spd })}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                    sp.speed === spd
                      ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold'
                      : 'border-studio-border bg-slate-50 dark:bg-studio-950 text-slate-600'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>

            {/* Reverse & Pitch Toggles */}
            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 cursor-pointer">
              <span className="font-semibold text-xs">Reverse Playback</span>
              <input
                type="checkbox"
                checked={sp.reverse}
                onChange={(e) => updateSpeed({ reverse: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 cursor-pointer">
              <span className="font-semibold text-xs">Preserve Audio Pitch</span>
              <input
                type="checkbox"
                checked={sp.preservePitch}
                onChange={(e) => updateSpeed({ preservePitch: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>
          </div>
        )}

        {/* ==========================================
            TAB 3: COLOR GRADING
            ========================================== */}
        {activeTab === 'color' && (
          <div className="space-y-3">
            {[
              ['Exposure', 'exposure', -100, 100],
              ['Contrast', 'contrast', -100, 100],
              ['Brightness', 'brightness', -100, 100],
              ['Saturation', 'saturation', -100, 100],
              ['Temperature', 'temperature', -100, 100],
              ['Tint', 'tint', -100, 100]
            ].map(([label, prop, min, max]: any) => (
              <div key={prop} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {(cg as any)[prop] || 0}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={(cg as any)[prop] || 0}
                  onChange={(e) => updateColor({ [prop]: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => updateColor(DEFAULT_COLOR_GRADING)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Color Grading</span>
            </button>
          </div>
        )}

        {/* ==========================================
            TAB 4: AUDIO SETTINGS
            ========================================== */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            {/* Volume */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Volume Level</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{au.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={au.volume}
                onChange={(e) => updateAudio({ volume: parseInt(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Fade In / Out */}
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="font-semibold text-[10px] text-slate-500 uppercase">Fade In (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={au.fadeInDuration || 0}
                  onChange={(e) => updateAudio({ fadeInDuration: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-[10px] text-slate-500 uppercase">Fade Out (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={au.fadeOutDuration || 0}
                  onChange={(e) => updateAudio({ fadeOutDuration: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white outline-none"
                />
              </label>
            </div>

            {/* Mute and Ducking */}
            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 cursor-pointer">
              <span className="font-semibold text-xs">Mute Audio</span>
              <input
                type="checkbox"
                checked={au.muted}
                onChange={(e) => updateAudio({ muted: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5 cursor-pointer">
              <div>
                <div className="font-semibold text-xs">Audio Ducking</div>
                <div className="text-[10px] text-slate-400">Lower background music during dialogue</div>
              </div>
              <input
                type="checkbox"
                checked={au.ducking}
                onChange={(e) => updateAudio({ ducking: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>
          </div>
        )}

        {/* ==========================================
            TAB 5: EFFECTS & TRANSITIONS
            ========================================== */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            {/* Active Transition */}
            <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">Transition In</span>
                {selectedClip.transitionIn && (
                  <button
                    type="button"
                    onClick={() => onUpdateClip(selectedClip.id, { transitionIn: undefined })}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <select
                value={selectedClip.transitionIn?.type || 'none'}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, {
                    transitionIn: {
                      type: e.target.value as any,
                      duration: selectedClip.transitionIn?.duration || 0.5
                    }
                  })
                }
                className="w-full rounded-lg border border-studio-border bg-white dark:bg-studio-900 p-2 text-xs font-bold outline-none"
              >
                {TRANSITION_CATALOG.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Effects Stack */}
            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Applied Effects Stack ({selectedClip.effects?.length || 0})
              </span>
              {selectedClip.effects?.map((eff) => (
                <div
                  key={eff.id}
                  className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs capitalize">{eff.type.replace('_', ' ')}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateClip(selectedClip.id, {
                          effects: selectedClip.effects.filter((e) => e.id !== eff.id)
                        })
                      }
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Intensity</span>
                    <span className="font-mono text-xs font-bold text-indigo-600">{eff.intensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={eff.intensity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onUpdateClip(selectedClip.id, {
                        effects: selectedClip.effects.map((e) => (e.id === eff.id ? { ...e, intensity: val } : e))
                      });
                    }}
                    className="w-full accent-indigo-600"
                  />
                </div>
              ))}
              {(!selectedClip.effects || selectedClip.effects.length === 0) && (
                <div className="text-center p-3 text-slate-400 text-xs italic">
                  No effects applied yet. Choose effects in the left sidebar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 6: KEYFRAME ANIMATION
            ========================================== */}
        {activeTab === 'keyframes' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-3 space-y-2">
              <span className="font-bold text-xs">Add Keyframe at Playhead</span>
              <p className="text-[10px] text-slate-400">
                Interpolates transform and opacity parameters between timestamps.
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {['scale', 'opacity', 'rotation', 'positionX'].map((prop) => (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => {
                      const offset = Math.max(0, playhead - selectedClip.start);
                      const newKf: Keyframe = {
                        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                        time: Number(offset.toFixed(2)),
                        property: prop as any,
                        value: (tf as any)[prop] || 1,
                        easing: 'ease_in_out'
                      };
                      onUpdateClip(selectedClip.id, {
                        keyframes: [...(selectedClip.keyframes || []), newKf]
                      });
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-studio-border bg-white dark:bg-studio-900 py-1.5 text-xs font-bold capitalize hover:bg-slate-100 dark:hover:bg-studio-800"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{prop}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List of active keyframes */}
            <div className="space-y-1.5">
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Keyframes ({selectedClip.keyframes?.length || 0})
              </span>
              {selectedClip.keyframes?.map((kf) => (
                <div
                  key={kf.id}
                  className="flex items-center justify-between rounded-xl border border-studio-border bg-slate-50 dark:bg-studio-950 p-2.5"
                >
                  <div>
                    <span className="font-bold text-xs capitalize">{kf.property}</span>
                    <span className="ml-2 font-mono text-[10px] text-indigo-600 font-bold">
                      at {kf.time}s ({kf.value})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateClip(selectedClip.id, {
                        keyframes: selectedClip.keyframes.filter((k) => k.id !== kf.id)
                      })
                    }
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

