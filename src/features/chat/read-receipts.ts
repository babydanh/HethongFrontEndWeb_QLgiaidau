import type { ChatParticipant } from '@/types/chat';

export type RoomReadState = Record<string, string>;

export interface RoomReadEvent {
  roomId: string;
  userId: string;
  readAt: string;
}

export function getMessageViewers(
  participants: ChatParticipant[],
  readState: RoomReadState | undefined,
  message: { senderId: string; createdAt: string },
  currentUserId?: string,
): ChatParticipant[] {
  const messageCreatedAt = Date.parse(message.createdAt);
  if (!Number.isFinite(messageCreatedAt)) return [];

  const viewers = new Map<string, ChatParticipant>();
  for (const participant of participants) {
    if (!participant.id || participant.id === message.senderId || participant.id === currentUserId) continue;
    const lastReadAt = readState?.[participant.id] ?? participant.lastReadAt;
    if (!lastReadAt) continue;
    const readTimestamp = Date.parse(lastReadAt);
    if (Number.isFinite(readTimestamp) && readTimestamp >= messageCreatedAt) {
      viewers.set(participant.id, participant);
    }
  }
  return Array.from(viewers.values());
}

export function applyRoomReadEvent(
  current: Record<string, RoomReadState>,
  event: RoomReadEvent,
): Record<string, RoomReadState> {
  return {
    ...current,
    [event.roomId]: {
      ...(current[event.roomId] ?? {}),
      [event.userId]: event.readAt,
    },
  };
}
