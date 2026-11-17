import { GraphData, GraphNode, LayoutMode } from '../types/graph';

export function applyLayout(
  data: GraphData,
  mode: LayoutMode,
  options?: {
    rootId?: string;
    isDirected?: boolean;
    width?: number;
    height?: number;
  }
): GraphData {
  const width = options?.width || 900;
  const height = options?.height || 650;
  const centerX = width / 2;
  const centerY = height / 2;

  switch (mode) {
    case 'tree':
      return applyTreeLayout(data, options?.rootId, width, height);
    case 'dag':
      return applyDAGLayout(data, width, height);
    case 'bipartite':
      return applyBipartiteLayout(data, width, height);
    case 'circular':
      return applyCircularLayout(data, centerX, centerY, Math.min(width, height) * 0.38);
    case 'grid':
      return applyGridLayout(data, width, height);
    case 'force':
    default:
      return applyForceLayoutStep(data, width, height, 50); // Run initial 50 iterations
  }
}

export function applyCircularLayout(
  data: GraphData,
  centerX: number,
  centerY: number,
  radius: number
): GraphData {
  const count = data.nodes.length;
  if (count === 0) return data;

  const newNodes = data.nodes.map((node, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  return { ...data, nodes: newNodes };
}

export function applyGridLayout(data: GraphData, width: number, height: number): GraphData {
  const count = data.nodes.length;
  if (count === 0) return data;

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const paddingX = 100;
  const paddingY = 100;
  const stepX = (width - 2 * paddingX) / Math.max(1, cols - 1);
  const stepY = (height - 2 * paddingY) / Math.max(1, rows - 1);

  const newNodes = data.nodes.map((node, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return {
      ...node,
      x: cols === 1 ? width / 2 : paddingX + c * stepX,
      y: rows === 1 ? height / 2 : paddingY + r * stepY,
      vx: 0,
      vy: 0,
    };
  });

  return { ...data, nodes: newNodes };
}

export function applyTreeLayout(
  data: GraphData,
  rootId: string | undefined,
  width: number,
  height: number
): GraphData {
  const nodes = data.nodes;
  if (nodes.length === 0) return data;

  // Find root
  let root = rootId ? nodes.find(n => n.id === rootId) : undefined;
  if (!root) {
    // If directed, find node with in-degree 0
    const inDegree = new Map<string, number>();
    nodes.forEach(n => inDegree.set(n.id, 0));
    data.edges.forEach(e => inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1));
    const zeroIn = nodes.find(n => inDegree.get(n.id) === 0);
    root = zeroIn || nodes[0];
  }

  // Build tree hierarchy via BFS from root
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  data.edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const levels = new Map<number, string[]>();
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [{ id: root.id, level: 0 }];
  visited.add(root.id);

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level)!.push(id);

    const neighbors = adj.get(id) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push({ id: v, level: level + 1 });
      }
    }
  }

  // Any unreached nodes go to disconnected bottom row
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const maxL = Math.max(...Array.from(levels.keys()), 0) + 1;
      if (!levels.has(maxL)) levels.set(maxL, []);
      levels.get(maxL)!.push(n.id);
    }
  });

  const maxLevel = Math.max(...Array.from(levels.keys()), 0);
  const rowHeight = Math.min(100, (height - 160) / Math.max(1, maxLevel));
  const topY = 80;

  const positions = new Map<string, { x: number; y: number }>();

  levels.forEach((nodeIds, lvl) => {
    const y = topY + lvl * rowHeight;
    const count = nodeIds.length;
    const stepX = (width - 160) / (count + 1);
    nodeIds.forEach((id, idx) => {
      positions.set(id, {
        x: 80 + (idx + 1) * stepX,
        y,
      });
    });
  });

  const newNodes = nodes.map(node => ({
    ...node,
    x: positions.get(node.id)?.x ?? node.x,
    y: positions.get(node.id)?.y ?? node.y,
    vx: 0,
    vy: 0,
  }));

  return { ...data, nodes: newNodes };
}

