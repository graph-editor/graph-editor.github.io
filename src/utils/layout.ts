import { GraphData, GraphNode, GraphSettings, LayoutMode } from '../types/graph';

function getLayoutNodeRadius(node?: Pick<GraphNode, 'id' | 'label'>): number {
  if (!node) return 20;
  const len = String(node.label ?? node.id).length;
  if (len <= 2) return 20;
  if (len <= 4) return 23;
  if (len <= 6) return 26;
  return Math.min(45, 22 + len * 2.5);
}

function hasNodeWeightBadge(node: GraphNode): boolean {
  const rawW = node.weight ?? node.value;
  return rawW !== undefined && rawW !== null && String(rawW).trim() !== '';
}

function getMinNodeSeparation(a: GraphNode, b: GraphNode, padding = 28): number {
  const base = getLayoutNodeRadius(a) + getLayoutNodeRadius(b) + padding;
  // Extra vertical breathing room when nodes carry w:... badges underneath
  if ((hasNodeWeightBadge(a) || hasNodeWeightBadge(b)) && Math.abs(a.x - b.x) < 50) {
    return base + 14;
  }
  return base;
}

/**
 * Iteratively pushes overlapping node pairs apart until no two nodes overlap.
 * Respects pinned/dragged nodes (fx/fy) when possible.
 */
export function resolveNodeOverlaps(
  inputNodes: GraphNode[],
  iterations = 24,
  padding = 28
): GraphNode[] {
  const n = inputNodes.length;
  if (n <= 1) return inputNodes;

  const nodes = inputNodes.map(node => ({ ...node }));

  for (let it = 0; it < iterations; it++) {
    let moved = false;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const minDist = getMinNodeSeparation(a, b, padding);

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);

        if (dist >= minDist) continue;

        moved = true;
        if (dist < 0.001) {
          const angle = ((i * 1.618 + j * 2.718) % 1) * Math.PI * 2;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }

        const ux = dx / dist;
        const uy = dy / dist;
        const overlap = minDist - dist + 0.5;

        const aPinned = a.fx !== undefined && a.fx !== null;
        const bPinned = b.fx !== undefined && b.fx !== null;

        if (!aPinned && !bPinned) {
          const shift = overlap * 0.5;
          a.x -= ux * shift;
          a.y -= uy * shift;
          b.x += ux * shift;
          b.y += uy * shift;
        } else if (aPinned && !bPinned) {
          b.x += ux * overlap;
          b.y += uy * overlap;
        } else if (!aPinned && bPinned) {
          a.x -= ux * overlap;
          a.y -= uy * overlap;
        } else {
          // If both pinned in static layout mode, separate evenly
          const shift = overlap * 0.5;
          a.x -= ux * shift;
          a.y -= uy * shift;
          b.x += ux * shift;
          b.y += uy * shift;
        }
      }
    }

    if (!moved) break;
  }

  return nodes;
}

/**
 * Finds the nearest coordinates to `(targetX, targetY)` that do not overlap any existing node.
 */
export function findClearNodePosition(
  targetX: number,
  targetY: number,
  node: GraphNode,
  existingNodes: GraphNode[],
  padding = 28,
  preferredAngle = 0
): { x: number; y: number } {
  const isColliding = (cx: number, cy: number): boolean => {
    for (const other of existingNodes) {
      if (other.id === node.id) continue;
      const minDist = getMinNodeSeparation(node, other, padding);
      if (Math.hypot(other.x - cx, other.y - cy) < minDist) {
        return true;
      }
    }
    return false;
  };

  if (!isColliding(targetX, targetY)) {
    return { x: targetX, y: targetY };
  }

  for (let r = 68; r <= 1400; r += 34) {
    const steps = Math.max(12, Math.min(36, Math.round((2 * Math.PI * r) / 56)));
    for (let s = 0; s < steps; s++) {
      const a = preferredAngle + (s * 2 * Math.PI) / steps;
      const testX = targetX + r * Math.cos(a);
      const testY = targetY + r * Math.sin(a);
      if (!isColliding(testX, testY)) {
        return { x: testX, y: testY };
      }
    }
  }

  return { x: targetX, y: targetY };
}

