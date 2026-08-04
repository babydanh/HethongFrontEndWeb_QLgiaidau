'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
} from 'lucide-react';

import EloSidebarCard from '@/components/dashboard/EloSidebarCard';
import RoleSummaryCard from '@/components/dashboard/RoleSummaryCard';
import TournamentListSection, { AvatarCircle } from '@/components/dashboard/TournamentListSection';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/zustand/authStore';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { getBestRankForCategory } from '@/features/rankings/elo-display';
import {
  tournamentsApi,
  Tournament,
  TournamentWorkspace,
  WorkspaceRefereeInvite,
  WorkspaceRefereeMatch,
} from '@/features/tournaments/api';
import { matchesApi, Match } from '@/features/matches/api';
import { useRouter } from 'next/navigation';
import { communitiesApi } from '@/features/communities/api';
import { sortFollowedTournaments } from '@/utils/tournament-follow';

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

function formatDate(value?: string | null, withTime = false) {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  return withTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function getMatchStatusLabel(status: string) {
  if (status === 'ONGOING') return 'Đang diễn ra';
  if (status === 'COMPLETED') return 'Đã xong';
  if (status === 'SCHEDULED') return 'Đã xếp lịch';
  return status;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [workspace, setWorkspace] = useState<TournamentWorkspace | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [followedTournaments, setFollowedTournaments] = useState<Tournament[]>([]);
  const [sportFilter, setSportFilter] = useState<string>('');
  const [isLiteLoading, setIsLiteLoading] = useState(false);
  const [showNoClubModal, setShowNoClubModal] = useState(false);

  const handleCreateLiteClick = async () => {
    setIsLiteLoading(true);
    try {
      const commRes = await communitiesApi.getMyCommunities();
      const allMine = [...(commRes?.created || []), ...(commRes?.joined || [])];
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

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const followedResPromise = tournamentsApi.getFollowedTournaments().catch(() => null);
        const [ranksRes, workspaceRes, matchesRes, followedRes] = await Promise.all([
          rankingsApi.getUserRankings(user.id),
          tournamentsApi.getMyWorkspace(),
          matchesApi.getMatches({ userId: user.id, limit: 10 }),
          followedResPromise,
        ]);

        setUserRankings(ranksRes);
        setWorkspace(workspaceRes.data || null);
        setFollowedTournaments(sortFollowedTournaments(Array.isArray(followedRes?.data) ? followedRes.data : []));

        if (matchesRes?.data) {
          const nextMatch = matchesRes.data.find((match: Match) => match.status === 'SCHEDULED' || match.status === 'ONGOING');
          setUpcomingMatch(nextMatch || null);
        } else {
          setUpcomingMatch(null);
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

  const strongestSport = [...(userRankings?.publicRanks || [])]
    .filter((rank) => rank.matchesPlayed > 0 && rank.categoryName)
    .sort((a, b) => b.eloPoints - a.eloPoints || b.matchesPlayed - a.matchesPlayed)[0]?.categoryName || '';
  const activeSport = sportFilter || strongestSport;
  const activeSportRanks = activeSport
    ? (userRankings?.publicRanks || []).filter((rank) => rank.categoryName === activeSport)
    : (userRankings?.publicRanks || []);
  const activeRank = getBestRankForCategory(activeSportRanks);
  const eloPoints = activeRank ? activeRank.eloPoints : 1000;
  const matchesPlayed = activeRank ? activeRank.matchesPlayed : 0;
  const matchesWon = activeRank ? activeRank.matchesWon : 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const tierName = matchesPlayed > 0 ? (activeRank?.tier?.name || activeRank?.tierName || 'Chưa xếp hạng') : 'Chưa xếp hạng';

  const organizedCount = workspace?.organizedTournaments.length || 0;
  const coOrganizerCount = workspace?.coOrganizerTournaments.length || 0;
  const refereeCount = workspace?.refereeTournaments.length || 0;
  const inviteCount = workspace?.refereeInvites.length || 0;

  // Extract unique sport categories for filter
  const allTournaments = [
    ...(workspace?.participatingTournaments ?? []),
    ...(workspace?.organizedTournaments ?? []),
    ...(workspace?.coOrganizerTournaments ?? []),
  ];
  const sportSet = new Set<string>(['Cầu lông', 'Bóng bàn', 'Pickleball', 'Tennis']);
  allTournaments.forEach(t => {
    const s = t.category?.name;
    if (s) sportSet.add(s);
  });
  (userRankings?.publicRanks || []).forEach((rank) => {
    if (rank.categoryName) sportSet.add(rank.categoryName);
  });
  const sportOptions = Array.from(sportSet).sort();

  const filterBySport = (list: Tournament[]) =>
    !sportFilter
      ? list
      : list.filter(t => t.category?.name === sportFilter);

  const participantRoleLabels: Record<string, string> = {};
  (workspace?.participatingTournaments ?? []).forEach((tournament) => {
    participantRoleLabels[tournament.id] = 'VĐV';
  });

  const organizerRoleLabels: Record<string, string> = {};
  (workspace?.organizedTournaments ?? []).forEach((tournament) => {
    organizerRoleLabels[tournament.id] = 'BTC';
  });
  (workspace?.coOrganizerTournaments ?? []).forEach((tournament) => {
    organizerRoleLabels[tournament.id] = 'Hỗ trợ BTC';
  });

  // Build matchType map (DOUBLES/SINGLES heuristic from name)
  const matchTypeMap: Record<string, string> = {};
  const partnerMap: Record<string, string> = {};
  allTournaments.forEach(t => {
    if (t.name.toLowerCase().includes('đôi nam nữ') || t.name.toLowerCase().includes('mixed')) {
      matchTypeMap[t.id] = 'MIXED_DOUBLES';
    } else if (t.name.toLowerCase().includes('đôi') || t.name.toLowerCase().includes('doubles')) {
      matchTypeMap[t.id] = 'DOUBLES';
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bảng điều khiển của {user?.fullName?.split(' ').pop() || 'bạn'}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Vào đây để phản hồi lời mời, theo dõi giải đã đăng ký và các vai trò bạn đang đảm nhiệm.
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/tournaments">
            <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50 font-bold">
              <Calendar className="w-4 h-4 mr-2" /> Tìm giải đấu
            </Button>
          </Link>
          {user ? (
            <Link href="/organizer/tournaments/create">
              <Button className="font-bold">
                <Plus className="w-4 h-4 mr-2" /> Tạo giải đấu
              </Button>
            </Link>
          ) : (
            <Link href="/profile">
              <Button variant="outline" className="font-bold">
                <Plus className="w-4 h-4 mr-2" /> Yêu cầu quyền BTC
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> Lời mời và vai trò cần xử lý
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : workspace && workspace.refereeInvites.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {workspace.refereeInvites.map((invite) => {
                    const isBusy = respondingInviteId === invite.refereeId;
                    return (
                      <div key={invite.refereeId} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <AvatarCircle src={invite.logoUrl} name={invite.tournamentName} size={40} />
                            <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900">{invite.tournamentName}</h3>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-white text-amber-700 border border-amber-200">
                                Mời làm trọng tài
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {invite.categoryName || 'Nội dung chưa rõ'} • gửi lúc {formatDate(invite.assignedAt, true)}
                            </p>
                          </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRefereeInvite(invite, 'DECLINE')}
                              disabled={isBusy}
                              className="h-9 font-bold"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                              Từ chối
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleRefereeInvite(invite, 'ACCEPT')}
                              disabled={isBusy}
                              className="h-9 font-bold"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                              Đồng ý
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                  Hiện không có lời mời trọng tài nào đang chờ bạn phản hồi.
                </div>
              )}
            </div>
          </section>

          {/* Sport filter */}
          {sportOptions.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSportFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  !sportFilter
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                }`}
              >
                Tất cả
              </button>
              {sportOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setSportFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sportFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <TournamentListSection
            title="Giải tôi đã đăng ký"
            actionHref="/profile"
            actionLabel="Xem hồ sơ"
            tournaments={filterBySport(workspace?.participatingTournaments || [])}
            roleLabels={participantRoleLabels}
            emptyLabel="Bạn chưa đăng ký giải đấu nào."
            icon={<Trophy className="w-4 h-4 text-sky-600" />}
            matchTypeMap={matchTypeMap}
            partners={partnerMap}
          />

          <TournamentListSection
            id="section-btc"
            title="Giải tôi đang tổ chức hoặc hỗ trợ"
            actionHref="/organizer/tournaments"
            actionLabel="Vào quản lý"
            tournaments={filterBySport([...(workspace?.organizedTournaments || []), ...(workspace?.coOrganizerTournaments || [])])}
            emptyLabel="Bạn chưa có vai trò ban tổ chức nào."
            icon={<UserCheck className="w-4 h-4 text-violet-600" />}
            roleLabels={organizerRoleLabels}
          />

          <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-rose-500" /> Ca trọng tài của tôi
              </h2>
              <span className="text-sm font-semibold text-slate-500">{workspace?.refereeMatches.length || 0} trận</span>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : workspace && workspace.refereeMatches.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {workspace.refereeMatches.slice(0, 5).map((match: WorkspaceRefereeMatch) => (
                    <div key={match.id} className="rounded-lg border border-slate-200 p-4 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-3">
                            <AvatarCircle src={match.logoUrl} name={match.tournamentName} size={40} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900 line-clamp-1">{match.tournamentName}</h3>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">Trọng tài</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {match.participant1Name || 'Chưa xác định'} vs {match.participant2Name || 'Chưa xác định'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>{match.categoryName || 'Chưa rõ môn'}</span>
                            <span>{match.stageName} • {match.groupName}</span>
                            <span>Vòng {match.roundNumber} • Trận {match.matchOrder}</span>
                            <span>Sân: {match.courtName || 'Chưa gán'}</span>
                            <span>Lịch: {formatDate(match.scheduledAt, true)}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getTournamentStatusClassName(match.status)}`}>
                          {getMatchStatusLabel(match.status)}
                        </span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Link href={`/live/${match.id}`}>
                          <Button size="sm" className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold">
                            Vào chấm điểm
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                  Bạn chưa được phân công trận nào với vai trò trọng tài.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" /> Trận đấu tiếp theo của tôi
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : upcomingMatch ? (
                <div className="bg-slate-900 rounded-lg p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 rounded-full blur-[80px] opacity-20" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-4">
                      <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                        {upcomingMatch.status === 'ONGOING' ? 'ĐANG DIỄN RA' : 'SẮP DIỄN RA'}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {upcomingMatch.tournament?.name || 'Chưa rõ giải'}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-white">
                      <div className="text-center">
                        <div className="text-sm font-bold line-clamp-2">{upcomingMatch.participant1?.teamName || 'Bạn'}</div>
                      </div>
                      <div className="text-xl font-bold text-slate-500 italic">VS</div>
                      <div className="text-center">
                        <div className="text-sm font-bold line-clamp-2">{upcomingMatch.participant2?.teamName || 'Chưa xác định'}</div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Link href={`/live/${upcomingMatch.id}`}>
                        <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs py-1 px-3">
                          Xem tỷ số
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                  Bạn không có trận đấu nào sắp tới.
                </div>
              )}
            </div>
          </section>

          {/* Giải đang theo dõi */}
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-500" /> Giải đang theo dõi
                </h2>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Card sẽ cho biết rõ giải còn mở, đang diễn ra, vừa kết thúc gần đây hay đã kết thúc.
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{followedTournaments.length}</span>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : followedTournaments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {followedTournaments.slice(0, 5).map((t) => (
                    <Link
                      key={t.id}
                      href={`/tournaments/${t.id}`}
                      className="block rounded-lg border border-slate-200 p-3 hover:border-amber-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{t.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {isTournamentOpenForRegistration(t.status) ? 'Mở đăng ký' :
                             isTournamentUpcoming(t.status) ? 'Sắp diễn ra' :
                             isTournamentInProgress(t.status) ? 'Đang diễn ra' :
                             isTournamentCompleted(t.status) ? 'Đã kết thúc' : t.status}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                            {isRecentlyCompletedTournament(t)
                              ? `Vừa kết thúc trong 14 ngày gần đây${t.endDate ? ` • ${formatDate(t.endDate)}` : ''}`
                              : `${t.startDate ? `Bắt đầu ${formatDate(t.startDate)}` : 'Đang theo dõi'}${t.endDate ? ` • Kết thúc ${formatDate(t.endDate)}` : ''}`}
                          </p>
                        </div>
                        <span className={`shrink-0 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border ${getTournamentStatusClassName(t.status)}`}>
                          {getTournamentStatusLabel(t.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Bạn chưa theo dõi giải đấu nào</p>
                  <p className="text-[10px] mt-1">Theo dõi giải để nhận thông báo khi mở đăng ký</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-5">
          <EloSidebarCard
            eloPoints={eloPoints}
            matchesWon={matchesWon}
            matchesPlayed={matchesPlayed}
            winRate={winRate}
            tierName={tierName}
            activeRank={activeRank}
            sportLabel={activeRank?.categoryName ? [activeRank.categoryName, activeRank.matchType === 'SINGLES' ? 'Đơn' : activeRank.matchType === 'DOUBLES' ? 'Đôi' : ''].filter(Boolean).join(' - ') : undefined}
          />

          <RoleSummaryCard
            registeredCount={workspace?.participatingTournaments.length || 0}
            organizerCount={(workspace?.organizedTournaments.length || 0) + (workspace?.coOrganizerTournaments.length || 0)}
            refereeCount={workspace?.refereeTournaments.length || 0}
            inviteCount={inviteCount}
          />

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Lối tắt nhanh</h3>
            <div className="flex flex-col gap-2">
              <Link href="/organizer/tournaments" className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-50/60 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span>Quản lý giải đấu</span>
                </div>
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">BTC</span>
              </Link>

              {(user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN')) && (
                <Link href="/organizer/series" className="flex items-center justify-between p-3 rounded-lg hover:bg-indigo-50/60 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span>Quản lý chuỗi giải</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Series</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => void handleCreateLiteClick()}
                disabled={isLiteLoading}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 text-slate-800 font-bold text-xs transition-all border border-slate-200/80 hover:border-emerald-200 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    {isLiteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <span>Tạo giải nhanh (Lite)</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">CLB</span>
              </button>
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                Xem trang cá nhân
              </Link>
              <Link href="/notifications" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-blue-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                Xem thông báo và lời mời
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thông báo chưa có CLB */}
      {showNoClubModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Vui lòng tạo hoặc tham gia Câu lạc bộ</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Giải đấu nhanh (Lite) dành riêng cho thành viên Câu lạc bộ. Bạn chưa tạo hoặc tham gia CLB nào. Hãy tạo Câu lạc bộ của riêng bạn để mở tính năng này!
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoClubModal(false)}
                className="font-bold text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowNoClubModal(false);
                  router.push('/communities/create');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Tạo Câu lạc bộ ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
