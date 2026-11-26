import { GraphData, GraphSettings, GraphNode } from '../types/graph';

export interface LeetCodeParseResult {
  edgesText: string;
  isWeighted: boolean;
  edgeCount: number;
}

export interface ParentArrayParseResult {
  edgesText: string;
  nodeCount: number;
  root?: string;
  isZeroIndexed: boolean;
}

export interface MultiTestCaseResult {
  count: number;
  testcases: {
    name: string;
    text: string;
  }[];
}

/**
 * Checks if raw text is a LeetCode 2D array representation.
 * e.g. `[[0,1],[1,2],[2,0]]` or `edges = [[0,1,5],[1,2,10]]`
 */
export function isLeetCode2DArray(text: string): boolean {
  const trimmed = text.trim();
  // Strip optional variable assignment (e.g. `edges = `, `connections = `)
  const cleaned = trimmed.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/, '').trim();
  return cleaned.startsWith('[[') && cleaned.endsWith(']]');
}

/**
 * Parses LeetCode 2D array input into standard edge list text `u v [w]`.
 */
export function parseLeetCode2DArray(text: string): LeetCodeParseResult | null {
  if (!isLeetCode2DArray(text)) return null;

  const cleaned = text.trim().replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/, '').trim();

  // Match all inner brackets [ ... ]
  const innerRegex = /\[\s*([^\[\]]+)\s*\]/g;
  let match: RegExpExecArray | null;
  const edgeLines: string[] = [];
  let isWeighted = false;

  while ((match = innerRegex.exec(cleaned)) !== null) {
    const content = match[1].trim();
    if (!content) continue;

    // Split by comma
    const parts = content.split(',').map(s => {
      let t = s.trim();
      if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
        t = t.slice(1, -1);
      }
      return t;
    });

    if (parts.length >= 2) {
      const u = parts[0];
      const v = parts[1];
      if (parts.length >= 3 && parts[2] !== '' && !isNaN(Number(parts[2]))) {
        isWeighted = true;
        edgeLines.push(`${u} ${v} ${parts[2]}`);
      } else {
        edgeLines.push(`${u} ${v}`);
      }
    }
  }

  if (edgeLines.length === 0) return null;

  return {
    edgesText: edgeLines.join('\n'),
    isWeighted,
    edgeCount: edgeLines.length,
  };
}

/**
 * Checks if raw text is a 1D Parent Array format.
 * e.g. `parent = [-1, 0, 0, 1, 1, 2]` or `[-1, 0, 0, 1, 1, 2]`
 */
export function isParentArrayFormat(text: string): boolean {
  const trimmed = text.trim();
  const cleaned = trimmed.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/, '').trim();
  if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) return false;
  // Make sure it's 1D, not 2D
  if (cleaned.startsWith('[[')) return false;

  const inner = cleaned.slice(1, -1).trim();
  if (!inner) return false;

  const tokens = inner.split(/[,\s]+/).filter(Boolean);
  return tokens.length >= 2 && tokens.every(t => /^-?\d+$/.test(t));
}

/**
 * Parses 1D Parent Array into edges.
 * index i is connected to parent[i].
 * If parent[i] === -1 or parent[i] === i, node i is the root.
 */
export function parseParentArrayFormat(text: string): ParentArrayParseResult | null {
  if (!isParentArrayFormat(text)) return null;

  const cleaned = text.trim().replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/, '').trim();
  const inner = cleaned.slice(1, -1).trim();
  const tokens = inner.split(/[,\s]+/).filter(Boolean).map(Number);

  if (tokens.length < 2) return null;

  const hasMinusOne = tokens.some(p => p === -1);
  const isZeroIndexed = hasMinusOne || tokens.some(p => p === 0);
  const start = isZeroIndexed ? 0 : 1;

  const edgeLines: string[] = [];
  let root: string | undefined = undefined;

  tokens.forEach((p, idx) => {
    const nodeIndex = start + idx;
    if (p === -1 || (p === nodeIndex && root === undefined)) {
      root = String(nodeIndex);
      return;
    }
    // Connect parent p to child nodeIndex
    edgeLines.push(`${p} ${nodeIndex}`);
  });

  return {
    edgesText: edgeLines.join('\n'),
    nodeCount: tokens.length,
    root,
    isZeroIndexed,
  };
}

/**
 * Checks for Two-line Parent & Child Array format:
 * parent = [1, 1, 2]
 * child = [2, 3, 4]
 * OR
 * [1, 1, 2]
 * [2, 3, 4]
 */
export function parseParentChildArrays(text: string): LeetCodeParseResult | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length !== 2) return null;

  const line1 = lines[0].replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/, '').trim();
  const line2 = lines[1].replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/, '').trim();

  if (!line1.startsWith('[') || !line1.endsWith(']') || !line2.startsWith('[') || !line2.endsWith(']')) {
    return null;
  }

  const pTokens = line1.slice(1, -1).split(/[,\s]+/).filter(Boolean);
  const cTokens = line2.slice(1, -1).split(/[,\s]+/).filter(Boolean);

  if (pTokens.length === 0 || pTokens.length !== cTokens.length) return null;

  const edgeLines: string[] = [];
  for (let i = 0; i < pTokens.length; i++) {
    edgeLines.push(`${pTokens[i]} ${cTokens[i]}`);
  }

  return {
    edgesText: edgeLines.join('\n'),
    isWeighted: false,
    edgeCount: edgeLines.length,
  };
}

