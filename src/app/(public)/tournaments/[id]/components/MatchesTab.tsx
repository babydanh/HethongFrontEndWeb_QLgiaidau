'use client';

import { useEffect, useState, useMemo } from 'react';
import { extractMatchScores, getMatchScorePresentation, resolveMatchSportRules } from '@/features/matches/score-display';
import { Tournament, BracketMatch } from '@/features/tournaments/api';
import { matchesApi } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import { useCursorPagination } from '@/hooks/useCursorPagination';
import { InfiniteScrollTrigger } from '@/components/ui/infinite-scroll-trigger';
import { Calendar, Play, Trophy, MapPin, Info, LayoutGrid, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { formatDateTime } from '@/utils/format';
import { buildRoundFilterOptions, getMatchRoundLabel } from '@/utils/match-round-label';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
}

type StatusFilter = 'ALL' | 'ONGOING' | 'SCHEDULED' | 'COMPLETED';

export default function MatchesTab({ tournament, tournamentId, divisionId }: Props) {
  const translate = useTranslations('TournamentDetail');
  const { openUserProfile } = useUserProfileModalStore();
  const effectiveTournamentId = tournamentId ?? tournament.id;
  
  // Pagination Hook
  const { data: matches, setData: setMatches, fetchNextPage, hasMore, isLoading, resetAndFetch } = useCursorPagination<BracketMatch>(
    async (cursor) => {
      const matchParams: Record<string, string | number> = {
        tournament_id: effectiveTournamentId,
        status: '', // Overrides default status filter to get all matches
        limit: 20,
      };
      if (divisionId) matchParams.division_id = divisionId;
      if (cursor) matchParams.cursor = cursor;
      
      const res = await matchesApi.getMatches(matchParams);
      return res as unknown as {
        data: BracketMatch[];
        meta: { nextCursor?: string | null; hasMore?: boolean };
      };
    }
  );
  
  // States for filtering
  const [selectedRoundKey, setSelectedRoundKey] = useState<string | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Initial load
  useEffect(() => {
    resetAndFetch();
  }, [divisionId, effectiveTournamentId, resetAndFetch]);

  // Auto-detect best round to display on first load
  const [hasDetectedRound, setHasDetectedRound] = useState(false);
  useEffect(() => {
    if (matches.length > 0 && !hasDetectedRound) {
      setHasDetectedRound(true);
      const ongoingMatch = matches.find(m => m.status === 'ONGOING');
      if (ongoingMatch && ongoingMatch.roundNumber) {
        const options = buildRoundFilterOptions(matches, tournament.format, bracketSize);
        const activeOption = options.find(option => option.roundNumber === ongoingMatch.roundNumber);
        setSelectedRoundKey(activeOption?.key ?? 'ALL');
        return;
      }
      const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED');
      if (scheduledMatches.length > 0) {
        const minRound = Math.min(...scheduledMatches.map(m => m.roundNumber).filter(Boolean) as number[]);
        const options = buildRoundFilterOptions(matches, tournament.format, bracketSize);
        const activeOption = options.find(option => option.roundNumber === minRound);
        setSelectedRoundKey(activeOption?.key ?? 'ALL');
        return;
      }
    }
  }, [matches, hasDetectedRound, tournament.format, bracketSize]);

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

  // Extract unique rounds from current matches
  const roundOptions = useMemo(() => buildRoundFilterOptions(matches, tournament.format, bracketSize), [matches, tournament.format, bracketSize]);

  // Translate Stage Name helper
  const getStageVietnameseName = (rawName?: string | null) => {
    if (!rawName) return 'Vòng đấu';
    const map: Record<string, string> = {
      'Elimination Stage': 'Vòng loại trực tiếp',
      'Knockout Stage': 'Vòng loại trực tiếp',
      'Group Stage': 'Vòng bảng',
      'Round Robin': 'Vòng tròn tính điểm',
      'Vong tron tinh diem': 'Vòng tròn tính điểm',
      'Vong loai truc tiep': 'Vòng loại trực tiếp',
      'Vong bang': 'Vòng bảng',
      'Vong Playoffs': 'Vòng Playoffs',
      'Nhanh thang': 'Nhánh thắng',
      'Nhanh thua': 'Nhánh thua',
      'Final Stage': 'Vòng chung kết',
      'Qualification Stage': 'Vòng loại',
      'Preliminary Stage': 'Vòng sơ loại',
      'Main Stage': 'Vòng chính',
      'Quarter Finals': 'Tứ kết',
      'Quarterfinals': 'Tứ kết',
      'Semi Finals': 'Bán kết',
      'Semifinals': 'Bán kết',
      'Final': 'Chung kết',
      'Grand Final': 'Chung kết tổng',
      'Winners Bracket': 'Nhánh thắng',
      'Losers Bracket': 'Nhánh thua',
    };
    return map[rawName] || rawName;
  };

  // Filter matches based on selected states
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // 1. Filter by round
      if (selectedRoundKey !== 'ALL') {
        const selectedOption = roundOptions.find(option => option.key === selectedRoundKey);
        if (!selectedOption) return false;

        const matchRoundLabelNoPrefix = getMatchRoundLabel({ match: m, matches, tournamentFormat: tournament.format, bracketSize, includePhasePrefix: false });
        if (m.roundNumber !== selectedOption.roundNumber || matchRoundLabelNoPrefix !== selectedOption.label) {
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
        
        const getNames = (p: BracketMatch['participant1']) => {
          if (!p) return [];
          const names = [p.teamName || ''];
          if (p.members && Array.isArray(p.members)) {
            p.members.forEach((mem) => {
              if (mem.fullName) names.push(mem.fullName);
            });
          }
          return names.map(n => n.toLowerCase());
        };

        const p1Names = getNames(m.participant1);
        const p2Names = getNames(m.participant2);

        const matchesP1 = p1Names.some(name => name.includes(query));
        const matchesP2 = p2Names.some(name => name.includes(query));

        if (!matchesP1 && !matchesP2) {
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
  }, [matches, roundOptions, selectedRoundKey, statusFilter, searchQuery, tournament.format, bracketSize]);

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
            Kết Thúc
          </span>
        );
      case 'ONGOING':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500 text-white animate-pulse">
            🔴 Trực Tiếp
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200">
            Chờ Đấu
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
          {isOpponentBye ? 'Vào thẳng / Đi tiếp' : 'Chờ đối thủ'}
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
                      fullName: m.fullName || 'Thành viên',
                      avatarUrl: (m as { avatarUrl?: string | null }).avatarUrl || null,
                    },
                    rect,
                    tournament.communityId || undefined,
                  );
                }}
                className="hover:text-blue-600 hover:underline transition-colors cursor-pointer text-left font-bold"
              >
                {m.fullName || 'Thành viên'}
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
      {/* Division Info Header */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold pb-3 border-b border-slate-200/60">
        <Info className="w-4 h-4 text-slate-400" />
        <span>Phân hạng: <strong className="text-slate-700">{tournament.name}</strong></span>
        {tournament.genderRestriction && (
          <span className="text-slate-400">• {tournament.genderRestriction}</span>
        )}
      </div>

      {/* Filter Options Panel */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-sm flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên người chơi hoặc tên đội..."
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
              XÓA
            </button>
          )}
        </div>

        {/* Row 1: Status Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Trạng thái:</span>
          {(['ALL', 'ONGOING', 'SCHEDULED', 'COMPLETED'] as const).map((filter) => {
            const label = filter === 'ALL' ? 'Tất cả' : filter === 'ONGOING' ? 'Trực tiếp' : filter === 'SCHEDULED' ? 'Chưa đấu' : 'Đã xong';
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

        {/* Row 2: Round Slider */}
        {roundOptions.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-105 pt-3">
            {tournament.format === 'DOUBLE_ELIMINATION' || roundOptions.some((ro) => ro.branch === 'LOSERS') ? (
              <>
                {/* Winners Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Nhánh thắng:</span>
                  <button
                    onClick={() => setSelectedRoundKey('ALL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      selectedRoundKey === 'ALL'
                        ? 'bg-slate-900 text-white border-transparent'
                        : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                    }`}
                  >
                    Tất cả
                  </button>
                  {roundOptions
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
                {roundOptions.some((ro) => ro.branch === 'LOSERS') && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Nhánh thua:</span>
                    {roundOptions
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
              /* Single Row for non Double Elimination */
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Vòng đấu:</span>
                <button
                  onClick={() => setSelectedRoundKey('ALL')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                    selectedRoundKey === 'ALL'
                      ? 'bg-slate-900 text-white border-transparent'
                      : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                  }`}
                >
                  Tất cả vòng
                </button>
                {roundOptions.map((roundOption) => {
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

      {/* Render Matches List */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((match) => {
            const sets = extractMatchScores(match.scoreDetails);
            const isCompleted = match.status === 'COMPLETED' || match.winnerId != null;
            const isLive = match.status === 'ONGOING' || match.status === 'IN_PROGRESS';
            const isP1Winner = isCompleted && match.winnerId === match.participant1?.id;
            const isP2Winner = isCompleted && match.winnerId === match.participant2?.id;
            const roundLabel = getMatchRoundLabel({ match, matches, tournamentFormat: tournament.format, bracketSize });
            
            const resolvedRules = resolveMatchSportRules({
              matchConfig: match.matchConfig,
              tournament: { sportRules: tournament.sportRules ?? null },
            });
            const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
            // Keep the score grid stable from the configured format, not from
            // the number of scores already submitted. A BO5 match must show
            // S1-S5 even before S4/S5 has been played.
            const maxSets = Math.max(1, resolvedRules.bestOf);
            // Once a match is complete, hide unused BO5 columns. A 3-0 result
            // therefore shows S1-S3; an unfinished match still shows the full
            // configured format so users know how many sets are possible.
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
                    <span className="text-slate-300">•</span>
                    <span className="uppercase text-slate-500">
                      {getStageVietnameseName(match.group?.stage?.name)}
                    </span>
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
                        isCompleted && <div className="w-4 h-4 shrink-0" /> // Giữ khoảng trống đều đặn
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
                    {(match.courtName || match.tournament?.venueName) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate max-w-[200px]" title={match.courtName || match.tournament?.venueName || ''}>
                          Sân: {match.courtName || match.tournament?.venueName}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/live/${match.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Play className="w-3 h-3 text-blue-600 fill-blue-600/10" />
                    <span>Chi tiết</span>
                  </Link>
                </div>
              </div>
            );
          })}
          <InfiniteScrollTrigger onLoadMore={fetchNextPage} hasMore={hasMore} isLoading={isLoading} />
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl text-slate-450 bg-white">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-slate-500">{translate('matchesEmpty')}</p>
          <p className="text-xs text-slate-400 mt-1">{translate('matchesEmptyHint')}</p>
        </div>
      )}
    </div>
  );
}
