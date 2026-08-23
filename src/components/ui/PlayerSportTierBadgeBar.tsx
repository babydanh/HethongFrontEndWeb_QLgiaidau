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
 * Rút gọn tên Tier chuẩn theo cấu trúc phân hạng của SportO:
 * - Tier S -> TS
 * - High Tier A -> HT1
 * - Low Tier A -> LT1
 * - High Tier B -> HT2
 * - Low Tier B -> LT2
 * - High Tier C -> HT3
 * - Low Tier C -> LT3
 * - High Tier D -> HT4
 * - Low Tier D -> LT4
 * - Custom specific (Pro/Adv/Int/Beg) -> PRO / ADV / INT / BEG
 */
export function getShortTierCode(tierName?: string | null, elo?: number | null): string {
  if (!tierName && !elo) return '--';
  const name = (tierName || '').trim();

  // Standard tiers
  if (/Tier S/i.test(name)) return 'TS';
  if (/High Tier A/i.test(name)) return 'HT1';
  if (/Low Tier A/i.test(name)) return 'LT1';
  if (/High Tier B/i.test(name)) return 'HT2';
  if (/Low Tier B/i.test(name)) return 'LT2';
  if (/High Tier C/i.test(name)) return 'HT3';
  if (/Low Tier C/i.test(name)) return 'LT3';
  if (/High Tier D/i.test(name)) return 'HT4';
  if (/Low Tier D/i.test(name)) return 'LT4';

  // Sport-specific tier abbreviations
  if (/Pro/i.test(name)) return 'PRO';
  if (/Advanced/i.test(name)) return 'ADV';
  if (/Intermediate/i.test(name)) return 'INT';
  if (/Beginner/i.test(name)) return 'BEG';

  // Fallback by elo value if name is generic
  if (typeof elo === 'number' && Number.isFinite(elo)) {
    if (elo >= 1800) return 'TS';
    if (elo >= 1700) return 'HT1';
    if (elo >= 1600) return 'LT1';
    if (elo >= 1500) return 'HT2';
    if (elo >= 1400) return 'LT2';
    if (elo >= 1300) return 'HT3';
    if (elo >= 1200) return 'LT3';
    if (elo >= 1100) return 'HT4';
    return 'LT4';
  }

  return '--';
}

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
                    'mt-1 font-black text-[10px] tracking-tight leading-none',
                    isRanked
                      ? shortCode === 'TS'
                        ? 'text-amber-400 font-extrabold drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : shortCode.startsWith('HT')
                          ? 'text-amber-300'
                          : 'text-sky-300'
                      : 'text-slate-500',
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
