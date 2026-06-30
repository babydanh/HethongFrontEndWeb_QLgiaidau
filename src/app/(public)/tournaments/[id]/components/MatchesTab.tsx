'use client';

import { useEffect, useState } from 'react';
import { extractMatchScores, getMatchScorePresentation, resolveMatchSportRules } from '@/features/matches/score-display';
import { Tournament, BracketMatch } from '@/features/tournaments/api';
import { matchesApi } from '@/features/matches/api';
import { Calendar, Play, Trophy, MapPin, Info } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/format';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
}

export default function MatchesTab({ tournament, tournamentId, divisionId }: Props) {
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setMatches(res.data as unknown as BracketMatch[]);
        }
      } catch (error) {
        console.error('Failed to fetch matches for division:', { tournamentId: effectiveTournamentId, divisionId }, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [divisionId, effectiveTournamentId]);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-900/10 h-64 rounded-2xl w-full"></div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
            Kết Thúc
          </span>
        );
      case 'ONGOING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
            🔴 Trực Tiếp
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50/80 text-blue-600 border border-blue-200">
            Chờ Thi Đấu
          </span>
        );
    }
  };

  const renderParticipantName = (
    participant: { id: string; teamName: string; members?: { userId: string; fullName: string | null }[] } | null,
    isWinner: boolean,
    isCompleted: boolean
  ) => {
    if (!participant) return <span className="text-slate-400 font-medium">TBD</span>;
    if (participant.members && participant.members.length > 0) {
      return (
        <span className={`text-sm font-bold flex items-center gap-1.5 flex-wrap ${
          isCompleted ? (isWinner ? 'text-slate-900' : 'text-slate-400') : 'text-slate-800'
        }`}>
          {participant.members.map((m, idx) => (
            <span key={m.userId} className="inline-flex items-center">
              <Link href={`/users/${m.userId}`} className="hover:text-indigo-600 hover:underline transition-colors">
                {m.fullName || 'Thành viên'}
              </Link>
              {idx < participant.members!.length - 1 && <span className="text-slate-450 mx-1">/</span>}
            </span>
          ))}
        </span>
      );
    }
    return (
      <span className={`text-sm font-bold truncate ${
        isCompleted ? (isWinner ? 'text-slate-900' : 'text-slate-400') : 'text-slate-800'
      }`}>
        {participant.teamName}
      </span>
    );
  };

  const sortedMatches = [...matches].sort((a, b) => {
    if (a.roundNumber !== b.roundNumber) {
      return a.roundNumber - b.roundNumber;
    }
    return a.matchOrder - b.matchOrder;
  });

  // Group matches by Stage / Group name
  const groupedMatches: Record<string, BracketMatch[]> = {};
  for (const m of sortedMatches) {
    const stageName = m.group?.stage?.name || m.group?.name || 'Vòng Đấu';
    if (!groupedMatches[stageName]) {
      groupedMatches[stageName] = [];
    }
    groupedMatches[stageName].push(m);
  }

  const stages = Object.keys(groupedMatches);

  return (
    <div className="flex flex-col gap-6">
      {/* Division Info Header */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold pb-3 border-b border-slate-150">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Phân hạng: <strong className="text-slate-700">{tournament.name}</strong></span>
        {tournament.genderRestriction && (
          <span className="text-slate-400">• {tournament.genderRestriction}</span>
        )}
      </div>

      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900">Lịch Thi Đấu & Kết Quả</h3>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {matches.length} Trận Đấu
        </span>
      </div>

      {stages.length > 0 ? (
        <div className="flex flex-col gap-8">
          {stages.map((stageName) => (
            <div key={stageName} className="flex flex-col gap-4">
              {/* Stage Header */}
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 bg-indigo-600 rounded-full" />
                <h4 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">
                  {stageName}
                </h4>
              </div>

              {/* Matches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedMatches[stageName].map((match) => {
                  const sets = extractMatchScores(match.scoreDetails);
                  const isCompleted = match.status === 'COMPLETED';
                  const isP1Winner = isCompleted && match.winnerId === match.participant1?.id;
                  const isP2Winner = isCompleted && match.winnerId === match.participant2?.id;
                  const resolvedRules = resolveMatchSportRules({
                    matchConfig: match.matchConfig,
                    tournament: { sportRules: tournament.sportRules ?? null },
                  });
                  const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
                  const sequenceLabelTitle = scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1);

                  return (
                    <div
                      key={match.id}
                      className="bg-white hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4"
                    >
                      {/* Top section: Round, Court, status */}
                      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-indigo-600">{sequenceLabelTitle} {match.roundNumber}</span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold">
                            {scorePresentation.sportLabel}
                          </span>
                          {match.courtName && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3.5 h-3.5" /> {match.courtName}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(match.status)}
                      </div>

                      {/* Middle section: Teams & score */}
                      <div className="flex flex-col gap-3.5 border-y border-slate-100/60 py-3.5">
                        {/* Participant 1 */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 max-w-[70%]">
                            {isP1Winner && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                            {renderParticipantName(match.participant1, isP1Winner, isCompleted)}
                            {match.participant1?.seed && (
                              <span className="text-[10px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.2 rounded font-semibold shrink-0">
                                #{match.participant1.seed}
                              </span>
                            )}
                          </div>
                          {/* Sets won display */}
                          <div className="flex items-center gap-1">
                            {sets.map((set, idx) => (
                              <span
                                key={idx}
                                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                                  isP1Winner ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                                }`}
                              >
                                {set.team1Score}
                              </span>
                            ))}
                            {sets.length === 0 && (
                              <span className="text-sm font-extrabold text-slate-400 px-2">
                                {match.p1SetsWon}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Participant 2 */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 max-w-[70%]">
                            {isP2Winner && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                            {renderParticipantName(match.participant2, isP2Winner, isCompleted)}
                            {match.participant2?.seed && (
                              <span className="text-[10px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.2 rounded font-semibold shrink-0">
                                #{match.participant2.seed}
                              </span>
                            )}
                          </div>
                          {/* Sets won display */}
                          <div className="flex items-center gap-1">
                            {sets.map((set, idx) => (
                              <span
                                key={idx}
                                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                                  isP2Winner ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                                }`}
                              >
                                {set.team2Score}
                              </span>
                            ))}
                            {sets.length === 0 && (
                              <span className="text-sm font-extrabold text-slate-400 px-2">
                                {match.p2SetsWon}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom section: Details/Schedule info */}
                      <div className="flex justify-between items-center gap-4 text-xs">
                        <div className="flex flex-col gap-1 text-slate-400 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>
                              {match.scheduledAt
                                ? formatDateTime(match.scheduledAt)
                                : 'Chưa xếp lịch'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {scorePresentation.wonSummaryLabel}: {match.p1SetsWon} - {match.p2SetsWon}
                          </span>
                        </div>
                        <Link
                          href={`/live/${match.id}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5" /> Xem Chi Tiết
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl text-slate-450 bg-white">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-sm text-slate-500">Chưa có lịch thi đấu cho phân hạng này.</p>
          <p className="text-xs text-slate-400 mt-1">Lịch đấu sẽ được tạo sau khi ban tổ chức bốc thăm sơ đồ.</p>
        </div>
      )}
    </div>
  );
}
