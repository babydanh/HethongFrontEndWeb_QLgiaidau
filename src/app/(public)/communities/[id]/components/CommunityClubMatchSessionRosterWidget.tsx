'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUpRight, ChevronLeft, ChevronRight, Loader2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import type { ClubMatchParticipant, ClubMatchSession } from '@/types/club-match-session';
import { useAuthStore } from '@/lib/zustand/authStore';
import { cn } from '@/utils/cn';

interface CommunityClubMatchSessionRosterWidgetProps {
  sessionId: string;
  communityId: string;
}

const SLOT_COLORS = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-emerald-500',
];

const SLOTS_PER_PAGE = 16;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
}

export default function CommunityClubMatchSessionRosterWidget({
  sessionId,
  communityId,
}: CommunityClubMatchSessionRosterWidgetProps) {
  const { user } = useAuthStore();
  const [session, setSession] = useState<ClubMatchSession | null>(null);
  const [participants, setParticipants] = useState<ClubMatchParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [sessionData, participantsData] = await Promise.all([
        clubMatchSessionsApi.get(sessionId),
        clubMatchSessionsApi.participants(sessionId, { limit: 50, status: 'ACTIVE' }),
      ]);
      setSession(sessionData);
      setParticipants(participantsData.data ?? []);
    } catch {
      // The feed remains usable when an old announcement points to a removed or invalid session.
    }
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [sessionData, participantsData] = await Promise.all([
          clubMatchSessionsApi.get(sessionId),
          clubMatchSessionsApi.participants(sessionId, { limit: 50, status: 'ACTIVE' }),
        ]);
        if (!mounted) return;
        setSession(sessionData);
        setParticipants(participantsData.data ?? []);
      } catch {
        // The feed remains usable when an old announcement points to a removed or invalid session.
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const activeParticipants = useMemo(
    () => participants.filter((item) => item.participant.status === 'ACTIVE'),
    [participants],
  );
  const totalSlots = Math.max(session?.maxParticipants ?? 16, activeParticipants.length);
  const totalPages = Math.max(1, Math.ceil(totalSlots / SLOTS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * SLOTS_PER_PAGE;
  const endIndex = Math.min(startIndex + SLOTS_PER_PAGE, totalSlots);

  const currentUserParticipant = useMemo(() => {
    if (!user?.id) return null;
    return activeParticipants.find(
      (p) => String(p.participant.userId) === String(user.id),
    );
  }, [activeParticipants, user?.id]);

  const canJoin = session?.capabilities?.canJoin === true;
  const canWithdraw = session?.capabilities?.canWithdraw === true || !!currentUserParticipant;
  const canManage = session?.capabilities?.canManage === true;
  const isOpen = session?.status === 'OPEN';
  const canTapEmptySlot = isOpen && !currentUserParticipant && (canJoin || !user?.id);

  const userPage = useMemo(() => {
    if (!currentUserParticipant) return null;
    const idx = activeParticipants.findIndex((p) => p.participant.id === currentUserParticipant.participant.id);
    if (idx === -1) return null;
    return Math.floor(idx / SLOTS_PER_PAGE) + 1;
  }, [currentUserParticipant, activeParticipants]);

  const handleJoin = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để tham gia buổi giao lưu.');
      return;
    }
    setJoining(true);
    try {
      await clubMatchSessionsApi.selfJoin(sessionId);
      toast.success('Đã tham gia buổi giao lưu.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật đăng ký.');
    } finally {
      setJoining(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user?.id) return;
    setJoining(true);
    try {
      await clubMatchSessionsApi.withdraw(sessionId);
      toast.success('Đã rút đăng ký khỏi buổi giao lưu.');
      setConfirmWithdraw(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể rút đăng ký.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-3.5 rounded-2xl border border-blue-100 bg-slate-50/70 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Đang tải danh sách tham gia...
        </div>
      </div>
    );
  }

  const effectiveSession = session ?? {
    id: sessionId,
    communityId,
    resolvedName: 'Buổi giao lưu CLB',
    status: 'OPEN' as const,
    registrationMode: 'MIXED' as const,
    isRanked: true,
    maxParticipants: 16,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    capabilities: {
      pairingMode: 'FREE' as const,
      bracket: false,
      registrationOpenImmediately: true,
      canJoin: true,
      canWithdraw: false,
      canCreateMatch: false,
      canManage: false,
    },
  };

  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 shadow-xs">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">BUỔI GIAO LƯU CLB</span>
            <h4 className="truncate text-sm font-extrabold text-slate-900">{effectiveSession.resolvedName}</h4>
          </div>
        </div>
        <Link
          href={`/communities/${communityId}/match-sessions/${sessionId}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
        >
          Xem buổi <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900">Xác nhận tham gia · {activeParticipants.length}</h3>
            <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">Tự do</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">{activeParticipants.length}/{totalSlots} người</span>
        </div>

        {/* Action bar: Chỉ giữ Rút đăng ký khi người dùng hiện tại đã có slot */}
        {currentUserParticipant && canWithdraw && isOpen && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmWithdraw(true)}
              disabled={joining}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {joining && <Loader2 className="h-4 w-4 animate-spin" />}
              Rút đăng ký
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-6 sm:gap-x-4">
          {Array.from({ length: endIndex - startIndex }, (_, idx) => {
            const index = startIndex + idx;
            const participant = activeParticipants[index];
            const name = participant?.fullName?.trim() || `VĐV ${index + 1}`;
            const color = SLOT_COLORS[index % SLOT_COLORS.length];
            const isMe = user?.id && String(participant?.participant.userId) === String(user.id);

            return participant ? (
              <div
                key={participant.participant.id}
                className={cn(
                  'flex min-w-0 flex-col items-center text-center transition-transform',
                  isMe && 'cursor-pointer hover:scale-105',
                )}
                onClick={isMe ? () => setConfirmWithdraw(true) : undefined}
                title={isMe ? 'Nhấn để rút đăng ký' : undefined}
              >
                <div className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-extrabold text-white shadow-md sm:h-16 sm:w-16 ${
                  isMe ? 'border-blue-500 ring-2 ring-blue-300' : 'border-white'
                } ${participant.avatarUrl ? 'bg-slate-100' : color}`}>
                  {participant.avatarUrl ? (
                    <img src={participant.avatarUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    initials(name)
                  )}
                  {isMe && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-blue-600 ring-2 ring-white" title="Bạn" />
                  )}
                </div>
                <span className={cn('mt-2 max-w-full truncate text-xs font-semibold', isMe ? 'font-bold text-blue-800' : 'text-slate-800')}>
                  {name} {isMe && '(Tôi)'}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[10px] text-slate-400">
                  {participant.isMock ? 'VĐV ảo · không ELO' : `Slot #${index + 1}`}
                </span>
              </div>
            ) : (
              <div
                key={`empty-${index}`}
                className={cn(
                  'group flex min-w-0 flex-col items-center text-center transition-colors',
                  canTapEmptySlot ? 'cursor-pointer rounded-xl p-1 hover:bg-blue-50/80' : 'opacity-70',
                )}
                onClick={canTapEmptySlot ? () => void handleJoin() : undefined}
                onKeyDown={canTapEmptySlot ? (event) => { if (event.key === 'Enter' || event.key === ' ') void handleJoin(); } : undefined}
                role={canTapEmptySlot ? 'button' : undefined}
                tabIndex={canTapEmptySlot ? 0 : undefined}
                title={canTapEmptySlot ? 'Bấm để tham gia slot này' : undefined}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-2xl font-light text-slate-400 group-hover:border-blue-400 group-hover:text-blue-500 sm:h-16 sm:w-16 transition-colors">
                  {joining ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : '+'}
                </div>
                <span className="mt-2 text-[10px] font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
                  Slot #{index + 1}
                </span>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <span className="text-[11px] font-medium text-slate-400">
              Slot {startIndex + 1} - {endIndex} / {totalSlots}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === safePage;
                  const hasUser = pageNum === userPage;
                  return (
                    <button
                      key={`page-pill-${pageNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        'relative h-7 min-w-[28px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80',
                      )}
                    >
                      <span>{pageNum}</span>
                      {hasUser && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" title="Vị trí của bạn" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Trang sau"
              >
                <span>Sau</span>
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Rút đăng ký tham gia</h4>
            </div>

            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn rút khỏi buổi giao lưu này? Slot của bạn sẽ được nhường lại cho thành viên khác.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmWithdraw(false)}
                disabled={joining}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => void handleWithdraw()}
                disabled={joining}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {joining && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận rút
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
