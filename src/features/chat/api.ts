import { api } from '@/lib/axios';

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  name?: string;
  type: 'PRIVATE' | 'GROUP';
  lastMessage?: ChatMessage;
  participants: { id: string; fullName: string; avatarUrl?: string }[];
  updatedAt: string;
}

export const chatApi = {
  getConversations: () => api.get<{ data: ChatConversation[] }>('/chat/conversations').then(res => res.data.data),
  getMessages: (conversationId: string) => api.get<{ data: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`).then(res => res.data.data),
};
