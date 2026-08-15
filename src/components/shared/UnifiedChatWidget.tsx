'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, ChevronLeft, Headset, Loader2, MessageCircle, Send, Sparkles, Users, X } from 'lucide-react';
import { getBaseUrl } from '@/lib/axios';
import { inboxApi, type InboxRoom, type InboxRoomsResponse } from '@/features/chat/inbox-api';
import { supportApi, type SupportMessage } from '@/features/support/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import type { ChatMessage } from '@/types/community-social';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

type Selection = { kind: 'AI' } | { kind: 'SUPPORT' } | { kind: 'ROOM'; room: InboxRoom };
type DisplayMessage = ChatMessage & { mine: boolean };
type AiMessage = { role: 'user' | 'assistant'; content: string };
type TypingEvent = { roomId: string; userId: string; isTyping: boolean };

const initialAiMessages: AiMessage[] = [{
  role: 'assistant',
  content: 'Xin chào! Mình là trợ lý Sporto. Bạn có thể hỏi về giải đấu, ELO hoặc cách sử dụng nền tảng.',
}];

const quickPrompts = ['Cách đăng ký giải?', 'ELO được tính thế nào?', 'Tạo CLB ra sao?'];

function unwrapMessages(value: { data?: ChatMessage[] } | ChatMessage[]): ChatMessage[] {
  return Array.isArray(value) ? value : value.data ?? [];
}

function unwrapRooms(value: InboxRoomsResponse): InboxRoom[] {
  return Array.isArray(value) ? value : value.data;
}

function roomTitle(room: InboxRoom): string {
  if (room.name) return room.name;
  const other = room.participants.find((participant) => participant.fullName);
  return other?.fullName || (room.type === 'CLUB' ? 'Câu lạc bộ' : 'Cuộc trò chuyện');
}

