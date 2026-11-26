import { GraphData, GraphSettings, GraphNode, GraphEdge, GraphNote, NoteColor } from '../types/graph';
import { serializeGraphToCPInput, detectNodeType } from './parser';

export interface SerializedGraphPayload {
  v: number;
  nodes: {
    id: string;
    x: number;
    y: number;
    label?: string;
    color?: string;
    weight?: string | number;
    badge?: string;
    annotation?: string;
  }[];
  edges: {
    id?: string;
    source: string;
    target: string;
    weight?: number;
    color?: string;
    directed?: boolean;
    style?: 'solid' | 'dashed' | 'dotted';
    label?: string;
  }[];
  notes?: {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    isMinimized?: boolean;
    title?: string;
    text: string;
    color?: NoteColor;
  }[];
  settings: {
    isDirected: boolean;
    isWeighted: boolean;
    isZeroIndexed: boolean;
    layout: GraphSettings['layout'];
    hasHeader?: boolean;
    nodeCountPreserved?: number;
    treeRootId?: string;
  };
  theme?: 'dark' | 'light';
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return uint8ArrayToBase64Url(bytes);
}

function base64UrlToString(base64url: string): string {
  const bytes = base64UrlToUint8Array(base64url);
  return new TextDecoder().decode(bytes);
}

/**
 * Compresses an object to a URL-safe string.
 * Uses CompressionStream('deflate-raw') if available with 'd:' prefix,
 * otherwise falls back to base64url JSON with 'j:' prefix.
 */
export async function encodeGraphPayload(payload: SerializedGraphPayload): Promise<string> {
  const jsonStr = JSON.stringify(payload);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(new TextEncoder().encode(jsonStr));
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      return 'd:' + uint8ArrayToBase64Url(merged);
    } catch {
      // Fallback below
    }
  }

  return 'j:' + stringToBase64Url(jsonStr);
}

/**
 * Decodes a URL hash string back into a SerializedGraphPayload.
 */
export async function decodeGraphPayload(encoded: string): Promise<SerializedGraphPayload | null> {
  let cleaned = encoded.trim();
  if (cleaned.startsWith('#')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('graph=')) cleaned = cleaned.slice(6);
  else if (cleaned.startsWith('data=')) cleaned = cleaned.slice(5);

  if (!cleaned) return null;

  try {
    if (cleaned.startsWith('d:') && typeof DecompressionStream !== 'undefined') {
      const bytes = base64UrlToUint8Array(cleaned.slice(2));
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(bytes as unknown as BufferSource);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      const jsonStr = new TextDecoder().decode(merged);
      return JSON.parse(jsonStr);
    }

    if (cleaned.startsWith('j:')) {
      const jsonStr = base64UrlToString(cleaned.slice(2));
      return JSON.parse(jsonStr);
    }

    // Try without prefix (first decompression, then json)
    try {
      const bytes = base64UrlToUint8Array(cleaned);
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(bytes as unknown as BufferSource);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          merged.set(c, offset);
          offset += c.length;
        }
        const jsonStr = new TextDecoder().decode(merged);
        return JSON.parse(jsonStr);
      }
    } catch {}

    const jsonStr = base64UrlToString(cleaned);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to decode graph from URL hash:', err);
    return null;
  }
}

/**
 * Builds a shareable URL string based on the current graph and settings.
 */
export async function buildShareUrl(
  data: GraphData,
  settings: GraphSettings,
  theme?: 'dark' | 'light',
  notes?: GraphNote[]
): Promise<string> {
  const payload: SerializedGraphPayload = {
    v: 1,
    nodes: data.nodes.map(n => ({
      id: n.id,
      x: Math.round(n.x),
      y: Math.round(n.y),
      label: n.label !== n.id ? n.label : undefined,
      color: n.color !== '#3b82f6' ? n.color : undefined,
      weight: n.weight !== undefined ? n.weight : undefined,
      badge: n.badge,
      annotation: n.annotation,
    })),
    edges: data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight,
      color: e.color !== '#64748b' ? e.color : undefined,
      directed: e.directed !== settings.isDirected ? e.directed : undefined,
      style: e.style,
      label: e.label,
    })),
    notes: notes && notes.length > 0
      ? notes.map(nt => ({
          id: nt.id,
          x: Math.round(nt.x),
          y: Math.round(nt.y),
          width: nt.width ? Math.round(nt.width) : undefined,
          height: nt.height ? Math.round(nt.height) : undefined,
          fontSize: nt.fontSize && nt.fontSize !== 13 ? nt.fontSize : undefined,
          isMinimized: nt.isMinimized ? true : undefined,
          title: nt.title || undefined,
          text: nt.text,
          color: nt.color !== 'amber' ? nt.color : undefined,
        }))
      : undefined,
    settings: {
      isDirected: settings.isDirected,
      isWeighted: settings.isWeighted,
      isZeroIndexed: settings.isZeroIndexed,
      layout: settings.layout,
      hasHeader: settings.hasHeader,
      nodeCountPreserved: settings.nodeCountPreserved,
      treeRootId: settings.treeRootId,
    },
    theme,
  };

  const encoded = await encodeGraphPayload(payload);
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname
    : 'https://graph-editor.github.io/';
  return `${baseUrl}#graph=${encoded}`;
}

/**
 * Parses graph data from a hash string, converting it back to GraphData, GraphSettings, and rawText.
 */
export async function parseGraphFromHash(hash: string): Promise<{
  data: GraphData;
  settings: GraphSettings;
  rawText: string;
  theme?: 'dark' | 'light';
  notes?: GraphNote[];
} | null> {
  const payload = await decodeGraphPayload(hash);
  if (!payload || !payload.nodes) return null;

  const settings: GraphSettings = {
    isDirected: payload.settings?.isDirected ?? false,
    isWeighted: payload.settings?.isWeighted ?? false,
    isZeroIndexed: payload.settings?.isZeroIndexed ?? false,
    layout: payload.settings?.layout ?? 'force',
    hasHeader: payload.settings?.hasHeader ?? false,
    nodeCountPreserved: payload.settings?.nodeCountPreserved,
    treeRootId: payload.settings?.treeRootId,
  };

  const nodes: GraphNode[] = payload.nodes.map((n, i) => ({
    id: n.id,
    label: n.label || n.id,
    nodeType: detectNodeType(n.id),
    index: i + (settings.isZeroIndexed ? 0 : 1),
    x: n.x,
    y: n.y,
    color: n.color || '#3b82f6',
    weight: n.weight,
    value: n.weight,
    badge: n.badge,
    annotation: n.annotation,
  }));

  const edges: GraphEdge[] = payload.edges.map(e => ({
    id: e.id || `e-${e.source}-${e.target}-${Math.random().toString(36).substring(2, 7)}`,
    source: e.source,
    target: e.target,
    weight: e.weight,
    color: e.color || '#64748b',
    directed: e.directed !== undefined ? e.directed : settings.isDirected,
    style: e.style,
    label: e.label,
  }));

  const data: GraphData = { nodes, edges };
  const rawText = serializeGraphToCPInput(data, settings, settings.hasHeader);

  const notes: GraphNote[] = Array.isArray(payload.notes)
    ? payload.notes.map(nt => ({
        id: nt.id,
        x: nt.x,
        y: nt.y,
        width: nt.width,
        height: nt.height,
        fontSize: nt.fontSize,
        isMinimized: nt.isMinimized,
        title: nt.title,
        text: nt.text || '',
        color: nt.color || 'amber',
      }))
    : [];

  return {
    data,
    settings,
    rawText,
    theme: payload.theme,
    notes,
  };
}
