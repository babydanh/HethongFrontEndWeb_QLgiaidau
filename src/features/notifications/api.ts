import { api } from '@/lib/axios';
import type {
  NotificationItem,
  NotificationListResult,
  NotificationListResponse,
  NotificationMutationResponse,
  NotificationQueryParams,
  NotificationUnreadCountResponse,
} from '@/features/notifications/types';
import type { NotificationScope } from '@/features/notifications/utils';

export type { NotificationItem };

export const notificationsApi = {
  getMyNotifications: (params?: NotificationQueryParams & { scope?: NotificationScope }) =>
    api
      .get<NotificationListResponse>('/notifications', { params })
      .then(
        (response): NotificationListResult => ({
          items: response.data,
          meta: response.meta,
        }),
      ),
  getUnreadCount: (scope: NotificationScope = 'player') =>
    api
      .get<NotificationUnreadCountResponse>('/notifications/unread-count', { params: { scope } })
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
  markAllAsRead: (scope: NotificationScope = 'player') =>
    api
      .patch<NotificationListResponse>('/notifications/read-all', { scope })
      .then((response) => response.data),
};

