'use client';

import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Trophy, Calendar, Users, Activity, Settings, Plus, MapPin, Loader2, Award, Zap, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { matchesApi, Match } from '@/features/matches/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [participatingTournaments, setParticipatingTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ranksRes, myTournamentsRes, matchesRes] = await Promise.all([
          rankingsApi.getUserRankings(user.id),
          tournamentsApi.getMyTournaments(),
          matchesApi.getMatches({ userId: user.id, limit: 10 })
        ]);
        setUserRankings(ranksRes);
        setParticipatingTournaments(myTournamentsRes.data || []);
        
        // Find next upcoming match
        if (matchesRes && matchesRes.data) {
          const upcoming = matchesRes.data.find(
            (m: Match) => m.status === 'SCHEDULED' || m.status === 'ONGOING'
          );
          setUpcomingMatch(upcoming || null);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const activeRank = userRankings?.publicRanks?.[0];
  const eloPoints = activeRank ? activeRank.eloPoints : 1000;
  const matchesPlayed = activeRank ? activeRank.matchesPlayed : 0;
  const matchesWon = activeRank ? activeRank.matchesWon : 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const tierName = activeRank?.tier?.name || 'Bronze (Unranked)';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      
      {/* Header: Welcome & Quick Actions */}
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
            <h1 className="text-2xl font-bold text-slate-900">Chào mừng trở lại, {user?.fullName?.split(' ').pop() || 'bạn'}! 👋</h1>
            <p className="text-sm text-slate-500 mt-1">Hôm nay bạn muốn tham gia giải đấu nào?</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/tournaments">
            <Button variant="outline" className="text-slate-650 border-slate-200 hover:bg-slate-50 font-bold">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Section: Giải đấu đang tham gia */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-black text-slate-905 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-600" /> Giải đấu của tôi
              </h2>
              <Link href="/profile" className="text-sm font-semibold text-blue-600 hover:underline">Xem tất cả</Link>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                {isLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : participatingTournaments.length > 0 ? (
                  participatingTournaments.slice(0, 3).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors bg-white">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5 text-blue-505" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{t.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {t.locationAddress || 'Chưa cập nhật'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end shrink-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                          t.status === 'REGISTRATION_OPEN' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                          t.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' : 'bg-slate-105 text-slate-700'
                        }`}>
                          {t.status === 'REGISTRATION_OPEN' ? 'Mở đăng ký' :
                           t.status === 'IN_PROGRESS' ? 'Đang đấu' :
                           t.status === 'COMPLETED' ? 'Hoàn thành' : t.status}
                        </span>
                        <Link href={`/tournaments/${t.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200 font-bold text-slate-650">Chi tiết</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-250 rounded-xl text-slate-450 text-sm">
                    Bạn chưa đăng ký tham gia giải đấu nào.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: Trận đấu sắp tới */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-black text-slate-905 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" /> Trận đấu tiếp theo
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-650" />
                </div>
              ) : upcomingMatch ? (
                <div className="bg-slate-900 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 rounded-full blur-[80px] opacity-20"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-4">
                      {upcomingMatch.status === 'ONGOING' ? 'ĐANG DIỄN RA' : 'SẮP DIỄN RA'}
                    </span>
                    
                    <div className="flex items-center justify-center gap-8 w-full">
                      <div className="flex flex-col items-center gap-3 w-5/12">
                        <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-slate-400">Bạn</span>
                          )}
                        </div>
                        <span className="font-bold text-white text-center text-sm line-clamp-1">{upcomingMatch.participant1?.teamName || 'Bạn'}</span>
                      </div>

                      <div className="text-xl font-black text-slate-500 italic">VS</div>

                      <div className="flex flex-col items-center gap-3 w-5/12">
                        <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xl">
                          {upcomingMatch.participant2?.teamName?.charAt(0) || '?'}
                        </div>
                        <span className="font-bold text-white text-center text-sm line-clamp-1">
                          {upcomingMatch.participant2?.teamName || 'Chưa xác định'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 w-full flex justify-between items-center text-xs">
                      <div className="text-slate-400 font-semibold truncate max-w-[200px]">{upcomingMatch.tournament?.name}</div>
                      <div className="flex gap-2">
                        <Link href={`/live/${upcomingMatch.id}`}>
                          <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs py-1 px-3">
                            Xem tỷ số
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-205 rounded-xl text-slate-450 text-sm">
                  Bạn không có trận đấu nào sắp tới. Hãy đăng ký giải đấu mới!
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column (Widgets) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Widget: ELO & Thống kê */}
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
                  {activeRank && activeRank.winStreak > 0 && (
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-0.5 mb-1.5 animate-bounce">
                      <Zap className="w-3 h-3 fill-emerald-550" /> {activeRank.winStreak}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">Trận Thắng</span>
                    <span className="text-lg font-bold text-slate-805">{matchesWon} / {matchesPlayed}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">Tỉ lệ Thắng</span>
                    <span className="text-lg font-bold text-slate-805">{winRate}%</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">Xếp hạng hiện tại</span>
                      <span className="text-xs font-bold text-slate-900">{tierName}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-650 shadow-sm shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Widget: Quản lý nhanh */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
             <h3 className="text-sm font-bold text-slate-900 mb-4">Lối tắt nhanh</h3>
             <div className="flex flex-col gap-2">
               <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                 <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Settings className="w-4 h-4" /></div>
                 Xem trang cá nhân
               </Link>
               <Link href="/organizer/tournaments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all border border-transparent hover:border-slate-200">
                 <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0"><Trophy className="w-4 h-4" /></div>
                 Quản lý giải đấu (BTC)
               </Link>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
