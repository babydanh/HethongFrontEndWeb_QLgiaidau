'use client';

import { motion } from 'framer-motion';
import { Button, getButtonClasses } from '@/components/ui/Button';
import Link from 'next/link';
import { 
  Trophy, Calendar, Users, MapPin, ArrowRight, Shield, Activity, Target, 
  Plus, Bell, Mail, ChevronRight, MoreHorizontal, UserPlus, 
  Gamepad2, Gamepad, Target as Pool
} from 'lucide-react';
import Image from 'next/image';
import { categoriesApi } from '@/features/categories/api';
import { Category } from '@/types/category';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { matchesApi, Match } from '@/features/matches/api';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import LiveMatchesWidget from '@/components/ui/LiveMatchesWidget';
import { isNetworkError } from '@/utils/error';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Widget States
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerRanking[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    const loadCategories = async () => {
      try {
        const res = await categoriesApi.getCategories();
        setCategories(res.data || []);
      } catch (error: unknown) {
        if (!isNetworkError(error)) {
          console.error('Failed to load categories on homepage', error);
        }
        setCategories([]);
      }
    };
    loadCategories();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const tParams: Record<string, unknown> = { limit: 5 };
        if (selectedCategoryId) {
          tParams.categoryId = selectedCategoryId;
        }

        type RankingsResponse = Awaited<ReturnType<typeof rankingsApi.getRankings>>;
        type UserRankingsResponse = Awaited<ReturnType<typeof rankingsApi.getUserRankings>>;
        type UserMatchesResponse = Awaited<ReturnType<typeof matchesApi.getMatches>>;

        const tournamentsPromise = tournamentsApi.getTournaments(tParams);
        const communitiesPromise = communitiesApi.getCommunities({ limit: 10 });
        const lbCategoryId = selectedCategoryId || categories[0]?.id;
        const rankingsPromise: Promise<RankingsResponse> = lbCategoryId
          ? rankingsApi.getRankings({ categoryId: lbCategoryId, limit: 5 })
          : Promise.resolve({
              data: [],
              meta: {
                page: 1,
                limit: 5,
                total: 0,
              },
            });
        const userRankingsPromise: Promise<UserRankingsResponse | null> =
          isAuthenticated && user?.id
            ? rankingsApi.getUserRankings(user.id)
            : Promise.resolve(null);
        const userMatchesPromise: Promise<UserMatchesResponse> =
          isAuthenticated && user?.id
            ? matchesApi.getMatches({ userId: user.id, limit: 10 })
            : Promise.resolve({
                data: [],
                meta: {
                  currentPage: 1,
                  totalPages: 0,
                  totalItems: 0,
                  itemsPerPage: 10,
                },
              });

        const [tRes, cRes, rRes, userRankRes, userMatchesRes] = await Promise.allSettled([
          tournamentsPromise,
          communitiesPromise,
          rankingsPromise,
          userRankingsPromise,
          userMatchesPromise,
        ] as const);

        setTournaments(tRes.status === 'fulfilled' ? tRes.value.data || [] : []);
        setCommunities(cRes.status === 'fulfilled' ? cRes.value.data || [] : []);
        setLeaderboard(rRes.status === 'fulfilled' ? rRes.value.data || [] : []);

        if (userRankRes.status === 'fulfilled' && userRankRes.value) {
          setUserRankings(userRankRes.value);
        } else {
          setUserRankings(null);
        }

        if (userMatchesRes.status === 'fulfilled') {
          const upcoming = userMatchesRes.value.data.find(
            (m: Match) => m.status === 'SCHEDULED' || m.status === 'ONGOING'
          );
          setUpcomingMatch(upcoming || null);
        } else {
          setUpcomingMatch(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCategoryId, isAuthenticated, user?.id, categories]);

  const filteredCommunities = selectedCategoryId 
    ? communities.filter(c => c.categories?.some(cat => cat.id === selectedCategoryId))
    : communities;

  // Compute stats for current active category
  const activeRankInfo = userRankings?.publicRanks?.find(
    r => selectedCategoryId ? r.categoryId === selectedCategoryId : true
  ) || userRankings?.publicRanks?.[0];

  const eloPoints = activeRankInfo ? activeRankInfo.eloPoints : 1000;
  const tierName = activeRankInfo?.tier?.name || 'Chưa xếp hạng';
  const matchesPlayed = activeRankInfo ? activeRankInfo.matchesPlayed : 0;
  const matchesWon = activeRankInfo ? activeRankInfo.matchesWon : 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const sportName = categories.find(c => c.id === activeRankInfo?.categoryId)?.name || (selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : 'Chung');

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (9/12) */}
        <div className="lg:col-span-9 flex flex-col gap-8">
          
          {/* Sports Selector Bar */}
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategoryId('')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategoryId === ''
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Tất cả
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategoryId === cat.id;
              // Map slugs to icons
              const IconComponent = 
                cat.slug.includes('tennis') && !cat.slug.includes('table') ? Trophy :
                cat.slug.includes('badminton') || cat.slug.includes('cau-long') ? Gamepad :
                cat.slug.includes('pickleball') ? Target :
                cat.slug.includes('table-tennis') || cat.slug.includes('bong-ban') ? Gamepad2 :
                Activity;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Section 1: Giải đấu nổi bật */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900">Giải đấu nổi bật</h2>
              <Link href="/tournaments" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {isLoading ? (
              <div className="w-full h-[220px] md:h-[300px] bg-slate-200 animate-pulse rounded-2xl"></div>
            ) : (
              <TournamentHeroBanner tournaments={tournaments} heightClass="h-[350px] md:h-[480px]" />
            )}
          </section>

          {/* Section: Trận đấu đang diễn ra */}
          <LiveMatchesWidget limit={3} showAllLink={true} />

          {/* Section 2: Câu lạc bộ của tôi */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900">Câu lạc bộ của tôi</h2>
              <button className="text-slate-400 hover:text-blue-600 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {isLoading ? (
                <>
                  <div className="bg-slate-200 animate-pulse h-[82px] rounded-xl border border-slate-200"></div>
                  <div className="bg-slate-200 animate-pulse h-[82px] rounded-xl border border-slate-200"></div>
                </>
              ) : filteredCommunities.length > 0 ? (
                filteredCommunities.slice(0, 4).map((community) => (
                  <Link href={`/communities/${community.id}`} key={community.id}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:border-slate-300 transition-colors cursor-pointer group h-full">
                      <div className="w-12 h-12 rounded-full border border-slate-200 bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                        {community.logoUrl ? (
                          <img src={community.logoUrl} alt={community.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex flex-col flex-grow">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{community.name}</h3>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{community.description || 'Chưa có mô tả'}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-1 sm:col-span-2 text-center py-6 bg-white rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm">
                  Chưa có câu lạc bộ nào thi đấu môn này.
                </div>
              )}

              {/* Add New Community */}
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 text-slate-500 transition-colors cursor-pointer min-h-[82px]">
                <UserPlus className="w-5 h-5" />
                <span className="text-sm font-semibold">Tham gia câu lạc bộ mới</span>
              </div>

            </div>
          </section>

        </div>

        {/* Right Column (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {!isClient ? (
             <div className="animate-pulse bg-slate-200 h-[180px] rounded-xl w-full"></div>
          ) : !isAuthenticated ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 shrink-0">
                <UserPlus className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Chưa đăng nhập</h3>
              <p className="text-xs text-slate-500 mb-4">Đăng nhập để xem giải đấu và CLB của bạn.</p>
              <div className="flex flex-col w-full gap-2">
                <Link href="/login" className={getButtonClasses("default", "default", "w-full bg-blue-600 hover:bg-blue-700 shadow-sm text-xs py-2")}>
                  Đăng nhập ngay
                </Link>
                <Link href="/register" className={getButtonClasses("outline", "default", "w-full text-slate-600 hover:bg-slate-50 border-slate-200 text-xs py-2")}>
                  Đăng ký tài khoản
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-20"></div>
              <div className="w-16 h-16 rounded-full border-4 border-white shadow-sm z-10 mt-1 relative bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-blue-600 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1">{user?.fullName || 'Người dùng'}</h3>
              <p className="text-xs text-slate-400 truncate w-full mb-3">{user?.email}</p>
              
              {/* ELO & Rank display */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold text-slate-700 max-w-[100px] truncate">{sportName}: {tierName}</span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                  ELO {eloPoints}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 w-full gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-slate-800">{matchesPlayed}</span>
                  <span className="text-[10px] font-semibold text-slate-400">Trận đấu</span>
                </div>
                <div className="flex flex-col items-center border-l border-r border-slate-100">
                  <span className="text-base font-bold text-slate-800">{matchesWon}</span>
                  <span className="text-[10px] font-semibold text-slate-400">Thắng</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-slate-800">{winRate}%</span>
                  <span className="text-[10px] font-semibold text-slate-400">Tỷ lệ thắng</span>
                </div>
              </div>

              <Link href="/profile" className="w-full mt-4">
                <Button variant="outline" className="w-full text-xs py-2 border-slate-200 text-slate-650 hover:bg-slate-50 font-bold">
                  Trang cá nhân
                </Button>
              </Link>
            </div>
          )}

          {/* Widget 2: Trận đấu sắp tới */}
          {isClient && isAuthenticated && upcomingMatch && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Trận đấu tiếp theo</h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-150 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span className="bg-emerald-500 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {upcomingMatch.status === 'ONGOING' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                  </span>
                  <span className="font-semibold">{upcomingMatch.courtName || 'Sân chưa xếp'}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex flex-col items-center gap-1 w-5/12 text-center">
                    <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center font-bold text-xs text-slate-600 shadow-sm">
                      {upcomingMatch.participant1?.teamName.charAt(0) || 'P1'}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 line-clamp-1">{upcomingMatch.participant1?.teamName || 'Chưa rõ'}</span>
                  </div>
                  <div className="text-xs font-black text-slate-400 w-2/12 text-center">VS</div>
                  <div className="flex flex-col items-center gap-1 w-5/12 text-center">
                    <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center font-bold text-xs text-slate-600 shadow-sm">
                      {upcomingMatch.participant2?.teamName.charAt(0) || 'P2'}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 line-clamp-1">{upcomingMatch.participant2?.teamName || 'Chưa rõ'}</span>
                  </div>
                </div>
                <div className="text-center text-[10px] font-bold text-slate-400 mt-1 uppercase line-clamp-1">
                  {upcomingMatch.tournament?.name || 'Giải đấu'}
                </div>
                <Link href={`/tournaments/${upcomingMatch.tournamentId}`} className="w-full mt-1">
                  <Button variant="outline" className="w-full text-[10px] py-1.5 border-slate-200 text-slate-650 bg-white hover:bg-slate-50 font-bold">
                    Chi tiết trận đấu
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {isClient && isAuthenticated && !upcomingMatch && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-800">Chưa có lịch thi đấu tiếp theo</h4>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Hãy đăng ký tham gia các giải đấu để có tên trên bảng đấu!</p>
              <Link href="/tournaments" className="w-full mt-3">
                <Button variant="outline" className="w-full text-xs py-1.5 border-slate-200 text-slate-650 bg-white hover:bg-slate-50 font-bold">
                  Tìm giải đấu ngay
                </Button>
              </Link>
            </div>
          )}

          {/* Widget 3: Bảng xếp hạng nhanh */}
          {leaderboard.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  BXH {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : categories[0]?.name || 'Giải đấu'}
                </h3>
                <Link href="/rankings" className="text-blue-600 hover:underline text-[10px] font-bold">
                  Xem tất cả
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {leaderboard.slice(0, 5).map((item, index) => {
                  const isCurrentUser = user && item.userId === user.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg border transition-colors ${
                        isCurrentUser
                          ? 'bg-blue-50 border-blue-200'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-xs font-black w-4 text-center ${
                        index === 0 ? 'text-amber-500' :
                        index === 1 ? 'text-slate-400' :
                        index === 2 ? 'text-amber-705' : 'text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full border border-slate-200 bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                        {item.user?.avatarUrl ? (
                          <img src={item.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-blue-600 uppercase">
                            {item.user?.fullName?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col flex-grow min-w-0">
                        <span className={`text-xs truncate ${isCurrentUser ? 'font-bold text-blue-700' : 'font-semibold text-slate-800'}`}>
                          {item.user?.fullName || 'Người dùng'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold text-slate-700">{item.eloPoints}</span>
                        <span className="text-[8px] font-bold text-slate-405 uppercase">{item.tier?.name || 'Hạng E'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center">
              <Trophy className="w-8 h-8 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-800">Bảng xếp hạng</h4>
              <p className="text-[10px] text-slate-500 mt-1">Chưa có dữ liệu xếp hạng cho môn thi đấu này.</p>
            </div>
          )}

          {/* Widget 4: Banner Ads 4:3 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col cursor-pointer group">
            <div className="aspect-[4/3] bg-slate-900 relative p-5 flex flex-col justify-end">
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent z-10"></div>
              <div className="absolute inset-0 bg-blue-600 opacity-20 group-hover:opacity-35 transition-opacity duration-300"></div>
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white/90 text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase z-20">QUẢNG CÁO</div>
              
              <div className="relative z-20 mt-auto">
                 <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-1">CỬA HÀNG TOURNA</span>
                 <h4 className="text-sm font-bold text-white mb-0.5 group-hover:text-blue-200 transition-colors">Vợt Tennis PRO 2026</h4>
                 <p className="text-[10px] text-white/80 font-medium line-clamp-2">Ưu đãi độc quyền giảm giá 20% cho tất cả người chơi đạt ELO trên 1200.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
