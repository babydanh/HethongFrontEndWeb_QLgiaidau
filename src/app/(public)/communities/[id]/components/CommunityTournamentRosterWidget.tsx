'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, X, ArrowUpRight, Loader2, Trophy, AlertCircle } from 'lucide-react';
import { tournamentsApi, type Tournament, type TournamentParticipant } from '@/features/tournaments/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';

interface CommunityTournamentRosterWidgetProps {
  tournamentId: string;
  communityId?: string;
  initialTournamentName?: string;
  categoryName?: string | null;
  status?: string;
  inviteCode?: string | null;
  maxParticipants?: number | null;
  startDate?: string | null;
}

const BG_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-cyan-500',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorByName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

export default function CommunityTournamentRosterWidget({
  tournamentId,
  communityId,
  initialTournamentName,
  categoryName,
  status,
  inviteCode: initialInviteCode,
  maxParticipants: initialMaxParticipants,
}: CommunityTournamentRosterWidgetProps) {
  const translate = useTranslations('Match');
  const { user } = useAuthStore();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedUserToWithdraw, setSelectedUserToWithdraw] = useState<TournamentParticipant | null>(null);

  const fetchTournamentAndParticipants = useCallback(async () => {
    try {
      const [tourneyRes, partRes] = await Promise.all([
        tournamentsApi.getTournamentById(tournamentId).catch(() => null),
        tournamentsApi.getTournamentParticipants(tournamentId).catch(() => null),
      ]);

      if (tourneyRes?.data) {
        setTournament(tourneyRes.data);
      }
      if (partRes?.data) {
        // Filter only active participants (not withdrawn/rejected)
        const active = partRes.data.filter((p) => !['WITHDRAWN', 'REJECTED', 'CANCELLED'].includes((p.teamStatus ?? '').toUpperCase()));
        setParticipants(active);
      }
    } catch (err) {
      console.error('Error fetching roster data:', err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournamentAndParticipants();
  }, [fetchTournamentAndParticipants]);

  const effectiveInviteCode = tournament?.divisions?.[0]?.inviteCode || initialInviteCode;
  const effectiveMaxParticipants =
    tournament?.divisions?.[0]?.maxParticipants ||
    tournament?.tournamentConfig?.maxTeams ||
    initialMaxParticipants ||
    16;

  // Check if current logged-in user is already in participants list
  const currentParticipant = useMemo(() => {
    if (!user?.id || !participants.length) return null;
    return participants.find((p) => {
      const isReg = p.registeredBy?.id === user.id;
      const isMember = p.members?.some((m) => m.userId === user.id);
      return isReg || isMember;
    });
  }, [participants, user?.id]);

  const isUserRegistered = Boolean(currentParticipant);

  const handleJoin = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để xác nhận tham gia giải đấu');
      return;
    }

    if (isUserRegistered) {
      toast('Bạn đã có tên trong danh sách tham gia');
      return;
    }

    if (participants.length >= effectiveMaxParticipants) {
      toast.error('Giải đấu đã đủ số lượng người tham gia');
      return;
    }

    try {
      setIsJoining(true);
      if (effectiveInviteCode) {
        await tournamentsApi.joinLite(effectiveInviteCode);
      } else {
        await tournamentsApi.register(tournamentId, {
          teamName: user.fullName || 'VĐV',
        });
      }
      toast.success('Đã xác nhận tham gia giải đấu!');
      await fetchTournamentAndParticipants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đăng ký tham gia';
      toast.error(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!user) return;
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(tournamentId);
      toast.success('Đã hủy tham gia giải đấu');
      setSelectedUserToWithdraw(null);
      await fetchTournamentAndParticipants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy tham gia';
      toast.error(msg);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const totalSlots = Math.max(effectiveMaxParticipants, participants.length);
  const slotsToDisplay = isExpanded ? totalSlots : Math.min(totalSlots, 16);
  const emptySlotsCount = Math.max(0, slotsToDisplay - participants.length);

  if (loading) {
    return (
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-blue-100 bg-slate-50/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-blue-200 animate-pulse rounded" />
              <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
        </div>
        <div className="h-44 bg-white/80 rounded-xl border border-slate-200/60 animate-pulse flex items-center justify-center text-xs text-slate-400 gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Đang tải danh sách tham gia...</span>
        </div>
      </div>
    );
  }

  const tournamentName = tournament?.name || initialTournamentName || 'Giải đấu';
  const effectiveCategory = tournament?.category?.name || categoryName;

  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      {/* Top Banner: MANG ĐẾN BỞI */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1 overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tournament?.logoUrl || '/sporto_v1_with_text.svg'}
              alt={tournamentName}
              className="h-full w-full object-contain rounded-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/sporto_v1_with_text.svg';
              }}
            />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              MANG ĐẾN BỞI
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 truncate">
              {tournamentName}
            </h4>
          </div>
        </div>

        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <span>Xem giải</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Main Roster Section */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900">
              Xác nhận tham gia · {participants.length}
            </h3>
            {effectiveCategory && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
                {effectiveCategory}
              </span>
            )}
          </div>

          <span className="text-xs font-medium text-slate-400">
            {participants.length}/{effectiveMaxParticipants} người
          </span>
        </div>

        {/* Grid Slots (4 columns) */}
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 sm:gap-x-4 justify-items-center py-2">
          {/* 1. Filled Slots */}
          {participants.slice(0, isExpanded ? participants.length : 16).map((participant, index) => {
            const displayName =
              participant.registeredBy?.fullName ||
              participant.members?.[0]?.fullName ||
              participant.teamName ||
              `VĐV #${index + 1}`;
            const avatarUrl =
              participant.registeredBy?.avatarUrl ||
              participant.members?.[0]?.avatarUrl ||
              participant.footballTeamLogoUrl;
            const isSelf =
              user?.id &&
              (participant.registeredBy?.id === user.id ||
                participant.members?.some((m) => m.userId === user.id));

            return (
              <div
                key={participant.id || index}
                className="group relative flex flex-col items-center cursor-pointer select-none"
                onClick={() => {
                  if (isSelf) setSelectedUserToWithdraw(participant);
                }}
                title={isSelf ? 'Bấm để hủy tham gia' : displayName}
              >
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-105">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className={cn(
                        'flex h-full w-full items-center justify-center font-extrabold text-white text-base sm:text-lg',
                        getColorByName(displayName),
                      )}
                    >
                      {getInitials(displayName)}
                    </div>
                  )}

                  {/* Self badge / hover to remove */}
                  {isSelf && (
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <X className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>

                <p className="mt-1.5 text-xs font-bold text-blue-600 truncate max-w-[76px] sm:max-w-[88px] text-center">
                  {displayName}
                </p>
                {isSelf && (
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    (Bạn)
                  </span>
                )}
              </div>
            );
          })}

          {/* 2. Empty Slots */}
          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <div
              key={`empty-slot-${idx}`}
              onClick={handleJoin}
              className="group flex flex-col items-center cursor-pointer select-none"
              title="Bấm để tham gia"
            >
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white transition-all duration-200 group-hover:border-blue-500 group-hover:bg-blue-50/60 group-hover:scale-105 shadow-2xs">
                {isJoining ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                ) : (
                  <Plus className="h-5 w-5 text-slate-300 transition-colors group-hover:text-blue-600" />
                )}
              </div>
              <span className="mt-1.5 text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                Tham gia
              </span>
            </div>
          ))}
        </div>

        {/* Expand / Collapse Button when slots > 16 */}
        {totalSlots > 16 && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              {isExpanded
                ? 'Thu gọn danh sách'
                : `+ Xem thêm ${totalSlots - 16} slot`}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Withdrawing */}
      {selectedUserToWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Hủy tham gia giải đấu</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn hủy đăng ký tham gia giải{' '}
              <strong className="text-slate-900">{tournamentName}</strong> không?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserToWithdraw(null)}
                disabled={isWithdrawing}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={isWithdrawing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {isWithdrawing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Xác nhận rút lui</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
