import { useRef, useState, useCallback } from 'react';
import { GraphData, GraphSettings } from '../types/graph';

export interface HistoryState {
  data: GraphData;
  settings: GraphSettings;
  rawText: string;
}

function cloneData(data: GraphData): GraphData {
  return {
    nodes: data.nodes.map(n => ({ ...n })),
    edges: data.edges.map(e => ({ ...e })),
  };
}

function isStateEqual(a: HistoryState, b: HistoryState): boolean {
  if (a.rawText !== b.rawText) return false;
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
      na.color !== nb.color
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
      ea.style !== eb.style
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
      if (current && isStateEqual(current, state)) {
        return;
      }

      const nextEntry: HistoryState = {
        data: cloneData(state.data),
        settings: { ...state.settings },
        rawText: state.rawText,
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
