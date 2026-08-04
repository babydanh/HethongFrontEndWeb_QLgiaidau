'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PlayerRanking } from '@/features/rankings/api';
import { getEloProgressInfo } from '@/features/rankings/elo-display';

const ELO_PER_STREAK_WIN = 15;

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
  const n = name.trim().toLowerCase();
  if (n.includes('bán chuyên') || n.includes('pro')) return 'text-blue-600 border-blue-200 bg-blue-50';
  if (n.includes('vàng') || n.includes('gold')) return 'text-yellow-700 border-yellow-200 bg-yellow-50';
  if (n.includes('bạc') || n.includes('silver')) return 'text-slate-600 border-slate-300 bg-slate-100';
  if (n.includes('đồng') || n.includes('bronze')) return 'text-amber-700 border-amber-200 bg-amber-50';
  return 'text-slate-500 border-slate-200 bg-slate-50';
}

export default function EloSidebarCard({ eloPoints, matchesWon, matchesPlayed, winRate, tierName, activeRank, sportLabel }: Props) {
  const streak = activeRank?.winStreak ?? 0;
  const recentDelta = streak * ELO_PER_STREAK_WIN;
  const TrendIcon = recentDelta > 0 ? TrendingUp : recentDelta < 0 ? TrendingDown : Minus;
  const trendColor = recentDelta > 0 ? 'text-emerald-600' : recentDelta < 0 ? 'text-rose-500' : 'text-slate-400';
  const tierColor = getTierColor(tierName);
  const tierBorder = tierColor.split(' ').find((token) => token.startsWith('border-')) || 'border-slate-200';
  const hasRank = matchesPlayed > 0;
  const progress = getEloProgressInfo(eloPoints);

  return (
    <div className={`bg-white rounded-xl border-2 ${tierBorder} p-5 shadow-sm`}>
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

      <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
          <span>Tiến trình lên hạng</span>
          <span className="tabular-nums text-slate-700">{hasRank ? `${Math.round(progress.percent)}%` : '0%'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${hasRank ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-300'}`}
            style={{ width: `${hasRank ? Math.round(progress.percent) : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          {hasRank ? progress.label : 'Thi đấu một trận xếp hạng để bắt đầu tiến trình.'}
        </p>
      </div>

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
