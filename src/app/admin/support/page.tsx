'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleUserRound,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supportApi, type AdminSupportRoom, type SupportMessage } from '@/features/support/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { socketClient } from '@/lib/socket';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));

export default function AdminSupportPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<AdminSupportRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const selectedRoomIdRef = useRef<string | null>(null);

  const loadRooms = useCallback(async (quiet = false) => {
    try {
      const data = await supportApi.getAdminRooms();
      setRooms(data);
      setSelectedRoomId((current) => {
        if (current && data.some((room) => room.id === current)) return current;
        const requestedRoomId =
          typeof window === 'undefined'
            ? null
            : new URLSearchParams(window.location.search).get('room');
        if (requestedRoomId && data.some((room) => room.id === requestedRoomId)) {
          return requestedRoomId;
        }
        return data[0]?.id ?? null;
      });
    } catch (error) {
      if (!quiet) toast.error(getErrorMessage(error, 'Không tải được hộp thư hỗ trợ.'));
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string, quiet = false) => {
    try {
      const data = await supportApi.getAdminMessages(roomId);
      setMessages(data);
    } catch (error) {
      if (!quiet) toast.error(getErrorMessage(error, 'Không tải được cuộc hội thoại.'));
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void supportApi.getAdminRooms().then((data) => {
      if (!active) return;
      setRooms(data);
      setSelectedRoomId((current) => {
        if (current && data.some((room) => room.id === current)) return current;
        const requestedRoomId =
          typeof window === 'undefined'
            ? null
            : new URLSearchParams(window.location.search).get('room');
        if (requestedRoomId && data.some((room) => room.id === requestedRoomId)) {
          return requestedRoomId;
        }
        return data[0]?.id ?? null;
      });
      setLoadingRooms(false);
    }).catch((error) => {
      if (!active) return;
      toast.error(getErrorMessage(error, 'Không tải được hộp thư hỗ trợ.'));
      setLoadingRooms(false);
    });

    const timer = window.setInterval(() => void loadRooms(true), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadRooms]);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
    if (!selectedRoomId) return;

    setLoadingMessages(true);
    void loadMessages(selectedRoomId);
    void supportApi.markAdminRoomRead(selectedRoomId).then(() => loadRooms(true));

    const socket = socketClient.getChatSocket();
    socket.emit('joinChatRoom', selectedRoomId);
    return () => {
      socket.emit('leaveChatRoom', selectedRoomId);
    };
  }, [loadMessages, loadRooms, selectedRoomId]);

  useEffect(() => {
    const socket = socketClient.getChatSocket();
    const subscribe = () => socket.emit('subscribeSupportInbox');
    const handleSupportMessage = (payload: {
      roomId: string;
      message: SupportMessage;
    }) => {
      void loadRooms(true);
      const incomingMessage = payload?.message || payload;
      const targetRoomId = payload?.roomId || selectedRoomIdRef.current;
      if (targetRoomId !== selectedRoomIdRef.current) return;

      setMessages((current) =>
        incomingMessage?.id && current.some((message) => message.id === incomingMessage.id)
          ? current
          : [...current, incomingMessage],
      );
      if (targetRoomId) void supportApi.markAdminRoomRead(targetRoomId);
    };
    const handleChatMessage = (msg: SupportMessage) => {
      if (!selectedRoomIdRef.current) return;
      setMessages((current) =>
        msg?.id && current.some((message) => message.id === msg.id)
          ? current
          : [...current, msg],
      );
      void loadRooms(true);
    };
    const handleSupportRead = () => void loadRooms(true);

    socket.on('connect', subscribe);
    socket.on('support:message', handleSupportMessage);
    socket.on('chat:message', handleChatMessage);
    socket.on('support:read', handleSupportRead);

    if (!socket.connected) socket.connect();
    else subscribe();

    return () => {
      socket.off('connect', subscribe);
      socket.off('support:message', handleSupportMessage);
      socket.off('chat:message', handleChatMessage);
      socket.off('support:read', handleSupportRead);
    };
  }, [loadRooms]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const customer = selectedRoom?.participants.find((item) => item.id !== user?.id);

  const handleSend = async () => {
    const content = draft.trim();
    if (!selectedRoomId || !content || sending) return;
    setSending(true);
    try {
      const message = await supportApi.replyAsAdmin(selectedRoomId, content);
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
      setDraft('');
      void loadRooms(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không gửi được tin nhắn.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Hỗ trợ người dùng</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tiếp nhận các cuộc hội thoại được chuyển từ trợ lý trên website.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRooms()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="grid h-[calc(100vh-170px)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="flex h-full flex-col overflow-hidden border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-5 py-4 font-bold text-slate-900">
            <Inbox className="h-5 w-5 text-blue-600" />
            Hộp thư
            <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {rooms.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loadingRooms ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-slate-500">
                <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                Chưa có yêu cầu hỗ trợ.
              </div>
            ) : (
              rooms.map((room) => {
                const participant = room.participants.find((item) => item.id !== user?.id);
                const active = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-transparent bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                        {participant?.avatarUrl ? (
                          <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <CircleUserRound className="h-6 w-6 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {participant?.fullName || participant?.email || 'Người dùng'}
                          </p>
                          <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                            {formatTime(room.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {room.lastMessage?.content || 'Đã mở yêu cầu hỗ trợ'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex h-full min-w-0 flex-col overflow-hidden">
          {!selectedRoomId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
              <MessageSquareText className="mb-4 h-14 w-14 text-slate-300" />
              <p className="font-semibold text-slate-700">Chọn một cuộc hội thoại</p>
              <p className="mt-1 text-sm">Tin nhắn của người dùng sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700">
                  {customer?.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt={customer.fullName || 'Người dùng'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <CircleUserRound className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">
                    {customer?.fullName || customer?.email || 'Người dùng'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {customer?.email || 'Hỗ trợ trực tiếp'}
                  </p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_#eff6ff,_transparent_45%)] p-5">
                {loadingMessages ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2.5 ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!mine && (
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200">
                            {message.senderAvatar || customer?.avatarUrl ? (
                              <img
                                src={message.senderAvatar || customer?.avatarUrl || ''}
                                alt={message.senderName || customer?.fullName || 'Người dùng'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <CircleUserRound className="h-full w-full p-1.5 text-slate-500" />
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            mine
                              ? 'rounded-br-md bg-blue-600 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <p className={`mb-1 text-[10px] font-bold ${mine ? 'text-blue-100' : 'text-slate-500'}`}>
                            {mine
                              ? user?.fullName || 'Quản trị viên'
                              : message.senderName || customer?.fullName || 'Người dùng'}
                          </p>
                          <p className="whitespace-pre-wrap break-words">{message.messageText}</p>
                          <p className={`mt-1.5 text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                        {mine && (
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-blue-100">
                            {user?.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName || 'Quản trị viên'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <CircleUserRound className="h-full w-full p-1.5 text-blue-600" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <footer className="border-t border-slate-200 bg-white p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    rows={2}
                    placeholder="Nhập câu trả lời cho người dùng..."
                    className="min-h-[48px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!draft.trim() || sending}
                    className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Gửi
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
