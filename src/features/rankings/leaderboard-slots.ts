import type { PlayerRanking } from '@/types/ranking';

const PLACEHOLDER_EPOCH = '1970-01-01T00:00:00.000Z';

/**
 * Keeps the public leaderboard's 11–20 structure visible without inventing
 * ranking data. Placeholder rows are presentation-only and must never be sent
 * back to the API or treated as eligible players.
 */
export function buildLeaderboardStandingSlots(
  rankings: PlayerRanking[],
  categoryId: string,
  selectedMatchType: string,
  slotCount = 10,
): PlayerRanking[] {
  const realData = rankings.slice(10, 20);
  const missingCount = Math.max(slotCount - realData.length, 0);
  const placeholders: PlayerRanking[] = Array.from({ length: missingCount }, (_, index) => ({
    id: `placeholder-${categoryId || 'all'}-${selectedMatchType || 'all'}-${realData.length + index + 11}`,
    categoryId,
    eloPoints: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    winStreak: 0,
    updatedAt: PLACEHOLDER_EPOCH,
  }));

  return [...realData, ...placeholders];
}

export function isLeaderboardPlaceholder(ranking: PlayerRanking): boolean {
  return ranking.id.startsWith('placeholder-');
}
