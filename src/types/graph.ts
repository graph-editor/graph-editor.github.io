export type NodeType = 'int' | 'char' | 'bool' | 'string';

export interface GraphNode {
  id: string;
  label: string;
  nodeType?: NodeType;
  index: number; // 0-based or 1-based index integer
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  color: string;
  weight?: string | number; // Node weight (value, char, or string)
  value?: string | number; // Backward-compatible alias for weight
  annotation?: string;
  badge?: string; // e.g. "Root", "Cut", "LCA"
  graphIndex?: number; // 0-based testcase/graph index for multi-graph mode
}

export interface GraphEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  weight?: number;
  color: string;
  directed: boolean;
  highlighted?: boolean;
  highlightColor?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  label?: string;
  parallelIndex?: number;
  parallelTotal?: number;
  graphIndex?: number; // 0-based testcase/graph index for multi-graph mode
}

export interface GraphTab {
  id: string;
  name: string;
  text: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type LayoutMode = 'force' | 'tree' | 'dag' | 'bipartite' | 'circular' | 'grid';

export interface GraphSettings {
  isDirected: boolean;
  isWeighted: boolean;
  isZeroIndexed: boolean;
  layout: LayoutMode;
  treeRootId?: string;
  nodeCountPreserved?: number; // Preserves isolated nodes when specified
  hasHeader?: boolean; // When true, line 1 is parsed as N M header; when false (default), every line is an edge
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  componentCount: number;
  isTree: boolean;
  isForest: boolean;
  isDAG: boolean;
  isBipartite: boolean;
  hasSelfLoops: boolean;
  hasMultiEdges: boolean;
  degrees: { min: number; max: number; avg: number };
}

export interface AlgorithmStep {
  stepNumber: number;
  title: string;
  description: string;
  activeNodes: string[]; // currently being processed (e.g. orange ring)
  visitedNodes: string[]; // marked done
  frontierNodes: string[]; // in queue or stack
  highlightedEdges: { edgeId: string; color?: string; style?: 'solid' | 'dashed' }[];
  nodeAnnotations: Record<string, string>; // e.g. "dist: 4", "tin: 1", "low: 1"
  nodeColors?: Record<string, string>; // e.g. component colors or bipartite colors
  edgeColors?: Record<string, string>;
  dataStructureView?: {
    name: string; // e.g. "Queue", "Priority Queue", "Call Stack", "DSU"
    items: string[];
  };
  variables?: Record<string, string | number>;
  isFinished?: boolean;
}

export type AlgorithmType =
  | 'bfs'
  | 'dfs'
  | 'dijkstra'
  | 'bellman_ford'
  | 'toposort'
  | 'tarjan_scc'
  | 'bridges_articulations'
  | 'kruskal_mst'
  | 'prim_mst'
  | 'bipartite_check'
  | 'max_bipartite_matching'
  | 'eulerian_path'
  | 'tree_diameter'
  | 'tree_lca'
  | 'tree_subtree_dp'
  | 'tree_mis_dp'
  | 'tree_centroid';

export type InputFormat = 'edge_list' | 'parent_array' | 'adj_matrix' | 'adj_list';
