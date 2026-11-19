import { GraphData, GraphSettings } from '../types/graph';

export function generateCppAdjacencyList(data: GraphData, settings: GraphSettings): string {
  const isZero = settings.isZeroIndexed;
  const isWeighted = settings.isWeighted;
  const isDirected = settings.isDirected;

  // Check if all nodes are non-negative pure integers
  const allNumeric = data.nodes.length > 0 && data.nodes.every(node => /^\d+$/.test(node.id.trim()));

  if (allNumeric) {
    let code = `// C++ Adjacency List (${isZero ? '0' : '1'}-indexed, ${isDirected ? 'Directed' : 'Undirected'}${isWeighted ? ', Weighted' : ''})\n`;
    code += `#include <bits/stdc++.h>\nusing namespace std;\n\n`;

    const maxId = Math.max(0, ...data.nodes.map(node => parseInt(node.id, 10)));
    const sizeN = Math.max(1, maxId + 2);

    if (isWeighted) {
      code += `const int N = ${sizeN};\n`;
      code += `vector<pair<int, int>> adj[N]; // {neighbor, weight}\n\n`;
      code += `void build_graph() {\n`;
      for (const e of data.edges) {
        const w = e.weight ?? 1;
        code += `    adj[${e.source}].push_back({${e.target}, ${w}});\n`;
        if (!isDirected) {
          code += `    adj[${e.target}].push_back({${e.source}, ${w}});\n`;
        }
      }
      code += `}\n`;
    } else {
      code += `const int N = ${sizeN};\n`;
      code += `vector<int> adj[N];\n\n`;
      code += `void build_graph() {\n`;
      for (const e of data.edges) {
        code += `    adj[${e.source}].push_back(${e.target});\n`;
        if (!isDirected) {
          code += `    adj[${e.target}].push_back(${e.source});\n`;
        }
      }
      code += `}\n`;
    }
    return code;
  }

  // Mixed or string/char/bool node IDs: use unordered_map<string, ...>
  let code = `// C++ Adjacency List (Supports Mixed Types: Char, String, Bool, Int)\n`;
  code += `#include <bits/stdc++.h>\nusing namespace std;\n\n`;

  if (isWeighted) {
    code += `unordered_map<string, vector<pair<string, int>>> adj; // {neighbor, weight}\n\n`;
    code += `void build_graph() {\n`;
    for (const node of data.nodes) {
      code += `    adj[${JSON.stringify(node.id)}]; // node\n`;
    }
    for (const e of data.edges) {
      const w = e.weight ?? 1;
      code += `    adj[${JSON.stringify(e.source)}].push_back({${JSON.stringify(e.target)}, ${w}});\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].push_back({${JSON.stringify(e.source)}, ${w}});\n`;
      }
    }
    code += `}\n`;
  } else {
    code += `unordered_map<string, vector<string>> adj;\n\n`;
    code += `void build_graph() {\n`;
    for (const node of data.nodes) {
      code += `    adj[${JSON.stringify(node.id)}]; // node\n`;
    }
    for (const e of data.edges) {
      code += `    adj[${JSON.stringify(e.source)}].push_back(${JSON.stringify(e.target)});\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].push_back(${JSON.stringify(e.source)});\n`;
      }
    }
    code += `}\n`;
  }

  return code;
}

export function generatePythonAdjacencyList(data: GraphData, settings: GraphSettings): string {
  const isWeighted = settings.isWeighted;
  const isDirected = settings.isDirected;

  let code = `# Python Adjacency List (Supports Mixed Types: Char, String, Bool, Int)\n`;
  code += `from collections import defaultdict\n\n`;
  code += `adj = defaultdict(list)\n\n`;
  code += `def build_graph():\n`;

  if (data.nodes.length === 0) {
    code += `    pass\n`;
    return code;
  }

  for (const node of data.nodes) {
    code += `    adj[${JSON.stringify(node.id)}] = []\n`;
  }

  for (const e of data.edges) {
    const w = e.weight ?? 1;
    if (isWeighted) {
      code += `    adj[${JSON.stringify(e.source)}].append((${JSON.stringify(e.target)}, ${w}))\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].append((${JSON.stringify(e.source)}, ${w}))\n`;
      }
    } else {
      code += `    adj[${JSON.stringify(e.source)}].append(${JSON.stringify(e.target)})\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].append(${JSON.stringify(e.source)})\n`;
      }
    }
  }

  return code;
}

export function exportSvgToFile(svgElement: SVGSVGElement, filename: string = 'graph.svg') {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add namespaces if not present
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPngFromSvg(svgElement: SVGSVGElement, filename: string = 'graph.png') {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URLObj = window.URL || window.webkitURL || window;
  const blobURL = URLObj.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2; // High-res 2x
    canvas.width = svgElement.clientWidth * scale || 1600;
    canvas.height = svgElement.clientHeight * scale || 1200;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Fill background (dark or clean)
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const png = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = png;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URLObj.revokeObjectURL(blobURL);
  };
  image.src = blobURL;
}
