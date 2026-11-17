import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: 'V / S', desc: 'Select & Move tool (drag unpinned nodes)' },
    { key: 'Double-click Node', desc: 'Fix node in place (won\'t move) / Unpin' },
    { key: 'Double-click Canvas', desc: 'Quickly add a new node' },
    { key: 'Drag Canvas', desc: 'Pan graph view' },
    { key: 'N', desc: 'Add Node tool' },
    { key: 'E', desc: 'Connect / Add Edge tool' },
    { key: 'Del / Backspace', desc: 'Delete selected node or edge' },
    { key: 'Space', desc: 'Toggle force physics play/pause' },
    { key: 'F', desc: 'Fit graph to view / center' },
    { key: 'D', desc: 'Toggle Directed / Undirected' },
    { key: 'W', desc: 'Toggle Weighted / Unweighted' },
    { key: 'Esc', desc: 'Clear selection / cancel connect' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Keyboard & Mouse Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1 border-b border-slate-800/60 text-xs">
              <span className="text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-1 bg-slate-950 border border-slate-700/80 rounded-md font-mono text-[11px] text-blue-400 font-semibold shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
