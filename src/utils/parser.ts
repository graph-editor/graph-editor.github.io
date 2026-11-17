import { GraphData, GraphNode, GraphEdge, GraphSettings } from '../types/graph';

// Standard colors
export const DEFAULT_NODE_COLOR = '#3b82f6'; // Bright blue
export const DEFAULT_EDGE_COLOR = '#64748b'; // Slate

// Predefined palette for CP users
export const CP_PALETTE = [
  { name: 'Blue (Default)', color: '#3b82f6' },
  { name: 'Emerald (Visited/MST)', color: '#10b981' },
  { name: 'Crimson (Cut/Critical)', color: '#ef4444' },
  { name: 'Amber (Frontier/Active)', color: '#f59e0b' },
  { name: 'Violet (Component 1)', color: '#8b5cf6' },
  { name: 'Cyan (Component 2)', color: '#06b6d4' },
  { name: 'Fuchsia (Component 3)', color: '#d946ef' },
  { name: 'Rose (Odd Cycle)', color: '#f43f5e' },
  { name: 'Dark Slate (Muted)', color: '#475569' },
  { name: 'Pure White', color: '#f8fafc' },
];

export const CODEFORCES_TIER_COLORS = [
  { name: 'Newbie (Gray)', color: '#cccccc' },
  { name: 'Pupil (Green)', color: '#77ff77' },
  { name: 'Specialist (Cyan)', color: '#77ddbb' },
  { name: 'Expert (Blue)', color: '#aaaaec' },
  { name: 'Candidate Master (Violet)', color: '#ff88ff' },
  { name: 'Master (Orange)', color: '#ffcc88' },
  { name: 'Grandmaster (Red)', color: '#ff7777' },
  { name: 'Legendary GM (Maroon)', color: '#aa0000' },
];

export interface ParseResult {
  data: GraphData;
  settings: Partial<GraphSettings>;
  error?: string;
  detected0Indexed?: boolean;
  detectedHeader?: { n: number; m: number; strippedEdgesText: string };
}

/**
 * Parses raw Competitive Programming input text into GraphData
 */
export function parseGraphInput(
  rawText: string,
  currentSettings: GraphSettings,
  existingNodes?: Map<string, GraphNode>
): ParseResult {
  const cleanLines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

  if (cleanLines.length === 0) {
    return {
      data: { nodes: [], edges: [] },
      settings: currentSettings,
    };
  }

  // Check if first line might be `t` (number of testcases).
  // If line 1 is "1", skip or ignore it if line 2 has "n m"
  let lines = cleanLines;
  if (lines.length > 1 && /^\d+$/.test(lines[0]) && lines[1].split(/\s+/).length >= 2) {
    // Might be single number of testcases T = 1
    const t = parseInt(lines[0], 10);
    if (t === 1) {
      lines = lines.slice(1);
    }
  }

  // Check for Adjacency List format (e.g., "1: 2 3" or "1 -> 2, 3")
  const isAdjList = lines.some(l => l.includes(':') || l.includes('->'));
  if (isAdjList) {
    return parseAdjacencyList(lines, currentSettings, existingNodes);
  }

  // Check if it's an Adjacency Matrix
  // Typically N lines with N numbers each
  const firstRowNumbers = lines[0].split(/\s+/).map(Number);
  if (
    lines.length > 1 &&
    firstRowNumbers.length === lines.length &&
    lines.every(l => l.split(/\s+/).length === lines.length)
  ) {
    return parseAdjacencyMatrix(lines, currentSettings, existingNodes);
  }

  // Edge list parsing
  return parseEdgeList(lines, currentSettings, existingNodes);
}

