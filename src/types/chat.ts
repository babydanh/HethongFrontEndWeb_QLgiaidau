export interface ChatParticipant {
  id: string;
  fullName: string | null;
  avatarUrl?: string | null;
  lastReadAt?: string | null;
}

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
  type: 'DIRECT' | 'PRIVATE' | 'GROUP';
  lastMessage?: ChatMessage;
  participants: ChatParticipant[];
  updatedAt: string;
}

