import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, X, StickyNote } from 'lucide-react';
import { GraphNote, NoteColor } from '../types/graph';

interface CanvasNoteCardProps {
  note: GraphNote;
  viewScale: number;
  theme: 'dark' | 'light';
  autoFocus?: boolean;
  onUpdateNote: (id: string, updates: Partial<GraphNote>) => void;
  onCommitHistory?: () => void;
  onDeleteNote: (id: string) => void;
  onBringToFront?: (id: string) => void;
}

interface ThemeStyle {
  dot: string;
  darkContainer: string;
  lightContainer: string;
  darkHeader: string;
  lightHeader: string;
  darkAccent: string;
  lightAccent: string;
}

const NOTE_THEMES: Record<NoteColor, ThemeStyle> = {
  amber: {
    dot: '#f59e0b',
    darkContainer: 'bg-amber-950/80 border-amber-500/35 focus-within:border-amber-400/70 focus-within:ring-amber-500/20',
    lightContainer: 'bg-amber-50/95 border-amber-300 focus-within:border-amber-500 focus-within:ring-amber-200',
    darkHeader: 'bg-amber-900/30 border-amber-500/20',
    lightHeader: 'bg-amber-100/80 border-amber-200/80',
    darkAccent: 'text-amber-300',
    lightAccent: 'text-amber-700',
  },
  blue: {
    dot: '#3b82f6',
    darkContainer: 'bg-blue-950/80 border-blue-500/35 focus-within:border-blue-400/70 focus-within:ring-blue-500/20',
    lightContainer: 'bg-blue-50/95 border-blue-300 focus-within:border-blue-500 focus-within:ring-blue-200',
    darkHeader: 'bg-blue-900/30 border-blue-500/20',
    lightHeader: 'bg-blue-100/80 border-blue-200/80',
    darkAccent: 'text-blue-300',
    lightAccent: 'text-blue-700',
  },
  emerald: {
    dot: '#10b981',
    darkContainer: 'bg-emerald-950/80 border-emerald-500/35 focus-within:border-emerald-400/70 focus-within:ring-emerald-500/20',
    lightContainer: 'bg-emerald-50/95 border-emerald-300 focus-within:border-emerald-500 focus-within:ring-emerald-200',
    darkHeader: 'bg-emerald-900/30 border-emerald-500/20',
    lightHeader: 'bg-emerald-100/80 border-emerald-200/80',
    darkAccent: 'text-emerald-300',
    lightAccent: 'text-emerald-700',
  },
  purple: {
    dot: '#a855f7',
    darkContainer: 'bg-purple-950/80 border-purple-500/35 focus-within:border-purple-400/70 focus-within:ring-purple-500/20',
    lightContainer: 'bg-purple-50/95 border-purple-300 focus-within:border-purple-500 focus-within:ring-purple-200',
    darkHeader: 'bg-purple-900/30 border-purple-500/20',
    lightHeader: 'bg-purple-100/80 border-purple-200/80',
    darkAccent: 'text-purple-300',
    lightAccent: 'text-purple-700',
  },
  rose: {
    dot: '#f43f5e',
    darkContainer: 'bg-rose-950/80 border-rose-500/35 focus-within:border-rose-400/70 focus-within:ring-rose-500/20',
    lightContainer: 'bg-rose-50/95 border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-200',
    darkHeader: 'bg-rose-900/30 border-rose-500/20',
    lightHeader: 'bg-rose-100/80 border-rose-200/80',
    darkAccent: 'text-rose-300',
    lightAccent: 'text-rose-700',
  },
  neutral: {
    dot: '#737373',
    darkContainer: 'bg-neutral-900/90 border-neutral-700/90 focus-within:border-neutral-500 focus-within:ring-neutral-600/25',
    lightContainer: 'bg-white/95 border-slate-300 focus-within:border-slate-500 focus-within:ring-slate-200',
    darkHeader: 'bg-neutral-800/60 border-neutral-800',
    lightHeader: 'bg-slate-100/80 border-slate-200',
    darkAccent: 'text-neutral-300',
    lightAccent: 'text-slate-700',
  },
};

const COLOR_KEYS: NoteColor[] = ['amber', 'blue', 'emerald', 'purple', 'rose', 'neutral'];

