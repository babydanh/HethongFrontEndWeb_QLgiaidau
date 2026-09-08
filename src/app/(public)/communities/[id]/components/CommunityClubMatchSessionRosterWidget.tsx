'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2, Plus, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import type { ClubMatchParticipant, ClubMatchSession } from '@/types/club-match-session';
import { useAuthStore } from '@/lib/zustand/authStore';

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
  const [mockName, setMockName] = useState('');
  const [creatingMock, setCreatingMock] = useState(false);
  const [showMockForm, setShowMockForm] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [sessionData, participantPage] = await Promise.all([
        clubMatchSessionsApi.get(sessionId),
        clubMatchSessionsApi.participants(sessionId, { limit: 50, status: 'ACTIVE' }),
      ]);
      setSession(sessionData);
      setParticipants(participantPage.data ?? []);
    } catch {
      // The feed remains usable when an old announcement points to a removed session.
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [sessionData, participantPage] = await Promise.all([
          clubMatchSessionsApi.get(sessionId),
          clubMatchSessionsApi.participants(sessionId, { limit: 50, status: 'ACTIVE' }),
        ]);
        if (mounted) {
          setSession(sessionData);
          setParticipants(participantPage.data ?? []);
        }
      } catch {
        // The feed remains usable when an old announcement points to a removed session.
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
  const maxParticipants = Math.max(session?.maxParticipants ?? 16, activeParticipants.length);
  const canJoin = session?.capabilities?.canJoin === true;
  const canWithdraw = session?.capabilities?.canWithdraw === true;
  const canManage = session?.capabilities?.canManage === true;
  const isOpen = session?.status === 'OPEN';
  const canTapEmptySlot = isOpen && (canJoin || canWithdraw);

  const handleJoin = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để tham gia buổi giao lưu.');
      return;
    }
    setJoining(true);
    try {
      if (canWithdraw) {
        await clubMatchSessionsApi.withdraw(sessionId);
        toast.success('Đã rút đăng ký khỏi buổi giao lưu.');
      } else {
        await clubMatchSessionsApi.selfJoin(sessionId);
        toast.success('Đã tham gia buổi giao lưu.');
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật đăng ký.');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateMock = async () => {
    const name = mockName.trim();
    if (!name || creatingMock) return;
    setCreatingMock(true);
    try {
      await clubMatchSessionsApi.createMockParticipant(sessionId, name);
      setMockName('');
      setShowMockForm(false);
      toast.success('Đã tạo VĐV ảo. VĐV ảo không tính ELO.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo VĐV ảo.');
    } finally {
      setCreatingMock(false);
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

  if (!session) return null;

  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 shadow-xs">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">BUỔI GIAO LƯU CLB</span>
            <h4 className="truncate text-sm font-extrabold text-slate-900">{session.resolvedName}</h4>
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
          <span className="text-xs font-semibold text-slate-500">{activeParticipants.length}/{maxParticipants} người</span>
        </div>

        {(canJoin || canWithdraw || canManage) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(canJoin || canWithdraw) && isOpen && (
              <button type="button" onClick={() => void handleJoin()} disabled={joining} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {joining && <Loader2 className="h-4 w-4 animate-spin" />}
                {canWithdraw ? 'Rút đăng ký' : 'Tham gia'}
              </button>
            )}
            {canManage && isOpen && !showMockForm && (
              <button type="button" onClick={() => setShowMockForm(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                <Plus className="h-4 w-4" /> Tạo VĐV ảo
              </button>
            )}
            {canManage && showMockForm && (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-2.5 ring-1 ring-amber-200">
                <input value={mockName} onChange={(event) => setMockName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateMock(); }} placeholder="Tên VĐV ảo" maxLength={255} className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400" autoFocus />
                <button type="button" onClick={() => void handleCreateMock()} disabled={!mockName.trim() || creatingMock} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">Thêm</button>
                <button type="button" onClick={() => { setShowMockForm(false); setMockName(''); }} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Đóng"><X className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-6 sm:gap-x-4">
          {Array.from({ length: maxParticipants }, (_, index) => {
            const participant = activeParticipants[index];
            const name = participant?.fullName?.trim() || `VĐV ${index + 1}`;
            const color = SLOT_COLORS[index % SLOT_COLORS.length];
            return participant ? (
              <div key={participant.participant.id} className="flex min-w-0 flex-col items-center text-center">
                <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white text-sm font-extrabold text-white shadow-md sm:h-16 sm:w-16 ${participant.avatarUrl ? 'bg-slate-100' : color}`}>
                  {participant.avatarUrl ? <img src={participant.avatarUrl} alt={name} className="h-full w-full object-cover" /> : initials(name)}
                </div>
                <span className="mt-2 max-w-full truncate text-xs font-semibold text-blue-700">{name}</span>
                <span className="mt-0.5 max-w-full truncate text-[10px] text-slate-400">{participant.isMock ? 'VĐV ảo · không ELO' : 'Đã tham gia'}</span>
              </div>
            ) : (
              <div
                key={`empty-${index}`}
                className={`flex min-w-0 flex-col items-center text-center ${canTapEmptySlot ? 'cursor-pointer rounded-xl p-1 hover:bg-blue-50' : ''}`}
                onClick={canTapEmptySlot ? () => void handleJoin() : undefined}
                onKeyDown={canTapEmptySlot ? (event) => { if (event.key === 'Enter' || event.key === ' ') void handleJoin(); } : undefined}
                role={canTapEmptySlot ? 'button' : undefined}
                tabIndex={canTapEmptySlot ? 0 : undefined}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-200 text-2xl font-light text-slate-300 sm:h-16 sm:w-16">+</div>
                <span className="mt-2 text-[10px] font-medium text-slate-400">Slot #{index + 1}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
