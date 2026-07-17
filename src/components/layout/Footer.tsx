"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <img 
                src="/VNDCsport.svg" 
                alt="VNSPORT Logo" 
                className="h-10 w-auto object-contain"
              />
              <span className="font-black text-2xl tracking-wider text-blue-600 uppercase select-none">
                VN<span className="text-slate-800">SPORT</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500">
              Nền tảng quản lý giải đấu chuyên nghiệp và dễ sử dụng nhất.
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Sản phẩm</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/tournaments" className="hover:text-blue-600">Khám phá giải đấu</Link></li>
              <li><Link href="/leaderboard" className="hover:text-blue-600">Bảng xếp hạng</Link></li>
              <li><Link href="/communities" className="hover:text-blue-600">Cộng đồng</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Ban tổ chức</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/organizer" className="hover:text-blue-600">Bảng điều khiển</Link></li>
              <li><Link href="/organizer/tournaments/create" className="hover:text-blue-600">Tạo giải đấu mới</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Pháp lý</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/terms" className="hover:text-blue-600">Điều khoản</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600">Bảo mật</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-8 text-center text-sm text-slate-500 select-none">
          © 2026 VNDC Sport. Tất cả các quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
