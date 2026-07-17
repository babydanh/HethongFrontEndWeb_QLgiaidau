'use client';

import Link from 'next/link';
import { Smartphone, Download, Apple, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DownloadPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            Tải Ứng Dụng VNSPORT
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
            Quản lý giải đấu, theo dõi trận đấu và kết nối cộng đồng thể thao
            mọi lúc mọi nơi trên thiết bị di động của bạn.
          </p>
        </div>

        {/* App Store Card — fake, chưa có store */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <Apple className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">App Store</h3>
              <p className="text-sm text-slate-500">Dành cho iPhone / iPad</p>
            </div>
          </div>
          <Button disabled className="bg-slate-300 text-white cursor-not-allowed min-w-[140px]">
            <Smartphone className="w-4 h-4 mr-2" />
            Đang cập nhật
          </Button>
        </div>

        {/* Google Play Card — fake, chưa có store */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <Monitor className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Google Play</h3>
              <p className="text-sm text-slate-500">Dành cho điện thoại Android</p>
            </div>
          </div>
          <Button disabled className="bg-slate-300 text-white cursor-not-allowed min-w-[140px]">
            <Smartphone className="w-4 h-4 mr-2" />
            Đang cập nhật
          </Button>
        </div>

        {/* APK Direct Download */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm hover:shadow-md transition-all p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">APK trực tiếp</h3>
              <p className="text-sm text-slate-500">
                Tải file APK về máy và cài đặt thủ công
              </p>
            </div>
          </div>
          <Link href="/downloads/app.apk" download>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Tải APK
            </Button>
          </Link>
        </div>

        {/* Hướng dẫn */}
        <div className="mt-10 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-amber-800 text-sm font-bold">!</span>
            </div>
            <div className="text-sm text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Cài đặt APK trên Android</p>
              <p>
                Sau khi tải file APK về, vào
                <strong> Cài đặt {'>'} Bảo mật </strong>
                và bật <strong> Cho phép cài đặt từ nguồn không xác định</strong>,
                sau đó mở file APK để cài đặt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
