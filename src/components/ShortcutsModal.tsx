import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const shortcuts = [
    { key: 'V / S', desc: 'Select & Move tool (drag nodes freely)' },
    { key: 'L', desc: 'Lasso tool (draw loop to select nodes & edges)' },
    { key: 'Shift + Drag', desc: 'Quick Lasso select in any tool' },
    { key: 'Double-click Canvas', desc: 'Quickly add a new node' },
    { key: 'Drag Canvas', desc: 'Pan graph view' },
    { key: 'N', desc: 'Add Node tool' },
    { key: 'E', desc: 'Connect / Add Edge tool' },
    { key: 'Del / Backspace', desc: 'Delete selected node or edge' },
    { key: 'Space', desc: 'Toggle force physics play/pause' },
    { key: 'F', desc: 'Fit graph to view / center' },
    { key: 'D', desc: 'Toggle Directed / Undirected' },
    { key: 'W', desc: 'Toggle Weighted / Unweighted' },
    { key: 'Esc', desc: 'Cancel all actions (tools, connect, selection, algorithms, modals)' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
      }`}>
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
        }`}>
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-blue-500" />
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Keyboard & Mouse Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {shortcuts.map(s => (
            <div key={s.key} className={`flex items-center justify-between py-1.5 border-b text-xs ${
              isLight ? 'border-slate-100' : 'border-neutral-900'
            }`}>
              <span className={isLight ? 'text-slate-700' : 'text-neutral-300'}>{s.desc}</span>
              <kbd className={`px-2 py-1 border rounded-md font-mono text-[11px] font-semibold ${
                isLight ? 'bg-slate-100 border-slate-300 text-blue-600' : 'bg-neutral-950 border-neutral-800 text-blue-400'
              }`}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className={`px-5 py-3 border-t text-xs flex items-center justify-between ${
          isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-neutral-800 bg-neutral-950/80 text-neutral-400'
        }`}>
          <span className="font-medium">CP Graph Editor v2.1</span>
          <a
            href="https://github.com/mostafa-cse"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Author: @mostafa-cse</span>
          </a>
        </div>
      </div>
    </div>
  );
};
