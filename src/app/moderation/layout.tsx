'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RouteGuard } from '@/components/shared/RouteGuard';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { cn } from '@/utils/cn';
import { BRAND } from '@/constants/brand';
import {
  ArrowLeft,
  Building,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserCog,
  X,
} from 'lucide-react';

const menuItems = [
  { name: 'Tổng quan điều phối', path: '/moderation', icon: LayoutDashboard },
  { name: 'Duyệt sao uy tín', path: '/moderation/verification', icon: ShieldCheck },
  { name: 'Duyệt cộng đồng', path: '/moderation/communities', icon: Building },
  { name: 'Duyệt đổi thông tin', path: '/moderation/change-requests', icon: UserCog },
  { name: 'Báo cáo vi phạm', path: '/moderation/reports', icon: ShieldAlert },
  { name: 'Duyệt giải đấu', path: '/moderation/tournaments', icon: Trophy },
];

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }

    logout();
    window.location.href = '/login';
  };

  return (
    <RouteGuard allowedRoles={['ADMIN', 'MODERATOR']}>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-slate-200 bg-white transition-transform duration-300 md:static md:h-screen md:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div>
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
              <Link href="/" className="flex items-center gap-2 py-2">
                <img
                  src={BRAND.assets.logoIcon}
                  alt={`${BRAND.name} Logo`}
                  className="h-8 w-auto object-contain"
                />
                <span className="border-l border-slate-300 pl-2 text-sm font-bold text-slate-800">
                  Điều phối
                </span>
              </Link>
              <button
                className="text-slate-500 hover:text-slate-950 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="space-y-1 p-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        active ? 'text-white' : 'text-slate-500 group-hover:text-slate-950',
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-1 border-t border-slate-200 p-4">
            {user?.roles?.includes('ADMIN') ? (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-blue-600 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <LayoutDashboard className="h-5 w-5" />
                Sang khu admin
              </Link>
            ) : null}
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Quay lại trang chủ
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-rose-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-5 w-5" />
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md md:px-8">
            <div className="flex items-center gap-4">
              <button
                className="text-slate-500 hover:text-slate-950 md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {menuItems.find((item) => item.path === pathname)?.name || 'Điều phối kiểm duyệt'}
                </h1>
                <p className="text-[11px] text-slate-500">
                  Khu xử lý duyệt và xác minh an toàn cho người điều phối
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-slate-800">{user?.fullName}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-blue-600">
                  {user?.roles?.includes('ADMIN') ? 'Admin đang ở khu điều phối' : 'Người điều phối'}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-1000 text-sm font-bold uppercase text-white">
                {user?.fullName?.charAt(0) || 'M'}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}

