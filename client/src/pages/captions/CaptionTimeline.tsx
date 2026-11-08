import React, { useRef, useState, useMemo } from 'react';
import {
  Scissors,
  Merge,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Edit3,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { CaptionSegment, CaptionWord } from './types';

interface CaptionTimelineProps {
  segments: CaptionSegment[];
  duration: number;
  playhead: number;
  onSeek: (time: number) => void;
  selectedSegmentId: string;
  onSelectSegment: (id: string) => void;
  onUpdateSegment: (index: number, patch: Partial<CaptionSegment>) => void;
  onAddSegment: () => void;
  onDeleteSegment: (index: number) => void;
  onSplitSegment: () => void;
  onMergeSegment: () => void;
  onTagKeyword: (word: string) => void;
  emphasisWords: string[];
  maxWords?: number;
  onRegroupAll?: (count: number) => void;
}

export const CaptionTimeline: React.FC<CaptionTimelineProps> = ({
  segments,
  duration,
  playhead,
  onSeek,
  selectedSegmentId,
  onSelectSegment,
  onUpdateSegment,
  onAddSegment,
  onDeleteSegment,
  onSplitSegment,
  onMergeSegment,
  onTagKeyword,
  emphasisWords,
  maxWords = 3,
  onRegroupAll
}) => {
  const [zoom, setZoom] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    index: number;
    mode: 'move' | 'start' | 'end';
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const selectedIndex = segments.findIndex((s) => s.id === selectedSegmentId);
  const selectedSegment = selectedIndex >= 0 ? segments[selectedIndex] : null;

  // Active word editor modal / inline state
  const [editingWordIdx, setEditingWordIdx] = useState<number | null>(null);
  const [wordText, setWordText] = useState('');

  // Timeline drag handling
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
    mode: 'move' | 'start' | 'end'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const seg = segments[index];
    if (!seg || !trackRef.current) return;

    dragRef.current = {
      index,
      mode,
      startX: e.clientX,
      origStart: seg.start,
      origEnd: seg.end
    };

    trackRef.current.setPointerCapture(e.pointerId);
    onSelectSegment(seg.id);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) return;

    const trackWidth = track.getBoundingClientRect().width;
    const totalDuration = Math.max(0.1, duration || 30);
    const deltaSec = ((e.clientX - drag.startX) / trackWidth) * totalDuration;

    let nextStart = drag.origStart;
    let nextEnd = drag.origEnd;
    const minSpan = 0.08;

    if (drag.mode === 'move') {
      const span = drag.origEnd - drag.origStart;
      nextStart = Math.max(0, Math.min(totalDuration - span, drag.origStart + deltaSec));
      nextEnd = nextStart + span;
    } else if (drag.mode === 'start') {
      nextStart = Math.max(0, Math.min(drag.origStart + deltaSec, nextEnd - minSpan));
    } else if (drag.mode === 'end') {
      nextEnd = Math.min(totalDuration, Math.max(nextStart + minSpan, drag.origEnd + deltaSec));
    }

    onUpdateSegment(drag.index, { start: nextStart, end: nextEnd });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const clickSec = ((e.clientX - rect.left) / rect.width) * (duration || 30);
      onSeek(Math.max(0, Math.min(duration || 30, clickSec)));
    }
  };

  // Generate simulated waveform bars for studio visuals
  const waveformBars = useMemo(() => {
    const count = Math.min(120, Math.max(60, Math.round(duration * 2)));
    const bars: number[] = [];
    for (let i = 0; i < count; i++) {
      const val = 0.2 + 0.6 * Math.abs(Math.sin(i * 0.28) * Math.cos(i * 0.14));
      bars.push(val);
    }
    return bars;
  }, [duration]);

  return (
    <section className="glass-panel flex flex-col rounded-2xl border border-studio-border bg-white dark:bg-studio-900 text-slate-900 dark:text-white shadow-sm transition-colors">
      {/* Timeline Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-studio-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            TIMELINE
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {segments.length} Subtitle Clips
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {duration.toFixed(2)}s Total
          </span>
        </div>

        {/* Toolbar: Actions & Zoom */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-800 p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              title="Zoom out"
              className="rounded-lg p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-12 text-center font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {zoom.toFixed(2)}×
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              title="Zoom in"
              className="rounded-lg p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add Caption (+) */}
          <button
            type="button"
            onClick={onAddSegment}
            className="flex items-center gap-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Clip</span>
          </button>
        </div>
      </div>

      {/* Interactive Horizontal Scroll Timeline Viewport */}
      <div className="overflow-x-auto p-4 scrollbar-thin">
        <div
          className="relative"
          style={{
            width: `${Math.max(100, zoom * 100)}%`,
            minWidth: `${Math.max(780, (duration || 30) * 28 * zoom)}px`
          }}
        >
          {/* Time Marker Bar */}
          <div className="flex h-6 select-none justify-between border-b border-studio-border font-mono text-[10px] text-slate-400">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct) => {
              const mark = (duration || 30) * pct;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onSeek(mark)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  {mark.toFixed(1)}s
                </button>
              );
            })}
          </div>

          {/* Main Track Container */}
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative mt-2.5 h-[94px] touch-none rounded-xl border border-studio-border bg-slate-100 dark:bg-studio-950 overflow-hidden"
          >
            {/* Waveform Background Simulation */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-around opacity-25 px-2">
              {waveformBars.map((height, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-indigo-500"
                  style={{ height: `${height * 60}%` }}
                />
              ))}
            </div>

            {/* Draggable Subtitle Segment Blocks */}
            {segments.map((seg, i) => {
              const totalSec = Math.max(0.1, duration || 30);
              const leftPct = (seg.start / totalSec) * 100;
              const widthPct = Math.max(0.6, ((seg.end - seg.start) / totalSec) * 100);
              const isSelected = seg.id === selectedSegmentId;
              const isActive = playhead >= seg.start && playhead <= seg.end;

              return (
                <div
                  key={seg.id}
                  onPointerDown={(e) => handlePointerDown(e, i, 'move')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSegment(seg.id);
                    onSeek(seg.start);
                  }}
                  title={`${seg.start.toFixed(2)}s → ${seg.end.toFixed(2)}s · "${seg.text}"`}
                  className={`absolute top-4 flex h-14 min-w-[70px] cursor-grab select-none items-center overflow-hidden rounded-xl border text-[11px] font-bold shadow-sm transition-all active:cursor-grabbing ${
                    isSelected
                      ? 'z-20 border-2 border-indigo-600 dark:border-indigo-400 bg-indigo-600 text-white shadow-md'
                      : isActive
                      ? 'z-10 border border-indigo-500 bg-indigo-500 text-white shadow'
                      : 'border border-studio-border bg-white dark:bg-studio-800 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {/* Left Trim Handle */}
                  <button
                    type="button"
                    aria-label="Trim caption start"
                    onPointerDown={(e) => handlePointerDown(e, i, 'start')}
                    onClick={(e) => e.stopPropagation()}
                    className="h-full w-2.5 shrink-0 cursor-ew-resize bg-black/10 dark:bg-white/15 hover:bg-black/30 dark:hover:bg-white/40 active:bg-indigo-500"
                  />

                  {/* Text Label */}
                  <div className="flex-1 truncate px-2 text-center leading-tight">
                    <span className="block truncate">{seg.text || 'Empty'}</span>
                    <span className="block text-[9px] font-mono opacity-70">
                      {(seg.end - seg.start).toFixed(2)}s
                    </span>
                  </div>

                  {/* Right Trim Handle */}
                  <button
                    type="button"
                    aria-label="Trim caption end"
                    onPointerDown={(e) => handlePointerDown(e, i, 'end')}
                    onClick={(e) => e.stopPropagation()}
                    className="h-full w-2.5 shrink-0 cursor-ew-resize bg-black/10 dark:bg-white/15 hover:bg-black/30 dark:hover:bg-white/40 active:bg-indigo-500"
                  />
                </div>
              );
            })}

            {/* Red Playhead Line & Cursor */}
            <div
              className="pointer-events-none absolute -top-1 bottom-0 z-30 w-px bg-rose-500 shadow-[0_0_8px_#f43f5e]"
              style={{
                left: `${Math.max(0, Math.min(100, (playhead / (duration || 1)) * 100))}%`
              }}
            >
              <div className="absolute -left-1.5 -top-1 h-3.5 w-3.5 rotate-45 rounded-sm bg-rose-500 shadow" />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Clip Detail Inspector & Word Chips */}
      {selectedSegment && (
        <div className="border-t border-studio-border bg-slate-50 dark:bg-studio-950/60 p-4 space-y-3">
          {/* Top Bar: Segment Index & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Clip {selectedIndex + 1}
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {selectedSegment.start.toFixed(2)}s → {selectedSegment.end.toFixed(2)}s ({(selectedSegment.end - selectedSegment.start).toFixed(2)}s)
              </span>
            </div>

            {/* Split / Merge / Delete Buttons */}
            <div className="flex items-center gap-1.5">
              {onRegroupAll && (
                <button
                  type="button"
                  onClick={() => onRegroupAll(maxWords)}
                  title={`Auto-split narration into ${maxWords}-word clips`}
                  className="flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-sm cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Regroup ({maxWords} Words)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onSplitSegment}
                disabled={
                  !selectedSegment.words || selectedSegment.words.length < 2
                }
                title="Split clip at playhead"
                className="flex items-center gap-1 rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 disabled:opacity-40 shadow-sm cursor-pointer"
              >
                <Scissors className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Split at Playhead</span>
              </button>

              <button
                type="button"
                onClick={onMergeSegment}
                disabled={selectedIndex >= segments.length - 1}
                title="Merge with next clip"
                className="flex items-center gap-1 rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 disabled:opacity-40 shadow-sm cursor-pointer"
              >
                <Merge className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Merge Next</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteSegment(selectedIndex)}
                title="Delete this clip"
                className="flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 shadow-sm cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Textarea for Selected Clip */}
          <textarea
            value={selectedSegment.text}
            onChange={(e) =>
              onUpdateSegment(selectedIndex, { text: e.target.value })
            }
            placeholder="Edit subtitle text..."
            className="w-full rounded-xl border border-studio-border bg-white dark:bg-studio-900 p-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500/60 shadow-sm"
            rows={2}
          />

          {/* Word Count & Narration Chunking Hint */}
          {selectedSegment.text.trim().split(/\s+/).filter(Boolean).length > maxWords && onRegroupAll && (
            <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-3 py-2 font-mono">
              <span>
                💡 Narration contains {selectedSegment.text.trim().split(/\s+/).filter(Boolean).length} words (Display mode: {maxWords} words on screen).
              </span>
              <button
                type="button"
                onClick={() => onRegroupAll(maxWords)}
                className="font-bold underline hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-2"
              >
                Split into {maxWords}-word clips →
              </button>
            </div>
          )}

          {/* Word-Level Chips Engine */}
          {selectedSegment.words && selectedSegment.words.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Word Timestamps & Emphasis (Click chip to tag keyword or edit)
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedSegment.words.length} words
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedSegment.words.map((w, wIdx) => {
                  const cleanUpper = w.word
                    .toUpperCase()
                    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                  const isEmphasized = emphasisWords.includes(cleanUpper);

                  return (
                    <div
                      key={wIdx}
                      className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition shadow-sm ${
                        isEmphasized
                          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200'
                          : 'border-studio-border bg-white dark:bg-studio-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWordIdx(wIdx);
                          setWordText(w.word);
                        }}
                        className="font-bold hover:underline cursor-pointer"
                      >
                        {w.word}
                      </button>
                      <span className="font-mono text-[9px] text-slate-400">
                        {w.start.toFixed(2)}s
                      </span>
                      <button
                        type="button"
                        title={
                          isEmphasized
                            ? 'Remove emphasis'
                            : 'Tag as Emphasis Keyword'
                        }
                        onClick={() => onTagKeyword(cleanUpper)}
                        className={`rounded p-0.5 cursor-pointer ${
                          isEmphasized
                            ? 'text-indigo-600 dark:text-indigo-300 hover:text-rose-500'
                            : 'text-slate-400 hover:text-indigo-600'
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Inline Word Editor Prompt */}
              {editingWordIdx !== null && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-studio-900 p-2.5 shadow-sm">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Edit Word {editingWordIdx + 1}:
                  </span>
                  <input
                    type="text"
                    value={wordText}
                    onChange={(e) => setWordText(e.target.value)}
                    className="flex-1 rounded-lg border border-studio-border bg-slate-50 dark:bg-studio-950 px-2.5 py-1 text-xs text-slate-900 dark:text-white outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const wordsCopy = [...(selectedSegment.words || [])];
                        wordsCopy[editingWordIdx] = {
                          ...wordsCopy[editingWordIdx],
                          word: wordText
                        };
                        const newFullText = wordsCopy.map((w) => w.word).join(' ');
                        onUpdateSegment(selectedIndex, {
                          text: newFullText,
                          words: wordsCopy
                        });
                        setEditingWordIdx(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const wordsCopy = [...(selectedSegment.words || [])];
                      wordsCopy[editingWordIdx] = {
                        ...wordsCopy[editingWordIdx],
                        word: wordText
                      };
                      const newFullText = wordsCopy.map((w) => w.word).join(' ');
                      onUpdateSegment(selectedIndex, {
                        text: newFullText,
                        words: wordsCopy
                      });
                      setEditingWordIdx(null);
                    }}
                    className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-1 text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingWordIdx(null)}
                    className="rounded-lg border border-studio-border px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Precise Timestamp Adjusters */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
              <span>Start Time (seconds)</span>
              <input
                type="number"
                min="0"
                max={selectedSegment.end - 0.05}
                step="0.01"
                value={selectedSegment.start}
                onChange={(e) =>
                  onUpdateSegment(selectedIndex, {
                    start: Math.min(
                      Number(e.target.value),
                      selectedSegment.end - 0.05
                    )
                  })
                }
                className="mt-1 w-full rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-white outline-none shadow-sm"
              />
            </label>

            <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
              <span>End Time (seconds)</span>
              <input
                type="number"
                min={selectedSegment.start + 0.05}
                max={duration || undefined}
                step="0.01"
                value={selectedSegment.end}
                onChange={(e) =>
                  onUpdateSegment(selectedIndex, {
                    end: Math.max(
                      Number(e.target.value),
                      selectedSegment.start + 0.05
                    )
                  })
                }
                className="mt-1 w-full rounded-lg border border-studio-border bg-white dark:bg-studio-900 px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-white outline-none shadow-sm"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
};
