import React from 'react';
import { GraphStats } from '../types/graph';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Pin,
  AlertTriangle,
  Layers,
  MousePointer,
  CircleDot,
  Share2,
} from 'lucide-react';

interface BottomStatusBarProps {
  stats: GraphStats;
  activeTool: 'select' | 'lasso' | 'node' | 'edge';
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  isPhysicsActive: boolean;
  onTogglePhysics: () => void;
  theme?: 'dark' | 'light';
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  stats,
  activeTool,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  isPhysicsActive,
  onTogglePhysics,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  return (
    <footer className={`h-8 sm:h-9 border-t px-2 sm:px-3 flex items-center justify-between text-[11px] font-mono select-none z-20 shrink-0 overflow-x-auto no-scrollbar gap-2 transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-black border-neutral-800 text-neutral-400'
    }`}>
      {/* Left: Live Graph Statistics */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span>V: <strong className="text-blue-500 font-semibold">{stats.nodeCount}</strong></span>
          <span className={isLight ? 'text-slate-300' : 'text-neutral-700'}>|</span>
          <span>E: <strong className="text-indigo-500 font-semibold">{stats.edgeCount}</strong></span>
          <span className={`hidden xs:inline ${isLight ? 'text-slate-300' : 'text-neutral-700'}`}>|</span>
          <span className="hidden xs:inline">Comp: <strong className="text-emerald-500 font-semibold">{stats.componentCount}</strong></span>
        </div>

        {/* Status badges */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2">
          {stats.isTree && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-400 font-sans font-medium">
              Tree
            </span>
          )}
          {stats.isDAG && !stats.isTree && (
            <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-[10px] text-blue-400 font-sans font-medium">
              DAG
            </span>
          )}
          {stats.isBipartite && !stats.isTree && (
            <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-[10px] text-purple-400 font-sans font-medium">
              Bipartite
            </span>
          )}
          {stats.hasSelfLoops && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-[10px] text-amber-300 font-sans font-medium"
              title="Warning: Self-loops detected"
            >
              <AlertTriangle size={10} />
              <span>Self-Loop</span>
            </span>
          )}
          {stats.hasMultiEdges && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-[10px] text-amber-300 font-sans font-medium"
              title="Warning: Multi-edges between same node pair"
            >
              <AlertTriangle size={10} />
              <span>Multi-Edge</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: Active Tool & Mode Hint */}
      <div className={`hidden md:flex items-center gap-2 font-sans ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
        {activeTool === 'select' && (
          <span className="flex items-center gap-1.5">
            <MousePointer size={12} className="text-blue-500" />
            <span>Move Mode</span>
            <span className={isLight ? 'text-slate-300' : 'text-neutral-700'}>•</span>
            <span className="text-[10.5px]">Drag to reposition freely</span>
          </span>
        )}
        {activeTool === 'lasso' && (
          <span className="flex items-center gap-1.5">
            <Share2 size={12} className="text-blue-500" />
            <span>Lasso Mode</span>
            <span className={isLight ? 'text-slate-300' : 'text-neutral-700'}>•</span>
            <span className="text-[10.5px]">Draw freehand loop to multi-select</span>
          </span>
        )}
        {activeTool === 'node' && (
          <span className="flex items-center gap-1.5">
            <CircleDot size={12} className="text-blue-500" />
            <span>Add Node Mode</span>
            <span className={isLight ? 'text-slate-300' : 'text-neutral-700'}>•</span>
            <span className="text-[10.5px]">Click canvas to drop node • Press Esc to cancel</span>
          </span>
        )}
        {activeTool === 'edge' && (
          <span className="flex items-center gap-1.5">
            <Share2 size={12} className="text-blue-500" />
            <span>Connect Mode</span>
            <span className={isLight ? 'text-slate-300' : 'text-neutral-700'}>•</span>
            <span className="text-[10.5px]">Click source node, then click target node • Press Esc to cancel</span>
          </span>
        )}
      </div>

      {/* Right: Zoom, Fit & Physics */}
      <div className="flex items-center gap-2">

        {/* Zoom Controls */}
        <div className={`flex items-center gap-1 px-1 py-0.5 rounded border ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-neutral-900 border-neutral-800 text-neutral-300'
        }`}>
          <button
            onClick={onZoomOut}
            className={`p-1 rounded transition-colors cursor-pointer ${isLight ? 'hover:text-slate-900 hover:bg-slate-200' : 'hover:text-white hover:bg-neutral-800'}`}
            title="Zoom Out (-)"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={onResetZoom}
            className={`px-1 text-[10px] font-mono cursor-pointer ${isLight ? 'hover:text-slate-900' : 'hover:text-white'}`}
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className={`p-1 rounded transition-colors cursor-pointer ${isLight ? 'hover:text-slate-900 hover:bg-slate-200' : 'hover:text-white hover:bg-neutral-800'}`}
            title="Zoom In (+)"
          >
            <ZoomIn size={12} />
          </button>
        </div>

        <button
          onClick={onFitView}
          className={`p-1 rounded transition-colors cursor-pointer ${isLight ? 'hover:text-slate-900 hover:bg-slate-100' : 'hover:text-white hover:bg-neutral-800'}`}
          title="Fit Graph to View (F)"
        >
          <Maximize2 size={13} />
        </button>

        <div className={`w-[1px] h-3 ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />

        {/* Physics Simulation Toggle */}
        <button
          onClick={onTogglePhysics}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            isPhysicsActive
              ? isLight
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
              : isLight
              ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title="Toggle Organic Physics Simulation (Space)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPhysicsActive ? 'bg-blue-500 animate-pulse' : isLight ? 'bg-slate-400' : 'bg-neutral-600'}`} />
          <span>Physics</span>
        </button>
      </div>
    </footer>
  );
};
