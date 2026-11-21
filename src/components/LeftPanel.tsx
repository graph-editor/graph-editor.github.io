import React, { useState, useMemo } from 'react';
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
  X,
} from 'lucide-react';
import { GraphData, GraphSettings, AlgorithmType, GraphTab } from '../types/graph';
import { detectMultiTestcases } from '../utils/contestParser';
import { ImportModal } from './ImportModal';
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
  onToggleHeaderMode?: (hasHeader: boolean) => void;
  theme?: 'dark' | 'light';
  tabs?: GraphTab[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  onAddTab?: () => void;
  onCloseTab?: (id: string) => void;
  onSplitMultiTestcases?: (cases: { name: string; text: string }[]) => void;
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
  onToggleHeaderMode,
  theme = 'dark',
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onSplitMultiTestcases,
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'editor' | 'algorithms' | 'presets'>('editor');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>('bfs');
  const [startNodeId, setStartNodeId] = useState<string>(data.nodes[0]?.id || (settings.isZeroIndexed ? '0' : '1'));
  const [copied, setCopied] = useState(false);
  const [singleNodeInput, setSingleNodeInput] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Auto-detect multi-testcase inputs in the current raw text
  const multiTestcaseDetection = useMemo(() => detectMultiTestcases(rawText), [rawText]);

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
      onRawTextChange(`1 2 4\n1 3 2\n2 4 5\n3 4 1\n4 5 3`);
    } else if (type === 'tree') {
      onRawTextChange(`1 2\n1 3\n2 4\n2 5\n3 6`);
    } else if (type === 'clear') {
      onRawTextChange(``);
    }
  };

  if (isCollapsed) {
    return (
      <aside className={`w-11 sm:w-12 border-r flex flex-col items-center py-3.5 gap-3.5 z-10 select-none shrink-0 transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-black border-neutral-800 text-neutral-300'
      }`}>
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Expand Sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <div className={`w-5 h-[1px] ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />
        <button
          onClick={() => {
            setActiveTab('editor');
            onToggleCollapse();
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'editor'
              ? 'text-blue-500 bg-blue-500/10'
              : isLight
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-neutral-400 hover:text-white'
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
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'algorithms'
              ? 'text-blue-500 bg-blue-500/10'
              : isLight
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-neutral-400 hover:text-white'
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
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        onClick={onToggleCollapse}
        aria-hidden="true"
      />

      <aside className={`fixed inset-y-0 left-0 z-40 w-[88vw] max-w-xs md:relative md:inset-auto md:w-80 md:z-10 border-r flex flex-col select-none shrink-0 h-full overflow-hidden shadow-2xl md:shadow-none animate-slide-right md:animate-none transition-colors ${
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
          {/* Multi-Graph / Test Cases Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2.5 shrink-0">
              {tabs.map((tab, idx) => {
                const isActive = activeTabId === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => onSelectTab?.(tab.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border transition-all shrink-0 ${
                      isActive
                        ? (isLight ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold' : 'bg-blue-600 text-white border-blue-500 shadow-xs font-semibold')
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>{tab.name || `Graph ${idx + 1}`}</span>
                    {tabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseTab?.(tab.id);
                        }}
                        className={`p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                          isActive ? 'hover:bg-blue-700 text-white' : 'hover:bg-neutral-700/50'
                        }`}
                        title="Remove Graph"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={onAddTab}
                className={`flex items-center justify-center px-2 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                  isLight
                    ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                }`}
                title="Add New Graph / Test Case"
              >
                <Plus size={13} className="mr-0.5" />
                <span>New</span>
              </button>
            </div>
          )}

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
                <button
                  type="button"
                  onClick={() => onSetCustomNodeCount?.(null)}
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                    settings.nodeCountPreserved
                      ? (isLight ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200' : 'bg-amber-950/70 hover:bg-amber-900/70 text-amber-300 border border-amber-900/40')
                      : (isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-blue-950/70 text-blue-300 border border-blue-900/40')
                  }`}
                  title={settings.nodeCountPreserved ? 'Click to reset to Auto' : 'Auto-detected'}
                >
                  {settings.nodeCountPreserved ? 'Custom ✕' : 'Auto'}
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={settings.nodeCountPreserved ?? data.nodes.length}
                onChange={e => {
                  const val = e.target.value.trim();
                  if (val === '') {
                    onSetCustomNodeCount?.(null);
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num >= 0) {
                      onSetCustomNodeCount?.(num);
                    }
                  }
                }}
                className={`bg-transparent text-sm font-mono font-bold focus:outline-none w-full ${
                  settings.nodeCountPreserved ? 'text-amber-500' : 'text-blue-500'
                }`}
                title="Total nodes (Auto-detected from graph, or type custom N)"
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
              <span>Edges List</span>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>(u v [w])</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className={`text-[9.5px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer font-sans flex items-center gap-1 ${
                  isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-2xs font-medium'
                    : 'bg-blue-950/40 border-blue-500/30 text-blue-300 hover:bg-blue-900/40 font-medium'
                }`}
                title="Import LeetCode [[u,v]], Parent Array, or Multi-Testcase CP Input"
              >
                <FileCode2 size={11} />
                <span>Import</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleHeaderMode?.(!settings.hasHeader)}
                className={`text-[9.5px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer font-sans ${
                  settings.hasHeader
                    ? (isLight ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold shadow-2xs' : 'bg-amber-950/70 border-amber-500/40 text-amber-300 font-semibold')
                    : (isLight ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200')
                }`}
                title={settings.hasHeader ? "Header Mode is ON: First line is treated as 'N M'. Click to switch to Edges-Only" : "Edges-Only Mode (Default): All lines are parsed as edges. Click if your input includes an 'N M' header"}
              >
                {settings.hasHeader ? 'N M Header: ON' : 'Edges Only'}
              </button>
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
          </div>

          {/* Multi-Testcase Auto-Detection Banner */}
          {multiTestcaseDetection && (
            <div
              className={`mb-2 p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                isLight ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles size={13} className="text-blue-500 shrink-0 animate-pulse" />
                <span className="text-[11px] truncate">
                  Detected <strong>{multiTestcaseDetection.count} Test Cases</strong> (T={multiTestcaseDetection.count})
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSplitMultiTestcases?.(multiTestcaseDetection.testcases)}
                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[10.5px] shrink-0 transition-colors shadow-2xs cursor-pointer"
                title="Split into separate tabs and display all testcase graphs on canvas"
              >
                Split into Tabs
              </button>
            </div>
          )}

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
                <option value="bellman_ford">Bellman-Ford (Negative Cycles)</option>
              </optgroup>
              <optgroup label="DAG & Order">
                <option value="toposort">Topological Sort (Kahn's)</option>
              </optgroup>
              <optgroup label="Connectivity">
                <option value="tarjan_scc">Tarjan's SCC (Strongly Connected)</option>
                <option value="bridges_articulations">Bridges & Articulation Points</option>
              </optgroup>
              <optgroup label="Spanning Trees">
                <option value="kruskal_mst">Kruskal's MST (DSU)</option>
                <option value="prim_mst">Prim's MST (Cut Property)</option>
              </optgroup>
              <optgroup label="Eulerian & Matching">
                <option value="bipartite_check">Bipartite 2-Coloring Check</option>
                <option value="max_bipartite_matching">Max Bipartite Matching (Kuhn's)</option>
                <option value="eulerian_path">Eulerian Path/Circuit (Hierholzer)</option>
              </optgroup>
              <optgroup label="Tree Algorithms & Tree DP">
                <option value="tree_diameter">Tree Diameter & Center</option>
                <option value="tree_lca">Tree LCA (Binary Lifting)</option>
                <option value="tree_subtree_dp">Subtree DP (Size & Depth)</option>
                <option value="tree_mis_dp">Tree DP: Max Independent Set</option>
                <option value="tree_centroid">Tree Centroid Finding</option>
              </optgroup>
            </select>
          </div>

          {['bfs', 'dfs', 'dijkstra', 'bellman_ford', 'prim_mst', 'tree_lca', 'tree_subtree_dp', 'tree_mis_dp'].includes(selectedAlgo) && (
            <div>
              <label className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${
                isLight ? 'text-slate-600' : 'text-neutral-400'
              }`}>
                {['tree_lca', 'tree_subtree_dp', 'tree_mis_dp'].includes(selectedAlgo) ? 'Root Node' : 'Starting Vertex'}
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
            {selectedAlgo === 'bellman_ford' && (
              <p className="text-[11px] leading-relaxed">
                Performs V-1 edge relaxation passes to find shortest paths with negative weights and detects negative cycles.
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
            {selectedAlgo === 'prim_mst' && (
              <p className="text-[11px] leading-relaxed">
                Grows spanning tree from root by picking the minimum cut edge crossing visited to unvisited vertices.
              </p>
            )}
            {selectedAlgo === 'bipartite_check' && (
              <p className="text-[11px] leading-relaxed">
                Attempts 2-coloring. Confirms bipartite graph partition (Set A / Set B) or highlights the odd-length cycle conflict.
              </p>
            )}
            {selectedAlgo === 'max_bipartite_matching' && (
              <p className="text-[11px] leading-relaxed">
                Kuhn's algorithm for Maximum Bipartite Matching. Discovers alternating augmenting paths to match disjoint sets.
              </p>
            )}
            {selectedAlgo === 'eulerian_path' && (
              <p className="text-[11px] leading-relaxed">
                Hierholzer's algorithm tracing an Eulerian trail or circuit visiting every edge exactly once.
              </p>
            )}
            {selectedAlgo === 'tree_diameter' && (
              <p className="text-[11px] leading-relaxed">
                Computes tree diameter using double-BFS/DFS. Highlights the longest simple path and pinpoints tree center(s).
              </p>
            )}
            {selectedAlgo === 'tree_lca' && (
              <p className="text-[11px] leading-relaxed">
                Binary Lifting preprocessing ($2^k$ ancestors table). Equalizes depths and simultaneous binary lifts to find LCA.
              </p>
            )}
            {selectedAlgo === 'tree_subtree_dp' && (
              <p className="text-[11px] leading-relaxed">
                Classic postorder bottom-up Tree DP: calculates subtree sizes $sz[u] = 1 + \sum sz[v]$ and node depths.
              </p>
            )}
            {selectedAlgo === 'tree_mis_dp' && (
              <p className="text-[11px] leading-relaxed">
                Maximum Independent Set on Tree via DP: $dp[u][0]$ (exclude $u$) and $dp[u][1]$ (include $u$), then reconstructs optimal set.
              </p>
            )}
            {selectedAlgo === 'tree_centroid' && (
              <p className="text-[11px] leading-relaxed">
                Finds the centroid vertex whose removal splits the tree into subtrees of size $\le N/2$. Foundation of Centroid Decomposition.
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

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportSingle={text => {
            onRawTextChange(text);
          }}
          onImportMulti={cases => {
            onSplitMultiTestcases?.(cases);
          }}
          theme={theme}
        />
      )}
    </>
  );
};
