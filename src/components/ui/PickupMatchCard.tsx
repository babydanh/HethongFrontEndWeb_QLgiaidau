'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  Trophy,
  Zap,
  Shield,
  Coins,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Tournament } from '@/types/tournament';
import { getSportLogo } from '@/constants/sports';

export interface PickupMatchCardProps {
  tournament: Tournament;
  onQuickJoin?: (tournamentId: string) => void;
  isJoining?: boolean;
}

export function PickupMatchCard({ tournament, onQuickJoin, isJoining }: PickupMatchCardProps) {
  const maxSlots = tournament.maxParticipants || 8;
  const currentCount =
    tournament._count?.participants ??
    tournament._summary?.participantCount ??
    0;
  const remainingSlots = Math.max(0, maxSlots - currentCount);
  const isFull = remainingSlots === 0;

  const slotIndices = Array.from({ length: Math.min(maxSlots, 8) });

  const venueName =
    tournament.venue?.name ||
    tournament.tournamentConfig?.location?.venueName ||
    tournament.locationAddress ||
    'Sân thi đấu giao lưu';

  const sportName = tournament.category?.name || 'Thể thao';
  const sportLogo = getSportLogo(sportName);

  const isLite = tournament.isLite || tournament.tournamentConfig?.isLite || tournament.tournamentConfig?.mode === 'LITE';

  const timeDisplay = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Linh hoạt';

  const entryFee = tournament.entryFee || 0;
  const feeDisplay =
    entryFee === 0
      ? 'Miễn phí / Chia tiền sân'
      : `${entryFee.toLocaleString('vi-VN')} đ`;

  const minElo = tournament.tournamentConfig?.minElo;
  const maxElo = tournament.tournamentConfig?.maxElo;
  const eloDisplay =
    minElo && maxElo
      ? `ELO ${minElo} - ${maxElo}`
      : minElo
      ? `ELO >= ${minElo}`
      : maxElo
      ? `ELO <= ${maxElo}`
      : 'Giao lưu vui vẻ';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 transition-all duration-200 hover:border-blue-300 hover:shadow-md">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/60 shadow-2xs">
            {sportLogo ? (
              <img src={sportLogo} alt={sportName} className="h-6 w-6 object-contain" />
            ) : (
              <Trophy className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                <Zap className="h-3 w-3 fill-blue-600 text-blue-600" />
                {isLite ? 'Kèo Siêu Lite' : 'Giải Đấu'}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate">
                {sportName}
              </span>
            </div>
            <Link
              href={`/tournaments/${tournament.id}`}
              className="mt-0.5 block truncate text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors"
            >
              {tournament.name}
            </Link>
          </div>
        </div>

        {/* Badge Slot */}
        <div className="shrink-0 text-right">
          {isFull ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              Đã đủ người
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/80 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Thiếu {remainingSlots} chân
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">{timeDisplay}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">{venueName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="font-semibold text-amber-700">{eloDisplay}</span>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="font-semibold text-emerald-700">{feeDisplay}</span>
        </div>
      </div>

      {/* Roster Slots UI */}
      <div className="mt-4 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
          <span>
            Người tham gia ({currentCount}/{maxSlots})
          </span>
          <span>{isFull ? 'Đầy slot' : `Còn trống ${remainingSlots} chỗ`}</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {slotIndices.map((_, idx) => {
            const isAssigned = idx < currentCount;
            return (
              <div
                key={idx}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isAssigned
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'border-2 border-dashed border-slate-300 text-slate-400 bg-white hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 cursor-pointer'
                }`}
                title={isAssigned ? `Người chơi #${idx + 1}` : 'Slot trống'}
              >
                {isAssigned ? (
                  <span>{idx + 1}</span>
                ) : (
                  <span className="text-[14px] leading-none">+</span>
                )}
              </div>
            );
          })}
          {maxSlots > 8 && (
            <span className="text-[11px] font-bold text-slate-400 px-1">
              +{maxSlots - 8}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 pt-2">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          Chi tiết kèo <ChevronRight className="h-3.5 w-3.5" />
        </Link>

        <div className="flex items-center gap-2">
          {!isFull ? (
            <Link
              href={`/tournaments/${tournament.id}?join=true`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Vào kèo ngay</span>
            </Link>
          ) : (
            <Link
              href={`/tournaments/${tournament.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
            >
              Xem trận đấu
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default PickupMatchCard;
