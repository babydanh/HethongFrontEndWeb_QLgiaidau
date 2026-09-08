'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Modal,
  ModalContent,
  ModalTitle,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { communitiesApi, CommunityMemberRecord } from '@/features/communities/api';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { Trophy, Search, Play, Loader2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

interface ClubStandaloneMatchModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
  onMatchCreated?: () => void;
}

export function ClubStandaloneMatchModal({
  communityId,
  isOpen,
  onClose,
  onMatchCreated,
}: ClubStandaloneMatchModalProps) {
  const t = useTranslations('Common');

  const [members, setMembers] = useState<CommunityMemberRecord[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [sideAUserIds, setSideAUserIds] = useState<string[]>([]);
  const [sideBUserIds, setSideBUserIds] = useState<string[]>([]);
  const [isRanked, setIsRanked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !communityId) return;

    let mounted = true;
    setIsLoadingMembers(true);
    setLoadError(null);
    setSideAUserIds([]);
    setSideBUserIds([]);
    setIsRanked(true);
    setSearchQuery('');

    communitiesApi
      .getMembers(communityId, { limit: 100, status: 'JOINED' })
      .then((res) => {
        if (!mounted) return;
        const memberList = Array.isArray(res.data) ? res.data : [];
        const uniqueMembers = new Map<string, CommunityMemberRecord>();
        memberList.forEach((record) => {
          const userId = record.member?.userId?.trim();
          if (userId && !uniqueMembers.has(userId)) {
            uniqueMembers.set(userId, record);
          }
        });
        setMembers([...uniqueMembers.values()]);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (mounted) setIsLoadingMembers(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, communityId]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const name = (m.user?.fullName || '').toLowerCase();
      const email = (m.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, searchQuery]);

  const canSubmit =
    !isSubmitting &&
    sideAUserIds.length > 0 &&
    sideAUserIds.length === sideBUserIds.length &&
    sideAUserIds.length <= 2;

  const toggleSide = (userId: string, side: 'A' | 'B') => {
    if (side === 'A') {
      if (sideAUserIds.includes(userId)) {
        setSideAUserIds((prev) => prev.filter((id) => id !== userId));
      } else {
        if (sideAUserIds.length >= 2) return;
        setSideBUserIds((prev) => prev.filter((id) => id !== userId));
        setSideAUserIds((prev) => [...prev, userId]);
      }
    } else {
      if (sideBUserIds.includes(userId)) {
        setSideBUserIds((prev) => prev.filter((id) => id !== userId));
      } else {
        if (sideBUserIds.length >= 2) return;
        setSideAUserIds((prev) => prev.filter((id) => id !== userId));
        setSideBUserIds((prev) => [...prev, userId]);
      }
    }
  };

  const getMemberNames = (ids: string[]) => {
    return ids
      .map((id) => {
        const found = members.find((m) => m.member.userId === id);
        return found?.user?.fullName?.trim() || 'VĐV';
      })
      .join(' · ');
  };

  const handleStartMatch = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      // Trận riêng phải đi qua resource riêng, không tạo session giả.
      const matchKey = crypto.randomUUID();
      const matchType = sideAUserIds.length === 1 ? 'SINGLES' : 'DOUBLES';
      await clubMatchSessionsApi.createStandaloneMatch(
        { communityId, sideAUserIds, sideBUserIds, matchType, isRanked },
        matchKey,
      );

      toast.success(t('club_startMatchAndScore'));
      onMatchCreated?.();
      onClose();
      // Không auto-route — user sẽ thấy card trận riêng xuất hiện trong feed và click vào để tính điểm
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="w-[95vw] sm:max-w-lg md:max-w-xl max-h-[90vh] bg-white rounded-2xl p-0 overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <ModalTitle className="text-base font-bold text-slate-900 leading-tight">
                {t('club_createMatchStandalone')}
              </ModalTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('club_standaloneMatchDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tóm tắt Đội A vs Đội B */}
        <div className="p-4 sm:px-5 pb-3 bg-slate-50/50 shrink-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Đội A */}
            <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/60 transition-all">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-black text-blue-700 tracking-wider">
                  {t('club_sideA')}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                  {sideAUserIds.length}/2
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate" title={sideAUserIds.length === 0 ? t('club_noPlayersSelected') : getMemberNames(sideAUserIds)}>
                {sideAUserIds.length === 0
                  ? t('club_noPlayersSelected')
                  : getMemberNames(sideAUserIds)}
              </p>
            </div>

            {/* VS Divider */}
            <span className="text-xs font-black text-slate-400 px-1 text-center">VS</span>

            {/* Đội B */}
            <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/60 transition-all">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-black text-amber-700 tracking-wider">
                  {t('club_sideB')}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-white">
                  {sideBUserIds.length}/2
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate" title={sideBUserIds.length === 0 ? t('club_noPlayersSelected') : getMemberNames(sideBUserIds)}>
                {sideBUserIds.length === 0
                  ? t('club_noPlayersSelected')
                  : getMemberNames(sideBUserIds)}
              </p>
            </div>
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative mt-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('club_searchMemberHint')}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Danh sách thành viên */}
        <div className="flex-1 min-h-[180px] max-h-[320px] overflow-y-auto px-4 sm:px-5 py-2 divide-y divide-slate-100">
          {isLoadingMembers ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-xs">{t('loading')}</span>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center text-xs text-rose-600 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{loadError}</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              {t('club_noMembersFound')}
            </div>
          ) : (
            filteredMembers.map((record) => {
              const uId = record.member.userId;
              const isSideA = sideAUserIds.includes(uId);
              const isSideB = sideBUserIds.includes(uId);
              const disabledA = !isSideA && sideAUserIds.length >= 2;
              const disabledB = !isSideB && sideBUserIds.length >= 2;
              const name = record.user?.fullName?.trim() || t('clubMemberFallback');
              const avatar = record.user?.avatarUrl;
              const role = record.member.role;

              return (
                <div key={uId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 overflow-hidden shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={name}>
                        {name}
                      </p>
                      {role !== 'MEMBER' && (
                        <p className="text-[10px] font-semibold text-amber-600">
                          {role === 'OWNER' ? t('clubRoleOwner') : t('clubRoleModerator')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nút chọn A | B */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={disabledA}
                      onClick={() => toggleSide(uId, 'A')}
                      className={`min-w-9 h-8 px-2.5 text-xs font-bold rounded-lg border transition-all ${
                        isSideA
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : disabledA
                          ? 'opacity-30 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 active:scale-95'
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      disabled={disabledB}
                      onClick={() => toggleSide(uId, 'B')}
                      className={`min-w-9 h-8 px-2.5 text-xs font-bold rounded-lg border transition-all ${
                        isSideB
                          ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                          : disabledB
                          ? 'opacity-30 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-600 active:scale-95'
                      }`}
                    >
                      B
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <p
            className={`text-xs font-semibold truncate ${
              sideAUserIds.length === sideBUserIds.length && sideAUserIds.length > 0
                ? 'text-emerald-600'
                : 'text-slate-400'
            }`}
          >
            {sideAUserIds.length === sideBUserIds.length && sideAUserIds.length > 0
              ? sideAUserIds.length === 1
                ? t('club_singlesMatch')
                : t('club_doublesMatch')
              : t('club_errorNeedEqualSides')}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={isRanked}
              onClick={() => setIsRanked((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
                isRanked
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
              title="Tính ELO cho trận này"
            >
              <span className={`h-2 w-2 rounded-full ${isRanked ? 'bg-amber-500' : 'bg-slate-300'}`} />
              ELO
            </button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={handleStartMatch}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{t('club_startMatchAndScore')}</span>
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
