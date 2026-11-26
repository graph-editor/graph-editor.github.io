import { GraphData, GraphStats, AlgorithmStep } from '../types/graph';

function getNumericEdgeWeight(w: number | string | undefined, fallback = 1): number {
  if (typeof w === 'number') return Number.isFinite(w) ? w : fallback;
  if (typeof w === 'string') {
    const trimmed = w.trim();
    if (trimmed !== '') {
      const n = Number(trimmed);
      if (!isNaN(n) && Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

export function computeGraphStats(data: GraphData, isDirected: boolean): GraphStats {
  const nodeCount = data.nodes.length;
  const edgeCount = data.edges.length;

  if (nodeCount === 0) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      componentCount: 0,
      isTree: false,
      isForest: false,
      isDAG: false,
      isBipartite: true,
      hasSelfLoops: false,
      hasMultiEdges: false,
      degrees: { min: 0, max: 0, avg: 0 },
    };
  }

  const nodeMap = new Map<string, number>();
  data.nodes.forEach((n, idx) => nodeMap.set(n.id, idx));

  const adj = Array.from({ length: nodeCount }, () => [] as number[]);
  const inDegree = new Array(nodeCount).fill(0);
  const outDegree = new Array(nodeCount).fill(0);

  let hasSelfLoops = false;
  const edgeSet = new Set<string>();
  let hasMultiEdges = false;

  data.edges.forEach(e => {
    const u = nodeMap.get(e.source);
    const v = nodeMap.get(e.target);
    if (u === undefined || v === undefined) return;

    if (u === v) hasSelfLoops = true;

    const pairKey = isDirected ? `${u}->${v}` : `${Math.min(u, v)}-${Math.max(u, v)}`;
    if (edgeSet.has(pairKey)) {
      hasMultiEdges = true;
    }
    edgeSet.add(pairKey);

    adj[u].push(v);
    outDegree[u]++;
    inDegree[v]++;
    if (!isDirected && u !== v) {
      adj[v].push(u);
      outDegree[v]++;
      inDegree[u]++;
    }
  });

  // Connected Components (Undirected or Weakly Connected)
  const visited = new Array(nodeCount).fill(false);
  let componentCount = 0;

  for (let i = 0; i < nodeCount; i++) {
    if (!visited[i]) {
      componentCount++;
      const q = [i];
      visited[i] = true;
      while (q.length > 0) {
        const curr = q.shift()!;
        for (const next of adj[curr]) {
          if (!visited[next]) {
            visited[next] = true;
            q.push(next);
          }
        }
      }
    }
  }

  // Bipartite Check
  const color = new Array(nodeCount).fill(-1);
  let isBipartite = true;
  for (let i = 0; i < nodeCount; i++) {
    if (color[i] === -1) {
      color[i] = 0;
      const q = [i];
      while (q.length > 0 && isBipartite) {
        const u = q.shift()!;
        for (const v of adj[u]) {
          if (v === u) {
            isBipartite = false;
            break;
          }
          if (color[v] === -1) {
            color[v] = 1 - color[u];
            q.push(v);
          } else if (color[v] === color[u]) {
            isBipartite = false;
            break;
          }
        }
      }
    }
  }

  // DAG Check (if directed)
  let isDAG = isDirected;
  if (isDirected) {
    const tempInDegree = [...inDegree];
    const q: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      if (tempInDegree[i] === 0) q.push(i);
    }
    let processed = 0;
    while (q.length > 0) {
      const u = q.shift()!;
      processed++;
      for (const v of adj[u]) {
        tempInDegree[v]--;
        if (tempInDegree[v] === 0) q.push(v);
      }
    }
    isDAG = processed === nodeCount;
  }

  // Tree / Forest Check
  const isTree = !isDirected && componentCount === 1 && edgeCount === nodeCount - 1 && !hasSelfLoops;
  const isForest = !isDirected && edgeCount === nodeCount - componentCount && !hasSelfLoops;

  // Degree metrics
  const totalDegree = outDegree.reduce((a, b) => a + b, 0);
  const minDegree = Math.min(...outDegree);
  const maxDegree = Math.max(...outDegree);
  const avgDegree = nodeCount > 0 ? parseFloat((totalDegree / nodeCount).toFixed(2)) : 0;

  return {
    nodeCount,
    edgeCount,
    componentCount,
    isTree,
    isForest,
    isDAG,
    isBipartite,
    hasSelfLoops,
    hasMultiEdges,
    degrees: { min: minDegree, max: maxDegree, avg: avgDegree },
  };
}

// ---------------- ALGORITHM TRACERS ---------------- //

export function runBFS(data: GraphData, startNodeId: string, isDirected: boolean): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    if (!isDirected) {
      adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
    }
  });

  const dist: Record<string, string> = {};
  const visited = new Set<string>();
  const queue: string[] = [];
  const highlightedEdges: { edgeId: string; color?: string }[] = [];

  // Initial step
  queue.push(startNodeId);
  visited.add(startNodeId);
  dist[startNodeId] = '0';

  steps.push({
    stepNumber: 1,
    title: 'Initialize BFS',
    description: `Start BFS from node ${startNodeId}. dist[${startNodeId}] = 0.`,
    activeNodes: [startNodeId],
    visitedNodes: [startNodeId],
    frontierNodes: [startNodeId],
    highlightedEdges: [],
    nodeAnnotations: { ...dist },
    dataStructureView: { name: 'Queue', items: [startNodeId] },
  });

  while (queue.length > 0) {
    const u = queue.shift()!;
    const uDist = parseInt(dist[u], 10);

    steps.push({
      stepNumber: steps.length + 1,
      title: `Visit Node ${u}`,
      description: `Popped node ${u} from queue. Distance = ${uDist}. Inspecting outgoing edges.`,
      activeNodes: [u],
      visitedNodes: Array.from(visited),
      frontierNodes: [...queue],
      highlightedEdges: [...highlightedEdges],
      nodeAnnotations: { ...dist },
      dataStructureView: { name: 'Queue', items: [...queue] },
    });

    const neighbors = adj.get(u) || [];
    for (const { to: v, edgeId } of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        dist[v] = String(uDist + 1);
        queue.push(v);
        highlightedEdges.push({ edgeId, color: '#10b981' });

        steps.push({
          stepNumber: steps.length + 1,
          title: `Discover Node ${v}`,
          description: `Discovered unvisited neighbor ${v} via edge (${u}, ${v}). Set dist[${v}] = ${uDist + 1} and push to queue.`,
          activeNodes: [v],
          visitedNodes: Array.from(visited),
          frontierNodes: [...queue],
          highlightedEdges: [...highlightedEdges],
          nodeAnnotations: { ...dist },
          dataStructureView: { name: 'Queue', items: [...queue] },
        });
      }
    }
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'BFS Complete',
    description: `BFS completed. Reached ${visited.size} / ${nodes.length} nodes.`,
    activeNodes: [],
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    highlightedEdges: [...highlightedEdges],
    nodeAnnotations: { ...dist },
    isFinished: true,
  });

  return steps;
}

