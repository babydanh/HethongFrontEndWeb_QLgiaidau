'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { socketClient } from '@/lib/socket';
import type { ChatMessage } from '@/types/community-social';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

export default function ClubChatLauncher({ communityId }: { communityId: string }) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const roomRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const socket = socketClient.refreshChatAuthentication();
    const onMessage = (message: ChatMessage) => {
      if (message.roomId === roomRef.current) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
    };
    socket.on('chat:club:message', onMessage);
    const timer = window.setTimeout(() => setLoading(true), 0);
    void chatApi.getClubRoom(communityId).then(async (response) => {
      if (!active) return;
      const room = response.data;
      roomRef.current = room.id;
      setRoomId(room.id);
      const history = await chatApi.getClubMessages(room.id);
      if (active) {
        setMessages(Array.isArray(history.data) ? history.data : []);
        socket.emit('joinChatRoom', room.id);
      }
    }).catch((error: unknown) => {
      if (active) toast.error(getErrorMessage(error, 'Không thể mở chat CLB.'));
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      if (roomRef.current) socket.emit('leaveChatRoom', roomRef.current);
      socket.off('chat:club:message', onMessage);
    };
  }, [communityId, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !roomId) return;
    setDraft('');
    try {
      const response = await chatApi.sendClubMessage(roomId, content);
      setMessages((current) => current.some((item) => item.id === response.data.id) ? current : [...current, response.data]);
    } catch (error: unknown) {
      setDraft(content);
      toast.error(getErrorMessage(error, 'Không thể gửi tin nhắn.'));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở chat CLB"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open && (
        <aside className="fixed bottom-5 right-5 z-40 flex h-[min(620px,calc(100vh-2rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Chat CLB</p>
              <p className="text-[11px] text-blue-100">Trao đổi nhanh cùng thành viên</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng chat"
              className="rounded-lg p-1 text-white/80 hover:bg-blue-700 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {loading ? (
              <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-slate-400" />
            ) : messages.length === 0 ? (
              <p className="mt-10 text-center text-xs text-slate-400">Chưa có tin nhắn nào.</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="max-w-[84%] rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm border border-slate-100">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.messageText}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhắn tin..."
              className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              aria-label="Gửi tin nhắn"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
              disabled={!draft.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
