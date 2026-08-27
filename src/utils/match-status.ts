import type { Match } from '@/types/match';

const ACTIVE_MATCH_STATUSES = new Set(['ONGOING', 'LIVE', 'PLAYING', 'IN_PROGRESS']);

export const isActiveMatch = (
  match: Pick<Match, 'status' | 'isBye' | 'participant1Id' | 'participant2Id' | 'completedAt' | 'winnerId'> | null | undefined,
): boolean => {
  if (!match || match.isBye) return false;

  const status = String(match.status ?? '').trim().toUpperCase();
  if (!ACTIVE_MATCH_STATUSES.has(status)) return false;

  // A stale ONGOING event must not resurrect a match that already has a
  // terminal completion marker or a confirmed winner.
  if (match.completedAt || match.winnerId) return false;

  return Boolean(match.participant1Id && match.participant2Id);
};
