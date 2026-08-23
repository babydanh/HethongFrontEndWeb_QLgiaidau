'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { getSportLogo } from '@/constants/sports';
import type { PlayerRanking } from '@/types/ranking';
import type { Category } from '@/types/category';
import { getRankStyle } from '@/utils/rank-style';
import { cn } from '@/utils/cn';

interface PlayerSportTierBadgeBarProps {
  userRankings?: PlayerRanking[] | null;
  categories?: Category[] | null;
  region?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Rút gọn tên Tier chuẩn theo hệ thống chữ cái của SportO:
 * - Tier S -> TS
 * - High Tier A -> HTA
 * - Low Tier A -> LTA
 * - High Tier B -> HTB
 * - Low Tier B -> LTB
 * - High Tier C -> HTC
 * - Low Tier C -> LTC
 * - High Tier D -> HTD
 * - Low Tier D -> LTD
 */
export function getShortTierCode(tierName?: string | null, elo?: number | null): string {
  if (!tierName && !elo) return '--';
  const name = (tierName || '').trim();

  // Standard tiers (theo A, B, C, D, S)
  if (/Tier S/i.test(name)) return 'TS';
  if (/High Tier A/i.test(name)) return 'HTA';
  if (/Low Tier A/i.test(name)) return 'LTA';
  if (/High Tier B/i.test(name)) return 'HTB';
  if (/Low Tier B/i.test(name)) return 'LTB';
  if (/High Tier C/i.test(name)) return 'HTC';
  if (/Low Tier C/i.test(name)) return 'LTC';
  if (/High Tier D/i.test(name)) return 'HTD';
  if (/Low Tier D/i.test(name)) return 'LTD';

  // Sport-specific tier abbreviations
  if (/Pro/i.test(name)) return 'PRO';
  if (/Advanced/i.test(name)) return 'ADV';
  if (/Intermediate/i.test(name)) return 'INT';
  if (/Beginner/i.test(name)) return 'BEG';

  // Fallback by elo value
  if (typeof elo === 'number' && Number.isFinite(elo)) {
    if (elo >= 1800) return 'TS';
    if (elo >= 1700) return 'HTA';
    if (elo >= 1600) return 'LTA';
    if (elo >= 1500) return 'HTB';
    if (elo >= 1400) return 'LTB';
    if (elo >= 1300) return 'HTC';
    if (elo >= 1200) return 'LTC';
    if (elo >= 1100) return 'HTD';
    return 'LTD';
  }

  return '--';
}

const getTierColorClass = (shortCode: string): string => {
  if (shortCode === 'TS') return 'text-amber-400 font-black drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]';
  if (shortCode === 'HTA') return 'text-rose-500 font-extrabold';
  if (shortCode === 'LTA') return 'text-rose-400 font-bold';
  if (shortCode === 'HTB') return 'text-blue-500 font-extrabold';
  if (shortCode === 'LTB') return 'text-blue-400 font-bold';
  if (shortCode === 'HTC') return 'text-emerald-500 font-extrabold';
  if (shortCode === 'LTC') return 'text-emerald-400 font-bold';
  if (shortCode === 'HTD') return 'text-slate-300 font-bold';
  if (shortCode === 'LTD') return 'text-slate-400 font-semibold';
  if (shortCode === 'PRO') return 'text-amber-400 font-black';
  if (shortCode === 'ADV') return 'text-emerald-400 font-bold';
  if (shortCode === 'INT') return 'text-blue-400 font-bold';
  if (shortCode === 'BEG') return 'text-slate-400 font-semibold';
  return 'text-slate-500';
};

export function PlayerSportTierBadgeBar({
  userRankings = [],
  categories = [],
  region = 'VN',
  className,
  size = 'md',
}: PlayerSportTierBadgeBarProps) {
  const translate = useTranslations('SportTierBar');

  // Filter only active sports
  const activeCategories = (categories || []).filter((cat) => cat?.isActive !== false);

  const isSmall = size === 'sm';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 bg-slate-900/90 text-white rounded-xl px-3 py-2 border border-slate-800 shadow-md backdrop-blur-xs select-none max-w-full overflow-x-auto no-scrollbar',
        className,
      )}
    >
      {/* Region Badge */}
      <div className="flex flex-col items-center justify-center shrink-0 pr-2.5 border-r border-slate-800">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
          {translate('region')}
        </span>
        <span className="inline-flex items-center justify-center font-black rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 text-xs shadow-xs">
          {region || 'VN'}
        </span>
      </div>

      {/* Sport Tiers Badges */}
      <div className="flex items-center gap-2.5 min-w-0">
        {activeCategories.length === 0 ? (
          <span className="text-xs text-slate-500 italic">--</span>
        ) : (
          activeCategories.map((category) => {
            // Find player's highest rank for this active category
            const sportRanks = (userRankings || []).filter(
              (r) =>
                r.categoryId === category.id ||
                r.categoryName?.toLowerCase() === category.name?.toLowerCase(),
            );
            const activeSportRank = sportRanks
              .filter((r) => r.matchesPlayed > 0)
              .sort((a, b) => b.eloPoints - a.eloPoints)[0] || null;

            const isRanked = Boolean(activeSportRank && activeSportRank.matchesPlayed > 0);
            const rankStyle = isRanked
              ? getRankStyle(activeSportRank?.eloPoints, activeSportRank?.tier?.name || activeSportRank?.tierName, category.name)
              : null;
            const shortCode = isRanked
              ? getShortTierCode(activeSportRank?.tier?.name || activeSportRank?.tierName, activeSportRank?.eloPoints)
              : '--';

            const logoUrl = getSportLogo(category.name);

            return (
              <div
                key={category.id}
                title={
                  isRanked
                    ? `${category.name}: ${activeSportRank?.eloPoints} ELO (${rankStyle?.name || shortCode}) • ${translate('matchesCount', { matches: activeSportRank?.matchesPlayed ?? 0 })}`
                    : `${category.name}: ${translate('unranked')}`
                }
                className={cn(
                  'group relative flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer',
                  !isRanked && 'opacity-35 hover:opacity-75',
                )}
              >
                {/* Sport Icon Circle */}
                <div
                  className={cn(
                    'relative rounded-full flex items-center justify-center border transition-all',
                    isSmall ? 'w-7 h-7' : 'w-8 h-8',
                    isRanked
                      ? `${rankStyle?.ringClass || 'ring-blue-500'} bg-slate-800/90 border-slate-700`
                      : 'bg-slate-800/50 border-slate-700/50',
                  )}
                >
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={category.name}
                      width={isSmall ? 16 : 18}
                      height={isSmall ? 16 : 18}
                      unoptimized
                      className="object-contain filter drop-shadow-xs"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300">
                      {category.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Short Tier Label */}
                <span
                  className={cn(
                    'mt-1 text-[10px] tracking-tight leading-none',
                    isRanked ? getTierColorClass(shortCode) : 'text-slate-500 font-semibold',
                  )}
                >
                  {shortCode}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlayerSportTierBadgeBar;
