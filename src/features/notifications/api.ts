import { api } from '@/lib/axios';

export interface Notification {
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

export const notificationsApi = {
  getMyNotifications: () =>
    api.get<{ data: Notification[] }>('/notifications').then((res) => res.data),
  markAsRead: (id: string) =>
    api.patch<{ data: Notification }>(`/notifications/${id}/read`, {}).then((res) => res.data),
};