export function applyLayout(
  data: GraphData,
  mode: LayoutMode,
  options?: {
    rootId?: string;
    isDirected?: boolean;
    width?: number;
    height?: number;
    targetGraphIndex?: number;
  }
): GraphData {
  const width = options?.width || 900;
  const height = options?.height || 650;
  const centerX = width / 2;
  const centerY = height / 2;

  // If a specific targetGraphIndex was requested (multi-graph mode), lay out only that graph's subgraph
  // while keeping all other graphs and nodes completely stationary at their current positions
  if (options?.targetGraphIndex !== undefined) {
    const targetIdx = options.targetGraphIndex;
    const targetNodes = data.nodes.filter(n => (n.graphIndex ?? 0) === targetIdx);
    if (targetNodes.length > 0 && targetNodes.length < data.nodes.length) {
      const otherNodes = data.nodes.filter(n => (n.graphIndex ?? 0) !== targetIdx);
      const targetNodeIds = new Set(targetNodes.map(n => n.id));
      const targetEdges = data.edges.filter(e => targetNodeIds.has(e.source) && targetNodeIds.has(e.target));
      const otherEdges = data.edges.filter(e => !targetNodeIds.has(e.source) || !targetNodeIds.has(e.target));

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      targetNodes.forEach(n => {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      });
      const boxWidth = Math.max(400, maxX - minX + 120);
      const boxHeight = Math.max(300, maxY - minY + 120);
      const origCenterX = (minX + maxX) / 2;
      const origCenterY = (minY + maxY) / 2;

      const laidOutTarget = applyLayout(
        { nodes: targetNodes, edges: targetEdges },
        mode,
        {
          ...options,
          targetGraphIndex: undefined,
          width: boxWidth,
          height: boxHeight,
        }
      );

      let newMinX = Infinity, newMaxX = -Infinity, newMinY = Infinity, newMaxY = -Infinity;
      laidOutTarget.nodes.forEach(n => {
        newMinX = Math.min(newMinX, n.x);
        newMaxX = Math.max(newMaxX, n.x);
        newMinY = Math.min(newMinY, n.y);
        newMaxY = Math.max(newMaxY, n.y);
      });
      const newCenterX = (newMinX + newMaxX) / 2;
      const newCenterY = (newMinY + newMaxY) / 2;
      const shiftX = origCenterX - newCenterX;
      const shiftY = origCenterY - newCenterY;

      const shiftedTargetNodes = laidOutTarget.nodes.map(n => ({
        ...n,
        x: n.x + shiftX,
        y: n.y + shiftY,
      }));

      return {
        nodes: resolveNodeOverlaps([...otherNodes, ...shiftedTargetNodes], 24, 28),
        edges: [...otherEdges, ...laidOutTarget.edges],
      };
    }
  }

  if (data.nodes.length === 1) {
    return {
      ...data,
      nodes: [{ ...data.nodes[0], x: centerX, y: centerY, vx: 0, vy: 0 }],
    };
  }

  let result: GraphData;
  switch (mode) {
    case 'tree':
      result = applyTreeLayout(data, options?.rootId, width, height);
      break;
    case 'dag':
      result = applyDAGLayout(data, width, height);
      break;
    case 'bipartite':
      result = applyBipartiteLayout(data, width, height);
      break;
    case 'circular':
      result = applyCircularLayout(data, centerX, centerY, Math.min(width, height) * 0.38);
      break;
    case 'grid':
      result = applyGridLayout(data, width, height);
      break;
    case 'force':
    default:
      result = applyForceLayoutStep(data, width, height, 50); // Run initial 50 iterations
      break;
  }

  return {
    ...result,
    nodes: resolveNodeOverlaps(result.nodes, 24, 28),
  };
}

