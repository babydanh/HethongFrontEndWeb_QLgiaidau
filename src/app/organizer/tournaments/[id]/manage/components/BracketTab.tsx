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
import { Input } from '@/components/ui/Input';
import { Settings, Trophy, LayoutGrid, Users, RefreshCw, Calendar, GitBranch, Minus, Plus, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getErrorMessage } from '@/utils/error';
import { tournamentsApi, type BracketSlotMutation, type Division } from '@/features/tournaments/api';

import { ScheduleGridView } from './ScheduleGridView';
import type { CourtSetupItem } from './CourtSetup';
import { BracketSetupModal } from './BracketSetupModal';
import { RoundRobinView } from '@/app/(public)/tournaments/[id]/components/bracket/RoundRobinView';
import { PagedRoundRobinView } from '@/app/(public)/tournaments/[id]/components/bracket/PagedRoundRobinView';
import { Tournament, BracketStage, BracketMatch, type SportRuleKind, type StageRoundConfig } from '@/types/tournament';
import PublicBracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';

import { getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Category } from '@/features/categories/api';
import type {
  BracketDragHandlers,
  BracketDragSource,
  BracketParticipant,
  BracketSlot,
} from '@/app/(public)/tournaments/[id]/components/bracket/types';
import { isBracketMatchDragLocked } from '@/app/(public)/tournaments/[id]/components/bracket/match-status';

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
  handleGenerateBracket: () => void;
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
  setTeamsAdvancing?: React.Dispatch<React.SetStateAction<number>>;
  gskPlayoffType?: string;
  setGskPlayoffType?: React.Dispatch<React.SetStateAction<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>>;
  gskSeedingType?: string;
  setGskSeedingType?: React.Dispatch<React.SetStateAction<'SEEDED' | 'RANDOM'>>;
  gskRoundsToPlay?: number;
  setGskRoundsToPlay?: React.Dispatch<React.SetStateAction<number>>;
  divisionRoundConfig?: StageRoundConfig | null;
}

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
  selectedCategory = null,
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
  setTeamsAdvancing,
  gskPlayoffType,
  setGskPlayoffType,
  gskSeedingType,
  setGskSeedingType,
  gskRoundsToPlay = 1,
  setGskRoundsToPlay,
  divisionRoundConfig,
  isAdvancingStandings = false,
  bracketType,
}: BracketTabProps) {
  const translate = useTranslations('TournamentDetail');
  const presentation = getSportRulePresentation(sportRuleKind, translate);
  const setUnitLabel = presentation.setUnitLabel;
  const winByTwoLabel = presentation.winByTwoLabel;
  const maxScoreLabel = presentation.maxScoreLabel;
  const isPickleballVariant =
    sportRuleKind === 'PICKLEBALL_RALLY' ||
    sportRuleKind === 'PICKLEBALL_SIDE_OUT' ||
    selectedCategory?.name?.toLowerCase().includes('pickleball') ||
    selectedCategory?.categoryConfig?.ruleKind?.includes('PICKLEBALL');
  const supportsTiebreakInput = sportRuleKind === 'TENNIS' || sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const presets = getSportRulePresets(sportRuleKind, translate);

  const handleSportRuleKindChange = (nextKind: SportRuleKind) => {
    const nextRules = resolveSportRuleView(buildDefaultSportRules(nextKind), nextKind);
    setSportRuleKind(nextKind);
    setSetsToWin(nextRules.setsToWin);
    setPointsPerSet(nextRules.pointsPerSet);
    setWinByTwo(nextRules.winByTwo);
    setMaxDeucePoints(nextRules.maxPoints);
    setSuperTiebreakEnabled(nextRules.hasCustomTiebreakTarget);
    setSuperTiebreakSetIndex(nextRules.bestOf);
    setSuperTiebreakPoints(nextRules.tiebreakPoints);
  };

  const applyPreset = (preset: (typeof presets)[number]) => {
    setSetsToWin(preset.setsToWin);
    setPointsPerSet(preset.pointsPerSet);
    setWinByTwo(preset.winByTwo);
    setMaxDeucePoints(preset.maxPoints);
    setSuperTiebreakEnabled(preset.tiebreakPoints !== null);
    setSuperTiebreakSetIndex(preset.setsToWin * 2 - 1);
    setSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
  };

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

  const participantCount = useMemo(() => {
    return (participants as Array<Record<string, unknown>>).filter(
      (p) => p?.teamStatus === 'COMPLETE' && p?.isPaid === true,
    ).length;
  }, [participants]);

  interface SuggestionData {
    text: string;
    variant?: 'info' | 'warning';
    apply: () => void;
  }

  const getRRSuggestion = (count: number): SuggestionData | null => {
    if (count < 2) return null;
    if (count <= 8) return {
      text: translate('suggestionRoundRobinSmall'),
      apply: () => { setRoundsToPlay?.(1); setTiebreakerMode?.('split'); },
    };
    if (count <= 16) return {
      text: translate('suggestionRoundRobinMedium'),
      apply: () => { setRoundsToPlay?.(2); setTiebreakerMode?.('playoff'); },
    };
    if (count <= 32) return {
      text: translate('suggestionRoundRobinLarge'),
      apply: () => { setRoundsToPlay?.(2); setTiebreakerMode?.('playoff'); },
    };
    return {
      text: translate('suggestionRoundRobinWarning'),
      variant: 'warning',
      apply: () => { setRoundsToPlay?.(2); setTiebreakerMode?.('playoff'); },
    };
  };

  const getGSKSuggestion = (count: number): SuggestionData | null => {
    if (count < 4) return null;
    if (count <= 8) return {
      text: translate('suggestionGroupStageSmall'),
      apply: () => { setNumGroups?.(2); setTeamsPerGroup?.(Math.ceil(count / 2)); setTeamsAdvancing?.(1); },
    };
    if (count <= 16) return {
      text: translate('suggestionGroupStageMedium'),
      apply: () => { setNumGroups?.(2); setTeamsPerGroup?.(Math.ceil(count / 2)); setTeamsAdvancing?.(2); },
    };
    if (count <= 32) return {
      text: translate('suggestionGroupStageLarge'),
      apply: () => { setNumGroups?.(4); setTeamsPerGroup?.(Math.ceil(count / 4)); setTeamsAdvancing?.(2); },
    };
    return {
      text: translate('suggestionGroupStageMany'),
      apply: () => { setNumGroups?.(8); setTeamsPerGroup?.(Math.ceil(count / 8)); setTeamsAdvancing?.(1); },
    };
  };

  const renderSuggestionBox = (suggestion: SuggestionData | null) => {
    if (!suggestion) return null;
    const isWarning = suggestion.variant === 'warning';
    return (
      <div className={`rounded-lg border p-4 space-y-2 ${isWarning ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
        <p className={`text-xs font-bold flex items-center gap-1.5 ${isWarning ? 'text-amber-800' : 'text-blue-700'}`}>
          <span className="text-base">{isWarning ? '⚠️' : '💡'}</span>
          {isWarning
            ? translate('suggestionWarning', { count: participantCount })
            : translate('suggestionBasedOn', { count: participantCount })
          }
        </p>
        <p className={`text-sm font-semibold ${isWarning ? 'text-amber-900' : 'text-blue-800'}`}>{suggestion.text}</p>
        <button
          type="button"
          onClick={suggestion.apply}
          className={`text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-colors ${isWarning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isWarning ? translate('applySuggestedConfiguration') : translate('applySuggestion')}
        </button>
      </div>
    );
  };

  return (
    <div id="manage-bracket-workspace" className="space-y-6 animate-in fade-in duration-200 transition-all rounded-xl p-1">

      {/* Card tóm tắt thể thức & Nút mở Popup Cấu hình thể thức & Bốc thăm chia bảng */}
      {selectedDivisionId && (
        <div className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 rounded-2xl border border-blue-100 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  {translate('rulesAndBracketTitle')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white border border-blue-200 text-blue-700 shadow-2xs">
                  {isLiteMode ? translate('liteModeLabel') : translate('strictModeLabel')}
                </span>
                {isGroupStageKnockout ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {numGroups} bảng • {teamsAdvancing} đội đi tiếp
                  </span>
                ) : isRoundRobin ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Vòng tròn tính điểm
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Loại trực tiếp (Knockout)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {bracket && bracket.stages && bracket.stages.length > 0
                  ? 'Bấm nút bên dưới để điều chỉnh thể thức, luật thi đấu hoặc bốc thăm xếp lại hạt giống.'
                  : 'Thiết lập phong cách tính điểm, số lượng bảng đấu và bốc thăm kéo thả VĐV vào bảng.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setIsPoolArrangementModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Settings className="w-4 h-4" />
              <span>
                {bracket && bracket.stages && bracket.stages.length > 0
                  ? 'Thiết lập thể thức & Bốc thăm lại'
                  : 'Thiết lập thể thức & Bốc thăm chia bảng'}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Giao diện khi chưa có sơ đồ thi đấu */}
      {(!bracket || !bracket.stages || bracket.stages.length === 0) && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">Chưa khởi tạo sơ đồ thi đấu</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Vui lòng nhấn nút &quot;Thiết lập thể thức &amp; Bốc thăm chia bảng&quot; để mở popup cấu hình thể thức, luật thi đấu và bốc thăm chia bảng trực quan.
          </p>
          <Button
            type="button"
            onClick={() => setIsPoolArrangementModalOpen(true)}
            disabled={!selectedDivisionId || participants.length < 2}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Mở bảng bốc thăm chia bảng</span>
          </Button>
          {participants.length < 2 && selectedDivisionId && (
            <p className="text-[11px] text-amber-600 font-semibold mt-2">
              ⚠ Cần tối thiểu 2 đội/VĐV hợp lệ để có thể bốc thăm chia bảng.
            </p>
          )}
        </div>
      )}
      
      {/* Visual bracket tree */}
      {bracket && bracket.stages && bracket.stages.length > 0 && (
        <div id="manage-bracket-tree-section" className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{translate('bracketTitle')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{translate('currentBracketDescription')}</p>
            </div>
            {canResetBracket && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmResetOpen(true)}
                disabled={isGeneratingBracket}
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBracket ? 'animate-spin' : ''}`} />
                {isGeneratingBracket ? translate('regenerating') : translate('regenerateBracket')}
              </Button>
            )}
          </div>

          <ConfirmModal
            open={isConfirmResetOpen}
            onOpenChange={setIsConfirmResetOpen}
            title={translate('regenerateBracketConfirmTitle')}
            description={translate('regenerateBracketConfirmDescription')}
            confirmLabel={isGeneratingBracket ? translate('processing') : translate('confirmRegenerate')}
            cancelLabel={translate('keepCurrentBracket')}
            variant="danger"
            isLoading={isGeneratingBracket}
            onConfirm={() => {
              setIsConfirmResetOpen(false);
              handleGenerateBracket();
            }}
          />

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
          tournamentFormat={tournamentFormat}
          bracketType={bracketType}
          selectedDivision={divisions?.find((d) => d.id === selectedDivisionId) ?? null}
          participants={participants}
          sportRuleKind={sportRuleKind}
          setSportRuleKind={setSportRuleKind}
          isLiteMode={isLiteMode}
          setIsLiteMode={setIsLiteMode}
          setsToWin={setsToWin}
          setSetsToWin={setSetsToWin}
          pointsPerSet={pointsPerSet}
          setPointsPerSet={setPointsPerSet}
          winByTwo={winByTwo}
          setWinByTwo={setWinByTwo}
          maxDeucePoints={maxDeucePoints}
          setMaxDeucePoints={setMaxDeucePoints}
          superTiebreakEnabled={superTiebreakEnabled}
          setSuperTiebreakEnabled={setSuperTiebreakEnabled}
          superTiebreakSetIndex={superTiebreakSetIndex}
          setSuperTiebreakSetIndex={setSuperTiebreakSetIndex}
          superTiebreakPoints={superTiebreakPoints}
          setSuperTiebreakPoints={setSuperTiebreakPoints}
          numGroups={numGroups}
          setNumGroups={setNumGroups}
          teamsPerGroup={teamsPerGroup}
          setTeamsPerGroup={setTeamsPerGroup}
          teamsAdvancing={teamsAdvancing}
          setTeamsAdvancing={setTeamsAdvancing}
          gskPlayoffType={gskPlayoffType}
          setGskPlayoffType={setGskPlayoffType}
          gskSeedingType={gskSeedingType}
          setGskSeedingType={setGskSeedingType}
          handleOpenRoundModal={handleOpenRoundModal}
          divisionRoundConfig={divisionRoundConfig}
          gskConfigurableGroupRounds={gskConfigurableGroupRounds}
          gskConfigurableRounds={gskConfigurableRounds}
          groupStageOverrideSummary={
            hasGroupStageOverride
              ? (() => {
                  const rc = groupStage.id === '__draft_gsk_group__'
                    ? divisionRoundConfig
                    : groupStage.roundConfig;
                  const resolvedRc = rc ? resolveSportRuleView(rc, sportRuleKind) : null;
                  return resolvedRc
                    ? `${translate('firstToSets', { sets: resolvedRc.setsToWin })}, ${resolvedRc.pointsPerSet}p`
                    : translate('inheritsFormatRules');
                })()
              : translate('inheritsFormatRules')
          }
          onOpenGroupStageConfig={() => handleOpenRoundModal?.(groupStage, 0)}
          isSubmitting={isGeneratingBracket}
          onConfirm={async () => {
            setIsPoolArrangementModalOpen(false);
            handleGenerateBracket();
          }}
        />
      )}
    </div>
  );
}
