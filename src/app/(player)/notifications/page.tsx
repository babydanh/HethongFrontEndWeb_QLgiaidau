'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { communitiesApi } from '@/features/communities/api';
import { footballTeamsApi, tournamentsApi } from '@/features/tournaments/api';
import type { NotificationItem } from '@/features/notifications/types';
import { useSocket } from '@/hooks/useSocket';
import {
  getNotificationActionConfig,
  getNotificationSummary,
  formatNotificationTimestamp,
  getNotificationTypeLabel,
  getNotificationTypeMeta,
  resolveNotificationTarget,
} from '@/features/notifications/utils';
import { cn } from '@/utils/cn';
import { getErrorMessage, isHttpStatusError } from '@/utils/error';

type NotificationFilter = 'all' | 'unread';

type NotificationSection = {
  key: 'today' | 'week' | 'older';
  title: string;
  items: NotificationItem[];
};

const isResolvedInviteError = (error: unknown): boolean =>
  isHttpStatusError(error, 404) || isHttpStatusError(error, 409);

const getNotificationSectionKey = (createdAt: string): NotificationSection['key'] => {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return 'older';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = startOfToday - createdTime;

  if (createdTime >= startOfToday) {
    return 'today';
  }

  if (diff < 6 * 24 * 60 * 60 * 1000) {
    return 'week';
  }

  return 'older';
};

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
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

  const groupedNotifications = useMemo(() => {
    const sections: NotificationSection[] = [
      { key: 'today', title: 'Hôm nay', items: [] },
      { key: 'week', title: '7 ngày gần đây', items: [] },
      { key: 'older', title: 'Cũ hơn', items: [] },
    ];

    const sectionMap = new Map(sections.map((section) => [section.key, section]));

    for (const notification of filteredNotifications) {
      sectionMap.get(getNotificationSectionKey(notification.createdAt))?.items.push(notification);
    }

    return sections.filter((section) => section.items.length > 0);
  }, [filteredNotifications]);

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

  const handleCommunityInviteAction = async (
    notificationId: string,
    communityId: string,
    action: 'accept' | 'decline',
  ) => {
    const actionKey = `${notificationId}:${action}`;

    try {
      setPendingActionKey(actionKey);
      await communitiesApi.respondToInvite(communityId, action);
      await markNotificationAsRead(notificationId);
      toast.success(
        action === 'accept'
          ? 'Đã chấp nhận lời mời tham gia cộng đồng.'
          : 'Đã từ chối lời mời tham gia cộng đồng.',
      );
      await refreshNotifications();
    } catch (error) {
      if (isResolvedInviteError(error)) {
        await markNotificationAsRead(notificationId);
        toast.success('Lời mời đã được hủy hoặc xử lý trước đó.');
        await refreshNotifications();
        return;
      }
      toast.error(
        getErrorMessage(
          error,
          action === 'accept'
            ? 'Không thể chấp nhận lời mời lúc này.'
            : 'Không thể từ chối lời mời lúc này.',
        ),
      );
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleRefereeInviteAction = async (
    notificationId: string,
    tournamentId: string,
    refereeId: string,
    action: 'ACCEPT' | 'DECLINE',
  ) => {
    const actionKey = `${notificationId}:${action}`;

    try {
      setPendingActionKey(actionKey);
      await tournamentsApi.respondToRefereeInvite(tournamentId, refereeId, action);
      await markNotificationAsRead(notificationId);
      toast.success(action === 'ACCEPT' ? 'Đã nhận vai trò trọng tài.' : 'Đã từ chối lời mời trọng tài.');
      await refreshNotifications();
    } catch (error) {
      if (isResolvedInviteError(error)) {
        await markNotificationAsRead(notificationId);
        toast.success('Lời mời trọng tài đã được hủy hoặc xử lý trước đó.');
        await refreshNotifications();
        return;
      }
      toast.error(
        getErrorMessage(
          error,
          action === 'ACCEPT'
            ? 'Không thể chấp nhận lời mời trọng tài lúc này.'
            : 'Không thể từ chối lời mời trọng tài lúc này.',
        ),
      );
    } finally {
      setPendingActionKey(null);
    }
  };

  const handlePartnerInviteAction = async (
    notificationId: string,
    participantId: string,
    action: 'accept' | 'decline',
  ) => {
    const actionKey = `${notificationId}:${action}`;

    try {
      setPendingActionKey(actionKey);
      if (action === 'accept') {
        await tournamentsApi.acceptPartnerInvite(participantId);
      } else {
        await tournamentsApi.rejectPartnerInvite(participantId);
      }
      await markNotificationAsRead(notificationId);
      toast.success(
        action === 'accept'
          ? 'Đã chấp nhận lời mời ghép đôi.'
          : 'Đã từ chối lời mời ghép đôi.',
      );
      await refreshNotifications();
    } catch (error) {
      if (isResolvedInviteError(error)) {
        await markNotificationAsRead(notificationId);
        toast.success('Lời mời ghép đôi đã được hủy hoặc xử lý trước đó.');
        await refreshNotifications();
        return;
      }
      toast.error(
        getErrorMessage(
          error,
          action === 'accept'
            ? 'Không thể chấp nhận lời mời lúc này.'
            : 'Không thể từ chối lời mời lúc này.',
        ),
      );
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleFootballTeamInviteAction = async (
    notificationId: string,
    teamId: string,
    action: 'ACCEPTED' | 'DECLINED',
  ) => {
    const actionKey = `${notificationId}:${action}`;
    try {
      setPendingActionKey(actionKey);
      await footballTeamsApi.respondInvite(teamId, action);
      await markNotificationAsRead(notificationId);
      toast.success(action === 'ACCEPTED' ? 'Đã tham gia đội bóng.' : 'Đã từ chối lời mời vào đội bóng.');
      await refreshNotifications();
    } catch (error) {
      if (isResolvedInviteError(error)) {
        await markNotificationAsRead(notificationId);
        toast.success('Lời mời đội bóng đã được hủy hoặc xử lý trước đó.');
        await refreshNotifications();
        return;
      }
      toast.error(getErrorMessage(error, action === 'ACCEPTED' ? 'Không thể nhận lời mời đội bóng.' : 'Không thể từ chối lời mời đội bóng.'));
    } finally {
      setPendingActionKey(null);
    }
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
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
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
                    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Đánh dấu tất cả
              </button>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Tổng số
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{notifications.length}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Chưa đọc
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{unreadCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
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
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
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
                    className="rounded-2xl border border-slate-100 p-5"
                  >
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
                      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {section.title}
                      </h2>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <div className="space-y-3">
                      {section.items.map((notification) => (
                        <article
                          key={notification.id}
                          className={cn(
                            'rounded-2xl border p-5 transition-all',
                            notification.isRead
                              ? 'border-slate-200 bg-white hover:border-slate-300'
                              : 'border-slate-200 bg-slate-50/85 shadow-sm',
                          )}
                        >
                          {(() => {
                            const notificationAction = getNotificationActionConfig(notification);

                            return (
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
                                        'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                                        getNotificationTypeMeta(notification.type).badgeClassName,
                                      )}
                                    >
                                      {getNotificationTypeLabel(notification.type)}
                                    </span>
                                    {!notification.isRead ? (
                                      <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                        {getNotificationSummary(notification.type)}
                                      </span>
                                    ) : null}
                                    <span className="text-xs font-medium text-slate-400">
                                      {formatNotificationTimestamp(notification.createdAt)}
                                    </span>
                                    <span
                                      className={cn(
                                        'inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                        notification.isRead
                                          ? 'bg-slate-100 text-slate-500'
                                          : 'bg-blue-600 text-white',
                                      )}
                                    >
                                      {notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                                    </span>
                                  </div>
                                  <h2
                                    className={cn(
                                      'text-lg font-semibold',
                                      notification.isRead ? 'text-slate-800' : 'text-slate-950',
                                    )}
                                  >
                                    {notification.title}
                                  </h2>
                                  <p
                                    className={cn(
                                      'mt-2.5 text-sm leading-6',
                                      notification.isRead ? 'text-slate-500' : 'text-slate-600',
                                    )}
                                  >
                                    {notification.content}
                                  </p>
                                </button>

                                <div className="flex flex-wrap items-center gap-2 pt-1 md:ml-4 md:justify-end">
                                  {(notificationAction?.kind === 'community-invite' || notificationAction?.kind === 'referee-invite' || notificationAction?.kind === 'partner-invite' || notificationAction?.kind === 'football-team-invite') && !notification.isRead ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={pendingActionKey !== null}
                                        onClick={() => {
                                          if (notificationAction.kind === 'community-invite' && notificationAction.communityId) {
                                            void handleCommunityInviteAction(notification.id, notificationAction.communityId, 'accept');
                                            return;
                                          }

                                          if (
                                            notificationAction.kind === 'referee-invite' &&
                                            notificationAction.tournamentId &&
                                            notificationAction.refereeId
                                          ) {
                                            void handleRefereeInviteAction(
                                              notification.id,
                                              notificationAction.tournamentId,
                                              notificationAction.refereeId,
                                              'ACCEPT',
                                            );
                                            return;
                                          }

                                          if (
                                            notificationAction.kind === 'partner-invite' &&
                                            notificationAction.participantId
                                          ) {
                                            void handlePartnerInviteAction(notification.id, notificationAction.participantId, 'accept');
                                            return;
                                          }

                                          if (
                                            notificationAction.kind === 'football-team-invite' &&
                                            notificationAction.teamId
                                          ) {
                                            void handleFootballTeamInviteAction(notification.id, notificationAction.teamId, 'ACCEPTED');
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <Check className="h-4 w-4" />
                                        {notificationAction.kind === 'referee-invite' ? 'Nhận vai trò' : 'Đồng ý'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={pendingActionKey !== null}
                                        onClick={() => {
                                          if (notificationAction.kind === 'community-invite' && notificationAction.communityId) {
                                            void handleCommunityInviteAction(notification.id, notificationAction.communityId, 'decline');
                                            return;
                                          }

                                          if (
                                            notificationAction.kind === 'referee-invite' &&
                                            notificationAction.tournamentId &&
                                            notificationAction.refereeId
                                          ) {
                                            void handleRefereeInviteAction(
                                              notification.id,
                                              notificationAction.tournamentId,
                                              notificationAction.refereeId,
                                              'DECLINE',
                                            );
                                            return;
                                          }

                                          if (
                                            notificationAction.kind === 'partner-invite' &&
                                            notificationAction.participantId
                                          ) {
                                            void handlePartnerInviteAction(notification.id, notificationAction.participantId, 'decline');
                                            return;
                                          }

                                          if (
                                            notificationAction.kind === 'football-team-invite' &&
                                            notificationAction.teamId
                                          ) {
                                            void handleFootballTeamInviteAction(notification.id, notificationAction.teamId, 'DECLINED');
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <X className="h-4 w-4" />
                                        Từ chối
                                      </button>
                                    </>
                                  ) : null}

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
                                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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
                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                                  >
                                    Mở
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
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

