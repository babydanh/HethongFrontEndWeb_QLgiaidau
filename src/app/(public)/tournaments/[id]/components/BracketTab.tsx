'use client';

import { useEffect, useState } from 'react';
import { Tournament, tournamentsApi, BracketStage, BracketMatch } from '@/features/tournaments/api';
import { Trophy, Calendar, Users, Award, AlertCircle, Play, CheckCircle } from 'lucide-react';
import React from 'react';

interface Props {
  tournament: Tournament;
}

interface StandingRow {
  participantId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  points: number;
}

export default function BracketTab({ tournament }: Props) {
  const [stages, setStages] = useState<BracketStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBracket = async () => {
      setIsLoading(true);
      try {
        const res = await tournamentsApi.getTournamentBracket(tournament.id);
        const bracketData = res.data;
        if (bracketData && bracketData.stages) {
          setStages(bracketData.stages);
          if (bracketData.stages.length > 0) {
            setActiveStageId(bracketData.stages[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch bracket:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBracket();
  }, [tournament.id]);

  const activeStage = stages.find((s) => s.id === activeStageId);

  // Helper to calculate Round Robin standings from matches
  const calculateStandings = (matches: BracketMatch[]): StandingRow[] => {
    const standingsMap = new Map<string, StandingRow>();

    const getOrCreateRow = (id: string, name: string): StandingRow => {
      if (!standingsMap.has(id)) {
        standingsMap.set(id, {
          participantId: id,
          teamName: name,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          points: 0,
        });
      }
      return standingsMap.get(id)!;
    };

    // Initialize all participants from matches first
    matches.forEach((m) => {
      if (m.participant1) {
        getOrCreateRow(m.participant1.id, m.participant1.teamName);
      }
      if (m.participant2) {
        getOrCreateRow(m.participant2.id, m.participant2.teamName);
      }
    });

    // Compute stats from completed matches
    matches.forEach((m) => {
      if (m.isBye || m.status !== 'COMPLETED' || !m.participant1 || !m.participant2) return;

      const row1 = standingsMap.get(m.participant1.id)!;
      const row2 = standingsMap.get(m.participant2.id)!;

      row1.played += 1;
      row2.played += 1;

      row1.setsWon += m.p1SetsWon;
      row1.setsLost += m.p2SetsWon;

      row2.setsWon += m.p2SetsWon;
      row2.setsLost += m.p1SetsWon;

      if (m.winnerId === m.participant1.id) {
        row1.won += 1;
        row1.points += 3; // 3 points for win
        row2.lost += 1;
      } else if (m.winnerId === m.participant2.id) {
        row2.won += 1;
        row2.points += 3;
        row1.lost += 1;
      } else {
        row1.points += 1; // 1 point for draw
        row2.points += 1;
      }
    });

    return Array.from(standingsMap.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const diffA = a.setsWon - a.setsLost;
      const diffB = b.setsWon - b.setsLost;
      if (diffB !== diffA) {
        return diffB - diffA;
      }
      return b.setsWon - a.setsWon;
    });
  };

  const getRoundName = (roundNum: number, totalRounds: number) => {
    if (roundNum === totalRounds) return 'Chung kết';
    if (roundNum === totalRounds - 1) return 'Bán kết';
    if (roundNum === totalRounds - 2) return 'Tứ kết';
    if (roundNum === totalRounds - 3) return 'Vòng 16';
    return `Vòng ${roundNum}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="animate-pulse bg-slate-100 h-10 rounded-lg w-1/4"></div>
        <div className="animate-pulse bg-slate-100 h-64 rounded-xl w-full"></div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6">
        <Trophy className="w-12 h-12 text-slate-300 mb-3" />
        <h4 className="font-bold text-slate-700 mb-1">Chưa có nhánh đấu</h4>
        <p className="text-slate-400 text-sm max-w-sm">
          Nhánh đấu chưa được Ban tổ chức tạo lập. Nhánh đấu sẽ xuất hiện sau khi danh sách đăng ký hoàn tất.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stage Tabs Navigation */}
      {stages.length > 1 && (
        <div className="flex gap-2 border-b border-slate-200 pb-3 mb-2 overflow-x-auto no-scrollbar">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStageId(s.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                activeStageId === s.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {activeStage && (
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{activeStage.name}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Thể thức: {activeStage.type === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp' :
                            activeStage.type === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng/Nhánh thua' :
                            activeStage.type === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' : activeStage.type}
              </p>
            </div>
          </div>

          {activeStage.groups.map((group) => {
            const hasMatches = group.matches && group.matches.length > 0;

            if (!hasMatches) {
              return (
                <div key={group.id} className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                  Chưa có trận đấu nào được lập lịch cho bảng {group.name}.
                </div>
              );
            }

            // 1. ROUND ROBIN VIEW
            if (activeStage.type === 'ROUND_ROBIN') {
              const standings = calculateStandings(group.matches);
              return (
                <div key={group.id} className="flex flex-col gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-base border-l-4 border-blue-600 pl-3">
                    Bảng đấu: {group.name}
                  </h4>
                  
                  {/* Standings Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 font-bold w-12 text-center">#</th>
                          <th className="px-6 py-4 font-bold">Đội thi đấu</th>
                          <th className="px-6 py-4 font-bold text-center w-24">Trận đấu</th>
                          <th className="px-6 py-4 font-bold text-center w-24">Thắng</th>
                          <th className="px-6 py-4 font-bold text-center w-24">Thua</th>
                          <th className="px-6 py-4 font-bold text-center w-32">Set thắng/thua</th>
                          <th className="px-6 py-4 font-bold text-center w-24 bg-blue-50/50 text-blue-700">Điểm số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((row, idx) => (
                          <tr key={row.participantId} className="bg-white border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 text-center">{idx + 1}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{row.teamName}</td>
                            <td className="px-6 py-4 text-center font-medium text-slate-600">{row.played}</td>
                            <td className="px-6 py-4 text-center font-bold text-emerald-600">{row.won}</td>
                            <td className="px-6 py-4 text-center font-bold text-rose-500">{row.lost}</td>
                            <td className="px-6 py-4 text-center font-medium text-slate-500">
                              {row.setsWon} - {row.setsLost}
                            </td>
                            <td className="px-6 py-4 text-center font-black bg-blue-50/20 text-blue-700">
                              {row.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            // 2. ELIMINATION BRACKET VIEW (SINGLE / DOUBLE ELIMINATION)
            // Group matches by round number
            const matchesByRound: Record<number, BracketMatch[]> = {};
            group.matches.forEach((m) => {
              if (!matchesByRound[m.roundNumber]) {
                matchesByRound[m.roundNumber] = [];
              }
              matchesByRound[m.roundNumber].push(m);
            });

            // Sort matches in each round by matchOrder
            Object.keys(matchesByRound).forEach((r) => {
              const roundNum = Number(r);
              matchesByRound[roundNum].sort((a, b) => a.matchOrder - b.matchOrder);
            });

            const sortedRounds = Object.keys(matchesByRound)
              .map(Number)
              .sort((a, b) => a - b);
            
            const totalRounds = sortedRounds.length;

            return (
              <div key={group.id} className="flex flex-col gap-6">
                <h4 className="font-bold text-slate-800 text-base border-l-4 border-blue-600 pl-3">
                  Nhánh đấu: {group.name}
                </h4>
                
                <div className="overflow-x-auto pb-8 pt-4 min-h-[450px] bg-slate-50/30 rounded-2xl border border-slate-200 p-6">
                  <div className="flex gap-12 min-w-max h-full">
                    {sortedRounds.map((roundNum) => {
                      const roundMatches = matchesByRound[roundNum] || [];
                      return (
                        <div key={roundNum} className="flex flex-col justify-around px-2 min-w-[240px]">
                          <div className="text-center mb-6">
                            <span className="bg-slate-200/80 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-slate-300">
                              {getRoundName(roundNum, totalRounds)}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-bold mt-1.5">
                              {roundMatches.length} trận đấu
                            </span>
                          </div>

                          <div className="flex flex-col justify-around flex-grow gap-8">
                            {roundMatches.map((match) => {
                              const isP1Winner = match.winnerId === match.participant1?.id && match.status === 'COMPLETED';
                              const isP2Winner = match.winnerId === match.participant2?.id && match.status === 'COMPLETED';

                              return (
                                <div key={match.id} className="relative flex items-center">
                                  <div className={`w-56 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm transition-all hover:shadow-md ${
                                    match.status === 'ONGOING' 
                                      ? 'border-blue-500 ring-2 ring-blue-500/25' 
                                      : 'border-slate-200'
                                  }`}>
                                    {/* Match Header */}
                                    <div className="px-3 py-1.5 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-500">
                                      <span>Mã: #{match.matchOrder}</span>
                                      {match.status === 'ONGOING' ? (
                                        <span className="text-rose-600 flex items-center gap-1 font-extrabold animate-pulse">
                                          <Play className="w-2.5 h-2.5 fill-rose-600" /> LIVE
                                        </span>
                                      ) : match.status === 'COMPLETED' ? (
                                        <span className="text-slate-400 flex items-center gap-1">
                                          <CheckCircle className="w-2.5 h-2.5 text-slate-400" /> Hết giờ
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">Chờ thi đấu</span>
                                      )}
                                    </div>

                                    {/* Participant 1 */}
                                    <div className={`flex justify-between items-center p-3 border-b border-slate-100/50 ${
                                      isP1Winner ? 'bg-emerald-50/30 text-emerald-950 font-bold' : 'text-slate-700'
                                    }`}>
                                      <span className="text-xs truncate max-w-[130px] flex items-center gap-1.5">
                                        {match.participant1 ? (
                                          <>
                                            {match.participant1.seed && (
                                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold">
                                                {match.participant1.seed}
                                              </span>
                                            )}
                                            {match.participant1.teamName}
                                          </>
                                        ) : match.isBye ? (
                                          <span className="italic text-slate-400">BYE</span>
                                        ) : (
                                          <span className="text-slate-400 font-medium">TBD</span>
                                        )}
                                      </span>
                                      <span className="text-xs font-black text-slate-900">
                                        {match.status === 'COMPLETED' || match.status === 'ONGOING' ? match.p1SetsWon : '-'}
                                      </span>
                                    </div>

                                    {/* Participant 2 */}
                                    <div className={`flex justify-between items-center p-3 ${
                                      isP2Winner ? 'bg-emerald-50/30 text-emerald-950 font-bold' : 'text-slate-700'
                                    }`}>
                                      <span className="text-xs truncate max-w-[130px] flex items-center gap-1.5">
                                        {match.participant2 ? (
                                          <>
                                            {match.participant2.seed && (
                                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold">
                                                {match.participant2.seed}
                                              </span>
                                            )}
                                            {match.participant2.teamName}
                                          </>
                                        ) : match.isBye ? (
                                          <span className="italic text-slate-400">BYE</span>
                                        ) : (
                                          <span className="text-slate-400 font-medium">TBD</span>
                                        )}
                                      </span>
                                      <span className="text-xs font-black text-slate-900">
                                        {match.status === 'COMPLETED' || match.status === 'ONGOING' ? match.p2SetsWon : '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
