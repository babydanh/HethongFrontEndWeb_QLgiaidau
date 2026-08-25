'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Match, matchesApi } from '@/features/matches/api';
import { Tournament } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import { socketClient } from '@/lib/socket';
import { ChevronLeft, ChevronRight, PlayCircle, Radio, Clock, Search } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';

interface LiveMatchesTabProps {
  tournament: Tournament;
  tournamentId: string;
  divisionId?: string;
}

const ITEMS_PER_PAGE = 6;

function ParticipantAvatars({ participant, playerLabel }: { participant: Match['participant1']; playerLabel: string }) {
  if (!participant) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 shadow-sm">
        ?
      </div>
    );
  }

  const members = participant.members && Array.isArray(participant.members) ? participant.members : [];

  if (members.length >= 2) {
    return (
      <div className="flex items-center -space-x-3 shrink-0">
        {members.slice(0, 2).map((m, idx) => {
          const fallbackInitials = encodeURIComponent(m.fullName || `Player ${idx + 1}`);
          return (
            <img
              key={m.userId || idx}
              src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`}
              alt={m.fullName || participant.teamName || playerLabel}
              className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`;
              }}
            />
          );
        })}
      </div>
    );
  }

  if (members.length === 1) {
    const m = members[0];
    const fallbackInitials = encodeURIComponent(m.fullName || participant.teamName);
    return (
      <img
        src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`}
        alt={m.fullName || participant.teamName}
        className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100 shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`;
        }}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-sm font-bold text-rose-600 shrink-0 shadow-sm">
      {participant.teamName?.charAt(0).toUpperCase() || 'T'}
    </div>
  );
}

function getParticipantDisplayName(participant: Match['participant1'], waitingLabel: string) {
  if (!participant) return waitingLabel;
  const members = participant.members && Array.isArray(participant.members) ? participant.members : [];
  if (members.length >= 2) {
    const name1 = members[0]?.fullName?.trim() || '';
    const name2 = members[1]?.fullName?.trim() || '';
    if (name1 && name2) return `${name1} / ${name2}`;
  }
  if (members.length === 1 && members[0]?.fullName) {
    return members[0].fullName;
  }
  return participant.teamName || waitingLabel;
}

