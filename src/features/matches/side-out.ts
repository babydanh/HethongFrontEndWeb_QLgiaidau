import type { Match, PickleballSideOutState } from '@/types/match';

export const buildEmptySideOutState = (): PickleballSideOutState => ({
  servingTeam: null,
  serverNumber: 1,
  openingSequenceDone: false,
});

export const readSideOutState = (match: Pick<Match, 'scoreDetails'>): PickleballSideOutState => {
  const rawState = match.scoreDetails?.sideOutState;
  if (!rawState) {
    return buildEmptySideOutState();
  }

  const servingTeam =
    rawState.servingTeam === 1 || rawState.servingTeam === 2 ? rawState.servingTeam : null;
  const serverNumber = rawState.serverNumber === 2 ? 2 : 1;

  return {
    servingTeam,
    serverNumber,
    openingSequenceDone: rawState.openingSequenceDone === true,
  };
};

export const computeNextSideOutState = (
  current: PickleballSideOutState,
): PickleballSideOutState => {
  if (current.servingTeam == null) {
    return current;
  }

  if (!current.openingSequenceDone) {
    return {
      servingTeam: current.servingTeam === 1 ? 2 : 1,
      serverNumber: 1,
      openingSequenceDone: true,
    };
  }

  if (current.serverNumber === 1) {
    return {
      ...current,
      serverNumber: 2,
    };
  }

  return {
    servingTeam: current.servingTeam === 1 ? 2 : 1,
    serverNumber: 1,
    openingSequenceDone: true,
  };
};

export const setServingTeamSideOutState = (
  team: 1 | 2,
  openingSequenceDone = true,
): PickleballSideOutState => ({
  servingTeam: team,
  serverNumber: 1,
  openingSequenceDone,
});
