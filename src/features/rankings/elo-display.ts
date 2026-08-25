/**
 * ELO display helpers — centralized match-type labels, rank selection,
 * shield state descriptors, and progress labels.
 *
 * Reuses src/utils/elo.ts for tier thresholds and progress calculation.
 * No `any` — uses precise TS types from @/types/ranking.
 */

import type { PlayerRanking } from '@/types/ranking';
import {
  TIER_THRESHOLDS,
  findTierIndex,
} from '@/utils/elo';
import { getRankProgressInfo, getRankStyle } from '@/utils/rank-style';

/* ------------------------------------------------------------------ */
/*  Match type labels                                                  */
/* ------------------------------------------------------------------ */

export type EloMatchType = 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';

export type EloMatchTypeLabels = Partial<Record<EloMatchType, string>> & { categoryFallback?: string };

export type EloProgressToNextLabel = (params: { remaining: number; nextName: string }) => string;

export type EloDisplayLabels = {
  categoryFallback?: string;
  progressToNext?: EloProgressToNextLabel;
  progressPeak?: string;
  onboardingShield?: string;
  shieldActive?: string;
  shieldBroken?: string;
  onboardingCopy?: string;
};

const MATCH_TYPE_LABELS: Record<EloMatchType, string> = {
  SINGLES: 'Singles',
  DOUBLES: 'Doubles',
  MIXED_DOUBLES: 'Mixed doubles',
};

/** Human-readable label for a match type. */
export const getEloMatchTypeLabel = (matchType?: string | null, labels?: EloMatchTypeLabels): string => {
  if (matchType === 'SINGLES' || matchType === 'DOUBLES' || matchType === 'MIXED_DOUBLES') {
    return labels?.[matchType] ?? MATCH_TYPE_LABELS[matchType];
  }
  return labels?.categoryFallback ?? 'Overview';
};

/** Display name combining category and match type. */
export const getRankDisplayName = (rank: PlayerRanking): string => {
  const categoryName = rank.categoryName || 'Sport';
  const matchTypeLabel = getEloMatchTypeLabel(rank.matchType);
  return `${categoryName} • ${matchTypeLabel}`;
};

/* ------------------------------------------------------------------ */
/*  Tier name helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Public leaderboard eligibility is a data fact, not something inferred from ELO history.
 * Keep this rule in one frontend helper so profile and compact badges agree.
 */
export const isPublicRankingEligible = (
  rank: Pick<PlayerRanking, 'matchesPlayed' | 'adminLeaderboardEligible'> | null | undefined,
): boolean => Boolean(rank && (rank.matchesPlayed > 0 || rank.adminLeaderboardEligible === true));

const GENERIC_TIER_NAMES = new Set(['ranked', 'unranked']);

const TIER_TRANSLATION_KEYS: Record<string, string> = {
  'Low Tier D': 'tierLowD',
  'High Tier D': 'tierHighD',
  'Low Tier C': 'tierLowC',
  'High Tier C': 'tierHighC',
  'Low Tier B': 'tierLowB',
  'High Tier B': 'tierHighB',
  'Low Tier A': 'tierLowA',
  'High Tier A': 'tierHighA',
  'Tier S': 'tierS',
  Beginner: 'tierBeginner',
  Intermediate: 'tierIntermediate',
  Advanced: 'tierAdvanced',
  Pro: 'tierPro',
};

const getCanonicalBackendTierName = (rank: PlayerRanking): string | null => {
  const candidate = rank.tier?.name?.trim() || rank.tierName?.trim() || null;
  return candidate && !GENERIC_TIER_NAMES.has(candidate.toLowerCase()) ? candidate : null;
};

/** Human-readable canonical tier from a public/eligible rank record. */
export const getRankTierName = (rank: PlayerRanking | null | undefined): string => {
  if (!rank || !isPublicRankingEligible(rank)) return 'Unranked';
  return getCanonicalBackendTierName(rank)
    || getRankStyle(rank.eloPoints, undefined, rank.categoryName).name;
};

