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
  Plus,
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
  onSetCustomNodeCount?: (count: number | null) => void;
  onAddSingleNode?: (name?: string) => void;
  theme?: 'dark' | 'light';
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
  onSetCustomNodeCount,
  onAddSingleNode,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'editor' | 'algorithms' | 'presets'>('editor');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>('bfs');
  const [startNodeId, setStartNodeId] = useState<string>(data.nodes[0]?.id || (settings.isZeroIndexed ? '0' : '1'));
  const [copied, setCopied] = useState(false);
  const [singleNodeInput, setSingleNodeInput] = useState('');

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
  const insertTemplate = (type: 'edge_list' | 'weighted' | 'tree' | 'clear' | 'single' | 'mixed') => {
    if (type === 'single') {
      onRawTextChange(`A`);
    } else if (type === 'mixed') {
      onRawTextChange(`A true 5\ntrue 42 3\n42 Alice 8\nAlice false 2\nSingleChar`);
    } else if (type === 'edge_list') {
      onRawTextChange(`1 2\n1 3\n2 4\n2 5\n3 6\n3 7`);
    } else if (type === 'weighted') {
      onRawTextChange(`1 2 4\n1 3 2\n2 4 5\n3 4 1\n4 5 3\n1 [10]\n2 [25]\n3 [15]\n4 [50]\n5 [30]`);
    } else if (type === 'tree') {
      onRawTextChange(`1 2\n1 3\n2 4\n2 5\n3 6`);
    } else if (type === 'clear') {
      onRawTextChange(``);
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
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'presets'
              ? 'text-blue-500 bg-blue-500/10'
              : isLight
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Graph Generators"
        >
          <Sparkles size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`w-80 border-r flex flex-col z-10 select-none shrink-0 h-full overflow-hidden transition-colors ${
      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
    }`}>
      {/* Classic Tab Header */}
      <div className={`h-12 border-b flex items-center justify-between px-3 shrink-0 ${
        isLight ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-black'
      }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <FileCode2 size={13} />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('algorithms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'algorithms'
                ? 'bg-blue-600 text-white shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Cpu size={13} />
            <span>Algorithms</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-blue-600 text-white shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sparkles size={13} />
            <span>Presets</span>
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
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
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              isLight ? 'text-slate-500' : 'text-neutral-400'
            }`}>
              Graph Input & Counts
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyInput}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200 shadow-2xs'
                    : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
                }`}
                title="Copy Raw Edges"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Auto-detected Nodes & Edges Text Fields */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {/* Nodes Text Field */}
            <div className={`border rounded-lg p-2.5 flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  isLight ? 'text-slate-600' : 'text-neutral-300'
                }`}>
                  <Hash size={12} className="text-blue-500" />
                  <span>Nodes (N)</span>
                </label>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-blue-950/70 text-blue-300 border border-blue-900/40'
                }`}>
                  Auto
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={data.nodes.length}
                className="bg-transparent text-sm font-mono font-bold text-blue-500 focus:outline-none w-full cursor-default"
                title="Total nodes (auto-detected from edges)"
              />
            </div>

            {/* Edges Text Field */}
            <div className={`border rounded-lg p-2.5 flex flex-col gap-1 ${
              isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                  isLight ? 'text-slate-600' : 'text-neutral-300'
                }`}>
                  <Share2 size={12} className="text-emerald-500" />
                  <span>Edges (M)</span>
                </label>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/70 text-emerald-300 border border-emerald-900/40'
                }`}>
                  Auto
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={data.edges.length}
                className="bg-transparent text-sm font-mono font-bold text-emerald-500 focus:outline-none w-full cursor-default"
                title="Total edges (auto-detected from edge list)"
              />
            </div>
          </div>

          {/* Quick Add Single Node Input */}
          <div className={`flex items-center gap-1.5 mb-2 p-1.5 rounded-lg border ${
            isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-neutral-950 border-neutral-800'
          }`}>
            <input
              type="text"
              value={singleNodeInput}
              onChange={e => setSingleNodeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onAddSingleNode?.(singleNodeInput);
                  setSingleNodeInput('');
                }
              }}
              placeholder="Add node (e.g. A, A: 10, 42, city)"
              className={`flex-1 bg-transparent text-xs font-mono px-2 py-0.5 focus:outline-none min-w-0 ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-neutral-100 placeholder:text-neutral-600'
              }`}
            />
            <button
              onClick={() => {
                onAddSingleNode?.(singleNodeInput);
                setSingleNodeInput('');
              }}
              className="px-2 py-1 text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
              title="Add Single Node (Supports weights e.g. A: 10, A [10])"
            >
              <Plus size={12} />
              <span>Node</span>
            </button>
          </div>

          {/* Edges Header & Quick Templates */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-medium flex items-center gap-1.5 ${
              isLight ? 'text-slate-700' : 'text-neutral-300'
            }`}>
              <span>Input</span>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>(u v [w] or u [w])</span>
            </span>
            <button
              type="button"
              onClick={() => insertTemplate('clear')}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors whitespace-nowrap cursor-pointer ${
                isLight
                  ? 'text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border-slate-200 hover:border-red-200'
                  : 'text-neutral-400 hover:text-red-400 bg-neutral-950 hover:bg-red-950/30 border-neutral-800 hover:border-red-500/30'
              }`}
              title="Clear input"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2">
            <button
              type="button"
              onClick={() => insertTemplate('single')}
              className={`py-1 px-1 rounded text-[10px] font-medium border text-center transition-colors truncate cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300 hover:border-emerald-500/40'
              }`}
              title="Single node (e.g. A)"
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('mixed')}
              className={`py-1 px-1 rounded text-[10px] font-medium border text-center transition-colors truncate cursor-pointer ${
                isLight
                  ? 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                  : 'bg-purple-950/30 border-purple-800/40 text-purple-300 hover:border-purple-500/40'
              }`}
              title="Mixed types (Char, String, Bool, Int)"
            >
              Mixed
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('edge_list')}
              className={`py-1 px-1 rounded text-[10px] font-medium border text-center transition-colors truncate cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-blue-500/40'
              }`}
              title="Sample tree / edge list"
            >
              Sample
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('weighted')}
              className={`py-1 px-1 rounded text-[10px] font-medium border text-center transition-colors truncate cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-blue-500/40'
              }`}
              title="Weighted graph & nodes"
            >
              Weighted
            </button>
          </div>

          {/* Monospace Code Editor Area for Pure Edges & Single Nodes */}
          <div className={`flex-1 relative flex flex-col border rounded-lg overflow-hidden focus-within:border-blue-500 ${
            isLight ? 'bg-white border-slate-300 shadow-inner' : 'bg-neutral-950 border-neutral-800'
          }`}>
            <textarea
              value={rawText}
              onChange={e => onRawTextChange(e.target.value)}
              placeholder={`# Edges (u v [w]):\n1 2\n2 3 5\n\n# Weighted nodes (u [w] or u: w):\n1 [10]\n2: 'A'\n3: "goal"\n\n# Isolated node:\nSingleNode`}
              spellCheck={false}
              className={`flex-1 w-full p-3 bg-transparent text-xs font-mono focus:outline-none resize-none leading-relaxed ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-neutral-100 placeholder:text-neutral-600'
              }`}
            />
          </div>
          <div className={`pt-1.5 px-0.5 flex items-center justify-between text-[10px] font-mono ${
            isLight ? 'text-slate-500' : 'text-neutral-500'
          }`}>
            <span>Supports Weighted Nodes, Chars, Strings & CP inputs</span>
          </div>
        </div>
      )}

      {/* TAB 2: CP Algorithms & Tracer */}
      {activeTab === 'algorithms' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div>
            <label className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${
              isLight ? 'text-slate-600' : 'text-neutral-400'
            }`}>
              Algorithm to Run
            </label>
            <select
              value={selectedAlgo}
              onChange={e => setSelectedAlgo(e.target.value as AlgorithmType)}
              className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-sans cursor-pointer ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-950 border-neutral-800 text-neutral-200'
              }`}
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
              <label className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${
                isLight ? 'text-slate-600' : 'text-neutral-400'
              }`}>
                Starting Vertex
              </label>
              <select
                value={startNodeId}
                onChange={e => setStartNodeId(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono cursor-pointer ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                }`}
              >
                {data.nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    Node {n.label} {n.nodeType ? `[${n.nodeType}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Algorithm Info Card */}
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
            isLight ? 'bg-white border-slate-200 text-slate-600 shadow-2xs' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
          }`}>
            <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>Algorithm Details:</div>
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
            className="w-full mt-auto py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
          <div className={`space-y-3 p-3 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-2xs text-slate-800' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
          }`}>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Vertices (N)</span>
                <span className="font-mono text-blue-500 font-semibold">{presetN}</span>
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
              <div className="flex justify-between text-xs mb-1">
                <span>Edges (M, for DAG)</span>
                <span className="font-mono text-blue-500 font-semibold">{presetM}</span>
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

            <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
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
            {[
              {
                title: 'Bamboo / Line Graph',
                desc: 'Tests linear chains & recursion limit',
                action: () => generateBamboo({ n: presetN, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
              {
                title: 'Star Graph',
                desc: 'Central hub connected to all leaves',
                action: () => generateStar({ n: presetN, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
              {
                title: 'Random Tree',
                desc: 'Connected acyclic graph',
                action: () => generateRandomTree({ n: presetN, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
              {
                title: 'Random DAG',
                desc: 'Directed Acyclic Graph for topological sorting',
                action: () => generateRandomDAG({ n: presetN, m: presetM, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
              {
                title: 'Complete Clique (K_n)',
                desc: 'Every vertex connected to every other vertex',
                action: () => generateComplete({ n: presetN, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
              {
                title: 'Grid Lattice',
                desc: '2D matrix / coordinate grid graph',
                action: () => generateGrid({ r: 3, c: 4, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
              {
                title: 'Cycle Graph (C_n)',
                desc: 'Single closed cycle / ring',
                action: () => generateCycle({ n: presetN, weighted: presetWeighted, isZeroIndexed: settings.isZeroIndexed }),
              },
            ].map(preset => (
              <button
                key={preset.title}
                onClick={() => {
                  const res = preset.action();
                  onLoadPreset(res.data, res.settings);
                }}
                className={`w-full text-left p-2.5 border rounded-lg transition-colors group cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-2xs'
                    : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 text-neutral-200'
                }`}
              >
                <div className={`text-xs font-semibold group-hover:text-blue-500 ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>
                  {preset.title}
                </div>
                <div className={`text-[10.5px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
