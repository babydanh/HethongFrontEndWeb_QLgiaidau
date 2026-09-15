import type { SportRulePreset } from '@/features/tournaments/sport-rules/ui-guidance';

export type BracketSetupVariant = 'GROUP_STAGE_KNOCKOUT' | 'ROUND_ROBIN' | 'KNOCKOUT';

export interface BracketSetupViewModelInput {
  tournamentFormat?: string;
  bracketType?: string | null;
  divisionBracketType?: string | null;
  stageTypes?: readonly string[];
  numGroups: number;
  teamsPerGroup: number;
  teamsAdvancing: number;
  roundsToPlay?: number;
  participantCount: number;
}

export interface BracketSetupViewModel {
  variant: BracketSetupVariant;
  groups: number;
  teamsPerGroup: number;
  teamsAdvancing: number;
  advancingTotal: number;
  roundsToPlay: number;
  participantCount: number;
}

export interface BracketQuickSuggestion {
  translationKey:
    | 'suggestionRoundRobinSmall'
    | 'suggestionRoundRobinMedium'
    | 'suggestionRoundRobinLarge'
    | 'suggestionRoundRobinWarning'
    | 'suggestionGroupStageSmall'
    | 'suggestionGroupStageMedium'
    | 'suggestionGroupStageLarge'
    | 'suggestionGroupStageMany';
  groups?: number;
  teamsPerGroup?: number;
  teamsAdvancing?: number;
  roundsToPlay?: number;
  tiebreakerMode?: 'split' | 'playoff';
}

function hasFormat(value: string | null | undefined, expected: BracketSetupVariant): boolean {
  return value?.toUpperCase() === expected;
}

export function buildBracketSetupViewModel(input: BracketSetupViewModelInput): BracketSetupViewModel {
  const stageTypes = input.stageTypes ?? [];
  const variant = hasFormat(input.tournamentFormat, 'GROUP_STAGE_KNOCKOUT')
    || hasFormat(input.bracketType, 'GROUP_STAGE_KNOCKOUT')
    || hasFormat(input.divisionBracketType, 'GROUP_STAGE_KNOCKOUT')
    ? 'GROUP_STAGE_KNOCKOUT'
    : hasFormat(input.tournamentFormat, 'ROUND_ROBIN')
      || hasFormat(input.bracketType, 'ROUND_ROBIN')
      || stageTypes.some((stageType) => stageType.toUpperCase() === 'ROUND_ROBIN')
      ? 'ROUND_ROBIN'
      : 'KNOCKOUT';

  return {
    variant,
    groups: Math.max(0, input.numGroups),
    teamsPerGroup: Math.max(0, input.teamsPerGroup),
    teamsAdvancing: Math.max(0, input.teamsAdvancing),
    advancingTotal: Math.max(0, input.numGroups) * Math.max(0, input.teamsAdvancing),
    roundsToPlay: Math.max(1, input.roundsToPlay ?? 1),
    participantCount: Math.max(0, input.participantCount),
  };
}

export function getQuickPresets<T extends SportRulePreset>(presets: readonly T[], limit = 2): T[] {
  return presets.slice(0, Math.max(0, limit));
}

export function getBracketQuickSuggestion(
  variant: BracketSetupVariant,
  participantCount: number,
): BracketQuickSuggestion | null {
  const count = Math.max(0, participantCount);

  if (variant === 'ROUND_ROBIN') {
    if (count < 2) return null;
    if (count <= 8) {
      return { translationKey: 'suggestionRoundRobinSmall', roundsToPlay: 1, tiebreakerMode: 'split' };
    }
    if (count <= 16) {
      return { translationKey: 'suggestionRoundRobinMedium', roundsToPlay: 2, tiebreakerMode: 'playoff' };
    }
    if (count <= 32) {
      return { translationKey: 'suggestionRoundRobinLarge', roundsToPlay: 2, tiebreakerMode: 'playoff' };
    }
    return { translationKey: 'suggestionRoundRobinWarning', roundsToPlay: 2, tiebreakerMode: 'playoff' };
  }

  if (variant !== 'GROUP_STAGE_KNOCKOUT' || count < 4) return null;
  if (count <= 8) {
    return {
      translationKey: 'suggestionGroupStageSmall',
      groups: 2,
      teamsPerGroup: Math.ceil(count / 2),
      teamsAdvancing: 1,
    };
  }
  if (count <= 16) {
    return {
      translationKey: 'suggestionGroupStageMedium',
      groups: 2,
      teamsPerGroup: Math.ceil(count / 2),
      teamsAdvancing: 2,
    };
  }
  if (count <= 32) {
    return {
      translationKey: 'suggestionGroupStageLarge',
      groups: 4,
      teamsPerGroup: Math.ceil(count / 4),
      teamsAdvancing: 2,
    };
  }
  return {
    translationKey: 'suggestionGroupStageMany',
    groups: 8,
    teamsPerGroup: Math.ceil(count / 8),
    teamsAdvancing: 1,
  };
}
