'use client';

import React, { useEffect, useState } from 'react';
import { Tournament, tournamentsApi, TournamentParticipant, FootballRosterStatus } from '@/features/tournaments/api';
import { ChevronDown, ChevronUp, User, Award, ShieldCheck, XCircle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
  participantId?: string;
}

export default function TeamsTab({ tournament, tournamentId, divisionId, participantId }: Props) {
  const translate = useTranslations('TournamentDetail');
  const { openUserProfile } = useUserProfileModalStore();
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [rosterStatus, setRosterStatus] = useState<FootballRosterStatus | null>(null);
  const [rosterAction, setRosterAction] = useState(false);

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

  useEffect(() => {
    if (!participantId) {
      setRosterStatus(null);
      return;
    }
    let active = true;
    tournamentsApi.getFootballRosterStatus(tournamentId ?? tournament.id, participantId)
      .then((res) => { if (active) setRosterStatus(res.data ?? null); })
      .catch(() => { if (active) setRosterStatus(null); });
    return () => { active = false; };
  }, [participantId, tournament.id, tournamentId]);

  const respondToRoster = async (action: 'CONFIRM' | 'DECLINE') => {
    if (!participantId || rosterAction) return;
    setRosterAction(true);
    try {
      await tournamentsApi.respondFootballRoster(tournamentId ?? tournament.id, participantId, action);
      const refreshed = await tournamentsApi.getFootballRosterStatus(tournamentId ?? tournament.id, participantId);
      setRosterStatus(refreshed.data ?? null);
      toast.success(action === 'CONFIRM' ? translate('rosterConfirmed') : translate('rosterDeclined'));
    } catch (error) {
      toast.error(getErrorMessage(error, translate('rosterUpdateFailed')));
    } finally {
      setRosterAction(false);
    }
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="animate-pulse bg-slate-100 h-10 rounded-lg w-1/3"></div>
        <div className="animate-pulse bg-slate-100 h-48 rounded-lg w-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {rosterStatus?.currentMember?.confirmationStatus === 'PENDING' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-amber-950">{translate("rosterSelected")}</p>
              <p className="mt-1 text-xs font-medium text-amber-800">{translate("rosterConfirmHint")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={rosterAction} onClick={() => respondToRoster('CONFIRM')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle className="h-4 w-4" /> {translate("rosterConfirm")}</button>
                <button type="button" disabled={rosterAction} onClick={() => respondToRoster('DECLINE')} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><XCircle className="h-4 w-4" /> {translate("rosterDecline")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {translate("teamsTitle")}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {translate("publicRosterNote")}
          </p>
        </div>
        
        {/* Standardized progress bar matching right card */}
        {tournament.maxParticipants && tournament.maxParticipants > 0 ? (
          <div className="w-full max-w-sm mt-1">
            <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
              <span className="text-slate-500 uppercase tracking-wider">Số lượng hồ sơ</span>
              <span className="text-slate-800">{participants.length} / {tournament.maxParticipants}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (participants.length / tournament.maxParticipants) * 100 >= 90 ? 'bg-rose-500' : (participants.length / tournament.maxParticipants) * 100 >= 70 ? 'bg-amber-500' : 'bg-blue-650'
                }`}
                style={{ width: `${Math.min(100, (participants.length / tournament.maxParticipants) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center text-xs mb-1.5 font-bold w-full max-w-sm mt-1">
            <span className="text-slate-500 uppercase tracking-wider">Số lượng hồ sơ</span>
            <span className="text-slate-800">{participants.length} / ∞</span>
          </div>
        )}
      </div>
      
      {participants.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-[11px] sm:text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold w-10 sm:w-16">#</th>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">{translate("teamNameHeader")}</th>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold w-32 sm:w-48">Thanh toán</th>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold w-16 sm:w-24 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((team, index) => {
                const isExpanded = expandedTeamId === team.id;
                
                const members = team.members && team.members.length > 0
                  ? team.members
                  : (team.teamName || '').split(/\s*[\/&]\s*/).filter(Boolean).map((name, i) => {
                      const trimmed = name.trim();
                      const isCaptain = i === 0;
                      const regUser = team.registeredBy;
                      const isRegMatch = regUser && regUser.fullName && regUser.fullName.trim().toLowerCase() === trimmed.toLowerCase();
                      return {
                        userId: isRegMatch ? regUser.id : '',
                        fullName: trimmed,
                        avatarUrl: isRegMatch ? regUser.avatarUrl : null,
                        role: isCaptain ? 'CAPTAIN' : 'MEMBER',
                        isMock: false,
                        elo: null as any,
                      };
                    });

                return (
                  <React.Fragment key={team.id}>
                    <tr 
                      onClick={() => toggleExpand(team.id)}
                      className="bg-white border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3.5 sm:px-6 sm:py-4 font-medium text-slate-950 align-middle">{index + 1}</td>
                      <td className="px-3 py-3.5 sm:px-6 sm:py-4 font-bold text-slate-950 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 leading-normal">
                          <span>{team.teamName}</span>
                          {team.seed !== null && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Seed {team.seed}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 sm:px-6 sm:py-4 align-middle">
                        {team.isPaid ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold inline-block whitespace-nowrap">
                            Đã đóng phí
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold inline-block whitespace-nowrap">
                            Chờ thanh toán
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 sm:px-6 sm:py-4 text-right align-middle">
                        <button className="text-slate-400 hover:text-slate-700 p-1 sm:p-2 min-w-[36px]">
                          {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={4} className="px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                              <User className="w-4 h-4 text-slate-400" /> Thành viên đăng ký ({members.length})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {members.map((member, mIdx) => {
                                const regUser = team.registeredBy;
                                const isNameMatch = regUser && regUser.fullName && member.fullName && regUser.fullName.trim().toLowerCase() === member.fullName.trim().toLowerCase();
                                const targetUserId = member.userId || (isNameMatch ? regUser.id : null);
                                const avatarSrc = member.avatarUrl || (isNameMatch ? regUser.avatarUrl : null);
                                const initial = (member.fullName || 'U').charAt(0).toUpperCase();

                                const CardContent = (
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center font-bold text-sm overflow-hidden shadow-sm shrink-0 ${
                                      avatarSrc 
                                        ? 'bg-slate-100' 
                                        : member.role === 'CAPTAIN'
                                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                                          : 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                                    }`}>
                                      {avatarSrc ? (
                                        <img src={avatarSrc} alt={member.fullName || ''} className="w-full h-full object-cover" />
                                      ) : (
                                        initial
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-900 text-sm truncate">{member.fullName || translate('teamMember')}</p>
                                      {member.isMock ? (
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">{translate("virtualAthlete")}</p>
                                      ) : member.elo ? (
                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                          <Award className="w-3.5 h-3.5 text-blue-500" />
                                          <span>
                                            {member.elo.tierName} • <strong>{member.elo.eloPoints}</strong> {tournament.matchType === 'DOUBLES' || tournament.matchType === 'MIXED_DOUBLES' ? 'ELO CN' : 'ELO'}
                                          </span>
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">VĐV chính thức</p>
                                      )}
                                    </div>
                                  </div>
                                );

                                return (
                                  <div 
                                    key={targetUserId || `m-${mIdx}`} 
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all"
                                  >
                                    {targetUserId ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          openUserProfile(
                                            {
                                              id: targetUserId,
                                              fullName: member.fullName || translate('teamMember'),
                                              avatarUrl: avatarSrc,
                                            },
                                            rect,
                                            tournament.communityId || undefined,
                                          );
                                        }}
                                        className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-1 min-w-0 text-left cursor-pointer"
                                      >
                                        {CardContent}
                                      </button>
                                    ) : (
                                      CardContent
                                    )}
                                    <span className={`ml-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border shrink-0 ${
                                        member.role === 'CAPTAIN' 
                                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                          : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}>
                                        {member.role === 'CAPTAIN' ? translate('teamCaptain') : translate('teamMember')}
                                      </span>
                                  </div>
                                );
                              })}
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
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg text-slate-500">
          {translate("teamsEmpty")}
        </div>
      )}
    </div>
  );
}
