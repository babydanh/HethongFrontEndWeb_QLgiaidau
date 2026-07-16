'use client';

import { useEffect, useState, useMemo } from 'react';
import { extractMatchScores, getMatchScorePresentation, resolveMatchSportRules } from '@/features/matches/score-display';
import { Tournament, BracketMatch } from '@/features/tournaments/api';
import { matchesApi } from '@/features/matches/api';
import { Calendar, Play, Trophy, MapPin, Info, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/format';
import { buildRoundFilterOptions, getMatchRoundLabel } from '@/utils/match-round-label';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
}

type StatusFilter = 'ALL' | 'ONGOING' | 'SCHEDULED' | 'COMPLETED';

export default function MatchesTab({ tournament, tournamentId, divisionId }: Props) {
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for filtering
  const [selectedRoundKey, setSelectedRoundKey] = useState<string | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

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

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const matchParams: Record<string, string | number> = {
          tournament_id: effectiveTournamentId,
          status: '', // Overrides default status filter to get all matches
          limit: 100,
        };
        if (divisionId) {
          matchParams.division_id = divisionId;
        }

        const res = await matchesApi.getMatches(matchParams);
        if (res && res.data) {
          const fetchedMatches = res.data as unknown as BracketMatch[];
          setMatches(fetchedMatches);

          // Auto-detect best round to display
          if (fetchedMatches.length > 0) {
            // Find rounds that contain ONGOING matches
            const ongoingMatch = fetchedMatches.find(m => m.status === 'ONGOING');
            if (ongoingMatch && ongoingMatch.roundNumber) {
              const options = buildRoundFilterOptions(fetchedMatches, tournament.format, bracketSize);
              const activeOption = options.find(option => option.roundNumber === ongoingMatch.roundNumber);
              setSelectedRoundKey(activeOption?.key ?? 'ALL');
              return;
            }

            // Otherwise, find the earliest round that has SCHEDULED matches
            const scheduledMatches = fetchedMatches.filter(m => m.status === 'SCHEDULED');
            if (scheduledMatches.length > 0) {
              const minRound = Math.min(...scheduledMatches.map(m => m.roundNumber).filter(Boolean) as number[]);
              const options = buildRoundFilterOptions(fetchedMatches, tournament.format, bracketSize);
              const activeOption = options.find(option => option.roundNumber === minRound);
              setSelectedRoundKey(activeOption?.key ?? 'ALL');
              return;
            }

            // Default to 'ALL' if no specific active round is detected
            setSelectedRoundKey('ALL');
          }
        }
      } catch (error) {
        console.error('Failed to fetch matches for division:', { tournamentId: effectiveTournamentId, divisionId }, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [divisionId, effectiveTournamentId, tournament.format, bracketSize]);

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
  }, [matches, roundOptions, selectedRoundKey, statusFilter, tournament.format, bracketSize]);

  // Count items for badges
  const counts = useMemo(() => {
    const ongoing = matches.filter(m => m.status === 'ONGOING').length;
    const scheduled = matches.filter(m => m.status === 'SCHEDULED').length;
    const completed = matches.filter(m => m.status === 'COMPLETED').length;
    return { all: matches.length, ongoing, scheduled, completed };
  }, [matches]);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-900/10 h-64 rounded-2xl w-full"></div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
            Kết Thúc
          </span>
        );
      case 'ONGOING':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
            🔴 Trực Tiếp
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-200">
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
        <span className={isOpponentBye ? 'text-blue-600 font-extrabold text-sm' : 'text-slate-400 font-bold italic'}>
          {isOpponentBye ? 'Vào thẳng / Đi tiếp' : 'Chờ đối thủ'}
        </span>
      );
    }
    if (participant.members && participant.members.length > 0) {
      return (
        <span className={`text-sm font-black flex items-center gap-1.5 flex-wrap ${
          isCompleted ? (isWinner ? 'text-slate-900' : 'text-slate-400 font-medium') : 'text-slate-800'
        }`}>
          {participant.members.map((m, idx) => (
            <span key={m.userId} className="inline-flex items-center">
              <Link href={`/users/${m.userId}`} className="hover:text-blue-600 hover:underline transition-colors">
                {m.fullName || 'Thành viên'}
              </Link>
              {idx < participant.members!.length - 1 && <span className="text-slate-350 mx-1">/</span>}
            </span>
          ))}
        </span>
      );
    }
    return (
      <span className={`text-sm font-black truncate ${
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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <span>Lọc lịch sử đấu</span>
          </div>
          <p className="text-xs font-semibold text-slate-450">
            Vòng bảng/round robin giữ số vòng; playoff và loại trực tiếp hiển thị theo mốc knockout.
          </p>
        </div>

        {/* Row 1: Status Filters */}
        <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2">Trạng thái:</span>
          {(['ALL', 'ONGOING', 'SCHEDULED', 'COMPLETED'] as const).map((filter) => {
            const label = filter === 'ALL' ? 'Tất cả' : filter === 'ONGOING' ? 'Trực tiếp' : filter === 'SCHEDULED' ? 'Chưa đấu' : 'Đã xong';
            const count = filter === 'ALL' ? counts.all : filter === 'ONGOING' ? counts.ongoing : filter === 'SCHEDULED' ? counts.scheduled : counts.completed;
            const isActive = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
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
            {tournament.format === 'DOUBLE_ELIMINATION' ? (
              <>
                {/* Winners Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 shrink-0">Nhánh thắng:</span>
                  <button
                    onClick={() => setSelectedRoundKey('ALL')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                      selectedRoundKey === 'ALL'
                        ? 'bg-slate-900 text-white border-transparent'
                        : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
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
                          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white border-transparent shadow-sm'
                              : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
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
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 shrink-0">Nhánh thua:</span>
                    {roundOptions
                      .filter((ro) => ro.branch === 'LOSERS')
                      .map((roundOption) => {
                        const isActive = selectedRoundKey === roundOption.key;
                        return (
                          <button
                            key={roundOption.key}
                            onClick={() => setSelectedRoundKey(roundOption.key)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white border-transparent shadow-sm'
                                : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
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
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 shrink-0">Vòng đấu:</span>
                <button
                  onClick={() => setSelectedRoundKey('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                    selectedRoundKey === 'ALL'
                      ? 'bg-slate-900 text-white border-transparent'
                      : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
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
                      className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white border-transparent shadow-sm'
                          : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
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

            return (
              <div
                key={match.id}
                className={`bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${
                  isLive 
                    ? 'border-rose-200 bg-rose-50/5' 
                    : 'border-slate-200/80'
                }`}
              >
                {/* Header info */}
                <div className={`px-4 py-2.5 border-b border-slate-100 flex justify-between items-center text-[10px] font-black ${
                  isLive ? 'bg-rose-50/20' : 'bg-slate-50/60'
                }`}>
                  <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                    {isLive && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                    )}
                    <span className={isLive ? 'text-rose-600 font-black animate-pulse' : 'text-slate-650'}>
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
                  {/* Participant 1 */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
                      {isP1Winner ? (
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
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
                        <span className="text-[9px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.2 rounded font-black shrink-0">
                          #{match.participant1.seed}
                        </span>
                      )}
                    </div>
 
                    {/* Scores set Display */}
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {sets.map((set, idx) => (
                        <span
                          key={idx}
                          className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded ${
                            isCompleted 
                              ? (isP1Winner ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400')
                              : 'bg-slate-50 text-slate-600 border border-slate-150'
                          }`}
                        >
                          {set.team1Score}
                        </span>
                      ))}
                      {sets.length === 0 && (
                        <span className="text-sm font-extrabold text-slate-700 px-2">
                          {match.p1SetsWon}
                        </span>
                      )}
                    </div>
                  </div>
 
                  {/* Participant 2 */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
                      {isP2Winner ? (
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
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
                        <span className="text-[9px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.2 rounded font-black shrink-0">
                          #{match.participant2.seed}
                        </span>
                      )}
                    </div>

                    {/* Scores set Display */}
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {sets.map((set, idx) => (
                        <span
                          key={idx}
                          className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded ${
                            isCompleted 
                              ? (isP2Winner ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400')
                              : 'bg-slate-50 text-slate-600 border border-slate-150'
                          }`}
                        >
                          {set.team2Score}
                        </span>
                      ))}
                      {sets.length === 0 && (
                        <span className="text-sm font-extrabold text-slate-700 px-2">
                          {match.p2SetsWon}
                        </span>
                      )}
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
                          : 'Chưa xếp lịch'}
                      </span>
                    </div>
                    {match.courtName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate max-w-[200px]" title={match.courtName}>
                          Sân: {match.courtName}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/live/${match.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Play className="w-3 h-3 text-blue-600 fill-blue-600/10" />
                    <span>Chi tiết</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-3xl text-slate-450 bg-white">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-extrabold text-sm text-slate-500">Không tìm thấy trận đấu nào.</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng chọn Vòng đấu hoặc Bộ lọc trạng thái khác.</p>
        </div>
      )}
    </div>
  );
}
