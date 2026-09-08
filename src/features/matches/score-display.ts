import {
  inferSportRuleKindFromCategory,
  resolveSportRuleView,
} from "@/features/tournaments/sport-rules/normalize";
import { getSportRulePresentation } from "@/features/tournaments/sport-rules/presentation";
import { isLiteTournament } from "@/features/tournaments/lite-qr";
import type { ResolvedSportRuleView } from "@/features/tournaments/sport-rules/normalize";
import type { Match, MatchScore } from "@/types/match";
import type { SportRuleKind, SportRulesEnvelope } from "@/types/tournament";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function getRoundOverride(
  config: Record<string, unknown> | null | undefined,
  roundNumber: number | null | undefined,
): Record<string, unknown> | null {
  if (!config || roundNumber == null) return null;
  const rounds = asRecord(config.rounds) || asRecord(config.roundConfigs);
  if (!rounds) return null;
  const override = rounds[String(roundNumber)];
  return asRecord(override);
}

type MatchSportContext = {
  status?: Match["status"];
  matchConfig?: Match["matchConfig"];
  scoreDetails?: Record<string, unknown> | null;
  sportRules?: SportRulesEnvelope | null;
  tournamentConfig?: {
    isLite?: boolean;
    mode?: "LITE" | "ADVANCED" | "STRICT";
    scoringMode?: string;
    scoring_mode?: string;
    maxSets?: number;
  } | null;
  stageRoundConfig?: Record<string, unknown> | null;
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
    tournamentConfig?: {
      isLite?: boolean;
      mode?: "LITE" | "ADVANCED" | "STRICT";
      scoringMode?: string;
      scoring_mode?: string;
      hideAdvancedSettings?: boolean;
    } | null;
  } | null;
};

function isScoreKey(key: string): boolean {
  return /^(set|game)\d+$/i.test(key);
}

