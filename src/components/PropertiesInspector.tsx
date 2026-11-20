import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GraphNode, GraphEdge, GraphSettings, GraphData, AlgorithmType } from '../types/graph';
import { CP_PALETTE, detectNodeType } from '../utils/parser';
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
  GitBranch,
  Palette,
  Tag,
  Scale,
  ArrowRight,
  ArrowLeft,
  CircleDot,
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

  // Weighted node type and badge styling
  const rawWeight = selectedNode?.weight ?? selectedNode?.value;
  const hasWeight = rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '';
  const weightType = hasWeight ? detectNodeType(String(rawWeight)) : null;

  const weightBadgeStyles = weightType
    ? {
        int: 'bg-blue-950/70 border-blue-500/50 text-blue-300',
        char: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
        bool: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
        string: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
      }[weightType] || 'bg-slate-800 border-slate-700 text-slate-300'
    : '';

  // Header Title formatter (avoids truncation in side dock)
  const headerTitle = useMemo(() => {
    if (selectedNode) {
      return isBottom ? `Node Tracer • ${selectedNode.label}` : `Node ${selectedNode.label}`;
    }
    if (selectedEdge) {
      return isBottom
        ? `Edge Tracer • ${selectedEdge.source} → ${selectedEdge.target}`
        : `Edge ${selectedEdge.source}→${selectedEdge.target}`;
    }
    return isBottom ? 'Node Tracer' : 'Tracer';
  }, [selectedNode, selectedEdge, isBottom]);

  // Common Header Content
  const renderHeader = () => (
    <div
      className={`border-b border-slate-800/90 px-3.5 flex items-center justify-between bg-slate-950/70 shrink-0 ${
        isBottom ? 'h-10' : 'h-11'
      }`}
    >
      {/* Title & Badges */}
      <div className="flex items-center gap-2 min-w-0">
        <Sliders size={13} className="text-blue-400 shrink-0" />
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider truncate">
          {headerTitle}
        </h4>
        {selectedNode && (
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider shrink-0 ${typeBadgeStyles}`}
          >
            {nodeType}
          </span>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Dock position switcher */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <button
            type="button"
            onClick={() => onPositionChange?.('bottom')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
              position === 'bottom'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Dock Tracer to Bottom"
          >
            <PanelBottom size={12} />
            {isBottom && <span>Bottom</span>}
          </button>
          <button
            type="button"
            onClick={() => onPositionChange?.('right')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
              position === 'right'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Dock Tracer to Right Side"
          >
            <PanelRight size={12} />
            {!isBottom && <span>Side</span>}
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
            title="Tracer Position Preferences"
          >
            <Settings size={13} />
          </button>

          {isSettingsOpen && (
            <div
              className={`absolute right-0 ${
                isBottom ? 'bottom-full mb-2' : 'top-full mt-2'
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
                  Default Dock Position:
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
                Clicking any node on the canvas opens this tracer at your chosen position (<strong className="text-slate-200">{position === 'bottom' ? 'Bottom' : 'Right Side'}</strong>).
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close Tracer (Esc)"
        >
          <X size={14} />
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
            ? 'w-full border-t border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 overflow-hidden shadow-2xl animate-slide-up'
            : 'w-80 border-l border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 h-full overflow-hidden shadow-2xl animate-slide-left'
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
          <div className="w-9 h-9 rounded-full bg-slate-800/70 flex items-center justify-center text-blue-400 mb-2">
            <Sliders size={16} />
          </div>
          <p className="text-xs font-semibold text-slate-200 mb-1">Node Tracer is Ready</p>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Click on any vertex in the canvas to trace its connections, inspect value weights, and run step-by-step algorithms.
          </p>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // BOTTOM DOCKED VIEW: Clean 4-Card Responsive Grid
  // -------------------------------------------------------------
  if (isBottom) {
    return (
      <aside
        style={{ height: `${bottomHeight}px` }}
        className="w-full border-t border-slate-800/80 bg-[#0a0f1d] flex flex-col z-10 select-none shrink-0 overflow-hidden shadow-2xl animate-slide-up"
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

        {/* 4-Card Grid Container */}
        <div className="flex-1 p-3 overflow-y-auto">
          {selectedNode && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 h-full items-stretch">
              {/* Card 1: Identity & Pinning */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:border-slate-700/80 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Tag size={12} className="text-blue-400" />
                      <span>Node Identifier</span>
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${typeBadgeStyles}`}>
                      {nodeType}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono mb-2"
                    placeholder="e.g. 1, A, true, Root"
                  />
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <span className="text-[10px] text-slate-500 mr-0.5">Presets:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                    >
                      Int ('1')
                    </button>
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
                      onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                    >
                      String
                    </button>
                  </div>
                </div>

                {/* Fixed/Pin Action */}
                <button
                  type="button"
                  onClick={() => onTogglePinNode(selectedNode.id)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all mt-2 ${
                    selectedNode.isPinned
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-inner'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Pin size={12} className={selectedNode.isPinned ? 'rotate-45 text-amber-400' : ''} />
                  <span>{selectedNode.isPinned ? 'Position Fixed (Pinned)' : 'Fix Position (Pin)'}</span>
                </button>
              </div>

              {/* Card 2: Value & Hierarchy */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:border-slate-700/80 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Scale size={12} className="text-indigo-400" />
                      <span>Node Weight / Value</span>
                    </span>
                    {weightType && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${weightBadgeStyles}`}>
                        {weightType}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={selectedNode.weight ?? selectedNode.value ?? ''}
                    placeholder="e.g. 12, 'A', score, true"
                    onChange={e => {
                      const val = e.target.value;
                      const trimmed = val.trim();
                      const num = Number(trimmed);
                      const resolved = trimmed === '' ? undefined : !isNaN(num) ? num : trimmed;
                      onUpdateNode(selectedNode.id, {
                        weight: resolved,
                        value: resolved,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono mb-2"
                  />
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <span className="text-[10px] text-slate-500 mr-0.5">Presets:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: 10, value: 10 })}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                    >
                      Int (10)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: 'A', value: 'A' })}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/50 transition-colors"
                    >
                      Char ('A')
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: 'val', value: 'val' })}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                    >
                      Text
                    </button>
                    {(selectedNode.weight !== undefined || selectedNode.value !== undefined) && (
                      <button
                        type="button"
                        onClick={() => onUpdateNode(selectedNode.id, { weight: undefined, value: undefined })}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/40 border border-red-800/40 text-red-300 hover:bg-red-900/50 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Tree Root Action */}
                <button
                  type="button"
                  onClick={() => onSetTreeRoot(selectedNode.id)}
                  className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium mt-2"
                >
                  <GitBranch size={12} className="text-emerald-400" />
                  <span>Set as Tree Root</span>
                </button>
              </div>

              {/* Card 3: Connections & Algorithm Traversal */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:border-slate-700/80 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Network size={12} className="text-cyan-400" />
                      <span>Connections</span>
                    </span>
                    {settings.isDirected ? (
                      <span className="text-[9.5px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        In: {nodeConnections.inDegree} | Out: {nodeConnections.outDegree}
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        Degree: {nodeConnections.totalDegree}
                      </span>
                    )}
                  </div>

                  {/* Adjacent Vertices chips with clear directional cues */}
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto mb-2">
                    {nodeConnections.neighbors.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic py-1">Isolated vertex (0 edges)</span>
                    ) : (
                      nodeConnections.neighbors.map((n, idx) => (
                        <button
                          type="button"
                          key={`${n.edgeId}-${idx}`}
                          onClick={() => onSelectNode?.(n.id)}
                          className="px-2 py-0.5 rounded text-[10.5px] bg-slate-950 border border-slate-800 hover:border-blue-500/60 text-slate-200 flex items-center gap-1 font-mono transition-colors group"
                          title={`Click to trace Node ${n.label}`}
                        >
                          {n.dir === 'outgoing' ? (
                            <ArrowRight size={10} className="text-blue-400" />
                          ) : n.dir === 'incoming' ? (
                            <ArrowLeft size={10} className="text-purple-400" />
                          ) : (
                            <CircleDot size={9} className="text-cyan-400" />
                          )}
                          <span className="font-semibold text-white">{n.label}</span>
                          {n.weight !== undefined && (
                            <span className="text-slate-500 text-[9px]">w:{n.weight}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Algorithm Trace Launcher */}
                {onRunAlgorithm && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRunAlgorithm('bfs', selectedNode.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        title="Run BFS traversal starting from this node"
                      >
                        <Play size={11} className="fill-blue-300" />
                        <span>Trace BFS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRunAlgorithm('dfs', selectedNode.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        title="Run DFS traversal starting from this node"
                      >
                        <Play size={11} className="fill-indigo-300" />
                        <span>Trace DFS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Appearance & Actions */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:border-slate-700/80 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Palette size={12} className="text-pink-400" />
                      <span>Node Color</span>
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 hover:border-slate-700" title="Pick any custom live color">
                      <input
                        type="color"
                        value={selectedNode.color || '#3b82f6'}
                        onInput={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                        onChange={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                        className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                      />
                      <span className="text-[9.5px] text-slate-400 font-mono">Custom</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {CP_PALETTE.map(p => (
                      <button
                        type="button"
                        key={p.color}
                        onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                        className={`h-6 rounded-lg transition-transform border ${
                          selectedNode.color === p.color
                            ? 'scale-110 border-white ring-2 ring-blue-500/50'
                            : 'border-slate-800 hover:scale-105'
                        }`}
                        style={{ backgroundColor: p.color }}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Delete Node Action */}
                <button
                  type="button"
                  onClick={() => onDeleteNode(selectedNode.id)}
                  className="w-full py-1.5 px-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/25 flex items-center justify-center gap-1.5 text-xs font-medium mt-2"
                  title="Delete Node (Del)"
                >
                  <Trash2 size={13} />
                  <span>Delete Vertex (Del)</span>
                </button>
              </div>
            </div>
          )}

          {/* EDGE VIEW IN BOTTOM DOCK */}
          {selectedEdge && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full items-stretch max-w-4xl">
              {/* Edge Direction */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-300 block mb-2">Edge Connection</span>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-200 font-mono flex items-center justify-between mb-2">
                    <strong className="text-blue-400">{selectedEdge.source}</strong>
                    <span className="text-slate-500">{selectedEdge.directed ? '→' : '—'}</span>
                    <strong className="text-blue-400">{selectedEdge.target}</strong>
                  </div>
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
                    className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeftRight size={12} />
                    <span>Reverse Direction</span>
                  </button>
                )}
              </div>

              {/* Edge Weight */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-300 block mb-2">Edge Weight</span>
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
              </div>

              {/* Edge Color & Delete */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Palette size={12} className="text-pink-400" />
                      <span>Edge Color</span>
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 hover:border-slate-700" title="Pick any custom live color">
                      <input
                        type="color"
                        value={selectedEdge.color || '#64748b'}
                        onInput={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                        onChange={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                        className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                      />
                      <span className="text-[9.5px] text-slate-400 font-mono">Custom</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {CP_PALETTE.map(p => (
                      <button
                        type="button"
                        key={p.color}
                        onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                        className={`h-6 rounded-lg transition-transform border ${
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

                <button
                  type="button"
                  onClick={() => onDeleteEdge(selectedEdge.id)}
                  className="w-full py-1.5 px-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/25 flex items-center justify-center gap-1.5 text-xs"
                >
                  <Trash2 size={13} />
                  <span>Delete Edge (Del)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // RIGHT SIDE DOCKED VIEW: Structured Cards
  // -------------------------------------------------------------
  return (
    <aside className="w-80 border-l border-slate-800/80 bg-[#0a0f1d] flex flex-col z-10 select-none shrink-0 h-full overflow-hidden shadow-2xl animate-slide-left">
      {renderHeader()}

      {/* Docked Body: Scrollable Cards */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
        {/* NODE PROPERTIES */}
        {selectedNode && (
          <>
            {/* Card 1: Identity & Value */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag size={12} className="text-blue-400" />
                    <span>Node Identifier</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${typeBadgeStyles}`}>
                    {nodeType}
                  </span>
                </div>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono mb-1.5"
                  placeholder="e.g. 1, A, true, Root"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 mr-0.5">Presets:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Int ('1')
                  </button>
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
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                  >
                    String
                  </button>
                </div>
              </div>

              {/* Pin Toggle */}
              <button
                type="button"
                onClick={() => onTogglePinNode(selectedNode.id)}
                className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                  selectedNode.isPinned
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-inner'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Pin size={12} className={selectedNode.isPinned ? 'rotate-45 text-amber-400' : ''} />
                <span>{selectedNode.isPinned ? 'Fixed (Pinned)' : 'Fix Position (Pin)'}</span>
              </button>

              {/* Node Weight */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Scale size={12} className="text-indigo-400" />
                    <span>Weight / Value</span>
                  </span>
                  {weightType && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${weightBadgeStyles}`}>
                      {weightType}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={selectedNode.weight ?? selectedNode.value ?? ''}
                  placeholder="e.g. 10, A, val, true"
                  onChange={e => {
                    const val = e.target.value;
                    const trimmed = val.trim();
                    const num = Number(trimmed);
                    const resolved = trimmed === '' ? undefined : !isNaN(num) ? num : trimmed;
                    onUpdateNode(selectedNode.id, {
                      weight: resolved,
                      value: resolved,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono mb-1.5"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 mr-0.5">Presets:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { weight: 10, value: 10 })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Int (10)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { weight: 'A', value: 'A' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  >
                    Char ('A')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { weight: 'val', value: 'val' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                  >
                    Text
                  </button>
                  {(selectedNode.weight !== undefined || selectedNode.value !== undefined) && (
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: undefined, value: undefined })}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/40 border border-red-800/40 text-red-300 hover:bg-red-900/50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Graph Connections & Traversal */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Network size={12} className="text-cyan-400" />
                  <span>Connections &amp; Degree</span>
                </span>
                {settings.isDirected ? (
                  <span className="text-[9.5px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    In: {nodeConnections.inDegree} | Out: {nodeConnections.outDegree}
                  </span>
                ) : (
                  <span className="text-[9.5px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    Deg: {nodeConnections.totalDegree}
                  </span>
                )}
              </div>

              {/* Neighbor Chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 block">Adjacent Vertices:</span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {nodeConnections.neighbors.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic py-1">No connected edges (Isolated)</span>
                  ) : (
                    nodeConnections.neighbors.map((n, idx) => (
                      <button
                        type="button"
                        key={`${n.edgeId}-${idx}`}
                        onClick={() => onSelectNode?.(n.id)}
                        className="px-2 py-0.5 rounded text-[10.5px] bg-slate-950 border border-slate-800 hover:border-blue-500/60 text-slate-200 flex items-center gap-1 font-mono transition-colors"
                        title={`Click to trace Node ${n.label}`}
                      >
                        {n.dir === 'outgoing' ? (
                          <ArrowRight size={10} className="text-blue-400" />
                        ) : n.dir === 'incoming' ? (
                          <ArrowLeft size={10} className="text-purple-400" />
                        ) : (
                          <CircleDot size={9} className="text-cyan-400" />
                        )}
                        <span className="font-semibold text-white">{n.label}</span>
                        {n.weight !== undefined && (
                          <span className="text-slate-500 text-[9px]">w:{n.weight}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Algorithm Trace */}
              {onRunAlgorithm && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block mb-1.5">Launch Traversal from this Node:</span>
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

            {/* Card 3: Color & Hierarchy */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette size={12} className="text-pink-400" />
                  <span>Node Color</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 hover:border-slate-700" title="Pick any custom live color">
                  <input
                    type="color"
                    value={selectedNode.color || '#3b82f6'}
                    onInput={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                    onChange={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                    className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                  />
                  <span className="text-[9.5px] text-slate-400 font-mono">Custom</span>
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CP_PALETTE.map(p => (
                  <button
                    type="button"
                    key={p.color}
                    onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                    className={`h-6 rounded-lg transition-transform border ${
                      selectedNode.color === p.color
                        ? 'scale-110 border-white ring-2 ring-blue-500/50'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => onSetTreeRoot(selectedNode.id)}
                className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <GitBranch size={12} className="text-emerald-400" />
                <span>Set as Tree Root</span>
              </button>
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => onDeleteNode(selectedNode.id)}
              className="w-full py-2 px-3 text-red-400 hover:bg-red-950/40 rounded-xl transition-colors border border-red-500/25 flex items-center justify-center gap-2 text-xs font-medium"
              title="Delete Node (Del)"
            >
              <Trash2 size={14} />
              <span>Delete Node (Del)</span>
            </button>
          </>
        )}

        {/* EDGE PROPERTIES */}
        {selectedEdge && (
          <div className="space-y-3">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-300 block">Edge Connection</span>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-200 font-mono flex items-center justify-between">
                <strong className="text-blue-400">{selectedEdge.source}</strong>
                <span className="text-slate-500">{selectedEdge.directed ? '→' : '—'}</span>
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
                  className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight size={12} />
                  <span>Reverse Direction</span>
                </button>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 block">Edge Weight</span>
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

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette size={12} className="text-pink-400" />
                  <span>Edge Color</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 hover:border-slate-700" title="Pick any custom live color">
                  <input
                    type="color"
                    value={selectedEdge.color || '#64748b'}
                    onInput={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                    onChange={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                    className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                  />
                  <span className="text-[9.5px] text-slate-400 font-mono">Custom</span>
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CP_PALETTE.map(p => (
                  <button
                    type="button"
                    key={p.color}
                    onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                    className={`h-6 rounded-lg transition-transform border ${
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

            <button
              type="button"
              onClick={() => onDeleteEdge(selectedEdge.id)}
              className="w-full py-2 px-3 text-red-400 hover:bg-red-950/40 rounded-xl transition-colors border border-red-500/25 flex items-center justify-center gap-2 text-xs font-medium"
              title="Delete Edge (Del)"
            >
              <Trash2 size={14} />
              <span>Delete Edge (Del)</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
