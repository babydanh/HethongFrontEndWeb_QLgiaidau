import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CalendarDays, Trophy } from 'lucide-react';
import { Match, matchesApi } from '@/features/matches/api';
import { Tournament, TournamentResult, tournamentsApi } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import { socketClient } from '@/lib/socket';
import { formatDateTime } from '@/utils/format';
import { isTournamentCompleted, isTournamentInProgress } from '@/utils/tournament-status';

interface TournamentStatusSummaryCardProps {
  tournament: Tournament;
  tournamentId: string;
  divisionId?: string;
}

type MatchListPayload = Match[] | { data: Match[] };
type ResultPayload = TournamentResult | { data: TournamentResult };

const MAX_VISIBLE_MATCHES = 3;

function readMatches(payload: MatchListPayload): Match[] {
  return Array.isArray(payload) ? payload : payload.data;
}

function readResult(payload: ResultPayload): TournamentResult {
  return 'data' in payload ? payload.data : payload;
}

function sortBySchedule(first: Match, second: Match) {
  return (first.scheduledAt ?? '9999').localeCompare(second.scheduledAt ?? '9999');
}

/**
 * Avatar stack for team/doubles/singles
 */
function ParticipantAvatars({ participant, playerLabel }: { participant: Match['participant1']; playerLabel: string }) {
  if (!participant) {
    return (
      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 shadow-sm">
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
              className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100"
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
        className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100 shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`;
        }}
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0 shadow-sm">
      {participant.teamName.charAt(0).toUpperCase()}
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

export default function TournamentStatusSummaryCard({
  tournament,
  tournamentId,
  divisionId,
}: TournamentStatusSummaryCardProps) {
  const translate = useTranslations('TournamentDetail');
  const [matches, setMatches] = useState<Match[]>([]);
  const [result, setResult] = useState<TournamentResult | null>(null);

  useEffect(() => {
    let active = true;
    const params: Record<string, string | number> = {
      tournament_id: tournamentId,
      status: '',
      limit: 50,
    };

    if (divisionId) params.division_id = divisionId;

    void matchesApi.getMatches(params)
      .then((response) => {
        if (active) {
          setMatches(readMatches((response.data || []) as unknown as MatchListPayload));
        }
      })
      .catch(() => {});

    if (isTournamentCompleted(tournament.status)) {
      void tournamentsApi.getTournamentResults(tournamentId, divisionId)
        .then((response) => {
          if (active) setResult(readResult(response.data as ResultPayload));
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [divisionId, tournament.status, tournamentId]);

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

      setMatches((current) => {
        const index = current.findIndex((match) => match.id === updatedMatch.id);
        if (index === -1) return [...current, updatedMatch];
        return current.map((match) => match.id === updatedMatch.id ? updatedMatch : match);
      });
    };

    socket.on('connect', joinTournament);
    socket.on('match:update', handleMatchUpdate);
    if (socket.connected) joinTournament();

    return () => {
      socket.emit('leaveTournament', tournamentId);
      socket.off('connect', joinTournament);
      socket.off('match:update', handleMatchUpdate);
    };
  }, [tournamentId]);

  const liveMatches = matches.filter((match) => match.status === 'ONGOING').slice(0, MAX_VISIBLE_MATCHES);
  const upcomingMatches = matches
    .filter((match) => match.status === 'SCHEDULED' && match.participant1 && match.participant2)
    .sort(sortBySchedule)
    .slice(0, MAX_VISIBLE_MATCHES);
  const awards = result?.finalized
    ? result.awards.filter((award) => award.rank === 1 || award.rank === 2)
    : [];
  const completed = isTournamentCompleted(tournament.status);
  const inProgress = isTournamentInProgress(tournament.status) || liveMatches.length > 0;
  const visibleMatches = inProgress ? liveMatches : upcomingMatches;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-250/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          {completed ? translate('summary.resultsTitle') : inProgress ? translate('summary.inProgressTitle') : translate('summary.upcomingTitle')}
        </h2>
        <span className={`h-2.5 w-2.5 rounded-full ${completed ? 'bg-slate-300' : inProgress ? 'bg-rose-500 animate-pulse' : 'bg-sky-400'}`} />
      </div>

      {completed ? (
        <div className="space-y-2 p-3">
          {awards.length > 0 ? awards.map((award) => (
            <div key={`${award.rank}-${award.participant?.participantId ?? 'unknown'}`} className="flex items-center gap-3 rounded-md bg-amber-50 px-3 py-2.5">
              <Trophy className={`h-4 w-4 shrink-0 ${award.rank === 1 ? 'text-amber-500' : 'text-slate-500'}`} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{translate('summary.rank', { rank: award.rank })}</p>
                <p className="truncate text-sm font-bold text-slate-800">{award.participant?.teamName ?? translate('summary.confirming')}</p>
              </div>
            </div>
          )) : (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-sm leading-5 text-slate-500">{translate('resultsPending')}</p>
          )}
        </div>
      ) : visibleMatches.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {visibleMatches.map((match) => {
            const sets = extractMatchScores(match.scoreDetails);
            const activeSet = sets.length > 0 ? sets[sets.length - 1] : null;
            const activeSetScoreText = activeSet
              ? `${activeSet.team1Score} - ${activeSet.team2Score}`
              : (inProgress ? `${match.p1SetsWon ?? 0} - ${match.p2SetsWon ?? 0}` : 'VS');

            return (
              <Link
                key={match.id}
                href={`/live/${match.id}`}
                className="block p-3.5 transition-colors hover:bg-sky-50/40 group"
              >
                {/* Header: Status badge & Match Round/Court info from API */}
                <div className="flex items-center justify-between text-[11px] mb-3">
                  <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                    inProgress ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {inProgress ? `🔴 ${translate('summary.liveMatch')}` : translate('summary.upcomingMatch')}
                  </span>
                  <div className="text-slate-600 font-bold truncate max-w-[190px] text-right">
                    <span>{translate('matchNumber', { number: match.matchOrder ?? 1 })}</span>
                    {match.stage?.type ? (
                      <span className="text-slate-400 font-semibold"> • {match.stage.type === 'ROUND_ROBIN' ? translate('summary.groupStage') : translate('summary.knockoutStage')}</span>
                    ) : match.roundNumber ? (
                      <span className="text-slate-400 font-semibold"> • {translate('summary.round', { round: match.roundNumber })}</span>
                    ) : null}
                    {(match.courtName || match.tournament?.venueName) && (
                      <span className="text-slate-500 font-bold"> ({translate('summary.court', { court: match.courtName || match.tournament?.venueName || '' })})</span>
                    )}
                  </div>
                </div>

                {/* Matchup Layout: 3 Columns (Participant 1 | Clean Score | Participant 2) */}
                <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 group-hover:border-blue-200 transition-all">
                  {/* Participant 1 (Left) */}
                  <div className="flex flex-col items-center min-w-0 flex-1 text-center">
                    <ParticipantAvatars participant={match.participant1} playerLabel={translate('player')} />
                    <span className="mt-1.5 text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                      {getParticipantDisplayName(match.participant1, translate('summary.waitingOpponent'))}
                    </span>
                  </div>

                  {/* Center Score */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-1">
                    {inProgress ? (
                      <span className="text-xl font-black text-rose-600 tracking-tight leading-none">
                        {activeSetScoreText}
                      </span>
                    ) : (
                      <span className="text-sm font-black text-slate-400 tracking-wider">VS</span>
                    )}
                  </div>

                  {/* Participant 2 (Right) */}
                  <div className="flex flex-col items-center min-w-0 flex-1 text-center">
                    <ParticipantAvatars participant={match.participant2} playerLabel={translate('player')} />
                    <span className="mt-1.5 text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                      {getParticipantDisplayName(match.participant2, translate('summary.waitingOpponent'))}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-4 text-sm leading-5 text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-600">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {inProgress ? translate('noLiveMatch') : translate('noUpcomingMatch')}
          </div>
          {!inProgress && tournament.startDate ? <p className="mt-1 text-xs text-slate-400">{translate('startsAt', { date: formatDateTime(tournament.startDate) })}</p> : null}
        </div>
      )}
    </section>
  );
}
