import type { Tournament } from '@/types/tournament';

/** Reads both the normalized API field and the legacy JSON config field. */
export function shouldHideFeaturedCardText(tournament: Tournament): boolean {
  return tournament.hideFeaturedCardText === true || tournament.tournamentConfig?.hideFeaturedCardText === true;
}

