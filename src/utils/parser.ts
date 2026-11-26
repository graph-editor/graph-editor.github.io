import { GraphData, GraphNode, GraphEdge, GraphSettings, NodeType, GraphTab } from '../types/graph';
import { parseLeetCode2DArray, parseParentArrayFormat, parseParentChildArrays } from './contestParser';

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

export interface ParseResult {
  data: GraphData;
  settings: Partial<GraphSettings>;
  error?: string;
  detected0Indexed?: boolean;
  detectedHeader?: { n: number; m: number; strippedEdgesText: string };
}

/**
 * Detects whether a node identifier represents an integer, char, boolean, or string.
 */
export function detectNodeType(val: string): NodeType {
  const trimmed = val.trim();
  // 1. Integer check: optional leading minus, followed by digits
  if (/^-?\d+$/.test(trimmed)) {
    return 'int';
  }
  // 2. Boolean check: true or false (case-insensitive)
  if (/^(true|false)$/i.test(trimmed)) {
    return 'bool';
  }
  // 3. Char check: 1 character or single character enclosed in quotes
  if (
    trimmed.length === 1 ||
    (trimmed.length === 3 && (trimmed.startsWith("'") && trimmed.endsWith("'") || trimmed.startsWith('"') && trimmed.endsWith('"')))
  ) {
    return 'char';
  }
  // 4. Default: string
  return 'string';
}

/**
 * Detects whether lines represent a square Adjacency Matrix (N x N numbers).
 * In Competitive Programming:
 * - 2 numbers per line is an unweighted edge (u v).
 * - 3 numbers per line is a weighted edge (u v w).
 * A 2-line or 3-line input is almost always an Edge List, NOT an Adjacency Matrix,
 * UNLESS it strictly has 0 on all diagonal entries AND is either binary (0/1) or symmetric.
 * For N >= 4, an N x N grid of numbers is safely an Adjacency Matrix.
 */
export function isAdjacencyMatrix(lines: string[]): boolean {
  if (lines.length < 2) return false;
  const n = lines.length;

  const rows: number[][] = [];
  for (const line of lines) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length !== n) return false;
    const nums = tokens.map(Number);
    if (nums.some(x => isNaN(x))) return false;
    rows.push(nums);
  }

  // If N >= 4: Edge lists never have 4+ numbers per line, so N >= 4 square is an Adjacency Matrix.
  if (n >= 4) {
    return true;
  }

  // For N = 2 or N = 3:
  // Edge lists routinely have 2 numbers (u v) or 3 numbers (u v w).
  // A 2x2 or 3x3 square is ONLY an Adjacency Matrix if:
  // 1. The main diagonal is all 0s (matrix[i][i] === 0 for all i)
  // 2. AND either all values are in {0, 1} OR the matrix is symmetric (matrix[i][j] === matrix[j][i])
  const allDiagonalZero = rows.every((r, i) => r[i] === 0);
  if (!allDiagonalZero) {
    return false;
  }

  const allBinary = rows.every(r => r.every(x => x === 0 || x === 1));
  const isSymmetric = rows.every((r, i) => rows.every((_, j) => rows[i][j] === rows[j][i]));

  return allBinary || isSymmetric;
}

/**
 * Splits a line into string tokens separated by whitespace.
 * Double/single quotes only act as wrappers when surrounding an entire token
 * (e.g. `"node 1" false` or `'A' 'B' 5`), while primes/apostrophes inside or
 * at the end of identifiers (e.g. `1'`, `2'`, `x'`, `Alice's`) are preserved verbatim.
 */