export default function LiveMatchesTab({
  tournament,
  tournamentId,
  divisionId,
}: LiveMatchesTabProps) {
  const translate = useTranslations('TournamentDetail');
  const matchTranslate = useTranslations('Match');
  const roundLabelTranslations: RoundLabelTranslations = {
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
  };
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const fetchLiveMatches = async () => {
      try {
        const params: Record<string, string | number> = {
          tournament_id: tournamentId,
          status: 'ONGOING',
          limit: 100,
        };
        if (divisionId) params.division_id = divisionId;

        const res = await matchesApi.getMatches(params);
        const data = Array.isArray(res) ? res : (res.data || []);
        if (active) {
          const ongoing = (data as Match[]).filter((m) => m.status === 'ONGOING');
          setLiveMatches(ongoing);
        }
      } catch (err) {
        console.error('Failed to fetch live matches:', err);
      }
    };

    fetchLiveMatches();

    return () => {
      active = false;
    };
  }, [tournamentId, divisionId]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const joinTournament = () => socket.emit('joinTournament', tournamentId);
    const handleMatchUpdate = (rawMatch: Match | string) => {
      let updatedMatch: Match;
      try {
        updatedMatch = typeof rawMatch === 'string'
          ? JSON.parse(rawMatch) as Match
          : rawMatch;
      } catch {
        return;
      }

      if (!updatedMatch?.id || updatedMatch.tournamentId !== tournamentId) return;
      if (divisionId && updatedMatch.divisionId !== divisionId) return;

      setLiveMatches((current) => {
        let next: Match[];
        if (updatedMatch.status !== 'ONGOING') {
          next = current.filter((m) => m.id !== updatedMatch.id);
        } else {
          const exists = current.some((m) => m.id === updatedMatch.id);
          if (exists) {
            next = current.map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
          } else {
            next = [updatedMatch, ...current];
          }
        }
        return next;
      });
    };

    socket.on('connect', joinTournament);
    socket.on('match:update', handleMatchUpdate);
    if (socket.connected) joinTournament();

    return () => {
      socket.off('connect', joinTournament);
      socket.off('match:update', handleMatchUpdate);
    };
  }, [tournamentId, divisionId]);

  const filteredMatches = liveMatches.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const p1Name = getParticipantDisplayName(m.participant1, '').toLowerCase();
    const p2Name = getParticipantDisplayName(m.participant2, '').toLowerCase();
    const court = (m.courtName || '').toLowerCase();
    return p1Name.includes(q) || p2Name.includes(q) || court.includes(q);
  });

  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedMatches = filteredMatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
            <Radio className="w-5 h-5 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                {translate('liveMatchesTabTitle')}
              </h3>
              <span className="bg-rose-600 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                {filteredMatches.length}
              </span>
            </div>
            <p className="text-xs text-rose-700/80 font-medium mt-0.5">
              {translate('liveMatchesTabDescription')}
            </p>
          </div>
        </div>

        {liveMatches.length > 3 && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={translate('liveMatchesTabSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 placeholder-slate-400 h-9 shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Match Cards Grid */}
      {paginatedMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedMatches.map((match) => {
            const sets = extractMatchScores(match.scoreDetails);
            const activeSet = sets.length > 0 ? sets[sets.length - 1] : null;
            const activeSetScoreText = activeSet
              ? `${activeSet.team1Score} - ${activeSet.team2Score}`
              : `${match.p1SetsWon ?? 0} - ${match.p2SetsWon ?? 0}`;
            const isRoundRobinMatch = tournament.format === 'ROUND_ROBIN' || Boolean(match.group?.name);
            const matchContextLabel = isRoundRobinMatch
              ? (typeof match.leg === 'number' && match.leg > 0
                  ? `${matchTranslate('leg')} ${match.leg}`
                  : null)
              : getMatchRoundLabel({
                  match,
                  matches: liveMatches,
                  tournamentFormat: tournament.format,
                  bracketSize: undefined,
                  includePhasePrefix: false,
                  translations: roundLabelTranslations,
                });

            return (
              <Link
                key={match.id}
                href={`/live/${match.id}`}
                className="group relative flex flex-col justify-between bg-white border border-slate-250/90 hover:border-rose-300 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                {/* Accent top border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />

                {/* Match Header */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-rose-50 text-rose-600 border border-rose-200 animate-pulse uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                      {translate('liveLabel')}
                    </span>
                    {matchContextLabel && (
                      <span className="text-xs font-extrabold text-slate-800">
                        {matchContextLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    {(match.courtName || match.tournament?.venueName) && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {match.courtName || match.tournament?.venueName}
                      </span>
                    )}
                    {match.group?.name && (
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {match.group.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Matchup Body */}
                <div className="flex items-center justify-between gap-3 bg-slate-50/90 p-4 rounded-xl border border-slate-200/70 group-hover:border-rose-200 transition-all">
                  {/* Participant 1 */}
                  <div className="flex flex-col items-center min-w-0 flex-1 text-center">
                    <ParticipantAvatars participant={match.participant1} playerLabel={translate('player')} />
                    <span className="mt-2 text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                      {getParticipantDisplayName(match.participant1, translate('summary.waitingOpponent'))}
                    </span>
                  </div>

                  {/* Center Score & Set details */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-2">
                    <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight leading-none">
                      {activeSetScoreText}
                    </span>
                    {sets.length > 1 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {sets.map((s, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              idx === sets.length - 1
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200/70 text-slate-600'
                            }`}
                          >
                            {s.team1Score}-{s.team2Score}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Participant 2 */}
                  <div className="flex flex-col items-center min-w-0 flex-1 text-center">
                    <ParticipantAvatars participant={match.participant2} playerLabel={translate('player')} />
                    <span className="mt-2 text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                      {getParticipantDisplayName(match.participant2, translate('summary.waitingOpponent'))}
                    </span>
                  </div>
                </div>

                {/* Match Footer */}
                <div className="mt-3 pt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {match.scheduledAt ? formatDateTime(match.scheduledAt) : translate('liveMatchesTabInProgress')}
                  </span>
                  <span className="text-rose-600 group-hover:underline flex items-center gap-1 font-bold">
                    {translate('liveMatchesTabEnterRoom')} <PlayCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">{translate('liveMatchesTabEmptyTitle')}</p>
          <p className="text-xs text-slate-400 mt-1">
            {translate('liveMatchesTabEmptyDescription')}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
          <p className="text-xs text-slate-500 font-semibold">
            {translate('liveMatchesTabPaginationSummary', {
              page: validPage,
              totalPages,
              count: filteredMatches.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {translate('previousPage')}
            </button>
            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
            >
              {translate('nextPage')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
