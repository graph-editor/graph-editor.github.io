import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep } from '../types/graph';
import { applyForceLayoutStep } from '../utils/layout';

export interface CanvasHandle {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  cancelAction: () => void;
}

interface CanvasProps {
  data: GraphData;
  settings: GraphSettings;
  activeTool: 'select' | 'node' | 'edge';
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onAddNode: (x: number, y: number) => void;
  onAddEdge: (sourceId: string, targetId: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number, isFixed?: boolean) => void;
  onFinishDragNode: (id: string) => void;
  onTogglePinNode: (id: string) => void;
  onUpdateGraphData: (newData: GraphData) => void;
  currentStep?: AlgorithmStep;
  isPhysicsActive: boolean;
  onZoomChange?: (scale: number) => void;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
  data,
  settings,
  activeTool,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onAddNode,
  onAddEdge,
  onUpdateNodePosition,
  onFinishDragNode,
  onTogglePinNode,
  onUpdateGraphData,
  currentStep,
  isPhysicsActive,
  onZoomChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan and Zoom
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Connecting Edge state
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Hover states
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const NODE_RADIUS = 20;

  const getNodeRadius = useCallback((node?: GraphNode): number => {
    if (!node) return NODE_RADIUS;
    const len = String(node.label ?? node.id).length;
    if (len <= 2) return 20;
    if (len <= 4) return 23;
    if (len <= 6) return 26;
    return Math.min(45, 22 + len * 2.5);
  }, []);

  const getNodeFontSize = useCallback((node?: GraphNode): number => {
    if (!node) return 13;
    const len = String(node.label ?? node.id).length;
    if (len <= 2) return 13;
    if (len <= 4) return 11;
    if (len <= 6) return 10;
    return Math.max(9, Math.floor(12 - len * 0.35));
  }, []);

  // Notify parent of zoom changes
  useEffect(() => {
    onZoomChange?.(viewTransform.scale);
  }, [viewTransform.scale, onZoomChange]);

