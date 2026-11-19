import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GraphNode, GraphEdge, GraphSettings, GraphData, AlgorithmType } from '../types/graph';
import { CP_PALETTE, CODEFORCES_TIER_COLORS, detectNodeType } from '../utils/parser';
import {
  Trash2,
  ArrowLeftRight,
  X,
  Pin,
  Sliders,
  PanelBottom,
  PanelRight,
  Settings,
  Play,
  Check,
  Network,
} from 'lucide-react';

export interface PropertiesInspectorProps {
  position?: 'right' | 'bottom';
  onPositionChange?: (position: 'right' | 'bottom') => void;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  settings: GraphSettings;
  data?: GraphData;
  onUpdateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSetTreeRoot: (nodeId: string) => void;
  onTogglePinNode: (nodeId: string) => void;
  onRunAlgorithm?: (algo: AlgorithmType, startNodeId: string) => void;
  onSelectNode?: (nodeId: string | null) => void;
  onClose: () => void;
}

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  position = 'right',
  onPositionChange,
  selectedNode,
  selectedEdge,
  settings,
  data,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onSetTreeRoot,
  onTogglePinNode,
  onRunAlgorithm,
  onSelectNode,
  onClose,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Bottom dock resizable height state
  const [bottomHeight, setBottomHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cp_graph_tracer_bottom_height');
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num >= 180 && num <= 500) return num;
      }
    }
    return 260;
  });

  // Handle outside click to close settings popover
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSettingsOpen]);

  // Handle bottom dock resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const nextHeight = Math.min(500, Math.max(180, startHeight + deltaY));
      setBottomHeight(nextHeight);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const deltaY = startY - upEvent.clientY;
      const finalHeight = Math.min(500, Math.max(180, startHeight + deltaY));
      try {
        localStorage.setItem('cp_graph_tracer_bottom_height', String(finalHeight));
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Node Connections & Degree calculation for live tracing
  const nodeConnections = useMemo(() => {
    if (!selectedNode || !data) {
      return { neighbors: [], inDegree: 0, outDegree: 0, totalDegree: 0 };
    }
    const neighbors: {
      id: string;
      label: string;
      edgeId: string;
      dir: 'outgoing' | 'incoming' | 'undirected';
      weight?: number;
    }[] = [];
    let inDegree = 0;
    let outDegree = 0;

    data.edges.forEach(edge => {
      if (edge.source === selectedNode.id && edge.target === selectedNode.id) {
        // Self loop
        inDegree++;
        outDegree++;
        neighbors.push({
          id: selectedNode.id,
          label: selectedNode.label,
          edgeId: edge.id,
          dir: 'outgoing',
          weight: edge.weight,
        });
      } else if (edge.source === selectedNode.id) {
        outDegree++;
        const targetNode = data.nodes.find(n => n.id === edge.target);
        if (targetNode) {
          neighbors.push({
            id: targetNode.id,
            label: targetNode.label,
            edgeId: edge.id,
            dir: edge.directed ? 'outgoing' : 'undirected',
            weight: edge.weight,
          });
        }
      } else if (edge.target === selectedNode.id) {
        inDegree++;
        const sourceNode = data.nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          neighbors.push({
            id: sourceNode.id,
            label: sourceNode.label,
            edgeId: edge.id,
            dir: edge.directed ? 'incoming' : 'undirected',
            weight: edge.weight,
          });
        }
      }
    });

    const totalDegree = settings.isDirected ? inDegree + outDegree : neighbors.length;
    return { neighbors, inDegree, outDegree, totalDegree };
  }, [selectedNode, data, settings.isDirected]);

  const isBottom = position === 'bottom';

  // Node type and badge styling
  const nodeType = selectedNode
    ? (selectedNode.nodeType || detectNodeType(selectedNode.label || selectedNode.id))
    : 'int';

  const typeBadgeStyles = {
    int: 'bg-blue-950/70 border-blue-500/50 text-blue-300',
    char: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
    bool: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
    string: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
  }[nodeType] || 'bg-slate-800 border-slate-700 text-slate-300';

  // Common Header Content
  const renderHeader = () => (
    <div
      className={`border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/50 shrink-0 ${
        isBottom ? 'h-10' : 'h-12'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sliders size={14} className="text-blue-400 shrink-0" />
        <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider truncate">
          {selectedNode
            ? `Node Tracer • ${selectedNode.label}`
            : selectedEdge
            ? 'Edge Tracer'
            : 'Node Tracer'}
        </h4>
        {selectedNode && (
          <span
            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider shrink-0 ${typeBadgeStyles}`}
          >
            {nodeType}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Choice buttons: Bottom or Side */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <button
            type="button"
            onClick={() => onPositionChange?.('bottom')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
              position === 'bottom'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Dock Tracer to Bottom"
          >
            <PanelBottom size={12} />
            <span className="hidden sm:inline">Bottom</span>
          </button>
          <button
            type="button"
            onClick={() => onPositionChange?.('right')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
              position === 'right'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Dock Tracer to Right Side"
          >
            <PanelRight size={12} />
            <span className="hidden sm:inline">Side</span>
          </button>
        </div>

        {/* Setting Button with popover */}
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-lg transition-colors border ${
              isSettingsOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
            title="Tracer Position Settings"
          >
            <Settings size={14} />
          </button>

          {isSettingsOpen && (
            <div
              className={`absolute right-0 ${
                isBottom ? 'top-full mt-1.5' : 'top-full mt-2'
              } w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-200 space-y-2.5 animate-in fade-in zoom-in-95`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  Tracer Setup
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X size={12} />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">
                  Open Node Tracer On:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onPositionChange?.('bottom');
                      setIsSettingsOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      position === 'bottom'
                        ? 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <PanelBottom size={13} />
                    <span>Bottom</span>
                    {position === 'bottom' && <Check size={12} className="text-blue-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onPositionChange?.('right');
                      setIsSettingsOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      position === 'right'
                        ? 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <PanelRight size={13} />
                    <span>Right Side</span>
                    {position === 'right' && <Check size={12} className="text-blue-400" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-normal">
                When you press on any node in the graph, this tracer will automatically open at your preferred position (<strong className="text-slate-200">{position === 'bottom' ? 'Bottom' : 'Right Side'}</strong>).
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close Tracer (Esc)"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );

  // Fallback if neither node nor edge is selected
  if (!selectedNode && !selectedEdge) {
    return (
      <aside
        style={isBottom ? { height: `${bottomHeight}px` } : undefined}
        className={`${
          isBottom
            ? 'w-full border-t border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 overflow-hidden shadow-2xl'
            : 'w-80 border-l border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 h-full overflow-hidden shadow-2xl'
        }`}
      >
        {isBottom && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="h-1.5 w-full bg-slate-800/60 hover:bg-blue-500 cursor-ns-resize transition-colors shrink-0 group flex items-center justify-center"
            title="Drag to resize bottom tracer height"
          >
            <div className="w-12 h-0.5 bg-slate-600 group-hover:bg-blue-300 rounded-full" />
          </div>
        )}
        {renderHeader()}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <div className="w-10 h-10 rounded-full bg-slate-800/70 flex items-center justify-center text-blue-400 mb-2.5">
            <Sliders size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-200 mb-1">Node Tracer is Ready</p>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Click on any node in the canvas to trace its properties, adjacent vertices, and launch algorithm traversals.
          </p>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // BOTTOM DOCKED VIEW (Horizontal multi-column layout)
  // -------------------------------------------------------------
  if (isBottom) {
    return (
      <aside
        style={{ height: `${bottomHeight}px` }}
        className="w-full border-t border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 overflow-hidden shadow-2xl animate-slide-up"
      >
        {/* Top Resize Handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="h-1.5 w-full bg-slate-800/60 hover:bg-blue-500 cursor-ns-resize transition-colors shrink-0 group flex items-center justify-center"
          title="Drag to resize bottom tracer height"
        >
          <div className="w-12 h-0.5 bg-slate-600 group-hover:bg-blue-300 rounded-full" />
        </div>

        {renderHeader()}

        {/* Horizontal Body Content */}
        <div className="flex-1 p-3.5 px-4 overflow-x-auto overflow-y-auto flex flex-row gap-5 items-start divide-x divide-slate-800/60 min-w-max">
          {/* NODE VIEW - Horizontal columns */}
          {selectedNode && (
            <>
              {/* Column 1: Node Identifier & Type Presets */}
              <div className="w-52 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-400">Node Identifier</label>
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${typeBadgeStyles}`}>
                    {nodeType}
                  </span>
                </div>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="e.g. A, true, 42, Alice"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 mr-0.5">Preset:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'A' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  >
                    Char ('A')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: selectedNode.label === 'true' ? 'false' : 'true' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-900/50 transition-colors"
                  >
                    Bool
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Int ('1')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                  >
                    String
                  </button>
                </div>
              </div>

              {/* Column 2: Pin State & Vertex Value & Tree Root */}
              <div className="w-52 shrink-0 pl-5 space-y-2">
                <button
                  type="button"
                  onClick={() => onTogglePinNode(selectedNode.id)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                    selectedNode.isPinned
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-inner'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Pin size={13} className={selectedNode.isPinned ? 'rotate-45 text-amber-400' : ''} />
                  <span>{selectedNode.isPinned ? 'Fixed (Pinned)' : 'Fix Position (Pin)'}</span>
                </button>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Vertex Value / Weight</label>
                  <input
                    type="number"
                    value={selectedNode.value ?? ''}
                    placeholder="e.g. 10"
                    onChange={e =>
                      onUpdateNode(selectedNode.id, {
                        value: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onSetTreeRoot(selectedNode.id)}
                  className="w-full py-1 px-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs rounded-lg transition-colors text-center font-medium"
                >
                  Set as Tree Root
                </button>
              </div>

              {/* Column 3: Color Selection */}
              <div className="w-64 shrink-0 pl-5 space-y-1.5">
                <label className="text-[11px] font-medium text-slate-400 block">Node Color</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CP_PALETTE.map(p => (
                    <button
                      type="button"
                      key={p.color}
                      onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                      className={`w-6 h-6 rounded-lg transition-transform border ${
                        selectedNode.color === p.color
                          ? 'scale-110 border-white ring-2 ring-blue-500/50'
                          : 'border-slate-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>

                <div className="text-[10px] text-slate-500 pt-1">Codeforces Tiers:</div>
                <div className="grid grid-cols-2 gap-1">
                  {CODEFORCES_TIER_COLORS.slice(0, 4).map(cf => (
                    <button
                      type="button"
                      key={cf.color}
                      onClick={() => onUpdateNode(selectedNode.id, { color: cf.color })}
                      className="px-1.5 py-0.5 text-[9.5px] rounded border border-slate-800 truncate text-slate-200 hover:border-slate-600 text-left"
                      style={{ borderLeftColor: cf.color, borderLeftWidth: 3 }}
                      title={cf.name}
                    >
                      {cf.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 4: Node Tracer Details (Neighbors & Quick Trace) */}
              <div className="w-72 shrink-0 pl-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                    <Network size={13} className="text-blue-400" />
                    <span>Connections ({nodeConnections.totalDegree})</span>
                  </div>
                  {settings.isDirected ? (
                    <span className="text-[10px] font-mono text-slate-400">
                      In: {nodeConnections.inDegree} | Out: {nodeConnections.outDegree}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">
                      Degree: {nodeConnections.totalDegree}
                    </span>
                  )}
                </div>

                {/* Neighbor chips */}
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {nodeConnections.neighbors.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">No connected edges (Isolated)</span>
                  ) : (
                    nodeConnections.neighbors.map((n, idx) => (
                      <button
                        type="button"
                        key={`${n.edgeId}-${idx}`}
                        onClick={() => onSelectNode?.(n.id)}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 hover:border-blue-500/60 text-slate-300 flex items-center gap-1 font-mono transition-colors"
                        title={`Click to trace Node ${n.label}`}
                      >
                        <span className="text-blue-400">
                          {n.dir === 'outgoing' ? '→' : n.dir === 'incoming' ? '←' : '—'}
                        </span>
                        <span>{n.label}</span>
                        {n.weight !== undefined && (
                          <span className="text-slate-500 text-[9px]">w:{n.weight}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Quick Algorithm Trace Launcher */}
                {onRunAlgorithm && (
                  <div className="pt-1.5 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block mb-1">Quick Algorithm Trace:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRunAlgorithm('bfs', selectedNode.id)}
                        className="flex-1 py-1 px-2 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Run BFS traversal starting from this node"
                      >
                        <Play size={10} className="fill-blue-300" />
                        <span>Trace BFS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRunAlgorithm('dfs', selectedNode.id)}
                        className="flex-1 py-1 px-2 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Run DFS traversal starting from this node"
                      >
                        <Play size={10} className="fill-indigo-300" />
                        <span>Trace DFS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 5: Delete Node Action */}
              <div className="w-28 shrink-0 pl-5 flex flex-col justify-start">
                <button
                  type="button"
                  onClick={() => onDeleteNode(selectedNode.id)}
                  className="w-full py-2 px-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/20 flex items-center justify-center gap-1.5 text-xs"
                  title="Delete Node (Del)"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}

          {/* EDGE VIEW - Horizontal columns */}
          {selectedEdge && (
            <>
              <div className="w-48 shrink-0 space-y-2">
                <div className="text-[11px] font-medium text-slate-400">Edge Direction</div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-between">
                  <strong className="text-blue-400">{selectedEdge.source}</strong>
                  <span>{selectedEdge.directed ? '→' : '—'}</span>
                  <strong className="text-blue-400">{selectedEdge.target}</strong>
                </div>
                {settings.isDirected && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEdge(selectedEdge.id, {
                        source: selectedEdge.target,
                        target: selectedEdge.source,
                      })
                    }
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeftRight size={13} />
                    <span>Reverse</span>
                  </button>
                )}
              </div>

              <div className="w-44 shrink-0 pl-5 space-y-2">
                <label className="text-[11px] font-medium text-slate-400 block">Edge Weight</label>
                <input
                  type="number"
                  value={selectedEdge.weight ?? ''}
                  placeholder="e.g. 5"
                  onChange={e =>
                    onUpdateEdge(selectedEdge.id, {
                      weight: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="w-56 shrink-0 pl-5 space-y-2">
                <label className="text-[11px] font-medium text-slate-400 block">Edge Color</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CP_PALETTE.map(p => (
                    <button
                      type="button"
                      key={p.color}
                      onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                      className={`w-6 h-6 rounded-lg transition-transform border ${
                        selectedEdge.color === p.color
                          ? 'scale-110 border-white ring-2 ring-blue-500/50'
                          : 'border-slate-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div className="w-28 shrink-0 pl-5 flex flex-col justify-start">
                <button
                  type="button"
                  onClick={() => onDeleteEdge(selectedEdge.id)}
                  className="w-full py-2 px-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/20 flex items-center justify-center gap-1.5 text-xs"
                  title="Delete Edge (Del)"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // RIGHT SIDE DOCKED VIEW (Vertical stacked column layout)
  // -------------------------------------------------------------
  return (
    <aside className="w-80 border-l border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 h-full overflow-hidden shadow-2xl animate-slide-left">
      {renderHeader()}

      {/* Docked Body: Scrollable */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* NODE PROPERTIES */}
        {selectedNode && (
          <div className="space-y-4">
            {/* Label / Name with Type Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-slate-400">Node Identifier</label>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${typeBadgeStyles}`}
                >
                  {nodeType}
                </span>
              </div>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono mb-1.5"
                placeholder="e.g. A, true, 42, Alice"
              />
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-slate-500 mr-0.5">Preset:</span>
                <button
                  type="button"
                  onClick={() => onUpdateNode(selectedNode.id, { label: 'A' })}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/50 transition-colors"
                >
                  Char ('A')
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNode(selectedNode.id, {
                      label: selectedNode.label === 'true' ? 'false' : 'true',
                    })
                  }
                  className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-900/50 transition-colors"
                >
                  Bool ({selectedNode.label === 'true' ? 'false' : 'true'})
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                >
                  Int ('1')
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                >
                  String
                </button>
              </div>
            </div>

            {/* Fixed / Pin Position Toggle */}
            <div>
              <button
                type="button"
                onClick={() => onTogglePinNode(selectedNode.id)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${
                  selectedNode.isPinned
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-inner'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Pin size={14} className={selectedNode.isPinned ? 'rotate-45 text-amber-400' : ''} />
                <span>
                  {selectedNode.isPinned ? 'Fixed (Double-click to unpin)' : 'Fix Position (Pin node)'}
                </span>
              </button>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                {selectedNode.isPinned
                  ? 'Position is locked and immune to movement'
                  : 'Double-click node anytime on canvas to fix it'}
              </p>
            </div>

            {/* Node Value / Weight */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Vertex Value / Weight
              </label>
              <input
                type="number"
                value={selectedNode.value ?? ''}
                placeholder="e.g. 10"
                onChange={e =>
                  onUpdateNode(selectedNode.id, {
                    value: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Node Connections & Tracing */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Network size={14} className="text-blue-400" />
                  <span>Connections & Degree</span>
                </div>
                {settings.isDirected ? (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    In: {nodeConnections.inDegree} | Out: {nodeConnections.outDegree}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    Deg: {nodeConnections.totalDegree}
                  </span>
                )}
              </div>

              {/* Neighbor Chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">Adjacent Vertices:</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {nodeConnections.neighbors.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">No connected edges (Isolated)</span>
                  ) : (
                    nodeConnections.neighbors.map((n, idx) => (
                      <button
                        type="button"
                        key={`${n.edgeId}-${idx}`}
                        onClick={() => onSelectNode?.(n.id)}
                        className="px-2 py-1 rounded text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/60 text-slate-300 flex items-center gap-1.5 font-mono transition-colors"
                        title={`Click to trace Node ${n.label}`}
                      >
                        <span className="text-blue-400">
                          {n.dir === 'outgoing' ? '→' : n.dir === 'incoming' ? '←' : '—'}
                        </span>
                        <span>{n.label}</span>
                        {n.weight !== undefined && (
                          <span className="text-slate-500 text-[10px]">w:{n.weight}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Algorithm Trace */}
              {onRunAlgorithm && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] text-slate-400 block">Launch Algorithm from this Vertex:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRunAlgorithm('bfs', selectedNode.id)}
                      className="py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      title="Run BFS traversal starting from this node"
                    >
                      <Play size={11} className="fill-blue-300" />
                      <span>Trace BFS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRunAlgorithm('dfs', selectedNode.id)}
                      className="py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      title="Run DFS traversal starting from this node"
                    >
                      <Play size={11} className="fill-indigo-300" />
                      <span>Trace DFS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Color Picker Palette */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Node Color</label>
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {CP_PALETTE.map(p => (
                  <button
                    type="button"
                    key={p.color}
                    onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                    className={`w-7 h-7 rounded-lg transition-transform border ${
                      selectedNode.color === p.color
                        ? 'scale-110 border-white ring-2 ring-blue-500/50'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>

              {/* Codeforces rating colors */}
              <div className="text-[10px] text-slate-500 mb-1">Codeforces Tiers:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {CODEFORCES_TIER_COLORS.map(cf => (
                  <button
                    type="button"
                    key={cf.color}
                    onClick={() => onUpdateNode(selectedNode.id, { color: cf.color })}
                    className="px-2 py-1 text-[10px] rounded border border-slate-800 truncate text-slate-200 hover:border-slate-600 text-left"
                    style={{ borderLeftColor: cf.color, borderLeftWidth: 3 }}
                    title={cf.name}
                  >
                    {cf.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetTreeRoot(selectedNode.id)}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors text-center font-medium"
              >
                Set as Tree Root
              </button>
              <button
                type="button"
                onClick={() => onDeleteNode(selectedNode.id)}
                className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/20"
                title="Delete Node (Del)"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* EDGE PROPERTIES */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-between">
              <span>Edge:</span>
              <span>
                <strong className="text-blue-400">{selectedEdge.source}</strong>{' '}
                {selectedEdge.directed ? '→' : '—'}{' '}
                <strong className="text-blue-400">{selectedEdge.target}</strong>
              </span>
            </div>

            {/* Edge Weight */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Edge Weight</label>
              <input
                type="number"
                value={selectedEdge.weight ?? ''}
                placeholder="e.g. 5"
                onChange={e =>
                  onUpdateEdge(selectedEdge.id, {
                    weight: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Edge Color */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Edge Color</label>
              <div className="grid grid-cols-5 gap-1.5">
                {CP_PALETTE.map(p => (
                  <button
                    type="button"
                    key={p.color}
                    onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                    className={`w-7 h-7 rounded-lg transition-transform border ${
                      selectedEdge.color === p.color
                        ? 'scale-110 border-white ring-2 ring-blue-500/50'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              {settings.isDirected && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateEdge(selectedEdge.id, {
                      source: selectedEdge.target,
                      target: selectedEdge.source,
                    })
                  }
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight size={13} />
                  <span>Reverse Direction</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onDeleteEdge(selectedEdge.id)}
                className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/20"
                title="Delete Edge (Del)"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
