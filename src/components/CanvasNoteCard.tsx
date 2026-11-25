import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import { GraphNote } from '../types/graph';

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
      className={`group pointer-events-auto absolute rounded-lg border bg-black/95 border-neutral-800 text-neutral-100 backdrop-blur-md shadow-[0_14px_38px_rgba(0,0,0,0.85)] ring-1 ring-white/5 transition-shadow flex flex-col overflow-hidden focus-within:border-neutral-600 focus-within:ring-neutral-700/40 ${
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
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-800/90 bg-neutral-950/90 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripHorizontal
            size={12}
            className="shrink-0 text-neutral-600 group-hover:text-neutral-400 transition-colors"
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
            className="w-full min-w-0 bg-transparent text-[11px] font-medium tracking-wide text-neutral-300 placeholder:text-neutral-500 focus:text-white focus:outline-none select-text"
          />
        </div>

        <button
          type="button"
          onMouseDown={e => e.stopPropagation()}
          onClick={() => onDeleteNote(note.id)}
          className="p-0.5 ml-1 rounded text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
          title="Delete Note"
        >
          <X size={12} />
        </button>
      </div>

      {/* Minimal Classic Dark Black Textbox */}
      <div className="relative flex-1 flex flex-col bg-black">
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
            ...(note.height !== undefined
              ? { height: `${note.height}px` }
              : { fieldSizing: 'content' as any, minHeight: '82px', maxHeight: '380px' }),
          }}
          className="w-full px-3 pt-2.5 pb-4 pr-5 bg-transparent text-[12.5px] leading-relaxed font-sans text-neutral-200 placeholder:text-neutral-600 focus:outline-none resize-none select-text overflow-y-auto"
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
