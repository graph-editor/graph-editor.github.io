import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Monitor, Apple, Terminal, Globe, ExternalLink, CheckCircle } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const RELEASES_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases';
const WIN_EXE_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases/download/v2.2.0/CP.Graph.Editor_2.2.0_x64-setup.exe';
const WIN_ZIP_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases/download/v2.2.0/CP.Graph.Editor_2.2.0_x64_en-US.msi';
const MAC_DMG_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases/download/v2.2.0/CP.Graph.Editor_2.2.0_universal.dmg';
const MAC_ZIP_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases/download/v2.2.0/CP.Graph.Editor_universal.app.tar.gz';
const LINUX_APPIMAGE_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases/download/v2.2.0/CP.Graph.Editor_2.2.0_amd64.AppImage';
const LINUX_DEB_URL = 'https://github.com/graph-editor/graph-editor.github.io/releases/download/v2.2.0/CP.Graph.Editor_2.2.0_amd64.deb';

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, theme = 'dark' }) => {
  // Body scroll lock & Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isLight = theme === 'light';

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-colors border ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-black border-neutral-800 text-neutral-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Download CP Graph Editor
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Available as native desktop apps for Windows, macOS, and Linux
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain">
          {/* Platform Download Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Windows */}
            <div className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              isLight
                ? 'bg-slate-50 border-slate-200 hover:border-blue-400'
                : 'bg-neutral-950 border-neutral-800 hover:border-blue-500/40'
            }`}>
              <div>
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Monitor className="w-5 h-5" />
                  <h3 className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Windows</h3>
                </div>
                <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Windows 10 / 11 (64-bit)</p>
                <div className={`space-y-1.5 text-[11px] ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>⚡ 1-Click Instant Setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Auto-install & desktop icon</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 pt-3 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
                <a 
                  href={WIN_EXE_URL}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                  title="Single-click to install and launch instantly"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>⚡ 1-Click Setup (.exe)</span>
                </a>
                <a 
                  href={WIN_ZIP_URL}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span>MSI Installer (.msi)</span>
                </a>
              </div>
            </div>

            {/* macOS */}
            <div className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              isLight
                ? 'bg-slate-50 border-slate-200 hover:border-purple-400'
                : 'bg-neutral-950 border-neutral-800 hover:border-purple-500/40'
            }`}>
              <div>
                <div className="flex items-center gap-2 text-purple-500 mb-2">
                  <Apple className="w-5 h-5" />
                  <h3 className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>macOS</h3>
                </div>
                <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>macOS 11+ (Intel & Apple Silicon)</p>
                <div className={`space-y-1.5 text-[11px] ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Universal Disk Image</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>M1/M2/M3/M4 & Intel native</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 pt-3 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
                <a 
                  href={MAC_DMG_URL}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Disk Image (.dmg)</span>
                </a>
                <a 
                  href={MAC_ZIP_URL}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span>Portable (.tar.gz)</span>
                </a>
              </div>
            </div>

            {/* Linux */}
            <div className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              isLight
                ? 'bg-slate-50 border-slate-200 hover:border-cyan-400'
                : 'bg-neutral-950 border-neutral-800 hover:border-cyan-500/40'
            }`}>
              <div>
                <div className="flex items-center gap-2 text-cyan-500 mb-2">
                  <Terminal className="w-5 h-5" />
                  <h3 className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Linux</h3>
                </div>
                <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Ubuntu, Debian, Fedora, Arch</p>
                <div className={`space-y-1.5 text-[11px] ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>⚡ 1-Click AppImage (Portable)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Lightweight DEB package</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 pt-3 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
                <a 
                  href={LINUX_APPIMAGE_URL}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
                  title="Single-click executable for any Linux distro"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>⚡ 1-Click AppImage</span>
                </a>
                <a 
                  href={LINUX_DEB_URL}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span>Debian / Ubuntu (.deb)</span>
                </a>
              </div>
            </div>
          </div>

          {/* 1-Click Terminal Install One-Liner */}
          <div className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-slate-50 border-blue-200' : 'bg-neutral-950 border-blue-900/50'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                <span>⚡ 1-Click Terminal Installer (Linux &amp; macOS):</span>
              </span>
            </div>
            <div className={`p-2 rounded border font-mono text-[11px] select-all overflow-x-auto ${
              isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-black border-neutral-800 text-neutral-300'
            }`}>
              curl -fsSL https://raw.githubusercontent.com/graph-editor/graph-editor.github.io/master/install.sh | bash
            </div>
          </div>

          {/* Web Online Version */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-950/20 border-blue-900/40'
          }`}>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-500" />
              <div>
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Prefer using the web version?</p>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Zero installation required. Works in Chrome, Firefox, Safari, and Edge.</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              Stay on Web
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-neutral-800 bg-neutral-950/80 text-neutral-500'
        }`}>
          <span>Version 2.2.0 • Free & Open Source</span>
          <a 
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-500 hover:underline"
          >
            <span>GitHub Releases</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};
