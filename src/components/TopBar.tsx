import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Sparkles,
  Workflow,
  Columns,
  Circle,
  Check,
} from 'lucide-react';
import { GraphSettings, LayoutMode } from '../types/graph';

const LAYOUT_OPTIONS: { id: LayoutMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'force', label: 'Organic Force', icon: <Sparkles size={13} className="text-blue-400 shrink-0" />, desc: 'Physics simulation' },
  { id: 'tree', label: 'Hierarchical Tree', icon: <GitBranch size={13} className="text-emerald-400 shrink-0" />, desc: 'Rooted tree layers' },
  { id: 'dag', label: 'Topological DAG', icon: <Workflow size={13} className="text-indigo-400 shrink-0" />, desc: 'Dependency hierarchy' },
  { id: 'bipartite', label: 'Bipartite Columns', icon: <Columns size={13} className="text-amber-400 shrink-0" />, desc: 'Two partitioned sets' },
  { id: 'circular', label: 'Circular Ring', icon: <Circle size={13} className="text-purple-400 shrink-0" />, desc: 'Radial chord ring' },
  { id: 'grid', label: 'Grid Lattice', icon: <LayoutGrid size={13} className="text-cyan-400 shrink-0" />, desc: 'Row-column matrix' },
];

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
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  const updateDropdownPos = useCallback(() => {
    if (triggerButtonRef.current) {
      const rect = triggerButtonRef.current.getBoundingClientRect();
      const menuWidth = 216;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (left < 8) left = 8;
      setDropdownPos({
        top: rect.bottom + 6,
        left,
      });
    }
  }, []);

  const toggleDropdown = () => {
    if (!isLayoutDropdownOpen) {
      updateDropdownPos();
      setIsLayoutDropdownOpen(true);
    } else {
      setIsLayoutDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (!isLayoutDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        setIsLayoutDropdownOpen(false);
      }
    };
    const handleWindowEvents = () => {
      setIsLayoutDropdownOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLayoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLayoutDropdownOpen]);

  const activeLayout = LAYOUT_OPTIONS.find(l => l.id === settings.layout) || LAYOUT_OPTIONS[0];
  return (
    <header className="h-13 border-b border-slate-800 bg-slate-950 px-2 sm:px-4 flex items-center justify-between z-30 select-none shrink-0 gap-2 relative">
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

        {/* Custom Sleek Layout Dropdown Popover */}
        <div className="relative">
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={toggleDropdown}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-slate-800 hover:border-slate-700 px-2.5 py-1 transition-all shadow-sm cursor-pointer"
            title="Auto-organize graph layout"
          >
            {activeLayout.icon}
            <span className="max-w-[95px] sm:max-w-none truncate">{activeLayout.label}</span>
            <ChevronDown
              size={11}
              className={`text-slate-400 transition-transform ${isLayoutDropdownOpen ? 'rotate-180 text-blue-400' : ''}`}
            />
          </button>

          {isLayoutDropdownOpen && dropdownPos && createPortal(
            <div
              ref={dropdownMenuRef}
              style={{
                position: 'fixed',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                width: '216px',
                zIndex: 9999,
              }}
              className="bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 pointer-events-auto"
            >
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1 flex items-center justify-between">
                <span>Graph Layouts</span>
                <span className="text-[9px] text-slate-500 font-normal">Auto-arrange</span>
              </div>
              {LAYOUT_OPTIONS.map(opt => {
                const isSelected = settings.layout === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onApplyLayout(opt.id);
                      setIsLayoutDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <div className="text-left">
                        <div className="leading-tight">{opt.label}</div>
                        <div className="text-[9.5px] text-slate-500">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={13} className="text-blue-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
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
