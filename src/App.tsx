import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep, AlgorithmType, LayoutMode } from './types/graph';
import { parseGraphInput, serializeGraphToCPInput, toggleGraphIndexing, detectNodeType } from './utils/parser';
import {
  computeGraphStats,
  runBFS,
  runDFS,
  runDijkstra,
  runTopologicalSort,
  runTarjanSCC,
  runBridgesAndCutVertices,
  runKruskalMST,
  runBipartiteCheck,
  runBellmanFord,
  runPrimMST,
  runEulerianPath,
  runMaxBipartiteMatching,
  runTreeDiameter,
  runTreeLCA,
  runTreeSubtreeDP,
  runTreeMISDP,
  runTreeCentroid,
} from './utils/algorithms';
import { applyLayout } from './utils/layout';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { Canvas, CanvasHandle } from './components/Canvas';
import { PropertiesInspector } from './components/PropertiesInspector';
import { AlgorithmControls } from './components/AlgorithmControls';
import { BottomStatusBar } from './components/BottomStatusBar';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { LandingPage } from './components/LandingPage';
import { DownloadModal } from './components/DownloadModal';
import { BatchActionToolbar } from './components/BatchActionToolbar';
import { ShareModal } from './components/ShareModal';
import { useGraphHistory } from './hooks/useGraphHistory';
import { parseGraphFromHash } from './utils/share';
import { Link2 } from 'lucide-react';

// Initial CP Graph (Tree edges without manual N M header)
const INITIAL_CP_TEXT = `1 2
1 3
2 4
2 5
3 6
3 7`;

