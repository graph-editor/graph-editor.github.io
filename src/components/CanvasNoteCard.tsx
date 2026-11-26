import React, { useState, useRef, useEffect } from 'react';
import { Move, X, Plus, Minus } from 'lucide-react';
import { GraphNote } from '../types/graph';

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 28;

interface CanvasNoteCardProps {
  note: GraphNote;
  viewScale: number;
  theme?: 'dark' | 'light';
  autoFocus?: boolean;
  onUpdateNote: (id: string, updates: Partial<GraphNote>) => void;
  onCommitHistory?: () => void;
  onDeleteNote: (id: string) => void;
  onBringToFront?: (id: string) => void;
}

export const CanvasNoteCard: React.FC<CanvasNoteCardProps> = ({
  note,
  viewScale,
  autoFocus = false,
  onUpdateNote,
  onCommitHistory,
  onDeleteNote,
  onBringToFront,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const width = note.width ?? 236;
  const fontSize = note.fontSize ?? DEFAULT_FONT_SIZE;

  const handleChangeFontSize = (delta: number) => {
    const nextSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize + delta));
    if (nextSize === fontSize) return;
    onUpdateNote(note.id, { fontSize: nextSize });
    onCommitHistory?.();
  };

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
  }, [note.text, note.height, width, fontSize]);

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
  const startResize = (clientX: number, clientY: number) => {
    onBringToFront?.(note.id);
    setIsResizing(true);

    const startX = clientX;
    const startY = clientY;
    const startWidth = width;
    const currentTextareaHeight = textareaRef.current?.offsetHeight ?? 92;
    const startHeight = note.height ?? currentTextareaHeight;

    const handleMove = (moveX: number, moveY: number) => {
      const dx = (moveX - startX) / viewScale;
      const dy = (moveY - startY) / viewScale;
      onUpdateNote(note.id, {
        width: Math.max(185, Math.min(540, Math.round(startWidth + dx))),
        height: Math.max(76, Math.min(480, Math.round(startHeight + dy))),
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
      setIsResizing(false);
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

  const handleStartResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startResize(e.clientX, e.clientY);
  };

  const handleStartResizeTouch = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    startResize(e.touches[0].clientX, e.touches[0].clientY);
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
      className={`group pointer-events-auto absolute rounded-lg border bg-black/70 border-neutral-800/80 text-neutral-100 backdrop-blur-md shadow-[0_14px_38px_rgba(0,0,0,0.85)] ring-1 ring-white/5 transition-shadow flex flex-col overflow-hidden focus-within:border-neutral-600 focus-within:ring-neutral-700/40 ${
        isDragging || isResizing ? 'shadow-[0_20px_50px_rgba(0,0,0,0.95)] border-neutral-500 z-30' : 'z-10'
      }`}
    >
      {/* Minimal Classic Header / Drag Handle */}
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
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-800/80 bg-neutral-950/70 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="p-0.5 rounded text-neutral-300 group-hover:text-white transition-colors shrink-0"
            title="Drag to move note"
          >
            <Move size={13} strokeWidth={2} />
          </span>
          <input
            type="text"
            value={note.title ?? ''}
            placeholder="Note"
            onChange={e => onUpdateNote(note.id, { title: e.target.value })}
            onBlur={() => onCommitHistory?.()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            spellCheck={false}
            className="w-full min-w-0 bg-transparent text-[11px] font-medium tracking-wide text-neutral-200 placeholder:text-neutral-400 focus:text-white focus:outline-none select-text"
          />
        </div>

        <div
          className="flex items-center gap-0.5 shrink-0 ml-1"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="flex items-center rounded-md border border-neutral-800/90 bg-black/60 overflow-hidden mr-1">
            <button
              type="button"
              onClick={() => handleChangeFontSize(-2)}
              disabled={fontSize <= MIN_FONT_SIZE}
              className="px-1.5 py-0.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Decrease text size (-)"
            >
              <Minus size={11} strokeWidth={2.5} />
            </button>
            <span className="px-1 text-[10px] font-mono text-neutral-400 select-none min-w-[20px] text-center">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => handleChangeFontSize(2)}
              disabled={fontSize >= MAX_FONT_SIZE}
              className="px-1.5 py-0.5 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Increase text size (+)"
            >
              <Plus size={11} strokeWidth={2.5} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDeleteNote(note.id)}
            className="p-1 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Delete Note"
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Minimal Classic Dark Black Textbox */}
      <div className="relative flex-1 flex flex-col bg-transparent">
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
          placeholder="Write a note..."
          spellCheck={false}
          style={{
            fontSize: `${fontSize}px`,
            ...(note.height !== undefined
              ? { height: `${note.height}px` }
              : { fieldSizing: 'content' as any, minHeight: '82px', maxHeight: '380px' }),
          }}
          className="w-full px-3 pt-2.5 pb-4 pr-5 bg-transparent leading-relaxed font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none resize-none select-text overflow-y-auto"
        />

        {/* Clear Classic Corner Resize Grip */}
        <div
          onMouseDown={handleStartResize}
          onTouchStart={handleStartResizeTouch}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize text-neutral-400 hover:text-white hover:bg-neutral-800/75 rounded-tl-md transition-colors flex items-end justify-end p-1"
          title="Drag to resize note"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10.5 2.5L2.5 10.5" />
            <path d="M10.5 6.5L6.5 10.5" />
            <path d="M10.5 10L10 10.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};
