import type { BracketMatch } from '@/features/tournaments/api';

/**
 * A live match is immutable from the bracket editor while play is in progress.
 * Other match states remain eligible for the organizer's future drag-and-drop flow.
 */
export function isBracketMatchLive(
  match: Pick<BracketMatch, 'status'> | null | undefined,
): boolean {
  const status = match?.status?.toUpperCase();
  return status === 'ONGOING' || status === 'IN_PROGRESS' || status === 'LIVE';
}

export function isBracketMatchDragLocked(
  match: Pick<BracketMatch, 'status'> | null | undefined,
): boolean {
  return isBracketMatchLive(match);
}

