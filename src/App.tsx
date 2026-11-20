import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep, AlgorithmType, LayoutMode } from './types/graph';
import { parseGraphInput, serializeGraphToCPInput, toggleGraphIndexing, detectNodeType } from './utils/parser';
import { computeGraphStats, runBFS, runDFS, runDijkstra, runTopologicalSort, runTarjanSCC, runBridgesAndCutVertices, runKruskalMST, runBipartiteCheck } from './utils/algorithms';
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
    if (typeof window !== 'undefined' && window.location.hash === '#editor') return 'editor';
    return 'landing';
  });
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isElectron) return;
    const handleHashChange = () => {
      if (window.location.hash === '#editor') {
        setCurrentView('editor');
      } else if (window.location.hash === '' || window.location.hash === '#') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isElectron]);

  const [settings, setSettings] = useState<GraphSettings>({
    isDirected: false,
    isWeighted: false,
    isZeroIndexed: false,
    layout: 'force',
  });

  const [rawText, setRawText] = useState<string>(INITIAL_CP_TEXT);
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });

  // Tools & Selection
  const [activeTool, setActiveTool] = useState<'select' | 'node' | 'edge'>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

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

  // Physics Simulation
  const [isPhysicsActive, setIsPhysicsActive] = useState<boolean>(false);

  // Algorithm Player
  const [algorithmSteps, setAlgorithmSteps] = useState<AlgorithmStep[] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Parse initial graph once on mount
  useEffect(() => {
    const parsed = parseGraphInput(INITIAL_CP_TEXT, settings);
    const positioned = applyLayout(parsed.data, 'tree', { width: 900, height: 650 });
    setData(positioned);
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

    // If an N M header was pasted, automatically strip it and put clean edges into rawText
    if (parsed.detectedHeader) {
      setRawText(parsed.detectedHeader.strippedEdgesText);
      setSettings(prev => ({
        ...prev,
        ...parsed.settings,
        nodeCountPreserved: parsed.detectedHeader?.n,
      }));
    } else {
      setRawText(text);
      if (parsed.settings) {
        setSettings(prev => ({ ...prev, ...parsed.settings }));
      }
    }
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
  };

  // Compute live graph stats
  const stats = useMemo(() => computeGraphStats(data, settings.isDirected), [data, settings.isDirected]);

  // Pinned nodes count
  const pinnedCount = useMemo(() => data.nodes.filter(n => n.isPinned).length, [data.nodes]);

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

  // Finish dragging: keep node fixed at its exact dropped position so it never jumps or moves away
  const handleFinishDragNode = (id: string) => {
    setData(prev => {
      const nextNodes = prev.nodes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            isPinned: true, // Locks to the dropped position so physics never drifts it
            fx: n.x,
            fy: n.y,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      });
      const nextData = { ...prev, nodes: nextNodes };
      syncGraphToText(nextData, settings);
      return nextData;
    });
  };

  // Toggle Fixed / Pin Node (Double click on node or inspector button)
  const handleTogglePinNode = (nodeId: string) => {
    setData(prev => {
      const nextNodes = prev.nodes.map(n => {
        if (n.id === nodeId) {
          const nextPinned = !n.isPinned;
          return {
            ...n,
            isPinned: nextPinned,
            fx: nextPinned ? n.x : null,
            fy: nextPinned ? n.y : null,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      });
      return { ...prev, nodes: nextNodes };
    });
  };

  // Unpin all nodes
  const handleUnpinAllNodes = () => {
    setData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => ({
        ...n,
        isPinned: false,
        fx: null,
        fy: null,
        vx: 0,
        vy: 0,
      })),
    }));
  };

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
  };

  // Edge property update
  const handleUpdateEdge = (edgeId: string, updates: Partial<GraphEdge>) => {
    const nextEdges = data.edges.map(e => (e.id === edgeId ? { ...e, ...updates } : e));
    const nextData = { ...data, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId: string) => {
    const nextEdges = data.edges.filter(e => e.id !== edgeId);
    const nextData = { ...data, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, settings);
    setSelectedEdgeId(null);
  };

  // Change indexing mode (0-based vs 1-based)
  const handleToggleIndexMode = () => {
    const nextZero = !settings.isZeroIndexed;
    const toggled = toggleGraphIndexing(data, nextZero);
    const nextSettings = { ...settings, isZeroIndexed: nextZero };
    setSettings(nextSettings);
    setData(toggled);
    syncGraphToText(toggled, nextSettings);
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
  };

  // Load Preset
  const handleLoadPreset = (newData: GraphData, newSettings: Partial<GraphSettings>) => {
    const mergedSettings = { ...settings, ...newSettings };
    setSettings(mergedSettings);
    setData(newData);
    syncGraphToText(newData, mergedSettings);
    setAlgorithmSteps(null);
  };

  // Clear Graph
  const handleClearGraph = () => {
    const empty = { nodes: [], edges: [] };
    setData(empty);
    setRawText('');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setAlgorithmSteps(null);
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
      case 'bipartite_check':
        steps = runBipartiteCheck(data);
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

    // 2. Clear selections (both node and edge)
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    // 3. Reset active tool to default select/move mode
    setActiveTool('select');

    // 4. Close properties inspector
    setIsInspectorOpen(false);

    // 5. Close all modals
    setIsExportModalOpen(false);
    setIsShortcutsModalOpen(false);

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

      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'v' || key === 's') {
        setActiveTool('select');
      } else if (key === 'n') {
        setActiveTool('node');
      } else if (key === 'e') {
        setActiveTool('edge');
      } else if (key === 'd') {
        setSettings(s => {
          const nextDirected = !s.isDirected;
          const next = { ...s, isDirected: nextDirected };
          syncGraphToText(data, next);
          return next;
        });
      } else if (key === 'w') {
        setSettings(s => {
          const nextWeighted = !s.isWeighted;
          const next = { ...s, isWeighted: nextWeighted };
          syncGraphToText(data, next);
          return next;
        });
      } else if (key === ' ') {
        e.preventDefault();
        setIsPhysicsActive(prev => !prev);
      } else if (key === 'f') {
        canvasRef.current?.fitView();
      } else if (key === 'delete' || key === 'backspace') {
        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          handleDeleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelAllActions, selectedNodeId, selectedEdgeId, data, settings]);

  const selectedNode = useMemo(() => data.nodes.find(n => n.id === selectedNodeId) || null, [data.nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => data.edges.find(e => e.id === selectedEdgeId) || null, [data.edges, selectedEdgeId]);

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenEditor={() => {
            setCurrentView('editor');
            if (typeof window !== 'undefined') window.location.hash = '#editor';
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
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Navigation Bar */}
      <TopBar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        settings={settings}
        onUpdateSettings={s => {
          const merged = { ...settings, ...s };
          setSettings(merged);
          syncGraphToText(data, merged);
        }}
        onApplyLayout={handleApplyLayout}
        onClearGraph={handleClearGraph}
        onToggleIndexMode={handleToggleIndexMode}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        isInspectorOpen={isInspectorOpen || !!selectedNode || !!selectedEdge}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        tracerPosition={tracerPosition}
        onToggleTracerPosition={handleToggleTracerPosition}
        onGoHome={isElectron ? undefined : () => {
          setCurrentView('landing');
          if (typeof window !== 'undefined') window.location.hash = '';
        }}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
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
        />

        {/* Center Workspace (Canvas + Bottom Docked Inspector + Floating Algorithm Controls) */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          {/* Unobstructed Canvas with Solid Dark Background */}
          <div className="flex-1 relative overflow-hidden bg-[#090d16]">
            <Canvas
              ref={canvasRef}
              data={data}
              settings={settings}
              activeTool={activeTool}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={handleSelectNode}
              onSelectEdge={setSelectedEdgeId}
              onAddNode={handleAddNode}
              onAddEdge={handleAddEdge}
              onUpdateNodePosition={handleUpdateNodePosition}
              onFinishDragNode={handleFinishDragNode}
              onTogglePinNode={handleTogglePinNode}
              onUpdateGraphData={setData}
              currentStep={algorithmSteps ? algorithmSteps[currentStepIndex] : undefined}
              isPhysicsActive={isPhysicsActive}
              onZoomChange={setZoomScale}
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
              onTogglePinNode={handleTogglePinNode}
              onRunAlgorithm={handleRunAlgorithm}
              onSelectNode={handleSelectNode}
              onClose={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setIsInspectorOpen(false);
              }}
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
            onTogglePinNode={handleTogglePinNode}
            onRunAlgorithm={handleRunAlgorithm}
            onSelectNode={handleSelectNode}
            onClose={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              setIsInspectorOpen(false);
            }}
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
        pinnedCount={pinnedCount}
        onUnpinAll={handleUnpinAllNodes}
      />

      {/* Export Modal Dialog */}
      {isExportModalOpen && (
        <ExportModal
          data={data}
          settings={settings}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Keyboard & Mouse Shortcuts Dialog */}
      {isShortcutsModalOpen && (
        <ShortcutsModal onClose={() => setIsShortcutsModalOpen(false)} />
      )}

      {/* Desktop App Download Dialog */}
      {isDownloadModalOpen && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
        />
      )}
    </div>
  );
}
