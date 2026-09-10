import type { TournamentResult } from './api';

/**
 * The public result tab is meaningful only when at least one ranked
 * participant can actually be rendered. A completed tournament lifecycle or
 * a finalized empty result payload is not enough to expose the tab.
 */
export function hasPublishedTournamentResults(
  result: TournamentResult | null | undefined,
): boolean {
  return Boolean(
    result?.awards.some(
      (award) =>
        typeof award.rank === 'number' &&
        Number.isFinite(award.rank) &&
        award.rank >= 1 &&
        Boolean(award.participant),
    ),
  );
}
