'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/zustand/authStore';
import { api } from '@/lib/axios';
import { RouteGuard } from '@/components/shared/RouteGuard';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Building,
  Menu,
  X,
  Settings,
  Trophy,
  HandCoins,
  MessagesSquare,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
    { name: 'Quản lý sao uy tín', path: '/admin/verification', icon: ShieldCheck },
    { name: 'Khóa / xử phạt user', path: '/admin/moderation', icon: Users },
    { name: 'Báo cáo vi phạm', path: '/admin/reports', icon: ShieldAlert },
    { name: 'Quản lý giải đấu', path: '/admin/tournaments', icon: Trophy },
    { name: 'Quản lý cộng đồng', path: '/admin/communities', icon: Building },
    { name: 'Quản lý rút tiền', path: '/admin/payouts', icon: CreditCard },
    { name: 'Giao dịch hệ thống', path: '/admin/transactions', icon: HandCoins },
    { name: 'Hỗ trợ người dùng', path: '/admin/support', icon: MessagesSquare },
    { name: 'Quản lý đổi thông tin', path: '/admin/change-requests', icon: ShieldAlert },
    { name: 'Cấu hình hệ thống', path: '/admin/configs', icon: Settings },
  ];

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
    <RouteGuard allowedRoles={['ADMIN']}>
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:h-screen",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div>
          {/* Header/Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2 py-2">
              <img 
                src="/vndcsport.svg" 
                alt="VNDC Sport Logo" 
                className="h-8 w-auto object-contain"
              />
              <span className="text-sm font-bold text-slate-800 border-l border-slate-350 pl-2">Admin</span>
            </Link>
            <button 
              className="md:hidden text-slate-500 hover:text-slate-950"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                    active 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-500 group-hover:text-slate-950")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 space-y-1">
          <Link 
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại trang chủ
          </Link>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-950"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">
              {menuItems.find(m => m.path === pathname)?.name || 'Quản trị hệ thống'}
            </h1>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm uppercase">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </RouteGuard>
  );
}