export function runDFS(data: GraphData, startNodeId: string, isDirected: boolean): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    if (!isDirected) {
      adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
    }
  });

  let timer = 0;
  const tin: Record<string, string> = {};
  const tout: Record<string, string> = {};
  const visited = new Set<string>();
  const activeStack: string[] = [];
  const highlightedEdges: { edgeId: string; color?: string; style?: 'solid' | 'dashed' }[] = [];

  function dfs(u: string, pEdgeId?: string) {
    timer++;
    tin[u] = String(timer);
    visited.add(u);
    activeStack.push(u);

    steps.push({
      stepNumber: steps.length + 1,
      title: `Enter Node ${u} (tin=${timer})`,
      description: `DFS arrived at node ${u}. Discovery time tin[${u}] = ${timer}.`,
      activeNodes: [u],
      visitedNodes: Array.from(visited),
      frontierNodes: [...activeStack],
      highlightedEdges: [...highlightedEdges],
      nodeAnnotations: Object.fromEntries(
        Object.entries(tin).map(([k, v]) => [k, tout[k] ? `in:${v}/out:${tout[k]}` : `in:${v}`])
      ),
      dataStructureView: { name: 'Call Stack', items: [...activeStack] },
    });

    const neighbors = adj.get(u) || [];
    for (const { to: v, edgeId } of neighbors) {
      if (edgeId === pEdgeId && !isDirected) continue;

      if (!visited.has(v)) {
        highlightedEdges.push({ edgeId, color: '#10b981', style: 'solid' }); // Tree edge
        dfs(v, edgeId);
      } else if (activeStack.includes(v)) {
        // Back edge (Cycle detected!)
        highlightedEdges.push({ edgeId, color: '#ef4444', style: 'dashed' });
        steps.push({
          stepNumber: steps.length + 1,
          title: `Back Edge Found: (${u} -> ${v})`,
          description: `Edge (${u}, ${v}) connects to ancestor ${v} currently on stack! Cycle detected!`,
          activeNodes: [u, v],
          visitedNodes: Array.from(visited),
          frontierNodes: [...activeStack],
          highlightedEdges: [...highlightedEdges],
          nodeAnnotations: Object.fromEntries(
            Object.entries(tin).map(([k, val]) => [k, tout[k] ? `in:${val}/out:${tout[k]}` : `in:${val}`])
          ),
          dataStructureView: { name: 'Call Stack', items: [...activeStack] },
        });
      }
    }

    timer++;
    tout[u] = String(timer);
    activeStack.pop();

    steps.push({
      stepNumber: steps.length + 1,
      title: `Exit Node ${u} (tout=${timer})`,
      description: `Finished exploring node ${u}. tout[${u}] = ${timer}. Backtracking.`,
      activeNodes: [u],
      visitedNodes: Array.from(visited),
      frontierNodes: [...activeStack],
      highlightedEdges: [...highlightedEdges],
      nodeAnnotations: Object.fromEntries(
        Object.entries(tin).map(([k, val]) => [k, `in:${val}/out:${tout[k]}`])
      ),
      dataStructureView: { name: 'Call Stack', items: [...activeStack] },
    });
  }

  dfs(startNodeId);

  steps.push({
    stepNumber: steps.length + 1,
    title: 'DFS Complete',
    description: `DFS traversal complete. Total timer = ${timer}.`,
    activeNodes: [],
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    highlightedEdges: [...highlightedEdges],
    nodeAnnotations: Object.fromEntries(
      Object.entries(tin).map(([k, val]) => [k, `in:${val}/out:${tout[k]}`])
    ),
    isFinished: true,
  });

  return steps;
}

export function runDijkstra(data: GraphData, startNodeId: string, isDirected: boolean): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map<string, { to: string; weight: number; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(e => {
    const w = getNumericEdgeWeight(e.weight, 1);
    adj.get(e.source)?.push({ to: e.target, weight: w, edgeId: e.id });
    if (!isDirected) {
      adj.get(e.target)?.push({ to: e.source, weight: w, edgeId: e.id });
    }
  });

  const dist: Record<string, number> = {};
  const parentEdge: Record<string, string> = {};
  nodes.forEach(n => (dist[n.id] = Infinity));
  dist[startNodeId] = 0;

  // Priority queue simulated as array
  let pq: { u: string; d: number }[] = [{ u: startNodeId, d: 0 }];
  const finalized = new Set<string>();

  steps.push({
    stepNumber: 1,
    title: 'Initialize Dijkstra',
    description: `Set dist[${startNodeId}] = 0, all other distances = ∞. Insert (${startNodeId}, 0) into priority queue.`,
    activeNodes: [startNodeId],
    visitedNodes: [],
    frontierNodes: [startNodeId],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === Infinity ? '∞' : `${dist[n.id]}`])),
    dataStructureView: { name: 'Priority Queue', items: [`(${startNodeId}, 0)`] },
  });

  while (pq.length > 0) {
    // Sort pq by distance
    pq.sort((a, b) => a.d - b.d);
    const { u, d } = pq.shift()!;

    if (d > dist[u]) continue;
    finalized.add(u);

    const activeEdges = Object.values(parentEdge).map(edgeId => ({ edgeId, color: '#10b981' }));

    steps.push({
      stepNumber: steps.length + 1,
      title: `Extract Min: Node ${u} (d=${d})`,
      description: `Extracted node ${u} with minimum distance ${d}. Distance is now finalized.`,
      activeNodes: [u],
      visitedNodes: Array.from(finalized),
      frontierNodes: pq.map(x => x.u),
      highlightedEdges: activeEdges,
      nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === Infinity ? '∞' : `${dist[n.id]}`])),
      dataStructureView: { name: 'Priority Queue', items: pq.map(x => `(${x.u}, ${x.d})`) },
    });

    const neighbors = adj.get(u) || [];
    for (const { to: v, weight: w, edgeId } of neighbors) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parentEdge[v] = edgeId;
        pq.push({ u: v, d: dist[v] });

        steps.push({
          stepNumber: steps.length + 1,
          title: `Relax Edge (${u} -> ${v})`,
          description: `Relaxed edge (${u}, ${v}) with weight ${w}. Updated dist[${v}] = ${dist[v]}.`,
          activeNodes: [u, v],
          visitedNodes: Array.from(finalized),
          frontierNodes: pq.map(x => x.u),
          highlightedEdges: [...activeEdges, { edgeId, color: '#f59e0b' }],
          nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === Infinity ? '∞' : `${dist[n.id]}`])),
          dataStructureView: { name: 'Priority Queue', items: pq.map(x => `(${x.u}, ${x.d})`) },
        });
      }
    }
  }

  const finalEdges = Object.values(parentEdge).map(edgeId => ({ edgeId, color: '#10b981' }));
  steps.push({
    stepNumber: steps.length + 1,
    title: 'Dijkstra Complete',
    description: `All reachable vertices finalized. Shortest path tree constructed.`,
    activeNodes: [],
    visitedNodes: Array.from(finalized),
    frontierNodes: [],
    highlightedEdges: finalEdges,
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === Infinity ? '∞' : `${dist[n.id]}`])),
    isFinished: true,
  });

  return steps;
}

