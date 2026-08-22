export type FootballMatchPhase =
  | 'FIRST_HALF'
  | 'HALFTIME'
  | 'SECOND_HALF'
  | 'STOPPAGE_TIME'
  | 'FULL_TIME'
  | 'EXTRA_TIME_FIRST_HALF'
  | 'EXTRA_TIME_BREAK'
  | 'EXTRA_TIME_SECOND_HALF'
  | 'PENALTY_SHOOTOUT'
  | 'COMPLETED';

export type FootballEventType =
  | 'GOAL'
  | 'OWN_GOAL'
  | 'PENALTY_GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'FOUL'
  | 'SUBSTITUTION'
  | 'VAR'
  | 'NOTE';

export interface FootballScoreEvent {
  id: string;
  type: FootballEventType;
  team: 1 | 2;
  playerName?: string;
  minute: number;
  addedMinute?: number;
  note?: string;
}

export interface FootballShootoutScore {
  team1Goals: number;
  team2Goals: number;
  winnerId: string | null;
}

export interface FootballScoreState {
  team1Goals: number;
  team2Goals: number;
  phase: FootballMatchPhase;
  minute: number;
  addedMinute: number;
  events: FootballScoreEvent[];
  shootout?: FootballShootoutScore;
}

export const DEFAULT_FOOTBALL_SCORE: FootballScoreState = {
  team1Goals: 0,
  team2Goals: 0,
  phase: 'FIRST_HALF',
  minute: 0,
  addedMinute: 0,
  events: [],
};

function asNonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function readFootballScore(scoreDetails?: Record<string, unknown> | null): FootballScoreState {
  const raw = scoreDetails?.football;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_FOOTBALL_SCORE;
  }

  const value = raw as Record<string, unknown>;
  const events = Array.isArray(value.events)
    ? value.events.flatMap((event): FootballScoreEvent[] => {
        if (!event || typeof event !== 'object' || Array.isArray(event)) return [];
        const item = event as Record<string, unknown>;
        const team = item.team === 2 ? 2 : item.team === 1 ? 1 : null;
        const type = typeof item.type === 'string' ? item.type as FootballEventType : null;
        if (!team || !type || typeof item.id !== 'string') return [];
        return [{
          id: item.id,
          type,
          team,
          playerName: typeof item.playerName === 'string' ? item.playerName : undefined,
          minute: asNonNegativeInteger(item.minute),
          addedMinute: asNonNegativeInteger(item.addedMinute),
          note: typeof item.note === 'string' ? item.note : undefined,
        }];
      })
    : [];

  const phase = typeof value.phase === 'string' ? value.phase as FootballMatchPhase : DEFAULT_FOOTBALL_SCORE.phase;
  const rawShootout = value.shootout;
  const shootout = rawShootout && typeof rawShootout === 'object' && !Array.isArray(rawShootout)
    ? (() => {
        const item = rawShootout as Record<string, unknown>;
        return {
          team1Goals: asNonNegativeInteger(item.team1Goals),
          team2Goals: asNonNegativeInteger(item.team2Goals),
          winnerId: typeof item.winnerId === 'string' ? item.winnerId : null,
        } satisfies FootballShootoutScore;
      })()
    : undefined;

  return {
    team1Goals: asNonNegativeInteger(value.team1Goals),
    team2Goals: asNonNegativeInteger(value.team2Goals),
    phase,
    minute: asNonNegativeInteger(value.minute),
    addedMinute: asNonNegativeInteger(value.addedMinute),
    events,
    ...(shootout ? { shootout } : {}),
  };
}

export function writeFootballScore(score: FootballScoreState): Record<string, unknown> {
  return {
    team1Goals: score.team1Goals,
    team2Goals: score.team2Goals,
    phase: score.phase,
    minute: score.minute,
    addedMinute: score.addedMinute,
    events: score.events,
    ...(score.shootout ? { shootout: score.shootout } : {}),
  };
}

export type FootballPhaseTranslationKey =
  | 'footballFirstHalf'
  | 'footballSecondHalf'
  | 'footballHalftime'
  | 'footballStoppageTime'
  | 'footballFullTime'
  | 'footballExtraTimeFirstHalf'
  | 'footballExtraTimeBreak'
  | 'footballExtraTimeSecondHalf'
  | 'footballPenaltyShootout'
  | 'footballCompleted';

export function footballPhaseLabel(phase: FootballMatchPhase): FootballPhaseTranslationKey {
  const labels: Record<FootballMatchPhase, FootballPhaseTranslationKey> = {
    FIRST_HALF: 'footballFirstHalf',
    HALFTIME: 'footballHalftime',
    SECOND_HALF: 'footballSecondHalf',
    STOPPAGE_TIME: 'footballStoppageTime',
    FULL_TIME: 'footballFullTime',
    EXTRA_TIME_FIRST_HALF: 'footballExtraTimeFirstHalf',
    EXTRA_TIME_BREAK: 'footballExtraTimeBreak',
    EXTRA_TIME_SECOND_HALF: 'footballExtraTimeSecondHalf',
    PENALTY_SHOOTOUT: 'footballPenaltyShootout',
    COMPLETED: 'footballCompleted',
  };
  return labels[phase];
}
