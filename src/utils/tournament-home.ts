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

const RECENT_COMPLETED_WINDOW_DAYS = 14;
const RECENT_COMPLETED_WINDOW_MS = RECENT_COMPLETED_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const toTimestamp = (value?: string | null) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const isRecentlyCompletedTournament = (tournament: Tournament) => {
  if (!isTournamentCompleted(tournament.status)) return false;
  const endedAt = toTimestamp(tournament.endDate);
  if (!endedAt) return false;
  return Date.now() - endedAt <= RECENT_COMPLETED_WINDOW_MS;
};

const getCompletedTournamentTimestamp = (tournament: Tournament) =>
  toTimestamp(tournament.endDate) ||
  toTimestamp(tournament.updatedAt) ||
  toTimestamp(tournament.startDate) ||
  toTimestamp(tournament.createdAt);

const getActiveTournamentTimestamp = (tournament: Tournament) => {
  const status = normalizeTournamentStatus(tournament.status);

  if (isTournamentCancelled(status)) {
    return toTimestamp(tournament.updatedAt) || toTimestamp(tournament.createdAt);
  }

  return (
    toTimestamp(tournament.startDate) ||
    toTimestamp(tournament.registrationStartDate) ||
    toTimestamp(tournament.updatedAt) ||
    toTimestamp(tournament.createdAt)
  );
};

export const sortHomepageTournaments = (tournaments: Tournament[]) =>
  [...tournaments].sort((a, b) => getActiveTournamentTimestamp(b) - getActiveTournamentTimestamp(a));

export const getActiveHomepageTournaments = (tournaments: Tournament[]) =>
  sortHomepageTournaments(
    tournaments.filter(
      (tournament) =>
        tournament.status !== 'DRAFT' &&
        tournament.status !== 'CANCELLED' &&
        !isTournamentCompleted(tournament.status)
    )
  );

export const getRecentCompletedTournaments = (tournaments: Tournament[]) =>
  [...tournaments]
    .filter((tournament) => isRecentlyCompletedTournament(tournament))
    .sort((a, b) => getCompletedTournamentTimestamp(b) - getCompletedTournamentTimestamp(a));

const getDiscoveryPriority = (tournament: Tournament) => {
  const status = normalizeTournamentStatus(tournament.status);

  if (isTournamentCompleted(status)) {
    return isRecentlyCompletedTournament(tournament) ? 0 : 1;
  }

  if (isTournamentInProgress(status)) {
    return 2;
  }

  if (isTournamentOpenForRegistration(status)) {
    return 3;
  }

  if (isTournamentRegistrationClosed(status) || isTournamentUpcoming(status)) {
    return 4;
  }

  if (isTournamentCancelled(status)) {
    return 5;
  }

  return 6;
};

const getDiscoveryTimestamp = (tournament: Tournament) => {
  const status = normalizeTournamentStatus(tournament.status);

  if (isTournamentCompleted(status)) {
    return getCompletedTournamentTimestamp(tournament);
  }

  if (isTournamentInProgress(status) || isTournamentOpenForRegistration(status) || isTournamentRegistrationClosed(status) || isTournamentUpcoming(status)) {
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

export const sortDiscoveryTournaments = (tournaments: Tournament[]) =>
  [...tournaments].sort((a, b) => {
    const priorityDelta = getDiscoveryPriority(a) - getDiscoveryPriority(b);
    if (priorityDelta !== 0) return priorityDelta;
    return getDiscoveryTimestamp(b) - getDiscoveryTimestamp(a);
  });

export const buildHomepageTournamentFeed = (tournaments: Tournament[]) => [
  ...getActiveHomepageTournaments(tournaments),
  ...getRecentCompletedTournaments(tournaments),
];

