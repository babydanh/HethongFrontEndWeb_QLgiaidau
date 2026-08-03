'use client';

import { useMemo, useState } from 'react';
import { Bell, BellOff, CheckCheck, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSocket } from '@/hooks/useSocket';
import {
  formatNotificationTimestamp,
  getNotificationSummary,
  getNotificationTypeLabel,
  getNotificationTypeMeta,
  resolveNotificationTarget,
} from '@/features/notifications/utils';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error';

type NotificationFilter = 'all' | 'unread';
type NotificationSectionKey = 'today' | 'week' | 'older';

const getSectionKey = (createdAt: string): NotificationSectionKey => {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return 'older';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const difference = startOfToday - createdTime;

  if (createdTime >= startOfToday) return 'today';
  if (difference < 6 * 24 * 60 * 60 * 1000) return 'week';
  return 'older';
};

export default function AdminNotificationsPage() {
  const translate = useTranslations('Notifications');
  const locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const {
    notifications,
    unreadCount,
    isLoading,
    isInitialized,
    errorMessage,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useSocket('management');

  const filteredNotifications = useMemo(
    () => filter === 'unread' ? notifications.filter((item) => !item.isRead) : notifications,
    [filter, notifications],
  );

  const groupedNotifications = useMemo(() => {
    const sections = [
      { key: 'today' as const, title: translate('today'), items: [] as typeof notifications },
      { key: 'week' as const, title: translate('lastSevenDays'), items: [] as typeof notifications },
      { key: 'older' as const, title: translate('older'), items: [] as typeof notifications },
    ];

    for (const notification of filteredNotifications) {
      sections.find((section) => section.key === getSectionKey(notification.createdAt))?.items.push(notification);
    }

    return sections.filter((section) => section.items.length > 0);
  }, [filteredNotifications, translate]);

  const openNotification = async (notificationId: string, redirectUrl: string | null | undefined, isRead: boolean) => {
    try {
      if (!isRead) await markNotificationAsRead(notificationId);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('updateError')));
      return;
    }

    const target = resolveNotificationTarget(redirectUrl);
    if (!target.href) return;
    if (target.isExternal) {
      window.location.assign(target.href);
      return;
    }
    router.push(target.href);
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success(translate('markAllSuccess'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('updateError')));
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-5 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Bell className="h-3.5 w-3.5" />
              {translate('managementCenterLabel')}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{translate('managementTitle')}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{translate('managementDescription')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label={translate('title')}>
              {(['all', 'unread'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {translate(value)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <CheckCheck className="h-4 w-4" />
              {translate('markAll')}
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:grid-cols-3 sm:px-6">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{translate('total')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{notifications.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{translate('unread')}</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{unreadCount}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{translate('currentFilter')}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {filter === 'all' ? translate('allNotifications') : translate('unreadOnly')}
            </p>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6">
          {errorMessage ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">{errorMessage}</p>
              <button type="button" onClick={() => void refreshNotifications()} className="text-sm font-semibold text-amber-800 hover:text-amber-950">
                {translate('retry')}
              </button>
            </div>
          ) : null}

          {isLoading && !isInitialized ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`management-notification-skeleton-${index}`} className="rounded-2xl border border-slate-100 p-5">
                  <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="mb-2 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : groupedNotifications.length > 0 ? (
            <div className="space-y-6">
              {groupedNotifications.map((section) => (
                <section key={section.key} className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{section.title}</h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="space-y-3">
                    {section.items.map((notification) => (
                      <article
                        key={notification.id}
                        className={cn(
                          'rounded-2xl border p-5 transition-colors',
                          notification.isRead ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-blue-200 bg-blue-50/50',
                        )}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => void openNotification(notification.id, notification.redirectUrl, notification.isRead)}
                              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]', getNotificationTypeMeta(notification.type).badgeClassName)}>
                                {getNotificationTypeLabel(notification.type, translate)}
                              </span>
                              <span className="text-xs font-medium text-slate-400">
                                {formatNotificationTimestamp(notification.createdAt, translate, locale)}
                              </span>
                              {!notification.isRead ? <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">{translate('unread')}</span> : null}
                            </div>
                            <h3 className="text-lg font-semibold text-slate-950">{notification.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{notification.content}</p>
                            </button>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 sm:pt-1">
                            <span className="hidden text-xs font-medium text-slate-500 md:inline">{getNotificationSummary(notification.type, translate)}</span>
                            <button
                              type="button"
                              onClick={() => void openNotification(notification.id, notification.redirectUrl, notification.isRead)}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              {translate('open')}
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              {filter === 'unread' ? <Bell className="h-10 w-10 text-blue-600" /> : <BellOff className="h-10 w-10 text-slate-400" />}
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                {filter === 'unread' ? translate('noUnreadTitle') : translate('managementEmptyTitle')}
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                {filter === 'unread' ? translate('noUnreadDescription') : translate('managementEmptyDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
