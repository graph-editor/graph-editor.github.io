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
  activeTool: 'select' | 'node' | 'edge';
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  isPhysicsActive: boolean;
  onTogglePhysics: () => void;
  pinnedCount: number;
  onUnpinAll: () => void;
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
  pinnedCount,
  onUnpinAll,
}) => {
  return (
    <footer className="h-8 border-t border-slate-800/80 bg-slate-950 px-2 sm:px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-20 shrink-0 overflow-x-auto scrollbar-none gap-2">
      {/* Left: Live Graph Statistics */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span>V: <strong className="text-blue-400 font-semibold">{stats.nodeCount}</strong></span>
          <span className="text-slate-700">|</span>
          <span>E: <strong className="text-indigo-400 font-semibold">{stats.edgeCount}</strong></span>
          <span className="text-slate-700">|</span>
          <span>Comp: <strong className="text-emerald-400 font-semibold">{stats.componentCount}</strong></span>
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
      <div className="hidden md:flex items-center gap-2 text-slate-400 font-sans">
        {activeTool === 'select' && (
          <span className="flex items-center gap-1.5">
            <MousePointer size={12} className="text-blue-400" />
            <span>Move Mode</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[10.5px]">Drag to reposition • Double-click node to fix/unpin</span>
          </span>
        )}
        {activeTool === 'node' && (
          <span className="flex items-center gap-1.5">
            <CircleDot size={12} className="text-blue-400" />
            <span>Add Node Mode</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[10.5px]">Click canvas to drop node • Press Esc to cancel</span>
          </span>
        )}
        {activeTool === 'edge' && (
          <span className="flex items-center gap-1.5">
            <Share2 size={12} className="text-blue-400" />
            <span>Connect Mode</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[10.5px]">Click source node, then click target node • Press Esc to cancel</span>
          </span>
        )}
      </div>

      {/* Right: Fixed node count, Zoom, Fit & Physics */}
      <div className="flex items-center gap-2">
        {pinnedCount > 0 && (
          <button
            onClick={onUnpinAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/50 transition-colors"
            title="Click to unpin all fixed nodes"
          >
            <Pin size={11} className="rotate-45" />
            <span>{pinnedCount} Fixed</span>
            <span className="text-[9.5px] text-amber-400/70 underline ml-0.5">Unpin</span>
          </button>
        )}

        <div className="w-[1px] h-3 bg-slate-800" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
          <button
            onClick={onZoomOut}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={onResetZoom}
            className="px-1 text-[10px] hover:text-white font-mono"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn size={12} />
          </button>
        </div>

        <button
          onClick={onFitView}
          className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Fit Graph to View (F)"
        >
          <Maximize2 size={13} />
        </button>

        <div className="w-[1px] h-3 bg-slate-800" />

        {/* Physics Simulation Toggle */}
        <button
          onClick={onTogglePhysics}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            isPhysicsActive
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Organic Physics Simulation (Space)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPhysicsActive ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
          <span>Physics</span>
        </button>
      </div>
    </footer>
  );
};
