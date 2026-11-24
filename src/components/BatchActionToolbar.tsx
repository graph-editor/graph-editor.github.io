import React, { useState } from 'react';
import { CP_PALETTE } from '../utils/parser';
import {
  LassoSelect,
  Trash2,
  X,
  Palette,
  Scale,
  Pin,
  Check,
  Tag,
} from 'lucide-react';

export interface BatchActionToolbarProps {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  onBatchDelete: () => void;
  onBatchColor: (color: string) => void;
  onBatchAddValue: (value: string | number | undefined) => void;
  onClearSelection: () => void;
  theme?: 'dark' | 'light';
}

export const BatchActionToolbar: React.FC<BatchActionToolbarProps> = ({
  selectedNodeIds,
  selectedEdgeIds,
  onBatchDelete,
  onBatchColor,
  onBatchAddValue,
  onClearSelection,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [valInput, setValInput] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('#3b82f6');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);
  const [isValueModalOpen, setIsValueModalOpen] = useState<boolean>(false);

  const totalCount = selectedNodeIds.length + selectedEdgeIds.length;
  if (totalCount === 0) return null;

  const handleApplyValue = (valToApply: string) => {
    const trimmed = valToApply.trim();
    if (trimmed === '') {
      onBatchAddValue(undefined);
    } else {
      const num = Number(trimmed);
      const finalVal = !isNaN(num) && trimmed !== '' ? num : trimmed;
      onBatchAddValue(finalVal);
    }
    setValInput('');
    setIsValueModalOpen(false);
  };

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-3xl pointer-events-none animate-slide-up">
      <div className={`pointer-events-auto backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap border ${
        isLight ? 'bg-white/95 border-slate-300 text-slate-900 shadow-xl' : 'bg-black/95 border-cyan-500/40 text-white shadow-cyan-950/30'
      }`}>
        {/* Selection Count Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs shrink-0 border ${
          isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-900 font-bold' : 'bg-cyan-950/70 border-cyan-500/30 text-cyan-300 font-semibold'
        }`}>
          <LassoSelect size={14} className={isLight ? 'text-cyan-700' : 'text-cyan-400'} />
          <span>
            {selectedNodeIds.length > 0 && `${selectedNodeIds.length} Nodes`}
            {selectedNodeIds.length > 0 && selectedEdgeIds.length > 0 && ', '}
            {selectedEdgeIds.length > 0 && `${selectedEdgeIds.length} Edges`}
          </span>
        </div>

        <div className={`w-[1px] h-5 hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Action: Batch Color Swatches */}
        <div className="flex items-center gap-1 shrink-0">
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <Palette size={13} className="text-pink-500 ml-1 mr-0.5 shrink-0" />
            <div className="flex items-center gap-1">
              {CP_PALETTE.slice(0, 7).map(p => (
                <button
                  type="button"
                  key={p.color}
                  onClick={() => {
                    setCurrentColor(p.color);
                    onBatchColor(p.color);
                  }}
                  className={`w-4 h-4 rounded-full border hover:scale-125 transition-transform ${
                    isLight ? 'border-slate-300' : 'border-slate-800'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={`Color selected as ${p.name}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className={`text-[10px] px-1 py-0.5 rounded ${
                  isLight ? 'text-slate-700 hover:text-slate-950 bg-slate-200' : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
                title="More colors"
              >
                +
              </button>
              <label className="cursor-pointer ml-0.5 flex items-center" title="Pick any custom live color">
                <input
                  type="color"
                  value={currentColor}
                  onInput={e => {
                    const c = (e.target as HTMLInputElement).value;
                    setCurrentColor(c);
                    onBatchColor(c);
                  }}
                  onChange={e => {
                    const c = (e.target as HTMLInputElement).value;
                    setCurrentColor(c);
                    onBatchColor(c);
                  }}
                  className="w-3.5 h-3.5 rounded-full cursor-pointer border-0 bg-transparent p-0 block"
                />
              </label>
            </div>
          </div>

          {/* Color popover if opened */}
          {isColorPickerOpen && (
            <div className={`absolute bottom-full mb-2 left-1/4 rounded-xl p-2 shadow-2xl z-50 flex gap-1.5 animate-in fade-in zoom-in-95 border ${
              isLight ? 'bg-white border-slate-300 shadow-xl' : 'bg-slate-950 border-slate-800'
            }`}>
              {CP_PALETTE.map(p => (
                <button
                  type="button"
                  key={p.color}
                  onClick={() => {
                    setCurrentColor(p.color);
                    onBatchColor(p.color);
                    setIsColorPickerOpen(false);
                  }}
                  className={`w-5 h-5 rounded-lg border hover:scale-110 transition-transform ${
                    isLight ? 'border-slate-300' : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action: Add Value / Weight */}
        <div className="relative flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsValueModalOpen(!isValueModalOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium transition-colors ${
              isLight
                ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900 font-semibold'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-indigo-300'
            }`}
            title="Add or edit value/weight for all selected items"
          >
            <Scale size={13} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
            <span>Set Value</span>
          </button>

          {isValueModalOpen && (
            <div className={`absolute bottom-full mb-2 left-0 w-64 rounded-xl p-2.5 shadow-2xl z-50 space-y-2 animate-in fade-in zoom-in-95 border ${
              isLight ? 'bg-white border-slate-300 text-slate-900 shadow-xl' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-medium ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                <span>Set Value for Selected ({totalCount})</span>
                <button
                  type="button"
                  onClick={() => setIsValueModalOpen(false)}
                  className={`p-0.5 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-white'}`}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={valInput}
                  onChange={e => setValInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleApplyValue(valInput);
                  }}
                  placeholder="e.g. 10, A, val, true"
                  className={`flex-1 rounded-lg px-2 py-1 text-xs font-mono border focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                      : 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleApplyValue(valInput)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Apply
                </button>
              </div>
              <div className={`flex items-center gap-1 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                <span className={`text-[10px] mr-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyValue('10')}
                  className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${
                    isLight ? 'bg-slate-100 border-slate-200 text-blue-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-800 text-blue-300 hover:bg-slate-800'
                  }`}
                >
                  10
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyValue('A')}
                  className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${
                    isLight ? 'bg-slate-100 border-slate-200 text-purple-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-800 text-purple-300 hover:bg-slate-800'
                  }`}
                >
                  'A'
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyValue('val')}
                  className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${
                    isLight ? 'bg-slate-100 border-slate-200 text-emerald-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-800 text-emerald-300 hover:bg-slate-800'
                  }`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyValue('')}
                  className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${
                    isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action: Batch Delete */}
        <button
          type="button"
          onClick={onBatchDelete}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-sm transition-colors shrink-0 border cursor-pointer ${
            isLight
              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
              : 'bg-red-950/80 hover:bg-red-900 text-red-300 border-red-500/30'
          }`}
          title="Delete all selected nodes and edges (Del)"
        >
          <Trash2 size={13} className={isLight ? 'text-red-600' : 'text-red-400'} />
          <span>Delete ({totalCount})</span>
        </button>

        {/* Deselect / Close */}
        <button
          type="button"
          onClick={onClearSelection}
          className={`p-1 rounded-lg transition-colors shrink-0 ${
            isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Clear Selection (Esc)"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
