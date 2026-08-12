import type { ApiResponse } from '@/types/api';

export interface NotificationItem {
  id: string;
  receiverId: string;
  senderId?: string | null;
  type: string;
  title: string;
  content: string;
  redirectUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
}

export interface NotificationNavigationTarget {
  href: string | null;
  isExternal: boolean;
}

export type NotificationListResponse = ApiResponse<NotificationItem[]>;
export type NotificationMutationResponse = ApiResponse<NotificationItem>;
export type NotificationUnreadCountResponse = ApiResponse<{ unreadCount?: number; count?: number } | number>;

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  cursor?: string | null;
  isRead?: boolean;
}

export interface NotificationListResult {
  items: NotificationItem[];
  meta?: NotificationListResponse['meta'];
}
