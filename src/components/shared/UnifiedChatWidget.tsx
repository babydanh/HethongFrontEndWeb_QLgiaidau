'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
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
  Reply,
  Copy,
  Check,
  Smile,
  ThumbsUp,
  Flame,
  CornerDownRight,
  Image as ImageIcon,
  Pin,
  PinOff,
  Trash2,
  Settings,
  Ban,
  ZoomIn,
  Download,
  AlertCircle,
  MoreHorizontal,
  Camera,
  BarChart2,
  ExternalLink,
  Calendar,
  Trophy,
  CheckSquare,
  Square,
  Plus,
  Trash,
  Vote,
  Search,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  AtSign,
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
import { uploadApi } from '@/features/upload/api';
import { communitiesApi } from '@/features/communities/api';
import { supportApi, type SupportMessage } from '@/features/support/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import type { ChatMessage } from '@/types/community-social';
import { getErrorMessage } from '@/utils/error';
import { AssistantCardRenderer, type AssistantUiBlock } from './AiAssistantCards';
import toast from 'react-hot-toast';

type Selection =
  | { kind: 'AI' }
  | { kind: 'SUPPORT' }
  | { kind: 'ROOM'; room: InboxRoom };

type DisplayMessage = ChatMessage & { mine: boolean };
type AiToolEvent = { type: 'tool_start' | 'tool_result' | 'tool_error'; tool: string; label: string; round: number; status?: string; uiBlocks?: AssistantUiBlock[] };
type AiMessage = { role: 'user' | 'assistant'; content: string; uiBlocks?: AssistantUiBlock[]; toolEvents?: AiToolEvent[] };
type TypingEvent = { roomId: string; userId: string; isTyping: boolean };
type PollOption = {
  id: string;
  voterIds?: string[];
  [key: string]: unknown;
};

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const;
const EMOJI_PICKER_LIST = [
  '❤️', '👍', '🔥', '😂', '👏', '🎉',
  '⚽', '🏆', '🥇', '🏸', '🏓', '🎾',
  '😮', '😢', '🤝', '💯', '😍', '🚀',
  '💪', '🥳', '😎', '🙏', '🎯', '⚡',
];

const createInitialAiMessages = (translate: (key: string) => string): AiMessage[] => [
  {
    role: 'assistant',
    content:
      translate('aiGreeting'),
  },
];

