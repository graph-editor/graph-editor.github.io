import { GraphData, GraphSettings } from '../types/graph';

export function generateCppAdjacencyList(data: GraphData, settings: GraphSettings): string {
  const isZero = settings.isZeroIndexed;
  const isWeighted = settings.isWeighted;
  const isDirected = settings.isDirected;

  // Check if all nodes are non-negative pure integers
  const allNumeric = data.nodes.length > 0 && data.nodes.every(node => /^\d+$/.test(node.id.trim()));
  const allEdgeWeightsNumeric =
    !isWeighted ||
    data.edges.every(
      e =>
        e.weight === undefined ||
        typeof e.weight === 'number' ||
        (String(e.weight).trim() !== '' && !isNaN(Number(e.weight)))
    );
  const edgeWeightCppType = allEdgeWeightsNumeric ? 'int' : 'string';

  if (allNumeric) {
    let code = `// C++ Adjacency List (${isZero ? '0' : '1'}-indexed, ${isDirected ? 'Directed' : 'Undirected'}${isWeighted ? ', Weighted' : ''})\n`;
    code += `#include <bits/stdc++.h>\nusing namespace std;\n\n`;

    const maxId = Math.max(0, ...data.nodes.map(node => parseInt(node.id, 10)));
    const sizeN = Math.max(1, maxId + 2);

    const weightedNodes = data.nodes.filter(
      n => n.weight !== undefined && n.weight !== null && String(n.weight).trim() !== ''
    );

    code += `const int N = ${sizeN};\n`;
    if (isWeighted) {
      code += `vector<pair<int, ${edgeWeightCppType}>> adj[N]; // {neighbor, weight}\n`;
    } else {
      code += `vector<int> adj[N];\n`;
    }

    if (weightedNodes.length > 0) {
      const allWeightsInt = weightedNodes.every(n => typeof n.weight === 'number' || /^-?\d+$/.test(String(n.weight)));
      if (allWeightsInt) {
        code += `long long node_val[N]; // Node weights / values\n`;
      } else {
        code += `string node_val[N]; // Node weights / values\n`;
      }
    }
    code += `\nvoid build_graph() {\n`;

    if (weightedNodes.length > 0) {
      for (const n of weightedNodes) {
        const val = typeof n.weight === 'number' ? n.weight : JSON.stringify(String(n.weight));
        code += `    node_val[${n.id}] = ${val};\n`;
      }
    }

    if (isWeighted) {
      for (const e of data.edges) {
        const rawW = e.weight ?? 1;
        const w = allEdgeWeightsNumeric ? rawW : JSON.stringify(String(rawW));
        code += `    adj[${e.source}].push_back({${e.target}, ${w}});\n`;
        if (!isDirected) {
          code += `    adj[${e.target}].push_back({${e.source}, ${w}});\n`;
        }
      }
    } else {
      for (const e of data.edges) {
        code += `    adj[${e.source}].push_back(${e.target});\n`;
        if (!isDirected) {
          code += `    adj[${e.target}].push_back(${e.source});\n`;
        }
      }
    }
    code += `}\n`;
    return code;
  }

  // Mixed or string/char/bool node IDs: use unordered_map<string, ...>
  let code = `// C++ Adjacency List (Supports Mixed Types: Char, String, Bool, Int)\n`;
  code += `#include <bits/stdc++.h>\nusing namespace std;\n\n`;

  const weightedNodes = data.nodes.filter(
    n => n.weight !== undefined && n.weight !== null && String(n.weight).trim() !== ''
  );

  if (isWeighted) {
    code += `unordered_map<string, vector<pair<string, ${edgeWeightCppType}>>> adj; // {neighbor, weight}\n`;
  } else {
    code += `unordered_map<string, vector<string>> adj;\n`;
  }

  if (weightedNodes.length > 0) {
    code += `unordered_map<string, string> node_val; // Node weights / values\n`;
  }
  code += `\nvoid build_graph() {\n`;

  if (weightedNodes.length > 0) {
    for (const n of weightedNodes) {
      code += `    node_val[${JSON.stringify(n.id)}] = ${JSON.stringify(String(n.weight))};\n`;
    }
  }

  for (const node of data.nodes) {
    code += `    adj[${JSON.stringify(node.id)}]; // node\n`;
  }
  for (const e of data.edges) {
    const rawW = e.weight ?? 1;
    const w = allEdgeWeightsNumeric ? rawW : JSON.stringify(String(rawW));
    if (isWeighted) {
      code += `    adj[${JSON.stringify(e.source)}].push_back({${JSON.stringify(e.target)}, ${w}});\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].push_back({${JSON.stringify(e.source)}, ${w}});\n`;
      }
    } else {
      code += `    adj[${JSON.stringify(e.source)}].push_back(${JSON.stringify(e.target)});\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].push_back(${JSON.stringify(e.source)});\n`;
      }
    }
  }
  code += `}\n`;

  return code;
}

export function generatePythonAdjacencyList(data: GraphData, settings: GraphSettings): string {
  const isWeighted = settings.isWeighted;
  const isDirected = settings.isDirected;

  const weightedNodes = data.nodes.filter(
    n => n.weight !== undefined && n.weight !== null && String(n.weight).trim() !== ''
  );

  let code = `# Python Adjacency List (Supports Mixed Types: Char, String, Bool, Int)\n`;
  code += `from collections import defaultdict\n\n`;
  code += `adj = defaultdict(list)\n`;
  if (weightedNodes.length > 0) {
    code += `node_val = {}  # Node weights / values\n`;
  }
  code += `\ndef build_graph():\n`;

  if (data.nodes.length === 0) {
    code += `    pass\n`;
    return code;
  }

  if (weightedNodes.length > 0) {
    for (const node of weightedNodes) {
      code += `    node_val[${JSON.stringify(node.id)}] = ${JSON.stringify(node.weight)}\n`;
    }
  }

  for (const node of data.nodes) {
    code += `    adj[${JSON.stringify(node.id)}] = []\n`;
  }

  for (const e of data.edges) {
    const w = e.weight ?? 1;
    if (isWeighted) {
      code += `    adj[${JSON.stringify(e.source)}].append((${JSON.stringify(e.target)}, ${JSON.stringify(w)}))\n`;
      if (!isDirected) {
        code += `    adj[${JSON.stringify(e.target)}].append((${JSON.stringify(e.source)}, ${JSON.stringify(w)}))\n`;
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
