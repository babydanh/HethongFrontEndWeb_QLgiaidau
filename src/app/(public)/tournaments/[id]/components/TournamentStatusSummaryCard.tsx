import { useEffect, useState } from 'react';
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
function ParticipantAvatars({ participant }: { participant: Match['participant1'] }) {
  if (!participant) {
    return (
      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
        ?
      </div>
    );
  }

  const members = participant.members && Array.isArray(participant.members) ? participant.members : [];

  if (members.length >= 2) {
    return (
      <div className="flex items-center -space-x-2 shrink-0">
        {members.slice(0, 2).map((m, idx) => {
          const fallbackInitials = encodeURIComponent(m.fullName || `VĐV ${idx + 1}`);
          return (
            <img
              key={m.userId || idx}
              src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`}
              alt={m.fullName || 'VĐV'}
              className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-xs bg-slate-100"
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
        className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-xs bg-slate-100 shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`;
        }}
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
      {participant.teamName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function TournamentStatusSummaryCard({
  tournament,
  tournamentId,
  divisionId,
}: TournamentStatusSummaryCardProps) {
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
        if (active) setMatches(readMatches(response.data as MatchListPayload));
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
    <section className="mt-4 overflow-hidden rounded-lg border border-slate-250/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          {completed ? 'Kết quả giải đấu' : inProgress ? 'Đang diễn ra' : 'Sắp diễn ra'}
        </h2>
        <span className={`h-2.5 w-2.5 rounded-full ${completed ? 'bg-slate-300' : inProgress ? 'bg-rose-500 animate-pulse' : 'bg-sky-400'}`} />
      </div>

      {completed ? (
        <div className="space-y-2 p-3">
          {awards.length > 0 ? awards.map((award) => (
            <div key={`${award.rank}-${award.participant?.participantId ?? 'unknown'}`} className="flex items-center gap-3 rounded-md bg-amber-50 px-3 py-2.5">
              <Trophy className={`h-4 w-4 shrink-0 ${award.rank === 1 ? 'text-amber-500' : 'text-slate-500'}`} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Hạng {award.rank}</p>
                <p className="truncate text-sm font-bold text-slate-800">{award.participant?.teamName ?? 'Đang xác nhận'}</p>
              </div>
            </div>
          )) : (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-sm leading-5 text-slate-500">Kết quả đang được ban tổ chức xác nhận.</p>
          )}
        </div>
      ) : visibleMatches.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {visibleMatches.map((match) => {
            const sets = extractMatchScores(match.scoreDetails);
            return (
              <Link
                key={match.id}
                href={`/live/${match.id}`}
                className="block p-3.5 transition-colors hover:bg-sky-50/50 group"
              >
                {/* Status & Court info */}
                <div className="flex items-center justify-between text-[10px] mb-2.5">
                  <span className={`px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                    inProgress ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {inProgress ? '🔴 Trực tiếp' : 'Sắp đấu'}
                  </span>
                  {match.courtName ? (
                    <span className="text-slate-400 font-semibold truncate max-w-[120px]">
                      Sân: {match.courtName}
                    </span>
                  ) : match.scheduledAt ? (
                    <span className="text-slate-400 font-semibold">
                      {formatDateTime(match.scheduledAt)}
                    </span>
                  ) : null}
                </div>

                {/* Matchup row with Avatars & Sets Score */}
                <div className="flex items-center justify-between gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                  {/* Team 1 */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ParticipantAvatars participant={match.participant1} />
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {match.participant1?.teamName ?? 'Chờ đối thủ'}
                    </span>
                  </div>

                  {/* Score Center */}
                  <div className="flex items-center justify-center px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                    {inProgress ? (
                      <span className="text-sm font-black text-rose-600 tracking-tight">
                        {match.p1SetsWon ?? 0} - {match.p2SetsWon ?? 0}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">VS</span>
                    )}
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {match.participant2?.teamName ?? 'Chờ đối thủ'}
                    </span>
                    <ParticipantAvatars participant={match.participant2} />
                  </div>
                </div>

                {/* Score details (Sets breakdown) */}
                {sets.length > 0 && (
                  <div className="mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                    {sets.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200/80"
                      >
                        S{idx + 1}: {s.team1Score}-{s.team2Score}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-4 text-sm leading-5 text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-600">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {inProgress ? 'Chưa có trận đang phát trực tiếp.' : 'Chưa có cặp đấu sắp diễn ra.'}
          </div>
          {!inProgress && tournament.startDate ? <p className="mt-1 text-xs text-slate-400">Bắt đầu {formatDateTime(tournament.startDate)}</p> : null}
        </div>
      )}
    </section>
  );
}
