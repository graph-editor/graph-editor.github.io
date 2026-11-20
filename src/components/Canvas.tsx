import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep } from '../types/graph';
import { applyForceLayoutStep } from '../utils/layout';
import { CP_PALETTE } from '../utils/parser';

// ---------------------------------------------------------------------
// Geometry helpers for Lasso polygon testing & edge intersection
// ---------------------------------------------------------------------
function isPointInPolygon(point: { x: number; y: number }, vs: { x: number; y: number }[]): boolean {
  if (vs.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function isPointOrCircleInPolygon(node: { x: number; y: number }, r: number, vs: { x: number; y: number }[]): boolean {
  if (isPointInPolygon(node, vs)) return true;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    if (distToSegment(node, vs[j], vs[i]) <= r) return true;
  }
  return false;
}

function segmentsIntersect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number }
): boolean {
  const ccw = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) =>
    (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function doesEdgeIntersectPolygon(u: { x: number; y: number }, v: { x: number; y: number }, vs: { x: number; y: number }[]): boolean {
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    if (segmentsIntersect(u, v, vs[j], vs[i])) return true;
  }
  return false;
}

// 2D Convex Hull (Monotone Chain) for selection lasso enclosure
function computeConvexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: { x: number; y: number }[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Compute smooth lasso perimeter around any set of selected nodes
function computeSelectionLassoPolygon(
  selectedNodes: GraphNode[],
  getNodeRadius: (n?: GraphNode) => number
): { x: number; y: number }[] {
  if (selectedNodes.length === 0) return [];

  if (selectedNodes.length === 1) {
    const n = selectedNodes[0];
    const r = getNodeRadius(n) + 16;
    const pts: { x: number; y: number }[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      pts.push({ x: n.x + r * Math.cos(angle), y: n.y + r * Math.sin(angle) });
    }
    return pts;
  }

  const samples: { x: number; y: number }[] = [];
  selectedNodes.forEach(n => {
    const r = getNodeRadius(n) + 18;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      samples.push({ x: n.x + r * Math.cos(angle), y: n.y + r * Math.sin(angle) });
    }
  });

  return computeConvexHull(samples);
}

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
  activeTool: 'select' | 'lasso' | 'node' | 'edge';
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onBatchSelect?: (nodeIds: string[], edgeIds: string[]) => void;
  onAddNode: (x: number, y: number) => void;
  onAddEdge: (sourceId: string, targetId: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number, isFixed?: boolean) => void;
  onFinishDragNode: (id: string) => void;
  onUpdateGraphData: (newData: GraphData) => void;
  currentStep?: AlgorithmStep;
  isPhysicsActive: boolean;
  onZoomChange?: (scale: number) => void;
  theme?: 'dark' | 'light';
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
  data,
  settings,
  activeTool,
  selectedNodeId,
  selectedEdgeId,
  selectedNodeIds = [],
  selectedEdgeIds = [],
  onSelectNode,
  onSelectEdge,
  onBatchSelect,
  onAddNode,
  onAddEdge,
  onUpdateNodePosition,
  onFinishDragNode,
  onUpdateGraphData,
  currentStep,
  isPhysicsActive,
  onZoomChange,
  theme = 'dark',
}, ref) => {
  const isLight = theme === 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan and Zoom
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const batchDragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragNodeStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Connecting Edge state
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Hover states
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Lasso Multi-selection states
  const [activeLassoPoints, setActiveLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [persistedLassoPoints, setPersistedLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const isLassoingRef = useRef(false);
  const activeLassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  const lassoDragStartPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Persistent reference to latest selectedNodeIds to avoid stale closures
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  const pointsToSvgPath = useCallback((pts: { x: number; y: number }[]): string => {
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
  }, []);

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
      if (selectedNodeIds.includes(draggingNodeId) && selectedNodeIds.length > 1 && batchDragStartPositionsRef.current.size > 0) {
        batchDragStartPositionsRef.current.forEach((_, id) => {
          onFinishDragNode(id);
        });
        batchDragStartPositionsRef.current.clear();
      } else {
        onFinishDragNode(draggingNodeId);
      }
      setDraggingNodeId(null);
    }
    setIsPanning(false);
    isLassoingRef.current = false;
    activeLassoPointsRef.current = [];
    setActiveLassoPoints([]);
    setPersistedLassoPoints([]);
    onBatchSelect?.([], []);
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
    setToastMessage(null);
  }, [draggingNodeId, onFinishDragNode, onBatchSelect, selectedNodeIds]);

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

  const dataRef = useRef(data);
  dataRef.current = data;

  // Continuous Force Physics loop with requestAnimationFrame and equilibrium detection
  useEffect(() => {
    if (!isPhysicsActive || draggingNodeId !== null || data.nodes.length === 0) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      // Throttle to ~35-40 FPS to avoid high CPU and ensure clean WebKit paint cycles
      if (time - lastTime >= 26) {
        lastTime = time;
        if (svgRef.current && dataRef.current.nodes.length > 0) {
          const rect = svgRef.current.getBoundingClientRect();
          const nextData = applyForceLayoutStep(dataRef.current, rect.width || 800, rect.height || 600, 1);

          // Check if there was actual movement; if settled into equilibrium, skip state update
          let maxDelta = 0;
          for (let i = 0; i < nextData.nodes.length; i++) {
            const prev = dataRef.current.nodes[i];
            const curr = nextData.nodes[i];
            if (prev && curr) {
              const d = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
              if (d > maxDelta) maxDelta = d;
            }
          }

          if (maxDelta > 0.08) {
            onUpdateGraphData(nextData);
          }
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPhysicsActive, draggingNodeId, onUpdateGraphData]);

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

  // Canvas Mouse Down: Starts Lasso selection, Panning, or Node Creation
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 1. Lasso Tool or Shift + Left-click: starts drawing Lasso loop
    if (e.button === 0 && (activeTool === 'lasso' || e.shiftKey)) {
      isLassoingRef.current = true;
      const world = screenToWorld(e.clientX, e.clientY);
      activeLassoPointsRef.current = [world];
      setActiveLassoPoints([world]);
      setPersistedLassoPoints([]);
      return;
    }

    // 2. Middle click (1), Right click (2), Alt key, or Left click (0) in select mode -> Pan canvas
    if (e.button === 1 || e.button === 2 || e.altKey || (e.button === 0 && activeTool === 'select')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      if (!e.shiftKey) {
        onSelectNode(null);
        onSelectEdge(null);
        onBatchSelect?.([], []);
        setPersistedLassoPoints([]);
      }
      setConnectSourceId(null);
      return;
    }

    if (activeTool === 'node' && e.button === 0) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      onAddNode(x, y);
      showToast('Added new node');
    }
  };

  // Node Mouse Down: Handles selection and initiates node dragging (always movable)
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();

    // Right click on a node pans canvas
    if (e.button === 2) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      return;
    }

    // If holding shift or using Lasso tool: toggle node in/out of multi-selection
    if (e.shiftKey || activeTool === 'lasso') {
      const nextNodes = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter(id => id !== node.id)
        : [...selectedNodeIds, node.id];
      onBatchSelect?.(nextNodes, selectedEdgeIds);
      onSelectNode(node.id);
      return;
    }

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

    // Single select mode: select node and initiate drag
    onSelectNode(node.id);
    onSelectEdge(null);
    if (!selectedNodeIds.includes(node.id)) {
      onBatchSelect?.([], []);
      setPersistedLassoPoints([]);
    }

    // Always initiate drag - user can drag and move any node freely
    const world = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = {
      x: node.x - world.x,
      y: node.y - world.y,
    };
    dragNodeStartPosRef.current = { x: node.x, y: node.y };

    if (persistedLassoPoints.length >= 3) {
      lassoDragStartPointsRef.current = [...persistedLassoPoints];
    } else {
      lassoDragStartPointsRef.current = [];
    }

    if (selectedNodeIds.includes(node.id) && selectedNodeIds.length > 1) {
      const posMap = new Map<string, { x: number; y: number }>();
      data.nodes.forEach(n => {
        if (selectedNodeIds.includes(n.id)) {
          posMap.set(n.id, { x: n.x, y: n.y });
        }
      });
      batchDragStartPositionsRef.current = posMap;
    } else {
      batchDragStartPositionsRef.current.clear();
    }

    setDraggingNodeId(node.id);
  };

  // Node Touch Start: Handles selection and initiates touch dragging (always movable)
  const handleNodeTouchStart = (e: React.TouchEvent, node: GraphNode) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

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

    onSelectNode(node.id);
    onSelectEdge(null);

    // Always initiate touch drag
    const world = screenToWorld(touch.clientX, touch.clientY);
    dragOffsetRef.current = {
      x: node.x - world.x,
      y: node.y - world.y,
    };
    setDraggingNodeId(node.id);
  };

  // Node Double Click
  const handleNodeDoubleClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
  };

  // Canvas Double Click: Add new node
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    onAddNode(x, y);
    showToast('Added new node');
  };

  // Global Pointer/Mouse and Touch Move & Up listeners for 100% reliable dragging and panning
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      setMousePos(world);

      // Handle active Lasso path tracing
      if (isLassoingRef.current) {
        const pts = activeLassoPointsRef.current;
        if (pts.length === 0) {
          activeLassoPointsRef.current = [world];
          setActiveLassoPoints([world]);
        } else {
          const last = pts[pts.length - 1];
          const dist = Math.hypot(world.x - last.x, world.y - last.y);
          if (dist >= 3) {
            activeLassoPointsRef.current.push(world);
            setActiveLassoPoints([...activeLassoPointsRef.current]);
          }
        }
        return;
      }

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
        const dx = newX - (dragNodeStartPosRef.current?.x ?? newX);
        const dy = newY - (dragNodeStartPosRef.current?.y ?? newY);

        if (lassoDragStartPointsRef.current.length >= 3) {
          setPersistedLassoPoints(lassoDragStartPointsRef.current.map(p => ({ x: p.x + dx, y: p.y + dy })));
        }

        if (selectedNodeIdsRef.current.includes(draggingNodeId) && selectedNodeIdsRef.current.length > 1 && batchDragStartPositionsRef.current.size > 0) {
          batchDragStartPositionsRef.current.forEach((initialPos, id) => {
            onUpdateNodePosition(id, initialPos.x + dx, initialPos.y + dy, false);
          });
        } else {
          onUpdateNodePosition(draggingNodeId, newX, newY, false);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      // Finalize Lasso selection
      if (isLassoingRef.current) {
        isLassoingRef.current = false;
        const currentPts = [...activeLassoPointsRef.current];
        activeLassoPointsRef.current = [];
        setActiveLassoPoints([]);

        if (currentPts.length >= 3) {
          const newlySelectedNodeIds: string[] = [];
          const newlySelectedEdgeIds: string[] = [];

          // Detect enclosed or intersected nodes
          dataRef.current.nodes.forEach(node => {
            const r = getNodeRadius(node);
            if (isPointOrCircleInPolygon(node, r, currentPts)) {
              newlySelectedNodeIds.push(node.id);
            }
          });

          // Detect edges whose nodes or segments are intersected/enclosed
          const nodeMapLocal = new Map<string, GraphNode>();
          dataRef.current.nodes.forEach(n => nodeMapLocal.set(n.id, n));

          dataRef.current.edges.forEach(edge => {
            const u = nodeMapLocal.get(edge.source);
            const v = nodeMapLocal.get(edge.target);
            if (u && v) {
              const uIn = newlySelectedNodeIds.includes(u.id);
              const vIn = newlySelectedNodeIds.includes(v.id);
              if ((uIn && vIn) || doesEdgeIntersectPolygon(u, v, currentPts)) {
                newlySelectedEdgeIds.push(edge.id);
              }
            }
          });

          onBatchSelect?.(newlySelectedNodeIds, newlySelectedEdgeIds);

          if (newlySelectedNodeIds.length > 0 || newlySelectedEdgeIds.length > 0) {
            setPersistedLassoPoints(currentPts);
            showToast(`Lasso selected ${newlySelectedNodeIds.length} nodes, ${newlySelectedEdgeIds.length} edges`);
          } else {
            setPersistedLassoPoints([]);
          }
        } else {
          setPersistedLassoPoints([]);
        }
      }

      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNodeId) {
        if (selectedNodeIdsRef.current.includes(draggingNodeId) && selectedNodeIdsRef.current.length > 1 && batchDragStartPositionsRef.current.size > 0) {
          batchDragStartPositionsRef.current.forEach((_, id) => {
            onFinishDragNode(id);
          });
          batchDragStartPositionsRef.current.clear();
        } else {
          onFinishDragNode(draggingNodeId);
        }
        setDraggingNodeId(null);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const zoomDelta = dist / lastPinchDistRef.current;
        lastPinchDistRef.current = dist;

        if (svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

          setViewTransform(prev => {
            const nextScale = Math.min(3.5, Math.max(0.2, prev.scale * zoomDelta));
            const nextX = midX - (midX - prev.x) * (nextScale / prev.scale);
            const nextY = midY - (midY - prev.y) * (nextScale / prev.scale);
            return { x: nextX, y: nextY, scale: nextScale };
          });
        }
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const world = screenToWorld(touch.clientX, touch.clientY);
        setMousePos(world);

        if (isPanning) {
          e.preventDefault();
          setViewTransform(prev => ({
            ...prev,
            x: touch.clientX - panStartRef.current.x,
            y: touch.clientY - panStartRef.current.y,
          }));
          return;
        }

        if (draggingNodeId) {
          e.preventDefault();
          const newX = world.x + dragOffsetRef.current.x;
          const newY = world.y + dragOffsetRef.current.y;
          onUpdateNodePosition(draggingNodeId, newX, newY, false);
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      lastPinchDistRef.current = null;
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
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
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

  // Nodes involved in selection for lasso enclosure
  const allSelectedNodesForLasso = useMemo(() => {
    const set = new Set<string>();
    if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach(id => set.add(id));
    } else if (selectedNodeId) {
      set.add(selectedNodeId);
    }

    if (selectedEdgeIds.length > 0) {
      selectedEdgeIds.forEach(edgeId => {
        const edge = data.edges.find(e => e.id === edgeId);
        if (edge) {
          set.add(edge.source);
          set.add(edge.target);
        }
      });
    } else if (selectedEdgeId) {
      const edge = data.edges.find(e => e.id === selectedEdgeId);
      if (edge) {
        set.add(edge.source);
        set.add(edge.target);
      }
    }

    return Array.from(set)
      .map(id => nodeMap.get(id))
      .filter((n): n is GraphNode => Boolean(n));
  }, [selectedNodeIds, selectedNodeId, selectedEdgeIds, selectedEdgeId, data.edges, nodeMap]);

  // Clean up persisted points when nothing is selected
  useEffect(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0 && !selectedNodeId && !selectedEdgeId) {
      if (persistedLassoPoints.length > 0) {
        setPersistedLassoPoints([]);
      }
    }
  }, [selectedNodeIds, selectedEdgeIds, selectedNodeId, selectedEdgeId, persistedLassoPoints.length]);

  // Displayed lasso points for the persistent selection enclosure
  const displayLassoPoints = useMemo(() => {
    if (persistedLassoPoints.length >= 3) return persistedLassoPoints;
    if (allSelectedNodesForLasso.length === 0) return [];
    return computeSelectionLassoPolygon(allSelectedNodesForLasso, getNodeRadius);
  }, [persistedLassoPoints, allSelectedNodesForLasso, getNodeRadius]);

  // Render edge path (Straight, Curved for multi-edges, or Looped for self-loops)
  const renderEdge = (edge: GraphEdge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return null;

    const isSelected = selectedEdgeId === edge.id || selectedEdgeIds.includes(edge.id);
    const isHovered = hoveredEdgeId === edge.id;

    // Check algorithm highlight
    const algoEdgeHighlight = currentStep?.highlightedEdges.find(h => h.edgeId === edge.id);
    const defaultColor = isLight ? '#94a3b8' : '#52525b';
    const effectiveEdgeColor = algoEdgeHighlight?.color || (isHovered && !isSelected ? (isLight ? '#475569' : '#a1a1aa') : (edge.color === '#64748b' ? defaultColor : edge.color));
    const strokeWidth = isSelected || algoEdgeHighlight ? 3.5 : isHovered ? 2.5 : 2;

    const handleEdgeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey || activeTool === 'lasso') {
        const nextEdges = selectedEdgeIds.includes(edge.id)
          ? selectedEdgeIds.filter(id => id !== edge.id)
          : [...selectedEdgeIds, edge.id];
        onBatchSelect?.(selectedNodeIds, nextEdges);
        onSelectEdge(edge.id);
        return;
      }
      onSelectEdge(edge.id);
      onSelectNode(null);
      if (!selectedEdgeIds.includes(edge.id)) {
        onBatchSelect?.([], []);
        setPersistedLassoPoints([]);
      }
    };

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
          onClick={handleEdgeClick}
          onMouseEnter={() => setHoveredEdgeId(edge.id)}
          onMouseLeave={() => setHoveredEdgeId(null)}
        >
          {/* Selection Halo */}
          {isSelected && (
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={strokeWidth + 5}
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
          )}
          <path
            d={pathD}
            fill="none"
            stroke={effectiveEdgeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={algoEdgeHighlight?.style === 'dashed' ? '5,5' : undefined}
            markerEnd={settings.isDirected ? `url(#arrowhead-${effectiveEdgeColor.replace('#', '')})` : undefined}
          />
          {settings.isWeighted && edge.weight !== undefined && (
            <g transform={`translate(${x}, ${y - loopRadius - 6})`}>
              <rect x="-14" y="-9" width="28" height="18" rx="4" fill="#0f172a" stroke={effectiveEdgeColor} strokeWidth="1" />
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

    const markerId = `arrowhead-${effectiveEdgeColor.replace('#', '')}`;

    return (
      <g
        key={edge.id}
        className="edge-group cursor-pointer"
        onClick={handleEdgeClick}
        onMouseEnter={() => setHoveredEdgeId(edge.id)}
        onMouseLeave={() => setHoveredEdgeId(null)}
      >
        {/* Invisible wider stroke for easy clicking */}
        <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />

        {/* Selection Halo */}
        {isSelected && (
          <path
            d={pathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={strokeWidth + 5}
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
        )}

        {/* Visible stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={effectiveEdgeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={algoEdgeHighlight?.style === 'dashed' ? '5,5' : undefined}
          markerEnd={settings.isDirected ? `url(#${markerId})` : undefined}
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
              fill={isLight ? '#ffffff' : '#0a0a0a'}
              stroke={isSelected ? '#38bdf8' : isLight ? '#cbd5e1' : '#262626'}
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              dy="4"
              fill={isSelected ? '#38bdf8' : isLight ? '#0f172a' : '#f8fafc'}
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
    const isSelected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
    const isHovered = hoveredNodeId === node.id;
    const isConnectSource = connectSourceId === node.id;
    const isDragging = draggingNodeId === node.id;

    // Algorithm state overrides
    const isActiveAlgo = currentStep?.activeNodes.includes(node.id);
    const isFrontierAlgo = currentStep?.frontierNodes.includes(node.id);
    const algoNodeColor = currentStep?.nodeColors?.[node.id];
    const annotation = currentStep?.nodeAnnotations[node.id] || node.annotation;

    const baseColor = algoNodeColor || node.color;
    const r = getNodeRadius(node);
    const fontSize = getNodeFontSize(node);

    // Cursor styling: Clean grab/grabbing indicator
    const cursorClass = isDragging ? 'cursor-grabbing' : 'cursor-grab';

    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        className={`node-group ${cursorClass} select-none`}
        onMouseDown={e => handleNodeMouseDown(e, node)}
        onTouchStart={e => handleNodeTouchStart(e, node)}
        onDoubleClick={e => handleNodeDoubleClick(e, node)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        {/* Outer Halo on Selection or Algorithm Focus */}
        {(isSelected || isActiveAlgo || isConnectSource) && (
          <circle
            r={r + 7}
            fill="none"
            stroke={isActiveAlgo ? '#f59e0b' : '#38bdf8'}
            strokeWidth="2.5"
            strokeDasharray={isActiveAlgo ? '4,4' : undefined}
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
          stroke={isSelected ? (isLight ? '#0f172a' : '#ffffff') : isLight ? '#cbd5e1' : '#000000'}
          strokeWidth={isSelected ? '2.5' : '2'}
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

        {/* Badge (e.g. Root, Hub, Cut) */}
        {node.badge && (
          <g transform={`translate(0, ${-r - 8})`}>
            <rect x="-18" y="-7" width="36" height="14" rx="4" fill={isLight ? '#ffffff' : '#0a0a0a'} stroke="#ef4444" strokeWidth="1" />
            <text textAnchor="middle" dy="3.5" fill="#ef4444" fontSize="9" fontWeight="700">
              {node.badge}
            </text>
          </g>
        )}

        {/* Node Weight Badge (supports number, char, or string) */}
        {(() => {
          const rawW = node.weight ?? node.value;
          if (rawW === undefined || rawW === null || String(rawW).trim() === '') return null;
          const wStr = String(rawW);
          const badgeWidth = Math.max(30, wStr.length * 7 + 18);
          const yOffset = r + 13;
          return (
            <g transform={`translate(0, ${yOffset})`} className="pointer-events-none">
              <rect
                x={-badgeWidth / 2}
                y="-8"
                width={badgeWidth}
                height="16"
                rx="8"
                fill={isLight ? '#ffffff' : '#0a0a0a'}
                stroke={isSelected ? '#38bdf8' : isLight ? '#cbd5e1' : '#334155'}
                strokeWidth="1.2"
              />
              <text
                textAnchor="middle"
                dy="3.5"
                fill={isSelected ? '#38bdf8' : isLight ? '#0f172a' : '#c7d2fe'}
                fontSize="9.5"
                fontFamily="Fira Code, monospace"
                fontWeight="700"
              >
                {`w:${wStr}`}
              </text>
            </g>
          );
        })()}

        {/* Annotation (e.g. dist: 4, low: 1, SCC #1) */}
        {annotation && (() => {
          const hasNodeWeight =
            (node.weight !== undefined && node.weight !== null && String(node.weight).trim() !== '') ||
            (node.value !== undefined && node.value !== null && String(node.value).trim() !== '');
          const annotY = hasNodeWeight ? r + 33 : r + 14;
          return (
            <g transform={`translate(0, ${annotY})`}>
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
          );
        })()}
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
    CP_PALETTE.forEach(p => colors.add(p.color));
    data.edges.forEach(e => colors.add(e.color));
    return Array.from(colors);
  }, [data.edges]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none flex-1 touch-none transition-colors ${
        isLight ? 'bg-white' : 'bg-black'
      } ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      }`}
      style={{ backgroundColor: isLight ? '#ffffff' : '#000000', isolation: 'isolate' }}
      onContextMenu={e => e.preventDefault()}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onDoubleClick={handleCanvasDoubleClick}
      onTouchStart={e => {
        if (e.touches.length === 2) {
          lastPinchDistRef.current = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          setIsPanning(false);
          return;
        }
        if (e.touches.length === 1 && activeTool === 'select') {
          const touch = e.touches[0];
          setIsPanning(true);
          panStartRef.current = { x: touch.clientX - viewTransform.x, y: touch.clientY - viewTransform.y };
          onSelectNode(null);
          onSelectEdge(null);
          setConnectSourceId(null);
        }
      }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full block"
        style={{ backgroundColor: isLight ? '#ffffff' : '#000000', contain: 'strict' }}
      >
        {/* Solid Canvas Background rect to guarantee clean frame clears without WebKit/Chromium dirty-rect trails */}
        <rect width="100%" height="100%" fill={isLight ? '#ffffff' : '#000000'} />

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

          {/* Persistent Selection Lasso Enclosure (between edges and nodes) */}
          {activeLassoPoints.length < 2 && displayLassoPoints.length >= 3 && (
            <g className="selection-lasso pointer-events-none">
              <path
                d={pointsToSvgPath(displayLassoPoints)}
                fill="rgba(56, 189, 248, 0.10)"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d={pointsToSvgPath(displayLassoPoints)}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6,4"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))"
              />
            </g>
          )}

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
              className="pointer-events-none"
            />
          )}

          {/* Nodes Layer */}
          <g className="nodes-layer">{data.nodes.map(renderNode)}</g>

          {/* Active Real-Time Lasso Path (Rendered on top of everything while tracking) */}
          {activeLassoPoints.length > 1 && (
            <g className="active-lasso pointer-events-none">
              {/* Semi-transparent closed preview */}
              <path
                d={pointsToSvgPath(activeLassoPoints)}
                fill="rgba(56, 189, 248, 0.14)"
                stroke="none"
              />
              {/* Active drawn path line */}
              <path
                d={activeLassoPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 5px rgba(56, 189, 248, 0.7))"
              />
              {/* Dashed closing line back to loop origin */}
              <line
                x1={activeLassoPoints[activeLassoPoints.length - 1].x}
                y1={activeLassoPoints[activeLassoPoints.length - 1].y}
                x2={activeLassoPoints[0].x}
                y2={activeLassoPoints[0].y}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.8"
              />
              {/* Anchor point at origin */}
              <circle
                cx={activeLassoPoints[0].x}
                cy={activeLassoPoints[0].y}
                r="4.5"
                fill="#38bdf8"
                stroke={isLight ? '#ffffff' : '#000000'}
                strokeWidth="2"
              />
            </g>
          )}
        </g>
      </svg>

      {/* Interactive Toast Notification (cleanly centered top banner that fades) */}
      {toastMessage && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium shadow-2xl border pointer-events-none animate-slide-up flex items-center gap-2 z-30 ${
          isLight ? 'bg-white/95 text-slate-800 border-slate-200 shadow-xl' : 'bg-neutral-900/95 text-neutral-200 border-neutral-700 shadow-2xl'
        }`}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
});
