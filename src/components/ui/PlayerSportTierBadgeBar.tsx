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
  variant?: 'light' | 'dark';
  onlyRanked?: boolean;
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
  if (shortCode === 'TS') return 'text-amber-500 font-black drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]';
  if (shortCode === 'HTA') return 'text-rose-600 font-extrabold';
  if (shortCode === 'LTA') return 'text-rose-500 font-bold';
  if (shortCode === 'HTB') return 'text-blue-600 font-extrabold';
  if (shortCode === 'LTB') return 'text-blue-500 font-bold';
  if (shortCode === 'HTC') return 'text-emerald-600 font-extrabold';
  if (shortCode === 'LTC') return 'text-emerald-500 font-bold';
  if (shortCode === 'HTD') return 'text-slate-600 font-bold';
  if (shortCode === 'LTD') return 'text-slate-500 font-semibold';
  if (shortCode === 'PRO') return 'text-amber-500 font-black';
  if (shortCode === 'ADV') return 'text-emerald-600 font-bold';
  if (shortCode === 'INT') return 'text-blue-600 font-bold';
  if (shortCode === 'BEG') return 'text-slate-500 font-semibold';
  return 'text-slate-400';
};

export function PlayerSportTierBadgeBar({
  userRankings = [],
  categories = [],
  region = 'VN',
  className,
  size = 'sm',
  variant = 'light',
  onlyRanked = true,
}: PlayerSportTierBadgeBarProps) {
  const translate = useTranslations('SportTierBar');

  // Filter only active sports
  const activeCategories = (categories || []).filter((cat) => cat?.isActive !== false);

  // Map each category to its active rank
  const sportsWithRank = activeCategories.map((category) => {
    const sportRanks = (userRankings || []).filter(
      (r) =>
        r.categoryId === category.id ||
        r.categoryName?.toLowerCase() === category.name?.toLowerCase(),
    );
    const activeSportRank = sportRanks
      .filter((r) => r.matchesPlayed > 0 || r.adminLeaderboardEligible || r.eloPoints > 0)
      .sort((a, b) => b.eloPoints - a.eloPoints)[0] || null;

    const isRanked = Boolean(activeSportRank && (activeSportRank.matchesPlayed > 0 || activeSportRank.adminLeaderboardEligible || activeSportRank.eloPoints > 0));
    const rankStyle = isRanked
      ? getRankStyle(activeSportRank?.eloPoints, activeSportRank?.tier?.name || activeSportRank?.tierName, category.name)
      : null;
    const shortCode = isRanked
      ? getShortTierCode(activeSportRank?.tier?.name || activeSportRank?.tierName, activeSportRank?.eloPoints)
      : '--';
    const logoUrl = getSportLogo(category.name);

    return {
      category,
      activeSportRank,
      isRanked,
      rankStyle,
      shortCode,
      logoUrl,
    };
  });

  const displaySports = onlyRanked ? sportsWithRank.filter((s) => s.isRanked) : sportsWithRank;

  // Nếu người chơi chưa có rank nào và chọn onlyRanked thì không cần hiện hoặc ẩn
  if (onlyRanked && displaySports.length === 0) {
    return null;
  }

  const isDark = variant === 'dark';
  const isSmall = size === 'sm';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-2 py-1 border shadow-xs select-none max-w-full overflow-x-auto no-scrollbar',
        isDark
          ? 'bg-slate-900/90 text-white border-slate-800'
          : 'bg-white text-slate-800 border-slate-200/90',
        className,
      )}
    >
      {/* Region Tag */}
      {region && (
        <div className={cn(
          'flex items-center gap-1 shrink-0 pr-1.5 border-r',
          isDark ? 'border-slate-800' : 'border-slate-200',
        )}>
          <span className={cn(
            'inline-flex items-center justify-center font-extrabold rounded-md px-1.5 py-0.5 text-[10px] tracking-wider',
            isDark
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
              : 'bg-rose-50 text-rose-600 border border-rose-200',
          )}>
            {region}
          </span>
        </div>
      )}

      {/* Sport Tiers Badges */}
      <div className="flex items-center gap-2 min-w-0">
        {displaySports.map(({ category, activeSportRank, isRanked, rankStyle, shortCode, logoUrl }) => {
          return (
            <div
              key={category.id}
              title={
                isRanked
                  ? `${category.name}: ${activeSportRank?.eloPoints} ELO (${rankStyle?.name || shortCode}) • ${translate('matchesCount', { matches: activeSportRank?.matchesPlayed ?? 0 })}`
                  : `${category.name}: ${translate('unranked')}`
              }
              className={cn(
                'group relative flex items-center gap-1 transition-transform hover:scale-105 cursor-pointer',
                !isRanked && 'opacity-40 hover:opacity-75',
              )}
            >
              {/* Sport Icon Circle */}
              <div
                className={cn(
                  'relative rounded-full flex items-center justify-center border transition-all',
                  isSmall ? 'w-5 h-5' : 'w-6 h-6',
                  isRanked
                    ? isDark
                      ? `${rankStyle?.ringClass || 'ring-blue-500'} bg-slate-800 border-slate-700`
                      : 'bg-slate-50 border-slate-200'
                    : isDark
                      ? 'bg-slate-800/50 border-slate-700/50'
                      : 'bg-slate-100 border-slate-200',
                )}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={category.name}
                    width={isSmall ? 12 : 14}
                    height={isSmall ? 12 : 14}
                    unoptimized
                    className="object-contain"
                  />
                ) : (
                  <span className="text-[8px] font-bold text-slate-500">
                    {category.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Short Tier Label */}
              <span
                className={cn(
                  'text-[10px] tracking-tight leading-none',
                  isRanked ? getTierColorClass(shortCode) : 'text-slate-400 font-medium',
                )}
              >
                {shortCode}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlayerSportTierBadgeBar;
