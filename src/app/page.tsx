'use client';

// Reading this as: Sports platform homepage with live matches feed, featured tournaments, and community bento grid.
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { buildMatchScoreSummary, getMatchScorePresentation, resolveMatchSportRules, extractMatchScores } from '@/features/matches/score-display';
import Image from 'next/image';
import {
  Trophy, Calendar, Users, MapPin, ArrowRight, Shield, Heart, Share2, Play,
  Plus, Bell, Mail, ChevronRight, ChevronLeft, UserPlus, Star, Loader2, MessageSquare,
  Hourglass, Coins, Sparkles
} from 'lucide-react';
import { getSportLogo } from '@/constants/sports';
import { BRAND } from '@/constants/brand';
import { categoriesApi } from '@/features/categories/api';
import { Category } from '@/types/category';
import { useAuthStore } from '@/lib/zustand/authStore';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { matchesApi } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import { BracketMatch } from '@/features/tournaments/api';
import type { SportRulesEnvelope } from '@/types/tournament';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import HomepageEloProgressCard from '@/components/rankings/HomepageEloProgressCard';
import {
  getBestRankForCategory,
  getMostProminentRank,
  getRanksForCategory,
  getRankTierName,
  getRankWinRate,
} from '@/features/rankings/elo-display';
import { isNetworkError } from '@/utils/error';
import { isTournamentCancelled, isTournamentCompleted, isTournamentInProgress } from '@/utils/tournament-status';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ShareModal from '@/components/common/ShareModal';
import { shouldHideFeaturedCardText } from '@/features/tournaments/featured-banner';
import { RankAvatar } from '@/components/ui/RankAvatar';
import ParticipantIdentity from '@/components/ui/ParticipantIdentity';
import AdBannerCard from '@/components/ui/AdBannerCard';

interface EnrichedTournament {
  id: string;
  name: string;
  categoryId?: string;
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

const getTeamShortName = (teamName: string | null | undefined, fallback = 'TBD'): string => {
  if (!teamName) return fallback;
  if (teamName.includes(' / ')) {
    return teamName.split(' / ').map(name => getShortName(name)).join(' / ');
  }
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

const getMatchRankedStatus = (
  match: BracketMatch,
  fallbackTournament?: Tournament | null,
): boolean => {
  const matchTournament = (match as EnrichedMatch).tournament;
  if (typeof matchTournament?.isRanked === 'boolean') {
    return matchTournament.isRanked;
  }
  return fallbackTournament?.isRanked === true;
};

const getFormatLabel = (matchType?: string, genderRestriction?: string | null, translate?: (key: string) => string) => {
  const mt = matchType || '';
  const gr = genderRestriction || '';
  if (mt === 'SINGLES') {
    return gr === 'FEMALE' ? (translate?.('formatSinglesWomen') ?? 'Singles (Women)') : (translate?.('formatSinglesMen') ?? 'Singles (Men)');
  }
  if (mt === 'DOUBLES') {
    return gr === 'FEMALE' ? (translate?.('formatDoublesWomen') ?? 'Doubles (Women)') : (translate?.('formatDoublesMen') ?? 'Doubles (Men)');
  }
  if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
    return translate?.('formatMixedDoubles') ?? 'Mixed doubles';
  }
  return mt === 'DOUBLES' ? (translate?.('formatDoubles') ?? 'Doubles') : mt === 'SINGLES' ? (translate?.('formatSingles') ?? 'Singles') : (translate?.('formatMixedDoubles') ?? 'Mixed doubles');
};

function CommunityLogoAvatar({ src, alt }: { src?: string | null; alt: string }) {
  const fallbackSrc = BRAND.assets.defaultFallback;
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
      className={`object-contain p-2 group-hover:scale-105 transition-transform duration-500 ${imageSrc === fallbackSrc ? 'p-3' : ''}`}
      onError={() => setImgError(true)}
      unoptimized={imageSrc === fallbackSrc}
    />
  );
}

