import { GraphData, GraphSettings, GraphTab, GraphNote } from '../types/graph';

export const STORAGE_KEY = 'cp_graph_saved_state_v1';

export interface SavedGraphState {
  tabs: GraphTab[];
  activeTabId: string;
  rawText: string;
  data: GraphData;
  settings: GraphSettings;
  notes?: GraphNote[];
  timestamp: number;
}

const DEFAULT_SETTINGS: GraphSettings = {
  isDirected: false,
  isWeighted: false,
  isZeroIndexed: false,
  layout: 'force',
  hasHeader: false,
};

/**
 * Load the persisted graph state from localStorage.
 * Returns null if not found or corrupted.
 */
export function loadSavedState(): SavedGraphState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Validate tabs
    let tabs: GraphTab[] = [];
    if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
      tabs = parsed.tabs.map((t: any, idx: number) => ({
        id: typeof t.id === 'string' && t.id ? t.id : `g${idx + 1}`,
        name: typeof t.name === 'string' && t.name ? t.name : `Graph ${idx + 1}`,
        text: typeof t.text === 'string' ? t.text : '',
      }));
    } else {
      return null;
    }

    // Validate activeTabId
    let activeTabId = typeof parsed.activeTabId === 'string' ? parsed.activeTabId : tabs[0].id;
    if (!tabs.some(t => t.id === activeTabId)) {
      activeTabId = tabs[0].id;
    }

    // Validate rawText
    const activeTab = tabs.find(t => t.id === activeTabId);
    const rawText = typeof parsed.rawText === 'string' ? parsed.rawText : (activeTab?.text ?? '');

    // Validate GraphData
    if (!parsed.data || typeof parsed.data !== 'object') return null;
    const nodes = Array.isArray(parsed.data.nodes)
      ? parsed.data.nodes.map((n: any) => ({
          ...n,
          x: typeof n.x === 'number' && Number.isFinite(n.x) ? n.x : 400,
          y: typeof n.y === 'number' && Number.isFinite(n.y) ? n.y : 300,
        }))
      : [];
    const edges = Array.isArray(parsed.data.edges) ? parsed.data.edges : [];
    const data: GraphData = { nodes, edges };

    // Validate settings
    const settings: GraphSettings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
    };

    // Validate notes
    const notes: GraphNote[] = Array.isArray(parsed.notes)
      ? parsed.notes
          .filter((nt: any) => nt && typeof nt === 'object' && typeof nt.id === 'string')
          .map((nt: any) => ({
            id: nt.id,
            x: typeof nt.x === 'number' && Number.isFinite(nt.x) ? nt.x : 300,
            y: typeof nt.y === 'number' && Number.isFinite(nt.y) ? nt.y : 200,
            width: typeof nt.width === 'number' && Number.isFinite(nt.width) ? nt.width : undefined,
            height: typeof nt.height === 'number' && Number.isFinite(nt.height) ? nt.height : undefined,
            title: typeof nt.title === 'string' ? nt.title : undefined,
            text: typeof nt.text === 'string' ? nt.text : '',
            color: typeof nt.color === 'string' ? nt.color : 'amber',
            graphIndex: typeof nt.graphIndex === 'number' ? nt.graphIndex : undefined,
          }))
      : [];

    return {
      tabs,
      activeTabId,
      rawText,
      data,
      settings,
      notes,
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
    };
  } catch (err) {
    console.warn('[Storage] Failed to parse saved graph state:', err);
    return null;
  }
}

/**
 * Save current graph state to localStorage safely.
 */
export function saveStateToStorage(state: {
  tabs: GraphTab[];
  activeTabId: string;
  rawText: string;
  data: GraphData;
  settings: GraphSettings;
  notes?: GraphNote[];
}): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: SavedGraphState = {
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Storage] Failed to save graph state to localStorage:', err);
  }
}

/**
 * Clear persisted graph state from localStorage.
 */
export function clearSavedState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Storage] Failed to clear graph state from localStorage:', err);
  }
}
