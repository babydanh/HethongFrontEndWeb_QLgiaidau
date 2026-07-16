'use client';

import React, { useState, useEffect } from 'react';
import { getFacebookShareUrl, getZaloShareUrl, getMessengerShareUrl } from '@/utils/share.util';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  fbAppId?: string; // Optional Facebook App ID
}

export default function ShareModal({ isOpen, onClose, shareUrl, title, fbAppId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Khóa cuộn trang khi Modal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset trạng thái sau 2s
    } catch (err) {
      console.error('Sao chép liên kết thất bại:', err);
    }
  };

  const openSharePopup = (url: string) => {
    const width = 600;
    const height = 450;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      url,
      'share-dialog',
      `width=${width},height=${height},left=${left},top=${top},location=no,toolbar=no,menubar=no`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 p-6 text-white shadow-2xl backdrop-blur-md transition-all duration-300 transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-lg font-semibold tracking-wide">Chia sẻ thông tin</h3>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Info Title */}
        <p className="mt-4 text-sm text-zinc-400">
          Chia sẻ <span className="font-semibold text-white">&ldquo;{title}&rdquo;</span> đến mọi người qua các nền tảng sau:
        </p>

        {/* Social Action List */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {/* Facebook */}
          <button
            onClick={() => openSharePopup(getFacebookShareUrl(shareUrl))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/50 p-4 transition-all hover:-translate-y-1 hover:border-blue-500/20 hover:bg-blue-600/10 hover:text-blue-400 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all group-hover:scale-110">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </div>
            <span className="text-xs font-medium">Facebook</span>
          </button>

          {/* Zalo */}
          <button
            onClick={() => openSharePopup(getZaloShareUrl(shareUrl))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/50 p-4 transition-all hover:-translate-y-1 hover:border-blue-400/20 hover:bg-sky-500/10 hover:text-sky-400 group"
          >
            {/* Zalo Brand Colors Icon representation */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 font-extrabold text-white text-sm transition-all group-hover:scale-110">
              Zalo
            </div>
            <span className="text-xs font-medium">Zalo</span>
          </button>

          {/* Messenger */}
          <button
            onClick={() => openSharePopup(getMessengerShareUrl(shareUrl, fbAppId))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/50 p-4 transition-all hover:-translate-y-1 hover:border-pink-500/20 hover:bg-pink-600/10 hover:text-pink-400 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 text-white transition-all group-hover:scale-110">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.145 2 11.243a8.97 8.97 0 003.582 7.084V22l3.528-1.938A10.457 10.457 0 0012 20.485c5.523 0 10-4.146 10-9.242C22 6.145 17.523 2 12 2zm1.06 12.029l-2.613-2.784-5.1 2.784 5.61-5.955 2.613 2.784 5.1-2.784z"/>
              </svg>
            </div>
            <span className="text-xs font-medium">Messenger</span>
          </button>
        </div>

        {/* Copy Link Input Area */}
        <div className="mt-6 border-t border-white/5 pt-5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Đường dẫn sao chép</label>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-950 p-2 border border-white/5 focus-within:border-emerald-500/40 transition-all">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-transparent px-2 text-sm text-zinc-300 outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 ${
                copied 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Đã chép
                </>
              ) : (
                'Sao chép'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
