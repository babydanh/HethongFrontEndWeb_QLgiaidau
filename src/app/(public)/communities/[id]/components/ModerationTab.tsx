'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Ban,
  Check,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { communitiesApi, type CommunityMemberRecord, type CommunityReport } from '@/features/communities/api';
import type { CommunityPost } from '@/types/community-social';
import { usersApi } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import CommunityAvatar from './CommunityAvatar';

interface UserSearchResult {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export default function ModerationTab({
  communityId,
  isOwner,
}: {
  communityId: string;
  isOwner: boolean;
}) {
  const translate = useTranslations('Common');
  const locale = useLocale();
  const { openUserProfile } = useUserProfileModalStore();
  const [requests, setRequests] = useState<CommunityMemberRecord[]>([]);
  const [invitedMembers, setInvitedMembers] = useState<CommunityMemberRecord[]>([]);
  const [bannedMembers, setBannedMembers] = useState<CommunityMemberRecord[]>([]);
  const [memberRecords, setMemberRecords] = useState<CommunityMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isInviting, setIsInviting] = useState<Record<string, boolean>>({});
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'MODERATOR'>('MEMBER');
  const [cancelInviteUserId, setCancelInviteUserId] = useState<string | null>(null);
  const [unbanUserId, setUnbanUserId] = useState<string | null>(null);
  const [pendingPosts, setPendingPosts] = useState<CommunityPost[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);

  const joinedMembers = useMemo(
    () => memberRecords.filter((item) => item.member?.status === 'JOINED'),
    [memberRecords],
  );
  const occupiedUserIds = useMemo(
    () => new Set(memberRecords.map((item) => item.user?.id).filter(Boolean)),
    [memberRecords],
  );

  const triggerRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [reqRes, memRes, pendingRes, reportRes] = await Promise.all([
          communitiesApi.getJoinRequests(communityId),
          communitiesApi.getMembers(communityId, { limit: 200 }),
          communitiesApi.getPendingPosts(communityId),
          communitiesApi.getCommunityReports(communityId, 'OPEN'),
        ]);

        if (!active) {
          return;
        }

