'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Trophy } from 'lucide-react';
import { Match, matchesApi } from '@/features/matches/api';
import { Tournament, TournamentResult, tournamentsApi } from '@/features/tournaments/api';
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

const MAX_VISIBLE_MATCHES = 2;

function readMatches(payload: MatchListPayload): Match[] {
  return Array.isArray(payload) ? payload : payload.data;
}

function readResult(payload: ResultPayload): TournamentResult {
  return 'data' in payload ? payload.data : payload;
}

function sortBySchedule(first: Match, second: Match) {
  return (first.scheduledAt ?? '9999').localeCompare(second.scheduledAt ?? '9999');
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
      .catch(() => {
        // The surrounding tournament information remains useful when match feed is unavailable.
      });

    if (isTournamentCompleted(tournament.status)) {
      void tournamentsApi.getTournamentResults(tournamentId, divisionId)
        .then((response) => {
          if (active) setResult(readResult(response.data as ResultPayload));
        })
        .catch(() => {
          // Results are published independently from the tournament status.
        });
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
          {visibleMatches.map((match) => (
            <Link key={match.id} href={`/live/${match.id}`} className="block px-4 py-3 transition-colors hover:bg-sky-50/70">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-wide ${inProgress ? 'text-rose-600' : 'text-sky-600'}`}>
                  {inProgress ? 'Trực tiếp' : 'Sắp đấu'}
                </span>
                {inProgress ? (
                  <span className="text-sm font-extrabold text-slate-800">{match.p1SetsWon} - {match.p2SetsWon}</span>
                ) : match.scheduledAt ? (
                  <span className="text-[11px] font-semibold text-slate-400">{formatDateTime(match.scheduledAt)}</span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm font-bold text-slate-800">{match.participant1?.teamName ?? 'TBD'} <span className="px-1 text-slate-400">vs</span> {match.participant2?.teamName ?? 'TBD'}</p>
            </Link>
          ))}
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
