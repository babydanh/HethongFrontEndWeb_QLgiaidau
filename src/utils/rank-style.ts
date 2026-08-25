import { TIER_THRESHOLDS } from '@/utils/elo';

export interface RankStyle {
  name: string;
  ringClass: string;
  badgeClass: string;
  progressClass: string;
  minElo: number;
  maxElo: number | null;
}

type TierDefinition = Omit<RankStyle, 'ringClass' | 'badgeClass' | 'progressClass'> & {
  ringClass: string;
  badgeClass: string;
  progressClass: string;
};

const STANDARD_TIERS: TierDefinition[] = [
  { name: 'Low Tier D', minElo: 0, maxElo: 1099, ringClass: 'ring-slate-300', badgeClass: 'bg-slate-700 text-white font-bold shadow-2xs', progressClass: 'bg-slate-500' },
  { name: 'High Tier D', minElo: 1100, maxElo: 1199, ringClass: 'ring-slate-500', badgeClass: 'bg-slate-800 text-white font-bold shadow-2xs', progressClass: 'bg-slate-600' },
  { name: 'Low Tier C', minElo: 1200, maxElo: 1299, ringClass: 'ring-emerald-300', badgeClass: 'bg-emerald-600 text-white font-bold shadow-2xs', progressClass: 'bg-emerald-500' },
  { name: 'High Tier C', minElo: 1300, maxElo: 1399, ringClass: 'ring-emerald-500', badgeClass: 'bg-emerald-700 text-white font-bold shadow-2xs', progressClass: 'bg-emerald-600' },
  { name: 'Low Tier B', minElo: 1400, maxElo: 1499, ringClass: 'ring-blue-300', badgeClass: 'bg-blue-600 text-white font-bold shadow-2xs', progressClass: 'bg-blue-500' },
  { name: 'High Tier B', minElo: 1500, maxElo: 1599, ringClass: 'ring-blue-500', badgeClass: 'bg-blue-700 text-white font-bold shadow-2xs', progressClass: 'bg-blue-600' },
  { name: 'Low Tier A', minElo: 1600, maxElo: 1699, ringClass: 'ring-rose-300', badgeClass: 'bg-rose-600 text-white font-bold shadow-2xs', progressClass: 'bg-rose-500' },
  { name: 'High Tier A', minElo: 1700, maxElo: 1799, ringClass: 'ring-rose-500', badgeClass: 'bg-rose-700 text-white font-bold shadow-2xs', progressClass: 'bg-rose-600' },
  { name: 'Tier S', minElo: 1800, maxElo: null, ringClass: 'ring-amber-400', badgeClass: 'bg-amber-600 text-white font-bold shadow-2xs', progressClass: 'bg-amber-500' },
];

const SPORT_TIERS: Record<string, TierDefinition[]> = {
  pickleball: [
    { name: 'Beginner', minElo: 0, maxElo: 1499, ringClass: 'ring-slate-400', badgeClass: 'bg-slate-700 text-white font-bold shadow-2xs', progressClass: 'bg-slate-500' },
    { name: 'Intermediate', minElo: 1500, maxElo: 1999, ringClass: 'ring-blue-500', badgeClass: 'bg-blue-600 text-white font-bold shadow-2xs', progressClass: 'bg-blue-600' },
    { name: 'Advanced', minElo: 2000, maxElo: 2499, ringClass: 'ring-emerald-500', badgeClass: 'bg-emerald-600 text-white font-bold shadow-2xs', progressClass: 'bg-emerald-600' },
    { name: 'Pro', minElo: 2500, maxElo: 4000, ringClass: 'ring-amber-400', badgeClass: 'bg-amber-600 text-white font-bold shadow-2xs', progressClass: 'bg-amber-500' },
  ],
  tennis: [
    { name: 'NTRP 2.0-3.0 (Beginner)', minElo: 0, maxElo: 1499, ringClass: 'ring-slate-400', badgeClass: 'bg-slate-700 text-white font-bold shadow-2xs', progressClass: 'bg-slate-500' },
    { name: 'NTRP 3.5-4.0 (Intermediate)', minElo: 1500, maxElo: 1999, ringClass: 'ring-blue-500', badgeClass: 'bg-blue-600 text-white font-bold shadow-2xs', progressClass: 'bg-blue-600' },
    { name: 'NTRP 4.5+ (Advanced)', minElo: 2000, maxElo: 2500, ringClass: 'ring-emerald-500', badgeClass: 'bg-emerald-600 text-white font-bold shadow-2xs', progressClass: 'bg-emerald-600' },
  ],
};