export function runTopologicalSort(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const inDegree: Record<string, number> = {};
  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => {
    inDegree[n.id] = 0;
    adj.set(n.id, []);
  });

  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  });

  const queue: string[] = [];
  nodes.forEach(n => {
    if (inDegree[n.id] === 0) queue.push(n.id);
  });

  const order: string[] = [];
  const processed = new Set<string>();

  steps.push({
    stepNumber: 1,
    title: "Kahn's Algorithm: Compute In-Degrees",
    description: `Computed in-degrees for all nodes. Nodes with in-degree 0: [${queue.join(', ')}].`,
    activeNodes: [...queue],
    visitedNodes: [],
    frontierNodes: [...queue],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, `deg: ${inDegree[n.id]}`])),
    dataStructureView: { name: 'Zero In-Degree Queue', items: [...queue] },
  });

  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    processed.add(u);

    steps.push({
      stepNumber: steps.length + 1,
      title: `Pop Node ${u} (Order pos: ${order.length})`,
      description: `Popped node ${u}. Current topological order: [${order.join(' → ')}].`,
      activeNodes: [u],
      visitedNodes: Array.from(processed),
      frontierNodes: [...queue],
      highlightedEdges: [],
      nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, `deg: ${inDegree[n.id]}`])),
      dataStructureView: { name: 'Zero In-Degree Queue', items: [...queue] },
    });

    const neighbors = adj.get(u) || [];
    for (const { to: v, edgeId } of neighbors) {
      inDegree[v]--;
      const isNowZero = inDegree[v] === 0;
      if (isNowZero) {
        queue.push(v);
      }

      steps.push({
        stepNumber: steps.length + 1,
        title: `Decrement in_deg[${v}] → ${inDegree[v]}`,
        description: `Removed edge (${u}, ${v}). Node ${v} now has in-degree ${inDegree[v]}${isNowZero ? ' → Pushed to Queue!' : ''}.`,
        activeNodes: [v],
        visitedNodes: Array.from(processed),
        frontierNodes: [...queue],
        highlightedEdges: [{ edgeId, color: '#f59e0b' }],
        nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, `deg: ${inDegree[n.id]}`])),
        dataStructureView: { name: 'Zero In-Degree Queue', items: [...queue] },
      });
    }
  }

  const hasCycle = order.length < nodes.length;
  steps.push({
    stepNumber: steps.length + 1,
    title: hasCycle ? 'Cycle Detected! (Not a DAG)' : 'Topological Sort Complete',
    description: hasCycle
      ? `Only ${order.length} of ${nodes.length} nodes processed. Graph contains at least one directed cycle!`
      : `Valid topological sort order: [${order.join(' → ')}].`,
    activeNodes: [],
    visitedNodes: Array.from(processed),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, `deg: ${inDegree[n.id]}`])),
    isFinished: true,
  });

  return steps;
}

export function runTarjanSCC(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => adj.get(e.source)?.push({ to: e.target, edgeId: e.id }));

  let timer = 0;
  const tin: Record<string, number> = {};
  const low: Record<string, number> = {};
  const onStack: Record<string, boolean> = {};
  const stack: string[] = [];
  const sccColors: Record<string, string> = {};
  let sccCount = 0;

  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

  function dfs(u: string) {
    timer++;
    tin[u] = low[u] = timer;
    stack.push(u);
    onStack[u] = true;

    steps.push({
      stepNumber: steps.length + 1,
      title: `Tarjan DFS at ${u}`,
      description: `Visited ${u}. tin[${u}] = low[${u}] = ${timer}. Pushed to stack.`,
      activeNodes: [u],
      visitedNodes: Object.keys(tin),
      frontierNodes: [...stack],
      highlightedEdges: [],
      nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, tin[n.id] ? `low:${low[n.id]}` : ''])),
      nodeColors: { ...sccColors },
      dataStructureView: { name: 'SCC Stack', items: [...stack] },
    });

    const neighbors = adj.get(u) || [];
    for (const { to: v, edgeId } of neighbors) {
      if (!tin[v]) {
        dfs(v);
        low[u] = Math.min(low[u], low[v]);
      } else if (onStack[v]) {
        low[u] = Math.min(low[u], tin[v]);
      }
    }

    if (low[u] === tin[u]) {
      sccCount++;
      const compColor = palette[(sccCount - 1) % palette.length];
      const compNodes: string[] = [];
      let w = '';
      do {
        w = stack.pop()!;
        onStack[w] = false;
        sccColors[w] = compColor;
        compNodes.push(w);
      } while (w !== u);

      steps.push({
        stepNumber: steps.length + 1,
        title: `Found SCC #${sccCount}: [${compNodes.join(', ')}]`,
        description: `low[${u}] == tin[${u}] == ${low[u]}. Popped strongly connected component from stack!`,
        activeNodes: compNodes,
        visitedNodes: Object.keys(tin),
        frontierNodes: [...stack],
        highlightedEdges: [],
        nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, `SCC #${sccCount}`])),
        nodeColors: { ...sccColors },
        dataStructureView: { name: 'SCC Stack', items: [...stack] },
      });
    }
  }

  for (const n of nodes) {
    if (!tin[n.id]) dfs(n.id);
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Tarjan SCC Complete',
    description: `Discovered ${sccCount} Strongly Connected Components.`,
    activeNodes: [],
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, sccColors[n.id] ? 'SCC' : ''])),
    nodeColors: { ...sccColors },
    isFinished: true,
  });

  return steps;
}

export function runBridgesAndCutVertices(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
  });

  let timer = 0;
  const tin: Record<string, number> = {};
  const low: Record<string, number> = {};
  const bridges: string[] = [];
  const cutVertices = new Set<string>();
  const visited = new Set<string>();

  function dfs(u: string, pEdgeId?: string) {
    timer++;
    tin[u] = low[u] = timer;
    visited.add(u);
    let children = 0;

    const neighbors = adj.get(u) || [];
    for (const { to: v, edgeId } of neighbors) {
      if (edgeId === pEdgeId) continue;

      if (visited.has(v)) {
        low[u] = Math.min(low[u], tin[v]);
      } else {
        children++;
        dfs(v, edgeId);
        low[u] = Math.min(low[u], low[v]);

        // Bridge check
        if (low[v] > tin[u]) {
          bridges.push(edgeId);
          steps.push({
            stepNumber: steps.length + 1,
            title: `Bridge Detected! Edge (${u}, ${v})`,
            description: `low[${v}] (${low[v]}) > tin[${u}] (${tin[u]}). Removing (${u}, ${v}) disconnects the graph!`,
            activeNodes: [u, v],
            visitedNodes: Array.from(visited),
            frontierNodes: [],
            highlightedEdges: bridges.map(b => ({ edgeId: b, color: '#ef4444' })),
            nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, tin[n.id] ? `low:${low[n.id]}` : ''])),
          });
        }

        // Cut vertex check
        if (pEdgeId !== undefined && low[v] >= tin[u]) {
          cutVertices.add(u);
        }
      }
    }

    if (pEdgeId === undefined && children > 1) {
      cutVertices.add(u);
    }
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) dfs(n.id);
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Bridge & Articulation Points Complete',
    description: `Found ${bridges.length} bridges and ${cutVertices.size} cut vertices.`,
    activeNodes: Array.from(cutVertices),
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    highlightedEdges: bridges.map(b => ({ edgeId: b, color: '#ef4444' })),
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, cutVertices.has(n.id) ? 'Articulation' : ''])),
    isFinished: true,
  });

  return steps;
}