/**
 * Detects if the input text contains multiple competitive programming test cases (T >= 2).
 * Supports standard formats:
 * - Line 1: T
 * - Followed by T blocks, where each block starts with "N M" and has M edge lines
 * - Or T tree blocks, where each block starts with "N" and has N-1 edge lines
 * - Or blocks separated by "---" or "Testcase X:"
 */
export function detectMultiTestcases(rawText: string): MultiTestCaseResult | null {
  const cleanLines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

  if (cleanLines.length < 5) return null;

  // 1. Check for explicit separator marks like `---` or `===` or `Testcase:` / `Case:`
  const separatorIndices: number[] = [];
  for (let i = 0; i < cleanLines.length; i++) {
    const l = cleanLines[i];
    if (/^[-=]{3,}$/.test(l) || /^(test\s*case|case)\s*#?\s*\d+/i.test(l)) {
      separatorIndices.push(i);
    }
  }

  if (separatorIndices.length >= 1) {
    const cases: { name: string; text: string }[] = [];
    let prevIndex = 0;
    let caseNum = 1;

    for (let s = 0; s < separatorIndices.length; s++) {
      const sepIdx = separatorIndices[s];
      const slice = cleanLines.slice(prevIndex, sepIdx).filter(l => !/^[-=]{3,}$/.test(l) && !/^(test\s*case|case)/i.test(l));
      if (slice.length > 0) {
        cases.push({
          name: `Graph ${caseNum++}`,
          text: slice.join('\n'),
        });
      }
      prevIndex = sepIdx + 1;
    }

    const lastSlice = cleanLines.slice(prevIndex).filter(l => !/^[-=]{3,}$/.test(l) && !/^(test\s*case|case)/i.test(l));
    if (lastSlice.length > 0) {
      cases.push({
        name: `Graph ${caseNum++}`,
        text: lastSlice.join('\n'),
      });
    }

    if (cases.length >= 2) {
      return { count: cases.length, testcases: cases };
    }
  }

  // 2. Check for standard CP format where line 0 is T (number of testcases)
  const firstLine = cleanLines[0];
  if (!/^\d+$/.test(firstLine)) return null;

  const t = parseInt(firstLine, 10);
  if (t < 2 || t > 20) return null; // Reasonable limit for visual multi-graph tabs

  let lineIdx = 1;
  const cases: { name: string; text: string }[] = [];

  for (let c = 0; c < t; c++) {
    if (lineIdx >= cleanLines.length) return null;

    const headerTokens = cleanLines[lineIdx].split(/\s+/).filter(Boolean);
    lineIdx++;

    // Format A: N M header
    if (headerTokens.length >= 2 && /^\d+$/.test(headerTokens[0]) && /^\d+$/.test(headerTokens[1])) {
      const m = parseInt(headerTokens[1], 10);
      if (lineIdx + m > cleanLines.length) return null;

      const edgeLines = cleanLines.slice(lineIdx, lineIdx + m);
      lineIdx += m;
      cases.push({
        name: `Graph ${c + 1}`,
        text: edgeLines.join('\n'),
      });
    }
    // Format B: Tree single N header (where M = N - 1)
    else if (headerTokens.length === 1 && /^\d+$/.test(headerTokens[0])) {
      const n = parseInt(headerTokens[0], 10);
      const m = n - 1;
      if (m < 0 || lineIdx + m > cleanLines.length) return null;

      const edgeLines = cleanLines.slice(lineIdx, lineIdx + m);
      lineIdx += m;
      cases.push({
        name: `Graph ${c + 1}`,
        text: edgeLines.join('\n'),
      });
    } else {
      return null;
    }
  }

  // Ensure all lines in cleanLines were parsed
  if (lineIdx !== cleanLines.length) return null;

  return {
    count: cases.length,
    testcases: cases,
  };
}

/**
 * Serializes GraphData to LeetCode 2D Array format:
 * `[[u,v],[v,w]]` or `[[u,v,w],...]`
 */
export function serializeToLeetCode(
  data: GraphData,
  settings: GraphSettings,
  targetGraphIndex?: number
): string {
  const relevantEdges = targetGraphIndex !== undefined
    ? data.edges.filter(e => (e.graphIndex ?? 0) === targetGraphIndex)
    : data.edges;

  const nodeMap = new Map<string, GraphNode>();
  data.nodes.forEach(n => nodeMap.set(n.id, n));

  const cleanNodeLabel = (id: string): string => {
    const node = nodeMap.get(id);
    if (node?.label) return node.label;
    if (id.includes(':')) return id.slice(id.indexOf(':') + 1);
    return id;
  };

  const list = relevantEdges.map(e => {
    const u = cleanNodeLabel(e.source);
    const v = cleanNodeLabel(e.target);
    const uVal = /^-?\d+$/.test(u) ? u : JSON.stringify(u);
    const vVal = /^-?\d+$/.test(v) ? v : JSON.stringify(v);
    if (settings.isWeighted && e.weight !== undefined) {
      return `[${uVal},${vVal},${e.weight}]`;
    }
    return `[${uVal},${vVal}]`;
  });

  return `[${list.join(',')}]`;
}