export function applyCircularLayout(
  data: GraphData,
  centerX: number,
  centerY: number,
  radius: number
): GraphData {
  const count = data.nodes.length;
  if (count === 0) return data;

  const effectiveRadius = Math.max(radius, (count * 84) / (2 * Math.PI));

  const newNodes = data.nodes.map((node, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      ...node,
      x: centerX + effectiveRadius * Math.cos(angle),
      y: centerY + effectiveRadius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  return { ...data, nodes: resolveNodeOverlaps(newNodes, 20, 28) };
}

export function applyGridLayout(data: GraphData, width: number, height: number): GraphData {
  const count = data.nodes.length;
  if (count === 0) return data;

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const paddingX = 100;
  const paddingY = 100;
  const stepX = Math.max(96, (width - 2 * paddingX) / Math.max(1, cols - 1));
  const stepY = Math.max(96, (height - 2 * paddingY) / Math.max(1, rows - 1));

  const totalW = (cols - 1) * stepX;
  const totalH = (rows - 1) * stepY;
  const startX = width / 2 - totalW / 2;
  const startY = height / 2 - totalH / 2;

  const newNodes = data.nodes.map((node, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return {
      ...node,
      x: cols === 1 ? width / 2 : startX + c * stepX,
      y: rows === 1 ? height / 2 : startY + r * stepY,
      vx: 0,
      vy: 0,
    };
  });

  return { ...data, nodes: resolveNodeOverlaps(newNodes, 20, 28) };
}

export function applyTreeLayout(
  data: GraphData,
  rootId: string | undefined,
  width: number,
  height: number
): GraphData {
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
    adj.get(e.target)?.push(e.source);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const visited = new Set<string>();
  const trees: Array<{ root: GraphNode; levels: Map<number, string[]>; maxWidth: number; maxDepth: number }> = [];

  // If a specific rootId was requested, process that component first
  if (rootId && nodes.some(n => n.id === rootId)) {
    const specifiedRoot = nodes.find(n => n.id === rootId)!;
    trees.push(buildTreeComponent(specifiedRoot, adj, visited));
  }

  // Process all remaining components (supporting Forests and Multi-Trees)
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      // Find optimal root for this component:
      // 1. A node with in-degree 0 in directed mode
      // 2. Or the component member with the highest degree
      const compMembers: GraphNode[] = [];
      const q = [node.id];
      const compVisited = new Set<string>([node.id]);

      while (q.length > 0) {
        const u = q.shift()!;
        compMembers.push(nodes.find(n => n.id === u)!);
        for (const v of adj.get(u) || []) {
          if (!compVisited.has(v) && !visited.has(v)) {
            compVisited.add(v);
            q.push(v);
          }
        }
      }

      const zeroIn = compMembers.find(n => (inDegree.get(n.id) || 0) === 0);
      const bestRoot = zeroIn || compMembers.reduce((best, cur) =>
        (adj.get(cur.id)?.length || 0) > (adj.get(best.id)?.length || 0) ? cur : best, compMembers[0]
      );

      trees.push(buildTreeComponent(bestRoot, adj, visited));
    }
  });

  // Calculate layout coordinates side-by-side for each tree with guaranteed spacing
  const totalMaxWidth = trees.reduce((sum, t) => sum + Math.max(1, t.maxWidth), 0);
  const gap = 90;
  const minTotalWidth = totalMaxWidth * 84;
  const availableWidth = Math.max(width - 160 - (trees.length - 1) * gap, trees.length * 120, minTotalWidth);
  const topY = 80;

  const positions = new Map<string, { x: number; y: number }>();
  let currentStartX = 80;

  trees.forEach(tree => {
    const treeWidth = Math.max(tree.maxWidth * 84, (Math.max(1, tree.maxWidth) / totalMaxWidth) * availableWidth);
    const rowHeight = Math.max(92, Math.min(115, (height - 160) / Math.max(1, tree.maxDepth)));

    tree.levels.forEach((nodeIds, lvl) => {
      const y = topY + lvl * rowHeight;
      const count = nodeIds.length;
      const stepX = Math.max(82, treeWidth / (count + 1));
      const rowTotalW = stepX * (count + 1);
      const offsetX = currentStartX + (treeWidth - rowTotalW) / 2;
      nodeIds.forEach((id, idx) => {
        positions.set(id, {
          x: offsetX + (idx + 1) * stepX,
          y,
        });
      });
    });

    currentStartX += treeWidth + gap;
  });

  const newNodes = nodes.map(node => ({
    ...node,
    x: positions.get(node.id)?.x ?? node.x,
    y: positions.get(node.id)?.y ?? node.y,
    vx: 0,
    vy: 0,
  }));

  return { ...data, nodes: resolveNodeOverlaps(newNodes, 24, 28) };
}

