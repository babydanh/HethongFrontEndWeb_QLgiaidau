'use client';

import { useState } from 'react';
import { Sparkles, Info, ShieldCheck, Zap } from 'lucide-react';
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
  const [showVersionModal, setShowVersionModal] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Soft Ambient Light Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-100/70 via-emerald-100/30 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 relative z-10">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Tải Ứng Dụng Di Động
          </h1>
          <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto leading-relaxed font-normal">
            Quản lý giải đấu chuyên nghiệp, cập nhật tỷ số trực tiếp và theo dõi xếp hạng ELO tiện lợi ngay trên điện thoại của bạn.
          </p>

          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Chính chủ 100%</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-600" /> Cập nhật tức thì</span>
          </div>
        </motion.div>

        {/* Store Options Grid - 2 Main Official Stores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-14">
          
          {/* Google Play Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white border border-slate-200/90 hover:border-slate-300 p-7 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center p-3.5 border border-slate-100 shadow-inner group-hover:scale-105 transition-transform">
                  <GooglePlaySvg className="w-10 h-10" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Android
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Google Play</h3>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed">
                Tải trực tiếp từ cửa hàng Google Play Store chính thức cho thiết bị Android.
              </p>
            </div>
            
            <a 
              href="https://play.google.com/store/apps/details?id=vn.vnsport.quanlygiaidau" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.98]"
            >
              <GooglePlaySvg className="w-5 h-5" />
              <span>Mở Google Play</span>
            </a>
          </motion.div>

          {/* App Store Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white border border-slate-200/90 hover:border-slate-300 p-7 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center p-3.5 border border-slate-100 shadow-inner group-hover:scale-105 transition-transform">
                  <AppleSvg className="w-9 h-9 text-slate-900" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  iOS App
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">App Store</h3>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed">
                Trải nghiệm ứng dụng mượt mà dành riêng cho iPhone &amp; iPad trên App Store.
              </p>
            </div>
            
            <a 
              href="https://apps.apple.com/vn/app/Sporto/id6795829694" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.98]"
            >
              <AppleSvg className="w-5 h-5 text-white" />
              <span>Mở App Store</span>
            </a>
          </motion.div>

        </div>

        {/* Small Version Trigger at Bottom */}
        <div className="text-center pt-2">
          <button 
            onClick={() => setShowVersionModal(true)}
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors font-medium cursor-pointer py-2 px-4 rounded-full bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Thông tin phiên bản v1.0.2 (Build 3)</span>
          </button>
        </div>

        {/* Version Modal */}
        {showVersionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-900">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Chi tiết phiên bản App</span>
                </h4>
                <button 
                  onClick={() => setShowVersionModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center"
                >
                  &times;
                </button>
              </div>
              <div className="space-y-3 text-xs text-slate-600 mb-6">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">Phiên bản:</span>
                  <span className="font-bold text-slate-900">v1.0.2</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">Build Number:</span>
                  <span className="font-bold text-slate-900">Build 3</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">Trạng thái Google Play:</span>
                  <span className="font-bold text-emerald-600">Đã phát hành</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Trạng thái App Store:</span>
                  <span className="font-bold text-emerald-600">Đã phát hành</span>
                </div>
              </div>
              <button 
                onClick={() => setShowVersionModal(false)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

