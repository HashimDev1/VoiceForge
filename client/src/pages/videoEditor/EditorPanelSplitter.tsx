import React, { useState, useRef } from 'react';

interface EditorPanelSplitterProps {
  direction: 'horizontal' | 'vertical'; // 'horizontal' divides left/right columns; 'vertical' divides top/bottom rows
  onResize: (delta: number) => void;
  onReset?: () => void;
  title?: string;
}

export const EditorPanelSplitter: React.FC<EditorPanelSplitterProps> = ({
  direction,
  onResize,
  onReset,
  title = 'Double-click to reset panel size'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.preventDefault();
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPosRef.current;
    if (delta !== 0) {
      onResize(delta);
      startPosRef.current = currentPos;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      title={title}
      aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={onReset}
      className={`group select-none transition-colors rounded-full ${
        direction === 'horizontal'
          ? 'w-1.5 cursor-col-resize hover:bg-indigo-500 bg-studio-border/60 mx-0.5 relative flex items-center justify-center shrink-0'
          : 'h-1.5 cursor-row-resize hover:bg-indigo-500 bg-studio-border/60 my-0.5 relative flex items-center justify-center shrink-0'
      } ${isDragging ? 'bg-indigo-600 z-30 ring-2 ring-indigo-400' : 'z-10'}`}
    >
      {/* Visual gripper dot / pill */}
      <div
        className={`rounded-full transition-colors ${
          direction === 'horizontal'
            ? 'w-0.5 h-6 bg-slate-400 dark:bg-slate-600 group-hover:bg-white'
            : 'h-0.5 w-6 bg-slate-400 dark:bg-slate-600 group-hover:bg-white'
        } ${isDragging ? 'bg-white' : ''}`}
      />
    </div>
  );
};
