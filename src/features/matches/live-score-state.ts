import type {
  Match,
  MatchPenaltyRecord,
  MatchScore,
  TennisLivePointState,
  TennisPointLabel,
} from '@/types/match';
import type { ResolvedSportRuleView } from '@/features/tournaments/sport-rules/normalize';

const TENNIS_STANDARD_POINTS: TennisPointLabel[] = ['0', '15', '30', '40'];

export interface TennisPointUpdateResult {
  nextSet: MatchScore;
  nextLiveState: TennisLivePointState;
  gameWinner: 1 | 2 | null;
}

type TennisPointOptions = {
  enableTiebreak?: boolean;
};

export function createTennisLivePointState(
  currentSet: MatchScore,
  options: TennisPointOptions = {},
): TennisLivePointState {
  const enableTiebreak = options.enableTiebreak ?? true;
  return enableTiebreak && currentSet.team1Score === 6 && currentSet.team2Score === 6
    ? { mode: 'tiebreak', team1Point: 0, team2Point: 0 }
    : { mode: 'standard', team1Point: '0', team2Point: '0' };
}

export function readTennisLivePointState(
  match: Pick<Match, 'scoreDetails'>,
  currentSet: MatchScore,
  options: TennisPointOptions = {},
): TennisLivePointState {
  const enableTiebreak = options.enableTiebreak ?? true;
  const rawState = match.scoreDetails?.liveState?.tennisPointState;
  const baseState = createTennisLivePointState(currentSet, { enableTiebreak });
  const isTiebreakMode = baseState.mode === 'tiebreak';

  if (!rawState) {
    return baseState;
  }

  if (rawState.mode === 'tiebreak' && enableTiebreak) {
    return {
      mode: 'tiebreak',
      team1Point: typeof rawState.team1Point === 'number' ? rawState.team1Point : 0,
      team2Point: typeof rawState.team2Point === 'number' ? rawState.team2Point : 0,
    };
  }

  const normalizeStandard = (value: unknown): TennisPointLabel =>
    value === '15' || value === '30' || value === '40' || value === 'A' ? value : '0';

  return {
    mode: isTiebreakMode ? 'tiebreak' : 'standard',
    team1Point: isTiebreakMode ? 0 : normalizeStandard(rawState.team1Point),
    team2Point: isTiebreakMode ? 0 : normalizeStandard(rawState.team2Point),
  };
}

export function awardTennisPoint(
  currentSet: MatchScore,
  liveState: TennisLivePointState,
  winnerTeam: 1 | 2,
  rules: Pick<ResolvedSportRuleView, 'tiebreakPoints'>,
  options: TennisPointOptions = {},
): TennisPointUpdateResult {
  if (liveState.mode === 'tiebreak' && (options.enableTiebreak ?? true)) {
    const nextTeam1Point = (typeof liveState.team1Point === 'number' ? liveState.team1Point : 0) + (winnerTeam === 1 ? 1 : 0);
    const nextTeam2Point = (typeof liveState.team2Point === 'number' ? liveState.team2Point : 0) + (winnerTeam === 2 ? 1 : 0);
    const winnerPoints = winnerTeam === 1 ? nextTeam1Point : nextTeam2Point;
    const loserPoints = winnerTeam === 1 ? nextTeam2Point : nextTeam1Point;

    if (winnerPoints >= rules.tiebreakPoints && winnerPoints - loserPoints >= 2) {
      return {
        nextSet:
          winnerTeam === 1
            ? { ...currentSet, team1Score: currentSet.team1Score + 1 }
            : { ...currentSet, team2Score: currentSet.team2Score + 1 },
        nextLiveState: createTennisLivePointState(
          winnerTeam === 1
            ? { ...currentSet, team1Score: currentSet.team1Score + 1 }
            : { ...currentSet, team2Score: currentSet.team2Score + 1 },
          options,
        ),
        gameWinner: winnerTeam,
      };
    }

    return {
      nextSet: currentSet,
      nextLiveState: {
        mode: 'tiebreak',
        team1Point: nextTeam1Point,
        team2Point: nextTeam2Point,
      },
      gameWinner: null,
    };
  }

  const currentWinnerPoint = winnerTeam === 1 ? liveState.team1Point : liveState.team2Point;
  const currentLoserPoint = winnerTeam === 1 ? liveState.team2Point : liveState.team1Point;

  if (currentWinnerPoint === '40' && currentLoserPoint !== '40' && currentLoserPoint !== 'A') {
    return {
      nextSet:
        winnerTeam === 1
          ? { ...currentSet, team1Score: currentSet.team1Score + 1 }
          : { ...currentSet, team2Score: currentSet.team2Score + 1 },
      nextLiveState: createTennisLivePointState(
        winnerTeam === 1
          ? { ...currentSet, team1Score: currentSet.team1Score + 1 }
          : { ...currentSet, team2Score: currentSet.team2Score + 1 },
        options,
      ),
      gameWinner: winnerTeam,
    };
  }

  if (currentWinnerPoint === '40' && currentLoserPoint === '40') {
    return {
      nextSet: currentSet,
      nextLiveState:
        winnerTeam === 1
          ? { mode: 'standard', team1Point: 'A', team2Point: '40' }
          : { mode: 'standard', team1Point: '40', team2Point: 'A' },
      gameWinner: null,
    };
  }

  if (currentWinnerPoint === '40' && currentLoserPoint === 'A') {
    return {
      nextSet: currentSet,
      nextLiveState: { mode: 'standard', team1Point: '40', team2Point: '40' },
      gameWinner: null,
    };
  }

  if (currentWinnerPoint === 'A') {
    return {
      nextSet:
        winnerTeam === 1
          ? { ...currentSet, team1Score: currentSet.team1Score + 1 }
          : { ...currentSet, team2Score: currentSet.team2Score + 1 },
      nextLiveState: createTennisLivePointState(
        winnerTeam === 1
          ? { ...currentSet, team1Score: currentSet.team1Score + 1 }
          : { ...currentSet, team2Score: currentSet.team2Score + 1 },
        options,
      ),
      gameWinner: winnerTeam,
    };
  }

  const nextPoint =
    TENNIS_STANDARD_POINTS[Math.min(TENNIS_STANDARD_POINTS.indexOf(currentWinnerPoint as TennisPointLabel) + 1, TENNIS_STANDARD_POINTS.length - 1)];

  return {
    nextSet: currentSet,
    nextLiveState:
      winnerTeam === 1
        ? {
            mode: 'standard',
            team1Point: nextPoint,
            team2Point: liveState.team2Point as TennisPointLabel,
          }
        : {
            mode: 'standard',
            team1Point: liveState.team1Point as TennisPointLabel,
            team2Point: nextPoint,
          },
    gameWinner: null,
  };
}

