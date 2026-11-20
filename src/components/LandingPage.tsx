import React, { useState } from 'react';
import {
  Share2,
  Play,
  Download,
  ArrowRight,
  Monitor,
  Apple,
  Terminal,
  Globe,
  CheckCircle,
  Code,
  Layers,
  Sparkles,
  Zap,
  Cpu,
  Compass,
  Pin,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface LandingPageProps {
  onOpenEditor: () => void;
  onOpenDownloadModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenEditor, onOpenDownloadModal }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const GITHUB_REPO = 'https://github.com/mostafa-cse/Graph-visualization';
  const RELEASES_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases';
  const WIN_EXE_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.1.0/CP.Graph.Editor_2.1.0_x64-setup.exe';
  const WIN_ZIP_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.1.0/CP.Graph.Editor_2.1.0_x64_en-US.msi';
  const MAC_DMG_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.1.0/CP.Graph.Editor_2.1.0_universal.dmg';
  const MAC_ZIP_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.1.0/CP.Graph.Editor_universal.app.tar.gz';
  const LINUX_APPIMAGE_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.1.0/CP.Graph.Editor_2.1.0_amd64.AppImage';
  const LINUX_DEB_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.1.0/CP.Graph.Editor_2.1.0_amd64.deb';

  const faqs = [
    {
      q: 'What is CP Graph Editor?',
      a: 'CP Graph Editor is an ultra-clean, high-performance graph visualizer and drawing tool built specifically for competitive programmers (Codeforces, CSES, LeetCode, AtCoder) and computer science students. It allows you to paste raw edge lists or test cases and visually inspect, drag, and simulate graph algorithms.'
    },
    {
      q: 'Can nodes have weights, values, or non-numeric identifiers (like strings or characters)?',
      a: 'Yes! CP Graph Editor v2.0 introduces full support for weighted nodes and mixed data types. You can assign values (integers, floats, single characters like \'A\', strings like "goal", or booleans) using bracket syntax (e.g. 1 [10]) or assignment (e.g. A: 42). Weights are rendered cleanly on the canvas with a dedicated badge and exported directly into C++ and Python templates.'
    },
    {
      q: 'How does it auto-detect edges and nodes?',
      a: 'Unlike other graph editors that require manually typing node count N and edge count M, CP Graph Editor automatically scans your edge list (e.g., "1 2", "2 3 5"), detects all unique vertices, counts edges, and creates isolated nodes when declared in N M headers.'
    },
    {
      q: 'Can I visualize standard algorithms like BFS, DFS, and Dijkstra?',
      a: 'Yes! CP Graph Editor features a built-in step-by-step algorithm engine with full playback controls. You can run Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra’s shortest path with a priority queue inspector, Kahn’s Topological Sort, Tarjan’s SCC, Bridges & Cut Vertices, Kruskal’s MST, and Bipartite 2-coloring.'
    },
    {
      q: 'Can I use CP Graph Editor offline without an internet connection?',
      a: 'Yes! CP Graph Editor is fully packaged as native desktop apps for Windows (.exe installer and portable .zip), macOS (.dmg disk image), and Linux (.AppImage and .deb package). All algorithm simulations and physics run 100% locally with zero internet dependency.'
    },
    {
      q: 'How does Lasso multi-selection and drag-and-drop work?',
      a: 'Use the Lasso tool (or Shift + drag) to draw a freehand loop around any nodes and edges. All enclosed items are selected simultaneously, displaying a glowing selection enclosure. You can drag and reposition them together, batch change their colors, assign weights, or delete them in one click.'
    },
    {
      q: 'Is CP Graph Editor completely free and open-source?',
      a: 'Yes, CP Graph Editor is 100% free and open-source under the MIT license with no paywalls, accounts, or telemetry. You can view the full source code and contribute on GitHub.'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#070b14] text-gray-200 selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-800/80 bg-[#070b14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">CP Graph</span>
              <span className="text-xs px-2 py-0.5 ml-2 font-mono rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">v2.1</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#algorithms" className="hover:text-blue-400 transition-colors">Algorithms</a>
            <a href="#formats" className="hover:text-blue-400 transition-colors">Input Formats</a>
            <a href="#comparison" className="hover:text-blue-400 transition-colors">Comparison</a>
            <a href="#downloads" className="hover:text-blue-400 transition-colors">Downloads</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-xs font-medium text-gray-300 hover:text-white transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <Star className="w-3 h-3 text-amber-400 ml-0.5" />
            </a>

            <button
              onClick={onOpenEditor}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Editor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-gray-800/60">
        {/* Glow background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>The Premier Graph Editor & Visualizer</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Visualize, Edit, and Simulate Graphs <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">in Real-Time</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            The fastest, cleanest graph visualizer tailored for <strong>Competitive Programming</strong>, algorithm design, and CS education. Paste edge lists directly from Codeforces or CSES, adjust 60fps physics, and step through BFS, DFS, and Dijkstra.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onOpenEditor}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Open Online Graph Editor (Free)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenDownloadModal}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-gray-700 bg-gray-900/80 hover:bg-gray-800 text-gray-200 hover:text-white font-semibold text-sm transition-all"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Download Desktop App (Win / Mac / Linux)</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>100% Free & Open Source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Zero-Install Web App</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Cross-Platform Desktop Binaries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Preserves Isolated Vertices</span>
            </div>
          </div>

          {/* Visual Interactive Demo Banner */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-blue-500/20 bg-[#0d1424] shadow-2xl p-4 sm:p-6 text-left relative group">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-gray-400 font-medium">CP Graph Editor — Interactive Workspace</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-mono text-[11px] border border-blue-500/20">
                  Auto-Detect: Active (4 Nodes, 4 Edges)
                </span>
                <button
                  onClick={onOpenEditor}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1"
                >
                  <span>Launch Full App</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Mock Editor Canvas Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 h-72 sm:h-80 bg-[#080d1a] rounded-xl border border-gray-800 p-4 font-mono text-xs overflow-hidden relative">
              {/* Left Code Area Mock */}
              <div className="hidden md:flex flex-col justify-between p-3 bg-[#0d1424] rounded-lg border border-gray-800 text-gray-300">
                <div>
                  <div className="text-[11px] text-gray-400 font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-blue-400" />
                    <span>Edge List Input</span>
                  </div>
                  <pre className="text-blue-300 leading-relaxed font-mono">
                    {`1 2 5\n1 3 2\n2 4 1\n3 4 8\n\n# Isolated node\n5`}
                  </pre>
                </div>
                <div className="text-[10px] text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                  ✓ 1-based indexing detected<br />
                  ✓ Weighted edges parsed
                </div>
              </div>

              {/* Right Graph Canvas Representation */}
              <div className="col-span-2 relative flex items-center justify-center bg-[#070b14] rounded-lg border border-gray-800/80 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 500 300">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                    </marker>
                  </defs>
                  {/* Edges */}
                  <line x1="120" y1="150" x2="250" y2="70" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.8" />
                  <text x="175" y="100" fill="#93c5fd" fontSize="11" fontFamily="'JetBrains Mono', 'Fira Code', monospace">w=5</text>

                  <line x1="120" y1="150" x2="250" y2="230" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.8" />
                  <text x="175" y="200" fill="#93c5fd" fontSize="11" fontFamily="'JetBrains Mono', 'Fira Code', monospace">w=2</text>

                  <line x1="250" y1="70" x2="380" y2="150" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.8" />
                  <text x="325" y="100" fill="#93c5fd" fontSize="11" fontFamily="'JetBrains Mono', 'Fira Code', monospace">w=1</text>

                  <line x1="250" y1="230" x2="380" y2="150" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.8" />
                  <text x="325" y="200" fill="#93c5fd" fontSize="11" fontFamily="'JetBrains Mono', 'Fira Code', monospace">w=8</text>

                  {/* Nodes */}
                  <g className="cursor-pointer">
                    <circle cx="120" cy="150" r="22" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
                    <text x="120" y="155" fill="#ffffff" textAnchor="middle" fontWeight="bold" fontSize="14">1</text>
                  </g>

                  <g className="cursor-pointer">
                    <circle cx="250" cy="70" r="22" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
                    <text x="250" y="75" fill="#ffffff" textAnchor="middle" fontWeight="bold" fontSize="14">2</text>
                  </g>

                  <g className="cursor-pointer">
                    <circle cx="250" cy="230" r="22" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
                    <text x="250" y="235" fill="#ffffff" textAnchor="middle" fontWeight="bold" fontSize="14">3</text>
                  </g>

                  <g className="cursor-pointer">
                    <circle cx="380" cy="150" r="22" fill="#047857" stroke="#34d399" strokeWidth="2" />
                    <text x="380" y="155" fill="#ffffff" textAnchor="middle" fontWeight="bold" fontSize="14">4</text>
                  </g>

                  {/* Isolated node */}
                  <g className="cursor-pointer">
                    <circle cx="440" cy="60" r="18" fill="#374151" stroke="#9ca3af" strokeWidth="2" />
                    <text x="440" y="65" fill="#ffffff" textAnchor="middle" fontWeight="bold" fontSize="12">5</text>
                    <text x="440" y="92" fill="#9ca3af" textAnchor="middle" fontSize="9">isolated</text>
                  </g>
                </svg>

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-[11px] bg-blue-900/60 text-blue-200 px-2.5 py-1 rounded border border-blue-700/50 backdrop-blur">
                    💡 Click "Launch Editor" to interact live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 border-b border-gray-800/80 bg-[#090e1b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Key Features</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for Speed, Precision & Competitive Programming
            </p>
            <p className="mt-4 text-gray-400 text-sm sm:text-base">
              Say goodbye to clunky graph editors that crash with multi-edges or lose isolated vertices. Everything competitive programmers need is built in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <article className="p-6 rounded-2xl bg-[#0e1628] border border-gray-800 hover:border-blue-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart Auto-Detection & Input</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Paste raw edge pairs without needing to type <code>N</code> and <code>M</code> counts. Handles 0-indexed and 1-based graphs with a live 1-click toggle that instantly renumbers nodes.
              </p>
            </article>

            {/* Feature 2 */}
            <article className="p-6 rounded-2xl bg-[#0e1628] border border-gray-800 hover:border-blue-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Pin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Double-Click Node Pinning</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Fix nodes permanently in place by double-clicking. Fixed nodes show a distinct anchor ring while continuous spring physics rearranges other nodes dynamically around them.
              </p>
            </article>

            {/* Feature 3 */}
            <article className="p-6 rounded-2xl bg-[#0e1628] border border-gray-800 hover:border-blue-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Curved Multi-Edges & Loops</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Graph problems often have multiple parallel edges and self-loops. CP Graph curves them gracefully with distinct bezier offsets so edge weights and directions never collide.
              </p>
            </article>

            {/* Feature 4 */}
            <article className="p-6 rounded-2xl bg-[#0e1628] border border-gray-800 hover:border-blue-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Weighted Nodes & Mixed Types</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Assign weights or arbitrary values (numbers, chars like <code>'A'</code>, strings like <code>"goal"</code>, booleans) to vertices. Supports bracket syntax <code>u [w]</code> and assignment <code>u: w</code> with real-time badges and C++/Python exports.
              </p>
            </article>

            {/* Feature 5 */}
            <article className="p-6 rounded-2xl bg-[#0e1628] border border-gray-800 hover:border-blue-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">6 Specialized Layout Engines</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Instantly switch layouts: Force-Directed Physics, Hierarchical Tree (Reingold-Tilford with root selector), Topological DAG, Bipartite Columns (Sets A & B), Circular Ring, and Grid Lattice.
              </p>
            </article>

            {/* Feature 6 */}
            <article className="p-6 rounded-2xl bg-[#0e1628] border border-gray-800 hover:border-blue-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Bidirectional Live Sync</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Editing visually on canvas immediately updates the CP edge list, and typing or pasting testcases updates the visual canvas in real-time. Zero delays, 60fps performance.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Algorithms Section */}
      <section id="algorithms" className="py-20 border-b border-gray-800/80 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Algorithm Player</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Step-by-Step Graph Algorithm Visualizer
            </p>
            <p className="mt-4 text-gray-400 text-sm sm:text-base">
              Trace execution with forward/backward steps, adjustable animation speed, queue/stack state inspection, and event logs in standard competitive programming terminology.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">BFS</span>
              <h3 className="text-base font-bold text-white mt-1">Breadth-First Search</h3>
              <p className="text-xs text-gray-400 mt-2">Level-by-level exploration, active queue display, and shortest unweighted path finding.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">DFS</span>
              <h3 className="text-base font-bold text-white mt-1">Depth-First Search</h3>
              <p className="text-xs text-gray-400 mt-2">Call stack tracking, discovery time tin[], finish time tout[], and back-edge cycle detection.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Dijkstra</span>
              <h3 className="text-base font-bold text-white mt-1">Shortest Path</h3>
              <p className="text-xs text-gray-400 mt-2">Priority queue state inspector, distance array dist[] relaxations, and path tree visualization.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Topo Sort</span>
              <h3 className="text-base font-bold text-white mt-1">Kahn's Algorithm</h3>
              <p className="text-xs text-gray-400 mt-2">In-degree tracking array in_degree[], topological order extraction, and directed cycle warning.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Tarjan SCC</span>
              <h3 className="text-base font-bold text-white mt-1">Strongly Connected</h3>
              <p className="text-xs text-gray-400 mt-2">Low-link value computation, DFS recursion stack, and condensation component identification.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Bridges & Cuts</span>
              <h3 className="text-base font-bold text-white mt-1">Articulation Points</h3>
              <p className="text-xs text-gray-400 mt-2">Identifies critical bridge edges and cut vertices whose removal disconnects the graph.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Kruskal MST</span>
              <h3 className="text-base font-bold text-white mt-1">Minimum Spanning Tree</h3>
              <p className="text-xs text-gray-400 mt-2">Sorted edge list scanning, Disjoint Set Union (DSU) operations, and total weight summation.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1221] border border-gray-800 hover:border-emerald-500/30 transition-all">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Bipartite</span>
              <h3 className="text-base font-bold text-white mt-1">2-Coloring Check</h3>
              <p className="text-xs text-gray-400 mt-2">Alternating 2-coloring test with instant detection of odd-length cycle violations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Input Formats Section */}
      <section id="formats" className="py-20 border-b border-gray-800/80 bg-[#090e1b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">Universal Compatibility</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Supported Competitive Programming Formats
            </p>
            <p className="mt-4 text-gray-400 text-sm sm:text-base">
              Copy test cases from any contest platform and paste directly into the editor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#0e1628] border border-gray-800">
              <span className="text-cyan-400 font-bold block mb-2 font-sans text-sm">Edge List (Unweighted)</span>
              <p className="text-gray-400 text-[11px] font-sans mb-3">Standard Codeforces / CSES edge pairs.</p>
              <div className="bg-[#070b14] p-3 rounded border border-gray-800 text-blue-300">
                1 2<br />
                2 3<br />
                3 1<br />
                3 4
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1628] border border-gray-800">
              <span className="text-cyan-400 font-bold block mb-2 font-sans text-sm">Weighted Edge List</span>
              <p className="text-gray-400 text-[11px] font-sans mb-3">Includes weight parameter <code>w</code>.</p>
              <div className="bg-[#070b14] p-3 rounded border border-gray-800 text-blue-300">
                1 2 5<br />
                2 3 10<br />
                3 4 2<br />
                4 1 7
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1628] border border-gray-800">
              <span className="text-purple-400 font-bold block mb-2 font-sans text-sm">Weighted Nodes</span>
              <p className="text-gray-400 text-[11px] font-sans mb-3">Assign weights (int, char, string).</p>
              <div className="bg-[#070b14] p-3 rounded border border-gray-800 text-purple-300">
                1 [10]<br />
                2: 'A'<br />
                3: "goal"<br />
                SingleNode
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1628] border border-gray-800">
              <span className="text-cyan-400 font-bold block mb-2 font-sans text-sm">Tree Parent Array</span>
              <p className="text-gray-400 text-[11px] font-sans mb-3">AtCoder & CF tree format (p2, p3... pn).</p>
              <div className="bg-[#070b14] p-3 rounded border border-gray-800 text-blue-300">
                1 1 2 2 3
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1628] border border-gray-800">
              <span className="text-cyan-400 font-bold block mb-2 font-sans text-sm">Adjacency Matrix</span>
              <p className="text-gray-400 text-[11px] font-sans mb-3">Full N × N matrix representations.</p>
              <div className="bg-[#070b14] p-3 rounded border border-gray-800 text-blue-300">
                0 1 1 0<br />
                1 0 0 1<br />
                1 0 0 1<br />
                0 1 1 0
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-20 border-b border-gray-800/80 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Why Switch</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              CP Graph Editor vs Other Tools
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0c1221]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-300">
                  <th className="p-4 font-semibold">Capability</th>
                  <th className="p-4 font-semibold text-blue-400 bg-blue-500/10 border-x border-blue-500/20">CP Graph Editor</th>
                  <th className="p-4 font-semibold text-gray-400">CS Academy</th>
                  <th className="p-4 font-semibold text-gray-400">VisuAlgo</th>
                  <th className="p-4 font-semibold text-gray-400">Graphviz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                <tr>
                  <td className="p-4 font-medium">Automatic N M & Headerless Detection</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (Instant)</td>
                  <td className="p-4 text-gray-400">Requires manual lines</td>
                  <td className="p-4 text-gray-500">✗ No</td>
                  <td className="p-4 text-gray-500">✗ Strict DOT syntax</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Weighted Nodes & Mixed Types (Char, String, Bool, Int)</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (Live badges & values)</td>
                  <td className="p-4 text-gray-500">✗ Numbers only</td>
                  <td className="p-4 text-gray-500">✗ Fixed values</td>
                  <td className="p-4 text-amber-400">Manual label formatting</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Preserve Isolated Vertices (Degree 0)</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (Header count preserved)</td>
                  <td className="p-4 text-gray-500">✗ Drops isolated nodes</td>
                  <td className="p-4 text-gray-500">✗ Drops isolated nodes</td>
                  <td className="p-4 text-emerald-400">✓ Yes</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">0-Indexed vs 1-Indexed Live Toggle</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (1-Click live conversion)</td>
                  <td className="p-4 text-gray-500">✗ Manual rewrite</td>
                  <td className="p-4 text-gray-500">✗ No</td>
                  <td className="p-4 text-gray-500">✗ No</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Double-Click Node Pinning (Anchor Physics)</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (Rigid anchor rings)</td>
                  <td className="p-4 text-gray-500">✗ Loose dragging</td>
                  <td className="p-4 text-gray-500">✗ No</td>
                  <td className="p-4 text-gray-500">✗ Static layout</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Parallel Multi-Edges & Self-Loops</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (Curved bezier offsets)</td>
                  <td className="p-4 text-amber-400">Overlaps / collides</td>
                  <td className="p-4 text-gray-500">✗ Limited</td>
                  <td className="p-4 text-emerald-400">✓ Yes</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Native Desktop Apps (Win / Mac / Linux)</td>
                  <td className="p-4 font-bold text-emerald-400 bg-blue-500/5 border-x border-blue-500/20">✓ Yes (EXE, DMG, AppImage)</td>
                  <td className="p-4 text-gray-500">✗ Web only</td>
                  <td className="p-4 text-gray-500">✗ Web only</td>
                  <td className="p-4 text-amber-400">CLI only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="py-20 border-b border-gray-800/80 bg-[#090e1b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Install Everywhere</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ⚡ 1-Click Install for Any Operating System
            </p>
            <p className="mt-4 text-gray-400 text-sm sm:text-base">
              Ultra-lightweight native apps (only ~6-14 MB). Instant setup, zero bloat, runs 100% offline.
            </p>
          </div>

          {/* 1-Click Terminal Command */}
          <div className="max-w-3xl mx-auto mb-10 p-4 rounded-2xl bg-[#0c1426] border border-blue-500/30 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>⚡ 1-Click Instant Terminal Install (Linux &amp; macOS):</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Auto-installs desktop icons &amp; launches</span>
            </div>
            <div className="bg-black/60 p-2.5 rounded-lg border border-gray-800 font-mono text-xs text-blue-300 select-all overflow-x-auto">
              curl -fsSL https://raw.githubusercontent.com/mostafa-cse/Graph-visualization/master/install.sh | bash
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Windows Card */}
            <div className="p-6 rounded-2xl bg-[#0e1628] border border-blue-500/20 flex flex-col justify-between hover:border-blue-500/50 transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Windows</h3>
                <p className="text-xs text-gray-400 mt-1 mb-4">Windows 10 / 11 (64-bit)</p>
                <ul className="text-xs text-gray-300 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>⚡ 1-Click Auto Setup (6 MB)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>MSI Installer Package (.msi)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Automatic Desktop &amp; Start shortcuts</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <a
                  href={WIN_EXE_URL}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg transition-colors"
                  title="Single click to install and launch instantly"
                >
                  <Download className="w-4 h-4" />
                  <span>⚡ 1-Click Setup (.exe)</span>
                </a>
                <a
                  href={WIN_ZIP_URL}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-medium text-[11px] transition-colors"
                >
                  <span>MSI Installer (.msi)</span>
                </a>
              </div>
            </div>

            {/* macOS Card */}
            <div className="p-6 rounded-2xl bg-[#0e1628] border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/50 transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                  <Apple className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">macOS</h3>
                <p className="text-xs text-gray-400 mt-1 mb-4">macOS 11+ (Intel &amp; Apple Silicon)</p>
                <ul className="text-xs text-gray-300 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Universal Disk Image (14 MB)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>M1/M2/M3/M4 &amp; Intel native</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Portable App bundle (.tar.gz)</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <a
                  href={MAC_DMG_URL}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Universal Disk Image (.dmg)</span>
                </a>
                <a
                  href={MAC_ZIP_URL}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-medium text-[11px] transition-colors"
                >
                  <span>Portable (.tar.gz)</span>
                </a>
              </div>
            </div>

            {/* Linux Card */}
            <div className="p-6 rounded-2xl bg-[#0e1628] border border-cyan-500/20 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Linux</h3>
                <p className="text-xs text-gray-400 mt-1 mb-4">Ubuntu, Debian, Fedora, Arch</p>
                <ul className="text-xs text-gray-300 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>⚡ 1-Click AppImage (Run anywhere)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Debian / Ubuntu Package (7 MB)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Zero root or dependencies needed</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <a
                  href={LINUX_APPIMAGE_URL}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg transition-colors"
                  title="Single-click executable for any Linux distro"
                >
                  <Download className="w-4 h-4" />
                  <span>⚡ 1-Click AppImage</span>
                </a>
                <a
                  href={LINUX_DEB_URL}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-medium text-[11px] transition-colors"
                >
                  <span>Debian Package (.deb)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-b border-gray-800/80 bg-[#070b14]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Questions & Answers</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-gray-800 bg-[#0c1221] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between font-semibold text-white text-sm sm:text-base hover:bg-gray-800/40 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-blue-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-gray-300 text-xs sm:text-sm leading-relaxed border-t border-gray-800/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="py-16 bg-gradient-to-b from-[#070b14] to-[#0c1221] border-b border-gray-800 text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Visualize Your First Graph?
          </h2>
          <p className="mt-4 text-gray-400 text-sm max-w-xl mx-auto">
            Try the online editor right now in your browser with zero setup, or download the desktop app.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={onOpenEditor}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Online Graph Editor</span>
            </button>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold text-sm transition-all"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-[#050810] text-gray-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span className="text-gray-300 font-semibold">CP Graph Editor</span>
            <span>— The Modern Graph Visualizer & Editor</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-gray-300">Features</a>
            <a href="#algorithms" className="hover:text-gray-300">Algorithms</a>
            <a href="#downloads" className="hover:text-gray-300">Downloads</a>
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="hover:text-gray-300 flex items-center gap-1">
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            Built with ❤️ for the Competitive Programming Community
          </div>
        </div>
      </footer>
    </div>
  );
};
