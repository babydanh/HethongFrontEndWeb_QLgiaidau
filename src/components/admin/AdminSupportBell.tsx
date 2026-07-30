'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CircleUserRound, MessageSquareText } from 'lucide-react';
import { supportApi, type AdminSupportRoom } from '@/features/support/api';
import { socketClient } from '@/lib/socket';

export function AdminSupportBell() {
  const [rooms, setRooms] = useState<AdminSupportRoom[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const nextRooms = await supportApi.getAdminRooms();
    setRooms(nextRooms);
  }, []);

  useEffect(() => {
    void refresh();

    const socket = socketClient.getChatSocket();
    const subscribe = () => socket.emit('subscribeSupportInbox');
    const handleChange = () => void refresh();

    socket.on('connect', subscribe);
    socket.on('support:message', handleChange);
    socket.on('support:read', handleChange);

    if (!socket.connected) socket.connect();
    else subscribe();

    const fallback = window.setInterval(() => void refresh(), 30000);
    return () => {
      window.clearInterval(fallback);
      socket.off('connect', subscribe);
      socket.off('support:message', handleChange);
      socket.off('support:read', handleChange);
    };
  }, [refresh]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unreadCount = useMemo(
    () => rooms.reduce((total, room) => total + (room.unreadCount ?? 0), 0),
    [rooms],
  );

  return (
    <div ref={rootRef} className="relative z-[100]">
      <button
        type="button"
        aria-label="Thông báo hỗ trợ"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[110] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-slate-950">Hỗ trợ mới</p>
              <p className="text-xs text-slate-500">{unreadCount} tin chưa đọc</p>
            </div>
            <MessageSquareText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {rooms.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Chưa có yêu cầu hỗ trợ.
              </p>
            ) : (
              rooms.slice(0, 6).map((room) => {
                const customer = room.participants[0];
                return (
                  <Link
                    key={room.id}
                    href={`/admin/support?room=${encodeURIComponent(room.id)}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
                  >
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100">
                      {customer?.avatarUrl ? (
                        <img
                          src={customer.avatarUrl}
                          alt={customer.fullName || customer.email || 'Người dùng'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CircleUserRound className="h-full w-full p-1.5 text-slate-400" />
                      )}
                      {(room.unreadCount ?? 0) > 0 && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {customer?.fullName || customer?.email || 'Người dùng'}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {room.lastMessage?.content || 'Đã mở yêu cầu hỗ trợ'}
                      </span>
                    </span>
                    {(room.unreadCount ?? 0) > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {room.unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
          <Link
            href="/admin/support"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-50"
          >
            Mở hộp thư hỗ trợ
          </Link>
        </div>
      )}
    </div>
  );
}
