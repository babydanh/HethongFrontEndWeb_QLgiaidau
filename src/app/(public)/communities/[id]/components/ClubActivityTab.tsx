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
import { useAuthStore } from '@/lib/zustand/authStore';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import {
  Clock,
  MapPin,
  Search,
  RefreshCw,
  Activity,
  ChevronRight,
  Trophy,
  Crown,
  ShieldCheck,
  User,
  Flame,
  Sparkles,
} from 'lucide-react';

interface Props {
  communityId: string;
}

type TimelineFilter = 'ALL' | 'MY_MATCHES' | 'COMPLETED' | 'ONGOING';

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
                <div className="h-4 bg-slate-200 rounded-md w-24" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded-md w-40" />
                    <div className="h-4.5 bg-slate-200 rounded-full w-9" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded-md w-36" />
                    <div className="h-4.5 bg-slate-200 rounded-full w-9" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <div className="h-3.5 bg-slate-200 rounded-md w-32" />
                <div className="h-7 bg-slate-200 rounded-lg w-24" />
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

const MOCK_CLUB_MATCHES: MatchWithTournament[] = [
  {
    id: 'mock-match-1',
    groupId: 'mock-g1',
    tournamentId: 'mock-t1',
    tournamentName: 'Giải Vô Địch CLB Hè 2026',
    status: 'COMPLETED',
    roundNumber: 3,
    matchOrder: 5,
    bracketBranch: 'WINNERS',
    isBye: false,
    scheduledAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    courtName: 'Sân Trung Tâm',
    participant1Id: 'mock-user-1',
    participant2Id: 'mock-user-2',
    winnerId: 'mock-user-1',
    participant1: {
      id: 'mock-user-1',
      teamName: 'Nguyễn Minh Danh',
      members: [{ userId: 'mock-user-1', fullName: 'Nguyễn Minh Danh' }],
    },
    participant2: {
      id: 'mock-user-2',
      teamName: 'Nguyễn Minh Kha',
      members: [{ userId: 'mock-user-2', fullName: 'Nguyễn Minh Kha' }],
    },
    p1SetsWon: 2,
    p2SetsWon: 1,
    scoreDetails: {
      sets: [
        { team1Score: 21, team2Score: 19, isFinished: true },
        { team1Score: 18, team2Score: 21, isFinished: true },
        { team1Score: 21, team2Score: 16, isFinished: true },
      ],
    },
  },
  {
    id: 'mock-match-2',
    groupId: 'mock-g1',
    tournamentId: 'mock-t2',
    tournamentName: 'Giao Lưu Pickleball Cuối Tuần',
    status: 'ONGOING',
    roundNumber: 2,
    matchOrder: 3,
    bracketBranch: 'MAIN',
    isBye: false,
    scheduledAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    courtName: 'Sân 2',
    participant1Id: 'mock-user-3',
    participant2Id: 'mock-user-4',
    participant1: {
      id: 'mock-user-3',
      teamName: 'Tiến Minh / Hải Đăng',
      members: [
        { userId: 'mock-user-3a', fullName: 'Tiến Minh' },
        { userId: 'mock-user-3b', fullName: 'Hải Đăng' },
      ],
    },
    participant2: {
      id: 'mock-user-4',
      teamName: 'Văn Hùng / Tuấn Kiệt',
      members: [
        { userId: 'mock-user-4a', fullName: 'Văn Hùng' },
        { userId: 'mock-user-4b', fullName: 'Tuấn Kiệt' },
      ],
    },
    p1SetsWon: 1,
    p2SetsWon: 0,
    scoreDetails: {
      sets: [
        { team1Score: 11, team2Score: 8, isFinished: true },
        { team1Score: 9, team2Score: 7, isFinished: false },
      ],
    },
  },
  {
    id: 'mock-match-3',
    groupId: 'mock-g1',
    tournamentId: 'mock-t1',
    tournamentName: 'Giải Vô Địch CLB Hè 2026',
    status: 'COMPLETED',
    roundNumber: 2,
    matchOrder: 2,
    bracketBranch: 'WINNERS',
    isBye: false,
    scheduledAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    courtName: 'Sân 1',
    participant1Id: 'mock-user-1',
    participant2Id: 'mock-user-5',
    winnerId: 'mock-user-1',
    participant1: {
      id: 'mock-user-1',
      teamName: 'Nguyễn Minh Danh',
      members: [{ userId: 'mock-user-1', fullName: 'Nguyễn Minh Danh' }],
    },
    participant2: {
      id: 'mock-user-5',
      teamName: 'Trần Hoàng Nam',
      members: [{ userId: 'mock-user-5', fullName: 'Trần Hoàng Nam' }],
    },
    p1SetsWon: 2,
    p2SetsWon: 0,
    scoreDetails: {
      sets: [
        { team1Score: 21, team2Score: 15, isFinished: true },
        { team1Score: 21, team2Score: 13, isFinished: true },
      ],
    },
  },
  {
    id: 'mock-match-4',
    groupId: 'mock-g1',
    tournamentId: 'mock-t1',
    tournamentName: 'Giải Vô Địch CLB Hè 2026',
    status: 'COMPLETED',
    roundNumber: 1,
    matchOrder: 1,
    bracketBranch: 'WINNERS',
    isBye: false,
    scheduledAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 230 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    courtName: 'Sân 3',
    participant1Id: 'mock-user-1',
    participant2Id: 'mock-user-6',
    winnerId: 'mock-user-1',
    participant1: {
      id: 'mock-user-1',
      teamName: 'Nguyễn Minh Danh',
      members: [{ userId: 'mock-user-1', fullName: 'Nguyễn Minh Danh' }],
    },
    participant2: {
      id: 'mock-user-6',
      teamName: 'Lê Quốc Bảo',
      members: [{ userId: 'mock-user-6', fullName: 'Lê Quốc Bảo' }],
    },
    p1SetsWon: 2,
    p2SetsWon: 0,
    scoreDetails: {
      sets: [
        { team1Score: 21, team2Score: 11, isFinished: true },
        { team1Score: 21, team2Score: 14, isFinished: true },
      ],
    },
  },
  {
    id: 'mock-match-5',
    groupId: 'mock-g1',
    tournamentId: 'mock-t1',
    tournamentName: 'Giải Vô Địch CLB Hè 2026',
    status: 'COMPLETED',
    roundNumber: 1,
    matchOrder: 4,
    bracketBranch: 'LOSERS',
    isBye: false,
    scheduledAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 175 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    courtName: 'Sân 2',
    participant1Id: 'mock-user-2',
    participant2Id: 'mock-user-7',
    winnerId: 'mock-user-2',
    participant1: {
      id: 'mock-user-2',
      teamName: 'Nguyễn Minh Kha',
      members: [{ userId: 'mock-user-2', fullName: 'Nguyễn Minh Kha' }],
    },
    participant2: {
      id: 'mock-user-7',
      teamName: 'Phạm Nhật Minh',
      members: [{ userId: 'mock-user-7', fullName: 'Phạm Nhật Minh' }],
    },
    p1SetsWon: 2,
    p2SetsWon: 1,
    scoreDetails: {
      sets: [
        { team1Score: 19, team2Score: 21, isFinished: true },
        { team1Score: 21, team2Score: 18, isFinished: true },
        { team1Score: 21, team2Score: 17, isFinished: true },
      ],
    },
  },
];

