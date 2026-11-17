import React, { useState } from 'react';
import {
  FileCode2,
  Cpu,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
  Play,
  Share2,
  Hash,
  ArrowRight,
  Sliders,
  Flame,
} from 'lucide-react';
import { GraphData, GraphSettings, AlgorithmType } from '../types/graph';
import {
  generateBamboo,
  generateStar,
  generateComplete,
  generateRandomTree,
  generateRandomDAG,
  generateGrid,
  generateCycle,
} from '../utils/generators';

interface LeftPanelProps {
  rawText: string;
  onRawTextChange: (text: string) => void;
  data: GraphData;
  settings: GraphSettings;
  onRunAlgorithm: (algo: AlgorithmType, startNodeId: string) => void;
  onLoadPreset: (newData: GraphData, newSettings: Partial<GraphSettings>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  rawText,
  onRawTextChange,
  data,
  settings,
  onRunAlgorithm,
  onLoadPreset,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'algorithms' | 'presets'>('editor');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>('bfs');
  const [startNodeId, setStartNodeId] = useState<string>(data.nodes[0]?.id || (settings.isZeroIndexed ? '0' : '1'));
  const [copied, setCopied] = useState(false);

  // Generator parameters
  const [presetN, setPresetN] = useState<number>(7);
  const [presetM, setPresetM] = useState<number>(10);
  const [presetWeighted, setPresetWeighted] = useState<boolean>(settings.isWeighted);

  const handleCopyInput = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRunAlgorithm = () => {
    const validStart = data.nodes.some(n => n.id === startNodeId)
      ? startNodeId
      : data.nodes[0]?.id || (settings.isZeroIndexed ? '0' : '1');
    onRunAlgorithm(selectedAlgo, validStart);
  };

  // Quick template inserters
  const insertTemplate = (type: 'edge_list' | 'weighted' | 'tree' | 'matrix') => {
    if (type === 'edge_list') {
      onRawTextChange(`5 4\n1 2\n1 3\n2 4\n2 5`);
    } else if (type === 'weighted') {
      onRawTextChange(`5 5\n1 2 4\n1 3 2\n2 4 5\n3 4 1\n4 5 3`);
    } else if (type === 'tree') {
      onRawTextChange(`6\n1 1 2 2 3`);
    } else if (type === 'matrix') {
      onRawTextChange(`0 1 1 0\n1 0 0 1\n1 0 0 1\n0 1 1 0`);
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 border-r border-slate-800 bg-[#0c1019] flex flex-col items-center py-3.5 gap-4 z-10 select-none shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-5 h-[1px] bg-slate-800" />
        <button
          onClick={() => {
            setActiveTab('editor');
            onToggleCollapse();
          }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'editor' ? 'text-blue-400 bg-blue-950/50' : 'text-slate-400 hover:text-white'
          }`}
          title="I/O Editor"
        >
          <FileCode2 size={18} />
        </button>
        <button
          onClick={() => {
            setActiveTab('algorithms');
            onToggleCollapse();
          }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'algorithms' ? 'text-blue-400 bg-blue-950/50' : 'text-slate-400 hover:text-white'
          }`}
          title="CP Algorithms"
        >
          <Cpu size={18} />
        </button>
        <button
          onClick={() => {
            setActiveTab('presets');
            onToggleCollapse();
          }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'presets' ? 'text-blue-400 bg-blue-950/50' : 'text-slate-400 hover:text-white'
          }`}
          title="Graph Generators"
        >
          <Sparkles size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-r border-slate-800 bg-[#0c1019] flex flex-col z-10 select-none shrink-0 h-full overflow-hidden">
      {/* Classic Tab Header */}
      <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode2 size={13} />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('algorithms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'algorithms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu size={13} />
            <span>Algorithms</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'presets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles size={13} />
            <span>Presets</span>
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-md transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* TAB 1: Classic CP Text Editor */}
      {activeTab === 'editor' && (
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          {/* Quick Format & Action Row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Testcase Input
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyInput}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                title="Copy Raw Text"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Template Quick Buttons */}
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5">
            <button
              onClick={() => insertTemplate('edge_list')}
              className="text-[10px] text-slate-400 hover:text-blue-400 bg-slate-950 border border-slate-800/80 hover:border-blue-500/30 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              Edges
            </button>
            <button
              onClick={() => insertTemplate('weighted')}
              className="text-[10px] text-slate-400 hover:text-blue-400 bg-slate-950 border border-slate-800/80 hover:border-blue-500/30 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              Weighted
            </button>
            <button
              onClick={() => insertTemplate('tree')}
              className="text-[10px] text-slate-400 hover:text-blue-400 bg-slate-950 border border-slate-800/80 hover:border-blue-500/30 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              Tree Parent
            </button>
            <button
              onClick={() => insertTemplate('matrix')}
              className="text-[10px] text-slate-400 hover:text-blue-400 bg-slate-950 border border-slate-800/80 hover:border-blue-500/30 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              Matrix
            </button>
          </div>

          {/* Monospace Code Editor Area */}
          <div className="flex-1 relative flex flex-col bg-[#070a10] border border-slate-800 rounded-lg overflow-hidden focus-within:border-blue-500/50">
            <textarea
              value={rawText}
              onChange={e => onRawTextChange(e.target.value)}
              placeholder={`5 4\n1 2\n1 3\n2 4\n2 5`}
              spellCheck={false}
              className="flex-1 w-full p-3 bg-transparent text-xs font-mono text-slate-200 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Format Reference Card */}
          <div className="mt-2.5 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-300 text-[10.5px]">
              <span>Supported Formats:</span>
              <span className="text-[10px] text-blue-400 font-mono">Auto-detect</span>
            </div>
            <ul className="space-y-0.5 text-[10.5px] font-mono text-slate-400">
              <li><span className="text-blue-400">N M</span> then <span className="text-slate-300">u v [w]</span> (with header)</li>
              <li><span className="text-slate-300">u v [w]</span> (headerless edge list)</li>
              <li><span className="text-blue-400">N</span> then <span className="text-slate-300">p2 p3 ... pn</span> (tree parent)</li>
              <li><span className="text-slate-300">N x N</span> matrix of weights or 0/1</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: CP Algorithms & Tracer */}
      {activeTab === 'algorithms' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Algorithm to Run
            </label>
            <select
              value={selectedAlgo}
              onChange={e => setSelectedAlgo(e.target.value as AlgorithmType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
            >
              <optgroup label="Traversals">
                <option value="bfs">BFS (Breadth-First Search)</option>
                <option value="dfs">DFS (Depth-First Search & Cycles)</option>
              </optgroup>
              <optgroup label="Shortest Paths">
                <option value="dijkstra">Dijkstra Shortest Path</option>
              </optgroup>
              <optgroup label="DAG & Order">
                <option value="toposort">Topological Sort (Kahn's)</option>
              </optgroup>
              <optgroup label="Connectivity">
                <option value="tarjan_scc">Tarjan's SCC (Strongly Connected)</option>
                <option value="bridges_articulations">Bridges & Articulation Points</option>
              </optgroup>
              <optgroup label="Spanning Trees & Coloring">
                <option value="kruskal_mst">Kruskal's MST (Spanning Tree)</option>
                <option value="bipartite_check">Bipartite 2-Coloring Check</option>
              </optgroup>
            </select>
          </div>

          {['bfs', 'dfs', 'dijkstra'].includes(selectedAlgo) && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Starting Vertex
              </label>
              <select
                value={startNodeId}
                onChange={e => setStartNodeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                {data.nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    Node {n.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Algorithm Info Card */}
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-200 text-xs">Algorithm Details:</div>
            {selectedAlgo === 'bfs' && (
              <p className="text-[11px] leading-relaxed">
                Computes unweighted shortest path distances from source. Explores layer-by-layer using FIFO queue.
              </p>
            )}
            {selectedAlgo === 'dfs' && (
              <p className="text-[11px] leading-relaxed">
                Recursive exploration. Classifies tree edges and identifies back edges (cycles) with discovery/exit timestamps.
              </p>
            )}
            {selectedAlgo === 'dijkstra' && (
              <p className="text-[11px] leading-relaxed">
                Greedy shortest paths for weighted graphs. Simulates priority queue relaxations and builds shortest path tree.
              </p>
            )}
            {selectedAlgo === 'toposort' && (
              <p className="text-[11px] leading-relaxed">
                Linear ordering of vertices in a DAG using in-degree array. Immediately flags if a directed cycle exists.
              </p>
            )}
            {selectedAlgo === 'tarjan_scc' && (
              <p className="text-[11px] leading-relaxed">
                Finds all maximal strongly connected subgraphs in linear time. Colors each independent component distinctly.
              </p>
            )}
            {selectedAlgo === 'bridges_articulations' && (
              <p className="text-[11px] leading-relaxed">
                Identifies critical cut edges and articulation vertices whose removal disconnects the graph.
              </p>
            )}
            {selectedAlgo === 'kruskal_mst' && (
              <p className="text-[11px] leading-relaxed">
                Sorts edges by weight and uses Disjoint Set Union (DSU) to build the minimum spanning tree without cycles.
              </p>
            )}
            {selectedAlgo === 'bipartite_check' && (
              <p className="text-[11px] leading-relaxed">
                Attempts 2-coloring. Confirms bipartite graph partition (Set A / Set B) or highlights the odd-length cycle conflict.
              </p>
            )}
          </div>

          <button
            onClick={handleRunAlgorithm}
            disabled={data.nodes.length === 0}
            className="w-full mt-auto py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
          >
            <Play size={14} className="fill-white" />
            <span>Launch Algorithm Tracer</span>
          </button>
        </div>
      )}

      {/* TAB 3: CP Presets & Generators */}
      {activeTab === 'presets' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {/* Controls */}
          <div className="space-y-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Vertices (N)</span>
                <span className="font-mono text-blue-400 font-semibold">{presetN}</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                value={presetN}
                onChange={e => setPresetN(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Edges (M, for DAG)</span>
                <span className="font-mono text-blue-400 font-semibold">{presetM}</span>
              </div>
              <input
                type="range"
                min="2"
                max="35"
                value={presetM}
                onChange={e => setPresetM(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={presetWeighted}
                onChange={e => setPresetWeighted(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>Generate Random Weights [1..10]</span>
            </label>
          </div>

          {/* Preset Buttons Grid */}
          <div className="space-y-2">
            <button
              onClick={() => {
                const res = generateBamboo({
                  n: presetN,
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Bamboo / Line Graph
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">Tests linear chains & recursion limit</div>
            </button>

            <button
              onClick={() => {
                const res = generateStar({
                  n: presetN,
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Star Graph
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">Central hub connected to all leaves</div>
            </button>

            <button
              onClick={() => {
                const res = generateRandomTree({
                  n: presetN,
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Random Tree
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">Connected acyclic graph</div>
            </button>

            <button
              onClick={() => {
                const res = generateRandomDAG({
                  n: presetN,
                  m: presetM,
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Random DAG
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">Directed acyclic graph for topological DP</div>
            </button>

            <button
              onClick={() => {
                const res = generateComplete({
                  n: Math.min(presetN, 12),
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Complete Graph (K_n)
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">Every pair of vertices connected</div>
            </button>

            <button
              onClick={() => {
                const res = generateGrid({
                  r: 3,
                  c: 4,
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                3x4 Grid Lattice
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">2D matrix BFS / maze problems</div>
            </button>

            <button
              onClick={() => {
                const res = generateCycle({
                  n: presetN,
                  weighted: presetWeighted,
                  isZeroIndexed: settings.isZeroIndexed,
                });
                onLoadPreset(res.data, res.settings);
              }}
              className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Simple Cycle (C_n)
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">Tests 2-coloring & cycle detection</div>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
