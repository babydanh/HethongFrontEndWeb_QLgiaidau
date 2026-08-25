'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Tournament, tournamentsApi, TournamentParticipant, FootballRosterStatus } from '@/features/tournaments/api';
import { ChevronDown, ChevronUp, User, Award, ShieldCheck, XCircle, CheckCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import { useAuthStore } from '@/lib/zustand/authStore';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { cn } from '@/utils/cn';

interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
  participantId?: string;
}

export default function TeamsTab({ tournament, tournamentId, divisionId, participantId }: Props) {
  const translate = useTranslations('TournamentDetail');
  const { user } = useAuthStore();
  const effectiveTournamentId = tournamentId || tournament.id;
  const { openUserProfile } = useUserProfileModalStore();
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [rosterStatus, setRosterStatus] = useState<FootballRosterStatus | null>(null);
  const [rosterAction, setRosterAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

    const filteredParticipants = useMemo(() => {

    if (!searchQuery.trim()) return participants;
    const query = searchQuery.toLowerCase().trim();

    return participants.filter((p) => {
      if (p.teamName && p.teamName.toLowerCase().includes(query)) return true;
      if (p.members && p.members.length > 0) {
        return p.members.some((m) => m.fullName && m.fullName.toLowerCase().includes(query));
      }
      if (p.registeredBy?.fullName && p.registeredBy.fullName.toLowerCase().includes(query)) return true;
      return false;
    });
    }, [participants, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleParticipants = filteredParticipants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const isTeamSport = Boolean(tournament.tournamentConfig?.teamSize);
  const isExpandableFormat =
    isTeamSport ||
    tournament.matchType === 'DOUBLES' ||
    tournament.matchType === 'MIXED_DOUBLES';

  useEffect(() => {

    if (!participantId) {
      return;
    }
    let active = true;
    tournamentsApi.getFootballRosterStatus(tournamentId ?? tournament.id, participantId)
      .then((res) => { if (active) setRosterStatus(res.data ?? null); })
      .catch(() => { if (active) setRosterStatus(null); });
    return () => { active = false; };
  }, [participantId, tournament.id, tournamentId]);

  const visibleRosterStatus = participantId ? rosterStatus : null;

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
      {visibleRosterStatus?.currentMember?.confirmationStatus === 'PENDING' && (
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
      {/* Search Input Bar */}
      <div className="relative w-full max-w-md">
        <input
          type="text"
          placeholder={translate("teamSearchPlaceholder")}
          value={searchQuery}
                    onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}

          className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400 h-9.5 shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        {searchQuery && (
          <button
                        onClick={() => {
              setSearchQuery('');
              setPage(1);
            }}

            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {participants.length > 0 ? (
        filteredParticipants.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="text-[11px] sm:text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold w-10 sm:w-16">#</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">{translate("teamNameHeader")}</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold w-32 sm:w-48">{translate("paymentStatusHeader")}</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold w-16 sm:w-24 text-right">{translate("detailsHeader")}</th>
                </tr>
              </thead>
              <tbody>
                                {visibleParticipants.map((team, index) => {

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
                          elo: undefined,
                        };
                      });
                  const isExpandable = isExpandableFormat || members.length > 1;
                  const inlineSingleMember = members[0];
                  const inlineSingleName =
                    inlineSingleMember?.fullName?.trim() ||
                    team.teamName?.trim() ||
                    team.registeredBy?.fullName?.trim() ||
                    translate('teamMember');
                  const inlineSingleAvatar =
                    inlineSingleMember?.avatarUrl || team.registeredBy?.avatarUrl || null;
                  const isExpanded = isExpandable && expandedTeamId === team.id;

                  return (
                    <React.Fragment key={team.id}>
                      <tr
                        onClick={isExpandable ? () => toggleExpand(team.id) : undefined}
                        className={cn(
                          'bg-white border-b border-slate-100 hover:bg-slate-50/80 transition-colors',
                          isExpandable && 'cursor-pointer',
                        )}
                      >
                                                <td className="px-3 py-3.5 sm:px-6 sm:py-4 font-medium text-slate-950 align-middle">{(currentPage - 1) * pageSize + index + 1}</td>

                        <td className="px-3 py-3.5 sm:px-6 sm:py-4 font-bold text-slate-950 align-middle">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5 leading-normal sm:gap-2">
                            {!isExpandable ? (
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500" aria-hidden="true">
                                  {inlineSingleAvatar ? (
                                    <img src={inlineSingleAvatar} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    inlineSingleName.charAt(0).toUpperCase()
                                  )}
                                </span>
                                <span className="min-w-0 truncate" title={inlineSingleName}>{inlineSingleName}</span>
                              </div>
                            ) : (
                              <span>{team.teamName}</span>
                            )}
                            {team.seed !== null && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 sm:text-[10px]">
                                {translate('seedLabel', { number: team.seed })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 sm:px-6 sm:py-4 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            {team.isPaid ? (
                              <span className="bg-emerald-600 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold inline-block whitespace-nowrap shadow-2xs">
                                {translate("paymentPaid")}
                              </span>
                            ) : (
                              <span className="bg-amber-600 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold inline-block whitespace-nowrap shadow-2xs">
                                {translate("paymentPending")}
                              </span>
                            )}
                            {!team.isPaid && user?.id && (team.registeredBy?.id === user.id || team.members?.some(m => m.userId === user.id)) && Number(tournament.entryFee ?? 0) > 0 && (
                              <Link
                                href={`/payments/checkout?tournamentId=${effectiveTournamentId}&participantId=${team.id}${divisionId ? `&divisionId=${divisionId}` : ''}`}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                              >
                                💳 Nộp phí
                              </Link>
                            )}
                          </div>
                        </td>                        <td className="px-3 py-3.5 sm:px-6 sm:py-4 text-right align-middle">
                          {isExpandable ? (
                            <button
                              type="button"
                              aria-label={translate('detailsHeader')}
                              aria-expanded={isExpanded}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpand(team.id);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-1 sm:p-2 min-w-[36px] transition-colors"
                            >
                              <ChevronDown className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200", isExpanded && "rotate-180 text-blue-600")} />
                            </button>
                          ) : (
                            <User className="ml-auto h-4 w-4 text-slate-400" aria-hidden="true" />
                          )}
                        </td>
                      </tr>
                      {isExpandable && isExpanded && (
                        <tr className="bg-slate-50/50 animate-in fade-in duration-200">
                          <td colSpan={4} className="px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200">
                            <div className="flex flex-col gap-4">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <User className="w-4 h-4 text-slate-400" /> {translate("registeredMembers", { count: members.length })}
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
                                              {member.elo.tierName} • <strong>{member.elo.eloPoints}</strong> {tournament.matchType === 'DOUBLES' || tournament.matchType === 'MIXED_DOUBLES' ? translate("eloDoublesLabel") : 'ELO'}
                                            </span>
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{translate("officialAthlete")}</p>
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
                                          {member.role === 'CAPTAIN' ? translate('teamCaptain') : member.role === 'RESERVE' ? translate('reserveRole') : member.role === 'MAIN' ? translate('mainRole') : translate('teamMember')}
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
            {translate("teamsSearchEmpty", { query: searchQuery })}
          </div>
        )
      ) : (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg text-slate-500">
          {translate("teamsEmpty")}
        </div>
      )}

      {filteredParticipants.length > pageSize && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translate('previousPage')}
          </button>
          <span className="min-w-20 text-center text-xs font-bold text-slate-500">
            {translate('pageCount', { page: currentPage, totalPages })}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-blue-200 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translate('nextPage')}
          </button>
        </div>
      )}
    </div>
  );
}
