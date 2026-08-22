import type { StageRoundConfig } from '@/types/tournament';

type RoundLabelStage = {
  name?: string | null;
  type?: string | null;
  roundConfig?: StageRoundConfig | null;
};

type RoundLabelGroup = {
  name?: string | null;
  stage?: RoundLabelStage | null;
} | null;

export type RoundLabelMatch = {
  roundNumber: number;
  participant1Id?: string | null;
  participant2Id?: string | null;
  leg?: number | null;
  matchOrder?: number;
  bracketBranch?: string | null;
  group?: RoundLabelGroup;
  stage?: RoundLabelStage | null;
};

export type TournamentFormatForRoundLabel =
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'ROUND_ROBIN'
  | 'GROUP_STAGE_KNOCKOUT'
  | string
  | null
  | undefined;

export interface MatchRoundLabelOptions<TMatch extends RoundLabelMatch> {
  match: TMatch;
  matches?: TMatch[];
  tournamentFormat?: TournamentFormatForRoundLabel;
  bracketSize?: number | null;
  includePhasePrefix?: boolean;
}

export interface RoundFilterOption {
  key: string;
  roundNumber: number;
  internalRound: number;
  leg?: number;
  label: string;
  count: number;
  branch?: 'WINNERS' | 'LOSERS' | 'OTHER';
  stageKey?: string;
}

const KNOCKOUT_ROUND_LABELS: Record<number, string> = {
  2: 'Chung kết',
  4: 'Bán kết',
  8: 'Tứ kết',
  16: 'Vòng 16',
  32: 'Vòng 32',
  64: 'Vòng 64',
};

const normalizeText = (value?: string | null) => (value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');

const normalizeBranch = (value?: string | null) => normalizeText(value);

const isGroupOrRoundRobinStage = (stage?: RoundLabelStage | null, tournamentFormat?: TournamentFormatForRoundLabel) => {
  const type = normalizeText(stage?.type);
  const name = normalizeText(stage?.name);
  const format = normalizeText(tournamentFormat);

  return (
    type === 'ROUND_ROBIN' ||
    type === 'GROUP_STAGE' ||
    name.includes('GROUP') ||
    name.includes('ROUND_ROBIN') ||
    name.includes('VONG_BANG') ||
    format === 'ROUND_ROBIN'
  );
};

const isKnockoutStage = (stage?: RoundLabelStage | null, tournamentFormat?: TournamentFormatForRoundLabel) => {
  const type = normalizeText(stage?.type);
  const name = normalizeText(stage?.name);
  const format = normalizeText(tournamentFormat);

  return (
    type === 'SINGLE_ELIMINATION' ||
    type === 'DOUBLE_ELIMINATION' ||
    type === 'KNOCKOUT' ||
    name.includes('KNOCKOUT') ||
    name.includes('ELIMINATION') ||
    name.includes('PLAYOFF') ||
    format === 'SINGLE_ELIMINATION' ||
    format === 'DOUBLE_ELIMINATION'
  );
};

const getStage = (match: RoundLabelMatch) => match.stage ?? match.group?.stage ?? null;

const getRoundRobinScopeKey = (match: RoundLabelMatch) => {
  const stage = getStage(match);
  return `${normalizeText(stage?.type)}|${normalizeText(stage?.name)}|${normalizeText(match.group?.name)}`;
};

export interface RoundRobinRoundInfo {
  leg: number;
  roundWithinLeg: number;
  roundsPerLeg: number;
}

/** Resolve the user-facing leg and round number for a Round Robin match. */
export const getRoundRobinRoundInfo = <TMatch extends RoundLabelMatch>(
  match: TMatch,
  matches: TMatch[] = [],
): RoundRobinRoundInfo => {
  const scopeKey = getRoundRobinScopeKey(match);
  const scopeMatches = matches.filter((candidate) => getRoundRobinScopeKey(candidate) === scopeKey);
  const maxRound = Math.max(match.roundNumber, ...scopeMatches.map((candidate) => candidate.roundNumber));
  const persistedLegs = scopeMatches
    .map((candidate) => candidate.leg)
    .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0);
  const configuredLegCount = getStage(match)?.roundConfig?.roundsToPlay
    ?? getStage(match)?.roundConfig?.rounds_to_play
    ?? Math.max(1, ...persistedLegs, 1);
  const participantIds = new Set(
    scopeMatches.flatMap((candidate) => [candidate.participant1Id, candidate.participant2Id].filter((id): id is string => Boolean(id))),
  );
  const participantCount = participantIds.size;
  const expectedRoundsPerLeg = participantCount > 1
    ? participantCount % 2 === 0 ? participantCount - 1 : participantCount
    : maxRound;
  const hasGlobalRoundEncoding = configuredLegCount > 1
    && maxRound >= expectedRoundsPerLeg * configuredLegCount;
  const hasPersistedLeg = typeof match.leg === 'number' && Number.isInteger(match.leg) && match.leg > 0;
  const canSplitLegacyRounds = persistedLegs.length > 0 || hasGlobalRoundEncoding;
  const roundsPerLeg = canSplitLegacyRounds
    ? Math.max(1, Math.ceil(maxRound / configuredLegCount))
    : Math.max(1, maxRound);
  const leg = hasPersistedLeg
    ? match.leg as number
    : canSplitLegacyRounds
      ? Math.floor((match.roundNumber - 1) / roundsPerLeg) + 1
      : 1;

  return {
    leg,
    roundWithinLeg: canSplitLegacyRounds ? ((match.roundNumber - 1) % roundsPerLeg) + 1 : match.roundNumber,
    roundsPerLeg,
  };
};