export default function ClubActivityTab({ communityId }: Props) {
  const searchInputId = useId();
  const matchTranslate = useTranslations('Match');

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<MatchWithTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

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
  const fetchClubMatches = useCallback(async (isRefresh = false) => {
    if (!communityId) return;
    if (isRefresh) {
      setIsRefreshing(true);
    }

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

  const { user } = useAuthStore();
  const [userMembership, setUserMembership] = useState<{
    role: string;
    status: string;
    tags?: string[];
  } | null>(null);
  const [userRanking, setUserRanking] = useState<PlayerRanking | null>(null);
  const [isLoadingUserClubInfo, setIsLoadingUserClubInfo] = useState(false);

  // Fetch current user info in this community
  useEffect(() => {
    if (!communityId || !user?.id) {
      setUserMembership(null);
      setUserRanking(null);
      return;
    }

    let isMounted = true;
    setIsLoadingUserClubInfo(true);

    Promise.allSettled([
      communitiesApi.getMyMembership(communityId),
      rankingsApi.getUserRankings(user.id),
      communitiesApi.getMembers(communityId, { limit: 100 }),
    ]).then(([membershipRes, rankingRes, membersRes]) => {
      if (!isMounted) return;

      // Parse membership & tags
      let role = 'MEMBER';
      let status = 'JOINED';
      let tags: string[] = [];

      if (membershipRes.status === 'fulfilled') {
        const payload = (membershipRes.value as unknown as { data?: { role?: string; status?: string } }).data
          ?? (membershipRes.value as unknown as { role?: string; status?: string });
        if (payload?.role) role = payload.role;
        if (payload?.status) status = payload.status;
      }

      if (membersRes.status === 'fulfilled') {
        const memberList = membersRes.value?.data || [];
        const found = memberList.find((m) => m.member?.userId === user.id);
        if (found?.member?.tags) {
          tags = found.member.tags;
        }
      }

      setUserMembership({ role, status, tags });

      // Parse user rankings in this club
      if (rankingRes.status === 'fulfilled') {
        const ownRank = rankingRes.value.communityRanks?.find(
          (r) => r.communityId === communityId
        );
        setUserRanking(ownRank || null);
      }
    }).finally(() => {
      if (isMounted) setIsLoadingUserClubInfo(false);
    });

    return () => {
      isMounted = false;
    };
  }, [communityId, user?.id]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (active) {
        await fetchClubMatches();
      }
    })();

    return () => {
      active = false;
    };
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

  // Active matches list: if demo mode is enabled or if no real matches found, use MOCK_CLUB_MATCHES
  const effectiveMatches = useMemo(() => {
    if (isDemoMode) return MOCK_CLUB_MATCHES;
    if (matches.length === 0 && !isLoading) return MOCK_CLUB_MATCHES;
    return matches;
  }, [matches, isDemoMode, isLoading]);

  const isShowingMock = (isDemoMode || (matches.length === 0 && !isLoading)) && effectiveMatches.length > 0;

  // Streaks map
  const streaksMap = useMemo(() => {
    return computeChronologicalStreaks(effectiveMatches);
  }, [effectiveMatches]);

  // Filter and sort for timeline view
  const timelineMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentUserId = user?.id;
    const currentUserName = (user?.fullName || '').toLowerCase();

    return effectiveMatches
      .filter((m) => {
        if (filter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
        if (filter === 'ONGOING' && m.status !== 'ONGOING') return false;

        if (filter === 'MY_MATCHES') {
          if (!currentUserId && !currentUserName) return false;
          const p1Id = m.participant1Id || m.participant1?.id;
          const p2Id = m.participant2Id || m.participant2?.id;
          const isP1 = p1Id === currentUserId || (m.participant1?.members || []).some((mem) => mem.userId === currentUserId);
          const isP2 = p2Id === currentUserId || (m.participant2?.members || []).some((mem) => mem.userId === currentUserId);
          const t1Name = (m.participant1?.teamName || '').toLowerCase();
          const t2Name = (m.participant2?.teamName || '').toLowerCase();
          const nameMatch = currentUserName && (t1Name.includes(currentUserName) || t2Name.includes(currentUserName));
          if (!isP1 && !isP2 && !nameMatch) return false;
        }

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
  }, [effectiveMatches, filter, searchQuery, user?.id, user?.fullName]);

  // Compute user matches count in this club
  const userMatchesCount = useMemo(() => {
    if (!user?.id && !user?.fullName) return 0;
    const currentUserId = user?.id;
    const currentUserName = (user?.fullName || '').toLowerCase();

    return effectiveMatches.filter((m) => {
      const p1Id = m.participant1Id || m.participant1?.id;
      const p2Id = m.participant2Id || m.participant2?.id;
      const isP1 = p1Id === currentUserId || (m.participant1?.members || []).some((mem) => mem.userId === currentUserId);
      const isP2 = p2Id === currentUserId || (m.participant2?.members || []).some((mem) => mem.userId === currentUserId);
      const t1Name = (m.participant1?.teamName || '').toLowerCase();
      const t2Name = (m.participant2?.teamName || '').toLowerCase();
      return isP1 || isP2 || (currentUserName && (t1Name.includes(currentUserName) || t2Name.includes(currentUserName)));
    }).length;
  }, [effectiveMatches, user?.id, user?.fullName]);

  return (
    <div className="space-y-6">
      {/* 🏅 My Club Profile Banner (Linear / Clean Anti-Slop HUD) */}
      {user?.id && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: User Identity, Role, Tags */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName || 'Me'} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
                  )}
                </div>
                {userMembership?.role === 'OWNER' && (
                  <span title="Chủ nhiệm CLB" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white shadow-2xs">
                    <Crown className="w-3 h-3" />
                  </span>
                )}
                {userMembership?.role === 'MODERATOR' && (
                  <span title="Quản trị viên CLB" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-2xs">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {user.fullName || 'Thành viên'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {userMembership?.role === 'OWNER'
                      ? 'Chủ nhiệm'
                      : userMembership?.role === 'MODERATOR'
                      ? 'Ban quản trị'
                      : 'Thành viên'}
                  </span>
                  {/* Member Tags */}
                  {userMembership?.tags && userMembership.tags.length > 0 && (
                    userMembership.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/60"
                      >
                        {t}
                      </span>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hồ sơ và thông số thi đấu của bạn trong câu lạc bộ
                </p>
              </div>
            </div>

            {/* Right: Quick Telemetry Pills (Anti-slop Monospace Metrics) */}
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              {/* ELO Telemetry */}
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điểm CLB</p>
                <p className="text-sm font-black font-mono text-blue-700">
                  {userRanking?.eloPoints ? `${userRanking.eloPoints} ELO` : 'Chưa xếp hạng'}
                </p>
              </div>

              {/* Matches Record */}
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trận trong CLB</p>
                <p className="text-sm font-black font-mono text-slate-800">
                  {userMatchesCount} trận
                </p>
              </div>

              {/* Win Streak / Form */}
              {userRanking && typeof userRanking.winStreak === 'number' && userRanking.winStreak > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 justify-end">
                    <Flame className="w-3 h-3" /> Phong độ
                  </p>
                  <p className="text-sm font-black font-mono text-emerald-700">
                    W{userRanking.winStreak}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header bar: Title & Subtitle + Search & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Hoạt động câu lạc bộ
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {effectiveMatches.length} trận đấu
            </span>
            {isShowingMock && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                Dữ liệu mẫu (Demo Mock)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dòng sự kiện trận đấu và chuỗi phong độ (Streak) của các thành viên trong câu lạc bộ
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Demo Mode toggle button */}
          <button
            type="button"
            onClick={() => setIsDemoMode((prev) => !prev)}
            className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${
              isDemoMode
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isDemoMode ? 'Đang bật Mock' : 'Xem Mock'}
          </button>

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
            {user?.id && (
              <button
                type="button"
                onClick={() => setFilter('MY_MATCHES')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  filter === 'MY_MATCHES'
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <span>Trận của tôi</span>
                {userMatchesCount > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${filter === 'MY_MATCHES' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                    {userMatchesCount}
                  </span>
                )}
              </button>
            )}
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
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 transition-colors w-36 sm:w-44"
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
            {filter === 'MY_MATCHES'
              ? 'Bạn chưa tham gia trận đấu nào trong câu lạc bộ này.'
              : 'Khi các giải đấu trong câu lạc bộ khởi tranh và diễn ra, diễn biến trận đấu sẽ hiển thị tại đây.'}
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
                      {/* Match Format badge */}
                      {sets.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {sets.length > 1 ? `Bo${sets.length}` : '1 Set'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOngoing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                          Đang diễn ra
                        </span>
                      )}
                      {/* Match Duration if completed */}
                      {isCompleted && match.startedAt && match.completedAt && (
                        (() => {
                          const durationMin = Math.max(1, Math.round((new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime()) / 60000));
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium bg-slate-50 text-slate-500 border border-slate-200/80">
                              {durationMin} phút
                            </span>
                          );
                        })()
                      )}
                      {displayTime && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {displayTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams & Set Scores Panel */}
                  <div className="p-4 space-y-3">
                    {/* Header showing S1, S2, S3... above score columns */}
                    {sets.length > 0 && (
                      <div className="flex justify-end gap-1.5 pr-0.5 font-mono text-[9px] font-bold text-slate-400">
                        {sets.map((_, index) => (
                          <span key={index} className="w-7 text-center">S{index + 1}</span>
                        ))}
                      </div>
                    )}

                    {/* Team 1 Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isP1Winner
                              ? 'bg-blue-600 text-white shadow-2xs'
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

                      {/* Set Scores for Team 1 */}
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        {sets.length > 0 ? (
                          sets.map((s, idx) => {
                            const s1 = s.team1Score;
                            const s2 = s.team2Score;
                            const isSetWinner = typeof s1 === 'number' && typeof s2 === 'number' && s1 > s2;
                            return (
                              <span
                                key={idx}
                                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                                  isSetWinner
                                    ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                                    : 'bg-slate-100 text-slate-700 font-semibold'
                                }`}
                              >
                                {s1 ?? '-'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded bg-slate-100 text-slate-700">
                            {match.p1SetsWon ?? 0}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team 2 Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isP2Winner
                              ? 'bg-blue-600 text-white shadow-2xs'
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

                      {/* Set Scores for Team 2 */}
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        {sets.length > 0 ? (
                          sets.map((s, idx) => {
                            const s1 = s.team1Score;
                            const s2 = s.team2Score;
                            const isSetWinner = typeof s1 === 'number' && typeof s2 === 'number' && s2 > s1;
                            return (
                              <span
                                key={idx}
                                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                                  isSetWinner
                                    ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                                    : 'bg-slate-100 text-slate-700 font-semibold'
                                }`}
                              >
                                {s2 ?? '-'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded bg-slate-100 text-slate-700">
                            {match.p2SetsWon ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer details: Time, Location & Action link */}
                  <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 flex-wrap">
                      {courtLabel && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {courtLabel}
                        </span>
                      )}
                      {displayTime && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {displayTime}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/live/${match.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors group/btn shrink-0"
                    >
                      <span>{matchTranslate('detailsAction') || 'Chi tiết'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 group-hover/btn:text-blue-600 transition-all" />
                    </Link>
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