export type EloTierLabelTranslator = (key: string) => string;

/** Localize a canonical tier key while keeping the raw tier name for styling. */
export const getLocalizedRankTierName = (
  rank: PlayerRanking | null | undefined,
  translate?: EloTierLabelTranslator,
): string => {
  const tierName = getRankTierName(rank);
  const translationKey = TIER_TRANSLATION_KEYS[tierName];
  return translate && translationKey ? translate(translationKey) : tierName;
};

/** Win rate as a rounded percentage. */
export const getRankWinRate = (rank: PlayerRanking | null | undefined): number => {
  if (!rank || rank.matchesPlayed <= 0) return 0;
  return Math.round((rank.matchesWon / rank.matchesPlayed) * 100);
};

/** Resolve a rank's canonical tier label without preserving generic backend status text. */
export const getCanonicalTierName = (rank: PlayerRanking | null | undefined): string =>
  getRankTierName(rank);

/* ------------------------------------------------------------------ */
/*  Rank selection                                                     */
/* ------------------------------------------------------------------ */

/**
 * Pick the "most prominent" rank from a list.
 * Sort order: highest matchesPlayed → highest eloPoints → newest updatedAt.
 */
export const getBestRankForCategory = (
  ranks: PlayerRanking[],
  categoryId?: string,
): PlayerRanking | null => {
  const candidates = categoryId
    ? ranks.filter((rank) => rank.categoryId === categoryId)
    : ranks;
  if (candidates.length === 0) return null;

  const active = candidates.filter(isPublicRankingEligible);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if (b.eloPoints !== a.eloPoints) return b.eloPoints - a.eloPoints;
    if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  })[0];
};

/**
 * Choose one representative sport for compact summaries.
 * Prefer the sport with the most played matches, then highest ELO, then newest update.
 * Unlike getBestRankForCategory, this also returns an onboarding rank with zero matches.
 */
export const getMostProminentRank = (ranks: PlayerRanking[]): PlayerRanking | null => {
  if (ranks.length === 0) return null;

  return [...ranks].sort((a, b) => {
    if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    if (b.eloPoints !== a.eloPoints) return b.eloPoints - a.eloPoints;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  })[0] ?? null;
};

/**
 * Get all ranks for a category (or all ranks if no categoryId),
 * sorted by match type order (SINGLES → DOUBLES → MIXED_DOUBLES → rest)
 * then by eloPoints descending.
 */
export const getRanksForCategory = (
  ranks: PlayerRanking[],
  categoryId?: string,
): PlayerRanking[] => {
  const filtered = categoryId
    ? ranks.filter((rank) => rank.categoryId === categoryId)
    : ranks;
  const typeOrder = (type?: string): number =>
    type === 'SINGLES' ? 0 : type === 'DOUBLES' ? 1 : type === 'MIXED_DOUBLES' ? 2 : 3;

  return [...filtered].sort((a, b) => {
    const byType = typeOrder(a.matchType) - typeOrder(b.matchType);
    if (byType !== 0) return byType;
    return b.eloPoints - a.eloPoints;
  });
};

/* ------------------------------------------------------------------ */
/*  ELO progress helpers                                               */
/* ------------------------------------------------------------------ */

export interface EloProgressInfo {
  /** Percentage progress toward the next tier. */
  percent: number;
  /** Index of the current tier in TIER_THRESHOLDS. */
  currentIdx: number;
  /** Index of the next tier, or null if at max. */
  nextIdx: number | null;
  /** Human-readable label for the next milestone. */
  label: string;
}

