'use client';

import React, { useId, useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Tournament } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import { communitiesApi } from '@/features/communities/api';
import { matchesApi } from '@/features/matches/api';
import { extractMatchScores } from '@/features/matches/score-display';
import { socketClient } from '@/lib/socket';
import { formatDateTime } from '@/utils/format';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';
import { getMatchCourtLabel } from '@/utils/tournament-location';
import {
  Clock,
  MapPin,
  Search,
  RefreshCw,
  Activity,
  ChevronRight,
  Trophy,
} from 'lucide-react';

interface Props {
  communityId: string;
}

type TimelineFilter = 'ALL' | 'COMPLETED' | 'ONGOING';

interface TeamStreakRecord {
  type: 'W' | 'L';
  count: number;
}

interface MatchWithTournament extends Match {
  tournamentName?: string;
}

function computeChronologicalStreaks(matches: MatchWithTournament[]): Map<string, { p1Streak: TeamStreakRecord | null; p2Streak: TeamStreakRecord | null }> {
  const streakMap = new Map<string, { p1Streak: TeamStreakRecord | null; p2Streak: TeamStreakRecord | null }>();

  const sorted = [...matches].sort((a, b) => {
    const timeA = new Date(a.completedAt || a.startedAt || a.scheduledAt || a.updatedAt).getTime();
    const timeB = new Date(b.completedAt || b.startedAt || b.scheduledAt || b.updatedAt).getTime();
    return timeA - timeB;
  });

  const runningStreaks = new Map<string, TeamStreakRecord>();

  for (const m of sorted) {
    const p1Id = m.participant1Id || m.participant1?.id;
    const p2Id = m.participant2Id || m.participant2?.id;

    const p1Current = p1Id && runningStreaks.has(p1Id) ? { ...runningStreaks.get(p1Id)! } : null;
    const p2Current = p2Id && runningStreaks.has(p2Id) ? { ...runningStreaks.get(p2Id)! } : null;

    streakMap.set(m.id, {
      p1Streak: p1Current,
      p2Streak: p2Current,
    });

    if (m.status === 'COMPLETED' && m.winnerId) {
      if (p1Id) {
        const isP1Win = m.winnerId === p1Id;
        const prev = runningStreaks.get(p1Id);
        if (isP1Win) {
          runningStreaks.set(p1Id, {
            type: 'W',
            count: prev?.type === 'W' ? prev.count + 1 : 1,
          });
        } else {
          runningStreaks.set(p1Id, {
            type: 'L',
            count: prev?.type === 'L' ? prev.count + 1 : 1,
          });
        }
      }

      if (p2Id) {
        const isP2Win = m.winnerId === p2Id;
        const prev = runningStreaks.get(p2Id);
        if (isP2Win) {
          runningStreaks.set(p2Id, {
            type: 'W',
            count: prev?.type === 'W' ? prev.count + 1 : 1,
          });
        } else {
          runningStreaks.set(p2Id, {
            type: 'L',
            count: prev?.type === 'L' ? prev.count + 1 : 1,
          });
        }
      }
    }
  }

  return streakMap;
}

/**
 * Shape-matched skeleton loader following taste-skill rules (Mục 6)
 */
