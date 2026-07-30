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

/* ------------------------------------------------------------------ */
/*  Match type labels                                                  */
/* ------------------------------------------------------------------ */

export type EloMatchType = 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';

const MATCH_TYPE_LABELS: Record<EloMatchType, string> = {
  SINGLES: 'Đơn',
  DOUBLES: 'Đôi',
  MIXED_DOUBLES: 'Đôi nam nữ',
};

/** Human-readable label for a match type. */
export const getEloMatchTypeLabel = (matchType?: string | null): string => {
  if (matchType === 'SINGLES' || matchType === 'DOUBLES' || matchType === 'MIXED_DOUBLES') {
    return MATCH_TYPE_LABELS[matchType];
  }
  return 'Tổng quan';
};

/** Display name combining category and match type. */
export const getRankDisplayName = (rank: PlayerRanking): string => {
  const categoryName = rank.categoryName || 'Môn thi đấu';
  const matchTypeLabel = getEloMatchTypeLabel(rank.matchType);
  return `${categoryName} • ${matchTypeLabel}`;
};

/* ------------------------------------------------------------------ */
/*  Tier name helpers                                                  */
/* ------------------------------------------------------------------ */

/** Human-readable tier name from a rank record. */
export const getRankTierName = (rank: PlayerRanking | null | undefined): string => {
  if (!rank || rank.matchesPlayed <= 0) return 'Chưa xếp hạng';
  return rank.tier?.name || rank.tierName || 'Đã xếp hạng';
};

/** Win rate as a rounded percentage. */
export const getRankWinRate = (rank: PlayerRanking | null | undefined): number => {
  if (!rank || rank.matchesPlayed <= 0) return 0;
  return Math.round((rank.matchesWon / rank.matchesPlayed) * 100);
};

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

  const active = candidates.filter((rank) => rank.matchesPlayed > 0);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if (b.eloPoints !== a.eloPoints) return b.eloPoints - a.eloPoints;
    if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  })[0];
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
export const getEloProgressInfo = (eloPoints: number): EloProgressInfo => {
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
    label = '🏆 Đã đạt đỉnh — S';
  } else {
    const currentMin = TIER_THRESHOLDS[currentIdx].minElo;
    const nextMin = TIER_THRESHOLDS[nextIdx].minElo;
    const remaining = nextMin - clamped;
    const nextName = TIER_THRESHOLDS[nextIdx].name;
    if (remaining <= 0) {
      label = `Còn ${nextMin - currentMin} ELO tới ${nextName}`;
    } else {
      label = `Còn ${remaining} ELO tới ${nextName}`;
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
export const getShieldStatus = (rank: PlayerRanking | null | undefined): ShieldStatus => {
  const mp = rank?.matchesPlayed ?? 0;
  const shieldActive = rank?.shieldActive;

  if (mp <= 0) {
    return {
      state: 'onboarding',
      copy: 'Đánh 1 trận xếp hạng để mở khóa ELO và khiên rank.',
      themeClass: 'text-slate-400',
    };
  }

  if (shieldActive === true) {
    return {
      state: 'active',
      copy: 'Khiên còn nguyên — đỡ 1 lần rớt khỏi mốc rank hiện tại.',
      themeClass: 'text-blue-600',
    };
  }

  return {
    state: 'broken',
    copy: 'Khiên đã vỡ — cần lên rank hoặc rớt rank để hồi lại khiên.',
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
export const getOnboardingCopy = (): string => {
  return 'Đánh 1 trận xếp hạng để bắt đầu tiến trình ELO.';
};
