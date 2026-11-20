# CP Graph Visualizer & Editor (Competitive Programming)

A classic, ultra-clean, and high-performance Graph Visualizer and Editor built specifically for **Competitive Programming** (Codeforces, AtCoder, CSES, LeetCode, ICPC, USACO).

---

## 🚀 Key Features for Competitive Programming

### 1. Smart CP Input / Output Parsing
* **Standard CP Edge List**: Automatically parses headers `N M` followed by $M$ lines of `u v` or `u v w`.
* **Headerless Edge List**: Directly paste raw edge pairs.
* **Preserves Isolated Vertices**: When $N$ vertices are declared in `N M`, vertices with degree 0 are preserved.
* **0-Indexed vs 1-Indexed Live Toggle**: Switch between 1-based (Codeforces/CSES) and 0-based (LeetCode/Python) with one click; immediately updates all labels, canvas nodes, and editor text.
* **Tree as Parent Array**: Parses AtCoder/Codeforces tree parent arrays ($p_2, p_3, \dots, p_n$).
* **Adjacency Matrix & Adjacency List**: Paste standard $N \times N$ matrices or list representations.
* **Live Bidirectional Synchronization**: Typing testcases updates the visual canvas in real-time; dragging or editing visual nodes updates the CP text editor.

### 2. Interactive Visual Graph Canvas & Freehand Lasso Multi-Select
* **Move Nodes**: Effortless 60fps dragging with global cursor tracking (never drops or gets stuck).
* **Freehand Lasso Multi-Selection (`L`)**:
  * Draw a freehand selection loop around any group of nodes and crossing edges.
  * Selected nodes and edges are highlighted with a glowing convex perimeter.
  * Move all selected nodes together in real-time.
  * Live floating **Batch Action Toolbar** allows 1-click batch coloring, batch deleting (`Del`), and batch weight/value assignments with live preview.
* **Double-Click Canvas**: Instantly adds a new node at cursor position.
* **Dual Contrast Themes**: 1-click switcher between OLED Pitch Dark Black (`#000000`) and Clean White (`#ffffff`).
* **Professional Typography**: JetBrains Mono, Google Sans, Plus Jakarta Sans, and Inter with code ligatures and tabular numbers.
* **Adaptive Mobile & Touch Layout**: Slide-over drawers, touch gesture drag, pinch-to-zoom, and dynamic viewport units.
* **Connect Edges**: Dedicated Connect tool (`E`) for clicking or dragging between nodes.
* **Color Nodes & Edges**: 10 curated high-contrast CP palette colors.
* **Weighted Nodes & Multi-Type Values**:
  * Nodes can hold arbitrary weights or values: numbers (integers, floats), characters (`'A'`), strings (`"city"`), and booleans (`true`).
  * Supports bracket syntax (`u [w]`) and assignment syntax (`u: w` or `u = w`).
  * Live visual weight badge (`w:<weight>`) rendered beneath nodes on canvas without overlapping trace labels.
  * Live type detection (`int`, `char`, `bool`, `string`) in the Properties Inspector with presets and C++/Python code export.
* **Curved Parallel Multi-Edges & Self-Loops**: Multi-edges curve gracefully with distinct offsets; self-loops are rendered with circular arcs so parallel edges and weights never collide.
* **Clear Arrowheads**: Directed edges stop right at node boundaries so arrowheads are never obscured.
* **Infinite Pan & Zoom**: Smooth mouse wheel zoom, pan, and **Fit to View** (`F`).
* **Continuous Force Physics**: Spring-electric force layout with Play/Pause toggle (`Space`).

### 3. Specialized Layout Engines
* **Organic Force**: Natural physics with repulsion, attraction, collision buffers.
* **Hierarchical Tree**: Reingold-Tilford level layout with selectable root node (ideal for Tree DP & rerooting).
* **Topological DAG**: Layered left-to-right columns according to topological order.
* **Bipartite Columns**: Partitions 2-colorable graphs into Set A (Left) and Set B (Right).
* **Circular Ring**: Equidistant circumference (ideal for $K_n$, Hamiltonian cycles).
* **Grid Lattice**: $R \times C$ rectangular layout for grid/maze problems.

### 4. Built-in CP Algorithms & Step Tracers
Step-by-step playback with forward, backward, auto-play, speed control, and CP terminology event log:
* **BFS**: Level discovery, queue state, unweighted shortest path.
* **DFS**: Call stack, entry time `tin[]`, exit time `tout[]`, edge classification (tree vs back edge / cycle).
* **Dijkstra**: Priority queue state, distance array `dist[]`, edge relaxations.
* **Topological Sort**: Kahn's algorithm, in-degree updates, cycle detection.
* **Tarjan's SCC**: Low-links, stack of active vertices, colors each component distinctly.
* **Bridges & Articulation Points**: Finds critical cut edges and cut vertices with pulsing badges.
* **Kruskal's MST**: Sorted edge list, DSU union/find steps, highlights MST edges.
* **Bipartite 2-Coloring Check**: Visualizes 2-coloring or highlights odd cycle conflict.

### 5. CP Presets & Generators
* **Bamboo / Line Graph**: $1 - 2 - \dots - N$ (tests recursion depth).
* **Star Graph**: Central hub connected to all leaves (tests $O(N)$ degree).
* **Complete Graph ($K_n$)**: Every pair connected.
* **Random Tree**: Uniform random tree generator.
* **Random DAG**: Directed acyclic graph.
* **Grid Lattice**: $3 \times 4$ or $R \times C$ 4-connected grid.
* **Simple Cycle ($C_n$)**: Cycle graph.