  // Transform screen coordinates to SVG graph world coordinates
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      return {
        x: (screenX - viewTransform.x) / viewTransform.scale,
        y: (screenY - viewTransform.y) / viewTransform.scale,
      };
    },
    [viewTransform]
  );

  // Fit View / Center
  const handleFitView = useCallback(() => {
    if (!svgRef.current || data.nodes.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (data.nodes.length === 1) {
      const node = data.nodes[0];
      setViewTransform({
        x: width / 2 - node.x,
        y: height / 2 - node.y,
        scale: 1,
      });
      return;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    data.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const graphWidth = Math.max(100, maxX - minX + NODE_RADIUS * 4);
    const graphHeight = Math.max(100, maxY - minY + NODE_RADIUS * 4);
    const scale = Math.min(1.5, Math.max(0.3, Math.min((width - 120) / graphWidth, (height - 120) / graphHeight)));

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    setViewTransform({
      x: width / 2 - graphCenterX * scale,
      y: height / 2 - graphCenterY * scale,
      scale,
    });
  }, [data.nodes]);

  // Cancel any in-progress canvas interaction
  const cancelAction = useCallback(() => {
    setConnectSourceId(null);
    if (draggingNodeId) {
      onFinishDragNode(draggingNodeId);
      setDraggingNodeId(null);
    }
    setIsPanning(false);
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
    setToastMessage(null);
  }, [draggingNodeId, onFinishDragNode]);

  // Expose imperative handle to BottomStatusBar and App
  useImperativeHandle(ref, () => ({
    fitView: handleFitView,
    zoomIn: () => setViewTransform(v => ({ ...v, scale: Math.min(3.5, v.scale * 1.2) })),
    zoomOut: () => setViewTransform(v => ({ ...v, scale: Math.max(0.2, v.scale * 0.8) })),
    resetZoom: () => setViewTransform(v => ({ ...v, scale: 1 })),
    cancelAction,
  }), [handleFitView, cancelAction]);

  // Cancel connecting edge if active tool changes away from 'edge'
  useEffect(() => {
    if (activeTool !== 'edge') {
      setConnectSourceId(null);
    }
  }, [activeTool]);

  // Escape key listener on Canvas to cancel all in-progress canvas actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.key.toLowerCase() === 'escape') {
        cancelAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelAction]);

  // Continuous Force Physics loop
  useEffect(() => {
    if (!isPhysicsActive || draggingNodeId !== null || data.nodes.length === 0) return;

    const interval = setInterval(() => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      onUpdateGraphData(applyForceLayoutStep(data, rect.width || 800, rect.height || 600, 1));
    }, 25);

    return () => clearInterval(interval);
  }, [isPhysicsActive, draggingNodeId, data, onUpdateGraphData]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(3.5, Math.max(0.2, viewTransform.scale * zoomFactor));

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - viewTransform.x) * (newScale / viewTransform.scale);
    const newY = mouseY - (mouseY - viewTransform.y) * (newScale / viewTransform.scale);

    setViewTransform({ x: newX, y: newY, scale: newScale });
  };

  // Canvas Mouse Down: Starts panning if clicking background or middle button
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey || (e.button === 0 && activeTool === 'select')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      onSelectNode(null);
      onSelectEdge(null);
      setConnectSourceId(null);
      return;
    }

    if (activeTool === 'node' && e.button === 0) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      onAddNode(x, y);
      showToast('Added new node');
    }
  };

  // Node Mouse Down: Handles selection and initiates node dragging if unpinned
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();

    if (activeTool === 'edge') {
      if (!connectSourceId) {
        setConnectSourceId(node.id);
      } else {
        if (connectSourceId !== node.id || settings.isDirected) {
          onAddEdge(connectSourceId, node.id);
          showToast(`Connected node ${connectSourceId} → ${node.id}`);
        }
        setConnectSourceId(null);
      }
      return;
    }

    // Select mode
    onSelectNode(node.id);
    onSelectEdge(null);

    // If node is fixed/pinned, user cannot drag it!
    if (node.isPinned) {
      showToast(`📌 Node ${node.label} is fixed. Double-click to unpin.`);
      return;
    }

    // Initiate drag
    const world = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = {
      x: node.x - world.x,
      y: node.y - world.y,
    };
    setDraggingNodeId(node.id);
  };

  // Node Double Click: TOGGLE FIXED / PINNED STATE
  const handleNodeDoubleClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    onTogglePinNode(node.id);
    if (!node.isPinned) {
      showToast(`📌 Node ${node.label} is now fixed (won't move). Double-click to unpin.`);
    } else {
      showToast(`🔓 Node ${node.label} is unpinned and can move freely.`);
    }
  };

  // Canvas Double Click: Add new node
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    onAddNode(x, y);
    showToast('Added new node');
  };

  // Global Pointer/Mouse Move & Up listeners for 100% reliable dragging and panning
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      setMousePos(world);

      if (isPanning) {
        setViewTransform(prev => ({
          ...prev,
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        }));
        return;
      }

      if (draggingNodeId) {
        const newX = world.x + dragOffsetRef.current.x;
        const newY = world.y + dragOffsetRef.current.y;
        onUpdateNodePosition(draggingNodeId, newX, newY, false);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNodeId) {
        onFinishDragNode(draggingNodeId);
        setDraggingNodeId(null);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, draggingNodeId, screenToWorld, onUpdateNodePosition, onFinishDragNode]);

  // Fast node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    data.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [data.nodes]);

  // Edges by pair to calculate curved paths
  const edgePairStats = useMemo(() => {
    const map = new Map<string, { total: number; index: number }>();
    const pairCounts = new Map<string, number>();

    data.edges.forEach(e => {
      const u = e.source;
      const v = e.target;
      const key = u < v ? `${u}--${v}` : `${v}--${u}`;
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    });

    const currentIndices = new Map<string, number>();
    data.edges.forEach(e => {
      const u = e.source;
      const v = e.target;
      const key = u < v ? `${u}--${v}` : `${v}--${u}`;
      const total = pairCounts.get(key) || 1;
      const idx = currentIndices.get(key) || 0;
      currentIndices.set(key, idx + 1);
      map.set(e.id, { total, index: idx });
    });

    return map;
  }, [data.edges]);

  // Render edge path (Straight, Curved for multi-edges, or Looped for self-loops)
  const renderEdge = (edge: GraphEdge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return null;

    const isSelected = selectedEdgeId === edge.id;
    const isHovered = hoveredEdgeId === edge.id;

    // Check algorithm highlight
    const algoEdgeHighlight = currentStep?.highlightedEdges.find(h => h.edgeId === edge.id);
    const edgeColor = algoEdgeHighlight?.color || (isSelected ? '#38bdf8' : isHovered ? '#94a3b8' : edge.color);
    const strokeWidth = isSelected || algoEdgeHighlight ? 3.5 : isHovered ? 2.5 : 2;

    // Self loop
    if (edge.source === edge.target) {
      const sourceRadius = getNodeRadius(sourceNode);
      const x = sourceNode.x;
      const y = sourceNode.y - sourceRadius;
      const loopRadius = Math.max(22, sourceRadius + 4);
      const pathD = `M ${x - 10} ${y} A ${loopRadius} ${loopRadius} 0 1 1 ${x + 10} ${y}`;

      return (
        <g
          key={edge.id}
          className="edge-group cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            onSelectEdge(edge.id);
            onSelectNode(null);
          }}
          onMouseEnter={() => setHoveredEdgeId(edge.id)}
          onMouseLeave={() => setHoveredEdgeId(null)}
        >
          <path
            d={pathD}
            fill="none"
            stroke={edgeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={algoEdgeHighlight?.style === 'dashed' ? '5,5' : undefined}
            markerEnd={settings.isDirected ? `url(#arrowhead-${edgeColor.replace('#', '')})` : undefined}
          />
          {settings.isWeighted && edge.weight !== undefined && (
            <g transform={`translate(${x}, ${y - loopRadius - 6})`}>
              <rect x="-14" y="-9" width="28" height="18" rx="4" fill="#0f172a" stroke={edgeColor} strokeWidth="1" />
              <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontFamily="Fira Code, monospace" fontWeight="600">
                {edge.weight}
              </text>
            </g>
          )}
        </g>
      );
    }

    // Between distinct nodes
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Unit vector
    const ux = dx / dist;
    const uy = dy / dist;

    // Normal vector
    const nx = -uy;
    const ny = ux;

    // Parallel edge offset
    const stats = edgePairStats.get(edge.id) || { total: 1, index: 0 };
    const isDirectedOpposite = settings.isDirected && data.edges.some(e => e.source === edge.target && e.target === edge.source);

    let curvature = 0;
    if (stats.total > 1) {
      const offsetStep = 32;
      const centerOffset = (stats.total - 1) / 2;
      curvature = (stats.index - centerOffset) * offsetStep;
    } else if (isDirectedOpposite) {
      curvature = 24;
    }

    const sourceRadius = getNodeRadius(sourceNode);
    const targetRadius = getNodeRadius(targetNode);

    // Node boundary intersection points
    const startX = sourceNode.x + ux * sourceRadius;
    const startY = sourceNode.y + uy * sourceRadius;
    const endX = targetNode.x - ux * (targetRadius + (settings.isDirected ? 6 : 0));
    const endY = targetNode.y - uy * (targetRadius + (settings.isDirected ? 6 : 0));

    let pathD = '';
    let labelX = (startX + endX) / 2;
    let labelY = (startY + endY) / 2;

    if (Math.abs(curvature) < 1) {
      pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else {
      const midX = (startX + endX) / 2 + nx * curvature;
      const midY = (startY + endY) / 2 + ny * curvature;
      pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
      labelX = (startX + 2 * midX + endX) / 4;
      labelY = (startY + 2 * midY + endY) / 4;
    }

    const markerId = `arrowhead-${edgeColor.replace('#', '')}`;

    return (
      <g
        key={edge.id}
        className="edge-group cursor-pointer"
        onClick={e => {
          e.stopPropagation();
          onSelectEdge(edge.id);
          onSelectNode(null);
        }}
        onMouseEnter={() => setHoveredEdgeId(edge.id)}
        onMouseLeave={() => setHoveredEdgeId(null)}
      >
        {/* Invisible wider stroke for easy clicking */}
        <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />

        {/* Visible stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={algoEdgeHighlight?.style === 'dashed' ? '5,5' : undefined}
          markerEnd={settings.isDirected ? `url(#${markerId})` : undefined}
          className="transition-colors duration-150"
        />

        {/* Edge weight badge */}
        {settings.isWeighted && edge.weight !== undefined && (
          <g transform={`translate(${labelX}, ${labelY})`}>
            <rect
              x="-14"
              y="-9"
              width="28"
              height="18"
              rx="4"
              fill="#0f172a"
              stroke={isSelected ? '#38bdf8' : '#334155'}
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              dy="4"
              fill={isSelected ? '#38bdf8' : '#f8fafc'}
              fontSize="11"
              fontFamily="Fira Code, monospace"
              fontWeight="600"
            >
              {edge.weight}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render individual Node
  const renderNode = (node: GraphNode) => {
    const isSelected = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const isConnectSource = connectSourceId === node.id;
    const isDragging = draggingNodeId === node.id;
    const isPinned = !!node.isPinned;

    // Algorithm state overrides
    const isActiveAlgo = currentStep?.activeNodes.includes(node.id);
    const isFrontierAlgo = currentStep?.frontierNodes.includes(node.id);
    const algoNodeColor = currentStep?.nodeColors?.[node.id];
    const annotation = currentStep?.nodeAnnotations[node.id] || node.annotation;

    const baseColor = algoNodeColor || node.color;
    const r = getNodeRadius(node);
    const fontSize = getNodeFontSize(node);

    // Cursor styling: Pinned nodes indicate fixed status; free nodes show grab
    const cursorClass = isPinned
      ? 'cursor-pointer'
      : isDragging
      ? 'cursor-grabbing'
      : 'cursor-grab';

    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        className={`node-group ${cursorClass} select-none`}
        onMouseDown={e => handleNodeMouseDown(e, node)}
        onDoubleClick={e => handleNodeDoubleClick(e, node)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        {/* Pinned / Fixed visual anchor ring */}
        {isPinned && (
          <circle
            r={r + 4}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="3,3"
            opacity="0.85"
          />
        )}

        {/* Outer Halo on Selection or Algorithm Focus */}
        {(isSelected || isActiveAlgo || isConnectSource) && (
          <circle
            r={r + 7}
            fill="none"
            stroke={isActiveAlgo ? '#f59e0b' : '#38bdf8'}
            strokeWidth="2.5"
            strokeDasharray={isActiveAlgo ? '4,4' : undefined}
            className="animate-pulse"
          />
        )}

        {/* Frontier (Queue/Stack) Ring */}
        {isFrontierAlgo && !isActiveAlgo && (
          <circle r={r + 5} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.8" />
        )}

        {/* Main Node Circle */}
        <circle
          r={r}
          fill={baseColor}
          stroke={isSelected ? '#ffffff' : isPinned ? '#f59e0b' : '#0a0e17'}
          strokeWidth={isPinned ? '2.5' : '2'}
          className="transition-transform duration-100 filter drop-shadow-lg"
        />

        {/* Node Index / Label */}
        <text
          textAnchor="middle"
          dy={fontSize * 0.35}
          fill="#ffffff"
          fontSize={fontSize}
          fontFamily="Fira Code, monospace"
          fontWeight="700"
          pointerEvents="none"
        >
          {node.label}
        </text>

        {/* Pinned / Fixed Badge Icon (TOP RIGHT) */}
        {isPinned && (
          <g transform={`translate(${r - 4}, ${-r + 4})`} className="pointer-events-none">
            <circle r="7.5" fill="#f59e0b" stroke="#0a0e17" strokeWidth="1.5" />
            <path
              d="M -3 3 L 3 -3 M 0 -3 L 3 0 M -2 2 L -4 4"
              stroke="#0a0e17"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Badge (e.g. Root, Hub, Cut) */}
        {node.badge && (
          <g transform={`translate(0, ${-r - 8})`}>
            <rect x="-18" y="-7" width="36" height="14" rx="4" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
            <text textAnchor="middle" dy="3.5" fill="#ef4444" fontSize="9" fontWeight="700">
              {node.badge}
            </text>
          </g>
        )}

        {/* Annotation (e.g. dist: 4, low: 1, SCC #1) */}
        {annotation && (
          <g transform={`translate(0, ${r + 14})`}>
            <rect
              x={-Math.max(22, annotation.length * 4)}
              y="-8"
              width={Math.max(44, annotation.length * 8)}
              height="16"
              rx="4"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              dy="3.5"
              fill="#38bdf8"
              fontSize="10"
              fontFamily="Fira Code, monospace"
              fontWeight="600"
            >
              {annotation}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Collect unique colors for SVG marker arrowheads
  const arrowheadColors = useMemo(() => {
    const colors = new Set<string>();
    colors.add('#64748b'); // default edge
    colors.add('#38bdf8'); // selected
    colors.add('#94a3b8'); // hovered
    colors.add('#10b981'); // success/MST
    colors.add('#ef4444'); // error/bridge
    colors.add('#f59e0b'); // active/relax
    data.edges.forEach(e => colors.add(e.color));
    return Array.from(colors);
  }, [data.edges]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#090d16] select-none flex-1 ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      }`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <svg ref={svgRef} className="w-full h-full">
        <defs>
          {/* Dynamic Arrowheads for each color */}
          {arrowheadColors.map(c => (
            <marker
              key={c}
              id={`arrowhead-${c.replace('#', '')}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={c} />
            </marker>
          ))}
        </defs>

        {/* Pan/Zoom World Container: Clean Solid Canvas without grid shapes */}
        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
          {/* Edges Layer */}
          <g className="edges-layer">{data.edges.map(renderEdge)}</g>

          {/* Temporary Connecting Edge when dragging in connect mode */}
          {connectSourceId && mousePos && nodeMap.get(connectSourceId) && (
            <line
              x1={nodeMap.get(connectSourceId)!.x}
              y1={nodeMap.get(connectSourceId)!.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="4,4"
              className="animate-pulse pointer-events-none"
            />
          )}

          {/* Nodes Layer */}
          <g className="nodes-layer">{data.nodes.map(renderNode)}</g>
        </g>
      </svg>

      {/* Interactive Toast Notification (cleanly centered top banner that fades) */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium text-slate-200 shadow-2xl border border-slate-700/80 pointer-events-none animate-slide-up flex items-center gap-2 z-30">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
});
