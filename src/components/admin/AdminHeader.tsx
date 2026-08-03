'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Check,
  LogOut,
  Menu,
  Settings,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/lib/zustand/authStore';
import { api } from '@/lib/axios';
import { useSocket } from '@/hooks/useSocket';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { AdminSupportBell } from '@/components/admin/AdminSupportBell';
import {
  formatNotificationTimestamp,
  getNotificationSummary,
  getNotificationTypeLabel,
  getNotificationTypeMeta,
  resolveNotificationTarget,
} from '@/features/notifications/utils';
import { getErrorMessage } from '@/utils/error';
import { cn } from '@/utils/cn';

interface AdminHeaderProps {
  title: string;
  onOpenSidebar: () => void;
}

export function AdminHeader({ title, onOpenSidebar }: AdminHeaderProps) {
  const navigationTranslate = useTranslations('Navigation');
  const layoutTranslate = useTranslations('AdminLayout');
  const notificationTranslate = useTranslations('Notifications');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    notifications,
    unreadCount,
    isLoading: isNotificationsLoading,
    isInitialized: isNotificationsInitialized,
    errorMessage: notificationError,
    refreshNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
  } = useSocket();

  const notificationPreviewItems = notifications.slice(0, 5);
  const isAdmin = Boolean(user?.roles?.includes('ADMIN'));
  const roleLabel = isAdmin
    ? layoutTranslate('adminRole')
    : layoutTranslate('moderatorRole');

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isProfileOpen && !profileMenuRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }
      if (isNotificationOpen && !notificationMenuRef.current?.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationOpen, isProfileOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsProfileOpen(false);
      setIsNotificationOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const handleNotificationNavigation = async (
    notificationId: string,
    redirectUrl: string | null | undefined,
    isRead: boolean,
  ) => {
    try {
      if (!isRead) {
        await markNotificationAsRead(notificationId);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, navigationTranslate('notificationStatusUpdateError')));
    }

    setIsNotificationOpen(false);
    const target = resolveNotificationTarget(redirectUrl);
    if (!target.href) return;
    if (target.isExternal) {
      window.location.assign(target.href);
      return;
    }
    router.push(target.href);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success(navigationTranslate('markAllReadSuccess'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, navigationTranslate('notificationUpdateError')));
    }
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    logout();
    try {
      await api.post('/auth/logout');
    } catch (error: unknown) {
      console.error('Admin logout failed:', getErrorMessage(error, 'logout request failed'));
    }
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
          onClick={onOpenSidebar}
          aria-label={layoutTranslate('openNavigation')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
            {roleLabel}
          </p>
          <h1 className="truncate text-base font-bold text-slate-950 sm:text-lg">{title}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LanguageSwitcher className="hidden lg:inline-flex" />

        <div className="relative" ref={notificationMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationOpen((current) => !current);
              setIsProfileOpen(false);
            }}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={navigationTranslate('notificationAria')}
            aria-expanded={isNotificationOpen}
            aria-haspopup="menu"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          <AnimatePresence>
            {isNotificationOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="fixed inset-x-3 top-[4.5rem] z-[110] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[min(390px,calc(100vw-2rem))]"
                role="menu"
                aria-label={navigationTranslate('notificationsTitle')}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {navigationTranslate('notificationsTitle')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {unreadCount > 0
                        ? navigationTranslate('unreadCount', { count: unreadCount })
                        : navigationTranslate('updated')}
                    </p>
                  </div>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => void handleMarkAllAsRead()}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {navigationTranslate('markAllNotifications')}
                    </button>
                  ) : null}
                </div>

                <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
                  {isNotificationsLoading && !isNotificationsInitialized ? (
                    <div className="space-y-2 p-2" aria-busy="true">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={`admin-notification-skeleton-${index}`} className="rounded-xl border border-slate-100 p-3">
                          <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                          <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : notificationPreviewItems.length > 0 ? (
                    <div>
                      {notificationError ? (
                        <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          {layoutTranslate('notificationsStale')}
                        </div>
                      ) : null}
                      {notificationPreviewItems.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        role="menuitem"
                        onClick={() =>
                          void handleNotificationNavigation(
                            notification.id,
                            notification.redirectUrl,
                            notification.isRead,
                          )
                        }
                        className={cn(
                          'mb-1.5 w-full rounded-xl border p-3 text-left transition last:mb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                          notification.isRead
                            ? 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                            : 'border-blue-100 bg-blue-50/60 hover:bg-blue-50',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', getNotificationTypeMeta(notification.type).badgeClassName)}>
                                {getNotificationTypeLabel(notification.type, notificationTranslate)}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500">
                                {getNotificationSummary(notification.type, notificationTranslate)}
                              </span>
                            </div>
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900">{notification.title}</p>
                          </div>
                          <span className={cn('shrink-0 text-[10px] font-semibold', notification.isRead ? 'text-slate-400' : 'text-blue-700')}>
                            {notification.isRead ? navigationTranslate('read') : navigationTranslate('unread')}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.content}</p>
                        <p className="mt-2 text-[10px] font-medium text-slate-400">
                          {formatNotificationTimestamp(notification.createdAt, notificationTranslate, locale)}
                        </p>
                      </button>
                      ))}
                    </div>
                  ) : notificationError ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">{layoutTranslate('notificationsLoadFailed')}</p>
                      <p className="mt-1 text-xs text-slate-500">{notificationError}</p>
                      <button
                        type="button"
                        disabled={isNotificationsLoading}
                        onClick={() => void refreshNotifications()}
                        className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {layoutTranslate('retryNotifications')}
                      </button>
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center">
                      <Check className="mx-auto h-7 w-7 text-emerald-500" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">{navigationTranslate('noNotifications')}</p>
                      <p className="mt-1 text-xs text-slate-500">{navigationTranslate('notificationsEmptyDescription')}</p>
                    </div>
                  )}
                </div>

                <Link
                  href="/notifications"
                  onClick={() => setIsNotificationOpen(false)}
                  className="block border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  {navigationTranslate('viewAllNotifications')}
                </Link>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {isAdmin ? <AdminSupportBell /> : null}

        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((current) => !current);
              setIsNotificationOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={navigationTranslate('accountMenuAria')}
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
          >
            <span
              role="img"
              aria-label={navigationTranslate('avatarAria')}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-100 text-sm font-bold uppercase text-blue-700"
              style={user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {user?.avatarUrl ? null : user?.fullName?.charAt(0) || 'A'}
            </span>
            <span className="hidden max-w-44 text-left sm:block">
              <span className="block truncate text-xs font-bold text-slate-900">{user?.fullName || 'Admin'}</span>
              <span className="block truncate text-[10px] text-slate-500">{user?.email || ''}</span>
            </span>
          </button>

          <AnimatePresence>
            {isProfileOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-12 z-[110] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl"
                role="menu"
                aria-label={navigationTranslate('accountMenuAria')}
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-100 text-sm font-bold uppercase text-blue-700"
                      style={user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                      {user?.avatarUrl ? null : user?.fullName?.charAt(0) || 'A'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{user?.fullName || 'Admin'}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email || ''}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">{roleLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-100 py-1">
                  <Link href="/profile" role="menuitem" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:bg-blue-50">
                    <User className="h-4 w-4 text-slate-400" />
                    {navigationTranslate('profile')}
                  </Link>
                  <Link href="/profile/edit" role="menuitem" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:bg-blue-50">
                    <Settings className="h-4 w-4 text-slate-400" />
                    {navigationTranslate('accountSettings')}
                  </Link>
                  <Link href="/" role="menuitem" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:bg-blue-50">
                    <ArrowLeft className="h-4 w-4 text-slate-400" />
                    {layoutTranslate('backHome')}
                  </Link>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:bg-rose-50"
                >
                  <LogOut className="h-4 w-4 text-rose-400" />
                  {layoutTranslate('logout')}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
