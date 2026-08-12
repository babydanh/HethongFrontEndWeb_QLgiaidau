/** Các mốc ELO xác định tier — dùng chung cho toàn bộ frontend */
export const TIER_THRESHOLDS = [
  { minElo: 1000, name: 'Low Tier D' },
  { minElo: 1100, name: 'High Tier D' },
  { minElo: 1200, name: 'Low Tier C' },
  { minElo: 1300, name: 'High Tier C' },
  { minElo: 1400, name: 'Low Tier B' },
  { minElo: 1500, name: 'High Tier B' },
  { minElo: 1600, name: 'Low Tier A' },
  { minElo: 1700, name: 'High Tier A' },
  { minElo: 1800, name: 'Tier S' },
] as const;

/** Tìm index của tier hiện tại dựa trên ELO */
export function findTierIndex(elo: number): number {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (elo >= TIER_THRESHOLDS[i].minElo) return i;
  }
  return 0;
}

/** Tính % progress từ tier hiện tại đến tier kế tiếp */
export function calcEloProgress(elo: number): {
  progress: number;
  currentIdx: number;
  nextIdx: number | null;
} {
  const idx = findTierIndex(elo);
  if (idx === TIER_THRESHOLDS.length - 1) {
    return { progress: 100, currentIdx: idx, nextIdx: null };
  }
  const currentMin = TIER_THRESHOLDS[idx].minElo;
  const nextMin = TIER_THRESHOLDS[idx + 1].minElo;
  const range = nextMin - currentMin;
  const progress = range > 0 ? Math.min(100, Math.max(0, ((elo - currentMin) / range) * 100)) : 0;
  return { progress, currentIdx: idx, nextIdx: idx + 1 };
}

/** Lấy background color class từ tier color string (class đầu tiên) */
export function getTierBgColor(tierColor: string): string {
  return tierColor.split(' ')[0] || 'bg-slate-500';
}

