import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode2, Image as ImageIcon, Terminal } from 'lucide-react';
import { GraphData, GraphSettings } from '../types/graph';
import {
  generateCppAdjacencyList,
  generatePythonAdjacencyList,
  exportSvgToFile,
  exportPngFromSvg,
} from '../utils/export';
import { serializeGraphToCPInput } from '../utils/parser';

interface ExportModalProps {
  data: GraphData;
  settings: GraphSettings;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ data, settings, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cpp' | 'python' | 'text' | 'image'>('cpp');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [copied, setCopied] = useState(false);

  const cppCode = generateCppAdjacencyList(data, settings);
  const pythonCode = generatePythonAdjacencyList(data, settings);
  const cpText = serializeGraphToCPInput(data, settings, includeHeader);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadSvg = () => {
    const svgEl = document.querySelector('svg') as SVGSVGElement | null;
    if (svgEl) {
      exportSvgToFile(svgEl, 'cp-graph.svg');
    }
  };

  const handleDownloadPng = () => {
    const svgEl = document.querySelector('svg') as SVGSVGElement | null;
    if (svgEl) {
      exportPngFromSvg(svgEl, 'cp-graph.png');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Export Graph & Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('cpp')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'cpp'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 size={14} />
            <span>C++ Template</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'python'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 size={14} />
            <span>Python Template</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={14} />
            <span>CP Input Text</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'image'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon size={14} />
            <span>Image (PNG / SVG)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'cpp' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(cppCode)}
                className="absolute top-3 right-3 flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-xs border border-slate-700 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-80">
                {cppCode}
              </pre>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(pythonCode)}
                className="absolute top-3 right-3 flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-xs border border-slate-700 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 overflow-x-auto leading-relaxed max-h-80">
                {pythonCode}
              </pre>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={e => setIncludeHeader(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0 focus:outline-none"
                  />
                  <span>Include <span className="font-mono text-blue-400 font-semibold">N M</span> header line ({data.nodes.length} {data.edges.length})</span>
                </label>
                <button
                  onClick={() => handleCopy(cpText)}
                  className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-xs border border-slate-700 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed max-h-80">
                {cpText}
              </pre>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                onClick={handleDownloadPng}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon size={24} />
                </div>
                <span className="text-sm font-semibold text-white">Download 2x PNG</span>
                <span className="text-xs text-slate-400 mt-1">High-resolution raster for blogs/Discord</span>
              </button>

              <button
                onClick={handleDownloadSvg}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                  <Download size={24} />
                </div>
                <span className="text-sm font-semibold text-white">Download SVG</span>
                <span className="text-xs text-slate-400 mt-1">Scalable vector graphics</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