function parseEdgeList(
  lines: string[],
  settings: GraphSettings,
  existingNodes?: Map<string, GraphNode>
): ParseResult {
  let hasHeader = false;
  let declaredN: number | null = null;
  let declaredM: number | null = null;
  let edgeStartIndex = 0;

  const firstTokens = lines[0].split(/\s+/);
  // Check if first line is explicitly a CP header `N M`
  // We only treat line 0 as a header if:
  // 1. lines.length > 1
  // 2. Exactly 2 integers in line 0: n >= 1, m >= 0
  // 3. Exactly m following lines: lines.length - 1 === m
  // 4. All vertex numbers in subsequent lines are within 1..n (or 0..n-1)
  // 5. At least one subsequent vertex is > 1 (preventing single-node edge chains from being misidentified)
  if (lines.length > 1 && firstTokens.length === 2) {
    const n = parseInt(firstTokens[0], 10);
    const m = parseInt(firstTokens[1], 10);
    if (!isNaN(n) && !isNaN(m) && n >= 2 && m > 0 && lines.length - 1 === m) {
      let allValid = true;
      let hasVertexAboveOne = false;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/);
        if (parts.length >= 2) {
          const u = parseInt(parts[0], 10);
          const v = parseInt(parts[1], 10);
          if (!isNaN(u) && !isNaN(v)) {
            if (u > n || v > n) {
              allValid = false;
              break;
            }
            if (u > 1 || v > 1) {
              hasVertexAboveOne = true;
            }
          }
        }
      }
      if (allValid && hasVertexAboveOne) {
        hasHeader = true;
        declaredN = n;
        declaredM = m;
        edgeStartIndex = 1;
      }
    }
  }

  // If first line has 1 token and second line has tokens (parent array format)
  if (!hasHeader && lines.length === 2 && firstTokens.length === 1 && lines[1].split(/\s+/).length > 1) {
    return parseParentArray(lines, settings, existingNodes);
  }

  const rawEdges: { u: string; v: string; w?: number }[] = [];
  const nodeIds = new Set<string>();
  let hasWeights = false;
  let foundZero = false;

  for (let i = edgeStartIndex; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length >= 2) {
      const uStr = parts[0];
      const vStr = parts[1];
      let weight: number | undefined = undefined;

      if (parts.length >= 3 && !isNaN(Number(parts[2]))) {
        weight = parseFloat(parts[2]);
        hasWeights = true;
      }

      if (uStr === '0' || vStr === '0') {
        foundZero = true;
      }

      nodeIds.add(uStr);
      nodeIds.add(vStr);
      rawEdges.push({ u: uStr, v: vStr, w: weight });
    }
  }

  // If declaredN was given or settings.nodeCountPreserved is set, ensure nodes exist
  const effectiveN = declaredN ?? settings.nodeCountPreserved;
  const isZeroIndexed = foundZero || settings.isZeroIndexed;
  if (effectiveN !== undefined && effectiveN !== null && effectiveN > 0) {
    const start = isZeroIndexed ? 0 : 1;
    const end = isZeroIndexed ? effectiveN - 1 : effectiveN;
    for (let k = start; k <= end; k++) {
      nodeIds.add(String(k));
    }
  }

  // Convert node IDs to sorted array for clean numbering
  const sortedNodeIds = Array.from(nodeIds).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  // Calculate layout / positions
  const nodes: GraphNode[] = sortedNodeIds.map((id, idx) => {
    const existing = existingNodes?.get(id);
    const num = Number(id);
    const index = !isNaN(num) ? num : idx + (isZeroIndexed ? 0 : 1);

    if (existing) {
      return {
        ...existing,
        id,
        label: id,
        index,
      };
    }

    // Default positions spread on a circle
    const count = sortedNodeIds.length;
    const angle = (idx / Math.max(1, count)) * 2 * Math.PI;
    const radius = Math.min(280, 50 + count * 15);
    const cx = 400;
    const cy = 300;

    return {
      id,
      label: id,
      index,
      x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
      color: DEFAULT_NODE_COLOR,
    };
  });

  // Group edges to detect parallel edges
  const edgePairCount = new Map<string, number>();
  const edgePairIndices = new Map<string, number>();

  rawEdges.forEach(e => {
    const key = settings.isDirected
      ? `${e.u}->${e.v}`
      : `${Math.min(Number(e.u), Number(e.v))}-${Math.max(Number(e.u), Number(e.v))}`;
    edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1);
  });

  const edges: GraphEdge[] = rawEdges.map((e, index) => {
    const key = settings.isDirected
      ? `${e.u}->${e.v}`
      : `${Math.min(Number(e.u), Number(e.v))}-${Math.max(Number(e.u), Number(e.v))}`;
    const total = edgePairCount.get(key) || 1;
    const currentIdx = edgePairIndices.get(key) || 0;
    edgePairIndices.set(key, currentIdx + 1);

    return {
      id: `e-${e.u}-${e.v}-${index}`,
      source: e.u,
      target: e.v,
      weight: e.w,
      color: DEFAULT_EDGE_COLOR,
      directed: settings.isDirected,
      parallelIndex: currentIdx,
      parallelTotal: total,
    };
  });

  return {
    data: { nodes, edges },
    settings: {
      ...settings,
      isWeighted: hasWeights || settings.isWeighted,
      isZeroIndexed,
      nodeCountPreserved: effectiveN ?? undefined,
    },
    detected0Indexed: foundZero,
    detectedHeader: hasHeader && declaredN !== null && declaredM !== null
      ? { n: declaredN, m: declaredM, strippedEdgesText: lines.slice(1).join('\n') }
      : undefined,
  };
}

