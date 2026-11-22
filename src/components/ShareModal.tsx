import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, ExternalLink, Link2, Share2, Sparkles, Send } from 'lucide-react';
import { GraphData, GraphSettings } from '../types/graph';
import { buildShareUrl } from '../utils/share';

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

  // Pre-formatted sharing links
  const encodedUrl = encodeURIComponent(shareUrl);
  const shareText = encodeURIComponent(`Check out this graph on CP Graph Editor (${data.nodes.length} nodes, ${data.edges.length} edges):`);
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${shareText}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 select-none animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-neutral-800 text-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-500 flex items-center justify-center">
              <Link2 size={14} />
            </div>
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Share Graph Link
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                Shareable URL (Zero Backend)
              </span>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                {shareUrl.length} chars • Deflate compressed
              </span>
            </div>

            <div
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-mono transition-colors ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-900/80 border-neutral-800'
              }`}
            >
              <input
                type="text"
                readOnly
                data-testid="share-url-input"
                value={isGenerating ? 'Generating compressed link...' : shareUrl}
                className={`flex-1 bg-transparent border-none outline-none truncate select-all ${
                  isLight ? 'text-slate-800' : 'text-neutral-200'
                }`}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyMarkdown}
              disabled={isGenerating}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
            >
              {copiedMarkdown ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedMarkdown ? 'Copied Markdown!' : 'Copy as Markdown'}</span>
            </button>

            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
            >
              <ExternalLink size={14} />
              <span>Open in New Tab</span>
            </a>
          </div>

          {/* Social / Community Sharing */}
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${
              isLight ? 'text-slate-500' : 'text-neutral-400'
            }`}>
              Share directly to
            </div>
            <div className="flex items-center gap-2">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  isLight
                    ? 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700'
                    : 'bg-sky-950/40 hover:bg-sky-900/60 border-sky-500/30 text-sky-300'
                }`}
              >
                <Send size={13} />
                <span>Telegram</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  isLight
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
                }`}
              >
                <Sparkles size={13} />
                <span>X / Twitter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t text-xs flex items-center justify-between shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-neutral-800 bg-neutral-950/80 text-neutral-400'
          }`}
        >
          <span className="text-[11px]">No database needed. All data lives in the URL hash.</span>
          <a
            href="https://github.com/mostafa-cse"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:underline font-semibold"
          >
            @mostafa-cse
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};
