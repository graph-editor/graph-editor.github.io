import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GraphData, GraphNode, GraphEdge, GraphSettings, AlgorithmStep, AlgorithmType, LayoutMode, GraphTab, GraphNote } from './types/graph';
import { parseGraphInput, serializeGraphToCPInput, toggleGraphIndexing, detectNodeType, parseAndMergeTabs } from './utils/parser';
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
import { applyLayout, positionNewNodesPreservingExisting } from './utils/layout';
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
import { ImportModal } from './components/ImportModal';
import { ShareModal } from './components/ShareModal';
import { useGraphHistory } from './hooks/useGraphHistory';
import { parseGraphFromHash } from './utils/share';
import { loadSavedState, saveStateToStorage, SavedGraphState } from './utils/storage';
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
  // Centralized Modal Management (Mutually exclusive: only 1 modal can ever be open at a time, eliminating overlaps)
  type ActiveModal = 'export' | 'share' | 'shortcuts' | 'download' | 'import' | null;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const openModal = useCallback((modal: ActiveModal) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronously restore saved state from localStorage (unless shared URL hash is present)
  const [savedInitial] = useState<SavedGraphState | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && (hash.startsWith('#graph=') || hash.startsWith('#data='))) {
        return null;
      }
    }
    return loadSavedState();
  });

  const [settings, setSettings] = useState<GraphSettings>(() => {
    return savedInitial?.settings || {
      isDirected: false,
      isWeighted: false,
      isZeroIndexed: false,
      layout: 'force',
      hasHeader: false,
    };
  });

  const [tabs, setTabs] = useState<GraphTab[]>(() => {
    return savedInitial?.tabs || [
      { id: 'g1', name: 'Graph 1', text: INITIAL_CP_TEXT },
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return savedInitial?.activeTabId || 'g1';
  });

  const [rawText, setRawText] = useState<string>(() => {
    return savedInitial?.rawText ?? INITIAL_CP_TEXT;
  });
  const [data, setData] = useState<GraphData>(() => {
    return savedInitial?.data || { nodes: [], edges: [] };
  });
  const [notes, setNotes] = useState<GraphNote[]>(() => {
    return savedInitial?.notes || [];
  });
  const [newlyAddedNoteId, setNewlyAddedNoteId] = useState<string | null>(null);

  // Track auto-save status: 'saved' | 'saving'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Undo / Redo History Stack
  const { canUndo, canRedo, pushState, undo, redo, initHistory } = useGraphHistory();
  const rawTextDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          if (shared && (shared.data.nodes.length > 0 || (shared.notes && shared.notes.length > 0))) {
            setData(shared.data);
            setSettings(shared.settings);
            setRawText(shared.rawText);
            setNotes(shared.notes || []);
            if (shared.theme) setTheme(shared.theme);
            initHistory({ data: shared.data, settings: shared.settings, rawText: shared.rawText, notes: shared.notes || [] });
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

  // Panels
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

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
      // Auto-switch active tab to the graph that owns this node
      if (tabs.length > 1) {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node && node.graphIndex !== undefined && tabs[node.graphIndex]) {
          const targetTab = tabs[node.graphIndex];
          if (targetTab.id !== activeTabId) {
            setActiveTabId(targetTab.id);
            setRawText(targetTab.text);
          }
        }
      }
    }
  }, [tabs, activeTabId, data.nodes]);

  const handleSelectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
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
      if (prevState.tabs) setTabs(prevState.tabs);
      if (prevState.activeTabId) setActiveTabId(prevState.activeTabId);
      if (prevState.notes !== undefined) setNotes(prevState.notes);
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
      if (nextState.tabs) setTabs(nextState.tabs);
      if (nextState.activeTabId) setActiveTabId(nextState.activeTabId);
      if (nextState.notes !== undefined) setNotes(nextState.notes);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      setAlgorithmSteps(null);
    }
  }, [redo]);

  // Ref to ensure auto-save does not overwrite before initial load finishes
  const isInitialLoadDoneRef = useRef(false);

  // Parse initial graph once on mount, or restore from URL hash (#graph=...) or localStorage
  useEffect(() => {
    const loadInitial = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash && (hash.startsWith('#graph=') || hash.startsWith('#data='))) {
        const shared = await parseGraphFromHash(hash);
        if (shared && (shared.data.nodes.length > 0 || (shared.notes && shared.notes.length > 0))) {
          setData(shared.data);
          setSettings(shared.settings);
          setRawText(shared.rawText);
          const sharedNotes = shared.notes || [];
          setNotes(sharedNotes);
          const initialTabs: GraphTab[] = [{ id: 'g1', name: 'Graph 1', text: shared.rawText }];
          setTabs(initialTabs);
          setActiveTabId('g1');
          if (shared.theme) {
            setTheme(shared.theme);
          }
          initHistory({ data: shared.data, settings: shared.settings, rawText: shared.rawText, tabs: initialTabs, activeTabId: 'g1', notes: sharedNotes });
          saveStateToStorage({ tabs: initialTabs, activeTabId: 'g1', rawText: shared.rawText, data: shared.data, settings: shared.settings, notes: sharedNotes });
          setToastMessage(`Loaded shared graph (${shared.data.nodes.length} nodes, ${shared.data.edges.length} edges)`);
          setTimeout(() => setToastMessage(null), 3500);
          isInitialLoadDoneRef.current = true;
          return;
        }
      }

      // If restored from localStorage synchronously:
      if (savedInitial) {
        initHistory({
          data: savedInitial.data,
          settings: savedInitial.settings,
          rawText: savedInitial.rawText,
          tabs: savedInitial.tabs,
          activeTabId: savedInitial.activeTabId,
          notes: savedInitial.notes || [],
        });
        isInitialLoadDoneRef.current = true;
        return;
      }

      // First-time visit fallback: initialize starter graph
      const parsed = parseGraphInput(INITIAL_CP_TEXT, settings);
      const positioned = applyLayout(parsed.data, 'tree', { width: 900, height: 650 });
      setData(positioned);
      const initialTabs: GraphTab[] = [{ id: 'g1', name: 'Graph 1', text: INITIAL_CP_TEXT }];
      setTabs(initialTabs);
      setActiveTabId('g1');
      initHistory({ data: positioned, settings, rawText: INITIAL_CP_TEXT, tabs: initialTabs, activeTabId: 'g1', notes: [] });
      saveStateToStorage({ tabs: initialTabs, activeTabId: 'g1', rawText: INITIAL_CP_TEXT, data: positioned, settings, notes: [] });
      isInitialLoadDoneRef.current = true;
    };

    loadInitial();
  }, []);

  // Ref tracking latest state for synchronous saving
  const stateRef = useRef({ tabs, activeTabId, rawText, data, settings, notes });
  stateRef.current = { tabs, activeTabId, rawText, data, settings, notes };

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveStateToStorage(stateRef.current);
      setSaveStatus('saved');
    }, 350);
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, rawText, data, settings, notes]);

  // Synchronous auto-save on page refresh/close (beforeunload / pagehide)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInitialLoadDoneRef.current) {
        saveStateToStorage(stateRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // Update text when graph is edited visually (and not running algorithm)
  const syncGraphToText = useCallback((newData: GraphData, newSettings: GraphSettings) => {
    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    const text = serializeGraphToCPInput(newData, newSettings, false, tabs.length > 1 ? activeIdx : undefined);
    const nextTabs = tabs.map((t, idx) => idx === activeIdx ? { ...t, text } : t);
    setTabs(nextTabs);
    setRawText(text);
  }, [tabs, activeTabId]);

  // Handle changes in the text editor - strictly preserves existing node positions without jumping
  const handleRawTextChange = (text: string) => {
    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    const nextTabs = tabs.map((t, idx) => idx === activeIdx ? { ...t, text } : t);
    setTabs(nextTabs);
    setRawText(text);

    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const effectiveSettings = text.trim() === ''
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;

    const { data: mergedData, settings: parsedSettings } = parseAndMergeTabs(nextTabs, effectiveSettings, existingNodeMap);
    const center = canvasRef.current?.getVisibleCenter();
    const finalData = positionNewNodesPreservingExisting(mergedData, existingNodeMap, effectiveSettings, center);

    setData(finalData);

    const nextSettings = {
      ...effectiveSettings,
      ...parsedSettings,
      nodeCountPreserved: text.trim() === '' ? undefined : parsedSettings.nodeCountPreserved,
    };
    setSettings(nextSettings);

    if (rawTextDebounceTimerRef.current) {
      clearTimeout(rawTextDebounceTimerRef.current);
    }
    rawTextDebounceTimerRef.current = setTimeout(() => {
      pushState({ data: finalData, settings: nextSettings, rawText: text, tabs: nextTabs, activeTabId });
    }, 400);
  };

  // Tab management handlers
  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setRawText(tab.text);
    }
    // Clear selection so nodes from other tabs/graphs are not carried over
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  };

  const activeGraphIndex = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
  const handleSelectGraphTab = useCallback((graphIndex: number) => {
    if (tabs[graphIndex]) {
      handleSelectTab(tabs[graphIndex].id);
    }
  }, [tabs]);

  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const newId = 'g' + Date.now().toString(36);
    // Open new tab with a completely empty edges list
    const newText = '';
    const newTab: GraphTab = {
      id: newId,
      name: `Graph ${nextIdx}`,
      text: newText,
    };
    const nextTabs = [...tabs, newTab];
    setTabs(nextTabs);
    setActiveTabId(newId);
    setRawText(newText);

    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const { data: mergedData } = parseAndMergeTabs(nextTabs, settings, existingNodeMap);
    setData(mergedData);
    pushState({ data: mergedData, settings, rawText: newText, tabs: nextTabs, activeTabId: newId });
    setToastMessage(`Added Graph #${nextIdx}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter(t => t.id !== tabId);
    const nextActiveId = activeTabId === tabId ? nextTabs[0].id : activeTabId;
    setTabs(nextTabs);
    setActiveTabId(nextActiveId);
    const activeTab = nextTabs.find(t => t.id === nextActiveId);
    if (activeTab) {
      setRawText(activeTab.text);
    }

    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const { data: mergedData } = parseAndMergeTabs(nextTabs, settings, existingNodeMap);
    setData(mergedData);
    pushState({ data: mergedData, settings, rawText: activeTab?.text || '', tabs: nextTabs, activeTabId: nextActiveId });
    setToastMessage('Removed graph');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Split multiple detected test cases into individual graph tabs
  const handleSplitMultiTestcases = useCallback((cases: { name: string; text: string }[]) => {
    const newTabs: GraphTab[] = cases.map((c, idx) => ({
      id: `g${Date.now().toString(36)}_${idx}`,
      name: c.name,
      text: c.text,
    }));
    setTabs(newTabs);
    setActiveTabId(newTabs[0].id);
    setRawText(newTabs[0].text);

    const existingNodeMap = new Map<string, GraphNode>();
    const { data: mergedData, settings: parsedSettings } = parseAndMergeTabs(newTabs, settings, existingNodeMap);
    const center = canvasRef.current?.getVisibleCenter();
    const finalData = positionNewNodesPreservingExisting(mergedData, existingNodeMap, settings, center);

    setData(finalData);
    pushState({ data: finalData, settings, rawText: newTabs[0].text, tabs: newTabs, activeTabId: newTabs[0].id });
    setToastMessage(`Split into ${cases.length} graph tabs`);
    setTimeout(() => setToastMessage(null), 3000);
  }, [settings, pushState]);

  // Toggle explicit N M Header mode
  const handleToggleHeaderMode = (hasHeader: boolean) => {
    const newSettings = { ...settings, hasHeader };
    setSettings(newSettings);

    const existingNodeMap = new Map<string, GraphNode>();
    data.nodes.forEach(n => existingNodeMap.set(n.id, n));

    const parsed = parseGraphInput(rawText, newSettings, existingNodeMap);
    const center = canvasRef.current?.getVisibleCenter();
    const finalData = positionNewNodesPreservingExisting(parsed.data, existingNodeMap, newSettings, center);
    setData(finalData);
    pushState({ data: finalData, settings: newSettings, rawText });

    if (finalData.nodes.length > data.nodes.length) {
      const lastNewNode = finalData.nodes[finalData.nodes.length - 1];
      if (lastNewNode) {
        setTimeout(() => {
          canvasRef.current?.ensureNodeVisible(lastNewNode.id);
        }, 20);
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
    const center = canvasRef.current?.getVisibleCenter();
    const finalData = positionNewNodesPreservingExisting(parsed.data, existingNodeMap, newSettings, center);
    setData(finalData);

    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    const nextText = count !== null && finalData.nodes.length > data.nodes.length
      ? serializeGraphToCPInput(finalData, newSettings, false, tabs.length > 1 ? activeIdx : undefined)
      : rawText;
    if (nextText !== rawText) {
      setRawText(nextText);
      setTabs(prev => prev.map((t, idx) => idx === activeIdx ? { ...t, text: nextText } : t));
    }
    pushState({ data: finalData, settings: newSettings, rawText: nextText });

    if (finalData.nodes.length > data.nodes.length) {
      const lastNewNode = finalData.nodes[finalData.nodes.length - 1];
      if (lastNewNode) {
        setTimeout(() => {
          canvasRef.current?.ensureNodeVisible(lastNewNode.id);
        }, 20);
      }
    }
  };

  // Compute live graph stats
  const stats = useMemo(() => computeGraphStats(data, settings.isDirected), [data, settings.isDirected]);

  // Visual Node Addition
  const handleAddNode = (x: number, y: number) => {
    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    const activeTab = tabs[activeIdx];
    const prefix = tabs.length > 1 ? `${activeTab.id}:` : '';

    const tabNodes = data.nodes.filter(n => (n.graphIndex ?? 0) === activeIdx);
    const existingNums = tabNodes
      .map(n => n.label || (n.id.includes(':') ? n.id.slice(n.id.indexOf(':') + 1) : n.id))
      .filter(id => /^-?\d+$/.test(id))
      .map(Number)
      .filter(n => !isNaN(n));

    let nextNum = settings.isZeroIndexed ? 0 : 1;
    if (existingNums.length > 0) {
      nextNum = Math.max(...existingNums) + 1;
    }
    const existingIds = new Set(tabNodes.map(n => n.label || (n.id.includes(':') ? n.id.slice(n.id.indexOf(':') + 1) : n.id)));
    while (existingIds.has(String(nextNum))) {
      nextNum++;
    }

    const newNode: GraphNode = {
      id: `${prefix}${nextNum}`,
      label: String(nextNum),
      nodeType: 'int',
      index: nextNum,
      graphIndex: activeIdx,
      x,
      y,
      color: '#3b82f6',
    };

    const nextSettings = settings.nodeCountPreserved !== undefined
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;
    if (nextSettings !== settings) setSettings(nextSettings);

    const nextData = {
      ...data,
      nodes: [...data.nodes, newNode],
    };
    setData(nextData);
    syncGraphToText(nextData, nextSettings);
    handleSelectNode(newNode.id);
    const text = serializeGraphToCPInput(nextData, nextSettings, false, tabs.length > 1 ? activeIdx : undefined);
    pushState({ data: nextData, settings: nextSettings, rawText: text, tabs, activeTabId });
  };

  // Add single node by custom label/identifier (e.g. from LeftPanel)
  const handleAddSingleNode = (name?: string, explicitWeight?: string | number) => {
    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    const activeTab = tabs[activeIdx];
    const prefix = tabs.length > 1 ? `${activeTab.id}:` : '';
    const tabNodes = data.nodes.filter(n => (n.graphIndex ?? 0) === activeIdx);

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

    const existingLabels = new Set(
      tabNodes.map(n => n.label || (n.id.includes(':') ? n.id.slice(n.id.indexOf(':') + 1) : n.id))
    );

    if (!raw) {
      const existingNums = tabNodes
        .map(n => n.label || (n.id.includes(':') ? n.id.slice(n.id.indexOf(':') + 1) : n.id))
        .filter(id => /^-?\d+$/.test(id))
        .map(Number)
        .filter(n => !isNaN(n));
      let nextNum = settings.isZeroIndexed ? 0 : 1;
      if (existingNums.length > 0) {
        nextNum = Math.max(...existingNums) + 1;
      }
      while (existingLabels.has(String(nextNum))) {
        nextNum++;
      }
      raw = String(nextNum);
    }

    // Ensure uniqueness if collision occurs
    let finalLabel = raw;
    let counter = 1;
    while (existingLabels.has(finalLabel)) {
      finalLabel = `${raw}_${counter++}`;
    }
    const finalId = `${prefix}${finalLabel}`;

    const center = canvasRef.current?.getVisibleCenter() ?? { x: 400, y: 300 };
    let posX = center.x + (Math.random() - 0.5) * 60;
    let posY = center.y + (Math.random() - 0.5) * 60;

    // Check collision with existing nodes and offset in a spiral to find a clear spot
    let collision = true;
    let attempts = 0;
    while (collision && attempts < 25) {
      collision = data.nodes.some(n => {
        const dx = n.x - posX;
        const dy = n.y - posY;
        return dx * dx + dy * dy < 55 * 55;
      });
      if (collision) {
        const angle = (attempts * 137.5 * Math.PI) / 180;
        const dist = 65 * Math.sqrt(attempts + 1);
        posX = center.x + Math.cos(angle) * dist;
        posY = center.y + Math.sin(angle) * dist;
      }
      attempts++;
    }

    const newNode: GraphNode = {
      id: finalId,
      label: finalLabel,
      nodeType: detectNodeType(finalLabel),
      weight,
      value: weight,
      index: tabNodes.length + (settings.isZeroIndexed ? 0 : 1),
      graphIndex: activeIdx,
      x: posX,
      y: posY,
      color: '#3b82f6',
    };

    const nextSettings = settings.nodeCountPreserved !== undefined
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;
    if (nextSettings !== settings) setSettings(nextSettings);

    const nextData = {
      ...data,
      nodes: [...data.nodes, newNode],
    };
    setData(nextData);
    syncGraphToText(nextData, nextSettings);
    handleSelectNode(newNode.id);
    const text = serializeGraphToCPInput(nextData, nextSettings, false, tabs.length > 1 ? activeIdx : undefined);
    pushState({ data: nextData, settings: nextSettings, rawText: text, tabs, activeTabId });

    setTimeout(() => {
      canvasRef.current?.ensureNodeVisible(newNode.id);
    }, 20);
  };

  // Visual Edge Addition
  const handleAddEdge = (sourceId: string, targetId: string) => {
    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    const newEdge: GraphEdge = {
      id: `e-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      weight: settings.isWeighted ? 1 : undefined,
      color: '#64748b',
      directed: settings.isDirected,
      graphIndex: activeIdx,
    };

    const nextData = {
      ...data,
      edges: [...data.edges, newEdge],
    };
    setData(nextData);
    syncGraphToText(nextData, settings);
    setSelectedEdgeId(newEdge.id);
    const text = serializeGraphToCPInput(nextData, settings, false, tabs.length > 1 ? activeIdx : undefined);
    pushState({ data: nextData, settings, rawText: text, tabs, activeTabId });
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

    const isBatchColor = updates.color !== undefined && selectedNodeIds.includes(nodeId) && selectedNodeIds.length > 1;
    const batchNodeSet = isBatchColor ? new Set(selectedNodeIds) : null;

    const nextNodes = data.nodes.map(n => {
      if (batchNodeSet && batchNodeSet.has(n.id)) {
        return {
          ...n,
          color: updates.color ?? n.color,
          ...(n.id === nodeId
            ? {
                ...updates,
                id: targetId,
                label: updates.label !== undefined ? updates.label : n.label,
                nodeType: detectNodeType(targetId),
              }
            : {}),
        };
      }
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

    const nextSettings = settings.nodeCountPreserved !== undefined
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;
    if (nextSettings !== settings) setSettings(nextSettings);

    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, nextSettings);
    const text = serializeGraphToCPInput(nextData, nextSettings, false);
    pushState({ data: nextData, settings: nextSettings, rawText: text });

    if (selectedNodeId === nodeId && targetId !== nodeId) {
      setSelectedNodeId(targetId);
    }
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string) => {
    const nextSettings = settings.nodeCountPreserved !== undefined
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;
    if (nextSettings !== settings) setSettings(nextSettings);

    const nextNodes = data.nodes.filter(n => n.id !== nodeId);
    const nextEdges = data.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, nextSettings);
    setSelectedNodeId(null);
    const text = serializeGraphToCPInput(nextData, nextSettings, false);
    pushState({ data: nextData, settings: nextSettings, rawText: text });
  };

  // Edge property update
  const handleUpdateEdge = (edgeId: string, updates: Partial<GraphEdge>) => {
    const isBatchColor = updates.color !== undefined && selectedEdgeIds.includes(edgeId) && selectedEdgeIds.length > 1;
    const batchEdgeSet = isBatchColor ? new Set(selectedEdgeIds) : null;

    const nextEdges = data.edges.map(e => {
      if (batchEdgeSet && batchEdgeSet.has(e.id)) {
        return {
          ...e,
          color: updates.color ?? e.color,
          ...(e.id === edgeId ? updates : {}),
        };
      }
      return e.id === edgeId ? { ...e, ...updates } : e;
    });
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

  // Batch Multi-Selection Handlers (Lasso / Ctrl-select)
  const handleBatchSelect = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    setSelectedEdgeIds(edgeIds);
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

    const nextSettings = settings.nodeCountPreserved !== undefined
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;
    if (nextSettings !== settings) setSettings(nextSettings);

    const nextData = { nodes: nextNodes, edges: nextEdges };
    setData(nextData);
    syncGraphToText(nextData, nextSettings);
    const text = serializeGraphToCPInput(nextData, nextSettings, false);
    pushState({ data: nextData, settings: nextSettings, rawText: text });

    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    if (selectedNodeId && nodeSet.has(selectedNodeId)) setSelectedNodeId(null);
    if (selectedEdgeId && edgeSet.has(selectedEdgeId)) setSelectedEdgeId(null);
    setIsInspectorOpen(false);
  }, [selectedNodeIds, selectedEdgeIds, data, settings, syncGraphToText, selectedNodeId, selectedEdgeId, pushState]);

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
    const activeIdx = tabs.length > 1 ? tabs.findIndex(t => t.id === activeTabId) : undefined;
    const laidOut = applyLayout(data, layout, {
      rootId: settings.treeRootId,
      isDirected: settings.isDirected,
      targetGraphIndex: activeIdx !== undefined && activeIdx >= 0 ? activeIdx : undefined,
    });
    setData(laidOut);
    setIsPhysicsActive(layout === 'force');
    const text = serializeGraphToCPInput(laidOut, nextSettings, false, tabs.length > 1 ? activeIdx : undefined);
    pushState({ data: laidOut, settings: nextSettings, rawText: text, tabs, activeTabId });
  };

  // Load Preset
  const handleLoadPreset = (newData: GraphData, newSettings: Partial<GraphSettings>) => {
    const mergedSettings = { ...settings, ...newSettings, nodeCountPreserved: newSettings.nodeCountPreserved };
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
    const nextSettings = settings.nodeCountPreserved !== undefined
      ? { ...settings, nodeCountPreserved: undefined }
      : settings;
    if (nextSettings !== settings) setSettings(nextSettings);

    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTabId));
    if (tabs.length <= 1) {
      const resetTabs: GraphTab[] = [{ id: 'g1', name: 'Graph 1', text: '' }];
      setTabs(resetTabs);
      setActiveTabId('g1');
      setRawText('');
      setData(empty);
      setNotes([]);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      setAlgorithmSteps(null);
      pushState({ data: empty, settings: nextSettings, rawText: '', tabs: resetTabs, activeTabId: 'g1', notes: [] });
    } else {
      // Multiple tabs: clear the active tab's edges
      const nextTabs = tabs.map((t, idx) => idx === activeIdx ? { ...t, text: '' } : t);
      setTabs(nextTabs);
      setRawText('');
      const existingNodeMap = new Map<string, GraphNode>();
      data.nodes.filter(n => (n.graphIndex ?? 0) !== activeIdx).forEach(n => existingNodeMap.set(n.id, n));
      const { data: mergedData } = parseAndMergeTabs(nextTabs, nextSettings, existingNodeMap);
      setData(mergedData);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      setAlgorithmSteps(null);
      pushState({ data: mergedData, settings: nextSettings, rawText: '', tabs: nextTabs, activeTabId });
    }
    setToastMessage('Cleared graph');
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Canvas Notes CRUD Handlers
  const handleAddNote = useCallback(() => {
    const center = canvasRef.current?.getVisibleCenter() ?? { x: 400, y: 300 };
    let targetX = center.x - 120;
    let targetY = center.y - 65;

    // Stagger if another note already sits right at this position
    let attempts = 0;
    while (
      attempts < 12 &&
      notes.some(n => Math.abs(n.x - targetX) < 30 && Math.abs(n.y - targetY) < 30)
    ) {
      targetX += 26;
      targetY += 26;
      attempts++;
    }

    const newNote: GraphNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: targetX,
      y: targetY,
      width: 236,
      title: 'Note',
      text: '',
      color: 'neutral',
    };

    const nextNotes = [...notes, newNote];
    setNotes(nextNotes);
    setNewlyAddedNoteId(newNote.id);
    pushState({ data, settings, rawText, notes: nextNotes });
  }, [notes, data, settings, rawText, pushState]);

  const handleUpdateNote = useCallback((noteId: string, updates: Partial<GraphNote>) => {
    setNotes(prev => {
      const nextNotes = prev.map(n => (n.id === noteId ? { ...n, ...updates } : n));
      if (noteDebounceTimerRef.current) {
        clearTimeout(noteDebounceTimerRef.current);
      }
      noteDebounceTimerRef.current = setTimeout(() => {
        const s = stateRef.current;
        pushState({ data: s.data, settings: s.settings, rawText: s.rawText, notes: s.notes });
      }, 450);
      return nextNotes;
    });
  }, [pushState]);

  const handleCommitNoteHistory = useCallback(() => {
    if (noteDebounceTimerRef.current) {
      clearTimeout(noteDebounceTimerRef.current);
      noteDebounceTimerRef.current = null;
    }
    const s = stateRef.current;
    pushState({ data: s.data, settings: s.settings, rawText: s.rawText, notes: s.notes });
  }, [pushState]);

  const handleDeleteNote = useCallback((noteId: string) => {
    if (noteDebounceTimerRef.current) {
      clearTimeout(noteDebounceTimerRef.current);
      noteDebounceTimerRef.current = null;
    }
    const nextNotes = notes.filter(n => n.id !== noteId);
    setNotes(nextNotes);
    if (newlyAddedNoteId === noteId) {
      setNewlyAddedNoteId(null);
    }
    pushState({ data, settings, rawText, notes: nextNotes });
  }, [notes, newlyAddedNoteId, data, settings, rawText, pushState]);

  const handleBringNoteToFront = useCallback((noteId: string) => {
    setNotes(prev => {
      if (prev.length <= 1 || prev[prev.length - 1].id === noteId) return prev;
      const target = prev.find(n => n.id === noteId);
      if (!target) return prev;
      return [...prev.filter(n => n.id !== noteId), target];
    });
  }, []);

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

    // 5. Close any open modal
    closeModal();

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
          setData(prev => {
            const nextData = {
              ...prev,
              edges: prev.edges.map(e => ({ ...e, directed: nextDirected })),
            };
            syncGraphToText(nextData, next);
            const text = serializeGraphToCPInput(nextData, next, false);
            pushState({ data: nextData, settings: next, rawText: text });
            return nextData;
          });
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

  const selectedNode = useMemo(() => {
    if (selectedNodeId) return data.nodes.find(n => n.id === selectedNodeId) || null;
    if (selectedNodeIds.length > 0) return data.nodes.find(n => n.id === selectedNodeIds[selectedNodeIds.length - 1]) || null;
    return null;
  }, [data.nodes, selectedNodeId, selectedNodeIds]);

  const selectedEdge = useMemo(() => {
    if (selectedEdgeId) return data.edges.find(e => e.id === selectedEdgeId) || null;
    if (selectedEdgeIds.length > 0) return data.edges.find(e => e.id === selectedEdgeIds[selectedEdgeIds.length - 1]) || null;
    return null;
  }, [data.edges, selectedEdgeId, selectedEdgeIds]);

  const hasSelection = Boolean(selectedNode || selectedEdge || selectedNodeIds.length > 0 || selectedEdgeIds.length > 0);

  // Automatically hide Node Tracer / Properties Inspector when no nodes or edges are selected
  useEffect(() => {
    if (!hasSelection) {
      setIsInspectorOpen(false);
    }
  }, [hasSelection]);

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenEditor={() => {
            setCurrentView('editor');
            if (typeof window !== 'undefined') window.location.hash = '';
          }}
          onOpenDownloadModal={() => openModal('download')}
        />
        <DownloadModal
          isOpen={activeModal === 'download'}
          onClose={closeModal}
          theme={theme}
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
          if (s.isDirected !== undefined && s.isDirected !== settings.isDirected) {
            setData(prev => {
              const nextData = {
                ...prev,
                edges: prev.edges.map(e => ({ ...e, directed: s.isDirected! })),
              };
              syncGraphToText(nextData, merged);
              const text = serializeGraphToCPInput(nextData, merged, false);
              pushState({ data: nextData, settings: merged, rawText: text });
              return nextData;
            });
          } else {
            syncGraphToText(data, merged);
            const text = serializeGraphToCPInput(data, merged, false);
            pushState({ data, settings: merged, rawText: text });
          }
          setSettings(merged);
        }}
        onApplyLayout={handleApplyLayout}
        onClearGraph={handleClearGraph}
        onToggleIndexMode={handleToggleIndexMode}
        onOpenExportModal={() => openModal('export')}
        onOpenShareModal={() => openModal('share')}
        onOpenShortcutsModal={() => openModal('shortcuts')}
        isInspectorOpen={isInspectorOpen && hasSelection}
        onToggleInspector={() => {
          if (isInspectorOpen && hasSelection) {
            setIsInspectorOpen(false);
          } else {
            if (!hasSelection && data.nodes.length > 0) {
              handleSelectNode(data.nodes[0].id);
            }
            setIsInspectorOpen(true);
          }
        }}
        tracerPosition={tracerPosition}
        onToggleTracerPosition={handleToggleTracerPosition}
        onGoHome={isElectron ? undefined : () => {
          setCurrentView('landing');
          if (typeof window !== 'undefined') window.location.hash = '#about';
        }}
        onOpenDownloadModal={() => openModal('download')}
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
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onAddTab={handleAddTab}
          onCloseTab={handleCloseTab}
          onSplitMultiTestcases={handleSplitMultiTestcases}
          onOpenImportModal={() => openModal('import')}
          onAddNote={handleAddNote}
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
              onSelectEdge={handleSelectEdge}
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
              activeGraphIndex={activeGraphIndex}
              onSelectGraphTab={handleSelectGraphTab}
              notes={notes}
              newlyAddedNoteId={newlyAddedNoteId}
              onUpdateNote={handleUpdateNote}
              onCommitNoteHistory={handleCommitNoteHistory}
              onDeleteNote={handleDeleteNote}
              onBringNoteToFront={handleBringNoteToFront}
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
          {tracerPosition === 'bottom' && isInspectorOpen && hasSelection && (selectedNode || selectedEdge) && (
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
                setSelectedNodeIds([]);
                setSelectedEdgeIds([]);
                setIsInspectorOpen(false);
              }}
              theme={theme}
            />
          )}
        </div>

        {/* Docked Right Properties Inspector: Slides in beside canvas, zero overlap */}
        {tracerPosition === 'right' && isInspectorOpen && hasSelection && (selectedNode || selectedEdge) && (
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
              setSelectedNodeIds([]);
              setSelectedEdgeIds([]);
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
        saveStatus={saveStatus}
      />

      {/* Mutually Exclusive Modals (Guaranteed Zero Overlap via document.body Portal) */}
      {activeModal === 'export' && (
        <ExportModal
          data={data}
          settings={settings}
          notes={notes}
          onClose={closeModal}
          theme={theme}
        />
      )}

      {activeModal === 'share' && (
        <ShareModal
          data={data}
          settings={settings}
          notes={notes}
          theme={theme}
          onClose={closeModal}
        />
      )}

      {activeModal === 'shortcuts' && (
        <ShortcutsModal
          onClose={closeModal}
          theme={theme}
        />
      )}

      {activeModal === 'download' && (
        <DownloadModal
          isOpen={true}
          onClose={closeModal}
          theme={theme}
        />
      )}

      {activeModal === 'import' && (
        <ImportModal
          onClose={closeModal}
          onImportSingle={text => {
            handleRawTextChange(text);
          }}
          onImportMulti={cases => {
            handleSplitMultiTestcases(cases);
          }}
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