const getRoundFilterIdentity = <TMatch extends RoundLabelMatch>(match: TMatch, matches: TMatch[]) => {
  const stageKey = getComparableStageKey(match);
  const isRoundRobin = isGroupOrRoundRobinStage(getStage(match));
  if (!isRoundRobin) {
    return { stageKey, leg: undefined, internalRound: match.roundNumber };
  }
  const info = getRoundRobinRoundInfo(match, matches);
  return { stageKey, leg: info.leg, internalRound: info.roundWithinLeg };
};

const getPhasePrefix = (match: RoundLabelMatch, tournamentFormat?: TournamentFormatForRoundLabel) => {
  const stage = getStage(match);
  const stageName = normalizeText(stage?.name);
  const branch = normalizeBranch(match.bracketBranch);
  const format = normalizeText(tournamentFormat);

  if (branch === 'LOSERS') return 'Nhánh thua';
  if (branch === 'GRAND_FINALS' || branch === 'GRAND_FINAL') return 'Chung kết tổng';
  if (branch === 'MAIN' && (format === 'DOUBLE_ELIMINATION' || normalizeText(stage?.type) === 'DOUBLE_ELIMINATION')) {
    return 'Nhánh thắng';
  }
  if ((format === 'GROUP_STAGE_KNOCKOUT' || normalizeText(stage?.type) === 'GROUP_STAGE_KNOCKOUT') && (stageName.includes('PLAYOFF') || stageName.includes('KNOCKOUT') || stageName.includes('ELIMINATION'))) {
    return 'Playoff';
  }
  return null;
};

const getComparableStageKey = (match: RoundLabelMatch) => {
  const stage = getStage(match);
  return `${normalizeText(stage?.type)}|${normalizeText(stage?.name)}|${normalizeBranch(match.bracketBranch)}`;
};

const getRoundSlotCount = <TMatch extends RoundLabelMatch>(match: TMatch, matches?: TMatch[]) => {
  const comparableStageKey = getComparableStageKey(match);
  const sameRoundMatches = (matches ?? []).filter((candidate) => (
    candidate.roundNumber === match.roundNumber &&
    getComparableStageKey(candidate) === comparableStageKey
  ));

  if (sameRoundMatches.length === 0) return null;
  return sameRoundMatches.length * 2;
};