export const CanvasNoteCard: React.FC<CanvasNoteCardProps> = ({
  note,
  viewScale,
  theme,
  autoFocus = false,
  onUpdateNote,
  onCommitHistory,
  onDeleteNote,
  onBringToFront,
}) => {
  const isLight = theme === 'light';
  const colorKey: NoteColor = note.color && NOTE_THEMES[note.color] ? note.color : 'amber';
  const palette = NOTE_THEMES[colorKey];

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const width = note.width ?? 240;

  // Auto-focus newly created note
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Fallback vertical auto-fit for browsers without CSS field-sizing: content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || note.height !== undefined) return;
    if (typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content')) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(82, Math.min(380, el.scrollHeight))}px`;
  }, [note.text, note.height, width]);

  // Dragging handler
  const handleStartDrag = (clientX: number, clientY: number) => {
    onBringToFront?.(note.id);
    setIsDragging(true);
    const startX = clientX;
    const startY = clientY;
    const initialNoteX = note.x;
    const initialNoteY = note.y;

    const handleMove = (moveX: number, moveY: number) => {
      const dx = (moveX - startX) / viewScale;
      const dy = (moveY - startY) / viewScale;
      onUpdateNote(note.id, {
        x: initialNoteX + dx,
        y: initialNoteY + dy,
      });
    };

    const onMouseMove = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY);
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 1) {
        ev.preventDefault();
        handleMove(ev.touches[0].clientX, ev.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      onCommitHistory?.();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  // Resizing handler (bottom-right corner)
  const handleStartResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onBringToFront?.(note.id);
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const currentTextareaHeight = textareaRef.current?.offsetHeight ?? 92;
    const startHeight = note.height ?? currentTextareaHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / viewScale;
      const dy = (ev.clientY - startY) / viewScale;
      onUpdateNote(note.id, {
        width: Math.max(185, Math.min(540, Math.round(startWidth + dx))),
        height: Math.max(76, Math.min(480, Math.round(startHeight + dy))),
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      onCommitHistory?.();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${width}px`,
      }}
      onMouseDown={e => {
        e.stopPropagation();
        onBringToFront?.(note.id);
      }}
      onDoubleClick={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      className={`group pointer-events-auto absolute rounded-xl border backdrop-blur-md shadow-xl transition-shadow flex flex-col overflow-hidden focus-within:ring-2 ${
        isLight ? palette.lightContainer : palette.darkContainer
      } ${isDragging || isResizing ? 'shadow-2xl ring-2 ring-blue-500/40 z-30' : 'z-10'}`}
    >
      {/* Drag Handle & Header */}
      <div
        onMouseDown={e => {
          if (e.button !== 0) return;
          e.stopPropagation();
          handleStartDrag(e.clientX, e.clientY);
        }}
        onTouchStart={e => {
          if (e.touches.length !== 1) return;
          e.stopPropagation();
          handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
        className={`flex items-center justify-between px-2.5 py-1.5 border-b select-none cursor-grab active:cursor-grabbing ${
          isLight ? palette.lightHeader : palette.darkHeader
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripHorizontal
            size={13}
            className={`shrink-0 opacity-60 group-hover:opacity-100 transition-opacity ${
              isLight ? palette.lightAccent : palette.darkAccent
            }`}
          />
          <StickyNote
            size={11}
            className={`shrink-0 ${isLight ? palette.lightAccent : palette.darkAccent}`}
          />
          <input
            type="text"
            value={note.title ?? ''}
            placeholder="Note"
            onChange={e => onUpdateNote(note.id, { title: e.target.value })}
            onBlur={() => onCommitHistory?.()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            spellCheck={false}
            className={`w-full min-w-0 bg-transparent text-[11px] font-semibold tracking-tight focus:outline-none select-text ${
              isLight
                ? 'text-slate-800 placeholder:text-slate-500/80'
                : 'text-neutral-100 placeholder:text-neutral-400/80'
            }`}
          />
        </div>

        {/* Color Swatches + Delete */}
        <div
          className="flex items-center gap-1 shrink-0 ml-1"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {COLOR_KEYS.map(ck => (
              <button
                key={ck}
                type="button"
                onClick={() => {
                  onUpdateNote(note.id, { color: ck });
                  onCommitHistory?.();
                }}
                className={`w-2.5 h-2.5 rounded-full transition-transform cursor-pointer ${
                  colorKey === ck
                    ? 'scale-125 ring-1 ring-offset-1 ring-white/80'
                    : 'opacity-70 hover:opacity-100 hover:scale-110'
                }`}
                style={{ backgroundColor: NOTE_THEMES[ck].dot }}
                title={`Theme: ${ck}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => onDeleteNote(note.id)}
            className={`p-0.5 ml-0.5 rounded transition-colors cursor-pointer opacity-70 hover:opacity-100 ${
              isLight
                ? 'text-slate-500 hover:text-red-600 hover:bg-red-100/70'
                : 'text-neutral-400 hover:text-red-400 hover:bg-red-950/50'
            }`}
            title="Delete Note"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Note Textbox Body */}
      <div className="relative flex-1 flex flex-col">
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={e => onUpdateNote(note.id, { text: e.target.value })}
          onBlur={() => onCommitHistory?.()}
          onMouseDown={e => e.stopPropagation()}
          onWheel={e => {
            if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight) {
              e.stopPropagation();
            }
          }}
          placeholder="Write notes, invariants, or complexity..."
          spellCheck={false}
          style={{
            ...(note.height !== undefined
              ? { height: `${note.height}px` }
              : { fieldSizing: 'content' as any, minHeight: '82px', maxHeight: '380px' }),
          }}
          className={`w-full px-3 py-2 bg-transparent text-[12.5px] leading-relaxed font-sans focus:outline-none resize-none select-text overflow-y-auto ${
            isLight
              ? 'text-slate-800 placeholder:text-slate-400/90'
              : 'text-neutral-100 placeholder:text-neutral-500'
          }`}
        />

        {/* Subtle Bottom-Right Resize Grip */}
        <div
          onMouseDown={handleStartResize}
          className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 cursor-nwse-resize opacity-35 hover:opacity-90 transition-opacity flex items-end justify-end p-0.5 ${
            isLight ? 'text-slate-500' : 'text-neutral-400'
          }`}
          title="Drag to resize note"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M7 3L3 7M7 6L6 7" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};
