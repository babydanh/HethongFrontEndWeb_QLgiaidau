'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { extractMatchScores, resolveMatchSportRules } from '@/features/matches/score-display';
import { Tournament, BracketMatch } from '@/features/tournaments/api';
import { matchesApi } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import { useCursorPagination } from '@/hooks/useCursorPagination';

import { Calendar, Play, Trophy, MapPin, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { formatDateTime } from '@/utils/format';
import { buildRoundFilterOptions, getMatchRoundLabel, getRoundRobinRoundInfo, type RoundLabelTranslations } from '@/utils/match-round-label';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import { getErrorMessage, getRetryAfterSeconds, isHttpStatusError } from '@/utils/error';
import { getMatchCourtLabel } from '@/utils/tournament-location';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
}

type StatusFilter = 'ALL' | 'ONGOING' | 'SCHEDULED' | 'COMPLETED';

type MatchViewMetadata = {
  stageKey: string;
  groupKey: string | null;
  leg: number;
  roundNumber: number;
  roundLabel: string;
  searchText: string;
};

function getMatchGroupKey(match: BracketMatch): string | null {
  return match.groupId?.trim() || match.group?.id?.trim() || match.group?.name?.trim() || null;
}

function normalizeStageValue(value?: string | null): string {
  return (value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function getScheduleStageKey(match: BracketMatch, tournamentFormat?: Tournament['format']): string {
  const stage = match.stage ?? match.group?.stage;
  const type = normalizeStageValue(stage?.type);
  const name = normalizeStageValue(stage?.name);
  const format = normalizeStageValue(tournamentFormat);
  const hasPersistedGroup = Boolean(
    match.groupId?.trim() || match.group?.id?.trim() || match.group?.name?.trim(),
  );

  if (
    type === 'ROUND_ROBIN' ||
    type === 'GROUP' ||
    type === 'GROUP_STAGE' ||
    type === 'GROUP_STAGES' ||
    name.includes('GROUP') ||
    name.includes('ROUND_ROBIN') ||
    name.includes('VONG_BANG') ||
    (!stage && (format === 'ROUND_ROBIN' || format === 'GROUP_STAGE_KNOCKOUT') && hasPersistedGroup)
  ) {
    return 'GROUP_STAGE';
  }

  if (
    type === 'SINGLE_ELIMINATION' ||
    type === 'DOUBLE_ELIMINATION' ||
    type === 'KNOCKOUT' ||
    type === 'PLAYOFF' ||
    name.includes('ELIMINATION') ||
    name.includes('KNOCKOUT') ||
    name.includes('PLAYOFF') ||
    (!stage && (format === 'SINGLE_ELIMINATION' || format === 'DOUBLE_ELIMINATION'))
  ) {
    return 'KNOCKOUT';
  }

  return stage?.name?.trim() || 'MAIN_STAGE';
}

function getConfiguredStageKeys(format?: Tournament['format']): string[] {
  const normalizedFormat = normalizeStageValue(format);
  if (normalizedFormat === 'GROUP_STAGE_KNOCKOUT') return ['GROUP_STAGE', 'KNOCKOUT'];
  if (normalizedFormat === 'ROUND_ROBIN') return ['GROUP_STAGE'];
  if (normalizedFormat === 'SINGLE_ELIMINATION' || normalizedFormat === 'DOUBLE_ELIMINATION') return ['KNOCKOUT'];
  return [];
}

function getPersistedOrRoundRobinLeg(
  match: BracketMatch,
  matches: BracketMatch[],
  tournamentFormat?: Tournament['format'],
): number {
  if (typeof match.leg === 'number' && Number.isInteger(match.leg) && match.leg > 0) {
    return match.leg;
  }

  const stage = match.stage ?? match.group?.stage;
  const type = normalizeStageValue(stage?.type);
  const name = normalizeStageValue(stage?.name);
  const isRoundRobin =
    type === 'ROUND_ROBIN' ||
    type === 'GROUP' ||
    type === 'GROUP_STAGE' ||
    type === 'GROUP_STAGES' ||
    name.includes('GROUP') ||
    name.includes('ROUND_ROBIN') ||
    name.includes('VONG_BANG') ||
    (!stage && normalizeStageValue(tournamentFormat) === 'ROUND_ROBIN');

  if (!isRoundRobin) return 1;

  const configuredLegs = Number(
    stage?.roundConfig?.roundsToPlay ?? stage?.roundConfig?.rounds_to_play,
  );
  if (Number.isInteger(configuredLegs) && configuredLegs === 1) return 1;

  return getRoundRobinRoundInfo(match, matches).leg;
}

export default function MatchesTab({ tournament, tournamentId, divisionId }: Props) {
  const translate = useTranslations('TournamentDetail');
  const matchTranslate = useTranslations('Match');
  const { openUserProfile } = useUserProfileModalStore();
  const roundLabelTranslations = useMemo<RoundLabelTranslations>(() => ({
    roundGrandFinal: matchTranslate('roundGrandFinal'),
    roundFinal: matchTranslate('roundFinal'),
    roundSemifinal: matchTranslate('roundSemifinal'),
    roundQuarterfinal: matchTranslate('roundQuarterfinal'),
    roundGroupStage: matchTranslate('roundGroupStage'),
    winnersBracket: matchTranslate('winnersBracket'),
    losersBracket: matchTranslate('losersBracket'),
    playoff: matchTranslate('phasePlayoff'),
    roundOf: (round) => matchTranslate('roundOf', { round }),
    legSuffix: (leg) => `${matchTranslate('leg')} ${leg}`,
  }), [matchTranslate]);
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const requestControllerRef = useRef<AbortController | null>(null);

  // Cancel an in-flight page when the selected division changes or this tab unmounts.
  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [divisionId, effectiveTournamentId]);

  // Pagination Hook
  const {
    data: matches,
    setData: setMatches,
    fetchNextPage,
    fetchPreviousPage,
    canGoPrevious,
    page,
    hasMore,
    isLoading,
    error,
    resetAndFetch,
  } = useCursorPagination<BracketMatch>(
    async (cursor) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const matchParams: Record<string, string | number> = {
        tournament_id: effectiveTournamentId,
        status: '', // Overrides default status filter to get all matches
        // Backend caps cursor pages at 100; loading one full tournament page
        // keeps stage filters complete for normal brackets without fan-out requests.
        limit: 100,
      };
      if (divisionId) matchParams.division_id = divisionId;
      if (cursor) matchParams.cursor = cursor;
      
      try {
        const res = await matchesApi.getMatches(matchParams, controller.signal);
        return res as unknown as {
          data: BracketMatch[];
          meta: { nextCursor?: string | null; hasMore?: boolean };
        };
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
      }
    }
  );
  
  // States for filtering
  const [selectedStageKey, setSelectedStageKey] = useState<string | 'ALL'>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'ALL'>('ALL');
  const [selectedLeg, setSelectedLeg] = useState<number | 'ALL'>('ALL');
  const [selectedRoundKey, setSelectedRoundKey] = useState<string | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchPage, setMatchPage] = useState(1);
  const [hasDetectedRound, setHasDetectedRound] = useState(false);

  const MATCHES_PER_VIEW = 20;

  // Find bracket size for the current division or tournament
  const getBracketSize = () => {
    if (divisionId && tournament.divisions) {
      const division = tournament.divisions.find(d => d.id === divisionId);
      if (division && division.maxParticipants) {
        return division.maxParticipants;
      }
    }
    return tournament.maxParticipants ?? null;
  };
  const bracketSize = getBracketSize();

  // Initial load & reset filters on division change
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSelectedStageKey('ALL');
      setSelectedGroupId('ALL');
      setSelectedLeg('ALL');
      setSelectedRoundKey('ALL');
      setStatusFilter('ALL');
      setSearchQuery('');
      setMatchPage(1);
      setHasDetectedRound(false);
      void resetAndFetch();
    });
    return () => {
      cancelled = true;
    };
  }, [divisionId, effectiveTournamentId, resetAndFetch]);

  // Auto-detect best round to display on first load
  useEffect(() => {
    if (matches.length > 0 && !hasDetectedRound) {
      const ongoingMatch = matches.find(m => m.status === 'ONGOING');
      const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED');
      const activeRoundKey = ongoingMatch?.roundNumber
        ? buildRoundFilterOptions(matches, tournament.format, bracketSize, roundLabelTranslations)
            .find(option => option.roundNumber === ongoingMatch.roundNumber)?.key
        : scheduledMatches.length > 0
          ? buildRoundFilterOptions(matches, tournament.format, bracketSize, roundLabelTranslations)
              .find(option => option.roundNumber === Math.min(...scheduledMatches.map(m => m.roundNumber).filter(Boolean) as number[]))?.key
          : undefined;
      Promise.resolve().then(() => {
        setHasDetectedRound(true);
        setSelectedRoundKey(activeRoundKey ?? 'ALL');
      });
    }
  }, [matches, hasDetectedRound, tournament.format, bracketSize, roundLabelTranslations]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const joinTournament = () => socket.emit('joinTournament', effectiveTournamentId);
    const handleMatchUpdate = (rawMatch: BracketMatch | string) => {
      const updated = typeof rawMatch === 'string'
        ? JSON.parse(rawMatch) as BracketMatch
        : rawMatch;
      if (!updated?.id) return;

      setMatches((current) => {
        const index = current.findIndex((item) => item.id === updated.id);
        if (index === -1) return current;
        const next = [...current];
        next[index] = { ...next[index], ...updated };
        return next;
      });
    };

    socket.on('connect', joinTournament);
    socket.on('match:update', handleMatchUpdate);
    if (!socket.connected) socket.connect();
    else joinTournament();

    return () => {
      socket.off('connect', joinTournament);
      socket.off('match:update', handleMatchUpdate);
      socket.emit('leaveTournament', effectiveTournamentId);
    };
  }, [effectiveTournamentId, setMatches]);

  const getMatchStageKey = useCallback(
    (match: BracketMatch) => getScheduleStageKey(match, tournament.format),
    [tournament.format],
  );

  // Derive round/group/search metadata once per match snapshot. The previous
  // filter path recalculated round-robin inference for every option and every
  // filter pass, which became expensive as the list grew.
  const matchViewMetadata = useMemo(() => {
    const metadata = new Map<string, MatchViewMetadata>();
    matches.forEach((match) => {
      const participantNames = [
        match.participant1?.teamName ?? '',
        ...(match.participant1?.members?.map((member) => member.fullName ?? '') ?? []),
        match.participant2?.teamName ?? '',
        ...(match.participant2?.members?.map((member) => member.fullName ?? '') ?? []),
      ];
      metadata.set(match.id, {
        stageKey: getMatchStageKey(match),
        groupKey: getMatchGroupKey(match),
        leg: getPersistedOrRoundRobinLeg(match, matches, tournament.format),
        roundNumber: match.roundNumber,
        roundLabel: getMatchRoundLabel({
          match,
          matches,
          tournamentFormat: tournament.format,
          bracketSize,
          includePhasePrefix: false,
          translations: roundLabelTranslations,
        }),
        searchText: participantNames.join(' ').toLowerCase(),
      });
    });
    return metadata;
  }, [matches, tournament.format, bracketSize, roundLabelTranslations, getMatchStageKey]);

  const stageOptions = useMemo(() => {
    const byStage = new Map<string, number>(
      getConfiguredStageKeys(tournament.format).map((key) => [key, 0]),
    );
    matches.forEach((match) => {
      const key = getMatchStageKey(match);
      byStage.set(key, (byStage.get(key) ?? 0) + 1);
    });
    return Array.from(byStage.entries()).map(([key, count]) => ({ key, count }));
  }, [matches, tournament.format, getMatchStageKey]);

  const groupOptions = useMemo(() => {
    const byGroup = new Map<string, { name: string; count: number }>();
    matches.forEach((match) => {
      if (getMatchStageKey(match) !== 'GROUP_STAGE') return;
      const groupId = getMatchGroupKey(match);
      const groupName = match.group?.name?.trim();
      if (!groupId || !groupName) return;
      const current = byGroup.get(groupId);
      byGroup.set(groupId, { name: groupName, count: (current?.count ?? 0) + 1 });
    });
    return Array.from(byGroup.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, getMatchStageKey]);

  const legOptions = useMemo(
    () => Array.from(new Set(Array.from(matchViewMetadata.values()).map((metadata) => metadata.leg)))
      .filter((leg) => leg > 0)
      .sort((a, b) => a - b),
    [matchViewMetadata],
  );

  // Extract unique stage-aware rounds from current matches.
  const roundOptions = useMemo(() => buildRoundFilterOptions(matches, tournament.format, bracketSize, roundLabelTranslations), [matches, tournament.format, bracketSize, roundLabelTranslations]);
  const visibleRoundOptions = useMemo(
    () => roundOptions.filter((option) => Array.from(matchViewMetadata.values()).some((metadata) => {
      const sameStage = selectedStageKey === 'ALL' || metadata.stageKey === selectedStageKey;
      const sameLeg = selectedLeg === 'ALL' || metadata.leg === selectedLeg;
      const sameRound = metadata.roundNumber === option.roundNumber;
      const sameLabel = metadata.roundLabel === option.label;
      return sameStage && sameLeg && sameRound && sameLabel;
    })),
    [matchViewMetadata, roundOptions, selectedStageKey, selectedLeg],
  );

  // Translate Stage Name helper
  const getStageVietnameseName = (rawName?: string | null) => {
    if (!rawName) return translate('stageDefault');
    const normalizedName = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
    const map: Record<string, string> = {
      'elimination stage': translate('stageElimination'),
      'knockout stage': translate('stageElimination'),
      'loai truc tiep': translate('stageElimination'),
      'vong loai truc tiep': translate('stageElimination'),
      'vong bang': translate('stageGroup'),
      'group stage': translate('stageGroup'),
      'round robin': translate('stageRoundRobin'),
      'vong tron tinh diem': translate('stageRoundRobin'),
      'vong playoffs': translate('stagePlayoffs'),
      'playoffs': translate('stagePlayoffs'),
      'playoff': translate('stagePlayoffs'),
      'nhanh thang': translate('stageWinners'),
      'nhanh thua': translate('stageLosers'),
      'final stage': translate('stageFinal'),
      'qualification stage': translate('stageQualification'),
      'preliminary stage': translate('stagePreliminary'),
      'main stage': translate('stageMain'),
      'quarter finals': translate('stageQuarterfinal'),
      'quarterfinals': translate('stageQuarterfinal'),
      'semi finals': translate('stageSemifinal'),
      'semifinals': translate('stageSemifinal'),
      'final': translate('stageFinal'),
      'grand final': translate('stageGrandFinal'),
      'winners bracket': translate('stageWinners'),
      'losers bracket': translate('stageLosers'),
    };
    return map[normalizedName] || rawName;
  };

  const getStageFilterLabel = (stageKey: string) => {
    if (stageKey === 'GROUP_STAGE') return translate('stageGroup');
    if (stageKey === 'KNOCKOUT') return translate('stageElimination');
    return getStageVietnameseName(stageKey);
  };

  // Filter matches based on selected states
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const metadata = matchViewMetadata.get(m.id);
      if (!metadata) return false;

      // 1. Filter by stage
      if (selectedStageKey !== 'ALL' && metadata.stageKey !== selectedStageKey) return false;

      // 2. Filter by stable bảng đấu identity
      if (selectedGroupId !== 'ALL' && metadata.groupKey !== selectedGroupId) return false;

      // 3. Filter by configured leg
      if (selectedLeg !== 'ALL' && metadata.leg !== selectedLeg) return false;

      // 4. Filter by internal round within the selected leg/stage
      if (selectedRoundKey !== 'ALL') {
        const selectedOption = roundOptions.find(option => option.key === selectedRoundKey);
        if (!selectedOption) return false;

        if (
          metadata.roundNumber !== selectedOption.roundNumber ||
          metadata.roundLabel !== selectedOption.label ||
          (selectedOption.leg != null && metadata.leg !== selectedOption.leg)
        ) {
          return false;
        }
      }
      // 2. Filter by status
      if (statusFilter === 'ONGOING' && m.status !== 'ONGOING') return false;
      if (statusFilter === 'SCHEDULED' && m.status !== 'SCHEDULED') return false;
      if (statusFilter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
      
      // 3. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        
        if (!metadata.searchText.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort Nhánh thắng (MAIN/Winners) first, Nhánh thua (LOSERS) second
      const branchA = (a.bracketBranch || '').toUpperCase();
      const branchB = (b.bracketBranch || '').toUpperCase();
      
      if (branchA !== branchB) {
        if (branchA === 'LOSERS') return 1;
        if (branchB === 'LOSERS') return -1;
      }
      return a.matchOrder - b.matchOrder;
    });
  }, [matches, matchViewMetadata, roundOptions, selectedStageKey, selectedGroupId, selectedLeg, selectedRoundKey, statusFilter, searchQuery]);

  const matchPageCount = Math.max(1, Math.ceil(filteredMatches.length / MATCHES_PER_VIEW));
  const currentMatchPage = Math.min(matchPage, matchPageCount);
  const visibleMatches = useMemo(
    () => filteredMatches.slice((currentMatchPage - 1) * MATCHES_PER_VIEW, currentMatchPage * MATCHES_PER_VIEW),
    [filteredMatches, currentMatchPage],
  );

  const localizedLoadError = isHttpStatusError(error, 429)
    ? (() => {
        const retryAfterSeconds = getRetryAfterSeconds(error);
        return retryAfterSeconds
          ? matchTranslate('rateLimitRetryAfter', { seconds: retryAfterSeconds })
          : matchTranslate('rateLimitHint');
      })()
    : getErrorMessage(error, matchTranslate('loadingError'), matchTranslate('loadingError'));

  // Count items for badges
  const counts = useMemo(() => {
    const ongoing = matches.filter(m => m.status === 'ONGOING').length;
    const scheduled = matches.filter(m => m.status === 'SCHEDULED').length;
    const completed = matches.filter(m => m.status === 'COMPLETED').length;
    return { all: matches.length, ongoing, scheduled, completed };
  }, [matches]);

  if (isLoading && matches.length === 0) {
    return <div className="animate-pulse bg-slate-900/10 h-64 rounded-lg w-full"></div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
            {matchTranslate('statusFinished')}
          </span>
        );
      case 'ONGOING':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500 text-white animate-pulse">
            {matchTranslate('statusLive')}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200">
            {matchTranslate('statusScheduled')}
          </span>
        );
    }
  };

  const renderParticipantName = (
    participant: { id: string; teamName: string; members?: { userId: string; fullName: string | null }[] } | null,
    isWinner: boolean,
    isCompleted: boolean,
    isOpponentBye: boolean = false
  ) => {
    if (!participant) {
      return (
        <span className={isOpponentBye ? 'text-blue-600 font-bold text-sm' : 'text-slate-400 font-bold italic'}>
          {isOpponentBye ? matchTranslate('directAdvance') : matchTranslate('waitingForOpponent')}
        </span>
      );
    }
    if (participant.members && participant.members.length > 0) {
      return (
        <span className={`text-sm font-bold flex items-center gap-1.5 flex-wrap ${
          isCompleted ? (isWinner ? 'text-slate-900' : 'text-slate-400 font-medium') : 'text-slate-800'
        }`}>
          {participant.members.map((m, idx) => (
            <span key={m.userId} className="inline-flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  openUserProfile(
                    {
                      id: m.userId,
                      fullName: m.fullName || matchTranslate('memberFallback'),
                      avatarUrl: (m as { avatarUrl?: string | null }).avatarUrl || null,
                    },
                    rect,
                    tournament.communityId || undefined,
                  );
                }}
                className="hover:text-blue-600 hover:underline transition-colors cursor-pointer text-left font-bold"
              >
                {m.fullName || matchTranslate('memberFallback')}
              </button>
              {idx < participant.members!.length - 1 && <span className="text-slate-350 mx-1">/</span>}
            </span>
          ))}
        </span>
      );
    }
    return (
      <span className={`text-sm font-bold truncate ${
        isCompleted ? (isWinner ? 'text-slate-900' : 'text-slate-400 font-medium') : 'text-slate-800'
      }`}>
        {participant.teamName}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Filter Options Panel - Only show when there are matches available */}
      {matches.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-sm flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder={matchTranslate('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400 h-9"
            />
            <Search className="w-3.5 h-3.5 text-slate-450 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                {matchTranslate('clearSearch')}
              </button>
            )}
          </div>

          {/* Row 1: Status Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">{matchTranslate('status')}:</span>
            {(['ALL', 'ONGOING', 'SCHEDULED', 'COMPLETED'] as const).map((filter) => {
              const label = filter === 'ALL' ? matchTranslate('allStatuses') : filter === 'ONGOING' ? matchTranslate('ongoingStatus') : filter === 'SCHEDULED' ? matchTranslate('scheduledStatus') : matchTranslate('completedStatus');
              const count = filter === 'ALL' ? counts.all : filter === 'ONGOING' ? counts.ongoing : filter === 'SCHEDULED' ? counts.scheduled : counts.completed;
              const isActive = statusFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-transparent shadow-sm'
                      : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Stage Filter Selector (e.g. Vòng bảng vs Vòng loại trực tiếp / Playoff) */}
          {stageOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">{matchTranslate('stageFilterLabel')}:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedStageKey('ALL');
                  setSelectedGroupId('ALL');
                  setSelectedLeg('ALL');
                  setSelectedRoundKey('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${selectedStageKey === 'ALL' ? 'bg-slate-900 text-white border-transparent' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'}`}
              >
                {matchTranslate('allStages')}
              </button>
              {stageOptions.map((stage) => {
                const isActive = selectedStageKey === stage.key;
                return (
                  <button
                    type="button"
                    key={stage.key}
                    onClick={() => {
                      setSelectedStageKey(stage.key);
                      setSelectedGroupId('ALL');
                      setSelectedLeg('ALL');
                      setSelectedRoundKey('ALL');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${isActive ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'}`}
                  >
                    {getStageFilterLabel(stage.key)} <span className={isActive ? 'ml-1 text-blue-100' : 'ml-1 text-slate-400'}>({stage.count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {groupOptions.length > 0 && (selectedStageKey === 'GROUP_STAGE' || !stageOptions.some((stage) => stage.key === 'KNOCKOUT')) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">{matchTranslate('groupsLabel')}:</span>
              <button
                type="button"
                onClick={() => setSelectedGroupId('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${selectedGroupId === 'ALL' ? 'bg-slate-900 text-white border-transparent' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'}`}
              >
                {matchTranslate('allGroups')} ({groupOptions.reduce((total, group) => total + group.count, 0)})
              </button>
              {groupOptions.map((group) => {
                const isActive = selectedGroupId === group.id;
                return (
                  <button
                    type="button"
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${isActive ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'}`}
                  >
                    {group.name} ({group.count})
                  </button>
                );
              })}
            </div>
          )}

          {legOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">{matchTranslate('legsLabel')}:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedLeg('ALL');
                  setSelectedRoundKey('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${selectedLeg === 'ALL' ? 'bg-slate-900 text-white border-transparent' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'}`}
              >
                {matchTranslate('allLegs')}
              </button>
              {legOptions.map((leg) => {
                const isActive = selectedLeg === leg;
                return (
                  <button
                    type="button"
                    key={leg}
                    onClick={() => {
                      setSelectedLeg(leg);
                      setSelectedRoundKey('ALL');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${isActive ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'}`}
                  >
                    {matchTranslate('legNumber', { leg })}
                  </button>
                );
              })}
            </div>
          )}

          {/* Row 2: Internal round filter */}
          {visibleRoundOptions.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-105 pt-3">
              {tournament.format === 'DOUBLE_ELIMINATION' || visibleRoundOptions.some((ro) => ro.branch === 'LOSERS') ? (
                <>
                  {/* Winners Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">{matchTranslate('winnersLabel')}:</span>

                    <button
                      onClick={() => {
                      setSelectedStageKey('ALL');
                      setSelectedLeg('ALL');
                      setSelectedRoundKey('ALL');
                    }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                        selectedRoundKey === 'ALL'
                          ? 'bg-slate-900 text-white border-transparent'
                          : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                      }`}
                    >
                      {matchTranslate('allRounds')}
                    </button>
                    {visibleRoundOptions
                      .filter((ro) => ro.branch !== 'LOSERS')
                      .map((roundOption) => {
                        const isActive = selectedRoundKey === roundOption.key;
                        return (
                          <button
                            key={roundOption.key}
                            onClick={() => setSelectedRoundKey(roundOption.key)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white border-transparent shadow-sm'
                                : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                            }`}
                          >
                            {roundOption.label}
                            <span className={isActive ? 'ml-1 text-blue-100' : 'ml-1 text-slate-400'}>
                              ({roundOption.count})
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  {/* Losers Row */}
                  {visibleRoundOptions.some((ro) => ro.branch === 'LOSERS') && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">{matchTranslate('losersLabel')}:</span>

                      {visibleRoundOptions
                        .filter((ro) => ro.branch === 'LOSERS')
                        .map((roundOption) => {
                          const isActive = selectedRoundKey === roundOption.key;
                          return (
                            <button
                              key={roundOption.key}
                              onClick={() => setSelectedRoundKey(roundOption.key)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                                isActive
                                  ? 'bg-blue-600 text-white border-transparent shadow-sm'
                                  : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                              }`}
                            >
                              {roundOption.label}
                              <span className={isActive ? 'ml-1 text-blue-100' : 'ml-1 text-slate-400'}>
                                ({roundOption.count})
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedStageKey('ALL');
                      setSelectedLeg('ALL');
                      setSelectedRoundKey('ALL');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      selectedRoundKey === 'ALL'
                        ? 'bg-slate-900 text-white border-transparent'
                        : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                    }`}
                  >
                    {matchTranslate('allRounds')}
                  </button>
                  {visibleRoundOptions.map((roundOption) => {
                    const isActive = selectedRoundKey === roundOption.key;
                    return (
                      <button
                        key={roundOption.key}
                        onClick={() => setSelectedRoundKey(roundOption.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white border-transparent shadow-sm'
                            : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                        }`}
                      >
                        {roundOption.label}
                        <span className={isActive ? 'ml-1 text-blue-100' : 'ml-1 text-slate-400'}>
                          ({roundOption.count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <span>{localizedLoadError}</span>
          <button
            type="button"
            onClick={() => void resetAndFetch()}
            className="shrink-0 rounded-md border border-rose-200 bg-white px-2.5 py-1 font-bold text-rose-700 hover:bg-rose-100"
          >
            {matchTranslate('retry')}
          </button>
        </div>
      )}

      {/* Render Matches List */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleMatches.map((match) => {
            const sets = extractMatchScores(match.scoreDetails);
            const isCompleted = match.status === 'COMPLETED' || match.winnerId != null;
            const isLive = match.status === 'ONGOING' || match.status === 'IN_PROGRESS';
            const isP1Winner = isCompleted && match.winnerId === match.participant1?.id;
            const isP2Winner = isCompleted && match.winnerId === match.participant2?.id;
            const roundLabel = getMatchRoundLabel({ match, matches, tournamentFormat: tournament.format, bracketSize, translations: roundLabelTranslations });

            const resolvedRules = resolveMatchSportRules({
              matchConfig: match.matchConfig,
              tournament: { sportRules: tournament.sportRules ?? null },
            });

            const maxSets = Math.max(1, resolvedRules.bestOf);
            const visibleSets = isCompleted
              ? Math.max(1, Math.min(maxSets, sets.length || 1))
              : maxSets;

            return (
              <div
                key={match.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${
                  isLive 
                    ? 'border-slate-200 bg-rose-50/5' 
                    : 'border-slate-200/80'
                }`}
              >
                {/* Header info */}
                <div className={`px-4 py-2.5 border-b border-slate-100 flex justify-between items-center text-[10px] font-bold ${
                  isLive ? 'bg-rose-50/20' : 'bg-slate-50/60'
                }`}>
                  <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                    {isLive && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                    )}
                    <span className={isLive ? 'text-rose-600 font-bold animate-pulse' : 'text-slate-650'}>
                      {roundLabel}
                    </span>
                    {(() => {
                      const stageName = getStageVietnameseName(
                        match.stage?.name ?? match.group?.stage?.name,
                      );
                      const shouldShow =
                        stageName &&
                        getMatchStageKey(match) !== 'GROUP_STAGE' &&
                        !roundLabel.toLowerCase().includes(stageName.toLowerCase()) &&
                        stageName !== translate('stageDefault');
                      return shouldShow ? (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="uppercase text-slate-500">{stageName}</span>
                        </>
                      ) : null;
                    })()}
                  </div>
                  {getStatusBadge(match.status)}
                </div>

                {/* Score / Participants Panel */}
                <div className="p-4 flex flex-col gap-3.5">
                  <div className="flex justify-end gap-1 pr-0.5 font-mono text-[9px] font-bold text-slate-400">
                    {Array.from({ length: visibleSets }, (_, index) => (
                      <span key={index} className="w-7 text-center">S{index + 1}</span>
                    ))}
                  </div>
                  {/* Participant 1 */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
                      {isP1Winner ? (
                        <Trophy className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        isCompleted && <div className="w-4 h-4 shrink-0" />
                      )}
                      {renderParticipantName(
                        match.participant1,
                        isP1Winner,
                        isCompleted,
                        match.isBye || (match.participant2 == null && isCompleted)
                      )}
                      {match.participant1?.seed && (
                        <span className="text-[9px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.2 rounded font-bold shrink-0">
                          #{match.participant1.seed}
                        </span>
                      )}
                    </div>
 
                    {/* Scores set Display */}
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {Array.from({ length: visibleSets }, (_, idx) => (
                        <span
                          key={idx}
                          className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                            isCompleted 
                              ? (isP1Winner ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400')
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {sets[idx]?.team1Score ?? '-'}
                        </span>
                      ))}
                    </div>
                  </div>
 
                  {/* Participant 2 */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
                      {isP2Winner ? (
                        <Trophy className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        isCompleted && <div className="w-4 h-4 shrink-0" />
                      )}
                      {renderParticipantName(
                        match.participant2,
                        isP2Winner,
                        isCompleted,
                        match.isBye || (match.participant1 == null && isCompleted)
                      )}
                      {match.participant2?.seed && (
                        <span className="text-[9px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.2 rounded font-bold shrink-0">
                          #{match.participant2.seed}
                        </span>
                      )}
                    </div>

                    {/* Scores set Display */}
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {Array.from({ length: visibleSets }, (_, idx) => (
                        <span
                          key={idx}
                          className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                            isCompleted 
                              ? (isP2Winner ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400')
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {sets[idx]?.team2Score ?? '-'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center gap-4 text-xs">
                  <div className="flex flex-col gap-1 text-[11px] text-slate-400 font-bold">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>
                        {match.scheduledAt
                          ? formatDateTime(match.scheduledAt)
                          : translate('unscheduled')}
                      </span>
                    </div>
                    {(() => {
                      const courtLabel = getMatchCourtLabel(match);
                      const locationLabel = courtLabel || matchTranslate('venuePending');
                      return (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[260px]" title={locationLabel}>
                            {matchTranslate('courtPrefix', { court: locationLabel })}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <Link
                    href={`/live/${match.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Play className="w-3 h-3 text-blue-600 fill-blue-600/10" />
                    <span>{matchTranslate('detailsAction')}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl text-slate-450 bg-white">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-slate-500">{translate('matchesEmpty')}</p>
          <p className="text-xs text-slate-400 mt-1">{translate('matchesEmptyHint')}</p>
        </div>
      )}

      {filteredMatches.length > MATCHES_PER_VIEW && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setMatchPage((current) => Math.max(1, current - 1))}
            disabled={currentMatchPage <= 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {matchTranslate('previousPage')}
          </button>
          <span className="min-w-20 text-center text-xs font-bold text-slate-500">
            {matchTranslate('pageCount', { page: currentMatchPage, totalPages: matchPageCount })}
          </span>
          <button
            type="button"
            onClick={() => setMatchPage((current) => Math.min(matchPageCount, current + 1))}
            disabled={currentMatchPage >= matchPageCount}
            className="rounded-lg border border-blue-200 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {matchTranslate('nextPage')}
          </button>
        </div>
      )}

      {matches.length > 0 && (hasMore || canGoPrevious) && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => void fetchPreviousPage()}
            disabled={!canGoPrevious || isLoading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {matchTranslate('previousPage')}
          </button>
          <span className="min-w-20 text-center text-xs font-bold text-slate-500">
            {matchTranslate('reportPageCount', { page })}
          </span>
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={!hasMore || isLoading}
            className="rounded-lg border border-blue-200 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {matchTranslate('nextPage')}
          </button>
        </div>
      )}
    </div>

  );
}
