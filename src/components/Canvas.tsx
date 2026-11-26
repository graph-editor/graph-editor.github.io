import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep, GraphNote } from '../types/graph';
import { applyForceLayoutStep } from '../utils/layout';
import { CP_PALETTE } from '../utils/parser';
import { CanvasNoteCard } from './CanvasNoteCard';

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

// Contrast calculation to guarantee node labels are crisp & visible across any node background color
function getContrastTextColor(hexColor?: string, isLightMode = false): string {
  if (!hexColor) return isLightMode ? '#0f172a' : '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return isLightMode ? '#0f172a' : '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

// Robust SVG marker ID generator for high-contrast arrowheads
const getMarkerId = (color: string) => {
  const clean = (color || '#94a3b8').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `arrowhead-${clean}`;
};

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
  getVisibleCenter: () => { x: number; y: number };
  getVisibleBounds: () => { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number };
  ensureNodeVisible: (nodeId: string) => void;
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
  onUpdateNodePositions?: (updates: { id: string; x: number; y: number }[]) => void;
  onFinishDragNode: (id: string) => void;
  onFinishDragNodes?: (ids: string[]) => void;
  onUpdateGraphData: (newData: GraphData) => void;
  currentStep?: AlgorithmStep;
  isPhysicsActive: boolean;
  onZoomChange?: (scale: number) => void;
  theme?: 'dark' | 'light';
  activeGraphIndex?: number;
  onSelectGraphTab?: (graphIndex: number) => void;
  notes?: GraphNote[];
  newlyAddedNoteId?: string | null;
  onUpdateNote?: (id: string, updates: Partial<GraphNote>) => void;
  onCommitNoteHistory?: () => void;
  onDeleteNote?: (id: string) => void;
  onBringNoteToFront?: (id: string) => void;
}

