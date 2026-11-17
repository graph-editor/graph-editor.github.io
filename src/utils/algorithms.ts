import { GraphData, GraphStats, AlgorithmStep } from '../types/graph';

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
    const w = e.weight !== undefined ? e.weight : 1;
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
  edges.sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

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
    const w = edge.weight ?? 1;

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