function parseParentArray(
  lines: string[],
  settings: GraphSettings,
  existingNodes?: Map<string, GraphNode>
): ParseResult {
  const n = parseInt(lines[0].trim(), 10);
  const parents = lines[1].trim().split(/\s+/).map(Number);
  const isZeroIndexed = parents.some(p => p === 0) || settings.isZeroIndexed;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const start = isZeroIndexed ? 0 : 1;
  const end = isZeroIndexed ? n - 1 : n;

  for (let i = start; i <= end; i++) {
    const id = String(i);
    const existing = existingNodes?.get(id);
    nodes.push(
      existing || {
        id,
        label: id,
        index: i,
        x: 400 + Math.cos((i / n) * 2 * Math.PI) * 200,
        y: 300 + Math.sin((i / n) * 2 * Math.PI) * 200,
        color: DEFAULT_NODE_COLOR,
      }
    );
  }

  // Parents are given for node 2..n (or 1..n-1 in 0-indexed)
  parents.forEach((p, idx) => {
    const childId = String(start + 1 + idx);
    const parentId = String(p);
    edges.push({
      id: `e-${parentId}-${childId}`,
      source: parentId,
      target: childId,
      color: DEFAULT_EDGE_COLOR,
      directed: settings.isDirected,
    });
  });

  return {
    data: { nodes, edges },
    settings: {
      ...settings,
      isZeroIndexed,
      nodeCountPreserved: n,
    },
    detected0Indexed: isZeroIndexed,
  };
}

function parseAdjacencyMatrix(
  lines: string[],
  settings: GraphSettings,
  existingNodes?: Map<string, GraphNode>
): ParseResult {
  const n = lines.length;
  const isZeroIndexed = settings.isZeroIndexed;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let hasWeights = false;

  for (let i = 0; i < n; i++) {
    const id = String(isZeroIndexed ? i : i + 1);
    const existing = existingNodes?.get(id);
    nodes.push(
      existing || {
        id,
        label: id,
        index: isZeroIndexed ? i : i + 1,
        x: 400 + Math.cos((i / n) * 2 * Math.PI) * 200,
        y: 300 + Math.sin((i / n) * 2 * Math.PI) * 200,
        color: DEFAULT_NODE_COLOR,
      }
    );
  }

  for (let i = 0; i < n; i++) {
    const row = lines[i].split(/\s+/).map(Number);
    for (let j = 0; j < n; j++) {
      const val = row[j];
      if (val !== 0) {
        if (val !== 1) hasWeights = true;
        const u = String(isZeroIndexed ? i : i + 1);
        const v = String(isZeroIndexed ? j : j + 1);

        // If undirected, avoid duplicate reverse edges if matrix is symmetric
        if (!settings.isDirected && j < i && row[i] === val) {
          continue;
        }

        edges.push({
          id: `e-${u}-${v}-${i}-${j}`,
          source: u,
          target: v,
          weight: val !== 1 ? val : undefined,
          color: DEFAULT_EDGE_COLOR,
          directed: settings.isDirected,
        });
      }
    }
  }

  return {
    data: { nodes, edges },
    settings: {
      ...settings,
      isWeighted: hasWeights || settings.isWeighted,
      nodeCountPreserved: n,
    },
  };
}

