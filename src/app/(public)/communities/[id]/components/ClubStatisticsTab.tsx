'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  BarChart2,
  Trophy,
  Flame,
  TrendingUp,
  RotateCcw,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { communitiesApi } from '@/features/communities/api';
import { matchesApi } from '@/features/matches/api';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import type { ClubSessionMatch } from '@/types/club-match-session';
import type { Match } from '@/types/match';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';

interface Props {
  communityId: string;
  clubName?: string;
}

type Period = '7D' | '1M' | '3M' | 'ALL';

interface MemberStat {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isMock: boolean;
  wins: number;
  losses: number;
  currentStreak: number;
  isCurrentStreakWin: boolean;
  bestWinStreak: number;
  history: boolean[];
}

interface NormalizedMatch {
  id: string;
  isCompleted: boolean;
  score1: number;
  score2: number;
  date: Date | null;
  sideAMembers: Array<{ userId?: string; fullName?: string; avatarUrl?: string | null; isMock?: boolean }>;
  sideBMembers: Array<{ userId?: string; fullName?: string; avatarUrl?: string | null; isMock?: boolean }>;
}

export default function ClubStatisticsTab({ communityId }: Props) {
  const translate = useTranslations('Common');
  const { openUserProfile } = useUserProfileModalStore();

  const [period, setPeriod] = useState<Period>('1M');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<NormalizedMatch[]>([]);

  const loadStatsData = useCallback(async () => {
    if (!communityId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const normalizedMatches: NormalizedMatch[] = [];

      // 1. Tải các giải đấu của CLB và lấy trận đấu (tối đa 6 giải)
      const tourFetchPromise = (async () => {
        try {
          const tourRes = await communitiesApi.getTournaments(communityId);
          const tourList = Array.isArray(tourRes?.data) ? tourRes.data : [];
          const recentTours = tourList.slice(0, 6);

          const matchPromises = recentTours.map(async (t) => {
            try {
              const res = await matchesApi.getMatches({
                tournament_id: t.id,
                limit: 50,
                status: '',
              });
              const rawMatches = Array.isArray(res?.data) ? res.data : [];
              return rawMatches.map((m: Match): NormalizedMatch => {
                const isCompleted = m.status === 'COMPLETED';
                const s1 = m.scoreDetails?.team1Score !== undefined ? Number(m.scoreDetails.team1Score) : 0;
                const s2 = m.scoreDetails?.team2Score !== undefined ? Number(m.scoreDetails.team2Score) : 0;
                const matchDate = m.completedAt || m.startedAt || m.scheduledAt || m.updatedAt ? new Date(m.completedAt || m.startedAt || m.scheduledAt || m.updatedAt) : null;

                const sideA = (m.participant1?.members || []).map((mem) => ({
                  userId: mem.userId,
                  fullName: mem.fullName || m.participant1?.teamName || '',
                  avatarUrl: mem.avatarUrl,
                  isMock: mem.isMock ?? m.participant1?.isMock,
                }));
                const sideB = (m.participant2?.members || []).map((mem) => ({
                  userId: mem.userId,
                  fullName: mem.fullName || m.participant2?.teamName || '',
                  avatarUrl: mem.avatarUrl,
                  isMock: mem.isMock ?? m.participant2?.isMock,
                }));

                return {
                  id: m.id,
                  isCompleted,
                  score1: s1,
                  score2: s2,
                  date: matchDate,
                  sideAMembers: sideA,
                  sideBMembers: sideB,
                };
              });
            } catch {
              return [] as NormalizedMatch[];
            }
          });

          const results = await Promise.all(matchPromises);
          normalizedMatches.push(...results.flat());
        } catch (err) {
          console.warn('Failed to load tournaments for stats', err);
        }
      })();

      // 2. Tải buổi giao lưu (sessions)
      const sessionFetchPromise = (async () => {
        try {
          const sessionPage = await clubMatchSessionsApi.list(communityId, { limit: 20 });
          const sessions = sessionPage.data || [];

          const sessionPromises = sessions.map(async (session) => {
            try {
              const matchPage = await clubMatchSessionsApi.matches(session.id, { limit: 50 });
              const sMatches = matchPage.data || [];

              return sMatches.map((sm: ClubSessionMatch): NormalizedMatch => {
                const isCompleted = sm.status === 'COMPLETED';
                const dateStr = sm.completedAt || sm.scheduledAt || session.startAt;
                const matchDate = dateStr ? new Date(dateStr) : null;

                const sideA = (sm.participant1?.members || []).map((mem) => ({
                  userId: mem.userId,
                  fullName: mem.fullName || '',
                  avatarUrl: mem.avatarUrl,
                  isMock: mem.isMock,
                }));
                const sideB = (sm.participant2?.members || []).map((mem) => ({
                  userId: mem.userId,
                  fullName: mem.fullName || '',
                  avatarUrl: mem.avatarUrl,
                  isMock: mem.isMock,
                }));

                return {
                  id: sm.id,
                  isCompleted,
                  score1: sm.p1SetsWon ?? 0,
                  score2: sm.p2SetsWon ?? 0,
                  date: matchDate,
                  sideAMembers: sideA,
                  sideBMembers: sideB,
                };
              });
            } catch {
              return [] as NormalizedMatch[];
            }
          });

          const results = await Promise.all(sessionPromises);
          normalizedMatches.push(...results.flat());
        } catch (err) {
          console.warn('Failed to load sessions for stats', err);
        }
      })();

      // 3. Tải trận riêng lẻ (standalone)
      const standaloneFetchPromise = (async () => {
        try {
          const standalonePage = await clubMatchSessionsApi.standaloneMatches(communityId, { limit: 50 });
          const standaloneList = standalonePage.data || [];

          for (const sm of standaloneList) {
            const isCompleted = sm.status === 'COMPLETED';
            const dateStr = sm.completedAt || sm.scheduledAt;
            const matchDate = dateStr ? new Date(dateStr) : null;

            const sideA = (sm.participant1?.members || []).map((mem) => ({
              userId: mem.userId,
              fullName: mem.fullName || '',
              avatarUrl: mem.avatarUrl,
              isMock: mem.isMock,
            }));
            const sideB = (sm.participant2?.members || []).map((mem) => ({
              userId: mem.userId,
              fullName: mem.fullName || '',
              avatarUrl: mem.avatarUrl,
              isMock: mem.isMock,
            }));

            normalizedMatches.push({
              id: sm.id,
              isCompleted,
              score1: sm.p1SetsWon ?? 0,
              score2: sm.p2SetsWon ?? 0,
              date: matchDate,
              sideAMembers: sideA,
              sideBMembers: sideB,
            });
          }
        } catch (err) {
          console.warn('Failed to load standalone matches for stats', err);
        }
      })();

      await Promise.all([tourFetchPromise, sessionFetchPromise, standaloneFetchPromise]);

      // Deduplicate matches by ID
      const uniqueMap = new Map<string, NormalizedMatch>();
      for (const m of normalizedMatches) {
        uniqueMap.set(m.id, m);
      }
      setAllMatches(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error('Failed to load club statistics', err);
      setErrorMessage(translate('communityRetry'));
    } finally {
      setIsLoading(false);
    }
  }, [communityId, translate]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData]);

  // Bộ lọc thời gian
  const filteredMatches = React.useMemo(() => {
    const now = new Date();
    let threshold: Date | null = null;

    if (period === '7D') {
      threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '1M') {
      threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '3M') {
      threshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    if (!threshold) return allMatches;

    return allMatches.filter((m) => {
      if (!m.date) return true;
      return m.date >= threshold;
    });
  }, [allMatches, period]);

  // Thống kê thành viên
  const { completedMatches, memberStatsList, topWins, topStreak, topWinRate } = React.useMemo(() => {
    const completed = filteredMatches.filter((m) => m.isCompleted);
    // Sắp xếp tăng dần theo ngày để tính streak chính xác
    completed.sort((a, b) => {
      const tA = a.date ? a.date.getTime() : 0;
      const tB = b.date ? b.date.getTime() : 0;
      return tA - tB;
    });

    const statMap = new Map<string, MemberStat>();

    const recordMember = (
      mem: { userId?: string; fullName?: string; avatarUrl?: string | null; isMock?: boolean },
      won: boolean,
    ) => {
      if (mem.isMock) return;
      const uid = mem.userId?.trim();
      if (!uid) return;

      let stat = statMap.get(uid);
      if (!stat) {
        stat = {
          userId: uid,
          displayName: mem.fullName || translate('memberFallback'),
          avatarUrl: mem.avatarUrl || null,
          isMock: false,
          wins: 0,
          losses: 0,
          currentStreak: 0,
          isCurrentStreakWin: true,
          bestWinStreak: 0,
          history: [],
        };
        statMap.set(uid, stat);
      }

      if (won) {
        stat.wins += 1;
      } else {
        stat.losses += 1;
      }
      stat.history.push(won);

      // Recalculate streaks
      let tempStreak = 0;
      let maxStreak = 0;
      for (const res of stat.history) {
        if (res) {
          tempStreak += 1;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }
      stat.bestWinStreak = maxStreak;

      const lastRes = stat.history[stat.history.length - 1];
      stat.isCurrentStreakWin = lastRes;
      let cur = 0;
      for (let i = stat.history.length - 1; i >= 0; i--) {
        if (stat.history[i] === lastRes) {
          cur += 1;
        } else {
          break;
        }
      }
      stat.currentStreak = cur;
    };

    for (const match of completed) {
      const s1 = match.score1;
      const s2 = match.score2;
      if (s1 === s2) continue;

      const side1Won = s1 > s2;
      for (const m of match.sideAMembers) {
        recordMember(m, side1Won);
      }
      for (const m of match.sideBMembers) {
        recordMember(m, !side1Won);
      }
    }

    const list = Array.from(statMap.values());
    list.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const rateA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
      const rateB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
      if (rateB !== rateA) return rateB - rateA;
      return b.wins + b.losses - (a.wins + a.losses);
    });

    const activeMembers = list.filter((s) => s.wins + s.losses > 0);
    let bestWins: MemberStat | null = null;
    let bestStreak: MemberStat | null = null;
    let bestWinRate: MemberStat | null = null;

    if (activeMembers.length > 0) {
      bestWins = activeMembers.reduce((prev, cur) => (cur.wins > prev.wins ? cur : prev), activeMembers[0]);
      bestStreak = activeMembers.reduce((prev, cur) => (cur.bestWinStreak > prev.bestWinStreak ? cur : prev), activeMembers[0]);
      const qualified = activeMembers.filter((s) => s.wins + s.losses >= 3);
      if (qualified.length > 0) {
        bestWinRate = qualified.reduce((prev, cur) => {
          const rPrev = prev.wins / (prev.wins + prev.losses);
          const rCur = cur.wins / (cur.wins + cur.losses);
          return rCur > rPrev ? cur : prev;
        }, qualified[0]);
      }
    }

    return {
      completedMatches: completed,
      memberStatsList: list,
      topWins: bestWins,
      topStreak: bestStreak,
      topWinRate: bestWinRate,
    };
  }, [filteredMatches, translate]);

  const handleMemberClick = (stat: MemberStat, event: React.MouseEvent) => {
    if (!stat.userId || stat.isMock) return;
    const rect = event.currentTarget.getBoundingClientRect();
    openUserProfile(
      {
        id: stat.userId,
        fullName: stat.displayName,
        avatarUrl: stat.avatarUrl,
      },
      rect,
      communityId,
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pt-2 animate-pulse">
        {/* Filter pills skeleton */}
        <div className="flex gap-2">
          {[56, 72, 72, 60].map((w, idx) => (
            <div key={idx} className="h-9 rounded-xl bg-slate-200" style={{ width: w }} />
          ))}
        </div>

        {/* Overview cards skeleton */}
        <div className="grid grid-cols-3 gap-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-2">
              <div className="h-6 w-12 bg-slate-200 rounded-md" />
              <div className="h-3.5 w-16 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>

        {/* Spotlight skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs" />
            ))}
          </div>
        </div>

        {/* Member performance list skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-44 bg-slate-200 rounded-md" />
          <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 p-2 shadow-xs">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-5 h-4 bg-slate-200 rounded" />
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-5 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-medium mb-4">{errorMessage}</p>
        <button
          onClick={loadStatsData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
          {translate('communityRetry')}
        </button>
      </div>
    );
  }

  const totalMatchesCount = filteredMatches.length;
  const completedCount = completedMatches.length;
  const activeMembersCount = memberStatsList.filter((s) => s.wins + s.losses > 0).length;

  return (
    <div className="space-y-6 pt-1">
      {/* 1. Time Period Filters (Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        {(
          [
            { id: '7D', label: translate('clubStatsFilter7D') },
            { id: '1M', label: translate('clubStatsFilter1M') },
            { id: '3M', label: translate('clubStatsFilter3M') },
            { id: 'ALL', label: translate('clubStatsFilterAll') },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setPeriod(item.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              period === item.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 2. Overview Metric Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
            <Trophy className="w-4 h-4 shrink-0" />
            <span className="text-xl sm:text-2xl font-black">{totalMatchesCount}</span>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate max-w-full">
            {translate('clubStatsTotalMatches')}
          </span>
        </div>

        <div className="border-x border-slate-100 flex flex-col items-center justify-center text-center px-1">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xl sm:text-2xl font-black">{completedCount}</span>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate max-w-full">
            {translate('completed')}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-xl sm:text-2xl font-black">{activeMembersCount}</span>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate max-w-full">
            {translate('membersTab')}
          </span>
        </div>
      </div>

      {/* 3. Gương mặt nổi bật (Spotlight) */}
      {topWins && topWins.wins > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            {translate('clubStatsSpotlightTitle')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Top Wins */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => handleMemberClick(topWins, e)}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  {translate('clubStatsTopWins')}
                </span>
                <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  {topWins.wins} {translate('clubStatsWins')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center font-bold text-amber-700 shrink-0 relative overflow-hidden">
                  {topWins.avatarUrl ? (
                    <Image src={topWins.avatarUrl} alt={topWins.displayName} fill className="object-cover" />
                  ) : (
                    topWins.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{topWins.displayName}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {Math.round((topWins.wins / (topWins.wins + topWins.losses)) * 100)}% {translate('clubStatsWinRate')}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Win Streak */}
            {topStreak && topStreak.bestWinStreak >= 2 && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => handleMemberClick(topStreak, e)}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    {translate('clubStatsTopStreak')}
                  </span>
                  <span className="text-xs font-black text-orange-700 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-full">
                    {topStreak.bestWinStreak} {translate('clubStatsWins')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200/80 flex items-center justify-center font-bold text-orange-700 shrink-0 relative overflow-hidden">
                    {topStreak.avatarUrl ? (
                      <Image src={topStreak.avatarUrl} alt={topStreak.displayName} fill className="object-cover" />
                    ) : (
                      topStreak.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{topStreak.displayName}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {topStreak.wins}T - {topStreak.losses}B
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Highest Win Rate */}
            {topWinRate && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => handleMemberClick(topWinRate, e)}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {translate('clubStatsHighestWinRate')}
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    {Math.round((topWinRate.wins / (topWinRate.wins + topWinRate.losses)) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center font-bold text-emerald-700 shrink-0 relative overflow-hidden">
                    {topWinRate.avatarUrl ? (
                      <Image src={topWinRate.avatarUrl} alt={topWinRate.displayName} fill className="object-cover" />
                    ) : (
                      topWinRate.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{topWinRate.displayName}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {topWinRate.wins}T - {topWinRate.losses}B ({topWinRate.wins + topWinRate.losses} {translate('clubStatsTotalMatches').toLowerCase()})
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Bảng thành tích thành viên */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-blue-600" />
          {translate('clubStatsMemberListTitle')} ({memberStatsList.length})
        </h3>

        {memberStatsList.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs">
            <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-semibold">{translate('clubStatsEmptyData')}</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {memberStatsList.map((stat, idx) => {
              const rank = idx + 1;
              const total = stat.wins + stat.losses;
              const rate = total > 0 ? Math.round((stat.wins / total) * 100) : 0;

              let rankBadgeStyle = 'text-slate-400 font-extrabold';
              if (rank === 1) rankBadgeStyle = 'text-amber-500 font-black';
              else if (rank === 2) rankBadgeStyle = 'text-slate-500 font-black';
              else if (rank === 3) rankBadgeStyle = 'text-amber-700 font-black';

              const streakBadge =
                stat.currentStreak >= 2 ? (stat.isCurrentStreakWin ? `🔥 ${stat.currentStreak}` : `↘ ${stat.currentStreak}`) : null;

              return (
                <div
                  key={stat.userId}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleMemberClick(stat, e)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  {/* Rank */}
                  <span className={`w-5 text-center text-xs shrink-0 ${rankBadgeStyle}`}>{rank}</span>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 relative overflow-hidden">
                    {stat.avatarUrl ? (
                      <Image src={stat.avatarUrl} alt={stat.displayName} fill className="object-cover" />
                    ) : (
                      stat.displayName.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{stat.displayName}</p>
                      {streakBadge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                            stat.isCurrentStreakWin
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {streakBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {total} trận · {stat.wins}T - {stat.losses}B
                    </p>
                  </div>

                  {/* Rate */}
                  <div className="text-right shrink-0">
                    <span className={`text-sm sm:text-base font-black tabular-nums ${rate >= 50 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {rate}%
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold">{translate('clubStatsWinRate')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
