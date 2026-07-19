'use client';

import React from 'react';
import { Trophy, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import Link from 'next/link';

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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface HomepageEloProgressCardProps {
  /** Authenticated user's basic info. */
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;

  /** The most prominent rank (or null if none). */
  activeRankInfo: PlayerRanking | null;

  /** All ranks for the currently selected category. */
  categoryRanks: PlayerRanking[];

  /** Derived values (computed by page.tsx for convenience). */
  eloPoints: number;
  displayTier: string;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  peakElo: number;
  sportName: string;

  /** Whether the user is actually authenticated (for rendering decisions). */
  isAuthenticated: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HomepageEloProgressCard({
  user,
  activeRankInfo,
  categoryRanks,
  eloPoints,
  displayTier,
  matchesPlayed,
  matchesWon,
  winRate,
  peakElo,
  sportName,
  isAuthenticated,
}: HomepageEloProgressCardProps) {
  if (!isAuthenticated) return null;

  const progress = getEloProgressInfo(eloPoints);
  const currentTier = getEloTier(eloPoints, displayTier);
  const shieldStatus = getShieldStatus(activeRankInfo);
  const hasNoRanks = !activeRankInfo || activeRankInfo.matchesPlayed <= 0;

  /* Decide which shield icon to render */
  const ShieldIcon = shieldStatus.state === 'active'
    ? ShieldCheck
    : shieldStatus.state === 'broken'
      ? ShieldOff
      : Shield;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-5 flex flex-col items-center text-center relative overflow-hidden">
      {/* Sports cover banner background */}
      <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
      </div>

      {/* Avatar */}
      <div className="w-16 h-16 rounded-full border-4 border-white shadow-md z-10 mt-5 relative bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-blue-600 uppercase">
            {user?.fullName?.charAt(0) || 'U'}
          </span>
        )}
      </div>

      {/* Name & Email */}
      <h3 className="text-base font-bold text-slate-900 mt-2.5 line-clamp-1 leading-snug">
        {user?.fullName || 'Người dùng'}
      </h3>
      <p className="text-xs text-slate-400 truncate w-full mb-3.5">
        {user?.email}
      </p>

      {/* ── ELO Progress module ── */}
      <div className="w-full bg-slate-50 rounded-2xl border border-slate-150 shadow-sm z-10 p-3 text-left">
        {/* Header row: label + ELO pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              Tiến trình ELO nổi bật
            </p>
            <p className="text-xs font-black text-slate-850 truncate mt-0.5">
              {activeRankInfo
                ? getRankDisplayName(activeRankInfo)
                : sportName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className={cn(
              'inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-black shadow-sm',
              currentTier.color,
            )}>
              <Trophy className="w-3 h-3 text-amber-300" />
              {eloPoints}
            </span>
            <p className="text-[9px] text-slate-400 font-bold mt-1">
              Peak {peakElo}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {hasNoRanks ? (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>1000</span>
              <span className="text-slate-400">{getOnboardingCopy()}</span>
              <span>{TIER_THRESHOLDS[1]?.minElo || 1100}</span>
            </div>
            <div className="h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
              <span>{currentTier.name}</span>
              <span>{progress.label}</span>
            </div>
            <div className="h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  currentTier.color.split(' ')[0] || 'bg-blue-500',
                )}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Shield row */}
        <div className={cn(
          'flex items-center gap-1.5 mt-2 text-[10px] font-bold px-2 py-1 rounded-lg',
          shieldStatus.state === 'active' && 'bg-emerald-50 text-emerald-700',
          shieldStatus.state === 'broken' && 'bg-amber-50 text-amber-700',
          shieldStatus.state === 'onboarding' && 'bg-slate-100 text-slate-500',
        )}>
          <ShieldIcon className={cn(
            'w-3.5 h-3.5 shrink-0',
            shieldStatus.state === 'active' && 'text-emerald-500',
            shieldStatus.state === 'broken' && 'text-amber-500',
            shieldStatus.state === 'onboarding' && 'text-slate-400',
          )} />
          <span className="leading-tight">{shieldStatus.copy}</span>
        </div>

        {/* Mini rank list for current category */}
        {categoryRanks.length > 1 && (
          <div className="grid grid-cols-1 gap-1.5 mt-3">
            {categoryRanks.slice(0, 3).map((rank) => (
              <div
                key={rank.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-150 px-2.5 py-2"
              >
                <span className="text-[10px] font-black text-slate-600 truncate">
                  {getEloMatchTypeLabel(rank.matchType)}
                </span>
                <span className="text-[10px] font-black text-slate-900 tabular-nums">
                  {rank.eloPoints} ELO
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 w-full gap-2 mt-3 sm:mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-col items-center">
          <span className="text-base font-black text-slate-800 leading-none">
            {matchesPlayed}
          </span>
          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            Trận
          </span>
        </div>
        <div className="flex flex-col items-center border-l border-r border-slate-100">
          <span className="text-base font-black text-slate-800 leading-none">
            {matchesWon}
          </span>
          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            Thắng
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-base font-black text-slate-800 leading-none">
            {winRate}%
          </span>
          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            Tỷ lệ
          </span>
        </div>
      </div>

      {/* ── CTA ── */}
      <Link href="/profile" className="w-full mt-4">
        <button className="w-full text-xs py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold rounded-xl transition-all active:scale-95 duration-150 cursor-pointer shadow-sm">
          Trang cá nhân
        </button>
      </Link>
    </div>
  );
}