export default function UnifiedChatWidget() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ kind: 'AI' });
  const [rooms, setRooms] = useState<InboxRoom[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(initialAiMessages);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRoomRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const selectedRoom = selection.kind === 'ROOM' ? selection.room : null;
  const selectedTitle = selection.kind === 'AI' ? 'Trợ lý AI Sporto' : selection.kind === 'SUPPORT' ? 'Hỗ trợ Sporto' : roomTitle(selectedRoom!);

  const refreshRooms = async () => {
    if (!isAuthenticated) return;
    try {
      setRooms(unwrapRooms(await inboxApi.getRooms()));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách cuộc trò chuyện.'));
    }
  };

  useEffect(() => {
    if (open) void refreshRooms();
  }, [open, isAuthenticated]);

  // Support opening specific club room via global custom event
  useEffect(() => {
    const handleOpenClubChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{ communityId: string }>;
      const communityId = customEvent.detail?.communityId;
      if (!communityId) return;

      setOpen(true);
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        const roomsRes = unwrapRooms(await inboxApi.getRooms());
        setRooms(roomsRes);

        const targetRoom = roomsRes.find(
          (r) => r.type === 'CLUB' && r.communityId === communityId
        );

        if (targetRoom) {
          setSelection({ kind: 'ROOM', room: targetRoom });
        } else {
          // If room not in list yet, fetch from rooms directly
          const clubRes = await fetch(`${getBaseUrl()}/chat/rooms?type=CLUB&communityId=${communityId}`, {
            credentials: 'include',
          });
          if (clubRes.ok) {
            const data = await clubRes.json();
            const roomData = data?.data;
            if (roomData?.id) {
              const newInboxRoom: InboxRoom = {
                id: roomData.id,
                name: roomData.name || 'Phòng Chat CLB',
                type: 'CLUB',
                communityId,
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
                participants: [],
              };
              setSelection({ kind: 'ROOM', room: newInboxRoom });
              setRooms((prev) => [newInboxRoom, ...prev.filter((r) => r.id !== newInboxRoom.id)]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to focus club room in unified chat:', err);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('sporto:open-club-chat', handleOpenClubChat);
    return () => {
      window.removeEventListener('sporto:open-club-chat', handleOpenClubChat);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    const timer = window.setInterval(() => void refreshRooms(), 10000);
    return () => window.clearInterval(timer);
  }, [open, isAuthenticated]);

  useEffect(() => {
    if (!open || selection.kind !== 'ROOM') return;
    let active = true;
    const socket = socketClient.refreshChatAuthentication();
    const roomId = selection.room.id;
    socketRoomRef.current = roomId;
    const onMessage = (message: ChatMessage) => {
      if (message.roomId !== roomId || !active) return;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, { ...message, mine: message.senderId === user?.id }]);
    };
    const onTyping = (event: TypingEvent) => {
      if (event.roomId !== roomId || event.userId === user?.id) return;
      setTypingUserId(event.isTyping ? event.userId : null);
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:club:message', onMessage);
    socket.on('chat:typing', onTyping);
    const joinRoom = () => socket.emit('joinChatRoom', roomId);
    socket.on('connect', joinRoom);
    joinRoom();
    setLoading(true);
    setNextCursor(null); setHasMoreMessages(false); setTypingUserId(null);
    void inboxApi.getMessages(roomId).then((page) => {
      if (active) {
        setMessages(unwrapMessages(page).map((message) => ({ ...message, mine: message.senderId === user?.id })));
        setNextCursor(page.meta?.nextCursor ?? null);
        setHasMoreMessages(page.meta?.hasMore === true);
      }
    }).catch((error: unknown) => {
      if (active) toast.error(getErrorMessage(error, 'Không thể tải tin nhắn.'));
    }).finally(() => { if (active) setLoading(false); });
    void inboxApi.markRead(roomId).then(() => {
      setRooms((current) => current.map((room) => room.id === roomId ? { ...room, unreadCount: 0 } : room));
    }).catch(() => undefined);
    return () => {
      active = false;
      socket.emit('leaveChatRoom', roomId);
      socket.off('chat:message', onMessage);
      socket.off('chat:club:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('connect', joinRoom);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      socketRoomRef.current = null;
    };
  }, [open, selection, user?.id]);

  useEffect(() => {
    if (!open || selection.kind !== 'SUPPORT' || !isAuthenticated) return;
    let active = true;
    setLoading(true);
    void supportApi.getMine().then((conversation) => {
      if (active) setSupportMessages(conversation?.messages ?? []);
    }).catch((error: unknown) => {
      if (active) toast.error(getErrorMessage(error, 'Không thể tải hỗ trợ Sporto.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, selection, isAuthenticated]);

  useEffect(() => {
    if (!open || selection.kind !== 'SUPPORT' || !isAuthenticated) return;
    const socket = socketClient.refreshChatAuthentication();
    const onMessage = (message: ChatMessage) => {
      const supportMessage: SupportMessage = {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        messageText: message.messageText ?? null,
        createdAt: message.createdAt,
        senderName: message.senderName ?? null,
        senderAvatar: message.senderAvatarUrl ?? null,
      };
      setSupportMessages((current) => current.some((item) => item.id === supportMessage.id) ? current : [...current, supportMessage]);
    };
    const subscribe = () => socket.emit('subscribeMySupport');
    socket.on('connect', subscribe);
    socket.on('chat:message', onMessage);
    subscribe();
    return () => {
      socket.off('connect', subscribe);
      socket.off('chat:message', onMessage);
    };
  }, [open, selection, isAuthenticated]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, supportMessages.length, aiMessages.length, selection]);

  const sendRoomMessage = async () => {
    const text = draft.trim();
    if (!text || selection.kind !== 'ROOM' || sending) return;
    setSending(true); setDraft('');
    try {
      const response = await inboxApi.sendMessage(selection.room.id, text);
      const message = response.data;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, { ...message, mine: true }]);
    } catch (error: unknown) {
      setDraft(text); toast.error(getErrorMessage(error, 'Không thể gửi tin nhắn.'));
    } finally { setSending(false); }
  };

  const loadOlderMessages = async () => {
    if (selection.kind !== 'ROOM' || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await inboxApi.getMessages(selection.room.id, nextCursor);
      const older = unwrapMessages(page).map((message) => ({ ...message, mine: message.senderId === user?.id }));
      setMessages((current) => [...older.filter((message) => !current.some((item) => item.id === message.id)), ...current]);
      setNextCursor(page.meta?.nextCursor ?? null);
      setHasMoreMessages(page.meta?.hasMore === true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tải thêm tin nhắn.'));
    } finally { setLoadingOlder(false); }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (selection.kind !== 'ROOM' || !socketRoomRef.current) return;
    const socket = socketClient.getChatSocket();
    socket.emit('typing', { roomId: selection.room.id, isTyping: value.trim().length > 0 });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => socket.emit('typing', { roomId: selection.room.id, isTyping: false }), 1200);
  };

  const sendSupportMessage = async () => {
    const text = draft.trim();
    if (!text || sending || !isAuthenticated) return;
    setSending(true); setDraft('');
    try {
      const conversation = await supportApi.send(text);
      setSupportMessages(conversation.messages);
    } catch (error: unknown) {
      setDraft(text); toast.error(getErrorMessage(error, 'Không thể gửi tin nhắn hỗ trợ.'));
    } finally { setSending(false); }
  };

  const sendAiMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true); setDraft('');
    const nextMessages: AiMessage[] = [...aiMessages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
    setAiMessages(nextMessages);
    try {
      const response = await fetch(`${getBaseUrl()}/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ messages: nextMessages.slice(0, -1), currentUrl: pathname, pageTitle: document.title, isMobile: window.matchMedia('(max-width: 640px)').matches, searchParams: window.location.search }) });
      if (!response.ok || !response.body) throw new Error('AI unavailable');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let answer = '';
      const append = (content: string) => { answer += content; setAiMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: answer } : message)); };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? '';
        chunks.forEach((chunk) => chunk.split(/\r?\n/).forEach((line) => {
          if (!line.startsWith('data: ')) return;
          const payload = line.slice(6);
          if (payload === '[DONE]') return;
          try { const parsed: unknown = JSON.parse(payload); if (typeof parsed === 'object' && parsed !== null && 'content' in parsed && typeof parsed.content === 'string') append(parsed.content); } catch { /* wait for the next complete SSE frame */ }
        }));
      }
      if (!answer) toast.error('AI chưa trả lời, thử lại sau.');
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Không thể kết nối trợ lý AI.')); setAiMessages((current) => current.slice(0, -2)); setDraft(text); } finally { setSending(false); }
  };

  const send = () => selection.kind === 'AI' ? void sendAiMessage() : selection.kind === 'ROOM' ? void sendRoomMessage() : void sendSupportMessage();
  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [rooms]);
  const totalUnread = useMemo(() => rooms.reduce((sum, room) => sum + room.unreadCount, 0), [rooms]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
      {open && (
        <div className="mb-3 flex h-[min(620px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <aside className="flex w-[235px] shrink-0 flex-col border-r border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <p className="text-sm font-bold text-slate-900">Tin nhắn</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => setSelection({ kind: 'AI' })}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selection.kind === 'AI' ? 'bg-blue-100' : 'hover:bg-white'}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs">Trợ lý AI Sporto</strong>
                  <small className="text-[10px] text-slate-500">Luôn sẵn sàng</small>
                </span>
                <Sparkles className="ml-auto h-3 w-3 text-blue-500" />
              </button>
              {sortedRooms.map((room) => {
                const isClub = room.type === 'CLUB';
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelection({ kind: 'ROOM', room })}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition ${
                      selection.kind === 'ROOM' && selectedRoom?.id === room.id
                        ? 'bg-blue-100/80 text-blue-950 font-medium'
                        : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${
                      isClub ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'
                    }`}>
                      {isClub ? <MessageCircle className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      {room.unreadCount > 0 && (
                        <b className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[9px] text-white">
                          {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </b>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <strong className="block truncate text-xs font-semibold">{roomTitle(room)}</strong>
                        {isClub && (
                          <span className="rounded bg-blue-200/60 px-1 py-0.2 text-[9px] font-bold text-blue-800 shrink-0">
                            CLB
                          </span>
                        )}
                      </div>
                      <small className="block truncate text-[10px] text-slate-500 mt-0.5">
                        {room.lastMessage?.content || 'Chưa có tin nhắn'}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <button type="button" className="md:hidden" onClick={() => setSelection({ kind: 'AI' })}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                {selection.kind === 'AI' ? <Bot className="h-4 w-4" /> : selection.kind === 'SUPPORT' ? <Headset className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedTitle}</p>
                <p className="text-[10px] text-slate-500">{selection.kind === 'AI' ? 'Trợ lý AI Sporto' : typingUserId ? 'Đang nhập…' : 'Tin nhắn an toàn'}</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              {selection.kind === 'AI' ? (
                <>
                  {aiMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-slate-700'}`}>
                        <p className="whitespace-pre-wrap">{message.content || 'Đang trả lời...'}</p>
                      </div>
                    </div>
                  ))}
                  {aiMessages.length === 1 && !sending && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Gợi ý nhanh</p>
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setDraft(prompt);
                          }}
                          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600"
                        >
                          {prompt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: 'SUPPORT' })}
                        className="mt-2 flex w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700"
                      >
                        <Headset className="h-3.5 w-3.5" />
                        Chat trực tiếp với admin
                      </button>
                    </div>
                  )}
                </>
              ) : loading ? (
                <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-slate-400" />
              ) : selection.kind === 'SUPPORT' ? (
                supportMessages.map((message) => (
                  <div key={message.id} className={`mb-3 flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${message.senderId === user?.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                      <p className="whitespace-pre-wrap">{message.messageText}</p>
                      <time className="mt-1 block text-[10px] opacity-60">
                        {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {hasMoreMessages && (
                    <button
                      type="button"
                      onClick={() => void loadOlderMessages()}
                      disabled={loadingOlder}
                      className="mx-auto mb-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 disabled:opacity-50"
                    >
                      {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" />}
                      Tin cũ hơn
                    </button>
                  )}
                  {messages.length === 0 ? (
                    <p className="mt-10 text-center text-xs text-slate-400">Chưa có tin nhắn nào.</p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={`mb-3 flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${message.mine ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                          <p className="whitespace-pre-wrap">{message.messageText}</p>
                          <time className="mt-1 block text-[10px] opacity-60">
                            {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex gap-2 border-t border-slate-200 bg-white p-3"
            >
              <input
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                placeholder={selection.kind === 'AI' ? 'Hỏi trợ lý Sporto...' : 'Nhắn tin...'}
                className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở tin nhắn"
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700"
      >
        <MessageCircle className="h-5 w-5" />
        {totalUnread > 0 && (
          <b className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-[10px] leading-5 text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </b>
        )}
      </button>
    </div>
  );
}
