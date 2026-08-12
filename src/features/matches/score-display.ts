import { inferSportRuleKindFromCategory, resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import type { Match, MatchScore } from '@/types/match';
import type { SportRuleKind, SportRulesEnvelope } from '@/types/tournament';

type MatchSportContext = {
  matchConfig?: Match['matchConfig'];
  scoreDetails?: Record<string, unknown> | null;
  tournament?: {
    name?: string;
    sportRules?: SportRulesEnvelope | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    categoryConfig?: Record<string, unknown> | null;
    category?: {
      slug?: string | null;
      name?: string | null;
      categoryConfig?: Record<string, unknown> | null;
    } | null;
  } | null;
};

function isScoreKey(key: string): boolean {
  return /^(set|game)\d+$/i.test(key);
}

export function extractMatchScores(scoreDetails?: Record<string, unknown> | null): MatchScore[] {
  if (!scoreDetails || typeof scoreDetails !== 'object') {
    return [];
  }

  const setsValue = scoreDetails.sets;
  if (Array.isArray(setsValue)) {
    return setsValue.flatMap((setValue) => {
      if (!setValue || typeof setValue !== 'object' || Array.isArray(setValue)) {
        return [];
      }

      const setRecord = setValue as Record<string, unknown>;
      const team1Score = Number(setRecord.team1Score);
      const team2Score = Number(setRecord.team2Score);
      if (!Number.isFinite(team1Score) || !Number.isFinite(team2Score)) {
        return [];
      }

      return [{
        team1Score,
        team2Score,
        isFinished: setRecord.isFinished === true,
      }];
    });
  }

  return Object.keys(scoreDetails)
    .filter((key) => isScoreKey(key))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
    .flatMap((key) => {
      const value = scoreDetails[key];
      if (typeof value !== 'string' || !value.includes('-')) {
        return [];
      }

      const [p1Text, p2Text] = value.split('-');
      const team1Score = Number(p1Text.trim());
      const team2Score = Number(p2Text.trim());
      if (!Number.isFinite(team1Score) || !Number.isFinite(team2Score)) {
        return [];
      }

      return [{
        team1Score,
        team2Score,
        isFinished: true,
      }];
    });
}

export function resolveMatchSportRules(
  match: MatchSportContext,
  fallbackKind: SportRuleKind = 'BADMINTON',
) {
  const inferredFromTournament = match.tournament
    ? inferSportRuleKindFromCategory({
        slug: match.tournament.categorySlug ?? match.tournament.category?.slug ?? '',
        name: match.tournament.categoryName ?? match.tournament.category?.name ?? match.tournament.name ?? '',
        categoryConfig:
          match.tournament.categoryConfig ?? match.tournament.category?.categoryConfig ?? null,
      })
    : null;

  return resolveSportRuleView(match.matchConfig ?? match.tournament?.sportRules, inferredFromTournament ?? fallbackKind);
}

export function getMatchScorePresentation(kind: SportRuleKind) {
  const sportPresentation = getSportRulePresentation(kind) || { sportLabel: 'Thể thao' };

  if (kind === 'TENNIS') {
    return {
      sportLabel: sportPresentation.sportLabel || 'Tennis',
      scoreUnit: 'game',
      scoreUnitPlural: 'game',
      currentScoreLabel: 'Game hiện tại',
      sequenceLabel: 'set',
      sequenceLabelPlural: 'set',
      summaryLabel: 'Tỉ số các set',
      completeActionLabel: 'Chốt set hiện tại',
      wonSummaryLabel: 'Set thắng',
    };
  }

  if (kind === 'PICKLEBALL_SIDE_OUT') {
    return {
      sportLabel: sportPresentation.sportLabel || 'Pickleball',
      scoreUnit: 'điểm',
      scoreUnitPlural: 'điểm',
      currentScoreLabel: 'Điểm game hiện tại',
      sequenceLabel: 'game',
      sequenceLabelPlural: 'game',
      summaryLabel: 'Tỉ số các game',
      completeActionLabel: 'Chốt game hiện tại',
      wonSummaryLabel: 'Game thắng',
    };
  }

  return {
    sportLabel: sportPresentation.sportLabel || 'Cầu lông/Khác',
    scoreUnit: 'điểm',
    scoreUnitPlural: 'điểm',
    currentScoreLabel: 'Điểm set hiện tại',
    sequenceLabel: 'set',
    sequenceLabelPlural: 'set',
    summaryLabel: 'Tỉ số các set',
    completeActionLabel: 'Chốt set hiện tại',
    wonSummaryLabel: 'Set thắng',
  };
}

export function buildMatchScoreSummary(
  match: MatchSportContext & { p1SetsWon: number; p2SetsWon: number },
  fallbackKind: SportRuleKind = 'BADMINTON',
): string {
  const resolved = resolveMatchSportRules(match, fallbackKind);
  const presentation = getMatchScorePresentation(resolved.kind);
  const sets = extractMatchScores(match.scoreDetails);

  if (sets.length > 0) {
    return sets.map((set) => `${set.team1Score}-${set.team2Score}`).join(' • ');
  }

  return `${presentation.wonSummaryLabel}: ${match.p1SetsWon} - ${match.p2SetsWon}`;
}

export function buildAutoWinnerScore(
  existingSet: MatchScore,
  winnerTeam: 1 | 2,
  match: MatchSportContext,
): MatchScore {
  const resolved = resolveMatchSportRules(match);
  const winnerKey = winnerTeam === 1 ? 'team1Score' : 'team2Score';
  const loserKey = winnerTeam === 1 ? 'team2Score' : 'team1Score';

  const winnerCurrent = existingSet[winnerKey];
  const loserCurrent = existingSet[loserKey];

  let winnerScore = winnerCurrent;
  let loserScore = loserCurrent;

  if (resolved.kind === 'TENNIS') {
    winnerScore = Math.max(winnerScore, resolved.pointsPerSet);
    loserScore = Math.min(loserScore, winnerScore === resolved.maxPoints ? resolved.maxPoints - 1 : resolved.pointsPerSet - 2);
  } else if (resolved.winByTwo) {
    winnerScore = Math.max(winnerScore, resolved.pointsPerSet);
    loserScore = Math.min(loserScore, winnerScore === resolved.maxPoints ? resolved.maxPoints - 1 : winnerScore - 2);
  } else {
    winnerScore = Math.max(winnerScore, resolved.pointsPerSet);
    loserScore = Math.min(loserScore, resolved.pointsPerSet - 1);
  }

  return {
    ...existingSet,
    [winnerKey]: Math.max(winnerScore, 0),
    [loserKey]: Math.max(loserScore, 0),
    isFinished: true,
  };
}
