import React, { useState } from 'react';
import { ScriptChunk } from '../../../shared/src/types';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  GripVertical, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Check, 
  X,
  Download,
  Plus
} from 'lucide-react';
import { formatDuration } from '../../../shared/src/textAnalysis';

interface ChunkItemProps {
  chunk: ScriptChunk;
  isPlaying: boolean;
  currentAudioUrl?: string | null;
  onPlay: (url: string) => void;
  onPause: () => void;
  onRegenerate: (chunkId: string) => void;
  onSelectTake?: (chunkId: string, takeId: string) => void;
  onGenerateNewTake?: (chunkId: string) => void;
  onUpdateText: (chunkId: string, text: string) => void;
  onDeleteChunk?: (chunkId: string) => void;
  dragHandleProps?: any;
}

export const ChunkItem: React.FC<ChunkItemProps> = ({
  chunk,
  isPlaying,
  currentAudioUrl,
  onPlay,
  onPause,
  onRegenerate,
  onSelectTake,
  onGenerateNewTake,
  onUpdateText,
  onDeleteChunk,
  dragHandleProps
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(chunk.text);

  const handleSaveText = () => {
    if (editText.trim() && editText !== chunk.text) {
      onUpdateText(chunk.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(chunk.text);
    setIsEditing(false);
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        chunk.status === 'success'
          ? 'bg-white border-studio-border hover:border-black shadow-sm'
          : chunk.status === 'generating'
          ? 'bg-slate-50 border-black ring-1 ring-black/20'
          : chunk.status === 'error'
          ? 'bg-rose-50 border-rose-400'
          : 'bg-white border-studio-border'
      }`}
    >
      {/* Top Line Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            {...dragHandleProps}
            className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-1"
            title="Drag to reorder chunk"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="font-mono font-bold text-xs text-indigo-400 bg-studio-850 px-2 py-0.5 rounded border border-studio-border">
            Chunk {chunk.index < 10 ? `0${chunk.index}` : chunk.index}
          </span>

          <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[150px]">
            {chunk.chapterTitle}
          </span>

          <span className="text-[10px] text-slate-500 font-mono">
            ({chunk.characterCount} chars • {formatDuration(chunk.estimatedDurationSec)}
            {chunk.speechSpeed ? ` • ${chunk.speechSpeed.toFixed(2)}x` : ''})
          </span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          {chunk.status === 'success' && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Generated</span>
            </span>
          )}

          {chunk.status === 'generating' && (
            <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
              <span>Generating...</span>
            </span>
          )}

          {chunk.status === 'error' && (
            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Failed</span>
            </span>
          )}

          {chunk.status === 'idle' && (
            <span className="text-[11px] font-medium text-slate-400 bg-studio-850 px-2 py-0.5 rounded-full border border-studio-border">
              Waiting
            </span>
          )}
        </div>
      </div>

      {/* Main Text Content / Inline Editor */}
      {isEditing ? (
        <div className="space-y-2 my-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-studio-850 border border-indigo-500 rounded-xl p-3 text-xs text-white focus:outline-none min-h-[70px] resize-y"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-studio-800 hover:bg-studio-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSaveText}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Update</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-900 font-sans font-medium leading-relaxed my-2">
          {chunk.text}
        </p>
      )}

      {/* Multi-Take / Versions Pill Selector */}
      {chunk.takes && chunk.takes.length > 0 && (
        <div className="flex items-center gap-2 my-3 py-2 px-3 bg-slate-50 dark:bg-studio-850 rounded-xl border border-studio-border flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Takes:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (choose best version)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {chunk.takes.map((take, idx) => {
              const isActive = chunk.activeTakeId ? chunk.activeTakeId === take.id : (idx === 0 || chunk.audioUrl === take.audioUrl);
              const isTakePlaying = isPlaying && currentAudioUrl === take.audioUrl;

              return (
                <div
                  key={take.id}
                  onClick={() => onSelectTake && onSelectTake(chunk.id, take.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm font-bold'
                      : 'bg-white dark:bg-studio-800 text-slate-700 dark:text-slate-300 border-studio-border hover:border-black dark:hover:border-white font-medium'
                  }`}
                  title={`Click to select ${take.label} as active take for export`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTakePlaying) {
                        onPause();
                      } else {
                        if (!isActive && onSelectTake) {
                          onSelectTake(chunk.id, take.id);
                        }
                        onPlay(take.audioUrl);
                      }
                    }}
                    className={`p-1 rounded-full transition ${
                      isActive
                        ? 'hover:bg-white/20'
                        : 'hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title={isTakePlaying ? 'Pause this take' : 'Play & listen to this take'}
                  >
                    {isTakePlaying ? (
                      <Pause className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                  </button>

                  <span>{take.label}</span>

                  {isActive && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-emerald-500 text-white rounded">
                      Best
                    </span>
                  )}
                </div>
              );
            })}

            {onGenerateNewTake && (
              <button
                type="button"
                onClick={() => onGenerateNewTake(chunk.id)}
                disabled={chunk.status === 'generating'}
                className="px-2.5 py-1 bg-white dark:bg-studio-800 hover:bg-slate-100 dark:hover:bg-studio-700 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white rounded-lg text-xs font-mono font-medium flex items-center gap-1 border border-dashed border-studio-border hover:border-black dark:hover:border-white transition disabled:opacity-50"
                title="Generate another variation for this clip"
              >
                <Plus className="w-3 h-3" />
                <span>+ Take {(chunk.takes?.length || 1) + 1}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error detail */}
      {chunk.error && (
        <p className="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-500/20 my-2">
          {chunk.error}
        </p>
      )}

      {/* Chunk Controls & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-studio-border/50">
        <div className="flex items-center gap-2">
          {chunk.audioUrl && (
            <button
              onClick={() => (isPlaying ? onPause() : onPlay(chunk.audioUrl!))}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/30 transition"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
            </button>
          )}

          <button
            onClick={() => onRegenerate(chunk.id)}
            disabled={chunk.status === 'generating'}
            className="px-3 py-1.5 bg-studio-850 hover:bg-studio-800 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-studio-border transition"
            title="Regenerate this specific clip"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${chunk.status === 'generating' ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 bg-studio-850 hover:bg-studio-800 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-studio-border transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Text</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onDeleteChunk && (
            <button
              onClick={() => onDeleteChunk(chunk.id)}
              className="p-1.5 text-slate-500 hover:text-rose-400 transition"
              title="Delete this chunk"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {chunk.audioUrl && (
            <a
              href={chunk.audioUrl}
              download={`${chunk.index < 10 ? '0' : ''}${chunk.index}_clip.mp3`}
              className="p-1.5 text-slate-400 hover:text-white transition"
              title="Download individual MP3"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
