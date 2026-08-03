'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { CircleUserRound, MessageSquareText } from 'lucide-react';
import { supportApi, type AdminSupportRoom } from '@/features/support/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';

interface SupportAvatarProps {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

function SupportAvatar({ fullName, email, avatarUrl }: SupportAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const shouldShowImage = Boolean(avatarUrl) && avatarUrl !== failedAvatarUrl;

  return (
    <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
      {shouldShowImage ? (
        // Support avatars come from dynamic API media URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl || undefined}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedAvatarUrl(avatarUrl || null)}
        />
      ) : (
        <CircleUserRound className="h-5 w-5" aria-hidden="true" />
      )}
      <span className="sr-only">{fullName || email || ''}</span>
    </span>
  );
}

export function AdminSupportBell() {
  const translate = useTranslations('Common');
  const pathname = usePathname();
  const supportLoadFailedText = translate('supportLoadFailed');
  const userId = useAuthStore((state) => state.user?.id);
  const [rooms, setRooms] = useState<AdminSupportRoom[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) return;
    lastFetchRef.current = now;

    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const nextRooms = await supportApi.getAdminRooms();
      if (!mountedRef.current) return;
      setRooms(nextRooms || []);
      setErrorMessage(null);
      hasLoadedRef.current = true;
    } catch {
      if (mountedRef.current) setErrorMessage(supportLoadFailedText);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [supportLoadFailedText]);

  useEffect(() => {
    if (!userId) return;
    mountedRef.current = true;

    const initialRefresh = window.setTimeout(() => void refresh(), 100);
    const socket = socketClient.refreshChatAuthentication();
    const subscribe = () => socket.emit('subscribeSupportInbox');
    const handleChange = () => void refresh();

    socket.on('connect', subscribe);
    socket.on('support:message', handleChange);
    socket.on('support:read', handleChange);

    if (!socket.connected) socket.connect();
    else subscribe();

    let refreshInFlight = false;
    const refreshQuietly = async () => {
      if (refreshInFlight || document.hidden) return;
      refreshInFlight = true;
      try {
        await refresh();
      } finally {
        refreshInFlight = false;
      }
    };
    const handleFocus = () => void refreshQuietly();
    const fallback = window.setInterval(() => void refreshQuietly(), 60000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialRefresh);
      window.clearInterval(fallback);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      socket.off('connect', subscribe);
      socket.off('support:message', handleChange);
      socket.off('support:read', handleChange);
    };
  }, [refresh, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const closeOnOutsideOrEscape = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event instanceof MouseEvent && !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideOrEscape);
    document.addEventListener('keydown', closeOnOutsideOrEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideOrEscape);
      document.removeEventListener('keydown', closeOnOutsideOrEscape);
    };
  }, []);

  const unreadCount = useMemo(
    () => rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0),
    [rooms],
  );
  const previewRooms = rooms.slice(0, 6);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={translate('supportNotifications')}
        title={translate('supportNotifications')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MessageSquareText className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-12 z-[110] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="menu"
          aria-label={translate('supportNotifications')}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-950">{translate('newSupportRequests')}</p>
              <p className="text-xs text-slate-500">
                {translate('unreadSupportMessages', { count: unreadCount })}
              </p>
            </div>
            <MessageSquareText className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading && previewRooms.length === 0 ? (
              <div className="space-y-2 p-2" aria-busy="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`support-skeleton-${index}`} className="rounded-xl border border-slate-100 p-3">
                    <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : errorMessage && previewRooms.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    lastFetchRef.current = 0;
                    void refresh();
                  }}
                  role="menuitem"
                  className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {translate('retry')}
                </button>
              </div>
            ) : previewRooms.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                {translate('noSupportRequests')}
              </p>
            ) : (
              <div>
                {errorMessage ? (
                  <p className="px-2 pb-2 text-xs text-amber-700">{errorMessage}</p>
                ) : null}
                {previewRooms.map((room) => {
                  const customer = room.participants?.[0];
                  return (
                    <Link
                      key={room.id}
                      href={`/admin/support?room=${encodeURIComponent(room.id)}`}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-2.5 rounded-xl p-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        room.unreadCount > 0 ? 'bg-blue-50/70 hover:bg-blue-100/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <SupportAvatar
                        fullName={customer?.fullName}
                        email={customer?.email}
                        avatarUrl={customer?.avatarUrl}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-semibold text-slate-800">
                            {customer?.fullName || customer?.email || room.name || translate('user')}
                          </span>
                          {room.unreadCount > 0 ? (
                            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {room.unreadCount}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                          {room.lastMessage?.content || translate('supportRequestOpened')}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/admin/support"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          >
            {translate('openSupportInbox')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
