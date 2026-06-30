'use client';

// Reading this as: Sports platform homepage with live matches feed, featured tournaments, and community bento grid.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buildMatchScoreSummary } from '@/features/matches/score-display';
import Image from 'next/image';
import {
  Trophy, Calendar, Users, MapPin, ArrowRight, Shield, Heart, Share2, Play,
  Plus, Bell, Mail, ChevronRight, UserPlus, Star, Loader2, MessageSquare
} from 'lucide-react';
import { getSportLogo } from '@/constants/sports';
import { categoriesApi } from '@/features/categories/api';
import { Category } from '@/types/category';
import { useAuthStore } from '@/lib/zustand/authStore';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { matchesApi } from '@/features/matches/api';
import { BracketMatch } from '@/features/tournaments/api';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import { isNetworkError } from '@/utils/error';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function CommunityLogoAvatar({ src, alt }: { src?: string | null; alt: string }) {
  const fallbackSrc = '/images/vndc_sport_logo.png';
  // Track only whether the image failed to load — src is derived directly from props
  const [imgError, setImgError] = useState(false);
  // Reset error when src changes (React recommended "derived state" pattern)
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setImgError(false);
  }

  const imageSrc = (!imgError && src?.trim()) ? src : fallbackSrc;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setImgError(true)}
      unoptimized={imageSrc === fallbackSrc}
    />
  );
}


