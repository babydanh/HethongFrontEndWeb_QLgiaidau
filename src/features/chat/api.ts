import { api } from '@/lib/axios';

import { ChatMessage, ChatConversation } from '@/types/chat';
import type { ApiResponse } from '@/types/api';
import type { ChatRoom, ChatMessage as CommunityChatMessage } from '@/types/community-social';
export type { ChatMessage, ChatConversation };

export const chatApi = {
  getClubRoom: (communityId: string) => api.get<ApiResponse<ChatRoom>>('/chat/rooms', { params: { type: 'CLUB', communityId } }),
  getClubMessages: (roomId: string) => api.get<ApiResponse<CommunityChatMessage[]>>(`/chat/rooms/${roomId}/messages`),
  sendClubMessage: (roomId: string, messageText: string) => api.post<ApiResponse<CommunityChatMessage>>('/chat/messages', { roomId, messageText }),
  getConversations: () => api.get<{ data: ChatConversation[] }>('/chat/rooms').then(res => res.data),
  getMessages: (roomId: string) => api.get<{ data: ChatMessage[] }>(`/chat/rooms/${roomId}/messages`).then(res => res.data),
};

