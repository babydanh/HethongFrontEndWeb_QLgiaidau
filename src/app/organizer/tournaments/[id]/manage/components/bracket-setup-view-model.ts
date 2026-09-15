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

  // Thuật toán chuẩn hóa: Ưu tiên mỗi bảng có 4 hoặc 5 đội (tối thiểu 4 đội nếu count >= 8)
  // Tính số bảng lý tưởng sao cho teamsPerGroup rơi vào khoảng [4, 5]
  let idealGroups = 2;
  if (count <= 7) {
    idealGroups = 2; // 2-3 đội/bảng khi quy mô rất nhỏ < 8
  } else if (count <= 11) {
    idealGroups = 2; // 4-5 đội/bảng
  } else if (count <= 15) {
    idealGroups = 3; // 4-5 đội/bảng
  } else if (count <= 22) {
    idealGroups = 4; // 4-5 đội/bảng (16 đội -> 4 bảng 4 đội, 20 đội -> 4 bảng 5 đội)
  } else if (count <= 30) {
    idealGroups = 6; // 4-5 đội/bảng (24 đội -> 6 bảng 4 đội)
  } else if (count <= 44) {
    idealGroups = 8; // 4-5 đội/bảng (32 đội -> 8 bảng 4 đội, 40 đội -> 8 bảng 5 đội)
  } else if (count <= 64) {
    idealGroups = 12; // 4-5 đội/bảng
  } else {
    idealGroups = 16;
  }

  const teamsPerGroup = Math.ceil(count / idealGroups);
  // Số đội đi tiếp mỗi bảng: thông thường top 2 mỗi bảng vào knockout
  const teamsAdvancing = idealGroups >= 8 && teamsPerGroup <= 4 ? 2 : 2;

  const translationKey =
    idealGroups <= 2
      ? 'suggestionGroupStageSmall'
      : idealGroups <= 4
        ? 'suggestionGroupStageMedium'
        : idealGroups <= 8
          ? 'suggestionGroupStageLarge'
          : 'suggestionGroupStageMany';

  return {
    translationKey,
    groups: idealGroups,
    teamsPerGroup,
    teamsAdvancing,
  };
}
