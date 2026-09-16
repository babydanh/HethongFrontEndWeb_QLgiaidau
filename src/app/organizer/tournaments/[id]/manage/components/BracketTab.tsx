'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Settings, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getErrorMessage } from '@/utils/error';
import { divisionsApi, tournamentsApi, type BracketSlotMutation, type Division } from '@/features/tournaments/api';

import { ScheduleGridView } from './ScheduleGridView';
import type { CourtSetupItem } from './CourtSetup';
import { BracketSetupModal } from './BracketSetupModal';
import { RoundRobinView } from '@/app/(public)/tournaments/[id]/components/bracket/RoundRobinView';
import { PagedRoundRobinView } from '@/app/(public)/tournaments/[id]/components/bracket/PagedRoundRobinView';
import { Tournament, BracketStage, BracketMatch, type SportRuleKind, type StageRoundConfig } from '@/types/tournament';
import PublicBracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Category } from '@/features/categories/api';
import type {
  BracketDragHandlers,
  BracketDragSource,
  BracketParticipant,
  BracketSlot,
  RoundRobinGroupDragHandlers,
} from '@/app/(public)/tournaments/[id]/components/bracket/types';
import { isBracketMatchDragLocked } from '@/app/(public)/tournaments/[id]/components/bracket/match-status';
import { buildBracketSetupViewModel } from './bracket-setup-view-model';

interface BracketTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  selectedDivisionId: string;
  participants: unknown[];
  courts?: CourtSetupItem[];
  divisions?: Division[];
  venues?: Array<{ id: string; name: string; locationAddress?: string }>;
  currentVenueId?: string;
  onSelectVenue?: (venueId: string) => void;
  defaultDate?: string;
  onRefetchData?: () => Promise<unknown> | void;
  isGeneratingBracket: boolean;
  handleGenerateBracket: () => Promise<void> | void;
  handleOpenScheduling: (match: BracketMatch) => void;
  handleOpenRoundModal?: (stage: BracketStage, roundNumber: number) => void;
  refetchDivisionData?: () => Promise<unknown> | void;
  onBracketPersisted?: (matches: BracketMatch[]) => void;

  // Cấu hình mặc định props
  isLimitEnabled: boolean;
  setIsLimitEnabled: (val: boolean) => void;
  maxParticipants: number;
  setMaxParticipants: (val: number) => void;
  matchType: string;
  setMatchType: (val: string) => void;
  availableMatchFormatOptions: MatchFormatOption[];
  selectedCategory?: Category | null;
  sportRuleKind: SportRuleKind;
  setSportRuleKind: (val: SportRuleKind) => void;
  setsToWin: number;
  setSetsToWin: (val: number) => void;
  pointsPerSet: number;
  setPointsPerSet: (val: number) => void;
  winByTwo: boolean;
  setWinByTwo: (val: boolean) => void;
  maxDeucePoints: number;
  setMaxDeucePoints: (val: number) => void;
  superTiebreakEnabled: boolean;
  setSuperTiebreakEnabled: (val: boolean) => void;
  superTiebreakSetIndex: number;
  setSuperTiebreakSetIndex: (val: number) => void;
  superTiebreakPoints: number;
  setSuperTiebreakPoints: (val: number) => void;

  // Round Robin specific
  tiebreakerMode?: 'split' | 'playoff';
  setTiebreakerMode?: (val: 'split' | 'playoff') => void;
  roundsToPlay?: number;
  setRoundsToPlay?: (val: number) => void;
  selectedMatchId?: string | null;
  onSelectMatch?: (match: import('@/types/tournament').BracketMatch) => void;
  onDoubleClickMatch?: (match: import('@/types/tournament').BracketMatch) => void;
  isLiteMode: boolean;
  setIsLiteMode: (val: boolean) => void;

  // Lock state — disable config edits after lock
  isLocked?: boolean;

  // Common
  bracketType?: string | null;
  bracketTypeState?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT';
  setBracketTypeState?: React.Dispatch<React.SetStateAction<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'>>;

  // Round Robin scoring config
  rrWinPoints?: number;
  setRrWinPoints?: (val: number) => void;
  rrLossPoints?: number;
  setRrLossPoints?: (val: number) => void;
  rrTiebreaker?: string;
  setRrTiebreaker?: (val: string) => void;
  rrTiebreakerRule?: string;
  setRrTiebreakerRule?: React.Dispatch<React.SetStateAction<'H2H_POINTS' | 'SET_DIFF' | 'POINT_DIFF'>>;

  // Group Stage Knockout props
  tournamentFormat?: string;
  gsNumGroups?: number;
  gsTeamsPerGroup?: number;
  gsTeamsAdvancingPerGroup?: number;
  handleAdvanceStandings?: () => Promise<void>;
  isAdvancingStandings?: boolean;
  // Additional GSK state from page
  numGroups?: number;
  setNumGroups?: React.Dispatch<React.SetStateAction<number>>;
  teamsPerGroup?: number;
  setTeamsPerGroup?: React.Dispatch<React.SetStateAction<number>>;
  teamsAdvancing?: number;
  gskPlayoffType?: string;
  setGskPlayoffType?: React.Dispatch<React.SetStateAction<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>>;
  gskSeedingType?: string;
  setGskSeedingType?: React.Dispatch<React.SetStateAction<'SEEDED' | 'RANDOM'>>;
  gskRoundsToPlay?: number;
  setGskRoundsToPlay?: React.Dispatch<React.SetStateAction<number>>;
  divisionRoundConfig?: StageRoundConfig | null;
}