function LiveMatchSportLabel({ match, tournament, tournamentName, translate }: { match?: BracketMatch | null; tournament?: Tournament | null; tournamentName?: string; translate?: (key: string) => string }) {
  const matchTourn = match?.tournament as Record<string, unknown> | undefined;
  const tourn = tournament as Record<string, unknown> | undefined;
  const matchCategory = matchTourn?.category as Record<string, unknown> | undefined;
  const tournCategory = tourn?.category as Record<string, unknown> | undefined;

  const context = {
    ...match,
    tournament: {
      name: (typeof matchTourn?.name === 'string' ? matchTourn.name : undefined) ?? (typeof tourn?.name === 'string' ? tourn.name : undefined) ?? tournamentName,
      sportRules: (matchTourn?.sportRules ?? tourn?.sportRules ?? null) as SportRulesEnvelope | null,
      categoryName: (typeof matchTourn?.categoryName === 'string' ? matchTourn.categoryName : undefined) ?? (typeof tourn?.categoryName === 'string' ? tourn.categoryName : undefined) ?? (typeof matchCategory?.name === 'string' ? matchCategory.name : undefined) ?? (typeof tournCategory?.name === 'string' ? tournCategory.name : undefined) ?? null,
      categorySlug: (typeof matchTourn?.categorySlug === 'string' ? matchTourn.categorySlug : undefined) ?? (typeof tourn?.categorySlug === 'string' ? tourn.categorySlug : undefined) ?? (typeof matchCategory?.slug === 'string' ? matchCategory.slug : undefined) ?? (typeof tournCategory?.slug === 'string' ? tournCategory.slug : undefined) ?? null,
      categoryConfig: (matchTourn?.categoryConfig ?? tourn?.categoryConfig ?? matchCategory?.categoryConfig ?? tournCategory?.categoryConfig ?? null) as Record<string, unknown> | null,
      category: (matchTourn?.category ?? tourn?.category ?? null) as { slug?: string | null; name?: string | null; categoryConfig?: Record<string, unknown> | null } | null,
      tournamentConfig: matchTourn?.tournamentConfig ?? tourn?.tournamentConfig ?? null,
    },
  };
  const resolvedRules = resolveMatchSportRules(context);
  const kind = resolvedRules.kind;

  let sportText = 'Cầu lông';
  if (kind === 'BADMINTON') {
    sportText = translate?.('badminton') ?? 'Cầu lông';
  } else if (kind === 'PICKLEBALL_RALLY' || kind === 'PICKLEBALL_SIDE_OUT') {
    sportText = translate?.('pickleball') ?? 'Pickleball';
  } else if (kind === 'TENNIS') {
    sportText = translate?.('tennis') ?? 'Quần vợt';
  } else if (kind === 'TABLE_TENNIS') {
    sportText = translate?.('tableTennis') ?? 'Bóng bàn';
  } else if (kind === 'FOOTBALL') {
    sportText = translate?.('football') ?? 'Bóng đá';
  } else {
    sportText = translate?.('badminton') ?? 'Cầu lông';
  }

  return (
    <span className="inline-flex items-center gap-1 align-middle uppercase tracking-wider font-bold">
      <span>{sportText}</span>
    </span>
  );
}

/** Dịch tên stage từ backend (tiếng Anh) sang tiếng Việt */
function translateStageName(name: string | null | undefined, translate?: (key: string) => string): string {
  if (!name) return '';
  const map: Record<string, string> = {
    'Elimination Stage': 'stageElimination',
    'Knockout Stage': 'stageElimination',
    'Group Stage': 'stageGroup',
    'Round Robin': 'stageRoundRobin',
    'Final Stage': 'stageFinal',
    'Qualification Stage': 'stageQualification',
    'Preliminary Stage': 'stagePreliminary',
    'Main Stage': 'stageMain',
    'Quarter Finals': 'stageQuarterfinal',
    'Quarterfinals': 'stageQuarterfinal',
    'Semi Finals': 'stageSemifinal',
    'Semifinals': 'stageSemifinal',
    'Final': 'stageFinal',
    'Grand Final': 'stageGrandFinal',
    'Winners Bracket': 'stageWinnersBracket',
    'Losers Bracket': 'stageLosersBracket',
    'First Round': 'stageRound1',
    'Second Round': 'stageRound2',
    'Third Round': 'stageRound3',
    'Round of 16': 'stageRound16',
    'Round 16': 'stageRound16',
    'Round of 32': 'stageRound32',
    'Round 32': 'stageRound32',
    'Round of 8': 'stageQuarterfinal',
    'Round of 4': 'stageSemifinal',
    'Round of 2': 'stageFinal',
  };
  const key = map[name];
  return key ? (translate?.(key) ?? key) : name;
}