export function splitLineTokens(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    while (i < len && /\s/.test(line[i])) i++;
    if (i >= len) break;

    const ch = line[i];
    if (ch === '"' || ch === "'") {
      let closeIdx = i + 1;
      let foundClosing = false;
      while (closeIdx < len) {
        if (line[closeIdx] === ch && (closeIdx + 1 === len || /\s/.test(line[closeIdx + 1]))) {
          foundClosing = true;
          break;
        }
        closeIdx++;
      }
      if (foundClosing) {
        const inner = line.slice(i + 1, closeIdx);
        if (inner.length > 0) {
          tokens.push(inner);
        }
        i = closeIdx + 1;
        continue;
      }
    }

    const start = i;
    while (i < len && !/\s/.test(line[i])) i++;
    tokens.push(line.slice(start, i));
  }

  return tokens;
}

/**
 * Parses raw input text into GraphData.
 * Supports:
 * - Single node (e.g. `A`, `1`, `true`, `hello`)
 * - Mixed node types in the same graph (Char, String, Bool, Int)
 * - Isolated nodes alongside edges
 * - Edge list (u v [w])
 * - Adjacency list (u: v1 v2)
 * - Adjacency matrix
 * - Standard CP header (N M)
 */
export function parseGraphInput(
  rawText: string,
  currentSettings: GraphSettings,
  existingNodes?: Map<string, GraphNode>
): ParseResult {
  // 1. LeetCode 2D array representation: e.g. `[[0,1],[1,2],[2,0]]` or `edges = [[0,1,5],[1,2,10]]`
  const leetcode = parseLeetCode2DArray(rawText);
  if (leetcode) {
    const lines = leetcode.edgesText.split('\n');
    const parsed = parseEdgeList(lines, {
      ...currentSettings,
      isWeighted: leetcode.isWeighted || currentSettings.isWeighted,
    }, existingNodes);
    return {
      ...parsed,
      settings: {
        ...parsed.settings,
        isWeighted: leetcode.isWeighted || parsed.settings.isWeighted,
      },
    };
  }

  // 2. 1D Parent Array format: e.g. `parent = [-1, 0, 0, 1, 1, 2]` or `[-1, 0, 0, 1, 1, 2]`
  const parentArr = parseParentArrayFormat(rawText);
  if (parentArr) {
    const lines = parentArr.edgesText.split('\n');
    return parseEdgeList(lines, {
      ...currentSettings,
      isZeroIndexed: parentArr.isZeroIndexed || currentSettings.isZeroIndexed,
      nodeCountPreserved: parentArr.nodeCount,
      treeRootId: parentArr.root ?? currentSettings.treeRootId,
    }, existingNodes);
  }

  // 3. Two-line Parent & Child format: parent = [1, 1, 2]\nchild = [2, 3, 4]
  const parentChild = parseParentChildArrays(rawText);
  if (parentChild) {
    const lines = parentChild.edgesText.split('\n');
    return parseEdgeList(lines, currentSettings, existingNodes);
  }

  const cleanLines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

  if (cleanLines.length === 0) {
    if (currentSettings.nodeCountPreserved && currentSettings.nodeCountPreserved > 0) {
      return parseEdgeList([], currentSettings, existingNodes);
    }
    return {
      data: { nodes: [], edges: [] },
      settings: {
        ...currentSettings,
        nodeCountPreserved: undefined,
      },
    };
  }

  let lines = cleanLines;

  // Check if first line might be `t` (number of testcases T = 1).
  // Only slice line 0 if line 1 explicitly starts a CP header `N M` matching following lines count AND hasHeader is enabled
  if (currentSettings.hasHeader && lines.length > 2 && lines[0] === '1') {
    const headerTokens = splitLineTokens(lines[1]);
    if (headerTokens.length === 2 && /^\d+$/.test(headerTokens[0]) && /^\d+$/.test(headerTokens[1])) {
      const n = parseInt(headerTokens[0], 10);
      const m = parseInt(headerTokens[1], 10);
      if (lines.length - 2 === m) {
        lines = lines.slice(1);
      }
    }
  }

  // Check for Adjacency List format (e.g., "1: 2 3" or "1 -> 2, 3")
  const isAdjList = lines.some(l => l.includes(':') || l.includes('->'));
  if (isAdjList) {
    return parseAdjacencyList(lines, currentSettings, existingNodes);
  }

  // Check if it's an Adjacency Matrix
  if (isAdjacencyMatrix(lines)) {
    return parseAdjacencyMatrix(lines, currentSettings, existingNodes);
  }

  // Edge list parsing
  return parseEdgeList(lines, currentSettings, existingNodes);
}