        const allMembers = memRes.data || [];
        setMemberRecords(allMembers);
        setRequests(reqRes.data || []);
        setInvitedMembers(allMembers.filter((m) => m.member?.status === 'INVITED'));
        setBannedMembers(allMembers.filter((m) => m.member?.status === 'BANNED'));
        setPendingPosts((pendingRes.data || []).map((post) => ({
          id: post.id,
          communityId: post.communityId,
          author: post.author ?? { id: post.authorId, fullName: translate('clubMemberFallback'), avatarUrl: null },
          content: post.body || '',
          imageUrls: post.mediaUrls || [],
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          reactionCount: post.reactionCount || 0,
          commentCount: post.commentCount || 0,
          topics: post.topics || [],
          mentions: post.mentions || [],
        })));
        setReports(reportRes.data || []);
      } catch (error) {
        console.error('Failed to fetch moderation data', error);
        if (active) {
          toast.error(getErrorMessage(error, translate('moderationLoadFailed')));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [communityId, refreshTrigger, translate]);

  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearchingUsers(true);
        const list = await usersApi.searchUsers(userSearchQuery);
        setSearchResults(
          (list || [])
            .filter((user) => !occupiedUserIds.has(user.id))
            .map((user) => ({
              id: user.id,
              email: user.email || '',
              fullName: user.fullName || undefined,
              avatarUrl: user.avatarUrl || undefined,
            })),
        );
      } catch (error) {
        console.error('Search users error', error);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const timer = setTimeout(searchUsers, 400);
    return () => clearTimeout(timer);
  }, [occupiedUserIds, userSearchQuery]);

  const handleReview = async (memberId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await communitiesApi.reviewJoinRequest(communityId, memberId, action);
      toast.success(action === 'APPROVE' ? translate('memberApproved') : translate('memberRejected'));
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, translate('moderationRequestFailed')));
    }
  };

  const handleInvite = async (targetUserId: string) => {
    try {
      setIsInviting((prev) => ({ ...prev, [targetUserId]: true }));
      await communitiesApi.inviteMember(communityId, { userId: targetUserId, role: inviteRole });
      toast.success(translate('inviteSent'));
      setUserSearchQuery('');
      setSearchResults([]);
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, translate('inviteFailed')));
    } finally {
      setIsInviting((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleCancelInvite = async (userId: string) => {
    try {
      await communitiesApi.removeMember(communityId, userId);
      toast.success(translate('inviteRevoked'));
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, translate('revokeInviteFailed')));
    }
  };

  const handleUnbanMember = async (userId: string) => {
    try {
      await communitiesApi.unbanMember(communityId, userId);
      toast.success(translate('memberUnbanned'));
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, translate('unbanFailed')));
    }
  };

  const handleModeratePost = async (postId: string, status: 'PUBLISHED' | 'REJECTED') => {
    try {
      await communitiesApi.moderatePost(communityId, postId, status);
      setPendingPosts((posts) => posts.filter((post) => post.id !== postId));
      toast.success(status === 'PUBLISHED' ? translate('postApproved') : translate('postRejected'));
    } catch (error) {
      toast.error(getErrorMessage(error, translate('postModerationFailed')));
    }
  };

  const handleReportStatus = async (reportId: string, status: CommunityReport['status']) => {
    try {
      await communitiesApi.updateCommunityReport(communityId, reportId, status);
      setReports((items) => items.filter((item) => item.id !== reportId));
      toast.success(status === 'DISMISSED' ? translate('reportDismissed') : translate('reportResolved'));
    } catch (error) {
      toast.error(getErrorMessage(error, translate('reportUpdateFailed')));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-6 shadow-sm xl:col-span-2">
        <div className="mb-5 flex items-center gap-2 border-b border-amber-100 pb-3">
          <Ban className="h-4 w-4 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">{translate('pendingPostsTitle')}</h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{pendingPosts.length}</span>
        </div>
        {pendingPosts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-amber-200 bg-white px-4 py-8 text-center text-sm text-slate-500">{translate('noPendingPosts')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingPosts.map((post) => (
              <article key={post.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{post.author.fullName}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.content || translate('imagePostFallback')}</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => handleModeratePost(post.id, 'PUBLISHED')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">{translate('approveAction')}</button>
                  <button type="button" onClick={() => handleModeratePost(post.id, 'REJECTED')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">{translate('rejectAction')}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-6 shadow-sm xl:col-span-2">
        <div className="mb-5 flex items-center gap-2 border-b border-rose-100 pb-3"><Ban className="h-4 w-4 text-rose-600" /><div><h3 className="text-lg font-bold text-slate-900">{translate('reportPostsTitle')}</h3><p className="text-xs text-slate-500">{translate('reportPostsDescription')}</p></div><span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{reports.length}</span></div>
        {reports.length === 0 ? <p className="rounded-lg border border-dashed border-rose-200 bg-white px-4 py-8 text-center text-sm text-slate-500">{translate('noOpenReports')}</p> : <div className="space-y-3">{reports.map((report) => <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{report.reason === 'SPAM' ? translate('reportReasonSpam') : report.reason === 'HARASSMENT' ? translate('reportReasonHarassment') : report.reason === 'HATE' ? translate('reportReasonHate') : report.reason === 'SEXUAL' ? translate('reportReasonSexual') : report.reason === 'VIOLENCE' ? translate('reportReasonViolence') : translate('reportReasonOther')}</p><p className="mt-1 text-xs text-slate-500">{translate('reportedBy')} {report.reporter?.fullName || report.reporter?.email || translate('unknownMember')} · {new Date(report.createdAt).toLocaleString(locale)}</p></div><span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700">{translate('openStatus')}</span></div>{report.details && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{report.details}</p>}{report.post?.body && <p className="mt-3 line-clamp-2 text-sm text-slate-600">“{report.post.body}”</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void handleReportStatus(report.id, 'DISMISSED')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">{translate('dismissReport')}</button><button type="button" onClick={() => void handleReportStatus(report.id, 'RESOLVED')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">{translate('resolveReport')}</button></div></article>)}</div>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="h-4 w-4 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">{translate('pendingJoinRequests')}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {requests.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {translate('loadingData')}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {translate('noJoinRequests')}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const userId = req.member?.userId || req.user?.id || '';
              const fullName = req.user?.fullName || req.user?.email || translate('unknownMember');
              const avatarUrl = req.user?.avatarUrl;
              const joinedAt = req.member?.joinedAt;
              const joinAnswers = req.member?.joinAnswers;

              return (
                <article key={req.member?.id || userId} className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 shadow-2xs">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (userId) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            openUserProfile(
                              {
                                id: userId,
                                fullName,
                                avatarUrl,
                                joinedAt,
                              },
                              rect,
                              communityId,
                            );
                          }
                        }}
                        className="flex items-center gap-3 text-left group focus:outline-none"
                      >
                        <CommunityAvatar src={avatarUrl} name={fullName} size={40} />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {fullName}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {translate('submittedAt', { date: joinedAt ? new Date(joinedAt).toLocaleDateString(locale) : translate('unknownDate') })}
                          </p>
                        </div>
                      </button>

                      {joinAnswers && Object.keys(joinAnswers).length > 0 ? (
                        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                          {Object.entries(joinAnswers).map(([question, answer]) => (
                            <div key={question} className="text-xs">
                              <p className="font-semibold text-slate-700">{question}</p>
                              <p className="mt-0.5 text-slate-600 font-normal">{String(answer)}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => handleReview(userId, 'APPROVE')}
                        className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 shadow-2xs"
                        title={translate('approveAction')}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReview(userId, 'REJECT')}
                        className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600 transition-colors hover:bg-rose-50 shadow-2xs"
                        title={translate('rejectAction')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: translate('activeMembers'), value: joinedMembers.length, tone: 'text-slate-900' },
            { label: translate('pendingMembers'), value: requests.length, tone: 'text-amber-700' },
            { label: translate('invitedMembers'), value: invitedMembers.length, tone: 'text-blue-700' },
            { label: translate('bannedMembers'), value: bannedMembers.length, tone: 'text-rose-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="h-4 w-4 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">{translate('inviteNewMember')}</h3>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            {isOwner
              ? translate('ownerInviteDescription')
              : translate('moderatorInviteDescription')}
          </div>

          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {translate('inviteRoleLabel')}
            </p>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setInviteRole('MEMBER')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  inviteRole === 'MEMBER'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {translate('memberRole')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isOwner) {
                    setInviteRole('MODERATOR');
                  }
                }}
                disabled={!isOwner}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  inviteRole === 'MODERATOR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                } ${!isOwner ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {translate('moderatorRole')}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder={translate('userSearchPlaceholder')}
              type="text"
            />
            {isSearchingUsers ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
            ) : null}
          </div>

          {searchResults.length > 0 ? (
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      openUserProfile(
                        {
                          id: user.id,
                          fullName: user.fullName || translate('unknownMember'),
                          avatarUrl: user.avatarUrl,
                        },
                        rect,
                        communityId,
                      );
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left group focus:outline-none"
                  >
                    <CommunityAvatar src={user.avatarUrl} name={user.fullName || 'U'} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {user.fullName || translate('unknownMember')}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">{user.email}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleInvite(user.id)}
                    disabled={isInviting[user.id]}
                    className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-60 shadow-2xs"
                  >
                    {isInviting[user.id] ? translate('sending') : translate('inviteAction')}
                  </button>
                </div>
              ))}
            </div>
          ) : userSearchQuery.trim().length >= 2 && !isSearchingUsers ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              {translate('noMatchingUsers')}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="h-4 w-4 text-slate-600" />
            <h3 className="text-base font-bold text-slate-900">{translate('sentInvitations')}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {invitedMembers.length}
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">{translate('loadingData')}</div>
          ) : invitedMembers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">{translate('noInvitations')}</div>
          ) : (
            <div className="space-y-3">
              {invitedMembers.map((invited) => {
                const targetUserId = invited.user?.id || invited.member?.userId || '';
                const fullName = invited.user?.fullName || invited.user?.email || translate('unknownMember');
                const avatarUrl = invited.user?.avatarUrl;
                const role = invited.member?.role || 'MEMBER';

                return (
                  <div
                    key={invited.member?.id || targetUserId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs transition-all hover:bg-slate-100/70"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        if (targetUserId) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          openUserProfile(
                            {
                              id: targetUserId,
                              fullName,
                              avatarUrl,
                              role,
                              joinedAt: invited.member?.joinedAt,
                            },
                            rect,
                            communityId,
                          );
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left group focus:outline-none"
                    >
                      <CommunityAvatar src={avatarUrl} name={fullName} size={36} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {fullName}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-slate-400">
                          {role === 'MODERATOR' ? translate('moderatorRole') : translate('memberRole')} • {translate('pendingMemberStatus')}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => targetUserId && setCancelInviteUserId(targetUserId)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 shadow-2xs transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shrink-0"
                      title={translate('revokeInviteAction')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Ban className="h-4 w-4 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">{translate('bannedMembers')}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {bannedMembers.length}
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">{translate('loadingData')}</div>
          ) : bannedMembers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">{translate('noBannedMembers')}</div>
          ) : (
            <div className="space-y-3">
              {bannedMembers.map((member) => {
                const targetUserId = member.user?.id || member.member?.userId || '';
                const fullName = member.user?.fullName || member.user?.email || translate('unknownMember');
                const avatarUrl = member.user?.avatarUrl;

                return (
                  <div
                    key={member.member?.id || targetUserId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        if (targetUserId) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          openUserProfile(
                            {
                              id: targetUserId,
                              fullName,
                              avatarUrl,
                              role: member.member?.role,
                              joinedAt: member.member?.joinedAt,
                            },
                            rect,
                            communityId,
                          );
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left group focus:outline-none"
                    >
                      <CommunityAvatar src={avatarUrl} name={fullName} size={36} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                          {fullName}
                        </p>
                        <p className="truncate text-[11px] font-medium text-rose-500">{translate('bannedFromCommunity')}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => targetUserId && setUnbanUserId(targetUserId)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-blue-600 shadow-2xs transition-colors hover:bg-blue-50 hover:border-blue-200 shrink-0"
                      title={translate('unbanAction')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {/* Cancel Invite Confirmation Modal */}
      <ConfirmModal
        open={cancelInviteUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelInviteUserId(null);
          }
        }}
        title={translate('revokeInviteAction')}
        description={translate('revokeInviteConfirmDescription')}
        confirmLabel={translate('revokeInviteAction')}
        variant="danger"
        onConfirm={() => {
          if (cancelInviteUserId) {
            const userId = cancelInviteUserId;
            setCancelInviteUserId(null);
            handleCancelInvite(userId);
          }
        }}
      />

      {/* Unban Member Confirmation Modal */}
      <ConfirmModal
        open={unbanUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUnbanUserId(null);
          }
        }}
        title={translate('unbanMemberTitle')}
        description={translate('unbanConfirmDescription')}
        confirmLabel={translate('unbanAction')}
        variant="danger"
        onConfirm={() => {
          if (unbanUserId) {
            const userId = unbanUserId;
            setUnbanUserId(null);
            handleUnbanMember(userId);
          }
        }}
      />
    </div>
  );
}
