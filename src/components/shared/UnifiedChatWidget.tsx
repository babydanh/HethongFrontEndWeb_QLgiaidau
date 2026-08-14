'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ kind: 'AI' });
  const [rooms, setRooms] = useState<InboxRoom[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRoomRef = useRef<string | null>(null);

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
    socket.on('chat:message', onMessage);
    socket.on('chat:club:message', onMessage);
    socket.emit('joinChatRoom', roomId);
    setLoading(true);
    void inboxApi.getMessages(roomId).then((page) => {
      if (active) setMessages(unwrapMessages(page).map((message) => ({ ...message, mine: message.senderId === user?.id })));
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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, selection]);

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
    try {
      const response = await fetch(`${getBaseUrl()}/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ messages: [{ role: 'user', content: text }] }) });
      if (!response.ok || !response.body) throw new Error('AI unavailable');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let answer = '';
      while (true) { const { value, done } = await reader.read(); if (done) break; answer += decoder.decode(value).replace(/data:\s*/g, '').replace(/\[DONE\]/g, ''); }
      if (!answer) toast.error('AI chưa trả lời, thử lại sau.');
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Không thể kết nối trợ lý AI.')); setDraft(text); } finally { setSending(false); }
  };

  const send = () => selection.kind === 'AI' ? void sendAiMessage() : selection.kind === 'ROOM' ? void sendRoomMessage() : void sendSupportMessage();
  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [rooms]);
  const totalUnread = useMemo(() => rooms.reduce((sum, room) => sum + room.unreadCount, 0), [rooms]);

  return <div className="fixed bottom-6 right-6 z-[9999] font-sans">
    {open && <div className="mb-3 flex h-[min(620px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <aside className="flex w-[235px] shrink-0 flex-col border-r border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4"><p className="text-sm font-bold text-slate-900">Tin nhắn</p><button type="button" onClick={() => setOpen(false)} aria-label="Đóng"><X className="h-4 w-4 text-slate-500" /></button></div>
        <div className="space-y-1 overflow-y-auto p-2">
          <button type="button" onClick={() => setSelection({ kind: 'AI' })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selection.kind === 'AI' ? 'bg-blue-100' : 'hover:bg-white'}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"><Bot className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-xs">Trợ lý AI Sporto</strong><small className="text-[10px] text-slate-500">Luôn sẵn sàng</small></span><Sparkles className="ml-auto h-3 w-3 text-blue-500" /></button>
          <button type="button" onClick={() => setSelection({ kind: 'SUPPORT' })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selection.kind === 'SUPPORT' ? 'bg-blue-100' : 'hover:bg-white'}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white"><Headset className="h-4 w-4" /></span><span><strong className="block text-xs">Hỗ trợ Sporto</strong><small className="text-[10px] text-slate-500">Chat với admin</small></span></button>
          {sortedRooms.map((room) => <button key={room.id} type="button" onClick={() => setSelection({ kind: 'ROOM', room })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selection.kind === 'ROOM' && selectedRoom?.id === room.id ? 'bg-blue-100' : 'hover:bg-white'}`}><span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"><Users className="h-4 w-4" />{room.unreadCount > 0 && <b className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[9px] text-white">{room.unreadCount > 99 ? '99+' : room.unreadCount}</b>}</span><span className="min-w-0"><strong className="block truncate text-xs">{roomTitle(room)}</strong><small className="block truncate text-[10px] text-slate-500">{room.lastMessage?.content || 'Chưa có tin nhắn'}</small></span></button>)}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col"><header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><button type="button" className="md:hidden" onClick={() => setSelection({ kind: 'AI' })}><ChevronLeft className="h-4 w-4" /></button><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">{selection.kind === 'AI' ? <Bot className="h-4 w-4" /> : selection.kind === 'SUPPORT' ? <Headset className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}</span><div><p className="text-sm font-bold text-slate-900">{selectedTitle}</p><p className="text-[10px] text-slate-500">{selection.kind === 'AI' ? 'Trợ lý AI Sporto' : 'Tin nhắn an toàn'}</p></div></header><div className="flex-1 overflow-y-auto bg-slate-50 p-5">{selection.kind === 'AI' ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">Xin chào! Mình là trợ lý Sporto. Bạn có thể hỏi về giải đấu, ELO hoặc cách sử dụng nền tảng.</div> : loading ? <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-slate-400" /> : selection.kind === 'SUPPORT' ? supportMessages.map((message) => <div key={message.id} className={`mb-3 flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${message.senderId === user?.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}><p className="whitespace-pre-wrap">{message.messageText}</p><time className="mt-1 block text-[10px] opacity-60">{new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time></div></div>) : messages.length === 0 ? <p className="mt-10 text-center text-xs text-slate-400">Chưa có tin nhắn nào.</p> : messages.map((message) => <div key={message.id} className={`mb-3 flex ${message.mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${message.mine ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}><p className="whitespace-pre-wrap">{message.messageText}</p><time className="mt-1 block text-[10px] opacity-60">{new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time></div></div>)}<div ref={endRef} /></div><form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex gap-2 border-t border-slate-200 bg-white p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={selection.kind === 'AI' ? 'Hỏi trợ lý Sporto...' : 'Nhắn tin...'} className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500" /><button type="submit" disabled={!draft.trim() || sending} className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form></section>
    </div>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Mở tin nhắn" className="relative flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700"><MessageCircle className="h-5 w-5" />{totalUnread > 0 && <b className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-[10px] leading-5 text-white">{totalUnread > 99 ? '99+' : totalUnread}</b>}</button>
  </div>;
}
