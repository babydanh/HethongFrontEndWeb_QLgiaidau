import type {
  SportRuleKind,
  SportRuleScoringConfig,
  SportRulesEnvelope,
  StageRoundConfig,
  StageRoundRuleConfig,
  SportScoringModel,
} from '@/types/tournament';
import type { Category } from '@/types/category';
import { buildDefaultSportRules } from './defaults';

export interface ResolvedSportRuleView {
  mode?: 'LITE' | 'STRICT';
  kind: SportRuleKind;
  scoringModel: SportScoringModel;
  setsToWin: number;
  bestOf: number;
  pointsPerSet: number;
  winByTwo: boolean;
  maxPoints: number;
  hasCustomTiebreakTarget: boolean;
  tiebreakPoints: number;
  roundsToPlay: number;
  tiebreakerMode: 'split' | 'playoff';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readNumber(source: Record<string, unknown> | null, keys: string[]): number | undefined {
  if (!source) {
    return undefined;
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function readBoolean(source: Record<string, unknown> | null, keys: string[]): boolean | undefined {
  if (!source) {
    return undefined;
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function normalizeKind(rawKind: unknown): SportRuleKind | null {
  if (typeof rawKind !== 'string') {
    return null;
  }

  const normalized = rawKind.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'PICKLEBALL') {
    return 'PICKLEBALL_RALLY';
  }
  if (
    normalized === 'BADMINTON' ||
    normalized === 'TABLE_TENNIS' ||
    normalized === 'PICKLEBALL_RALLY' ||
    normalized === 'PICKLEBALL_SIDE_OUT' ||
    normalized === 'TENNIS' ||
    normalized === 'FOOTBALL'
  ) {
    return normalized;
  }
  return null;
}

export function getSportRuleKind(rawRules: SportRulesEnvelope | StageRoundConfig | StageRoundRuleConfig | null | undefined): SportRuleKind {
  return normalizeKind(rawRules?.kind) ?? 'BADMINTON';
}

export function inferSportRuleKindFromCategory(category: Pick<Category, 'slug' | 'name' | 'categoryConfig'> | null | undefined): SportRuleKind {
  const directKind = normalizeKind(category?.categoryConfig && isRecord(category.categoryConfig) ? category.categoryConfig.ruleKind : null);
  if (directKind) {
    return directKind;
  }

  const normalizeCategoryText = (value: unknown) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .trim();
  const slug = normalizeCategoryText(category?.slug);
  const name = normalizeCategoryText(category?.name);
  const combined = `${slug} ${name}`;

  if (combined.includes('badminton') || combined.includes('cau long')) {
    return 'BADMINTON';
  }
  if (combined.includes('table tennis') || combined.includes('bong ban') || combined.includes('ping pong')) {
    return 'TABLE_TENNIS';
  }
  if (combined.includes('pickleball')) {
    return 'PICKLEBALL_RALLY';
  }
  if (combined.includes('tennis') || combined.includes('quan vot')) {
    return 'TENNIS';
  }
  if (combined.includes('football') || combined.includes('bong da') || combined.includes('soccer')) {
    return 'FOOTBALL';
  }

  return 'BADMINTON';
}

export function resolveSportRuleView(
  rawRules: SportRulesEnvelope | SportRuleScoringConfig | StageRoundConfig | StageRoundRuleConfig | null | undefined,
  fallbackKind: SportRuleKind = 'BADMINTON',
): ResolvedSportRuleView {
  const source = asRecord(rawRules);
  const scoring = asRecord(source?.scoring);
  const merged = scoring ? { ...source, ...scoring } : source;
  const defaults = buildDefaultSportRules(normalizeKind(merged?.kind) ?? fallbackKind);
  const defaultScoring = asRecord(defaults.scoring) ?? asRecord(defaults);

  const setsToWin = Math.max(
    1,
    Math.trunc(
      readNumber(merged, ['setsToWin', 'sets_to_win']) ??
      readNumber(defaultScoring, ['setsToWin', 'sets_to_win']) ??
      2,
    ),
  );
  const pointsPerSet = Math.max(
    1,
    Math.trunc(
      readNumber(merged, ['pointsPerSet', 'points_per_set']) ??
      readNumber(defaultScoring, ['pointsPerSet', 'points_per_set']) ??
      21,
    ),
  );
  const winByTwo = readBoolean(merged, [
    'winByTwo',
    'mustWinByTwo',
    'deuceEnabled',
    'win_by_two',
    'must_win_by_two',
    'deuce_enabled',
  ]) ?? (
    readBoolean(defaultScoring, ['winByTwo', 'mustWinByTwo', 'deuceEnabled']) ?? true
  );
  const maxPoints = Math.max(
    pointsPerSet,
    Math.trunc(
      readNumber(merged, ['maxPoints', 'max_points', 'maxDeucePoints', 'maxPointsPerSet']) ??
      readNumber(defaultScoring, ['maxPoints', 'max_points', 'maxDeucePoints', 'maxPointsPerSet']) ??
      pointsPerSet,
    ),
  );
  const tiebreakPoints = Math.max(
    1,
    Math.trunc(
      readNumber(merged, ['tiebreakPoints', 'tiebreak_points', 'tiebreakAt', 'tiebreak_at']) ??
      readNumber(defaultScoring, ['tiebreakPoints', 'tiebreak_points', 'tiebreakAt', 'tiebreak_at']) ??
      10,
    ),
  );
  const roundsToPlay = Math.max(
    1,
    Math.trunc(readNumber(merged, ['roundsToPlay']) ?? 1),
  );
  const tiebreakerMode = (merged?.tiebreakerMode === 'playoff' ? 'playoff' : 'split') as 'split' | 'playoff';
  const hasCustomTiebreakTarget = readNumber(merged, ['tiebreakPoints', 'tiebreak_points', 'tiebreakAt', 'tiebreak_at']) !== undefined;
  const scoringModel = (merged?.scoringModel as SportScoringModel) ?? (defaults.scoringModel as SportScoringModel) ?? 'STANDARD';

  return {
    mode: (merged?.mode as 'LITE' | 'STRICT') ?? (defaults?.mode as 'LITE' | 'STRICT') ?? 'STRICT',
    kind: normalizeKind(merged?.kind) ?? fallbackKind,
    scoringModel,
    setsToWin,
    bestOf: setsToWin * 2 - 1,
    pointsPerSet,
    winByTwo,
    maxPoints,
    hasCustomTiebreakTarget,
    tiebreakPoints,
    roundsToPlay,
    tiebreakerMode,
  };
}

