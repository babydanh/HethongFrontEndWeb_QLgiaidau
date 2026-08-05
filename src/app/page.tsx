'use client';

// Reading this as: Sports platform homepage with live matches feed, featured tournaments, and community bento grid.
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { buildMatchScoreSummary, getMatchScorePresentation, resolveMatchSportRules, extractMatchScores } from '@/features/matches/score-display';
import Image from 'next/image';
import {
  Trophy, Calendar, Users, MapPin, ArrowRight, Shield, Heart, Share2, Play,
  Plus, Bell, Mail, ChevronRight, ChevronLeft, UserPlus, Star, Loader2, MessageSquare,
  Hourglass, Coins, Sparkles
} from 'lucide-react';
import { getSportLogo } from '@/constants/sports';
import { categoriesApi } from '@/features/categories/api';
import { Category } from '@/types/category';
import { useAuthStore } from '@/lib/zustand/authStore';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { matchesApi } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import { BracketMatch } from '@/features/tournaments/api';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import HomepageEloProgressCard from '@/components/rankings/HomepageEloProgressCard';
import {
  getBestRankForCategory,
  getRanksForCategory,
  getRankTierName,
  getRankWinRate,
} from '@/features/rankings/elo-display';
import { isNetworkError } from '@/utils/error';
import { isTournamentCancelled, isTournamentCompleted, isTournamentInProgress } from '@/utils/tournament-status';
import { getMatchRoundLabel } from '@/utils/match-round-label';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ShareModal from '@/components/common/ShareModal';
import { shouldHideFeaturedCardText } from '@/features/tournaments/featured-banner';
import { RankAvatar } from '@/components/ui/RankAvatar';

interface EnrichedTournament {
  id: string;
  name: string;
  createdBy?: string;
  sportRules?: unknown | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryConfig?: Record<string, unknown> | null;
  category?: {
    name: string;
  } | null;
  matchType?: string;
  genderRestriction?: string;
  isRanked?: boolean;
  format?: Tournament['format'];
  maxParticipants?: number;
}

interface EnrichedMatch extends Omit<BracketMatch, 'tournament'> {
  tournament?: EnrichedTournament | null;
}

const getShortName = (fullName: string | null | undefined): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 2) {
    return parts.slice(-2).join(' ');
  }
  return fullName;
};

const getTeamShortName = (teamName: string | null | undefined): string => {
  if (!teamName) return 'Chờ xác định';
  if (teamName.includes(' - ')) {
    return teamName.split(' - ').map(name => getShortName(name)).join(' - ');
  }
  return getShortName(teamName);
};

interface GroupMatchesData {
  id?: string | null;
  name: string;
  logoUrl?: string | null;
  isRanked?: boolean;
  matches: BracketMatch[];
}

const getFormatLabel = (matchType?: string, genderRestriction?: string | null) => {
  const mt = matchType || '';
  const gr = genderRestriction || '';
  if (mt === 'SINGLES') {
    return gr === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam';
  }
  if (mt === 'DOUBLES') {
    return gr === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam';
  }
  if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
    return 'Đôi Nam Nữ';
  }
  return mt === 'DOUBLES' ? 'Đôi' : mt === 'SINGLES' ? 'Đơn' : 'Đôi Nam Nữ';
};

function CommunityLogoAvatar({ src, alt }: { src?: string | null; alt: string }) {
  const fallbackSrc = '/vndcsport.svg';
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

function LiveMatchSportLabel({ match }: { match: BracketMatch }) {
  const resolvedRules = resolveMatchSportRules(match);
  const presentation = getMatchScorePresentation(resolvedRules.kind);

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span>{presentation.sportLabel}</span>
    </span>
  );
}

/** Dịch tên stage từ backend (tiếng Anh) sang tiếng Việt */
function translateStageName(name: string | null | undefined): string {
  if (!name) return '';
  const map: Record<string, string> = {
    'Elimination Stage': 'Vòng loại trực tiếp',
    'Knockout Stage': 'Vòng loại trực tiếp',
    'Group Stage': 'Vòng bảng',
    'Round Robin': 'Vòng tròn tính điểm',
    'Final Stage': 'Vòng chung kết',
    'Qualification Stage': 'Vòng loại',
    'Preliminary Stage': 'Vòng sơ loại',
    'Main Stage': 'Vòng chính',
    'Quarter Finals': 'Tứ kết',
    'Quarterfinals': 'Tứ kết',
    'Semi Finals': 'Bán kết',
    'Semifinals': 'Bán kết',
    'Final': 'Chung kết',
    'Grand Final': 'Chung kết tổng',
    'Grand Final Reset': 'Chung kết nhánh thua',
    'Winners Bracket': 'Nhánh thắng',
    'Losers Bracket': 'Nhánh thua',
    'First Round': 'Vòng 1',
    'Second Round': 'Vòng 2',
    'Third Round': 'Vòng 3',
    'Round of 16': 'Vòng 16',
    'Round of 8': 'Tứ kết',
    'Round of 4': 'Bán kết',
    'Round of 2': 'Chung kết',
  };
  return map[name] || name;
}

