import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ArrowRight, Check } from 'lucide-react';
import {
  parseLeetCode2DArray,
  parseParentArrayFormat,
  parseParentChildArrays,
  detectMultiTestcases,
} from '../utils/contestParser';

interface ImportModalProps {
  onClose: () => void;
  onImportSingle: (text: string) => void;
  onImportMulti: (cases: { name: string; text: string }[]) => void;
  theme?: 'dark' | 'light';
}

const SAMPLE_LEETCODE = `edges = [[0,1],[1,2],[2,0],[1,3]]`;
const SAMPLE_WEIGHTED_LEETCODE = `[[0,1,10],[1,2,5],[2,0,8],[1,3,15]]`;
const SAMPLE_PARENT_ARRAY = `parent = [-1, 0, 0, 1, 1, 2]`;
const SAMPLE_MULTI_TESTCASE = `2
3 2
1 2
2 3
4 3
1 2
2 3
3 4`;

export const ImportModal: React.FC<ImportModalProps> = ({
  onClose,
  onImportSingle,
  onImportMulti,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [inputText, setInputText] = useState<string>('');

  // Body scroll lock & Escape listener
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onClose]);

  // Live detection
  const detection = useMemo(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return null;

    const multi = detectMultiTestcases(trimmed);
    if (multi) {
      return {
        type: 'multi' as const,
        count: multi.count,
        label: `Multi-Testcase CP Input (${multi.count} testcases)`,
        multi,
      };
    }

    const leetcode = parseLeetCode2DArray(trimmed);
    if (leetcode) {
      return {
        type: 'leetcode' as const,
        label: `LeetCode 2D Array (${leetcode.edgeCount} edges${leetcode.isWeighted ? ', Weighted' : ''})`,
        edgesText: leetcode.edgesText,
      };
    }

    const parentArr = parseParentArrayFormat(trimmed);
    if (parentArr) {
      return {
        type: 'parent' as const,
        label: `Tree Parent Array (${parentArr.nodeCount} nodes, root: ${parentArr.root ?? '0'})`,
        edgesText: parentArr.edgesText,
      };
    }

    const parentChild = parseParentChildArrays(trimmed);
    if (parentChild) {
      return {
        type: 'parentChild' as const,
        label: `Parent & Child Arrays (${parentChild.edgeCount} edges)`,
        edgesText: parentChild.edgesText,
      };
    }

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    return {
      type: 'standard' as const,
      label: `Standard Edge List / Lines (${lines.length} lines)`,
      edgesText: trimmed,
    };
  }, [inputText]);

  const handleImport = () => {
    if (!detection) return;

    if (detection.type === 'multi') {
      onImportMulti(detection.multi.testcases);
      onClose();
      return;
    }

    onImportSingle(detection.edgesText);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 select-none animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`border rounded-2xl w-full max-w-xl max-h-[90dvh] overflow-hidden shadow-2xl flex flex-col transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className="text-blue-500 shrink-0" />
            <h3 className={`text-sm font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Import LeetCode & Multi-Testcase CP Input
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-3.5 overflow-y-auto overscroll-contain">
          {/* Quick Sample Chips */}
          <div>
            <label className={`text-[11px] font-medium block mb-1.5 ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
              Paste sample template or custom input:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_LEETCODE)}
                className={`text-[10.5px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                }`}
              >
                LeetCode [[u,v]]
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_WEIGHTED_LEETCODE)}
                className={`text-[10.5px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                }`}
              >
                LeetCode Weighted
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_PARENT_ARRAY)}
                className={`text-[10.5px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                }`}
              >
                Parent Array [-1,0,0...]
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_MULTI_TESTCASE)}
                className={`text-[10.5px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800 font-medium'
                    : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/30 text-blue-300 font-medium'
                }`}
              >
                Multi-Testcase (T=2)
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div
            className={`flex-1 min-h-[160px] border rounded-xl overflow-hidden focus-within:border-blue-500 ${
              isLight ? 'bg-white border-slate-300 shadow-inner' : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Paste any format:\n• LeetCode: [[0,1],[1,2],[2,0]]\n• Parent Array: parent = [-1, 0, 0, 1, 1, 2]\n• Multi-Testcase CP: First line T, followed by T testcases\n• Standard edges: u v [w]`}
              spellCheck={false}
              className={`w-full h-full p-3 bg-transparent text-xs font-mono focus:outline-none resize-none leading-relaxed ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-neutral-100 placeholder:text-neutral-600'
              }`}
            />
          </div>

          {/* Live Detection Info Badge */}
          {detection && (
            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all shrink-0 ${
                detection.type === 'multi'
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : isLight
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-blue-950/40 border-blue-500/30 text-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Check size={14} className={detection.type === 'multi' ? 'text-emerald-500' : 'text-blue-500'} />
                <span className="font-medium">{detection.label}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                {detection.type === 'multi' ? 'Will create separate tabs' : 'Auto-normalized'}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!detection}
            onClick={handleImport}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all shadow-sm cursor-pointer ${
              detection
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-neutral-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <span>{detection?.type === 'multi' ? 'Split into Tabs' : 'Import to Active Graph'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
