'use client';

import { Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PlayerRanking } from '@/features/rankings/api';

interface Props {
  eloPoints: number;
  matchesWon: number;
  matchesPlayed: number;
  winRate: number;
  tierName: string;
  activeRank?: PlayerRanking | null;
  sportLabel?: string;
}

function getTierColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('bán chuyên') || n.includes('pro')) return 'text-blue-600 border-blue-200 bg-blue-50';
  if (n.includes('vàng') || n.includes('gold')) return 'text-yellow-700 border-yellow-200 bg-yellow-50';
  if (n.includes('bạc') || n.includes('silver')) return 'text-slate-600 border-slate-300 bg-slate-100';
  if (n.includes('đồng') || n.includes('bronze')) return 'text-amber-700 border-amber-200 bg-amber-50';
  return 'text-slate-500 border-slate-200 bg-slate-50';
}

function SparkLine({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 120;
  const h = 28;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${className || ''}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={coords} />
    </svg>
  );
}

export default function EloSidebarCard({ eloPoints, matchesWon, matchesPlayed, winRate, tierName, activeRank, sportLabel }: Props) {
  const recentDelta = activeRank?.winStreak
    ? activeRank.winStreak > 0
      ? activeRank.winStreak * 15
      : -Math.abs(activeRank.winStreak) * 15
    : 0;
  const TrendIcon = recentDelta > 0 ? TrendingUp : recentDelta < 0 ? TrendingDown : Minus;
  const trendColor = recentDelta > 0 ? 'text-emerald-600' : recentDelta < 0 ? 'text-rose-500' : 'text-slate-400';
  const tierColor = getTierColor(tierName);
  const sparkData: number[] = [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ELO Xếp hạng</span>
        {sportLabel && <span className="text-[10px] text-slate-400">{sportLabel}</span>}
      </div>

      <div className="flex items-end gap-3 mb-1">
        <span className="text-4xl font-bold text-slate-900 tabular-nums tracking-tight">{eloPoints}</span>
        {recentDelta !== 0 && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold mb-1.5 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {recentDelta > 0 ? '+' : ''}{recentDelta}
          </span>
        )}
      </div>

      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${tierColor} mb-3`}>
        {tierName}
      </span>

      {sparkData.length >= 2 && <SparkLine points={sparkData} className="mb-3" />}

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Trận thắng</p>
          <p className="text-sm font-bold tabular-nums text-slate-900">{matchesWon}/{matchesPlayed}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Tỉ lệ</p>
          <p className="text-sm font-bold tabular-nums text-slate-900">{winRate}%</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Cao nhất</p>
          <p className="text-sm font-bold tabular-nums text-blue-600">{activeRank?.peakElo ?? '--'}</p>
        </div>
      </div>
    </div>
  );
}