const normalizeBracketSize = (bracketSize?: number | null) => {
  if (!bracketSize || bracketSize < 2) return null;
  const cappedSize = Math.min(Math.max(bracketSize, 2), 64);
  return 2 ** Math.ceil(Math.log2(cappedSize));
};

const getSlotCountFromBracketSize = (roundNumber: number, bracketSize?: number | null) => {
  const normalizedSize = normalizeBracketSize(bracketSize);
  if (!normalizedSize) return null;
  return Math.max(2, normalizedSize / 2 ** Math.max(roundNumber - 1, 0));
};

export const getKnockoutRoundLabel = <TMatch extends RoundLabelMatch>(
  match: TMatch,
  matches?: TMatch[],
  bracketSize?: number | null,
) => {
  const branch = normalizeBranch(match.bracketBranch);
  if (branch === 'GRAND_FINALS' || branch === 'GRAND_FINAL') return 'Chung kết tổng';

  const stage = getStage(match);
  const isGsk = stage && (
    normalizeText(stage.type) === 'GROUP_STAGE' || 
    normalizeText(stage.name).includes('PLAYOFF') || 
    normalizeText(stage.name).includes('KNOCKOUT')
  );

  if (branch !== 'LOSERS' && !isGsk) {
    const slotCountFromBracketSize = getSlotCountFromBracketSize(match.roundNumber, bracketSize);
    if (slotCountFromBracketSize && KNOCKOUT_ROUND_LABELS[slotCountFromBracketSize]) {
      return KNOCKOUT_ROUND_LABELS[slotCountFromBracketSize];
    }
  }

  const slotCount = getRoundSlotCount(match, matches);
  let baseLabel = '';

  if (slotCount && KNOCKOUT_ROUND_LABELS[slotCount]) {
    baseLabel = KNOCKOUT_ROUND_LABELS[slotCount];
  } else {
    const stageMatches = (matches ?? []).filter((candidate) => getComparableStageKey(candidate) === getComparableStageKey(match));
    const maxRound = Math.max(...stageMatches.map((candidate) => candidate.roundNumber), match.roundNumber);
    const fromEnd = maxRound - match.roundNumber;

    if (fromEnd === 0) baseLabel = 'Chung kết';
    else if (fromEnd === 1) baseLabel = 'Bán kết';
    else if (fromEnd === 2) baseLabel = 'Tứ kết';
    else if (fromEnd >= 3 && fromEnd <= 6) baseLabel = `Vòng ${2 ** (fromEnd + 1)}`;
    else baseLabel = `Vòng ${match.roundNumber}`;
  }

  // For Losers bracket, since there are two rounds for each slot size (e.g. Losers Round 2 & Losers Round 3 both have 4 matches),
  // we add "Lượt 1" or "Lượt 2" suffix to make them unique.
  if (branch === 'LOSERS' && matches) {
    const stageMatches = matches.filter(
      (candidate) =>
        getComparableStageKey(candidate) === getComparableStageKey(match) &&
        getRoundSlotCount(candidate, matches) === slotCount
    );
    const roundNumbers = Array.from(new Set(stageMatches.map((m) => m.roundNumber))).sort((a, b) => a - b);
    if (roundNumbers.length > 1) {
      const index = roundNumbers.indexOf(match.roundNumber);
      if (index !== -1) {
        return `${baseLabel} - Lượt ${index + 1}`;
      }
    }
  }

  return baseLabel;
};

