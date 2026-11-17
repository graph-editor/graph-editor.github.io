import React from 'react';
import {
  MousePointer,
  CircleDot,
  GitBranch,
  ArrowRight,
  Minus,
  Hash,
  Share2,
  Trash2,
  HelpCircle,
  LayoutGrid,
  Download,
  Sliders,
} from 'lucide-react';
import { GraphSettings, LayoutMode } from '../types/graph';

interface TopBarProps {
  activeTool: 'select' | 'node' | 'edge';
  onSelectTool: (tool: 'select' | 'node' | 'edge') => void;
  settings: GraphSettings;
  onUpdateSettings: (newSettings: Partial<GraphSettings>) => void;
  onApplyLayout: (layout: LayoutMode) => void;
  onClearGraph: () => void;
  onToggleIndexMode: () => void;
  onOpenExportModal: () => void;
  onOpenShortcutsModal: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTool,
  onSelectTool,
  settings,
  onUpdateSettings,
  onApplyLayout,
  onClearGraph,
  onToggleIndexMode,
  onOpenExportModal,
  onOpenShortcutsModal,
  isInspectorOpen,
  onToggleInspector,
}) => {
  return (
    <header className="h-13 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between z-20 select-none shrink-0">
      {/* Left: Brand / Logo + Main Editing Tools Group */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GitBranch size={16} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white font-sans">CP Graph</span>
            <span className="text-[9.5px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium px-1.5 py-0.5 rounded">
              PRO
            </span>
          </div>
        </div>

        <div className="w-[1px] h-5 bg-slate-800/80" />

        {/* Main Editing Tools (Move, Add Node, Connect) on the LEFT SIDE */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectTool('select')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Move & Drag Nodes (V)"
          >
            <MousePointer size={13} />
            <span>Move</span>
          </button>

          <button
            onClick={() => onSelectTool('node')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'node'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Add Node (N)"
          >
            <CircleDot size={13} />
            <span>Add Node</span>
          </button>

          <button
            onClick={() => onSelectTool('edge')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'edge'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Connect Edges (E)"
          >
            <Share2 size={13} />
            <span>Connect</span>
          </button>
        </div>
      </div>

      {/* Right: CP Configuration Toggles & Actions */}
      <div className="flex items-center gap-2">
        {/* 1-indexed vs 0-indexed toggle */}
        <button
          onClick={onToggleIndexMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
            settings.isZeroIndexed
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
          }`}
          title="Toggle 0-indexed / 1-indexed"
        >
          <Hash size={12} />
          <span>{settings.isZeroIndexed ? '0-based' : '1-based'}</span>
        </button>

        {/* Directed vs Undirected toggle */}
        <button
          onClick={() => onUpdateSettings({ isDirected: !settings.isDirected })}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
            settings.isDirected
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title="Toggle Directed / Undirected (D)"
        >
          {settings.isDirected ? <ArrowRight size={12} /> : <Minus size={12} />}
          <span>{settings.isDirected ? 'Directed' : 'Undirected'}</span>
        </button>

        {/* Weighted vs Unweighted toggle */}
        <button
          onClick={() => onUpdateSettings({ isWeighted: !settings.isWeighted })}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
            settings.isWeighted
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title="Toggle Edge Weights (W)"
        >
          <span className="font-mono text-xs font-bold">W</span>
          <span>{settings.isWeighted ? 'Weighted' : 'Unweighted'}</span>
        </button>

        {/* Layout dropdown */}
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 px-2 py-0.5">
          <LayoutGrid size={12} className="text-slate-400 mr-1.5" />
          <select
            value={settings.layout}
            onChange={e => onApplyLayout(e.target.value as LayoutMode)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer py-0.5"
          >
            <option value="force" className="bg-slate-900 text-white">Organic Force</option>
            <option value="tree" className="bg-slate-900 text-white">Hierarchical Tree</option>
            <option value="dag" className="bg-slate-900 text-white">Topological DAG</option>
            <option value="bipartite" className="bg-slate-900 text-white">Bipartite Columns</option>
            <option value="circular" className="bg-slate-900 text-white">Circular Ring</option>
            <option value="grid" className="bg-slate-900 text-white">Grid Lattice</option>
          </select>
        </div>

        <div className="w-[1px] h-4 bg-slate-800 my-auto" />

        {/* Export & Actions */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
          title="Export C++, Python, Text, Image"
        >
          <Download size={13} />
          <span>Export</span>
        </button>

        <button
          onClick={onClearGraph}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          title="Clear Graph"
        >
          <Trash2 size={15} />
        </button>

        <button
          onClick={onToggleInspector}
          className={`p-1.5 rounded-lg transition-colors ${
            isInspectorOpen ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Properties Inspector"
        >
          <Sliders size={15} />
        </button>

        <button
          onClick={onOpenShortcutsModal}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Keyboard & Mouse Shortcuts"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
