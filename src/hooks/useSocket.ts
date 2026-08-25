'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { notificationsApi } from '@/features/notifications/api';
import type {
  NotificationItem,
  NotificationListState,
} from '@/features/notifications/types';
import {
  getUnreadNotificationsCount,
  isManagementNotification,
  mergeNotifications,
  sortNotificationsByDate,
  type NotificationScope,
} from '@/features/notifications/utils';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage, isHttpStatusError, isNetworkError } from '@/utils/error';

type NotificationStoreListener = () => void;
const NOTIFICATIONS_PAGE_LIMIT = 50;

const DEFAULT_NOTIFICATION_STATE: NotificationListState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
};

const notificationStates: Record<NotificationScope, NotificationListState> = {
  player: { ...DEFAULT_NOTIFICATION_STATE },
  management: { ...DEFAULT_NOTIFICATION_STATE },
};
const notificationStoreListeners = new Map<NotificationScope, Set<NotificationStoreListener>>([
  ['player', new Set<NotificationStoreListener>()],
  ['management', new Set<NotificationStoreListener>()],
]);

const notificationsFetchPromises: Record<NotificationScope, Promise<void> | null> = {
  player: null,
  management: null,
};
let socketConsumerCount = 0;
let activeSocketUserId: string | null = null;
let isNotificationSocketBound = false;

const emitNotificationStore = (scope: NotificationScope) => {
  for (const listener of notificationStoreListeners.get(scope) ?? []) {
    listener();
  }
};

const getNotificationSnapshot = (scope: NotificationScope): NotificationListState =>
  notificationStates[scope];

const subscribeToNotificationStore = (scope: NotificationScope, listener: NotificationStoreListener) => {
  const listeners = notificationStoreListeners.get(scope);
  listeners?.add(listener);

  return () => {
    listeners?.delete(listener);
  };
};

const updateNotificationState = (
  scope: NotificationScope,
  updater: NotificationListState | ((current: NotificationListState) => NotificationListState),
) => {
  const current = notificationStates[scope];
  const nextState = typeof updater === 'function' ? updater(current) : updater;

  notificationStates[scope] = nextState;
  emitNotificationStore(scope);
};

const replaceNotifications = (scope: NotificationScope, items: NotificationItem[]) => {
  const nextItems = sortNotificationsByDate(items);

  updateNotificationState(scope, (current) => ({
    ...current,
    items: nextItems,
    unreadCount: getUnreadNotificationsCount(nextItems),
    isLoading: false,
    isInitialized: true,
    errorMessage: null,
  }));
};

const upsertNotification = (item: NotificationItem) => {
  const scope: NotificationScope = isManagementNotification(item) ? 'management' : 'player';

  updateNotificationState(scope, (current) => {
    const nextItems = mergeNotifications(current.items, [item]);

    return {
      ...current,
      items: nextItems,
      unreadCount: getUnreadNotificationsCount(nextItems),
      isInitialized: true,
      errorMessage: null,
    };
  });
};

const markNotificationReadInState = (notificationId: string) => {
  for (const scope of ['player', 'management'] as const) {
    updateNotificationState(scope, (current) => {
      const nextItems = current.items.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      );

      return {
        ...current,
        items: nextItems,
        unreadCount: getUnreadNotificationsCount(nextItems),
      };
    });
  }
};

const markAllNotificationsReadInState = (scope: NotificationScope) => {
  updateNotificationState(scope, (current) => ({
    ...current,
    items: current.items.map((item) => ({ ...item, isRead: true })),
    unreadCount: 0,
  }));
};

const resetNotificationsState = () => {
  notificationsFetchPromises.player = null;
  notificationsFetchPromises.management = null;
  updateNotificationState('player', { ...DEFAULT_NOTIFICATION_STATE });
  updateNotificationState('management', { ...DEFAULT_NOTIFICATION_STATE });
};

const getSocketAccessToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const bearerCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('accessToken='));

  if (!bearerCookie) {
    return null;
  }

  const tokenValue = bearerCookie.slice('accessToken='.length);

  return tokenValue ? decodeURIComponent(tokenValue) : null;
};

