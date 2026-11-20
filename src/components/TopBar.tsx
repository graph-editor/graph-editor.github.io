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
  PanelBottom,
  PanelRight,
  ChevronDown,
  LassoSelect,
} from 'lucide-react';
import { GraphSettings, LayoutMode } from '../types/graph';

interface TopBarProps {
  activeTool: 'select' | 'lasso' | 'node' | 'edge';
  onSelectTool: (tool: 'select' | 'lasso' | 'node' | 'edge') => void;
  settings: GraphSettings;
  onUpdateSettings: (newSettings: Partial<GraphSettings>) => void;
  onApplyLayout: (layout: LayoutMode) => void;
  onClearGraph: () => void;
  onToggleIndexMode: () => void;
  onOpenExportModal: () => void;
  onOpenShortcutsModal: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  tracerPosition?: 'right' | 'bottom';
  onToggleTracerPosition?: () => void;
  onGoHome?: () => void;
  onOpenDownloadModal?: () => void;
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
  tracerPosition = 'right',
  onToggleTracerPosition,
  onGoHome,
  onOpenDownloadModal,
}) => {
  return (
    <header className="h-13 border-b border-slate-800 bg-slate-950 px-2 sm:px-4 flex items-center justify-between z-20 select-none shrink-0 overflow-x-auto scrollbar-none gap-2">
      {/* Left: Brand / Logo + Main Editing Tools Group */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Brand */}
        <div 
          onClick={onGoHome}
          className={`flex items-center gap-2 ${onGoHome ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
          title={onGoHome ? 'Return to Home & Landing Page' : 'CP Graph Editor'}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Share2 size={16} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white font-sans hidden xs:inline">CP Graph</span>
            <span className="text-[9.5px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium px-1.5 py-0.5 rounded">
              PRO
            </span>
          </div>
        </div>

        <div className="w-[1px] h-5 bg-slate-800/80 hidden sm:block" />

        {/* Main Editing Tools (Move, Lasso, Add Node, Connect) on the LEFT SIDE */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectTool('select')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Move & Drag Nodes (V)"
          >
            <MousePointer size={13} />
            <span className="hidden md:inline">Move</span>
          </button>

          <button
            onClick={() => onSelectTool('lasso')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'lasso'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Lasso Select Nodes & Edges (L or Shift+Drag)"
          >
            <LassoSelect size={13} />
            <span className="hidden md:inline">Lasso</span>
          </button>

          <button
            onClick={() => onSelectTool('node')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'node'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Add Node (N)"
          >
            <CircleDot size={13} />
            <span className="hidden md:inline">Add Node</span>
          </button>

          <button
            onClick={() => onSelectTool('edge')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'edge'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Connect Edges (E)"
          >
            <Share2 size={13} />
            <span className="hidden md:inline">Connect</span>
          </button>
        </div>
      </div>

      {/* Right: CP Configuration Toggles & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* 1-indexed vs 0-indexed toggle */}
        <button
          onClick={onToggleIndexMode}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
            settings.isZeroIndexed
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
          }`}
          title="Toggle 0-indexed / 1-indexed"
        >
          <Hash size={12} />
          <span className="hidden sm:inline">{settings.isZeroIndexed ? '0-based' : '1-based'}</span>
          <span className="sm:hidden">{settings.isZeroIndexed ? '0b' : '1b'}</span>
        </button>

        {/* Directed vs Undirected toggle */}
        <button
          onClick={() => onUpdateSettings({ isDirected: !settings.isDirected })}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
            settings.isDirected
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title="Toggle Directed / Undirected (D)"
        >
          {settings.isDirected ? <ArrowRight size={12} /> : <Minus size={12} />}
          <span className="hidden lg:inline">{settings.isDirected ? 'Directed' : 'Undirected'}</span>
          <span className="lg:hidden">{settings.isDirected ? 'Dir' : 'Undir'}</span>
        </button>

        {/* Weighted vs Unweighted toggle */}
        <button
          onClick={() => onUpdateSettings({ isWeighted: !settings.isWeighted })}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
            settings.isWeighted
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title="Toggle Edge Weights (W)"
        >
          <span className="font-mono text-xs font-bold">W</span>
          <span className="hidden lg:inline">{settings.isWeighted ? 'Weighted' : 'Unweighted'}</span>
          <span className="lg:hidden">{settings.isWeighted ? 'W' : 'Unw'}</span>
        </button>

        {/* Layout dropdown */}
        <div className="relative flex items-center bg-slate-900 rounded-lg border border-slate-800 px-2 py-0.5 hover:border-slate-700 transition-colors">
          <LayoutGrid size={12} className="text-blue-400 mr-1.5 shrink-0 pointer-events-none" />
          <select
            value={settings.layout}
            onChange={e => onApplyLayout(e.target.value as LayoutMode)}
            className="appearance-none bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-4 py-0.5 font-medium max-w-[105px] sm:max-w-none"
            style={{ backgroundColor: 'transparent', color: '#e2e8f0' }}
          >
            <option value="force" className="bg-[#0f172a] text-white">Organic Force</option>
            <option value="tree" className="bg-[#0f172a] text-white">Hierarchical Tree</option>
            <option value="dag" className="bg-[#0f172a] text-white">Topological DAG</option>
            <option value="bipartite" className="bg-[#0f172a] text-white">Bipartite Columns</option>
            <option value="circular" className="bg-[#0f172a] text-white">Circular Ring</option>
            <option value="grid" className="bg-[#0f172a] text-white">Grid Lattice</option>
          </select>
          <ChevronDown size={11} className="text-slate-400 pointer-events-none absolute right-1.5" />
        </div>

        <div className="w-[1px] h-4 bg-slate-800 my-auto hidden sm:block" />

        {/* Export & Actions */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
          title="Export C++, Python, Text, Image"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          onClick={onClearGraph}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          title="Clear Graph"
        >
          <Trash2 size={15} />
        </button>

        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
          <button
            onClick={onToggleInspector}
            className={`p-1.5 rounded-md transition-colors ${
              isInspectorOpen
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={`Toggle Node Tracer (${tracerPosition === 'bottom' ? 'Bottom Dock' : 'Side Dock'})`}
          >
            <Sliders size={15} />
          </button>
          {onToggleTracerPosition && (
            <button
              onClick={onToggleTracerPosition}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
              title={`Switch Tracer to ${tracerPosition === 'bottom' ? 'Side Dock' : 'Bottom Dock'}`}
            >
              {tracerPosition === 'bottom' ? (
                <PanelBottom size={14} className="text-blue-400" />
              ) : (
                <PanelRight size={14} className="text-blue-400" />
              )}
            </button>
          )}
        </div>

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
