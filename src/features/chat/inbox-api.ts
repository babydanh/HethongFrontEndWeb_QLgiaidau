import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { ChatMessage } from '@/types/community-social';

export interface InboxRoom {
  id: string;
  name: string | null;
  type: string;
  communityId: string | null;
  clubName?: string | null;
  clubAvatar?: string | null;
  communityName?: string | null;
  communityLogo?: string | null;
  isAnnouncementOnly?: boolean;
  slowModeSeconds?: number;
  pinnedMessageId?: string | null;
  unreadCount: number;
  updatedAt: string;
  participants: Array<{ id: string; fullName: string | null; avatarUrl: string | null }>;
  lastMessage?: {
    id?: string;
    content: string;
    createdAt: string;
    senderId: string | null;
    sender?: { id: string | null; fullName: string; avatarUrl?: string };
  };
}

export interface InboxMessagesPage {
  data: ChatMessage[];
  meta?: { nextCursor?: string | null; hasMore?: boolean };
}

export type InboxRoomsResponse = InboxRoom[] | { data: InboxRoom[] };

export const inboxApi = {
  getRooms: () => api.get<InboxRoomsResponse>('/chat/rooms'),
  getMessages: (roomId: string, cursor?: string) =>
    api.get<InboxMessagesPage>(`/chat/rooms/${roomId}/messages`, {
      params: { limit: 30, ...(cursor ? { cursor } : {}) },
    }),
  sendMessage: (
    roomId: string,
    messageText?: string,
    attachmentsUrls?: string[],
    replyToId?: string,
    type?: string,
    metadata?: Record<string, any>,
  ) =>
    api.post<ApiResponse<ChatMessage>>('/chat/messages', {
      roomId,
      messageText,
      attachmentsUrls,
      replyToId,
      type: type || 'TEXT',
      metadata,
    }),
  markRead: (roomId: string) =>
    api.put<ApiResponse<{ success: boolean }>>(`/chat/rooms/${roomId}/read`, {}),
  revokeMessage: (messageId: string) =>
    api.post<ApiResponse<ChatMessage>>(`/chat/messages/${messageId}/revoke`),
  pinMessage: (roomId: string, messageId: string) =>
    api.post<ApiResponse<{ success: boolean }>>(`/chat/rooms/${roomId}/messages/${messageId}/pin`),
  unpinMessage: (roomId: string, messageId: string) =>
    api.delete<ApiResponse<{ success: boolean }>>(`/chat/rooms/${roomId}/messages/${messageId}/pin`),
  getPinnedMessage: (roomId: string) =>
    api.get<ApiResponse<ChatMessage | null>>(`/chat/rooms/${roomId}/pinned`),
  toggleReaction: (messageId: string, emoji: string) =>
    api.post<ApiResponse<{ reactions: string[] }>>(`/chat/messages/${messageId}/reaction`, { emoji }),
  votePoll: (messageId: string, optionId: string) =>
    api.post<ApiResponse<{ messageId: string; roomId: string; metadata: any }>>(`/chat/messages/${messageId}/poll/vote`, { optionId }),
  getLinkPreview: (url: string) =>
    api.get<ApiResponse<{ url: string; title?: string; description?: string; image?: string; siteName?: string }>>('/chat/link-preview', {
      params: { url },
    }),
  updateClubRoomSettings: (
    roomId: string,
    data: { name?: string; clubAvatar?: string; isAnnouncementOnly?: boolean; slowModeSeconds?: number },
  ) => api.put<ApiResponse<InboxRoom>>(`/chat/rooms/${roomId}/settings`, data),
};
