import { api } from '@/lib/axios';

import { ChatMessage, ChatConversation } from '@/types/chat';
export type { ChatMessage, ChatConversation };

export const chatApi = {
  getConversations: () => api.get<{ data: ChatConversation[] }>('/chat/rooms').then(res => res.data),
  getMessages: (roomId: string) => api.get<{ data: ChatMessage[] }>(`/chat/rooms/${roomId}/messages`).then(res => res.data),
};