const quickPromptKeys = [
  'quickPromptRegistration',
  'quickPromptElo',
  'quickPromptClub',
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

function dedupeRooms(rooms: InboxRoom[], currentUserId?: string): InboxRoom[] {
  const byConversation = new Map<string, InboxRoom>();
  for (const room of rooms) {
    const otherParticipants = (room.participants ?? [])
      .filter((participant) => participant.id && participant.id !== currentUserId)
      .map((participant) => participant.id)
      .sort();
    const lastSenderId = room.lastMessage?.senderId && room.lastMessage.senderId !== currentUserId
      ? room.lastMessage.senderId
      : null;
    const otherParticipant = room.participants?.find((participant) => participant.id !== currentUserId);
    const directIdentity = otherParticipants.join(',') || lastSenderId;
    const fallbackName = otherParticipant?.fullName?.trim().toLocaleLowerCase('vi-VN');
    const key = room.type === 'DIRECT' && (directIdentity || fallbackName)
      ? `DIRECT:${directIdentity ?? fallbackName}`
      : `${room.type}:${room.id}`;
    const existing = byConversation.get(key);
    if (!existing) {
      byConversation.set(key, room);
      continue;
    }

    const roomTime = Date.parse(room.updatedAt);
    const existingTime = Date.parse(existing.updatedAt);
    if (roomTime >= existingTime) {
      byConversation.set(key, {
        ...room,
        unreadCount: Math.max(existing.unreadCount, room.unreadCount),
      });
    } else if (existing.unreadCount < room.unreadCount) {
      byConversation.set(key, { ...existing, unreadCount: room.unreadCount });
    }
  }
  return Array.from(byConversation.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function roomTitle(room: InboxRoom, labels: { club: string; conversation: string }): string {
  if (room.name) return room.name;
  if (room.clubName) return room.clubName;
  if (room.communityName) return room.communityName;
  const other = room.participants?.find((participant) => participant.fullName);
  return (
    other?.fullName ||
    (room.type === 'CLUB' ? labels.club : labels.conversation)
  );
}

function getRoomAvatar(room: InboxRoom, currentUserId?: string): string | null {
  if (room.type === 'CLUB') {
    return room.clubAvatar || room.communityLogo || null;
  }
  const other = room.participants?.find((p) => p.id !== currentUserId);
  return other?.avatarUrl || null;
}

function formatDateSeparator(
  dateStr: string,
  locale: string,
  labels: { today: string; yesterday: string },
): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return labels.today;
  if (d.toDateString() === yesterday.toDateString()) return labels.yesterday;

  return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function renderHighlightedText(text: string, query: string) {
  if (!query?.trim() || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-300 text-slate-950 font-bold rounded px-0.5 shadow-2xs">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function UnifiedChatWidget() {
  const pathname = usePathname();
  const translate = useTranslations('Common');
  const locale = useLocale();
  const quickPrompts = quickPromptKeys.map((key) => translate(key));
  const roomLabels = { club: translate('club'), conversation: translate('conversation') };
  const getPresetLabel = (name: string) => {
    if (name === 'Cây hài') return translate('tagSuggestionFunny');
    if (name === 'Kèo thơm') return translate('tagSuggestionGoodMatch');
    if (name === 'MVP tuần') return translate('tagSuggestionWeeklyMvp');
    if (name === 'Đang lên form') return translate('tagSuggestionRising');
    if (name === 'Kèo khó') return translate('tagSuggestionToughMatch');
    return name;
  };
  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ kind: 'AI' });
  const [rooms, setRooms] = useState<InboxRoom[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(() => createInitialAiMessages(translate));
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [replyingTo, setReplyingTo] = useState<DisplayMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showClubSettings, setShowClubSettings] = useState(false);
  const [settingsClubAvatar, setSettingsClubAvatar] = useState<string>('');
  const [uploadingClubAvatar, setUploadingClubAvatar] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [isMobileRoomOpen, setIsMobileRoomOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadSinceScrolledUp, setUnreadSinceScrolledUp] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);
  const [clubMembersMap, setClubMembersMap] = useState<Record<string, { role?: string; tags?: string[] }>>({});
  const [clubTagPresets, setClubTagPresets] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearingRoom, setClearingRoom] = useState(false);
  const [clubNotificationPref, setClubNotificationPref] = useState<'ALL' | 'MENTIONS_ONLY' | 'MUTED'>('ALL');
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [roomReadStates, setRoomReadStates] = useState<Record<string, Record<string, string>>>({});

  const widgetRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clubAvatarInputRef = useRef<HTMLInputElement>(null);
  const socketRoomRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const selectedRoom = selection.kind === 'ROOM' ? selection.room : null;
  const selectedTitle =
    selection.kind === 'AI'
      ? translate('aiAssistant')
      : selection.kind === 'SUPPORT'
        ? translate('support')
        : roomTitle(selectedRoom!, roomLabels);

  const selectedRoomAvatar = selectedRoom
    ? getRoomAvatar(selectedRoom, user?.id)
    : null;

  // Fetch club member tags and presets when a CLUB room is active
  useEffect(() => {
    if (selectedRoom?.type === 'CLUB' && selectedRoom.communityId) {
      const commId = selectedRoom.communityId;
      communitiesApi.getTagPresets(commId)
        .then((res) => {
          if (res.data) setClubTagPresets(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {});

      communitiesApi.getMembers(commId, { limit: 100 })
        .then((res) => {
          const list = (Array.isArray(res.data) ? res.data : (res.data as { data?: Array<{ user?: { id?: string }; member?: { role?: string; tags?: string[] } }> })?.data) ?? [];
          const map: Record<string, { role?: string; tags?: string[] }> = {};
          list.forEach((item) => {
            const uid = item.user?.id || (item as unknown as { userId?: string }).userId;
            if (uid && item.member) {
              map[uid] = {
                role: item.member.role,
                tags: item.member.tags || [],
              };
            }
          });
          setClubMembersMap(map);
        })
        .catch(() => {});
    }
  }, [selectedRoom?.id, selectedRoom?.type, selectedRoom?.communityId]);

  useEffect(() => {
    const handleTagsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ communityId?: string; userId?: string; tags?: string[] }>).detail;
      if (!detail?.userId || selectedRoom?.type !== 'CLUB') return;
      if (detail.communityId && detail.communityId !== selectedRoom.communityId) return;
      setClubMembersMap((current) => ({
        ...current,
        [detail.userId as string]: {
          ...current[detail.userId as string],
          tags: Array.isArray(detail.tags) ? detail.tags : [],
        },
      }));
    };

    window.addEventListener('sporto:member-tags-updated', handleTagsUpdated);
    return () => window.removeEventListener('sporto:member-tags-updated', handleTagsUpdated);
  }, [selectedRoom?.type, selectedRoom?.communityId]);

  const otherParticipant = useMemo(() => {
    if (!selectedRoom || selectedRoom.type === 'CLUB') return null;
    return (
      selectedRoom.participants?.find((p) => p.id !== userId) ||
      selectedRoom.participants?.[0] ||
      null
    );
  }, [selectedRoom, userId]);

  const isOtherBlocked = useMemo(() => {
    if (!otherParticipant) return false;
    return blockedUserIds.includes(otherParticipant.id);
  }, [otherParticipant, blockedUserIds]);

  const selectionRef = useRef(selection);
  const directChatRequestRef = useRef(0);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const refreshRooms = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const fetched = dedupeRooms(unwrapRooms(await inboxApi.getRooms()), userId);
      setRooms((current) => {
        const currentSelection = selectionRef.current;
        const currentActiveRoom =
          currentSelection.kind === 'ROOM' ? currentSelection.room : null;
        if (currentActiveRoom && !fetched.some((r) => r.id === currentActiveRoom.id)) {
          return [currentActiveRoom, ...fetched];
        }
        return fetched;
      });
      const active = selectionRef.current;
      if (active.kind === 'ROOM') {
        const hydrated = fetched.find((room) => room.id === active.room.id);
        if (hydrated) setSelection({ kind: 'ROOM', room: hydrated });
      }
    } catch {
      // background refresh
    }
  }, [isAuthenticated, userId]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    if (selection.kind === 'ROOM') {
      return messages
        .filter((m) => !m.isRevoked && m.messageText?.toLowerCase().includes(q))
        .map((m) => m.id);
    }
    if (selection.kind === 'SUPPORT') {
      return supportMessages
        .filter((m) => m.messageText?.toLowerCase().includes(q))
        .map((m) => m.id);
    }
    if (selection.kind === 'AI') {
      return aiMessages
        .map((m, idx) => ({ id: `ai-${idx}`, text: m.content }))
        .filter((m) => m.text.toLowerCase().includes(q))
        .map((m) => m.id);
    }
    return [];
  }, [searchQuery, selection.kind, messages, supportMessages, aiMessages]);

  const jumpToSearchMatch = useCallback(
    (index: number) => {
      if (searchMatches.length === 0) return;
      const safeIndex = (index + searchMatches.length) % searchMatches.length;
      setActiveSearchMatchIndex(safeIndex);
      const targetId = searchMatches[safeIndex];
      const el = document.getElementById(`msg-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-100/60');
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-100/60');
        }, 2500);
      }
    },
    [searchMatches],
  );

  const handleNextSearchMatch = () => {
    jumpToSearchMatch(activeSearchMatchIndex + 1);
  };

  const handlePrevSearchMatch = () => {
    jumpToSearchMatch(activeSearchMatchIndex - 1);
  };

  const handleTimelineScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isScrolledUp = distanceFromBottom > 140;
    setShowScrollBottom(isScrolledUp);
    if (!isScrolledUp) {
      setUnreadSinceScrolledUp(0);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (widgetRef.current && !widgetRef.current.contains(target)) {
        const isModal = (target as HTMLElement).closest?.('.fixed.inset-0.z-50');
        const isFloatingTrigger = (target as HTMLElement).closest?.('#chat-floating-trigger');
        if (!isModal && !isFloatingTrigger) {
          setOpen(false);
        }
      }
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 100);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [open]);

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

  // Open a direct room inside the unified widget instead of navigating away.
  useEffect(() => {
    const handleOpenDirectChat = async (e: Event) => {
      const targetUserId = (e as CustomEvent<{ userId?: string }>).detail?.userId;
      if (!targetUserId) return;
      if (!isAuthenticated) {
        toast.error(translate('loginToMessage') || 'Vui lòng đăng nhập để nhắn tin.');
        return;
      }
      if (user?.id && targetUserId === user.id) {
        toast.error('Bạn không thể tự nhắn tin cho chính mình.');
        return;
      }
      setOpen(true);
      setIsMobileRoomOpen(true);
      const requestId = ++directChatRequestRef.current;
      try {
        setLoading(true);
        const response = await chatApi.createDirectRoom(targetUserId);
        if (requestId !== directChatRequestRef.current) return;
        const room = {
          ...response,
          unreadCount: 0,
          updatedAt: response.updatedAt || new Date().toISOString(),
          participants: response.participants || [],
        } as InboxRoom;
        setSelection({ kind: 'ROOM', room });
        setRooms((prev) => dedupeRooms([room, ...prev], user?.id));
      } catch (err: unknown) {
        const errorData = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
        const rawMsg = Array.isArray(errorData?.message) ? errorData.message[0] : errorData?.message;
        let finalMsg = rawMsg;
        if (rawMsg === 'Direct room must have exactly 2 members') {
          finalMsg = 'Cuộc trò chuyện trực tiếp cần có đúng 2 thành viên.';
        }
        toast.error(finalMsg || getErrorMessage(err, translate('openConversationFailed')));
      } finally {
        if (requestId === directChatRequestRef.current) setLoading(false);
      }
    };
    window.addEventListener('sporto:open-direct-chat', handleOpenDirectChat);
    return () => window.removeEventListener('sporto:open-direct-chat', handleOpenDirectChat);
  }, [isAuthenticated, user?.id]);

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
            name: roomData.name || roomData.clubName || translate('clubChatRoom'),
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
        toast.error(getErrorMessage(err, translate('openClubChatFailed')));
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

  const activeRoomId = selection.kind === 'ROOM' ? selection.room.id : null;

  useEffect(() => {
    if (!open || !activeRoomId || !isAuthenticated) return;
    let active = true;
    const socket = socketClient.refreshChatAuthentication();
    const roomId = activeRoomId;
    socketRoomRef.current = roomId;

    const onMessage = (message: ChatMessage) => {
      if (message.roomId !== roomId || !active) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, { ...message, mine: message.senderId === user?.id }],
      );
      setRooms((prev) =>
        prev.map((r) =>
          r.id === message.roomId
            ? {
                ...r,
                lastMessage: {
                  id: message.id,
                  senderId: message.senderId,
                  senderName: message.senderName || translate('member'),
                  content: message.messageText || (message.attachmentsUrls?.length ? translate('imageAttachment') : ''),
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
              }
            : r,
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    };

    const onRevoked = (data: { roomId: string; messageId: string; revokedBy: string }) => {
      if (data.roomId !== roomId || !active) return;
      setMessages((current) =>
        current.map((m) =>
          m.id === data.messageId
            ? { ...m, isRevoked: true, messageText: null, attachmentsUrls: [] }
            : m,
        ),
      );
    };

    const onPinned = (data: { roomId: string; messageId: string; pinnedBy: string; pinnedMessage?: ChatMessage }) => {
      if (data.roomId !== roomId || !active) return;
      if (data.pinnedMessage) {
        setPinnedMessage(data.pinnedMessage);
      }
      setMessages((current) =>
        current.map((m) =>
          m.id === data.messageId ? { ...m, isPinned: true } : { ...m, isPinned: false },
        ),
      );
      toast.success(translate('newMessagePinned'));
    };

    const onUnpinned = (data: { roomId: string; messageId: string }) => {
      if (data.roomId !== roomId || !active) return;
      setPinnedMessage(null);
      setMessages((current) =>
        current.map((m) =>
          m.id === data.messageId ? { ...m, isPinned: false } : m,
        ),
      );
    };

    const onReaction = (data: { roomId: string; messageId: string; userId: string; emoji: string; reactions: string[] }) => {
      if (data.roomId !== roomId || !active) return;
      setReactions((prev) => ({
        ...prev,
        [data.messageId]: data.reactions,
      }));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    };

    const onRoomUpdated = (data: { roomId: string; room: Partial<InboxRoom> }) => {
      if (data.roomId !== roomId || !active) return;
      setSelection((curr) =>
        curr.kind === 'ROOM' && curr.room.id === data.roomId
          ? { ...curr, room: { ...curr.room, ...data.room } }
          : curr,
      );
    };

    const onTyping = (event: TypingEvent) => {
      if (event.roomId !== roomId || event.userId === user?.id) return;
      setTypingUserId(event.isTyping ? event.userId : null);
    };

    const onPollVoted = (data: { roomId: string; messageId: string; metadata: ChatMessage['metadata'] }) => {
      if (data.roomId !== roomId || !active) return;
      setMessages((current) =>
        current.map((m) => (m.id === data.messageId ? { ...m, metadata: data.metadata } : m)),
      );
    };

    const onUserStatus = (data: { userId: string; isOnline: boolean }) => {
      if (!data?.userId) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.isOnline) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    };

    const onRoomRead = (data: { roomId: string; userId: string; readAt: string }) => {
      if (!data?.roomId || !data?.userId) return;
      setRoomReadStates((prev) => ({
        ...prev,
        [data.roomId]: {
          ...(prev[data.roomId] || {}),
          [data.userId]: data.readAt,
        },
      }));
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:club:message', onMessage);
    socket.on('chat:message:revoked', onRevoked);
    socket.on('chat:message:pinned', onPinned);
    socket.on('chat:message:unpinned', onUnpinned);
    socket.on('chat:message:reaction', onReaction);
    socket.on('chat:room:updated', onRoomUpdated);
    socket.on('chat:poll:voted', onPollVoted);
    socket.on('chat:typing', onTyping);
    socket.on('chat:user:status', onUserStatus);
    socket.on('chat:room:read', onRoomRead);

    const joinRoom = () => socket.emit('joinChatRoom', roomId);
    socket.on('connect', joinRoom);
    joinRoom();

    // Query online status for room participants
    if (selectedRoom?.participants && selectedRoom.participants.length > 0) {
      const participantIds = selectedRoom.participants.map((p) => p.id).filter(Boolean);
      socket.emit('checkOnlineUsers', participantIds, (statusMap: Record<string, boolean>) => {
        if (statusMap && typeof statusMap === 'object') {
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            for (const [uid, isOnline] of Object.entries(statusMap)) {
              if (isOnline) next.add(uid);
              else next.delete(uid);
            }
            return next;
          });
        }
      });
    }

    const fetchRoomMessages = async () => {
      setLoading(true);
      setMessages([]);
      setPinnedMessage(null);
      setReplyingTo(null);
      setNextCursor(null);
      setHasMoreMessages(false);
      setTypingUserId(null);

      try {
        const page = await inboxApi.getMessages(roomId);
        if (active) {
          const fetchedMessages = unwrapMessages(page).map((message) => ({
            ...message,
            mine: message.senderId === user?.id,
          }));
          const rxMap: Record<string, string[]> = {};
          fetchedMessages.forEach((m) => {
            if (m.reactions && m.reactions.length > 0) {
              rxMap[m.id] = m.reactions;
            }
          });
          setReactions((prev) => ({ ...prev, ...rxMap }));
          setMessages(
            fetchedMessages.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            ),
          );
          setNextCursor(page.meta?.nextCursor ?? null);
          setHasMoreMessages(page.meta?.hasMore === true);
        }
      } catch (error: unknown) {
        if (active) toast.error(getErrorMessage(error, translate('loadMessagesFailed')));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchRoomMessages();

    // Fetch pinned message
    void inboxApi
      .getPinnedMessage(roomId)
      .then((res) => {
        const data = (res as unknown as { data?: { data?: ChatMessage } })?.data?.data || res.data;
        if (active && data) {
          setPinnedMessage(data as ChatMessage);
        }
      })
      .catch(() => undefined);

    void inboxApi
      .markRead(roomId)
      .catch(() => undefined);

    return () => {
      active = false;
      socket.emit('leaveChatRoom', roomId);
      socket.off('chat:message', onMessage);
      socket.off('chat:club:message', onMessage);
      socket.off('chat:message:revoked', onRevoked);
      socket.off('chat:message:pinned', onPinned);
      socket.off('chat:message:unpinned', onUnpinned);
      socket.off('chat:message:reaction', onReaction);
      socket.off('chat:room:updated', onRoomUpdated);
      socket.off('chat:poll:voted', onPollVoted);
      socket.off('chat:typing', onTyping);
      socket.off('chat:user:status', onUserStatus);
      socket.off('chat:room:read', onRoomRead);
      socket.off('connect', joinRoom);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      socketRoomRef.current = null;
    };
  }, [open, activeRoomId, isAuthenticated, user?.id]);

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
          toast.error(getErrorMessage(error, translate('loadSupportFailed')));
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
    if (!showScrollBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [
    messages.length,
    supportMessages.length,
    aiMessages.length,
    selection,
    typingUserId,
    showScrollBottom,
  ]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    // Optimistic UI update
    setReactions((prev) => {
      const current = prev[messageId] || [];
      const hasEmoji = current.includes(emoji);
      return {
        ...prev,
        [messageId]: hasEmoji
          ? current.filter((r) => r !== emoji)
          : [...current, emoji],
      };
    });

    try {
      await inboxApi.toggleReaction(messageId, emoji);
    } catch {
      // socket listener will sync
    }
  };

  const handleReply = (message: DisplayMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(translate('messageCopied'));
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = [...selectedFiles, ...files].slice(0, 5); // max 5 images
    setSelectedFiles(newFiles);
    setPreviewUrls(newFiles.map((file) => URL.createObjectURL(file)));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviewUrls(newFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleRevokeMessage = async (messageId: string) => {
    const confirmed = window.confirm(translate('revokeMessageConfirm'));
    if (!confirmed) return;
    try {
      await inboxApi.revokeMessage(messageId);
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId
            ? { ...m, isRevoked: true, messageText: null, attachmentsUrls: [] }
            : m,
        ),
      );
      toast.success(translate('messageRevoked'));
    } catch (err) {
      toast.error(getErrorMessage(err, translate('revokeMessageFailed')));
    }
  };

  const handlePinMessage = async (messageId: string) => {
    if (selection.kind !== 'ROOM') return;
    try {
      await inboxApi.pinMessage(selection.room.id, messageId);
      const targetMsg = messages.find((m) => m.id === messageId);
      if (targetMsg) setPinnedMessage(targetMsg);
      setMessages((current) =>
        current.map((m) => (m.id === messageId ? { ...m, isPinned: true } : { ...m, isPinned: false })),
      );
      toast.success(translate('chatPinSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, translate('chatPinFailed')));
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    if (selection.kind !== 'ROOM') return;
    try {
      await inboxApi.unpinMessage(selection.room.id, messageId);
      setPinnedMessage(null);
      setMessages((current) =>
        current.map((m) => (m.id === messageId ? { ...m, isPinned: false } : m)),
      );
      toast.success(translate('chatUnpinSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, translate('chatUnpinFailed')));
    }
  };

  const handleClubAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingClubAvatar(true);
      const res = await uploadApi.uploadImage(file);
      setSettingsClubAvatar(res.url);
      toast.success(translate('chatClubAvatarUploadSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, translate('chatClubAvatarUploadFailed')));
    } finally {
      setUploadingClubAvatar(false);
      if (clubAvatarInputRef.current) clubAvatarInputRef.current.value = '';
    }
  };

  const handleVotePoll = async (messageId: string, optionId: string) => {
    if (!user?.id) return;
    setMessages((current) =>
      current.map((m) => {
        if (m.id !== messageId) return m;
        const meta = (m.metadata || {}) as {
          options?: PollOption[];
          allowMultiple?: boolean;
          [key: string]: unknown;
        };
        const options = (meta.options || []).map((opt) => {
          let voterIds: string[] = opt.voterIds ?? [];
          const isVoted = voterIds.includes(user.id);
          if (opt.id === optionId) {
            voterIds = isVoted ? voterIds.filter((id) => id !== user.id) : [...voterIds, user.id];
          } else if (!meta.allowMultiple && !isVoted) {
            voterIds = voterIds.filter((id) => id !== user.id);
          }
          return { ...opt, voterIds };
        });
        return { ...m, metadata: { ...meta, options } };
      }),
    );
    try {
      await inboxApi.votePoll(messageId, optionId);
    } catch (err) {
      toast.error(getErrorMessage(err, translate('chatPollVoteFailed')));
    }
  };

  const handleCreatePoll = async () => {
    if (selection.kind !== 'ROOM') return;
    const q = pollQuestion.trim();
    if (!q) {
      toast.error(translate('chatPollQuestionRequired'));
      return;
    }
    const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (validOpts.length < 2) {
      toast.error(translate('chatPollMinOptions'));
      return;
    }

    try {
      setCreatingPoll(true);
      const formattedOptions = validOpts.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        voterIds: [],
      }));

      const pollMetadata = {
        question: q,
        options: formattedOptions,
        allowMultiple: pollAllowMultiple,
        creatorName: user?.fullName || translate('member'),
        creatorId: user?.id,
        createdAt: new Date().toISOString(),
      };

      const res = await inboxApi.sendMessage(
        selection.room.id,
        `📊 Bình chọn: ${q}`,
        [],
        undefined,
        'POLL',
        pollMetadata,
      );

      const newMsg = res.data;
      setMessages((curr) => [...curr, { ...newMsg, mine: true }]);
      setShowPollCreator(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollAllowMultiple(false);
      toast.success(translate('pollCreated'));
    } catch (err) {
      toast.error(getErrorMessage(err, translate('pollCreateFailed')));
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!otherParticipant) return;
    const isBlocked = blockedUserIds.includes(otherParticipant.id);
    const confirmed = window.confirm(
      isBlocked
        ? translate('unblockUserConfirm', { name: otherParticipant.fullName || '' })
        : translate('blockUserConfirm', { name: otherParticipant.fullName || '' }),
    );
    if (!confirmed) return;

    try {
      if (isBlocked) {
        await chatApi.unblockUser(otherParticipant.id);
        setBlockedUserIds((prev) => prev.filter((id) => id !== otherParticipant.id));
        toast.success(translate('chatUnblockSuccess'));
      } else {
        await chatApi.blockUser(otherParticipant.id);
        setBlockedUserIds((prev) => [...prev, otherParticipant.id]);
        toast.success(translate('userBlocked'));
      }
      setShowRoomMenu(false);
    } catch (err) {
      toast.error(getErrorMessage(err, translate('chatBlockFailed')));
    }
  };

  const handleClearRoomHistory = async () => {
    if (selection.kind !== 'ROOM') return;
    setClearingRoom(true);
    try {
      await inboxApi.clearRoomMessages(selection.room.id);
      setMessages([]);
      setShowClearConfirmModal(false);
      setShowRoomMenu(false);
      await refreshRooms();
      toast.success(translate('chatHistoryDeleted'));
    } catch (err) {
      toast.error(getErrorMessage(err, translate('deleteChatHistoryFailed')));
    } finally {
      setClearingRoom(false);
    }
  };

  const handleUpdateClubNotification = async (preference: 'ALL' | 'MENTIONS_ONLY' | 'MUTED') => {
    if (selection.kind !== 'ROOM' || selection.room.type !== 'CLUB' || !selection.room.communityId) return;
    try {
      await communitiesApi.updateMyNotificationPreference(selection.room.communityId, preference);
      setClubNotificationPref(preference);
      setShowRoomMenu(false);
      toast.success(
        preference === 'ALL'
          ? translate('chatNotificationAll')
          : preference === 'MENTIONS_ONLY'
          ? translate('chatNotificationMentions')
          : translate('chatNotificationMuted'),
      );
    } catch (err) {
      toast.error(getErrorMessage(err, translate('updateClubNotificationsFailed')));
    }
  };

  const sendRoomMessage = async (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if ((!text && selectedFiles.length === 0) || selection.kind !== 'ROOM' || sending) return;
    if (isOtherBlocked) {
      toast.error(translate('blockedUserCannotMessage'));
      return;
    }
    const currentReply = replyingTo;
    const filesToUpload = [...selectedFiles];

    setSending(true);
    setDraft('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    try {
      let attachmentsUrls: string[] = [];
      if (filesToUpload.length > 0) {
        setUploadingMedia(true);
        const uploadPromises = filesToUpload.map((file) => uploadApi.uploadImage(file));
        const results = await Promise.all(uploadPromises);
        attachmentsUrls = results.map((r) => r.url);
        setUploadingMedia(false);
      }

      const response = await inboxApi.sendMessage(
        selection.room.id,
        text,
        attachmentsUrls,
        currentReply?.id,
      );
      const message = response.data;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [
              ...current,
              {
                ...message,
                mine: true,
                replyTo: currentReply
                  ? {
                      id: currentReply.id,
                      senderName:
                        currentReply.senderName ||
                        (currentReply.mine ? translate('chatCurrentUser') : translate('member')),
                      text: currentReply.messageText || '',
                    }
                  : undefined,
              },
            ],
      );
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selection.room.id
            ? {
                ...r,
                lastMessage: {
                  id: message.id,
                  senderId: message.senderId,
                  senderName: message.senderName || (user?.fullName || translate('chatCurrentUser')),
                  content: message.messageText || (attachmentsUrls.length ? translate('imageAttachment') : ''),
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
              }
            : r,
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    } catch (error: unknown) {
      setDraft(text);
      setSelectedFiles(filesToUpload);
      setPreviewUrls(filesToUpload.map((file) => URL.createObjectURL(file)));
      setReplyingTo(currentReply);
      toast.error(getErrorMessage(error, translate('chatSendFailed')));
    } finally {
      setSending(false);
      setUploadingMedia(false);
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
      toast.error(getErrorMessage(error, translate('loadMoreMessagesFailed')));
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
      toast.error(getErrorMessage(error, translate('sendSupportMessageFailed')));
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
      { role: 'assistant', content: '', uiBlocks: [], toolEvents: [] },
    ];
    setAiMessages(nextMessages);
    try {
      const response = await fetch(`${getBaseUrl()}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: nextMessages.slice(0, -1).map(({ role, content }) => ({ role, content })),
          currentUrl: pathname,
          pageTitle: document.title,
          isMobile: window.matchMedia('(max-width: 640px)').matches,
          searchParams: window.location.search,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let serverMessage = '';
        try {
          const parsedBody = JSON.parse(errorBody) as { message?: string | string[]; error?: string };
          serverMessage = Array.isArray(parsedBody.message) ? parsedBody.message.join(', ') : parsedBody.message || parsedBody.error || '';
        } catch {
          serverMessage = errorBody.trim();
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          serverMessage = retryAfter
            ? `Hệ thống AI đang giới hạn lượt hỏi. Vui lòng thử lại sau khoảng ${retryAfter} giây.`
            : 'Hệ thống AI đang giới hạn lượt hỏi. Vui lòng thử lại sau một chút.';
        }
        throw new Error(serverMessage || `AI unavailable (${response.status})`);
      }
      if (!response.body) throw new Error('AI không trả về luồng dữ liệu.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      const updateAssistant = (update: Partial<AiMessage>) => {
        setAiMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, ...update } : message));
      };
      const append = (content: string) => {
        answer += content;
        updateAssistant({ content: answer });
      };
      const processPayload = (payload: string) => {
        if (payload === '[DONE]') return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          return;
        }
        if (typeof parsed !== 'object' || parsed === null) return;
        if ('error' in parsed && typeof parsed.error === 'string') throw new Error(parsed.error);
        if ('content' in parsed && typeof parsed.content === 'string') append(parsed.content);
        if ('tool' in parsed && typeof parsed.tool === 'object' && parsed.tool !== null) {
          const event = parsed.tool as AiToolEvent;
          setAiMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, toolEvents: [...(message.toolEvents || []), event] } : message));
        }
        if ('ui_blocks' in parsed && Array.isArray(parsed.ui_blocks)) {
          updateAssistant({ uiBlocks: parsed.ui_blocks as AssistantUiBlock[] });
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? '';
        chunks.forEach((chunk) => chunk.split(/\r?\n/).forEach((line) => {
          if (line.startsWith('data: ')) processPayload(line.slice(6));
        }));
      }
      if (!answer) toast.error(translate('chatAiNoReply'));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, translate('connectAiFailed'));
      toast.error(errorMessage);
      setAiMessages((current) => current.map((message, index) => {
        if (index !== current.length - 1) return message;
        return {
          ...message,
          content: `${translate('connectAiFailed')}\n\n${errorMessage}`,
        };
      }));
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
        <div
          ref={widgetRef}
          className="mb-3 flex h-[min(640px,calc(100vh-2rem))] w-[min(780px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Left Sidebar: Conversations & Channels */}
          <aside
            className={`${
              isMobileRoomOpen ? 'hidden md:flex' : 'flex'
            } w-full md:w-[240px] shrink-0 flex-col border-r border-slate-100 bg-slate-50`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
              <p className="text-sm font-bold text-slate-900">{translate('chatMessagesTitle')}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={translate('chatClose')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto p-2">
              {/* Bot AI Channel */}
              <button
                type="button"
                onClick={() => {
                  setSelection({ kind: 'AI' });
                  setIsMobileRoomOpen(true);
                }}
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
                    {translate('chatAiTitle')}
                  </strong>
                  <small className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {translate('chatAiAvailable')}

                  </small>
                </span>
                <Sparkles className="ml-auto h-3.5 w-3.5 text-blue-500 shrink-0" />
              </button>

              {/* Support Admin Channel */}
              <button
                type="button"
                onClick={() => {
                  setSelection({ kind: 'SUPPORT' });
                  setIsMobileRoomOpen(true);
                }}
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
                                        {translate('chatSupportTitle')}

                  </strong>
                  <small className="text-[10px] text-slate-500">
                                        {translate('chatSupportOnline')}

                  </small>
                </span>
              </button>

              <div className="my-2 border-t border-slate-200/60 px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {translate('chatRoomsTitle')}

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
                    onClick={() => {
                      setSelection({ kind: 'ROOM', room });
                      setIsMobileRoomOpen(true);
                    }}
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
                          alt={roomTitle(room, roomLabels)}
                          className="h-full w-full object-cover"
                        />
                      ) : isClub ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">
                          {roomTitle(room, roomLabels).charAt(0).toUpperCase()}
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
                          {roomTitle(room, roomLabels)}
                        </strong>
                        {isClub && (
                          <span className="rounded bg-blue-200/80 px-1 py-0.2 text-[9px] font-bold text-blue-800 shrink-0">
                            CLB
                          </span>
                        )}
                      </div>
                      <small className="block truncate text-[10px] text-slate-500 mt-0.5">
                        {room.lastMessage?.content || (room.lastMessage ? translate('imageAttachment') : translate('noMessages'))}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Main Chat Frame */}
          <section
            className={`${
              !isMobileRoomOpen ? 'hidden md:flex' : 'flex'
            } min-w-0 flex-1 flex-col bg-white relative`}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-5 py-3.5 shadow-xs">
              <div
                onClick={() => {
                  if (selection.kind === 'ROOM') {
                    setSettingsClubAvatar(selection.room.clubAvatar || selection.room.communityLogo || '');
                    setShowClubSettings(true);
                  }
                }}
                className={`flex items-center gap-2.5 min-w-0 ${
                  selection.kind === 'ROOM' ? 'cursor-pointer hover:opacity-85' : ''
                }`}
                title={selection.kind === 'ROOM' ? translate('chatChangeRoomSettings') : undefined}
              >
                <button
                  type="button"
                  className="md:hidden p-1 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileRoomOpen(false);
                  }}
                  title={translate('chatBackToMessages')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden bg-blue-50 text-blue-600 shadow-xs border border-slate-100">
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selectedTitle}
                    </p>
                    {selection.kind === 'ROOM' && selection.room.type === 'CLUB' && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                        CLB
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    {selection.kind === 'AI' ? (
                      translate('chatAi24x7')
                    ) : typingUserId ? (
                      <span className="text-blue-600 font-medium animate-pulse">
                                                {translate('chatTyping')}

                      </span>
                    ) : isOtherBlocked ? (
                      <span className="text-rose-500 font-semibold">{translate('chatBlocked')}</span>
                    ) : selectedRoom?.type === 'CLUB' ? (
                      <span className="text-slate-500 font-normal">
                                                {translate('chatCommunityChannel')}

                      </span>
                    ) : selectedRoom?.participants?.some((p) => p.id !== user?.id && onlineUserIds.has(p.id)) ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
                                                {translate('chatOnline')}

                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-400 font-normal">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                {translate('chatOffline')}

                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1">
                {/* Search Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearching((prev) => !prev);
                    if (isSearching) {
                      setSearchQuery('');
                    } else {
                      window.setTimeout(() => searchInputRef.current?.focus(), 100);
                    }
                  }}
                  title={translate('chatSearch')}
                  className={`p-1.5 rounded-lg transition ${
                    isSearching
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Room Options & 3-dots Menu for All Rooms */}
                {selection.kind === 'ROOM' && (
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowRoomMenu((prev) => !prev)}
                      aria-label={translate('chatOptions')}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showRoomMenu && (
                      <div className="absolute right-0 top-8 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in text-xs">
                        {/* Club Notification Preference Selector */}
                        {selection.room.type === 'CLUB' && selection.room.communityId && (
                          <div className="mb-1 pb-1 border-b border-slate-100">
                            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            {translate('chatClubNotifications')}

                            </p>
                            <button
                              type="button"
                              onClick={() => void handleUpdateClubNotification('ALL')}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 transition ${
                                clubNotificationPref === 'ALL'
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Bell className="w-3.5 h-3.5 text-blue-600" />
                                <span>{translate('chatAllMessages')}</span>
                              </div>
                              {clubNotificationPref === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateClubNotification('MENTIONS_ONLY')}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 transition ${
                                clubNotificationPref === 'MENTIONS_ONLY'
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <AtSign className="w-3.5 h-3.5 text-amber-600" />
                                <span>{translate('chatMentionsOnly')}</span>
                              </div>
                              {clubNotificationPref === 'MENTIONS_ONLY' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateClubNotification('MUTED')}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 transition ${
                                clubNotificationPref === 'MUTED'
                                  ? 'bg-rose-50 text-rose-700 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <BellOff className="w-3.5 h-3.5 text-slate-400" />
                                <span>{translate('chatMuteNotifications')}</span>
                              </div>
                              {clubNotificationPref === 'MUTED' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                            </button>
                          </div>
                        )}

                        {/* Club chat room settings */}
                        {selection.room.type === 'CLUB' && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowRoomMenu(false);
                              setSettingsClubAvatar(selection.room.clubAvatar || selection.room.communityLogo || '');
                              setShowClubSettings(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Settings className="w-4 h-4 text-slate-500" />
                            <span>{translate('chatClubSettings')}</span>
                          </button>
                        )}

                        {/* Clear conversation button */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowRoomMenu(false);
                            setShowClearConfirmModal(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                          <span>{translate('deleteChat')}</span>
                        </button>

                        {/* Block/Unblock for direct chat */}
                        {selection.room.type !== 'CLUB' && otherParticipant && (
                          <button
                            type="button"
                            onClick={handleToggleBlock}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-semibold text-rose-600 hover:bg-rose-50 transition border-t border-slate-100 mt-1 pt-2"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            <span>
                              {isOtherBlocked
                                                                ? translate('chatUnblock')
                                : translate('chatBlock')}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </header>

            {/* Search Bar Strip */}
            {isSearching && (
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-2 text-xs shadow-inner animate-in slide-in-from-top-1 duration-150">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveSearchMatchIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (e.shiftKey) {
                        handlePrevSearchMatch();
                      } else {
                        handleNextSearchMatch();
                      }
                    } else if (e.key === 'Escape') {
                      setIsSearching(false);
                      setSearchQuery('');
                    }
                  }}
                  placeholder={translate('chatSearchPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  autoFocus
                />
                {searchQuery.trim() && (
                  <span className="shrink-0 text-[11px] font-medium text-slate-500">
                    {searchMatches.length > 0
                      ? `${activeSearchMatchIndex + 1}/${searchMatches.length}`
                      : translate('chatSearchNoResults')}
                  </span>
                )}
                {searchMatches.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrevSearchMatch}
                      title={translate('chatPrevResult')}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSearchMatch}
                      title={translate('chatNextResult')}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                  title={translate('chatCloseSearch')}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Pinned Message Sticky Banner */}
            {selection.kind === 'ROOM' && pinnedMessage && (
              <div className="flex items-center justify-between border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-xs shadow-2xs animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`msg-${pinnedMessage.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-amber-400');
                      window.setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2000);
                    }
                  }}
                  className="flex items-center gap-2 min-w-0 text-left group/pin flex-1"
                >
                  <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0 group-hover/pin:scale-110 transition" />
                  <span className="font-bold text-amber-900 shrink-0">{translate('chatPinned')}</span>
                  <span className="font-semibold text-amber-800 truncate max-w-[120px]">
                    {pinnedMessage.senderName || translate('member')}:
                  </span>
                  <span className="text-amber-900/80 truncate flex-1">
                    {pinnedMessage.messageText || (pinnedMessage.attachmentsUrls?.length ? translate('imageAttachment') : '')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleUnpinMessage(pinnedMessage.id)}
                  title={translate('chatUnpin')}
                  className="p-1 text-amber-600 hover:text-amber-800 rounded-md hover:bg-amber-200/60 transition ml-2 shrink-0"
                >
                  <PinOff className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Chat Body & Timeline */}
            <div
              ref={scrollContainerRef}
              onScroll={handleTimelineScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/60 p-4 space-y-3 relative"
            >
              {selection.kind === 'AI' ? (
                <>
                  {aiMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      id={`msg-ai-${index}`}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      } transition-all duration-300 rounded-2xl`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="whitespace-pre-wrap break-words">
                            {renderHighlightedText(message.content, searchQuery)}
                          </p>
                        ) : (
                          <>
                            {message.toolEvents?.length ? (
                              <div className="mb-2 space-y-1 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500">
                                {message.toolEvents.filter((event) => event.type === 'tool_start').map((event, eventIndex) => (
                                  <div key={`${event.tool}-${eventIndex}`} className="flex items-center gap-1.5">
                                    {sending && eventIndex === message.toolEvents!.filter((item) => item.type === 'tool_start').length - 1 ? <Loader2 className="h-3 w-3 animate-spin text-blue-500" /> : <CheckSquare className="h-3 w-3 text-emerald-500" />}
                                    <span>{event.label}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <div className="prose prose-sm max-w-none text-slate-800 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content || translate('thinkingReply')}
                              </ReactMarkdown>
                            </div>
                            <AssistantCardRenderer blocks={message.uiBlocks || []} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {aiMessages.length === 1 && !sending && (
                    <div className="mt-6 space-y-2 max-w-sm mx-auto">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                                                {translate('chatQuickQuestions')}

                      </p>
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setDraft(prompt);
                          }}
                          className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 shadow-xs hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 transition"
                        >
                          {prompt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: 'SUPPORT' })}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-center text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-xs"
                      >
                        <Headset className="h-4 w-4 text-amber-600" />
                                                {translate('chatContactAdmins')}

                      </button>
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs">{translate('chatLoadingMessages')}</span>
                </div>
              ) : selection.kind === 'SUPPORT' ? (
                supportMessages.map((message) => (
                  <div
                    key={message.id}
                    id={`msg-${message.id}`}
                    className={`flex ${
                      message.senderId === user?.id
                        ? 'justify-end'
                        : 'justify-start'
                    } transition-all duration-300 rounded-2xl`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                        message.senderId === user?.id
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {renderHighlightedText(message.messageText || '', searchQuery)}
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
                      className="mx-auto mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:opacity-50"
                    >
                      {loadingOlder && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      )}
                                            {translate('chatLoadOlder')}

                    </button>
                  )}
                  {(() => {
                    const currentRoomId = selection.kind === 'ROOM' ? selection.room.id : null;
                    const roomMessages = currentRoomId
                      ? messages.filter((m) => m.roomId === currentRoomId)
                      : messages;

                    if (roomMessages.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-400">
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                            <MessageCircle className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700">
                                                        {translate('chatNoMessagesTitle')}

                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                                                        {translate('chatNoMessagesDescription')}

                          </p>
                        </div>
                      );
                    }

                    return roomMessages.map((message, index) => {
                      const prevMsg = roomMessages[index - 1];
                      const nextMsg = roomMessages[index + 1];
                      const isNewDay =
                        !prevMsg ||
                        new Date(message.createdAt).toDateString() !==
                          new Date(prevMsg.createdAt).toDateString();

                      const isSameSenderAsPrev =
                        prevMsg &&
                        prevMsg.senderId === message.senderId &&
                        !isNewDay &&
                        Math.abs(
                          new Date(message.createdAt).getTime() -
                            new Date(prevMsg.createdAt).getTime(),
                        ) < 120000;

                      const isSameSenderAsNext =
                        nextMsg &&
                        nextMsg.senderId === message.senderId &&
                        new Date(message.createdAt).toDateString() ===
                          new Date(nextMsg.createdAt).toDateString() &&
                        Math.abs(
                          new Date(nextMsg.createdAt).getTime() -
                            new Date(message.createdAt).getTime(),
                        ) < 120000;

                      const msgReactions = reactions[message.id] || message.reactions || [];

                      const senderAvatar =
                        message.senderAvatarUrl ||
                        (message as unknown as { senderAvatar?: string })?.senderAvatar ||
                        null;

                      const senderName =
                        message.senderName ||
                        (message.mine ? user?.fullName || translate('you') : translate('member'));

                      const isClubChat =
                        selection.kind === 'ROOM' && selection.room.type === 'CLUB';

                      return (
                        <div
                          key={message.id}
                          id={`msg-${message.id}`}
                          className={`${isSameSenderAsPrev ? 'mt-1' : 'mt-3.5'} transition-all duration-300 rounded-2xl`}
                        >
                          {/* Timeline Date Separator */}
                          {isNewDay && (
                            <div className="flex items-center justify-center my-3">
                              <span className="rounded-full bg-slate-200/80 px-3 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider shadow-2xs">
                                {formatDateSeparator(message.createdAt, locale, { today: translate('today'), yesterday: translate('yesterday') })}
                              </span>
                            </div>
                          )}

                          {/* Message Row */}
                          <div
                            className={`group/msg relative flex items-end gap-2 ${
                              message.mine ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {/* Avatar on other person's message (shows on bottom of cluster) */}
                            {!message.mine && (
                              <div className="w-8 shrink-0 flex items-end">
                                {!isSameSenderAsNext ? (
                                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs border border-white">
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
                                ) : (
                                  <div className="w-7 h-7" />
                                )}
                              </div>
                            )}

                            <div
                              className={`flex flex-col ${
                                message.mine ? 'items-end' : 'items-start'
                              } max-w-[78%]`}
                            >
                              {/* Sender Name & Badge (only on start of cluster for others) */}
                              {!message.mine && !isSameSenderAsPrev && (() => {
                                const memberMeta = clubMembersMap[message.senderId];
                                const memberTags = memberMeta?.tags || [];
                                const memberRole = memberMeta?.role;

                                return (
                                  <div className="flex items-center flex-wrap gap-1 mb-1 px-1">
                                    <span className="text-[11px] font-bold text-slate-800">
                                      {senderName}
                                    </span>
                                    {isClubChat && (
                                      <>
                                        {/* Show owner/moderator role when available */}
                                        {memberRole === 'OWNER' && (
                                          <span className="rounded-md bg-amber-100 border border-amber-200/80 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 shadow-2xs">
                                            {translate('communityOwner')}
                                          </span>
                                        )}
                                        {memberRole === 'MODERATOR' && (
                                          <span className="rounded-md bg-blue-100 border border-blue-200/80 px-1.5 py-0.2 text-[9px] font-bold text-blue-900 shadow-2xs">
                                            {translate('communityModerator')}
                                          </span>
                                        )}

                                        {/* Show member title tag when available */}
                                        {memberTags.map((tag) => {
                                          const preset = clubTagPresets.find((p) => p.name.toLowerCase() === tag.toLowerCase());
                                          return (
                                            <span
                                              key={tag}
                                              className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-bold shadow-2xs border"
                                              style={
                                                preset
                                                  ? {
                                                      backgroundColor: preset.color,
                                                      borderColor: `${preset.color}99`,
                                                      color: '#0f172a',
                                                    }
                                                  : {
                                                      backgroundColor: '#f1f5f9',
                                                      borderColor: '#cbd5e1',
                                                      color: '#1e293b',
                                                    }
                                              }
                                            >
                                              {getPresetLabel(tag)}
                                            </span>
                                          );
                                        })}
                                      </>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Message Bubble + Floating Action Bar Container */}
                              <div className="relative group/bubble flex items-center gap-1.5 pt-1">
                                {/* Desktop Hover Action Bar attached seamlessly without disappearing */}
                                {!message.isRevoked && (
                                  <div
                                    className={`absolute -top-9 ${
                                      message.mine ? 'right-0' : 'left-0'
                                    } z-30 hidden group-hover/msg:flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-100 before:absolute before:inset-x-0 before:-bottom-4 before:h-5 before:content-['']`}
                                  >
                                    {QUICK_REACTIONS.map((emoji) => {
                                      const isSelected = msgReactions.includes(emoji);
                                      return (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void toggleReaction(message.id, emoji);
                                          }}
                                          className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform hover:scale-135 active:scale-95 ${
                                            isSelected ? 'bg-blue-100 scale-110' : 'hover:bg-slate-100'
                                          }`}
                                          title={`+${emoji}`}
                                        >
                                          {emoji}
                                        </button>
                                      );
                                    })}
                                    <div className="h-4 w-px bg-slate-200 mx-0.5" />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReply(message);
                                      }}
                                      title={translate('chatReply')}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                                    >
                                      <Reply className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(message.messageText || '', message.id);
                                      }}
                                      title={translate('chatCopy')}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                                    >
                                      {copiedId === message.id ? (
                                        <Check className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handlePinMessage(message.id);
                                      }}
                                      title={translate('chatPin')}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition"
                                    >
                                      <Pin className="h-4 w-4" />
                                    </button>
                                    {(message.mine || isClubChat) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleRevokeMessage(message.id);
                                        }}
                                        title={translate('chatRevoke')}
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Bubble Box */}
                                <div
                                  className={`relative transition cursor-pointer select-text ${
                                    message.isRevoked
                                      ? 'px-3.5 py-2 text-sm leading-relaxed bg-slate-100/90 text-slate-400 italic border border-slate-200 rounded-2xl shadow-2xs'
                                      : !message.messageText && message.attachmentsUrls && message.attachmentsUrls.length > 0
                                        ? 'bg-transparent p-0 border-0 shadow-none'
                                        : message.mine
                                          ? 'px-3.5 py-2 text-sm leading-relaxed bg-blue-600 text-white rounded-2xl rounded-br-xs shadow-2xs'
                                          : 'px-3.5 py-2 text-sm leading-relaxed bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-bl-xs shadow-2xs'
                                  }`}
                                >
                                  {message.isRevoked ? (
                                    <p className="flex items-center gap-1 text-xs text-slate-500 italic">
                                      <Ban className="h-3.5 w-3.5 text-slate-400" />
                                      {translate('chatRevoked')}
                                    </p>
                                  ) : !message.messageText && message.attachmentsUrls && message.attachmentsUrls.length > 0 ? (
                                    /* Clean Borderless Image-Only View (Messenger Standard) */
                                    <div className="relative group/img-only">
                                      {message.replyTo && (
                                         <div
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             const targetId = message.replyToId || (message.replyTo as unknown as { id?: string })?.id;
                                             if (targetId) {
                                               const el = document.getElementById(`msg-${targetId}`);
                                               if (el) {
                                                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                 el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/80', 'transition-all');
                                                 window.setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/80'), 2200);
                                               }
                                             }
                                           }}
                                           className={`mb-1.5 rounded-lg px-2.5 py-1 text-xs border-l-2 cursor-pointer hover:opacity-90 active:scale-[0.99] transition ${
                                             message.mine
                                               ? 'bg-blue-700/60 border-white/70 text-blue-100'
                                               : 'bg-slate-100 border-blue-500 text-slate-600'
                                           }`}
                                           title={translate('chatJumpToMessage')}
                                         >
                                           <p className="font-bold text-[11px] truncate">
                                             {message.replyTo.senderName}
                                           </p>
                                           <p className="line-clamp-1 italic text-[11px] opacity-90">
                                             {message.replyTo.text}
                                           </p>
                                         </div>
                                       )}

                                       <div
                                         className={`grid gap-1.5 rounded-2xl overflow-hidden ${
                                           message.attachmentsUrls.length === 1
                                             ? 'grid-cols-1 max-w-[280px] sm:max-w-[320px]'
                                             : message.attachmentsUrls.length === 2
                                               ? 'grid-cols-2 max-w-[280px]'
                                               : 'grid-cols-3 max-w-[320px]'
                                         }`}
                                       >
                                         {message.attachmentsUrls.map((url, imgIdx) => (
                                           <div
                                             key={`${url}-${imgIdx}`}
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setLightboxUrl(url);
                                             }}
                                             className="group/img relative cursor-pointer overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/50 shadow-sm"
                                           >
                                             <img
                                               src={url}
                                               alt={translate('chatAttachmentAlt')}
                                               className="h-auto max-h-[320px] w-full object-cover transition duration-200 group-hover/img:scale-103"
                                             />
                                             <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                                               <ZoomIn className="h-5 w-5 text-white" />
                                             </div>
                                           </div>
                                         ))}
                                       </div>

                                       <span className="absolute bottom-2 right-2 rounded-full bg-black/55 backdrop-blur-xs px-2 py-0.5 text-[9px] text-white font-medium shadow">
                                         {new Date(message.createdAt).toLocaleTimeString(locale, {
                                           hour: '2-digit',
                                           minute: '2-digit',
                                         })}
                                       </span>
                                     </div>
                                   ) : (
                                     <>
                                       {/* Quoted Reply Preview inside bubble */}
                                       {message.replyTo && (
                                         <div
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             const targetId = message.replyToId || (message.replyTo as unknown as { id?: string })?.id;
                                             if (targetId) {
                                               const el = document.getElementById(`msg-${targetId}`);
                                               if (el) {
                                                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                 el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/80', 'transition-all');
                                                 window.setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/80'), 2200);
                                               }
                                             }
                                           }}
                                           className={`mb-1.5 rounded-lg px-2.5 py-1 text-xs border-l-2 cursor-pointer hover:opacity-90 active:scale-[0.99] transition ${
                                             message.mine
                                               ? 'bg-blue-700/60 border-white/70 text-blue-100'
                                               : 'bg-slate-100 border-blue-500 text-slate-600'
                                           }`}
                                           title={translate('chatJumpToMessage')}
                                         >
                                           <p className="font-bold text-[11px] truncate">
                                             {message.replyTo.senderName}
                                           </p>
                                           <p className="line-clamp-1 italic text-[11px] opacity-90">
                                             {message.replyTo.text}
                                           </p>
                                         </div>
                                       )}

                                      {/* Attached Images Grid */}
                                      {message.attachmentsUrls && message.attachmentsUrls.length > 0 && (
                                        <div
                                          className={`mb-2 grid gap-1.5 rounded-xl overflow-hidden ${
                                            message.attachmentsUrls.length === 1
                                              ? 'grid-cols-1 max-w-[260px]'
                                              : message.attachmentsUrls.length === 2
                                                ? 'grid-cols-2 max-w-[280px]'
                                                : 'grid-cols-3 max-w-[320px]'
                                          }`}
                                        >
                                          {message.attachmentsUrls.map((url, imgIdx) => (
                                            <div
                                              key={`${url}-${imgIdx}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxUrl(url);
                                              }}
                                              className="group/img relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-slate-100 border border-slate-200/40"
                                            >
                                              <img
                                                src={url}
                                                alt={translate('chatAttachmentAlt')}
                                                className="h-full w-full object-cover transition duration-200 group-hover/img:scale-105"
                                              />
                                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                                                <ZoomIn className="h-4 w-4 text-white" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Interactive Poll Message Card */}
                                      {message.type === 'POLL' && message.metadata && (
                                        <div className="min-w-[240px] max-w-[320px] py-1 text-slate-800">
                                          <div className={`flex items-center gap-1.5 font-bold text-sm mb-2.5 ${message.mine ? 'text-white' : 'text-slate-900'}`}>
                                            <BarChart2 className="h-4 w-4 text-blue-400 shrink-0" />
                                            <span>{message.metadata.question}</span>
                                          </div>
                                          <div className="space-y-2">
                                            {(() => {
                                              const options = (message.metadata.options || []) as Array<{ id: string; text: string; voterIds: string[] }>;
                                              const totalVotes = options.reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);
                                              return options.map((opt) => {
                                                const count = opt.voterIds?.length || 0;
                                                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                                const isUserVoted = Boolean(user?.id && (opt.voterIds || []).includes(user.id));
                                                return (
                                                  <div
                                                    key={opt.id}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      void handleVotePoll(message.id, opt.id);
                                                    }}
                                                    className={`relative overflow-hidden rounded-xl border p-2.5 cursor-pointer transition active:scale-[0.98] ${
                                                      message.mine
                                                        ? isUserVoted
                                                          ? 'border-white/60 bg-blue-700/80 text-white font-bold shadow-xs'
                                                          : 'border-blue-500/50 bg-blue-700/40 text-blue-50 hover:bg-blue-700/60'
                                                        : isUserVoted
                                                          ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                                                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100/80'
                                                    }`}
                                                  >
                                                    {/* Progress bar fill background */}
                                                    <div
                                                      className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                                                        message.mine
                                                          ? isUserVoted ? 'bg-white/25' : 'bg-white/10'
                                                          : isUserVoted ? 'bg-blue-200/50' : 'bg-slate-200/50'
                                                      }`}
                                                      style={{ width: `${pct}%` }}
                                                    />
                                                    <div className="relative flex items-center justify-between z-10 text-xs">
                                                      <div className="flex items-center gap-2 min-w-0">
                                                        {isUserVoted ? (
                                                          <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                                                        ) : (
                                                          <Square className={`h-4 w-4 shrink-0 ${message.mine ? 'text-blue-200' : 'text-slate-400'}`} />
                                                        )}
                                                        <span className="truncate">{opt.text}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1 shrink-0 font-semibold text-[11px]">
                                                        <span>{pct}%</span>
                                                        <span className={`text-[10px] ${message.mine ? 'text-blue-200' : 'text-slate-400'}`}>({count})</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              });
                                            })()}
                                          </div>
                                          <div className={`mt-2.5 flex items-center justify-between text-[10px] font-medium pt-1.5 border-t ${message.mine ? 'border-white/20 text-blue-200' : 'border-slate-100 text-slate-400'}`}>
                                            <span>
                                              {(message.metadata.options || []).reduce((s: number, o: { voterIds?: string[] }) => s + (o.voterIds?.length || 0), 0                                          )} {translate('chatVotes')}
                                            </span>
                                            <span>{message.metadata.allowMultiple ? translate('chatPollMultiple') : translate('chatPollSingle')}</span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tournament Share Rich Card */}
                                      {message.type === 'TOURNAMENT_SHARE' && message.metadata && (
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (message.metadata?.tournamentId) {
                                              window.open(`/tournaments/${message.metadata.tournamentId}`, '_blank');
                                            }
                                          }}
                                          className="min-w-[240px] max-w-[320px] rounded-xl overflow-hidden bg-white text-slate-800 shadow-md border border-slate-200 cursor-pointer group hover:shadow-lg transition my-1"
                                        >
                                          {message.metadata.bannerUrl ? (
                                            <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                                              <img
                                                src={message.metadata.bannerUrl}
                                                alt={message.metadata.title}
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                              />
                                              {message.metadata.sportType && (
                                                <span className="absolute top-2 left-2 rounded-full bg-blue-600/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white shadow">
                                                  {message.metadata.sportType}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 text-white">
                                              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                                                {message.metadata.sportType || translate('chatTournamentDefaultSport')}
                                              </span>
                                            </div>
                                          )}
                                          <div className="p-3">
                                            <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition">
                                              {message.metadata.title || message.messageText || translate('chatTournamentTitleFallback')}
                                            </h4>
                                            <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                              {message.metadata.totalTeams && (
                                                <div className="flex items-center gap-1.5">
                                                  <Users className="h-3.5 w-3.5 text-blue-600" />
                                                  <span>
                                                    {translate('chatTournamentScale', { registered: message.metadata.registeredTeams || 0, total: message.metadata.totalTeams })}
                                                  </span>
                                                </div>
                                              )}
                                              {message.metadata.startDate && (
                                                <div className="flex items-center gap-1.5">
                                                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                                                  <span>{translate('chatTournamentStarts', { date: new Date(message.metadata.startDate).toLocaleDateString(locale) })}</span>
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs active:scale-95"
                                            >
                                              <span>{translate('chatTournamentViewRegister')}</span>
                                              <ExternalLink className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Standard Text Message */}
                                      {message.type !== 'POLL' && message.type !== 'TOURNAMENT_SHARE' && message.messageText && (
                                        <p className="whitespace-pre-wrap break-words">
                                          {renderHighlightedText(message.messageText, searchQuery)}
                                        </p>
                                      )}

                                      <time
                                        className={`mt-0.5 block text-[10px] ${
                                          message.mine && !message.isRevoked
                                            ? 'text-blue-100/80 text-right'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {new Date(message.createdAt).toLocaleTimeString(locale, {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </time>
                                    </>
                                  )}
                                </div>

                                {/* Reaction Badges Pill (Messenger Style) */}
                                {!message.isRevoked && msgReactions.length > 0 && (() => {
                                  const reactionCounts = msgReactions.reduce<Record<string, number>>((acc, emoji) => {
                                    acc[emoji] = (acc[emoji] || 0) + 1;
                                    return acc;
                                  }, {});
                                  const reactionSummary = Object.entries(reactionCounts)
                                    .map(([emoji, count]) => `${emoji} ${count}`)
                                    .join('  ');

                                  return (
                                    <div
                                      className={`absolute -bottom-2.5 ${
                                        message.mine ? 'left-2' : 'right-2'
                                      } z-10 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-xs shadow-md border border-slate-200 cursor-pointer hover:scale-105 active:scale-95 transition`}
                                      onClick={() => void toggleReaction(message.id, msgReactions[0])}
                                      title={translate('chatReactionTooltip', { count: msgReactions.length, summary: reactionSummary })}
                                    >
                                      {Object.keys(reactionCounts).map((emoji) => (
                                        <span key={emoji} className="text-xs leading-none">
                                          {emoji}
                                        </span>
                                      ))}
                                      {msgReactions.length > 1 && (
                                        <span className="text-[10px] font-bold text-slate-600 ml-0.5">
                                          {msgReactions.length}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Real Read receipts / Seen indicator */}
                              {index === roomMessages.length - 1 && message.mine && (() => {
                                const otherParticipant = selectedRoom?.participants?.find((p) => p.id !== user?.id);
                                const otherLastRead = selectedRoom ? (roomReadStates[selectedRoom.id]?.[otherParticipant?.id || ''] || otherParticipant?.lastReadAt) : null;
                                const isSeen = otherLastRead ? new Date(otherLastRead).getTime() >= new Date(message.createdAt).getTime() : false;

                                if (isSeen && otherParticipant?.avatarUrl) {
                                  return (
                                    <div className="mt-1 flex items-center justify-end gap-1 px-1" title={translate('seenBy', { name: otherParticipant.fullName || '' })}>
                                      <span className="text-[9px] text-slate-400 font-medium">{translate('seen')}</span>
                                      <img
                                        src={otherParticipant.avatarUrl}
                                        alt={otherParticipant.fullName || translate('seen')}
                                        className="h-3.5 w-3.5 rounded-full object-cover border border-white shadow-2xs"
                                      />
                                    </div>
                                  );
                                }

                                return (
                                  <div className="mt-1 flex items-center justify-end gap-1 px-1">
                                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-slate-400">
                                      <Check className="h-3 w-3 text-blue-500" />
                                                                            {translate('chatSent')}

                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              )}
              <div ref={endRef} />

              {/* Floating Messenger-like Scroll-To-Bottom Button */}
              {showScrollBottom && (
                <button
                  type="button"
                  onClick={() => {
                    endRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setShowScrollBottom(false);
                    setUnreadSinceScrolledUp(0);
                  }}
                  aria-label={translate('scrollToNewest')}
                  className="sticky bottom-2 ml-auto mr-2 z-30 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xl border border-slate-200/90 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 hover:scale-105 active:scale-95 group"
                >
                  <ChevronDown className="h-4 w-4 text-blue-600 group-hover:translate-y-0.5 transition-transform" />
                  <span>{translate('newestMessages')}</span>
                  {unreadSinceScrolledUp > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-2xs">
                      {unreadSinceScrolledUp > 99 ? '99+' : unreadSinceScrolledUp}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Replying Banner */}
            {replyingTo && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-blue-50/70 px-4 py-2 text-xs animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerDownRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-slate-500 shrink-0 font-medium">{translate('chatReplying')}</span>
                  <span className="font-bold text-blue-900 truncate">
                    {replyingTo.senderName || (replyingTo.mine ? translate('you') : translate('member'))}:
                  </span>
                  <span className="italic text-slate-600 truncate max-w-[280px]">
                    &ldquo;{replyingTo.messageText || (replyingTo.attachmentsUrls?.length ? `🖼️ ${translate('chatImage')}` : '')}&rdquo;
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition ml-2 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Selected Images Preview Strip */}
            {previewUrls.length > 0 && (
              <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-2 overflow-x-auto">
                {previewUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group"
                  >
                    <img src={url} alt={translate('chatImage')} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {uploadingMedia && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{translate('chatUploadingImage')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Emoji Palette Picker Popup */}
            {showEmojiPicker && (
              <div className="relative">
                <div className="absolute bottom-full left-4 mb-2 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700">{translate('chatEmojiPicker')}</span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJI_PICKER_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setDraft((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-slate-100 active:scale-125 transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messenger Input Bar */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (draft.trim() || selectedFiles.length > 0) {
                  send();
                } else if (selection.kind === 'ROOM') {
                  void sendRoomMessage('👍');
                }
              }}
              className="relative flex items-center gap-1.5 border-t border-slate-200 bg-white p-3 shadow-inner"
            >
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Photo Upload Trigger Button */}
              {selection.kind === 'ROOM' && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={translate('sendImage')}
                    disabled={isOtherBlocked || sending}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition disabled:opacity-40"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPollCreator(true)}
                    title={translate('createPoll')}
                    disabled={isOtherBlocked || sending}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition disabled:opacity-40"
                  >
                    <BarChart2 className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-2 rounded-full transition ${
                  showEmojiPicker
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title={translate('chooseEmoji')}
              >
                <Smile className="h-5 w-5" />
              </button>

              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                placeholder={
                  isOtherBlocked
                    ? translate('chatBlockedPlaceholder')
                    : selection.kind === 'AI'
                      ? translate('chatAskAssistantPlaceholder')
                      : replyingTo
                        ? translate('chatReplyPlaceholder', { name: replyingTo.senderName || translate('member') })
                        : translate('enterMessage')
                }
                disabled={isOtherBlocked}
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50/70 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
              />

              {/* Quick Send Button / Messenger Thumbs Up or Heart */}
              {draft.trim() || selectedFiles.length > 0 ? (
                <button
                  type="submit"
                  disabled={sending || isOtherBlocked}
                  aria-label={translate('sendMessage')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              ) : selection.kind === 'ROOM' ? (
                <button
                  type="button"
                  onClick={() => void sendRoomMessage('👍')}
                  disabled={sending || isOtherBlocked}
                  aria-label={translate('quickLike')}
                  title={translate('quickLike')}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 transition active:scale-125 shrink-0"
                >
                  <ThumbsUp className="h-5 w-5 fill-blue-600 text-blue-600" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={true}
                  aria-label={translate('sendMessage')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-400 transition shrink-0 cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Club Chat Settings Modal */}
            {showClubSettings && selection.kind === 'ROOM' && selection.room.type === 'CLUB' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
                <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-600" />
                      {translate('chatClubSettingsTitle')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowClubSettings(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Cloudinary Club Logo Uploader */}
                    <div className="flex flex-col items-center justify-center gap-2 py-1">
                      <input
                        ref={clubAvatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleClubAvatarUpload}
                        className="hidden"
                      />
                      <div
                        onClick={() => !uploadingClubAvatar && clubAvatarInputRef.current?.click()}
                        className="relative group h-20 w-20 rounded-full border-2 border-blue-500 overflow-hidden shadow-md cursor-pointer bg-slate-100 flex items-center justify-center transition hover:ring-4 hover:ring-blue-100"
                        title={translate('chatUploadClubLogoTitle')}
                      >
                        {settingsClubAvatar ? (
                          <img
                            src={settingsClubAvatar}
                            alt="Club Logo"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <MessageCircle className="h-8 w-8 text-slate-400" />
                        )}

                        {/* Overlay with Camera Icon */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-200">
                          <Camera className="h-5 w-5 mb-0.5" />
                          <span className="text-[9px] font-bold">{translate('chatChangeLogo')}</span>
                        </div>

                        {uploadingClubAvatar && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                            <Loader2 className="h-5 w-5 animate-spin text-white mb-0.5" />
                            <span className="text-[9px] font-medium">{translate('chatUploading')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => !uploadingClubAvatar && clubAvatarInputRef.current?.click()}
                          disabled={uploadingClubAvatar}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition"
                        >
                          {uploadingClubAvatar ? `${translate('chatUploading')} Cloudinary...` : translate('chatUploadClubLogo')}
                        </button>
                        {settingsClubAvatar && (
                          <button
                            type="button"
                            onClick={() => setSettingsClubAvatar('')}
                            className="text-[11px] font-medium text-rose-500 hover:text-rose-600 transition"
                          >
                            {translate('chatDeleteLogo')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {translate('chatRoomName')}
                      </label>
                      <input
                        type="text"
                        defaultValue={selection.room.name || selection.room.clubName || ''}
                        id="club-settings-name"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder={translate('chatRoomNamePlaceholder')}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                      <div>
                        <p className="font-semibold text-slate-800">{translate('chatAdminsOnly')}</p>
                        <p className="text-[10px] text-slate-500">
                          {translate('chatMembersCanView')}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="club-settings-announcement"
                        defaultChecked={selection.room.isAnnouncementOnly || false}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {translate('chatSlowMode')}
                      </label>
                      <select
                        id="club-settings-slowmode"
                        defaultValue={selection.room.slowModeSeconds || 0}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                      >
                        <option value={0}>{translate('chatOffNormal')}</option>
                        <option value={5}>{translate('chatSeconds', { count: 5 })}</option>
                        <option value={15}>{translate('chatSeconds', { count: 15 })}</option>
                        <option value={30}>{translate('chatSeconds', { count: 30 })}</option>
                        <option value={60}>{translate('chatMinute')}</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowClubSettings(false)}
                        className="rounded-xl px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        {translate('cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const nameInput = (document.getElementById('club-settings-name') as HTMLInputElement)?.value;
                          const annInput = (document.getElementById('club-settings-announcement') as HTMLInputElement)?.checked;
                          const slowInput = Number((document.getElementById('club-settings-slowmode') as HTMLSelectElement)?.value || 0);

                          if (selection.kind === 'ROOM') {
                            try {
                              await inboxApi.updateClubRoomSettings(selection.room.id, {
                                name: nameInput,
                                clubAvatar: settingsClubAvatar || undefined,
                                isAnnouncementOnly: annInput,
                                slowModeSeconds: slowInput,
                              });
                              setSelection((curr) =>
                                curr.kind === 'ROOM'
                                  ? {
                                      ...curr,
                                      room: {
                                        ...curr.room,
                                        name: nameInput,
                                        clubAvatar: settingsClubAvatar || curr.room.clubAvatar,
                                        isAnnouncementOnly: annInput,
                                        slowModeSeconds: slowInput,
                                      },
                                    }
                                  : curr,
                              );
                              setRooms((curr) =>
                                curr.map((r) =>
                                  r.id === selection.room.id
                                    ? {
                                        ...r,
                                        name: nameInput,
                                        clubAvatar: settingsClubAvatar || r.clubAvatar,
                                        isAnnouncementOnly: annInput,
                                        slowModeSeconds: slowInput,
                                      }
                                    : r,
                                ),
                              );
                              setShowClubSettings(false);
                              toast.success(translate('chatSettingsSaved'));
                            } catch (err) {
                              toast.error(getErrorMessage(err, translate('chatSettingsUpdateFailed')));
                            }
                          }
                        }}
                        className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
                      >
                        {translate('chatSaveSettings')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Poll Creator Modal */}
            {showPollCreator && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
                <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      {translate('chatPollCreateTitle')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPollCreator(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {translate('chatPollQuestionLabel')}
                      </label>
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder={translate('chatPollQuestionPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {translate('chatPollOptionsLabel')}
                      </label>
                      <div className="space-y-2">
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...pollOptions];
                                newOpts[idx] = e.target.value;
                                setPollOptions(newOpts);
                              }}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                              placeholder={translate('chatPollOptionPlaceholder', { index: idx + 1 })}
                            />
                            {pollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {pollOptions.length < 8 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, ''])}
                          className="mt-2 flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{translate('chatAddOption')}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                      <div>
                        <p className="font-semibold text-slate-800">{translate('chatAllowMultiple')}</p>
                        <p className="text-[10px] text-slate-500">
                          {translate('chatMultipleHint')}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pollAllowMultiple}
                        onChange={(e) => setPollAllowMultiple(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowPollCreator(false)}
                        className="rounded-xl px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        {translate('cancel')}
                      </button>
                      <button
                        type="button"
                        disabled={creatingPoll}
                        onClick={handleCreatePoll}
                        className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
                      >
                        {creatingPoll ? translate('chatCreatingPoll') : translate('chatCreatePoll')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Media Lightbox Modal */}
            {lightboxUrl && (
              <div
                onClick={() => setLightboxUrl(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative max-h-[90vh] max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl bg-black/40 border border-white/10"
                >
                  <img
                    src={lightboxUrl}
                    alt={translate('chatViewImage')}
                    className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <a
                      href={lightboxUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition backdrop-blur-md"
                      title={translate('chatDownloadImage')}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition backdrop-blur-md"
                      title={translate('chatClose')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Clear Chat Confirmation Modal */}
            {showClearConfirmModal && (
              <div
                onClick={() => setShowClearConfirmModal(false)}
                className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{translate('deleteChatConfirmTitle')}</h3>
                      <p className="text-xs font-medium text-slate-600">
                        {translate('deleteChatHistoryDescription')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-700 bg-slate-100/90 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                    {translate('chatDeleteConfirmDescription')}
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirmModal(false)}
                      disabled={clearingRoom}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                                            {translate('cancel')}

                    </button>
                    <button
                      type="button"
                      onClick={handleClearRoomHistory}
                      disabled={clearingRoom}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-60"
                    >
                      {clearingRoom ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>{translate('deleting')}</span>
                        </>
                      ) : (
                        <span>{translate('deleteChat')}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? translate('closeMessages') : translate('openMessages')}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        {open ? (
          <X className="h-6 w-6 text-white transition-transform duration-200 rotate-0 hover:rotate-90" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-white" />
            {totalUnread > 0 && (
              <b className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-[10px] leading-5 text-white shadow">
                {totalUnread > 99 ? '99+' : totalUnread}
              </b>
            )}
          </>
        )}
      </button>
    </div>
  );
}