export const getMatchRoundLabel = <TMatch extends RoundLabelMatch>({
  match,
  matches,
  tournamentFormat,
  bracketSize,
  includePhasePrefix = true,
}: MatchRoundLabelOptions<TMatch>) => {
  const stage = getStage(match);
  const isRoundRobin = isGroupOrRoundRobinStage(stage, tournamentFormat);
  const phasePrefix = includePhasePrefix ? getPhasePrefix(match, tournamentFormat) : null;

  if (isRoundRobin && !isKnockoutStage(stage, tournamentFormat)) {
    const rawGroupName = match.group?.name?.trim();
    const isGenericGroup =
      !rawGroupName ||
      [
        'VÒNG BẢNG',
        'VONG BANG',
        'GROUP STAGE',
        'ROUND ROBIN',
        'CHUNG',
        'DEFAULT',
      ].includes(normalizeText(rawGroupName));
    const groupName = isGenericGroup ? null : rawGroupName;

    const roundInfo = getRoundRobinRoundInfo(match, matches);
    const allMatches = matches ?? [];
    const roundLabel = roundInfo.leg > 1 || allMatches.some((candidate) => getRoundRobinRoundInfo(candidate, allMatches).leg > 1)
      ? `Lượt ${roundInfo.leg} • Ngày đấu ${roundInfo.roundWithinLeg}`
      : `Ngày đấu ${roundInfo.roundWithinLeg}`;

    if (!includePhasePrefix) {
      return roundLabel;
    }

    if (groupName) {
      return `${groupName} • ${roundLabel}`;
    }

    const groupLabel =
      normalizeText(tournamentFormat) === 'GROUP_STAGE_KNOCKOUT' ||
      normalizeText(stage?.type) === 'GROUP_STAGE'
        ? 'Vòng bảng'
        : null;
    return groupLabel ? `${groupLabel} • ${roundLabel}` : roundLabel;
  }

  const knockoutLabel = getKnockoutRoundLabel(match, matches, bracketSize);
  return phasePrefix ? `${phasePrefix} • ${knockoutLabel}` : knockoutLabel;
};

export const buildRoundFilterOptions = <TMatch extends RoundLabelMatch>(
  matches: TMatch[],
  tournamentFormat?: TournamentFormatForRoundLabel,
  bracketSize?: number | null
): RoundFilterOption[] => {
  const optionMap = new Map<string, RoundFilterOption>();

  matches.forEach((match) => {
    // Generate label without phase prefix for grouping, but keep layout clean
    const label = getMatchRoundLabel({ match, matches, tournamentFormat, bracketSize, includePhasePrefix: false });
    // Determine bracket branch
    const branch = normalizeBranch(match.bracketBranch);
    const branchType: RoundFilterOption['branch'] = branch === 'LOSERS' ? 'LOSERS' : (branch === 'GRAND_FINALS' || branch === 'GRAND_FINAL' ? 'OTHER' : 'WINNERS');

    // Group keys including bracket branch type to allow multi-row splitting
    const identity = getRoundFilterIdentity(match, matches);
    const key = `${identity.stageKey}|${branchType}|${identity.leg ?? '-'}|${identity.internalRound}|${label}`;
    const current = optionMap.get(key);

    if (current) {
      current.count += 1;
      return;
    }

    optionMap.set(key, {
      key,
      roundNumber: match.roundNumber,
      internalRound: identity.internalRound,
      ...(identity.leg !== undefined ? { leg: identity.leg } : {}),
      label,
      count: 1,
      branch: branchType,
      stageKey: identity.stageKey,
    });
  });

  const getLabelPriority = (label: string): number => {
    const text = label.toLowerCase();
    if (text.includes('vòng bảng') || text.includes('vong bang')) return 1;
    if (text.includes('vòng 64')) return 2;
    if (text.includes('vòng 32')) return 3;
    if (text.includes('vòng 16')) return 4;
    if (text.includes('tứ kết') || text.includes('tu ket')) return 5;
    if (text.includes('bán kết') || text.includes('ban ket')) return 6;
    if (text.includes('chung kết') && !text.includes('chung kết tổng')) return 7;
    if (text.includes('chung kết tổng')) return 8;
    return 10; // default for unknown labels
  };

  return Array.from(optionMap.values()).sort((a, b) => {
    const priorityA = getLabelPriority(a.label);
    const priorityB = getLabelPriority(b.label);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return (a.leg ?? 0) - (b.leg ?? 0) || a.internalRound - b.internalRound || a.roundNumber - b.roundNumber || a.label.localeCompare(b.label, 'vi');
  });
};

