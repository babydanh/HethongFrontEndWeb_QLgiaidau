import { api } from '@/lib/axios';
import type {
  NotificationItem,
  NotificationListResult,
  NotificationListResponse,
  NotificationMutationResponse,
  NotificationQueryParams,
  NotificationUnreadCountResponse,
} from '@/features/notifications/types';

export type { NotificationItem };

export const notificationsApi = {
  getMyNotifications: (params?: NotificationQueryParams) =>
    api
      .get<NotificationListResponse>('/notifications', { params })
      .then(
        (response): NotificationListResult => ({
          items: response.data,
          meta: response.meta,
        }),
      ),
  getUnreadCount: () =>
    api
      .get<NotificationUnreadCountResponse>('/notifications/unread-count')
      .then((response) => {
        if (typeof response.data === 'number') {
          return response.data;
        }

        return response.data.unreadCount ?? response.data.count ?? 0;
      }),
  markAsRead: (id: string) =>
    api
      .patch<NotificationMutationResponse>(`/notifications/${id}/read`, {})
      .then((response) => response.data),
  markAllAsRead: () =>
    api
      .patch<NotificationListResponse>('/notifications/read-all', {})
      .then((response) => response.data),
};

