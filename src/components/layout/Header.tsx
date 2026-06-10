'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/zustand/authStore';
import { api } from '@/lib/axios';
import { getButtonClasses } from '@/components/ui/Button';
import { Plus, Bell, Mail, LogOut, LayoutDashboard, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';
import { usersApi } from '@/features/users/api';

export function Header() {
  const { isAuthenticated, user, logout, setUser } = useAuthStore();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);

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
    if (isClient && !isAuthenticated) {
      usersApi.getProfile()
        .then(profile => {
          if (profile) {
            // Map UserProfile properties to User store structure
            setUser({
              id: profile.id,
              email: profile.email,
              fullName: profile.fullName,
              avatarUrl: profile.avatarUrl,
              roles: profile.role ? [profile.role] : [],
              phoneNumber: profile.phoneNumber,
              dateOfBirth: profile.dateOfBirth,
              gender: profile.gender,
              address: profile.address,
              bio: profile.bio
            });
          }
        })
        .catch(() => {
          // Ignore 401/error, user remains logged out
        });
    }
  }, [isClient, isAuthenticated, setUser]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Giải đấu', path: '/tournaments' },
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
          <Link href="/" className="text-xl md:text-2xl font-bold text-blue-600 tracking-tight">
            TournaHub
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
          <Link href="/organizer/tournaments/create" className={getButtonClasses("default", "default", "hidden md:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all active:scale-95")}>
            <Plus className="w-5 h-5" />
            Tạo giải đấu
          </Link>
          
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all active:scale-95">
            <Bell className="w-6 h-6" />
          </button>
          
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
                  {user?.roles?.includes('ORGANIZER') && (
                    <Link href="/organizer" onClick={() => setIsDropdownOpen(false)}>
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        Quản lý giải đấu
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