const normalize = (value?: string | null): string => value?.trim().toLowerCase() || '';

const getSportKey = (categoryName?: string | null): string | null => {
  const category = normalize(categoryName);
  if (category.includes('pickle')) return 'pickleball';
  if (category.includes('tennis') || category.includes('quần vợt')) return 'tennis';
  return null;
};

/** Ordered tier definitions used by badges, legends and progress bars. */
export function getRankTierDefinitions(categoryName?: string | null): readonly RankStyle[] {
  const sportKey = getSportKey(categoryName);
  return sportKey ? SPORT_TIERS[sportKey] : STANDARD_TIERS;
}

const matchesTierName = (tier: TierDefinition, tierName: string): boolean => {
  const normalizedTier = normalize(tier.name);
  return tierName === normalizedTier || tierName.includes(normalizedTier);
};

export function getRankStyle(
  elo: number | null | undefined,
  tierName?: string | null,
  categoryName?: string | null,
): RankStyle {
  const points = typeof elo === 'number' && Number.isFinite(elo) ? elo : 0;
  const allTiers = getRankTierDefinitions(categoryName);
  const normalizedTierName = normalize(tierName);
  const namedTier = normalizedTierName
    ? allTiers.find((tier) => matchesTierName(tier, normalizedTierName))
      ?? STANDARD_TIERS.find((tier) => matchesTierName(tier, normalizedTierName))
      ?? Object.values(SPORT_TIERS).flat().find((tier) => matchesTierName(tier, normalizedTierName))
    : undefined;
  if (namedTier) return namedTier;

  const fallback = [...allTiers].reverse().find((tier) => points >= tier.minElo) ?? allTiers[0];
  // Preserve a future/custom backend tier label while using the closest
  // ELO-based visual palette until that tier receives an explicit style.
  return tierName?.trim() ? { ...fallback, name: tierName.trim() } : fallback;
}

/** Standard progress metadata remains available to legacy ELO progress cards. */
export function getStandardRankStyleByIndex(index: number): RankStyle {
  const threshold = TIER_THRESHOLDS[index] ?? TIER_THRESHOLDS[0];
  return getRankStyle(threshold.minElo, threshold.name);
}

export function getStandardRankStyles(): RankStyle[] {
  return TIER_THRESHOLDS.map((_, index) => getStandardRankStyleByIndex(index));
}

export interface RankProgressInfo {
  percent: number;
  currentIndex: number;
  nextIndex: number | null;
  current: RankStyle;
  next: RankStyle | null;
}

/** Calculate progress using the selected sport's own tier boundaries. */
export function getRankProgressInfo(elo: number, categoryName?: string | null): RankProgressInfo {
  const tiers = getRankTierDefinitions(categoryName);
  const points = Number.isFinite(elo) ? Math.max(0, elo) : 0;
  let currentIndex = 0;
  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    if (points >= tiers[index].minElo) {
      currentIndex = index;
      break;
    }
  }
  const nextIndex = currentIndex < tiers.length - 1 ? currentIndex + 1 : null;
  if (nextIndex === null) {
    return { percent: 100, currentIndex, nextIndex, current: tiers[currentIndex], next: null };
  }
  const current = tiers[currentIndex];
  const next = tiers[nextIndex];
  const range = next.minElo - current.minElo;
  const percent = range > 0 ? Math.min(100, Math.max(0, ((points - current.minElo) / range) * 100)) : 0;
  return { percent, currentIndex, nextIndex, current, next };
}