### 6. Code & Image Export
* **C++ Template**: Pre-populated `vector<pair<int, int>> adj[N]` ready to paste into solutions.
* **Python Template**: `defaultdict(list)` ready for competitive scripts.
* **CP Input Text**: Formatted with `N M` and edges.
* **2x High-Resolution PNG & Scalable SVG**: Export images for Codeforces blogs and Discord editorials.

---

## ⌨️ Keyboard & Mouse Controls

| Action | Control / Shortcut |
| :--- | :--- |
| **Move / Drag Node** | Click and drag any node in Move mode (`V` / `S`) |
| **Lasso Multi-Select** | Draw freehand enclosure around nodes/edges with Lasso tool (`L`) |
| **Add Node** | **Double-click** on empty canvas or use Add Node tool (`N`) |
| **Pan Canvas** | Click and drag empty canvas background or middle-click drag |
| **Zoom Canvas** | Mouse scroll wheel (centered at mouse position) |
| **Connect Edges** | Connect tool (`E`), then click or drag between two nodes |
| **Delete Element(s)** | Select node, edge, or lasso group and press `Del` / `Backspace` |
| **Toggle Physics** | `Space` bar |
| **Fit to View** | `F` key |
| **Toggle Directed** | `D` key |
| **Toggle Weighted** | `W` key |
| **Cancel All Actions** | `Esc` key (cancels active tool, connect line, node/edge selection, inspector, algorithm playback, and modals) |

---

## 🖥️ Cross-Platform Desktop Applications (Ubuntu, Windows & macOS)

CP Graph Editor is fully packaged as native desktop applications for **Ubuntu / Linux**, **Windows**, and **macOS**.

### Pre-built Binaries (in `release/` directory)

| Platform | Format / Package | File Path | Running Instructions |
| :--- | :--- | :--- | :--- |
| **macOS** | **Apple Disk Image (DMG)** | [`release/CP Graph Editor-2.1.0.dmg`](file:///home/m0stafa/Documents/Graph%20Editor/release/CP%20Graph%20Editor-2.1.0.dmg) | Double-click to mount and drag `CP Graph Editor.app` to `/Applications` |
| **macOS** | **Mac App ZIP / Bundle** | [`release/CP Graph Editor-2.1.0-mac.zip`](file:///home/m0stafa/Documents/Graph%20Editor/release/CP%20Graph%20Editor-2.1.0-mac.zip) | Unzip to get [`CP Graph Editor.app`](file:///home/m0stafa/Documents/Graph%20Editor/release/mac/CP%20Graph%20Editor.app) and launch |
| **Windows** | **Installer Setup (NSIS)** | [`release/CP Graph Editor Setup 2.1.0.exe`](file:///home/m0stafa/Documents/Graph%20Editor/release/CP%20Graph%20Editor%20Setup%202.1.0.exe) | Double-click to run setup wizard (custom path, desktop & start menu shortcuts) |
| **Windows** | **Portable ZIP / EXE** | [`release/CP Graph Editor-2.1.0-win.zip`](file:///home/m0stafa/Documents/Graph%20Editor/release/CP%20Graph%20Editor-2.1.0-win.zip) | Extract zip and double-click `CP Graph Editor.exe` (or run from [`release/win-unpacked/`](file:///home/m0stafa/Documents/Graph%20Editor/release/win-unpacked/)) |
| **Ubuntu / Linux** | **AppImage** (standalone) | [`release/CP Graph Editor-2.1.0.AppImage`](file:///home/m0stafa/Documents/Graph%20Editor/release/CP%20Graph%20Editor-2.1.0.AppImage) | `chmod +x release/*.AppImage && ./release/*.AppImage` |
| **Ubuntu / Debian** | **DEB package** | [`release/cp-graph-editor_2.1.0_amd64.deb`](file:///home/m0stafa/Documents/Graph%20Editor/release/cp-graph-editor_2.1.0_amd64.deb) | `sudo dpkg -i release/cp-graph-editor_2.1.0_amd64.deb` |

---

## 🛠️ Build & Package Commands

```bash
# 1. Start Vite dev server in web browser
pnpm dev

# 2. Launch live Desktop app in development mode
pnpm electron:dev

# 3. Build Ubuntu / Linux standalone AppImage and .deb installer
pnpm package:linux

# 4. Build Windows installer (.exe via NSIS) and portable ZIP
pnpm package:win

# 5. Build macOS DMG disk image (.dmg) and application ZIP (.app)
pnpm package:mac

# 6. Build all platforms simultaneously
pnpm package:all
```

### Automated Multi-Platform CI / CD
The repository includes a ready-to-run GitHub Actions workflow at [`.github/workflows/desktop-builds.yml`](file:///home/m0stafa/Documents/Graph%20Editor/.github/workflows/desktop-builds.yml) which automatically compiles and uploads artifacts across `ubuntu-latest`, `windows-latest` (NSIS installer), and `macos-latest` (DMG & universal binaries).

# Preview build
pnpm preview
```

---

## 👤 Author & Maintainer

Created, designed, and maintained by **Mostafa** ([@mostafa-cse](https://github.com/mostafa-cse)).

* GitHub: [https://github.com/mostafa-cse](https://github.com/mostafa-cse)
* Project: [https://github.com/graph-editor/graph-editor.github.io](https://github.com/graph-editor/graph-editor.github.io)
* Live Web App: [https://graph-editor.github.io/](https://graph-editor.github.io/)