/** Compute tier progress info from raw ELO points. */
export const getEloProgressInfo = (eloPoints: number, categoryName?: string | null, labels?: EloDisplayLabels): EloProgressInfo => {
  if (categoryName) {
    const sportProgress = getRankProgressInfo(eloPoints, categoryName);
    const nextName = sportProgress.next?.name;
    const remaining = sportProgress.next ? Math.max(0, sportProgress.next.minElo - Math.max(0, eloPoints)) : 0;
    return {
      percent: sportProgress.percent,
      currentIdx: sportProgress.currentIndex,
      nextIdx: sportProgress.nextIndex,
      label: nextName
        ? (labels?.progressToNext?.({ remaining, nextName }) ?? `${remaining} ELO to ${nextName}`)
        : (labels?.progressPeak ?? '🏆 Peak reached'),
    };
  }
  const clamped = Math.max(0, eloPoints);
  const currentIdx = findTierIndex(clamped);
  const nextIdx = currentIdx < TIER_THRESHOLDS.length - 1 ? currentIdx + 1 : null;

  let percent: number;
  if (nextIdx === null) {
    percent = 100;
  } else {
    const currentMin = TIER_THRESHOLDS[currentIdx].minElo;
    const nextMin = TIER_THRESHOLDS[nextIdx].minElo;
    const range = nextMin - currentMin;
    percent = range > 0
      ? Math.min(100, Math.max(0, ((clamped - currentMin) / range) * 100))
      : 0;
  }

  let label: string;
  if (nextIdx === null) {
    label = '🏆 Peak reached — S';
  } else {
    const currentMin = TIER_THRESHOLDS[currentIdx].minElo;
    const nextMin = TIER_THRESHOLDS[nextIdx].minElo;
    const remaining = nextMin - clamped;
    const nextName = TIER_THRESHOLDS[nextIdx].name;
    if (remaining <= 0) {
      label = labels?.progressToNext?.({ remaining: nextMin - currentMin, nextName }) ?? `${nextMin - currentMin} ELO to ${nextName}`;
    } else {
      label = labels?.progressToNext?.({ remaining, nextName }) ?? `${remaining} ELO to ${nextName}`;
    }
  }

  return { percent, currentIdx, nextIdx, label };
};

/* ------------------------------------------------------------------ */
/*  Shield state helpers                                               */
/* ------------------------------------------------------------------ */

export interface ShieldStatus {
  state: 'onboarding' | 'active' | 'broken';
  copy: string;
  /** CSS color class for the shield icon/row. */
  themeClass: string;
}

/**
 * Derive shield display state from rank data.
 *
 * Rules (from product decision):
 * - matchesPlayed <= 0         → onboarding/locked
 * - shieldActive === true      → active
 * - shieldActive !== true && matchesPlayed > 0 → broken
 */
export const getShieldStatus = (rank: PlayerRanking | null | undefined, labels?: EloDisplayLabels): ShieldStatus => {
  const mp = rank?.matchesPlayed ?? 0;
  const shieldActive = rank?.shieldActive;

  if (mp <= 0) {
    return {
      state: 'onboarding',
      copy: labels?.onboardingShield ?? 'Play 1 ranked match to unlock ELO and your rank shield.',
      themeClass: 'text-slate-400',
    };
  }

  if (shieldActive === true) {
    return {
      state: 'active',
      copy: labels?.shieldActive ?? 'Shield intact — protects you once from dropping below your current rank tier.',
      themeClass: 'text-blue-600',
    };
  }

  return {
    state: 'broken',
    copy: labels?.shieldBroken ?? 'Shield broken — gain or lose a rank to restore it.',
    themeClass: 'text-blue-600',
  };
};

/**
 * Get the appropriate shield icon name based on state.
 * Returns the lucide-react icon component name as a string.
 */
export const getShieldIconName = (state: ShieldStatus['state']): string => {
  switch (state) {
    case 'onboarding':
      return 'Shield';
    case 'active':
      return 'ShieldCheck';
    case 'broken':
      return 'ShieldOff';
  }
};

/**
 * Get the "no rank yet" onboarding copy.
 */
export const getOnboardingCopy = (labels?: EloDisplayLabels): string => {
  return labels?.onboardingCopy ?? 'Play 1 ranked match to start your ELO journey.';
};

