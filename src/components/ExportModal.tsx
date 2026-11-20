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
  theme?: 'dark' | 'light';
}

export const ExportModal: React.FC<ExportModalProps> = ({ data, settings, onClose, theme = 'dark' }) => {
  const isLight = theme === 'light';
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
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
        }`}>
          <div className="flex items-center gap-2">
            <Download size={18} className="text-blue-500" />
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Export Graph & Code</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 pt-2 sm:pt-3 border-b overflow-x-auto no-scrollbar whitespace-nowrap shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50/50' : 'border-neutral-800 bg-neutral-950/40'
        }`}>
          <button
            onClick={() => setActiveTab('cpp')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'cpp'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode2 size={14} />
            <span>C++ Template</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'python'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode2 size={14} />
            <span>Python Template</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal size={14} />
            <span>CP Input Text</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-neutral-400 hover:text-neutral-200'
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
                className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                }`}
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <pre className={`p-4 border rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-80 ${
                isLight ? 'bg-slate-50 border-slate-200 text-emerald-700' : 'bg-neutral-950 border-neutral-800 text-emerald-400'
              }`}>
                {cppCode}
              </pre>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(pythonCode)}
                className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                }`}
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <pre className={`p-4 border rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-80 ${
                isLight ? 'bg-slate-50 border-slate-200 text-cyan-700' : 'bg-neutral-950 border-neutral-800 text-cyan-400'
              }`}>
                {pythonCode}
              </pre>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className={`flex items-center gap-2 cursor-pointer text-xs select-none ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={e => setIncludeHeader(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 focus:outline-none"
                  />
                  <span>Include <span className="font-mono text-blue-500 font-semibold">N M</span> header line ({data.nodes.length} {data.edges.length})</span>
                </label>
                <button
                  onClick={() => handleCopy(cpText)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                  }`}
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <pre className={`p-4 border rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-80 ${
                isLight ? 'bg-slate-50 border-slate-200 text-blue-700' : 'bg-neutral-950 border-neutral-800 text-blue-300'
              }`}>
                {cpText}
              </pre>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4">
              <button
                onClick={handleDownloadPng}
                className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all group cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-blue-400'
                    : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-blue-500/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon size={24} />
                </div>
                <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Download 2x PNG</span>
                <span className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>High-resolution raster for blogs/Discord</span>
              </button>

              <button
                onClick={handleDownloadSvg}
                className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all group cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-indigo-400'
                    : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-indigo-500/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform">
                  <Download size={24} />
                </div>
                <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Download SVG</span>
                <span className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Scalable vector graphics</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
