'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CheckCheck, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '@/hooks/useSocket';
import {
  formatNotificationTimestamp,
  getNotificationTypeLabel,
  getNotificationTypeMeta,
  resolveNotificationTarget,
} from '@/features/notifications/utils';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error';

type NotificationFilter = 'all' | 'unread';

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const {
    notifications,
    unreadCount,
    isLoading,
    isInitialized,
    errorMessage,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    refreshNotifications,
  } = useSocket();

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => !item.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  const handleNotificationOpen = async (
    notificationId: string,
    redirectUrl?: string | null,
    isRead?: boolean,
  ) => {
    try {
      if (!isRead) {
        await markNotificationAsRead(notificationId);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật thông báo.'));
      return;
    }

    const target = resolveNotificationTarget(redirectUrl);

    if (!target.href) {
      return;
    }

    if (target.isExternal) {
      window.location.assign(target.href);
      return;
    }

    router.push(target.href);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success('Đã đánh dấu tất cả là đã đọc.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật thông báo.'));
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 border-b border-slate-100 px-6 py-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Bell className="h-3.5 w-3.5" />
                Trung tâm thông báo
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">
                  Thông báo của bạn
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi cập nhật mới nhất từ giải đấu, thanh toán và hoạt động hệ thống.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                    filter === 'unread'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  Chưa đọc
                </button>
              </div>

              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Đánh dấu tất cả
              </button>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Tổng số
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{notifications.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Chưa đọc
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{unreadCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Bộ lọc hiện tại
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {filter === 'all' ? 'Tất cả thông báo' : 'Chỉ thông báo chưa đọc'}
              </p>
            </div>
          </div>

          <div className="px-6 py-6">
            {errorMessage ? (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-900">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    void refreshNotifications();
                  }}
                  className="text-sm font-semibold text-amber-800 transition-colors hover:text-amber-950"
                >
                  Thử lại
                </button>
              </div>
            ) : null}

            {isLoading && !isInitialized ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`notifications-page-skeleton-${index}`}
                    className="rounded-3xl border border-slate-100 p-5"
                  >
                    <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="mb-2 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={cn(
                      'rounded-3xl border p-5 transition-all',
                      notification.isRead
                        ? `border-slate-200 bg-white ${getNotificationTypeMeta(notification.type).cardClassName}`
                        : getNotificationTypeMeta(notification.type).unreadCardClassName,
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          void handleNotificationOpen(
                            notification.id,
                            notification.redirectUrl,
                            notification.isRead,
                          )
                        }
                        className="flex-1 text-left"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                              getNotificationTypeMeta(notification.type).badgeClassName,
                            )}
                          >
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {formatNotificationTimestamp(notification.createdAt)}
                          </span>
                          {!notification.isRead ? (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                              Mới
                            </span>
                          ) : null}
                        </div>
                        <h2 className="text-lg font-semibold text-slate-950">
                          {notification.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {notification.content}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 md:ml-4">
                        {!notification.isRead ? (
                          <button
                            type="button"
                            onClick={() => {
                              void markNotificationAsRead(notification.id).catch((error: unknown) => {
                                toast.error(
                                  getErrorMessage(error, 'Không thể cập nhật thông báo.'),
                                );
                              });
                            }}
                            className="inline-flex items-center rounded-2xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                          >
                            Đánh dấu đã đọc
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            void handleNotificationOpen(
                              notification.id,
                              notification.redirectUrl,
                              notification.isRead,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          Mở
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                {filter === 'unread' ? (
                  <Bell className="h-10 w-10 text-blue-600" />
                ) : (
                  <BellOff className="h-10 w-10 text-slate-400" />
                )}
                <h2 className="mt-4 text-xl font-semibold text-slate-900">
                  {filter === 'unread'
                    ? 'Không còn thông báo chưa đọc'
                    : 'Hộp thông báo đang trống'}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {filter === 'unread'
                    ? 'Mọi cập nhật gần đây của bạn đã được xử lý. Khi có thông báo mới, chúng sẽ xuất hiện ngay tại đây.'
                    : 'Khi hệ thống gửi cập nhật về giải đấu, thanh toán hoặc tài khoản, bạn sẽ thấy chúng trong danh sách này.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
