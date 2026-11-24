import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, ExternalLink, Link2, FileCode, ShieldCheck, Share2 } from 'lucide-react';
import { GraphData, GraphSettings } from '../types/graph';
import { buildShareUrl } from '../utils/share';

// Authentic, pixel-aligned brand SVG icons (zero emoji characters)
const TelegramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.301-.15-1.782-.879-2.058-.979-.276-.1-.476-.15-.676.15-.2.301-.776.979-.951 1.18-.175.201-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.494-.894-.798-1.498-1.784-1.674-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.1-.201.05-.376-.025-.527-.075-.15-.676-1.63-.927-2.234-.244-.588-.492-.508-.676-.517-.175-.009-.376-.011-.577-.011s-.527.075-.802.376c-.276.301-1.053 1.029-1.053 2.509 0 1.48 1.078 2.909 1.229 3.11.15.201 2.122 3.241 5.141 4.545.718.31 1.278.495 1.716.634.721.23 1.377.197 1.896.12.578-.087 1.782-.728 2.032-1.431.25-.703.25-1.305.175-1.43-.075-.126-.276-.201-.577-.352zM12 2a9.93 9.93 0 00-8.514 15.068L2 22l5.05-1.326A9.935 9.935 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
  </svg>
);

const XTwitterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 13, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 13, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface ShareModalProps {
  data: GraphData;
  settings: GraphSettings;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  data,
  settings,
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  // Body scroll lock & Escape listener
  useEffect(() => {
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
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;
    buildShareUrl(data, settings, theme).then(url => {
      if (isMounted) {
        setShareUrl(url);
        setIsGenerating(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [data, settings, theme]);

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const markdownLink = `[View Graph on CP Graph Editor](${shareUrl})`;
  const handleCopyMarkdown = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(markdownLink);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const handleNativeShare = async () => {
    if (!shareUrl || !canNativeShare) return;
    try {
      await navigator.share({
        title: `CP Graph (${data.nodes.length} nodes, ${data.edges.length} edges)`,
        text: `Interactive Graph (${data.nodes.length} nodes, ${data.edges.length} edges):`,
        url: shareUrl,
      });
    } catch {
      // User cancelled share
    }
  };

  // Pre-formatted sharing links
  const encodedUrl = encodeURIComponent(shareUrl);
  const shareText = encodeURIComponent(`Check out this graph on CP Graph Editor (${data.nodes.length} nodes, ${data.edges.length} edges):`);
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${shareText}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 select-none animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl overflow-hidden flex flex-col transition-colors border shadow-2xl ${
          isLight
            ? 'bg-white/95 border-slate-200/90 shadow-slate-300/40 text-slate-900'
            : 'bg-neutral-950/95 border-neutral-800/90 shadow-[0_24px_70px_rgba(0,0,0,0.75)] text-neutral-100 ring-1 ring-white/5'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800/80 bg-neutral-900/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Link2 size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="share-modal-title" className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Share Graph Link
                </h3>
                <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}>
                  {data.nodes.length} nodes · {data.edges.length} edges
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Instant client-side link with embedded graph state
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Close modal (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain">
          {/* URL Box Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`text-[11px] font-semibold tracking-wider uppercase ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
                Shareable URL
              </span>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                {shareUrl.length} chars · Deflate compressed
              </span>
            </div>

            <div
              className={`flex items-center gap-2 p-1.5 pl-3 rounded-xl border text-xs font-mono transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'
                  : 'bg-neutral-900/70 border-neutral-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10'
              }`}
            >
              <Link2 size={13} className={`shrink-0 ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
              <input
                type="text"
                readOnly
                data-testid="share-url-input"
                value={isGenerating ? 'Generating compressed link...' : shareUrl}
                className={`flex-1 bg-transparent border-none outline-none truncate select-all text-xs font-mono ${
                  isLight ? 'text-slate-800' : 'text-neutral-200'
                }`}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer active:scale-95 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/20'
                }`}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyMarkdown}
              disabled={isGenerating}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-[0.98] ${
                copiedMarkdown
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : isLight
                    ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-neutral-900/60 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
              }`}
            >
              {copiedMarkdown ? <Check size={14} className="text-emerald-500" /> : <FileCode size={14} />}
              <span>{copiedMarkdown ? 'Copied Markdown' : 'Copy as Markdown'}</span>
            </button>

            {canNativeShare ? (
              <button
                onClick={handleNativeShare}
                disabled={isGenerating}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-neutral-900/60 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                <Share2 size={14} />
                <span>Share via System</span>
              </button>
            ) : (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-neutral-900/60 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                <ExternalLink size={14} />
                <span>Open in New Tab</span>
              </a>
            )}
          </div>

          {/* Social Platform Direct Sharing */}
          <div className="space-y-2 pt-1">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${
              isLight ? 'text-slate-500' : 'text-neutral-400'
            }`}>
              Share directly to
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  isLight
                    ? 'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-700'
                    : 'bg-neutral-900/60 hover:bg-sky-950/40 border-neutral-800 hover:border-sky-500/40 text-neutral-300 hover:text-sky-400'
                }`}
              >
                <TelegramIcon size={14} className="shrink-0" />
                <span>Telegram</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  isLight
                    ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700'
                    : 'bg-neutral-900/60 hover:bg-emerald-950/40 border-neutral-800 hover:border-emerald-500/40 text-neutral-300 hover:text-emerald-400'
                }`}
              >
                <WhatsAppIcon size={14} className="shrink-0" />
                <span>WhatsApp</span>
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900'
                    : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                <XTwitterIcon size={13} className="shrink-0" />
                <span>X / Twitter</span>
              </a>
            </div>
          </div>

          {/* Security & Decentralization Notice */}
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-[11px] leading-relaxed transition-colors ${
              isLight
                ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                : 'bg-neutral-900/40 border-neutral-800/70 text-neutral-400'
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>
              Zero database storage. Entire graph data (nodes, edges, positions &amp; settings) is compressed directly into the URL hash fragment.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t text-xs flex items-center justify-between shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50/80 text-slate-500' : 'border-neutral-800/80 bg-neutral-950 text-neutral-400'
          }`}
        >
          <span className="text-[11px]">Serverless URL state</span>
          <a
            href="https://github.com/mostafa-cse"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors"
          >
            <GithubIcon size={13} />
            <span>@mostafa-cse</span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};
