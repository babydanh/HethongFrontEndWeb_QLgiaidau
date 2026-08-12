import { buildDefaultSportRules } from './defaults';
import type {
  SportRuleKind,
  SportRulesEnvelope,
  StageRoundConfig,
  StageRoundRuleConfig,
} from '@/types/tournament';

interface SportRulePayloadOptions {
  kind: SportRuleKind;
  setsToWin: number;
  pointsPerSet: number;
  winByTwo: boolean;
  maxPoints?: number | null;
  tiebreakPoints?: number | null;
  tiebreakerMode?: 'split' | 'playoff';
  roundsToPlay?: number;
  mode?: 'LITE' | 'STRICT';
}

function toPositiveInteger(value: number): number {
  return Math.max(1, Math.trunc(value));
}

export function buildSportRulesPayload(options: SportRulePayloadOptions): SportRulesEnvelope {
  const base = buildDefaultSportRules(options.kind);
  const scoring = { ...(base.scoring ?? {}) };
  const format = base.format ? { ...base.format } : undefined;
  const bestOf = toPositiveInteger(options.setsToWin) * 2 - 1;
  const maxPoints = options.maxPoints == null ? undefined : toPositiveInteger(options.maxPoints);
  const tiebreakPoints = options.tiebreakPoints == null ? undefined : toPositiveInteger(options.tiebreakPoints);

  const payload: SportRulesEnvelope = {
    version: base.version,
    kind: options.kind,
    scoringModel: base.scoringModel,
    setsToWin: toPositiveInteger(options.setsToWin),
    pointsPerSet: toPositiveInteger(options.pointsPerSet),
    winByTwo: options.winByTwo,
    scoring: {
      ...scoring,
      setsToWin: toPositiveInteger(options.setsToWin),
      pointsPerSet: toPositiveInteger(options.pointsPerSet),
      winByTwo: options.winByTwo,
    },
    ...(format ? { format } : {}),
  };

  if (options.mode) {
    payload.mode = options.mode;
  }

  if (maxPoints !== undefined) {
    payload.maxPoints = maxPoints;
    if (payload.scoring) {
      payload.scoring.maxPoints = maxPoints;
    }
  }

  if (tiebreakPoints !== undefined) {
    payload.tiebreakPoints = tiebreakPoints;
    if (payload.scoring) {
      payload.scoring.tiebreakPoints = tiebreakPoints;
    }
  }

  if (options.tiebreakerMode) {
    payload.tiebreakerMode = options.tiebreakerMode;
  }

  if (options.roundsToPlay) {
    payload.roundsToPlay = toPositiveInteger(options.roundsToPlay);
  }

  if (payload.format) {
    switch (options.kind) {
      case 'TENNIS':
        payload.format = {
          ...payload.format,
          bestOfSets: bestOf,
          gamesPerSet: toPositiveInteger(options.pointsPerSet),
          winByTwoGames: options.winByTwo,
          ...(tiebreakPoints !== undefined ? { tiebreakPoints } : {}),
        };
        break;
      case 'PICKLEBALL_SIDE_OUT':
        payload.format = {
          ...payload.format,
          gamePoint: toPositiveInteger(options.pointsPerSet),
          winByTwo: options.winByTwo,
        };
        break;
      case 'FOOTBALL':
        payload.format = {
          ...payload.format,
          halvesCount: 2,
          halfDuration: 20,
          allowDraw: true,
        };
        break;
      default:
        payload.format = {
          ...payload.format,
          bestOf,
          pointsPerGame: toPositiveInteger(options.pointsPerSet),
          winByTwo: options.winByTwo,
          ...(maxPoints !== undefined ? { capAt: maxPoints } : {}),
        };
        break;
    }
  }

  return payload;
}

export function buildStageRoundRulePayload(
  options: SportRulePayloadOptions & {
    venueId?: string | null;
    scheduledDate?: string | null;
    customNotes?: string | null;
  },
): StageRoundRuleConfig {
  const basePayload = buildSportRulesPayload(options);

  return {
    ...basePayload,
    ...(options.venueId !== undefined ? { venue_id: options.venueId } : {}),
    ...(options.scheduledDate !== undefined ? { scheduled_date: options.scheduledDate } : {}),
    ...(options.customNotes !== undefined ? { custom_notes: options.customNotes } : {}),
  };
}

export function buildStageRoundConfigPayload(
  options: SportRulePayloadOptions & {
    rounds?: StageRoundConfig['rounds'];
  },
): StageRoundConfig {
  const basePayload = buildSportRulesPayload(options);

  return {
    ...basePayload,
    ...(options.rounds ? { rounds: options.rounds } : {}),
  };
}
