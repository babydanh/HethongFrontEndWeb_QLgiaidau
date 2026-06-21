'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/zustand/authStore';
import { api } from '@/lib/axios';
import { getButtonClasses } from '@/components/ui/Button';
import { Bell, Mail, LogOut, LayoutDashboard, User, Trophy } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';
import { usersApi } from '@/features/users/api';
import { notificationsApi, Notification } from '@/features/notifications/api';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import { isHttpStatusError } from '@/utils/error';

export function Header() {
  const { isAuthenticated, user, logout, setUser } = useAuthStore();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const { notifications, setNotifications } = useSocket();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const isGuestRoute = ['/login', '/register'].some(route => pathname.startsWith(route));
    if (isClient && !isGuestRoute) {
      // Fetch profile if authenticated (to sync state) OR if not authenticated but browser has active session cookies
      if (!isAuthenticated || !user) {
        usersApi.getProfile()
          .then(profile => {
            if (profile) {
              setUser({
                id: profile.id,
                email: profile.email,
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl || undefined,
                roles: profile.roles || (profile.role ? [profile.role] : []),
                phoneNumber: profile.phoneNumber || undefined,
                dateOfBirth: profile.dateOfBirth || undefined,
                gender: profile.gender || undefined,
                address: profile.address || undefined,
                bio: profile.bio || undefined
              });
            }
          })
          .catch((error: unknown) => {
            if (isAuthenticated && (isHttpStatusError(error, 401) || isHttpStatusError(error, 403))) {
              logout();
            }
          });
      }
    }
  }, [isClient, setUser, logout, pathname, isAuthenticated, user]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Giải đấu', path: '/tournaments' },
    { name: 'Chuỗi giải đấu', path: '/series' },
    { name: 'Cộng đồng', path: '/communities' },
    { name: 'Xếp hạng', path: '/leaderboard' },
  ];

  return (
    <header className={cn(
      "w-full top-0 sticky z-50 transition-all duration-300",
      isScrolled 
        ? "bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm" 
        : "bg-white border-b border-transparent"
    )}>
      <div className="flex justify-between items-center w-full px-4 md:px-8 max-w-7xl mx-auto h-16">
        
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-8 h-full">
          <Link href="/" className="flex items-center h-full py-0 relative">
            <img 
              src="/images/vndc_sport.png" 
              alt="VNDC Sport Logo" 
              className="h-[140px] w-auto object-contain transition-transform duration-200 hover:scale-105"
            />
          </Link>
          <nav className="hidden md:flex gap-6 h-full items-center">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                href={link.path} 
                className={cn(
                  "text-sm transition-colors flex items-center h-full border-b-2",
                  isActive(link.path) 
                    ? "text-blue-600 font-bold border-blue-600" 
                    : "text-slate-500 hover:text-blue-600 border-transparent font-medium"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-4">


          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all active:scale-95 relative"
            >
              <Bell className="w-6 h-6" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-900">Thông báo</span>
                  <div className="flex items-center gap-2">
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await notificationsApi.markAllAsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                            toast.success('Đã đọc tất cả thông báo');
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        Đọc tất cả
                      </button>
                    )}
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                        {notifications.filter(n => !n.isRead).length} mới
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto no-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id}
                        onClick={async () => {
                          if (!n.isRead) {
                            try {
                              await notificationsApi.markAsRead(n.id);
                              setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          setIsNotificationOpen(false);
                          if (n.redirectUrl) {
                            window.location.href = n.redirectUrl;
                          }
                        }}
                        className={cn(
                          "px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 flex flex-col gap-0.5 text-left",
                          !n.isRead ? "bg-blue-50/45" : ""
                        )}
                      >
                        <span className={cn("text-xs font-bold", !n.isRead ? "text-slate-900" : "text-slate-700")}>{n.title}</span>
                        <span className="text-xs text-slate-500">{n.content}</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-1">
                          {new Date(n.createdAt).toLocaleDateString('vi-VN')} {new Date(n.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                      Chưa có thông báo nào
                    </div>
                  )}
                </div>
                <div className="px-4 pt-2 pb-1 border-t border-slate-100 text-center">
                  <Link 
                    href="/notifications" 
                    onClick={() => setIsNotificationOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline block w-full py-1"
                  >
                    Xem tất cả
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all active:scale-95">
            <Mail className="w-6 h-6" />
          </button>
          
          {!isClient ? (
            <div className="flex items-center gap-2 ml-2 w-32 h-9 animate-pulse bg-slate-100 rounded-md"></div>
          ) : isAuthenticated ? (
            <div className="relative ml-2">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm uppercase cursor-pointer hover:ring-2 hover:ring-blue-600 hover:ring-offset-2 transition-all overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    user?.fullName?.charAt(0) || 'U'
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  {user?.roles?.includes('ADMIN') && (
                    <Link href="/admin" onClick={() => setIsDropdownOpen(false)}>
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50/50 font-bold transition-colors cursor-pointer">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Quản trị hệ thống
                      </div>
                    </Link>
                  )}
                  {(user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN')) ? (
                    <>
                      <Link href="/organizer/tournaments" onClick={() => setIsDropdownOpen(false)}>
                        <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          Quản lý giải đấu
                        </div>
                      </Link>
                      <Link href="/organizer/series" onClick={() => setIsDropdownOpen(false)}>
                        <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                          <Trophy className="w-4.5 h-4.5 text-slate-400" />
                          Quản lý chuỗi giải
                        </div>
                      </Link>
                    </>
                  ) : (
                    <Link href="/dashboard" onClick={() => setIsDropdownOpen(false)}>
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                        <Trophy className="w-4 h-4 text-slate-400" />
                        Giải đấu của tôi
                      </div>
                    </Link>
                  )}
                  <Link href="/profile" onClick={() => setIsDropdownOpen(false)}>
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                      <User className="w-4 h-4 text-slate-400" />
                      Hồ sơ cá nhân
                    </div>
                  </Link>
                  <Link href="/profile/edit" onClick={() => setIsDropdownOpen(false)}>
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Cài đặt tài khoản
                    </div>
                  </Link>
                  <div 
                    onClick={async () => {
                      try {
                        await api.post('/auth/logout');
                      } catch (error) {
                        console.error('Logout error:', error);
                      }
                      logout();
                      setIsDropdownOpen(false);
                      window.location.href = '/login';
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer mt-1 border-t border-slate-100 pt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link href="/login" className={getButtonClasses("ghost", "sm", "flex text-slate-600 hover:text-blue-600 hover:bg-blue-50")}>
                Đăng nhập
              </Link>
              <Link href="/register" className={getButtonClasses("default", "sm", "bg-slate-900 text-white hover:bg-slate-800")}>
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
