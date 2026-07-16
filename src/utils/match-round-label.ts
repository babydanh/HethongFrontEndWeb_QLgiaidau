type RoundLabelStage = {
  name?: string | null;
  type?: string | null;
};

type RoundLabelGroup = {
  name?: string | null;
  stage?: RoundLabelStage | null;
} | null;

export type RoundLabelMatch = {
  roundNumber: number;
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
  label: string;
  count: number;
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
  if (stageName.includes('PLAYOFF') || stageName.includes('KNOCKOUT') || stageName.includes('ELIMINATION')) {
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
  if (slotCount && KNOCKOUT_ROUND_LABELS[slotCount]) {
    return KNOCKOUT_ROUND_LABELS[slotCount];
  }

  const stageMatches = (matches ?? []).filter((candidate) => getComparableStageKey(candidate) === getComparableStageKey(match));
  const maxRound = Math.max(...stageMatches.map((candidate) => candidate.roundNumber), match.roundNumber);
  const fromEnd = maxRound - match.roundNumber;

  if (fromEnd === 0) return 'Chung kết';
  if (fromEnd === 1) return 'Bán kết';
  if (fromEnd === 2) return 'Tứ kết';
  if (fromEnd >= 3 && fromEnd <= 6) return `Vòng ${2 ** (fromEnd + 1)}`;

  return `Vòng ${match.roundNumber}`;
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
    const groupLabel = normalizeText(tournamentFormat) === 'GROUP_STAGE_KNOCKOUT' || normalizeText(stage?.type) === 'GROUP_STAGE'
      ? 'Vòng bảng'
      : null;
    return groupLabel ? `${groupLabel} - Vòng ${match.roundNumber}` : `Vòng ${match.roundNumber}`;
  }

  const knockoutLabel = getKnockoutRoundLabel(match, matches, bracketSize);
  return phasePrefix ? `${phasePrefix} - ${knockoutLabel}` : knockoutLabel;
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
    // Group keys ignoring Winners/Losers bracket branch
    const stage = getStage(match);
    const key = `${normalizeText(stage?.type)}|${normalizeText(stage?.name)}|${match.roundNumber}|${label}`;
    const current = optionMap.get(key);

    if (current) {
      current.count += 1;
      return;
    }

    optionMap.set(key, {
      key,
      roundNumber: match.roundNumber,
      label,
      count: 1,
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
    return a.roundNumber - b.roundNumber || a.label.localeCompare(b.label, 'vi');
  });
};