function parseAdjacencyList(
  lines: string[],
  settings: GraphSettings,
  existingNodes?: Map<string, GraphNode>
): ParseResult {
  const rawEdges: { u: string; v: string; w?: number }[] = [];
  const nodeIds = new Set<string>();

  for (const line of lines) {
    const parts = line.split(/:|->/).map(s => s.trim());
    if (parts.length >= 2) {
      const u = parts[0];
      nodeIds.add(u);
      const targets = parts[1].split(/[,\s]+/).filter(Boolean);
      for (const t of targets) {
        nodeIds.add(t);
        rawEdges.push({ u, v: t });
      }
    }
  }

  const sortedNodeIds = Array.from(nodeIds);
  const nodes = sortedNodeIds.map((id, idx) => {
    const existing = existingNodes?.get(id);
    return (
      existing || {
        id,
        label: id,
        index: idx + (settings.isZeroIndexed ? 0 : 1),
        x: 400 + Math.cos((idx / sortedNodeIds.length) * 2 * Math.PI) * 200,
        y: 300 + Math.sin((idx / sortedNodeIds.length) * 2 * Math.PI) * 200,
        color: DEFAULT_NODE_COLOR,
      }
    );
  });

  const edges: GraphEdge[] = rawEdges.map((e, idx) => ({
    id: `e-${e.u}-${e.v}-${idx}`,
    source: e.u,
    target: e.v,
    color: DEFAULT_EDGE_COLOR,
    directed: settings.isDirected,
  }));

  return {
    data: { nodes, edges },
    settings,
  };
}

/**
 * Serializes GraphData back to standard CP input format
 * By default, outputs pure edges without N M header so users only edit edges between nodes
 */
export function serializeGraphToCPInput(data: GraphData, settings: GraphSettings, includeHeader = false): string {
  let out = '';
  if (includeHeader) {
    const n = settings.nodeCountPreserved ? Math.max(settings.nodeCountPreserved, data.nodes.length) : data.nodes.length;
    const m = data.edges.length;
    out += `${n} ${m}\n`;
  }
  for (const edge of data.edges) {
    if (settings.isWeighted && edge.weight !== undefined) {
      out += `${edge.source} ${edge.target} ${edge.weight}\n`;
    } else {
      out += `${edge.source} ${edge.target}\n`;
    }
  }
  return out.trim();
}

/**
 * Shifts graph indexing between 0-based and 1-based
 */
export function toggleGraphIndexing(data: GraphData, toZeroIndexed: boolean): GraphData {
  const idMap = new Map<string, string>();

  const newNodes = data.nodes.map(node => {
    const num = Number(node.id);
    let newId = node.id;
    let newIndex = node.index;

    if (!isNaN(num)) {
      if (toZeroIndexed && num > 0) {
        newId = String(num - 1);
        newIndex = num - 1;
      } else if (!toZeroIndexed && num >= 0) {
        newId = String(num + 1);
        newIndex = num + 1;
      }
    }
    idMap.set(node.id, newId);

    return {
      ...node,
      id: newId,
      label: newId,
      index: newIndex,
    };
  });

  const newEdges = data.edges.map(edge => ({
    ...edge,
    id: `e-${idMap.get(edge.source) || edge.source}-${idMap.get(edge.target) || edge.target}-${Math.random().toString(36).substring(2, 7)}`,
    source: idMap.get(edge.source) || edge.source,
    target: idMap.get(edge.target) || edge.target,
  }));

  return { nodes: newNodes, edges: newEdges };
}
