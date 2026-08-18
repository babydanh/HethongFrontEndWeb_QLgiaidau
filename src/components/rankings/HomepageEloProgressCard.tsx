'use client';

import React from 'react';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';

import type { PlayerRanking } from '@/types/ranking';
import { cn } from '@/utils/cn';
import { getEloTier } from '@/components/ui/EloTierBadge';
import {
  getEloMatchTypeLabel,
  getRankTierName,
  getEloProgressInfo,
  getShieldStatus,
} from '@/features/rankings/elo-display';
import { getStandardRankStyleByIndex } from '@/utils/rank-style';

export interface HomepageEloProgressCardProps {
  activeRankInfo: PlayerRanking | null;
  categoryRanks: PlayerRanking[];
  eloPoints: number;
  displayTier: string;
  peakElo: number;
  sportName: string;
  isAuthenticated: boolean;
}

/** Màu fill progress bar — index theo currentIdx từ TIER_THRESHOLDS */
const BAR_FILL_COLORS = [
  'bg-gradient-to-r from-slate-400 to-slate-500',  // D   (idx 0)
  'bg-gradient-to-r from-slate-400 to-slate-500',  // D+  (idx 1)
  'bg-gradient-to-r from-blue-400 to-blue-600',    // C   (idx 2)
  'bg-gradient-to-r from-blue-400 to-blue-600',    // C+  (idx 3)
  'bg-gradient-to-r from-amber-400 to-amber-600',  // B   (idx 4)
  'bg-gradient-to-r from-amber-400 to-amber-600',  // B+  (idx 5)
  'bg-gradient-to-r from-violet-400 to-violet-600',// A   (idx 6)
  'bg-gradient-to-r from-violet-400 to-violet-600',// A+  (idx 7)
  'bg-gradient-to-r from-rose-400 to-rose-600',    // S   (idx 8)
];

/** Màu nền track (phần chưa fill) — index theo currentIdx */
const BAR_TRACK_COLORS = [
  'bg-slate-100',       // D
  'bg-slate-100',       // D+
  'bg-blue-100/60',     // C
  'bg-blue-100/60',     // C+
  'bg-amber-100/60',    // B
  'bg-amber-100/60',    // B+
  'bg-blue-100/60',   // A
  'bg-blue-100/60',   // A+
  'bg-rose-100/60',     // S
];

export default function HomepageEloProgressCard({
  activeRankInfo,
  categoryRanks,
  eloPoints,
  displayTier,
  sportName,
  isAuthenticated,
}: HomepageEloProgressCardProps) {
  if (!isAuthenticated) return null;

  const currentTier = getEloTier(eloPoints, displayTier, activeRankInfo?.categoryName);
  const shieldStatus = getShieldStatus(activeRankInfo);
  const progressInfo = getEloProgressInfo(eloPoints);
  const rankStyle = getStandardRankStyleByIndex(progressInfo.currentIdx);
  const hasNoRanks = !activeRankInfo || activeRankInfo.matchesPlayed <= 0;

  const ShieldIcon = shieldStatus.state === 'active'
    ? ShieldCheck
    : shieldStatus.state === 'broken'
      ? ShieldOff
      : Shield;

  // Force 0% + gray when user hasn't played any ranked match yet
  const displayPercent = hasNoRanks ? 0 : progressInfo.percent;
  const fillColor = hasNoRanks
    ? 'bg-gradient-to-r from-slate-300 to-slate-400'
    : rankStyle.progressClass;
  const trackColor = hasNoRanks
    ? 'bg-slate-100'
    : 'bg-slate-100';

  const rankLabel = hasNoRanks ? 'Chưa xếp hạng' : getRankTierName(activeRankInfo!);

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-4 flex flex-col gap-3 relative overflow-hidden">
      {/* Header: Tên rank + ELO badge + Môn thể thao & Hình thức */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {sportName && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {sportName}
              </span>
            )}
            {activeRankInfo?.matchType && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {getEloMatchTypeLabel(activeRankInfo.matchType)}
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-slate-800 tracking-tight">
            {rankLabel}
          </h4>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full font-bold shadow-sm transition-all duration-300 border border-slate-100',
          currentTier.color
        )}>
          {eloPoints} ELO
        </span>
      </div>

      {/* Progress bar + Shield icon */}
      <div className="flex items-center gap-2">
        <ShieldIcon className={cn(
          'w-4 h-4 shrink-0',
          shieldStatus.state === 'active' && 'text-blue-600',
          shieldStatus.state === 'broken' && 'text-blue-600',
          shieldStatus.state === 'onboarding' && 'text-slate-400',
        )} />
        <div className="flex-1 flex items-center gap-2">
          <div className={cn("flex-1 h-3 rounded-full overflow-hidden relative", trackColor)}>
            <div
              className={cn('h-full rounded-full transition-all duration-500 ease-out', fillColor)}
              style={{ width: `${Math.round(displayPercent)}%` }}
            >
              {displayPercent >= 20 && (
                <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white/90 leading-none">
                  {Math.round(displayPercent)}%
                </span>
              )}
            </div>
          </div>
          {displayPercent < 20 && (
            <span className="text-[11px] font-bold text-slate-500 tabular-nums min-w-[2.5rem] text-right">
              {Math.round(displayPercent)}%
            </span>
          )}
        </div>
      </div>

      {/* Sub ranks mapping if user has multiple ranks */}
      {categoryRanks.length > 1 && (
        <div className="space-y-2 mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            CÁC HÌNH THỨC THI ĐẤU KHÁC
          </span>
          <div className="grid grid-cols-1 gap-2">
            {categoryRanks.slice(0, 3).map((rank) => (
              <div
                key={rank.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/60 hover:bg-slate-50 border border-slate-150/70 hover:border-slate-200 px-4 py-2.5 transition-all duration-200"
              >
                <span className="text-[11px] font-bold text-slate-600">
                  {getEloMatchTypeLabel(rank.matchType)}
                </span>
                <span className="text-[11px] font-bold text-slate-800 tabular-nums">
                  {rank.eloPoints} ELO
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