export function stepBackTennisPoint(liveState: TennisLivePointState, team: 1 | 2): TennisLivePointState {
  if (liveState.mode === 'tiebreak') {
    return team === 1
      ? { ...liveState, team1Point: Math.max(0, Number(liveState.team1Point) - 1) }
      : { ...liveState, team2Point: Math.max(0, Number(liveState.team2Point) - 1) };
  }

  const backStandard = (value: TennisPointLabel): TennisPointLabel => {
    if (value === 'A') return '40';
    const index = TENNIS_STANDARD_POINTS.indexOf(value);
    return TENNIS_STANDARD_POINTS[Math.max(index - 1, 0)];
  };

  return team === 1
    ? { ...liveState, team1Point: backStandard(liveState.team1Point as TennisPointLabel) }
    : { ...liveState, team2Point: backStandard(liveState.team2Point as TennisPointLabel) };
}

export function formatTennisPointDisplay(value: TennisPointLabel | number): string {
  return typeof value === 'number' ? String(value) : value;
}

export function isTennisPointStateEmpty(liveState: TennisLivePointState): boolean {
  if (liveState.mode === 'tiebreak') {
    return Number(liveState.team1Point) === 0 && Number(liveState.team2Point) === 0;
  }

  return liveState.team1Point === '0' && liveState.team2Point === '0';
}

export function readPenaltyLog(match: Pick<Match, 'scoreDetails'>): MatchPenaltyRecord[] {
  const penalties = match.scoreDetails?.penalties;
  if (!Array.isArray(penalties)) {
    return [];
  }

  return penalties.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }

    const record = item as unknown as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.label !== 'string' || typeof record.kind !== 'string') {
      return [];
    }

    return [{
      id: record.id,
      label: record.label,
      kind: record.kind,
      team: record.team === 1 || record.team === 2 ? record.team : null,
      note: typeof record.note === 'string' ? record.note : undefined,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    }];
  });
}

export function buildPenaltyPresets(
  sportKind: ResolvedSportRuleView['kind'],
): Array<{ kind: string; label: string }> {
  if (sportKind === 'TENNIS') {
    return [
      { kind: 'WARNING', label: 'Nhắc nhở' },
      { kind: 'POINT_PENALTY', label: 'Phạt một điểm' },
      { kind: 'GAME_PENALTY', label: 'Phạt một game' },
      { kind: 'CODE_VIOLATION', label: 'Vi phạm tác phong' },
    ];
  }

  if (sportKind === 'PICKLEBALL_RALLY' || sportKind === 'PICKLEBALL_SIDE_OUT') {
    return [
      { kind: 'WARNING', label: 'Cảnh cáo' },
      { kind: 'SERVICE_FAULT', label: 'Lỗi giao bóng' },
      { kind: 'TECHNICAL_FAULT', label: 'Lỗi kỹ thuật' },
      { kind: 'UNSPORTSMANLIKE', label: 'Thi đấu thiếu fair-play' },
    ];
  }

  if (sportKind === 'BADMINTON') {
    return [
      { kind: 'WARNING', label: 'Nhắc nhở' },
      { kind: 'SERVICE_FAULT', label: 'Lỗi giao cầu' },
      { kind: 'MISCONDUCT', label: 'Hành vi không đúng mực' },
    ];
  }

  return [
    { kind: 'WARNING', label: 'Nhắc nhở' },
    { kind: 'SERVICE_FAULT', label: 'Lỗi giao bóng' },
    { kind: 'MISCONDUCT', label: 'Hành vi không đúng mực' },
  ];
}

