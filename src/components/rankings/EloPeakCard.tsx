'use client';

import { useTranslations } from 'next-intl';

import { getEloTier } from '@/components/ui/EloTierBadge';
import { Shield, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getTierBgColor } from '@/utils/elo';
import { getRankProgressInfo } from '@/utils/rank-style';

interface EloPeakCardProps {
  eloPoints: number;
  peakElo: number;
  tierName?: string;
  shieldActive?: boolean;
  matchesPlayed: number;
  categoryName?: string;
}

export default function EloPeakCard({
  eloPoints,
  peakElo,
  tierName,
  shieldActive,
  matchesPlayed,
  categoryName,
}: EloPeakCardProps) {
  const translate = useTranslations('EloDisplay');
  const currentTier = getEloTier(eloPoints, tierName, categoryName);
  const rankProgress = getRankProgressInfo(eloPoints, categoryName);
  const { percent: progress, current: progressTier, next: nextTierDefinition } = rankProgress;
  const nextTier = nextTierDefinition ? getEloTier(nextTierDefinition.minElo, nextTierDefinition.name, categoryName) : null;
  const peakTier = getEloTier(peakElo, undefined, categoryName);
  const hasShield = shieldActive === true;
  const showShield = matchesPlayed > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-blue-500" /> ELO Peak
      </h3>

      {/* Peak & Current ELO */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">{translate('peakLabel')}</span>
          <span className="text-2xl font-bold text-blue-600 leading-none mt-1 block">{peakElo}</span>
          <span className="text-[9px] font-medium text-slate-500 mt-1 block">{peakTier.name}</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">{translate('currentLabel')}</span>
          <span className="text-2xl font-bold text-slate-900 leading-none mt-1 block">{eloPoints}</span>
          <span className="text-[9px] font-medium text-slate-500 mt-1 block">{currentTier.name}</span>
        </div>
      </div>

      {/* Gap from peak */}
      {peakElo > eloPoints && (
        <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 bg-slate-50 py-1.5 px-3 rounded-lg">
          <TrendingDown className="w-3 h-3" />
          {translate('peakGap', { points: peakElo - eloPoints })}
        </div>
      )}

      {/* Progress bar */}
      {nextTier ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold">
            <span className="text-slate-600">{currentTier.name}</span>
            <span className="text-slate-600">{nextTier.name}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getTierBgColor(currentTier.color))}
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>{progressTier.minElo}</span>
            <span>{nextTierDefinition?.minElo ?? 'MAX'}</span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 text-center block">
            {translate('progressPercent', { percent: Math.round(progress), nextName: nextTier.name })}
          </span>
        </div>
      ) : (
        <div className="text-center py-2">
          <span className="text-[10px] font-semibold text-blue-600 bg-slate-50 px-3 py-1.5 rounded-lg inline-block">
            {translate('maxTierReached')}
          </span>
        </div>
      )}

      {/* Shield status */}
      {showShield && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border',
            hasShield
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-rose-50 text-rose-500 border-slate-200'
          )}
        >
          {hasShield ? (
            <>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>🛡️ {translate('shieldLabel')}:  <span className="text-emerald-700">{translate('shieldActiveLabel')}</span></span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-rose-400" />
              <span>🛡️ {translate('shieldLabel')}:  <span className="text-rose-500">{translate('shieldBrokenLabel')}</span></span>
            </>
          )}
          <span className="text-[9px] font-medium ml-auto opacity-70">
            {hasShield
              ? `${translate('shieldProtectionLabel')} ${progressTier.minElo}`
              : translate('shieldRecoveryLabel')}
          </span>
        </div>
      )}

      {/* Category */}
      {categoryName && (
        <div className="text-[9px] font-medium text-slate-400 text-center">
          {translate('categoryLabel', { name: categoryName })}
        </div>
      )}
    </div>
  );
}

