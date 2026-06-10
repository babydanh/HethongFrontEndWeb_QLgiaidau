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
