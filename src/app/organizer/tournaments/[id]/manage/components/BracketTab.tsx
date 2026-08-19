'use client';

import { useTranslations } from 'next-intl';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings, ChevronDown, ChevronRight, Save, Trophy, LayoutGrid, Users, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getErrorMessage } from '@/utils/error';
import { tournamentsApi } from '@/features/tournaments/api';
import { RoundRobinView } from '@/app/(public)/tournaments/[id]/components/bracket/RoundRobinView';
import { Tournament, BracketStage, BracketMatch, type SportRuleKind, type StageRoundConfig } from '@/types/tournament';
import PublicBracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import { getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Category } from '@/features/categories/api';

interface BracketTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  selectedDivisionId: string;
  participants: unknown[];
  isGeneratingBracket: boolean;
  handleGenerateBracket: () => void;
  handleOpenScheduling: (match: BracketMatch) => void;
  handleOpenRoundModal?: (stage: BracketStage, roundNumber: number) => void;

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
  isSavingConfig: boolean;
  handleSaveMatchConfig: () => void;

  // Round Robin specific
  tiebreakerMode?: 'split' | 'playoff';
  setTiebreakerMode?: (val: 'split' | 'playoff') => void;
  roundsToPlay?: number;
  setRoundsToPlay?: (val: number) => void;
  selectedMatchId?: string | null;
  onSelectMatch?: (match: import('@/types/tournament').BracketMatch) => void;
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
  handleSaveRoundRobinConfig?: () => Promise<void>;
  isSavingRoundRobinConfig?: boolean;

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
  handleSaveGskConfig?: () => Promise<void>;
  isSavingGskConfig?: boolean;
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
  isSavingConfig,
  handleSaveMatchConfig,

  // Round Robin
  tiebreakerMode = 'split',
  setTiebreakerMode,
  roundsToPlay = 1,
  setRoundsToPlay,
  selectedMatchId,
  onSelectMatch,
  handleSaveRoundRobinConfig,
  isSavingRoundRobinConfig,
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
  handleSaveGskConfig,
  isSavingGskConfig = false,
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
  const hasBracket = Boolean(bracket?.stages && bracket.stages.length > 0);
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
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* 2 Cấp độ Cấu hình bên trong tab Bracket */}
      {selectedDivisionId && (
        <>
          {/* Banner ngang chọn chế độ ghi điểm Lite / Strict */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">{translate('rulesAndBracketTitle')}</h3>
                </div>
                <p className="text-xs text-slate-500 font-semibold">
                  {presentation.sportLabel}: {isLiteMode ? translate('liteModeLabel') : presentation.scoringLabel}. {isLiteMode ? translate('liteModeDescription') : presentation.presetSummary}
                </p>
              </div>

              {/* Segmented control Lite vs Strict */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsLiteMode(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isLiteMode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>⚡</span> {translate('liteModeLabel')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLiteMode(false)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isLiteMode
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🛡️</span> {translate('strictModeLabel')}
                </button>
              </div>
            </div>

            {isLiteMode && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-blue-50/70 p-3.5 border border-blue-100 text-xs text-blue-900 animate-in fade-in duration-200">
                <div className="flex items-start sm:items-center gap-2">
                  <span className="text-base leading-none">⚡</span>
                  <p className="font-medium">
                    {translate('liteModeNotice', { rule: sportRuleKind === 'TENNIS' ? translate('tennisRule') : translate('flexibleRule') })}
                  </p>
                </div>
                <Button
                  onClick={handleSaveMatchConfig}
                  disabled={isSavingConfig}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 h-8 rounded-lg shrink-0 cursor-pointer shadow-xs"
                >
                  {isSavingConfig ? translate('saving') : translate('saveLiteMode')}
                </Button>
              </div>
            )}
          </div>

          {/* Nội dung cấu hình: 1 cột (nếu Lite) hoặc 2 cột (nếu Strict) */}
          <div className={isLiteMode ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
            {/* Cột 1: Cấu hình luật tiêu chuẩn (Chỉ hiển thị khi !isLiteMode) */}
            {!isLiteMode && (
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    {translate('standardRulesTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                    {presentation.sportLabel}: {presentation.scoringLabel}. {presentation.presetSummary}
                  </p>
                </div>

                <div className="space-y-4">
                  {isPickleballVariant && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">{translate('pickleballMode')}</p>
                      <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {([
{ kind: 'PICKLEBALL_RALLY', title: translate('rallyScoring'), description: translate('rallyScoringDescription') },
                          { kind: 'PICKLEBALL_SIDE_OUT', title: translate('sideOutScoring'), description: translate('sideOutScoringDescription') },
                        ] as const).map((option) => {
                          const isActive = sportRuleKind === option.kind;
                          return (
                            <button
                              key={option.kind}
                              type="button"
                              onClick={() => handleSportRuleKindChange(option.kind)}
                              className={`rounded-lg border px-4 py-3 text-left transition-all cursor-pointer ${
                                isActive
                                  ? 'border-emerald-500 bg-white ring-2 ring-emerald-200 shadow-xs'
                                  : 'border-emerald-100 bg-white/80 hover:border-emerald-300'
                              }`}
                            >
                              <p className="text-sm font-bold text-slate-900">{option.title}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-600">{option.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{translate('sportPresets')}</p>
                    <div className="mt-3 grid gap-3">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{preset.description}</p>
                            </div>
                            <div className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 shrink-0">
                              {translate('firstToSets', { sets: preset.setsToWin })} • {preset.pointsPerSet}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('setsToWin')}</label>
                    <select
                      value={setsToWin}
                      onChange={(e) => setSetsToWin(Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold"
                    >
                      {presentation.setOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end pt-4 border-t border-slate-100">
                    <Input
                      label={setUnitLabel}
                      type="number"
                      value={pointsPerSet}
                      onChange={(e) => setPointsPerSet(Number(e.target.value))}
                      className="h-10 text-sm font-bold"
                    />
                    
                    <div className="flex items-center gap-2 h-10 pb-2">
                      <input
                        type="checkbox"
                        id="winByTwo_bracket"
                        checked={winByTwo}
                        onChange={(e) => setWinByTwo(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                      />
                      <label htmlFor="winByTwo_bracket" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                        {winByTwoLabel}
                      </label>
                    </div>
                  </div>

                  {winByTwo && (
                    <Input
                      label={maxScoreLabel}
                      type="number"
                      value={maxDeucePoints}
                      onChange={(e) => setMaxDeucePoints(Number(e.target.value))}
                      placeholder={presentation.maxScorePlaceholder}
                      className="h-10 text-sm font-bold"
                    />
                  )}

                  {supportsTiebreakInput && (
                    <Input
                      label={presentation.tiebreakLabel}
                      type="number"
                      value={superTiebreakPoints}
                      onChange={(e) => setSuperTiebreakPoints(Number(e.target.value))}
                      placeholder={translate('tiebreakPlaceholder', { points: sportRuleKind === 'TENNIS' ? 7 : 11 })}
                      className="h-10 text-sm font-bold"
                    />
                  )}
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">
                  {translate('currentSetup', {
                    setsToWin,
                    unit: sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set',
                    points: pointsPerSet,
                    target: presentation.setUnitLabel,
                    margin: winByTwo ? translate('winByTwoShort') : translate('targetClosesSet'),
                  })}
                  {supportsTiebreakInput ? ` • ${presentation.tiebreakLabel.toLowerCase()}: ${superTiebreakPoints}` : ''}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveMatchConfig}
                    disabled={isSavingConfig}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 h-9 rounded-lg shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    {isSavingConfig ? translate('saving') : translate('saveDefaultConfiguration')}
                  </Button>
                </div>
              </div>
            )}

            {/* Cột 2 (hoặc Full Width ở Lite): Cấu hình thể thức vòng đấu */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
              {isRoundRobin && setTiebreakerMode && !isGroupStageKnockout ? (
                <div className="space-y-4">
                  {renderSuggestionBox(getRRSuggestion(participantCount))}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-600" />
                      {translate('roundRobinConfigTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                      {translate('roundRobinConfigDescription')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('roundsToPlay')}</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={roundsToPlay}
                        onChange={(e) => setRoundsToPlay?.(Math.max(1, Number(e.target.value)))}
                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full"
                      />
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{translate('roundsToPlayHint')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('winPoints')}</label>
                        <input
                          type="number"
                          min={0}
                          value={rrWinPoints}
                          onChange={(e) => setRrWinPoints?.(Math.max(0, Number(e.target.value)))}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('lossPoints')}</label>
                        <input
                          type="number"
                          min={0}
                          value={rrLossPoints}
                          onChange={(e) => setRrLossPoints?.(Math.max(0, Number(e.target.value)))}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('tiebreaker')}</label>
                      <select
                        value={rrTiebreaker}
                        onChange={(e) => setRrTiebreaker?.(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold"
                      >
                        <option value="H2H_POINTS">{translate('headToHead')}</option>
                        <option value="SET_DIFF">{translate('setDifference')}</option>
                        <option value="POINT_DIFF">{translate('pointDifference')}</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('tieHandling')}</label>
                      <select value={tiebreakerMode} onChange={(e) => setTiebreakerMode?.(e.target.value as 'split' | 'playoff')} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold">
                        <option value="split">{translate('splitTie')}</option>
                        <option value="playoff">{translate('playoffTie')}</option>
                      </select>
                    </div>
                    {handleSaveRoundRobinConfig && (
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={handleSaveRoundRobinConfig}
                          disabled={isSavingRoundRobinConfig}
                          className="font-bold text-xs px-5 h-9 rounded-lg shadow-sm"
                        >
                          {isSavingRoundRobinConfig ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                          {translate('saveConfiguration')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : isGroupStageKnockout ? (
                <div className="space-y-4">
                  {renderSuggestionBox(getGSKSuggestion(participantCount))}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-blue-600" />
                      {translate('groupStageKnockoutConfigTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                      {gsStages.length > 0
                        ? translate('groupStageKnockoutSummary', { groups: numGroups, teams: teamsPerGroup, advancing: teamsAdvancing })
                        : translate('groupStageKnockoutConfigDescription')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{translate('groupStage')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('numberOfGroups')}</label>
                        <input
                          type="number"
                          min={2}
                          max={32}
                          value={numGroups}
                          onChange={(e) => {
                            const nextGroups = Math.min(32, Math.max(2, Number(e.target.value) || 2));
                            setNumGroups?.(nextGroups);
                            const targetCount = participantCount > 0
                              ? participantCount
                              : (isLimitEnabled ? maxParticipants : 0);
                            if (targetCount > 0) {
                              setTeamsPerGroup?.(Math.min(128, Math.max(2, Math.ceil(targetCount / nextGroups))));
                            }
                          }}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full"
                        />
                        <p className="text-[9px] text-slate-400 font-semibold">{translate('teamsPerGroupHint')}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('teamsPerGroup')}</label>
                        <input type="number" min={2} max={128} value={teamsPerGroup} onChange={(e) => setTeamsPerGroup?.(Math.min(128, Math.max(2, Number(e.target.value))))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('teamsAdvancing')}</label>
                        <input type="number" min={1} max={16} value={teamsAdvancing} onChange={(e) => setTeamsAdvancing?.(Math.max(1, Number(e.target.value)))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('groupStageRounds')}</label>
                        <input type="number" min={1} max={20} value={gskRoundsToPlay} onChange={(e) => setGskRoundsToPlay?.(Math.max(1, Number(e.target.value)))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full" />
                      </div>
                    </div>
                  </div>

                  {participantCount > numGroups * teamsPerGroup && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      {translate('groupCapacityWarning', { configured: numGroups * teamsPerGroup, eligible: participantCount })}
                    </div>
                  )}

                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">{translate('knockout')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('playoffFormat')}</label>
                        <select value={gskPlayoffType ?? 'SINGLE_ELIMINATION'} onChange={(e) => setGskPlayoffType?.(e.target.value as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION')} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full">
                          <option value="SINGLE_ELIMINATION">{translate('singleElimination')}</option>
                          <option value="DOUBLE_ELIMINATION">{translate('doubleElimination')}</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{translate('seedingType')}</label>
                        <select value={gskSeedingType ?? 'SEEDED'} onChange={(e) => setGskSeedingType?.(e.target.value as 'SEEDED' | 'RANDOM')} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold w-full">
                          <option value="SEEDED">{translate('seededByElo')}</option>
                          <option value="RANDOM">{translate('randomSeeding')}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                      <div className="rounded-lg bg-white px-3 py-2 border border-blue-100">
                        <p className="text-[10px] uppercase text-slate-400">{translate('advancingTeams')}</p>
                        <p>{translate('teamsCount', { count: gskAdvancingTotal })}</p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 border border-blue-100">
                        <p className="text-[10px] uppercase text-slate-400">{translate('knockoutStarts')}</p>
                        <p>{gskDisplayStartRoundLabel}</p>
                      </div>
                    </div>
                  </div>

                  {handleSaveGskConfig && (
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveGskConfig} disabled={isSavingGskConfig} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 h-9 rounded-lg shadow-sm">
                        {isSavingGskConfig ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                        {translate('saveFormatConfiguration')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-600" />
                      {translate('roundConfigurationTitle')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">{presentation.roundConfigHint}</p>
                  </div>

                  {rounds.length > 0 ? (
                    <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto space-y-2.5">
                      {rounds.map(({ stage, roundNumber, name, override }) => {
                        return (
                          <div key={`${stage.id}-${roundNumber}`} className="pt-2.5 flex items-center justify-between gap-4 first:pt-0">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-slate-800">{name}</p>
                              <p className="text-[11px] text-slate-500 font-semibold">
                                {override ? (
                                  `${translate('firstToSets', { sets: override.sets_to_win ?? 1 })}, ${override.points_per_set || 21} ${translate('points')}, ${override.deuce_enabled ? translate('deuceEnabled') : translate('deuceDisabled')}`
                                ) : (
                                  translate('inheritsFormatRules')
                                )}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRoundModal?.(stage, roundNumber)}
                              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold h-8"
                            >
                              {translate('configureRound')}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-lg border border-dashed text-center">
                      <p className="text-xs font-semibold text-slate-455">{translate('bracketNotInitialized')}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{translate('initializeBracketForRounds')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cấp độ 2 (Dành cho GSK): Khối cấu hình chi tiết từng vòng đấu toàn diện */}
      {selectedDivisionId && isGroupStageKnockout && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              {translate('detailedRoundRulesTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {translate('detailedRoundRulesDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Vòng bảng */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{translate('groupStage')}</p>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-sky-50/30 to-indigo-50/20 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-slate-900">{translate('sharedGroupStage')}</p>
                  <span className="inline-flex items-center rounded-full bg-blue-600/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                    {translate('allGroupRounds')}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {translate('appliesToAllGroups')}
                </p>

                <div className="pt-2 border-t border-blue-100/50 flex items-center justify-between gap-4">
                  <p className="text-[11px] text-slate-600 font-semibold">
                    {hasGroupStageOverride
                      ? (() => {
                          const rc = groupStage.id === '__draft_gsk_group__'
                            ? divisionRoundConfig
                            : groupStage.roundConfig;
                          const setsLabel = rc?.max_sets === 1 ? 1 : rc?.max_sets === 3 ? 2 : 3;
                          return `${translate('firstToSets', { sets: setsLabel })}, ${rc?.points_per_set || pointsPerSet} ${translate('points')}`;
                        })()
                      : translate('inheritsFormatRules')}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleOpenRoundModal?.(groupStage, 0)} className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold h-8">
                    {translate('configureRound')}
                  </Button>
                </div>
              </div>

              {gskConfigurableGroupRounds.length > 0 && (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 px-3">
                  {gskConfigurableGroupRounds.map(({ stage, roundNumber, name, override }) => (
                    <div key={`${stage.id}-${roundNumber}`} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          {override ? `${translate('firstToSets', { sets: override.sets_to_win ?? 1 })}, ${override.points_per_set || pointsPerSet} ${translate('points')}` : translate('inheritsDefaultRules')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleOpenRoundModal?.(stage, roundNumber)} className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold h-8">
                        {translate('configureRound')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vòng Knockout */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{translate('eachKnockoutRound')}</p>
              </div>

              {gskConfigurableRounds.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 px-3">
                  {gskConfigurableRounds.map(({ stage, roundNumber, name, override }) => (
                    <div key={`${stage.id}-${roundNumber}`} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          {override ? `${translate('firstToSets', { sets: override.sets_to_win ?? 1 })}, ${override.points_per_set || pointsPerSet} ${translate('points')}` : translate('inheritsDefaultRules')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleOpenRoundModal?.(stage, roundNumber)} className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold h-8">
                        {translate('configureRound')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-500">{translate('initializeBracketForKnockoutRules')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Nút khởi tạo bracket nếu chưa có */}
      {(!bracket || !bracket.stages || bracket.stages.length === 0) && (
        <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{translate('bracketTitle')}</h2>
            <p className="text-sm text-slate-500">{translate('bracketNotCreatedDescription')}</p>
          </div>
          <Button
            onClick={handleGenerateBracket}
            disabled={isGeneratingBracket || !selectedDivisionId || participants.length < 2}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-lg shadow-lg shadow-blue-500/20"
          >
            {isGeneratingBracket
                            ? translate('initializing')
              : isGroupStageKnockout
                ? translate('createSchedule')
                : isRoundRobin
                  ? translate('createGroupStageSchedule')
                  : translate('initializeBracket')}
          </Button>
          {!selectedDivisionId && (
            <p className="text-xs text-blue-600 font-semibold">⚠ {translate('selectDivisionFirst')}</p>
          )}
          {participants.length < 2 && selectedDivisionId && (
            <p className="text-xs text-blue-600 font-semibold">⚠ {translate('minimumParticipants', { count: 2 })}</p>
          )}
        </div>
      )}
      
      {/* Visual bracket tree */}
      {bracket && bracket.stages && bracket.stages.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
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
                    {stage.name && (
                      <h4 className="text-sm font-bold text-slate-700 mb-2">{stage.name}</h4>
                    )}
                    <div className="space-y-4">
                      {(stage.groups ?? []).map((group, groupIndex) => (
                        <section key={group.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                          <div className="mb-3 flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                            <h5 className="text-sm font-bold text-slate-800">
                              {group.name || translate('groupName', { name: String.fromCharCode(65 + groupIndex) })}
                            </h5>
                            <span className="text-xs text-slate-400">
                              {translate('matchesCount', { count: (group.matches ?? []).length })}
                            </span>
                          </div>
                          <RoundRobinView
                            matches={group.matches ?? []}
                            tiebreakerMode={tiebreakerMode}
                            onScheduleMatch={handleOpenScheduling}
                            selectedMatchId={selectedMatchId}
                            onSelectMatch={onSelectMatch}
                            tournamentId={tournament.id}
                            stageId={stage.id}
                          />
                        </section>
                      ))}
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
            <PublicBracketTab
              tournament={tournament}
              divisionId={selectedDivisionId || undefined}
              onScheduleMatch={handleOpenScheduling}
              tiebreakerMode={tiebreakerMode}
              selectedMatchId={selectedMatchId}
              onSelectMatch={onSelectMatch}
              knockoutOnly
            />
          )}
        </div>
      )}
    </div>
  );
}