function ClubActivitySkeleton() {
  return (
    <div className="space-y-6 pt-2" aria-label="Loading club activity feed">
      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-slate-200 ring-4 ring-white animate-pulse" />
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs animate-pulse space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="h-4 bg-slate-200 rounded-md w-36" />
                <div className="h-4 bg-slate-200 rounded-md w-20" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded-md w-40" />
                    <div className="h-4.5 bg-slate-200 rounded-full w-9" />
                  </div>
                  <div className="h-6 bg-slate-200 rounded-md w-8" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded-md w-36" />
                    <div className="h-4.5 bg-slate-200 rounded-full w-9" />
                  </div>
                  <div className="h-6 bg-slate-200 rounded-md w-8" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="h-3 bg-slate-200 rounded-md w-28" />
                <div className="h-7 bg-slate-200 rounded-lg w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Minimalist Streak Micro-Pill (Anti-slop)
 */
function StreakPill({ streak }: { streak: TeamStreakRecord | null }) {
  if (!streak || streak.count <= 0) return null;

  const isWin = streak.type === 'W';
  const label = isWin ? `W${streak.count}` : `L${streak.count}`;
  const title = isWin
    ? `Chuỗi ${streak.count} trận thắng liên tiếp`
    : `Chuỗi ${streak.count} trận thua liên tiếp`;

  return (
    <span
      title={title}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium tracking-tight select-none ${
        isWin
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      }`}
    >
      {label}
    </span>
  );
}

export default function ClubActivityTab({ communityId }: Props) {
  const searchInputId = useId();
  const matchTranslate = useTranslations('Match');

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<MatchWithTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const roundLabelTranslations = useMemo<RoundLabelTranslations>(() => ({
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
  }), [matchTranslate]);

  // Fetch all matches across all tournaments of this community
  const fetchClubMatches = useCallback(async (quiet = false) => {
    if (!communityId) return;
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Get community tournaments
      const tourRes = await communitiesApi.getTournaments(communityId);
      const tourList = Array.isArray(tourRes?.data) ? tourRes.data : [];
      setTournaments(tourList);

      if (tourList.length === 0) {
        setMatches([]);
        return;
      }

      // Map tournament IDs to tournament objects for quick lookup
      const tourMap = new Map<string, Tournament>();
      tourList.forEach((t) => tourMap.set(t.id, t));

      // 2. Fetch matches for up to 5 most recent active tournaments in parallel
      const recentTournaments = tourList.slice(0, 5);
      const matchPromises = recentTournaments.map(async (t) => {
        try {
          const res = await matchesApi.getMatches({
            tournament_id: t.id,
            limit: 50,
            status: '',
          });
          const matchItems = Array.isArray(res?.data) ? (res.data as Match[]) : [];
          return matchItems.map((m) => ({
            ...m,
            tournamentName: t.name,
          }));
        } catch {
          return [] as MatchWithTournament[];
        }
      });

      const results = await Promise.all(matchPromises);
      const combined = results.flat();
      setMatches(combined);
    } catch (err) {
      console.error('Failed to fetch club activity matches', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [communityId]);

  useEffect(() => {
    void fetchClubMatches();
  }, [fetchClubMatches]);

  // Socket updates for realtime score/match events
  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    if (!socket) return;

    const handleMatchUpdate = (updatedMatch: Match) => {
      if (!updatedMatch || !updatedMatch.id) return;

      setMatches((prev) => {
        const index = prev.findIndex((m) => m.id === updatedMatch.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...updatedMatch };
          return next;
        }
        // If it belongs to one of our tournaments, prepend it
        const tour = tournaments.find((t) => t.id === updatedMatch.tournamentId);
        if (tour) {
          return [{ ...updatedMatch, tournamentName: tour.name }, ...prev];
        }
        return prev;
      });
    };

    socket.on('match:update', handleMatchUpdate);
    socket.on('match:completed', handleMatchUpdate);
    socket.on('match:score', handleMatchUpdate);

    return () => {
      socket.off('match:update', handleMatchUpdate);
      socket.off('match:completed', handleMatchUpdate);
      socket.off('match:score', handleMatchUpdate);
    };
  }, [tournaments]);

  // Streaks map
  const streaksMap = useMemo(() => {
    return computeChronologicalStreaks(matches);
  }, [matches]);

  // Filter and sort for timeline view
  const timelineMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return matches
      .filter((m) => {
        if (filter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
        if (filter === 'ONGOING' && m.status !== 'ONGOING') return false;

        if (query) {
          const t1 = (m.participant1?.teamName || '').toLowerCase();
          const t2 = (m.participant2?.teamName || '').toLowerCase();
          const tName = (m.tournamentName || '').toLowerCase();
          const m1 = (m.participant1?.members || []).some((mem) => (mem.fullName || '').toLowerCase().includes(query));
          const m2 = (m.participant2?.members || []).some((mem) => (mem.fullName || '').toLowerCase().includes(query));
          if (!t1.includes(query) && !t2.includes(query) && !tName.includes(query) && !m1 && !m2) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'ONGOING' && b.status !== 'ONGOING') return -1;
        if (b.status === 'ONGOING' && a.status !== 'ONGOING') return 1;

        const timeA = new Date(a.completedAt || a.updatedAt || a.startedAt || a.scheduledAt || 0).getTime();
        const timeB = new Date(b.completedAt || b.updatedAt || b.startedAt || b.scheduledAt || 0).getTime();
        return timeB - timeA;
      });
  }, [matches, filter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header bar: Title & Subtitle + Search & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Hoạt động câu lạc bộ
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {matches.length} trận đấu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dòng sự kiện trận đấu và chuỗi phong độ (Streak) của các thành viên trong câu lạc bộ
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter buttons */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilter('ONGOING')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'ONGOING'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Đang đấu
            </button>
            <button
              type="button"
              onClick={() => setFilter('COMPLETED')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'COMPLETED'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Đã xong
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <label htmlFor={searchInputId} className="sr-only">
              {matchTranslate('searchPlaceholder')}
            </label>
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tên VĐV, đội, giải..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 transition-colors w-40 sm:w-48"
            />
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => void fetchClubMatches(true)}
            disabled={isRefreshing}
            title="Làm mới dòng thời gian"
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading && matches.length === 0 ? (
        <ClubActivitySkeleton />
      ) : timelineMatches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-white text-slate-500">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Chưa có hoạt động trận đấu nào</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Khi các giải đấu trong câu lạc bộ khởi tranh và diễn ra, diễn biến trận đấu sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 pt-1">
          {timelineMatches.map((match) => {
            const isCompleted = match.status === 'COMPLETED';
            const isOngoing = match.status === 'ONGOING';

            const p1 = match.participant1;
            const p2 = match.participant2;
            const p1Id = match.participant1Id || p1?.id;
            const p2Id = match.participant2Id || p2?.id;

            const isP1Winner = isCompleted && match.winnerId === p1Id;
            const isP2Winner = isCompleted && match.winnerId === p2Id;

            const streaks = streaksMap.get(match.id);
            const p1Streak = streaks?.p1Streak || null;
            const p2Streak = streaks?.p2Streak || null;

            const roundLabel = getMatchRoundLabel({
              match,
              translations: roundLabelTranslations,
            });
            const courtLabel = getMatchCourtLabel(match);
            const sets = extractMatchScores(match.scoreDetails);

            const displayTime = match.completedAt
              ? formatDateTime(match.completedAt)
              : match.startedAt
              ? `Bắt đầu lúc ${formatDateTime(match.startedAt)}`
              : match.scheduledAt
              ? formatDateTime(match.scheduledAt)
              : null;

            return (
              <div key={match.id} className="relative group">
                {/* Timeline node marker */}
                <div
                  className={`absolute -left-[31px] top-3.5 w-3.5 h-3.5 rounded-full ring-4 ring-white transition-colors ${
                    isOngoing
                      ? 'bg-blue-600 ring-blue-100 animate-pulse'
                      : isCompleted
                      ? 'bg-slate-400'
                      : 'bg-slate-200'
                  }`}
                />

                {/* Match Card Container */}
                <div className="rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs overflow-hidden">
                  {/* Top Metadata Header */}
                  <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      {match.tournamentName && (
                        <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                          <Trophy className="w-3 h-3 text-blue-600" />
                          {match.tournamentName}
                        </span>
                      )}
                      <span className="font-semibold text-slate-800">
                        {roundLabel || `Trận #${match.matchOrder}`}
                      </span>
                      {courtLabel && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {courtLabel}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOngoing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                          Đang diễn ra
                        </span>
                      )}
                      {displayTime && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {displayTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams & Score Layout */}
                  <div className="p-4 space-y-3">
                    {/* Team 1 Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isP1Winner
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p1?.teamName ? p1.teamName.charAt(0).toUpperCase() : '1'}
                        </div>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span
                            className={`truncate text-sm ${
                              isP1Winner ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                            }`}
                            title={p1?.teamName || matchTranslate('unknownTeam')}
                          >
                            {p1?.teamName || matchTranslate('unknownTeam')}
                          </span>
                          {/* Win/Lose Streak Pill */}
                          <StreakPill streak={p1Streak} />
                        </div>
                      </div>

                      {/* Sets won display */}
                      <div className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums">
                        <span
                          className={`min-w-6 text-center px-1.5 py-0.5 rounded ${
                            isP1Winner
                              ? 'bg-slate-900 text-white font-bold'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {match.p1SetsWon ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Team 2 Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isP2Winner
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p2?.teamName ? p2.teamName.charAt(0).toUpperCase() : '2'}
                        </div>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span
                            className={`truncate text-sm ${
                              isP2Winner ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                            }`}
                            title={p2?.teamName || matchTranslate('unknownTeam')}
                          >
                            {p2?.teamName || matchTranslate('unknownTeam')}
                          </span>
                          {/* Win/Lose Streak Pill */}
                          <StreakPill streak={p2Streak} />
                        </div>
                      </div>

                      {/* Sets won display */}
                      <div className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums">
                        <span
                          className={`min-w-6 text-center px-1.5 py-0.5 rounded ${
                            isP2Winner
                              ? 'bg-slate-900 text-white font-bold'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {match.p2SetsWon ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown of Set Scores if Available */}
                    {sets.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
                          <span className="text-slate-400 font-sans text-[10px] uppercase font-bold tracking-wider">
                            Điểm set:
                          </span>
                          {sets.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-150 text-slate-700 font-medium"
                            >
                              {s.team1Score}-{s.team2Score}
                            </span>
                          ))}
                        </div>

                        {/* View Match Details Link */}
                        <Link
                          href={`/live/${match.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors ml-auto group/btn"
                        >
                          <span>{matchTranslate('detailsAction') || 'Xem trận'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 group-hover/btn:text-blue-600 transition-all" />
                        </Link>
                      </div>
                    )}
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
