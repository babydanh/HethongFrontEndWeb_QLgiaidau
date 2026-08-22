import type { Category } from '@/types/category';
import { MatchTypeDB } from '@/types/tournament';

export type MatchFormatOptionValue =
  | 'MALE_SINGLES'
  | 'FEMALE_SINGLES'
  | 'MALE_DOUBLES'
  | 'FEMALE_DOUBLES'
  | 'MIXED_DOUBLES';

export type MatchFormatTranslationKey =
  | 'formatMaleSingles'
  | 'formatFemaleSingles'
  | 'formatMaleDoubles'
  | 'formatFemaleDoubles'
  | 'formatMixedDoubles';

export interface MatchFormatOption {
  value: MatchFormatOptionValue;
  labelKey: MatchFormatTranslationKey;
  shortLabelKey: MatchFormatTranslationKey;
  icon?: string;
}

const ALL_MATCH_FORMAT_OPTIONS: MatchFormatOption[] = [
  { value: 'MALE_SINGLES', labelKey: 'formatMaleSingles', shortLabelKey: 'formatMaleSingles', icon: '♂️' },
  { value: 'FEMALE_SINGLES', labelKey: 'formatFemaleSingles', shortLabelKey: 'formatFemaleSingles', icon: '♀️' },
  { value: 'MALE_DOUBLES', labelKey: 'formatMaleDoubles', shortLabelKey: 'formatMaleDoubles', icon: '👥' },
  { value: 'FEMALE_DOUBLES', labelKey: 'formatFemaleDoubles', shortLabelKey: 'formatFemaleDoubles', icon: '👯‍♀️' },
  { value: 'MIXED_DOUBLES', labelKey: 'formatMixedDoubles', shortLabelKey: 'formatMixedDoubles', icon: '👫' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSupportedMatchTypes(category: Category | null | undefined): MatchTypeDB[] | null {
  const config = isRecord(category?.categoryConfig) ? category.categoryConfig : null;
  const raw = config?.supportedMatchTypes;
  if (!Array.isArray(raw)) {
    return null;
  }

  const supported = raw.filter(
    (value): value is MatchTypeDB =>
      value === MatchTypeDB.SINGLES ||
      value === MatchTypeDB.DOUBLES ||
      value === MatchTypeDB.MIXED_DOUBLES,
  );

  return supported.length > 0 ? supported : null;
}

export function getAllowedMatchFormatOptions(category: Category | null | undefined): MatchFormatOption[] {
  const supportedMatchTypes = readSupportedMatchTypes(category);
  if (!supportedMatchTypes) {
    return ALL_MATCH_FORMAT_OPTIONS;
  }

  return ALL_MATCH_FORMAT_OPTIONS.filter((option) => {
    if (option.value === 'MIXED_DOUBLES') {
      return supportedMatchTypes.includes(MatchTypeDB.MIXED_DOUBLES);
    }
    if (option.value === 'MALE_SINGLES' || option.value === 'FEMALE_SINGLES') {
      return supportedMatchTypes.includes(MatchTypeDB.SINGLES);
    }

    return supportedMatchTypes.includes(MatchTypeDB.DOUBLES);
  });
}

export function normalizeMatchFormatForCategory(
  current: MatchFormatOptionValue,
  category: Category | null | undefined,
): MatchFormatOptionValue {
  const allowedOptions = getAllowedMatchFormatOptions(category);
  if (allowedOptions.some((option) => option.value === current)) {
    return current;
  }

  return allowedOptions[0]?.value ?? 'MALE_DOUBLES';
}