function parseEdgeWeightTokens(parts: string[]): number | string | undefined {
  if (parts.length < 3) return undefined;
  const rawW = parts.length === 3 ? parts[2] : parts.slice(2).join(' ');
  const trimmed = rawW.trim();
  if (trimmed === '') return undefined;
  const numW = Number(trimmed);
  return !isNaN(numW) ? numW : rawW;
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

  const firstTokens = lines.length > 0 ? splitLineTokens(lines[0]) : [];

  // Only parse first line as N M header if explicitly enabled by settings.hasHeader === true.
  // In CP, users routinely paste ONLY edges (e.g. 1 2, 4 5, 10 20) without an N M header.
  if (
    settings.hasHeader &&
    lines.length > 1 &&
    firstTokens.length === 2 &&
    /^\d+$/.test(firstTokens[0]) &&
    /^\d+$/.test(firstTokens[1])
  ) {
    const n = parseInt(firstTokens[0], 10);
    const m = parseInt(firstTokens[1], 10);
    if (n >= 1 && m >= 0) {
      hasHeader = true;
      declaredN = n;
      declaredM = m;
      edgeStartIndex = 1;
    }
  }

  // Parent array check: strictly when line 0 is N (integer >= 2) and line 1 has exactly N-1 integer parents
  if (!hasHeader && lines.length === 2 && firstTokens.length === 1 && /^\d+$/.test(firstTokens[0])) {
    const n = parseInt(firstTokens[0], 10);
    const secondTokens = splitLineTokens(lines[1]);
    if (n >= 2 && secondTokens.length === n - 1 && secondTokens.every(t => /^-?\d+$/.test(t))) {
      return parseParentArray(lines, settings, existingNodes);
    }
  }

  const rawEdges: { u: string; v: string; w?: number | string }[] = [];
  const nodeIds = new Set<string>();
  const nodeWeights = new Map<string, string | number>();
  let hasWeights = false;
  let foundZero = false;

  for (let i = edgeStartIndex; i < lines.length; i++) {
    const line = lines[i];

    // Check if line defines a weighted node:
    // Format 1: `node [weight]` e.g. "A [10]", "1 ['X']", "node ["val"]"
    // Format 2: `node: weight` or `node = weight` e.g. "A: 10", "1: 'heavy'", "node = 42"
    const bracketMatch = line.match(/^([^\s[\]]+)\s*\[([^\]]+)\]$/);
    const assignMatch = line.match(/^([^\s:=[\]]+)\s*[:=]\s*(.+)$/);

    if (bracketMatch || assignMatch) {
      const uStr = (bracketMatch ? bracketMatch[1] : assignMatch![1]).trim();
      let rawW = (bracketMatch ? bracketMatch[2] : assignMatch![2]).trim();
      if ((rawW.startsWith("'") && rawW.endsWith("'")) || (rawW.startsWith('"') && rawW.endsWith('"'))) {
        rawW = rawW.slice(1, -1);
      }
      const numW = Number(rawW);
      const wVal = !isNaN(numW) && rawW !== '' ? numW : rawW;
      if (uStr.length > 0) {
        nodeIds.add(uStr);
        nodeWeights.set(uStr, wVal);
        if (uStr === '0') {
          foundZero = true;
        }
        continue;
      }
    }

    const parts = splitLineTokens(line);
    if (parts.length === 1) {
      // Single isolated node! E.g. 'A', 'true', '42', 'Alice'
      const uStr = parts[0];
      if (uStr.length > 0) {
        nodeIds.add(uStr);
        if (uStr === '0') {
          foundZero = true;
        }
      }
    } else if (parts.length >= 2) {
      const uStr = parts[0];
      const vStr = parts[1];
      const weight = parseEdgeWeightTokens(parts);
      if (weight !== undefined) {
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

  // If declaredN was given (explicit N M header), ensure vertices 1..N (or 0..N-1) exist.
  // If settings.nodeCountPreserved was set (e.g. Nodes (N) field), only fill missing count up to N
  // without injecting unexpected 0 or 1 nodes when the graph already has custom/higher-numbered nodes.
  const effectiveN = declaredN ?? settings.nodeCountPreserved;
  const isZeroIndexed = foundZero || settings.isZeroIndexed;
  if (effectiveN !== undefined && effectiveN !== null && effectiveN > 0) {
    if (declaredN !== null) {
      const start = isZeroIndexed ? 0 : 1;
      const end = isZeroIndexed ? effectiveN - 1 : effectiveN;
      for (let k = start; k <= end; k++) {
        nodeIds.add(String(k));
      }
    } else if (nodeIds.size < effectiveN) {
      const existingNums = Array.from(nodeIds)
        .filter(id => /^-?\d+$/.test(id))
        .map(Number)
        .filter(n => !isNaN(n));
      let nextNum =
        nodeIds.size === 0
          ? (isZeroIndexed ? 0 : 1)
          : existingNums.length > 0
          ? Math.max(...existingNums) + 1
          : (isZeroIndexed ? nodeIds.size : nodeIds.size + 1);
      while (nodeIds.size < effectiveN) {
        while (nodeIds.has(String(nextNum))) {
          nextNum++;
        }
        nodeIds.add(String(nextNum));
        nextNum++;
      }
    }
  }

  // Sort node IDs cleanly: integers numerically first, then non-integers alphabetically
  const sortedNodeIds = Array.from(nodeIds).sort((a, b) => {
    const aIsNum = /^-?\d+$/.test(a);
    const bIsNum = /^-?\d+$/.test(b);
    if (aIsNum && bIsNum) return Number(a) - Number(b);
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    return a.localeCompare(b);
  });

  const count = sortedNodeIds.length;
  const nodes: GraphNode[] = sortedNodeIds.map((id, idx) => {
    const existing = existingNodes?.get(id);
    const num = Number(id);
    const isNum = !isNaN(num) && /^-?\d+$/.test(id);
    const index = isNum ? num : idx + (isZeroIndexed ? 0 : 1);

    const explicitWeight = nodeWeights.get(id);
    const weight = explicitWeight !== undefined ? explicitWeight : undefined;

    if (existing) {
      return {
        ...existing,
        id,
        label: existing.label || id,
        nodeType: detectNodeType(id),
        index,
        weight,
        value: weight,
      };
    }

    const angle = (idx / Math.max(1, count)) * 2 * Math.PI;
    const radius = count === 1 ? 0 : Math.min(280, 50 + count * 15);
    const cx = 400;
    const cy = 300;

    return {
      id,
      label: id,
      nodeType: detectNodeType(id),
      index,
      x: count === 1 ? cx : cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: count === 1 ? cy : cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
      color: DEFAULT_NODE_COLOR,
      weight,
      value: weight,
    };
  });

  // Group edges to detect parallel edges
  const edgePairCount = new Map<string, number>();
  const edgePairIndices = new Map<string, number>();

  rawEdges.forEach(e => {
    const hasOpposite = rawEdges.some(oe => oe.u === e.v && oe.v === e.u);
    const isDir = Boolean(settings.isDirected || hasOpposite);
    const key = isDir
      ? `${e.u}->${e.v}`
      : `${e.u < e.v ? e.u : e.v}-${e.u < e.v ? e.v : e.u}`;
    edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1);
  });

  const edges: GraphEdge[] = rawEdges.map((e, index) => {
    const hasOpposite = rawEdges.some(oe => oe.u === e.v && oe.v === e.u);
    const isDir = Boolean(settings.isDirected || hasOpposite);
    const key = isDir
      ? `${e.u}->${e.v}`
      : `${e.u < e.v ? e.u : e.v}-${e.u < e.v ? e.v : e.u}`;
    const total = edgePairCount.get(key) || 1;
    const currentIdx = edgePairIndices.get(key) || 0;
    edgePairIndices.set(key, currentIdx + 1);

    return {
      id: `e-${e.u}-${e.v}-${index}`,
      source: e.u,
      target: e.v,
      weight: e.w,
      color: DEFAULT_EDGE_COLOR,
      directed: isDir,
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
      hasHeader: settings.hasHeader ?? false,
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
  const parents = splitLineTokens(lines[1]).map(Number);
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
        nodeType: 'int',
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
      existing
        ? { ...existing, weight: undefined, value: undefined }
        : {
            id,
            label: id,
            nodeType: 'int',
            index: isZeroIndexed ? i : i + 1,
            x: 400 + Math.cos((i / n) * 2 * Math.PI) * 200,
            y: 300 + Math.sin((i / n) * 2 * Math.PI) * 200,
            color: DEFAULT_NODE_COLOR,
            weight: undefined,
            value: undefined,
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
  const rawEdges: { u: string; v: string; w?: number | string }[] = [];
  const nodeIds = new Set<string>();

  for (const line of lines) {
    if (line.includes(':') || line.includes('->')) {
      const parts = line.split(/:|->/).map(s => s.trim());
      if (parts.length >= 1 && parts[0]) {
        const u = parts[0];
        nodeIds.add(u);
        if (parts.length >= 2 && parts[1]) {
          const targets = parts[1].split(/[,\s]+/).filter(Boolean);
          for (const t of targets) {
            nodeIds.add(t);
            rawEdges.push({ u, v: t });
          }
        }
      }
    } else {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        nodeIds.add(trimmed);
      }
    }
  }

  const sortedNodeIds = Array.from(nodeIds).sort((a, b) => {
    const aIsNum = /^-?\d+$/.test(a);
    const bIsNum = /^-?\d+$/.test(b);
    if (aIsNum && bIsNum) return Number(a) - Number(b);
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    return a.localeCompare(b);
  });

  const count = sortedNodeIds.length;
  const nodes = sortedNodeIds.map((id, idx) => {
    const existing = existingNodes?.get(id);
    const num = Number(id);
    const isNum = !isNaN(num) && /^-?\d+$/.test(id);
    const index = isNum ? num : idx + (settings.isZeroIndexed ? 0 : 1);
    const angle = (idx / Math.max(1, count)) * 2 * Math.PI;
    const radius = count === 1 ? 0 : Math.min(280, 50 + count * 15);
    const cx = 400;
    const cy = 300;

    return (
      existing || {
        id,
        label: id,
        nodeType: detectNodeType(id),
        index,
        x: count === 1 ? cx : cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: count === 1 ? cy : cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
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
 * Serializes GraphData back to standard input format.
 * Preserves isolated / single nodes by emitting them on separate lines.
 * Supports filtering by graphIndex for multi-graph / testcase tabs.
 */
export function serializeGraphToCPInput(
  data: GraphData,
  settings: GraphSettings,
  includeHeader = false,
  targetGraphIndex?: number
): string {
  const nodeMap = new Map<string, GraphNode>();
  data.nodes.forEach(n => nodeMap.set(n.id, n));

  const cleanNodeLabel = (id: string): string => {
    const node = nodeMap.get(id);
    const raw = node?.label || (id.includes(':') ? id.slice(id.indexOf(':') + 1) : id);
    return /\s/.test(raw) ? JSON.stringify(raw) : raw;
  };

  const relevantEdges = targetGraphIndex !== undefined
    ? data.edges.filter(e => (e.graphIndex ?? 0) === targetGraphIndex)
    : data.edges;

  const relevantNodes = targetGraphIndex !== undefined
    ? data.nodes.filter(n => (n.graphIndex ?? 0) === targetGraphIndex)
    : data.nodes;

  let out = '';
  if (includeHeader) {
    const n = settings.nodeCountPreserved ? Math.max(settings.nodeCountPreserved, relevantNodes.length) : relevantNodes.length;
    const m = relevantEdges.length;
    out += `${n} ${m}\n`;
  }

  const connectedNodes = new Set<string>();
  for (const edge of relevantEdges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
    const src = cleanNodeLabel(edge.source);
    const tgt = cleanNodeLabel(edge.target);
    if (settings.isWeighted && edge.weight !== undefined && String(edge.weight).trim() !== '') {
      const wStr = String(edge.weight);
      const serializedW = /\s/.test(wStr) ? JSON.stringify(wStr) : wStr;
      out += `${src} ${tgt} ${serializedW}\n`;
    } else {
      out += `${src} ${tgt}\n`;
    }
  }

  // Emit any node weights for connected nodes
  const connectedWeightedNodes = relevantNodes.filter(
    n => connectedNodes.has(n.id) && n.weight !== undefined && n.weight !== null && String(n.weight).trim() !== ''
  );
  if (connectedWeightedNodes.length > 0) {
    let weightPrefix = '';
    for (const node of connectedWeightedNodes) {
      weightPrefix += `${cleanNodeLabel(node.id)} [${node.weight}]\n`;
    }
    out = weightPrefix + out;
  }

  // Any node not connected to any edge is output as a single isolated node line (with weight if present)
  for (const node of relevantNodes) {
    if (!connectedNodes.has(node.id)) {
      const lbl = cleanNodeLabel(node.id);
      if (node.weight !== undefined && node.weight !== null && String(node.weight).trim() !== '') {
        out += `${lbl} [${node.weight}]\n`;
      } else {
        out += `${lbl}\n`;
      }
    }
  }

  return out.trim();
}

/**
 * Parses multiple graph tabs and combines them into a unified GraphData object.
 * Each tab gets unique scoped IDs internally (e.g. `g1:1`, `g2:1`), while preserving clean
 * user-facing labels (`1`, `2`) on the canvas and in serialization.
 */
export function parseAndMergeTabs(
  tabs: GraphTab[],
  settings: GraphSettings,
  existingNodeMap?: Map<string, GraphNode>
): { data: GraphData; settings: Partial<GraphSettings>; error?: string } {
  if (tabs.length === 0) {
    return { data: { nodes: [], edges: [] }, settings: {} };
  }

  if (tabs.length === 1) {
    const singleResult = parseGraphInput(tabs[0].text, settings, existingNodeMap);
    return {
      ...singleResult,
      data: {
        nodes: singleResult.data.nodes.map(n => ({ ...n, graphIndex: 0 })),
        edges: singleResult.data.edges.map(e => ({ ...e, graphIndex: 0 })),
      },
    };
  }

  const allNodes: GraphNode[] = [];
  const allEdges: GraphEdge[] = [];
  let combinedSettings: Partial<GraphSettings> = {};

  tabs.forEach((tab, gIdx) => {
    // Filter existing nodes relevant to this tab
    const tabExistingNodes = new Map<string, GraphNode>();
    existingNodeMap?.forEach((node, id) => {
      if ((node.graphIndex ?? 0) === gIdx || id.startsWith(`${tab.id}:`)) {
        const rawId = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
        tabExistingNodes.set(rawId, node);
      }
    });

    const parsed = parseGraphInput(tab.text, settings, tabExistingNodes);
    combinedSettings = { ...combinedSettings, ...parsed.settings };

    // Initial offset for newly added graphs so they appear side-by-side
    const offsetX = gIdx * 450;

    parsed.data.nodes.forEach(n => {
      const scopedId = `${tab.id}:${n.id}`;
      const exist = existingNodeMap?.get(scopedId) || existingNodeMap?.get(n.id);

      const x = exist ? exist.x : (n.x + offsetX);
      const y = exist ? exist.y : n.y;

      allNodes.push({
        ...n,
        id: scopedId,
        label: n.label || n.id,
        graphIndex: gIdx,
        x,
        y,
        fx: exist?.fx,
        fy: exist?.fy,
      });
    });

    parsed.data.edges.forEach(e => {
      const scopedSource = `${tab.id}:${e.source}`;
      const scopedTarget = `${tab.id}:${e.target}`;
      const scopedEdgeId = `${tab.id}:${e.id}`;

      allEdges.push({
        ...e,
        id: scopedEdgeId,
        source: scopedSource,
        target: scopedTarget,
        graphIndex: gIdx,
      });
    });
  });

  return {
    data: { nodes: allNodes, edges: allEdges },
    settings: combinedSettings,
  };
}

/**
 * Shifts graph indexing between 0-based and 1-based.
 * Only numeric integer nodes are shifted; Char, String, Bool nodes remain untouched.
 */
export function toggleGraphIndexing(data: GraphData, toZeroIndexed: boolean): GraphData {
  const idMap = new Map<string, string>();

  const newNodes = data.nodes.map(node => {
    const isPureInt = /^-?\d+$/.test(node.id.trim());
    let newId = node.id;
    let newIndex = node.index;

    if (isPureInt) {
      const num = Number(node.id);
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
      nodeType: detectNodeType(newId),
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

/**
 * Maps selected GraphEdges from the canvas back to 0-based line indices in `rawText`
 * so the Edges List editor can highlight and scroll to the corresponding lines.
 */
export function findEdgeLineIndicesInInput(
  rawText: string,
  selectedEdgeIds: string[],
  data: GraphData,
  settings: GraphSettings,
  activeGraphIndex = 0
): number[] {
  if (!rawText || selectedEdgeIds.length === 0) return [];

  const selectedIdSet = new Set(selectedEdgeIds);
  const tabEdges = data.edges.filter(e => (e.graphIndex ?? 0) === activeGraphIndex);
  const selectedEdges = tabEdges.filter(e => selectedIdSet.has(e.id));
  if (selectedEdges.length === 0) return [];

  const nodeMap = new Map<string, GraphNode>();
  data.nodes.forEach(n => nodeMap.set(n.id, n));

  const getCleanLabel = (id: string): string => {
    const node = nodeMap.get(id);
    if (node?.label) return node.label;
    if (id.includes(':')) return id.slice(id.indexOf(':') + 1);
    return id;
  };

  const rawLines = rawText.split(/\r?\n/);
  const activeLines: { lineIdx: number; trimmed: string }[] = [];
  rawLines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
      activeLines.push({ lineIdx, trimmed });
    }
  });

  if (activeLines.length === 0) return [];

  let lines = activeLines;

  // Match parseGraphInput header-skipping rules when hasHeader is enabled
  if (settings.hasHeader && lines.length > 2 && lines[0].trimmed === '1') {
    const headerTokens = splitLineTokens(lines[1].trimmed);
    if (headerTokens.length === 2 && /^\d+$/.test(headerTokens[0]) && /^\d+$/.test(headerTokens[1])) {
      const n = parseInt(headerTokens[0], 10);
      const m = parseInt(headerTokens[1], 10);
      if (lines.length - 2 === m) {
        lines = lines.slice(1);
      }
    }
  }

  // Handle Adjacency List format (e.g. "1: 2 3" or "1 -> 2, 3")
  const isAdjList = lines.some(l => l.trimmed.includes(':') || l.trimmed.includes('->'));
  if (isAdjList) {
    const matched = new Set<number>();
    for (const edge of selectedEdges) {
      const src = getCleanLabel(edge.source);
      const tgt = getCleanLabel(edge.target);
      for (const entry of lines) {
        if (entry.trimmed.includes(':') || entry.trimmed.includes('->')) {
          const parts = entry.trimmed.split(/:|->/).map(s => s.trim());
          const u = parts[0];
          const targets = parts[1] ? parts[1].split(/[,\s]+/).filter(Boolean) : [];
          const forward = u === src && targets.includes(tgt);
          const reverse = !edge.directed && u === tgt && targets.includes(src);
          if (forward || reverse) {
            matched.add(entry.lineIdx);
          }
        }
      }
    }
    return Array.from(matched).sort((a, b) => a - b);
  }

  // Standard Edge List parsing with 0-based raw line tracking
  let startIdx = 0;
  const firstTokens = splitLineTokens(lines[0].trimmed);
  if (
    settings.hasHeader &&
    lines.length > 1 &&
    firstTokens.length === 2 &&
    /^\d+$/.test(firstTokens[0]) &&
    /^\d+$/.test(firstTokens[1])
  ) {
    const n = parseInt(firstTokens[0], 10);
    const m = parseInt(firstTokens[1], 10);
    if (n >= 1 && m >= 0) {
      startIdx = 1;
    }
  }

  interface ParsedEdgeLine {
    lineIdx: number;
    u: string;
    v: string;
    w?: number | string;
  }

  const parsedLines: ParsedEdgeLine[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const { lineIdx, trimmed } = lines[i];
    const bracketMatch = trimmed.match(/^([^\s[\]]+)\s*\[([^\]]+)\]$/);
    const assignMatch = trimmed.match(/^([^\s:=[\]]+)\s*[:=]\s*(.+)$/);
    if (bracketMatch || assignMatch) continue;

    const parts = splitLineTokens(trimmed);
    if (parts.length >= 2) {
      const weight = parseEdgeWeightTokens(parts);
      parsedLines.push({ lineIdx, u: parts[0], v: parts[1], w: weight });
    }
  }

  if (parsedLines.length === 0) return [];

  const matched = new Set<number>();
  const usedParsedLineIdx = new Set<number>();

  const matchesEndpoints = (pl: ParsedEdgeLine, edge: GraphEdge): boolean => {
    const src = getCleanLabel(edge.source);
    const tgt = getCleanLabel(edge.target);
    if (pl.u === src && pl.v === tgt) return true;
    if (!edge.directed && pl.u === tgt && pl.v === src) return true;
    return false;
  };

  // Fast 1-to-1 positional alignment (handles parallel edges identically to parser & serializer)
  if (parsedLines.length === tabEdges.length) {
    let allAligned = true;
    for (let i = 0; i < tabEdges.length; i++) {
      if (!matchesEndpoints(parsedLines[i], tabEdges[i])) {
        allAligned = false;
        break;
      }
    }
    if (allAligned) {
      for (let i = 0; i < tabEdges.length; i++) {
        if (selectedIdSet.has(tabEdges[i].id)) {
          matched.add(parsedLines[i].lineIdx);
        }
      }
      return Array.from(matched).sort((a, b) => a - b);
    }
  }

  // Fallback matching by endpoints + weight, consuming each line once
  for (const edge of selectedEdges) {
    let found = parsedLines.findIndex(
      (pl, idx) =>
        !usedParsedLineIdx.has(idx) &&
        matchesEndpoints(pl, edge) &&
        (edge.weight === undefined ? pl.w === undefined : pl.w === edge.weight)
    );
    if (found === -1) {
      found = parsedLines.findIndex(
        (pl, idx) => !usedParsedLineIdx.has(idx) && matchesEndpoints(pl, edge)
      );
    }
    if (found !== -1) {
      usedParsedLineIdx.add(found);
      matched.add(parsedLines[found].lineIdx);
    }
  }

  return Array.from(matched).sort((a, b) => a - b);
}
