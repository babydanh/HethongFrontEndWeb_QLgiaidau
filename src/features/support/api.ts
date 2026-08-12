import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface SupportMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  messageText: string | null;
  createdAt: string;
  senderName: string | null;
  senderAvatar: string | null;
}

export interface SupportTypingEvent {
  roomId: string;
  userId: string;
  isTyping: boolean;
  isSupportStaff: boolean;
}

export interface SupportConversation {
  id: string;
  name: string | null;
  type: 'SUPPORT';
  createdAt: string;
  messages: SupportMessage[];
}

export interface SupportParticipant {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface AdminSupportRoom {
  id: string;
  name: string | null;
  type: 'SUPPORT';
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  participants: SupportParticipant[];
  lastMessage: {
    id: string;
    senderId: string | null;
    senderName: string | null;
    content: string;
    createdAt: string;
  } | null;
}

export const supportApi = {
  getMine: () =>
    api
      .get<ApiResponse<SupportConversation | null>>('/chat/support/me')
      .then((response) => response.data),
  send: (messageText: string) =>
    api
      .post<ApiResponse<SupportConversation>>('/chat/support', { messageText })
      .then((response) => response.data),
  getAdminRooms: () =>
    api
      .get<ApiResponse<AdminSupportRoom[]>>('/chat/admin/support/rooms')
      .then((response) => response.data),
  getAdminMessages: (roomId: string) =>
    api
      .get<ApiResponse<SupportMessage[]>>(
        `/chat/admin/support/rooms/${roomId}/messages`,
      )
      .then((response) => response.data),
  markAdminRoomRead: (roomId: string) =>
    api
      .post<ApiResponse<{ success: boolean }>>(
        `/chat/admin/support/rooms/${roomId}/read`,
        {},
      )
      .then((response) => response.data),
  replyAsAdmin: (roomId: string, messageText: string) =>
    api
      .post<ApiResponse<SupportMessage>>(
        `/chat/admin/support/rooms/${roomId}/messages`,
        { messageText },
      )
      .then((response) => response.data),
};

