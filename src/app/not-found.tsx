'use client';

import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 shadow-xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500 animate-bounce">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">404</h1>
          <h2 className="text-lg font-bold text-slate-800">Không tìm thấy trang</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Đường dẫn bạn truy cập không tồn tại, đã bị gỡ bỏ hoặc bạn không có quyền truy cập.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="w-4 h-4" />
              Quay lại trang chủ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
