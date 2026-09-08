import React from 'react';
import { ScriptChunk } from '../../../shared/src/types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ChunkItem } from './ChunkItem';
import { Play, Sparkles, RefreshCw, AlertCircle, Layers, Plus } from 'lucide-react';

interface ChunkListProps {
  chunks: ScriptChunk[];
  isGenerating: boolean;
  onGenerateAll: () => void;
  onRetryFailed: () => void;
  onRegenerateChunk: (chunkId: string) => void;
  onSelectTake?: (chunkId: string, takeId: string) => void;
  onGenerateNewTake?: (chunkId: string) => void;
  onUpdateChunkText: (chunkId: string, text: string) => void;
  onReorderChunks: (startIndex: number, endIndex: number) => void;
  onAddNewChunk?: () => void;
  onDeleteChunk?: (chunkId: string) => void;
  currentAudioUrl: string | null;
  isPlaying: boolean;
  onAudioPlay: (url: string) => void;
  onAudioPause: () => void;
}

export const ChunkList: React.FC<ChunkListProps> = ({
  chunks,
  isGenerating,
  onGenerateAll,
  onRetryFailed,
  onRegenerateChunk,
  onSelectTake,
  onGenerateNewTake,
  onUpdateChunkText,
  onReorderChunks,
  onAddNewChunk,
  onDeleteChunk,
  currentAudioUrl,
  isPlaying,
  onAudioPlay,
  onAudioPause
}) => {
  const totalCount = chunks.length;
  const completedCount = chunks.filter((c) => c.status === 'success').length;
  const failedCount = chunks.filter((c) => c.status === 'error').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorderChunks(result.source.index, result.destination.index);
  };

  return (
    <div className="space-y-4">
      {/* Top Batch Progress & Controls Card */}
      <div className="glass-panel border border-studio-border rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-black dark:text-white" />
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Voiceover Generation Queue</h3>
            </div>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">
              {completedCount} / {totalCount} CLIPS READY ({progressPercent}%)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onAddNewChunk && (
              <button
                onClick={onAddNewChunk}
                className="px-3 py-2 bg-slate-100 dark:bg-studio-850 hover:border-black text-slate-900 dark:text-slate-100 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border border-studio-border transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Chunk</span>
              </button>
            )}

            {failedCount > 0 && (
              <button
                onClick={onRetryFailed}
                disabled={isGenerating}
                className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry {failedCount} Failed</span>
              </button>
            )}

            <button
              onClick={onGenerateAll}
              disabled={isGenerating || totalCount === 0}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition ${
                isGenerating || totalCount === 0
                  ? 'bg-slate-200 dark:bg-studio-800 text-slate-400 border border-studio-border cursor-not-allowed'
                  : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-95'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Processing...' : 'Generate All Clips'}</span>
            </button>
          </div>
        </div>

        {/* Queue Progress Bar */}
        {totalCount > 0 && (
          <div className="w-full bg-studio-850 h-3 rounded-full overflow-hidden p-0.5 border border-studio-border">
            <div
              className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="bg-studio-900 border border-studio-border rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-studio-850 border border-studio-border text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">No Speech Clips in Queue</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Paste your script above to auto-split, select "Single Chunk" mode, or click "+ Add Chunk" to manually create custom narration clips.
          </p>
          {onAddNewChunk && (
            <button
              onClick={onAddNewChunk}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Chunk</span>
            </button>
          )}
        </div>
      ) : (
        /* Drag and Drop Chunks List */
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="chunks_list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {chunks.map((chunk, index) => (
                  <Draggable key={chunk.id} draggableId={chunk.id} index={index}>
                    {(draggableProvided) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                      >
                        <ChunkItem
                          chunk={chunk}
                          isPlaying={isPlaying && currentAudioUrl === chunk.audioUrl}
                          currentAudioUrl={currentAudioUrl}
                          onPlay={onAudioPlay}
                          onPause={onAudioPause}
                          onRegenerate={onRegenerateChunk}
                          onSelectTake={onSelectTake}
                          onGenerateNewTake={onGenerateNewTake}
                          onUpdateText={onUpdateChunkText}
                          onDeleteChunk={onDeleteChunk}
                          dragHandleProps={draggableProvided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};
