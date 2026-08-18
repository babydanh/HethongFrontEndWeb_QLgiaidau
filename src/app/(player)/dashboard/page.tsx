'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from "next-intl";
import { useRouter } from 'next/navigation';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  UserCheck,
  XCircle,
  Bookmark,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Users,
} from 'lucide-react';

import EloSidebarCard from '@/components/dashboard/EloSidebarCard';
import FootballTeamEloCard from '@/components/dashboard/FootballTeamEloCard';
import RoleSummaryCard from '@/components/dashboard/RoleSummaryCard';
import TournamentListSection, { AvatarCircle } from '@/components/dashboard/TournamentListSection';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/zustand/authStore';
import { rankingsApi, PlayerRanking, FootballTeamRanking } from '@/features/rankings/api';
import { getBestRankForCategory } from '@/features/rankings/elo-display';
import {
  tournamentsApi,
  footballTeamsApi,
  FootballTeam,
  Tournament,
  TournamentWorkspace,
  WorkspaceRefereeInvite,
  WorkspaceRefereeMatch,
} from '@/features/tournaments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { matchesApi, Match } from '@/features/matches/api';
import { communitiesApi } from '@/features/communities/api';
import { sortFollowedTournaments } from '@/utils/tournament-follow';
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentCompleted,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import { cn } from '@/utils/cn';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value?: string | null, withTime = false, fallback = 'Chưa cập nhật') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return withTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function getMatchStatusLabel(status: string, translate: (key: string) => string) {
  if (status === 'ONGOING') return translate("statusOngoing");
  if (status === 'COMPLETED') return translate("statusCompleted");
  if (status === 'SCHEDULED') return translate("statusScheduled");
  return status;
}

