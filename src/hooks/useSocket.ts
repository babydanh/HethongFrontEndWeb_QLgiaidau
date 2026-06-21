'use client';

import { useEffect, useState } from 'react';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import { notificationsApi, Notification } from '@/features/notifications/api';
import { isHttpStatusError, isNetworkError } from '@/utils/error';

type NotificationResponse = {
  data?: Notification[];
};

export function useSocket() {
  const { isAuthenticated, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      Promise.resolve().then(() => {
        setNotifications((current) => (current.length > 0 ? [] : current));
      });
      return;
    }

    // Tải danh sách thông báo ban đầu
    notificationsApi.getMyNotifications()
      .then((res: NotificationResponse | Notification[]) => {
        // Response format is { statusCode, message, data: Notification[] }
        const data = Array.isArray(res) ? res : res.data ?? [];
        setNotifications(Array.isArray(data) ? data : []);
      })
      .catch((error: unknown) => {
        if (!isNetworkError(error) && !isHttpStatusError(error, 401)) {
          console.error('Failed to fetch notifications:', error);
        }
      });

    const socket = socketClient.getNotificationSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      socket.emit('subscribe', user.id);
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notification:new', handleNewNotification);
    };
  }, [isAuthenticated, user]);

  return {
    notifications,
    setNotifications,
  };
}
