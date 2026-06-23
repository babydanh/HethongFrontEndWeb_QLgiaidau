'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, LayoutDashboard, LogOut, Menu, Trophy, User, X } from 'lucide-react';
import { getButtonClasses } from '@/components/ui/Button';
import {
  formatNotificationTimestamp,
  getNotificationTypeMeta,
  resolveNotificationTarget,
} from '@/features/notifications/utils';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { usersApi } from '@/features/users/api';
import { cn } from '@/utils/cn';
import { getErrorMessage, isHttpStatusError } from '@/utils/error';
import { motion, AnimatePresence } from 'framer-motion';

const GUEST_ROUTES = ['/login', '/register'];

export function Header() {
  const { isAuthenticated, user, logout, setUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading: isNotificationsLoading,
    isInitialized: isNotificationsInitialized,
    markAllNotificationsAsRead,
    markNotificationAsRead,
  } = useSocket();

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  const notificationPreviewItems = notifications.slice(0, 5);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }

    return pathname.startsWith(path);
  };

  const closeOverlays = () => {
    setIsDropdownOpen(false);
    setIsNotificationOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNotificationNavigation = async (
    notificationId: string,
    redirectUrl?: string | null,
    isRead?: boolean,
  ) => {
    try {
      if (!isRead) {
        await markNotificationAsRead(notificationId);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật trạng thái thông báo.'));
    }

    setIsNotificationOpen(false);

    const target = resolveNotificationTarget(redirectUrl);

    if (!target.href) {
      return;
    }

    if (target.isExternal) {
      window.location.assign(target.href);
      return;
    }

    router.push(target.href);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success('Đã đánh dấu tất cả là đã đọc.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật thông báo.'));
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsClient(true);
    }, 0);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }

      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOverlays();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      closeOverlays();
    });
  }, [pathname]);

  useEffect(() => {
    const isGuestRoute = GUEST_ROUTES.some((route) => pathname.startsWith(route));

    if (!isClient || isGuestRoute || (isAuthenticated && user)) {
      return;
    }

    void usersApi
      .getProfile()
      .then((profile) => {
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
          bio: profile.bio || undefined,
        });
      })
      .catch((error: unknown) => {
        if (isAuthenticated && (isHttpStatusError(error, 401) || isHttpStatusError(error, 403))) {
          logout();
        }
      });
  }, [isAuthenticated, isClient, logout, pathname, setUser, user]);

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Giải đấu', path: '/tournaments' },
    { name: 'Chuỗi giải đấu', path: '/series' },
    { name: 'Cộng đồng', path: '/communities' },
    { name: 'Xếp hạng', path: '/leaderboard' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'border-b border-slate-200 bg-white/85 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-white',
      )}
    >
      <div className="flex h-16 w-full items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="flex h-full items-center gap-8">
          <Link href="/" className="relative flex h-full items-center py-0">
            <Image
              src="/images/vndc_sport.png"
              alt="VNDC Sport Logo"
              width={140}
              height={140}
              className="h-[140px] w-auto object-contain transition-transform duration-200 hover:scale-105"
            />
          </Link>

          <nav className="hidden h-full items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={cn(
                  'flex h-full items-center border-b-2 text-sm transition-colors',
                  isActive(link.path)
                    ? 'border-blue-600 font-bold text-blue-600'
                    : 'border-transparent font-medium text-slate-500 hover:text-blue-600',
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                className="relative rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                aria-label="Mở thông báo"
                aria-expanded={isNotificationOpen}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>

              <AnimatePresence>
                {isNotificationOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-md shadow-xl z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Thông báo</p>
                        <p className="text-xs text-slate-500">
                          {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã cập nhật'}
                        </p>
                      </div>

                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsAsRead}
                          className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
                        >
                          Đánh dấu tất cả
                        </button>
                      ) : null}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {isNotificationsLoading && !isNotificationsInitialized ? (
                        <div className="space-y-3 p-4">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={`notification-skeleton-${index}`}
                              className="rounded-2xl border border-slate-100 p-3"
                            >
                              <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                              <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                            </div>
                          ))}
                        </div>
                      ) : notificationPreviewItems.length > 0 ? (
                        <div className="p-2">
                          {notificationPreviewItems.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() =>
                                void handleNotificationNavigation(
                                  notification.id,
                                  notification.redirectUrl,
                                  notification.isRead,
                                  )
                              }
                              className={cn(
                                'flex w-full flex-col gap-1 rounded-2xl px-3 py-3 text-left transition-colors',
                                notification.isRead
                                  ? getNotificationTypeMeta(notification.type).cardClassName
                                  : getNotificationTypeMeta(notification.type).unreadCardClassName,
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span
                                  className={cn(
                                    'text-sm font-semibold',
                                    notification.isRead ? 'text-slate-800' : 'text-slate-950',
                                  )}
                                >
                                  {notification.title}
                                </span>
                                {!notification.isRead ? (
                                  <span
                                    className={cn(
                                      'mt-1 h-2.5 w-2.5 rounded-full',
                                      getNotificationTypeMeta(notification.type).dotClassName,
                                    )}
                                  />
                                ) : null}
                              </div>
                              <p className="line-clamp-2 text-xs text-slate-500">
                                {notification.content}
                              </p>
                              <p className="text-[11px] font-medium text-slate-400">
                                {formatNotificationTimestamp(notification.createdAt)}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-10 text-center">
                          <p className="text-sm font-semibold text-slate-700">
                            Chưa có thông báo nào
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Thông tin mới sẽ xuất hiện ở đây khi hệ thống gửi đến bạn.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 p-2 bg-slate-50/50">
                      <Link
                        href="/notifications"
                        className="block rounded-xl px-3 py-2 text-center text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100/50 hover:text-blue-750"
                      >
                        Xem tất cả thông báo
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}

          {!isClient ? (
            <div className="ml-2 h-9 w-32 animate-pulse rounded-md bg-slate-100" />
          ) : isAuthenticated ? (
            <div className="relative ml-2" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((current) => !current)}
                className="flex items-center focus:outline-none"
                aria-label="Mở menu tài khoản"
                aria-expanded={isDropdownOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-100 text-sm font-bold uppercase text-blue-600 transition-all hover:ring-2 hover:ring-blue-600 hover:ring-offset-2">
                  {user?.avatarUrl ? (
                    <span
                      role="img"
                      aria-label="Avatar"
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${user.avatarUrl}")` }}
                    />
                  ) : (
                    user?.fullName?.charAt(0) || 'U'
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-100 bg-white/95 backdrop-blur-md py-2 shadow-lg z-50"
                  >
                    <div className="mb-1 border-b border-slate-100 px-4 py-2">
                      <p className="truncate text-sm font-bold text-slate-900">{user?.fullName}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    </div>

                    {user?.roles?.includes('ADMIN') ? (
                      <Link href="/admin">
                        <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50/50">
                          <LayoutDashboard className="h-4 w-4" />
                          Quản trị hệ thống
                        </div>
                      </Link>
                    ) : null}

                    {user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN') ? (
                      <>
                        <Link href="/organizer/tournaments">
                          <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                            <LayoutDashboard className="h-4 w-4 text-slate-400" />
                            Quản lý giải đấu
                          </div>
                        </Link>
                        <Link href="/organizer/series">
                          <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                            <Trophy className="h-4 w-4 text-slate-400" />
                            Quản lý chuỗi giải
                          </div>
                        </Link>
                      </>
                    ) : (
                      <Link href="/dashboard">
                        <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                          <Trophy className="h-4 w-4 text-slate-400" />
                          Giải đấu của tôi
                        </div>
                      </Link>
                    )}

                    <Link href="/notifications">
                      <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                        <Bell className="h-4 w-4 text-slate-400" />
                        Thông báo của tôi
                      </div>
                    </Link>

                    <Link href="/profile">
                      <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                        <User className="h-4 w-4 text-slate-400" />
                        Hồ sơ cá nhân
                      </div>
                    </Link>

                    <Link href="/profile/edit">
                      <div className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                        <User className="h-4 w-4 text-slate-400" />
                        Cài đặt tài khoản
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.post('/auth/logout');
                        } catch (error: unknown) {
                          console.error('Logout error:', error);
                        }
                        logout();
                        router.push('/login');
                      }}
                      className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-4 pt-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/login"
                className={getButtonClasses(
                  'ghost',
                  'sm',
                  'flex text-slate-600 hover:bg-blue-50 hover:text-blue-600',
                )}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className={getButtonClasses(
                  'default',
                  'sm',
                  'bg-slate-900 text-white hover:bg-slate-800',
                )}
              >
                Đăng ký
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-100 active:scale-95 md:hidden"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="animate-in fade-in slide-in-from-top-5 border-t border-slate-100 bg-white/95 py-2 shadow-lg backdrop-blur-md duration-200 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive(link.path)
                    ? 'bg-blue-50 font-bold text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600',
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