export function App() {
  const canvasRef = useRef<CanvasHandle>(null);

  const isElectron = typeof window !== 'undefined' && window.navigator?.userAgent?.toLowerCase().includes('electron');
  const [currentView, setCurrentView] = useState<'landing' | 'editor'>(() => {
    if (isElectron) return 'editor';
    if (typeof window !== 'undefined' && (window.location.hash === '#about' || window.location.hash === '#landing')) {
      return 'landing';
    }
    return 'editor';
  });
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<GraphSettings>({
    isDirected: false,
    isWeighted: false,
    isZeroIndexed: false,
    layout: 'force',
    hasHeader: false,
  });

  const [rawText, setRawText] = useState<string>(INITIAL_CP_TEXT);
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });

  // Undo / Redo History Stack
  const { canUndo, canRedo, pushState, undo, redo, initHistory } = useGraphHistory();
  const rawTextDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isElectron) return;
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash === '#about' || hash === '#landing') {
        setCurrentView('landing');
      } else {
        setCurrentView('editor');
        if (hash.startsWith('#graph=') || hash.startsWith('#data=')) {
          const shared = await parseGraphFromHash(hash);
          if (shared && shared.data.nodes.length > 0) {
            setData(shared.data);
            setSettings(shared.settings);
            setRawText(shared.rawText);
            if (shared.theme) setTheme(shared.theme);
            initHistory({ data: shared.data, settings: shared.settings, rawText: shared.rawText });
            setToastMessage(`Loaded shared graph (${shared.data.nodes.length} nodes, ${shared.data.edges.length} edges)`);
            setTimeout(() => setToastMessage(null), 3500);
          }
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isElectron, initHistory]);

  // Tools & Selection
  const [activeTool, setActiveTool] = useState<'select' | 'lasso' | 'node' | 'edge'>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  // Panels & Modals
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Tracer Dock Position (Right Side vs Bottom)
  const [tracerPosition, setTracerPosition] = useState<'right' | 'bottom'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cp_graph_tracer_dock_position');
      if (saved === 'bottom' || saved === 'right') return saved;
    }
    return 'right';
  });

  const handleSetTracerPosition = useCallback((pos: 'right' | 'bottom') => {
    setTracerPosition(pos);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cp_graph_tracer_dock_position', pos);
      } catch {}
    }
  }, []);

  const handleToggleTracerPosition = useCallback(() => {
    handleSetTracerPosition(tracerPosition === 'bottom' ? 'right' : 'bottom');
  }, [tracerPosition, handleSetTracerPosition]);

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setIsInspectorOpen(true);
    }
  }, []);

  // Zoom scale reported by Canvas
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Theme mode: 'dark' (Dark Black) | 'light' (Clean White)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cp_graph_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_graph_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  // Physics Simulation
  const [isPhysicsActive, setIsPhysicsActive] = useState<boolean>(false);

  // Algorithm Player
  const [algorithmSteps, setAlgorithmSteps] = useState<AlgorithmStep[] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setData(prevState.data);
      setSettings(prevState.settings);
      setRawText(prevState.rawText);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      setAlgorithmSteps(null);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setData(nextState.data);
      setSettings(nextState.settings);
      setRawText(nextState.rawText);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      setAlgorithmSteps(null);
    }
  }, [redo]);

  // Parse initial graph once on mount, or restore from URL hash (#graph=...)
  useEffect(() => {
    const loadInitial = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash && (hash.startsWith('#graph=') || hash.startsWith('#data='))) {
        const shared = await parseGraphFromHash(hash);
        if (shared && shared.data.nodes.length > 0) {
          setData(shared.data);
          setSettings(shared.settings);
          setRawText(shared.rawText);
          if (shared.theme) {
            setTheme(shared.theme);
          }
          initHistory({ data: shared.data, settings: shared.settings, rawText: shared.rawText });
          setToastMessage(`Loaded shared graph (${shared.data.nodes.length} nodes, ${shared.data.edges.length} edges)`);
          setTimeout(() => setToastMessage(null), 3500);
          return;
        }
      }

      const parsed = parseGraphInput(INITIAL_CP_TEXT, settings);
      const positioned = applyLayout(parsed.data, 'tree', { width: 900, height: 650 });
      setData(positioned);
      initHistory({ data: positioned, settings, rawText: INITIAL_CP_TEXT });
    };

    loadInitial();
  }, []);

  // Update text when graph is edited visually (and not running algorithm)
  const syncGraphToText = useCallback((newData: GraphData, newSettings: GraphSettings) => {
    const text = serializeGraphToCPInput(newData, newSettings, false);
    setRawText(text);
  }, []);

  // Handle changes in the text editor
  const handleRawTextChange = (text: string) => {
    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const parsed = parseGraphInput(text, settings, existingNodeMap);
    let finalData = parsed.data;

    // Apply layout if brand new nodes without positions
    if (parsed.data.nodes.some(n => !existingNodeMap.has(n.id))) {
      finalData = applyLayout(parsed.data, settings.layout);
    }

    setData(finalData);

    setRawText(text);
    const nextSettings = {
      ...settings,
      ...parsed.settings,
      nodeCountPreserved: parsed.detectedHeader?.n ?? settings.nodeCountPreserved,
    };
    setSettings(nextSettings);

    if (rawTextDebounceTimerRef.current) {
      clearTimeout(rawTextDebounceTimerRef.current);
    }
    rawTextDebounceTimerRef.current = setTimeout(() => {
      pushState({ data: finalData, settings: nextSettings, rawText: text });
    }, 400);
  };

  // Toggle explicit N M Header mode
  const handleToggleHeaderMode = (hasHeader: boolean) => {
    const newSettings = { ...settings, hasHeader };
    setSettings(newSettings);

    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const parsed = parseGraphInput(rawText, newSettings, existingNodeMap);
    let finalData = parsed.data;
    if (parsed.data.nodes.some(n => !existingNodeMap.has(n.id))) {
      finalData = applyLayout(parsed.data, settings.layout);
    }
    setData(finalData);
    pushState({ data: finalData, settings: newSettings, rawText });
  };

  // Allow setting custom isolated node count from the Nodes field, or reset to auto (null)
  const handleSetCustomNodeCount = (count: number | null) => {
    const newSettings = { ...settings, nodeCountPreserved: count ?? undefined };
    setSettings(newSettings);

    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const parsed = parseGraphInput(rawText, newSettings, existingNodeMap);
    let finalData = parsed.data;
    if (parsed.data.nodes.some(n => !existingNodeMap.has(n.id))) {
      finalData = applyLayout(parsed.data, settings.layout);
    }
    setData(finalData);
    pushState({ data: finalData, settings: newSettings, rawText });
  };

  // Compute live graph stats
  const stats = useMemo(() => computeGraphStats(data, settings.isDirected), [data, settings.isDirected]);

  // Visual Node Addition
  const handleAddNode = (x: number, y: number) => {
    const existingNums = data.nodes
      .filter(n => /^-?\d+$/.test(n.id))
      .map(n => Number(n.id))
      .filter(n => !isNaN(n));
    let nextNum = settings.isZeroIndexed ? 0 : 1;
    if (existingNums.length > 0) {
      nextNum = Math.max(...existingNums) + 1;
    }
    const existingIds = new Set(data.nodes.map(n => n.id));
    while (existingIds.has(String(nextNum))) {
      nextNum++;
    }

    const newNode: GraphNode = {
      id: String(nextNum),
      label: String(nextNum),
      nodeType: 'int',
      index: nextNum,
      x,
      y,
      color: '#3b82f6',
    };

    const nextData = {
      ...data,
      nodes: [...data.nodes, newNode],
    };
    setData(nextData);
    syncGraphToText(nextData, settings);
    handleSelectNode(newNode.id);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  };

  // Add single node by custom label/identifier (e.g. from LeftPanel)
  const handleAddSingleNode = (name?: string, explicitWeight?: string | number) => {
    let raw = name?.trim();
    let weight: string | number | undefined = explicitWeight;

    if (raw) {
      const bracketMatch = raw.match(/^([^\s[\]]+)\s*\[([^\]]+)\]$/);
      const assignMatch = raw.match(/^([^\s:=[\]]+)\s*[:=]\s*(.+)$/);
      if (bracketMatch || assignMatch) {
        raw = (bracketMatch ? bracketMatch[1] : assignMatch![1]).trim();
        let rawW = (bracketMatch ? bracketMatch[2] : assignMatch![2]).trim();
        if ((rawW.startsWith("'") && rawW.endsWith("'")) || (rawW.startsWith('"') && rawW.endsWith('"'))) {
          rawW = rawW.slice(1, -1);
        }
        const numW = Number(rawW);
        weight = !isNaN(numW) && rawW !== '' ? numW : rawW;
      }
    }

    if (!raw) {
      const existingNums = data.nodes
        .filter(n => /^-?\d+$/.test(n.id))
        .map(n => Number(n.id))
        .filter(n => !isNaN(n));
      let nextNum = settings.isZeroIndexed ? 0 : 1;
      if (existingNums.length > 0) {
        nextNum = Math.max(...existingNums) + 1;
      }
      const existingIds = new Set(data.nodes.map(n => n.id));
      while (existingIds.has(String(nextNum))) {
        nextNum++;
      }
      raw = String(nextNum);
    }

    // Ensure uniqueness if collision occurs
    let finalId = raw;
    let counter = 1;
    while (data.nodes.some(n => n.id === finalId)) {
      finalId = `${raw}_${counter++}`;
    }

    const newNode: GraphNode = {
      id: finalId,
      label: finalId,
      nodeType: detectNodeType(finalId),
      weight,
      value: weight,
      index: data.nodes.length + (settings.isZeroIndexed ? 0 : 1),
      x: data.nodes.length === 0 ? 400 : 360 + (Math.random() - 0.5) * 160,
      y: data.nodes.length === 0 ? 300 : 260 + (Math.random() - 0.5) * 160,
      color: '#3b82f6',
    };

    const nextData = {
      ...data,
      nodes: [...data.nodes, newNode],
    };
    setData(nextData);
    syncGraphToText(nextData, settings);
    handleSelectNode(newNode.id);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  };

  // Visual Edge Addition
  const handleAddEdge = (sourceId: string, targetId: string) => {
    const newEdge: GraphEdge = {
      id: `e-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      weight: settings.isWeighted ? 1 : undefined,
      color: '#64748b',
      directed: settings.isDirected,
    };

    const nextData = {
      ...data,
      edges: [...data.edges, newEdge],
    };
    setData(nextData);
    syncGraphToText(nextData, settings);
    setSelectedEdgeId(newEdge.id);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  };

  // Update Node Position (from dragging - always updates coordinates directly)
  const handleUpdateNodePosition = (id: string, x: number, y: number, isFixed?: boolean) => {
    setData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            x,
            y,
            fx: x,
            fy: y,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      }),
    }));
  };

  // Batch update node positions for multi-selection / lasso dragging
  const handleUpdateNodePositions = useCallback((updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map<string, { x: number; y: number }>();
    updates.forEach(u => updateMap.set(u.id, { x: u.x, y: u.y }));
    setData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        const u = updateMap.get(n.id);
        if (u) {
          return {
            ...n,
            x: u.x,
            y: u.y,
            fx: u.x,
            fy: u.y,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      }),
    }));
  }, []);

  // Finish dragging: keep node coordinates cleanly updated
  const handleFinishDragNode = (id: string) => {
    setData(prev => {
      const nextNodes = prev.nodes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            fx: null,
            fy: null,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      });
      const nextData = { ...prev, nodes: nextNodes };
      syncGraphToText(nextData, settings);
      const text = serializeGraphToCPInput(nextData, settings, false);
      pushState({ data: nextData, settings, rawText: text });
      return nextData;
    });
  };

  // Finish dragging multiple nodes
  const handleFinishDragNodes = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setData(prev => {
      const nextNodes = prev.nodes.map(n => {
        if (idSet.has(n.id)) {
          return {
            ...n,
            fx: null,
            fy: null,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      });
      const nextData = { ...prev, nodes: nextNodes };
      syncGraphToText(nextData, settings);
      const text = serializeGraphToCPInput(nextData, settings, false);
      pushState({ data: nextData, settings, rawText: text });
      return nextData;
    });
  }, [settings, pushState, syncGraphToText]);

  // Node property update
  const handleUpdateNode = (nodeId: string, updates: Partial<GraphNode>) => {
    const trimmedLabel = updates.label !== undefined ? updates.label.trim() : undefined;
    const isRenaming = trimmedLabel !== undefined && trimmedLabel !== '' && trimmedLabel !== nodeId;

    let targetId = nodeId;
    if (isRenaming) {
      const collision = data.nodes.some(n => n.id === trimmedLabel && n.id !== nodeId);
      if (!collision) {
        targetId = trimmedLabel;
      }
    }

    const nextNodes = data.nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          ...updates,
          id: targetId,
          label: updates.label !== undefined ? updates.label : n.label,
          nodeType: detectNodeType(targetId),
        };
      }
      return n;
    });

    const nextEdges = isRenaming && targetId !== nodeId
      ? data.edges.map(e => ({
          ...e,
          source: e.source === nodeId ? targetId : e.source,
          target: e.target === nodeId ? targetId : e.target,
        }))
      : data.edges;

    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });

    if (selectedNodeId === nodeId && targetId !== nodeId) {
      setSelectedNodeId(targetId);
    }
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = data.nodes.filter(n => n.id !== nodeId);
    const nextEdges = data.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    setSelectedNodeId(null);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  };

  // Edge property update
  const handleUpdateEdge = (edgeId: string, updates: Partial<GraphEdge>) => {
    const nextEdges = data.edges.map(e => (e.id === edgeId ? { ...e, ...updates } : e));
    const nextData = { ...data, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId: string) => {
    const nextEdges = data.edges.filter(e => e.id !== edgeId);
    const nextData = { ...data, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    setSelectedEdgeId(null);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  };

  // Batch Multi-Selection Handlers (Lasso / Shift-select)
  const handleBatchSelect = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    setSelectedEdgeIds(edgeIds);
  }, []);

  const handleClearBatchSelection = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, []);

  // Batch Delete: Delete all selected nodes and edges together
  const handleBatchDelete = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

    const nodeSet = new Set(selectedNodeIds);
    const edgeSet = new Set(selectedEdgeIds);

    const nextNodes = data.nodes.filter(n => !nodeSet.has(n.id));
    const nextEdges = data.edges.filter(
      e => !edgeSet.has(e.id) && !nodeSet.has(e.source) && !nodeSet.has(e.target)
    );

    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });

    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    if (selectedNodeId && nodeSet.has(selectedNodeId)) setSelectedNodeId(null);
    if (selectedEdgeId && edgeSet.has(selectedEdgeId)) setSelectedEdgeId(null);
    setIsInspectorOpen(false);
  }, [selectedNodeIds, selectedEdgeIds, data, settings, syncGraphToText, selectedNodeId, selectedEdgeId, pushState]);

  // Batch Color: Color all selected nodes and edges together
  const handleBatchColor = useCallback((color: string) => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

    const nodeSet = new Set(selectedNodeIds);
    const edgeSet = new Set(selectedEdgeIds);

    const nextNodes = data.nodes.map(n => (nodeSet.has(n.id) ? { ...n, color } : n));
    const nextEdges = data.edges.map(e => (edgeSet.has(e.id) ? { ...e, color } : e));

    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  }, [selectedNodeIds, selectedEdgeIds, data, settings, syncGraphToText, pushState]);

  // Batch Add Value: Set weight/value for all selected nodes and edges together
  const handleBatchAddValue = useCallback((val: string | number | undefined) => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

    const nodeSet = new Set(selectedNodeIds);
    const edgeSet = new Set(selectedEdgeIds);

    const nextNodes = data.nodes.map(n => {
      if (nodeSet.has(n.id)) {
        return {
          ...n,
          weight: val,
          value: val,
        };
      }
      return n;
    });

    const nextEdges = data.edges.map(e => {
      if (edgeSet.has(e.id)) {
        let edgeWeight: number | undefined = undefined;
        if (typeof val === 'number') {
          edgeWeight = val;
        } else if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
          edgeWeight = Number(val);
        }
        return { ...e, weight: edgeWeight };
      }
      return e;
    });

    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    const text = serializeGraphToCPInput(nextData, settings, false);
    pushState({ data: nextData, settings, rawText: text });
  }, [selectedNodeIds, selectedEdgeIds, data, settings, syncGraphToText, pushState]);

  // Change indexing mode (0-based vs 1-based)
  const handleToggleIndexMode = () => {
    const nextZero = !settings.isZeroIndexed;
    const toggled = toggleGraphIndexing(data, nextZero);
    const nextSettings = { ...settings, isZeroIndexed: nextZero };
    setSettings(nextSettings);
    setData(toggled);
    const text = serializeGraphToCPInput(toggled, nextSettings, false);
    setRawText(text);
    pushState({ data: toggled, settings: nextSettings, rawText: text });
  };

  // Apply layout
  const handleApplyLayout = (layout: LayoutMode) => {
    const nextSettings = { ...settings, layout };
    setSettings(nextSettings);
    const laidOut = applyLayout(data, layout, {
      rootId: settings.treeRootId,
      isDirected: settings.isDirected,
    });
    setData(laidOut);
    setIsPhysicsActive(layout === 'force');
    const text = serializeGraphToCPInput(laidOut, nextSettings, false);
    pushState({ data: laidOut, settings: nextSettings, rawText: text });
  };

  // Load Preset
  const handleLoadPreset = (newData: GraphData, newSettings: Partial<GraphSettings>) => {
    const mergedSettings = { ...settings, ...newSettings };
    setSettings(mergedSettings);
    setData(newData);
    syncGraphToText(newData, mergedSettings);
    setAlgorithmSteps(null);
    const text = serializeGraphToCPInput(newData, mergedSettings, false);
    pushState({ data: newData, settings: mergedSettings, rawText: text });
  };

  // Clear Graph
  const handleClearGraph = () => {
    const empty = { nodes: [], edges: [] };
    setData(empty);
    setRawText('');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setAlgorithmSteps(null);
    pushState({ data: empty, settings, rawText: '' });
  };

  // Run CP Algorithm
  const handleRunAlgorithm = (algo: AlgorithmType, startNodeId: string) => {
    let steps: AlgorithmStep[] = [];
    switch (algo) {
      case 'bfs':
        steps = runBFS(data, startNodeId, settings.isDirected);
        break;
      case 'dfs':
        steps = runDFS(data, startNodeId, settings.isDirected);
        break;
      case 'dijkstra':
        steps = runDijkstra(data, startNodeId, settings.isDirected);
        break;
      case 'toposort':
        steps = runTopologicalSort(data);
        break;
      case 'tarjan_scc':
        steps = runTarjanSCC(data);
        break;
      case 'bridges_articulations':
        steps = runBridgesAndCutVertices(data);
        break;
      case 'kruskal_mst':
        steps = runKruskalMST(data);
        break;
      case 'prim_mst':
        steps = runPrimMST(data, startNodeId, settings.isDirected);
        break;
      case 'bipartite_check':
        steps = runBipartiteCheck(data);
        break;
      case 'bellman_ford':
        steps = runBellmanFord(data, startNodeId, settings.isDirected);
        break;
      case 'eulerian_path':
        steps = runEulerianPath(data, settings.isDirected);
        break;
      case 'max_bipartite_matching':
        steps = runMaxBipartiteMatching(data);
        break;
      case 'tree_diameter':
        steps = runTreeDiameter(data);
        break;
      case 'tree_lca':
        steps = runTreeLCA(data, startNodeId);
        break;
      case 'tree_subtree_dp':
        steps = runTreeSubtreeDP(data, startNodeId);
        break;
      case 'tree_mis_dp':
        steps = runTreeMISDP(data, startNodeId);
        break;
      case 'tree_centroid':
        steps = runTreeCentroid(data);
        break;
    }

    if (steps.length > 0) {
      setAlgorithmSteps(steps);
      setCurrentStepIndex(0);
      setIsPhysicsActive(false); // Stop physics during algorithm playback
    }
  };

  // Cancel / remove all active actions across the whole application
  const handleCancelAllActions = useCallback(() => {
    // 1. Unfocus / blur any active input, textarea or button
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. Clear selections (both node, edge and batch)
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);

    // 3. Reset active tool to default select/move mode
    setActiveTool('select');

    // 4. Close properties inspector
    setIsInspectorOpen(false);

    // 5. Close all modals
    setIsExportModalOpen(false);
    setIsShortcutsModalOpen(false);
    setIsShareModalOpen(false);

    // 6. Stop and remove algorithm playback/visualization
    setAlgorithmSteps(null);
    setCurrentStepIndex(0);

    // 7. Reset all canvas interactions (connecting edges, dragging nodes, panning)
    canvasRef.current?.cancelAction();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEsc = e.key === 'Escape' || e.key === 'Esc' || e.key.toLowerCase() === 'escape';

      // Pressing Esc removes all actions everywhere, even if focused in an input/textarea
      if (isEsc) {
        e.preventDefault();
        handleCancelAllActions();
        return;
      }

      // Handle Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z)
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          if (!['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            return;
          }
        } else if (key === 'y') {
          if (!['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
            e.preventDefault();
            handleRedo();
            return;
          }
        }
      }

      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'v' || key === 's') {
        setActiveTool('select');
      } else if (key === 'l') {
        setActiveTool('lasso');
      } else if (key === 'n') {
        setActiveTool('node');
      } else if (key === 'e') {
        setActiveTool('edge');
      } else if (key === 'd') {
        setSettings(s => {
          const nextDirected = !s.isDirected;
          const next = { ...s, isDirected: nextDirected };
          syncGraphToText(data, next);
          const text = serializeGraphToCPInput(data, next, false);
          pushState({ data, settings: next, rawText: text });
          return next;
        });
      } else if (key === 'w') {
        setSettings(s => {
          const nextWeighted = !s.isWeighted;
          const next = { ...s, isWeighted: nextWeighted };
          syncGraphToText(data, next);
          const text = serializeGraphToCPInput(data, next, false);
          pushState({ data, settings: next, rawText: text });
          return next;
        });
      } else if (key === ' ') {
        e.preventDefault();
        setIsPhysicsActive(prev => !prev);
      } else if (key === 'f') {
        canvasRef.current?.fitView();
      } else if (key === 'delete' || key === 'backspace') {
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          handleBatchDelete();
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          handleDeleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelAllActions, handleUndo, handleRedo, selectedNodeId, selectedEdgeId, selectedNodeIds, selectedEdgeIds, handleBatchDelete, data, settings, syncGraphToText, pushState]);

  const selectedNode = useMemo(() => data.nodes.find(n => n.id === selectedNodeId) || null, [data.nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => data.edges.find(e => e.id === selectedEdgeId) || null, [data.edges, selectedEdgeId]);

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenEditor={() => {
            setCurrentView('editor');
            if (typeof window !== 'undefined') window.location.hash = '';
          }}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        />
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className={`flex flex-col w-full h-dvh max-h-dvh max-w-full overflow-hidden font-sans transition-colors duration-150 ${
      theme === 'light' ? 'bg-white text-slate-900' : 'bg-black text-white'
    }`}>
      {/* Top Navigation Bar */}
      <TopBar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        settings={settings}
        onUpdateSettings={s => {
          const merged = { ...settings, ...s };
          setSettings(merged);
          syncGraphToText(data, merged);
          const text = serializeGraphToCPInput(data, merged, false);
          pushState({ data, settings: merged, rawText: text });
        }}
        onApplyLayout={handleApplyLayout}
        onClearGraph={handleClearGraph}
        onToggleIndexMode={handleToggleIndexMode}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        isInspectorOpen={isInspectorOpen || !!selectedNode || !!selectedEdge}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        tracerPosition={tracerPosition}
        onToggleTracerPosition={handleToggleTracerPosition}
        onGoHome={isElectron ? undefined : () => {
          setCurrentView('landing');
          if (typeof window !== 'undefined') window.location.hash = '#about';
        }}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Workspace: Left Panel, Center Canvas Area, Bottom/Right Docked Inspector */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Docked Left Panel (Collapsible) */}
        <LeftPanel
          rawText={rawText}
          onRawTextChange={handleRawTextChange}
          data={data}
          settings={settings}
          onRunAlgorithm={handleRunAlgorithm}
          onLoadPreset={handleLoadPreset}
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          onSetCustomNodeCount={handleSetCustomNodeCount}
          onAddSingleNode={handleAddSingleNode}
          onToggleHeaderMode={handleToggleHeaderMode}
          theme={theme}
        />

        {/* Center Workspace (Canvas + Bottom Docked Inspector + Floating Algorithm Controls) */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          {/* Unobstructed Canvas with Solid Background (Dark Black or Clean White) */}
          <div className={`flex-1 relative overflow-hidden transition-colors ${theme === 'light' ? 'bg-white' : 'bg-black'}`}>
            <Canvas
              ref={canvasRef}
              data={data}
              settings={settings}
              activeTool={activeTool}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              selectedNodeIds={selectedNodeIds}
              selectedEdgeIds={selectedEdgeIds}
              onSelectNode={handleSelectNode}
              onSelectEdge={setSelectedEdgeId}
              onBatchSelect={handleBatchSelect}
              onAddNode={handleAddNode}
              onAddEdge={handleAddEdge}
              onUpdateNodePosition={handleUpdateNodePosition}
              onUpdateNodePositions={handleUpdateNodePositions}
              onFinishDragNode={handleFinishDragNode}
              onFinishDragNodes={handleFinishDragNodes}
              onUpdateGraphData={setData}
              currentStep={algorithmSteps ? algorithmSteps[currentStepIndex] : undefined}
              isPhysicsActive={isPhysicsActive}
              onZoomChange={setZoomScale}
              theme={theme}
            />

            {/* Batch Action Toolbar: Floats over canvas when nodes/edges are lasso/multi-selected */}
            <BatchActionToolbar
              selectedNodeIds={selectedNodeIds}
              selectedEdgeIds={selectedEdgeIds}
              onBatchDelete={handleBatchDelete}
              onBatchColor={handleBatchColor}
              onBatchAddValue={handleBatchAddValue}
              onClearSelection={handleClearBatchSelection}
              theme={theme}
            />

            {/* Algorithm Controls Card: Floating at BOTTOM CENTER matching user screenshot */}
            {algorithmSteps && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-30 pointer-events-none">
                <div className="pointer-events-auto">
                  <AlgorithmControls
                    steps={algorithmSteps}
                    currentStepIndex={currentStepIndex}
                    onSetStepIndex={setCurrentStepIndex}
                    onClose={() => setAlgorithmSteps(null)}
                    theme={theme}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Docked Node Tracer / Properties Inspector */}
          {tracerPosition === 'bottom' && (isInspectorOpen || selectedNode || selectedEdge) && (
            <PropertiesInspector
              position="bottom"
              onPositionChange={handleSetTracerPosition}
              data={data}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              settings={settings}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onUpdateEdge={handleUpdateEdge}
              onDeleteEdge={handleDeleteEdge}
              onSetTreeRoot={id => setSettings(s => ({ ...s, treeRootId: id }))}
              onRunAlgorithm={handleRunAlgorithm}
              onSelectNode={handleSelectNode}
              onClose={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setIsInspectorOpen(false);
              }}
              theme={theme}
            />
          )}
        </div>

        {/* Docked Right Properties Inspector: Slides in beside canvas, zero overlap */}
        {tracerPosition === 'right' && (isInspectorOpen || selectedNode || selectedEdge) && (
          <PropertiesInspector
            position="right"
            onPositionChange={handleSetTracerPosition}
            data={data}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            settings={settings}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdge}
            onSetTreeRoot={id => setSettings(s => ({ ...s, treeRootId: id }))}
            onRunAlgorithm={handleRunAlgorithm}
            onSelectNode={handleSelectNode}
            onClose={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              setIsInspectorOpen(false);
            }}
            theme={theme}
          />
        )}
      </div>

      {/* Docked Bottom Status Bar: Permanent, zero canvas overlap */}
      <BottomStatusBar
        stats={stats}
        activeTool={activeTool}
        zoomScale={zoomScale}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onResetZoom={() => canvasRef.current?.resetZoom()}
        onFitView={() => canvasRef.current?.fitView()}
        isPhysicsActive={isPhysicsActive}
        onTogglePhysics={() => setIsPhysicsActive(!isPhysicsActive)}
        theme={theme}
      />

      {/* Export Modal Dialog */}
      {isExportModalOpen && (
        <ExportModal
          data={data}
          settings={settings}
          onClose={() => setIsExportModalOpen(false)}
          theme={theme}
        />
      )}

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <ShareModal
          data={data}
          settings={settings}
          theme={theme}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Keyboard & Mouse Shortcuts Dialog */}
      {isShortcutsModalOpen && (
        <ShortcutsModal
          onClose={() => setIsShortcutsModalOpen(false)}
          theme={theme}
        />
      )}

      {/* Desktop App Download Dialog */}
      {isDownloadModalOpen && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          theme={theme}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md bg-blue-600/95 border-blue-400 text-white text-xs font-medium animate-in fade-in slide-in-from-bottom-3 pointer-events-none">
          <Link2 size={15} className="shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
