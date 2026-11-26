import { useRef, useState, useCallback } from 'react';
import { GraphData, GraphSettings, GraphTab, GraphNote } from '../types/graph';

export interface HistoryState {
  data: GraphData;
  settings: GraphSettings;
  rawText: string;
  tabs?: GraphTab[];
  activeTabId?: string;
  notes?: GraphNote[];
}

function cloneNotes(notes?: GraphNote[]): GraphNote[] | undefined {
  return notes ? notes.map(n => ({ ...n })) : undefined;
}

function cloneData(data: GraphData): GraphData {
  return {
    nodes: data.nodes.map(n => ({ ...n })),
    edges: data.edges.map(e => ({ ...e })),
  };
}

function isStateEqual(a: HistoryState, b: HistoryState): boolean {
  if (a.rawText !== b.rawText) return false;
  if (a.activeTabId !== b.activeTabId) return false;
  if ((a.tabs?.length || 0) !== (b.tabs?.length || 0)) return false;
  if (a.tabs && b.tabs) {
    for (let i = 0; i < a.tabs.length; i++) {
      if (a.tabs[i].id !== b.tabs[i].id || a.tabs[i].text !== b.tabs[i].text || a.tabs[i].name !== b.tabs[i].name) {
        return false;
      }
    }
  }
  if (
    a.settings.isDirected !== b.settings.isDirected ||
    a.settings.isWeighted !== b.settings.isWeighted ||
    a.settings.isZeroIndexed !== b.settings.isZeroIndexed ||
    a.settings.layout !== b.settings.layout ||
    a.settings.hasHeader !== b.settings.hasHeader ||
    a.settings.nodeCountPreserved !== b.settings.nodeCountPreserved
  ) {
    return false;
  }
  if (a.data.nodes.length !== b.data.nodes.length || a.data.edges.length !== b.data.edges.length) {
    return false;
  }
  for (let i = 0; i < a.data.nodes.length; i++) {
    const na = a.data.nodes[i];
    const nb = b.data.nodes[i];
    if (
      na.id !== nb.id ||
      Math.abs(na.x - nb.x) > 0.5 ||
      Math.abs(na.y - nb.y) > 0.5 ||
      na.label !== nb.label ||
      na.weight !== nb.weight ||
      na.color !== nb.color ||
      na.graphIndex !== nb.graphIndex
    ) {
      return false;
    }
  }
  for (let i = 0; i < a.data.edges.length; i++) {
    const ea = a.data.edges[i];
    const eb = b.data.edges[i];
    if (
      ea.id !== eb.id ||
      ea.source !== eb.source ||
      ea.target !== eb.target ||
      ea.weight !== eb.weight ||
      ea.directed !== eb.directed ||
      ea.color !== eb.color ||
      ea.style !== eb.style ||
      ea.graphIndex !== eb.graphIndex
    ) {
      return false;
    }
  }
  const naList = a.notes || [];
  const nbList = b.notes || [];
  if (naList.length !== nbList.length) return false;
  for (let i = 0; i < naList.length; i++) {
    const na = naList[i];
    const nb = nbList[i];
    if (
      na.id !== nb.id ||
      Math.abs(na.x - nb.x) > 0.5 ||
      Math.abs(na.y - nb.y) > 0.5 ||
      na.width !== nb.width ||
      na.height !== nb.height ||
      na.fontSize !== nb.fontSize ||
      na.title !== nb.title ||
      na.text !== nb.text ||
      na.color !== nb.color ||
      na.graphIndex !== nb.graphIndex
    ) {
      return false;
    }
  }
  return true;
}

export function useGraphHistory(initialState?: HistoryState) {
  const historyRef = useRef<HistoryState[]>(
    initialState
      ? [
          {
            data: cloneData(initialState.data),
            settings: { ...initialState.settings },
            rawText: initialState.rawText,
            tabs: initialState.tabs ? initialState.tabs.map(t => ({ ...t })) : undefined,
            activeTabId: initialState.activeTabId,
            notes: cloneNotes(initialState.notes),
          },
        ]
      : []
  );
  const indexRef = useRef<number>(initialState ? 0 : -1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const updateFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current >= 0 && indexRef.current < historyRef.current.length - 1);
  }, []);

  const initHistory = useCallback(
    (state: HistoryState) => {
      const cloned: HistoryState = {
        data: cloneData(state.data),
        settings: { ...state.settings },
        rawText: state.rawText,
        tabs: state.tabs ? state.tabs.map(t => ({ ...t })) : undefined,
        activeTabId: state.activeTabId,
        notes: cloneNotes(state.notes),
      };
      historyRef.current = [cloned];
      indexRef.current = 0;
      updateFlags();
    },
    [updateFlags]
  );

  const pushState = useCallback(
    (state: HistoryState) => {
      const current = historyRef.current[indexRef.current];
      const resolvedState: HistoryState = {
        ...state,
        notes: state.notes !== undefined ? state.notes : current?.notes,
        tabs: state.tabs !== undefined ? state.tabs : current?.tabs,
        activeTabId: state.activeTabId !== undefined ? state.activeTabId : current?.activeTabId,
      };
      if (current && isStateEqual(current, resolvedState)) {
        return;
      }

      const nextEntry: HistoryState = {
        data: cloneData(resolvedState.data),
        settings: { ...resolvedState.settings },
        rawText: resolvedState.rawText,
        tabs: resolvedState.tabs ? resolvedState.tabs.map(t => ({ ...t })) : undefined,
        activeTabId: resolvedState.activeTabId,
        notes: cloneNotes(resolvedState.notes),
      };

      // Discard any redo states ahead of the current pointer
      const nextHistory = historyRef.current.slice(0, indexRef.current + 1);
      nextHistory.push(nextEntry);

      // Keep at most 60 history snapshots to prevent memory bloat
      if (nextHistory.length > 60) {
        nextHistory.shift();
      }

      historyRef.current = nextHistory;
      indexRef.current = nextHistory.length - 1;
      updateFlags();
    },
    [updateFlags]
  );

  const undo = useCallback((): HistoryState | null => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      updateFlags();
      const target = historyRef.current[indexRef.current];
      return {
        data: cloneData(target.data),
        settings: { ...target.settings },
        rawText: target.rawText,
        tabs: target.tabs ? target.tabs.map(t => ({ ...t })) : undefined,
        activeTabId: target.activeTabId,
        notes: cloneNotes(target.notes),
      };
    }
    return null;
  }, [updateFlags]);

  const redo = useCallback((): HistoryState | null => {
    if (indexRef.current >= 0 && indexRef.current < historyRef.current.length - 1) {
      indexRef.current += 1;
      updateFlags();
      const target = historyRef.current[indexRef.current];
      return {
        data: cloneData(target.data),
        settings: { ...target.settings },
        rawText: target.rawText,
        tabs: target.tabs ? target.tabs.map(t => ({ ...t })) : undefined,
        activeTabId: target.activeTabId,
        notes: cloneNotes(target.notes),
      };
    }
    return null;
  }, [updateFlags]);

  return {
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    initHistory,
    currentState: historyRef.current[indexRef.current] || null,
  };
}
