import type { Match } from '@/types/match';

const ACTIVE_MATCH_STATUSES = new Set(['ONGOING', 'LIVE', 'PLAYING', 'IN_PROGRESS']);

export const isActiveMatch = (
  match: (Pick<Match, 'status' | 'isBye' | 'participant1Id' | 'participant2Id' | 'completedAt' | 'winnerId'> & {
    winner_id?: string | null;
    completed_at?: string | Date | null;
    participant1_id?: string | null;
    participant2_id?: string | null;
    is_bye?: boolean;
  }) | null | undefined,
): boolean => {
  if (!match || match.isBye || match.is_bye) return false;

  const status = String(match.status ?? '').trim().toUpperCase();
  if (!ACTIVE_MATCH_STATUSES.has(status)) return false;

  // A stale ONGOING event must not resurrect a match that already has a
  // terminal completion marker or a confirmed winner.
  if (match.completedAt || match.completed_at || match.winnerId || match.winner_id) return false;

  const p1 = match.participant1Id || match.participant1_id;
  const p2 = match.participant2Id || match.participant2_id;
  return Boolean(p1 && p2);
};
