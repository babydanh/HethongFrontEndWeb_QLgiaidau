'use client';

import React, { useEffect, useState } from 'react';
import { Tournament, tournamentsApi, TournamentParticipant } from '@/features/tournaments/api';
import { ChevronDown, ChevronUp, User, Award } from 'lucide-react';
import Link from 'next/link';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
}

export default function TeamsTab({ tournament, tournamentId, divisionId }: Props) {
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      setIsLoading(true);
      try {
        const res = await tournamentsApi.getTournamentParticipants(
          tournamentId ?? tournament.id,
          divisionId,
        );
        setParticipants(res.data);
      } catch (error) {
        console.warn('Could not fetch participants:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchParticipants();
  }, [divisionId, tournament.id, tournamentId]);

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="animate-pulse bg-slate-100 h-10 rounded-lg w-1/3"></div>
        <div className="animate-pulse bg-slate-100 h-48 rounded-xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Danh sách đội/cặp tham gia ({participants.length}/{tournament.maxParticipants || '∞'})
          </h3>
          <p className="text-xs font-medium text-slate-500">
            Chỉ hiển thị hồ sơ tham gia hợp lệ công khai.
          </p>
        </div>
      </div>
      
      {participants.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold w-16">#</th>
                <th className="px-6 py-4 font-bold">Tên đội / Tuyển thủ</th>
                <th className="px-6 py-4 font-bold w-48">Thanh toán</th>
                <th className="px-6 py-4 font-bold w-24 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((team, index) => {
                const isExpanded = expandedTeamId === team.id;
                return (
                  <React.Fragment key={team.id}>
                    <tr 
                      onClick={() => toggleExpand(team.id)}
                      className="bg-white border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-slate-950">{index + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-950 flex items-center gap-2">
                        {team.teamName}
                        {team.seed !== null && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                            Seed {team.seed}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {team.isPaid ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            Đã đóng phí
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            Chờ thanh toán
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-700 p-2 min-w-[44px] min-h-[44px]">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={4} className="px-8 py-5 border-b border-slate-150">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                              <User className="w-4 h-4 text-slate-400" /> Thành viên đăng ký ({team.members.length})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {team.members.map((member) => (
                                <div 
                                  key={member.userId} 
                                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                                >
                                  <Link href={`/users/${member.userId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm overflow-hidden">
                                      {member.avatarUrl ? (
                                        <img src={member.avatarUrl} alt={member.fullName || ''} className="w-full h-full object-cover" />
                                      ) : (
                                        (member.fullName || 'U').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 text-sm">{member.fullName || 'Thành viên'}</p>
                                      {member.isMock ? (
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                                          VĐV ảo
                                        </p>
                                      ) : member.elo ? (
                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                          <Award className="w-3.5 h-3.5 text-amber-500" />
                                          <span>
                                            {member.elo.tierName} • <strong>{member.elo.eloPoints}</strong> ELO
                                          </span>
                                        </p>
                                      ) : null}
                                    </div>
                                  </Link>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                    member.role === 'CAPTAIN' 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {member.role === 'CAPTAIN' ? 'Đội trưởng' : 'Thành viên'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500">
          Chưa có đội nào đăng ký tham gia.
        </div>
      )}
    </div>
  );
}
