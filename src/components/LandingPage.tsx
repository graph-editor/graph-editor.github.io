import React, { useState } from 'react';
import {
  Share2,
  Play,
  Download,
  ArrowRight,
  Monitor,
  Apple,
  Terminal,
  CheckCircle,
  Code,
  Layers,
  Sparkles,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
  StickyNote,
  MousePointerClick,
  Copy,
  Check,
  Move,
  Minus,
  Plus,
  X,
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface LandingPageProps {
  onOpenEditor: () => void;
  onOpenDownloadModal: () => void;
}

const GITHUB_REPO = 'https://github.com/graph-editor/graph-editor.github.io';
const RELEASES_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases';
const VERSION = '2.2.0';
const WIN_EXE_URL = `https://github.com/graph-editor/graph-editor.github.io/releases/download/v${VERSION}/CP.Graph.Editor_${VERSION}_x64-setup.exe`;
const WIN_MSI_URL = `https://github.com/graph-editor/graph-editor.github.io/releases/download/v${VERSION}/CP.Graph.Editor_${VERSION}_x64_en-US.msi`;
const MAC_DMG_URL = `https://github.com/graph-editor/graph-editor.github.io/releases/download/v${VERSION}/CP.Graph.Editor_${VERSION}_universal.dmg`;
const MAC_TAR_URL = `https://github.com/graph-editor/graph-editor.github.io/releases/download/v${VERSION}/CP.Graph.Editor_universal.app.tar.gz`;
const LINUX_APPIMAGE_URL = `https://github.com/graph-editor/graph-editor.github.io/releases/download/v${VERSION}/CP.Graph.Editor_${VERSION}_amd64.AppImage`;
const LINUX_DEB_URL = `https://github.com/graph-editor/graph-editor.github.io/releases/download/v${VERSION}/CP.Graph.Editor_${VERSION}_amd64.deb`;
const INSTALL_CMD = 'curl -fsSL https://raw.githubusercontent.com/graph-editor/graph-editor.github.io/master/install.sh | bash';

const FEATURES = [
  {
    icon: Sparkles,
    accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    badge: 'v2.2 New',
    title: 'Zero-Overlap Nodes & Weight Badges',
    desc: 'Collision-aware placement automatically steers edge and node weights clear of crossings, nodes, and Notes across all 6 layouts and live physics.',
  },
  {
    icon: StickyNote,
    accent: 'text-neutral-200 bg-neutral-800/70 border-neutral-700/80',
    badge: 'v2.2 New',
    title: 'Dark Black Canvas Notes',
    desc: 'Pin translucent minimal scratchpads directly onto the canvas with live font sizing (+/-), corner resizing, drag handles, and minimize/restore controls.',
  },
  {
    icon: Code,
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    badge: 'Mixed Types',
    title: 'String Nodes & String Edge Weights',
    desc: 'Supports integers, primed IDs (1\', 2\'), arbitrary strings (SRC, DEST), booleans, and text/numeric edge weights with smart edge-line selection sync.',
  },
  {
    icon: MousePointerClick,
    accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    badge: 'Workflow',
    title: 'Lasso / Ctrl Batch Inspector',
    desc: 'Lasso or Ctrl-click multiple nodes and edges to auto-open the Inspector sidebar and update colors, styles, or batch weights in one keystroke.',
  },
  {
    icon: GitBranch,
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    badge: '6 Engines',
    title: 'Adaptive Physics & Layouts',
    desc: 'Switch seamlessly between density-adaptive Force Physics, Hierarchical Tree, Topological DAG, Bipartite Columns, Circular Ring, and Grid Lattice.',
  },
  {
    icon: Layers,
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    badge: 'Offline Ready',
    title: 'Bundled JetBrains Mono & 2x Export',
    desc: '100% offline JetBrains Mono font bundle baked into the UI and embedded directly into high-res PNG, SVG, C++, and Python exports.',
  },
];

const ALGORITHMS = [
  { tag: 'Traversal', name: 'BFS', desc: 'Level-order discovery, queue trace, and unweighted shortest distances.' },
  { tag: 'Traversal', name: 'DFS', desc: 'Recursion stack, tin[]/tout[] timestamps, and cycle detection.' },
  { tag: 'Shortest Path', name: 'Dijkstra', desc: 'Priority queue relaxations and shortest-path tree highlighting.' },
  { tag: 'Shortest Path', name: 'Bellman-Ford', desc: 'V-1 edge passes supporting negative weights and cycle checks.' },
  { tag: 'DAG', name: "Kahn's Topo Sort", desc: 'In-degree tracking and directed cycle verification.' },
  { tag: 'Connectivity', name: "Tarjan's SCC", desc: 'Low-link values and component-colored SCC condensation.' },
  { tag: 'Connectivity', name: 'Bridges & Cuts', desc: 'Highlights articulation vertices and critical cut edges.' },
  { tag: 'Spanning Tree', name: "Kruskal's & Prim's", desc: 'Sorted edge list with DSU and cut-property MST builders.' },
  { tag: 'Matching', name: 'Bipartite & Kuhn', desc: '2-coloring odd-cycle finder and max bipartite matching.' },
  { tag: 'Paths', name: 'Eulerian Trail', desc: "Hierholzer's circuit and path reconstruction." },
  { tag: 'Tree DP', name: 'Diameter & LCA', desc: 'Double-BFS diameter, center nodes, and Binary Lifting LCA.' },
  { tag: 'Tree DP', name: 'Subtree, MIS & Centroid', desc: 'Bottom-up subtree sizes, Tree MIS DP, and centroid decomposition.' },
];

const INPUT_FORMATS = [
  {
    title: 'Edge List + String Weights',
    sub: 'Numbers, strings, primed IDs',
    code: `SRC 1 cost\n1 2' "fast"\n2' DEST 0`,
  },
  {
    title: 'Weighted Nodes',
    sub: 'Brackets or key assignments',
    code: `1 [10]\nA: 'root'\nGoal: "end"\nIsolatedNode`,
  },
  {
    title: 'Tree Parent Array',
    sub: 'AtCoder & Codeforces',
    code: `5\n1 1 2 2`,
  },
  {
    title: 'Adjacency Matrix',
    sub: 'N × N weighted or binary',
    code: `0 1 1 0\n1 0 0 5\n1 0 0 1\n0 5 1 0`,
  },
  {
    title: 'LeetCode & Multi-Testcases',
    sub: '2D arrays or T testcases',
    code: `[[0,1,4],[1,2,"ok"],[2,0,2]]`,
  },
];

const COMPARISON_ROWS = [
  ['Headerless Edge List & Auto-Count (N, M)', 'Instant auto-detect', 'Manual format rules', 'No', 'DOT syntax'],
  ['String Edge Weights & Primed IDs (1\', SRC)', 'Full string/number/primed', 'Numbers only', 'Numbers only', 'Manual quotes'],
  ['Overlap-Free Badges & Node Spacing', 'Dynamic solver + Notes', 'Midpoint collisions', 'Fixed circles', 'Static'],
  ['Floating Canvas Notes (Minimize & Resize)', 'Built-in Dark Black Notes', 'No', 'No', 'No'],
  ['Lasso Multi-Select & Edge-to-Line Sync', 'Auto Inspector + scroll', 'No', 'No', 'No'],
  ['Offline Desktop Apps & Embedded Exports', 'Win / Mac / Linux + PNG', 'Web only', 'Web only', 'CLI'],
];

const FAQS = [
  {
    q: 'What is new in CP Graph Editor v2.2?',
    a: 'v2.2 brings Dark Black transparent Canvas Notes (with resize, font +/- sizing, and minimize), collision-free edge/node weight placement, non-overlapping spacing across all 6 layouts, string edge weights, primed node IDs (like 1\' and 2\'), automatic Edge List line highlighting on canvas selection, Lasso/Ctrl batch weight editing, and offline bundled JetBrains Mono fonts.',
  },
  {
    q: 'Can edges and nodes hold text/string weights as well as numbers?',
    a: 'Yes! Both edges and nodes support numbers (integers, floats, 0, negatives), primed tokens like 1\' and 2\', characters, booleans, and arbitrary strings like "cost" or "fast lane". Algorithms fall back cleanly to weight 1 for non-numeric weights while visuals, serialization, sharing, and C++/Python exports preserve exact strings.',
  },
  {
    q: 'How does selecting edges highlight them in the input box?',
    a: 'Whenever you click, Ctrl-click, or Lasso-select edges on the canvas, the Edges List editor highlights their corresponding lines in blue and smoothly scrolls them into view without stealing keyboard focus.',
  },
  {
    q: 'Can I run CP Graph Editor offline with zero internet?',
    a: 'Yes. Both the bundled JetBrains Mono typography and the lightweight native desktop apps (Windows .exe/.msi, macOS .dmg/.tar.gz, Linux .AppImage/.deb) work 100% offline, and PNG/SVG exports embed the font directly.',
  },
  {
    q: 'Is CP Graph Editor free and open-source?',
    a: '100% free and open-source under the MIT license with zero accounts, paywalls, or tracking.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenEditor, onOpenDownloadModal }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [previewTab, setPreviewTab] = useState<'weights' | 'notes' | 'algo'>('weights');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1600);
  };

  return (
    <div
      className="min-h-screen w-full bg-black text-neutral-200 selection:bg-blue-600 selection:text-white font-mono overflow-x-hidden"
      style={{
        backgroundImage: 'radial-gradient(#1f1f23 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* Top Sticky Monochrome Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-black/80 backdrop-blur-xl safe-top">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm sm:text-base text-white tracking-tight">CP Graph</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-sky-400 border border-blue-500/30 font-semibold">
              v{VERSION}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#algorithms" className="hover:text-white transition-colors">Algorithms</a>
            <a href="#formats" className="hover:text-white transition-colors">Formats</a>
            <a href="#comparison" className="hover:text-white transition-colors">Compare</a>
            <a href="#downloads" className="hover:text-white transition-colors">Downloads</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <Star className="w-3 h-3 text-amber-400" />
            </a>

            <button
              onClick={onOpenEditor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Editor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-14 sm:pb-20 border-b border-neutral-800/80 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] max-w-[92vw] h-[280px] bg-blue-600/15 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <a
            href={`${RELEASES_URL}/tag/v${VERSION}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/90 border border-neutral-800 hover:border-blue-500/40 text-[11px] text-neutral-300 transition-colors mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Release v{VERSION} • Pitch Black OLED Workspace</span>
            <ArrowRight className="w-3 h-3 text-sky-400" />
          </a>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.12] max-w-4xl mx-auto">
            Precision Graph Editor for{' '}
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Competitive Programming
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Paste edge lists with integers, primed IDs (<code className="text-sky-300">1&apos;</code>), or string weights. Draw notes on the canvas, batch-edit with Lasso/Ctrl, and trace 17+ graph &amp; Tree DP algorithms in crisp offline JetBrains Mono.
          </p>

          <div className="mt-8 flex flex-col xs:flex-row flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenEditor}
              className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Open Online Editor</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenDownloadModal}
              className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-200 hover:text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Download v{VERSION} Desktop</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Zero-Overlap Layouts
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> String &amp; Numeric Weights
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Dark Black &amp; Clean White Themes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Win / macOS / Linux Offline
            </span>
          </div>

          {/* Interactive Workspace Showcase */}
          <div className="mt-12 max-w-5xl mx-auto rounded-2xl border border-neutral-800 bg-black/95 shadow-[0_24px_90px_rgba(0,0,0,0.9)] overflow-hidden text-left">
            {/* Showcase Window Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800/90 bg-neutral-950/90 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <span className="ml-2 text-neutral-400">CP Graph v{VERSION} — Live Workspace</span>
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-800 bg-black overflow-x-auto no-scrollbar max-w-full">
                {(
                  [
                    ['weights', 'Strings & Sync'],
                    ['notes', 'Notes & Batch'],
                    ['algo', 'Dijkstra Trace'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreviewTab(key)}
                    className={`px-2.5 py-1 rounded-md text-[10.5px] transition-colors cursor-pointer ${
                      previewTab === key
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Showcase Split View */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[320px]">
              {/* Left Input Panel Mock */}
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-neutral-800 bg-black p-3.5 flex flex-col justify-between text-xs">
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded-lg border border-neutral-800 bg-neutral-950">
                      <div className="text-[9px] text-neutral-500 uppercase">Nodes (N)</div>
                      <div className="text-sm font-bold text-blue-400">
                        {previewTab === 'weights' ? '5' : previewTab === 'notes' ? '6' : '4'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg border border-neutral-800 bg-neutral-950">
                      <div className="text-[9px] text-neutral-500 uppercase">Edges (M)</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {previewTab === 'weights' ? '5' : previewTab === 'notes' ? '6' : '4'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-neutral-200">Edges List</span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                        u v [w]
                      </span>
                    </div>
                    <span className="text-[9.5px] text-neutral-500">Clear</span>
                  </div>

                  <div className="rounded-lg border border-neutral-800 bg-neutral-950/90 py-2 text-[11px] leading-relaxed">
                    {previewTab === 'weights' && (
                      <>
                        <div className="px-3 text-neutral-300">SRC 1 0</div>
                        <div className="px-3 bg-blue-500/20 shadow-[inset_3px_0_0_#38bdf8] text-sky-200">
                          1 2&apos; cost
                        </div>
                        <div className="px-3 text-neutral-300">1 2&apos; fast</div>
                        <div className="px-3 text-neutral-300">2&apos; DEST 6</div>
                        <div className="px-3 text-neutral-300">SRC DEST 12</div>
                      </>
                    )}
                    {previewTab === 'notes' && (
                      <>
                        <div className="px-3 text-neutral-300">A [8]</div>
                        <div className="px-3 text-neutral-300">A D 1</div>
                        <div className="px-3 bg-blue-500/20 shadow-[inset_3px_0_0_#38bdf8] text-sky-200">
                          A F 100
                        </div>
                        <div className="px-3 bg-blue-500/20 shadow-[inset_3px_0_0_#38bdf8] text-sky-200">
                          B E 1
                        </div>
                        <div className="px-3 text-neutral-300">C F 5</div>
                      </>
                    )}
                    {previewTab === 'algo' && (
                      <>
                        <div className="px-3 text-neutral-300">1 2 4</div>
                        <div className="px-3 text-neutral-300">1 3 2</div>
                        <div className="px-3 bg-emerald-500/15 shadow-[inset_3px_0_0_#10b981] text-emerald-300">
                          3 2 1
                        </div>
                        <div className="px-3 bg-emerald-500/15 shadow-[inset_3px_0_0_#10b981] text-emerald-300">
                          2 4 3
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-900 flex items-center justify-between text-[10px] text-sky-400">
                  <span>
                    {previewTab === 'weights'
                      ? 'Selected edge: Line 2'
                      : previewTab === 'notes'
                      ? 'Selected 2 edges: Lines 3, 4'
                      : 'Dijkstra step 4/8 • dist[4] = 6'}
                  </span>
                  <button onClick={onOpenEditor} className="text-neutral-300 hover:text-white underline cursor-pointer">
                    Try Live →
                  </button>
                </div>
              </div>

              {/* Right Canvas Mock */}
              <div
                className="md:col-span-8 relative bg-black flex items-center justify-center p-4 overflow-hidden min-h-[260px]"
                style={{
                  backgroundImage: 'radial-gradient(#262626 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              >
                <svg className="w-full h-60 sm:h-64" viewBox="0 0 560 260">
                  {previewTab === 'weights' && (
                    <>
                      <line x1="85" y1="130" x2="215" y2="75" stroke="#94a3b8" strokeWidth="2.8" />
                      <path d="M 215 75 Q 290 25 365 75" fill="none" stroke="#38bdf8" strokeWidth="4" />
                      <path d="M 215 75 Q 290 125 365 75" fill="none" stroke="#94a3b8" strokeWidth="2.8" />
                      <line x1="365" y1="75" x2="480" y2="130" stroke="#94a3b8" strokeWidth="2.8" />
                      <line x1="85" y1="130" x2="480" y2="130" stroke="#94a3b8" strokeWidth="2.8" />

                      {/* Collision-free badges */}
                      <g transform="translate(150, 102)">
                        <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#0b0f19" stroke="#475569" strokeWidth="1.6" />
                        <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontWeight="800">0</text>
                      </g>
                      <g transform="translate(290, 48)">
                        <rect x="-24" y="-10" width="48" height="20" rx="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="1.8" />
                        <text textAnchor="middle" dy="4" fill="#38bdf8" fontSize="11" fontWeight="800">cost</text>
                      </g>
                      <g transform="translate(290, 102)">
                        <rect x="-24" y="-10" width="48" height="20" rx="6" fill="#0b0f19" stroke="#475569" strokeWidth="1.6" />
                        <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontWeight="800">fast</text>
                      </g>
                      <g transform="translate(422, 102)">
                        <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#0b0f19" stroke="#475569" strokeWidth="1.6" />
                        <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontWeight="800">6</text>
                      </g>
                      <g transform="translate(282, 145)">
                        <rect x="-18" y="-10" width="36" height="20" rx="6" fill="#0b0f19" stroke="#475569" strokeWidth="1.6" />
                        <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontWeight="800">12</text>
                      </g>

                      {[
                        { x: 85, y: 130, r: 23, label: 'SRC', fill: '#3b82f6' },
                        { x: 215, y: 75, r: 20, label: '1', fill: '#3b82f6' },
                        { x: 365, y: 75, r: 20, label: "2'", fill: '#3b82f6' },
                        { x: 480, y: 130, r: 24, label: 'DEST', fill: '#10b981' },
                      ].map(n => (
                        <g key={n.label} transform={`translate(${n.x}, ${n.y})`}>
                          <circle r={n.r} fill={n.fill} stroke="#000000" strokeWidth="2.5" />
                          <text textAnchor="middle" dy="4.5" fill="#ffffff" fontSize="12" fontWeight="900">{n.label}</text>
                        </g>
                      ))}
                    </>
                  )}

                  {previewTab === 'notes' && (
                    <>
                      {/* Crossing edges with non-overlapping weight pills */}
                      <line x1="120" y1="60" x2="310" y2="60" stroke="#94a3b8" strokeWidth="2.8" />
                      <line x1="120" y1="60" x2="310" y2="195" stroke="#38bdf8" strokeWidth="3.8" />
                      <line x1="120" y1="140" x2="310" y2="140" stroke="#38bdf8" strokeWidth="3.8" />
                      <line x1="120" y1="200" x2="310" y2="195" stroke="#94a3b8" strokeWidth="2.8" />

                      <g transform="translate(215, 60)">
                        <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#0b0f19" stroke="#475569" strokeWidth="1.6" />
                        <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontWeight="800">1</text>
                      </g>
                      {/* Non-overlapping A->F (at t=0.34) vs B->E (at t=0.66) */}
                      <g transform="translate(185, 106)">
                        <rect x="-20" y="-10" width="40" height="20" rx="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="1.8" />
                        <text textAnchor="middle" dy="4" fill="#38bdf8" fontSize="11" fontWeight="800">100</text>
                      </g>
                      <g transform="translate(245, 140)">
                        <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="1.8" />
                        <text textAnchor="middle" dy="4" fill="#38bdf8" fontSize="11" fontWeight="800">1</text>
                      </g>
                      <g transform="translate(215, 198)">
                        <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#0b0f19" stroke="#475569" strokeWidth="1.6" />
                        <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="11" fontWeight="800">5</text>
                      </g>

                      {[
                        { x: 120, y: 60, l: 'A', w: 'w:8' },
                        { x: 120, y: 140, l: 'B' },
                        { x: 120, y: 200, l: 'C' },
                        { x: 310, y: 60, l: 'D' },
                        { x: 310, y: 140, l: 'E' },
                        { x: 310, y: 195, l: 'F' },
                      ].map(n => (
                        <g key={n.l} transform={`translate(${n.x}, ${n.y})`}>
                          <circle r="19" fill="#3b82f6" stroke="#000000" strokeWidth="2.5" />
                          <text textAnchor="middle" dy="4.5" fill="#ffffff" fontSize="12" fontWeight="900">{n.l}</text>
                          {n.w && (
                            <g transform="translate(0, 31)">
                              <rect x="-20" y="-9" width="40" height="18" rx="9" fill="#0a0a0a" stroke="#475569" strokeWidth="1.6" />
                              <text textAnchor="middle" dy="4" fill="#e0e7ff" fontSize="10" fontWeight="800">{n.w}</text>
                            </g>
                          )}
                        </g>
                      ))}
                    </>
                  )}

                  {previewTab === 'algo' && (
                    <>
                      <line x1="120" y1="130" x2="260" y2="65" stroke="#475569" strokeWidth="2.8" />
                      <line x1="120" y1="130" x2="260" y2="195" stroke="#10b981" strokeWidth="4" />
                      <line x1="260" y1="195" x2="260" y2="65" stroke="#10b981" strokeWidth="4" />
                      <line x1="260" y1="65" x2="420" y2="130" stroke="#10b981" strokeWidth="4" />

                      {[
                        { x: 190, y: 97, w: '4', active: false },
                        { x: 190, y: 162, w: '2', active: true },
                        { x: 260, y: 130, w: '1', active: true },
                        { x: 340, y: 97, w: '3', active: true },
                      ].map((b, i) => (
                        <g key={i} transform={`translate(${b.x}, ${b.y})`}>
                          <rect
                            x="-14"
                            y="-10"
                            width="28"
                            height="20"
                            rx="6"
                            fill="#0b0f19"
                            stroke={b.active ? '#10b981' : '#475569'}
                            strokeWidth="1.8"
                          />
                          <text textAnchor="middle" dy="4" fill={b.active ? '#34d399' : '#f8fafc'} fontSize="11" fontWeight="800">
                            {b.w}
                          </text>
                        </g>
                      ))}

                      {[
                        { x: 120, y: 130, l: '1', dist: 'd:0', c: '#10b981' },
                        { x: 260, y: 65, l: '2', dist: 'd:3', c: '#10b981' },
                        { x: 260, y: 195, l: '3', dist: 'd:2', c: '#10b981' },
                        { x: 420, y: 130, l: '4', dist: 'd:6', c: '#f59e0b' },
                      ].map(n => (
                        <g key={n.l} transform={`translate(${n.x}, ${n.y})`}>
                          <circle r="20" fill={n.c} stroke="#000000" strokeWidth="2.5" />
                          <text textAnchor="middle" dy="4.5" fill="#ffffff" fontSize="13" fontWeight="900">{n.l}</text>
                          <g transform="translate(0, 32)">
                            <rect x="-22" y="-9" width="44" height="18" rx="5" fill="#0a0a0a" stroke="#38bdf8" strokeWidth="1.6" />
                            <text textAnchor="middle" dy="4" fill="#38bdf8" fontSize="10" fontWeight="800">{n.dist}</text>
                          </g>
                        </g>
                      ))}
                    </>
                  )}
                </svg>

                {/* Authentic Dark Black Note Card Mock in Notes Tab */}
                {previewTab === 'notes' && (
                  <div className="hidden sm:flex flex-col absolute right-4 top-4 w-48 rounded-lg border border-neutral-800/90 bg-black/75 backdrop-blur-md shadow-2xl overflow-hidden text-[11px]">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800/80 bg-neutral-950/70">
                      <div className="flex items-center gap-1 text-neutral-300">
                        <Move size={11} />
                        <span className="text-[10px]">Note</span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400">
                        <Minus size={10} />
                        <span className="text-[9px]">13</span>
                        <Plus size={10} />
                        <ChevronUp size={11} />
                        <X size={11} />
                      </div>
                    </div>
                    <div className="p-2.5 text-[10.5px] text-neutral-200 leading-relaxed">
                      <div>Min-cut test #2</div>
                      <div className="text-neutral-400">Cap(A→F) = 100</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Features Section */}
      <section id="features" className="py-20 border-b border-neutral-800/80 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">Capabilities</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for Competitive Programmers
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-neutral-400">
              Every detail tuned for fast debugging during contests — zero clutter, exact string fidelity, and instant visual clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <article
                  key={i}
                  className="p-6 rounded-2xl bg-black/90 border border-neutral-800/90 hover:border-neutral-600 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${feat.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-950 text-neutral-400">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">{feat.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Algorithms Section */}
      <section id="algorithms" className="py-20 border-b border-neutral-800/80 bg-black/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Interactive Step Tracer</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              17+ Graph &amp; Tree Algorithms
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-neutral-400">
              Step forward/backward with live queue, priority queue, stack, DSU, and distance array state inspectors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ALGORITHMS.map(algo => (
              <div
                key={algo.name}
                className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800/90 hover:border-emerald-500/40 transition-colors"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  {algo.tag}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{algo.name}</h3>
                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">{algo.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Input Formats Section */}
      <section id="formats" className="py-20 border-b border-neutral-800/80 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">Universal Input</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Paste Directly from Any Contest
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 text-xs">
            {INPUT_FORMATS.map(fmt => (
              <div key={fmt.title} className="p-4 rounded-xl bg-black border border-neutral-800 flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold text-xs mb-1">{fmt.title}</div>
                  <p className="text-neutral-500 text-[10.5px] mb-3">{fmt.sub}</p>
                </div>
                <pre className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/90 text-sky-300 text-[11px] leading-relaxed overflow-x-auto">
                  {fmt.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-20 border-b border-neutral-800/80 bg-black/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Why CP Graph</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for Modern Contests
            </h2>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Feature comparison table"
            className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/90 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-black/80 text-neutral-400">
                  <th className="p-4 font-semibold">Capability</th>
                  <th className="p-4 font-bold text-sky-400 bg-blue-500/10 border-x border-blue-500/20">
                    CP Graph v{VERSION}
                  </th>
                  <th className="p-4 font-semibold">CS Academy</th>
                  <th className="p-4 font-semibold">VisuAlgo</th>
                  <th className="p-4 font-semibold">Graphviz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
                {COMPARISON_ROWS.map(([cap, ours, cs, va, gv]) => (
                  <tr key={cap}>
                    <td className="p-4 font-medium text-white">{cap}</td>
                    <td className="p-4 font-semibold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">
                      ✓ {ours}
                    </td>
                    <td className="p-4 text-neutral-400">{cs}</td>
                    <td className="p-4 text-neutral-500">{va}</td>
                    <td className="p-4 text-neutral-400">{gv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="py-20 border-b border-neutral-800/80 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Offline Desktop</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Download CP Graph Editor v{VERSION}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-neutral-400">
              Native Tauri &amp; Electron desktop builds with bundled offline JetBrains Mono — zero cloud dependency.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-10 p-4 rounded-2xl bg-black border border-neutral-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>1-Click Terminal Install (Linux &amp; macOS)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyInstall}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-[10.5px] text-neutral-300 cursor-pointer"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/90 text-[11px] text-sky-300 select-all overflow-x-auto">
              {INSTALL_CMD}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {/* Windows */}
            <div className="p-6 rounded-2xl bg-black border border-neutral-800 hover:border-blue-500/40 flex flex-col justify-between transition-colors">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <Monitor className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Windows</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">Windows 10 / 11 (64-bit)</p>
              </div>
              <div className="space-y-2">
                <a
                  href={WIN_EXE_URL}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Setup Installer (.exe)</span>
                </a>
                <a
                  href={WIN_MSI_URL}
                  className="w-full flex items-center justify-center py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px] transition-colors"
                >
                  MSI Package (.msi)
                </a>
              </div>
            </div>

            {/* macOS */}
            <div className="p-6 rounded-2xl bg-black border border-neutral-800 hover:border-purple-500/40 flex flex-col justify-between transition-colors">
              <div>
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Apple className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">macOS</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">Apple Silicon &amp; Intel</p>
              </div>
              <div className="space-y-2">
                <a
                  href={MAC_DMG_URL}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Universal DMG (.dmg)</span>
                </a>
                <a
                  href={MAC_TAR_URL}
                  className="w-full flex items-center justify-center py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px] transition-colors"
                >
                  App Archive (.tar.gz)
                </a>
              </div>
            </div>

            {/* Linux */}
            <div className="p-6 rounded-2xl bg-black border border-neutral-800 hover:border-sky-500/40 flex flex-col justify-between transition-colors">
              <div>
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Linux</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">Ubuntu, Debian, Fedora, Arch</p>
              </div>
              <div className="space-y-2">
                <a
                  href={LINUX_APPIMAGE_URL}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Portable AppImage</span>
                </a>
                <a
                  href={LINUX_DEB_URL}
                  className="w-full flex items-center justify-center py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px] transition-colors"
                >
                  Debian Package (.deb)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-b border-neutral-800/80 bg-black/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">FAQ</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/90 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-xs sm:text-sm hover:bg-neutral-900/60 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-neutral-400 text-xs leading-relaxed border-t border-neutral-800/70 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-black text-neutral-500 text-xs safe-bottom">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span className="text-neutral-200 font-semibold">CP Graph Editor</span>
            <span className="text-neutral-600">•</span>
            <span>v{VERSION}</span>
          </div>

          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-neutral-200 transition-colors">Features</a>
            <a href="#algorithms" className="hover:text-neutral-200 transition-colors">Algorithms</a>
            <a href="#downloads" className="hover:text-neutral-200 transition-colors">Downloads</a>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-200 inline-flex items-center gap-1 transition-colors"
            >
              <span>Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <a
            href="https://github.com/mostafa-cse"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1"
          >
            <span>Mostafa (@mostafa-cse)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};