const CANVAS_MONO_FONT = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

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
  onUpdateNodePositions,
  onFinishDragNode,
  onFinishDragNodes,
  onUpdateGraphData,
  currentStep,
  isPhysicsActive,
  onZoomChange,
  theme = 'dark',
  activeGraphIndex = 0,
  onSelectGraphTab,
  notes = [],
  newlyAddedNoteId = null,
  onUpdateNote,
  onCommitNoteHistory,
  onDeleteNote,
  onBringNoteToFront,
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
  const nodeClickStartPosRef = useRef<{ x: number; y: number; nodeId: string } | null>(null);

  // Connecting Edge state
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Hover states
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Lasso Multi-selection states (active only while drawing with pointer down)
  const [activeLassoPoints, setActiveLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const isLassoingRef = useRef(false);
  const activeLassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [isLassoSelected, setIsLassoSelected] = useState(false);

  // Reset lasso selection view whenever user is not actively using the Lasso tool
  useEffect(() => {
    if (activeTool !== 'lasso') {
      setIsLassoSelected(false);
      setActiveLassoPoints([]);
      isLassoingRef.current = false;
    }
  }, [activeTool]);

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

  // Double click detection on canvas refs
  const lastCanvasClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastAddedNodeTimeRef = useRef<number>(0);

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
    if (!node) return 14;
    const len = String(node.label ?? node.id).length;
    if (len <= 2) return 15;
    if (len <= 4) return 13;
    if (len <= 6) return 11.5;
    return Math.max(10, Math.floor(13 - len * 0.35));
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
      if (batchDragStartPositionsRef.current.size > 0) {
        const ids = Array.from(batchDragStartPositionsRef.current.keys());
        if (onFinishDragNodes) {
          onFinishDragNodes(ids);
        } else {
          ids.forEach(id => onFinishDragNode(id));
        }
        batchDragStartPositionsRef.current.clear();
      } else if (draggingNodeId !== '__lasso_batch__' && !draggingNodeId.startsWith('__graph_box_')) {
        onFinishDragNode(draggingNodeId);
      }
      setDraggingNodeId(null);
    }
    setIsPanning(false);
    isLassoingRef.current = false;
    activeLassoPointsRef.current = [];
    setActiveLassoPoints([]);
    setIsLassoSelected(false);
    onBatchSelect?.([], []);
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
    setToastMessage(null);
  }, [draggingNodeId, onFinishDragNode, onFinishDragNodes, onBatchSelect]);

  // Get current world coordinates of visible viewport bounds and center
  const getVisibleBounds = useCallback(() => {
    if (!svgRef.current) {
      return { minX: 0, maxX: 800, minY: 0, maxY: 600, centerX: 400, centerY: 300 };
    }
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    const minX = (0 - viewTransform.x) / viewTransform.scale;
    const maxX = (width - viewTransform.x) / viewTransform.scale;
    const minY = (0 - viewTransform.y) / viewTransform.scale;
    const maxY = (height - viewTransform.y) / viewTransform.scale;
    const centerX = (width / 2 - viewTransform.x) / viewTransform.scale;
    const centerY = (height / 2 - viewTransform.y) / viewTransform.scale;
    return { minX, maxX, minY, maxY, centerX, centerY };
  }, [viewTransform]);

  const getVisibleCenter = useCallback(() => {
    const b = getVisibleBounds();
    return { x: b.centerX, y: b.centerY };
  }, [getVisibleBounds]);

  // Ensure specified node is visibly positioned inside viewport
  const ensureNodeVisible = useCallback((nodeId: string) => {
    if (!svgRef.current) return;
    const node = dataRef.current.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    const pad = 75;

    const screenX = node.x * viewTransform.scale + viewTransform.x;
    const screenY = node.y * viewTransform.scale + viewTransform.y;

    if (screenX < pad || screenX > width - pad || screenY < pad || screenY > height - pad) {
      setViewTransform(prev => ({
        ...prev,
        x: width / 2 - node.x * prev.scale,
        y: height / 2 - node.y * prev.scale,
      }));
    }
  }, [viewTransform]);

  // Expose imperative handle to BottomStatusBar and App
  useImperativeHandle(ref, () => ({
    fitView: handleFitView,
    zoomIn: () => setViewTransform(v => ({ ...v, scale: Math.min(3.5, v.scale * 1.2) })),
    zoomOut: () => setViewTransform(v => ({ ...v, scale: Math.max(0.2, v.scale * 0.8) })),
    resetZoom: () => setViewTransform(v => ({ ...v, scale: 1 })),
    cancelAction,
    getVisibleCenter,
    getVisibleBounds,
    ensureNodeVisible,
  }), [handleFitView, cancelAction, getVisibleCenter, getVisibleBounds, ensureNodeVisible]);

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
    // If we were in connect mode, clear on canvas click
    if (connectSourceId) {
      setConnectSourceId(null);
    }

    // Rapid double click on empty canvas detection
    if (e.button === 0 && !e.shiftKey && activeTool !== 'lasso') {
      const now = performance.now();
      const last = lastCanvasClickRef.current;
      if (last && now - last.time < 350 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 20) {
        lastCanvasClickRef.current = null;
        lastAddedNodeTimeRef.current = now;
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        onAddNode(x, y);
        showToast('Added new node');
        return;
      }
      lastCanvasClickRef.current = { time: now, x: e.clientX, y: e.clientY };
    }

    // 1. Lasso Tool or Shift + Left-click: starts drawing Lasso loop
    if (e.button === 0 && (activeTool === 'lasso' || e.shiftKey)) {
      isLassoingRef.current = true;
      const world = screenToWorld(e.clientX, e.clientY);
      activeLassoPointsRef.current = [world];
      setActiveLassoPoints([world]);
      return;
    }

    // 2. Middle click (1), Right click (2), Alt key, or Left click (0) in select mode -> Pan canvas
    if (e.button === 1 || e.button === 2 || e.altKey || (e.button === 0 && activeTool === 'select')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        onSelectNode(null);
        onSelectEdge(null);
        onBatchSelect?.([], []);
        setIsLassoSelected(false);
      }
      return;
    }

    if (activeTool === 'node' && e.button === 0) {
      lastAddedNodeTimeRef.current = performance.now();
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      onAddNode(x, y);
      showToast('Added new node');
    }
  };

  // Node Mouse Down: Handles selection, edge connection, and initiates node / batch dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();

    // If already in connect mode (e.g. from double-clicking a node or using edge tool)
    if (connectSourceId) {
      if (connectSourceId !== node.id || settings.isDirected) {
        onAddEdge(connectSourceId, node.id);
        showToast(`Connected node ${connectSourceId} → ${node.id}`);
      }
      setConnectSourceId(null);
      return;
    }

    // Right click on a node pans canvas
    if (e.button === 2) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      return;
    }

    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;

    // If holding Ctrl/Cmd/Shift: toggle node in/out of multi-selection and prepare batch dragging
    if (isMultiSelect) {
      setIsLassoSelected(false);
      nodeClickStartPosRef.current = { x: e.clientX, y: e.clientY, nodeId: node.id };
      const baseNodes = selectedNodeId && !selectedNodeIds.includes(selectedNodeId)
        ? [...selectedNodeIds, selectedNodeId]
        : selectedNodeIds;
      const baseEdges = selectedEdgeId && !selectedEdgeIds.includes(selectedEdgeId)
        ? [...selectedEdgeIds, selectedEdgeId]
        : selectedEdgeIds;
      const isAlreadySelected = baseNodes.includes(node.id);
      const nextNodes = isAlreadySelected
        ? baseNodes.filter(id => id !== node.id)
        : [...baseNodes, node.id];
      onBatchSelect?.(nextNodes, baseEdges);
      onSelectNode(isAlreadySelected ? (nextNodes[nextNodes.length - 1] || null) : node.id);

      // Prepare batch drag positions in case user drags while holding modifier
      const nodeGIdx = node.graphIndex ?? 0;
      const nodesToMove = data.nodes.filter(n => nextNodes.includes(n.id) && (n.graphIndex ?? 0) === nodeGIdx);
      if (nodesToMove.length > 0) {
        const world = screenToWorld(e.clientX, e.clientY);
        dragOffsetRef.current = {
          x: node.x - world.x,
          y: node.y - world.y,
        };
        dragNodeStartPosRef.current = { x: node.x, y: node.y };

        const posMap = new Map<string, { x: number; y: number }>();
        nodesToMove.forEach(n => {
          posMap.set(n.id, { x: n.x, y: n.y });
        });
        batchDragStartPositionsRef.current = posMap;
        setDraggingNodeId(node.id);
      }
      return;
    }

    if (activeTool === 'edge') {
      setConnectSourceId(node.id);
      return;
    }

    // Record position on pointer down to distinguish pure click (selection change) from dragging
    nodeClickStartPosRef.current = { x: e.clientX, y: e.clientY, nodeId: node.id };

    const nodeGIdx = node.graphIndex ?? 0;
    const isNodeInSelection =
      selectedNodeIds.includes(node.id) ||
      selectedNodeId === node.id ||
      allSelectedNodesForLasso.some(n => n.id === node.id);

    // If node is already part of the lasso/multi selection:
    // Move ONLY selected nodes that belong to the SAME graph!
    const nodesToBatchMove = allSelectedNodesForLasso.filter(n => (n.graphIndex ?? 0) === nodeGIdx);
    if (isNodeInSelection && nodesToBatchMove.length > 1) {
      const world = screenToWorld(e.clientX, e.clientY);
      dragOffsetRef.current = {
        x: node.x - world.x,
        y: node.y - world.y,
      };
      dragNodeStartPosRef.current = { x: node.x, y: node.y };

      const posMap = new Map<string, { x: number; y: number }>();
      nodesToBatchMove.forEach(n => {
        posMap.set(n.id, { x: n.x, y: n.y });
      });
      batchDragStartPositionsRef.current = posMap;

      setDraggingNodeId(node.id);
      return;
    }

    // Single select mode: select node and initiate drag
    setIsLassoSelected(false);
    onSelectNode(node.id);
    onSelectEdge(null);
    if (!selectedNodeIds.includes(node.id)) {
      onBatchSelect?.([node.id], []);
    }

    // Always initiate drag - user can drag and move any node freely
    const world = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = {
      x: node.x - world.x,
      y: node.y - world.y,
    };
    dragNodeStartPosRef.current = { x: node.x, y: node.y };

    batchDragStartPositionsRef.current.clear();
    setDraggingNodeId(node.id);
  };

  // Node Touch Start: Handles selection and initiates touch dragging (always movable)
  const handleNodeTouchStart = (e: React.TouchEvent, node: GraphNode) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (connectSourceId) {
      if (connectSourceId !== node.id || settings.isDirected) {
        onAddEdge(connectSourceId, node.id);
        showToast(`Connected node ${connectSourceId} → ${node.id}`);
      }
      setConnectSourceId(null);
      return;
    }

    if (activeTool === 'edge') {
      setConnectSourceId(node.id);
      return;
    }

    nodeClickStartPosRef.current = { x: touch.clientX, y: touch.clientY, nodeId: node.id };
    setIsLassoSelected(false);

    const nodeGIdx = node.graphIndex ?? 0;
    const isNodeInSelection =
      selectedNodeIds.includes(node.id) ||
      selectedNodeId === node.id ||
      allSelectedNodesForLasso.some(n => n.id === node.id);

    const nodesToBatchMove = allSelectedNodesForLasso.filter(n => (n.graphIndex ?? 0) === nodeGIdx);
    const world = screenToWorld(touch.clientX, touch.clientY);
    dragOffsetRef.current = {
      x: node.x - world.x,
      y: node.y - world.y,
    };
    dragNodeStartPosRef.current = { x: node.x, y: node.y };

    if (isNodeInSelection && nodesToBatchMove.length > 1) {
      const posMap = new Map<string, { x: number; y: number }>();
      nodesToBatchMove.forEach(n => {
        posMap.set(n.id, { x: n.x, y: n.y });
      });
      batchDragStartPositionsRef.current = posMap;
      setDraggingNodeId(node.id);
      return;
    }

    onSelectNode(node.id);
    onSelectEdge(null);
    if (!selectedNodeIds.includes(node.id)) {
      onBatchSelect?.([node.id], []);
    }

    batchDragStartPositionsRef.current.clear();
    setDraggingNodeId(node.id);
  };

  // Lasso Enclosure Mouse Down: Move the entire selected graph by dragging the lasso area
  const handleLassoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (allSelectedNodesForLasso.length === 0) return;

    const world = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = { x: 0, y: 0 };
    dragNodeStartPosRef.current = { x: world.x, y: world.y };

    const posMap = new Map<string, { x: number; y: number }>();
    allSelectedNodesForLasso.forEach(n => {
      posMap.set(n.id, { x: n.x, y: n.y });
    });
    batchDragStartPositionsRef.current = posMap;

    setDraggingNodeId('__lasso_batch__');
  };

  // Lasso Enclosure Touch Start: Touch drag the entire selected graph
  const handleLassoTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    if (allSelectedNodesForLasso.length === 0) return;

    const touch = e.touches[0];
    const world = screenToWorld(touch.clientX, touch.clientY);
    dragOffsetRef.current = { x: 0, y: 0 };
    dragNodeStartPosRef.current = { x: world.x, y: world.y };

    const posMap = new Map<string, { x: number; y: number }>();
    allSelectedNodesForLasso.forEach(n => {
      posMap.set(n.id, { x: n.x, y: n.y });
    });
    batchDragStartPositionsRef.current = posMap;

    setDraggingNodeId('__lasso_batch__');
  };

  // Node Double Click: Enter edge connection mode to connect to another node
  const handleNodeDoubleClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    setConnectSourceId(node.id);
    showToast(`Connecting from Node ${node.label || node.id}... Click another node to connect`);
  };

  // Canvas Double Click: Add new node
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastAddedNodeTimeRef.current < 450) {
      return;
    }
    lastAddedNodeTimeRef.current = now;
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

        if (batchDragStartPositionsRef.current.size > 0) {
          if (onUpdateNodePositions) {
            const updates: { id: string; x: number; y: number }[] = [];
            batchDragStartPositionsRef.current.forEach((initialPos, id) => {
              updates.push({ id, x: initialPos.x + dx, y: initialPos.y + dy });
            });
            onUpdateNodePositions(updates);
          } else {
            batchDragStartPositionsRef.current.forEach((initialPos, id) => {
              onUpdateNodePosition(id, initialPos.x + dx, initialPos.y + dy, false);
            });
          }
        } else if (draggingNodeId !== '__lasso_batch__') {
          onUpdateNodePosition(draggingNodeId, newX, newY, false);
        }
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
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

          onSelectNode(newlySelectedNodeIds.length > 0 ? newlySelectedNodeIds[newlySelectedNodeIds.length - 1] : null);
          onSelectEdge(newlySelectedEdgeIds.length > 0 ? newlySelectedEdgeIds[newlySelectedEdgeIds.length - 1] : null);
          onBatchSelect?.(newlySelectedNodeIds, newlySelectedEdgeIds);
          if (newlySelectedNodeIds.length > 0) {
            setIsLassoSelected(true);
          }

          if (newlySelectedNodeIds.length > 0 || newlySelectedEdgeIds.length > 0) {
            showToast(`Lasso selected ${newlySelectedNodeIds.length} nodes (drag to move)`);
          }
        }
      }

      if (nodeClickStartPosRef.current) {
        const { x, y, nodeId } = nodeClickStartPosRef.current;
        nodeClickStartPosRef.current = null;
        const distMoved = Math.hypot(e.clientX - x, e.clientY - y);
        if (distMoved < 4 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          onSelectNode(nodeId);
          onBatchSelect?.([nodeId], []);
        }
      }

      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNodeId) {
        if (batchDragStartPositionsRef.current.size > 0) {
          const ids = Array.from(batchDragStartPositionsRef.current.keys());
          if (onFinishDragNodes) {
            onFinishDragNodes(ids);
          } else {
            ids.forEach(id => onFinishDragNode(id));
          }
          batchDragStartPositionsRef.current.clear();
        } else if (draggingNodeId !== '__lasso_batch__' && !draggingNodeId.startsWith('__graph_box_')) {
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
          const dx = newX - (dragNodeStartPosRef.current?.x ?? newX);
          const dy = newY - (dragNodeStartPosRef.current?.y ?? newY);

          if (batchDragStartPositionsRef.current.size > 0) {
            if (onUpdateNodePositions) {
              const updates: { id: string; x: number; y: number }[] = [];
              batchDragStartPositionsRef.current.forEach((initialPos, id) => {
                updates.push({ id, x: initialPos.x + dx, y: initialPos.y + dy });
              });
              onUpdateNodePositions(updates);
            } else {
              batchDragStartPositionsRef.current.forEach((initialPos, id) => {
                onUpdateNodePosition(id, initialPos.x + dx, initialPos.y + dy, false);
              });
            }
          } else if (draggingNodeId !== '__lasso_batch__') {
            onUpdateNodePosition(draggingNodeId, newX, newY, false);
          }
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      lastPinchDistRef.current = null;
      nodeClickStartPosRef.current = null;

      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNodeId) {
        if (batchDragStartPositionsRef.current.size > 0) {
          const ids = Array.from(batchDragStartPositionsRef.current.keys());
          if (onFinishDragNodes) {
            onFinishDragNodes(ids);
          } else {
            ids.forEach(id => onFinishDragNode(id));
          }
          batchDragStartPositionsRef.current.clear();
        } else if (draggingNodeId !== '__lasso_batch__' && !draggingNodeId.startsWith('__graph_box_')) {
          onFinishDragNode(draggingNodeId);
        }
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
  }, [isPanning, draggingNodeId, screenToWorld, onUpdateNodePosition, onUpdateNodePositions, onFinishDragNode, onFinishDragNodes]);

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
      const hasOpp = data.edges.some(oe => oe.id !== e.id && oe.source === v && oe.target === u);
      const isDir = Boolean(e.directed || settings.isDirected || hasOpp);
      const key = isDir ? `${u}->${v}` : (u < v ? `${u}--${v}` : `${v}--${u}`);
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    });

    const currentIndices = new Map<string, number>();
    data.edges.forEach(e => {
      const u = e.source;
      const v = e.target;
      const hasOpp = data.edges.some(oe => oe.id !== e.id && oe.source === v && oe.target === u);
      const isDir = Boolean(e.directed || settings.isDirected || hasOpp);
      const key = isDir ? `${u}->${v}` : (u < v ? `${u}--${v}` : `${v}--${u}`);
      const total = pairCounts.get(key) || 1;
      const idx = currentIndices.get(key) || 0;
      currentIndices.set(key, idx + 1);
      map.set(e.id, { total, index: idx });
    });

    return map;
  }, [data.edges, settings.isDirected]);

  // Edges sorted so hovered/selected/highlighted edges are rendered on top
  const renderedEdges = useMemo(() => {
    return [...data.edges].sort((a, b) => {
      const aStep = currentStep?.highlightedEdges.some(h => h.edgeId === a.id);
      const bStep = currentStep?.highlightedEdges.some(h => h.edgeId === b.id);
      if (aStep && !bStep) return 1;
      if (!aStep && bStep) return -1;

      const aSelected = selectedEdgeId === a.id || selectedEdgeIds.includes(a.id);
      const bSelected = selectedEdgeId === b.id || selectedEdgeIds.includes(b.id);
      if (aSelected && !bSelected) return 1;
      if (!aSelected && bSelected) return -1;

      const aHovered = hoveredEdgeId === a.id;
      const bHovered = hoveredEdgeId === b.id;
      if (aHovered && !bHovered) return 1;
      if (!aHovered && bHovered) return -1;

      return 0;
    });
  }, [data.edges, selectedEdgeId, selectedEdgeIds, hoveredEdgeId, currentStep]);

  // Nodes involved in selection for lasso enclosure
  const allSelectedNodesForLasso = useMemo(() => {
    const set = new Set<string>();
    if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach(id => set.add(id));
    } else if (selectedNodeId) {
      set.add(selectedNodeId);
    }

    return Array.from(set)
      .map(id => nodeMap.get(id))
      .filter((n): n is GraphNode => Boolean(n));
  }, [selectedNodeIds, selectedNodeId, nodeMap]);

  // Displayed lasso points for the selection enclosure:
  // Appears ONLY when the user actively used the Lasso tool to make a selection
  const displayLassoPoints = useMemo(() => {
    if (activeTool !== 'lasso' || !isLassoSelected) return [];
    if (allSelectedNodesForLasso.length < 2) return [];
    return computeSelectionLassoPolygon(allSelectedNodesForLasso, getNodeRadius);
  }, [activeTool, isLassoSelected, allSelectedNodesForLasso, getNodeRadius]);

  // Bounding box of lasso enclosure for move indicator pill
  const lassoBBox = useMemo(() => {
    if (displayLassoPoints.length < 3) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    displayLassoPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }, [displayLassoPoints]);

  // Render edge path (Straight, Curved for multi-edges, or Looped for self-loops)
  const renderEdge = (edge: GraphEdge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return null;

    // Check if there is an opposite edge between these two nodes in data.edges
    const oppEdge = data.edges.find(e => e.id !== edge.id && e.source === edge.target && e.target === edge.source);
    const hasOppositeEdge = Boolean(oppEdge);
    const isDirected = Boolean(edge.directed || settings.isDirected || hasOppositeEdge);
    const isSelected = selectedEdgeId === edge.id || selectedEdgeIds.includes(edge.id);
    const isHovered = hoveredEdgeId === edge.id;

    // Check algorithm highlight
    const algoEdgeHighlight = currentStep?.highlightedEdges.find(h => h.edgeId === edge.id);
    const defaultColor = isLight ? '#334155' : '#94a3b8';
    const hoveredColor = isLight ? '#0f172a' : '#38bdf8';
    const edgeActualColor = edge.color && edge.color !== '#64748b' ? edge.color : defaultColor;
    const effectiveEdgeColor = algoEdgeHighlight?.color || (
      isHovered && !isSelected
        ? hoveredColor
        : edgeActualColor
    );
    const strokeWidth = isSelected || algoEdgeHighlight ? 5 : isHovered ? 4 : 3.2;

    // Self loop
    if (edge.source === edge.target) {
      const handleLoopClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLassoSelected(false);
        const isMulti = e.ctrlKey || e.metaKey || e.shiftKey || activeTool === 'lasso';
        if (isMulti) {
          const baseNodes = selectedNodeId && !selectedNodeIds.includes(selectedNodeId)
            ? [...selectedNodeIds, selectedNodeId]
            : selectedNodeIds;
          const baseEdges = selectedEdgeId && !selectedEdgeIds.includes(selectedEdgeId)
            ? [...selectedEdgeIds, selectedEdgeId]
            : selectedEdgeIds;
          const nextEdges = baseEdges.includes(edge.id)
            ? baseEdges.filter(id => id !== edge.id)
            : [...baseEdges, edge.id];
          onBatchSelect?.(baseNodes, nextEdges);
          onSelectEdge(nextEdges[nextEdges.length - 1] || null);
          return;
        }
        onSelectEdge(edge.id);
        onSelectNode(null);
        onBatchSelect?.([], [edge.id]);
      };

      const sourceRadius = getNodeRadius(sourceNode);
      const x = sourceNode.x;
      const y = sourceNode.y - sourceRadius;
      const loopRadius = Math.max(22, sourceRadius + 4);
      const endY = isDirected ? y - 10 : y;
      const pathD = `M ${x - 10} ${y} A ${loopRadius} ${loopRadius} 0 1 1 ${x + 10} ${endY}`;

      return (
        <g
          key={edge.id}
          className="edge-group cursor-pointer"
          onClick={handleLoopClick}
          onMouseEnter={() => setHoveredEdgeId(edge.id)}
          onMouseLeave={() => setHoveredEdgeId(null)}
        >
          {/* Selection Halo */}
          {isSelected && (
            <path
              d={pathD}
              fill="none"
              stroke={isLight ? '#2563eb' : '#38bdf8'}
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
            markerEnd={isDirected ? `url(#${getMarkerId(effectiveEdgeColor)})` : undefined}
          />
          {settings.isWeighted && edge.weight !== undefined && (() => {
            const weightStr = String(edge.weight);
            const badgeWidth = Math.max(28, weightStr.length * 8 + 14);
            const badgeHeight = 20;
            return (
              <g transform={`translate(${x}, ${y - loopRadius - 6})`}>
                <rect
                  x={-badgeWidth / 2}
                  y={-badgeHeight / 2}
                  width={badgeWidth}
                  height={badgeHeight}
                  rx="6"
                  fill={isLight ? '#ffffff' : '#0b0f19'}
                  stroke={isSelected ? (isLight ? '#2563eb' : '#38bdf8') : isHovered ? hoveredColor : isLight ? '#334155' : '#475569'}
                  strokeWidth="1.8"
                  filter="url(#badge-shadow)"
                />
                <text
                  textAnchor="middle"
                  dy="4.2"
                  fill={isSelected ? (isLight ? '#2563eb' : '#38bdf8') : isHovered ? hoveredColor : isLight ? '#0f172a' : '#f8fafc'}
                  fontSize="12"
                  fontFamily={CANVAS_MONO_FONT}
                  fontWeight="800"
                  style={{ fontWeight: 800 }}
                >
                  {edge.weight}
                </text>
              </g>
            );
          })()}
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
    const isWeighted = Boolean(settings.isWeighted || edge.weight !== undefined || (oppEdge && oppEdge.weight !== undefined));

    let curvature = 0;
    // Rule: Multiple edges curve ONLY for weighted edges (e.g. parallel weighted edges or opposite weighted edges).
    // For simple directed unweighted edges, it shows ONLY a straight line with both-side arrow.
    if (isWeighted) {
      if (stats.total > 1) {
        const offsetStep = 36;
        const centerOffset = (stats.total - 1) / 2;
        curvature = (stats.index - centerOffset) * offsetStep;
      } else if (hasOppositeEdge) {
        // Generous, smooth, non-colliding curves for weighted opposing edges (scaled gracefully by distance)
        const oppCurvature = Math.max(34, Math.min(48, dist * 0.18));
        curvature = oppCurvature;
      }
    } else {
      curvature = 0;
    }

    const sourceRadius = getNodeRadius(sourceNode);
    const targetRadius = getNodeRadius(targetNode);

    // Arrowhead geometry: forward length from refX (2.5) to tip (12.5) is 10px, with 2.5px gap to node boundary
    const arrowOffset = isDirected ? 12.5 : 0;
    // For bidirectional straight edges (like in CS Academy), start at the base of the opposite arrowhead
    // so the stroke begins cleanly at the opposite arrow's base and does not occlude either arrowhead
    const isCurved = Math.abs(curvature) >= 1;
    const startOffset = (isDirected && hasOppositeEdge && !isCurved) ? arrowOffset : 0;

    // For curved edges, shift attachment points slightly along the node circumference in the direction of the curve
    // so incoming arrowhead and outgoing line never pinch or collide at the node perimeter
    const sinA = isCurved ? Math.max(-0.35, Math.min(0.35, (curvature / sourceRadius) * 0.16)) : 0;
    const cosA = isCurved ? Math.sqrt(1 - sinA * sinA) : 1;

    // Node boundary intersection points
    const startX = sourceNode.x + (ux * cosA + nx * sinA) * (sourceRadius + startOffset);
    const startY = sourceNode.y + (uy * cosA + ny * sinA) * (sourceRadius + startOffset);
    const endX = targetNode.x - (ux * cosA - nx * sinA) * (targetRadius + arrowOffset);
    const endY = targetNode.y - (uy * cosA - ny * sinA) * (targetRadius + arrowOffset);

    let pathD = '';
    let labelX = (startX + endX) / 2;
    let labelY = (startY + endY) / 2;

    if (!isCurved) {
      pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
      if (hasOppositeEdge) {
        // Offset weight badge along the normal vector so both weights stay cleanly visible without colliding
        labelX += nx * 18;
        labelY += ny * 18;
      }
    } else {
      const chordDx = endX - startX;
      const chordDy = endY - startY;
      const chordDist = Math.hypot(chordDx, chordDy) || 1;
      const chordUx = chordDx / chordDist;
      const chordUy = chordDy / chordDist;

      // Control points for a graceful, organic cubic bezier
      const cpDist = chordDist * 0.38;
      const cp1x = startX + chordUx * cpDist + nx * curvature;
      const cp1y = startY + chordUy * cpDist + ny * curvature;
      const cp2x = endX - chordUx * cpDist + nx * curvature;
      const cp2y = endY - chordUy * cpDist + ny * curvature;

      pathD = `M ${startX} ${startY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${endY}`;

      // Geometric center at t = 0.5 of the cubic bezier
      labelX = 0.125 * startX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * endX;
      labelY = 0.125 * startY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * endY;
    }

    const markerId = getMarkerId(effectiveEdgeColor);

    const handleEdgeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      let targetEdge = edge;
      if (hasOppositeEdge && oppEdge && Math.abs(curvature) < 1) {
        if (selectedEdgeId === edge.id) {
          targetEdge = oppEdge;
        } else if (selectedEdgeId === oppEdge.id) {
          targetEdge = edge;
        } else {
          const world = screenToWorld(e.clientX, e.clientY);
          const distToSource = Math.hypot(world.x - sourceNode.x, world.y - sourceNode.y);
          const distToTarget = Math.hypot(world.x - targetNode.x, world.y - targetNode.y);
          targetEdge = distToTarget <= distToSource ? edge : oppEdge;
        }
      }

      const isMulti = e.ctrlKey || e.metaKey || e.shiftKey || activeTool === 'lasso';
      setIsLassoSelected(false);
      if (isMulti) {
        const baseNodes = selectedNodeId && !selectedNodeIds.includes(selectedNodeId)
          ? [...selectedNodeIds, selectedNodeId]
          : selectedNodeIds;
        const baseEdges = selectedEdgeId && !selectedEdgeIds.includes(selectedEdgeId)
          ? [...selectedEdgeIds, selectedEdgeId]
          : selectedEdgeIds;
        const nextEdges = baseEdges.includes(targetEdge.id)
          ? baseEdges.filter(id => id !== targetEdge.id)
          : [...baseEdges, targetEdge.id];
        onBatchSelect?.(baseNodes, nextEdges);
        onSelectEdge(nextEdges[nextEdges.length - 1] || null);
        return;
      }
      onSelectEdge(targetEdge.id);
      onSelectNode(null);
      onBatchSelect?.([], [targetEdge.id]);
    };

    const handleEdgeMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      setIsLassoSelected(false);
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    };

    const handleEdgeTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      if (e.touches.length !== 1) return;
      setIsLassoSelected(false);
    };

    return (
      <g
        key={edge.id}
        className="edge-group cursor-pointer"
        onClick={handleEdgeClick}
        onMouseDown={handleEdgeMouseDown}
        onTouchStart={handleEdgeTouchStart}
        onMouseEnter={(e) => {
          if (hasOppositeEdge && oppEdge && Math.abs(curvature) < 1) {
            const world = screenToWorld(e.clientX, e.clientY);
            const distToSource = Math.hypot(world.x - sourceNode.x, world.y - sourceNode.y);
            const distToTarget = Math.hypot(world.x - targetNode.x, world.y - targetNode.y);
            setHoveredEdgeId(distToTarget <= distToSource ? edge.id : oppEdge.id);
          } else {
            setHoveredEdgeId(edge.id);
          }
        }}
        onMouseMove={(e) => {
          if (hasOppositeEdge && oppEdge && Math.abs(curvature) < 1) {
            const world = screenToWorld(e.clientX, e.clientY);
            const distToSource = Math.hypot(world.x - sourceNode.x, world.y - sourceNode.y);
            const distToTarget = Math.hypot(world.x - targetNode.x, world.y - targetNode.y);
            const targetId = distToTarget <= distToSource ? edge.id : oppEdge.id;
            if (hoveredEdgeId !== targetId) {
              setHoveredEdgeId(targetId);
            }
          }
        }}
        onMouseLeave={() => setHoveredEdgeId(null)}
      >
        {/* Invisible wider stroke for easy clicking */}
        <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />

        {/* Selection Halo */}
        {isSelected && (
          <path
            d={pathD}
            fill="none"
            stroke={isLight ? '#2563eb' : '#38bdf8'}
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
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={algoEdgeHighlight?.style === 'dashed' ? '5,5' : undefined}
          markerEnd={isDirected ? `url(#${markerId})` : undefined}
        />

        {/* Edge weight badge */}
        {settings.isWeighted && edge.weight !== undefined && (() => {
          const weightStr = String(edge.weight);
          const badgeWidth = Math.max(28, weightStr.length * 8 + 14);
          const badgeHeight = 20;
          return (
            <g transform={`translate(${labelX}, ${labelY})`}>
              <rect
                x={-badgeWidth / 2}
                y={-badgeHeight / 2}
                width={badgeWidth}
                height={badgeHeight}
                rx="6"
                fill={isLight ? '#ffffff' : '#0b0f19'}
                stroke={isSelected ? (isLight ? '#2563eb' : '#38bdf8') : isHovered ? hoveredColor : isLight ? '#334155' : '#475569'}
                strokeWidth="1.8"
                filter="url(#badge-shadow)"
              />
              <text
                textAnchor="middle"
                dy="4.2"
                fill={isSelected ? (isLight ? '#2563eb' : '#38bdf8') : isHovered ? hoveredColor : isLight ? '#0f172a' : '#f8fafc'}
                fontSize="12"
                fontFamily={CANVAS_MONO_FONT}
                fontWeight="800"
                style={{ fontWeight: 800 }}
              >
                {edge.weight}
              </text>
            </g>
          );
        })()}
      </g>
    );
  };

  // Render individual Node
  const renderNode = (node: GraphNode) => {
    const isSelected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
    const isHovered = hoveredNodeId === node.id;
    const isConnectSource = connectSourceId === node.id;
    const isNodeInBatch = allSelectedNodesForLasso.some(n => n.id === node.id);
    const isDragging = draggingNodeId === node.id || (draggingNodeId !== null && (isNodeInBatch || batchDragStartPositionsRef.current.has(node.id)));

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
            stroke={isActiveAlgo ? '#f59e0b' : (isLight ? '#2563eb' : '#38bdf8')}
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
          stroke={isSelected ? (isLight ? '#1d4ed8' : '#ffffff') : isLight ? '#0f172a' : '#000000'}
          strokeWidth={isSelected ? '3.5' : isLight ? '2.8' : '2.4'}
          filter={isLight ? 'url(#node-shadow)' : undefined}
        />

        {/* Node Index / Label with high-contrast luminance text and fat font */}
        <text
          textAnchor="middle"
          dy={fontSize * 0.35}
          fill={getContrastTextColor(baseColor, isLight)}
          fontSize={fontSize}
          fontFamily={CANVAS_MONO_FONT}
          fontWeight="900"
          style={{ fontWeight: 900 }}
          pointerEvents="none"
        >
          {node.label}
        </text>

        {/* Badge (e.g. Root, Hub, Cut) */}
        {node.badge && (
          <g transform={`translate(0, ${-r - 8})`}>
            <rect x="-18" y="-7" width="36" height="14" rx="4" fill={isLight ? '#ffffff' : '#0a0a0a'} stroke="#ef4444" strokeWidth="1" filter={isLight ? 'url(#badge-shadow)' : undefined} />
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
          const badgeWidth = Math.max(34, wStr.length * 8 + 18);
          const yOffset = r + 14;
          return (
            <g transform={`translate(0, ${yOffset})`} className="pointer-events-none">
              <rect
                x={-badgeWidth / 2}
                y="-9"
                width={badgeWidth}
                height="18"
                rx="9"
                fill={isLight ? '#ffffff' : '#0a0a0a'}
                stroke={isSelected ? (isLight ? '#2563eb' : '#38bdf8') : isLight ? '#334155' : '#475569'}
                strokeWidth="2"
                filter={isLight ? 'url(#badge-shadow)' : undefined}
              />
              <text
                textAnchor="middle"
                dy="4"
                fill={isSelected ? (isLight ? '#2563eb' : '#38bdf8') : isLight ? '#0f172a' : '#e0e7ff'}
                fontSize="10.5"
                fontFamily={CANVAS_MONO_FONT}
                fontWeight="900"
                style={{ fontWeight: 900 }}
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
          const annotY = hasNodeWeight ? r + 34 : r + 14;
          return (
            <g transform={`translate(0, ${annotY})`}>
              <rect
                x={-Math.max(24, annotation.length * 4.5)}
                y="-9"
                width={Math.max(48, annotation.length * 9)}
                height="18"
                rx="5"
                fill={isLight ? '#ffffff' : '#0f172a'}
                stroke={isLight ? '#2563eb' : '#38bdf8'}
                strokeWidth="2"
                filter={isLight ? 'url(#badge-shadow)' : undefined}
              />
              <text
                textAnchor="middle"
                dy="4"
                fill={isLight ? '#1d4ed8' : '#38bdf8'}
                fontSize="10.5"
                fontFamily={CANVAS_MONO_FONT}
                fontWeight="900"
                style={{ fontWeight: 900 }}
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
    // Default & high-contrast UI state colors
    colors.add('#94a3b8'); // default edge dark (Slate-400)
    colors.add('#cbd5e1'); // high-contrast light/dark (Slate-300)
    colors.add('#334155'); // default edge light (Slate-700)
    colors.add('#64748b'); // default edge raw slate
    colors.add('#52525b'); // legacy dark fallback
    colors.add('#0f172a'); // hovered edge light
    colors.add('#38bdf8'); // hovered / selected dark (Sky-400)
    colors.add('#2563eb'); // selected light (Blue-600)
    colors.add('#a1a1aa'); // legacy hovered dark
    colors.add('#f8fafc'); // white / light slate
    colors.add('#ffffff'); // pure white
    colors.add('#10b981'); // success / MST
    colors.add('#ef4444'); // error / bridge
    colors.add('#f59e0b'); // active / relax
    colors.add('#8b5cf6'); // purple
    colors.add('#ec4899'); // pink

    CP_PALETTE.forEach(p => {
      if (p.color) colors.add(p.color.toLowerCase());
    });
    data.edges.forEach(e => {
      if (e.color) colors.add(e.color.toLowerCase());
    });
    currentStep?.highlightedEdges.forEach(h => {
      if (h.color) colors.add(h.color.toLowerCase());
    });
    return Array.from(colors);
  }, [data.edges, currentStep]);

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
          {/* Subtle Grid Dot Pattern for Canvas Orientation */}
          <pattern id="canvas-grid-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r={isLight ? 1.15 : 1} fill={isLight ? '#94a3b8' : '#262626'} opacity={isLight ? 0.45 : 0.75} />
          </pattern>

          {/* Elevated Drop Shadow Filter for Nodes in Light Mode */}
          <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity={isLight ? 0.12 : 0.45} />
          </filter>

          {/* Crisp Shadow Filter for Badges */}
          <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity={isLight ? 0.12 : 0.55} />
          </filter>

          {/* Dynamic Arrowheads for each color - Crisp, professional solid triangle with clean docking */}
          {arrowheadColors.map(c => {
            const id = getMarkerId(c);
            return (
              <marker
                key={id}
                id={id}
                viewBox="0 0 14 14"
                refX="2.5"
                refY="7"
                markerUnits="userSpaceOnUse"
                markerWidth="14"
                markerHeight="14"
                orient="auto-start-reverse"
              >
                <path
                  d="M 1.5 2 L 12.5 7 L 1.5 12 Z"
                  fill={c}
                  stroke={c}
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </marker>
            );
          })}
          {/* Fallback default arrowhead in case any unusual color is referenced */}
          <marker
            id="arrowhead-default"
            viewBox="0 0 14 14"
            refX="2.5"
            refY="7"
            markerUnits="userSpaceOnUse"
            markerWidth="14"
            markerHeight="14"
            orient="auto-start-reverse"
          >
            <path
              d="M 1.5 2 L 12.5 7 L 1.5 12 Z"
              fill={isLight ? '#334155' : '#94a3b8'}
              stroke={isLight ? '#334155' : '#94a3b8'}
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {/* Pan/Zoom World Container: Clean Solid Canvas with subtle dot orientation */}
        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
          {/* Subtle Dot Grid Layer */}
          <rect x="-100000" y="-100000" width="200000" height="200000" fill="url(#canvas-grid-dots)" pointerEvents="none" />

          {/* Edges Layer */}
          <g className="edges-layer">{renderedEdges.map(renderEdge)}</g>

          {/* Selection Lasso Enclosure (Appears ONLY when actively using the Lasso tool and a lasso selection was made) */}
          {activeTool === 'lasso' && isLassoSelected && activeLassoPoints.length < 2 && displayLassoPoints.length >= 3 && (
            <g
              className={`selection-lasso select-none transition-opacity ${draggingNodeId ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleLassoMouseDown}
              onTouchStart={handleLassoTouchStart}
            >
              {/* Invisible wider boundary stroke to make grabbing effortless */}
              <path
                d={pointsToSvgPath(displayLassoPoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="28"
                className="cursor-grab active:cursor-grabbing pointer-events-auto"
              />
              <path
                d={pointsToSvgPath(displayLassoPoints)}
                fill={isLight ? "rgba(37, 99, 235, 0.08)" : "rgba(56, 189, 248, 0.12)"}
                stroke={isLight ? "rgba(37, 99, 235, 0.35)" : "rgba(56, 189, 248, 0.45)"}
                strokeWidth="4"
                strokeLinejoin="round"
                className="cursor-grab active:cursor-grabbing pointer-events-auto"
              />
              <path
                d={pointsToSvgPath(displayLassoPoints)}
                fill="none"
                stroke={isLight ? "#2563eb" : "#38bdf8"}
                strokeWidth="2"
                strokeDasharray="6,4"
                strokeLinejoin="round"
                filter={isLight ? "drop-shadow(0 0 4px rgba(37, 99, 235, 0.3))" : "drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))"}
                className="pointer-events-none"
              />

              {/* Move Indicator Badge at the top of the lasso enclosure */}
              {lassoBBox && (
                <g
                  transform={`translate(${lassoBBox.cx}, ${lassoBBox.minY - 14})`}
                  className="cursor-grab active:cursor-grabbing pointer-events-auto select-none"
                >
                  <rect
                    x="-50"
                    y="-12"
                    width="100"
                    height="24"
                    rx="12"
                    fill={isLight ? "#2563eb" : "#0284c7"}
                    stroke={isLight ? "#ffffff" : "#38bdf8"}
                    strokeWidth="1.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  />
                  <text
                    textAnchor="middle"
                    dy="4.5"
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily={CANVAS_MONO_FONT}
                    fontWeight="700"
                  >
                    ✥ Move Area
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Temporary Connecting Edge when dragging in connect mode */}
          {connectSourceId && mousePos && nodeMap.get(connectSourceId) && (() => {
            const src = nodeMap.get(connectSourceId)!;
            const dx = mousePos.x - src.x;
            const dy = mousePos.y - src.y;
            const dist = Math.hypot(dx, dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;
            const arrowOffset = settings.isDirected ? 10 : 0;
            const x2 = mousePos.x - ux * arrowOffset;
            const y2 = mousePos.y - uy * arrowOffset;
            return (
              <line
                x1={src.x}
                y1={src.y}
                x2={x2}
                y2={y2}
                stroke={isLight ? "#2563eb" : "#38bdf8"}
                strokeWidth="3.2"
                strokeDasharray="5,5"
                className="pointer-events-none"
                markerEnd={settings.isDirected ? `url(#${getMarkerId(isLight ? '#2563eb' : '#38bdf8')})` : undefined}
              />
            );
          })()}

          {/* Nodes Layer */}
          <g className="nodes-layer">{data.nodes.map(renderNode)}</g>

          {/* Active Real-Time Lasso Path (Rendered on top of everything while tracking) */}
          {activeLassoPoints.length > 1 && (
            <g className="active-lasso pointer-events-none">
              {/* Semi-transparent closed preview */}
              <path
                d={pointsToSvgPath(activeLassoPoints)}
                fill={isLight ? "rgba(37, 99, 235, 0.09)" : "rgba(56, 189, 248, 0.14)"}
                stroke="none"
              />
              {/* Active drawn path line */}
              <path
                d={activeLassoPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke={isLight ? "#2563eb" : "#38bdf8"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isLight ? "drop-shadow(0 0 4px rgba(37, 99, 235, 0.4))" : "drop-shadow(0 0 5px rgba(56, 189, 248, 0.7))"}
              />
              {/* Dashed closing line back to loop origin */}
              <line
                x1={activeLassoPoints[activeLassoPoints.length - 1].x}
                y1={activeLassoPoints[activeLassoPoints.length - 1].y}
                x2={activeLassoPoints[0].x}
                y2={activeLassoPoints[0].y}
                stroke={isLight ? "#2563eb" : "#38bdf8"}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.8"
              />
              {/* Anchor point at origin */}
              <circle
                cx={activeLassoPoints[0].x}
                cy={activeLassoPoints[0].y}
                r="4.5"
                fill={isLight ? "#2563eb" : "#38bdf8"}
                stroke={isLight ? '#ffffff' : '#000000'}
                strokeWidth="2"
              />
            </g>
          )}
        </g>
      </svg>

      {/* World-Space Canvas Notes Overlay (Zooms & Pans smoothly with the SVG canvas) */}
      {notes.length > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left pointer-events-none z-20"
          style={{
            transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
          }}
        >
          {notes.map(note => (
            <CanvasNoteCard
              key={note.id}
              note={note}
              viewScale={viewTransform.scale}
              theme={theme}
              autoFocus={note.id === newlyAddedNoteId}
              onUpdateNote={(id, updates) => onUpdateNote?.(id, updates)}
              onCommitHistory={onCommitNoteHistory}
              onDeleteNote={id => onDeleteNote?.(id)}
              onBringToFront={onBringNoteToFront}
            />
          ))}
        </div>
      )}

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
