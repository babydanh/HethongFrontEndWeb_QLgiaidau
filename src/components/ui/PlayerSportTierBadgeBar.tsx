'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { PlayerRanking } from '@/types/ranking';
import type { Category } from '@/types/category';
import { getRankStyle } from '@/utils/rank-style';
import { getCanonicalTierName, isPublicRankingEligible } from '@/features/rankings/elo-display';
import { cn } from '@/utils/cn';
import { getSportAccentColor } from '@/constants/sports';
import { getTierBadgeStyle, SportBadgeIcon, getTierTheme } from '@/components/ui/RankEmblem';

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
      .filter(isPublicRankingEligible)
      .sort((a, b) => b.eloPoints - a.eloPoints)[0] || null;

    const isRanked = isPublicRankingEligible(activeSportRank);
    const canonicalTierName = isRanked ? getCanonicalTierName(activeSportRank) : null;
    const rankStyle = isRanked
      ? getRankStyle(activeSportRank?.eloPoints, canonicalTierName, category.name)
      : null;
    const shortCode = isRanked
      ? getShortTierCode(canonicalTierName, activeSportRank?.eloPoints)
      : '--';
    return {
      category,
      activeSportRank,
      isRanked,
      rankStyle,
      shortCode,
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
      <div className="flex items-center gap-2.5 min-w-0">
        {displaySports.map(({ category, activeSportRank, isRanked, rankStyle, shortCode }) => {
          const theme = getTierTheme(rankStyle?.name || shortCode, activeSportRank?.eloPoints, shortCode);
          const tierBadgeStyle = getTierBadgeStyle(theme, shortCode);
          const sportAccent = getSportAccentColor(category.name);
          return (
            <div
              key={category.id}
              title={
                isRanked
                  ? `${category.name}: ${rankStyle?.name || shortCode} • ${translate('matchesCount', { matches: activeSportRank?.matchesPlayed ?? 0 })}`
                  : `${category.name}: ${translate('unranked')}`
              }
              aria-label={
                isRanked
                  ? `${category.name}: ${rankStyle?.name || shortCode}, ${translate('matchesCount', { matches: activeSportRank?.matchesPlayed ?? 0 })}`
                  : `${category.name}: ${translate('unranked')}`
              }
              className={cn(
                'group relative flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-all hover:scale-105 cursor-pointer shadow-xs',
                !isRanked && 'opacity-40 hover:opacity-75',
              )}
              style={{
                backgroundColor: '#090d16',
                borderColor: isRanked ? (theme.coreFillStart || `${sportAccent}cc`) : '#334155',
                boxShadow: isRanked ? `0 0 6px ${theme.glowColor}` : undefined,
              }}
            >
              <SportBadgeIcon
                sportName={category.name}
                sizePx={isSmall ? 20 : 24}
              />

              {/* Short Tier Label with Elo color */}
              <span
                className={cn('text-[11px] font-black uppercase tracking-tight leading-none')}
                style={{
                  color: isRanked ? (theme.ringOuter || tierBadgeStyle.textColor) : '#94a3b8',
                  fontWeight: tierBadgeStyle.isHigh ? 900 : 800,
                  textShadow: isRanked ? `0 0 6px ${theme.glowColor}` : undefined,
                }}
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
