'use client';

import React, { useState, useEffect } from 'react';
import { getFacebookShareUrl, getZaloShareUrl, getMessengerShareUrl } from '@/utils/share.util';
import toast from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  fbAppId?: string; // Optional Facebook App ID
}

export default function ShareModal({ isOpen, onClose, shareUrl, title, fbAppId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const supportNativeShare = mounted && typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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
      toast.success('Đã sao chép liên kết chia sẻ!');
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

  const handleInstagramShare = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Đã chép link! Hãy dán vào Instagram.');
      setTimeout(() => {
        window.open('https://instagram.com', '_blank');
      }, 800);
    } catch (err) {
      window.open('https://instagram.com', '_blank');
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: title,
        text: `Xem ngay: ${title}`,
        url: shareUrl,
      });
    } catch (err) {
      console.log('Native share failed or dismissed', err);
    }
  };

  // URL generators
  const getTwitterShareUrl = (url: string, text: string) => 
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  
  const getThreadsShareUrl = (url: string, text: string) => 
    `https://threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`;

  const getTelegramShareUrl = (url: string, text: string) => 
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 p-6 text-white shadow-2xl backdrop-blur-md transition-all duration-300 transform scale-100 mx-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-lg font-bold tracking-wide">Chia sẻ thông tin</h3>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Info Title */}
        <p className="mt-4 text-xs text-zinc-400 font-semibold leading-relaxed">
          Chia sẻ <span className="font-black text-white">&ldquo;{title}&rdquo;</span> đến bạn bè của bạn:
        </p>

        {/* Social Action Grid */}
        <div className="mt-6 grid grid-cols-4 gap-2.5">
          {/* Zalo */}
          <button
            onClick={() => openSharePopup(getZaloShareUrl(shareUrl))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-blue-400/20 hover:bg-sky-500/10 hover:text-sky-400 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0068ff] font-extrabold text-white text-[11px] transition-all group-hover:scale-105">
              Zalo
            </div>
            <span className="text-[10px] font-bold">Zalo</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() => openSharePopup(getFacebookShareUrl(shareUrl))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-blue-500/20 hover:bg-blue-600/10 hover:text-blue-400 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition-all group-hover:scale-105">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold">Facebook</span>
          </button>

          {/* Messenger */}
          <button
            onClick={() => openSharePopup(getMessengerShareUrl(shareUrl, fbAppId))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-pink-500/20 hover:bg-pink-600/10 hover:text-pink-400 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 text-white transition-all group-hover:scale-105">
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.145 2 11.243a8.97 8.97 0 003.582 7.084V22l3.528-1.938A10.457 10.457 0 0012 20.485c5.523 0 10-4.146 10-9.242C22 6.145 17.523 2 12 2zm1.06 12.029l-2.613-2.784-5.1 2.784 5.61-5.955 2.613 2.784 5.1-2.784z"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold">Messenger</span>
          </button>

          {/* Telegram */}
          <button
            onClick={() => openSharePopup(getTelegramShareUrl(shareUrl, title))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-sky-500/20 hover:bg-sky-600/10 hover:text-sky-400 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#229ED9] text-white transition-all group-hover:scale-105">
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 8.01-3.43 3.81-1.56 4.6-.1.08.3z"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold">Telegram</span>
          </button>

          {/* Twitter (X) */}
          <button
            onClick={() => openSharePopup(getTwitterShareUrl(shareUrl, title))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-slate-500/20 hover:bg-slate-700/10 hover:text-white group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white border border-zinc-850 transition-all group-hover:scale-105">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold">Twitter X</span>
          </button>

          {/* Threads */}
          <button
            onClick={() => openSharePopup(getThreadsShareUrl(shareUrl, title))}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-slate-500/20 hover:bg-slate-700/10 hover:text-white group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white border border-zinc-850 transition-all group-hover:scale-105">
              <span className="font-extrabold text-[12px] italic tracking-tight">Th.</span>
            </div>
            <span className="text-[10px] font-bold">Threads</span>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagramShare}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-zinc-800/40 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-pink-500/20 hover:bg-pink-500/10 hover:text-pink-400 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 text-white transition-all group-hover:scale-105">
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold">Instagram</span>
          </button>

          {/* Native System Share */}
          {supportNativeShare && (
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/20 py-3.5 px-1.5 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-emerald-600/10 hover:text-emerald-400 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white transition-all group-hover:scale-105">
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-emerald-550">Chọn người...</span>
            </button>
          )}
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
