'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Users, Search, UserPlus, MoreVertical, ShieldAlert, ShieldCheck, Trash2, Crown, Loader2, X, Ban, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { communitiesApi, MemberStreak } from '@/features/communities/api';
import TagAssignModal from './TagAssignModal';
import { usersApi } from '@/features/users/api';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { getErrorMessage } from '@/utils/error';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface UserSearchResult {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

interface MemberData {
  member: {
    id: string;
    communityId: string;
    userId: string;
    role: 'OWNER' | 'MODERATOR' | 'MEMBER';
    status: 'JOINED' | 'PENDING' | 'INVITED' | 'REJECTED' | 'BANNED';
    joinedAt: string;
    tags?: string[];
  };
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  streak?: MemberStreak | null;
}

export default function MembersTab({ 
  communityId, 
  isOwnerOrMod, 
  isOwner, 
  userId, 
  onMembershipChange 
}: { 
  communityId: string; 
  isOwnerOrMod: boolean; 
  isOwner: boolean; 
  userId?: string;
  onMembershipChange?: () => void;
}) {
  const router = useRouter();
  const translate = useTranslations('Common');
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 50;
  
  // Menu dropdown state
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isInvitingId, setIsInvitingId] = useState<string | null>(null);

  // Transfer Confirmation state
  const [confirmTransferUserId, setConfirmTransferUserId] = useState<string | null>(null);
  const [confirmTransferName, setConfirmTransferName] = useState('');

  // Kick / Ban confirmation targets
  const [kickTarget, setKickTarget] = useState<{ userId: string; name: string } | null>(null);
  const [banTarget, setBanTarget] = useState<{ userId: string; name: string } | null>(null);

  // Tag assign target (P2C.4)
  const [tagAssignTarget, setTagAssignTarget] = useState<MemberData | null>(null);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [tagPresets, setTagPresets] = useState<Array<{ id: string; name: string; color: string }>>([]);

  useEffect(() => {
    if (!communityId) return;
    communitiesApi.getTagPresets(communityId)
      .then((res) => setTagPresets(res.data ?? []))
      .catch(() => setTagPresets([]));
  }, [communityId, isOwnerOrMod]);

  const fetchMembers = async (page = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else if (!isLoading) {
        setIsLoading(true);
      }
      const res = await communitiesApi.getMembers(communityId, {
        limit: PAGE_SIZE,
        status: 'JOINED',
        ...(cursorByPageRef.current[page] ? { cursor: cursorByPageRef.current[page] } : {}),
      });
      const data = res.data || [];
      // Only keep JOINED status members for the active list
      const joinedOnly = data.filter((m: MemberData) => m.member?.status === 'JOINED');
      setTotalMembers(res.meta?.total ?? joinedOnly.length);
      setCurrentPage(page);
      cursorByPageRef.current[page + 1] = res.meta?.nextCursor ?? null;
      setMembers((prev) => (append ? [...prev, ...joinedOnly] : joinedOnly));
    } catch (error) {
      console.error('Failed to fetch members', error);
      toast.error(translate('loadMembersFailed'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (communityId) {
      cursorByPageRef.current = { 1: null };
      Promise.resolve().then(() => {
        fetchMembers();
      });
    }
  }, [communityId]);

  // Handle User Search for Invitation
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (inviteSearch.trim().length >= 2) {
        try {
          setIsSearchingUsers(true);
          const results = await usersApi.searchUsers(inviteSearch);
          // Filter out existing members
          const filtered: UserSearchResult[] = (results || []).filter(
            (u) => !members.some(m => m.user?.id === u.id)
          ).map(u => ({
            id: u.id,
            email: u.email || '',
            fullName: u.fullName || undefined,
            avatarUrl: u.avatarUrl || undefined,
          }));
          setInviteResults(filtered);
        } catch (error) {
          console.error(error);
        } finally {
          setIsSearchingUsers(false);
        }
      } else {
        setInviteResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [inviteSearch, members]);

  const handleUpdateRole = async (targetUserId: string, newRole: 'MODERATOR' | 'MEMBER') => {
    try {
      await communitiesApi.updateMemberRole(communityId, targetUserId, newRole);
      toast.success(newRole === 'MODERATOR' ? translate('promotedToModerator') : translate('demotedToMember'));
      fetchMembers();
      setActiveMenuUserId(null);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, translate('updateRoleFailed')));
    }
  };

  const handleKickMember = async (targetUserId: string, targetName: string) => {
    try {
      await communitiesApi.removeMember(communityId, targetUserId);
      toast.success(translate('removedMember', { name: targetName }));
      fetchMembers();
      setActiveMenuUserId(null);
      if (onMembershipChange && targetUserId === userId) {
        onMembershipChange();
      }
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, translate('removeMemberFailed')));
    }
  };

  const handleBanMember = async (targetUserId: string, targetName: string) => {
    try {
      await communitiesApi.banMember(communityId, targetUserId);
      toast.success(translate('bannedMember', { name: targetName }));
      fetchMembers();
      setActiveMenuUserId(null);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, translate('banMemberFailed')));
    }
  };

  const handleTransferOwnership = async () => {
    if (!confirmTransferUserId) return;
    try {
      await communitiesApi.updateMemberRole(communityId, confirmTransferUserId, 'OWNER');
      toast.success(translate('ownershipTransferred', { name: confirmTransferName }));
      setConfirmTransferUserId(null);
      fetchMembers();
      setActiveMenuUserId(null);
      if (onMembershipChange) {
        onMembershipChange();
      }
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, translate('transferOwnershipFailed')));
    }
  };

  const handleInviteUser = async (targetUser: UserSearchResult) => {
    try {
      setIsInvitingId(targetUser.id);
      await communitiesApi.inviteMember(communityId, { userId: targetUser.id, role: 'MEMBER' });
      toast.success(translate('invitationSent', { name: targetUser.fullName || targetUser.email }));
      setInviteResults(prev => prev.filter(r => r.id !== targetUser.id));
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, translate('inviteMemberFailed')));
    } finally {
      setIsInvitingId(null);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenu = () => setActiveMenuUserId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const renderMemberPills = (item: MemberData) => {
    const pills: React.ReactNode[] = [];
    (item.member?.tags ?? []).forEach((tag) => {
      const preset = tagPresets.find((candidate) => candidate.name.toLowerCase() === tag.toLowerCase());
      pills.push(
        <span
          key={`tag-${tag}`}
          className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold"
          style={preset ? { backgroundColor: `${preset.color}26`, borderColor: `${preset.color}66`, color: preset.color } : undefined}
        >
          {tag}
        </span>
      );
    });
    if (item.streak?.type && item.streak.count > 0) {
      const streakClasses = {
        WIN: 'bg-blue-50 text-blue-700 border-blue-200',
        LOSS: 'bg-rose-50 text-rose-700 border-rose-200',
        ELO_UP: 'bg-amber-50 text-amber-700 border-amber-200',
      }[item.streak.type];
      pills.push(
        <span
          key="streak"
          className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${streakClasses}`}
        >
          {item.streak.label ||
            (item.streak.type === 'ELO_UP'
              ? `+${item.streak.count} ELO`
              : `${item.streak.type === 'WIN' ? translate('streakWin') : translate('streakLoss')} x${item.streak.count}`)}
        </span>
      );
    }
    if (pills.length === 0) return null;
    return <div className="flex flex-wrap gap-1 mt-1">{pills}</div>;
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!tagAssignTarget) return;
    try {
      setIsSavingTags(true);
      await communitiesApi.updateMemberTags(communityId, tagAssignTarget.user.id, tags);
      toast.success(translate('tagUpdated'));
      setTagAssignTarget(null);
      fetchMembers();
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, translate('tagUpdateFailed')));
    } finally {
      setIsSavingTags(false);
    }
  };

  const { openUserProfile } = useUserProfileModalStore();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  const openProfile = (targetUserId: string, targetMember?: MemberData, event?: React.MouseEvent | React.KeyboardEvent) => {
    if (!targetUserId) return;
    const rect = (event?.currentTarget as HTMLElement)?.getBoundingClientRect?.() || null;
    openUserProfile(
      {
        id: targetUserId,
        fullName: targetMember?.user?.fullName || translate('memberFallback'),
        avatarUrl: targetMember?.user?.avatarUrl || null,
        role: targetMember?.member?.role,
        tags: targetMember?.member?.tags,
        streak: targetMember?.streak,
        joinedAt: targetMember?.member?.joinedAt,
      },
      rect,
      communityId,
    );
  };

  const handleProfileKeyDown = (event: React.KeyboardEvent, targetUserId: string, targetMember?: MemberData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProfile(targetUserId, targetMember, event);
    }
  };

  const admins = members.filter(m => m.member?.role === 'OWNER' || m.member?.role === 'MODERATOR');
  const ordinaryMembers = members.filter(m => m.member?.role === 'MEMBER');

  const filteredAdmins = admins.filter(m => 
    m.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredMembers = ordinaryMembers.filter(m => 
    m.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasMore = members.length < totalMembers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            placeholder="Tìm thành viên..."
          />
        </div>
        {isOwnerOrMod && (
          <Button 
            onClick={() => setIsInviteOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {translate('inviteMember')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-slate-500 text-sm">Đang tải danh sách thành viên...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-8">
          {/* Section: Ban Quản Trị */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Ban Quản Trị
            </h4>
            
            {filteredAdmins.length === 0 ? (
              <p className="text-slate-400 text-sm italic p-2">Không tìm thấy quản trị viên phù hợp.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAdmins.map((item) => {
                  const isUserTarget = item.user?.id === userId;
                  const isOwnerRole = item.member?.role === 'OWNER';

                  return (
                    <div 
                      key={item.member?.id} 
                      role="link"
                      tabIndex={0}
                      aria-label={`Xem hồ sơ ${item.user?.fullName}`}
                      onClick={(event) => openProfile(item.user?.id, item, event)}
                      onKeyDown={(event) => handleProfileKeyDown(event, item.user?.id, item)}
                      className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-lg transition-all relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0 relative overflow-hidden">
                          {item.user?.avatarUrl ? (
                            <Image src={item.user.avatarUrl} alt={item.user.fullName} fill className="object-cover" />
                          ) : (
                            getInitials(item.user?.fullName)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                            {item.user?.fullName}
                            {isUserTarget && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">(Bạn)</span>}
                          </p>
                          {renderMemberPills(item)}
                          <p className="text-[10.5px] text-slate-400">Thành viên từ {new Date(item.member.joinedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        {isOwnerRole ? (
                          <span className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                            <Crown className="w-3.5 h-3.5" /> Owner
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5" /> Mod
                          </span>
                        )}

                        {/* Admin Controls Menu for Owner */}
                        {isOwner && !isOwnerRole && (
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuUserId(activeMenuUserId === item.user?.id ? null : item.user?.id);
                              }}
                              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeMenuUserId === item.user?.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 overflow-hidden">
                                <button
                                  onClick={() => handleUpdateRole(item.user.id, 'MEMBER')}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                                >
                                  <ShieldAlert className="w-4 h-4 text-slate-500" /> Hạ cấp thành viên
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmTransferUserId(item.user.id);
                                    setConfirmTransferName(item.user.fullName);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors font-medium"
                                >
                                  <Crown className="w-4 h-4 text-blue-600" /> Chuyển chủ sở hữu
                                </button>
                                <button
                                  onClick={() => setTagAssignTarget(item)}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                                >
                                  <Tag className="w-4 h-4 text-slate-500" /> Gán tag
                                </button>
                                <hr className="my-1 border-slate-100" />
                                <button
                                  onClick={() => setKickTarget({ userId: item.user.id, name: item.user.fullName })}
                                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" /> {translate('kickFromGroup')}
                                </button>
                                <button
                                  onClick={() => setBanTarget({ userId: item.user.id, name: item.user.fullName })}
                                  className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                >
                                  <Ban className="w-4 h-4 text-rose-600" /> {translate('banFromCommunity')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Thành viên thường */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" /> Thành viên ({filteredMembers.length})
            </h4>
            
            {filteredMembers.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                <p className="text-slate-400 text-sm">Chưa có thành viên nào khác hoặc không có kết quả phù hợp.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((item) => {
                  const isUserTarget = item.user?.id === userId;
                  
                  return (
                    <div 
                      key={item.member?.id} 
                      role="link"
                      tabIndex={0}
                      aria-label={`Xem hồ sơ ${item.user?.fullName}`}
                      onClick={(event) => openProfile(item.user?.id, item, event)}
                      onKeyDown={(event) => handleProfileKeyDown(event, item.user?.id, item)}
                      className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0 relative overflow-hidden">
                          {item.user?.avatarUrl ? (
                            <Image src={item.user.avatarUrl} alt={item.user.fullName} fill className="object-cover" />
                          ) : (
                            getInitials(item.user?.fullName)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                            {item.user?.fullName}
                            {isUserTarget && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded font-normal">(Bạn)</span>}
                          </p>
                          {renderMemberPills(item)}
                          <p className="text-[10px] text-slate-400">Tham gia {new Date(item.member.joinedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>

                      {/* Admin Controls for Mod/Owner on Ordinary Members */}
                      {isOwnerOrMod && !isUserTarget && (
                        <div className="relative" onClick={(event) => event.stopPropagation()}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuUserId(activeMenuUserId === item.user?.id ? null : item.user?.id);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          
                          {activeMenuUserId === item.user?.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 overflow-hidden">
                              {isOwner && (
                                <>
                                  <button
                                    onClick={() => handleUpdateRole(item.user.id, 'MODERATOR')}
                                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                                  >
                                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Thăng chức Quản trị viên
                                  </button>
                                  <button
                                    onClick={() => {
                                      setConfirmTransferUserId(item.user.id);
                                      setConfirmTransferName(item.user.fullName);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors font-medium"
                                  >
                                    <Crown className="w-4 h-4 text-blue-600" /> Chuyển chủ sở hữu
                                  </button>
                                  <hr className="my-1 border-slate-100" />
                                </>
                              )}
                              <button
                                onClick={() => setTagAssignTarget(item)}
                                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                              >
                                <Tag className="w-4 h-4 text-slate-500" /> Gán tag
                              </button>
                              <button
                                onClick={() => setKickTarget({ userId: item.user.id, name: item.user.fullName })}
                                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" /> {translate('kickFromGroup')}
                              </button>
                              <button
                                onClick={() => setBanTarget({ userId: item.user.id, name: item.user.fullName })}
                                className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                              >
                                <Ban className="w-4 h-4 text-rose-600" /> {translate('banFromCommunity')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isLoading && hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => fetchMembers(currentPage + 1, true)}
                disabled={isLoadingMore}
                variant="outline"
                className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 font-medium"
              >
                {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Tải thêm
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">{translate('inviteMember')} mới</h3>
              <button 
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteSearch('');
                  setInviteResults([]);
                }}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="Nhập tên hoặc email người dùng..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>

              {isSearchingUsers ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : inviteResults.length > 0 ? (
                <div className="space-y-3 max-h-[35vh] overflow-y-auto">
                  {inviteResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative">
                          {user.avatarUrl ? (
                            <Image src={user.avatarUrl} alt={user.fullName ?? 'User avatar'} fill className="object-cover" />
                          ) : (
                            getInitials(user.fullName ?? '')
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-slate-800">{user.fullName}</p>
                          <p className="text-[10px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleInviteUser(user)}
                        disabled={isInvitingId === user.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded"
                      >
                        {isInvitingId === user.id ? translate('inviting') : translate('invite')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : inviteSearch.trim().length >= 2 ? (
                <p className="text-center text-slate-400 text-xs py-4">{translate('noUsersFound')}</p>
              ) : inviteSearch.trim().length > 0 ? (
                <p className="text-center text-slate-400 text-xs py-4">Vui lòng gõ ít nhất 2 ký tự để tìm kiếm.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Confirmation Modal */}
      {confirmTransferUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center mx-auto shadow-sm">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Xác nhận chuyển chủ câu lạc bộ</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn đang thực hiện chuyển quyền sở hữu câu lạc bộ sang cho <strong className="text-slate-800">&quot;{confirmTransferName}&quot;</strong>. 
                Sau khi chuyển, vai trò của bạn sẽ bị hạ chức thành <strong className="text-slate-800">Quản trị viên (Mod)</strong> và không thể hoàn tác.
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmTransferUserId(null)}
                className="flex-1 text-xs py-2"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={handleTransferOwnership}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2"
              >
                Xác nhận chuyển
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Member Confirmation Modal */}
      <ConfirmModal
        open={kickTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setKickTarget(null);
          }
        }}
        title={translate('kickMemberTitle')}
        description={
          kickTarget
            ? translate('kickMemberConfirm', { name: kickTarget.name })
            : undefined
        }
        confirmLabel={translate('kickFromGroup')}
        variant="danger"
        onConfirm={() => {
          if (kickTarget) {
            const target = kickTarget;
            setKickTarget(null);
            handleKickMember(target.userId, target.name);
          }
        }}
      />

      {/* Ban Member Confirmation Modal */}
      <ConfirmModal
        open={banTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBanTarget(null);
          }
        }}
        title={translate('banMemberTitle')}
        description={
          banTarget
            ? translate('banMemberConfirm', { name: banTarget.name })
            : undefined
        }
        confirmLabel={translate('banFromCommunity')}
        variant="danger"
        onConfirm={() => {
          if (banTarget) {
            const target = banTarget;
            setBanTarget(null);
            handleBanMember(target.userId, target.name);
          }
        }}
      />

      {/* Tag Assign Modal (P2C.4) */}
      <TagAssignModal
        open={tagAssignTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTagAssignTarget(null);
          }
        }}
        memberName={tagAssignTarget?.user?.fullName}
        currentTags={tagAssignTarget?.member?.tags ?? []}
        presets={tagPresets}
        isSaving={isSavingTags}
        onSave={handleSaveTags}
      />
    </div>
  );
}
