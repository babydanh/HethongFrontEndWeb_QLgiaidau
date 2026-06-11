'use client';

import { useEffect, useState } from 'react';
import { Tournament, BracketMatch, tournamentsApi } from '@/features/tournaments/api';
import { Calendar, Play, Trophy, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Props {
  tournament: Tournament;
}

export default function MatchesTab({ tournament }: Props) {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        // Fetch all matches for this tournament by overriding the default status filter
        const res = await tournamentsApi.getOngoingMatches({
          tournament_id: tournament.id,
          status: '', // Overrides default status filter
          limit: 100,
        });
        if (res && res.data) {
          setMatches(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch matches', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [tournament.id]);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-900/10 h-64 rounded-2xl w-full"></div>;
  }

  // Helper to parse set scores
  const getSets = (scoreDetails?: Record<string, unknown>) => {
    if (!scoreDetails) return [];
    return Object.keys(scoreDetails)
      .sort()
      .map((key) => {
        const value = scoreDetails[key];
        if (typeof value === 'string' && value.includes('-')) {
          const [p1, p2] = value.split('-');
          return { p1, p2 };
        }
        return null;
      })
      .filter((set) => set !== null) as { p1: string; p2: string }[];
  };

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

  // Group matches by Stage / Group name
  const groupedMatches: Record<string, BracketMatch[]> = {};
  for (const m of matches) {
    const stageName = m.group?.stage?.name || m.group?.name || 'Vòng Đấu';
    if (!groupedMatches[stageName]) {
      groupedMatches[stageName] = [];
    }
    groupedMatches[stageName].push(m);
  }

  const stages = Object.keys(groupedMatches);

  return (
    <div className="flex flex-col gap-6">
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
                  const sets = getSets(match.scoreDetails);
                  const isCompleted = match.status === 'COMPLETED';
                  const isP1Winner = isCompleted && match.winnerId === match.participant1?.id;
                  const isP2Winner = isCompleted && match.winnerId === match.participant2?.id;

                  return (
                    <div
                      key={match.id}
                      className="bg-white hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4"
                    >
                      {/* Top section: Round, Court, status */}
                      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-600">Hiệp {match.roundNumber}</span>
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
                            <span className={`text-sm font-bold truncate ${isCompleted ? (isP1Winner ? 'text-slate-900' : 'text-slate-400') : 'text-slate-800'}`}>
                              {match.participant1?.teamName || 'TBD'}
                            </span>
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
                                {set.p1}
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
                            <span className={`text-sm font-bold truncate ${isCompleted ? (isP2Winner ? 'text-slate-900' : 'text-slate-400') : 'text-slate-800'}`}>
                              {match.participant2?.teamName || 'TBD'}
                            </span>
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
                                {set.p2}
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
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>
                            {match.scheduledAt
                              ? new Date(match.scheduledAt).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: 'numeric',
                                  month: 'numeric',
                                })
                              : 'Chưa xếp lịch'}
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
          <p className="font-semibold text-sm text-slate-500">Chưa có lịch thi đấu.</p>
          <p className="text-xs text-slate-400 mt-1">Lịch đấu sẽ được tạo sau khi ban tổ chức bốc thăm sơ đồ.</p>
        </div>
      )}
    </div>
  );
}
