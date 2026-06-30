import type { SportRuleKind, SportRulesEnvelope } from '@/types/tournament';

const DEFAULT_SPORT_RULES: Record<SportRuleKind, SportRulesEnvelope> = {
  BADMINTON: {
    version: 1,
    kind: 'BADMINTON',
    scoringModel: 'RALLY_POINT_SET',
    setsToWin: 2,
    pointsPerSet: 21,
    winByTwo: true,
    maxPoints: 30,
    scoring: {
      setsToWin: 2,
      pointsPerSet: 21,
      winByTwo: true,
      maxPoints: 30,
    },
  },
  TABLE_TENNIS: {
    version: 1,
    kind: 'TABLE_TENNIS',
    scoringModel: 'RALLY_POINT_SET',
    setsToWin: 3,
    pointsPerSet: 11,
    winByTwo: true,
    maxPoints: 99,
    scoring: {
      setsToWin: 3,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
    },
  },
  PICKLEBALL_RALLY: {
    version: 1,
    kind: 'PICKLEBALL_RALLY',
    scoringModel: 'RALLY_POINT_SET',
    setsToWin: 2,
    pointsPerSet: 11,
    winByTwo: true,
    maxPoints: 15,
    scoring: {
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
    },
  },
  PICKLEBALL_SIDE_OUT: {
    version: 1,
    kind: 'PICKLEBALL_SIDE_OUT',
    scoringModel: 'PICKLEBALL_SIDE_OUT',
    setsToWin: 1,
    pointsPerSet: 11,
    winByTwo: true,
    maxPoints: 11,
    tiebreakPoints: 11,
    format: {
      gamePoint: 11,
      firstServerRule: 'STANDARD',
      doublesServeFlow: 'TWO_SERVER',
    },
    scoring: {
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 11,
      tiebreakPoints: 11,
    },
  },
  TENNIS: {
    version: 1,
    kind: 'TENNIS',
    scoringModel: 'TENNIS_SET',
    setsToWin: 2,
    pointsPerSet: 6,
    winByTwo: true,
    tiebreakPoints: 7,
    maxPoints: 7,
    scoring: {
      setsToWin: 2,
      pointsPerSet: 6,
      winByTwo: true,
      tiebreakPoints: 7,
      maxPoints: 7,
    },
  },
};

export function buildDefaultSportRules(kind: SportRuleKind = 'BADMINTON'): SportRulesEnvelope {
  const base = DEFAULT_SPORT_RULES[kind];
  return {
    ...base,
    scoring: base.scoring ? { ...base.scoring } : undefined,
    format: base.format ? { ...base.format } : undefined,
  };
}
