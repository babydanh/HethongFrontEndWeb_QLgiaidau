'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from "next-intl";

import {
  Activity,
  Calendar,
  Clock3,
  Loader2,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  UserCheck,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Users,
} from 'lucide-react';

import EloSidebarCard from '@/components/dashboard/EloSidebarCard';
import FootballTeamEloCard from '@/components/dashboard/FootballTeamEloCard';
import RoleSummaryCard from '@/components/dashboard/RoleSummaryCard';
import TournamentListSection, { AvatarCircle } from '@/components/dashboard/TournamentListSection';
import ParticipantIdentity from '@/components/ui/ParticipantIdentity';
import { RankAvatar } from '@/components/ui/RankAvatar';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/zustand/authStore';
import { rankingsApi, PlayerRanking, FootballTeamRanking, EloHistoryLog } from '@/features/rankings/api';
import { getBestRankForCategory, getLocalizedRankTierName, isPublicRankingEligible } from '@/features/rankings/elo-display';
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

import { sortFollowedTournaments } from '@/utils/tournament-follow';
import { getMatchLocationLabel } from '@/utils/tournament-location';
import {
  getTournamentStatusClassName,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import { cn } from '@/utils/cn';

function formatDate(value: string | null | undefined, locale: string, withTime = false, fallback = '') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function getMatchStatusLabel(status: string, translate: (key: string) => string) {
  if (status === 'ONGOING') return translate("statusOngoing");
  if (status === 'COMPLETED') return translate("statusCompleted");
  if (status === 'SCHEDULED') return translate("statusScheduled");
  return status;
}

function isMockParticipant(participant?: Match['participant1'] | null): boolean {
  if (!participant) return true;
  if (participant.isMock === true) return true;
  if (!participant.members || participant.members.length === 0) return true;
  if (participant.members.some((member) => member.isMock === true)) return true;
  const name = participant.teamName?.trim().toLowerCase() || '';
  if (
    name.startsWith('vđv ') ||
    name.startsWith('vdv ') ||
    name === 'đối thủ' ||
    name === 'doi thu' ||
    name.startsWith('placeholder') ||
    name.startsWith('mock')
  ) {
    return true;
  }
  return false;
}

function isMockInvolvedMatch(match: Match): boolean {
  if (!match.participant1 || !match.participant2) return true;
  if (match.isBye === true) return true;
  return isMockParticipant(match.participant1) || isMockParticipant(match.participant2);
}

export default function DashboardPage() {
  const translate = useTranslations("PlayerDashboard");
  const eloTranslate = useTranslations("EloDisplay");
  const locale = useLocale();



  const { user } = useAuthStore();
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [workspace, setWorkspace] = useState<TournamentWorkspace | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [followedTournaments, setFollowedTournaments] = useState<Tournament[]>([]);
  const [footballTeams, setFootballTeams] = useState<FootballTeam[]>([]);
  const [footballTeamRankings, setFootballTeamRankings] = useState<FootballTeamRanking[]>([]);
  const [sportFilter, setSportFilter] = useState<string>('');
  const [eloCategoryId, setEloCategoryId] = useState<string>('');



  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'referee'>('overview');
  const [tournFilter, setTournFilter] = useState<'all' | 'registered' | 'organized' | 'followed'>('all');

  const isOrganizerOrAdmin = Boolean(
    user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN')
  );







  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const followedResPromise = tournamentsApi.getFollowedTournaments().catch(() => null);
        const footballTeamsResPromise = footballTeamsApi.listMine().catch(() => null);
        const categoriesResPromise = categoriesApi.getCategories().catch(() => null);
        const eloHistoryResPromise = rankingsApi.getUserEloHistory(user.id, { limit: 15 }).catch(() => ({ data: [] as EloHistoryLog[] }));
        const [ranksRes, workspaceRes, matchesRes, followedRes, categoriesRes, footballTeamsRes, eloHistoryRes] = await Promise.all([
          rankingsApi.getUserRankings(user.id),
          tournamentsApi.getMyWorkspace(),
          matchesApi.getMatches({ userId: user.id, limit: 15 }),
          followedResPromise,
          categoriesResPromise,
          footballTeamsResPromise,
          eloHistoryResPromise,
        ]);

        setUserRankings(ranksRes);
        setEloHistory(Array.isArray(eloHistoryRes?.data) ? eloHistoryRes.data : []);
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
          const personalMatches = matches.filter((match: Match) => !isMockInvolvedMatch(match));
          const nextMatch = personalMatches.find((m: Match) => m.status === 'SCHEDULED' || m.status === 'ONGOING');
          const pastMatches = personalMatches.filter((m: Match) => m.status === 'COMPLETED');
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
    .filter(isPublicRankingEligible)
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
  const activeEloHistory = [...eloHistory]
    .filter((item) => !selectedEloCategoryId || item.categoryId === selectedEloCategoryId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const eloHistoryByMatchId = new Map(
    [...eloHistory]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .filter((item) => item.matchId || item.match?.id)
      .map((item) => [item.matchId || item.match?.id, item]),
  );
  const eloPoints = activeRank ? activeRank.eloPoints : 1000;
  const matchesPlayed = activeRank ? activeRank.matchesPlayed : 0;
  const matchesWon = activeRank ? activeRank.matchesWon : 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const tierName = activeRank
    ? getLocalizedRankTierName(activeRank, eloTranslate)
    : translate("unranked");

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
  const sportSet = new Set<string>([translate("sportBadminton"), translate("sportTableTennis"), translate("sportPickleball"), translate("sportTennis")]);
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
          <RankAvatar
            src={user?.avatarUrl}
            name={user?.fullName}
            elo={activeRank?.eloPoints}
            tierName={activeRank?.tierName}
            categoryName={activeRank?.categoryName}
            matchesPlayed={activeRank?.matchesPlayed ?? 0}
            size="md"
            className="h-14 w-14 shadow-sm"
            ringClassName="ring-2"
          />
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
            <Link href="/tournaments">
              <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 font-bold text-xs h-9">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> {translate("findTournaments")}
              </Button>
            </Link>
          )}

        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Tabbed Interface */}
        <div className="xl:col-span-2 flex flex-col gap-5">
          {/* Main Tab Switcher */}
          <div className="flex items-center justify-between border border-slate-200 bg-white px-3 rounded-xl shadow-xs">
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
                <Activity className="w-4 h-4" /> {translate("overviewTab")}
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
                <ShieldCheck className="w-4 h-4" /> {translate("refereeAssignmentsTab")}
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
            <div className="flex flex-col gap-4">
              {/* Referee & Team Invites Alert (Only shown if pending invites exist) */}
              {workspace && workspace.refereeInvites.length > 0 && (
                <section className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> {translate("refereeInvitesTitle")} ({workspace.refereeInvites.length})
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
                              <p className="text-[11px] text-slate-500">{translate("inviteAsReferee")} • {invite.categoryName || translate("sport")}</p>
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
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : translate("accept")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Next Upcoming Match Hero Card (Light & clean design with full tournament & participant details) */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-blue-600" /> {translate("nextMatchTitle")}
                  </h2>
                  {upcomingMatch?.tournament?.name && (
                    <Link
                      href={`/tournaments/${upcomingMatch.tournament.id || upcomingMatch.tournamentId}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 truncate max-w-[220px] flex items-center gap-1.5"
                    >
                      <AvatarCircle
                        src={upcomingMatch.tournament.logoUrl || upcomingMatch.tournament.bannerUrl}
                        name={upcomingMatch.tournament.name}
                        size={22}
                      />
                      <span className="truncate">{upcomingMatch.tournament.name}</span>
                    </Link>
                  )}
                </div>

                <div className="p-5">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : upcomingMatch ? (
                    (() => {
                      const isUserP1 = upcomingMatch.participant1?.members?.some((member) => member.userId === user?.id) || upcomingMatch.participant1?.id === user?.id;
                      const isUserP2 = upcomingMatch.participant2?.members?.some((member) => member.userId === user?.id) || upcomingMatch.participant2?.id === user?.id;
                      const p1Fallback = isUserP1 ? translate("you") : (isUserP2 ? translate("opponent") : (upcomingMatch.participant1?.teamName || translate("teamAFallback")));
                      const p2Fallback = isUserP2 ? translate("you") : (isUserP1 ? translate("opponent") : (upcomingMatch.participant2?.teamName || translate("teamBFallback")));

                      const localizeTerm = (text?: string | null): string => {
                        if (!text) return '';
                        const t = text.trim();
                        if (/main\s*bracket/i.test(t)) return translate("stageMainBracket");
                        if (/elimination\s*stage/i.test(t) || /elimination/i.test(t)) return translate("stageElimination");
                        if (/double\s*elimination/i.test(t)) return translate("stageDoubleElimination");
                        if (/group\s*stage/i.test(t) || /group/i.test(t)) return translate("stageGroup");
                        if (/knockout/i.test(t)) return translate("stageKnockout");
                        if (/playoff/i.test(t)) return translate("stagePlayoff");
                        if (/winners/i.test(t)) return translate("stageWinners");
                        if (/losers/i.test(t)) return translate("stageLosers");
                        return t;
                      };

                      const groupName = upcomingMatch.group?.name ? localizeTerm(upcomingMatch.group.name) : '';
                      const stageName = upcomingMatch.group?.stage?.name
                        ? localizeTerm(upcomingMatch.group.stage.name)
                        : (upcomingMatch.stage?.type ? localizeTerm(upcomingMatch.stage.type) : '');
                      const subtitle = groupName && stageName ? `${groupName} • ${stageName}` : (groupName || stageName || translate("roundFallback"));

                      return (
                        <Link
                          href={`/live/${upcomingMatch.id}`}
                          className="block bg-slate-50/80 rounded-xl border border-slate-200/80 p-5 relative overflow-hidden transition-all hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-xs group"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider",
                                upcomingMatch.status === 'ONGOING'
                                  ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse"
                                  : "bg-blue-50 text-blue-600 border border-blue-200"
                              )}>
                                {upcomingMatch.status === 'ONGOING' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />}
                                {upcomingMatch.status === 'ONGOING' ? translate("ongoingUpper") : translate("upcomingUpper")}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {translate("roundAndMatch", {
                                  round: upcomingMatch.roundNumber ?? 1,
                                  match: upcomingMatch.matchOrder ?? 1,
                                })}
                              </span>
                            </div>

                            {(upcomingMatch.courtName || upcomingMatch.tournament?.venueName || upcomingMatch.scheduledAt) && (
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                {(upcomingMatch.courtName || upcomingMatch.tournament?.venueName) && (
                                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-semibold text-[11px]">
                                    {upcomingMatch.courtName || upcomingMatch.tournament?.venueName}
                                  </span>
                                )}
                                {upcomingMatch.scheduledAt && (
                                  <span>
                                    {formatDate(upcomingMatch.scheduledAt, locale, true, translate("notUpdated"))}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
                            <div className="flex items-center justify-start min-w-0">
                              <ParticipantIdentity
                                participant={
                                  upcomingMatch.participant1
                                    ? {
                                        ...upcomingMatch.participant1,
                                        members: upcomingMatch.participant1.members?.map((m) => ({
                                          userId: m.userId || '',
                                          fullName: m.fullName ?? null,
                                          avatarUrl: m.avatarUrl ?? null,
                                        })),
                                      }
                                    : undefined
                                }
                                fallback={p1Fallback}
                              />
                            </div>

                            <div className="flex flex-col items-center justify-center px-2">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                                VS
                              </span>
                            </div>

                            <div className="flex items-center justify-end min-w-0">
                              <ParticipantIdentity
                                participant={
                                  upcomingMatch.participant2
                                    ? {
                                        ...upcomingMatch.participant2,
                                        members: upcomingMatch.participant2.members?.map((m) => ({
                                          userId: m.userId || '',
                                          fullName: m.fullName ?? null,
                                          avatarUrl: m.avatarUrl ?? null,
                                        })),
                                      }
                                    : undefined
                                }
                                fallback={p2Fallback}
                                align="right"
                              />
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold text-slate-600 truncate max-w-[260px]">
                              {subtitle}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                              {translate("viewScore")} <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </Link>
                      );
                    })()
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                        <Clock3 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">{translate("noUpcomingMatches")}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{translate("joinTournamentToEarnElo")}</p>
                      <div className="mt-3.5">
                        <Link href="/tournaments">
                          <Button size="sm" className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                            {translate("exploreTournaments")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Recent Match Feed & ELO Delta */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" /> {translate("recentFormTitle")}
                  </h2>
                  <span className="text-xs font-normal text-slate-400">
                    {translate("completedMatchesCount", { count: completedMatches.length })}
                  </span>
                </div>

                <div className="p-5">
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
                        const historyItem = eloHistoryByMatchId.get(m.id);
                        const result = historyItem?.match?.result
                          ?? (m.winnerId ? (userParticipantId === m.winnerId ? 'WIN' : 'LOSS') : 'DRAW');
                        const isWin = result === 'WIN';
                        const isLoss = result === 'LOSS';
                        const eloDelta = historyItem?.changedPoints ?? null;
                        return (
                          <div key={m.id} className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs',
                                isWin ? 'bg-emerald-100 text-emerald-700' : isLoss ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                              )}>
                                {isWin ? <TrendingUp className="w-4 h-4" /> : isLoss ? <TrendingDown className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {m.participant1?.teamName || translate("teamAFallback")} vs {m.participant2?.teamName || translate("teamBFallback")}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {m.tournament?.name || translate("tournament")} • {formatDate(m.updatedAt || m.scheduledAt, locale, false, translate("notUpdated"))}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {eloDelta !== null ? (
                                <span className={cn(
                                  'px-2 py-0.5 rounded text-[11px] font-extrabold tabular-nums',
                                  eloDelta > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : eloDelta < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                                )}>
                                  {eloDelta > 0 ? '+' : ''}{eloDelta} ELO
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 border border-slate-200">
                                  {translate("eloNotUpdated")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                        <Activity className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">{translate("noRecentMatches")}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{translate("joinTournamentToEarnElo")}</p>
                    </div>
                  )}
                </div>
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
                    {translate("allTournamentsFilter")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTournFilter('registered')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      tournFilter === 'registered' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {translate("registeredFilter", { count: registeredCount })}
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
                      {translate("organizedFilter", { count: totalOrganized })}
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
                    {translate("followedFilter", { count: followedTournaments.length })}
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
                actionLabel={translate("findNewTournament")}
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
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> {translate("refereeWorkTitle")}
                    <span className="text-xs font-normal text-slate-400">({workspace?.refereeMatches.length || 0})</span>
                  </h2>
                </div>
                <div className="p-5">
                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : workspace && workspace.refereeMatches.length > 0 ? (
                    <div className="flex flex-col divide-y divide-slate-100">
                      {workspace.refereeMatches.map((match: WorkspaceRefereeMatch) => (
                        <div key={match.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2.5">
                              <AvatarCircle src={match.logoUrl} name={match.tournamentName} size={28} />
                              <div className="min-w-0 flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-xs truncate">{match.tournamentName}</h3>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">{translate("referee")}</span>
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-slate-800">
                              {match.participant1Name || translate("unknownParticipant")} vs {match.participant2Name || translate("unknownParticipant")}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                              <span className="bg-slate-100 px-2 py-0.5 rounded">{match.categoryName || translate("competitionSport")}</span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded">{match.stageName} • {match.groupName}</span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded">{translate("roundAndMatch", { round: match.roundNumber, match: match.matchOrder })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTournamentStatusClassName(match.status)}`}>
                              {getMatchStatusLabel(match.status, translate)}
                            </span>
                            <Link href={`/live/${match.id}`}>
                              <Button size="sm" className="h-7 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3">
                                {translate("liveScoring")}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">{translate("noRefereeAssignments")}</p>
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
            recentEloDelta={activeEloHistory[0]?.changedPoints ?? null}
            sportLabel={activeRank?.matchType === 'SINGLES' ? translate("singlesShort") : activeRank?.matchType === 'DOUBLES' ? translate("doublesShort") : activeRank?.matchType === 'MIXED_DOUBLES' ? translate("mixedDoublesShort") : undefined}
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
