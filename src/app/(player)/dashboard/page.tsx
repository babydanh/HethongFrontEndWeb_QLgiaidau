'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/zustand/authStore';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import {
  tournamentsApi,
  Tournament,
  TournamentWorkspace,
  WorkspaceRefereeInvite,
  WorkspaceRefereeMatch,
} from '@/features/tournaments/api';
import { matchesApi, Match } from '@/features/matches/api';

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

const statusLabelMap: Record<string, string> = {
  REGISTRATION_OPEN: 'Mở đăng ký',
  REGISTRATION_CLOSED: 'Đã khóa đăng ký',
  IN_PROGRESS: 'Đang thi đấu',
  ONGOING: 'Đang thi đấu',
  COMPLETED: 'Hoàn thành',
  UPCOMING: 'Sắp diễn ra',
  DRAFT: 'Nháp',
  CANCELLED: 'Đã hủy',
  PENDING_APPROVAL: 'Chờ duyệt',
};

function formatDate(value?: string | null, withTime = false) {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  return withTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function getTournamentStatusClass(status?: string) {
  switch (status) {
    case 'REGISTRATION_OPEN':
      return 'bg-emerald-50 text-emerald-700';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return 'bg-amber-50 text-amber-700';
    case 'COMPLETED':
      return 'bg-blue-50 text-blue-700';
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getMatchStatusLabel(status: string) {
  if (status === 'ONGOING') return 'Đang diễn ra';
  if (status === 'COMPLETED') return 'Đã xong';
  if (status === 'SCHEDULED') return 'Đã xếp lịch';
  return status;
}

function TournamentListSection({
  title,
  actionHref,
  actionLabel,
  tournaments,
  emptyLabel,
  icon,
  accentClass,
  roleLabel,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
  tournaments: Tournament[];
  emptyLabel: string;
  icon: ReactNode;
  accentClass: string;
  roleLabel: string;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <span className={accentClass}>{icon}</span>
          {title}
        </h2>
        <Link href={actionHref} className="text-sm font-semibold text-blue-600 hover:underline">
          {actionLabel}
        </Link>
      </div>
      <div className="p-6">
        {tournaments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {tournaments.slice(0, 4).map((tournament) => (
              <div
                key={`${roleLabel}-${tournament.id}`}
                className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-white to-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 line-clamp-1">{tournament.name}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide uppercase bg-indigo-50 text-indigo-700">
                        {roleLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{tournament.category?.name || 'Chưa rõ môn'}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {tournament.locationAddress || 'Chưa cập nhật địa điểm'}
                      </span>
                      <span>Khai mạc: {formatDate(tournament.startDate)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${getTournamentStatusClass(tournament.status)}`}>
                    {statusLabelMap[tournament.status] || tournament.status}
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href={`/tournaments/${tournament.id}`}>
                    <Button size="sm" variant="outline" className="h-8 border-slate-200 font-bold text-slate-700">
                      Xem chi tiết
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [workspace, setWorkspace] = useState<TournamentWorkspace | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ranksRes, workspaceRes, matchesRes] = await Promise.all([
          rankingsApi.getUserRankings(user.id),
          tournamentsApi.getMyWorkspace(),
          matchesApi.getMatches({ userId: user.id, limit: 10 }),
        ]);

        setUserRankings(ranksRes);
        setWorkspace(workspaceRes.data || null);

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

  const activeRank = userRankings?.publicRanks?.[0];
  const eloPoints = activeRank ? activeRank.eloPoints : 1000;
  const matchesPlayed = activeRank ? activeRank.matchesPlayed : 0;
  const matchesWon = activeRank ? activeRank.matchesWon : 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const tierName = activeRank?.tier?.name || 'Bronze (Unranked)';

  const organizedCount = workspace?.organizedTournaments.length || 0;
  const coOrganizerCount = workspace?.coOrganizerTournaments.length || 0;
  const refereeCount = workspace?.refereeTournaments.length || 0;
  const inviteCount = workspace?.refereeInvites.length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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
          <Link href="/organizer/tournaments/create">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm text-white font-bold">
              <Plus className="w-4 h-4 mr-2" /> Tạo giải đấu
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" /> Lời mời và vai trò cần xử lý
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
                      <div key={invite.refereeId} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900">{invite.tournamentName}</h3>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide uppercase bg-white text-amber-700 border border-amber-200">
                                Mời làm trọng tài
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {invite.categoryName || 'Nội dung chưa rõ'} • gửi lúc {formatDate(invite.assignedAt, true)}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefereeInvite(invite, 'DECLINE')}
                              disabled={isBusy}
                              className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                              Từ chối
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRefereeInvite(invite, 'ACCEPT')}
                              disabled={isBusy}
                              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
                  Hiện không có lời mời trọng tài nào đang chờ bạn phản hồi.
                </div>
              )}
            </div>
          </section>

          <TournamentListSection
            title="Giải tôi đã đăng ký"
            actionHref="/profile"
            actionLabel="Xem hồ sơ"
            tournaments={workspace?.participatingTournaments || []}
            emptyLabel="Bạn chưa đăng ký giải đấu nào."
            icon={<Trophy className="w-5 h-5 text-blue-600" />}
            accentClass="inline-flex"
            roleLabel="VĐV"
          />

          <TournamentListSection
            title="Giải tôi đang tổ chức hoặc hỗ trợ"
            actionHref="/organizer/tournaments"
            actionLabel="Vào quản lý"
            tournaments={[...(workspace?.organizedTournaments || []), ...(workspace?.coOrganizerTournaments || [])]}
            emptyLabel="Bạn chưa có vai trò ban tổ chức nào."
            icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
            accentClass="inline-flex"
            roleLabel="BTC"
          />

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
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
                    <div key={match.id} className="rounded-2xl border border-slate-200 p-4 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 line-clamp-1">{match.tournamentName}</h3>
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
                        <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${getTournamentStatusClass(match.status)}`}>
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
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
                  Bạn chưa được phân công trận nào với vai trò trọng tài.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" /> Trận đấu tiếp theo của tôi
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : upcomingMatch ? (
                <div className="bg-slate-900 rounded-xl p-6 relative overflow-hidden">
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
                      <div className="text-xl font-black text-slate-500 italic">VS</div>
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
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
                  Bạn không có trận đấu nào sắp tới.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Trophy className="w-24 h-24" />
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chỉ số ELO</h3>
            {isLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2 mb-6">
                  <span className="text-4xl font-black text-blue-600">{eloPoints}</span>
                  {activeRank && activeRank.winStreak > 0 ? (
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-0.5 mb-1.5">
                      <Zap className="w-3 h-3 fill-emerald-600" /> {activeRank.winStreak}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">Trận thắng</span>
                    <span className="text-lg font-bold text-slate-800">{matchesWon} / {matchesPlayed}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">Tỉ lệ thắng</span>
                    <span className="text-lg font-bold text-slate-800">{winRate}%</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">Xếp hạng hiện tại</span>
                      <span className="text-xs font-bold text-slate-900">{tierName}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Vai trò của tôi</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Giải đã đăng ký</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{workspace?.participatingTournaments.length || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Lời mời chờ phản hồi</div>
                <div className="mt-1 text-2xl font-black text-amber-600">{inviteCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Vai trò BTC</div>
                <div className="mt-1 text-2xl font-black text-indigo-600">{organizedCount + coOrganizerCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Giải làm trọng tài</div>
                <div className="mt-1 text-2xl font-black text-rose-600">{refereeCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Lối tắt nhanh</h3>
            <div className="flex flex-col gap-2">
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                Xem trang cá nhân
              </Link>
              <Link href="/notifications" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                Xem thông báo và lời mời
              </Link>
              <Link href="/organizer/tournaments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                Quản lý giải đấu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
