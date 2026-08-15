'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bot,
  ChevronLeft,
  Headset,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  X,
  Heart,
  ShieldAlert,
  MoreVertical,
} from 'lucide-react';
import { getBaseUrl } from '@/lib/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  inboxApi,
  type InboxRoom,
  type InboxRoomsResponse,
} from '@/features/chat/inbox-api';
import { chatApi } from '@/features/chat/api';
import { supportApi, type SupportMessage } from '@/features/support/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import type { ChatMessage } from '@/types/community-social';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

type Selection =
  | { kind: 'AI' }
  | { kind: 'SUPPORT' }
  | { kind: 'ROOM'; room: InboxRoom };

type DisplayMessage = ChatMessage & { mine: boolean };
type AiMessage = { role: 'user' | 'assistant'; content: string };
type TypingEvent = { roomId: string; userId: string; isTyping: boolean };

const initialAiMessages: AiMessage[] = [
  {
    role: 'assistant',
    content:
      'Xin chào! Mình là trợ lý Sporto. Bạn có thể hỏi về giải đấu, ELO hoặc cách sử dụng nền tảng.',
  },
];

const quickPrompts = [
  'Cách đăng ký giải?',
  'ELO được tính thế nào?',
  'Tạo CLB ra sao?',
];

function unwrapMessages(
  value: { data?: ChatMessage[] } | ChatMessage[],
): ChatMessage[] {
  return Array.isArray(value) ? value : value.data ?? [];
}

function unwrapRooms(value: InboxRoomsResponse): InboxRoom[] {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray((value as { data?: InboxRoom[] }).data)) {
    return (value as { data: InboxRoom[] }).data;
  }
  return [];
}

function roomTitle(room: InboxRoom): string {
  if (room.name) return room.name;
  if (room.clubName) return room.clubName;
  if (room.communityName) return room.communityName;
  const other = room.participants?.find((participant) => participant.fullName);
  return (
    other?.fullName ||
    (room.type === 'CLUB' ? 'Câu lạc bộ' : 'Cuộc trò chuyện')
  );
}

