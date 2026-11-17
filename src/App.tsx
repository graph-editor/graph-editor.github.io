import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep, AlgorithmType, LayoutMode } from './types/graph';
import { parseGraphInput, serializeGraphToCPInput, toggleGraphIndexing } from './utils/parser';
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

// Initial CP Graph (Tree sample from Codeforces contest)
const INITIAL_CP_TEXT = `7 6
1 2
1 3
2 4
2 5
3 6
3 7`;

export function App() {
  const canvasRef = useRef<CanvasHandle>(null);

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
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

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
    const text = serializeGraphToCPInput(newData, newSettings);
    setRawText(text);
  }, []);

  // Handle changes in the text editor
  const handleRawTextChange = (text: string) => {
    setRawText(text);
    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const parsed = parseGraphInput(text, settings, existingNodeMap);
    let finalData = parsed.data;

    // Apply layout if brand new nodes without positions
    if (parsed.data.nodes.some(n => !existingNodeMap.has(n.id))) {
      finalData = applyLayout(parsed.data, settings.layout);
    }

    setData(finalData);
    if (parsed.settings) {
      setSettings(prev => ({ ...prev, ...parsed.settings }));
    }
  };

  // Compute live graph stats
  const stats = useMemo(() => computeGraphStats(data, settings.isDirected), [data, settings.isDirected]);

  // Pinned nodes count
  const pinnedCount = useMemo(() => data.nodes.filter(n => n.isPinned).length, [data.nodes]);

  // Visual Node Addition
  const handleAddNode = (x: number, y: number) => {
    const existingNums = data.nodes.map(n => Number(n.id)).filter(n => !isNaN(n));
    let nextNum = settings.isZeroIndexed ? 0 : 1;
    if (existingNums.length > 0) {
      nextNum = Math.max(...existingNums) + 1;
    }

    const newNode: GraphNode = {
      id: String(nextNum),
      label: String(nextNum),
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
    setSelectedNodeId(newNode.id);
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

  // Update Node Position (from dragging)
  const handleUpdateNodePosition = (id: string, x: number, y: number, isFixed?: boolean) => {
    setData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            x,
            y,
            fx: n.isPinned || isFixed ? x : null,
            fy: n.isPinned || isFixed ? y : null,
            vx: 0,
            vy: 0,
          };
        }
        return n;
      }),
    }));
  };

  // Finish dragging: sync text and reset fx/fy if not pinned
  const handleFinishDragNode = (id: string) => {
    setData(prev => {
      const nextNodes = prev.nodes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            fx: n.isPinned ? n.x : null,
            fy: n.isPinned ? n.y : null,
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
    const nextNodes = data.nodes.map(n => (n.id === nodeId ? { ...n, ...updates } : n));
    const nextData = { ...data, nodes: nextNodes };
    setData(nextData);
    syncGraphToText(nextData, settings);
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (key === 'escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setActiveTool('select');
        setIsExportModalOpen(false);
        setIsShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, data, settings]);

  const selectedNode = useMemo(() => data.nodes.find(n => n.id === selectedNodeId) || null, [data.nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => data.edges.find(e => e.id === selectedEdgeId) || null, [data.edges, selectedEdgeId]);

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
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
      />

      {/* Main Workspace: Left Panel, Center Canvas Area, Right Docked Inspector */}
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
        />

        {/* Center Workspace (Canvas + Floating Algorithm Controls at BOTTOM CENTER) */}
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
              onSelectNode={setSelectedNodeId}
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
        </div>

        {/* Docked Right Properties Inspector: Slides in beside canvas, zero overlap */}
        {(isInspectorOpen || selectedNode || selectedEdge) && (
          <PropertiesInspector
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            settings={settings}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdge}
            onSetTreeRoot={id => setSettings(s => ({ ...s, treeRootId: id }))}
            onTogglePinNode={handleTogglePinNode}
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
    </div>
  );
}
