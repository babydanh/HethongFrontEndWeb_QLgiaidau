import type { BracketMatch } from '@/features/tournaments/api';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import type { SportRuleKind } from '@/types/tournament';

export function resolveBracketMatchRules(
  match: BracketMatch,
  fallbackKind: SportRuleKind = 'BADMINTON',
) {
  return resolveSportRuleView(match.matchConfig, fallbackKind);
}

export function getBracketStatLabels(kind: SportRuleKind) {
  if (kind === 'TENNIS') {
    return {
      aggregateLabel: 'Game',
      aggregateDiffLabel: 'Hiệu game',
      aggregateExample: 'VD: set 6-4 tương đương +2 game.',
      targetSummary: 'game/set',
    };
  }

  if (kind === 'PICKLEBALL_SIDE_OUT') {
    return {
      aggregateLabel: 'Điểm game',
      aggregateDiffLabel: 'Hiệu điểm game',
      aggregateExample: 'VD: game 11-8 tương đương +3 điểm game.',
      targetSummary: 'điểm/game',
    };
  }

  return {
    aggregateLabel: 'Điểm',
    aggregateDiffLabel: 'Hiệu điểm',
    aggregateExample: 'VD: set 21-19 tương đương +2 điểm.',
    targetSummary: 'điểm/set',
  };
}

export function buildMatchRuleSummary(
  match: BracketMatch,
  fallbackKind: SportRuleKind = 'BADMINTON',
): string {
  const resolved = resolveBracketMatchRules(match, fallbackKind);
  const presentation = getSportRulePresentation(resolved.kind);
  const statLabels = getBracketStatLabels(resolved.kind);
  const bestOfLabel = resolved.bestOf === 1 ? '1 set' : `BO${resolved.bestOf}`;

  const targetLabel = `${resolved.pointsPerSet} ${statLabels.targetSummary}`;
  const tieLabel =
    resolved.kind === 'TENNIS'
      ? `tie-break ${resolved.tiebreakPoints}`
      : resolved.hasCustomTiebreakTarget && resolved.maxPoints > resolved.pointsPerSet
        ? `chạm ${resolved.maxPoints}`
        : null;

  return [presentation.sportLabel, bestOfLabel, targetLabel, tieLabel]
    .filter(Boolean)
    .join(' • ');
}