export function applyDAGLayout(data: GraphData, width: number, height: number): GraphData {
  const nodes = data.nodes;
  if (nodes.length === 0) return data;

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  nodes.forEach(n => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  data.edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // Calculate longest path layers
  const layer = new Map<string, number>();
  const queue: string[] = [];
  nodes.forEach(n => {
    if (inDegree.get(n.id) === 0) {
      layer.set(n.id, 0);
      queue.push(n.id);
    }
  });

  const tempInDegree = new Map(inDegree);
  while (queue.length > 0) {
    const u = queue.shift()!;
    const uLayer = layer.get(u) || 0;

    for (const v of adj.get(u) || []) {
      layer.set(v, Math.max(layer.get(v) || 0, uLayer + 1));
      tempInDegree.set(v, (tempInDegree.get(v) || 0) - 1);
      if (tempInDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  // Fallback for remaining (cycles)
  nodes.forEach(n => {
    if (!layer.has(n.id)) layer.set(n.id, 0);
  });

  const layers = new Map<number, string[]>();
  layer.forEach((l, id) => {
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(id);
  });

  const maxL = Math.max(...Array.from(layers.keys()), 0);
  const colWidth = Math.min(180, (width - 160) / Math.max(1, maxL));
  const leftX = 80;

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((nodeIds, l) => {
    const x = leftX + l * colWidth;
    const count = nodeIds.length;
    const stepY = (height - 140) / (count + 1);
    nodeIds.forEach((id, idx) => {
      positions.set(id, {
        x,
        y: 70 + (idx + 1) * stepY,
      });
    });
  });

  const newNodes = nodes.map(node => ({
    ...node,
    x: positions.get(node.id)?.x ?? node.x,
    y: positions.get(node.id)?.y ?? node.y,
    vx: 0,
    vy: 0,
  }));

  return { ...data, nodes: newNodes };
}

export function applyBipartiteLayout(data: GraphData, width: number, height: number): GraphData {
  const nodes = data.nodes;
  if (nodes.length === 0) return data;

  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  data.edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  // 2-color
  const color = new Map<string, number>();
  nodes.forEach(n => {
    if (!color.has(n.id)) {
      color.set(n.id, 0);
      const q = [n.id];
      while (q.length > 0) {
        const u = q.shift()!;
        for (const v of adj.get(u) || []) {
          if (!color.has(v)) {
            color.set(v, 1 - color.get(u)!);
            q.push(v);
          }
        }
      }
    }
  });

  const setA: string[] = [];
  const setB: string[] = [];
  nodes.forEach(n => {
    if (color.get(n.id) === 0) setA.push(n.id);
    else setB.push(n.id);
  });

  const leftX = width * 0.25;
  const rightX = width * 0.75;
  const positions = new Map<string, { x: number; y: number }>();

  const stepA = (height - 140) / Math.max(1, setA.length + 1);
  setA.forEach((id, idx) => {
    positions.set(id, { x: leftX, y: 70 + (idx + 1) * stepA });
  });

  const stepB = (height - 140) / Math.max(1, setB.length + 1);
  setB.forEach((id, idx) => {
    positions.set(id, { x: rightX, y: 70 + (idx + 1) * stepB });
  });

  const newNodes = nodes.map(node => ({
    ...node,
    x: positions.get(node.id)?.x ?? node.x,
    y: positions.get(node.id)?.y ?? node.y,
    vx: 0,
    vy: 0,
  }));

  return { ...data, nodes: newNodes };
}

/**
 * Runs physics simulation iterations for Force-Directed layout
 */
export function applyForceLayoutStep(
  data: GraphData,
  width: number,
  height: number,
  iterations: number = 1
): GraphData {
  const nodes = data.nodes.map(n => ({ ...n }));
  const edges = data.edges;
  const n = nodes.length;
  if (n === 0) return data;

  const nodeMap = new Map<string, number>();
  nodes.forEach((node, i) => nodeMap.set(node.id, i));

  const k = Math.sqrt((width * height) / Math.max(1, n));
  const repulsionStrength = 1800;
  const springLength = 80;
  const springStrength = 0.05;
  const centerGravity = 0.02;
  const centerX = width / 2;
  const centerY = height / 2;
  const damping = 0.85;

  for (let it = 0; it < iterations; it++) {
    // 1. Repulsion between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        // Repulsive force inversely proportional to distance
        const force = (repulsionStrength * repulsionStrength) / (distSq * dist);
        const fx = dx * force;
        const fy = dy * force;

        if (!nodes[i].isPinned && (nodes[i].fx === undefined || nodes[i].fx === null)) {
          nodes[i].vx = (nodes[i].vx || 0) + fx;
          nodes[i].vy = (nodes[i].vy || 0) + fy;
        }
        if (!nodes[j].isPinned && (nodes[j].fx === undefined || nodes[j].fx === null)) {
          nodes[j].vx = (nodes[j].vx || 0) - fx;
          nodes[j].vy = (nodes[j].vy || 0) - fy;
        }
      }
    }

    // 2. Spring attraction along edges
    for (const edge of edges) {
      const u = nodeMap.get(edge.source);
      const v = nodeMap.get(edge.target);
      if (u === undefined || v === undefined || u === v) continue;

      const dx = nodes[v].x - nodes[u].x;
      const dy = nodes[v].y - nodes[u].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - springLength;

      const force = displacement * springStrength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!nodes[u].isPinned && (nodes[u].fx === undefined || nodes[u].fx === null)) {
        nodes[u].vx = (nodes[u].vx || 0) + fx;
        nodes[u].vy = (nodes[u].vy || 0) + fy;
      }
      if (!nodes[v].isPinned && (nodes[v].fx === undefined || nodes[v].fx === null)) {
        nodes[v].vx = (nodes[v].vx || 0) - fx;
        nodes[v].vy = (nodes[v].vy || 0) - fy;
      }
    }

    // 3. Center gravity and update positions
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (node.isPinned || (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null)) {
        node.x = node.fx ?? node.x;
        node.y = node.fy ?? node.y;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      // Gravitate toward center
      const gx = (centerX - node.x) * centerGravity;
      const gy = (centerY - node.y) * centerGravity;
      node.vx = ((node.vx || 0) + gx) * damping;
      node.vy = ((node.vy || 0) + gy) * damping;

      // Limit speed
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      const maxSpeed = 15;
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed;
        node.vy = (node.vy / speed) * maxSpeed;
      }

      node.x += node.vx;
      node.y += node.vy;

      // Keep within bounds
      const margin = 40;
      node.x = Math.max(margin, Math.min(width - margin, node.x));
      node.y = Math.max(margin, Math.min(height - margin, node.y));
    }
  }

  return { ...data, nodes };
}
