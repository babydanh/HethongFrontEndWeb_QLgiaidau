'use client';

import React from 'react';
import { Trophy, Shield, ShieldCheck, ShieldOff } from 'lucide-react';

import type { PlayerRanking } from '@/types/ranking';
import { cn } from '@/utils/cn';
import { TIER_THRESHOLDS } from '@/utils/elo';
import { getEloTier } from '@/components/ui/EloTierBadge';
import {
  getEloMatchTypeLabel,
  getEloProgressInfo,
  getRankDisplayName,
  getShieldStatus,
  getOnboardingCopy,
} from '@/features/rankings/elo-display';

export interface HomepageEloProgressCardProps {
  activeRankInfo: PlayerRanking | null;
  categoryRanks: PlayerRanking[];
  eloPoints: number;
  displayTier: string;
  peakElo: number;
  sportName: string;
  isAuthenticated: boolean;
}

export default function HomepageEloProgressCard({
  activeRankInfo,
  categoryRanks,
  eloPoints,
  displayTier,
  peakElo,
  sportName,
  isAuthenticated,
}: HomepageEloProgressCardProps) {
  if (!isAuthenticated) return null;

  const progress = getEloProgressInfo(eloPoints);
  const currentTier = getEloTier(eloPoints, displayTier);
  const shieldStatus = getShieldStatus(activeRankInfo);
  const hasNoRanks = !activeRankInfo || activeRankInfo.matchesPlayed <= 0;

  const ShieldIcon = shieldStatus.state === 'active'
    ? ShieldCheck
    : shieldStatus.state === 'broken'
      ? ShieldOff
      : Shield;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 flex flex-col gap-5 relative overflow-hidden">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            TIẾN TRÌNH ELO NỔI BẬT
          </span>
          <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
            {activeRankInfo ? getRankDisplayName(activeRankInfo) : sportName}
          </h4>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full font-black shadow-sm transition-all duration-300 border border-slate-100',
            currentTier.color
          )}>
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            {eloPoints} ELO
          </span>
          <span className="text-[10px] text-slate-450 font-bold tracking-tight">
            Cao nhất (Peak) {peakElo}
          </span>
        </div>
      </div>

      {/* Progress Bar & Thresholds */}
      <div className="space-y-2">
        {hasNoRanks ? (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-450">
              <span className="font-extrabold text-slate-500">1000 ELO</span>
              <span className="text-[10px] text-slate-400 italic font-semibold">{getOnboardingCopy()}</span>
              <span className="font-extrabold text-slate-500">{TIER_THRESHOLDS[1]?.minElo || 1100} ELO</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className="h-full bg-gradient-to-r from-slate-200 to-slate-350 rounded-full"
                style={{ width: '0%' }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-450">
              <span className="font-extrabold text-slate-700">{currentTier.name}</span>
              <span className="text-slate-500 font-extrabold">{progress.label}</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  currentTier.color.split(' ')[0] || 'bg-blue-500'
                )}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Shield status box - Redesigned, clean, no inner gray borders */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300',
        shieldStatus.state === 'active' && 'bg-emerald-50/50 text-emerald-800 border-emerald-200/80 shadow-[0_2px_10px_rgba(16,185,129,0.02)]',
        shieldStatus.state === 'broken' && 'bg-rose-50/50 text-rose-800 border-rose-200/80 shadow-[0_2px_10px_rgba(244,63,94,0.02)]',
        shieldStatus.state === 'onboarding' && 'bg-slate-50 text-slate-500 border-slate-200/80',
      )}>
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border',
          shieldStatus.state === 'active' && 'bg-emerald-100/70 border-emerald-300 text-emerald-600',
          shieldStatus.state === 'broken' && 'bg-rose-100/70 border-rose-300 text-rose-600',
          shieldStatus.state === 'onboarding' && 'bg-slate-200/60 border-slate-300 text-slate-400',
        )}>
          <ShieldIcon className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            TRẠNG THÁI KHIÊN BẢO VỆ
          </span>
          <p className="text-[11px] font-bold leading-tight tracking-tight">
            {shieldStatus.copy}
          </p>
        </div>
      </div>

      {/* Sub ranks mapping if user has multiple ranks */}
      {categoryRanks.length > 1 && (
        <div className="space-y-2 mt-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            CÁC HÌNH THỨC THI ĐẤU KHÁC
          </span>
          <div className="grid grid-cols-1 gap-2">
            {categoryRanks.slice(0, 3).map((rank) => (
              <div
                key={rank.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 border border-slate-150/70 hover:border-slate-200 px-4 py-2.5 transition-all duration-200"
              >
                <span className="text-[11px] font-extrabold text-slate-600">
                  {getEloMatchTypeLabel(rank.matchType)}
                </span>
                <span className="text-[11px] font-black text-slate-800 tabular-nums">
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
