import type { BracketMatch } from '@/features/tournaments/api';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import type { SportRuleKind } from '@/types/tournament';

export function resolveBracketMatchRules(
  match: BracketMatch,
  fallbackKind: SportRuleKind = 'BADMINTON',
) {
  const stageRoundConfig = match.stage?.roundConfig ?? match.group?.stage?.roundConfig ?? null;
  const mergedSource = {
    ...(match.matchConfig ?? {}),
    ...(stageRoundConfig ?? {}),
  };
  return resolveSportRuleView(
    Object.keys(mergedSource).length > 0 ? mergedSource : match.matchConfig,
    fallbackKind,
  );
}

type BracketTranslate = (key: string, values?: Record<string, string | number>) => string;

export function getBracketStatLabels(kind: SportRuleKind, translate?: BracketTranslate) {
  if (kind === 'TENNIS') {
    return {
      aggregateLabel: translate?.('statGameLabel') ?? 'Game',
      aggregateDiffLabel: translate?.('statGameDifferenceLabel') ?? 'Game difference',
      aggregateExample: translate?.('statGameDifferenceExample') ?? 'Example: a 6-4 set equals +2 games.',
      targetSummary: translate?.('targetGameSet') ?? 'games/set',
    };
  }

  if (kind === 'PICKLEBALL_SIDE_OUT') {
    return {
      aggregateLabel: translate?.('statGamePointsLabel') ?? 'Game points',
      aggregateDiffLabel: translate?.('statGamePointsDifferenceLabel') ?? 'Game-point difference',
      aggregateExample: translate?.('statGamePointsDifferenceExample') ?? 'Example: an 11-8 game equals +3 game points.',
      targetSummary: translate?.('targetPointsGame') ?? 'points/game',
    };
  }

  return {
    aggregateLabel: translate?.('statPointsLabel') ?? 'Points',
    aggregateDiffLabel: translate?.('statPointsDifferenceLabel') ?? 'Point difference',
    aggregateExample: translate?.('statPointsDifferenceExample') ?? 'Example: a 21-19 set equals +2 points.',
    targetSummary: translate?.('targetPointsSet') ?? 'points/set',
  };
}

export function buildMatchRuleSummary(
  match: BracketMatch,
  fallbackKind: SportRuleKind = 'BADMINTON',
  translate?: BracketTranslate,
): string {
  const resolved = resolveBracketMatchRules(match, fallbackKind);
  const presentation = getSportRulePresentation(resolved.kind, translate);
  const statLabels = getBracketStatLabels(resolved.kind, translate);
  const bestOfLabel = resolved.bestOf === 1
    ? (translate?.('bestOfOneSet') ?? '1 set')
    : (translate?.('bestOfSets', { bestOf: resolved.bestOf, setsToWin: resolved.setsToWin }) ?? `Best of ${resolved.bestOf} sets, first to ${resolved.setsToWin}`);

  const targetLabel = `${resolved.pointsPerSet} ${statLabels.targetSummary}`;
  const tieLabel =
    resolved.kind === 'TENNIS'
      ? (translate?.('tiebreakSummary', { points: resolved.tiebreakPoints }) ?? `Tie-break to ${resolved.tiebreakPoints}`)
      : resolved.hasCustomTiebreakTarget && resolved.maxPoints > resolved.pointsPerSet
        ? (translate?.('maxScoreSummary', { points: resolved.maxPoints }) ?? `Cap at ${resolved.maxPoints}`)
        : null;

  return [presentation.sportLabel, bestOfLabel, targetLabel, tieLabel]
    .filter(Boolean)
    .join(' • ');
}
