import { GraphData, GraphNode, GraphEdge, GraphSettings } from '../types/graph';
import { DEFAULT_NODE_COLOR, DEFAULT_EDGE_COLOR } from './parser';

export interface GeneratorOptions {
  n?: number;
  m?: number;
  r?: number; // rows
  c?: number; // cols
  weighted?: boolean;
  minWeight?: number;
  maxWeight?: number;
  isDirected?: boolean;
  isZeroIndexed?: boolean;
}

export function generateBamboo(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { n = 6, weighted = false, minWeight = 1, maxWeight = 10, isDirected = false, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < n; i++) {
    const id = String(start + i);
    nodes.push({
      id,
      label: id,
      index: start + i,
      x: 100 + i * (700 / Math.max(1, n - 1)),
      y: 300 + (i % 2 === 0 ? -20 : 20),
      color: DEFAULT_NODE_COLOR,
    });

    if (i > 0) {
      const u = String(start + i - 1);
      const v = id;
      const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
      edges.push({
        id: `e-${u}-${v}`,
        source: u,
        target: v,
        weight: w,
        color: DEFAULT_EDGE_COLOR,
        directed: isDirected,
      });
    }
  }

  return {
    data: { nodes, edges },
    settings: { isDirected, isWeighted: weighted, isZeroIndexed, layout: 'force' },
  };
}