export function runKruskalMST(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = [...data.edges];

  // Sort edges by weight
  edges.sort((a, b) => getNumericEdgeWeight(a.weight, 1) - getNumericEdgeWeight(b.weight, 1));

  // DSU
  const parent: Record<string, string> = {};
  nodes.forEach(n => (parent[n.id] = n.id));

  function find(i: string): string {
    if (parent[i] === i) return i;
    return (parent[i] = find(parent[i]));
  }

  function union(i: string, j: string): boolean {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI === rootJ) return false;
    parent[rootI] = rootJ;
    return true;
  }

  const mstEdges: { edgeId: string; color: string }[] = [];
  let totalWeight = 0;

  steps.push({
    stepNumber: 1,
    title: "Kruskal's Algorithm: Sort Edges",
    description: `Sorted ${edges.length} edges by non-decreasing weight. Initialize Disjoint Set Union (DSU).`,
    activeNodes: [],
    visitedNodes: [],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: {},
    dataStructureView: {
      name: 'Sorted Edge List',
      items: edges.map(e => `(${e.source}, ${e.target}, w=${e.weight ?? 1})`),
    },
  });

  for (const edge of edges) {
    const u = edge.source;
    const v = edge.target;
    const w = getNumericEdgeWeight(edge.weight, 1);

    const rootU = find(u);
    const rootV = find(v);

    if (rootU !== rootV) {
      union(u, v);
      totalWeight += w;
      mstEdges.push({ edgeId: edge.id, color: '#10b981' });

      steps.push({
        stepNumber: steps.length + 1,
        title: `Accept Edge (${u}, ${v}) [w=${w}]`,
        description: `Nodes ${u} and ${v} in different sets. Merged components! MST weight = ${totalWeight}.`,
        activeNodes: [u, v],
        visitedNodes: [],
        frontierNodes: [],
        highlightedEdges: [...mstEdges],
        nodeAnnotations: {},
        dataStructureView: {
          name: 'MST Edges',
          items: mstEdges.map(e => e.edgeId),
        },
      });
    } else {
      steps.push({
        stepNumber: steps.length + 1,
        title: `Reject Edge (${u}, ${v}) [w=${w}]`,
        description: `Nodes ${u} and ${v} already in same component. Adding edge would form a cycle!`,
        activeNodes: [u, v],
        visitedNodes: [],
        frontierNodes: [],
        highlightedEdges: [...mstEdges, { edgeId: edge.id, color: '#ef4444' }],
        nodeAnnotations: {},
      });
    }

    if (mstEdges.length === nodes.length - 1) break;
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Kruskal MST Complete',
    description: `Minimum Spanning Tree contains ${mstEdges.length} edges with total weight = ${totalWeight}.`,
    activeNodes: [],
    visitedNodes: [],
    frontierNodes: [],
    highlightedEdges: mstEdges,
    nodeAnnotations: {},
    isFinished: true,
  });

  return steps;
}

export function runBipartiteCheck(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
  });

  const color: Record<string, number> = {};
  const nodeColors: Record<string, string> = {};
  let isBipartite = true;

  for (const n of nodes) {
    if (color[n.id] === undefined && isBipartite) {
      color[n.id] = 0;
      nodeColors[n.id] = '#3b82f6'; // Color 0: Blue
      const q = [n.id];

      while (q.length > 0 && isBipartite) {
        const u = q.shift()!;
        const nextColor = 1 - color[u];
        const nextColorHex = nextColor === 0 ? '#3b82f6' : '#ec4899'; // Color 1: Pink

        const neighbors = adj.get(u) || [];
        for (const { to: v, edgeId } of neighbors) {
          if (color[v] === undefined) {
            color[v] = nextColor;
            nodeColors[v] = nextColorHex;
            q.push(v);

            steps.push({
              stepNumber: steps.length + 1,
              title: `Color Node ${v}`,
              description: `Node ${u} has color ${color[u] === 0 ? 'Blue' : 'Pink'}. Colored neighbor ${v} with ${nextColor === 0 ? 'Blue' : 'Pink'}.`,
              activeNodes: [u, v],
              visitedNodes: Object.keys(color),
              frontierNodes: [...q],
              highlightedEdges: [{ edgeId, color: '#10b981' }],
              nodeAnnotations: Object.fromEntries(nodes.map(x => [x.id, color[x.id] !== undefined ? `C${color[x.id]}` : ''])),
              nodeColors: { ...nodeColors },
            });
          } else if (color[v] === color[u]) {
            isBipartite = false;
            steps.push({
              stepNumber: steps.length + 1,
              title: `Conflict! Odd Cycle at (${u}, ${v})`,
              description: `Both node ${u} and ${v} have same color ${color[u] === 0 ? 'Blue' : 'Pink'}. Graph is NOT bipartite!`,
              activeNodes: [u, v],
              visitedNodes: Object.keys(color),
              frontierNodes: [],
              highlightedEdges: [{ edgeId, color: '#ef4444' }],
              nodeAnnotations: { [u]: 'Conflict', [v]: 'Conflict' },
              nodeColors: { ...nodeColors, [u]: '#ef4444', [v]: '#ef4444' },
            });
            break;
          }
        }
      }
    }
  }

  if (isBipartite) {
    steps.push({
      stepNumber: steps.length + 1,
      title: 'Graph is Bipartite!',
      description: `Successfully 2-colored graph with no adjacent conflicts. Partition into Set A (Blue) and Set B (Pink).`,
      activeNodes: [],
      visitedNodes: nodes.map(n => n.id),
      frontierNodes: [],
      highlightedEdges: [],
      nodeAnnotations: Object.fromEntries(nodes.map(x => [x.id, `Set ${color[x.id] === 0 ? 'A' : 'B'}`])),
      nodeColors: { ...nodeColors },
      isFinished: true,
    });
  }

  return steps;
}

