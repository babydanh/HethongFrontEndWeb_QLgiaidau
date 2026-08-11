import type { Category } from '@/types/category';
import type { SportRuleKind } from '@/types/tournament';
import { inferSportRuleKindFromCategory } from './normalize';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSportRuleKind(value: unknown): value is SportRuleKind {
  return (
    value === 'BADMINTON' ||
    value === 'TABLE_TENNIS' ||
    value === 'PICKLEBALL_RALLY' ||
    value === 'PICKLEBALL_SIDE_OUT' ||
    value === 'TENNIS'
  );
}

function readAllowedRuleKinds(category: Category | null | undefined): SportRuleKind[] | null {
  const config = isRecord(category?.categoryConfig) ? category.categoryConfig : null;
  const rawAllowed = config?.allowedRuleKinds;
  if (!Array.isArray(rawAllowed)) {
    return null;
  }

  const allowedKinds = rawAllowed.filter(isSportRuleKind);
  return allowedKinds.length > 0 ? allowedKinds : null;
}

export function getAllowedSportRuleKinds(category: Category | null | undefined): SportRuleKind[] {
  const allowedKinds = readAllowedRuleKinds(category);
  if (allowedKinds) {
    return allowedKinds;
  }

  const fallbackKind = category?.categoryConfig?.ruleKind;
  if (isSportRuleKind(fallbackKind)) {
    return [fallbackKind];
  }

  return [];
}

export function normalizeSportRuleKindForCategory(
  currentKind: SportRuleKind,
  category: Category | null | undefined,
): SportRuleKind {
  const allowedKinds = getAllowedSportRuleKinds(category);
  if (allowedKinds.length === 0) {
    // Older category records do not have ruleKind/allowedRuleKinds. Infer the
    // sport from slug/name so a stale preset cannot keep a Pickleball event on
    // the Badminton defaults.
    return inferSportRuleKindFromCategory(category);
  }
  if (allowedKinds.includes(currentKind)) {
    return currentKind;
  }

  return allowedKinds[0] ?? 'BADMINTON';
}
