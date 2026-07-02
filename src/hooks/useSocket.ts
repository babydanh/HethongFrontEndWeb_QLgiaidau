'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { notificationsApi } from '@/features/notifications/api';
import type {
  NotificationItem,
  NotificationListState,
} from '@/features/notifications/types';
import {
  getUnreadNotificationsCount,
  mergeNotifications,
  sortNotificationsByDate,
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

let notificationState: NotificationListState = DEFAULT_NOTIFICATION_STATE;
const notificationStoreListeners = new Set<NotificationStoreListener>();

let notificationsFetchPromise: Promise<void> | null = null;
let socketConsumerCount = 0;
let activeSocketUserId: string | null = null;
let isNotificationSocketBound = false;

const emitNotificationStore = () => {
  for (const listener of notificationStoreListeners) {
    listener();
  }
};

const getNotificationSnapshot = (): NotificationListState => notificationState;

const subscribeToNotificationStore = (listener: NotificationStoreListener) => {
  notificationStoreListeners.add(listener);

  return () => {
    notificationStoreListeners.delete(listener);
  };
};

const updateNotificationState = (
  updater: NotificationListState | ((current: NotificationListState) => NotificationListState),
) => {
  const nextState =
    typeof updater === 'function'
      ? updater(notificationState)
      : updater;

  notificationState = nextState;
  emitNotificationStore();
};

const replaceNotifications = (items: NotificationItem[]) => {
  const nextItems = sortNotificationsByDate(items);

  updateNotificationState((current) => ({
    ...current,
    items: nextItems,
    unreadCount: getUnreadNotificationsCount(nextItems),
    isLoading: false,
    isInitialized: true,
    errorMessage: null,
  }));
};

const upsertNotification = (item: NotificationItem) => {
  updateNotificationState((current) => {
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
  updateNotificationState((current) => {
    const nextItems = current.items.map((item) =>
      item.id === notificationId ? { ...item, isRead: true } : item,
    );

    return {
      ...current,
      items: nextItems,
      unreadCount: getUnreadNotificationsCount(nextItems),
    };
  });
};

const markAllNotificationsReadInState = () => {
  updateNotificationState((current) => ({
    ...current,
    items: current.items.map((item) => ({ ...item, isRead: true })),
    unreadCount: 0,
  }));
};

const resetNotificationsState = () => {
  notificationsFetchPromise = null;
  updateNotificationState(DEFAULT_NOTIFICATION_STATE);
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

const fetchNotifications = async () => {
  if (notificationsFetchPromise) {
    return notificationsFetchPromise;
  }

  updateNotificationState((current) => ({
    ...current,
    isLoading: true,
    errorMessage: null,
  }));

  notificationsFetchPromise = notificationsApi
    .getMyNotifications({ page: 1, limit: NOTIFICATIONS_PAGE_LIMIT })
    .then(async ({ items }) => {
      replaceNotifications(items);
      const unreadCount = await notificationsApi.getUnreadCount().catch(() =>
        getUnreadNotificationsCount(items),
      );

      updateNotificationState((current) => ({
        ...current,
        unreadCount,
      }));
    })
    .catch((error: unknown) => {
      if (!isNetworkError(error) && !isHttpStatusError(error, 401)) {
        console.error('Failed to fetch notifications:', error);
      }

      updateNotificationState((current) => ({
        ...current,
        isLoading: false,
        isInitialized: true,
        errorMessage: isHttpStatusError(error, 401)
          ? null
          : getErrorMessage(error, 'Không thể tải thông báo lúc này.'),
      }));
    })
    .finally(() => {
      notificationsFetchPromise = null;
    });

  return notificationsFetchPromise;
};

const markNotificationAsRead = async (notificationId: string) => {
  markNotificationReadInState(notificationId);

  try {
    const updatedNotification = await notificationsApi.markAsRead(notificationId);
    upsertNotification(updatedNotification);
    return updatedNotification;
  } catch (error) {
    await fetchNotifications();
    throw error;
  }
};

const markAllNotificationsAsRead = async () => {
  markAllNotificationsReadInState();

  try {
    const updatedNotifications = await notificationsApi.markAllAsRead();
    replaceNotifications(updatedNotifications);
    return updatedNotifications;
  } catch (error) {
    await fetchNotifications();
    throw error;
  }
};

export function useSocket() {
  const { isAuthenticated, user } = useAuthStore();
  const state = useSyncExternalStore(
    subscribeToNotificationStore,
    getNotificationSnapshot,
    getNotificationSnapshot,
  );

  useEffect(() => {
    socketConsumerCount += 1;

    return () => {
      releaseNotificationSocket();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      Promise.resolve().then(() => {
        disconnectNotificationSocketImmediately();
        socketClient.setNotificationAuthToken(null);
        resetNotificationsState();
      });
      return;
    }

    Promise.resolve().then(() => {
      void fetchNotifications();
      bindNotificationSocket(user.id);
    });
  }, [isAuthenticated, user?.id]);

  return {
    notifications: state.items,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    errorMessage: state.errorMessage,
    refreshNotifications: fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };
}
