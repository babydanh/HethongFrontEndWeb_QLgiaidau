import type { MatchScore } from '@/types/match';
import type { ResolvedSportRuleView } from '@/features/tournaments/sport-rules/normalize';

export interface ScoreRuleWarning {
  id: string;
  message: string;
}

type WarningTranslate = (key: string, values?: Record<string, string | number>) => string;

const buildSequenceLabel = (
  rules: ResolvedSportRuleView,
  index: number,
  translate?: WarningTranslate,
) => {
  const sequenceKey = rules.kind === 'PICKLEBALL_SIDE_OUT'
    ? 'scorePresentation.PICKLEBALL_SIDE_OUT.sequenceLabel'
    : 'scorePresentation.BADMINTON.sequenceLabel';
  const sequence = translate?.(sequenceKey) ?? (rules.kind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set');
  return `${sequence.charAt(0).toUpperCase() + sequence.slice(1)} ${index + 1}`;
};

/** Keep the operator warning aligned with backend validate-tennis-score. */
export function isValidTennisSetScore(
  winnerScore: number,
  loserScore: number,
  rules: Pick<ResolvedSportRuleView, 'pointsPerSet' | 'maxPoints'>,
): boolean {
  const maxScore = Math.max(winnerScore, loserScore);
  const minScore = Math.min(winnerScore, loserScore);
  const difference = maxScore - minScore;

  if (maxScore < rules.pointsPerSet || maxScore > rules.maxPoints) {
    return false;
  }
  if (maxScore === rules.pointsPerSet) {
    return difference >= 2 && minScore <= rules.pointsPerSet - 2;
  }
  if (maxScore === rules.maxPoints) {
    return minScore === rules.maxPoints - 2 || minScore === rules.maxPoints - 1;
  }
  return false;
}

export function getScoreRuleWarnings(
  sets: MatchScore[],
  rules: ResolvedSportRuleView,
  translate?: WarningTranslate,
): ScoreRuleWarning[] {
  const warnings: ScoreRuleWarning[] = [];
  let p1Won = 0;
  let p2Won = 0;

  sets.forEach((set, index) => {
    const label = buildSequenceLabel(rules, index, translate);
    const team1Score = set.team1Score;
    const team2Score = set.team2Score;
    const hasStarted = team1Score > 0 || team2Score > 0;

    if (!hasStarted) {
      return;
    }

    if (team1Score === team2Score) {
      warnings.push({
        id: `draw-${index}`,
        message: translate?.('scoreWarnings.draw', { label, team1: team1Score, team2: team2Score })
          ?? `${label} is tied at ${team1Score}-${team2Score}. If the result is final, correct it or enable override mode.`,
      });
      return;
    }

    const winnerScore = Math.max(team1Score, team2Score);
    const loserScore = Math.min(team1Score, team2Score);

    if (team1Score > team2Score) {
      p1Won += 1;
    } else {
      p2Won += 1;
    }

    if (!set.isFinished) {
      return;
    }

    if (set.scoreOverride?.reason) {
      return;
    }

    if (rules.kind === 'TENNIS') {
      if (!isValidTennisSetScore(winnerScore, loserScore, rules)) {
        warnings.push({
          id: `tennis-${index}`,
          message: translate?.('scoreWarnings.tennisInvalid', {
            label,
            team1: team1Score,
            team2: team2Score,
            pointsPerSet: rules.pointsPerSet,
            maxPoints: rules.maxPoints,
          })
            ?? `${label} has score ${team1Score}-${team2Score}, which is invalid for the ${rules.pointsPerSet}-game target and ${rules.maxPoints}-game preset limit.`,
        });
      }
      return;
    }

    if (!rules.winByTwo) {
      if (winnerScore < rules.pointsPerSet) {
        warnings.push({
          id: `target-${index}`,
          message: translate?.('scoreWarnings.target', {
          label,
          team1: team1Score,
          team2: team2Score,
          pointsPerSet: rules.pointsPerSet,
        })
          ?? `${label} is finalized at ${team1Score}-${team2Score}, but the winner has not reached the target of ${rules.pointsPerSet}.`,
        });
      }
      return;
    }

    if (winnerScore < rules.pointsPerSet) {
      warnings.push({
        id: `min-target-${index}`,
        message: translate?.('scoreWarnings.minTarget', {
          label,
          team1: team1Score,
          team2: team2Score,
          pointsPerSet: rules.pointsPerSet,
        })
          ?? `${label} is finalized at ${team1Score}-${team2Score}, but the winner has not reached ${rules.pointsPerSet} points.`,
      });
      return;
    }

    const reachedCap = winnerScore === rules.maxPoints;
    if (!reachedCap && winnerScore - loserScore < 2) {
      warnings.push({
        id: `margin-${index}`,
        message: translate?.('scoreWarnings.margin', {
          label,
          team1: team1Score,
          team2: team2Score,
        })
          ?? `${label} is finalized at ${team1Score}-${team2Score}, but the default two-point margin has not been reached.`,
      });
    }

    if (winnerScore > rules.maxPoints) {
      warnings.push({
        id: `cap-${index}`,
        message: translate?.('scoreWarnings.cap', { label, maxPoints: rules.maxPoints })
          ?? `${label} exceeds the current configuration cap of ${rules.maxPoints} points.`,
      });
    }
  });

  if (p1Won > rules.setsToWin || p2Won > rules.setsToWin) {
    warnings.push({
      id: 'too-many-wins',
      message: translate?.('scoreWarnings.tooManyWins', {
        unit: rules.kind === 'PICKLEBALL_SIDE_OUT'
          ? (translate?.('scorePresentation.PICKLEBALL_SIDE_OUT.sequenceLabel') ?? 'game')
          : (translate?.('scorePresentation.BADMINTON.sequenceLabel') ?? 'set'),
        setsToWin: rules.setsToWin,
      })
        ?? `One side has more ${rules.kind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set'} wins than required (${rules.setsToWin}).`,
    });
  }

  return warnings;
}

