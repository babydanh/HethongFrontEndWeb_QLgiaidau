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
  sendMessage: (roomId: string, messageText: string) =>
    api.post<ApiResponse<ChatMessage>>('/chat/messages', { roomId, messageText }),
  markRead: (roomId: string) => api.put<ApiResponse<{ success: boolean }>>(`/chat/rooms/${roomId}/read`, {}),
};
