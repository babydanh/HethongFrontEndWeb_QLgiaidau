'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '@/constants/brand';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Check,
  LayoutDashboard,
  LogOut,
  Menu,
  Smartphone,
  Trophy,
  User,
  X,
  Settings,
} from 'lucide-react';
import { getButtonClasses } from '@/components/ui/Button';
import { communitiesApi } from '@/features/communities/api';
import { tournamentsApi } from '@/features/tournaments/api';
import {
  formatNotificationTimestamp,
  getNotificationActionConfig,
  getNotificationSummary,
  getNotificationTypeMeta,
  getNotificationTypeLabel,
  resolveNotificationTarget,
} from '@/features/notifications/utils';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { usersApi } from '@/features/users/api';
import { cn } from '@/utils/cn';
import { getErrorMessage, isHttpStatusError } from '@/utils/error';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

const GUEST_ROUTES = ['/login', '/register'];

export function Header() {
  const t = useTranslations('Navigation');
  const { isAuthenticated, user, logout, setUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const canAccessAdmin = Boolean(user?.roles?.includes('ADMIN'));
  const canAccessModeration = Boolean(
    user?.roles?.includes('ADMIN') || user?.roles?.includes('MODERATOR'),
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [pendingNotificationAction, setPendingNotificationAction] = useState<string | null>(null);

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
      toast.error(getErrorMessage(error, t('notificationStatusUpdateError')));
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
      toast.success(t('markAllReadSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('notificationUpdateError')));
    }
  };

  const handleCommunityInviteAction = async (
    notificationId: string,
    communityId: string,
    action: 'accept' | 'decline',
  ) => {
    const actionKey = `${notificationId}:${action}`;

    try {
      setPendingNotificationAction(actionKey);
      await communitiesApi.respondToInvite(communityId, action);
      await markNotificationAsRead(notificationId);
      toast.success(
        action === 'accept'
          ? t('communityInviteAccepted')
          : t('communityInviteDeclined'),
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          action === 'accept'
            ? t('communityInviteAcceptError')
            : t('communityInviteDeclineError'),
        ),
      );
    } finally {
      setPendingNotificationAction(null);
    }
  };

  const handleRefereeInviteAction = async (
    notificationId: string,
    tournamentId: string,
    refereeId: string,
    action: 'ACCEPT' | 'DECLINE',
  ) => {
    const actionKey = `${notificationId}:${action}`;

    try {
      setPendingNotificationAction(actionKey);
      await tournamentsApi.respondToRefereeInvite(tournamentId, refereeId, action);
      await markNotificationAsRead(notificationId);
      toast.success(action === 'ACCEPT' ? t('refereeInviteAccepted') : t('refereeInviteDeclined'));
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          action === 'ACCEPT'
            ? t('refereeInviteAcceptError')
            : t('refereeInviteDeclineError'),
        ),
      );
    } finally {
      setPendingNotificationAction(null);
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
    { name: t('home'), path: '/' },
    { name: t('tournaments'), path: '/tournaments' },
    { name: t('matches'), path: '/matches' },
    { name: t('communities'), path: '/communities' },
    { name: t('rankings'), path: '/leaderboard' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'border-b border-blue-200/80 bg-white/90 shadow-sm backdrop-blur-md'
          : 'border-b border-blue-100/60 bg-[#F4F8FF]',
      )}
    >
      <div className="flex h-16 w-full items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="flex h-full items-center gap-8">
          <Link href="/" className="relative flex h-full items-center py-0">
            <Image
              src={BRAND.assets.logoIcon}
              alt={`${BRAND.name} Logo`}
              width={120}
              height={36}
              className="h-6 md:h-7 w-auto object-contain transition-transform duration-200 hover:scale-105"
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
                    ? 'border-blue-600 font-semibold text-blue-600'
                    : 'border-transparent font-medium text-slate-500 hover:text-blue-600',
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />

          {/* Nút Tải App */}
          <Link
            href="/download"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all active:scale-95"
          >
            <Smartphone className="w-4 h-4" />
            {t('downloadApp')}
          </Link>

          {isAuthenticated ? (
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                className="relative rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                aria-label={t('notificationAria')}
                aria-expanded={isNotificationOpen}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white ring-2 ring-white">
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
                    className="fixed inset-x-4 top-16 md:absolute md:top-full md:inset-x-auto md:right-0 mt-2 w-auto max-w-sm md:w-[22rem] overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xl z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t('notificationsTitle')}</p>
                        <p className="text-xs text-slate-500">
                          {unreadCount > 0 ? `${t('unreadCount', { count: unreadCount })}` : t('updated')}
                        </p>
                      </div>

                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsAsRead}
                          className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
                        >
                          {t('markAllNotifications')}
                        </button>
                      ) : null}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {isNotificationsLoading && !isNotificationsInitialized ? (
                        <div className="space-y-3 p-4">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={`notification-skeleton-${index}`}
                              className="rounded-lg border border-slate-100 p-3"
                            >
                              <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                              <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                            </div>
                          ))}
                        </div>
                      ) : notificationPreviewItems.length > 0 ? (
                        <div className="p-2">
                          {notificationPreviewItems.map((notification) => {
                            const notificationAction = getNotificationActionConfig(notification);

                            return (
                              <article
                                key={notification.id}
                                className={cn(
                                  'rounded-lg border px-3.5 py-3.5 transition-colors',
                                  notification.isRead
                                    ? 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/80'
                                    : 'border-slate-200 bg-slate-50/85 shadow-sm',
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleNotificationNavigation(
                                          notification.id,
                                          notification.redirectUrl,
                                          notification.isRead,
                                        )
                                      }
                                      className="w-full text-left"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                            <span
                                              className={cn(
                                                'rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]',
                                                getNotificationTypeMeta(notification.type).badgeClassName,
                                              )}
                                            >
                                              {getNotificationTypeLabel(notification.type)}
                                            </span>
                                            {!notification.isRead ? (
                                              <span className="text-[10px] font-medium text-slate-500">
                                                {getNotificationSummary(notification.type)}
                                              </span>
                                            ) : null}
                                          </div>
                                          <p
                                            className={cn(
                                              'text-sm font-medium',
                                              notification.isRead ? 'text-slate-700' : 'text-slate-950',
                                            )}
                                          >
                                            {notification.title}
                                          </p>
                                        </div>
                                        {!notification.isRead ? (
                                          <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-blue-600 px-2 py-1 text-[10px] font-medium text-white">
                                            {t('unread')}
                                          </span>
                                        ) : (
                                          <span className="inline-flex shrink-0 whitespace-nowrap text-[10px] font-medium text-slate-400">
                                            {t('read')}
                                          </span>
                                        )}
                                      </div>
                                      <p
                                        className={cn(
                                          'mt-1.5 line-clamp-2 text-xs leading-5',
                                          notification.isRead ? 'text-slate-500' : 'text-slate-600',
                                        )}
                                      >
                                        {notification.content}
                                      </p>
                                      <p className="mt-2.5 text-[11px] font-medium text-slate-400">
                                        {formatNotificationTimestamp(notification.createdAt)}
                                      </p>
                                    </button>

                                    {(notificationAction?.kind === 'community-invite' || notificationAction?.kind === 'referee-invite') && !notification.isRead ? (
                                      <div className="mt-3.5 flex gap-2">
                                        <button
                                          type="button"
                                          disabled={pendingNotificationAction !== null}
                                          onClick={() => {
                                            if (notificationAction.kind === 'community-invite' && notificationAction.communityId) {
                                              void handleCommunityInviteAction(notification.id, notificationAction.communityId, 'accept');
                                              return;
                                            }

                                            if (
                                              notificationAction.kind === 'referee-invite' &&
                                              notificationAction.tournamentId &&
                                              notificationAction.refereeId
                                            ) {
                                              void handleRefereeInviteAction(
                                                notification.id,
                                                notificationAction.tournamentId,
                                                notificationAction.refereeId,
                                                'ACCEPT',
                                              );
                                            }
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                          {notificationAction.kind === 'referee-invite' ? t('refereeRole') : t('accept')}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={pendingNotificationAction !== null}
                                          onClick={() => {
                                            if (notificationAction.kind === 'community-invite' && notificationAction.communityId) {
                                              void handleCommunityInviteAction(notification.id, notificationAction.communityId, 'decline');
                                              return;
                                            }

                                            if (
                                              notificationAction.kind === 'referee-invite' &&
                                              notificationAction.tournamentId &&
                                              notificationAction.refereeId
                                            ) {
                                              void handleRefereeInviteAction(
                                                notification.id,
                                                notificationAction.tournamentId,
                                                notificationAction.refereeId,
                                                'DECLINE',
                                              );
                                            }
                                          }}
                                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {t('decline')}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-6 py-10 text-center">
                          <p className="text-sm font-medium text-slate-700">
                            {t('noNotifications')}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t('notificationsEmptyDescription')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 p-2 bg-slate-50/50">
                      <Link
                        href="/notifications"
                        className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100/50 hover:text-blue-750"
                      >
                        {t('viewAllNotifications')}
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
                aria-label={t('accountMenuAria')}
                aria-expanded={isDropdownOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-100 text-sm font-semibold uppercase text-blue-600 transition-all hover:ring-2 hover:ring-blue-600 hover:ring-offset-2">
                  {user?.avatarUrl ? (
                    <span
                      role="img"
                      aria-label={t('avatarAria')}
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
                    className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-2 shadow-lg z-50"
                  >
                    <div className="mb-2 border-b border-slate-100 px-4 py-2.5">
                      <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    </div>

                    {/* Nhóm 1: Admin & Moderation */}
                    {(canAccessAdmin || canAccessModeration) && (
                      <div className="border-b border-slate-100/60 pb-2 mb-2">
                        {canAccessAdmin && (
                          <Link href="/admin">
                            <div className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors hover:bg-blue-50/30">
                              <LayoutDashboard className="h-4 w-4 text-slate-400" />
                              Quản trị hệ thống
                            </div>
                          </Link>
                        )}
                        {canAccessModeration && (
                          <Link href="/moderation">
                            <div className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-amber-600 transition-colors hover:bg-amber-50/30">
                              <Check className="h-4 w-4 text-slate-400" />
                              Điều phối kiểm duyệt
                            </div>
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Nhóm {t('personal')} */}
                    <div className="border-b border-slate-100/60 pb-2 mb-2">
                      <div className="px-4 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('personal')}</div>
                      <Link href="/profile">
                        <div className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                          <User className="h-4 w-4 text-slate-400" />
                          {t('profile')}
                        </div>
                      </Link>

                      <Link href="/dashboard">
                        <div className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                          <Trophy className="h-4 w-4 text-slate-400" />
                          {t('myTournaments')}
                        </div>
                      </Link>

                      <Link href="/profile/edit">
                        <div className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                          <Settings className="h-4 w-4 text-slate-400" />
                          {t('accountSettings')}
                        </div>
                      </Link>
                    </div>

                    {/* {t('logout')} */}
                    <button
                      type="button"
                      onClick={async () => {
                        logout(); // Reset Zustand state first
                        try {
                          await api.post('/auth/logout');
                        } catch (error: unknown) {
                          console.error('Logout error:', error);
                        }
                        window.location.href = '/login'; // Hard redirect to clear everything
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-500 transition-all hover:bg-rose-50/50 hover:text-rose-600"
                    >
                      <LogOut className="h-4 w-4 text-rose-400" />
                      {t('logout')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <a
                href="/login"
                className={getButtonClasses(
                  'ghost',
                  'sm',
                  'flex text-slate-600 hover:bg-blue-50 hover:text-blue-600',
                )}
              >
                {t('login')}
              </a>
              <a
                href="/register"
                className={getButtonClasses('default', 'sm')}
              >
                {t('register')}
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-100 active:scale-95 md:hidden"
            aria-label={t('toggleMenuAria')}
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
                  'rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive(link.path)
                    ? 'bg-blue-50 font-semibold text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600',
                )}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/download"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Smartphone className="w-4 h-4" />
              {t('downloadApp')}
            </Link>
            <LanguageSwitcher expanded className="mt-1" />
          </nav>
        </div>
      ) : null}
    </header>
  );
}