export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Live Matches Feed
  const [liveMatches, setLiveMatches] = useState<BracketMatch[]>([]);
  const [highFives, setHighFives] = useState<Record<string, number>>({});

  // Widget States
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<unknown | null>(null);
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

        const tournamentsPromise = tournamentsApi.getTournaments(tParams);
        
        const cParams: Record<string, unknown> = { limit: 6 };
        if (selectedCategoryId) {
          cParams.categoryId = selectedCategoryId;
        }
        const communitiesPromise = communitiesApi.getCommunities(cParams);
        const liveMatchesPromise = matchesApi.getMatches({ status: 'ONGOING', limit: 4 });
        
        const lbCategoryId = selectedCategoryId || categories[0]?.id;
        const rankingsPromise = lbCategoryId
          ? rankingsApi.getRankings({ categoryId: lbCategoryId, limit: 5 })
          : Promise.resolve({ data: [] });
          
        const userRankingsPromise = isAuthenticated && user?.id
          ? rankingsApi.getUserRankings(user.id)
          : Promise.resolve(null);

        const [tRes, cRes, lRes, rRes, userRankRes] = await Promise.allSettled([
          tournamentsPromise,
          communitiesPromise,
          liveMatchesPromise,
          rankingsPromise,
          userRankingsPromise,
        ] as const);

        setTournaments(tRes.status === 'fulfilled' ? tRes.value.data || [] : []);
        setCommunities(cRes.status === 'fulfilled' ? cRes.value.data || [] : []);
        setLiveMatches(lRes.status === 'fulfilled' ? (lRes.value.data as unknown as BracketMatch[]) || [] : []);
        setLeaderboard(rRes.status === 'fulfilled' ? rRes.value.data || [] : []);

        if (userRankRes.status === 'fulfilled' && userRankRes.value) {
          setUserRankings(userRankRes.value);
        } else {
          setUserRankings(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCategoryId, isAuthenticated, user?.id, categories]);

  // High five simulation handler
  const handleHighFive = (matchId: string) => {
    setHighFives(prev => ({
      ...prev,
      [matchId]: (prev[matchId] || 0) + 1
    }));
    toast.success('High five! 👏', { icon: '👏', id: `hf-${matchId}` });
  };

  const shareMatch = (matchId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/live/${matchId}`);
    toast.success('Đã sao chép liên kết xem trận đấu!');
  };

  const filteredCommunities = selectedCategoryId 
    ? communities.filter(c => c.categories?.some(cat => cat.id === selectedCategoryId))
    : communities;

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
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 animate-in fade-in duration-200">
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (9/12) */}
        <div className="lg:col-span-9 flex flex-col gap-8">
          
          {/* Sports Selector Bar */}
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategoryId('')}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategoryId === ''
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
              }`}
            >
              {selectedCategoryId === '' && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-blue-600 rounded-full z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Tất cả
              </span>
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-white border-transparent'
                      : 'bg-white text-slate-650 border-slate-205 hover:border-slate-350 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategory"
                      className="absolute inset-0 bg-blue-600 rounded-full z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {(() => {
                      const logo = getSportLogo(cat.name);
                      return logo ? (
                        <img src={logo} alt={cat.name} className="w-4 h-4 object-contain" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      );
                    })()}
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section 1: Giải đấu nổi bật */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Giải đấu nổi bật</h2>
              <Link href="/tournaments" className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            {isLoading ? (
              <div className="w-full h-[220px] md:h-[300px] bg-slate-200 animate-pulse rounded-2xl"></div>
            ) : (
              <TournamentHeroBanner tournaments={tournaments} heightClass="h-[320px] md:h-[420px]" />
            )}
          </section>

          {/* Section 2: Trận live (Match Feed style) */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Trận đấu trực tiếp</h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="bg-slate-200 animate-pulse h-40 rounded-2xl" />
                <div className="bg-slate-200 animate-pulse h-40 rounded-2xl" />
              </div>
            ) : liveMatches.length === 0 ? (
              <div className="bg-white border rounded-2xl p-12 text-center text-slate-450 font-bold text-xs">
                Hiện chưa có trận đấu nào đang trực tiếp.
              </div>
            ) : (
              <div className="space-y-4">
                {liveMatches.map((match) => {
                  const currentHighFives = highFives[match.id] || 0;
                  return (
                    <motion.div 
                      key={match.id}
                      whileHover={{ y: -3, scale: 1.005 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] overflow-hidden flex flex-col justify-between"
                    >
                      {/* Match Header */}
                      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                          </span>
                          <span className="text-rose-600 uppercase tracking-wider glow-text-rose">Trực tiếp</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">Vòng {match.roundNumber}</span>
                          {match.courtName && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{match.courtName}</span>
                            </>
                          )}
                        </div>
                        <span className="uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[9px] tracking-wider font-extrabold">{match.group?.stage?.name || 'Vòng đấu'}</span>
                      </div>

                      {/* Opponents Match Grid */}
                      <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative">
                        {/* Player 1 */}
                        <div className="flex items-center gap-3.5 w-full sm:w-5/12 justify-center sm:justify-start">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-550 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md uppercase shrink-0">
                            {match.participant1?.teamName.charAt(0) || '1'}
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-900 block leading-tight">{match.participant1?.teamName || 'Chưa rõ'}</span>
                            {match.participant1?.seed && <span className="text-[10px] text-blue-600 font-bold bg-blue-50/50 px-1.5 py-0.2 rounded mt-0.5 inline-block">Hạt giống #{match.participant1.seed}</span>}
                          </div>
                        </div>

                        {/* Versus & Scores */}
                        <div className="flex flex-col items-center justify-center w-full sm:w-2/12 shrink-0">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tỉ số</span>
                          <div className="mt-1 flex items-center gap-2.5 bg-slate-900 text-emerald-400 border border-slate-800 px-4 py-2 rounded-xl font-mono text-base font-black shadow-[0_0_15px_rgba(16,185,129,0.15)] leading-none tracking-widest glow-text-emerald">
                            {buildMatchScoreSummary({
                              p1SetsWon: match.p1SetsWon ?? 0,
                              p2SetsWon: match.p2SetsWon ?? 0,
                              matchConfig: match.matchConfig ?? null,
                              tournament: { sportRules: null },
                              scoreDetails: match.scoreDetails as Record<string, unknown> | null | undefined,
                            })}
                          </div>
                        </div>

                        {/* Player 2 */}
                        <div className="flex items-center gap-3.5 w-full sm:w-5/12 justify-center sm:justify-end text-center sm:text-right">
                          <div>
                            <span className="text-sm font-black text-slate-900 block leading-tight">{match.participant2?.teamName || 'Chưa rõ'}</span>
                            {match.participant2?.seed && <span className="text-[10px] text-blue-600 font-bold bg-blue-50/50 px-1.5 py-0.2 rounded mt-0.5 inline-block">Hạt giống #{match.participant2.seed}</span>}
                          </div>
                          <div className="order-first sm:order-last w-11 h-11 rounded-full bg-gradient-to-tr from-blue-550 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md uppercase shrink-0">
                            {match.participant2?.teamName.charAt(0) || '2'}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Footer (High five, Replay, Share) */}
                      <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 grid grid-cols-3 gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleHighFive(match.id)}
                          className="flex items-center justify-center gap-1.5 py-2 hover:bg-white rounded-xl text-[11px] font-bold text-slate-650 transition-colors shadow-sm border border-transparent hover:border-slate-150 duration-150 cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
                          <span>Cổ vũ ({currentHighFives})</span>
                        </motion.button>

                        <Link 
                          href={`/live/${match.id}`}
                          className="w-full"
                        >
                          <motion.div 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center justify-center gap-1.5 py-2 hover:bg-white rounded-xl text-[11px] font-bold text-slate-650 transition-colors shadow-sm border border-transparent hover:border-slate-150 cursor-pointer w-full"
                          >
                            <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
                            <span>Xem trực tiếp</span>
                          </motion.div>
                        </Link>

                        <motion.button 
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => shareMatch(match.id)}
                          className="flex items-center justify-center gap-1.5 py-2 hover:bg-white rounded-xl text-[11px] font-bold text-slate-650 transition-colors shadow-sm border border-transparent hover:border-slate-150 cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-blue-500" />
                          <span>Chia sẻ</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 3: Câu lạc bộ (Bento Grid Compounded) */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Cộng đồng câu lạc bộ</h2>
              <Link href="/communities" className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1">
                Khám phá thêm <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLoading ? (
                <>
                  <div className="bg-slate-200 animate-pulse h-20 rounded-xl" />
                  <div className="bg-slate-200 animate-pulse h-20 rounded-xl" />
                </>
              ) : filteredCommunities.length > 0 ? (
                filteredCommunities.slice(0, 4).map((community) => {
                  const locationText = community.locationAddress || "Việt Nam";
                  return (
                    <Link href={`/communities/${community.id}`} key={community.id} className="h-full">
                      <motion.div 
                        whileHover={{ y: -5, scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                        className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-shadow duration-500 flex flex-col justify-between group cursor-pointer h-full relative"
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none z-20" />
                        
                        {/* Header Banner */}
                        <div className="h-32 bg-slate-50 relative overflow-hidden shrink-0">
                          {community.bannerUrl ? (
                            <Image 
                              src={community.bannerUrl.split(',')[0]} 
                              alt="Banner" 
                              fill 
                              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 opacity-90 group-hover:opacity-95 transition-opacity" />
                          )}
                          
                          {/* Join Mode Badge */}
                          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-slate-800 border border-white/20">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              community.joinMode === 'INVITE_ONLY' ? 'bg-rose-500 animate-pulse' : community.joinMode === 'APPROVAL' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span className="text-[8px] font-extrabold tracking-wider uppercase text-slate-700">
                              {community.joinMode === 'INVITE_ONLY' ? 'Chỉ mời' : community.joinMode === 'APPROVAL' ? 'Xét duyệt' : 'Tự do'}
                            </span>
                          </div>

                          {/* Floating Location Badge */}
                          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-slate-800 border border-white/20">
                            <MapPin className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500/20" />
                            <span className="text-[8px] font-extrabold tracking-wider uppercase truncate max-w-[90px]">{locationText}</span>
                          </div>
                        </div>

                        {/* Card Info (White Area) */}
                        <div className="p-4 pt-3 flex items-start gap-3 bg-white relative">
                          {/* Circular Logo - Half overlap */}
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-white shadow-md -mt-8 z-10 shrink-0 relative">
                            <CommunityLogoAvatar src={community.logoUrl} alt={community.name} />
                          </div>

                          {/* Text info next to logo */}
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
                                {community.name}
                              </h4>
                              {community.status === 'APPROVED' && (
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                              )}
                            </div>

                            {/* Stats row directly below title */}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold flex-wrap">
                              <span className="flex items-center gap-0.5">
                                <Users className="w-3 h-3 text-slate-400" />
                                {community._count?.members || 0} thành viên
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Trophy className="w-3 h-3 text-slate-400" />
                                {community._count?.tournaments || 0} giải đấu
                              </span>
                            </div>

                            {/* Categories tags */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {community.categories && community.categories.length > 0 ? (
                                community.categories.slice(0, 2).map(cat => (
                                  <span key={cat.id} className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[8px] font-bold border border-blue-100 uppercase tracking-wider">
                                    {cat.name}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-50 text-slate-500 text-[8px] font-bold border border-slate-100 uppercase tracking-wider">
                                  Giao hữu
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-2 text-center py-8 bg-white rounded-2xl border border-slate-200 border-dashed text-slate-450 font-bold text-xs">
                  Chưa có câu lạc bộ nào thi đấu môn này.
                </div>
              )}

              {/* Add New Community Button Grid */}
              <Link href="/communities" className="col-span-1 sm:col-span-2">
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="bg-slate-50 rounded-2xl border border-dashed border-slate-305 p-4 flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-700 text-slate-500 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-black">Khám phá và tham gia câu lạc bộ mới</span>
                </motion.div>
              </Link>
            </div>
          </section>

        </div>

        {/* Right Column (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {!isClient ? (
             <div className="animate-pulse bg-slate-200 h-[180px] rounded-xl w-full"></div>
           ) : !isAuthenticated ? (
             <motion.div 
               whileHover={{ y: -2 }}
               className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-5 flex flex-col items-center text-center"
             >
               <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 shrink-0">
                 <UserPlus className="w-6 h-6 text-slate-400" />
               </div>
               <h3 className="text-sm font-bold text-slate-900 mb-1">Chưa đăng nhập</h3>
               <p className="text-xs text-slate-500 mb-4">Đăng nhập để xem giải đấu và CLB của bạn.</p>
               <div className="flex flex-col w-full gap-2">
                 <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs shadow-sm transition-colors cursor-pointer">
                   Đăng nhập ngay
                 </Link>
                 <Link href="/register" className="border border-slate-205 text-slate-650 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl text-center text-xs transition-colors">
                   Đăng ký tài khoản
                 </Link>
               </div>
             </motion.div>
           ) : (
             <motion.div 
               whileHover={{ y: -2 }}
               className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-5 flex flex-col items-center text-center relative overflow-hidden"
             >
               {/* Sports cover banner image */}
               <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-slate-900 to-slate-950">
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
               </div>

               <div className="w-16 h-16 rounded-full border-4 border-white shadow-md z-10 mt-5 relative bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                 {user?.avatarUrl ? (
                   <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-xl font-bold text-blue-600 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
                 )}
               </div>
               <h3 className="text-base font-bold text-slate-900 mt-2.5 line-clamp-1 leading-snug">{user?.fullName || 'Người dùng'}</h3>
               <p className="text-xs text-slate-400 truncate w-full mb-3.5">{user?.email}</p>
               {/* ELO & Rank display */}
               <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-150 shadow-sm z-10">
                 <Trophy className="w-3.5 h-3.5 text-amber-500" />
                 <span className="text-[10px] font-bold text-slate-700 max-w-[100px] truncate">{sportName}: {tierName}</span>
                 <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                   ELO {eloPoints}
                 </span>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-3 w-full gap-2 mt-4 pt-4 border-t border-slate-100">
                 <div className="flex flex-col items-center">
                   <span className="text-base font-black text-slate-800 leading-none">{matchesPlayed}</span>
                   <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Trận</span>
                 </div>
                 <div className="flex flex-col items-center border-l border-r border-slate-100">
                   <span className="text-base font-black text-slate-800 leading-none">{matchesWon}</span>
                   <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Thắng</span>
                 </div>
                 <div className="flex flex-col items-center">
                   <span className="text-base font-black text-slate-800 leading-none">{winRate}%</span>
                   <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Tỷ lệ</span>
                 </div>
               </div>

               <Link href="/profile" className="w-full mt-4">
                 <button className="w-full text-xs py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold rounded-xl transition-all active:scale-95 duration-150 cursor-pointer shadow-sm">
                   Trang cá nhân
                 </button>
               </Link>
             </motion.div>
           )}

          {/* Widget 2: Bảng xếp hạng nhanh */}
          {leaderboard.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-5">
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
                  const getRankBadgeClass = (idx: number) => {
                    if (idx === 0) return 'gold-medal-glow text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm';
                    if (idx === 1) return 'silver-medal-glow text-slate-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm';
                    if (idx === 2) return 'bronze-medal-glow text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm';
                    return 'text-slate-400 w-5 text-center text-xs font-bold';
                  };
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2.5 py-1.5 px-2 rounded-xl border transition-all ${
                        isCurrentUser
                          ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center shrink-0 w-6">
                        <span className={getRankBadgeClass(index)}>
                          {index + 1}
                        </span>
                      </div>
                      <Link href={`/users/${item.userId}`} className="flex items-center gap-2.5 flex-1 min-w-0">
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
                          <span className={`text-xs truncate ${isCurrentUser ? 'font-black text-blue-700' : 'font-semibold text-slate-800 hover:text-blue-600'}`}>
                            {item.user?.fullName || 'Người dùng'}
                          </span>
                        </div>
                      </Link>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold text-slate-700">{item.eloPoints}</span>
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">{item.tier?.name || 'Hạng E'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center">
              <Trophy className="w-8 h-8 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-800">Bảng xếp hạng</h4>
              <p className="text-[10px] text-slate-500 mt-1">Chưa có dữ liệu xếp hạng cho môn thi đấu này.</p>
            </div>
          )}

          {/* Widget 3: Banner Ads 4:3 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col cursor-pointer group">
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