const bindNotificationSocket = (userId: string) => {
  socketClient.setNotificationAuthToken(getSocketAccessToken());

  const socket = socketClient.getNotificationSocket();

  if (activeSocketUserId === userId && isNotificationSocketBound) {
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  if (isNotificationSocketBound) {
    socket.off('connect');
    socket.off('notification:new');
  }

  const handleConnect = () => {
    socket.emit('subscribe');
  };

  const handleNewNotification = (notification: NotificationItem) => {
    upsertNotification(notification);
  };

  socket.on('connect', handleConnect);
  socket.on('notification:new', handleNewNotification);

  if (!socket.connected) {
    socket.connect();
  } else {
    handleConnect();
  }

  activeSocketUserId = userId;
  isNotificationSocketBound = true;
};

const releaseNotificationSocket = () => {
  socketConsumerCount = Math.max(0, socketConsumerCount - 1);

  if (socketConsumerCount > 0 || !isNotificationSocketBound) {
    return;
  }

  const socket = socketClient.getNotificationSocket();
  socket.off('connect');
  socket.off('notification:new');
  socket.disconnect();
  activeSocketUserId = null;
  isNotificationSocketBound = false;
};

const disconnectNotificationSocketImmediately = () => {
  if (!isNotificationSocketBound) {
    return;
  }

  const socket = socketClient.getNotificationSocket();
  socket.off('connect');
  socket.off('notification:new');
  socket.disconnect();
  activeSocketUserId = null;
  isNotificationSocketBound = false;
};

const fetchNotifications = async (scope: NotificationScope) => {
  if (notificationsFetchPromises[scope]) {
    return notificationsFetchPromises[scope];
  }

  updateNotificationState(scope, (current) => ({
    ...current,
    isLoading: true,
    errorMessage: null,
  }));

  notificationsFetchPromises[scope] = notificationsApi
    .getMyNotifications({ limit: NOTIFICATIONS_PAGE_LIMIT, scope })
    .then(async ({ items }) => {
      replaceNotifications(scope, items);
      const unreadCount = await notificationsApi.getUnreadCount(scope).catch(() =>
        getUnreadNotificationsCount(items),
      );

      updateNotificationState(scope, (current) => ({
        ...current,
        unreadCount,
      }));
    })
    .catch((error: unknown) => {
      if (!isNetworkError(error) && !isHttpStatusError(error, 401)) {
        console.error('Failed to fetch notifications:', error);
      }

      updateNotificationState(scope, (current) => ({
        ...current,
        isLoading: false,
        isInitialized: true,
        errorMessage: isHttpStatusError(error, 401)
          ? null
          : getErrorMessage(error, 'Không thể tải thông báo lúc này.'),
      }));
    })
    .finally(() => {
      notificationsFetchPromises[scope] = null;
    });

  return notificationsFetchPromises[scope];
};

const markNotificationAsRead = async (notificationId: string, scope: NotificationScope) => {
  markNotificationReadInState(notificationId);

  try {
    const updatedNotification = await notificationsApi.markAsRead(notificationId);
    upsertNotification(updatedNotification);
    return updatedNotification;
  } catch (error) {
    await fetchNotifications(scope);
    throw error;
  }
};

const markAllNotificationsAsRead = async (scope: NotificationScope) => {
  markAllNotificationsReadInState(scope);

  try {
    const updatedNotifications = await notificationsApi.markAllAsRead(scope);
    replaceNotifications(scope, updatedNotifications);
    return updatedNotifications;
  } catch (error) {
    await fetchNotifications(scope);
    throw error;
  }
};

export function useSocket(scope: NotificationScope = 'player') {
  const { isAuthenticated, isSessionReady, user } = useAuthStore();
  const state = useSyncExternalStore(
    (listener) => subscribeToNotificationStore(scope, listener),
    () => getNotificationSnapshot(scope),
    () => getNotificationSnapshot(scope),
  );

  useEffect(() => {
    socketConsumerCount += 1;

    return () => {
      releaseNotificationSocket();
    };
  }, []);

  useEffect(() => {
    if (!isSessionReady || !isAuthenticated || !user?.id) {
      Promise.resolve().then(() => {
        disconnectNotificationSocketImmediately();
        socketClient.setNotificationAuthToken(null);
        resetNotificationsState();
      });
      return;
    }

    Promise.resolve().then(() => {
      void fetchNotifications(scope);
      bindNotificationSocket(user.id);
    });
  }, [isSessionReady, isAuthenticated, user?.id, scope]);

  return {
    notifications: state.items,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    errorMessage: state.errorMessage,
    refreshNotifications: () => fetchNotifications(scope),
    markNotificationAsRead: (notificationId: string) =>
      markNotificationAsRead(notificationId, scope),
    markAllNotificationsAsRead: () => markAllNotificationsAsRead(scope),
  };
}