/** Đếm ngược — chỉ hiện ngày (dùng cho trang chủ / danh sách) */
function RegistrationCountdown({ targetDate }: { targetDate: string }) {
  const [text, setText] = useState('');
  const target = useMemo(() => new Date(targetDate), [targetDate]);

  useEffect(() => {
    const update = () => {
      const days = Math.floor((target.getTime() - Date.now()) / 86400000);
      if (days <= 0) { setText('Đang mở đăng ký'); return; }
      setText(`Còn ${days} ngày`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [target]);

  if (!text) return null;
  return (
    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap">
      <Hourglass className="w-3 h-3 inline-block" /> {text}
    </span>
  );
}

function TournamentLogoAvatar({ src, alt }: { src?: string | null; alt: string }) {
  const fallbackSrc = '/vndcsport.svg';
  const [imgError, setImgError] = useState(false);
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

function HomepageTournamentCard({ tournament }: { tournament: Tournament }) {
  const [imgError, setImgError] = useState(false);
  const fallbackSrc = '/vndcsport.svg';
  const imageSrc = (!imgError && tournament.bannerUrl?.trim()) ? tournament.bannerUrl.split(',')[0] : fallbackSrc;
  const hideFeaturedCardText = shouldHideFeaturedCardText(tournament);

  const dateRange = useMemo(() => {
    if (!tournament.startDate || !tournament.endDate) return '';
    const start = new Date(tournament.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const end = new Date(tournament.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${start} - ${end}`;
  }, [tournament.startDate, tournament.endDate]);

  return (
    <div className={`${hideFeaturedCardText ? 'aspect-[21/9] bg-slate-900' : 'bg-white'} rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col group relative`}>
      <div className={`${hideFeaturedCardText ? 'absolute inset-0' : 'h-44 shrink-0'} bg-slate-900 relative overflow-hidden`}>
        <Image
          src={imageSrc}
          alt={tournament.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={() => setImgError(true)}
          unoptimized={imageSrc === fallbackSrc}
        />
        {!hideFeaturedCardText && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        )}
        
        {/* Badges */}
        {!hideFeaturedCardText && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full shadow-sm text-slate-800 text-[9px] font-bold tracking-wider uppercase border border-white/20">
            <Trophy className="w-3 h-3 inline-block mr-1" />
            {tournament.category?.name || 'Giải đấu'}
          </span>
          <span className="px-3 py-1 bg-emerald-600/90 backdrop-blur-md rounded-full shadow-sm text-white text-[9px] font-bold tracking-wider uppercase">
            Vừa kết thúc
          </span>
        </div>
        )}
      </div>

      {!hideFeaturedCardText && (
        <div className="p-5 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
              {tournament.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateRange}</span>
            </div>
          </div>
        </div>
      )}

      <Link href={`/tournaments/${tournament.id}`} className="absolute inset-0 z-20" />
    </div>
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
  const [liveMatchPage, setLiveMatchPage] = useState(1);
  const [upcomingMatches, setUpcomingMatches] = useState<BracketMatch[]>([]);
  const [completedMatches, setCompletedMatches] = useState<BracketMatch[]>([]);
  const [highFives, setHighFives] = useState<Record<string, number>>({});
  const hasLoadedFeedRef = useRef(false);
  const feedRequestInFlightRef = useRef(false);
  const feedRefreshQueuedRef = useRef(false);
  const [feedRefreshTick, setFeedRefreshTick] = useState(0);

  const [tournamentPages, setTournamentPages] = useState<Record<string, number>>({});

  // Ranked Tournament State
  const [rankedTournament, setRankedTournament] = useState<Tournament | null>(null);
  const [rankedTournamentMatches, setRankedTournamentMatches] = useState<BracketMatch[]>([]);
  const [isLoadingRanked, setIsLoadingRanked] = useState(false);

  // Widget States
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<unknown | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    const loadCategories = async () => {
      // Cache categories trong sessionStorage (5 phút)
      const CACHE_KEY = 'homepage_categories_v3';
      const CACHE_TTL = 5 * 60 * 1000; // 5 phút
      try {
        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Date.now() - parsed.timestamp < CACHE_TTL) {
                setCategories(parsed.data || []);
                return; // Dùng cache, không cần gọi API
              }
            } catch {
              // Ignore parse error, fetch fresh
            }
          }
        }
        const res = await categoriesApi.getCategories();
        const data = (res.data && res.data.length > 0) ? res.data : [
          { id: 'pickleball', name: 'Pickleball', slug: 'pickleball' },
          { id: 'tennis', name: 'Tennis', slug: 'tennis' },
          { id: 'badminton', name: 'Cầu lông', slug: 'badminton' },
          { id: 'table_tennis', name: 'Bóng bàn', slug: 'table-tennis' },
        ];
        setCategories(data);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
        }
      } catch (error: unknown) {
        if (!isNetworkError(error)) {
          console.error('Failed to load categories on homepage', error);
        }
        setCategories([
          { id: 'pickleball', name: 'Pickleball', slug: 'pickleball' },
          { id: 'tennis', name: 'Tennis', slug: 'tennis' },
          { id: 'badminton', name: 'Cầu lông', slug: 'badminton' },
          { id: 'table_tennis', name: 'Bóng bàn', slug: 'table-tennis' },
        ]);
      }
    };
    loadCategories();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const refreshWhenReady = () => {
      if (document.visibilityState === 'visible') {
        setFeedRefreshTick((value) => value + 1);
      }
    };

    const interval = window.setInterval(refreshWhenReady, 60000);
    document.addEventListener('visibilitychange', refreshWhenReady);
    window.addEventListener('focus', refreshWhenReady);
    window.addEventListener('online', refreshWhenReady);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenReady);
      window.removeEventListener('focus', refreshWhenReady);
      window.removeEventListener('online', refreshWhenReady);
    };
  }, []);

  useEffect(() => {
    if (feedRequestInFlightRef.current) {
      feedRefreshQueuedRef.current = true;
      return;
    }
    feedRequestInFlightRef.current = true;

    const fetchData = async () => {
      try {
        // Keep loaded cards visible during background refreshes.
        setIsLoading(!hasLoadedFeedRef.current || Boolean(selectedCategoryId));
        setIsLoadingRanked(true);
        const tParams: Record<string, unknown> = { limit: 20 };
        if (selectedCategoryId) {
          tParams.categoryId = selectedCategoryId;
        }

        // Fetch fresh tournaments and communities
        const tournamentsPromise = tournamentsApi.getPublicTournaments(tParams);
        const cParams: Record<string, unknown> = { limit: 6 };
        if (selectedCategoryId) {
          cParams.categoryId = selectedCategoryId;
        }
        const communitiesPromise = communitiesApi.getCommunities(cParams);

        // Start independent requests together to avoid serial network latency.
        const allMatchesPromise = matchesApi.getMatches({
          status: 'ONGOING,SCHEDULED,COMPLETED',
          limit: 50,
          publicOnly: true,
        });
        const userRankingsPromise = isAuthenticated && user?.id
          ? rankingsApi.getUserRankings(user.id)
          : Promise.resolve(null);

        const [tRes, cRes, allMatchesRes, userRankRes] = await Promise.allSettled([
          tournamentsPromise,
          communitiesPromise,
          allMatchesPromise,
          userRankingsPromise,
        ] as const);

        const fetchedTournaments = tRes.status === 'fulfilled' ? tRes.value.data || [] : [];
        // Keep the last good list when a transient request fails.
        const activeTournaments = fetchedTournaments.filter(
          (t: Tournament) => t.status !== 'DRAFT' && t.status !== 'CANCELLED'
        );
        const visibleTournaments = selectedCategoryId
          ? activeTournaments.filter(t => t.categoryId === selectedCategoryId)
          : activeTournaments;
        if (tRes.status === 'fulfilled') {
          setTournaments(visibleTournaments);
        } else if (selectedCategoryId) {
          // A failed filtered request must not leave a different sport on screen.
          setTournaments([]);
        }

        // Build set of valid tournament IDs
        const validTournamentIds = new Set(visibleTournaments.map((t: Tournament) => t.id));
        // Nếu tournaments API trả về rỗng, có thể cache cũ hoặc API lỗi.
        // Vẫn hiển thị matches mà không filter theo tournament ID.
        const shouldFilterByTournament = validTournamentIds.size > 0;
        const fetchedCommunities = cRes.status === 'fulfilled' ? cRes.value.data || [] : [];
        if (cRes.status === 'fulfilled') {
          setCommunities(selectedCategoryId
            ? fetchedCommunities.filter(c => c.categories?.some(cat => cat.id === selectedCategoryId))
            : fetchedCommunities);
        }

        // ── ĐỢT 2 (sau 300ms): matches — gộp 1 call multi-status, limit 50 ──
        if (allMatchesRes.status === 'fulfilled') {
          const rawData = (allMatchesRes.value as Record<string, unknown>).data;
          const allMatchesData = (rawData as Record<string, unknown>)?.data || rawData || [];
          const allMatches = (Array.isArray(allMatchesData) ? allMatchesData : []) as BracketMatch[];

          // Populate initial cheer counts from backend for all matches
          const matchCheerMap: Record<string, number> = {};
          allMatches.forEach((m: unknown) => {
            const item = m as Record<string, unknown>;
            if (item.id && typeof item.cheerCount === 'number') {
              matchCheerMap[item.id as string] = item.cheerCount;
            }
          });
          if (Object.keys(matchCheerMap).length > 0) {
            setHighFives(prev => ({ ...prev, ...matchCheerMap }));
          }
          const isCompletedMatch = (m: BracketMatch) => {
            const status = String(m.status || '').toUpperCase();
            return status === 'COMPLETED' ||
              status === 'FINISHED' ||
              status === 'DONE' ||
              status === 'ENDED' ||
              m.completedAt != null ||
              m.winnerId != null;
          };
          const allLiveMatches = allMatches.filter(m => m.status === 'ONGOING' && !isCompletedMatch(m));
          setLiveMatches(allLiveMatches.filter(m => (!shouldFilterByTournament || validTournamentIds.has(m.tournamentId ?? '')) && !m.isBye));

          const fetchedUpcoming = allMatches.filter(m => m.status === 'SCHEDULED');
          const validUpcoming = fetchedUpcoming.filter(m =>
            (!shouldFilterByTournament || validTournamentIds.has(m.tournamentId ?? '')) &&
            !m.isBye &&
            m.participant1 != null &&
            m.participant2 != null &&
            m.participant1.teamName.trim().toLowerCase() !== 'tbd' &&
            m.participant2.teamName.trim().toLowerCase() !== 'tbd' &&
            m.participant1.teamName.trim().toLowerCase() !== 'chờ xác định' &&
            m.participant2.teamName.trim().toLowerCase() !== 'chờ xác định'
          );
          setUpcomingMatches(validUpcoming);

          const fetchedCompleted = allMatches.filter(isCompletedMatch);
          const nextCompleted = fetchedCompleted.filter(m =>
            (!shouldFilterByTournament || validTournamentIds.has(m.tournamentId ?? '')) && !m.isBye
          );
          // A transient empty 200 response must not erase the last visible
          // results. Category-filtered requests are safe to clear explicitly.
          if (nextCompleted.length > 0 || selectedCategoryId) {
            setCompletedMatches(nextCompleted);
          }
        }

        // ── ĐỢT 3 (sau 600ms): rankings (1 call) ──
        if (userRankRes.status === 'fulfilled' && userRankRes.value) {
          setUserRankings(userRankRes.value);
        } else {
          setUserRankings(null);
        }

        // ── ĐỢT 4 (sau 900ms): ranked tournament matches (chỉ fetch nếu tìm thấy) ──
        // Core home content is ready; ranked details must not block first paint.
        hasLoadedFeedRef.current = true;
        setIsLoading(false);

        const foundRanked = fetchedTournaments.find(t => {
          if (!t.isRanked) return false;
          if (t.status === 'DRAFT' || isTournamentCancelled(t.status)) return false;
          if (isTournamentCompleted(t.status)) {
            if (!t.endDate) return false;
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            return (Date.now() - new Date(t.endDate).getTime()) < sevenDays;
          }
          return true;
        });

        if (foundRanked) {
          setRankedTournament(foundRanked);
          try {
            const matchesRes = await matchesApi.getMatches({ tournamentId: foundRanked.id, limit: 50 });
            // Extract from Axios response properly
            const responseData = (matchesRes as Record<string, unknown>).data;
            const mData = (responseData as Record<string, unknown>)?.data || responseData || [];
            const matchesArray = Array.isArray(mData) ? mData : [];
            setRankedTournamentMatches(matchesArray as unknown as BracketMatch[]);
            
            // Sync initial cheer counts from backend
            const initialCheerMap: Record<string, number> = {};
            matchesArray.forEach((m: Record<string, unknown>) => {
              if (m.id && typeof m.cheerCount === 'number') {
                initialCheerMap[m.id as string] = m.cheerCount;
              }
            });
            if (Object.keys(initialCheerMap).length > 0) {
              setHighFives(prev => ({ ...prev, ...initialCheerMap }));
            }
          } catch (err) {
            console.error('Failed to load ranked tournament matches', err);
            // Keep the last successful ranked list; a transient 5xx/429 must
            // not make the homepage look like the tournament disappeared.
          }
        } else {
          setRankedTournament(null);
          setRankedTournamentMatches([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingRanked(false);
        setLiveMatchPage(1);
        feedRequestInFlightRef.current = false;
        if (feedRefreshQueuedRef.current) {
          feedRefreshQueuedRef.current = false;
          setFeedRefreshTick((value) => value + 1);
        }
      }
    };
    fetchData();
  }, [selectedCategoryId, isAuthenticated, user?.id, feedRefreshTick]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    if (!socket.connected) {
      socket.connect();
    }
    const handleCheerUpdate = (rawPayload: { matchId: string; cheerCount: number } | string) => {
      const payload = typeof rawPayload === 'string'
        ? JSON.parse(rawPayload) as { matchId: string; cheerCount: number }
        : rawPayload;
      if (payload?.matchId) {
        setHighFives(prev => ({
          ...prev,
          [payload.matchId]: payload.cheerCount,
        }));
      }
    };
    socket.on('cheer:update', handleCheerUpdate);
    return () => {
      socket.off('cheer:update', handleCheerUpdate);
    };
  }, []);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const trackedMatches = [...liveMatches, ...upcomingMatches, ...completedMatches];
    const joinTrackedMatches = () => {
      trackedMatches.forEach((match) => socket.emit('joinMatch', match.id));
    };
    const applyMatchUpdate = (rawMatch: BracketMatch | string) => {
      const updated = typeof rawMatch === 'string'
        ? JSON.parse(rawMatch) as BracketMatch
        : rawMatch;
      if (!updated?.id) return;
      const merge = (items: BracketMatch[]) => items.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      );
      setLiveMatches((items) => merge(items));
      setUpcomingMatches((items) => merge(items));
      setCompletedMatches((items) => merge(items));
    };

    socket.on('connect', joinTrackedMatches);
    socket.on('score:update', applyMatchUpdate);
    socket.on('match:status', applyMatchUpdate);
    if (!socket.connected) socket.connect();
    else joinTrackedMatches();

    return () => {
      socket.off('connect', joinTrackedMatches);
      socket.off('score:update', applyMatchUpdate);
      socket.off('match:status', applyMatchUpdate);
    };
  }, [liveMatches.length, upcomingMatches.length, completedMatches.length]);

  // High five / cheer handler — optimistic + persist qua API
  const handleHighFive = async (matchId: string) => {
    setHighFives(prev => ({
      ...prev,
      [matchId]: (prev[matchId] ?? 0) + 1,
    }));
    try {
      const res = await matchesApi.cheerMatch(matchId);
      setHighFives(prev => ({
        ...prev,
        [matchId]: res.cheerCount,
      }));
    } catch {
      setHighFives(prev => ({
        ...prev,
        [matchId]: Math.max(0, (prev[matchId] ?? 1) - 1),
      }));
      toast.error('Không thể gửi cổ vũ, vui lòng thử lại.');
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareUrl, setActiveShareUrl] = useState('');
  const [activeShareTitle, setActiveShareTitle] = useState('');

  // Helper to determine active round
  const getActiveRound = (matches: BracketMatch[]) => {
    const ongoing = matches.filter(m => m.status === 'ONGOING');
    if (ongoing.length > 0) return ongoing[0].roundNumber;

    const scheduled = matches.filter(m => m.status === 'SCHEDULED' && m.participant1 && m.participant2);
    if (scheduled.length > 0) return Math.min(...scheduled.map(m => m.roundNumber));

    const completed = matches.filter(m => m.status === 'COMPLETED');
    if (completed.length > 0) return Math.max(...completed.map(m => m.roundNumber));

    return 1;
  };

  const activeRound = rankedTournamentMatches.length > 0 ? getActiveRound(rankedTournamentMatches) : 1;
  const roundMatches = rankedTournamentMatches.filter(m => m.roundNumber === activeRound);

  // If there are ongoing matches, show ongoing only
  const ongoingInRound = roundMatches.filter(m => m.status === 'ONGOING');
  const showOngoingOnly = ongoingInRound.length > 0;

  // If no ongoing, show completed and scheduled
  const displayRankedMatches = showOngoingOnly 
    ? ongoingInRound 
    : roundMatches.filter(m => m.status === 'COMPLETED' || m.status === 'SCHEDULED');

  const sortedDisplayRankedMatches = [...displayRankedMatches].sort((a, b) => {
    const getWeight = (status: string, winnerId: string | null | undefined) => {
      if (winnerId != null || status === 'COMPLETED') return 3; // Completed goes to the bottom
      if (status === 'ONGOING' || status === 'IN_PROGRESS') return 1; // Ongoing goes to the top
      if (status === 'SCHEDULED') return 2; // Scheduled is in the middle
      return 4;
    };
    return getWeight(a.status, a.winnerId) - getWeight(b.status, b.winnerId);
  });

  // Pagination for live matches (Max 4 matches per page)
  const totalLivePages = Math.ceil(liveMatches.length / 4);
  const paginatedLiveMatches = liveMatches.slice((liveMatchPage - 1) * 4, liveMatchPage * 4);

  // Group live matches by tournament name
  const liveMatchesByTournament = liveMatches.reduce<Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>>((acc, match) => {
    const tournamentName = match.tournament?.name || 'Giải đấu khác';
    const tournament = match.tournament as { id?: string; logoUrl?: string | null; name?: string; isRanked?: boolean };
    if (!acc[tournamentName]) {
      acc[tournamentName] = {
        id: match.tournamentId || tournament?.id,
        name: tournamentName,
        logoUrl: tournament?.logoUrl,
        isRanked: tournament?.isRanked,
        matches: [],
      };
    }
    acc[tournamentName].matches.push(match);
    return acc;
  }, {} as Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>);

  // Group upcoming matches by tournament name
  const upcomingMatchesByTournament = upcomingMatches.reduce<Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>>((acc, match) => {
    const tournamentName = match.tournament?.name || 'Giải đấu khác';
    const tournament = match.tournament as { id?: string; logoUrl?: string | null; name?: string; isRanked?: boolean };
    if (!acc[tournamentName]) {
      acc[tournamentName] = {
        id: match.tournamentId || tournament?.id,
        name: tournamentName,
        logoUrl: tournament?.logoUrl,
        isRanked: tournament?.isRanked,
        matches: [],
      };
    }
    acc[tournamentName].matches.push(match);
    return acc;
  }, {} as Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>);

  // Group completed matches by tournament name
  const completedMatchesByTournament = completedMatches.reduce<Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>>((acc, match) => {
    const tournamentName = match.tournament?.name || 'Giải đấu khác';
    const tournament = match.tournament as { id?: string; logoUrl?: string | null; name?: string; isRanked?: boolean };
    if (!acc[tournamentName]) {
      acc[tournamentName] = {
        id: match.tournamentId || tournament?.id,
        name: tournamentName,
        logoUrl: tournament?.logoUrl,
        isRanked: tournament?.isRanked,
        matches: [],
      };
    }
    acc[tournamentName].matches.push(match);
    return acc;
  }, {} as Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>);

  const renderMatchCard = (
    match: BracketMatch,
    isRankedMatchSection = false,
    contextMatches: BracketMatch[] = [match],
    contextTournament?: Pick<Tournament, 'format' | 'maxParticipants'> | null,
  ) => {
    const currentHighFives = highFives[match.id] ?? ((match as unknown as Record<string, unknown>).cheerCount as number) ?? 0;
    const isCompleted = match.status === 'COMPLETED' || match.winnerId != null;
    const isLive = (match.status === 'ONGOING' || match.status === 'IN_PROGRESS') && !isCompleted;
    const isScheduled = match.status === 'SCHEDULED';
    const roundLabel = getMatchRoundLabel({
      match,
      matches: contextMatches,
      tournamentFormat: contextTournament?.format ?? rankedTournament?.format,
      bracketSize: contextTournament?.maxParticipants ?? rankedTournament?.maxParticipants ?? null,
    });

    return (
      <motion.div 
        key={match.id}
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`bg-white rounded-lg border ${
          isLive 
            ? 'border-rose-100 shadow-[0_4px_20px_rgba(244,63,94,0.03)]' 
            : 'border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.015)]'
        } overflow-hidden flex flex-col justify-between group relative`}
      >
        {/* Whole Card Link */}
        <Link href={`/live/${match.id}`} className="block flex-1">
          {/* Match Header */}
          <div className={`px-4 py-2.5 ${isLive ? 'bg-rose-50/30' : 'bg-slate-50/50'} border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500`}>
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              {isLive && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
              <span className={`uppercase tracking-wider shrink-0 ${
                isLive ? 'text-rose-600 font-bold animate-pulse' : isCompleted ? 'text-slate-500' : 'text-blue-600'
              }`}>
                {isLive ? 'Trực tiếp' : isCompleted ? 'Đã kết thúc' : 'Sắp diễn ra'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="shrink-0 text-slate-600 font-medium">{roundLabel}</span>
              {match.courtName && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                    {match.courtName}
                  </span>
                </>
              )}
            </div>
            <span className="uppercase text-slate-650 bg-slate-100/80 px-2 py-0.5 rounded text-[8px] font-bold truncate max-w-[40%] md:max-w-[28%]">
              {translateStageName(match.group?.stage?.name) || 'Vòng đấu'}
            </span>
          </div>

          {/* Opponents Match Grid */}
          <div className="p-4 flex items-center justify-between gap-3 relative group-hover:bg-slate-50/30 transition-colors">
            {/* Player 1 */}
            <div className="flex items-center gap-2.5 w-5/12 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`text-xs font-bold block leading-snug line-clamp-2 break-words group-hover:text-blue-600 transition-colors ${isCompleted && match.winnerId === match.participant1?.id ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {getTeamShortName(match.participant1?.teamName)}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Display Panel */}
            <div className="flex flex-col items-center justify-center shrink-0 min-w-[75px]">
              {isScheduled ? (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/50">
                  {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'VS'}
                </span>
              ) : (
                <div className={`flex items-center justify-center px-2.5 py-1 rounded-full font-mono text-[10px] font-bold leading-none tracking-wider shadow-sm border ${
                  isLive 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {(() => {
                    const scores = extractMatchScores(match.scoreDetails);
                    const targetSet = scores.find((s: { isFinished: boolean }) => !s.isFinished) || scores[scores.length - 1] || { team1Score: 0, team2Score: 0 };
                    return `${targetSet.team1Score} - ${targetSet.team2Score}`;
                  })()}
                </div>
              )}
            </div>

            {/* Player 2 */}
            <div className="flex items-center gap-2.5 w-5/12 min-w-0 justify-end text-right">
              <div className="min-w-0">
                <div className="flex items-center justify-end gap-1 min-w-0">
                  <span className={`text-xs font-bold block leading-snug line-clamp-2 break-words group-hover:text-blue-600 transition-colors ${isCompleted && match.winnerId === match.participant2?.id ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {getTeamShortName(match.participant2?.teamName)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Sport Row */}
          <div className="px-4 pb-2.5 pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium border-t border-slate-100 bg-slate-50/10">
            <div className="shrink-0 text-slate-650 flex items-center gap-1">
              <span className="font-semibold text-slate-700 text-[10px] whitespace-nowrap">
                {getFormatLabel((match as EnrichedMatch).tournament?.matchType || ((match as unknown) as Record<string, unknown>).matchType as string | undefined, (match as EnrichedMatch).tournament?.genderRestriction || ((match as unknown) as Record<string, unknown>).genderRestriction as string | undefined)}
              </span>
            </div>
            {match.courtName ? (
              <div className="truncate max-w-[220px]" title={match.courtAddress ? `${match.courtName} - ${match.courtAddress}` : match.courtName}>
                <span className="text-slate-400 font-semibold">Sân:</span>{' '}
                <span className="font-semibold text-slate-750">
                  {match.courtName}{match.courtAddress ? ` (${match.courtAddress})` : ''}
                </span>
              </div>
            ) : (
              <div className="text-slate-400 italic">Chưa xếp sân</div>
            )}
          </div>
        </Link>

        {/* Interactive Footer (Heart & Share aligned to the right with larger click area) */}
        <div className="px-3 py-1 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-1.5 relative z-10">
          {/* Cổ vũ icon-only (Larger click target) */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleHighFive(match.id);
            }}
            title={`Cổ vũ (${currentHighFives})`}
            className="flex items-center justify-center px-2.5 py-1 hover:bg-white rounded-md text-slate-600 transition-all border border-transparent hover:border-slate-200 active:scale-95 duration-100 cursor-pointer shrink-0"
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
            <span className="text-[11px] font-bold text-slate-600 ml-1">({currentHighFives})</span>
          </button>

          {/* Chia sẻ icon-only (Larger click target) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const p1Name = getTeamShortName(match.participant1?.teamName);
              const p2Name = getTeamShortName(match.participant2?.teamName);
              setActiveShareUrl(`${window.location.origin}/live/${match.id}`);
              setActiveShareTitle(`Trận đấu: ${p1Name} vs ${p2Name}`);
              setIsShareModalOpen(true);
            }}
            title="Chia sẻ trận đấu"
            className="flex items-center justify-center px-2.5 py-1 hover:bg-white rounded-md text-slate-600 transition-all border border-transparent hover:border-slate-200 active:scale-95 duration-100 cursor-pointer shrink-0"
          >
            <Share2 className="w-4 h-4 text-blue-500" />
          </button>
        </div>
      </motion.div>
    );
  };

  const filteredCommunities = selectedCategoryId 
    ? communities.filter(c => c.categories?.some(cat => cat.id === selectedCategoryId))
    : communities;

  const publicRanks = userRankings?.publicRanks || [];
  const categoryRanks = getRanksForCategory(publicRanks, selectedCategoryId || undefined);
  const activeRankInfo = getBestRankForCategory(publicRanks, selectedCategoryId || undefined);

  const eloPoints = activeRankInfo?.eloPoints ?? 1000;
  const displayTier = getRankTierName(activeRankInfo);
  const matchesPlayed = activeRankInfo?.matchesPlayed ?? 0;
  const hasPlayedRankedMatch = matchesPlayed > 0;
  const activeElo = activeRankInfo?.eloPoints ?? 0;
  const matchesWon = activeRankInfo?.matchesWon ?? 0;
  const winRate = getRankWinRate(activeRankInfo);
  const peakElo = activeRankInfo?.peakElo || eloPoints;
  const sportName = activeRankInfo?.categoryName
    || categories.find((c) => c.id === activeRankInfo?.categoryId)?.name
    || (selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId)?.name : 'Chung')
    || 'Chung';

  const [now] = useState(() => Date.now());

  const recentCompletedTournaments = useMemo(() => {
    return tournaments.filter(t => {
      if (t.status !== 'COMPLETED') return false;
      if (!t.endDate) return false;
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      return (now - new Date(t.endDate).getTime()) < fourteenDays;
    }).sort((a, b) => {
      if (!a.endDate || !b.endDate) return 0;
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });
  }, [tournaments, now]);

  const activeTournaments = useMemo(() => {
    return tournaments.filter(t => t.status !== 'COMPLETED');
  }, [tournaments]);

  // Homepage display limits are per section. Detail/list pages keep their own pagination.
  const featuredHomepageTournaments = activeTournaments.slice(0, 10);

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
              className={`relative flex items-center gap-1.5 px-4.5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategoryId === ''
                  ? 'text-white'
                  : 'bg-white text-slate-650 border border-slate-200/60 shadow-sm hover:border-slate-300 hover:text-slate-900'
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
                  className={`relative flex items-center gap-1.5 px-4.5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'bg-white text-slate-650 border border-slate-200/60 shadow-sm hover:border-slate-300 hover:text-slate-900'
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
                      if (logo) return <img src={logo} alt={cat.name} className="w-3.5 h-3.5 object-contain" />;
                      return <Trophy className="w-3.5 h-3.5" />;
                    })()}
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section 1: Giải đấu nổi bật */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end relative z-[30]">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Giải đấu nổi bật</h2>
              <Link href="/tournaments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 relative z-[31]">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            {isLoading ? (
              <div className="w-full h-[220px] md:h-[300px] bg-slate-200 animate-pulse rounded-lg"></div>
            ) : activeTournaments.length === 0 ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-blue-300 shadow-[0_10px_30px_rgba(29,95,224,0.18)] min-h-[320px] md:min-h-[420px] flex items-center justify-center text-center px-10 py-14">
                {/* Watermark racket + shuttlecock */}
                <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
                  <svg viewBox="0 0 200 200" className="w-[400px] h-[400px] md:w-[500px] md:h-[500px]" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(30,20) rotate(-18 80 80)">
                      <ellipse cx="80" cy="60" rx="46" ry="56" fill="none" stroke="white" strokeWidth="6"/>
                      <g stroke="white" strokeWidth="1.4" opacity="0.9">
                        <line x1="80" y1="8" x2="80" y2="112"/>
                        <line x1="60" y1="10" x2="60" y2="108"/>
                        <line x1="100" y1="10" x2="100" y2="108"/>
                        <line x1="42" y1="20" x2="42" y2="96"/>
                        <line x1="118" y1="20" x2="118" y2="96"/>
                        <line x1="36" y1="60" x2="124" y2="60"/>
                        <line x1="38" y1="40" x2="122" y2="40"/>
                        <line x1="38" y1="80" x2="122" y2="80"/>
                        <line x1="46" y1="24" x2="114" y2="24"/>
                        <line x1="46" y1="96" x2="114" y2="96"/>
                      </g>
                      <rect x="74" y="112" width="12" height="70" rx="5" fill="white"/>
                      <rect x="70" y="176" width="20" height="34" rx="7" fill="white"/>
                    </g>
                    <g transform="translate(128,118) rotate(20)">
                      <circle cx="0" cy="0" r="9" fill="white"/>
                      <path d="M -7 -4 L -26 -34 L -20 -36 L -2 -8 Z" fill="white" opacity="0.95"/>
                      <path d="M 0 -8 L 0 -40 L 6 -40 L 6 -8 Z" fill="white" opacity="0.95"/>
                      <path d="M 7 -4 L 26 -34 L 20 -36 L 2 -8 Z" fill="white" opacity="0.95"/>
                      <path d="M -5 -6 L -14 -30 L -10 -31 L -2 -8 Z" fill="white" opacity="0.7"/>
                      <path d="M 5 -6 L 14 -30 L 10 -31 L 2 -8 Z" fill="white" opacity="0.7"/>
                    </g>
                  </svg>
                </div>
                <div className="relative z-10 max-w-md">
                  <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-blue-700 bg-white/70 border border-blue-200/50 px-3.5 py-1.5 rounded-full mb-5">
                    Giải đấu nổi bật
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-[#0f1b33] mb-3 tracking-tight">
                    Chưa Có Giải Đấu Nào Sắp Diễn Ra
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0f1b33] font-bold">
                    Hãy theo dõi trang để cập nhật thông tin về các giải đấu mới nhất sắp sửa diễn ra.
                  </p>
                </div>
              </div>
            ) : (
              <TournamentHeroBanner tournaments={featuredHomepageTournaments} heightClass="h-[320px] md:h-[420px]" />
            )}
          </section>

          {/* Section 2: Trận live (Match Feed style) */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Trận đấu trực tiếp</h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
            </div>
            <div className="p-4 flex flex-col gap-4">

            {isLoading ? (
              <div className="space-y-4">
                <div className="bg-slate-200 animate-pulse h-40 rounded-xl" />
                <div className="bg-slate-200 animate-pulse h-40 rounded-xl" />
              </div>
            ) : liveMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <div className="relative flex h-3.5 w-3.5 mb-2.5 justify-center items-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-350 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                </div>
                <span className="text-xs font-medium text-slate-450">Hiện chưa có trận đấu nào đang trực tiếp.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <motion.div
                  key={liveMatchPage}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                >
                {Object.entries(liveMatchesByTournament).slice(0, 6).map(([tournamentName, rawGroup]) => {
                    const group = rawGroup as GroupMatchesData;
                    const matchedTournament = tournaments.find(t => t.id === group.id);
                    const isRanked = matchedTournament ? matchedTournament.isRanked : (group.isRanked || group.matches.some(m => (m as EnrichedMatch).tournament?.isRanked));
                    return (
                      <div key={tournamentName} className="bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden flex flex-col">
                        {/* Group Tournament Header */}
                        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                          <Link
                            href={group.id ? `/tournaments/${group.id}` : '#'}
                            className="flex items-center gap-3 group/header hover:opacity-90 transition-opacity flex-1 min-w-0"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white relative flex-shrink-0 shadow-sm">
                              <TournamentLogoAvatar src={group.logoUrl} alt={group.name} />
                            </div>
                            <div className="min-w-0">
                              {isRanked && (
                                <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-0.5">
                                  GIẢI ĐẤU HẠNG
                                </span>
                              )}
                              <h3 className="text-sm font-bold text-slate-900 group-hover/header:text-blue-600 transition-colors block leading-tight truncate">
                                {group.name}
                              </h3>
                            </div>
                          </Link>
                        </div>
                        {/* Matches List Grid */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.matches.map((match) => renderMatchCard(match, true, group.matches, matchedTournament ?? null))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Pagination Controls */}
                {totalLivePages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <button
                      onClick={() => setLiveMatchPage(p => Math.max(1, p - 1))}
                      disabled={liveMatchPage === 1}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-350 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                      Trước
                    </button>
                    {Array.from({ length: totalLivePages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isCurrent = pageNum === liveMatchPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setLiveMatchPage(pageNum)}
                          className={`relative w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-transparent shadow-sm'
                              : 'bg-white text-slate-650 border-slate-200 hover:border-slate-350 hover:text-slate-900'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setLiveMatchPage(p => Math.min(totalLivePages, p + 1))}
                      disabled={liveMatchPage === totalLivePages}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-350 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                      Sau
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </section>

          {/* Section 2.2: Trận đấu vừa kết thúc */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Kết quả trận đấu vừa qua</h2>
            </div>
            <div className="p-4 flex flex-col gap-4">

            {isLoading ? (
              <div className="space-y-4">
                <div className="bg-slate-200 animate-pulse h-40 rounded-xl" />
              </div>
            ) : completedMatches.length === 0 ? (
              <div className="py-10 text-center text-slate-500 font-medium text-xs">
                Hiện chưa có trận đấu nào kết thúc gần đây.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(completedMatchesByTournament).slice(0, 6).map(([tournamentName, rawGroup]) => {
                  const group = rawGroup as GroupMatchesData;
                  const tournamentId = group.id || tournamentName;
                  const currentPage = tournamentPages[tournamentId] || 1;
                  const totalPages = Math.ceil(group.matches.length / 4);
                  const displayMatches = group.matches.slice((currentPage - 1) * 4, currentPage * 4);
                  const matchedTournament = tournaments.find(t => t.id === group.id);
                  const isRanked = matchedTournament ? matchedTournament.isRanked : (group.isRanked || group.matches.some(m => (m as EnrichedMatch).tournament?.isRanked));

                  return (
                    <div key={tournamentName} className="bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden flex flex-col">
                      {/* Group Tournament Header */}
                      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                        <Link 
                          href={group.id ? `/tournaments/${group.id}` : '#'}
                          className="flex items-center gap-3 group/header hover:opacity-90 transition-opacity flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white relative flex-shrink-0 shadow-sm">
                            <TournamentLogoAvatar src={group.logoUrl} alt={group.name} />
                          </div>
                            <div className="min-w-0">
                              {isRanked && (
                                <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-0.5">
                                  GIẢI ĐẤU HẠNG
                                </span>
                              )}
                              <h3 className="text-sm font-bold text-slate-900 group-hover/header:text-blue-600 transition-colors block leading-tight truncate">
                                {group.name}
                              </h3>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3 shrink-0">

                          {/* Mini Pagination controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.max(1, currentPage - 1) }))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-350 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-[11px] font-semibold text-slate-450 px-0.5">
                                {currentPage}/{totalPages}
                              </span>
                              <button
                                onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.min(totalPages, currentPage + 1) }))}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-350 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Matches List Grid */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {displayMatches.map((match) => renderMatchCard(match, true, group.matches, matchedTournament ?? null))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </section>
 
          {/* Section 2.5: Trận đấu sắp diễn ra */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Lịch thi đấu sắp diễn ra</h2>
            </div>
            <div className="p-4 flex flex-col gap-4">

            {isLoading ? (
              <div className="space-y-4">
                <div className="bg-slate-200 animate-pulse h-40 rounded-xl" />
              </div>
            ) : upcomingMatches.length === 0 ? (
              <div className="py-10 text-center text-slate-500 font-medium text-xs">
                Hiện chưa có lịch thi đấu sắp diễn ra.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(upcomingMatchesByTournament).slice(0, 6).map(([tournamentName, rawGroup]) => {
                  const group = rawGroup as GroupMatchesData;
                  const tournamentId = group.id || tournamentName;
                  const currentPage = tournamentPages[tournamentId] || 1;
                  const totalPages = Math.ceil(group.matches.length / 4);
                  const displayMatches = group.matches.slice((currentPage - 1) * 4, currentPage * 4);
                  const matchedTournament = tournaments.find(t => t.id === group.id);
                  const isRanked = matchedTournament ? matchedTournament.isRanked : (group.isRanked || group.matches.some(m => (m as EnrichedMatch).tournament?.isRanked));

                  return (
                    <div key={tournamentName} className="bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden flex flex-col">
                      {/* Group Tournament Header */}
                      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                        <Link 
                          href={group.id ? `/tournaments/${group.id}` : '#'}
                          className="flex items-center gap-3 group/header hover:opacity-90 transition-opacity flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white relative flex-shrink-0 shadow-sm">
                            <TournamentLogoAvatar src={group.logoUrl} alt={group.name} />
                          </div>
                            <div className="min-w-0">
                              {isRanked && (
                                <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-0.5">
                                  GIẢI ĐẤU HẠNG
                                </span>
                              )}
                              <h3 className="text-sm font-bold text-slate-900 group-hover/header:text-blue-600 transition-colors block leading-tight truncate">
                                {group.name}
                              </h3>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Mini Pagination controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.max(1, currentPage - 1) }))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-350 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-[11px] font-semibold text-slate-450 px-0.5">
                                {currentPage}/{totalPages}
                              </span>
                              <button
                                onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.min(totalPages, currentPage + 1) }))}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-350 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Matches List Grid */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {displayMatches.map((match) => renderMatchCard(match, true, group.matches, matchedTournament ?? null))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </section>



          {/* Section 4: Giải vừa kết thúc */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Giải vừa kết thúc</h2>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">14 ngày gần đây</p>
              </div>
              <Link href="/tournaments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                Khám phá <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4">

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-200 animate-pulse h-72 rounded-xl" />
                <div className="bg-slate-200 animate-pulse h-72 rounded-xl" />
              </div>
            ) : recentCompletedTournaments.length === 0 ? (
              <div className="py-10 text-center text-slate-500 font-medium text-xs">
                Hiện chưa có giải nào vừa kết thúc trong 14 ngày gần đây.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentCompletedTournaments.slice(0, 6).map((tournament) => (
                  <HomepageTournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            )}
            </div>
          </section>

        </div>

        {/* Right Column (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {!isClient ? (
             <div className="animate-pulse bg-slate-200 h-[180px] rounded-2xl w-full"></div>
           ) : !isAuthenticated ? (
             <motion.div 
               whileHover={{ y: -2 }}
               className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-5 flex flex-col items-center text-center"
             >
               <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 shrink-0">
                 <UserPlus className="w-6 h-6 text-slate-400" />
               </div>
               <h3 className="text-sm font-semibold text-slate-900 mb-1">Chưa đăng nhập</h3>
               <p className="text-xs text-slate-500 mb-4">Đăng nhập để xem giải đấu và CLB của bạn.</p>
               <div className="flex flex-col w-full gap-2">
                 <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-xs shadow-sm transition-colors cursor-pointer">
                   Đăng nhập ngay
                 </a>
                 <a href="/register" className="border border-slate-205 text-slate-650 hover:bg-slate-50 font-semibold py-2.5 px-4 rounded-xl text-center text-xs transition-colors">
                   Đăng ký tài khoản
                 </a>
               </div>
             </motion.div>
           ) : (
             <div className="flex flex-col gap-5">
               {/* Card 1: User Profile Card */}
               <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-4 flex flex-col items-center text-center relative overflow-hidden">
                 {/* Sports cover banner background */}
                 <div className="absolute top-0 left-0 w-full h-16 bg-blue-600" />

                 {/* Avatar */}
                 <RankAvatar
                   src={user?.avatarUrl}
                   name={user?.fullName}
                   elo={hasPlayedRankedMatch ? activeElo : null}
                   tierName={displayTier}
                   matchesPlayed={matchesPlayed}
                   size="md"
                   ringClassName="ring-4 z-10 mt-5 transition-transform duration-300 hover:scale-[1.03]"
                 />

                 {/* Name & Email */}
                 <h3 className="text-base font-semibold text-slate-900 mt-2.5 line-clamp-1 leading-snug">
                   {user?.fullName || 'Người dùng'}
                 </h3>
                 <p className="text-xs text-slate-400 truncate w-full mb-3.5">
                   {user?.email}
                 </p>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-3 w-full gap-2 mt-1 pt-3 border-t border-slate-100">
                   <div className="flex flex-col items-center">
                     <span className="text-base font-bold text-slate-800 leading-none">
                       {matchesPlayed}
                     </span>
                     <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                       Trận
                     </span>
                   </div>
                   <div className="flex flex-col items-center border-l border-r border-slate-100">
                     <span className="text-base font-bold text-slate-800 leading-none">
                       {matchesWon}
                     </span>
                     <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                       Thắng
                     </span>
                   </div>
                   <div className="flex flex-col items-center">
                     <span className="text-base font-bold text-slate-800 leading-none">
                       {winRate}%
                     </span>
                     <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                       Tỷ lệ
                     </span>
                   </div>
                 </div>

                 {/* CTA */}
                 <Link href="/profile" className="w-full mt-4">
                   <button className="w-full text-xs py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-xl transition-all active:scale-95 duration-150 cursor-pointer shadow-sm">
                     Trang cá nhân
                   </button>
                 </Link>
               </div>

               {/* Card 2: ELO Progress Card */}
               <HomepageEloProgressCard
                 activeRankInfo={activeRankInfo}
                 categoryRanks={categoryRanks}
                 eloPoints={eloPoints}
                 displayTier={displayTier}
                 peakElo={peakElo}
                 sportName={sportName}
                 isAuthenticated={isAuthenticated}
               />
             </div>
           )}

           {/* Widget 2 — Banner Ads 4:3 */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col cursor-pointer group">
            <div className="aspect-[4/3] bg-slate-900 relative p-5 flex flex-col justify-end">
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent z-10"></div>
              <div className="absolute inset-0 bg-blue-600 opacity-20 group-hover:opacity-35 transition-opacity duration-300"></div>
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white/90 text-[9px] px-2 py-0.5 rounded font-bold tracking-wider uppercase z-20">QUẢNG CÁO</div>
              
              <div className="relative z-20 mt-auto">
                 <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-1">CỬA HÀNG TOURNA</span>
                 <h4 className="text-sm font-bold text-white mb-0.5 group-hover:text-blue-200 transition-colors">Vợt Tennis PRO 2026</h4>
                 <p className="text-[10px] text-white/80 font-medium line-clamp-2">Ưu đãi độc quyền giảm giá 20% cho tất cả người chơi đạt ELO trên 1200.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={activeShareUrl}
        title={activeShareTitle}
      />
    </div>
  );
}