export function extractMatchScores(
  scoreDetails?: Record<string, unknown> | null,
): MatchScore[] {
  if (!scoreDetails || typeof scoreDetails !== "object") {
    return [];
  }

  const football = scoreDetails.football;
  if (football && typeof football === "object" && !Array.isArray(football)) {
    const value = football as Record<string, unknown>;
    const team1Score = Number(value.team1Goals);
    const team2Score = Number(value.team2Goals);
    if (Number.isFinite(team1Score) && Number.isFinite(team2Score)) {
      return [
        {
          team1Score,
          team2Score,
          isFinished: ["FULL_TIME", "PENALTY_SHOOTOUT", "COMPLETED"].includes(
            String(value.phase),
          ),
        },
      ];
    }
  }

  const setsValue = scoreDetails.sets;
  if (Array.isArray(setsValue)) {
    return setsValue.slice(0, 10).flatMap((setValue) => {
      if (
        !setValue ||
        typeof setValue !== "object" ||
        Array.isArray(setValue)
      ) {
        return [];
      }

      const setRecord = setValue as Record<string, unknown>;
      const team1Score = Number(setRecord.team1Score);
      const team2Score = Number(setRecord.team2Score);
      if (!Number.isFinite(team1Score) || !Number.isFinite(team2Score)) {
        return [];
      }

      return [
        {
          team1Score,
          team2Score,
          isFinished: setRecord.isFinished === true,
        },
      ];
    });
  }

  return Object.keys(scoreDetails)
    .filter((key) => isScoreKey(key))
    .sort((left, right) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .flatMap((key) => {
      const value = scoreDetails[key];
      if (typeof value !== "string" || !value.includes("-")) {
        return [];
      }

      const [p1Text, p2Text] = value.split("-");
      const team1Score = Number(p1Text.trim());
      const team2Score = Number(p2Text.trim());
      if (!Number.isFinite(team1Score) || !Number.isFinite(team2Score)) {
        return [];
      }

      return [
        {
          team1Score,
          team2Score,
          isFinished: true,
        },
      ];
    })
    .slice(0, 10);
}

export function resolveMatchSportRules(
  match: MatchSportContext,
  fallbackKind: SportRuleKind = "BADMINTON",
) {
  const inferredFromTournament = match.tournament
    ? inferSportRuleKindFromCategory({
        slug:
          match.tournament.categorySlug ??
          match.tournament.category?.slug ??
          "",
        name:
          match.tournament.categoryName ??
          match.tournament.category?.name ??
          match.tournament.name ??
          "",
        categoryConfig:
          match.tournament.categoryConfig ??
          match.tournament.category?.categoryConfig ??
          null,
      })
    : null;

  const stageRoundConfig =
    match.stageRoundConfig ??
    (match as unknown as Match).stage?.roundConfig ??
    (match as unknown as Match).group?.stage?.roundConfig ??
    null;

  const roundNumber = (match as unknown as { roundNumber?: number | null })
    .roundNumber;
  const stageRoundOverride = getRoundOverride(stageRoundConfig, roundNumber);
  const groupRoundConfig = (match as unknown as Match).group?.roundConfig;
  const groupRoundOverride = getRoundOverride(groupRoundConfig, roundNumber);

  const tournamentConfig = match.tournament?.tournamentConfig;
  const standaloneConfig = match.tournamentConfig;
  const tournamentScoringMode =
    tournamentConfig?.scoringMode ??
    tournamentConfig?.scoring_mode ??
    standaloneConfig?.scoringMode ??
    standaloneConfig?.scoring_mode;
  const mergedSource: Record<string, unknown> = {
    ...(match.tournament?.sportRules ?? {}),
    ...(match.sportRules ?? {}),
    ...(stageRoundConfig ?? {}),
    ...(groupRoundOverride ?? {}),
    ...(stageRoundOverride ?? {}),
    ...(match.matchConfig ?? {}),
    ...(tournamentScoringMode != null
      ? { scoringMode: tournamentScoringMode }
      : {}),
  };

  const resolvedRules = resolveSportRuleView(
    Object.keys(mergedSource).length > 0
      ? mergedSource
      : match.tournament?.sportRules,
    inferredFromTournament ?? fallbackKind,
  );
  const tournamentIsSuperLite = isLiteTournament(match.tournament);
  const scoringConfig = asRecord(mergedSource.scoring);
  const hasExplicitScoringMode = [
    mergedSource.mode,
    mergedSource.isLite,
    mergedSource.rulesPreset,
    scoringConfig?.mode,
    scoringConfig?.isLite,
    scoringConfig?.rulesPreset,
    mergedSource.scoringMode,
    mergedSource.scoring_mode,
    scoringConfig?.scoringMode,
    scoringConfig?.scoring_mode,
  ].some((value) => value != null);

  // Product type and scoring preset are independent. Super Lite always uses
  // open scoring, while a standard Quick tournament may also explicitly use
  // the same open preset without becoming a Super Lite tournament. A strict
  // tournament-level fallback is used only when the rules blob is incomplete.
  const resolvedMode: ResolvedSportRuleView["mode"] =
    tournamentIsSuperLite ||
    tournamentScoringMode === "FREE" ||
    mergedSource.scoringMode === "FREE" ||
    mergedSource.mode === "LITE" ||
    match.tournament?.sportRules?.mode === "LITE" ||
    tournamentConfig?.mode === "LITE" ||
    tournamentConfig?.isLite === true
      ? "LITE"
      : hasExplicitScoringMode
        ? resolvedRules.mode
        : tournamentConfig?.mode
          ? "STRICT"
          : resolvedRules.mode;

  return {
    ...resolvedRules,
    mode: resolvedMode,
  };
}

/**
 * Open scoring always has one editable set while the match is active. Older
 * snapshots may contain only finished sets; normalize that shape at the
 * boundary so the next point cannot accidentally mutate the previous set.
 */
export function ensureOpenScoringSet(
  match: MatchSportContext,
  scores: MatchScore[],
): MatchScore[] {
  if (
    match.status === "COMPLETED" ||
    resolveMatchSportRules(match).mode !== "LITE"
  ) {
    return scores;
  }
  if (scores.length >= 10) {
    return scores.slice(0, 10);
  }
  if (scores.some((score) => !score.isFinished)) {
    return scores;
  }
  return [...scores, { team1Score: 0, team2Score: 0, isFinished: false }];
}

type ScoreTranslate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function getMatchScorePresentation(
  kind: SportRuleKind,
  translate?: ScoreTranslate,
) {
  const sportPresentation = getSportRulePresentation(kind, translate) || {
    sportLabel:
      translate?.("scorePresentation.FOOTBALL.sportLabel") ?? "Football",
  };
  const label = (key: string, fallback: string) =>
    translate?.(`scorePresentation.${kind}.${key}`) ?? fallback;

  if (kind === "TENNIS") {
    return {
      sportLabel: sportPresentation.sportLabel || label("sportLabel", "Tennis"),
      scoreUnit: label("scoreUnit", "games"),
      scoreUnitPlural: label("scoreUnit", "games"),
      currentScoreLabel: label("currentScoreLabel", "Current game score"),
      sequenceLabel: label("sequenceLabel", "set"),
      sequenceLabelPlural: label("sequenceLabel", "set"),
      summaryLabel: label("summaryLabel", "Set scores"),
      completeActionLabel: label("completeActionLabel", "Finalize current set"),
      wonSummaryLabel: label("wonSummaryLabel", "Sets won"),
    };
  }

  if (kind === "PICKLEBALL_SIDE_OUT") {
    return {
      sportLabel:
        sportPresentation.sportLabel || label("sportLabel", "Pickleball"),
      scoreUnit: label("scoreUnit", "points"),
      scoreUnitPlural: label("scoreUnit", "points"),
      currentScoreLabel: label("currentScoreLabel", "Current set score"),
      sequenceLabel: label("sequenceLabel", "set"),
      sequenceLabelPlural: label("sequenceLabel", "set"),
      summaryLabel: label("summaryLabel", "Set scores"),
      completeActionLabel: label("completeActionLabel", "Finalize current set"),
      wonSummaryLabel: label("wonSummaryLabel", "Sets won"),
    };
  }

  if (kind === "FOOTBALL") {
    return {
      sportLabel:
        sportPresentation.sportLabel || label("sportLabel", "Football"),
      scoreUnit: label("scoreUnit", "goals"),
      scoreUnitPlural: label("scoreUnit", "goals"),
      currentScoreLabel: label("currentScoreLabel", "Current score"),
      sequenceLabel: label("sequenceLabel", "half"),
      sequenceLabelPlural: label("sequenceLabel", "half"),
      summaryLabel: label("summaryLabel", "Match score"),
      completeActionLabel: label("completeActionLabel", "Finalize match"),
      wonSummaryLabel: label("wonSummaryLabel", "Score"),
    };
  }

  return {
    sportLabel:
      sportPresentation.sportLabel || label("sportLabel", "Badminton / Other"),
    scoreUnit: label("scoreUnit", "points"),
    scoreUnitPlural: label("scoreUnit", "points"),
    currentScoreLabel: label("currentScoreLabel", "Current set score"),
    sequenceLabel: label("sequenceLabel", "set"),
    sequenceLabelPlural: label("sequenceLabel", "set"),
    summaryLabel: label("summaryLabel", "Set scores"),
    completeActionLabel: label("completeActionLabel", "Finalize current set"),
    wonSummaryLabel: label("wonSummaryLabel", "Sets won"),
  };
}

export function buildMatchScoreSummary(
  match: MatchSportContext & { p1SetsWon: number; p2SetsWon: number },
  fallbackKind: SportRuleKind = "BADMINTON",
  translate?: ScoreTranslate,
): string {
  const resolved = resolveMatchSportRules(match, fallbackKind);
  const presentation = getMatchScorePresentation(resolved.kind, translate);
  if (resolved.kind === "FOOTBALL") {
    const football = match.scoreDetails?.football;
    if (football && typeof football === "object" && !Array.isArray(football)) {
      const value = football as Record<string, unknown>;
      const team1Goals = Number(value.team1Goals);
      const team2Goals = Number(value.team2Goals);
      if (Number.isFinite(team1Goals) && Number.isFinite(team2Goals)) {
        const phase = typeof value.phase === "string" ? value.phase : null;
        return `${team1Goals}-${team2Goals}${phase ? ` · ${phaseLabel(phase, translate)}` : ""}`;
      }
    }
  }
  const sets = extractMatchScores(match.scoreDetails);

  if (sets.length > 0) {
    return sets.map((set) => `${set.team1Score}-${set.team2Score}`).join(" • ");
  }

  return `${presentation.wonSummaryLabel}: ${match.p1SetsWon} - ${match.p2SetsWon}`;
}

function phaseLabel(phase: string, translate?: ScoreTranslate): string {
  return translate?.(`scorePhases.${phase}`) ?? phase;
}

export function buildAutoWinnerScore(
  existingSet: MatchScore,
  winnerTeam: 1 | 2,
  match: MatchSportContext,
): MatchScore {
  const resolved = resolveMatchSportRules(match);
  const winnerKey = winnerTeam === 1 ? "team1Score" : "team2Score";
  const loserKey = winnerTeam === 1 ? "team2Score" : "team1Score";

  const winnerCurrent = existingSet[winnerKey];
  const loserCurrent = existingSet[loserKey];

  let winnerScore = winnerCurrent;
  let loserScore = loserCurrent;

  if (resolved.mode === "LITE") {
    return {
      ...existingSet,
      isFinished: true,
    };
  }

  if (resolved.kind === "TENNIS") {
    winnerScore = Math.max(winnerScore, resolved.pointsPerSet);
    loserScore = Math.min(
      loserScore,
      winnerScore === resolved.maxPoints
        ? resolved.maxPoints - 1
        : resolved.pointsPerSet - 2,
    );
  } else if (resolved.winByTwo) {
    winnerScore = Math.max(winnerScore, resolved.pointsPerSet);
    loserScore = Math.min(
      loserScore,
      winnerScore === resolved.maxPoints
        ? resolved.maxPoints - 1
        : winnerScore - 2,
    );
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