function buildTreeComponent(
  root: GraphNode,
  adj: Map<string, string[]>,
  visited: Set<string>
): { root: GraphNode; levels: Map<number, string[]>; maxWidth: number; maxDepth: number } {
  const levels = new Map<number, string[]>();
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

  let maxWidth = 1;
  let maxDepth = 0;
  levels.forEach((nodeIds, lvl) => {
    maxWidth = Math.max(maxWidth, nodeIds.length);
    maxDepth = Math.max(maxDepth, lvl);
  });

  return { root, levels, maxWidth, maxDepth };
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
  const colWidth = Math.max(120, Math.min(200, (width - 160) / Math.max(1, maxL)));
  const leftX = 80;

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((nodeIds, l) => {
    const x = leftX + l * colWidth;
    const count = nodeIds.length;
    const stepY = Math.max(88, (height - 140) / (count + 1));
    const colH = (count + 1) * stepY;
    const startY = Math.max(70, height / 2 - colH / 2);
    nodeIds.forEach((id, idx) => {
      positions.set(id, {
        x,
        y: startY + (idx + 1) * stepY,
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

  return { ...data, nodes: resolveNodeOverlaps(newNodes, 24, 28) };
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

  const span = Math.max(300, width * 0.5);
  const leftX = width / 2 - span / 2;
  const rightX = width / 2 + span / 2;
  const positions = new Map<string, { x: number; y: number }>();

  const stepA = Math.max(88, (height - 140) / Math.max(1, setA.length + 1));
  const topA = Math.max(70, height / 2 - ((setA.length + 1) * stepA) / 2);
  setA.forEach((id, idx) => {
    positions.set(id, { x: leftX, y: topA + (idx + 1) * stepA });
  });

  const stepB = Math.max(88, (height - 140) / Math.max(1, setB.length + 1));
  const topB = Math.max(70, height / 2 - ((setB.length + 1) * stepB) / 2);
  setB.forEach((id, idx) => {
    positions.set(id, { x: rightX, y: topB + (idx + 1) * stepB });
  });

  const newNodes = nodes.map(node => ({
    ...node,
    x: positions.get(node.id)?.x ?? node.x,
    y: positions.get(node.id)?.y ?? node.y,
    vx: 0,
    vy: 0,
  }));

  return { ...data, nodes: resolveNodeOverlaps(newNodes, 24, 28) };
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

  if (data.nodes.length === 1) {
    return {
      ...data,
      nodes: [{ ...data.nodes[0], x: centerX, y: centerY, vx: 0, vy: 0 }],
    };
  }
  const damping = 0.85;

  for (let it = 0; it < iterations; it++) {
    // 1. Repulsion between node pairs (isolated per graph so independent graphs don't repel each other)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // Multi-graph physics isolation: nodes from different graphs never push each other
        if ((nodes[i].graphIndex ?? 0) !== (nodes[j].graphIndex ?? 0)) continue;

        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        // Repulsive force inversely proportional to distance
        const force = (repulsionStrength * repulsionStrength) / (distSq * dist);
        const fx = dx * force;
        const fy = dy * force;

        if (nodes[i].fx === undefined || nodes[i].fx === null) {
          nodes[i].vx = (nodes[i].vx || 0) + fx;
          nodes[i].vy = (nodes[i].vy || 0) + fy;
        }
        if (nodes[j].fx === undefined || nodes[j].fx === null) {
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

      if (nodes[u].fx === undefined || nodes[u].fx === null) {
        nodes[u].vx = (nodes[u].vx || 0) + fx;
        nodes[u].vy = (nodes[u].vy || 0) + fy;
      }
      if (nodes[v].fx === undefined || nodes[v].fx === null) {
        nodes[v].vx = (nodes[v].vx || 0) - fx;
        nodes[v].vy = (nodes[v].vy || 0) - fy;
      }
    }

    // Precompute center of mass per graphIndex to isolate equilibrium
    const graphCenters = new Map<number, { cx: number; cy: number }>();
    const graphCounts = new Map<number, number>();
    nodes.forEach(node => {
      const g = node.graphIndex ?? 0;
      const c = graphCenters.get(g) || { cx: 0, cy: 0 };
      c.cx += node.x;
      c.cy += node.y;
      graphCenters.set(g, c);
      graphCounts.set(g, (graphCounts.get(g) || 0) + 1);
    });
    graphCenters.forEach((c, g) => {
      const cnt = graphCounts.get(g) || 1;
      c.cx /= cnt;
      c.cy /= cnt;
    });
    const hasMultipleGraphs = graphCenters.size > 1;

    // 3. Center gravity and update positions
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null) {
        node.x = node.fx ?? node.x;
        node.y = node.fy ?? node.y;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      // Gravitate toward graph's own centroid (or canvas center if only 1 graph)
      const g = node.graphIndex ?? 0;
      const targetCenter = hasMultipleGraphs
        ? (graphCenters.get(g) || { cx: centerX, cy: centerY })
        : { cx: centerX, cy: centerY };

      const gx = (targetCenter.cx - node.x) * centerGravity;
      const gy = (targetCenter.cy - node.y) * centerGravity;
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
    }
  }

  return { ...data, nodes: resolveNodeOverlaps(nodes, 8, 28) };
}

/**
 * Places new nodes incrementally and non-destructively while keeping all
 * existing nodes 100% stable, fixed, and un-shifted at their exact positions.
 */
export function positionNewNodesPreservingExisting(
  parsed: GraphData,
  existingNodeMap: Map<string, GraphNode>,
  settings: GraphSettings,
  visibleCenter?: { x: number; y: number }
): GraphData {
  // If no existing nodes in canvas, lay out the new graph from scratch
  if (existingNodeMap.size === 0) {
    return applyLayout(parsed, settings.layout);
  }

  // Position map and node list tracking all already-placed nodes with their exact radii
  const posMap = new Map<string, { x: number; y: number }>();
  const placedNodesList: GraphNode[] = [];
  existingNodeMap.forEach((node, id) => {
    posMap.set(id, { x: node.x, y: node.y });
    placedNodesList.push({ ...node });
  });

  // Identify nodes that are brand new (not in existingNodeMap)
  const unpositionedNodes = parsed.nodes.filter(n => !existingNodeMap.has(n.id));
  if (unpositionedNodes.length === 0) {
    // All nodes already existed; preserve coordinates and only separate if any two literally overlap
    const preserved = parsed.nodes.map(n => {
      const exist = existingNodeMap.get(n.id);
      return exist ? { ...n, x: exist.x, y: exist.y, fx: exist.fx, fy: exist.fy } : n;
    });
    return {
      ...parsed,
      nodes: resolveNodeOverlaps(preserved, 16, 28),
    };
  }

  // Calculate bounding box and center of existing graph
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  existingNodeMap.forEach(n => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
    sumX += n.x;
    sumY += n.y;
  });
  const countExist = existingNodeMap.size;
  const graphCenterX = countExist > 0 ? sumX / countExist : 450;
  const graphCenterY = countExist > 0 ? sumY / countExist : 325;

  // Build undirected adjacency list from parsed.edges to find connected neighbors
  const adj = new Map<string, string[]>();
  parsed.edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  });

  // Track children counts per parent to fan out multiple new children neatly
  const neighborNewChildIndex = new Map<string, number>();

  // Iteratively position new nodes: those connected to already positioned nodes first
  const remaining = [...unpositionedNodes];
  let progress = true;

  while (remaining.length > 0 && progress) {
    progress = false;
    for (let i = 0; i < remaining.length; i++) {
      const node = remaining[i];
      const neighbors = (adj.get(node.id) || []).filter(nbr => posMap.has(nbr));

      if (neighbors.length > 0) {
        progress = true;
        remaining.splice(i, 1);
        i--;

        const primaryId = neighbors[0];
        const primaryPos = posMap.get(primaryId)!;
        const childIdx = neighborNewChildIndex.get(primaryId) || 0;
        neighborNewChildIndex.set(primaryId, childIdx + 1);

        const isTreeLike = settings.layout === 'tree' || settings.layout === 'dag';
        let candX: number;
        let candY: number;
        let preferredAngle: number;

        if (isTreeLike) {
          // Children fan out downwards: dy = +100
          const xOffset = childIdx === 0 ? 0 : (childIdx % 2 === 1 ? 1 : -1) * Math.ceil(childIdx / 2) * 90;
          candX = primaryPos.x + xOffset;
          candY = primaryPos.y + 100;
          preferredAngle = Math.PI / 2;
        } else {
          // General layout: place radially outward from graph center
          const angleFromCenter = Math.atan2(primaryPos.y - graphCenterY, primaryPos.x - graphCenterX);
          const fanOffset = (childIdx - 0.5 * (neighbors.length - 1)) * (Math.PI / 4);
          preferredAngle = angleFromCenter + fanOffset;
          const dist = 100;
          candX = primaryPos.x + dist * Math.cos(preferredAngle);
          candY = primaryPos.y + dist * Math.sin(preferredAngle);
        }

        const spot = findClearNodePosition(candX, candY, node, placedNodesList, 28, preferredAngle);
        posMap.set(node.id, spot);
        placedNodesList.push({ ...node, x: spot.x, y: spot.y });
      }
    }
  }

  // Any remaining new nodes are isolated (or in a new disconnected component)
  // Position them neatly in the visible viewport (or to the right of the graph)
  let isolatedIndex = 0;
  const baseX = visibleCenter ? visibleCenter.x : (isFinite(maxX) ? maxX + 96 : 450);
  const baseY = visibleCenter ? visibleCenter.y : (isFinite(minY) ? minY : 325);

  for (const node of remaining) {
    const col = isolatedIndex % 4;
    const row = Math.floor(isolatedIndex / 4);
    const candX = visibleCenter
      ? baseX + (col - 1.5) * 96
      : baseX + col * 92;
    const candY = visibleCenter
      ? baseY + (row - 0.5) * 96
      : baseY + row * 96;
    isolatedIndex++;
    const spot = findClearNodePosition(candX, candY, node, placedNodesList, 28);
    posMap.set(node.id, spot);
    placedNodesList.push({ ...node, x: spot.x, y: spot.y });
  }

  // Return parsed data where existing nodes keep their original positions
  // and no two nodes overlap.
  const finalNodes = parsed.nodes.map(n => {
    const pos = posMap.get(n.id);
    if (existingNodeMap.has(n.id)) {
      const exist = existingNodeMap.get(n.id)!;
      return {
        ...n,
        ...exist,
        weight: n.weight !== undefined ? n.weight : exist.weight,
        value: n.value !== undefined ? n.value : exist.value,
        label: n.label || exist.label,
        x: exist.x,
        y: exist.y,
      };
    }
    return {
      ...n,
      x: pos?.x ?? 450,
      y: pos?.y ?? 325,
    };
  });

  return {
    ...parsed,
    nodes: resolveNodeOverlaps(finalNodes, 16, 28),
  };
}
