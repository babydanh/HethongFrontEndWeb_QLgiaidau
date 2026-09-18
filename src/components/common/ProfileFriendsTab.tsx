'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Users,
  Search,
  UserCheck,
  UserPlus,
  UserRoundX,
  MessageCircle,
  Loader2,
  Check,
  X,
  Clock,
  Send,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { socialApi, type FriendshipListItem } from '@/features/social/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';

type SubTab = 'friends' | 'incoming' | 'outgoing';

interface ProfileFriendsTabProps {
  onOpenDirectChat?: (friendId: string) => void;
}

export default function ProfileFriendsTab({ onOpenDirectChat }: ProfileFriendsTabProps) {
  const t = useTranslations('Profile');
  const tCommon = useTranslations('Common');

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<FriendshipListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchFriends = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await socialApi.getFriends();
      const list = Array.isArray(res) ? res : ((res as unknown as { data?: FriendshipListItem[] })?.data || []);
      setItems(list);
    } catch {
      toast.error(tCommon('friendActionFailed'));
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    fetchFriends(true);
  }, [fetchFriends]);

  // Phân loại danh sách
  const acceptedFriends = useMemo(
    () => items.filter((item) => item.status === 'ACCEPTED'),
    [items]
  );

  const incomingRequests = useMemo(
    () => items.filter((item) => item.status === 'PENDING' && item.direction === 'INCOMING'),
    [items]
  );

  const outgoingRequests = useMemo(
    () => items.filter((item) => item.status === 'PENDING' && item.direction === 'OUTGOING'),
    [items]
  );

  // Lọc theo search query
  const filteredAccepted = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return acceptedFriends;
    return acceptedFriends.filter((item) =>
      (item.friendName || '').toLowerCase().includes(q)
    );
  }, [acceptedFriends, searchQuery]);

  const filteredIncoming = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return incomingRequests;
    return incomingRequests.filter((item) =>
      (item.friendName || '').toLowerCase().includes(q)
    );
  }, [incomingRequests, searchQuery]);

  const filteredOutgoing = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return outgoingRequests;
    return outgoingRequests.filter((item) =>
      (item.friendName || '').toLowerCase().includes(q)
    );
  }, [outgoingRequests, searchQuery]);

  // Xử lý Chấp nhận lời mời
  const handleAccept = async (friendshipId: string) => {
    setActionInProgress(friendshipId);
    try {
      await socialApi.respondToFriendRequest(friendshipId, 'ACCEPTED');
      toast.success(tCommon('friendAcceptSuccess'));
      await fetchFriends();
    } catch {
      toast.error(tCommon('friendActionFailed'));
    } finally {
      setActionInProgress(null);
    }
  };

  // Xử lý Từ chối lời mời
  const handleReject = async (friendshipId: string) => {
    setActionInProgress(friendshipId);
    try {
      await socialApi.respondToFriendRequest(friendshipId, 'REJECTED');
      toast.success(tCommon('friendRejectSuccess'));
      await fetchFriends();
    } catch {
      toast.error(tCommon('friendActionFailed'));
    } finally {
      setActionInProgress(null);
    }
  };

  // Xử lý Thu hồi lời mời
  const handleCancelRequest = async (friendshipId: string) => {
    if (!window.confirm(t('cancelRequestConfirm'))) return;
    setActionInProgress(friendshipId);
    try {
      await socialApi.removeFriendship(friendshipId);
      toast.success(tCommon('friendCancelSuccess'));
      await fetchFriends();
    } catch {
      toast.error(tCommon('friendActionFailed'));
    } finally {
      setActionInProgress(null);
    }
  };

  // Xử lý Hủy kết bạn
  const handleUnfriend = async (friendshipId: string, friendName: string | null) => {
    const confirmMsg = t('unfriendConfirmTitle', { name: friendName || t('chatWithFriend') });
    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(friendshipId);
    try {
      await socialApi.removeFriendship(friendshipId);
      toast.success(tCommon('friendUnfriendSuccess'));
      await fetchFriends();
    } catch {
      toast.error(tCommon('friendActionFailed'));
    } finally {
      setActionInProgress(null);
    }
  };

  // Kích hoạt nhắn tin trực tiếp
  const handleChat = (friendId: string) => {
    if (onOpenDirectChat) {
      onOpenDirectChat(friendId);
      return;
    }
    try {
      window.dispatchEvent(
        new CustomEvent('sporto:open-direct-chat', {
          detail: { userId: friendId },
        })
      );
    } catch (error) {
      console.error('Failed to dispatch direct chat event', error);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Sub-tabs Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {t('friends')}
              </h3>
              <p className="text-xs text-slate-500">
                {acceptedFriends.length} {t('allFriends').toLowerCase()}
              </p>
            </div>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchFriendsPlaceholder')}
              className="pl-9 pr-3 py-1.5 h-9 text-xs rounded-lg border-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2 pt-3.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('friends')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
              activeSubTab === 'friends'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t('allFriends')}</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeSubTab === 'friends'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              )}
            >
              {acceptedFriends.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('incoming')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer relative',
              activeSubTab === 'incoming'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('incomingRequests')}</span>
            {incomingRequests.length > 0 && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  activeSubTab === 'incoming'
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-600 text-white animate-pulse'
                )}
              >
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('outgoing')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
              activeSubTab === 'outgoing'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('outgoingRequests')}</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeSubTab === 'outgoing'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              )}
            >
              {outgoingRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-slate-400 font-medium">{tCommon('friendLoading')}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TẤT CẢ BẠN BÈ */}
          {activeSubTab === 'friends' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              {filteredAccepted.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    {searchQuery ? tCommon('friendUnavailable') : t('noFriendsFound')}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {searchQuery ? tCommon('friendActionFailed') : t('noFriendsFoundHint')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredAccepted.map((item) => {
                    const isBusy = actionInProgress === item.friendshipId;
                    return (
                      <div
                        key={item.friendshipId}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition group"
                      >
                        <Link
                          href={`/users/${item.friendId}`}
                          className="flex items-center gap-3 min-w-0 flex-1 pr-2"
                        >
                          <Avatar className="w-11 h-11 border border-slate-200 shadow-2xs shrink-0">
                            <AvatarImage src={item.friendAvatar || undefined} />
                            <AvatarFallback className="bg-blue-50 text-blue-700 font-bold text-sm">
                              {item.friendName?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {item.friendName || tCommon('anonymousUser')}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{tCommon('friendAccepted')}</span>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleChat(item.friendId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-98 transition shadow-2xs cursor-pointer"
                            title={t('chatWithFriend')}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('chatWithFriend')}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUnfriend(item.friendshipId, item.friendName)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition disabled:opacity-50 cursor-pointer"
                            title={t('unfriendAction')}
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            ) : (
                              <UserRoundX className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LỜI MỜI ĐÃ NHẬN */}
          {activeSubTab === 'incoming' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              {filteredIncoming.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    {t('noIncomingRequests')}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('noFriendsFoundHint')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredIncoming.map((item) => {
                    const isBusy = actionInProgress === item.friendshipId;
                    return (
                      <div
                        key={item.friendshipId}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 hover:bg-white hover:border-blue-300 hover:shadow-xs transition"
                      >
                        <Link
                          href={`/users/${item.friendId}`}
                          className="flex items-center gap-3 min-w-0 flex-1 pr-2"
                        >
                          <Avatar className="w-11 h-11 border border-slate-200 shadow-2xs shrink-0">
                            <AvatarImage src={item.friendAvatar || undefined} />
                            <AvatarFallback className="bg-blue-50 text-blue-700 font-bold text-sm">
                              {item.friendName?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">
                              {item.friendName || tCommon('anonymousUser')}
                            </h4>
                            <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                              {t('incomingRequests')}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleAccept(item.friendshipId)}
                            className="bg-blue-600 text-white font-semibold text-xs px-3 py-1.5 h-auto rounded-lg"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1" />
                            )}
                            {tCommon('friendAccept')}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleReject(item.friendshipId)}
                            className="border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600 text-xs px-2.5 py-1.5 h-auto rounded-lg"
                          >
                            {tCommon('friendReject')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LỜI MỜI ĐÃ GỬI */}
          {activeSubTab === 'outgoing' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              {filteredOutgoing.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Send className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    {t('noOutgoingRequests')}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('noFriendsFoundHint')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredOutgoing.map((item) => {
                    const isBusy = actionInProgress === item.friendshipId;
                    return (
                      <div
                        key={item.friendshipId}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition"
                      >
                        <Link
                          href={`/users/${item.friendId}`}
                          className="flex items-center gap-3 min-w-0 flex-1 pr-2"
                        >
                          <Avatar className="w-11 h-11 border border-slate-200 shadow-2xs shrink-0">
                            <AvatarImage src={item.friendAvatar || undefined} />
                            <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-sm">
                              {item.friendName?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">
                              {item.friendName || tCommon('anonymousUser')}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{tCommon('friendRequestSent')}</span>
                            </div>
                          </div>
                        </Link>

                        <div className="shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleCancelRequest(item.friendshipId)}
                            className="border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600 text-xs px-3 py-1.5 h-auto rounded-lg"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <UserRoundX className="w-3.5 h-3.5 mr-1" />
                            )}
                            {tCommon('friendCancel')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
