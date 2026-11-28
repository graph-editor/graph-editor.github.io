import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MousePointer,
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
  Sun,
  Moon,
  Undo2,
  Redo2,
  Link2,
  PanelLeft,
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
  onOpenShareModal?: () => void;
  onOpenShortcutsModal: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  tracerPosition?: 'right' | 'bottom';
  onToggleTracerPosition?: () => void;
  onGoHome?: () => void;
  onOpenDownloadModal?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isLeftPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
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
  onOpenShareModal,
  onOpenShortcutsModal,
  isInspectorOpen,
  onToggleInspector,
  tracerPosition = 'right',
  onToggleTracerPosition,
  onGoHome,
  onOpenDownloadModal,
  theme = 'dark',
  onToggleTheme,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isLeftPanelCollapsed = false,
  onToggleLeftPanel,
}) => {
  const isLight = theme === 'light';
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const updateDropdownPos = useCallback(() => {
    if (triggerButtonRef.current) {
      const rect = triggerButtonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.visualViewport?.height || window.innerHeight;
      const menuWidth = Math.min(224, vw - 16);
      const estMenuHeight = 290;
      let left = rect.left;
      if (left + menuWidth > vw - 8) {
        left = vw - menuWidth - 8;
      }
      if (left < 8) left = 8;

      const spaceBelow = vh - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      if (spaceBelow < estMenuHeight && spaceAbove > spaceBelow) {
        setDropdownPos({
          bottom: vh - rect.top + 6,
          left,
          maxHeight: Math.max(160, spaceAbove),
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 6,
          left,
          maxHeight: Math.max(180, spaceBelow),
        });
      }
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
    const handleResize = () => {
      setIsLayoutDropdownOpen(false);
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (
        target &&
        ((dropdownMenuRef.current && dropdownMenuRef.current.contains(target)) ||
          (headerRef.current && headerRef.current.contains(target)))
      ) {
        return;
      }
      setIsLayoutDropdownOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLayoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLayoutDropdownOpen]);

  const activeLayout = LAYOUT_OPTIONS.find(l => l.id === settings.layout) || LAYOUT_OPTIONS[0];
  return (
    <header
      ref={headerRef}
      className={`min-h-13 border-b safe-x safe-top flex items-center justify-between z-30 select-none shrink-0 gap-1.5 sm:gap-2 2xl:gap-3 relative transition-colors overflow-x-auto no-scrollbar scroll-smooth ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
      }`}
    >
      {/* Left: Mobile Drawer Toggle + Brand + Main Editing Tools Group */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {onToggleLeftPanel && (
          <button
            type="button"
            onClick={onToggleLeftPanel}
            aria-label="Toggle editor and algorithm panel"
            aria-expanded={!isLeftPanelCollapsed}
            className={`sm:hidden flex items-center justify-center p-1.5 rounded-lg border transition-colors cursor-pointer touch-target-compact ${
              !isLeftPanelCollapsed
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
            }`}
            title={!isLeftPanelCollapsed ? 'Close Editor Panel' : 'Open Editor & Algorithms'}
          >
            <PanelLeft size={16} />
          </button>
        )}
        <h1 className="sr-only">CP Graph Visualizer &amp; Editor — Online Graph Drawing Tool</h1>
        {/* Brand (real semantic anchor for mobile & desktop crawlers + SPA handler) */}
        <a
          href="./about.html"
          onClick={e => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              onGoHome?.();
            }
          }}
          className={`flex items-center gap-1.5 ${onGoHome ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
          title={onGoHome ? 'About CP Graph & Desktop Downloads' : 'CP Graph Editor'}
        >
          <span className="sr-only">About CP Graph Visualizer &amp; Editor</span>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Share2 size={16} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm tracking-tight font-sans hidden sm:inline ${isLight ? 'text-slate-900' : 'text-white'}`}>CP Graph</span>
            <span className="text-[9.5px] bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono font-medium px-1.5 py-0.5 rounded hidden xs:inline">
              PRO
            </span>
          </div>
        </a>

        <div className={`w-[1px] h-5 hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />

        {/* Main Editing Tools (Move, Lasso, Add Node, Connect) on the LEFT SIDE */}
        <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border transition-colors shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-neutral-900 border-neutral-800'
        }`}>
          <button
            onClick={() => onSelectTool('select')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer touch-target-compact ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Move & Drag Nodes (V)"
          >
            <MousePointer size={14} />
            <span className="hidden md:inline">Move</span>
          </button>

          <button
            onClick={() => onSelectTool('lasso')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer touch-target-compact ${
              activeTool === 'lasso'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Lasso Select Nodes & Edges (L or Shift+Drag)"
          >
            <LassoSelect size={14} />
            <span className="hidden md:inline">Lasso</span>
          </button>
        </div>

        {/* Undo & Redo History Controls */}
        <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border transition-colors shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-neutral-900 border-neutral-800'
        }`}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-medium transition-all touch-target-compact ${
              !canUndo
                ? isLight
                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                  : 'text-neutral-600 cursor-not-allowed opacity-40'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200 cursor-pointer active:scale-95'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer active:scale-95'
            }`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-medium transition-all touch-target-compact ${
              !canRedo
                ? isLight
                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                  : 'text-neutral-600 cursor-not-allowed opacity-40'
                : isLight
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200 cursor-pointer active:scale-95'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer active:scale-95'
            }`}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      {/* Right: CP Configuration Toggles, Theme Switcher & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* 1-indexed vs 0-indexed toggle */}
        <button
          onClick={onToggleIndexMode}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors border cursor-pointer ${
            settings.isZeroIndexed
              ? isLight
                ? 'bg-purple-100 border-purple-300 text-purple-800 font-bold'
                : 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              : isLight
              ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold'
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
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
            settings.isDirected
              ? isLight
                ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : isLight
              ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Toggle Directed / Undirected (D)"
        >
          {settings.isDirected ? <ArrowRight size={12} /> : <Minus size={12} />}
          <span className="hidden xl:inline">{settings.isDirected ? 'Directed' : 'Undirected'}</span>
          <span className="xl:hidden">{settings.isDirected ? 'Dir' : 'Undir'}</span>
        </button>

        {/* Weighted vs Unweighted toggle */}
        <button
          onClick={() => onUpdateSettings({ isWeighted: !settings.isWeighted })}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
            settings.isWeighted
              ? isLight
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : isLight
              ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Toggle Edge Weights (W)"
        >
          <span className="font-mono text-xs font-bold">W</span>
          <span className="hidden xl:inline">{settings.isWeighted ? 'Weighted' : 'Unweighted'}</span>
          <span className="xl:hidden">{settings.isWeighted ? 'W' : 'Unw'}</span>
        </button>

        {/* Custom Sleek Layout Dropdown Popover */}
        <div className="relative">
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={toggleDropdown}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-lg border px-2 sm:px-2.5 py-1 transition-all shadow-sm cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 hover:border-slate-300'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800 hover:border-neutral-700'
            }`}
            title="Auto-organize graph layout"
          >
            {activeLayout.icon}
            <span className="max-w-[78px] sm:max-w-[100px] xl:max-w-none truncate">{activeLayout.label}</span>
            <ChevronDown
              size={11}
              className={`transition-transform ${isLayoutDropdownOpen ? 'rotate-180 text-blue-500' : isLight ? 'text-slate-500' : 'text-neutral-400'}`}
            />
          </button>

          {isLayoutDropdownOpen && dropdownPos && createPortal(
            <div
              ref={dropdownMenuRef}
              style={{
                position: 'fixed',
                ...(dropdownPos.top !== undefined ? { top: `${dropdownPos.top}px` } : {}),
                ...(dropdownPos.bottom !== undefined ? { bottom: `${dropdownPos.bottom}px` } : {}),
                left: `${dropdownPos.left}px`,
                width: 'min(224px, calc(100vw - 16px))',
                maxHeight: `${dropdownPos.maxHeight}px`,
                zIndex: 9999,
              }}
              className={`backdrop-blur-xl border rounded-xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 pointer-events-auto overflow-y-auto overscroll-contain ${
                isLight ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-neutral-950/95 border-neutral-800 text-white'
              }`}
            >
              <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider border-b mb-1 flex items-center justify-between ${
                isLight ? 'text-slate-500 border-slate-100' : 'text-neutral-400 border-neutral-800/80'
              }`}>
                <span>Graph Layouts</span>
                <span className={`text-[9px] font-normal ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>Auto-arrange</span>
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
                        ? isLight
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                          : 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                        : isLight
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <div className="text-left">
                        <div className="leading-tight">{opt.label}</div>
                        <div className={`text-[9.5px] ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={13} className="text-blue-500 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
        </div>

        {/* Theme Switcher: Dark Black & Clean White */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer shrink-0 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-2xs'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200 shadow-2xs'
            }`}
            title={isLight ? 'Switch to Dark Black Theme' : 'Switch to Clean White Theme'}
          >
            {isLight ? (
              <>
                <Moon size={13} className="text-indigo-600 shrink-0" />
                <span className="hidden xl:inline font-medium">Dark Black</span>
              </>
            ) : (
              <>
                <Sun size={13} className="text-amber-400 shrink-0" />
                <span className="hidden xl:inline font-medium">Clean White</span>
              </>
            )}
          </button>
        )}

        <div className={`w-[1px] h-4 my-auto hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />

        {/* Share Link Button */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all border shadow-xs cursor-pointer ${
              isLight
                ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/30 text-blue-300'
            }`}
            title="Share Graph via Compressed URL Link"
          >
            <Link2 size={13} />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Export & Actions */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer"
          title="Export C++, Python, Text, Image"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          onClick={onClearGraph}
          className={`p-1.5 touch-target-compact flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              : 'text-neutral-400 hover:text-red-400 hover:bg-red-950/30'
          }`}
          title="Clear Graph"
          aria-label="Clear Graph"
        >
          <Trash2 size={15} />
        </button>

        <div className={`flex items-center rounded-lg border p-0.5 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-neutral-900 border-neutral-800'
        }`}>
          <button
            onClick={onToggleInspector}
            className={`p-1.5 touch-target-compact flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              isInspectorOpen
                ? isLight
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title={`Toggle Node Tracer (${tracerPosition === 'bottom' ? 'Bottom Dock' : 'Side Dock'})`}
            aria-label="Toggle Node Tracer"
          >
            <Sliders size={15} />
          </button>
          {onToggleTracerPosition && (
            <button
              onClick={onToggleTracerPosition}
              className={`p-1.5 touch-target-compact flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title={`Switch Tracer to ${tracerPosition === 'bottom' ? 'Side Dock' : 'Bottom Dock'}`}
              aria-label="Switch Tracer Position"
            >
              {tracerPosition === 'bottom' ? (
                <PanelBottom size={14} className="text-blue-500" />
              ) : (
                <PanelRight size={14} className="text-blue-500" />
              )}
            </button>
          )}
        </div>

        <button
          onClick={onOpenShortcutsModal}
          className={`p-1.5 touch-target-compact flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
          title="Keyboard & Mouse Shortcuts"
          aria-label="Keyboard and touch shortcuts"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