export default function DashboardPage() {
  const translate = useTranslations("PlayerDashboard");
  const router = useRouter();
  const { user } = useAuthStore();
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [workspace, setWorkspace] = useState<TournamentWorkspace | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [followedTournaments, setFollowedTournaments] = useState<Tournament[]>([]);
  const [footballTeams, setFootballTeams] = useState<FootballTeam[]>([]);
  const [footballTeamRankings, setFootballTeamRankings] = useState<FootballTeamRanking[]>([]);
  const [sportFilter, setSportFilter] = useState<string>('');
  const [eloCategoryId, setEloCategoryId] = useState<string>('');
  const [isLiteLoading, setIsLiteLoading] = useState(false);
  const [showNoClubModal, setShowNoClubModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'referee'>('overview');
  const [tournFilter, setTournFilter] = useState<'all' | 'registered' | 'organized' | 'followed'>('all');

  const isOrganizerOrAdmin = Boolean(
    user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN')
  );

  const handleCreateLiteClick = async () => {
    setIsLiteLoading(true);
    try {
      const commRes = await communitiesApi.getMyCommunities();
      const myData = commRes?.data;
      const allMine = [...(myData?.created || []), ...(myData?.joined || [])];
      if (allMine.length === 0) {
        setShowNoClubModal(true);
      } else {
        router.push(`/communities/${allMine[0].id}/create-lite`);
      }
    } catch {
      setShowNoClubModal(true);
    } finally {
      setIsLiteLoading(false);
    }
  };

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const followedResPromise = tournamentsApi.getFollowedTournaments().catch(() => null);
        const footballTeamsResPromise = footballTeamsApi.listMine().catch(() => null);
        const categoriesResPromise = categoriesApi.getCategories().catch(() => null);
        const [ranksRes, workspaceRes, matchesRes, followedRes, categoriesRes, footballTeamsRes] = await Promise.all([
          rankingsApi.getUserRankings(user.id),
          tournamentsApi.getMyWorkspace(),
          matchesApi.getMatches({ userId: user.id, limit: 15 }),
          followedResPromise,
          categoriesResPromise,
          footballTeamsResPromise,
        ]);

        setUserRankings(ranksRes);
        setWorkspace(workspaceRes.data || null);
        setFollowedTournaments(sortFollowedTournaments(Array.isArray(followedRes?.data) ? followedRes.data : []));
        const mine = Array.isArray(footballTeamsRes?.data) ? footballTeamsRes.data : [];
        const activeTeams = mine
          .filter((item) => item.team.status === 'ACTIVE' && item.membership?.status === 'ACTIVE')
          .map((item) => ({ ...item.team, rank: item.rank ?? item.team.rank }));
        setFootballTeams(activeTeams);
        const footballCategoryId = activeTeams[0]?.categoryId;
        if (footballCategoryId) {
          const teamRanks = await rankingsApi.getFootballTeamRankings({ categoryId: footballCategoryId, limit: 100 }).catch(() => null);
          setFootballTeamRankings(Array.isArray(teamRanks?.data) ? teamRanks.data : []);
        } else {
          setFootballTeamRankings([]);
        }
        if (Array.isArray(categoriesRes?.data)) {
          setCategories(categoriesRes.data.filter((c: Category) => (
            c.isActive !== false
            && (c.categoryConfig as (Record<string, unknown> & { isActive?: boolean }) | null | undefined)?.isActive !== false
          )));
        }

        if (matchesRes?.data) {
          const matches = matchesRes.data;
          const nextMatch = matches.find((m: Match) => m.status === 'SCHEDULED' || m.status === 'ONGOING');
          const pastMatches = matches.filter((m: Match) => m.status === 'COMPLETED');
          setUpcomingMatch(nextMatch || null);
          setCompletedMatches(pastMatches);
        } else {
          setUpcomingMatch(null);
          setCompletedMatches([]);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [user?.id]);

  const handleRefereeInvite = async (invite: WorkspaceRefereeInvite, action: 'ACCEPT' | 'DECLINE') => {
    try {
      setRespondingInviteId(invite.refereeId);
      await tournamentsApi.respondToRefereeInvite(invite.tournamentId, invite.refereeId, action);
      const workspaceRes = await tournamentsApi.getMyWorkspace();
      setWorkspace(workspaceRes.data || null);
    } catch (error) {
      console.error('Failed to respond referee invite', error);
    } finally {
      setRespondingInviteId(null);
    }
  };

  const publicRanks = userRankings?.publicRanks || [];
  const strongestRank = [...publicRanks]
    .filter((rank) => rank.matchesPlayed > 0)
    .sort((a, b) => b.eloPoints - a.eloPoints || b.matchesPlayed - a.matchesPlayed)[0];
  const strongestActiveCategoryId = strongestRank
    && categories.some((category) => category.id === strongestRank.categoryId)
    ? strongestRank.categoryId
    : '';
  const stableCategoryIndex = categories.length > 0
    ? Array.from(user?.id || 'sporto').reduce((total, character) => total + character.charCodeAt(0), 0) % categories.length
    : 0;
  const selectedEloCategoryId = categories.some((category) => category.id === eloCategoryId)
    ? eloCategoryId
    : strongestActiveCategoryId || categories[stableCategoryIndex]?.id || '';
  const activeRank = selectedEloCategoryId
    ? getBestRankForCategory(publicRanks, selectedEloCategoryId)
    : getBestRankForCategory(publicRanks);
  const eloPoints = activeRank ? activeRank.eloPoints : 1000;
  const matchesPlayed = activeRank ? activeRank.matchesPlayed : 0;
  const matchesWon = activeRank ? activeRank.matchesWon : 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const tierName = matchesPlayed > 0 ? (activeRank?.tier?.name || activeRank?.tierName || translate("unranked")) : translate("unranked");

  const bestFootballTeam = [...footballTeams].sort((a, b) => {
    const eloDelta = (b.rank?.eloPoints ?? 1000) - (a.rank?.eloPoints ?? 1000);
    return eloDelta || (b.rank?.matchesPlayed ?? 0) - (a.rank?.matchesPlayed ?? 0);
  })[0] ?? null;
  const bestFootballTeamRanking = bestFootballTeam
    ? footballTeamRankings.find((ranking) => ranking.teamId === bestFootballTeam.id) ?? null
    : null;
  const bestFootballTeamPosition = bestFootballTeamRanking
    ? footballTeamRankings.findIndex((ranking) => ranking.teamId === bestFootballTeam.id) + 1
    : null;

  const organizedCount = workspace?.organizedTournaments.length || 0;
  const coOrganizerCount = workspace?.coOrganizerTournaments.length || 0;
  const totalOrganized = organizedCount + coOrganizerCount;
  const refereeCount = workspace?.refereeMatches.length || 0;
  const inviteCount = workspace?.refereeInvites.length || 0;
  const registeredCount = workspace?.participatingTournaments.length || 0;

  const allTournaments = [
    ...(workspace?.participatingTournaments ?? []),
    ...(workspace?.organizedTournaments ?? []),
    ...(workspace?.coOrganizerTournaments ?? []),
  ];
  const sportSet = new Set<string>([translate("sportBadminton"), translate("sportTableTennis"), 'Pickleball', 'Tennis']);
  allTournaments.forEach((t) => {
    const s = t.category?.name;
    if (s) sportSet.add(s);
  });
  (userRankings?.publicRanks || []).forEach((rank) => {
    if (rank.categoryName) sportSet.add(rank.categoryName);
  });
  const apiActiveSportNames = categories.map((c) => c.name);
  const sportOptions = apiActiveSportNames.length > 0
    ? apiActiveSportNames
    : Array.from(sportSet).sort();

  const filterBySport = (list: Tournament[]) =>
    !sportFilter ? list : list.filter((t) => t.category?.name === sportFilter);

  const participantRoleLabels: Record<string, string> = {};
  (workspace?.participatingTournaments ?? []).forEach((tournament) => {
    participantRoleLabels[tournament.id] = translate("athlete");
  });

  const organizerRoleLabels: Record<string, string> = {};
  (workspace?.organizedTournaments ?? []).forEach((tournament) => {
    organizerRoleLabels[tournament.id] = 'BTC';
  });
  (workspace?.coOrganizerTournaments ?? []).forEach((tournament) => {
    organizerRoleLabels[tournament.id] = translate("assistantOrganizer");
  });

  const matchTypeMap: Record<string, string> = {};
  const partnerMap: Record<string, string> = {};
  allTournaments.forEach((t) => {
    if (t.name.toLowerCase().includes('đôi nam nữ') || t.name.toLowerCase().includes('mixed')) {
      matchTypeMap[t.id] = 'MIXED_DOUBLES';
    } else if (t.name.toLowerCase().includes('đôi') || t.name.toLowerCase().includes('doubles')) {
      matchTypeMap[t.id] = 'DOUBLES';
    }
  });

  // Determine filtered tournaments for My Tournaments tab
  const getFilteredTournaments = () => {
    let result: Tournament[] = [];
    if (tournFilter === 'registered') {
      result = workspace?.participatingTournaments || [];
    } else if (tournFilter === 'organized') {
      result = [...(workspace?.organizedTournaments || []), ...(workspace?.coOrganizerTournaments || [])];
    } else if (tournFilter === 'followed') {
      result = followedTournaments;
    } else {
      // 'all'
      result = [
        ...(workspace?.participatingTournaments || []),
        ...(workspace?.organizedTournaments || []),
        ...(workspace?.coOrganizerTournaments || []),
        ...followedTournaments,
      ];
      // deduplicate
      const seen = new Set<string>();
      result = result.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    }
    return filterBySport(result);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 min-h-[100dvh]">
      {/* Header Banner - Role-aware Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-blue-600 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{translate("dashboardTitle", { name: user?.fullName?.split(' ').pop() || translate("you") })}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {translate("dashboardSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          {isOrganizerOrAdmin ? (
            <>
              <Link href="/organizer/tournaments">
                <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 font-bold text-xs h-9">
                  <UserCheck className="w-3.5 h-3.5 mr-1.5 text-violet-600" /> {translate("manageTournaments")}
                </Button>
              </Link>
              <Link href="/organizer/tournaments/create">
                <Button className="font-bold text-xs h-9 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> {translate("createTournament")}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/tournaments">
                <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 font-bold text-xs h-9">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> {translate("findTournaments")}
                </Button>
              </Link>
              <Button
                onClick={() => void handleCreateLiteClick()}
                disabled={isLiteLoading}
                className="font-bold text-xs h-9 bg-blue-600 hover:bg-blue-700"
              >
                {isLiteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                Tạo giải nhanh (Lite)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Tabbed Interface */}
        <div className="xl:col-span-2 flex flex-col gap-5">
          {/* Main Tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-2 rounded-t-xl">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={cn(
                  'px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Activity className="w-4 h-4" /> Tổng quan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tournaments')}
                className={cn(
                  'px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
                  activeTab === 'tournaments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Trophy className="w-4 h-4" /> {translate("myTournaments")}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {registeredCount + totalOrganized}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('referee')}
                className={cn(
                  'px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
                  activeTab === 'referee'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <ShieldCheck className="w-4 h-4" /> Ca trọng tài
                {refereeCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {refereeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              {/* Referee & Team Invites Alert (Only shown if pending invites exist) */}
              {workspace && workspace.refereeInvites.length > 0 && (
                <section className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> Lời mời trọng tài chờ phản hồi ({workspace.refereeInvites.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {workspace.refereeInvites.map((invite) => {
                      const isBusy = respondingInviteId === invite.refereeId;
                      return (
                        <div key={invite.refereeId} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-amber-200/80">
                          <div className="flex items-center gap-3">
                            <AvatarCircle src={invite.logoUrl} name={invite.tournamentName} size={36} />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{invite.tournamentName}</p>
                              <p className="text-[11px] text-slate-500">Mời làm trọng tài • {invite.categoryName || translate("sport")}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRefereeInvite(invite, 'DECLINE')}
                              disabled={isBusy}
                              className="h-8 text-xs font-bold px-3"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : translate("decline")}
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleRefereeInvite(invite, 'ACCEPT')}
                              disabled={isBusy}
                              className="h-8 text-xs font-bold px-3"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Đồng ý'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Next Upcoming Match Hero Card */}
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-blue-600" /> Trận đấu tiếp theo
                </h2>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : upcomingMatch ? (
                  <div className="bg-slate-900 rounded-lg p-5 text-white relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider">
                        {upcomingMatch.status === 'ONGOING' ? translate("ongoingUpper") : translate("upcomingUpper")}
                      </span>
                      <span className="text-xs text-slate-300 truncate max-w-[200px]">
                        {upcomingMatch.tournament?.name || translate("tournament")}
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
                      <div className="text-center">
                        <p className="text-sm font-bold text-white line-clamp-1">
                          {upcomingMatch.participant1?.teamName || translate("you")}
                        </p>
                      </div>
                      <div className="text-sm font-black text-slate-500 italic">VS</div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white line-clamp-1">
                          {upcomingMatch.participant2?.teamName || translate("opponent")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        Vòng đấu: {upcomingMatch.group?.stage?.name || upcomingMatch.group?.name || 'Vòng đấu'}
                      </span>
                      <Link href={`/live/${upcomingMatch.id}`}>
                        <span className="inline-flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300">
                          Xem tỷ số <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-xs font-semibold text-slate-700">Bạn chưa có trận đấu nào sắp diễn ra</p>
                    <p className="text-[11px] text-slate-400 mt-1">Đăng ký tham gia giải đấu để bắt đầu tích lũy ELO!</p>
                    <div className="mt-3">
                      <Link href="/tournaments">
                        <Button size="sm" variant="outline" className="text-xs font-bold border-slate-200">
                          Khám phá giải đấu
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </section>

              {/* Recent Match Feed & ELO Delta */}
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" /> Phong độ & Trận đấu vừa qua
                  </h2>
                  <span className="text-xs text-slate-400">{completedMatches.length} trận đã xong</span>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : completedMatches.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {completedMatches.slice(0, 4).map((m) => {
                      const userParticipantId = m.participant1?.members?.some((member) => member.userId === user?.id)
                        ? m.participant1.id
                        : m.participant2?.members?.some((member) => member.userId === user?.id)
                          ? m.participant2.id
                          : null;
                      const isWin = Boolean(m.winnerId && userParticipantId === m.winnerId);
                      const eloDelta = isWin ? '+15' : '-10';
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs',
                              isWin ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            )}>
                              {isWin ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {m.participant1?.teamName || 'Đội A'} vs {m.participant2?.teamName || 'Đội B'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {m.tournament?.name || translate("tournament")} • {formatDate(m.updatedAt || m.scheduledAt, false, translate("notUpdated"))}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-extrabold tabular-nums',
                              isWin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            )}>
                              {eloDelta} ELO
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Chưa có dữ liệu trận đấu vừa qua gần đây.
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: MY TOURNAMENTS */}
          {activeTab === 'tournaments' && (
            <div className="flex flex-col gap-4">
              {/* Sub-filter pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTournFilter('all')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      tournFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setTournFilter('registered')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      tournFilter === 'registered' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    Đã đăng ký ({registeredCount})
                  </button>
                  {isOrganizerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setTournFilter('organized')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        tournFilter === 'organized' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      Đang tổ chức ({totalOrganized})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTournFilter('followed')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      tournFilter === 'followed' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    Đang theo dõi ({followedTournaments.length})
                  </button>
                </div>

                {sportOptions.length > 1 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                    >
                      <option value="">{translate("allSports")}</option>
                      {sportOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <TournamentListSection
                title={tournFilter === 'registered' ? translate("registeredTournaments") : tournFilter === 'organized' ? translate("organizedTournaments") : tournFilter === 'followed' ? translate("followedTournaments") : translate("tournamentList")}
                actionHref="/tournaments"
                actionLabel="Tìm giải mới"
                tournaments={getFilteredTournaments()}
                roleLabels={participantRoleLabels}
                    emptyLabel={translate("noMatchingTournaments")}
                matchTypeMap={matchTypeMap}
                partners={partnerMap}
              />
            </div>
          )}

          {/* TAB 3: REFEREE SHIFTS */}
          {activeTab === 'referee' && (
            <div className="flex flex-col gap-4">
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-rose-500" /> Ca làm việc trọng tài ({workspace?.refereeMatches.length || 0})
                  </h2>
                </div>
                <div className="p-5">
                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : workspace && workspace.refereeMatches.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {workspace.refereeMatches.map((match: WorkspaceRefereeMatch) => (
                        <div key={match.id} className="rounded-lg border border-slate-200 p-4 bg-white hover:border-blue-200 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex items-center gap-3">
                                <AvatarCircle src={match.logoUrl} name={match.tournamentName} size={36} />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-sm">{match.tournamentName}</h3>
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">Trọng tài</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-700 mt-1">
                                {match.participant1Name || 'Chưa xác định'} vs {match.participant2Name || 'Chưa xác định'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                <span className="bg-slate-100 px-2 py-0.5 rounded">{match.categoryName || 'Môn thi đấu'}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded">{match.stageName} • {match.groupName}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded">Vòng {match.roundNumber} • Trận {match.matchOrder}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded">Sân: {match.courtName || translate("unassigned")}</span>
                              </div>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getTournamentStatusClassName(match.status)}`}>
                              {getMatchStatusLabel(match.status, translate)}
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                            <Link href={`/live/${match.id}`}>
                              <Button size="sm" className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                                Vào chấm điểm Live
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
                      {translate("noRefereeAssignments")}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Right Column: ELO Card, Role Summary, Quick Shortcuts */}
        <div className="xl:col-span-1 flex flex-col gap-5">
          {bestFootballTeam && (
            <FootballTeamEloCard
              team={bestFootballTeam}
              ranking={bestFootballTeamRanking}
              position={bestFootballTeamPosition}
            />
          )}
          <EloSidebarCard
            eloPoints={eloPoints}
            matchesWon={matchesWon}
            matchesPlayed={matchesPlayed}
            winRate={winRate}
            tierName={tierName}
            activeRank={activeRank}
            sportLabel={activeRank?.matchType === 'SINGLES' ? 'Đơn' : activeRank?.matchType === 'DOUBLES' ? 'Đôi' : activeRank?.matchType === 'MIXED_DOUBLES' ? 'Đôi nam nữ' : undefined}
            sportOptions={categories.map((category) => ({ id: category.id, name: category.name }))}
            selectedSportId={selectedEloCategoryId}
            onSportChange={setEloCategoryId}
          />

          <RoleSummaryCard
            registeredCount={registeredCount}
            organizerCount={totalOrganized}
            refereeCount={refereeCount}
            inviteCount={inviteCount}
          />

          {/* Quick Shortcuts (Lối tắt nhanh) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{translate("quickShortcuts")}</h3>
            <div className="flex flex-col gap-2">
              <Link href="/football-teams" className="flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50/60 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><Users className="w-3.5 h-3.5" /></div>
                  <span>{translate("myTeam")}</span>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">ELO</span>
              </Link>
              {isOrganizerOrAdmin ? (
                <>
                  <Link href="/organizer/tournaments" className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-50/60 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-blue-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <span>{translate("manageTournaments")}</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">BTC</span>
                  </Link>

                  <Link href="/organizer/series" className="flex items-center justify-between p-3 rounded-lg hover:bg-indigo-50/60 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-indigo-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <span>{translate("manageSeries")}</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Series</span>
                  </Link>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => void handleCreateLiteClick()}
                disabled={isLiteLoading}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-emerald-200 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    {isLiteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                <span>{translate("quickCreateTournament")}</span>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">CLB</span>
              </button>

              <Link href="/series" className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-50/60 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-purple-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <span>{translate("series")}</span>
                </div>
                <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Series</span>
              </Link>

              <Link href="/profile" className="flex items-center gap-2.5 p-3 rounded-lg hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                {translate("viewProfile")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
