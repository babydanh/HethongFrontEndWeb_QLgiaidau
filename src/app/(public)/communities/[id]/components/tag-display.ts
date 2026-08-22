import type { TranslationValues } from 'next-intl';

export const COMMUNITY_TAG_TRANSLATION_KEYS = {
  funny: 'tagSuggestionFunny',
  goodMatch: 'tagSuggestionGoodMatch',
  weeklyMvp: 'tagSuggestionWeeklyMvp',
  rising: 'tagSuggestionRising',
  toughMatch: 'tagSuggestionToughMatch',
} as const;

export type CommunityTagTranslationKey =
  (typeof COMMUNITY_TAG_TRANSLATION_KEYS)[keyof typeof COMMUNITY_TAG_TRANSLATION_KEYS];

const LEGACY_TAG_KEYS: Record<string, CommunityTagTranslationKey> = {
  'cây hài': COMMUNITY_TAG_TRANSLATION_KEYS.funny,
  funny: COMMUNITY_TAG_TRANSLATION_KEYS.funny,
  'kèo thơm': COMMUNITY_TAG_TRANSLATION_KEYS.goodMatch,
  'great match': COMMUNITY_TAG_TRANSLATION_KEYS.goodMatch,
  'mvp tuần': COMMUNITY_TAG_TRANSLATION_KEYS.weeklyMvp,
  'weekly mvp': COMMUNITY_TAG_TRANSLATION_KEYS.weeklyMvp,
  'đang lên form': COMMUNITY_TAG_TRANSLATION_KEYS.rising,
  rising: COMMUNITY_TAG_TRANSLATION_KEYS.rising,
  'kèo khó': COMMUNITY_TAG_TRANSLATION_KEYS.toughMatch,
  'tough match': COMMUNITY_TAG_TRANSLATION_KEYS.toughMatch,
};

const normalizeTag = (tag: string): string => tag.trim().toLocaleLowerCase('vi-VN');

export const getCommunityTagTranslationKey = (
  tag: string,
): CommunityTagTranslationKey | null => LEGACY_TAG_KEYS[normalizeTag(tag)] ?? null;

export type CommunityTagTranslator = (
  key: CommunityTagTranslationKey,
  values?: TranslationValues,
) => string;

export const getCommunityTagDisplayName = (
  tag: string,
  translate: CommunityTagTranslator,
): string => {
  const key = getCommunityTagTranslationKey(tag);
  return key ? translate(key) : tag;
};

export const isSameCommunityTag = (left: string, right: string): boolean => {
  if (normalizeTag(left) === normalizeTag(right)) return true;

  const leftKey = getCommunityTagTranslationKey(left);
  const rightKey = getCommunityTagTranslationKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
};
