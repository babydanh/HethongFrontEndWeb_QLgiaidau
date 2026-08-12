import type { Tournament } from '@/features/tournaments/api';
import {
  isTournamentCancelled,
  isTournamentCompleted,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentRegistrationClosed,
  isTournamentUpcoming,
  normalizeTournamentStatus,
} from './tournament-status';

const toTimestamp = (value?: string | null) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getFollowedTournamentSortTimestamp = (tournament: Tournament) => {
  const status = normalizeTournamentStatus(tournament.status);

  if (isTournamentCompleted(status)) {
    return (
      toTimestamp(tournament.endDate) ||
      toTimestamp(tournament.updatedAt) ||
      toTimestamp(tournament.startDate) ||
      toTimestamp(tournament.createdAt)
    );
  }

  if (isTournamentInProgress(status)) {
    return (
      toTimestamp(tournament.startDate) ||
      toTimestamp(tournament.updatedAt) ||
      toTimestamp(tournament.createdAt)
    );
  }

  if (
    isTournamentOpenForRegistration(status) ||
    isTournamentUpcoming(status) ||
    isTournamentRegistrationClosed(status)
  ) {
    return (
      toTimestamp(tournament.startDate) ||
      toTimestamp(tournament.registrationStartDate) ||
      toTimestamp(tournament.updatedAt) ||
      toTimestamp(tournament.createdAt)
    );
  }

  if (isTournamentCancelled(status)) {
    return toTimestamp(tournament.updatedAt) || toTimestamp(tournament.createdAt);
  }

  return toTimestamp(tournament.updatedAt) || toTimestamp(tournament.createdAt);
};

export const sortFollowedTournaments = (tournaments: Tournament[]) =>
  [...tournaments].sort(
    (a, b) => getFollowedTournamentSortTimestamp(b) - getFollowedTournamentSortTimestamp(a)
  );

