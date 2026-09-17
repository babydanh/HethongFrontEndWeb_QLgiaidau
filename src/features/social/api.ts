import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export type FriendshipStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
export type FriendshipDirection = 'NONE' | 'INCOMING' | 'OUTGOING';

export interface FriendshipStatusResponse {
  id: string | null;
  status: FriendshipStatus;
  direction: FriendshipDirection;
  senderId: string | null;
  receiverId: string | null;
}

export interface FriendshipListItem {
  friendshipId: string;
  status: FriendshipStatus;
  direction: FriendshipDirection;
  senderId: string;
  receiverId: string;
  friendId: string;
  friendName: string | null;
  friendAvatar: string | null;
}

export const socialApi = {
  getFriends: () =>
    api
      .get<ApiResponse<FriendshipListItem[]>>('/social/friends')
      .then((response) => response.data),

  getFriendshipStatus: (userId: string) =>
    api
      .get<ApiResponse<FriendshipStatusResponse>>(`/social/friendships/status/${userId}`)
      .then((response) => response.data),

  sendFriendRequest: (receiverId: string) =>
    api
      .post<ApiResponse<FriendshipStatusResponse>>('/social/friend-requests', { receiverId })
      .then((response) => response.data),

  respondToFriendRequest: (friendshipId: string, action: 'ACCEPTED' | 'REJECTED') =>
    api
      .patch<ApiResponse<FriendshipStatusResponse>>(`/social/friend-requests/${friendshipId}`, { action })
      .then((response) => response.data),

  removeFriendship: (friendshipId: string) =>
    api
      .delete<ApiResponse<FriendshipStatusResponse>>(`/social/friendships/${friendshipId}`)
      .then((response) => response.data),
};