// =====================================================================
// 9. TREE DIAMETER & CENTER (Two-Pass BFS/DFS)
// =====================================================================
export function runTreeDiameter(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  if (nodes.length === 1) {
    steps.push({
      stepNumber: 1,
      title: 'Trivial Tree (Single Vertex)',
      description: `Tree has only 1 vertex (${nodes[0].label}). Diameter is 0.`,
      activeNodes: [nodes[0].id],
      visitedNodes: [nodes[0].id],
      frontierNodes: [],
      highlightedEdges: [],
      nodeAnnotations: { [nodes[0].id]: 'Center' },
      isFinished: true,
    });
    return steps;
  }

  const adj = new Map<string, { to: string; edgeId: string; weight: number }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    const w = getNumericEdgeWeight(e.weight, 1);
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id, weight: w });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id, weight: w });
  });

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  // Step 0: Introduction
  steps.push({
    stepNumber: steps.length + 1,
    title: 'Tree Diameter: 2-Pass Search',
    description: `We will find the longest simple path in the tree. Pass 1 finds the farthest vertex from Node ${nodeMap.get(nodes[0].id)}. Pass 2 finds the farthest vertex from that endpoint.`,
    activeNodes: [nodes[0].id],
    visitedNodes: [],
    frontierNodes: [nodes[0].id],
    highlightedEdges: [],
    nodeAnnotations: {},
  });

  // Pass 1: BFS from nodes[0] to find farthest node u
  const bfsPass = (startId: string) => {
    const dist: Record<string, number> = { [startId]: 0 };
    const parent: Record<string, { node: string; edgeId: string }> = {};
    const q = [startId];
    let farthestId = startId;
    let maxDist = 0;

    while (q.length > 0) {
      const u = q.shift()!;
      for (const { to: v, edgeId, weight } of adj.get(u) || []) {
        if (dist[v] === undefined) {
          dist[v] = dist[u] + weight;
          parent[v] = { node: u, edgeId };
          if (dist[v] > maxDist) {
            maxDist = dist[v];
            farthestId = v;
          }
          q.push(v);
        }
      }
    }
    return { farthestId, maxDist, dist, parent };
  };

  const pass1 = bfsPass(nodes[0].id);
  const uId = pass1.farthestId;

  steps.push({
    stepNumber: steps.length + 1,
    title: `Pass 1 Complete: Farthest Vertex is ${nodeMap.get(uId)}`,
    description: `BFS from ${nodeMap.get(nodes[0].id)} reached farthest vertex ${nodeMap.get(uId)} at distance ${pass1.maxDist}. This node is guaranteed to be an endpoint of the tree diameter.`,
    activeNodes: [uId],
    visitedNodes: Object.keys(pass1.dist),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: { [uId]: 'Diameter End 1' },
    nodeColors: { [uId]: '#f59e0b' },
  });

  // Pass 2: BFS from uId to find farthest node vId
  const pass2 = bfsPass(uId);
  const vId = pass2.farthestId;
  const diameterLength = pass2.maxDist;

  // Reconstruct diameter path from vId back to uId
  const diameterPathNodes: string[] = [];
  const diameterEdges: { edgeId: string; color: string }[] = [];
  let curr = vId;
  diameterPathNodes.push(curr);

  while (curr !== uId && pass2.parent[curr]) {
    const p = pass2.parent[curr];
    diameterEdges.push({ edgeId: p.edgeId, color: '#f59e0b' });
    curr = p.node;
    diameterPathNodes.push(curr);
  }
  diameterPathNodes.reverse();

  // Find center(s) of diameter path
  const midIdx = Math.floor(diameterPathNodes.length / 2);
  const centerNodeId = diameterPathNodes[midIdx];

  const nodeAnnotations: Record<string, string> = {};
  const nodeColors: Record<string, string> = {};
  diameterPathNodes.forEach((id, idx) => {
    nodeColors[id] = id === centerNodeId ? '#10b981' : '#f59e0b';
    nodeAnnotations[id] = id === centerNodeId ? 'Center' : `P${idx + 1}`;
  });

  steps.push({
    stepNumber: steps.length + 1,
    title: `Diameter Found: ${nodeMap.get(uId)} ↔ ${nodeMap.get(vId)}`,
    description: `Tree diameter = ${diameterLength} (spans ${diameterPathNodes.length} vertices: ${diameterPathNodes.map(id => nodeMap.get(id)).join(' → ')}). Tree center is Node ${nodeMap.get(centerNodeId)}.`,
    activeNodes: diameterPathNodes,
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [centerNodeId],
    highlightedEdges: diameterEdges,
    nodeAnnotations,
    nodeColors,
    dataStructureView: {
      name: 'Diameter Path',
      items: diameterPathNodes.map(id => `Node ${nodeMap.get(id)}`),
    },
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 10. TREE SUBTREE SIZE & DEPTH DP (Postorder Tree DP)
// =====================================================================
export function runTreeSubtreeDP(data: GraphData, rootNodeId?: string): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const rootId = (rootNodeId && nodes.some(n => n.id === rootNodeId)) ? rootNodeId : nodes[0].id;
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  // Compute depth and postorder traversal order using DFS
  const depth: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const subtreeSize: Record<string, number> = {};
  const postorder: string[] = [];

  const dfsOrder = (u: string, p: string | null, d: number) => {
    depth[u] = d;
    parent[u] = p;
    for (const v of adj.get(u) || []) {
      if (v !== p) {
        dfsOrder(v, u, d + 1);
      }
    }
    postorder.push(u);
  };

  dfsOrder(rootId, null, 0);

  steps.push({
    stepNumber: steps.length + 1,
    title: `Rooted at Node ${nodeMap.get(rootId)}`,
    description: `We will compute subtree sizes sz[u] and depths d[u] using bottom-up postorder Tree DP (Leaves → Root).`,
    activeNodes: [rootId],
    visitedNodes: [rootId],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: { [rootId]: 'Root' },
    nodeColors: { [rootId]: '#3b82f6' },
    dataStructureView: {
      name: 'Evaluation Order',
      items: postorder.map(id => nodeMap.get(id) || id),
    },
  });

  const currentAnnotations: Record<string, string> = {};
  const currentColors: Record<string, string> = {};
  const highlightedEdges: { edgeId: string; color: string }[] = [];

  // Bottom-up postorder Tree DP
  postorder.forEach((u, idx) => {
    let size = 1;
    const children = (adj.get(u) || []).filter(v => v !== parent[u]);
    children.forEach(v => {
      size += subtreeSize[v] || 1;
      const edge = edges.find(e => (e.source === u && e.target === v) || (e.source === v && e.target === u));
      if (edge) highlightedEdges.push({ edgeId: edge.id, color: '#10b981' });
    });
    subtreeSize[u] = size;

    currentAnnotations[u] = `sz:${size}, d:${depth[u]}`;
    currentColors[u] = children.length === 0 ? '#06b6d4' : '#10b981';

    steps.push({
      stepNumber: steps.length + 1,
      title: `Compute DP for Node ${nodeMap.get(u)}`,
      description: children.length === 0
        ? `Leaf node ${nodeMap.get(u)}: Subtree size sz = 1, depth d = ${depth[u]}.`
        : `Node ${nodeMap.get(u)}: sz = 1 + sum(children: ${children.map(c => `sz[${nodeMap.get(c)}]=${subtreeSize[c]}`).join(', ')}) = ${size}. Depth d = ${depth[u]}.`,
      activeNodes: [u, ...children],
      visitedNodes: postorder.slice(0, idx + 1),
      frontierNodes: children,
      highlightedEdges: [...highlightedEdges],
      nodeAnnotations: { ...currentAnnotations },
      nodeColors: { ...currentColors },
      dataStructureView: {
        name: 'DP Table (sz, depth)',
        items: postorder.slice(0, idx + 1).map(id => `${nodeMap.get(id)}: sz=${subtreeSize[id]}, d=${depth[id]}`),
      },
    });
  });

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Tree DP Completed',
    description: `Root ${nodeMap.get(rootId)} has total tree size = ${subtreeSize[rootId]}. All subtree sizes and depths computed.`,
    activeNodes: [rootId],
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: [...highlightedEdges],
    nodeAnnotations: { ...currentAnnotations },
    nodeColors: { ...currentColors, [rootId]: '#3b82f6' },
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 11. TREE DP: MAXIMUM INDEPENDENT SET (MIS)
// =====================================================================
export function runTreeMISDP(data: GraphData, rootNodeId?: string): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const rootId = (rootNodeId && nodes.some(n => n.id === rootNodeId)) ? rootNodeId : nodes[0].id;
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  // dp[u][0]: max weight if u is NOT chosen
  // dp[u][1]: max weight if u IS chosen
  const dp0: Record<string, number> = {};
  const dp1: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const postorder: string[] = [];

  const dfsOrder = (u: string, p: string | null) => {
    parent[u] = p;
    for (const v of adj.get(u) || []) {
      if (v !== p) {
        dfsOrder(v, u);
      }
    }
    postorder.push(u);
  };
  dfsOrder(rootId, null);

  steps.push({
    stepNumber: steps.length + 1,
    title: `Tree DP: Maximum Independent Set (MIS)`,
    description: `We compute the largest set of non-adjacent vertices. For each node u: dp[u][0] = not chosen, dp[u][1] = chosen.`,
    activeNodes: [rootId],
    visitedNodes: [],
    frontierNodes: [rootId],
    highlightedEdges: [],
    nodeAnnotations: {},
  });

  // Bottom-up DP
  const currentAnnotations: Record<string, string> = {};
  postorder.forEach((u, idx) => {
    const children = (adj.get(u) || []).filter(v => v !== parent[u]);
    const nodeWeight = Number(nodes.find(n => n.id === u)?.weight) || 1;

    let takeVal = nodeWeight;
    let skipVal = 0;

    children.forEach(v => {
      skipVal += Math.max(dp0[v] || 0, dp1[v] || 0);
      takeVal += dp0[v] || 0;
    });

    dp0[u] = skipVal;
    dp1[u] = takeVal;

    currentAnnotations[u] = `[${skipVal}, ${takeVal}]`;

    steps.push({
      stepNumber: steps.length + 1,
      title: `DP for Node ${nodeMap.get(u)}: skip=${skipVal}, take=${takeVal}`,
      description: `If skip ${nodeMap.get(u)}: sum of max child values = ${skipVal}. If take ${nodeMap.get(u)}: weight(${nodeWeight}) + sum of skip child values = ${takeVal}.`,
      activeNodes: [u, ...children],
      visitedNodes: postorder.slice(0, idx + 1),
      frontierNodes: children,
      highlightedEdges: [],
      nodeAnnotations: { ...currentAnnotations },
      dataStructureView: {
        name: 'DP [skip, take]',
        items: postorder.slice(0, idx + 1).map(id => `${nodeMap.get(id)}: [${dp0[id]}, ${dp1[id]}]`),
      },
    });
  });

  // Reconstruct chosen vertices top-down
  const chosenSet = new Set<string>();
  const reconstruct = (u: string, canTake: boolean) => {
    const take = canTake && dp1[u] > dp0[u];
    if (take) {
      chosenSet.add(u);
    }
    for (const v of (adj.get(u) || []).filter(v => v !== parent[u])) {
      reconstruct(v, !take);
    }
  };
  reconstruct(rootId, true);

  const finalColors: Record<string, string> = {};
  const finalAnnotations: Record<string, string> = {};
  nodes.forEach(n => {
    const isChosen = chosenSet.has(n.id);
    finalColors[n.id] = isChosen ? '#10b981' : '#64748b';
    finalAnnotations[n.id] = isChosen ? 'IN MIS' : 'OUT';
  });

  steps.push({
    stepNumber: steps.length + 1,
    title: `MIS Reconstructed! Size = ${chosenSet.size}`,
    description: `Optimal Maximum Independent Set contains ${chosenSet.size} vertices: ${Array.from(chosenSet).map(id => nodeMap.get(id)).join(', ')}. Highlighted in Emerald Green!`,
    activeNodes: Array.from(chosenSet),
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: finalAnnotations,
    nodeColors: finalColors,
    dataStructureView: {
      name: 'Independent Set Vertices',
      items: Array.from(chosenSet).map(id => `Node ${nodeMap.get(id)}`),
    },
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 12. TREE CENTROID FINDING
// =====================================================================
export function runTreeCentroid(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const n = nodes.length;
  const adj = new Map<string, string[]>();
  nodes.forEach(item => adj.set(item.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const nodeMap = new Map<string, string>();
  nodes.forEach(item => nodeMap.set(item.id, item.label));

  // Compute subtree sizes rooted at nodes[0]
  const sz: Record<string, number> = {};
  const parent: Record<string, string | null> = {};

  const getSubtreeSizes = (u: string, p: string | null): number => {
    parent[u] = p;
    let s = 1;
    for (const v of adj.get(u) || []) {
      if (v !== p) {
        s += getSubtreeSizes(v, u);
      }
    }
    sz[u] = s;
    return s;
  };
  getSubtreeSizes(nodes[0].id, null);

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Find Tree Centroid',
    description: `A centroid is a vertex whose removal leaves no connected component with size > N/2 (${(n / 2).toFixed(1)}). Total vertices N = ${n}.`,
    activeNodes: [nodes[0].id],
    visitedNodes: [nodes[0].id],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(item => [item.id, `sz:${sz[item.id]}`])),
  });

  // Find centroid by moving to the heavy child
  let curr = nodes[0].id;
  let p: string | null = null;
  const tracePath: string[] = [curr];

  while (true) {
    let heavyChild: string | null = null;
    for (const v of adj.get(curr) || []) {
      if (v !== p && sz[v] > n / 2) {
        heavyChild = v;
        break;
      }
    }

    if (heavyChild) {
      p = curr;
      curr = heavyChild;
      tracePath.push(curr);
      steps.push({
        stepNumber: steps.length + 1,
        title: `Move to Heavy Subtree (Node ${nodeMap.get(curr)})`,
        description: `Subtree at ${nodeMap.get(curr)} has size ${sz[curr]} > ${n}/2. Centroid must lie inside this subtree.`,
        activeNodes: [curr],
        visitedNodes: [...tracePath],
        frontierNodes: [curr],
        highlightedEdges: [],
        nodeAnnotations: { [curr]: `sz:${sz[curr]} > N/2` },
        nodeColors: { [curr]: '#3b82f6' },
      });
    } else {
      break;
    }
  }

  const centroidId = curr;
  steps.push({
    stepNumber: steps.length + 1,
    title: `Centroid Found: Node ${nodeMap.get(centroidId)}`,
    description: `Removing Node ${nodeMap.get(centroidId)} splits the tree into components each of size <= ${n / 2}. Essential for Centroid Decomposition in O(N log N)!`,
    activeNodes: [centroidId],
    visitedNodes: nodes.map(item => item.id),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: { [centroidId]: 'Centroid' },
    nodeColors: { [centroidId]: '#10b981' },
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 13. LOWEST COMMON ANCESTOR (LCA - Binary Lifting)
// =====================================================================
export function runTreeLCA(data: GraphData, rootNodeId?: string): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const rootId = (rootNodeId && nodes.some(n => n.id === rootNodeId)) ? rootNodeId : nodes[0].id;
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  // Compute depth and 2^k parent lifting table
  const depth: Record<string, number> = {};
  const up: Record<string, string[]> = {};
  const LOGN = Math.max(1, Math.ceil(Math.log2(nodes.length + 1)));

  const dfsLCA = (u: string, p: string, d: number) => {
    depth[u] = d;
    up[u] = [p];
    for (let j = 1; j <= LOGN; j++) {
      const prev = up[u][j - 1];
      up[u][j] = up[prev] ? up[prev][j - 1] : prev;
    }
    for (const v of adj.get(u) || []) {
      if (v !== p) {
        dfsLCA(v, u, d + 1);
      }
    }
  };

  dfsLCA(rootId, rootId, 0);

  // Pick two distinct leaf nodes (or farthest nodes) for the query demonstration
  const leaves = nodes.filter(n => (adj.get(n.id) || []).length <= 1 && n.id !== rootId);
  const qA = leaves.length >= 2 ? leaves[0].id : (nodes[nodes.length - 1]?.id || rootId);
  const qB = leaves.length >= 2 ? leaves[leaves.length - 1].id : (nodes[1]?.id || rootId);

  steps.push({
    stepNumber: steps.length + 1,
    title: `LCA Binary Lifting (Root: Node ${nodeMap.get(rootId)})`,
    description: `Precomputed 2^k ancestors for all vertices up to 2^${LOGN}. Ready to query LCA of Node ${nodeMap.get(qA)} and Node ${nodeMap.get(qB)}.`,
    activeNodes: [qA, qB],
    visitedNodes: [rootId],
    frontierNodes: [qA, qB],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, `d:${depth[n.id]}`])),
    dataStructureView: {
      name: 'Binary Lifting (up[2^0, 2^1])',
      items: nodes.slice(0, 5).map(n => `${nodeMap.get(n.id)}: [${up[n.id].slice(0, 2).map(p => nodeMap.get(p)).join(', ')}]`),
    },
  });

  // Trace LCA calculation
  let u = qA;
  let v = qB;

  // 1. Equalize depths
  if (depth[u] < depth[v]) {
    const tmp = u;
    u = v;
    v = tmp;
  }

  const diff = depth[u] - depth[v];
  if (diff > 0) {
    for (let k = LOGN; k >= 0; k--) {
      if ((diff & (1 << k)) !== 0) {
        u = up[u][k];
      }
    }
    steps.push({
      stepNumber: steps.length + 1,
      title: `Step 1: Equalize Depths to ${depth[v]}`,
      description: `Lifted deeper node by ${diff} levels using binary powers. Both search pointers are now at depth ${depth[v]}.`,
      activeNodes: [u, v],
      visitedNodes: [qA, qB],
      frontierNodes: [u, v],
      highlightedEdges: [],
      nodeAnnotations: { [u]: `depth:${depth[u]}`, [v]: `depth:${depth[v]}` },
    });
  }

  // 2. Binary lift together
  let lcaNode = u;
  if (u === v) {
    lcaNode = u;
  } else {
    for (let k = LOGN; k >= 0; k--) {
      if (up[u][k] !== up[v][k]) {
        u = up[u][k];
        v = up[v][k];
      }
    }
    lcaNode = up[u][0];
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: `LCA Found: Node ${nodeMap.get(lcaNode)}`,
    description: `The Lowest Common Ancestor of ${nodeMap.get(qA)} and ${nodeMap.get(qB)} is Node ${nodeMap.get(lcaNode)} (depth ${depth[lcaNode]}). Distance = ${depth[qA] + depth[qB] - 2 * depth[lcaNode]}.`,
    activeNodes: [lcaNode, qA, qB],
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: {
      [lcaNode]: 'LCA',
      [qA]: 'Query A',
      [qB]: 'Query B',
    },
    nodeColors: {
      [lcaNode]: '#10b981',
      [qA]: '#3b82f6',
      [qB]: '#8b5cf6',
    },
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 14. BELLMAN-FORD SHORTEST PATH & NEGATIVE CYCLES
// =====================================================================
export function runBellmanFord(data: GraphData, startNodeId: string, isDirected: boolean): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  const dist: Record<string, number> = {};
  nodes.forEach(n => dist[n.id] = Infinity);
  dist[startNodeId] = 0;

  // Directed edge list
  const edgeList: { u: string; v: string; w: number; edgeId: string }[] = [];
  edges.forEach(e => {
    const w = getNumericEdgeWeight(e.weight, 1);
    edgeList.push({ u: e.source, v: e.target, w, edgeId: e.id });
    if (!isDirected && e.source !== e.target) {
      edgeList.push({ u: e.target, v: e.source, w, edgeId: e.id });
    }
  });

  steps.push({
    stepNumber: steps.length + 1,
    title: `Initialize Bellman-Ford from ${nodeMap.get(startNodeId)}`,
    description: `Set dist[${nodeMap.get(startNodeId)}] = 0 and all other vertices to infinity. We will relax all ${edgeList.length} edges up to V-1 (${nodes.length - 1}) rounds.`,
    activeNodes: [startNodeId],
    visitedNodes: [startNodeId],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: { [startNodeId]: 'd:0' },
  });

  const V = nodes.length;
  let relaxedAny = false;

  for (let round = 1; round <= Math.min(4, V - 1); round++) {
    relaxedAny = false;
    const roundEdges: { edgeId: string; color: string }[] = [];

    for (const { u, v, w, edgeId } of edgeList) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        relaxedAny = true;
        roundEdges.push({ edgeId, color: '#10b981' });
      }
    }

    steps.push({
      stepNumber: steps.length + 1,
      title: `Round ${round} of ${V - 1}`,
      description: relaxedAny
        ? `Relaxed edges in round ${round}. Updated shortest reach distances.`
        : `No edge was relaxed in round ${round}. Bellman-Ford converged to optimal shortest paths early!`,
      activeNodes: nodes.filter(n => dist[n.id] !== Infinity).map(n => n.id),
      visitedNodes: nodes.filter(n => dist[n.id] !== Infinity).map(n => n.id),
      frontierNodes: [],
      highlightedEdges: roundEdges,
      nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === Infinity ? 'd:∞' : `d:${dist[n.id]}`])),
      dataStructureView: {
        name: `Distances (Round ${round})`,
        items: nodes.map(n => `${nodeMap.get(n.id)}: ${dist[n.id] === Infinity ? '∞' : dist[n.id]}`),
      },
    });

    if (!relaxedAny) break;
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Bellman-Ford Completed',
    description: `Computed shortest paths from ${nodeMap.get(startNodeId)}. Confirmed no negative weight cycle reachable from source.`,
    activeNodes: [startNodeId],
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, dist[n.id] === Infinity ? 'd:∞' : `d:${dist[n.id]}`])),
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 15. PRIM'S MINIMUM SPANNING TREE ALGORITHM
// =====================================================================
export function runPrimMST(data: GraphData, startNodeId: string, isDirected: boolean = false): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const adj = new Map<string, { to: string; edgeId: string; weight: number }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    const w = getNumericEdgeWeight(e.weight, 1);
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id, weight: w });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id, weight: w });
  });

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  const inMST = new Set<string>([startNodeId]);
  const mstEdges: { edgeId: string; color: string }[] = [];
  let totalWeight = 0;

  steps.push({
    stepNumber: steps.length + 1,
    title: `Start Prim's MST from Node ${nodeMap.get(startNodeId)}`,
    description: `We grow the Minimum Spanning Tree from vertex ${nodeMap.get(startNodeId)}. At each step, we choose the smallest edge connecting the MST cut to an unvisited vertex.`,
    activeNodes: [startNodeId],
    visitedNodes: [startNodeId],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: { [startNodeId]: 'In MST' },
  });

  while (inMST.size < nodes.length) {
    let minEdge: { u: string; v: string; edgeId: string; weight: number } | null = null;

    for (const u of inMST) {
      for (const { to: v, edgeId, weight } of adj.get(u) || []) {
        if (!inMST.has(v)) {
          if (!minEdge || weight < minEdge.weight) {
            minEdge = { u, v, edgeId, weight };
          }
        }
      }
    }

    if (!minEdge) {
      // Graph is disconnected
      break;
    }

    inMST.add(minEdge.v);
    mstEdges.push({ edgeId: minEdge.edgeId, color: '#10b981' });
    totalWeight += minEdge.weight;

    steps.push({
      stepNumber: steps.length + 1,
      title: `Add Edge (${nodeMap.get(minEdge.u)} ↔ ${nodeMap.get(minEdge.v)}) [w:${minEdge.weight}]`,
      description: `Greedily selected minimum cut edge with weight ${minEdge.weight}. MST now contains ${inMST.size}/${nodes.length} vertices (Total cost = ${totalWeight}).`,
      activeNodes: [minEdge.u, minEdge.v],
      visitedNodes: Array.from(inMST),
      frontierNodes: [minEdge.v],
      highlightedEdges: [...mstEdges],
      nodeAnnotations: Object.fromEntries(Array.from(inMST).map(id => [id, 'In MST'])),
      dataStructureView: {
        name: 'Prim MST Edges',
        items: mstEdges.map((_, i) => `Edge ${i + 1}`),
      },
    });
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Prim MST Complete',
    description: `Minimum Spanning Tree contains ${mstEdges.length} edges with total weight = ${totalWeight}.`,
    activeNodes: Array.from(inMST),
    visitedNodes: Array.from(inMST),
    frontierNodes: [],
    highlightedEdges: [...mstEdges],
    nodeAnnotations: Object.fromEntries(Array.from(inMST).map(id => [id, 'In MST'])),
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 16. EULERIAN PATH / CIRCUIT (Hierholzer's Algorithm)
// =====================================================================
export function runEulerianPath(data: GraphData, isDirected: boolean): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0 || edges.length === 0) return steps;

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  const deg = new Map<string, number>();
  nodes.forEach(n => deg.set(n.id, 0));
  edges.forEach(e => {
    deg.set(e.source, (deg.get(e.source) || 0) + 1);
    deg.set(e.target, (deg.get(e.target) || 0) + 1);
  });

  const oddNodes = nodes.filter(n => ((deg.get(n.id) || 0) % 2) !== 0);
  const isCircuit = oddNodes.length === 0;
  const isPath = oddNodes.length === 2;

  if (!isCircuit && !isPath) {
    steps.push({
      stepNumber: 1,
      title: 'No Eulerian Path Exists',
      description: `Graph has ${oddNodes.length} vertices with odd degree (${oddNodes.map(n => `${nodeMap.get(n.id)}:deg=${deg.get(n.id)}`).join(', ')}). An Eulerian path requires exactly 0 or 2 odd-degree vertices.`,
      activeNodes: oddNodes.map(n => n.id),
      visitedNodes: [],
      frontierNodes: [],
      highlightedEdges: [],
      nodeAnnotations: Object.fromEntries(oddNodes.map(n => [n.id, 'Odd Deg'])),
      nodeColors: Object.fromEntries(oddNodes.map(n => [n.id, '#ef4444'])),
      isFinished: true,
    });
    return steps;
  }

  const startId = isPath ? oddNodes[0].id : nodes[0].id;
  steps.push({
    stepNumber: 1,
    title: isCircuit ? 'Eulerian Circuit Exists (All Even Degrees)' : 'Eulerian Path Exists (2 Odd Degrees)',
    description: `We will trace Hierholzer's algorithm visiting all ${edges.length} edges starting from Node ${nodeMap.get(startId)}.`,
    activeNodes: [startId],
    visitedNodes: [startId],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: { [startId]: 'Start' },
  });

  // Hierholzer's traversal
  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
  });

  const usedEdges = new Set<string>();
  const pathEdges: { edgeId: string; color: string }[] = [];
  let curr = startId;

  for (let step = 0; step < edges.length; step++) {
    const candidate = (adj.get(curr) || []).find(e => !usedEdges.has(e.edgeId));
    if (!candidate) break;

    usedEdges.add(candidate.edgeId);
    pathEdges.push({ edgeId: candidate.edgeId, color: '#10b981' });

    steps.push({
      stepNumber: steps.length + 1,
      title: `Step ${step + 1}: Traverse Edge to ${nodeMap.get(candidate.to)}`,
      description: `Moved ${nodeMap.get(curr)} → ${nodeMap.get(candidate.to)}. Edges traversed: ${pathEdges.length}/${edges.length}.`,
      activeNodes: [curr, candidate.to],
      visitedNodes: [curr, candidate.to],
      frontierNodes: [candidate.to],
      highlightedEdges: [...pathEdges],
      nodeAnnotations: { [candidate.to]: `#${step + 1}` },
    });

    curr = candidate.to;
  }

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Eulerian Traversal Complete',
    description: `Successfully traversed all ${edges.length} edges in a single continuous path without repeating any edge!`,
    activeNodes: [curr],
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: pathEdges,
    nodeAnnotations: { [curr]: 'End' },
    isFinished: true,
  });

  return steps;
}

