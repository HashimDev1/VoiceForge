import React, { useState } from 'react';
import { Project, Voice, ChunkSettings, ScriptPresetType } from '../../../shared/src/types';
import { SCRIPT_PRESETS, analyzeScript } from '../../../shared/src/textAnalysis';
import { DirectionTagHelper } from '../components/DirectionTagHelper';
import { ScriptAnalyzer } from '../components/ScriptAnalyzer';
import { VoiceSelector } from '../components/VoiceSelector';
import { ChunkList } from '../components/ChunkList';
import { ExportModal } from '../components/ExportModal';
import { 
  Sparkles, 
  Copy, 
  RotateCcw, 
  RotateCw, 
  Sliders, 
  Zap, 
  FileText, 
  Download,
  Check,
  Plus,
  Layers,
  Gauge,
  Volume2
} from 'lucide-react';

interface ScriptStudioProps {
  project: Project;
  voices: Voice[];
  onUpdateScript: (script: string) => void;
  onUpdateChunkSettings: (settings: ChunkSettings) => void;
  onUpdateWpm: (wpm: number) => void;
  onUpdateSpeechSpeed?: (speed: number) => void;
  onUpdateAudioFormat?: (format: 'mp3' | 'wav' | 'pcm' | 'opus') => void;
  onToggleMultiTake?: (enabled: boolean) => void;
  onSelectTake?: (chunkId: string, takeId: string) => void;
  onGenerateNewTake?: (chunkId: string) => void;
  onSelectVoice: (voice: Voice) => void;
  onSaveCustomVoice?: (voice: Voice) => void;
  onDeleteCustomVoice?: (voiceId: string) => void;
  onUpdatePause: (pauseSec: number) => void;
  onUpdateChunkText: (chunkId: string, text: string) => void;
  onReorderChunks: (startIndex: number, endIndex: number) => void;
  onAddNewChunk?: () => void;
  onDeleteChunk?: (chunkId: string) => void;
  onRegenerateChunk: (chunkId: string) => void;
  onGenerateAll: (retryOnlyFailed?: boolean) => void;
  isGenerating: boolean;
  currentAudioUrl: string | null;
  isPlaying: boolean;
  onAudioPlay: (url: string) => void;
  onAudioPause: () => void;
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  project,
  voices,
  onUpdateScript,
  onUpdateChunkSettings,
  onUpdateWpm,
  onUpdateSpeechSpeed,
  onUpdateAudioFormat,
  onToggleMultiTake,
  onSelectTake,
  onGenerateNewTake,
  onSelectVoice,
  onSaveCustomVoice,
  onDeleteCustomVoice,
  onUpdatePause,
  onUpdateChunkText,
  onReorderChunks,
  onAddNewChunk,
  onDeleteChunk,
  onRegenerateChunk,
  onGenerateAll,
  isGenerating,
  currentAudioUrl,
  isPlaying,
  onAudioPlay,
  onAudioPause
}) => {
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Script undo/redo history state
  const [history, setHistory] = useState<string[]>([project.script]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const handleScriptChange = (newText: string) => {
    onUpdateScript(newText);

    // Push to undo stack
    const newHist = history.slice(0, historyIdx + 1);
    newHist.push(newText);
    if (newHist.length > 30) newHist.shift();
    setHistory(newHist);
    setHistoryIdx(newHist.length - 1);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      onUpdateScript(prev);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      onUpdateScript(next);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(project.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    if (text) handleScriptChange(project.script ? project.script + '\n' + text : text);
  };

  const handleClear = () => {
    if (confirm('Clear the entire script?')) {
      handleScriptChange('');
    }
  };

  const handleInsertTag = (tag: string) => {
    handleScriptChange(project.script ? `${project.script} ${tag} ` : `${tag} `);
  };

  const handleApplyPreset = (presetType: ScriptPresetType) => {
    const found = SCRIPT_PRESETS.find((p) => p.id === presetType);
    if (found) {
      onUpdateWpm(found.recommendedWpm);
      const catVoice = voices.find((v) => v.category === found.recommendedCategory);
      if (catVoice) onSelectVoice(catVoice);
      onUpdateChunkSettings({
        ...project.chunkSettings,
        preset: found.defaultChunkPreset,
        autoChunk: true,
        maxCharacters:
          found.defaultChunkPreset === 'Small'
            ? 150
            : found.defaultChunkPreset === 'Large'
            ? 600
            : 300
      });
    }
  };

  const analysis = analyzeScript(project.script, project.chunkSettings, project.wpm, project.speechSpeed || 1.0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-5 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
              Script Studio<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-300 border border-studio-border uppercase tracking-wider">
              Fish Audio TTS
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest pl-11">
            YOUTUBE SCRIPT PROCESSING & VOICE SYNTHESIS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={project.chunks.filter((c) => c.status === 'success').length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition ${
              project.chunks.filter((c) => c.status === 'success').length > 0
                ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 cursor-pointer'
                : 'bg-slate-100 dark:bg-studio-850 text-slate-400 border border-studio-border cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export MP3</span>
          </button>
        </div>
      </div>

      {/* Script Presets Bar */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
          GENRE PRESETS
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SCRIPT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              className="px-3 py-1.5 bg-white dark:bg-studio-900 text-slate-900 dark:text-slate-100 hover:border-black rounded-xl text-xs font-mono font-bold border border-studio-border whitespace-nowrap transition flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-black dark:text-white" />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout (Editor + Settings Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Editor & Toolbar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Editor Card */}
          <div className="glass-panel rounded-2xl border border-studio-border p-4 space-y-3 shadow-sm bg-white dark:bg-studio-900">
            {/* Editor Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-studio-border pb-3 text-xs">
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <button
                  onClick={handlePaste}
                  className="px-3 py-1 bg-slate-100 dark:bg-studio-850 text-slate-900 dark:text-slate-100 rounded-lg font-bold border border-studio-border hover:border-black transition"
                >
                  Paste
                </button>

                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-slate-100 dark:bg-studio-850 text-slate-900 dark:text-slate-100 rounded-lg font-bold border border-studio-border hover:border-black transition flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleClear}
                  className="px-3 py-1 bg-slate-100 dark:bg-studio-850 text-slate-900 dark:text-slate-100 hover:text-rose-600 rounded-lg font-bold border border-studio-border transition"
                >
                  Clear
                </button>

                <div className="h-4 w-px bg-studio-border mx-1" />

                <button
                  onClick={handleUndo}
                  disabled={historyIdx === 0}
                  className="p-1.5 text-slate-600 hover:text-black dark:text-slate-400 dark:hover:text-white disabled:opacity-30 transition"
                  title="Undo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleRedo}
                  disabled={historyIdx === history.length - 1}
                  className="p-1.5 text-slate-600 hover:text-black dark:text-slate-400 dark:hover:text-white disabled:opacity-30 transition"
                  title="Redo"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Analyzer Toggle */}
              <button
                onClick={() => setShowAnalyzer(!showAnalyzer)}
                className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border transition ${
                  showAnalyzer
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm'
                    : 'bg-slate-100 dark:bg-studio-850 text-slate-900 dark:text-slate-100 border-studio-border hover:border-black'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{showAnalyzer ? 'Hide Analysis' : 'Analyze Script'}</span>
              </button>
            </div>

            {/* Direction Tag Quick Helper Bar */}
            <DirectionTagHelper onInsertTag={handleInsertTag} />

            {/* Main Script Textarea */}
            <textarea
              value={project.script}
              onChange={(e) => handleScriptChange(e.target.value)}
              placeholder="Paste your complete YouTube script here... (e.g. On the night of October 14th, everything changed. Nobody knew what was happening...)"
              className="w-full bg-white text-slate-900 placeholder-slate-400 border border-studio-border rounded-xl p-4 text-sm font-sans focus:outline-none focus:border-black min-h-[360px] leading-relaxed resize-y shadow-inner"
            />

            {/* Bottom Editor Status Counter Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-studio-border/60">
              <div className="flex items-center gap-4">
                <span>
                  Words: <strong className="text-slate-900 dark:text-white">{analysis.wordCount.toLocaleString()}</strong>
                </span>
                <span>
                  Characters: <strong className="text-slate-900 dark:text-white">{analysis.characterCount.toLocaleString()}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">Est. Voiceover Duration:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                  {analysis.estimatedDurationFormatted}
                </span>
                <span className="text-[10px] text-slate-500">(Estimate @ {project.wpm} WPM)</span>
              </div>
            </div>
          </div>

          {/* Script Analyzer Panel */}
          {showAnalyzer && (
            <ScriptAnalyzer
              analysis={analysis}
              wpm={project.wpm}
              onWpmChange={onUpdateWpm}
            />
          )}

          {/* Chunks Queue & Controls */}
          <ChunkList
            chunks={project.chunks}
            isGenerating={isGenerating}
            onGenerateAll={() => onGenerateAll(false)}
            onRetryFailed={() => onGenerateAll(true)}
            onRegenerateChunk={onRegenerateChunk}
            onSelectTake={onSelectTake}
            onGenerateNewTake={onGenerateNewTake}
            onUpdateChunkText={onUpdateChunkText}
            onReorderChunks={onReorderChunks}
            onAddNewChunk={onAddNewChunk}
            onDeleteChunk={onDeleteChunk}
            currentAudioUrl={currentAudioUrl}
            isPlaying={isPlaying}
            onAudioPlay={onAudioPlay}
            onAudioPause={onAudioPause}
          />
        </div>

        {/* Right 1 Col: Voice Selector & Chunking Configuration */}
        <div className="space-y-6">
          {/* Multi-Take (2 Versions) Card */}
          <div className="glass-panel rounded-2xl p-5 border border-studio-border space-y-3 shadow-sm bg-white dark:bg-studio-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">
                  Multi-Take Mode (2 Versions)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onToggleMultiTake?.(!project.multiTakeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  project.multiTakeEnabled ? 'bg-black dark:bg-white' : 'bg-slate-300 dark:bg-studio-800'
                }`}
                title={project.multiTakeEnabled ? 'Multi-take is active (generates 2 versions so you can pick the best)' : 'Single take mode'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    project.multiTakeEnabled
                      ? 'translate-x-6 bg-white dark:bg-black'
                      : 'translate-x-1 bg-white dark:bg-slate-400'
                  }`}
                />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              {project.multiTakeEnabled ? (
                <div className="space-y-1">
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>2 Versions Per Generation Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generates 2 takes (Take 1 & Take 2) with natural variations in inflection. You can audition both and choose the best version for your final master.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Generates 1 take per clip to minimize generation time. You can still create extra takes individually using the "+ Take" button.
                </p>
              )}
            </div>
          </div>

          {/* Speech Speed & Format Settings Card */}
          <div className="glass-panel rounded-2xl p-5 border border-studio-border space-y-4 shadow-sm bg-white dark:bg-studio-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-500" />
                <span>Speech Speed & Format</span>
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {(project.speechSpeed || 1.0).toFixed(2)}x
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Pacing Presets
              </label>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { speed: 0.75, label: 'Slow', emoji: '🐢' },
                  { speed: 1.0, label: 'Normal', emoji: '👤' },
                  { speed: 1.25, label: 'Fast', emoji: '⚡' },
                  { speed: 1.5, label: 'Rapid', emoji: '🚀' }
                ].map(({ speed, label, emoji }) => (
                  <button
                    key={speed}
                    onClick={() => onUpdateSpeechSpeed?.(speed)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold border transition flex flex-col items-center justify-center gap-0.5 ${
                      Math.abs((project.speechSpeed || 1.0) - speed) < 0.01
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm'
                        : 'bg-white dark:bg-studio-850 text-slate-700 dark:text-slate-300 hover:border-black border-studio-border'
                    }`}
                  >
                    <span className="text-xs">{emoji}</span>
                    <span>{speed}x</span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                  <span>Custom Speed:</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {(project.speechSpeed || 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={project.speechSpeed || 1.0}
                  onChange={(e) => onUpdateSpeechSpeed?.(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                />
              </div>

              <div className="pt-2 border-t border-studio-border/60">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Audio Format
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['mp3', 'wav', 'pcm', 'opus'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => onUpdateAudioFormat?.(fmt)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold uppercase border transition text-center ${
                        (project.audioFormat || 'mp3') === fmt
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm'
                          : 'bg-white dark:bg-studio-850 text-slate-700 dark:text-slate-300 hover:border-black border-studio-border'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chunk Settings Configuration Card */}
          <div className="glass-panel rounded-2xl p-5 border border-studio-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-black dark:text-white" />
                <span>Chunking Settings</span>
              </h3>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Chunk Mode
              </label>

              {/* Presets Grid including Single Chunk Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    onUpdateChunkSettings({
                      ...project.chunkSettings,
                      preset: 'Single Chunk',
                      autoChunk: false,
                      maxCharacters: 100000
                    })
                  }
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition flex items-center justify-center gap-1.5 ${
                    project.chunkSettings.preset === 'Single Chunk'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm'
                      : 'bg-white dark:bg-studio-850 text-slate-800 dark:text-slate-200 hover:border-black border-studio-border'
                  }`}
                  title="Do not split script — generate full script as a single continuous clip"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Single Chunk (No Split)</span>
                </button>

                {(['Small', 'Medium', 'Large'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() =>
                      onUpdateChunkSettings({
                        ...project.chunkSettings,
                        preset,
                        autoChunk: true,
                        maxCharacters: preset === 'Small' ? 150 : preset === 'Large' ? 600 : 300
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition ${
                      project.chunkSettings.preset === preset
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm'
                        : 'bg-white dark:bg-studio-850 text-slate-700 dark:text-slate-300 hover:border-black border-studio-border'
                    }`}
                  >
                    Auto {preset}
                  </button>
                ))}
              </div>

              {project.chunkSettings.preset !== 'Single Chunk' && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                    <span>Max Chars Per Clip:</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {project.chunkSettings.maxCharacters} chars
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={project.chunkSettings.maxCharacters}
                    onChange={(e) =>
                      onUpdateChunkSettings({
                        ...project.chunkSettings,
                        preset: 'Custom',
                        autoChunk: true,
                        maxCharacters: parseInt(e.target.value, 10)
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Voice Selector Section */}
          <VoiceSelector
            voices={voices}
            selectedVoice={project.selectedVoice}
            onSelectVoice={onSelectVoice}
            onAudioPlay={onAudioPlay}
            onSaveCustomVoice={onSaveCustomVoice}
            onDeleteCustomVoice={onDeleteCustomVoice}
            compact={true}
          />
        </div>
      </div>

      {/* Export Final Voiceover Modal */}
      <ExportModal
        project={project}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onAudioPlay={onAudioPlay}
        onAudioPause={onAudioPause}
        isPlaying={isPlaying}
        currentAudioUrl={currentAudioUrl}
        onSetPause={onUpdatePause}
      />
    </div>
  );
};