export function generateStar(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { n = 6, weighted = false, minWeight = 1, maxWeight = 10, isDirected = false, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const centerId = String(start);

  const nodes: GraphNode[] = [{
    id: centerId,
    label: centerId,
    index: start,
    x: 400,
    y: 300,
    color: '#ef4444', // Highlight center in red/crimson
    badge: 'Hub',
  }];

  const edges: GraphEdge[] = [];
  const radius = 220;

  for (let i = 1; i < n; i++) {
    const id = String(start + i);
    const angle = ((i - 1) / (n - 1)) * 2 * Math.PI;
    nodes.push({
      id,
      label: id,
      index: start + i,
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
      color: DEFAULT_NODE_COLOR,
    });

    const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
    edges.push({
      id: `e-${centerId}-${id}`,
      source: centerId,
      target: id,
      weight: w,
      color: DEFAULT_EDGE_COLOR,
      directed: isDirected,
    });
  }

  return {
    data: { nodes, edges },
    settings: { isDirected, isWeighted: weighted, isZeroIndexed, layout: 'tree', treeRootId: centerId },
  };
}

export function generateComplete(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { n = 6, weighted = false, minWeight = 1, maxWeight = 10, isDirected = false, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const radius = Math.min(260, 60 + n * 18);

  for (let i = 0; i < n; i++) {
    const id = String(start + i);
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    nodes.push({
      id,
      label: id,
      index: start + i,
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
      color: DEFAULT_NODE_COLOR,
    });
  }

  for (let i = 0; i < n; i++) {
    for (let j = isDirected ? 0 : i + 1; j < n; j++) {
      if (i === j) continue;
      const u = String(start + i);
      const v = String(start + j);
      const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
      edges.push({
        id: `e-${u}-${v}`,
        source: u,
        target: v,
        weight: w,
        color: DEFAULT_EDGE_COLOR,
        directed: isDirected,
      });
    }
  }

  return {
    data: { nodes, edges },
    settings: { isDirected, isWeighted: weighted, isZeroIndexed, layout: 'circular' },
  };
}

export function generateRandomTree(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { n = 6, weighted = false, minWeight = 1, maxWeight = 10, isDirected = false, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < n; i++) {
    const id = String(start + i);
    nodes.push({
      id,
      label: id,
      index: start + i,
      x: 400 + (Math.random() - 0.5) * 300,
      y: 300 + (Math.random() - 0.5) * 300,
      color: DEFAULT_NODE_COLOR,
    });
  }

  // Connect node i to a random already attached node 0..i-1
  for (let i = 1; i < n; i++) {
    const parentIdx = Math.floor(Math.random() * i);
    const u = String(start + parentIdx);
    const v = String(start + i);
    const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;

    edges.push({
      id: `e-${u}-${v}`,
      source: u,
      target: v,
      weight: w,
      color: DEFAULT_EDGE_COLOR,
      directed: isDirected,
    });
  }

  return {
    data: { nodes, edges },
    settings: { isDirected, isWeighted: weighted, isZeroIndexed, layout: 'tree', treeRootId: String(start) },
  };
}

export function generateGrid(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { r = 3, c = 4, weighted = false, minWeight = 1, maxWeight = 10, isDirected = false, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  let idx = 0;
  const gridNodeIds: string[][] = [];

  for (let row = 0; row < r; row++) {
    gridNodeIds[row] = [];
    for (let col = 0; col < c; col++) {
      const id = String(start + idx);
      idx++;
      gridNodeIds[row][col] = id;
      nodes.push({
        id,
        label: id,
        index: Number(id),
        x: 150 + col * (500 / Math.max(1, c - 1)),
        y: 120 + row * (380 / Math.max(1, r - 1)),
        color: DEFAULT_NODE_COLOR,
      });
    }
  }

  // Horizontal edges
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c - 1; col++) {
      const u = gridNodeIds[row][col];
      const v = gridNodeIds[row][col + 1];
      const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
      edges.push({
        id: `e-${u}-${v}`,
        source: u,
        target: v,
        weight: w,
        color: DEFAULT_EDGE_COLOR,
        directed: isDirected,
      });
    }
  }

  // Vertical edges
  for (let row = 0; row < r - 1; row++) {
    for (let col = 0; col < c; col++) {
      const u = gridNodeIds[row][col];
      const v = gridNodeIds[row + 1][col];
      const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
      edges.push({
        id: `e-${u}-${v}`,
        source: u,
        target: v,
        weight: w,
        color: DEFAULT_EDGE_COLOR,
        directed: isDirected,
      });
    }
  }

  return {
    data: { nodes, edges },
    settings: { isDirected, isWeighted: weighted, isZeroIndexed, layout: 'grid' },
  };
}

export function generateRandomDAG(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { n = 6, m = Math.floor(n * 1.5), weighted = false, minWeight = 1, maxWeight = 10, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < n; i++) {
    const id = String(start + i);
    nodes.push({
      id,
      label: id,
      index: start + i,
      x: 100 + i * (600 / Math.max(1, n - 1)),
      y: 200 + (Math.random() - 0.5) * 200,
      color: DEFAULT_NODE_COLOR,
    });
  }

  // Edges only from i to j where i < j (guarantees DAG!)
  const possibleEdges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      possibleEdges.push([i, j]);
    }
  }

  // Shuffle possible edges and take m
  possibleEdges.sort(() => Math.random() - 0.5);
  const selected = possibleEdges.slice(0, Math.min(m, possibleEdges.length));

  selected.forEach(([i, j], idx) => {
    const u = String(start + i);
    const v = String(start + j);
    const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
    edges.push({
      id: `e-${u}-${v}-${idx}`,
      source: u,
      target: v,
      weight: w,
      color: DEFAULT_EDGE_COLOR,
      directed: true,
    });
  });

  return {
    data: { nodes, edges },
    settings: { isDirected: true, isWeighted: weighted, isZeroIndexed, layout: 'dag' },
  };
}

export function generateCycle(options: GeneratorOptions): { data: GraphData; settings: Partial<GraphSettings> } {
  const { n = 6, weighted = false, minWeight = 1, maxWeight = 10, isDirected = false, isZeroIndexed = false } = options;
  const start = isZeroIndexed ? 0 : 1;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const radius = 220;

  for (let i = 0; i < n; i++) {
    const id = String(start + i);
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    nodes.push({
      id,
      label: id,
      index: start + i,
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
      color: DEFAULT_NODE_COLOR,
    });

    const nextId = String(start + ((i + 1) % n));
    const w = weighted ? Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight : undefined;
    edges.push({
      id: `e-${id}-${nextId}`,
      source: id,
      target: nextId,
      weight: w,
      color: DEFAULT_EDGE_COLOR,
      directed: isDirected,
    });
  }

  return {
    data: { nodes, edges },
    settings: { isDirected, isWeighted: weighted, isZeroIndexed, layout: 'circular' },
  };
}
