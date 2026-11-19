import React from 'react';
import { X, Download, Monitor, Apple, Terminal, Globe, ExternalLink, CheckCircle } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RELEASES_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases';
const WIN_EXE_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.0.0/CP.Graph.Editor.Setup.2.0.0.exe';
const WIN_ZIP_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.0.0/CP.Graph.Editor-2.0.0-win.zip';
const MAC_DMG_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.0.0/CP.Graph.Editor-2.0.0.dmg';
const MAC_ZIP_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.0.0/CP.Graph.Editor-2.0.0-mac.zip';
const LINUX_APPIMAGE_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.0.0/CP.Graph.Editor-2.0.0.AppImage';
const LINUX_DEB_URL = 'https://github.com/mostafa-cse/Graph-visualization/releases/download/v2.0.0/cp-graph-editor_2.0.0_amd64.deb';

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#0d1322] border border-blue-500/20 rounded-2xl shadow-2xl overflow-hidden p-6 text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Download CP Graph Editor</h2>
              <p className="text-xs text-gray-400">Available as native desktop apps for Windows, macOS, and Linux</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {/* Windows */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#141d33] border border-blue-500/15 hover:border-blue-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Monitor className="w-5 h-5" />
                <h3 className="font-semibold text-white">Windows</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">Windows 10 / 11 (64-bit)</p>
              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>NSIS Setup Wizard (.exe)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Portable ZIP archive</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-2">
              <a 
                href={WIN_EXE_URL}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer (.exe)</span>
              </a>
              <a 
                href={WIN_ZIP_URL}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] font-medium transition-colors"
              >
                <span>Portable (.zip)</span>
              </a>
            </div>
          </div>

          {/* macOS */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#141d33] border border-blue-500/15 hover:border-blue-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Apple className="w-5 h-5" />
                <h3 className="font-semibold text-white">macOS</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">macOS 11+ (Intel & Apple Silicon)</p>
              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Apple UDIF Disk Image (.dmg)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Drag to /Applications</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-2">
              <a 
                href={MAC_DMG_URL}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Disk Image (.dmg)</span>
              </a>
              <a 
                href={MAC_ZIP_URL}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] font-medium transition-colors"
              >
                <span>Portable (.zip)</span>
              </a>
            </div>
          </div>

          {/* Linux */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#141d33] border border-blue-500/15 hover:border-blue-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Terminal className="w-5 h-5" />
                <h3 className="font-semibold text-white">Linux</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">Ubuntu, Debian, Fedora, Arch</p>
              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Universal AppImage (64-bit)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Debian / Ubuntu (.deb)</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-2">
              <a 
                href={LINUX_APPIMAGE_URL}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Universal (.AppImage)</span>
              </a>
              <a 
                href={LINUX_DEB_URL}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-[11px] font-medium transition-colors"
              >
                <span>Debian Package (.deb)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Web Online Version */}
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs font-semibold text-white">Prefer using the web version?</p>
              <p className="text-[11px] text-gray-400">Zero installation required. Works in Chrome, Firefox, Safari, and Edge.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 transition-colors"
          >
            Stay on Web
          </button>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between text-xs text-gray-400">
          <span>Version 2.0.0 • Free & Open Source</span>
          <a 
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:underline"
          >
            <span>GitHub Releases page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
