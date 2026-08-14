'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { communitiesApi, type CommunityMemberRecord } from '@/features/communities/api';
import type { CommunityPost } from '@/types/community-social';
import { usersApi } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';
import ConfirmModal from '@/components/ui/ConfirmModal';

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
        const [reqRes, memRes, pendingRes] = await Promise.all([
          communitiesApi.getJoinRequests(communityId),
          communitiesApi.getMembers(communityId, { limit: 200 }),
          communitiesApi.getPendingPosts(communityId),
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
          author: post.author ?? { id: post.authorId, fullName: 'Thành viên CLB', avatarUrl: null },
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
      } catch (error) {
        console.error('Failed to fetch moderation data', error);
        if (active) {
          toast.error(getErrorMessage(error, 'Không thể tải dữ liệu điều phối cộng đồng.'));
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
  }, [communityId, refreshTrigger]);

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
      toast.success(action === 'APPROVE' ? 'Đã duyệt thành viên.' : 'Đã từ chối đơn tham gia.');
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xử lý đơn tham gia.'));
    }
  };

  const handleInvite = async (targetUserId: string) => {
    try {
      setIsInviting((prev) => ({ ...prev, [targetUserId]: true }));
      await communitiesApi.inviteMember(communityId, { userId: targetUserId, role: inviteRole });
      toast.success('Đã gửi lời mời tham gia.');
      setUserSearchQuery('');
      setSearchResults([]);
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể gửi lời mời.'));
    } finally {
      setIsInviting((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleCancelInvite = async (userId: string) => {
    try {
      await communitiesApi.removeMember(communityId, userId);
      toast.success('Đã thu hồi lời mời.');
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể thu hồi lời mời.'));
    }
  };

  const handleUnbanMember = async (userId: string) => {
    try {
      await communitiesApi.unbanMember(communityId, userId);
      toast.success('Đã gỡ cấm thành viên.');
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể gỡ cấm thành viên.'));
    }
  };

  const handleModeratePost = async (postId: string, status: 'PUBLISHED' | 'REJECTED') => {
    try {
      await communitiesApi.moderatePost(communityId, postId, status);
      setPendingPosts((posts) => posts.filter((post) => post.id !== postId));
      toast.success(status === 'PUBLISHED' ? 'Đã duyệt bài viết.' : 'Đã từ chối bài viết.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xử lý bài viết.'));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-6 shadow-sm xl:col-span-2">
        <div className="mb-5 flex items-center gap-2 border-b border-amber-100 pb-3">
          <Ban className="h-4 w-4 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">Bài viết chờ duyệt</h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{pendingPosts.length}</span>
        </div>
        {pendingPosts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-amber-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Không có bài viết chờ duyệt.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingPosts.map((post) => (
              <article key={post.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{post.author.fullName}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.content || '(Bài viết hình ảnh)'}</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => handleModeratePost(post.id, 'PUBLISHED')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Duyệt</button>
                  <button type="button" onClick={() => handleModeratePost(post.id, 'REJECTED')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Từ chối</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="h-4 w-4 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Đơn tham gia chờ duyệt</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {requests.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang tải dữ liệu...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Chưa có đơn xin tham gia nào.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const userId = req.member?.userId || '';
              const fullName = req.user?.fullName || req.user?.email || 'Người dùng';
              const joinedAt = req.member?.joinedAt;
              const joinAnswers = req.member?.joinAnswers;

              return (
                <article key={req.member?.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900">{fullName}</h4>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Gửi đơn: {joinedAt ? new Date(joinedAt).toLocaleDateString('vi-VN') : 'Không rõ'}
                      </p>

                      {joinAnswers && Object.keys(joinAnswers).length > 0 ? (
                        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                          {Object.entries(joinAnswers).map(([question, answer]) => (
                            <div key={question} className="text-xs">
                              <p className="font-semibold text-slate-700">{question}</p>
                              <p className="mt-1 text-slate-500">{String(answer)}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => handleReview(userId, 'APPROVE')}
                        className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
                        title="Duyệt"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReview(userId, 'REJECT')}
                        className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600 transition-colors hover:bg-rose-50"
                        title="Từ chối"
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
            { label: 'Đang hoạt động', value: joinedMembers.length, tone: 'text-slate-900' },
            { label: 'Chờ duyệt', value: requests.length, tone: 'text-amber-700' },
            { label: 'Đã mời', value: invitedMembers.length, tone: 'text-blue-700' },
            { label: 'Đã cấm', value: bannedMembers.length, tone: 'text-rose-700' },
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
            <h3 className="text-lg font-bold text-slate-900">Mời thành viên mới</h3>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            {isOwner
              ? 'Chủ sở hữu có thể mời người dùng vào vai trò Thành viên hoặc Quản trị viên.'
              : 'Quản trị viên chỉ có thể mời người dùng vào vai trò Thành viên.'}
          </div>

          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Vai trò khi mời
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
                Thành viên
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
                Quản trị viên
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên hoặc email..."
              type="text"
            />
            {isSearchingUsers ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
            ) : null}
          </div>

          {searchResults.length > 0 ? (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.fullName || 'Người dùng'}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(user.id)}
                    disabled={isInviting[user.id]}
                    className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-60"
                  >
                    {isInviting[user.id] ? 'Đang gửi...' : 'Mời'}
                  </button>
                </div>
              ))}
            </div>
          ) : userSearchQuery.trim().length >= 2 && !isSearchingUsers ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              Không tìm thấy người dùng phù hợp hoặc họ đã có trạng thái trong cộng đồng.
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="h-4 w-4 text-slate-600" />
            <h3 className="text-base font-bold text-slate-900">Lời mời đã gửi</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {invitedMembers.length}
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Đang tải...</div>
          ) : invitedMembers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">Chưa có lời mời nào.</div>
          ) : (
            <div className="space-y-3">
              {invitedMembers.map((invited) => (
                <div key={invited.member?.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{invited.user?.fullName || 'Người dùng'}</p>
                    <p className="truncate text-[10px] text-slate-400">{invited.member?.role}</p>
                  </div>
                  <button
                    onClick={() => invited.user?.id && setCancelInviteUserId(invited.user.id)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Thu hồi lời mời"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Ban className="h-4 w-4 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">Thành viên đã cấm</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {bannedMembers.length}
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Đang tải...</div>
          ) : bannedMembers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">Chưa có thành viên nào bị cấm.</div>
          ) : (
            <div className="space-y-3">
              {bannedMembers.map((member) => (
                <div key={member.member?.id} className="flex items-center justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{member.user?.fullName || 'Người dùng'}</p>
                    <p className="truncate text-[10px] text-rose-500">Đang bị cấm khỏi cộng đồng</p>
                  </div>
                  <button
                    onClick={() => member.user?.id && setUnbanUserId(member.user.id)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-blue-600 transition-colors hover:bg-slate-50"
                    title="Gỡ cấm"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
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
        title="Thu hồi lời mời"
        description="Bạn có chắc chắn muốn thu hồi lời mời này?"
        confirmLabel="Thu hồi lời mời"
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
        title="Gỡ cấm thành viên"
        description="Bạn có chắc chắn muốn gỡ cấm thành viên này?"
        confirmLabel="Gỡ cấm"
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
