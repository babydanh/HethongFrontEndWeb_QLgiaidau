import type {
  NotificationItem,
  NotificationNavigationTarget,
} from '@/features/notifications/types';
import {
  DEFAULT_NOTIFICATION_META,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_META,
  type NotificationTypeMeta,
} from '@/features/notifications/constants';

const VIETNAMESE_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const sortNotificationsByDate = (
  notifications: NotificationItem[],
): NotificationItem[] =>
  [...notifications].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

export const mergeNotifications = (
  currentItems: NotificationItem[],
  incomingItems: NotificationItem[],
): NotificationItem[] => {
  const mergedMap = new Map<string, NotificationItem>();

  for (const notification of [...currentItems, ...incomingItems]) {
    const existingItem = mergedMap.get(notification.id);

    if (!existingItem) {
      mergedMap.set(notification.id, notification);
      continue;
    }

    mergedMap.set(notification.id, {
      ...existingItem,
      ...notification,
      isRead: existingItem.isRead || notification.isRead,
    });
  }

  return sortNotificationsByDate(Array.from(mergedMap.values()));
};

export const getUnreadNotificationsCount = (
  notifications: NotificationItem[],
): number => notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);

export const formatNotificationTimestamp = (createdAt: string): string => {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return '';
  }

  const diffInMinutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60000));

  if (diffInMinutes < 1) {
    return 'Vừa xong';
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  return VIETNAMESE_DATE_FORMATTER.format(new Date(createdTime));
};

export const resolveNotificationTarget = (
  redirectUrl?: string | null,
): NotificationNavigationTarget => {
  if (!redirectUrl) {
    return { href: null, isExternal: false };
  }

  if (redirectUrl.startsWith('/')) {
    return { href: redirectUrl, isExternal: false };
  }

  if (typeof window === 'undefined') {
    return { href: redirectUrl, isExternal: true };
  }

  try {
    const targetUrl = new URL(redirectUrl, window.location.origin);

    if (targetUrl.origin === window.location.origin) {
      return {
        href: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
        isExternal: false,
      };
    }

    return { href: targetUrl.toString(), isExternal: true };
  } catch {
    return { href: redirectUrl, isExternal: true };
  }
};

export const getNotificationTypeLabel = (type: string): string => {
  const trimmedType = type.trim();
  const explicitLabel = NOTIFICATION_TYPE_LABELS[trimmedType];

  if (explicitLabel) {
    return explicitLabel;
  }

  const normalizedType = trimmedType.toLowerCase();

  if (normalizedType.includes('payment')) {
    return 'Thanh toán';
  }

  if (normalizedType.includes('tournament')) {
    return 'Giải đấu';
  }

  if (normalizedType.includes('chat') || normalizedType.includes('message')) {
    return 'Tin nhắn';
  }

  if (normalizedType.includes('system')) {
    return 'Hệ thống';
  }

  return 'Thông báo';
};

export const getNotificationTypeMeta = (type: string): NotificationTypeMeta =>
  NOTIFICATION_TYPE_META[type.trim()] ?? DEFAULT_NOTIFICATION_META;