// =====================================================================
// 17. MAXIMUM BIPARTITE MATCHING (Kuhn's Algorithm)
// =====================================================================
export function runMaxBipartiteMatching(data: GraphData): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const nodes = data.nodes;
  const edges = data.edges;
  if (nodes.length === 0) return steps;

  const nodeMap = new Map<string, string>();
  nodes.forEach(n => nodeMap.set(n.id, n.label));

  // 1. Check bipartite 2-coloring
  const adj = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
  });

  const color: Record<string, number> = {};
  let isBipartite = true;

  for (const n of nodes) {
    if (color[n.id] === undefined && isBipartite) {
      color[n.id] = 0;
      const q = [n.id];
      while (q.length > 0 && isBipartite) {
        const u = q.shift()!;
        for (const { to: v } of adj.get(u) || []) {
          if (color[v] === undefined) {
            color[v] = 1 - color[u];
            q.push(v);
          } else if (color[v] === color[u]) {
            isBipartite = false;
            break;
          }
        }
      }
    }
  }

  if (!isBipartite) {
    steps.push({
      stepNumber: 1,
      title: 'Graph is Not Bipartite',
      description: 'Maximum Bipartite Matching requires a 2-colorable graph without odd-length cycles.',
      activeNodes: [],
      visitedNodes: [],
      frontierNodes: [],
      highlightedEdges: [],
      nodeAnnotations: {},
      isFinished: true,
    });
    return steps;
  }

  const leftNodes = nodes.filter(n => color[n.id] === 0);
  const rightNodes = nodes.filter(n => color[n.id] === 1);

  steps.push({
    stepNumber: steps.length + 1,
    title: 'Bipartite Partition: Kuhn Matching',
    description: `Partitioned graph into Set A (Left: ${leftNodes.length} nodes, Blue) and Set B (Right: ${rightNodes.length} nodes, Pink). We will find maximum matching using augmenting paths.`,
    activeNodes: [],
    visitedNodes: [],
    frontierNodes: [],
    highlightedEdges: [],
    nodeAnnotations: Object.fromEntries(nodes.map(n => [n.id, color[n.id] === 0 ? 'Left' : 'Right'])),
    nodeColors: Object.fromEntries(nodes.map(n => [n.id, color[n.id] === 0 ? '#3b82f6' : '#ec4899'])),
  });

  // Kuhn's algorithm
  const matchR: Record<string, string> = {}; // Right node -> Left node
  const matchEdge: Record<string, string> = {}; // Right node -> Edge ID

  const visited = new Set<string>();
  const kuhnDFS = (u: string): boolean => {
    for (const { to: v, edgeId } of adj.get(u) || []) {
      if (!visited.has(v)) {
        visited.add(v);
        if (!matchR[v] || kuhnDFS(matchR[v])) {
          matchR[v] = u;
          matchEdge[v] = edgeId;
          return true;
        }
      }
    }
    return false;
  };

  let matchCount = 0;
  for (const left of leftNodes) {
    visited.clear();
    if (kuhnDFS(left.id)) {
      matchCount++;
      const currentMatchedEdges = Object.values(matchEdge).map(edgeId => ({ edgeId, color: '#10b981' }));

      steps.push({
        stepNumber: steps.length + 1,
        title: `Matched Node ${nodeMap.get(left.id)}`,
        description: `Found augmenting path for ${nodeMap.get(left.id)}. Current matching size: ${matchCount}.`,
        activeNodes: [left.id],
        visitedNodes: Object.values(matchR),
        frontierNodes: [],
        highlightedEdges: currentMatchedEdges,
        nodeAnnotations: Object.fromEntries(Object.entries(matchR).flatMap(([r, l]) => [[l, `↔ ${nodeMap.get(r)}`], [r, `↔ ${nodeMap.get(l)}`]])),
        nodeColors: Object.fromEntries(nodes.map(n => [n.id, color[n.id] === 0 ? '#3b82f6' : '#ec4899'])),
        dataStructureView: {
          name: 'Current Matching',
          items: Object.entries(matchR).map(([r, l]) => `${nodeMap.get(l)} ↔ ${nodeMap.get(r)}`),
        },
      });
    }
  }

  const finalMatchedEdges = Object.values(matchEdge).map(edgeId => ({ edgeId, color: '#10b981' }));
  steps.push({
    stepNumber: steps.length + 1,
    title: `Maximum Matching Complete! Size = ${matchCount}`,
    description: `Maximum cardinality matching found with ${matchCount} pairs. By Konig's theorem, minimum vertex cover size is also ${matchCount}.`,
    activeNodes: [],
    visitedNodes: nodes.map(n => n.id),
    frontierNodes: [],
    highlightedEdges: finalMatchedEdges,
    nodeAnnotations: Object.fromEntries(Object.entries(matchR).flatMap(([r, l]) => [[l, `Matched`], [r, `Matched`]])),
    nodeColors: Object.fromEntries(nodes.map(n => [n.id, (matchR[n.id] || Object.values(matchR).includes(n.id)) ? '#10b981' : '#64748b'])),
    isFinished: true,
  });

  return steps;
}
