'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CircleUserRound, MessageSquareText } from 'lucide-react';
import { supportApi, type AdminSupportRoom } from '@/features/support/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';

export function AdminSupportBell() {
  const translate = useTranslations('Common');
  const userId = useAuthStore((state) => state.user?.id);
  const [rooms, setRooms] = useState<AdminSupportRoom[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    const now = Date.now();
    // Throttle fetches to at most once every 5 seconds
    if (now - lastFetchRef.current < 5000) return;
    lastFetchRef.current = now;

    try {
      const nextRooms = await supportApi.getAdminRooms();
      setRooms(nextRooms || []);
    } catch {
      // Silently ignore rate limit or temporary errors
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

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
    // Fallback interval: 60s is plenty since websocket pushes real-time events
    const fallback = window.setInterval(() => void refreshQuietly(), 60000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
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
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unreadCount = useMemo(
    () => rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0),
    [rooms],
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        aria-label="Tin nhắn hỗ trợ từ người dùng"
        title="Tin nhắn hỗ trợ từ người dùng"
      >
        <MessageSquareText className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800">Tin nhắn hỗ trợ</span>
            <Link
              href="/admin/support"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-blue-600 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Không có tin nhắn nào</p>
            ) : (
              rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/admin/support?roomId=${room.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2.5 rounded-xl p-2.5 transition ${
                    room.unreadCount > 0 ? 'bg-blue-50/70 hover:bg-blue-100/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <CircleUserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-slate-800">
                        {room.participants?.[0]?.fullName || room.participants?.[0]?.email || room.name || 'Người dùng'}
                      </span>
                      {room.unreadCount > 0 && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {room.lastMessage?.content || 'Bắt đầu cuộc trò chuyện'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