/** Đếm ngược — chỉ hiện ngày (dùng cho trang chủ / danh sách) */
function RegistrationCountdown({ targetDate }: { targetDate: string }) {
  const translate = useTranslations('Home');
  const [text, setText] = useState('');
  const target = useMemo(() => new Date(targetDate), [targetDate]);

  useEffect(() => {
    const update = () => {
      const days = Math.floor((target.getTime() - Date.now()) / 86400000);
      if (days <= 0) { setText(translate('registrationOpen')); return; }
      setText(translate('countdownDays', { days }));
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [target, translate]);

  if (!text) return null;
  return (
    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap">
      <Hourglass className="w-3 h-3 inline-block" /> {text}
    </span>
  );
}

function TournamentLogoAvatar({ src, alt }: { src?: string | null; alt: string }) {
  const fallbackSrc = BRAND.assets.defaultFallback;
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
      className={`object-contain p-2 group-hover:scale-105 transition-transform duration-500 ${imageSrc === fallbackSrc ? 'p-3' : ''}`}
      onError={() => setImgError(true)}
      unoptimized={imageSrc === fallbackSrc}
    />
  );
}

function HomepageTournamentCard({ tournament }: { tournament: Tournament }) {
  const translate = useTranslations('Home');
  const locale = useLocale();
  const [imgError, setImgError] = useState(false);
  const fallbackSrc = BRAND.assets.defaultFallback;
  const hasBanner = !imgError && Boolean(tournament.bannerUrl?.trim());
  const imageSrc = hasBanner ? tournament.bannerUrl!.split(',')[0] : fallbackSrc;
  const hideFeaturedCardText = shouldHideFeaturedCardText(tournament);

  const dateRange = useMemo(() => {
    if (!tournament.startDate || !tournament.endDate) return '';
    const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
    const start = new Date(tournament.startDate).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' });
    const end = new Date(tournament.endDate).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' });
    return `${start} - ${end}`;
  }, [locale, tournament.startDate, tournament.endDate]);

  return (
    <div className={`${hideFeaturedCardText ? 'aspect-[21/9] bg-slate-900' : 'bg-white'} rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col group relative`}>
      <div className={`${hideFeaturedCardText ? 'absolute inset-0' : 'h-44 shrink-0'} ${hasBanner ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100/90 border-b border-slate-100'} relative overflow-hidden`}>
        <Image
          src={imageSrc}
          alt={tournament.name}
          fill
          className={hasBanner ? "object-cover group-hover:scale-105 transition-transform duration-700 ease-out" : "object-contain p-8 drop-shadow-sm group-hover:scale-105 transition-transform duration-700 ease-out"}
          onError={() => setImgError(true)}
          unoptimized={imageSrc === fallbackSrc}
        />
        {!hideFeaturedCardText && hasBanner && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        )}

        {/* Badges */}
        {!hideFeaturedCardText && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full shadow-sm text-slate-800 text-[9px] font-bold tracking-wider uppercase border border-white/20">
            <Trophy className="w-3 h-3 inline-block mr-1" />
            {tournament.category?.name || translate('tournamentFallback')}
          </span>
          <span className="px-3 py-1 bg-emerald-600/90 backdrop-blur-md rounded-full shadow-sm text-white text-[9px] font-bold tracking-wider uppercase">
            {translate('tournamentEnded')}
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
  const translate = useTranslations('Home');
  const locale = useLocale();
  const roundLabelTranslations: RoundLabelTranslations = {
    roundGrandFinal: translate('phaseGrandFinal'),
    roundFinal: translate('roundFinal'),
    roundSemifinal: translate('roundSemifinal'),
    roundQuarterfinal: translate('roundQuarterfinal'),
    roundGroupStage: translate('roundGroupStage'),
    winnersBracket: translate('phaseWinners'),
    losersBracket: translate('phaseLosers'),
    playoff: translate('phasePlayoff'),
    roundOf: (round) => round === 16 || round === 32 || round === 64
      ? translate(`roundOf${round}`)
      : translate('roundNumber', { number: round }),
    legSuffix: (leg) => translate('roundLeg', { number: leg }),
    roundRobinLeg: (leg, round) => `${translate('roundLeg', { number: leg })} • ${translate('matchDay', { number: round })}`,
    roundRobinMatchday: (round) => translate('matchDay', { number: round }),
  };
  // Bóng bàn đang tạm ẩn khỏi các bộ lọc/khám phá công khai. Vẫn giữ
  // support trong luồng quản trị và dữ liệu giải cũ để không làm mất dữ liệu.
  const isHiddenPublicSport = (category: Category) => {
    const key = `${category.slug ?? ''} ${category.id ?? ''} ${category.name ?? ''}`.toLowerCase();
    return key.includes('table_tennis') || key.includes('table tennis') || key.includes('table-tennis') || key.includes('bóng bàn') || key.includes('bong ban');
  };
  const getCategoryLabel = (category: Category) => {
    const slug = (category.slug || category.id || '').toLowerCase();
    try {
      if (slug === 'badminton' || slug.includes('badminton') || slug.includes('cầu lông')) {
        const val = translate('badminton');
        if (val && !val.startsWith('Home.')) return val;
      }
      if (slug === 'table_tennis' || slug === 'tabletennis' || slug.includes('bóng bàn')) {
        const val = translate('tableTennis');
        if (val && !val.startsWith('Home.')) return val;
      }
      if (slug === 'football' || slug.includes('football') || slug.includes('bóng đá')) {
        const val = translate('football');
        if (val && !val.startsWith('Home.')) return val;
      }
      if (slug === 'pickleball' || slug.includes('pickleball')) {
        const val = translate('pickleball');
        if (val && !val.startsWith('Home.')) return val;
      }
      if (slug === 'tennis' || slug.includes('tennis') || slug.includes('quần vợt')) {
        const val = translate('tennis');
        if (val && !val.startsWith('Home.')) return val;
      }
    } catch {
      // ignore
    }
    return category.name || slug;
  };
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
      const DEFAULT_CATEGORIES: Category[] = [
        { id: 'pickleball', name: 'Pickleball', slug: 'pickleball', isActive: true },
        { id: 'tennis', name: 'Tennis', slug: 'tennis', isActive: true },
        { id: 'badminton', name: 'Cầu lông', slug: 'badminton', isActive: true },
        { id: 'table_tennis', name: 'Bóng bàn', slug: 'table_tennis', isActive: true },
        { id: 'football', name: 'Bóng đá', slug: 'football', isActive: true },
      ];
      const CACHE_KEY = 'homepage_categories_v6';
      const CACHE_TTL = 5 * 60 * 1000;
      try {
        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Date.now() - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length >= 1) {
                setCategories(parsed.data.filter((category: Category) => !isHiddenPublicSport(category)));
                return;
              }
            } catch {
              // Ignore parse error
            }
          }
        }
        const res = await categoriesApi.getCategories();
        const apiCategories = (res.data && res.data.length > 0) ? res.data : [];
        const mergedCategories = [...apiCategories];

        DEFAULT_CATEGORIES.forEach(defaultCat => {
          const exists = mergedCategories.some(cat =>
            cat.slug === defaultCat.slug ||
            cat.name.toLowerCase() === defaultCat.name.toLowerCase()
          );
          if (!exists) {
            mergedCategories.push(defaultCat);
          }
        });

        const activeCategories = mergedCategories.filter((cat) => {
          if (isHiddenPublicSport(cat)) return false;
          const catKey = cat.slug || cat.id;
          if (typeof window !== 'undefined') {
            const localOverride = localStorage.getItem(`sport_active_${catKey}`);
            if (localOverride === 'false') return false;
            if (localOverride === 'true') return true;
          }
          return cat.isActive !== false && (cat.categoryConfig as Record<string, unknown> | null | undefined)?.isActive !== false;
        });

        setCategories(activeCategories);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: activeCategories }));
        }
      } catch (error: unknown) {
        if (!isNetworkError(error)) {
          console.error('Failed to load categories on homepage', error);
        }
        const activeDefaults = DEFAULT_CATEGORIES.filter((cat) => {
          if (isHiddenPublicSport(cat)) return false;
          const catKey = cat.slug || cat.id;
          if (typeof window !== 'undefined') {
            const localOverride = localStorage.getItem(`sport_active_${catKey}`);
            if (localOverride === 'false') return false;
            if (localOverride === 'true') return true;
          }
          return cat.isActive !== false;
        });
        setCategories(activeDefaults);
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

        // Fetch the public feed once. Separate status requests caused a burst of
        // identical /matches calls (and 429s behind the production proxy).
        const matchCategoryParams = selectedCategoryId ? { categoryId: selectedCategoryId } : {};
        const publicMatchesPromise = matchesApi.getMatches({
          status: 'ONGOING,SCHEDULED,COMPLETED,FINISHED,DONE,ENDED',
          limit: 100,
          publicOnly: true,
          ...matchCategoryParams,
        });

        const userRankingsPromise = isAuthenticated && user?.id
          ? rankingsApi.getUserRankings(user.id)
          : Promise.resolve(null);

        const [tRes, cRes, publicMatchesRes, userRankRes] = await Promise.allSettled([
          tournamentsPromise,
          communitiesPromise,
          publicMatchesPromise,
          userRankingsPromise,
        ] as const);

        const fetchedTournaments = tRes.status === 'fulfilled' ? tRes.value.data || [] : [];
        // Keep the last good list when a transient request fails.
        const activeTournaments = fetchedTournaments.filter(
          (t: Tournament) => {
            const st = (t.status as string)?.toUpperCase();
            return !['DRAFT', 'PENDING_APPROVAL', 'SUSPENDED', 'CANCELLED', 'PENDING_DELETE'].includes(st);
          }
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

        const fetchedCommunities = cRes.status === 'fulfilled' ? cRes.value.data || [] : [];
        if (cRes.status === 'fulfilled') {
          setCommunities(selectedCategoryId
            ? fetchedCommunities.filter(c => c.categories?.some(cat => cat.id === selectedCategoryId))
            : fetchedCommunities);
        }

        // Helper to extract matches array safely from AxiosResponse
        const extractMatches = (settledRes: PromiseSettledResult<unknown>): BracketMatch[] => {
          if (settledRes.status !== 'fulfilled' || !settledRes.value) return [];
          const rawData = (settledRes.value as Record<string, unknown>).data;
          const matchesData = (rawData as Record<string, unknown>)?.data || rawData || [];
          return (Array.isArray(matchesData) ? matchesData : []) as BracketMatch[];
        };

        const publicMatchList = extractMatches(publicMatchesRes);
        const liveList = publicMatchList.filter((m) => ['ONGOING', 'IN_PROGRESS'].includes(String(m.status).toUpperCase()));
        const completedList = publicMatchList.filter((m) => ['COMPLETED', 'FINISHED', 'DONE', 'ENDED'].includes(String(m.status).toUpperCase()));
        const upcomingList = publicMatchList.filter((m) => String(m.status).toUpperCase() === 'SCHEDULED');

        // Populate initial cheer counts from backend
        const matchCheerMap: Record<string, number> = {};
        [...liveList, ...completedList, ...upcomingList].forEach((m: unknown) => {
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

        setLiveMatches(liveList.filter(m => (m.status === 'ONGOING' || m.status === 'IN_PROGRESS') && !isCompletedMatch(m) && !m.isBye));

        const validUpcoming = upcomingList.filter(m =>
          !m.isBye &&
          m.participant1 != null &&
          m.participant2 != null &&
          m.participant1.teamName.trim().toLowerCase() !== 'tbd' &&
          m.participant2.teamName.trim().toLowerCase() !== 'tbd' &&
          m.participant1.teamName.trim().toLowerCase() !== 'chờ xác định' &&
          m.participant2.teamName.trim().toLowerCase() !== 'chờ xác định'
        );
        setUpcomingMatches(validUpcoming);

        const nextCompleted = completedList.filter(m => !m.isBye);
        if (nextCompleted.length > 0 || selectedCategoryId) {
          setCompletedMatches(nextCompleted);
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
            // Reuse the single public feed; never issue a second per-tournament
            // request on the homepage just to populate the ranked card.
            const matchesArray = publicMatchList.filter((match) => match.tournamentId === foundRanked.id);
            setRankedTournamentMatches(matchesArray as unknown as BracketMatch[]);

            // Sync initial cheer counts from backend
            const initialCheerMap: Record<string, number> = {};
            matchesArray.forEach((m) => {
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
      toast.error(translate('cheerError'));
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

  // Group all live matches by tournament name
  const liveMatchesByTournament = liveMatches.reduce<Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>>((acc, match) => {
    const tournamentName = match.tournament?.name || translate('otherTournamentFallback');
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

  // Pagination for live tournaments (Max 2 tournaments per page)
  const LIVE_TOURNAMENTS_PER_PAGE = 2;
  const liveTournamentEntries = Object.entries(liveMatchesByTournament);
  const totalLivePages = Math.ceil(liveTournamentEntries.length / LIVE_TOURNAMENTS_PER_PAGE);
  const paginatedLiveTournamentEntries = liveTournamentEntries.slice((liveMatchPage - 1) * LIVE_TOURNAMENTS_PER_PAGE, liveMatchPage * LIVE_TOURNAMENTS_PER_PAGE);

  // Group upcoming matches by tournament name
  const upcomingMatchesByTournament = upcomingMatches.reduce<Record<string, { id?: string | null; name: string; logoUrl?: string | null; isRanked?: boolean; matches: BracketMatch[] }>>((acc, match) => {
    const tournamentName = match.tournament?.name || translate('otherTournamentFallback');
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
    const tournamentName = match.tournament?.name || translate('otherTournamentFallback');
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
      translations: roundLabelTranslations,
    });

    return (
      <motion.div
        key={match.id}
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`bg-white rounded-xl border ${
          isLive
            ? 'border-rose-200/90 shadow-xs shadow-rose-100/50'
            : 'border-slate-200 shadow-2xs hover:border-slate-350'
        } overflow-hidden flex flex-col justify-between group relative`}
      >
        {/* Whole Card Link */}
        <Link href={`/live/${match.id}`} className="block flex-1">
          {/* 1. Header Bar (Gọn & Rõ ràng) */}
          <div className={`px-3.5 py-2 ${isLive ? 'bg-rose-50/40' : 'bg-slate-50/70'} border-b border-slate-100 flex items-center justify-between text-[11px]`}>
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              {isLive && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
              <span className={`uppercase tracking-wider shrink-0 text-[10px] font-bold ${
                isLive ? 'text-rose-600 animate-pulse' : isCompleted ? 'text-slate-450' : 'text-blue-600'
              }`}>
                {isLive ? translate('statusLive') : isCompleted ? translate('statusCompleted') : translate('statusUpcoming')}
              </span>
              <span className="text-slate-300">•</span>
              <span className="shrink-0 text-slate-600 font-medium text-[11px]">{roundLabel}</span>
            </div>
            {(() => {
              const stageBadgeText = translateStageName(match.group?.stage?.name, translate);
              const shouldShowStageBadge = stageBadgeText && !roundLabel.toLowerCase().includes(stageBadgeText.toLowerCase());
              return shouldShowStageBadge ? (
                <span className="uppercase text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded text-[8px] font-bold truncate max-w-[40%] md:max-w-[28%]">
                  {stageBadgeText}
                </span>
              ) : null;
            })()}
          </div>

          {/* 2. Opponents Match Grid */}
          <div className="px-3.5 py-3 flex items-center justify-between gap-3 bg-white">
            {/* Player / doubles pair 1 */}
            <div className="flex items-center w-5/12 min-w-0">
              <ParticipantIdentity
                participant={match.participant1}
                fallback={translate('pendingTeam')}
                compact
              />
            </div>

            {/* Score / Status Display Panel */}
            <div className="flex flex-col items-center justify-center shrink-0 min-w-[65px]">
              {isScheduled ? (
                <span className="text-[10.5px] font-bold text-blue-600 bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-100/70">
                  {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'VS'}
                </span>
              ) : (
                <div className={`flex items-center justify-center px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold leading-none tracking-wider shadow-2xs ${
                  isLive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {(() => {
                    const scores = extractMatchScores(match.scoreDetails);
                    const targetSet = scores.find((s: { isFinished: boolean }) => !s.isFinished) || scores[scores.length - 1] || { team1Score: 0, team2Score: 0 };
                    return `${targetSet.team1Score} - ${targetSet.team2Score}`;
                  })()}
                </div>
              )}
            </div>

            {/* Player / doubles pair 2 */}
            <div className="flex items-center w-5/12 min-w-0 justify-end text-right">
              <ParticipantIdentity
                participant={match.participant2}
                fallback={translate('pendingTeam')}
                align="right"
                compact
              />
            </div>
          </div>

          {/* 3. Footer Bar: Thể thức, Sân đấu & Tương tác (gọn gàng trong 1 hàng duy nhất) */}
          <div className="px-3.5 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 min-w-0 text-slate-500">
              <span className="font-semibold text-slate-700 text-[10.5px] whitespace-nowrap">
                {getFormatLabel((match as EnrichedMatch).tournament?.matchType || ((match as unknown) as Record<string, unknown>).matchType as string | undefined, (match as EnrichedMatch).tournament?.genderRestriction || ((match as unknown) as Record<string, unknown>).genderRestriction as string | undefined, translate)}
              </span>
              <span className="text-slate-300">•</span>
              {match.courtName || match.tournament?.venueName ? (
                <span className="truncate max-w-[130px] md:max-w-[160px] text-slate-500 text-[10.5px]" title={match.courtAddress ? `${match.courtName || match.tournament?.venueName} - ${match.courtAddress}` : match.courtName || match.tournament?.venueName || ''}>
                  {match.courtName || match.tournament?.venueName}
                </span>
              ) : (
                <span className="text-slate-400 italic text-[10.5px]">{translate('courtNotAssigned')}</span>
              )}
            </div>

            {/* Cheer & Share buttons in footer */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleHighFive(match.id);
                }}
                title={`${translate('cheer')} (${currentHighFives})`}
                className="inline-flex items-center gap-1 py-1 px-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-[10.5px] font-medium transition cursor-pointer shadow-2xs"
              >
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500/15" />
                <span>{translate('cheer')}</span>
                {currentHighFives > 0 && <span className="text-slate-400 font-normal">({currentHighFives})</span>}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const p1Name = getTeamShortName(match.participant1?.teamName, translate('pendingTeam'));
                  const p2Name = getTeamShortName(match.participant2?.teamName, translate('pendingTeam'));
                  setActiveShareUrl(`${window.location.origin}/live/${match.id}`);
                  setActiveShareTitle(translate('shareMatchTitleWithTeams', { p1: p1Name, p2: p2Name }));
                  setIsShareModalOpen(true);
                }}
                title={translate('shareMatchTitle')}
                className="inline-flex items-center gap-1 py-1 px-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 text-[10.5px] font-medium transition cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3 h-3 text-slate-400" />
                <span>{translate('share')}</span>
              </button>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  const filteredCommunities = selectedCategoryId
    ? communities.filter(c => c.categories?.some(cat => cat.id === selectedCategoryId))
    : communities;

  const publicRanks = userRankings?.publicRanks || [];
  // The homepage card is a compact personal summary. It must not change to
  // "all sports" when the tournament explorer filter changes; use one
  // representative sport from the user's own ranking data instead.
  const prominentRank = getMostProminentRank(publicRanks);
  const prominentCategoryId = prominentRank?.categoryId;
  const categoryRanks = getRanksForCategory(publicRanks, prominentCategoryId);
  const activeRankInfo = getBestRankForCategory(categoryRanks, prominentCategoryId);

  const eloPoints = activeRankInfo?.eloPoints ?? prominentRank?.eloPoints ?? 1000;
  const displayTier = getRankTierName(activeRankInfo);
  const matchesPlayed = activeRankInfo?.matchesPlayed ?? 0;
  const hasPlayedRankedMatch = matchesPlayed > 0;
  const activeElo = activeRankInfo?.eloPoints ?? 0;
  const matchesWon = activeRankInfo?.matchesWon ?? 0;
  const winRate = getRankWinRate(activeRankInfo);
  const peakElo = activeRankInfo?.peakElo || eloPoints;
  const sportName = prominentRank?.categoryName
    || categories.find((c) => c.id === prominentCategoryId)?.name
    || '';

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
                {(() => {
                  try {
                    const val = translate('allSports');
                    if (val && !val.startsWith('Home.')) return val;
                  } catch {
                    // ignore
                  }
                  return translate('allSports');
                })()}
              </span>
            </button>
            {categories.filter(cat => cat.isActive !== false && !isHiddenPublicSport(cat)).map((cat) => {
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
                    {getCategoryLabel(cat)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section 1: Giải đấu nổi bật */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end relative z-[30]">
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{translate('featuredTournaments')}</h1>
              <Link href="/tournaments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 relative z-[31]">
                {translate('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
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
                    {translate('featuredTournaments')}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-[#0f1b33] mb-3 tracking-tight">
                    {translate('noUpcomingTournaments')}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0f1b33] font-bold">
                    {translate('noUpcomingDescription')}
                  </p>
                </div>
              </div>
            ) : (
              <TournamentHeroBanner tournaments={featuredHomepageTournaments} heightClass="h-[320px] md:h-[420px]" />
            )}
          </section>

          {/* Section 2: Trận live (Match Feed style) */}
          {(isLoading || liveMatches.length > 0) && (
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{translate('liveMatches')}</h2>
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
                ) : (
                  <div className="space-y-4">
                    <motion.div
                      key={liveMatchPage}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {paginatedLiveTournamentEntries.map(([tournamentName, rawGroup]) => {
                        const group = rawGroup as GroupMatchesData;
                        const tournamentId = group.id || tournamentName;
                        const currentPage = tournamentPages[tournamentId] || 1;
                        const totalPages = Math.ceil(group.matches.length / 4);
                        const displayMatches = group.matches.slice((currentPage - 1) * 4, currentPage * 4);
                        const matchedTournament = tournaments.find(t => t.id === group.id);
                        const isRanked = getMatchRankedStatus(group.matches[0], matchedTournament);
                        return (
                          <div key={tournamentName} className="bg-slate-50/50 rounded-2xl p-3.5 md:p-4 flex flex-col gap-3">
                            {/* Group Tournament Header */}
                            <div className="flex items-center justify-between">
                              <Link
                                href={group.id ? `/tournaments/${group.id}` : '#'}
                                className="flex items-center gap-3 group/header hover:opacity-90 transition-opacity flex-1 min-w-0"
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200/80 bg-white relative flex-shrink-0 shadow-2xs">
                                  <TournamentLogoAvatar src={group.logoUrl} alt={group.name} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${isRanked ? 'text-sky-700 bg-sky-50' : 'text-slate-600 bg-slate-200/60'}`}>
                                      {isRanked ? translate('rankedBadge') : translate('communityBadge')}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md text-violet-700 bg-violet-50">
                                      <LiveMatchSportLabel match={group.matches[0]} tournament={matchedTournament} tournamentName={group.name} translate={translate} />
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900 group-hover/header:text-blue-600 transition-colors block leading-tight truncate">
                                    {group.name}
                                  </h3>
                                </div>
                              </Link>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Mini Pagination controls for tournament matches */}
                                {totalPages > 1 && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.max(1, currentPage - 1) }))}
                                      disabled={currentPage === 1}
                                      className="w-7 h-7 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                    >
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[11px] font-semibold text-slate-400 px-1">
                                      {currentPage}/{totalPages}
                                    </span>
                                    <button
                                      onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.min(totalPages, currentPage + 1) }))}
                                      disabled={currentPage === totalPages}
                                      className="w-7 h-7 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Matches List Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {displayMatches.map((match) => renderMatchCard(match, true, group.matches, matchedTournament ?? null))}
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
                          {translate('previous')}
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
                          {translate('next')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 2.2: Trận đấu vừa kết thúc */}
          {(isLoading || completedMatches.length > 0) && (
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{translate('recentMatchResults')}</h2>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="bg-slate-200 animate-pulse h-40 rounded-xl" />
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
                      const isRanked = getMatchRankedStatus(group.matches[0], matchedTournament);

                      return (
                        <div key={tournamentName} className="bg-slate-50/50 rounded-2xl p-3.5 md:p-4 flex flex-col gap-3">
                          {/* Group Tournament Header */}
                          <div className="flex items-center justify-between">
                            <Link
                              href={group.id ? `/tournaments/${group.id}` : '#'}
                              className="flex items-center gap-3 group/header hover:opacity-90 transition-opacity flex-1 min-w-0"
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200/80 bg-white relative flex-shrink-0 shadow-2xs">
                                <TournamentLogoAvatar src={group.logoUrl} alt={group.name} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${isRanked ? 'text-sky-700 bg-sky-50' : 'text-slate-600 bg-slate-200/60'}`}>
                                    {isRanked ? translate('rankedBadge') : translate('communityBadge')}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md text-violet-700 bg-violet-50">
                                    <LiveMatchSportLabel match={group.matches[0]} tournament={matchedTournament} tournamentName={group.name} translate={translate} />
                                  </span>
                                </div>
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
                                    className="w-7 h-7 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[11px] font-semibold text-slate-400 px-1">
                                    {currentPage}/{totalPages}
                                  </span>
                                  <button
                                    onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.min(totalPages, currentPage + 1) }))}
                                    disabled={currentPage === totalPages}
                                    className="w-7 h-7 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Matches List Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {displayMatches.map((match) => renderMatchCard(match, true, group.matches, matchedTournament ?? null))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 2.5: Trận đấu sắp diễn ra */}
          {(isLoading || upcomingMatches.length > 0) && (
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{translate('upcomingSchedule')}</h2>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="bg-slate-200 animate-pulse h-40 rounded-xl" />
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
                      const isRanked = getMatchRankedStatus(group.matches[0], matchedTournament);

                      return (
                        <div key={tournamentName} className="bg-slate-50/50 rounded-2xl p-3.5 md:p-4 flex flex-col gap-3">
                          {/* Group Tournament Header */}
                          <div className="flex items-center justify-between">
                            <Link
                              href={group.id ? `/tournaments/${group.id}` : '#'}
                              className="flex items-center gap-3 group/header hover:opacity-90 transition-opacity flex-1 min-w-0"
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200/80 bg-white relative flex-shrink-0 shadow-2xs">
                                <TournamentLogoAvatar src={group.logoUrl} alt={group.name} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${isRanked ? 'text-sky-700 bg-sky-50' : 'text-slate-600 bg-slate-200/60'}`}>
                                    {isRanked ? translate('rankedBadge') : translate('communityBadge')}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md text-violet-700 bg-violet-50">
                                    <LiveMatchSportLabel match={group.matches[0]} tournament={matchedTournament} tournamentName={group.name} translate={translate} />
                                  </span>
                                </div>
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
                                    className="w-7 h-7 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[11px] font-semibold text-slate-400 px-1">
                                    {currentPage}/{totalPages}
                                  </span>
                                  <button
                                    onClick={() => setTournamentPages(prev => ({ ...prev, [tournamentId]: Math.min(totalPages, currentPage + 1) }))}
                                    disabled={currentPage === totalPages}
                                    className="w-7 h-7 flex items-center justify-center p-1 text-slate-500 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Matches List Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {displayMatches.map((match) => renderMatchCard(match, true, group.matches, matchedTournament ?? null))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 4: Giải vừa kết thúc */}
          {(isLoading || recentCompletedTournaments.length > 0) && (
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{translate('recentTournaments')}</h2>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{translate('last14Days')}</p>
                </div>
                <Link href="/tournaments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  {translate('explore')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-200 animate-pulse h-72 rounded-xl" />
                    <div className="bg-slate-200 animate-pulse h-72 rounded-xl" />
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
          )}

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
               <h3 className="text-sm font-semibold text-slate-900 mb-1">{translate('notSignedIn')}</h3>
               <p className="text-xs text-slate-500 mb-4">{translate('loginToSee')}</p>
               <div className="flex flex-col w-full gap-2">
                 <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-xs shadow-sm transition-colors cursor-pointer">
                   {translate('signInNow')}
                 </a>
                 <a href="/register" className="border border-slate-200 text-slate-650 hover:bg-slate-50 font-semibold py-2.5 px-4 rounded-xl text-center text-xs transition-colors">
                   {translate('signUp')}
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
                   {user?.fullName || translate('user')}
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
                       {translate('matchLabel')}
                     </span>
                   </div>
                   <div className="flex flex-col items-center border-l border-r border-slate-100">
                     <span className="text-base font-bold text-slate-800 leading-none">
                       {matchesWon}
                     </span>
                     <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                       {translate('wins')}
                     </span>
                   </div>
                   <div className="flex flex-col items-center">
                     <span className="text-base font-bold text-slate-800 leading-none">
                       {winRate}%
                     </span>
                     <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                       {translate('winRate')}
                     </span>
                   </div>
                 </div>

                 {/* CTA */}
                 <Link href="/profile" className="w-full mt-4">
                   <button className="w-full text-xs py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-xl transition-all active:scale-95 duration-150 cursor-pointer shadow-sm">
                     {translate('profile')}
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

           {/* Widget 2 — Banner Ads (Chuẩn IAB 300x250 Medium Rectangle) */}
           <AdBannerCard
             slot="HOMEPAGE_SIDEBAR"
             variant="sidebar"
             sponsor={translate('promoStore')}
             title={translate('promoProduct')}
             description={translate('promoOffer')}
             href="/tournaments"
             badgeLabel={translate('advertisement')}
           />

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
