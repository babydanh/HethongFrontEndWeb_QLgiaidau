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

export interface NotificationActionConfig {
  kind: 'community-invite' | 'referee-invite' | 'partner-invite' | 'football-team-invite';
  communityId?: string;
  teamId?: string;
  tournamentId?: string;
  refereeId?: string;
  participantId?: string;
}

type NotificationTranslator = (key: any, values?: any) => string;

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

export const formatNotificationTimestamp = (
  createdAt: string,
  translate?: NotificationTranslator,
  locale = 'vi',
): string => {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return '';
  }

  const diffInMinutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60000));

  if (diffInMinutes < 1) {
    return translate ? translate('timeJustNow') : 'Vừa xong';
  }

  if (diffInMinutes < 60) {
    return translate
      ? translate('timeMinutesAgo', { count: diffInMinutes })
      : `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return translate
      ? translate('timeHoursAgo', { count: diffInHours })
      : `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return translate
      ? translate('timeDaysAgo', { count: diffInDays })
      : `${diffInDays} ngày trước`;
  }

  if (translate) {
    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(createdTime));
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

export const getNotificationTypeLabel = (
  type: string,
  translate?: NotificationTranslator,
): string => {
  const trimmedType = type.trim();
  const explicitLabel = NOTIFICATION_TYPE_LABELS[trimmedType];

  if (explicitLabel) {
    return translate ? translate(`notificationType_${trimmedType}`) : explicitLabel;
  }

  const normalizedType = trimmedType.toLowerCase();

  if (normalizedType.includes('payment')) {
    return translate ? translate('notificationTypePayment') : 'Thanh toán';
  }

  if (normalizedType.includes('tournament')) {
    return translate ? translate('notificationTypeTournament') : 'Giải đấu';
  }

  if (normalizedType.includes('chat') || normalizedType.includes('message')) {
    return translate ? translate('notificationTypeMessage') : 'Tin nhắn';
  }

  if (normalizedType.includes('system')) {
    return translate ? translate('notificationTypeSystem') : 'Hệ thống';
  }

  return translate ? translate('notificationTypeDefault') : 'Thông báo';
};

export const getNotificationTypeMeta = (type: string): NotificationTypeMeta =>
  NOTIFICATION_TYPE_META[type.trim()] ?? DEFAULT_NOTIFICATION_META;

export const getNotificationTone = (
  type: string,
): 'danger' | 'success' | 'warning' | 'info' | 'accent' | 'neutral' => {
  const normalizedType = type.trim().toUpperCase();

  if (
    normalizedType.includes('REJECTED') ||
    normalizedType.includes('CANCELLED') ||
    normalizedType.includes('KICKED') ||
    normalizedType.includes('BANNED') ||
    normalizedType.includes('REVOKED') ||
    normalizedType.includes('INVITE_DECLINED')
  ) {
    return 'danger';
  }

  if (
    normalizedType.includes('PROMOTED') ||
    normalizedType.includes('TRANSFERRED') ||
    normalizedType.includes('UNBANNED') ||
    normalizedType.includes('APPROVED') ||
    normalizedType.includes('SUCCESS') ||
    normalizedType.includes('COMPLETED') ||
    normalizedType.includes('UNBANNED') ||
    normalizedType.includes('UNSUSPENDED') ||
    normalizedType === 'PARTNER_INVITE_ACCEPTED' ||
    normalizedType === 'FOOTBALL_TEAM_INVITE_ACCEPTED'
  ) {
    return 'success';
  }

  if (normalizedType.includes('PENDING') || normalizedType.includes('TIMEOUT')) {
    return 'warning';
  }

  if (normalizedType.includes('DEMOTED')) {
    return 'warning';
  }

  if (
    normalizedType.includes('COMMUNITY_INVITED') ||
    normalizedType.includes('REFEREE_INVITED') ||
    normalizedType.includes('PARTNER_INVITE_RECEIVED') ||
    normalizedType === 'FOOTBALL_TEAM_INVITED'
  ) {
    return 'accent';
  }

  if (
    normalizedType.includes('MATCH') ||
    normalizedType.includes('REFEREE') ||
    normalizedType.includes('RESERVED')
  ) {
    return 'info';
  }

  return 'neutral';
};

export const getNotificationSummary = (
  type: string,
  translate?: NotificationTranslator,
): string => {
  const tone = getNotificationTone(type);
  const keyByTone = {
    danger: 'summaryNeedsAttention',
    success: 'summaryUpdated',
    warning: 'summaryPending',
    accent: 'summaryActionAvailable',
    info: 'summaryNewInformation',
    neutral: 'summarySystem',
  } as const;
  if (translate) return translate(keyByTone[tone]);

  switch (tone) {
    case 'danger':
      return 'Cần chú ý';
    case 'success':
      return 'Đã cập nhật';
    case 'warning':
      return 'Đang chờ xử lý';
    case 'accent':
      return 'Có thể thao tác ngay';
    case 'info':
      return 'Thông tin mới';
    default:
      return 'Thông báo hệ thống';
  }
};

export const getNotificationActionConfig = (
  notification: NotificationItem,
): NotificationActionConfig | null => {
  const notificationType = notification.type.trim().toUpperCase();

  if (notificationType === 'COMMUNITY_INVITED') {
    const target = resolveNotificationTarget(notification.redirectUrl);
    const match = target.href?.match(/^\/communities\/([0-9a-fA-F-]+)/);

    if (!match) {
      return null;
    }

    return {
      kind: 'community-invite',
      communityId: match[1],
    };
  }

  if (notificationType === 'REFEREE_INVITED') {
    const target = resolveNotificationTarget(notification.redirectUrl);

    if (!target.href) {
      return null;
    }

    const url = new URL(target.href, 'http://local');
    const tournamentId = url.searchParams.get('tournamentId');
    const refereeId = url.searchParams.get('refereeId');

    if (!tournamentId || !refereeId) {
      return null;
    }

    return {
      kind: 'referee-invite',
      tournamentId,
      refereeId,
    };
  }

  if (notificationType === 'FOOTBALL_TEAM_INVITED') {
    const target = resolveNotificationTarget(notification.redirectUrl);
    if (!target.href) return null;
    const url = new URL(target.href, 'http://local');
    const teamId = url.searchParams.get('teamId');
    if (!teamId) return null;
    return { kind: 'football-team-invite', teamId };
  }

  if (notificationType === 'PARTNER_INVITE_RECEIVED') {
    const target = resolveNotificationTarget(notification.redirectUrl);
    const match = target.href?.match(/^\/tournaments\/([0-9a-fA-F-]+)\/participants\/([0-9a-fA-F-]+)/);

    if (!match) {
      return null;
    }

    return {
      kind: 'partner-invite',
      tournamentId: match[1],
      participantId: match[2],
    };
  }

  return null;
};

