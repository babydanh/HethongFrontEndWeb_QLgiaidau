'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { Loader2, MessageCircle, Send, X, Users, Sparkles } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import type { ChatMessage } from '@/types/community-social';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

interface ClubChatLauncherProps {
  communityId: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ClubChatLauncher({
  communityId,
  isOpen,
  onOpenChange,
}: ClubChatLauncherProps) {
  const translate = useTranslations('Common');
  const locale = useLocale();
  const { user } = useAuthStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [roomId, setRoomId] = useState<string | null>(null);
  const roomRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const socket = socketClient.refreshChatAuthentication();

    const onMessage = (message: ChatMessage) => {
      if (message.roomId === roomRef.current) {
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message],
        );
      }
    };

    socket.on('chat:club:message', onMessage);
    const timer = window.setTimeout(() => setLoading(true), 0);

    void chatApi
      .getClubRoom(communityId)
      .then(async (response) => {
        if (!active) return;
        const room = response.data;
        roomRef.current = room.id;
        setRoomId(room.id);
        const history = await chatApi.getClubMessages(room.id, { limit: 50 });
        if (active) {
          setMessages(Array.isArray(history.data) ? history.data : []);
          setNextCursor(history.meta?.nextCursor ?? null);
          setHasMore(history.meta?.hasMore ?? false);
          socket.emit('joinChatRoom', room.id);
        }
      })
      .catch((error: unknown) => {
        if (active) toast.error(getErrorMessage(error, translate('openClubChatFailed')));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timer);
      if (roomRef.current) socket.emit('leaveChatRoom', roomRef.current);
      socket.off('chat:club:message', onMessage);
    };
  }, [communityId, open, translate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  const loadOlder = async () => {
    if (!roomId || !hasMore || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const history = await chatApi.getClubMessages(roomId, { cursor: nextCursor, limit: 50 });
      setMessages((current) => [...(Array.isArray(history.data) ? history.data : []), ...current]);
      setNextCursor(history.meta?.nextCursor ?? null);
      setHasMore(history.meta?.hasMore ?? false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('loadMoreMessagesFailed')));
    } finally {
      setLoadingOlder(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !roomId) return;
    setDraft('');
    try {
      const response = await chatApi.sendClubMessage(roomId, content);
      setMessages((current) =>
        current.some((item) => item.id === response.data.id)
          ? current
          : [...current, response.data],
      );
    } catch (error: unknown) {
      setDraft(content);
      toast.error(getErrorMessage(error, translate('clubChatSendFailed')));
    }
  };

  return (
    <>
      {/* Nút tròn nổi góc phải */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={translate('clubChatOpenAria')}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Cửa sổ Chat CLB */}
      {open && (
        <aside className="fixed bottom-5 right-5 z-50 flex h-[min(640px,calc(100vh-2.5rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <header className="flex items-center justify-between bg-blue-600 px-4 py-3.5 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{translate('clubChatTitle')}</p>
                <p className="text-[11px] text-blue-100 flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {translate('clubChatSchedulePrompt')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={translate('closeChatAria')}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4">
            {hasMore && (
              <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="mx-auto mb-3 block text-xs font-semibold text-blue-700 disabled:opacity-50">
                {loadingOlder ? translate('loadingOlderMessages') : translate('loadOlderMessages')}
              </button>
            )}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-xs">{translate('connectingChatRoom')}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">{translate('noChatMessages')}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  {translate('firstClubMessage')}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isMe = user?.id && message.senderId === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && message.senderName && (
                      <span className="text-[11px] font-semibold text-slate-500 mb-1 px-1">
                        {message.senderName}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.messageText}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          isMe ? 'text-blue-100 text-right' : 'text-slate-400'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 shadow-inner"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={translate('enterMessage')}
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              aria-label={translate('sendMessageAria')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 disabled:shadow-none shrink-0"
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
