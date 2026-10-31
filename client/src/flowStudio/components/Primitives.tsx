import React, { useState, useRef, useEffect } from 'react';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center px-1">
    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
      {children}
    </span>
  </div>
);

export const PillButton: React.FC<{
  icon?: React.ReactNode; 
  children?: React.ReactNode;
  variant?: 'filled' | 'outline' | 'solid' | 'danger'; 
  onClick?: () => void;
  disabled?: boolean; 
  className?: string;
}> = ({ icon, children, variant = 'filled', onClick, disabled, className = '' }) => {
  const base = 'flex items-center gap-[6px] justify-center h-[34px] rounded-xl font-medium tracking-[0.1px] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    filled: 'bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-900 dark:text-white text-[11px] px-3 py-1 select-none border border-studio-border',
    outline: 'border border-studio-border bg-white dark:bg-studio-900 hover:border-black dark:hover:border-white text-slate-900 dark:text-white text-[12px] px-4 py-2 select-none shadow-xs',
    solid: 'bg-black dark:bg-white hover:opacity-90 active:scale-[0.98] text-white dark:text-black text-[12px] px-4 py-2 select-none shadow-sm font-semibold',
    danger: 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-[11px] px-3 py-1 select-none',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {icon && <span className="flex items-center justify-center">{icon}</span>}
      {children && <span className="truncate">{children}</span>}
    </button>
  );
};

export const FieldDropdown: React.FC<{
  label: string; 
  value: string; 
  options: string[];
  onChange: (val: string) => void; 
  className?: string;
}> = ({ label, value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left border border-studio-border hover:border-black dark:hover:border-white transition-colors rounded-xl flex flex-col gap-0.5 justify-center pb-2 pl-2.5 pr-1 pt-[5px] select-none focus:outline-none bg-white dark:bg-studio-900 shadow-xs"
      >
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-900 dark:text-white tracking-[0.1px] truncate pr-2">{value}</span>
          <span className={`material-symbols-outlined text-[16px] text-slate-400 mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
        </div>
      </button>
      {isOpen && (
        <div className="absolute z-[100] top-[calc(100%+4px)] left-0 w-full bg-white dark:bg-studio-900 border border-studio-border rounded-xl overflow-hidden shadow-2xl backdrop-blur-md animate-dropdown origin-top">
          <div className="max-h-60 overflow-y-auto dark-scrollbar">
            {options.map((opt) => (
              <button 
                key={opt} 
                type="button"
                className={`w-full text-left px-2.5 py-2 text-[11px] font-medium tracking-[0.1px] hover:bg-slate-100 dark:hover:bg-studio-800 transition-colors ${value === opt ? 'bg-slate-100 dark:bg-studio-800 text-black dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                onClick={() => { onChange(opt); setIsOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const DragNumberField: React.FC<{
  label: string; 
  value: number; 
  min?: number; 
  max?: number;
  step?: number; 
  suffix?: string; 
  onChange: (val: number) => void; 
  className?: string;
}> = ({ label, value, min = 0, max = 999, step = 1, suffix = '', onChange, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startY: number; startVal: number; moved: boolean } | null>(null);

  const commitEdit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, Math.round(parsed / step) * step)));
    setIsEditing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startVal: value, moved: false };
    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(ev.clientY - dragRef.current.startY) > 3) dragRef.current.moved = true;
      if (dragRef.current.moved) {
        const delta = dragRef.current.startY - ev.clientY;
        const newVal = Math.round((dragRef.current.startVal + delta * step) / step) * step;
        onChange(Math.min(max, Math.max(min, newVal)));
        document.body.style.cursor = 'ns-resize';
      }
    };
    const handleMouseUp = () => {
      const wasDrag = dragRef.current?.moved;
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      if (!wasDrag) {
        setEditValue(String(value));
        setIsEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className={`border border-studio-border hover:border-black dark:hover:border-white bg-white dark:bg-studio-900 rounded-xl flex flex-col gap-0.5 justify-center pb-2 pl-2.5 pr-1 pt-[5px] select-none transition-colors shadow-xs ${isEditing ? '' : 'cursor-ns-resize'} ${className}`}
      onMouseDown={handleMouseDown}
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <div className="flex items-center justify-between">
        {isEditing ? (
          <input 
            ref={inputRef} 
            type="text" 
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(editValue); if (e.key === 'Escape') setIsEditing(false); }}
            onBlur={() => commitEdit(editValue)}
            className="bg-transparent text-[11px] font-medium text-slate-900 dark:text-white tracking-[0.1px] outline-none w-full border-none p-0 m-0" 
            autoFocus 
          />
        ) : (
          <>
            <span className="text-[11px] font-medium text-slate-900 dark:text-white tracking-[0.1px] cursor-text">{value}{suffix}</span>
            <div className="flex flex-col items-center mr-1.5 -gap-px text-slate-400">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M5 0L9 5H1L5 0Z" fill="currentColor"/></svg>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M5 6L1 1H9L5 6Z" fill="currentColor"/></svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
