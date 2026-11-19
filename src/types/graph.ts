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
  isPinned?: boolean; // When true, node is fixed in place and won't move with physics or layouts
  color: string;
  weight?: string | number; // Node weight (value, char, or string)
  value?: string | number; // Backward-compatible alias for weight
  annotation?: string;
  badge?: string; // e.g. "Root", "Cut", "LCA"
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
  | 'toposort'
  | 'tarjan_scc'
  | 'bridges_articulations'
  | 'kruskal_mst'
  | 'bipartite_check'
  | 'tree_diameter'
  | 'tree_lca';

export type InputFormat = 'edge_list' | 'parent_array' | 'adj_matrix' | 'adj_list';
