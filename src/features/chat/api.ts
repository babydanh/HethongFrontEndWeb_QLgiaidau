import { api } from '@/lib/axios';

import { ChatMessage, ChatConversation } from '@/types/chat';
import type { ApiResponse } from '@/types/api';
import type { ChatRoom, ChatMessage as CommunityChatMessage } from '@/types/community-social';
export type { ChatMessage, ChatConversation };

export const chatApi = {
  getClubRoom: (communityId: string) => api.get<ApiResponse<ChatRoom>>('/chat/rooms', { params: { type: 'CLUB', communityId } }),
  getClubMessages: (roomId: string, params?: { cursor?: string; limit?: number }) =>
    api.get<ApiResponse<CommunityChatMessage[]>>(`/chat/rooms/${roomId}/messages`, { params }),
  sendClubMessage: (roomId: string, messageText: string) => api.post<ApiResponse<CommunityChatMessage>>('/chat/messages', { roomId, messageText }),
  getConversations: () => api.get<{ data: ChatConversation[] }>('/chat/rooms').then(res => res.data),
  getMessages: (roomId: string) => api.get<{ data: ChatMessage[] }>(`/chat/rooms/${roomId}/messages`).then(res => res.data),
  markRead: (roomId: string) => api.put(`/chat/rooms/${roomId}/read`),
  getUnreadCount: (roomId: string) => api.get<{ data: { count: number } }>(`/chat/rooms/${roomId}/unread`).then(res => res.data.count),
  getBlockedUsers: () => api.get<{ data: Array<{ blockedId: string }> }>('/chat/blocks').then(res => res.data),
  createDirectRoom: (userId: string) =>
    api.post<ApiResponse<ChatConversation>>('/chat/rooms', {
      type: 'DIRECT',
      memberIds: [userId],
    }).then(res => res.data),
  blockUser: (userId: string) => api.post(`/chat/blocks/${userId}`),
  unblockUser: (userId: string) => api.delete(`/chat/blocks/${userId}`),
};

