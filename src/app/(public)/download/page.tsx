'use client';

// Reading this as: App Download Landing Page for VNSPORT users, with a modern, high-contrast dark-tech language, leaning toward dark mesh + glassy backdrop + vibrant emerald & neon accents.

import Link from 'next/link';
import Image from 'next/image';
import { Download, CheckCircle2, ShieldCheck, Zap, Sparkles, ArrowRight, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

function GooglePlaySvg({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.2 24.3C44.7 27 43.3 31.2 43.3 36.6V475.4C43.3 480.8 44.7 485 47.2 487.7L48.6 489.1L282.8 254.9V257.1V254.9L48.6 22.9L47.2 24.3Z" fill="url(#gplay_a)"/>
      <path d="M360.8 333L282.8 254.9V257.1V254.9L360.8 179L361.7 179.5L425.5 215.8C443.7 226.1 443.7 243.1 425.5 253.5L361.7 289.7L360.8 333Z" fill="url(#gplay_b)"/>
      <path d="M361.7 289.7L282.8 254.9L47.2 487.7C53.3 494.2 63.3 495.1 74.6 488.7L361.7 289.7Z" fill="url(#gplay_c)"/>
      <path d="M361.7 179.5L74.6 16.5C63.3 10.1 53.3 11 47.2 17.5L282.8 254.9L361.7 179.5Z" fill="url(#gplay_d)"/>
      <defs>
        <linearGradient id="gplay_a" x1="262.8" y1="33" x2="16.5" y2="279.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A0FF"/>
          <stop offset="1" stopColor="#00A1FF"/>
        </linearGradient>
        <linearGradient id="gplay_b" x1="447.8" y1="247.1" x2="40.3" y2="247.1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFCC00"/>
          <stop offset="1" stopColor="#FFAA00"/>
        </linearGradient>
        <linearGradient id="gplay_c" x1="392" y1="272.5" x2="9.8" y2="655" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3333"/>
          <stop offset="1" stopColor="#FF0000"/>
        </linearGradient>
        <linearGradient id="gplay_d" x1="9.8" y1="-160.8" x2="392" y2="221.7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E676"/>
          <stop offset="1" stopColor="#00C853"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function AppleSvg({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-14.7 69.5-34.3z"/>
    </svg>
  );
}

export default function DownloadPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0A0E1A] text-slate-100 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/15 via-emerald-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-emerald-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[160px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 relative z-10">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          {/* Version Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-emerald-400 mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Phiên bản v1.0.2 (Build 3) &bull; Mới nhất 2026</span>
          </div>

          {/* Large prominent VNSPORT Logo */}
          <div className="relative inline-block mb-6 group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-emerald-500/30 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-center">
              <Image 
                src="/vndcsport.svg" 
                alt="VNSPORT Logo" 
                width={280} 
                height={80} 
                className="w-56 md:w-72 h-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                priority
              />
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
            Tải Ứng Dụng <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">VNSPORT</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed font-normal">
            Quản lý giải đấu chuyên nghiệp, cập nhật tỷ số trực tiếp và theo dõi xếp hạng ELO tiện lợi trên thiết bị di động.
          </p>
        </motion.div>

        {/* Store & Download Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          
          {/* Google Play Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 p-6 rounded-2xl backdrop-blur-xl flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 bg-slate-800/80 rounded-xl flex items-center justify-center p-3 border border-slate-700/50 shadow-md">
                  <GooglePlaySvg className="w-9 h-9" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Android
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Google Play</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Tải trực tiếp từ cửa hàng Google Play Store chính thức.
              </p>
            </div>
            
            <a 
              href="https://play.google.com/store/apps/details?id=vn.vnsport.quanlygiaidau" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98]"
            >
              <GooglePlaySvg className="w-4 h-4" />
              <span>Mở Google Play</span>
            </a>
          </motion.div>

          {/* App Store Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 p-6 rounded-2xl backdrop-blur-xl flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 bg-slate-800/80 rounded-xl flex items-center justify-center p-3 border border-slate-700/50 shadow-md">
                  <AppleSvg className="w-8 h-8 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  iOS App
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">App Store</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Dành cho iPhone &amp; iPad trải nghiệm iOS mượt mà.
              </p>
            </div>
            
            <button 
              disabled
              className="w-full py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Smartphone className="w-4 h-4 opacity-60" />
              <span>Đang cập nhật iOS</span>
            </button>
          </motion.div>

          {/* Direct APK Card (Featured) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-b from-emerald-950/40 to-slate-900/80 border-2 border-emerald-500/40 hover:border-emerald-500 p-6 rounded-2xl backdrop-blur-xl flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 group"
          >
            <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
              Nhanh nhất
            </div>

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-md">
                  <Download className="w-7 h-7 animate-bounce" />
                </div>
                <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  65.4 MB
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <span>File APK Trực Tiếp</span>
              </h3>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Tải gói cài đặt APK chính thức trực tiếp về máy Android và cài ngay trong 30 giây.
              </p>
            </div>
            
            <Link 
              href="/downloads/app.apk" 
              download
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>TẢI FILE APK NGAY</span>
            </Link>
          </motion.div>

        </div>

        {/* Features Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Tỷ số Real-time</h4>
              <p className="text-[11px] text-slate-400">Cập nhật trực tiếp từng điểm số</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Xếp hạng ELO chuẩn</h4>
              <p className="text-[11px] text-slate-400">Tự động cộng trừ điểm ELO</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Quản lý Giải đấu</h4>
              <p className="text-[11px] text-slate-400">Sơ đồ nhánh đấu tự động</p>
            </div>
          </div>
        </div>

        {/* Hướng dẫn cài đặt APK */}
        <div className="p-6 md:p-8 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Hướng dẫn cài đặt APK trên Android</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-emerald-400 text-xs">1</span>
              <div>
                <p className="font-bold text-white mb-1">Tải file APK</p>
                <p className="text-slate-400 leading-relaxed">Nhấn nút <strong>TẢI FILE APK NGAY</strong> ở trên để tải gói cài đặt về điện thoại.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-emerald-400 text-xs">2</span>
              <div>
                <p className="font-bold text-white mb-1">Cấp quyền cài đặt</p>
                <p className="text-slate-400 leading-relaxed">Vào <strong>Cài đặt &gt; Bảo mật</strong> và bật <strong>Cho phép cài đặt từ nguồn ngoài</strong>.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-emerald-400 text-xs">3</span>
              <div>
                <p className="font-bold text-white mb-1">Mở file &amp; Trải nghiệm</p>
                <p className="text-slate-400 leading-relaxed">Nhấn mở file APK đã tải và chọn <strong>Cài đặt</strong> để hoàn tất.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