type GroupAssignment = {
  name: string;
  participantIds: string[];
  roundConfig?: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export function BracketTab({
  tournament,
  bracket,
  selectedDivisionId,
  participants,
  isGeneratingBracket,
  handleGenerateBracket,
  handleOpenScheduling,
  handleOpenRoundModal,
  refetchDivisionData,
  onBracketPersisted,
  divisions,

  isLimitEnabled,
  setIsLimitEnabled,
  maxParticipants,
  setMaxParticipants,
  matchType,
  setMatchType,
  availableMatchFormatOptions,
  sportRuleKind,
  setSportRuleKind,
  setsToWin,
  setSetsToWin,
  pointsPerSet,
  setPointsPerSet,
  winByTwo,
  setWinByTwo,
  maxDeucePoints,
  setMaxDeucePoints,
  superTiebreakEnabled,
  setSuperTiebreakEnabled,
  superTiebreakSetIndex,
  setSuperTiebreakSetIndex,
  superTiebreakPoints,
  setSuperTiebreakPoints,

  // Round Robin
  tiebreakerMode = 'split',
  setTiebreakerMode,
  roundsToPlay = 1,
  setRoundsToPlay,
  selectedMatchId,
  onSelectMatch,
  onDoubleClickMatch,
  isLiteMode, setIsLiteMode,
  // Round Robin scoring
  rrWinPoints = 3,
  setRrWinPoints,
  rrLossPoints = 0,
  setRrLossPoints,
  rrTiebreaker = 'H2H_POINTS',
  setRrTiebreaker,
  tournamentFormat,
  numGroups = 4,
  setNumGroups,
  teamsPerGroup = 4,
  setTeamsPerGroup,
  teamsAdvancing = 2,
  gskPlayoffType,
  setGskPlayoffType,
  gskSeedingType,
  setGskSeedingType,
  gskRoundsToPlay = 1,
  setGskRoundsToPlay,
  divisionRoundConfig,
  isAdvancingStandings = false,
  bracketType,
  isLocked = false,
}: BracketTabProps) {
  const translate = useTranslations('TournamentDetail');

  const getKnockoutRoundLabel = (roundIndex: number, totalRounds: number, translate: (key: string, values?: { round?: number }) => string) => {
    const fromEnd = totalRounds - 1 - roundIndex;
    if (fromEnd === 0) return translate('stageFinal');
    if (fromEnd === 1) return translate('stageSemifinal');
    if (fromEnd === 2) return translate('stageQuarterfinal');
    if (fromEnd === 3) return translate('roundOf', { round: 16 });
    if (fromEnd === 4) return translate('roundOf', { round: 32 });
    if (fromEnd === 5) return translate('roundOf', { round: 64 });
    return translate('roundOf', { round: 2 ** fromEnd });
  };

  const getKnockoutBracketSize = (teamCount: number) => {
    if (teamCount < 2) return 0;
    return Math.min(64, 2 ** Math.ceil(Math.log2(teamCount)));
  };

  // Helper to extract bracket rounds from matches inside stage groups
  const getRoundsList = () => {
    if (!bracket || !bracket.stages) return [];

    // The round number is shared by winners/losers groups in double elimination.
    // Flattening every group and deriving the label from the largest round was
    // producing phantom Vòng 128/duplicate Vòng 64 rows for a 32-team bracket.
    // Use the canonical winners bracket (and grand final) as the source of the
    // configurable rounds; its match count gives the real bracket size.
    const configuredBracketSize = isLimitEnabled && maxParticipants >= 2
      ? getKnockoutBracketSize(maxParticipants)
      : null;

    return bracket.stages.flatMap((stage) => {
      const groups = stage.groups ?? [];
      const sourceGroups = stage.type === 'DOUBLE_ELIMINATION'
        ? groups.filter((group) => {
            const name = group.name.toLowerCase();
            return name.includes('winner') || name.includes('thắng') || name.includes('grand') || name.includes('chung');
          })
        : groups;
      const effectiveGroups = sourceGroups.length > 0 ? sourceGroups : groups;
      const roundsByNumber = new Map<number, { capacity: number; isGrandFinal: boolean }>();

      for (const group of effectiveGroups) {
        const roundNumbers = [...new Set(group.matches.map((match) => match.roundNumber))];
        for (const roundNumber of roundNumbers) {
          const matchCount = group.matches.filter((match) => match.roundNumber === roundNumber).length;
          const capacity = Math.max(2, matchCount * 2);
          const isGrandFinal = group.name.toLowerCase().includes('grand') || group.name.toLowerCase().includes('chung');
          const previous = roundsByNumber.get(roundNumber);
          // Winners rounds are the canonical numbering. Grand Finals also use
          // round 1 internally, so never let that group replace winners round 1.
          if (!previous || (!isGrandFinal && previous.isGrandFinal)) {
            roundsByNumber.set(roundNumber, { capacity, isGrandFinal });
          }
        }
      }

      return [...roundsByNumber.entries()]
        .sort(([left], [right]) => left - right)
        .filter(([, round]) => !configuredBracketSize || round.capacity <= configuredBracketSize)
        .map(([roundNumber, round]) => {
          const totalRounds = Math.max(1, Math.round(Math.log2(round.capacity)));
          const name = round.isGrandFinal
? translate('stageFinal')
            : getKnockoutRoundLabel(0, totalRounds, translate);
          return {
            stage,
            roundNumber,
            name,
            override: stage.roundConfig?.rounds?.[roundNumber.toString()],
          };
        });
    });
  };

  const isGroupStageKnockout = 
    tournamentFormat?.toUpperCase() === 'GROUP_STAGE_KNOCKOUT' || 
    bracketType?.toUpperCase() === 'GROUP_STAGE_KNOCKOUT';

  // Check if the current bracket is Round Robin
  const isRoundRobin = !isGroupStageKnockout && bracket?.stages?.some(
    (s) => s.type === 'ROUND_ROBIN',
  );
  const allRounds = getRoundsList();
  const knockoutRounds = allRounds.filter(
    ({ stage }) => stage.type === 'SINGLE_ELIMINATION' || stage.type === 'DOUBLE_ELIMINATION',
  );
  const rounds = isGroupStageKnockout ? knockoutRounds : allRounds;
  const gsStages = bracket?.stages ?? [];
  const gsHasPlayoffStage = gsStages.some(s => s.type === 'SINGLE_ELIMINATION' || s.type === 'DOUBLE_ELIMINATION');
  const [gsActiveTab, setGsActiveTab] = useState<'group' | 'playoff'>('group');
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [isPoolArrangementModalOpen, setIsPoolArrangementModalOpen] = useState(false);
  const [trayParticipants, setTrayParticipants] = useState<BracketParticipant[]>([]);
  const [participantOverrides, setParticipantOverrides] = useState<Record<string, BracketParticipant | null>>({});
  const [activeDragSource, setActiveDragSource] = useState<BracketDragSource | null>(null);
  const [isSavingBracketSlots, setIsSavingBracketSlots] = useState(false);
  const [isSavingGroupAssignments, setIsSavingGroupAssignments] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const hasBracket = Boolean(bracket?.stages && bracket.stages.length > 0);

  type BracketDropTarget = Parameters<NonNullable<BracketDragHandlers['onParticipantDrop']>>[1];

  const findBracketMatch = (matchId: string): BracketMatch | null => {
    for (const stage of bracket?.stages ?? []) {
      for (const group of stage.groups ?? []) {
        const match = group.matches.find((candidate) => candidate.id === matchId);
        if (match) return match;
      }
    }
    return null;
  };

  const getCurrentSlotParticipant = (matchId: string, slot: BracketSlot): BracketParticipant | null => {
    const key = `${matchId}:${slot}`;
    if (Object.prototype.hasOwnProperty.call(participantOverrides, key)) {
      return participantOverrides[key] ?? null;
    }
    const match = findBracketMatch(matchId);
    return match?.[slot] ?? null;
  };

  const isBracketDropTarget = (value: unknown): value is BracketDropTarget => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    if (candidate.type === 'tray') return true;
    return candidate.type === 'slot'
      && typeof candidate.matchId === 'string'
      && (candidate.slot === 'participant1' || candidate.slot === 'participant2');
  };

  const handleBracketParticipantDrop = async (source: BracketDragSource, target: BracketDropTarget): Promise<void> => {
    if (!selectedDivisionId || isSavingBracketSlots) return;
    if (source.type === 'slot' && source.matchId) {
      const sourceMatch = findBracketMatch(source.matchId);
      if (sourceMatch && isBracketMatchDragLocked(sourceMatch)) return;
    }

    if (target.type === 'slot') {
      const targetMatch = findBracketMatch(target.matchId);
      if (targetMatch && isBracketMatchDragLocked(targetMatch)) return;
    }

    const previousOverrides = participantOverrides;
    const previousTray = trayParticipants;
    const nextOverrides = { ...previousOverrides };
    let nextTray = [...previousTray];
    let operation: BracketSlotMutation | null = null;

    if (target.type === 'tray') {
      if (source.type !== 'slot' || !source.matchId || !source.slot) return;
      const sourceKey = `${source.matchId}:${source.slot}`;
      nextOverrides[sourceKey] = null;
      if (!nextTray.some((participant) => participant.id === source.participant.id)) {
        nextTray = [...nextTray, source.participant];
      }
      operation = {
        operation: 'UNASSIGN',
        matchId: source.matchId,
        slot: source.slot,
      };
    } else {
      const targetKey = `${target.matchId}:${target.slot}`;
      const sourceKey = source.type === 'slot' && source.matchId && source.slot
        ? `${source.matchId}:${source.slot}`
        : null;
      if (sourceKey === targetKey) return;

      const currentOccupant = getCurrentSlotParticipant(target.matchId, target.slot);
      nextOverrides[targetKey] = source.participant;
      if (sourceKey) nextOverrides[sourceKey] = currentOccupant;

      if (source.type === 'tray') {
        nextTray = nextTray.filter((participant) => participant.id !== source.participant.id);
        if (currentOccupant && currentOccupant.id !== source.participant.id && !nextTray.some((participant) => participant.id === currentOccupant.id)) {
          nextTray = [...nextTray, currentOccupant];
        }
        operation = {
          operation: currentOccupant ? 'REPLACE' : 'ASSIGN',
          matchId: target.matchId,
          slot: target.slot,
          participantId: source.participant.id,
        };
      } else if (source.matchId && source.slot) {
        operation = {
          operation: currentOccupant ? 'SWAP' : 'MOVE',
          fromMatchId: source.matchId,
          fromSlot: source.slot,
          toMatchId: target.matchId,
          toSlot: target.slot,
        };
      }
    }

    if (!operation) return;

    const sourceMatch = source.type === 'slot' && source.matchId ? findBracketMatch(source.matchId) : null;
    const targetMatch = target.type === 'slot' ? findBracketMatch(target.matchId) : null;
    if (sourceMatch?.status?.toUpperCase() === 'COMPLETED' || targetMatch?.status?.toUpperCase() === 'COMPLETED') {
      toast(translate('bracketCompletedDragWarning'));
    }

    setParticipantOverrides(nextOverrides);
    setTrayParticipants(nextTray);
    setIsSavingBracketSlots(true);
    try {
      const response = await tournamentsApi.updateBracketSlots(tournament.id, selectedDivisionId, [operation]);
      const canonicalMatches = response.data.matches ?? [];
      if (canonicalMatches.length > 0) {
        onBracketPersisted?.(canonicalMatches);
        setParticipantOverrides({});
      } else {
        await refetchDivisionData?.();
        setParticipantOverrides({});
      }
      toast.success(translate('bracketSlotsSaved'));
    } catch (error) {
      setParticipantOverrides(previousOverrides);
      setTrayParticipants(previousTray);
      toast.error(getErrorMessage(error) || translate('bracketSlotsSaveFailed'));
    } finally {
      setIsSavingBracketSlots(false);
    }
  };

  const handleBracketDragStart = (event: DragStartEvent) => {
    const source = (event.active.data.current as { source?: BracketDragSource } | undefined)?.source;
    setActiveDragSource(source ?? null);
  };

  const handleBracketDragEnd = (event: DragEndEvent) => {
    setActiveDragSource(null);
    const source = (event.active.data.current as { source?: BracketDragSource } | undefined)?.source;
    const target = (event.over?.data.current as { target?: unknown } | undefined)?.target;
    if (!source || !isBracketDropTarget(target)) return;
    handleBracketParticipantDrop(source, target);
  };

  const bracketDragHandlers: BracketDragHandlers = {
    enabled: hasBracket && !isSavingBracketSlots,
    trayParticipants,
    participantOverrides,
    onParticipantDrop: handleBracketParticipantDrop,
  };
  const isTournamentCompleted = tournament.status === 'COMPLETED';
  const canResetBracket = hasBracket && !isTournamentCompleted;
  const participantCount = useMemo(() => (
    (participants as Array<Record<string, unknown>>).filter(
      (participant) => participant?.teamStatus === 'COMPLETE' && participant?.isPaid === true,
    ).length
  ), [participants]);
  const selectedDivision = divisions?.find((division) => division.id === selectedDivisionId) ?? null;
  const bracketSetup = buildBracketSetupViewModel({
    tournamentFormat,
    bracketType,
    divisionBracketType: selectedDivision?.bracketType,
    stageTypes: bracket?.stages?.map((stage) => stage.type),
    numGroups,
    teamsPerGroup,
    teamsAdvancing,
    roundsToPlay: isRoundRobin ? roundsToPlay : gskRoundsToPlay,
    participantCount,
  });
  const bracketFormatLabel = bracketSetup.variant === 'GROUP_STAGE_KNOCKOUT'
    ? translate('groupStage')
    : bracketSetup.variant === 'ROUND_ROBIN'
      ? translate('stageGroupStage')
      : bracketType?.toUpperCase() === 'DOUBLE_ELIMINATION'
        ? translate('stageDoubleEliminationLong')
        : translate('stageSingleEliminationLong');
  const bracketSummary = bracketSetup.variant === 'GROUP_STAGE_KNOCKOUT'
    ? translate('compactGroupStageSummary', {
        groups: bracketSetup.groups,
        teams: bracketSetup.teamsPerGroup,
        advancing: bracketSetup.teamsAdvancing,
        total: bracketSetup.advancingTotal,
      })
    : bracketSetup.variant === 'ROUND_ROBIN'
      ? translate('compactRoundRobinSummary', { rounds: bracketSetup.roundsToPlay })
      : translate('compactKnockoutSummary', { count: bracketSetup.participantCount });
  const gskAdvancingTotal = Math.max(0, numGroups) * Math.max(0, teamsAdvancing);
  const gskStartRoundLabel =
    gskAdvancingTotal >= 32
      ? translate('roundOf', { round: 32 })
      : gskAdvancingTotal >= 16
        ? translate('roundOf', { round: 16 })
        : gskAdvancingTotal >= 8
          ? translate('stageQuarterfinal')
          : gskAdvancingTotal >= 4
            ? translate('stageSemifinal')
            : gskAdvancingTotal >= 2
              ? translate('stageFinal')
              : translate('roundInsufficientTeams');

  // ─── Participant count for smart suggestions ───
  const gskKnockoutBracketSize = getKnockoutBracketSize(gskAdvancingTotal);
  const gskKnockoutRoundCount = gskKnockoutBracketSize > 0 ? Math.log2(gskKnockoutBracketSize) : 0;
  const gskDisplayStartRoundLabel = gskKnockoutRoundCount > 0
    ? getKnockoutRoundLabel(0, gskKnockoutRoundCount, translate)
    : translate('roundInsufficientTeams');
  const gskDraftStage: BracketStage = {
    id: '__draft_gsk_knockout__',
    name: translate('draftKnockout'),
    type: gskPlayoffType ?? 'SINGLE_ELIMINATION',
    order: 2,
    groups: [],
    roundConfig: divisionRoundConfig ?? null,
  };
  const gskDraftGroupStage: BracketStage = {
    id: '__draft_gsk_group__',
    name: translate('draftGroupStage'),
    type: 'ROUND_ROBIN',
    order: 1,
    groups: [],
    roundConfig: divisionRoundConfig ?? null,
  };
  const plannedKnockoutRounds = Array.from({ length: gskKnockoutRoundCount }, (_, idx) => {
    const roundNumber = idx + 1;
    return {
      stage: gskDraftStage,
      roundNumber,
      name: getKnockoutRoundLabel(idx, gskKnockoutRoundCount, translate),
      override: divisionRoundConfig?.rounds?.[roundNumber.toString()],
    };
  });
  const gskConfigurableRounds = knockoutRounds.length > 0 ? knockoutRounds : plannedKnockoutRounds;
  
  const groupStage = bracket?.stages?.find(s => s.type === 'ROUND_ROBIN') || gskDraftGroupStage;

  const getGroupParticipantIds = (group: BracketStage['groups'][number]): string[] => {
    const participantIds: string[] = [];
    const seen = new Set<string>();
    for (const match of group.matches ?? []) {
      for (const participantId of [
        match.participant1Id ?? match.participant1?.id,
        match.participant2Id ?? match.participant2?.id,
      ]) {
        if (participantId && !seen.has(participantId)) {
          seen.add(participantId);
          participantIds.push(participantId);
        }
      }
    }
    return participantIds;
  };

  const groupMatchStatusesBeforeStart = new Set(['SCHEDULED', 'PENDING', 'NOT_STARTED', 'UPCOMING']);
  const groupMatches = (bracket?.stages?.find((stage) => stage.type === 'ROUND_ROBIN')?.groups ?? [])
    .flatMap((group) => group.matches ?? []);
  const tournamentStatus = String(tournament.status ?? '').trim().toUpperCase();
  const groupAssignmentLocked = isLocked
    || isGeneratingBracket
    || isSavingGroupAssignments
    || ['IN_PROGRESS', 'ONGOING', 'LIVE', 'ACTIVE', 'COMPLETED', 'FINISHED', 'DONE', 'ENDED', 'CANCELLED', 'CANCELED'].includes(tournamentStatus)
    || groupMatches.some((match) => {
      const status = String(match.status ?? '').trim().toUpperCase();
      return !groupMatchStatusesBeforeStart.has(status)
        || Boolean(match.scheduledAt || match.winnerId || match.completedAt);
    });

  const persistGroupAssignments = async (groups: GroupAssignment[]): Promise<void> => {
    if (!selectedDivisionId || !selectedDivision) {
      throw new Error('Vui lòng chọn nội dung thi đấu');
    }

    const currentRoundConfig = isRecord(selectedDivision.roundConfig)
      ? selectedDivision.roundConfig
      : {};
    const currentGroupsConfig = isRecord(currentRoundConfig.groupsConfig)
      ? currentRoundConfig.groupsConfig
      : {};
    const configuredTeamsPerGroup = Number(currentGroupsConfig.teamsPerGroup ?? teamsPerGroup);
    const effectiveTeamsPerGroup = Number.isFinite(configuredTeamsPerGroup)
      ? Math.max(2, Math.trunc(configuredTeamsPerGroup))
      : Math.max(2, teamsPerGroup);

    await divisionsApi.updateDivisionConfig(tournament.id, selectedDivisionId, {
      isConfigOverride: true,
      roundConfig: {
        ...currentRoundConfig,
        groupsConfig: {
          ...currentGroupsConfig,
          numGroups: groups.length,
          teamsPerGroup: effectiveTeamsPerGroup,
          groups: groups.map((group) => ({
            name: group.name,
            participantIds: group.participantIds,
            ...(group.roundConfig ? { roundConfig: group.roundConfig } : {}),
          })),
        },
      },
    });

    // Reuse the existing generator so group standings, matches and downstream
    // knockout links are rebuilt from the persisted configuration together.
    await handleGenerateBracket();
  };

  const handleGroupParticipantDrop = async (
    source: { participantId: string; groupId: string },
    targetGroupId: string,
    targetParticipantId?: string,
  ): Promise<void> => {
    if (groupAssignmentLocked || source.groupId === targetGroupId) return;

    const currentGroupStage = bracket?.stages?.find((stage) => stage.type === 'ROUND_ROBIN');
    const currentGroups = currentGroupStage?.groups ?? [];
    const sourceGroup = currentGroups.find((group) => group.id === source.groupId);
    const targetGroup = currentGroups.find((group) => group.id === targetGroupId);
    if (!sourceGroup || !targetGroup) return;

    const sourceParticipantIds = getGroupParticipantIds(sourceGroup);
    const targetParticipantIds = getGroupParticipantIds(targetGroup);
    const sourceIndex = sourceParticipantIds.indexOf(source.participantId);
    if (sourceIndex < 0) return;

    const nextSourceParticipantIds = [...sourceParticipantIds];
    const nextTargetParticipantIds = [...targetParticipantIds];

    if (targetParticipantId) {
      const targetIndex = nextTargetParticipantIds.indexOf(targetParticipantId);
      if (targetIndex < 0) return;
      nextSourceParticipantIds[sourceIndex] = targetParticipantId;
      nextTargetParticipantIds[targetIndex] = source.participantId;
    } else {
      const configuredTeamsPerGroup = Number(
        (isRecord(selectedDivision?.roundConfig?.groupsConfig)
          ? selectedDivision?.roundConfig?.groupsConfig.teamsPerGroup
          : undefined) ?? teamsPerGroup,
      );
      const capacity = Number.isFinite(configuredTeamsPerGroup)
        ? Math.max(2, Math.trunc(configuredTeamsPerGroup))
        : Math.max(2, teamsPerGroup);
      if (nextTargetParticipantIds.length >= capacity) {
        toast.error(translate('bracketGroupAssignmentCapacity'));
        return;
      }
      nextSourceParticipantIds.splice(sourceIndex, 1);
      nextTargetParticipantIds.push(source.participantId);
    }

    const nextGroups: GroupAssignment[] = currentGroups.map((group) => ({
      name: group.name,
      participantIds: group.id === sourceGroup.id
        ? nextSourceParticipantIds
        : group.id === targetGroup.id
          ? nextTargetParticipantIds
          : getGroupParticipantIds(group),
    }));

    setIsSavingGroupAssignments(true);
    try {
      await persistGroupAssignments(nextGroups);
      toast.success(translate('bracketGroupAssignmentsSaved'), { id: 'group-assignments-autosave' });
    } catch (error) {
      toast.error(getErrorMessage(error) || translate('bracketGroupAssignmentsSaveFailed'), { id: 'group-assignments-autosave' });
    } finally {
      setIsSavingGroupAssignments(false);
    }
  };

  const groupDragHandlers: RoundRobinGroupDragHandlers = {
    enabled: Boolean(bracket?.stages?.some((stage) => stage.type === 'ROUND_ROBIN')) && !groupAssignmentLocked,
    onParticipantDrop: handleGroupParticipantDrop,
  };

  const mapAssignmentsToGroups = (assignments: Record<number, { id: string }[]>): GroupAssignment[] => (
    Array.from({ length: Math.max(0, numGroups) }, (_, groupIndex) => ({
      name: String.fromCharCode(65 + groupIndex),
      participantIds: (assignments[groupIndex] ?? []).map((participant) => participant.id),
    }))
  );

  const handleSaveGroupAssignments = async (
    assignments: Record<number, { id: string }[]>,
    closeModal = false,
  ): Promise<void> => {
    if (groupAssignmentLocked) return;
    setIsSavingGroupAssignments(true);
    try {
      await persistGroupAssignments(mapAssignmentsToGroups(assignments));
      toast.success(translate('bracketGroupAssignmentsSaved'), { id: 'group-assignments-autosave' });
      if (closeModal) setIsPoolArrangementModalOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error) || translate('bracketGroupAssignmentsSaveFailed'), { id: 'group-assignments-autosave' });
    } finally {
      setIsSavingGroupAssignments(false);
    }
  };
  // Determine if group stage has overrides
  // We consider it has an override if its roundConfig has fields like max_sets or scoring_type
  // that means it's not just an empty object or null.
  // hasGroupStageOverride: real stage has explicit override OR draft stage has divisionRoundConfig override
  const hasGroupStageOverride = (
    groupStage.id !== '__draft_gsk_group__' &&
    groupStage.roundConfig != null &&
    groupStage.roundConfig.max_sets != null
  ) || (
    groupStage.id === '__draft_gsk_group__' &&
    divisionRoundConfig != null &&
    divisionRoundConfig.max_sets != null
  );

  const gskConfigurableGroupRounds = useMemo(() => {
    if (!gskRoundsToPlay || gskRoundsToPlay < 1) return [];
    // Show per-LEG config (Lượt 1, Lượt 2...), not per-round.
    // Use 'leg_N' keys to avoid colliding with knockout round keys '1','2'...
    return Array.from({ length: gskRoundsToPlay }, (_, idx) => {
      const legNumber = idx + 1;
      return {
        stage: groupStage,
        roundNumber: legNumber,
        name: translate('legLabel', { number: legNumber }),
        override: groupStage.roundConfig?.rounds?.[`leg_${legNumber}`],
      };
    });
  }, [gskRoundsToPlay, groupStage]);

  return (
    <div id="manage-bracket-workspace" className="space-y-6 animate-in fade-in duration-200 transition-all rounded-xl p-1">

      {/* Tóm tắt gọn, mở cấu hình bằng icon bút */}
      {selectedDivisionId && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-2xs sm:flex-row sm:items-center sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="max-w-full truncate text-sm font-bold text-slate-900">
                  {selectedDivision?.name ?? translate('divisionDefault')}
                </h3>
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                  {bracketFormatLabel}
                </span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {isLiteMode ? translate('liteModeLabel') : translate('strictModeLabel')}
                </span>
              </div>
              <p className="truncate text-xs font-medium text-slate-500">{bracketSummary}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              type="button"
              onClick={() => setIsPoolArrangementModalOpen(true)}
              disabled={participants.length < 2 || groupAssignmentLocked}
              title={participants.length < 2 ? translate('minimumParticipants', { count: 2 }) : groupAssignmentLocked ? translate('bracketGroupAssignmentsSaveFailed') : undefined}
              className="bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:cursor-not-allowed"
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              {hasBracket ? (translate('editBracketSetup') || 'Cài đặt sơ đồ') : translate('createBracketAction')}
            </Button>
          </div>
        </div>
      )}
      
      {/* Visual bracket tree */}
      {bracket && bracket.stages && bracket.stages.length > 0 && (
        <div id="manage-bracket-tree-section" className="space-y-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{translate('bracketTitle')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{translate('currentBracketDescription')}</p>
            </div>
          </div>

          {/* Group Stage Knockout: show tabs */}
          {isGroupStageKnockout && (
            <div className="mb-4">
              <div className="flex gap-1 border-b border-slate-200 pb-1">
                <button
                  onClick={() => setGsActiveTab('group')}
                  className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${
                    gsActiveTab === 'group'
                      ? 'bg-white text-blue-700 border border-b-white border-slate-200 -mb-px'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1.5" />{translate('groupStage')}
                </button>
                <button
                  onClick={() => setGsActiveTab('playoff')}
                  className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${
                    gsActiveTab === 'playoff'
                      ? 'bg-white text-blue-700 border border-b-white border-slate-200 -mb-px'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Trophy className="w-4 h-4 inline mr-1.5" />{translate('knockoutTab')}
                </button>
              </div>
            </div>
          )}

          {/* Round Robin: show RoundRobinView */}
          {(isRoundRobin && !isGroupStageKnockout) || (isGroupStageKnockout && gsActiveTab === 'group') ? (
            <div className="space-y-4">
              {bracket.stages
                .filter(s => s.type === 'ROUND_ROBIN')
                .map(stage => (
                  <div key={stage.id}>
                    <div className="space-y-6">
                      {(stage.groups ?? []).map((group, groupIndex) => {
                        const formattedGroupName = group.name || translate('groupName', { name: String.fromCharCode(65 + groupIndex) });
                        return (
                          <div key={group.id} className="space-y-3">
                            <PagedRoundRobinView
                              matches={group.matches ?? []}
                              groupName={formattedGroupName}
                              tiebreakerMode={tiebreakerMode}
                              onScheduleMatch={handleOpenScheduling}
                              selectedMatchId={selectedMatchId}
                              onSelectMatch={onSelectMatch}
                              onDoubleClickMatch={onDoubleClickMatch}
                              tournamentId={tournament.id}
                              stageId={stage.id}
                              roundConfig={stage.roundConfig}
                              groupId={group.id}
                              groupDragHandlers={groupDragHandlers}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {bracket.stages.filter(s => s.type === 'ROUND_ROBIN').length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                  {translate('noGroupStageData')}
                </div>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleBracketDragStart}
              onDragEnd={handleBracketDragEnd}
              onDragCancel={() => setActiveDragSource(null)}
            >
              <PublicBracketTab
                tournament={tournament}
                divisionId={selectedDivisionId || undefined}
                onScheduleMatch={handleOpenScheduling}
                tiebreakerMode={tiebreakerMode}
                selectedMatchId={selectedMatchId}
                onSelectMatch={onSelectMatch}
                onDoubleClickMatch={onDoubleClickMatch}
                knockoutOnly
                dragHandlers={bracketDragHandlers}
                bracketSnapshot={bracket}
                hideHonors
                viewModeOverride="full"
                hideViewModeToggle
                hideZoomControls
                showGroupRankPlaceholders
              />
              <DragOverlay dropAnimation={null}>
                {activeDragSource ? (
                  <div className="pointer-events-none w-[250px] max-w-[250px] overflow-hidden rounded-lg border border-blue-400 bg-white px-3 py-2 shadow-lg ring-2 ring-blue-200 opacity-90">
                    <span className="block truncate text-xs font-bold text-slate-800">
                      {activeDragSource.participant.teamName}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}

      {/* Popup Xếp bảng đấu phong cách VNTournament kéo thả */}
      {isPoolArrangementModalOpen && (
        <BracketSetupModal
          open={isPoolArrangementModalOpen}
          onOpenChange={setIsPoolArrangementModalOpen}
          selectedDivision={divisions?.find((d) => d.id === selectedDivisionId) ?? null}
          participants={participants}
          numGroups={numGroups}
          setNumGroups={setNumGroups}
          teamsPerGroup={teamsPerGroup}
          setTeamsPerGroup={setTeamsPerGroup}
          teamsAdvancing={teamsAdvancing}
          bracket={bracket}
          isSubmitting={isGeneratingBracket || isSavingGroupAssignments}
          onAssignmentsChange={(assignments) => handleSaveGroupAssignments(assignments)}
          onConfirm={(assignments) => handleSaveGroupAssignments(assignments, true)}
        />
      )}
    </div>
  );
}