function getRoomAvatar(room: InboxRoom, currentUserId?: string): string | null {
  if (room.type === 'CLUB') {
    return room.clubAvatar || room.communityLogo || null;
  }
  const other = room.participants?.find((p) => p.id !== currentUserId);
  return other?.avatarUrl || null;
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';

  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [showRoomMenu, setShowRoomMenu] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const socketRoomRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const selectedRoom = selection.kind === 'ROOM' ? selection.room : null;
  const selectedTitle =
    selection.kind === 'AI'
      ? 'Trợ lý AI Sporto'
      : selection.kind === 'SUPPORT'
        ? 'Hỗ trợ Sporto'
        : roomTitle(selectedRoom!);

  const selectedRoomAvatar = selectedRoom
    ? getRoomAvatar(selectedRoom, user?.id)
    : null;

  const otherParticipant = useMemo(() => {
    if (!selectedRoom || selectedRoom.type === 'CLUB') return null;
    return (
      selectedRoom.participants?.find((p) => p.id !== user?.id) ||
      selectedRoom.participants?.[0] ||
      null
    );
  }, [selectedRoom, user?.id]);

  const isOtherBlocked = useMemo(() => {
    if (!otherParticipant) return false;
    return blockedUserIds.includes(otherParticipant.id);
  }, [otherParticipant, blockedUserIds]);

  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const refreshRooms = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const fetched = unwrapRooms(await inboxApi.getRooms());
      setRooms((current) => {
        const currentSelection = selectionRef.current;
        const currentActiveClub =
          currentSelection.kind === 'ROOM' && currentSelection.room.type === 'CLUB'
            ? currentSelection.room
            : null;
        if (
          currentActiveClub &&
          !fetched.some((r) => r.id === currentActiveClub.id)
        ) {
          return [currentActiveClub, ...fetched];
        }
        return fetched;
      });
    } catch {
      // background refresh
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      chatApi
        .getBlockedUsers()
        .then((items) => setBlockedUserIds(items.map((i) => i.blockedId)))
        .catch(() => undefined);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isSubscribed = true;
    if (open && isAuthenticated) {
      void (async () => {
        if (isSubscribed) {
          await refreshRooms();
        }
      })();
    }
    return () => {
      isSubscribed = false;
    };
  }, [open, isAuthenticated, refreshRooms]);

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
        // Call official chatApi to get or lazy-create the club room with proper authentication
        const res = await chatApi.getClubRoom(communityId);
        const roomData = ((res as unknown as { data?: Partial<InboxRoom> })?.data || res) as Partial<InboxRoom> | undefined;

        if (roomData?.id) {
          const clubRoom: InboxRoom = {
            id: roomData.id,
            name: roomData.name || roomData.clubName || 'Phòng Chat CLB',
            type: 'CLUB',
            communityId,
            clubName: roomData.clubName || roomData.name,
            clubAvatar: roomData.clubAvatar || (roomData as unknown as { communityLogo?: string }).communityLogo,
            unreadCount: 0,
            updatedAt: new Date().toISOString(),
            participants: roomData.participants || [],
          };

          setSelection({ kind: 'ROOM', room: clubRoom });
          setRooms((prev) => [
            clubRoom,
            ...prev.filter((r) => r.id !== clubRoom.id),
          ]);
        }
      } catch (err) {
        console.error('Failed to focus club room in unified chat:', err);
        toast.error(getErrorMessage(err, 'Không thể mở chat CLB.'));
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
  }, [open, isAuthenticated, refreshRooms]);

  useEffect(() => {
    if (!open || selection.kind !== 'ROOM') return;
    let active = true;
    const socket = socketClient.refreshChatAuthentication();
    const roomId = selection.room.id;
    socketRoomRef.current = roomId;

    const onMessage = (message: ChatMessage) => {
      if (message.roomId !== roomId || !active) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, { ...message, mine: message.senderId === user?.id }],
      );
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

    const fetchRoomMessages = async () => {
      setLoading(true);
      setNextCursor(null);
      setHasMoreMessages(false);
      setTypingUserId(null);

      try {
        const page = await inboxApi.getMessages(roomId);
        if (active) {
          setMessages(
            unwrapMessages(page).map((message) => ({
              ...message,
              mine: message.senderId === user?.id,
            })),
          );
          setNextCursor(page.meta?.nextCursor ?? null);
          setHasMoreMessages(page.meta?.hasMore === true);
        }
      } catch (error: unknown) {
        if (active) toast.error(getErrorMessage(error, 'Không thể tải tin nhắn.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchRoomMessages();

    void inboxApi
      .markRead(roomId)
      .then(() => {
        setRooms((current) =>
          current.map((room) =>
            room.id === roomId ? { ...room, unreadCount: 0 } : room,
          ),
        );
      })
      .catch(() => undefined);

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
  }, [open, selection.kind, selection.kind === 'ROOM' ? selection.room.id : null, user?.id]);

  useEffect(() => {
    if (!open || selection.kind !== 'SUPPORT' || !isAuthenticated) return;
    let active = true;

    const fetchSupportConversation = async () => {
      setLoading(true);
      try {
        const conversation = await supportApi.getMine();
        if (active) {
          setSupportMessages(conversation?.messages ?? []);
        }
      } catch (error: unknown) {
        if (active) {
          toast.error(getErrorMessage(error, 'Không thể tải hỗ trợ Sporto.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchSupportConversation();

    return () => {
      active = false;
    };
  }, [open, selection.kind, isAuthenticated]);

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
      setSupportMessages((current) =>
        current.some((item) => item.id === supportMessage.id)
          ? current
          : [...current, supportMessage],
      );
    };
    const subscribe = () => socket.emit('subscribeMySupport');
    socket.on('connect', subscribe);
    socket.on('chat:message', onMessage);
    subscribe();
    return () => {
      socket.off('connect', subscribe);
      socket.off('chat:message', onMessage);
    };
  }, [open, selection.kind, isAuthenticated]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [
    messages.length,
    supportMessages.length,
    aiMessages.length,
    selection,
    typingUserId,
  ]);

  const toggleHeartReaction = (messageId: string) => {
    setReactions((prev) => {
      const current = prev[messageId] || [];
      const hasHeart = current.includes('❤️');
      return {
        ...prev,
        [messageId]: hasHeart
          ? current.filter((r) => r !== '❤️')
          : [...current, '❤️'],
      };
    });
  };

  const handleToggleBlock = async () => {
    if (!otherParticipant) return;
    const isBlocked = blockedUserIds.includes(otherParticipant.id);
    const confirmed = window.confirm(
      isBlocked
        ? `Bỏ chặn người dùng ${otherParticipant.fullName || ''}?`
        : `Chặn người dùng ${otherParticipant.fullName || ''}?`,
    );
    if (!confirmed) return;

    try {
      if (isBlocked) {
        await chatApi.unblockUser(otherParticipant.id);
        setBlockedUserIds((prev) => prev.filter((id) => id !== otherParticipant.id));
        toast.success('Đã bỏ chặn người dùng.');
      } else {
        await chatApi.blockUser(otherParticipant.id);
        setBlockedUserIds((prev) => [...prev, otherParticipant.id]);
        toast.success('Đã chặn người dùng.');
      }
      setShowRoomMenu(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Thao tác chặn thất bại.'));
    }
  };

  const sendRoomMessage = async () => {
    const text = draft.trim();
    if (!text || selection.kind !== 'ROOM' || sending) return;
    if (isOtherBlocked) {
      toast.error('Bạn đã chặn người dùng này. Bỏ chặn để gửi tin nhắn.');
      return;
    }
    setSending(true);
    setDraft('');
    try {
      const response = await inboxApi.sendMessage(selection.room.id, text);
      const message = response.data;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, { ...message, mine: true }],
      );
    } catch (error: unknown) {
      setDraft(text);
      toast.error(getErrorMessage(error, 'Không thể gửi tin nhắn.'));
    } finally {
      setSending(false);
    }
  };

  const loadOlderMessages = async () => {
    if (selection.kind !== 'ROOM' || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await inboxApi.getMessages(selection.room.id, nextCursor);
      const older = unwrapMessages(page).map((message) => ({
        ...message,
        mine: message.senderId === user?.id,
      }));
      setMessages((current) => [
        ...older.filter(
          (message) => !current.some((item) => item.id === message.id),
        ),
        ...current,
      ]);
      setNextCursor(page.meta?.nextCursor ?? null);
      setHasMoreMessages(page.meta?.hasMore === true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tải thêm tin nhắn.'));
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (selection.kind !== 'ROOM' || !socketRoomRef.current) return;
    const socket = socketClient.getChatSocket();
    socket.emit('typing', {
      roomId: selection.room.id,
      isTyping: value.trim().length > 0,
    });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(
      () =>
        socket.emit('typing', {
          roomId: selection.room.id,
          isTyping: false,
        }),
      1200,
    );
  };

  const sendSupportMessage = async () => {
    const text = draft.trim();
    if (!text || sending || !isAuthenticated) return;
    setSending(true);
    setDraft('');
    try {
      const conversation = await supportApi.send(text);
      setSupportMessages(conversation.messages);
    } catch (error: unknown) {
      setDraft(text);
      toast.error(getErrorMessage(error, 'Không thể gửi tin nhắn hỗ trợ.'));
    } finally {
      setSending(false);
    }
  };

  const sendAiMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    const nextMessages: AiMessage[] = [
      ...aiMessages,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ];
    setAiMessages(nextMessages);
    try {
      const response = await fetch(`${getBaseUrl()}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: nextMessages.slice(0, -1),
          currentUrl: pathname,
          pageTitle: document.title,
          isMobile: window.matchMedia('(max-width: 640px)').matches,
          searchParams: window.location.search,
        }),
      });
      if (!response.ok || !response.body) throw new Error('AI unavailable');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      const append = (content: string) => {
        answer += content;
        setAiMessages((current) =>
          current.map((message, index) =>
            index === current.length - 1
              ? { ...message, content: answer }
              : message,
          ),
        );
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? '';
        chunks.forEach((chunk) =>
          chunk.split(/\r?\n/).forEach((line) => {
            if (!line.startsWith('data: ')) return;
            const payload = line.slice(6);
            if (payload === '[DONE]') return;
            try {
              const parsed: unknown = JSON.parse(payload);
              if (
                typeof parsed === 'object' &&
                parsed !== null &&
                'content' in parsed &&
                typeof parsed.content === 'string'
              )
                append(parsed.content);
            } catch {
              // wait next chunk
            }
          }),
        );
      }
      if (!answer) toast.error('AI chưa trả lời, thử lại sau.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể kết nối trợ lý AI.'));
      setAiMessages((current) => current.slice(0, -2));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const send = () =>
    selection.kind === 'AI'
      ? void sendAiMessage()
      : selection.kind === 'ROOM'
        ? void sendRoomMessage()
        : void sendSupportMessage();

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [rooms],
  );

  const totalUnread = useMemo(
    () => rooms.reduce((sum, room) => sum + room.unreadCount, 0),
    [rooms],
  );

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
      {open && (
        <div className="mb-3 flex h-[min(640px,calc(100vh-2rem))] w-[min(780px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Left Sidebar: Conversations & Channels */}
          <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
              <p className="text-sm font-bold text-slate-900">Tin nhắn</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto p-2">
              {/* Bot AI Channel */}
              <button
                type="button"
                onClick={() => setSelection({ kind: 'AI' })}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                  selection.kind === 'AI'
                    ? 'bg-blue-100/90 text-blue-950 font-medium shadow-sm'
                    : 'hover:bg-white text-slate-700'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs font-semibold">
                    Trợ lý AI Sporto
                  </strong>
                  <small className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Luôn sẵn sàng
                  </small>
                </span>
                <Sparkles className="ml-auto h-3.5 w-3.5 text-blue-500 shrink-0" />
              </button>

              {/* Support Admin Channel */}
              <button
                type="button"
                onClick={() => setSelection({ kind: 'SUPPORT' })}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                  selection.kind === 'SUPPORT'
                    ? 'bg-blue-100/90 text-blue-950 font-medium shadow-sm'
                    : 'hover:bg-white text-slate-700'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                  <Headset className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs font-semibold">
                    Hỗ trợ Sporto
                  </strong>
                  <small className="text-[10px] text-slate-500">
                    Admin trực tuyến
                  </small>
                </span>
              </button>

              <div className="my-2 border-t border-slate-200/60 px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phòng Chat & CLB
              </div>

              {/* Chat & Club Rooms */}
              {sortedRooms.map((room) => {
                const isClub = room.type === 'CLUB';
                const isSelected =
                  selection.kind === 'ROOM' && selectedRoom?.id === room.id;
                const avatar = getRoomAvatar(room, user?.id);

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelection({ kind: 'ROOM', room })}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition ${
                      isSelected
                        ? 'bg-blue-100/90 text-blue-950 font-medium shadow-sm'
                        : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden shadow-sm ${
                        isClub
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={roomTitle(room)}
                          className="h-full w-full object-cover"
                        />
                      ) : isClub ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">
                          {roomTitle(room).charAt(0).toUpperCase()}
                        </span>
                      )}
                      {room.unreadCount > 0 && (
                        <b className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[9px] text-white">
                          {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </b>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <strong className="block truncate text-xs font-semibold">
                          {roomTitle(room)}
                        </strong>
                        {isClub && (
                          <span className="rounded bg-blue-200/80 px-1 py-0.2 text-[9px] font-bold text-blue-800 shrink-0">
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

          {/* Right Main Chat Frame */}
          <section className="flex min-w-0 flex-1 flex-col bg-white">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className="md:hidden p-1 text-slate-500 hover:text-slate-700"
                  onClick={() => setSelection({ kind: 'AI' })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden bg-blue-50 text-blue-600 shadow-sm border border-slate-100">
                  {selection.kind === 'AI' ? (
                    <Bot className="h-4 w-4" />
                  ) : selection.kind === 'SUPPORT' ? (
                    <Headset className="h-4 w-4" />
                  ) : selectedRoomAvatar ? (
                    <img
                      src={selectedRoomAvatar}
                      alt={selectedTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {selectedTitle}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    {selection.kind === 'AI' ? (
                      'Trợ lý AI Sporto 24/7'
                    ) : typingUserId ? (
                      <span className="text-blue-600 font-medium animate-pulse">
                        Đang soạn tin nhắn...
                      </span>
                    ) : isOtherBlocked ? (
                      <span className="text-rose-500 font-semibold">Đã chặn</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đang hoạt động
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Dropdown Menu (Block / Unblock for private chat) */}
              {selection.kind === 'ROOM' &&
                selection.room.type !== 'CLUB' &&
                otherParticipant && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRoomMenu((prev) => !prev)}
                      aria-label="Tùy chọn"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showRoomMenu && (
                      <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in">
                        <button
                          type="button"
                          onClick={handleToggleBlock}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span>
                            {isOtherBlocked
                              ? 'Bỏ chặn người này'
                              : 'Chặn tin nhắn'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </header>

            {/* Chat Body & Timeline */}
            <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 space-y-3">
              {selection.kind === 'AI' ? (
                <>
                  {aiMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        ) : (
                          <div className="prose prose-sm max-w-none text-slate-800 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content || 'Đang suy nghĩ câu trả lời...'}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {aiMessages.length === 1 && !sending && (
                    <div className="mt-6 space-y-2 max-w-sm mx-auto">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                        Gợi ý câu hỏi nhanh
                      </p>
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setDraft(prompt);
                          }}
                          className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 transition"
                        >
                          {prompt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: 'SUPPORT' })}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-center text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-sm"
                      >
                        <Headset className="h-4 w-4 text-amber-600" />
                        Chat trực tiếp với Ban Quản Trị
                      </button>
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs">Đang tải tin nhắn...</span>
                </div>
              ) : selection.kind === 'SUPPORT' ? (
                supportMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.id
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        message.senderId === user?.id
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.messageText}
                      </p>
                      <time
                        className={`mt-1 block text-[10px] ${
                          message.senderId === user?.id
                            ? 'text-blue-100 text-right'
                            : 'text-slate-400'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString(
                          'vi-VN',
                          { hour: '2-digit', minute: '2-digit' },
                        )}
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
                      className="mx-auto mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      {loadingOlder && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      )}
                      Tải tin nhắn cũ hơn
                    </button>
                  )}
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        Chưa có tin nhắn nào
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hãy gửi tin nhắn đầu tiên để bắt đầu trò chuyện!
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const prevMsg = messages[index - 1];
                      const isNewDay =
                        !prevMsg ||
                        new Date(message.createdAt).toDateString() !==
                          new Date(prevMsg.createdAt).toDateString();
                      const msgReactions = reactions[message.id] || [];

                      const senderAvatar =
                        message.senderAvatarUrl ||
                        (message as unknown as { senderAvatar?: string })?.senderAvatar ||
                        null;

                      const senderName =
                        message.senderName ||
                        (message.mine ? user?.fullName || 'Tôi' : 'Thành viên');

                      return (
                        <div key={message.id} className="space-y-2">
                          {/* Timeline Date Separator */}
                          {isNewDay && (
                            <div className="flex items-center justify-center my-3">
                              <span className="rounded-full bg-slate-200/70 px-3 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                {formatDateSeparator(message.createdAt)}
                              </span>
                            </div>
                          )}

                          {/* Message Bubble Item */}
                          <div
                            className={`group relative flex items-end gap-2.5 ${
                              message.mine ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {/* Avatar on other person's bubble */}
                            {!message.mine && (
                              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm border border-slate-100">
                                {senderAvatar ? (
                                  <img
                                    src={senderAvatar}
                                    alt={senderName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  senderName.charAt(0).toUpperCase()
                                )}
                              </div>
                            )}

                            <div
                              className={`flex flex-col ${
                                message.mine ? 'items-end' : 'items-start'
                              } max-w-[78%]`}
                            >
                              {!message.mine && (
                                <span className="text-[11px] font-semibold text-slate-600 mb-0.5 px-1">
                                  {senderName}
                                </span>
                              )}

                              <div className="relative group/bubble">
                                <div
                                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm transition ${
                                    message.mine
                                      ? 'bg-blue-600 text-white rounded-br-sm'
                                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words">
                                    {message.messageText}
                                  </p>
                                  <time
                                    className={`mt-1 block text-[10px] ${
                                      message.mine
                                        ? 'text-blue-100 text-right'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {new Date(
                                      message.createdAt,
                                    ).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </time>
                                </div>

                                {/* Floating Heart Button on Hover (like Messenger) */}
                                <button
                                  type="button"
                                  onClick={() => toggleHeartReaction(message.id)}
                                  title="Thả tim tin nhắn"
                                  className={`absolute -top-3 ${
                                    message.mine ? '-left-6' : '-right-6'
                                  } opacity-0 group-hover/bubble:opacity-100 transition p-1 bg-white hover:bg-rose-50 rounded-full shadow-md border border-slate-100 text-rose-500 active:scale-125`}
                                >
                                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                                </button>

                                {/* Heart Badge if Reacted */}
                                {msgReactions.length > 0 && (
                                  <div
                                    className={`absolute -bottom-2 ${
                                      message.mine ? 'left-2' : 'right-2'
                                    } flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[11px] shadow-sm border border-slate-100`}
                                  >
                                    <span>❤️</span>
                                    {msgReactions.length > 1 && (
                                      <span className="text-[10px] font-bold text-slate-600">
                                        {msgReactions.length}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 shadow-inner"
            >
              <input
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                placeholder={
                  isOtherBlocked
                    ? 'Bạn đã chặn người này...'
                    : selection.kind === 'AI'
                      ? 'Hỏi trợ lý Sporto...'
                      : 'Nhập tin nhắn...'
                }
                disabled={isOtherBlocked}
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending || isOtherBlocked}
                aria-label="Gửi tin nhắn"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở tin nhắn"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <b className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-[10px] leading-5 text-white shadow">
            {totalUnread > 99 ? '99+' : totalUnread}
          </b>
        )}
      </button>
    </div>
  );
}
