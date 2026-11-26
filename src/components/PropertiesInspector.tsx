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
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  settings: GraphSettings;
  data?: GraphData;
  onUpdateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
  onBatchUpdateNodes?: (updates: Partial<GraphNode>) => void;
  onBatchUpdateEdges?: (updates: Partial<GraphEdge>) => void;
  onBatchDelete?: () => void;
  onSetTreeRoot: (nodeId: string) => void;
  onRunAlgorithm?: (algo: AlgorithmType, startNodeId: string) => void;
  onSelectNode?: (nodeId: string | null) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  position = 'right',
  onPositionChange,
  selectedNode,
  selectedEdge,
  selectedNodeIds = [],
  selectedEdgeIds = [],
  settings,
  data,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onBatchUpdateNodes,
  onBatchUpdateEdges,
  onBatchDelete,
  onSetTreeRoot,
  onRunAlgorithm,
  onSelectNode,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
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
      weight?: number | string;
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

  const typeBadgeStyles = isLight
    ? {
        int: 'bg-blue-100 border-blue-300 text-blue-800 font-semibold',
        char: 'bg-purple-100 border-purple-300 text-purple-800 font-semibold',
        bool: 'bg-amber-100 border-amber-300 text-amber-900 font-semibold',
        string: 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold',
      }[nodeType] || 'bg-slate-100 border-slate-300 text-slate-800 font-semibold'
    : {
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
    ? isLight
      ? {
          int: 'bg-indigo-100 border-indigo-300 text-indigo-900 font-semibold',
          char: 'bg-purple-100 border-purple-300 text-purple-800 font-semibold',
          bool: 'bg-amber-100 border-amber-300 text-amber-900 font-semibold',
          string: 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold',
        }[weightType] || 'bg-slate-100 border-slate-300 text-slate-800 font-semibold'
      : {
          int: 'bg-blue-950/70 border-blue-500/50 text-blue-300',
          char: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
          bool: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
          string: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
        }[weightType] || 'bg-slate-800 border-slate-700 text-slate-300'
    : '';

  const selectedNodesCount = selectedNodeIds.length > 0 ? selectedNodeIds.length : (selectedNode ? 1 : 0);
  const selectedEdgesCount = selectedEdgeIds.length > 0 ? selectedEdgeIds.length : (selectedEdge ? 1 : 0);
  const isMultiMode = selectedNodesCount > 1 || selectedEdgesCount > 1 || (selectedNodesCount > 0 && selectedEdgesCount > 0);

  const selectedNodesList = useMemo(() => {
    if (!data) return selectedNode ? [selectedNode] : [];
    if (selectedNodeIds.length > 0) {
      const idSet = new Set(selectedNodeIds);
      return data.nodes.filter(n => idSet.has(n.id));
    }
    return selectedNode ? [selectedNode] : [];
  }, [data, selectedNodeIds, selectedNode]);

  const selectedEdgesList = useMemo(() => {
    if (!data) return selectedEdge ? [selectedEdge] : [];
    if (selectedEdgeIds.length > 0) {
      const idSet = new Set(selectedEdgeIds);
      return data.edges.filter(e => idSet.has(e.id));
    }
    return selectedEdge ? [selectedEdge] : [];
  }, [data, selectedEdgeIds, selectedEdge]);

  const [batchNodeWeightInput, setBatchNodeWeightInput] = useState<string>('');
  const [batchEdgeWeightInput, setBatchEdgeWeightInput] = useState<string>('');

  const nodeSelectionSignature = selectedNodeIds.join(',') || (selectedNode?.id ?? '');
  const edgeSelectionSignature = selectedEdgeIds.join(',') || (selectedEdge?.id ?? '');

  useEffect(() => {
    if (selectedNodesList.length === 0) {
      setBatchNodeWeightInput('');
      return;
    }
    const vals = selectedNodesList.map(n => n.weight ?? n.value);
    const first = vals[0];
    const allSame = vals.every(v => v === first);
    setBatchNodeWeightInput(allSame && first !== undefined && first !== null ? String(first) : '');
  }, [nodeSelectionSignature]);

  useEffect(() => {
    if (selectedEdgesList.length === 0) {
      setBatchEdgeWeightInput('');
      return;
    }
    const vals = selectedEdgesList.map(e => e.weight);
    const first = vals[0];
    const allSame = vals.every(v => v === first);
    setBatchEdgeWeightInput(allSame && first !== undefined && first !== null ? String(first) : '');
  }, [edgeSelectionSignature]);

  // Header Title formatter (avoids truncation in side dock)
  const headerTitle = useMemo(() => {
    if (isMultiMode) {
      const parts: string[] = [];
      if (selectedNodesCount > 0) parts.push(`${selectedNodesCount} ${selectedNodesCount === 1 ? 'Node' : 'Nodes'}`);
      if (selectedEdgesCount > 0) parts.push(`${selectedEdgesCount} ${selectedEdgesCount === 1 ? 'Edge' : 'Edges'}`);
      return isBottom ? `Batch Tracer • ${parts.join(', ')}` : parts.join(' • ');
    }
    if (selectedNode) {
      return isBottom ? `Node Tracer • ${selectedNode.label}` : `Node ${selectedNode.label}`;
    }
    if (selectedEdge) {
      return isBottom
        ? `Edge Tracer • ${selectedEdge.source} → ${selectedEdge.target}`
        : `Edge ${selectedEdge.source}→${selectedEdge.target}`;
    }
    return isBottom ? 'Node Tracer' : 'Tracer';
  }, [isMultiMode, selectedNodesCount, selectedEdgesCount, selectedNode, selectedEdge, isBottom]);

  // Common Header Content
  const renderHeader = () => (
    <div
      className={`border-b px-3.5 flex items-center justify-between shrink-0 transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
      } ${isBottom ? 'h-10' : 'h-11'}`}
    >
      {/* Title & Badges */}
      <div className="flex items-center gap-2 min-w-0">
        <Sliders size={13} className="text-blue-500 shrink-0" />
        <h4 className={`text-xs font-bold uppercase tracking-wider truncate ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>
          {headerTitle}
        </h4>
        {!isMultiMode && selectedNode && (
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
        <div className={`flex items-center p-0.5 rounded-lg border text-[11px] ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-neutral-900 border-neutral-800'
        }`}>
          <button
            type="button"
            onClick={() => onPositionChange?.('bottom')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              position === 'bottom'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title="Dock Tracer to Bottom"
          >
            <PanelBottom size={12} />
            {isBottom && <span>Bottom</span>}
          </button>
          <button
            type="button"
            onClick={() => onPositionChange?.('right')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              position === 'right'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
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
                ? isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                  : 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                : isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent'
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
              } w-64 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 border ${
                isLight ? 'bg-white border-slate-300 text-slate-800 shadow-xl' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <div className={`flex items-center justify-between pb-1.5 border-b ${
                isLight ? 'border-slate-200' : 'border-slate-800/80'
              }`}>
                <span className={`font-semibold text-[11px] uppercase tracking-wider ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  Tracer Setup
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={`p-0.5 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <X size={12} />
                </button>
              </div>

              <div>
                <label className={`text-[11px] font-medium block mb-1.5 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  Default Dock Position:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onPositionChange?.('bottom');
                      setIsSettingsOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      position === 'bottom'
                        ? isLight
                          ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold shadow-sm'
                          : 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <PanelBottom size={13} />
                    <span>Bottom</span>
                    {position === 'bottom' && <Check size={12} className={isLight ? 'text-blue-700' : 'text-blue-400'} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onPositionChange?.('right');
                      setIsSettingsOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      position === 'right'
                        ? isLight
                          ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold shadow-sm'
                          : 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <PanelRight size={13} />
                    <span>Right Side</span>
                    {position === 'right' && <Check size={12} className={isLight ? 'text-blue-700' : 'text-blue-400'} />}
                  </button>
                </div>
              </div>

              <div className={`pt-2 border-t text-[10px] leading-normal ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
              }`}>
                Clicking any node on the canvas opens this tracer at your chosen position (<strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{position === 'bottom' ? 'Bottom' : 'Right Side'}</strong>).
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

  // Shared Batch Selection Cards (reused across Bottom and Right docks)
  const applyBatchNodeWeight = (valStr: string) => {
    setBatchNodeWeightInput(valStr);
    const trimmed = valStr.trim();
    const num = Number(trimmed);
    const resolved = trimmed === '' ? undefined : !isNaN(num) ? num : trimmed;
    onBatchUpdateNodes?.({ weight: resolved, value: resolved });
  };

  const resolveEdgeWeightInput = (valStr: string, keepSpaces = false): number | string | undefined => {
    const trimmed = valStr.trim();
    if (trimmed === '') return undefined;
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '-' && !trimmed.endsWith('.') && (!keepSpaces || valStr === trimmed)) {
      return num;
    }
    return keepSpaces ? valStr : trimmed;
  };

  const applyBatchEdgeWeight = (valStr: string) => {
    setBatchEdgeWeightInput(valStr);
    onBatchUpdateEdges?.({ weight: resolveEdgeWeightInput(valStr) });
  };

  const batchSummaryText = [
    selectedNodesCount > 0 ? `${selectedNodesCount} ${selectedNodesCount === 1 ? 'Node' : 'Nodes'}` : '',
    selectedEdgesCount > 0 ? `${selectedEdgesCount} ${selectedEdgesCount === 1 ? 'Edge' : 'Edges'}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const renderBatchNodesWeightCard = () => (
    <div className={`border rounded-xl p-3 space-y-2 ${
      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          <Scale size={12} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
          <span>Nodes Weight / Value ({selectedNodesCount})</span>
        </span>
      </div>
      <input
        type="text"
        value={batchNodeWeightInput}
        placeholder="Assign value/weight to selected nodes..."
        onChange={e => applyBatchNodeWeight(e.target.value)}
        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono border focus:outline-none focus:border-indigo-500 ${
          isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
        }`}
      />
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] mr-0.5 text-slate-500">Presets:</span>
        <button
          type="button"
          onClick={() => applyBatchNodeWeight('10')}
          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
            isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
          }`}
        >
          10
        </button>
        <button
          type="button"
          onClick={() => applyBatchNodeWeight('A')}
          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
            isLight ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
          }`}
        >
          'A'
        </button>
        <button
          type="button"
          onClick={() => applyBatchNodeWeight('val')}
          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50'
          }`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => applyBatchNodeWeight('')}
          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
            isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
          }`}
        >
          Clear
        </button>
      </div>
    </div>
  );

  const renderBatchNodesColorCard = () => {
    const activeNodeColor = selectedNodesList[0]?.color || '#3b82f6';
    return (
      <div className={`border rounded-xl p-3 space-y-2 ${
        isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <Palette size={12} className="text-pink-500" />
            <span>Nodes Color ({selectedNodesCount})</span>
          </span>
          <label className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded border ${
            isLight ? 'bg-slate-100 border-slate-300 hover:border-slate-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
          }`} title="Pick any custom live color">
            <input
              type="color"
              value={activeNodeColor}
              onInput={e => onBatchUpdateNodes?.({ color: (e.target as HTMLInputElement).value })}
              onChange={e => onBatchUpdateNodes?.({ color: (e.target as HTMLInputElement).value })}
              className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
            />
            <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Custom</span>
          </label>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {CP_PALETTE.map(p => (
            <button
              type="button"
              key={p.color}
              onClick={() => onBatchUpdateNodes?.({ color: p.color })}
              className={`h-6 rounded-lg transition-transform border cursor-pointer ${
                isLight ? 'border-slate-200 hover:scale-105' : 'border-slate-800 hover:scale-105'
              }`}
              style={{ backgroundColor: p.color }}
              title={p.name}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderBatchEdgesWeightCard = () => (
    <div className={`border rounded-xl p-3 space-y-2 ${
      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
    }`}>
      <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
        <Scale size={12} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
        <span>Edges Weight ({selectedEdgesCount})</span>
      </span>
      <input
        type="text"
        value={batchEdgeWeightInput}
        placeholder="Assign weight (number or text)..."
        onChange={e => applyBatchEdgeWeight(e.target.value)}
        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono border focus:outline-none focus:border-blue-500 ${
          isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
        }`}
      />
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] mr-0.5 text-slate-500">Quick:</span>
        {[1, 5, 10].map(w => (
          <button
            type="button"
            key={w}
            onClick={() => applyBatchEdgeWeight(String(w))}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
            }`}
          >
            {w}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyBatchEdgeWeight('')}
          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
            isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
          }`}
        >
          Clear
        </button>
      </div>
    </div>
  );

  const renderBatchEdgesColorCard = () => {
    const activeEdgeColor = selectedEdgesList[0]?.color || '#64748b';
    return (
      <div className={`border rounded-xl p-3 space-y-2 ${
        isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <Palette size={12} className="text-pink-500" />
            <span>Edges Color ({selectedEdgesCount})</span>
          </span>
          <label className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded border ${
            isLight ? 'bg-slate-100 border-slate-300 hover:border-slate-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
          }`} title="Pick any custom live color">
            <input
              type="color"
              value={activeEdgeColor}
              onInput={e => onBatchUpdateEdges?.({ color: (e.target as HTMLInputElement).value })}
              onChange={e => onBatchUpdateEdges?.({ color: (e.target as HTMLInputElement).value })}
              className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
            />
            <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Custom</span>
          </label>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {CP_PALETTE.map(p => (
            <button
              type="button"
              key={p.color}
              onClick={() => onBatchUpdateEdges?.({ color: p.color })}
              className={`h-6 rounded-lg transition-transform border cursor-pointer ${
                isLight ? 'border-slate-200 hover:scale-105' : 'border-slate-800 hover:scale-105'
              }`}
              style={{ backgroundColor: p.color }}
              title={p.name}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderBatchDeleteButton = () => (
    <button
      type="button"
      onClick={() => onBatchDelete?.()}
      className={`w-full py-2 px-3 rounded-xl transition-colors border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer ${
        isLight ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' : 'text-red-400 hover:bg-red-950/40 border-red-500/25'
      }`}
      title="Delete All Selected (Del)"
    >
      <Trash2 size={14} />
      <span>Delete ({batchSummaryText}) (Del)</span>
    </button>
  );

  // Fallback if neither node nor edge is selected
  if (!selectedNode && !selectedEdge && selectedNodesCount === 0 && selectedEdgesCount === 0) {
    return (
      <>
        {!isBottom && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        <aside
          style={isBottom ? { height: `${bottomHeight}px` } : undefined}
          className={`${
            isBottom
              ? `w-full max-h-[50vh] sm:max-h-[60vh] border-t flex flex-col z-20 select-none shrink-0 overflow-hidden shadow-2xl animate-slide-up ${
                  isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
                }`
              : `fixed inset-y-0 right-0 z-40 w-[88vw] max-w-sm md:relative md:inset-auto md:w-80 md:z-10 border-l flex flex-col select-none shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none animate-slide-left ${
                  isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
                }`
          }`}
        >
          {isBottom && (
            <div
              onMouseDown={handleResizeMouseDown}
              className={`h-1.5 w-full hover:bg-blue-500 cursor-ns-resize transition-colors shrink-0 group flex items-center justify-center ${
                isLight ? 'bg-slate-200' : 'bg-neutral-800'
              }`}
              title="Drag to resize bottom tracer height"
            >
              <div className={`w-12 h-0.5 rounded-full group-hover:bg-blue-300 ${isLight ? 'bg-slate-400' : 'bg-neutral-600'}`} />
            </div>
          )}
          {renderHeader()}
          <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-blue-500 mb-2 ${
              isLight ? 'bg-slate-100' : 'bg-neutral-900'
            }`}>
              <Sliders size={16} />
            </div>
            <p className={`text-xs font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>Node Tracer is Ready</p>
            <p className={`text-[11px] max-w-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
              Click on any vertex in the canvas to trace its connections, inspect value weights, and run step-by-step algorithms.
            </p>
          </div>
        </aside>
      </>
    );
  }

  // -------------------------------------------------------------
  // BOTTOM DOCKED VIEW: Clean 4-Card Responsive Grid
  // -------------------------------------------------------------
  if (isBottom) {
    return (
      <aside
        style={{ height: `${bottomHeight}px` }}
        className={`w-full max-h-[50vh] sm:max-h-[60vh] border-t flex flex-col z-20 select-none shrink-0 overflow-hidden shadow-2xl animate-slide-up ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
        }`}
      >
        {/* Top Resize Handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className={`h-1.5 w-full hover:bg-blue-500 cursor-ns-resize transition-colors shrink-0 group flex items-center justify-center ${
            isLight ? 'bg-slate-200' : 'bg-neutral-800'
          }`}
          title="Drag to resize bottom tracer height"
        >
          <div className={`w-12 h-0.5 rounded-full group-hover:bg-blue-300 ${isLight ? 'bg-slate-400' : 'bg-neutral-600'}`} />
        </div>

        {renderHeader()}

        {/* 4-Card Grid Container */}
        <div className="flex-1 p-3 overflow-y-auto">
          {isMultiMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              {selectedNodesCount > 0 && renderBatchNodesWeightCard()}
              {selectedNodesCount > 0 && renderBatchNodesColorCard()}
              {selectedEdgesCount > 0 && renderBatchEdgesWeightCard()}
              {selectedEdgesCount > 0 && renderBatchEdgesColorCard()}
              <div className={`border rounded-xl p-3 flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                <div className="space-y-1">
                  <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Selection Summary</span>
                  <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{batchSummaryText}</p>
                </div>
                <div className="mt-2">{renderBatchDeleteButton()}</div>
              </div>
            </div>
          ) : (
          <>
          {selectedNode && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 h-full items-stretch">
              {/* Card 1: Identity & Pinning */}
              <div className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300' : 'bg-slate-900/60 border-slate-800/80 shadow-sm hover:border-slate-700/80'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Tag size={12} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
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
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono mb-2 border focus:outline-none focus:border-blue-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                    }`}
                    placeholder="e.g. 1, A, true, Root"
                  />
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <span className={`text-[10px] mr-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Presets:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
                      }`}
                    >
                      Int ('1')
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { label: 'A' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
                      }`}
                    >
                      Char ('A')
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { label: selectedNode.label === 'true' ? 'false' : 'true' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' : 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/50'
                      }`}
                    >
                      Bool
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50'
                      }`}
                    >
                      String
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Value & Hierarchy */}
              <div className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300' : 'bg-slate-900/60 border-slate-800/80 shadow-sm hover:border-slate-700/80'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Scale size={12} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
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
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono mb-2 border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                    }`}
                  />
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <span className={`text-[10px] mr-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Presets:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: 10, value: 10 })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
                      }`}
                    >
                      Int (10)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: 'A', value: 'A' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
                      }`}
                    >
                      Char ('A')
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: 'val', value: 'val' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50'
                      }`}
                    >
                      Text
                    </button>
                    {(selectedNode.weight !== undefined || selectedNode.value !== undefined) && (
                      <button
                        type="button"
                        onClick={() => onUpdateNode(selectedNode.id, { weight: undefined, value: undefined })}
                        className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                          isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                        }`}
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
                  className={`w-full py-1.5 px-2 border text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium mt-2 cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <GitBranch size={12} className={isLight ? 'text-emerald-600' : 'text-emerald-400'} />
                  <span>Set as Tree Root</span>
                </button>
              </div>

              {/* Card 3: Connections & Algorithm Traversal */}
              <div className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300' : 'bg-slate-900/60 border-slate-800/80 shadow-sm hover:border-slate-700/80'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Network size={12} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                      <span>Connections</span>
                    </span>
                    {settings.isDirected ? (
                      <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                        isLight ? 'text-slate-700 bg-slate-100 border-slate-300 font-medium' : 'text-slate-400 bg-slate-950 border-slate-800'
                      }`}>
                        In: {nodeConnections.inDegree} | Out: {nodeConnections.outDegree}
                      </span>
                    ) : (
                      <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                        isLight ? 'text-slate-700 bg-slate-100 border-slate-300 font-medium' : 'text-slate-400 bg-slate-950 border-slate-800'
                      }`}>
                        Degree: {nodeConnections.totalDegree}
                      </span>
                    )}
                  </div>

                  {/* Adjacent Vertices chips with clear directional cues */}
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto mb-2">
                    {nodeConnections.neighbors.length === 0 ? (
                      <span className={`text-[10px] italic py-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Isolated vertex (0 edges)</span>
                    ) : (
                      nodeConnections.neighbors.map((n, idx) => (
                        <button
                          type="button"
                          key={`${n.edgeId}-${idx}`}
                          onClick={() => onSelectNode?.(n.id)}
                          className={`px-2 py-0.5 rounded text-[10.5px] border flex items-center gap-1 font-mono transition-colors group cursor-pointer ${
                            isLight
                              ? 'bg-slate-100 border-slate-300 hover:border-blue-500 text-slate-800'
                              : 'bg-slate-950 border-slate-800 hover:border-blue-500/60 text-slate-200'
                          }`}
                          title={`Click to trace Node ${n.label}`}
                        >
                          {n.dir === 'outgoing' ? (
                            <ArrowRight size={10} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                          ) : n.dir === 'incoming' ? (
                            <ArrowLeft size={10} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
                          ) : (
                            <CircleDot size={9} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                          )}
                          <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{n.label}</span>
                          {n.weight !== undefined && (
                            <span className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>w:{n.weight}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Algorithm Trace Launcher */}
                {onRunAlgorithm && (
                  <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRunAlgorithm('bfs', selectedNode.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
                        }`}
                        title="Run BFS traversal starting from this node"
                      >
                        <Play size={11} className={isLight ? 'fill-blue-700' : 'fill-blue-300'} />
                        <span>Trace BFS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRunAlgorithm('dfs', selectedNode.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                            : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
                        }`}
                        title="Run DFS traversal starting from this node"
                      >
                        <Play size={11} className={isLight ? 'fill-indigo-700' : 'fill-indigo-300'} />
                        <span>Trace DFS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Appearance & Actions */}
              <div className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300' : 'bg-slate-900/60 border-slate-800/80 shadow-sm hover:border-slate-700/80'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Palette size={12} className="text-pink-500" />
                      <span>Node Color</span>
                    </span>
                    <label className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded border ${
                      isLight ? 'bg-slate-100 border-slate-300 hover:border-slate-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`} title="Pick any custom live color">
                      <input
                        type="color"
                        value={selectedNode.color || '#3b82f6'}
                        onInput={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                        onChange={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                        className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                      />
                      <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Custom</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {CP_PALETTE.map(p => (
                      <button
                        type="button"
                        key={p.color}
                        onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                        className={`h-6 rounded-lg transition-transform border cursor-pointer ${
                          selectedNode.color === p.color
                            ? isLight ? 'scale-110 border-slate-900 ring-2 ring-blue-500' : 'scale-110 border-white ring-2 ring-blue-500/50'
                            : isLight ? 'border-slate-200 hover:scale-105' : 'border-slate-800 hover:scale-105'
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
                  className={`w-full py-1.5 px-2 rounded-lg transition-colors border flex items-center justify-center gap-1.5 text-xs font-medium mt-2 cursor-pointer ${
                    isLight
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                      : 'text-red-400 hover:bg-red-950/40 border-red-500/25'
                  }`}
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
              <div className={`border rounded-xl p-3 flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                <div>
                  <span className={`text-[11px] font-semibold block mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Edge Connection</span>
                  <div className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between mb-2 ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}>
                    <strong className={isLight ? 'text-blue-700' : 'text-blue-400'}>{selectedEdge.source}</strong>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>{selectedEdge.directed ? '→' : '—'}</span>
                    <strong className={isLight ? 'text-blue-700' : 'text-blue-400'}>{selectedEdge.target}</strong>
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
                    className={`w-full py-1.5 px-2 border text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 font-medium' : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <ArrowLeftRight size={12} />
                    <span>Reverse Direction</span>
                  </button>
                )}
              </div>

              {/* Edge Weight */}
              <div className={`border rounded-xl p-3 flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                <div>
                  <span className={`text-[11px] font-semibold block mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Edge Weight</span>
                  <input
                    type="text"
                    value={selectedEdge.weight ?? ''}
                    placeholder="e.g. 5, cost, inf"
                    onChange={e =>
                      onUpdateEdge(selectedEdge.id, {
                        weight: resolveEdgeWeightInput(e.target.value, true),
                      })
                    }
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono mb-2 border focus:outline-none focus:border-blue-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                    }`}
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] mr-0.5 text-slate-500">Quick:</span>
                    {[1, 5, 10].map(w => (
                      <button
                        type="button"
                        key={w}
                        onClick={() => onUpdateEdge(selectedEdge.id, { weight: w })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                          isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                    {selectedEdge.weight !== undefined && (
                      <button
                        type="button"
                        onClick={() => onUpdateEdge(selectedEdge.id, { weight: undefined })}
                        className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                          isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                        }`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Edge Color & Delete */}
              <div className={`border rounded-xl p-3 flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Palette size={12} className="text-pink-500" />
                      <span>Edge Color</span>
                    </span>
                    <label className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded border ${
                      isLight ? 'bg-slate-100 border-slate-300 hover:border-slate-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`} title="Pick any custom live color">
                      <input
                        type="color"
                        value={selectedEdge.color || '#64748b'}
                        onInput={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                        onChange={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                        className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                      />
                      <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Custom</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {CP_PALETTE.map(p => (
                      <button
                        type="button"
                        key={p.color}
                        onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                        className={`h-6 rounded-lg transition-transform border cursor-pointer ${
                          selectedEdge.color === p.color
                            ? isLight ? 'scale-110 border-slate-900 ring-2 ring-blue-500' : 'scale-110 border-white ring-2 ring-blue-500/50'
                            : isLight ? 'border-slate-200 hover:scale-105' : 'border-slate-800 hover:scale-105'
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
                  className={`w-full py-1.5 px-2 rounded-lg transition-colors border flex items-center justify-center gap-1.5 text-xs cursor-pointer ${
                    isLight ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 font-medium' : 'text-red-400 hover:bg-red-950/40 border-red-500/25'
                  }`}
                >
                  <Trash2 size={13} />
                  <span>Delete Edge (Del)</span>
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // RIGHT SIDE DOCKED VIEW: Structured Cards
  // -------------------------------------------------------------
  return (
    <>
      {/* Mobile Backdrop for Right Sheet */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`fixed inset-y-0 right-0 z-40 w-[88vw] max-w-sm md:relative md:inset-auto md:w-80 md:z-10 border-l flex flex-col select-none shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none animate-slide-left transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
      }`}>
      {renderHeader()}

      {/* Docked Body: Scrollable Cards */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
        {isMultiMode ? (
          <div className="space-y-3">
            {selectedNodesCount > 0 && renderBatchNodesWeightCard()}
            {selectedNodesCount > 0 && renderBatchNodesColorCard()}
            {selectedEdgesCount > 0 && renderBatchEdgesWeightCard()}
            {selectedEdgesCount > 0 && renderBatchEdgesColorCard()}
            {renderBatchDeleteButton()}
          </div>
        ) : (
        <>
        {/* NODE PROPERTIES */}
        {selectedNode && (
          <>
            {/* Card 1: Identity & Value */}
            <div className={`border rounded-xl p-3 space-y-2.5 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <Tag size={12} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
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
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono mb-1.5 border focus:outline-none focus:border-blue-500 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                  }`}
                  placeholder="e.g. 1, A, true, Root"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-[10px] mr-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Presets:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
                    }`}
                  >
                    Int ('1')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'A' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    Char ('A')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: selectedNode.label === 'true' ? 'false' : 'true' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' : 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/50'
                    }`}
                  >
                    Bool
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50'
                    }`}
                  >
                    String
                  </button>
                </div>
              </div>

              {/* Node Weight */}
              <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <Scale size={12} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
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
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono mb-1.5 border focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                  }`}
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-[10px] mr-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Presets:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { weight: 10, value: 10 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
                    }`}
                  >
                    Int (10)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { weight: 'A', value: 'A' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    Char ('A')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { weight: 'val', value: 'val' })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50'
                    }`}
                  >
                    Text
                  </button>
                  {(selectedNode.weight !== undefined || selectedNode.value !== undefined) && (
                    <button
                      type="button"
                      onClick={() => onUpdateNode(selectedNode.id, { weight: undefined, value: undefined })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                      }`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Graph Connections & Traversal */}
            <div className={`border rounded-xl p-3 space-y-2.5 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <Network size={12} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                  <span>Connections &amp; Degree</span>
                </span>
                {settings.isDirected ? (
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'text-slate-700 bg-slate-100 border-slate-300 font-medium' : 'text-slate-400 bg-slate-950 border-slate-800'
                  }`}>
                    In: {nodeConnections.inDegree} | Out: {nodeConnections.outDegree}
                  </span>
                ) : (
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'text-slate-700 bg-slate-100 border-slate-300 font-medium' : 'text-slate-400 bg-slate-950 border-slate-800'
                  }`}>
                    Deg: {nodeConnections.totalDegree}
                  </span>
                )}
              </div>

              {/* Neighbor Chips */}
              <div className="space-y-1">
                <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Adjacent Vertices:</span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {nodeConnections.neighbors.length === 0 ? (
                    <span className={`text-[10px] italic py-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>No connected edges (Isolated)</span>
                  ) : (
                    nodeConnections.neighbors.map((n, idx) => (
                      <button
                        type="button"
                        key={`${n.edgeId}-${idx}`}
                        onClick={() => onSelectNode?.(n.id)}
                        className={`px-2 py-0.5 rounded text-[10.5px] border flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 border-slate-300 hover:border-blue-500 text-slate-800'
                            : 'bg-slate-950 border-slate-800 hover:border-blue-500/60 text-slate-200'
                        }`}
                        title={`Click to trace Node ${n.label}`}
                      >
                        {n.dir === 'outgoing' ? (
                          <ArrowRight size={10} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                        ) : n.dir === 'incoming' ? (
                          <ArrowLeft size={10} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
                        ) : (
                          <CircleDot size={9} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                        )}
                        <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{n.label}</span>
                        {n.weight !== undefined && (
                          <span className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>w:{n.weight}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Algorithm Trace */}
              {onRunAlgorithm && (
                <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <span className={`text-[10px] block mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Launch Traversal from this Node:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRunAlgorithm('bfs', selectedNode.id)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
                      }`}
                      title="Run BFS traversal starting from this node"
                    >
                      <Play size={11} className={isLight ? 'fill-blue-700' : 'fill-blue-300'} />
                      <span>Trace BFS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRunAlgorithm('dfs', selectedNode.id)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
                      }`}
                      title="Run DFS traversal starting from this node"
                    >
                      <Play size={11} className={isLight ? 'fill-indigo-700' : 'fill-indigo-300'} />
                      <span>Trace DFS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Color & Hierarchy */}
            <div className={`border rounded-xl p-3 space-y-2.5 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <Palette size={12} className="text-pink-500" />
                  <span>Node Color</span>
                </span>
                <label className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-slate-100 border-slate-300 hover:border-slate-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`} title="Pick any custom live color">
                  <input
                    type="color"
                    value={selectedNode.color || '#3b82f6'}
                    onInput={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                    onChange={e => onUpdateNode(selectedNode.id, { color: (e.target as HTMLInputElement).value })}
                    className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                  />
                  <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Custom</span>
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CP_PALETTE.map(p => (
                  <button
                    type="button"
                    key={p.color}
                    onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                    className={`h-6 rounded-lg transition-transform border cursor-pointer ${
                      selectedNode.color === p.color
                        ? isLight ? 'scale-110 border-slate-900 ring-2 ring-blue-500' : 'scale-110 border-white ring-2 ring-blue-500/50'
                        : isLight ? 'border-slate-200 hover:scale-105' : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => onSetTreeRoot(selectedNode.id)}
                className={`w-full py-1.5 px-2 border text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                }`}
              >
                <GitBranch size={12} className={isLight ? 'text-emerald-600' : 'text-emerald-400'} />
                <span>Set as Tree Root</span>
              </button>
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => onDeleteNode(selectedNode.id)}
              className={`w-full py-2 px-3 rounded-xl transition-colors border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer ${
                isLight ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' : 'text-red-400 hover:bg-red-950/40 border-red-500/25'
              }`}
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
            <div className={`border rounded-xl p-3 space-y-2.5 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Edge Connection</span>
              <div className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}>
                <strong className={isLight ? 'text-blue-700' : 'text-blue-400'}>{selectedEdge.source}</strong>
                <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>{selectedEdge.directed ? '→' : '—'}</span>
                <strong className={isLight ? 'text-blue-700' : 'text-blue-400'}>{selectedEdge.target}</strong>
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
                  className={`w-full py-1.5 px-2 border text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 font-medium' : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <ArrowLeftRight size={12} />
                  <span>Reverse Direction</span>
                </button>
              )}
            </div>

            <div className={`border rounded-xl p-3 space-y-2 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Edge Weight</span>
              <input
                type="text"
                value={selectedEdge.weight ?? ''}
                placeholder="e.g. 5, cost, inf"
                onChange={e =>
                  onUpdateEdge(selectedEdge.id, {
                    weight: resolveEdgeWeightInput(e.target.value, true),
                  })
                }
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono border focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs' : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
                }`}
              />
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] mr-0.5 text-slate-500">Quick:</span>
                {[1, 5, 10].map(w => (
                  <button
                    type="button"
                    key={w}
                    onClick={() => onUpdateEdge(selectedEdge.id, { weight: w })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                      isLight ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-950/40 border-blue-800/40 text-blue-300 hover:bg-blue-900/50'
                    }`}
                  >
                    {w}
                  </button>
                ))}
                {selectedEdge.weight !== undefined && (
                  <button
                    type="button"
                    onClick={() => onUpdateEdge(selectedEdge.id, { weight: undefined })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                      isLight ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className={`border rounded-xl p-3 space-y-2 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <Palette size={12} className="text-pink-500" />
                  <span>Edge Color</span>
                </span>
                <label className={`flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-slate-100 border-slate-300 hover:border-slate-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`} title="Pick any custom live color">
                  <input
                    type="color"
                    value={selectedEdge.color || '#64748b'}
                    onInput={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                    onChange={e => onUpdateEdge(selectedEdge.id, { color: (e.target as HTMLInputElement).value })}
                    className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                  />
                  <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Custom</span>
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CP_PALETTE.map(p => (
                  <button
                    type="button"
                    key={p.color}
                    onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                    className={`h-6 rounded-lg transition-transform border cursor-pointer ${
                      selectedEdge.color === p.color
                        ? isLight ? 'scale-110 border-slate-900 ring-2 ring-blue-500' : 'scale-110 border-white ring-2 ring-blue-500/50'
                        : isLight ? 'border-slate-200 hover:scale-105' : 'border-slate-800 hover:scale-105'
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
              className={`w-full py-2 px-3 rounded-xl transition-colors border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer ${
                isLight ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' : 'text-red-400 hover:bg-red-950/40 border-red-500/25'
              }`}
              title="Delete Edge (Del)"
            >
              <Trash2 size={14} />
              <span>Delete Edge (Del)</span>
            </button>
          </div>
        )}
        </>
        )}
      </div>
      </aside>
    </>
  );
};
