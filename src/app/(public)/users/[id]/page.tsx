'use client';

import { useEffect, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import { Trophy, Award, Calendar, ArrowLeft, Loader2, Sparkles, Star, Zap, User, Camera, ShieldCheck, MapPin, Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buildMatchScoreSummary } from '@/features/matches/score-display';
import { formatDate } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { rankingsApi, PlayerRanking, EloHistoryLog } from '@/features/rankings/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getErrorMessage } from '@/utils/error';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { RankAvatar } from '@/components/ui/RankAvatar';
import { ReportViolationButton } from '@/features/reports/components/ReportViolationButton';
import { useAuthStore } from '@/lib/zustand/authStore';
import { BRAND } from '@/constants/brand';
import { isPublicRankingEligible } from '@/features/rankings/elo-display';

interface UserRank {
  categoryId: string;
  categoryName: string;
  matchType: string;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  adminLeaderboardEligible?: boolean;
  currentStreakType?: 'WIN' | 'LOSS' | 'NONE';
  currentStreakCount?: number;
  tierName?: string | null;
  partnerName?: string | null;
}

interface PublicProfile {
  id: string;
  createdAt: string;
  isMock?: boolean;
  fullName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  gender: string | null;
  bio: string | null;
  isVerified: boolean;
  role?: string;
  roles?: string[];
  ranks: UserRank[];
  pairRanks?: UserRank[];
  achievements?: {
    tournamentId: string;
    tournamentName: string;
    rank: 1 | 2 | 3;
    completedAt: string | null;
    tournamentDate: string | null;
  }[];
}

interface Match {
  id: string;
  roundNumber: number;
  status: string;
  participant1: {
    id: string;
    teamName: string;
    isMock?: boolean;
    members?: { userId?: string; isMock?: boolean }[];
  } | null;
  participant2: {
    id: string;
    teamName: string;
    isMock?: boolean;
    members?: { userId?: string; isMock?: boolean }[];
  } | null;
  p1SetsWon: number;
  p2SetsWon: number;
  scoreDetails?: Record<string, unknown> | null;
  winnerId: string | null;
  completedAt: string | null;
  group?: {
    name: string;
    stage?: {
      name: string;
    };
  } | null;
}

function isMockInvolvedMatch(match: Match): boolean {
  const isMockParticipant = (participant: Match['participant1']) =>
    participant?.isMock === true || participant?.members?.some((member) => member.isMock === true) === true;
  return isMockParticipant(match.participant1) || isMockParticipant(match.participant2);
}

function hasUserInMatch(match: Match, userId: string): boolean {
  return Boolean(
    match.participant1?.members?.some((member) => member.userId === userId) ||
    match.participant2?.members?.some((member) => member.userId === userId),
  );
}

export default function PublicUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const translate = useTranslations('PublicProfile');
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'achievements' | 'elo'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideEloSection = profile?.isMock === true;
  const tabs = hideEloSection
    ? [
        { id: 'overview', label: translate('overview') },
        { id: 'matches', label: translate('matches') },
        { id: 'achievements', label: translate('achievements') },
      ] as const
    : [
        { id: 'overview', label: translate('overview') },
        { id: 'matches', label: translate('matches') },
        { id: 'achievements', label: translate('achievements') },
        { id: 'elo', label: translate('elo') },
      ] as const;

  useEffect(() => {
    if (!hideEloSection || activeTab !== 'elo') return;
    const resetTabTimer = window.setTimeout(() => setActiveTab('overview'), 0);
    return () => window.clearTimeout(resetTabTimer);
  }, [activeTab, hideEloSection]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (user?.id === id) {
      router.replace('/profile');
      return;
    }

    const fetchPublicData = async () => {

      setIsLoading(true);
      try {
        const [profileResult, matchesResult, eloHistoryResult] = await Promise.allSettled([
          api.get<ApiResponse<PublicProfile>>(`/users/${id}/public`),
          api.get<ApiResponse<Match[]>>(`/matches?userId=${id}&limit=10`),
          rankingsApi.getUserEloHistory(id),
        ]);

        if (profileResult.status === 'rejected') {
          throw profileResult.reason;
        }

        setProfile(profileResult.value.data);
        const publicMatches = matchesResult.status === 'fulfilled' ? matchesResult.value.data || [] : [];
        setMatches(publicMatches.filter((match) => hasUserInMatch(match, id) && !isMockInvolvedMatch(match)));

        setEloHistory(eloHistoryResult.status === 'fulfilled' ? eloHistoryResult.value?.data || [] : []);
      } catch (err: unknown) {
        console.error('Failed to fetch public profile:', err);
        setError(getErrorMessage(err) || translate('loadError'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicData();
  }, [hasHydrated, id, router, user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-bold text-sm">{translate('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
        <div className="text-center bg-white border border-slate-200 p-8 rounded-xl max-w-md shadow-lg">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <img src={BRAND.assets.logoIcon} alt={BRAND.name} className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error || translate('notFoundTitle')}</h2>
          <p className="text-slate-500 text-sm mb-6 font-medium">{translate('notFoundDescription')}</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md"
          >
            {translate('backHome')}
          </Link>
        </div>
      </div>
    );
  }

  const getMatchTypeLabel = (matchType: string) => {
    return translate(matchType === 'SINGLES' ? 'singles' : 'doubles');
  };

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return translate('notUpdated');
    return translate(gender === 'MALE' ? 'male' : gender === 'FEMALE' ? 'female' : 'other');
  };

  const displayedRanks = [...(profile.ranks || []), ...(profile.pairRanks || [])];

  const getHistoryResult = (item: EloHistoryLog) =>
    item.match?.result ?? (item.changedPoints > 0 ? 'WIN' : item.changedPoints < 0 ? 'LOSS' : 'DRAW');

  const getHistoryScore = (item: EloHistoryLog) => {
    const match = item.match;
    const football = match?.scoreDetails?.football;
    if (football && typeof football === 'object' && !Array.isArray(football)) {
      const value = football as Record<string, unknown>;
      const team1Goals = Number(value.team1Goals);
      const team2Goals = Number(value.team2Goals);
      if (Number.isFinite(team1Goals) && Number.isFinite(team2Goals)) {
        return `${team1Goals}-${team2Goals}`;
      }
    }
    if (typeof match?.p1SetsWon === 'number' && typeof match?.p2SetsWon === 'number') {
      return `${match.p1SetsWon}-${match.p2SetsWon}`;
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {translate('back')}
        </button>
        <ReportViolationButton
          targetType="USER"
          targetId={profile.id}
          targetLabel={profile.fullName}
          hidden={user?.id === profile.id}
        />
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        {/* Cover Photo */}
        <div className="h-56 bg-slate-900 relative group overflow-hidden">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-650 to-purple-650 opacity-90"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          {/* Avatar & Info */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 -mt-16 mb-5 relative z-10">
            {(() => {
              const featuredRank = displayedRanks
                .filter(isPublicRankingEligible)
                .sort((a, b) => b.eloPoints - a.eloPoints)[0];
              return (
                <RankAvatar
                  src={profile.avatarUrl}
                  name={profile.fullName}
                  elo={featuredRank?.eloPoints}
                  tierName={featuredRank?.tierName}
                  categoryName={featuredRank?.categoryName}
                  matchesPlayed={featuredRank?.matchesPlayed || 0}
                  size="lg"
                  ringClassName="ring-4 shadow-xl transition-transform duration-300 hover:scale-[1.03]"
                />
              );
            })()}
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                {profile.fullName}
                {profile.isVerified && (
                  <span title={translate('verifiedMember')} className="bg-blue-50 p-1 rounded-full border border-blue-200">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </span>
                )}
              </h1>
            </div>

      <div className="flex flex-wrap items-center gap-2">
              {Array.from(new Set(profile.roles || (profile.role ? [profile.role] : ['PLAYER']))).map((role: string) => {
                let roleLabel = translate('player');
                let roleColor = 'bg-[#e0f2fe] text-[#1e3a8a]';
                if (role === 'ORGANIZER') {
                  roleLabel = translate('organizer');
                  roleColor = 'bg-[#f3e8ff] text-[#6b21a8]';
                } else if (role === 'ADMIN') {
                  roleLabel = translate('admin');
                  roleColor = 'bg-[#fdf2e9] text-[#991b1b]';
                }
                return (
                  <span key={role} className={`px-3.5 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider ${roleColor}`}>
                    {roleLabel}
                  </span>
                );
              })}
              {profile.isVerified && (
                <span className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-[#dcfce7] text-[#166534] uppercase tracking-wider">
                  {translate('verified')}
                </span>
              )}
              {!hideEloSection && (() => {
                const activeRanks = displayedRanks.filter(isPublicRankingEligible);
                if (activeRanks.length > 0) {
                  return activeRanks.map((rank) => (
                    <EloTierBadge
                      key={`${rank.categoryId}-${rank.matchType}`}
                      elo={rank.eloPoints}
                      tierName={rank.tierName || undefined}
                      categoryName={rank.categoryName}
                      size="sm"
                    />
                  ));
                }
                return (
                  <span className="bg-[#f3f4f6] text-[#4b5563] px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider">
                    {translate('unranked')}
                  </span>
                );
              })()}
              {profile.achievements?.length ? (
                <span className="bg-slate-50 border border-slate-200 text-slate-600 px-3.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-blue-500" /> {profile.achievements.length} {translate('achievementsLabel')}
                </span>
              ) : null}
              {profile.createdAt && (
                <span className="bg-[#f3f4f6] text-[#4b5563] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {translate('memberSince')} {formatDate(profile.createdAt, 'MM/yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-1 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer -mb-[2px] ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-550 border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full min-w-0 min-h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1 flex flex-col gap-6">
            {/* {translate('about')} */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{translate('about')}</h3>
              {profile.bio ? (
                <p className="text-slate-650 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-slate-400 text-sm italic font-medium">
                  {translate('bioEmpty')}
                </p>
              )}
            </div>

            {/* {translate('detailsHeading')} */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{translate('detailsHeading')}</h3>
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                  <span className="text-slate-500 font-medium">{translate('gender')}</span>
                  <span className="text-slate-900 font-semibold">{getGenderLabel(profile.gender)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 w-full min-w-0 space-y-6">
            {activeTab === 'overview' && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center py-12 border-dashed">
                <Activity className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                <p className="text-slate-550 font-semibold text-lg">{translate('noActivity')}</p>
                <p className="text-slate-450 text-xs font-medium mt-1">{translate('activityEmptyHint')}</p>
              </div>
            )}

        {activeTab === 'matches' && (
          <div className="w-full min-w-0 space-y-6">
            {matches.length > 0 ? (
              <div className="w-full flex flex-col gap-4">
                {matches.map((match) => {
                  const isCompleted = match.status === 'COMPLETED';
                  const isP1 = Boolean(match.participant1?.members?.some((member) => member.userId === profile.id));
                  const isP2 = Boolean(match.participant2?.members?.some((member) => member.userId === profile.id));

                  const isWinner = isCompleted && match.winnerId && (
                    (match.winnerId === match.participant1?.id && isP1) ||
                    (match.winnerId === match.participant2?.id && isP2)
                  );

                  const opponentName = isP1
                    ? match.participant2?.teamName || translate('unknown')
                    : isP2
                      ? match.participant1?.teamName || translate('unknown')
                      : translate('unknown');

                  return (
                    <div
                      key={match.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <span>{match.group?.stage?.name || translate('tournament')}</span>
                          <span>•</span>
                          <span>{translate('round')} {match.roundNumber}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">{translate('opponent')}:</span>
                          <span className="text-blue-600 font-bold">{opponentName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-sm font-bold text-slate-700 tabular-nums">
                          {buildMatchScoreSummary({
                            p1SetsWon: match.p1SetsWon,
                            p2SetsWon: match.p2SetsWon,
                            scoreDetails: match.scoreDetails as Record<string, unknown> | null | undefined,
                            tournament: { sportRules: null },
                          })}
                        </div>

                        {isCompleted ? (
                          isWinner ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                              {translate('win')}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                              {translate('loss')}
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                            {translate('inProgress')}
                          </span>
                        )}

                        <Link
                          href={`/live/${match.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-750 flex items-center gap-1 shrink-0"
                        >
                          {translate('details')} <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed">
                <Activity className="w-16 h-16 text-slate-350 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">{translate('noMatchesTitle')}</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
                  {translate('noRecentMatches')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="w-full min-w-0 space-y-6">
            <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate('achievementsHeading')}</h3>
              </div>
              {profile.achievements && profile.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...profile.achievements]
                    .sort((a, b) => a.rank - b.rank || (b.completedAt || '').localeCompare(a.completedAt || ''))
                    .map((item) => {
                      const badgeClass =
                        item.rank === 1
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.rank === 2
                            ? 'bg-slate-50 text-slate-700 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200';
                      const title = item.rank === 1 ? translate('champion') : item.rank === 2 ? translate('runnerUp') : translate('thirdPlace');

                      return (
                        <div key={`${item.tournamentId}-${item.rank}`} className={`rounded-lg border p-4 shadow-sm ${badgeClass}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border bg-white ${badgeClass}`}>
                                {title}
                              </span>
                              <h4 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{item.tournamentName}</h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {item.tournamentDate ? formatDate(item.tournamentDate, 'dd/MM/yyyy') : translate('noEndDate')}
                              </p>
                            </div>
                            <div className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center font-bold bg-white ${badgeClass}`}>
                              {item.rank}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-lg">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold">{translate('noAchievements')}</p>
                  <p className="text-slate-400 text-sm mt-1">{translate('achievementsHint')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!hideEloSection && activeTab === 'elo' && (
          <div className="w-full min-w-0 space-y-6">
            <div className="w-full flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate('eloTier')}</h3>
                </div>

                {displayedRanks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayedRanks.map((rank) => {
                      const streakType = rank.currentStreakType ?? (rank.winStreak > 0 ? 'WIN' : 'NONE');
                      const streakCount = rank.currentStreakCount ?? rank.winStreak;
                      const streakLabel = streakType === 'WIN'
                        ? translate('currentWinStreak')
                        : streakType === 'LOSS'
                          ? translate('currentLossStreak')
                          : translate('noCurrentStreak');
                      const streakClass = streakType === 'WIN'
                        ? 'text-blue-600'
                        : streakType === 'LOSS'
                          ? 'text-rose-600'
                          : 'text-slate-400';
                      const streakIconClass = streakType === 'WIN'
                        ? 'fill-blue-500 text-blue-600'
                        : streakType === 'LOSS'
                          ? 'fill-rose-500 text-rose-600'
                          : 'text-slate-400';

                      return (
                      <div key={`${rank.categoryId}-${rank.matchType}`} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="space-y-1.5 flex-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                            {rank.categoryName} • {getMatchTypeLabel(rank.matchType)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                            <h4 className="font-bold text-slate-900 text-base">{rank.eloPoints} ELO {rank.partnerName ? `• {translate('withPartner')} ${rank.partnerName}` : ''}</h4>
                            <EloTierBadge elo={rank.eloPoints} tierName={rank.tierName || undefined} categoryName={rank.categoryName} size="sm" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                               <div className="text-[10px] text-slate-400 font-bold uppercase">{translate('matches')}</div>
                              <div className="font-bold text-slate-700 mt-0.5">{rank.matchesPlayed}</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{translate('win')}</div>
                              <div className="font-bold text-blue-600 mt-0.5">{rank.matchesWon}</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{translate('currentStreak')}</div>
                              <div className={`font-bold ${streakClass} mt-0.5 flex items-center justify-center gap-1`} title={streakLabel}>
                                <Zap className={`w-3 h-3 ${streakIconClass}`} />
                                <span>{streakType === 'NONE' ? '—' : streakCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-dashed border-slate-200 p-8 text-center">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-700 text-sm font-bold">{translate('eloNoMatches')}</p>
                    <p className="text-slate-400 text-xs mt-1">{translate('eloNoMatchesHint')}</p>
                  </div>
                )}
              </div>

              {eloHistory.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">{translate('eloOverTime')}</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...eloHistory].reverse().map((item, index) => ({
                          name: `${translate('matchNumber', { number: index + 1 })}`,
                          'ELO': item.newElo,
                          date: formatDate(item.createdAt, 'dd/MM/yyyy'),
                          reason: item.reason || translate(item.changedPoints > 0 ? 'win' : 'loss'),
                          tournament: item.match?.tournamentName || translate('tournament')
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 text-xs shadow-md">
                                  <p className="font-bold">{data.date}</p>
                                  <p className="text-blue-400 mt-1 font-bold">ELO: {data.ELO}</p>
                                  <p className="text-slate-400 mt-0.5">{data.reason}</p>
                                  <p className="text-slate-500 text-[10px] mt-0.5">{data.tournament}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ELO"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{translate('eloHistory')}</h3>
                {eloHistory.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {eloHistory.map((item) => {
                      const result = getHistoryResult(item);
                      const score = getHistoryScore(item);
                      const isWin = result === 'WIN';
                      const isLoss = result === 'LOSS';
                      const isGain = item.changedPoints > 0;
                      return (
                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 last:border-b-0">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                  isWin ? 'bg-blue-50 text-blue-700' : isLoss ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {isWin ? translate('win') : isLoss ? translate('loss') : translate('drawResult')}
                                </span>
                                <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.match?.tournamentName || translate('rankingMatch')}</p>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{formatDate(item.createdAt, 'dd/MM/yyyy HH:mm')} · {translate('officialMatch')}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-600">
                                <span><strong>{translate('opponent')}:</strong> {item.match?.opponent?.name || translate('unknownOpponent')}</span>
                                {score && <span><strong>{translate('score')}:</strong> {score}</span>}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 min-w-[230px] text-center">
                              <div className="rounded-lg bg-white border border-slate-100 px-2 py-2">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">{translate('eloBefore')}</span>
                                <span className="text-sm font-bold text-slate-700">{item.previousElo ?? item.oldElo ?? '—'}</span>
                              </div>
                              <div className="rounded-lg bg-white border border-slate-100 px-2 py-2">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">{translate('eloAfter')}</span>
                                <span className="text-sm font-bold text-slate-900">{item.newElo}</span>
                              </div>
                              <div className={`rounded-lg border px-2 py-2 ${isGain ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">{translate('eloChange')}</span>
                                <span className={`text-sm font-bold ${isGain ? 'text-blue-700' : 'text-rose-700'}`}>
                                  {item.changedPoints > 0 ? `+${item.changedPoints}` : item.changedPoints}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm font-medium">
                    {translate('eloEmpty')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
