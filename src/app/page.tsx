'use client';

// Reading this as: Sports platform homepage with live matches feed, featured tournaments, and community bento grid.
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { buildMatchScoreSummary, getMatchScorePresentation, resolveMatchSportRules, extractMatchScores } from '@/features/matches/score-display';
import Image from 'next/image';
import {
  Trophy, Calendar, Users, MapPin, ArrowRight, Shield, Heart, Share2, Play,
  Plus, Bell, Mail, UserPlus, Star, Loader2, MessageSquare,
  Hourglass, Coins, Sparkles
} from 'lucide-react';
import { getSportLogo } from '@/constants/sports';
import { BRAND } from '@/constants/brand';
import { categoriesApi } from '@/features/categories/api';
import { Category } from '@/types/category';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { matchesApi } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import { BracketMatch } from '@/features/tournaments/api';
import type { SportRulesEnvelope } from '@/types/tournament';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import { getMatchCourtLabel } from '@/utils/tournament-location';
import HomepageEloProgressCard from '@/components/rankings/HomepageEloProgressCard';
import {
  getBestRankForCategory,
  getMostProminentRank,
  getRanksForCategory,
  getRankTierName,
  getRankWinRate,
  isPublicRankingEligible,
} from '@/features/rankings/elo-display';
import { isNetworkError } from '@/utils/error';
import { isTournamentCancelled, isTournamentCompleted, isTournamentInProgress } from '@/utils/tournament-status';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ShareModal from '@/components/common/ShareModal';
import { shouldHideFeaturedCardText } from '@/features/tournaments/featured-banner';
import { RankAvatar, getRankRingClass } from '@/components/ui/RankAvatar';
import ParticipantIdentity, { formatShortPersonName } from '@/components/ui/ParticipantIdentity';
import AdBannerCard from '@/components/ui/AdBannerCard';
import TournamentBannerCover from '@/components/ui/TournamentBannerCover';
import LeftActionDock, { type MainViewMode } from '@/components/layout/LeftActionDock';
import HomeSocialFeed from '@/components/ui/HomeSocialFeed';
import {
  AthleteProfileCard,
  SocialMatchFilters,
  SocialMyClubsCard,
  SocialFeaturedTournaments,
  SocialDaySelectorStrip,
  SocialPickupRow,
  SocialScheduleAndCourtsWidgets,
  type SocialPickupItem,
  type DayPill,
  type MyClubItem,
} from '@/components/ui/SocialBentoHub';

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
  venueName?: string | null;
  logoUrl?: string | null;
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

const HOME_TOURNAMENTS_LIMIT = 3;
const HOME_MATCHES_PER_TOURNAMENT = 4;
const HOME_TOURNAMENT_FETCH_LIMIT = 50;
const HOME_MATCH_FETCH_LIMIT = 1000;

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const normalizeCategoryValue = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ');

const matchesSelectedCategory = (
  values: Array<string | null | undefined>,
  selectedCategoryId: string,
  selectedCategory?: Category,
): boolean => {
  if (!selectedCategoryId) return true;
  const selectedValues = [
    selectedCategoryId,
    selectedCategory?.id,
    selectedCategory?.slug,
    selectedCategory?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeCategoryValue);
  return values
    .filter((value): value is string => Boolean(value))
    .some((value) => selectedValues.includes(normalizeCategoryValue(value)));
};

const limitTournamentGroups = (
  entries: Array<[string, GroupMatchesData]>,
  tournamentLimit = HOME_TOURNAMENTS_LIMIT,
  matchesPerTournament = HOME_MATCHES_PER_TOURNAMENT,
): Array<[string, GroupMatchesData]> => {
  return entries.slice(0, tournamentLimit).map(([key, group]) => [
    key,
    {
      ...group,
      matches: group.matches.slice(0, matchesPerTournament),
    },
  ]);
};

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
    // This presentation helper only resolves sport rules; do not leak the
    // broad API status string into the narrower MatchSportContext contract.
    status: undefined,
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
  const fallbackSrc = '/sporto_v1.svg';
  const [imgError, setImgError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setImgError(false);
  }

  const imageSrc = (!imgError && src?.trim()) ? src : fallbackSrc;
  const isFallback = imageSrc === fallbackSrc;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      className={`group-hover:scale-105 transition-transform duration-500 ${
        isFallback ? 'object-contain p-2.5' : 'object-cover'
      }`}
      onError={() => setImgError(true)}
      unoptimized={isFallback}
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
    <div className={`${hideFeaturedCardText ? 'aspect-[21/9] bg-slate-100' : 'bg-white'} rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col group relative`}>
      <div className={`${hideFeaturedCardText ? 'absolute inset-0' : 'h-44 shrink-0'} bg-slate-100 relative overflow-hidden`}>
        <TournamentBannerCover
          bannerUrl={tournament.bannerUrl}
          tournamentName={tournament.name}
          categoryName={tournament.category?.name}
          isCompleted={isTournamentCompleted(tournament.status)}
        >
          {/* Badges */}
          {!hideFeaturedCardText && (
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full shadow-sm text-slate-800 text-xs font-bold tracking-wider uppercase border border-white/20">
              <Trophy className="w-3.5 h-3.5 inline-block mr-1" />
              {tournament.category?.name || translate('tournamentFallback')}
            </span>
            <span className="px-3 py-1 bg-emerald-600/90 backdrop-blur-md rounded-full shadow-sm text-white text-xs font-bold tracking-wider uppercase">
              {translate('tournamentEnded')}
            </span>
          </div>
          )}
        </TournamentBannerCover>
      </div>

      {!hideFeaturedCardText && (
        <div className="p-5 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-content-link transition-colors line-clamp-1 leading-snug">
              {tournament.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
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
  const { openUserProfile } = useUserProfileModalStore();
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
  const [now, setNow] = useState(() => Date.now());
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myClubs, setMyClubs] = useState<MyClubItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Live Matches Feed
  const [liveMatches, setLiveMatches] = useState<BracketMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<BracketMatch[]>([]);
  const [completedMatches, setCompletedMatches] = useState<BracketMatch[]>([]);
  const [highFives, setHighFives] = useState<Record<string, number>>({});
  const hasLoadedFeedRef = useRef(false);
  const feedRequestInFlightRef = useRef(false);
  const feedRefreshQueuedRef = useRef(false);
  const [feedRefreshTick, setFeedRefreshTick] = useState(0);
  const [mainView, setMainView] = useState<MainViewMode>('EXPLORE');
  const [matchStatusTab, setMatchStatusTab] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED'>('UPCOMING');
  const pickupsSectionRef = useRef<HTMLDivElement>(null);

  const handleScrollToPickups = () => {
    pickupsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Ranked Tournament State
  const [rankedTournament, setRankedTournament] = useState<Tournament | null>(null);
  const [rankedTournamentMatches, setRankedTournamentMatches] = useState<BracketMatch[]>([]);
  const [isLoadingRanked, setIsLoadingRanked] = useState(false);

  // Widget States
  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<unknown | null>(null);

  // Bento Social Discovery State
  const [activeDayId, setActiveDayId] = useState<string>('day-0');
  const daysList: DayPill[] = useMemo(() => {
    const today = new Date(now);
    const dayNames = [
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'CN',
    ];
    const counts = [14, 9, 16, 8, 12, 11, 7];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
      const dayOfWeekIndex = (d.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
      const dayPrefix = dayNames[dayOfWeekIndex];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const dayLabel = `${dayPrefix} ${dayNum}/${monthNum}`;
      const dateStr = `${dayNum}/${monthNum}`;
      return {
        id: `day-${i}`,
        dayLabel,
        dateStr,
        matchCount: counts[i % counts.length],
        isToday: i === 0,
      };
    });
  }, [now]);

  const [activeFilterId, setActiveFilterId] = useState<string>('all');
  const pickupMatches: SocialPickupItem[] = useMemo(() => [
    {
      id: 'pickup-1',
      title: 'Giao lưu Pickleball D–Sport Q7',
      sport: 'PICKLEBALL',
      sportColorBg: 'bg-blue-50',
      sportColorText: 'text-blue-700',
      sportTier: 'Hạng B / B+',
      matchType: 'Đôi Nam Nữ',
      isClubHosted: true,
      clubName: 'Hà Anh Club',
      isRanked: true,
      distance: '1.2 km',
      hostName: 'Hà Anh',
      courtLocation: 'Sân D–Sport Q7',
      timeRange: '19:30 – 21:30',
      feePerSlot: '55.000đ',
      maxSlots: 4,
      currentSlots: 3,
      urgentText: 'Còn 1 slot',
      players: [
        { id: 'u1', fullName: 'Minh Danh', initialsBg: '#2563eb' },
        { id: 'u2', fullName: 'Tuấn Hùng', initialsBg: '#4f46e5' },
        { id: 'u3', fullName: 'Hải Nam', initialsBg: '#2563eb' },
      ],
    },
    {
      id: 'pickup-2',
      title: 'Đánh đôi phong trào Kỳ Hòa • Kèo tự do',
      sport: 'CẦU LÔNG',
      sportColorBg: 'bg-emerald-50',
      sportColorText: 'text-emerald-700',
      sportTier: 'Hạng C+ / B',
      matchType: 'Đôi Nam',
      isClubHosted: false,
      distance: '3.5 km',
      hostName: 'Vũ Đức',
      courtLocation: 'Sân Kỳ Hòa (Sân 5), Q.10',
      timeRange: '20:00 – 22:00',
      feePerSlot: '45.000đ',
      maxSlots: 4,
      currentSlots: 2,
      urgentText: 'Còn 2 slot',
      players: [
        { id: 'u4', fullName: 'Vũ Đức', initialsBg: '#059669' },
        { id: 'u5', fullName: 'Quang Huy', initialsBg: '#0284c7' },
      ],
    },
    {
      id: 'pickup-3',
      title: 'Giao lưu cuối tuần CLB Lan Anh NTRP 3.0 - 3.5 • Sân mái che',
      sport: 'TENNIS',
      sportColorBg: 'bg-amber-50',
      sportColorText: 'text-amber-700',
      sportTier: 'NTRP 3.0 - 3.5',
      matchType: 'Đôi',
      isClubHosted: true,
      clubName: 'Lan Anh Tennis',
      isRanked: true,
      hostName: 'Hoàng Bách',
      courtLocation: 'CLB Quần Vợt Lan Anh, Q.10',
      timeRange: '18:00 - 20:00',
      feePerSlot: '80k',
      maxSlots: 4,
      currentSlots: 3,
      urgentText: 'Còn 1 slot',
      players: [
        { id: 'u6', fullName: 'Hoàng Bách', initialsBg: '#d97706' },
        { id: 'u7', fullName: 'Thành Trung', initialsBg: '#7c3aed' },
        { id: 'u8', fullName: 'Đình Trọng', initialsBg: '#0284c7' },
      ],
    },
    {
      id: 'pickup-4',
      title: 'Tìm 1 bạn đánh đơn rèn thể lực • Tự do giao lưu',
      sport: 'PICKLEBALL',
      sportColorBg: 'bg-blue-50',
      sportColorText: 'text-blue-700',
      sportTier: 'Người mới / 2.5',
      matchType: 'Đơn',
      isClubHosted: false,
      hostName: 'Thanh Tùng',
      courtLocation: 'Sân VietPickle Tân Bình, TP.HCM',
      timeRange: '17:00 - 18:30',
      feePerSlot: '40k',
      maxSlots: 2,
      currentSlots: 1,
      urgentText: 'Còn 1 slot',
      players: [
        { id: 'u9', fullName: 'Thanh Tùng', initialsBg: '#0284c7' },
      ],
    },
  ], []);

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
        setNow(Date.now());
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
        const tParams: Record<string, unknown> = { limit: HOME_TOURNAMENT_FETCH_LIMIT };
        // The tournament endpoint validates categoryId as UUID. Fallback
        // categories use slugs, so those are filtered against the returned
        // category projection instead of producing a guaranteed 400.
        if (selectedCategoryId && isUuid(selectedCategoryId)) {
          tParams.categoryId = selectedCategoryId;
        }

        // Fetch fresh tournaments and communities
        const tournamentsPromise = tournamentsApi.getPublicTournaments(tParams);
        const cParams: Record<string, unknown> = { limit: 6 };
        if (selectedCategoryId) {
          cParams.categoryId = selectedCategoryId;
        }
        const communitiesPromise = communitiesApi.getCommunities(cParams);

        // Fetch preview matches for the homepage
        const matchCategoryParams = selectedCategoryId ? { categoryId: selectedCategoryId } : {};
        const publicMatchesPromise = matchesApi.getMatches({
          status: 'ONGOING,SCHEDULED,COMPLETED,FINISHED,DONE,ENDED',
          limit: HOME_MATCH_FETCH_LIMIT,
          publicOnly: true,
          ...matchCategoryParams,
        });

        const userRankingsPromise = isAuthenticated && user?.id
          ? rankingsApi.getUserRankings(user.id)
          : Promise.resolve(null);

        const myCommunitiesPromise = isAuthenticated && user?.id
          ? communitiesApi.getMyCommunities().catch(() => null)
          : Promise.resolve(null);

        const [tRes, cRes, publicMatchesRes, userRankRes, myCommRes] = await Promise.allSettled([
          tournamentsPromise,
          communitiesPromise,
          publicMatchesPromise,
          userRankingsPromise,
          myCommunitiesPromise,
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
          ? activeTournaments.filter((t) => matchesSelectedCategory(
            [t.categoryId, t.category?.id, t.category?.slug, t.category?.name],
            selectedCategoryId,
          ))
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
            ? fetchedCommunities.filter((community) => community.categories?.some((category) =>
              matchesSelectedCategory([category.id, category.slug, category.name], selectedCategoryId),
            ))
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
        const liveList = publicMatchList.filter((m) => ['ONGOING', 'IN_PROGRESS', 'LIVE', 'PLAYING'].includes(String(m.status).toUpperCase()));
        const completedList = publicMatchList.filter((m) => ['COMPLETED', 'FINISHED', 'DONE', 'ENDED'].includes(String(m.status).toUpperCase()));
        const upcomingList = publicMatchList.filter((m) => ['SCHEDULED', 'UPCOMING', 'PENDING'].includes(String(m.status).toUpperCase()));

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

        const nextLive = liveList.filter(m => !isCompletedMatch(m) && !m.isBye);

        const validUpcoming = upcomingList.filter(m =>
          !m.isBye &&
          m.participant1 != null &&
          m.participant2 != null &&
          m.participant1.teamName.trim().toLowerCase() !== 'tbd' &&
          m.participant2.teamName.trim().toLowerCase() !== 'tbd' &&
          m.participant1.teamName.trim().toLowerCase() !== 'chờ xác định' &&
          m.participant2.teamName.trim().toLowerCase() !== 'chờ xác định'
        );
        const nextUpcoming = validUpcoming;

        const nextCompleted = completedList.filter(m => !m.isBye);
        if (publicMatchesRes.status === 'fulfilled') {
          setLiveMatches(nextLive);
          setUpcomingMatches(nextUpcoming);
          setCompletedMatches(nextCompleted);
        } else if (selectedCategoryId) {
          // A failed filtered request must not leave another sport on screen.
          setLiveMatches([]);
          setUpcomingMatches([]);
          setCompletedMatches([]);
        }

        // ── ĐỢT 3 (sau 600ms): rankings (1 call) ──
        if (userRankRes.status === 'fulfilled' && userRankRes.value) {
          setUserRankings(userRankRes.value);
        } else {
          setUserRankings(null);
        }

        // ── Process My Communities (Created & Joined) ──
        if (myCommRes.status === 'fulfilled' && myCommRes.value?.data) {
          const createdList = (myCommRes.value.data.created || []).map((c) => ({
            id: c.id,
            name: c.name,
            role: 'OWNER' as const,
            memberCount: c._count?.members,
            court: c.locationAddress,
            logoUrl: c.logoUrl,
          }));
          const joinedList = (myCommRes.value.data.joined || []).map((c) => ({
            id: c.id,
            name: c.name,
            role: (c.myRole || 'MEMBER') as string,
            memberCount: c._count?.members,
            court: c.locationAddress,
            logoUrl: c.logoUrl,
          }));

          // Avoid duplicate club entries
          const seenIds = new Set<string>();
          const combinedClubs: MyClubItem[] = [];
          [...createdList, ...joinedList].forEach((club) => {
            if (!seenIds.has(club.id)) {
              seenIds.add(club.id);
              combinedClubs.push(club);
            }
          });
          setMyClubs(combinedClubs);
        } else {
          setMyClubs([]);
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

  // The homepage is a preview. The full match list is available from /matches.
  const liveTournamentEntries = Object.entries(liveMatchesByTournament);
  const visibleLiveTournamentEntries = limitTournamentGroups(liveTournamentEntries);

  // Group upcoming matches by tournament name.
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

  const upcomingTournamentEntries = Object.entries(upcomingMatchesByTournament);
  const visibleUpcomingTournamentEntries = limitTournamentGroups(upcomingTournamentEntries);

  // Group completed matches by tournament name.
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

  const completedTournamentEntries = Object.entries(completedMatchesByTournament);
  const visibleCompletedTournamentEntries = limitTournamentGroups(completedTournamentEntries);

  const renderMatchCard = (
    match: BracketMatch,
    isRankedMatchSection = false,
    contextMatches: BracketMatch[] = [match],
    contextTournament?: Pick<Tournament, 'format' | 'maxParticipants'> | null,
  ) => {
    const currentHighFives = highFives[match.id] ?? ((match as unknown as Record<string, unknown>).cheerCount as number) ?? 0;
    const matchStatus = String(match.status || '').toUpperCase();
    const isCompleted = ['COMPLETED', 'FINISHED', 'DONE', 'ENDED'].includes(matchStatus) || match.winnerId != null;
    const isLive = ['ONGOING', 'IN_PROGRESS', 'LIVE', 'PLAYING'].includes(matchStatus) && !isCompleted;
    const isScheduled = ['SCHEDULED', 'UPCOMING', 'PENDING'].includes(matchStatus);
    const roundLabel = getMatchRoundLabel({
      match,
      matches: contextMatches,
      tournamentFormat: contextTournament?.format ?? rankedTournament?.format,
      bracketSize: contextTournament?.maxParticipants ?? rankedTournament?.maxParticipants ?? null,
      translations: roundLabelTranslations,
    });

    const scores = extractMatchScores(match.scoreDetails);
    const currentSetIndex = scores.findIndex((s: { isFinished: boolean }) => !s.isFinished);
    const activeSet = currentSetIndex !== -1 ? scores[currentSetIndex] : (scores[scores.length - 1] || { team1Score: 0, team2Score: 0 });
    const currentSetNum = currentSetIndex !== -1 ? currentSetIndex + 1 : (scores.length || 1);

    const isP1Winner = Boolean(
      (match.winnerId && match.participant1Id && match.winnerId === match.participant1Id) ||
      (isCompleted && activeSet.team1Score > activeSet.team2Score)
    );
    const isP2Winner = Boolean(
      (match.winnerId && match.participant2Id && match.winnerId === match.participant2Id) ||
      (isCompleted && activeSet.team2Score > activeSet.team1Score)
    );

    const startedAtTime = (match as unknown as { startedAt?: string | null }).startedAt || match.scheduledAt;
    const elapsedMinutes = isClient && startedAtTime && isLive
      ? Math.max(1, Math.floor((now - new Date(startedAtTime).getTime()) / 60000))
      : null;
    const durationText = elapsedMinutes && elapsedMinutes < 300 ? `${elapsedMinutes}'` : '';

    const setSubStatusText = isLive
      ? `Set ${currentSetNum}${durationText ? ` • ${durationText}` : ''}`
      : isScheduled
        ? (match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : translate('statusUpcoming'))
        : translate('statusCompleted');

    const renderOpponent = (
      participant: BracketMatch['participant1'],
      fallbackText: string,
      side: 'left' | 'right',
    ) => {
      const isWinner = side === 'left' ? isP1Winner : isP2Winner;
      const isLoser = side === 'left' ? isP2Winner : isP1Winner;

      const rawMembers = (participant?.members ?? []).filter((m) => m.fullName || m.avatarUrl);
      const teamNameParts = participant?.teamName && participant.teamName.includes(' / ')
        ? participant.teamName.split(' / ').map((p) => p.trim()).filter(Boolean)
        : [];

      const isDoubles = rawMembers.length === 2 || teamNameParts.length === 2;
      const member1 = rawMembers[0] || (teamNameParts[0] ? { fullName: teamNameParts[0] } : undefined);
      const member2 = rawMembers[1] || (teamNameParts[1] ? { fullName: teamNameParts[1] } : undefined);

      const displayName = rawMembers.length === 2
        ? rawMembers.map((m) => formatShortPersonName(m.fullName) || m.fullName).filter(Boolean).join(' / ')
        : teamNameParts.length === 2
          ? teamNameParts.map((p) => formatShortPersonName(p) || p).join(' / ')
          : rawMembers.length === 1 && rawMembers[0].fullName
            ? formatShortPersonName(rawMembers[0].fullName) || rawMembers[0].fullName
            : formatShortPersonName(participant?.teamName) || fallbackText;

      const logoUrl = participant?.logoUrl;

      const renderSingleAvatar = (
        m: { fullName?: string | null; avatarUrl?: string | null } | undefined,
        sizeClass: string,
        textSizeClass: string,
        sideFallback: 'left' | 'right',
      ) => {
        const url = m?.avatarUrl;
        const name = m?.fullName || participant?.teamName || fallbackText;
        const initial = (name.trim().charAt(0) || '?').toUpperCase();
        const borderColor = sideFallback === 'left' ? 'border-[#FDE047] text-amber-800 bg-amber-50/60' : 'border-[#BAE6FD] text-sky-800 bg-sky-50/60';

        return (
          <div
            className={`relative ${sizeClass} rounded-full overflow-hidden border-2 ${borderColor} flex items-center justify-center shrink-0 shadow-2xs`}
          >
            {url ? (
              <Image
                src={url}
                alt={name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className={`font-semibold ${textSizeClass}`}>
                {initial}
              </span>
            )}
          </div>
        );
      };

      return (
        <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1">
          {/* Avatar Area */}
          <div className="relative flex items-center justify-center">
            {isDoubles ? (
              side === 'left' ? (
                <div className="flex items-center -space-x-3">
                  <div className="z-20">
                    {renderSingleAvatar(member1, 'w-10 h-10 sm:w-11 sm:h-11', 'text-sm', 'left')}
                  </div>
                  <div className="z-10 mt-1">
                    {renderSingleAvatar(member2, 'w-8 h-8 sm:w-8.5 sm:h-8.5', 'text-xs', 'left')}
                  </div>
                </div>
              ) : (
                <div className="flex items-center -space-x-3">
                  <div className="z-10 mt-1">
                    {renderSingleAvatar(member1, 'w-8 h-8 sm:w-8.5 sm:h-8.5', 'text-xs', 'right')}
                  </div>
                  <div className="z-20">
                    {renderSingleAvatar(member2, 'w-10 h-10 sm:w-11 sm:h-11', 'text-sm', 'right')}
                  </div>
                </div>
              )
            ) : (
              renderSingleAvatar(
                rawMembers[0] || (logoUrl ? { avatarUrl: logoUrl, fullName: participant?.teamName } : undefined),
                'w-11 h-11 sm:w-12 sm:h-12',
                'text-base',
                side,
              )
            )}
          </div>
          {/* Name */}
          <span
            className="mt-2 text-xs sm:text-[13px] text-center line-clamp-1 max-w-[120px] sm:max-w-[150px] font-semibold text-slate-700 tracking-tight"
          >
            {displayName}
          </span>
        </div>
      );
    };

    return (
      <motion.div
        key={match.id}
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="bg-white text-slate-900 rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200 overflow-hidden flex flex-col justify-between group relative p-3 sm:p-4"
      >
        {/* Whole Card Link */}
        <Link href={`/live/${match.id}`} className="block flex-1">
          {/* 1. Header Bar: Nhánh / Vòng đấu bên trái, badge LIVE bên phải */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
              {roundLabel || translate('roundFallback')}
            </span>

            {/* Status Pill Badge */}
            <div className="shrink-0">
              {isLive ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
              ) : isCompleted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  {translate('statusCompleted')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                  {translate('statusUpcoming')}
                </span>
              )}
            </div>
          </div>

          {/* 2. Opponents Face-off Arena */}
          <div className="flex items-center justify-between gap-2 py-1">
            {/* Participant 1 */}
            {renderOpponent(match.participant1, translate('pendingTeam'), 'left')}

            {/* Center Score / Time */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 min-w-[76px]">
              {isScheduled ? (
                <>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'VS'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 mt-1">
                    {translate('statusUpcoming')}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 font-sans leading-none">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {activeSet.team1Score}
                    </span>
                    <span className="text-slate-300 font-bold text-base select-none">-</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {activeSet.team2Score}
                    </span>
                  </div>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF1F2] text-[#F43F5E] border border-[#FFE4E6] tracking-wider uppercase">
                    {isLive ? `SET ${currentSetNum}` : setSubStatusText}
                  </span>
                </>
              )}
            </div>

            {/* Participant 2 */}
            {renderOpponent(match.participant2, translate('pendingTeam'), 'right')}
          </div>
        </Link>
      </motion.div>
    );
  };

  const renderCompletedMatchRow = (
    match: BracketMatch,
    contextMatches: BracketMatch[] = [match],
    contextTournament?: Pick<Tournament, 'format' | 'maxParticipants'> | null,
  ) => {
    const scores = extractMatchScores(match.scoreDetails);
    const roundLabel = getMatchRoundLabel({
      match,
      matches: contextMatches,
      tournamentFormat: contextTournament?.format ?? rankedTournament?.format,
      bracketSize: contextTournament?.maxParticipants ?? rankedTournament?.maxParticipants ?? null,
      translations: roundLabelTranslations,
    });

    const rawCourt = (match.courtName || match.tournament?.venueName || '').trim();
    const courtText = rawCourt
      ? rawCourt.replace(/^sân\s+/i, '').split(',')[0].trim()
      : '';
    const formatText = getFormatLabel(
      (match as EnrichedMatch).tournament?.matchType || ((match as unknown) as Record<string, unknown>).matchType as string | undefined,
      (match as EnrichedMatch).tournament?.genderRestriction || ((match as unknown) as Record<string, unknown>).genderRestriction as string | undefined,
      translate
    );

    const isP1Winner = Boolean(
      (match.winnerId && match.participant1Id && match.winnerId === match.participant1Id) ||
      (scores.length > 0 && scores[scores.length - 1].team1Score > scores[scores.length - 1].team2Score)
    );
    const isP2Winner = Boolean(
      (match.winnerId && match.participant2Id && match.winnerId === match.participant2Id) ||
      (scores.length > 0 && scores[scores.length - 1].team2Score > scores[scores.length - 1].team1Score)
    );

    const renderTeamRow = (
      participant: BracketMatch['participant1'],
      isWinner: boolean,
      isLoser: boolean,
      side: 'p1' | 'p2',
    ) => {
      // Lấy danh sách thành viên không trùng lặp
      const uniqueMembers = (participant?.members ?? []).filter(
        (m, idx, arr) => (m.fullName || m.avatarUrl) && arr.findIndex((x) => x.fullName === m.fullName) === idx
      );
      const teamName = (participant?.teamName || '').trim();

      // Kiểm tra thể thức từ tournament nếu có
      const rawMatchType = String(
        (match as EnrichedMatch).tournament?.matchType ||
        contextTournament?.format ||
        ''
      ).toUpperCase();
      const isDoublesTournament = rawMatchType.includes('DOUBLE') || rawMatchType.includes('ĐÔI');

      // Xác định đánh đơn hay đánh đôi
      const isDoubles = isDoublesTournament || uniqueMembers.length >= 2 || teamName.includes(' / ') || teamName.includes(' - ');

      let primaryTitle = '';
      let subTitle = '';

      if (isDoubles) {
        // ĐÁNH ĐÔI:
        // Dòng trên (lớn): TÊN ĐỘI (teamName) từ API (VD: "QA Bổ sung 19", "Đội 1", "Minh Anh - Phương Linh")
        // Dòng dưới (nhỏ): Tên các thành viên (member1 • member2)
        const memberNamesStr = uniqueMembers.map((m) => m.fullName).filter(Boolean).join(' • ');

        if (teamName) {
          primaryTitle = teamName;
          // Chỉ hiện dòng phụ thành viên nếu tên thành viên không trùng 100% với tên đội
          subTitle = memberNamesStr && memberNamesStr !== teamName && !teamName.includes(memberNamesStr)
            ? memberNamesStr
            : '';
        } else if (uniqueMembers.length >= 2) {
          const m1 = uniqueMembers[0].fullName || '';
          const m2 = uniqueMembers[1].fullName || '';
          primaryTitle = `${m1} - ${m2}`;
          subTitle = '';
        } else {
          primaryTitle = translate('pendingTeam');
          subTitle = '';
        }
      } else {
        // ĐÁNH ĐƠN:
        // Tên người chơi ở trên luôn, không hiện tên nhỏ
        const singleName = uniqueMembers[0]?.fullName || teamName;
        primaryTitle = singleName || translate('pendingTeam');
        subTitle = '';
      }

      const avatarBg1 = side === 'p1' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-violet-100 text-violet-700 border-violet-200';
      const avatarBg2 = side === 'p1' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-violet-50 text-violet-800 border-violet-300';

      const renderAvatar = () => {
        if (isDoubles && uniqueMembers.length >= 2) {
          const m1 = uniqueMembers[0];
          const m2 = uniqueMembers[1];
          const init1 = (m1.fullName?.trim().charAt(0) || '?').toUpperCase();
          const init2 = (m2.fullName?.trim().charAt(0) || '?').toUpperCase();
          return (
            <div className="flex items-center -space-x-2 shrink-0 relative pr-1">
              {m1.avatarUrl ? (
                <img
                  src={m1.avatarUrl}
                  alt={m1.fullName || ''}
                  className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs z-20"
                />
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-white shadow-2xs z-20 ${avatarBg1}`}>
                  {init1}
                </div>
              )}
              {m2.avatarUrl ? (
                <img
                  src={m2.avatarUrl}
                  alt={m2.fullName || ''}
                  className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-2xs z-10"
                />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 border border-white shadow-2xs z-10 ${avatarBg2}`}>
                  {init2}
                </div>
              )}
            </div>
          );
        }

        // Single avatar
        const singleMember = uniqueMembers[0];
        const initialChar = (primaryTitle.trim().charAt(0) || '?').toUpperCase();
        return singleMember?.avatarUrl ? (
          <img
            src={singleMember.avatarUrl}
            alt={primaryTitle}
            className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0 shadow-2xs"
          />
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarBg1}`}>
            {initialChar}
          </div>
        );
      };

      return (
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
            {renderAvatar()}

            {/* Name & Subtitle */}
            <div className="min-w-0 flex-1">
              <div className={`text-xs sm:text-sm tracking-tight truncate ${isWinner ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold'}`}>
                {primaryTitle}
              </div>
              {subTitle && (
                <div className="text-xs text-slate-500 truncate mt-0.5 font-normal">
                  {subTitle}
                </div>
              )}
            </div>
          </div>

          {/* Scores for Sets - Gọn gàng, rõ ràng */}
          <div className="flex items-center gap-1.5 shrink-0 text-center">
            {scores.length > 0 ? (
              scores.slice(0, 5).map((s, idx) => {
                const scoreVal = side === 'p1' ? s.team1Score : s.team2Score;
                const oppVal = side === 'p1' ? s.team2Score : s.team1Score;
                const isSetWin = scoreVal > oppVal;
                return (
                  <div
                    key={idx}
                    className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-md flex items-center justify-center text-xs tabular-nums transition-colors ${
                      isSetWin
                        ? 'bg-sky-500 text-white font-bold shadow-xs border border-sky-400'
                        : 'bg-slate-100 text-slate-700 font-semibold'
                    }`}
                  >
                    {scoreVal}
                  </div>
                );
              })
            ) : (
              <div className="w-6 text-xs text-slate-400 italic">--</div>
            )}
          </div>
        </div>
      );
    };

    return (
      <Link
        href={`/live/${match.id}`}
        key={match.id}
        className="block bg-white rounded-xl border border-slate-200/80 p-3 sm:p-3.5 hover:border-slate-300 hover:shadow-2xs transition-all"
      >
        {/* Row Header: Nhãn vòng đấu, set S1 S2 rõ ràng */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600 uppercase tracking-wider truncate">
            <span className="font-bold text-slate-700">{roundLabel || translate('roundFallback')}</span>
            {formatText && <span className="text-slate-500">• {formatText}</span>}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-bold text-slate-500 text-xs">
            {scores.length > 0 ? (
              scores.slice(0, 5).map((_, idx) => (
                <div key={idx} className="w-6 sm:w-6.5 text-center">
                  S{idx + 1}
                </div>
              ))
            ) : (
              <div className="w-6 text-center">Tỷ số</div>
            )}
          </div>
        </div>

        {/* 2 Participants Rows */}
        <div>
          {renderTeamRow(match.participant1, isP1Winner, isP2Winner, 'p1')}
          {renderTeamRow(match.participant2, isP2Winner, isP1Winner, 'p2')}
        </div>
      </Link>
    );
  };

  const renderUpcomingMatchRow = (
    match: BracketMatch,
    contextMatches: BracketMatch[] = [match],
    contextTournament?: Pick<Tournament, 'format' | 'maxParticipants'> | null,
  ) => {
    const roundLabel = getMatchRoundLabel({
      match,
      matches: contextMatches,
      tournamentFormat: contextTournament?.format ?? rankedTournament?.format,
      bracketSize: contextTournament?.maxParticipants ?? rankedTournament?.maxParticipants ?? null,
      translations: roundLabelTranslations,
    });

    const rawCourt = (match.courtName || match.tournament?.venueName || '').trim();
    const courtText = rawCourt
      ? rawCourt.replace(/^sân\s+/i, '').split(',')[0].trim()
      : '';
    const formatText = getFormatLabel(
      (match as EnrichedMatch).tournament?.matchType || ((match as unknown) as Record<string, unknown>).matchType as string | undefined,
      (match as EnrichedMatch).tournament?.genderRestriction || ((match as unknown) as Record<string, unknown>).genderRestriction as string | undefined,
      translate
    );

    const timeString = match.scheduledAt
      ? new Date(match.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : null;

    const renderTeamRow = (
      participant: BracketMatch['participant1'],
      orderNumber: number,
      side: 'p1' | 'p2',
    ) => {
      const uniqueMembers = (participant?.members ?? []).filter(
        (m, idx, arr) => (m.fullName || m.avatarUrl) && arr.findIndex((x) => x.fullName === m.fullName) === idx
      );
      const teamName = (participant?.teamName || '').trim();

      const rawMatchType = String(
        (match as EnrichedMatch).tournament?.matchType ||
        contextTournament?.format ||
        ''
      ).toUpperCase();
      const isDoublesTournament = rawMatchType.includes('DOUBLE') || rawMatchType.includes('ĐÔI');
      const isDoubles = isDoublesTournament || uniqueMembers.length >= 2 || teamName.includes(' / ') || teamName.includes(' - ');

      let primaryTitle = '';
      let subTitle = '';

      if (isDoubles) {
        const memberNamesStr = uniqueMembers.map((m) => m.fullName).filter(Boolean).join(' • ');

        if (teamName) {
          primaryTitle = teamName;
          subTitle = memberNamesStr && memberNamesStr !== teamName && !teamName.includes(memberNamesStr)
            ? memberNamesStr
            : '';
        } else if (uniqueMembers.length >= 2) {
          const m1 = uniqueMembers[0].fullName || '';
          const m2 = uniqueMembers[1].fullName || '';
          primaryTitle = `${m1} - ${m2}`;
          subTitle = '';
        } else {
          primaryTitle = translate('pendingTeam');
          subTitle = '';
        }
      } else {
        const singleName = uniqueMembers[0]?.fullName || teamName;
        primaryTitle = singleName || translate('pendingTeam');
        subTitle = '';
      }

      const badgeColor = side === 'p1' ? 'border-purple-200 text-purple-600 bg-purple-50/50' : 'border-amber-200 text-amber-600 bg-amber-50/50';

      return (
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
            {/* Number badge / Avatar circle */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${badgeColor}`}>
              {orderNumber}
            </div>

            {/* Name + Subtitle */}
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight truncate">
                {primaryTitle}
              </div>
              {subTitle && (
                <div className="text-xs text-slate-500 truncate mt-0.5 font-normal">
                  {subTitle}
                </div>
              )}
            </div>
          </div>

          {/* VS label on the right */}
          <div className="text-xs font-bold text-slate-500 shrink-0 select-none">
            VS
          </div>
        </div>
      );
    };

    return (
      <Link
        href={`/live/${match.id}`}
        key={match.id}
        className="block bg-white rounded-xl border border-slate-200/80 p-3 sm:p-3.5 hover:border-slate-300 hover:shadow-2xs transition-all"
      >
        {/* Header: VÒNG ĐẤU • NỘI DUNG | Sân thi đấu ... Giờ thi đấu */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 uppercase tracking-wider truncate">
            <span>{roundLabel || translate('roundFallback')}</span>
            {formatText && <span>• {formatText}</span>}
          </div>

          {/* Time Badge (e.g. 14:30) */}
          <div className="shrink-0">
            {timeString ? (
              <span className="text-xs font-bold text-slate-800">
                {timeString}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500">
                {translate('statusUpcoming')}
              </span>
            )}
          </div>
        </div>

        {/* 2 Participants Rows */}
        <div>
          {renderTeamRow(match.participant1, 1, 'p1')}
          {renderTeamRow(match.participant2, 2, 'p2')}
        </div>
      </Link>
    );
  };

  const filteredCommunities = selectedCategoryId
    ? communities.filter(c => c.categories?.some(cat => matchesSelectedCategory(
      [cat.id, cat.slug, cat.name],
      selectedCategoryId,
    )))
    : communities;

  const publicRanks = userRankings?.publicRanks || [];
  // The homepage card is a compact personal summary. It must not change to
  // "all sports" when the tournament explorer filter changes; use one
  // representative sport from the user's own ranking data instead.
  const eligibleRanks = publicRanks.filter(isPublicRankingEligible);
  const prominentRank = getMostProminentRank(eligibleRanks);
  const pickleballCategory = categories.find((category) => category.slug === 'pickleball');
  const prominentCategoryId = prominentRank?.categoryId || pickleballCategory?.id;
  const categoryRanks = getRanksForCategory(eligibleRanks, prominentCategoryId);
  const activeRankInfo = prominentRank || getBestRankForCategory(categoryRanks, prominentCategoryId);

  const eloPoints = activeRankInfo?.eloPoints ?? prominentRank?.eloPoints ?? 1000;
  const displayTier = getRankTierName(activeRankInfo);
  const matchesPlayed = activeRankInfo?.matchesPlayed ?? 0;
  const hasPublicRank = isPublicRankingEligible(activeRankInfo);
  const activeElo = activeRankInfo?.eloPoints ?? 0;
  const matchesWon = activeRankInfo?.matchesWon ?? 0;
  const winRate = getRankWinRate(activeRankInfo);
  const peakElo = activeRankInfo?.peakElo || eloPoints;
  const sportName = prominentRank?.categoryName
    || categories.find((c) => c.id === prominentCategoryId)?.name
    || '';

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

  // Map real tournaments to the social featured strip format
  const socialTournaments = useMemo(() => {
    if (tournaments.length === 0) return undefined;
    return tournaments.slice(0, 4).map((t) => {
      const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
      const start = t.startDate ? new Date(t.startDate).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }) : '';
      const end = t.endDate ? new Date(t.endDate).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }) : '';
      const dateStr = start && end ? `${start} - ${end}` : (start || end || '2026');
      const sportBadge = (t.category?.name || 'THỂ THAO').toUpperCase();
      const prize = t.prizeDescription || (t.entryFee ? `${t.entryFee.toLocaleString('vi-VN')} đ` : 'Cúp & Huy chương');
      const maxPart = t.maxParticipants ? `${t.maxParticipants}` : '32';
      const currentPart = t._count?.participants != null ? `${t._count.participants}/${maxPart}` : `Còn slot`;

      return {
        id: t.id,
        name: t.name,
        sportBadge,
        prize,
        date: dateStr,
        teamSlots: currentPart,
        imageUrl: t.bannerUrl || BRAND.assets.defaultFallback,
      };
    });
  }, [tournaments, locale]);

  // Real upcoming match representation for the right sidebar schedule widget
  const upcomingWidgetData = useMemo(() => {
    if (upcomingMatches.length === 0) return null;
    const firstMatch = upcomingMatches[0];
    const timeStr = firstMatch.scheduledAt
      ? new Date(firstMatch.scheduledAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : `19:30 ${translate('tonight')}`;
    const p1 = firstMatch.participant1?.teamName || 'Đội 1';
    const p2 = firstMatch.participant2?.teamName || 'Đội 2';
    const court = getMatchCourtLabel(firstMatch) || 'Sân chính';
    return {
      time: timeStr,
      title: `${p1} vs ${p2}`,
      location: court,
      slotsText: '2/2',
    };
  }, [upcomingMatches, locale, translate]);

  return (
    <div className="bg-slate-50/50 min-h-screen text-slate-900 font-sans selection:bg-accent selection:text-content-primary animate-in fade-in duration-200">

      {/* Floating 3-Action Dock (Sát mép trái màn hình) */}
      <LeftActionDock
        categories={categories.filter(cat => cat.isActive !== false && !isHiddenPublicSport(cat))}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        getCategoryLabel={getCategoryLabel}
        activeView={mainView}
        onSelectView={setMainView}
      />

      {/* Main Content: 2 Columns - Main Feed on the Left, Sidebar (Profile & Clubs) on the Right */}
      <main className="max-w-[1400px] mx-auto px-3 sm:px-5 md:px-6 py-3.5 flex flex-col lg:flex-row items-start gap-4">
        <h1 className="sr-only">{translate('seoH1')}</h1>

        {/* 1. LEFT MAIN COLUMN: Khám Phá (Explore) HOẶC Bảng Tin Hoạt Động (Social Feed) */}
        <section className="flex-1 min-w-0 w-full flex flex-col gap-3.5 order-1">
          {mainView === 'FEED' ? (
            /* VIEW B: BẢNG TIN CỘNG ĐỒNG & HOẠT ĐỘNG PLAYER */
            <div className="space-y-3">
              <HomeSocialFeed
                categories={categories.filter(cat => cat.isActive !== false && !isHiddenPublicSport(cat))}
                selectedCategoryId={selectedCategoryId}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ) : (
            /* VIEW A: KHÁM PHÁ (Giải đấu nổi bật, Kèo giao lưu, Lịch thi đấu) */
            <>
              {/* Section: Giải đấu nổi bật */}
              <section className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {translate('featuredTournaments')}
                  </h2>
                  <Link
                    href="/tournaments"
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {translate('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

            {isLoading ? (
              <div className="w-full aspect-[2.1/1] rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-pulse border border-slate-200/60" />
            ) : (
              <TournamentHeroBanner
                tournaments={activeTournaments.length > 0 ? activeTournaments : tournaments}
                heightClass="aspect-[2.1/1]"
              />
            )}
          </section>

          {/* Match Status Tabs: Sắp diễn ra | Đang diễn ra | Đã kết thúc */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3.5">
            {/* Tab Headers */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMatchStatusTab('UPCOMING')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                    matchStatusTab === 'UPCOMING'
                      ? 'bg-white text-blue-600 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {translate('upcoming')}
                </button>
                <button
                  type="button"
                  onClick={() => setMatchStatusTab('LIVE')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                    matchStatusTab === 'LIVE'
                      ? 'bg-white text-blue-600 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {translate('inProgress')}
                </button>
                <button
                  type="button"
                  onClick={() => setMatchStatusTab('COMPLETED')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                    matchStatusTab === 'COMPLETED'
                      ? 'bg-white text-blue-600 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {translate('finished')}
                </button>
              </div>

              <Link
                href="/matches"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {translate('viewAll')}
              </Link>
            </div>

            {/* Tab 1: SẮP DIỄN RA */}
            {matchStatusTab === 'UPCOMING' && (
              <div className="space-y-3">
                {visibleUpcomingTournamentEntries.length > 0 ? (
                  visibleUpcomingTournamentEntries.map(([tournamentName, rawGroup]) => {
                    const group = rawGroup as GroupMatchesData;
                    const displayMatches = group.matches;
                    const matchedTournament = tournaments.find((t) => t.id === group.id);
                    const isRanked = getMatchRankedStatus(group.matches[0], matchedTournament);

                    return (
                      <div
                        key={tournamentName}
                        className="bg-slate-50/50 rounded-xl p-2.5 sm:p-3.5 flex flex-col gap-2.5"
                      >
                        <Link
                          href={group.id ? `/tournaments/${group.id}` : '#'}
                          className="flex items-center gap-2.5 group/header hover:opacity-90 transition-opacity"
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200/80 bg-white relative shrink-0 shadow-xs">
                            <TournamentLogoAvatar
                              src={group.logoUrl || matchedTournament?.logoUrl}
                              alt={group.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span
                                className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                  isRanked
                                    ? 'text-white bg-sky-600'
                                    : 'text-white bg-slate-600'
                                }`}
                              >
                                {isRanked ? translate('rankedBadge') : translate('communityBadge')}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded text-white bg-violet-600">
                                <LiveMatchSportLabel
                                  match={group.matches[0]}
                                  tournament={matchedTournament}
                                  tournamentName={group.name}
                                  translate={translate}
                                />
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover/header:text-blue-600 truncate">
                              {group.name}
                            </h4>
                          </div>
                        </Link>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {displayMatches.map((m) =>
                            renderUpcomingMatchRow(m, group.matches, matchedTournament ?? null)
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Hiện chưa có trận đấu nào sắp diễn ra
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: ĐANG DIỄN RA */}
            {matchStatusTab === 'LIVE' && (
              <div className="space-y-3">
                {visibleLiveTournamentEntries.length > 0 ? (
                  visibleLiveTournamentEntries.map(([tournamentName, rawGroup]) => {
                    const group = rawGroup as GroupMatchesData;
                    const displayMatches = group.matches;
                    const matchedTournament = tournaments.find((t) => t.id === group.id);
                    const isRanked = getMatchRankedStatus(group.matches[0], matchedTournament);

                    return (
                      <div
                        key={tournamentName}
                        className="bg-slate-50/50 rounded-xl p-2.5 sm:p-3.5 flex flex-col gap-2.5"
                      >
                        <Link
                          href={group.id ? `/tournaments/${group.id}` : '#'}
                          className="flex items-center gap-2.5 group/header hover:opacity-90 transition-opacity"
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200/80 bg-white relative shrink-0 shadow-xs">
                            <TournamentLogoAvatar
                              src={group.logoUrl || matchedTournament?.logoUrl}
                              alt={group.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span
                                className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                  isRanked
                                    ? 'text-white bg-sky-600'
                                    : 'text-white bg-slate-600'
                                }`}
                              >
                                {isRanked ? translate('rankedBadge') : translate('communityBadge')}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded text-white bg-violet-600">
                                <LiveMatchSportLabel
                                  match={group.matches[0]}
                                  tournament={matchedTournament}
                                  tournamentName={group.name}
                                  translate={translate}
                                />
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover/header:text-blue-600 truncate">
                              {group.name}
                            </h4>
                          </div>
                        </Link>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {displayMatches.map((m) =>
                            renderMatchCard(m, false, group.matches, matchedTournament ?? null)
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Hiện không có trận đấu trực tiếp nào đang diễn ra
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: ĐÃ KẾT THÚC */}
            {matchStatusTab === 'COMPLETED' && (
              <div className="space-y-3">
                {visibleCompletedTournamentEntries.length > 0 ? (
                  visibleCompletedTournamentEntries.map(([tournamentName, rawGroup]) => {
                    const group = rawGroup as GroupMatchesData;
                    const displayMatches = group.matches;
                    const matchedTournament = tournaments.find((t) => t.id === group.id);
                    const isRanked = getMatchRankedStatus(group.matches[0], matchedTournament);

                    return (
                      <div
                        key={tournamentName}
                        className="bg-slate-50/50 rounded-xl p-2.5 sm:p-3.5 flex flex-col gap-2.5"
                      >
                        <Link
                          href={group.id ? `/tournaments/${group.id}` : '#'}
                          className="flex items-center gap-2.5 group/header hover:opacity-90 transition-opacity"
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200/80 bg-white relative shrink-0 shadow-xs">
                            <TournamentLogoAvatar
                              src={group.logoUrl || matchedTournament?.logoUrl}
                              alt={group.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span
                                className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                  isRanked
                                    ? 'text-white bg-sky-600'
                                    : 'text-white bg-slate-600'
                                }`}
                              >
                                {isRanked ? translate('rankedBadge') : translate('communityBadge')}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded text-white bg-violet-600">
                                <LiveMatchSportLabel
                                  match={group.matches[0]}
                                  tournament={matchedTournament}
                                  tournamentName={group.name}
                                  translate={translate}
                                />
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover/header:text-blue-600 truncate">
                              {group.name}
                            </h4>
                          </div>
                        </Link>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {displayMatches.map((m) =>
                            renderCompletedMatchRow(m, group.matches, matchedTournament ?? null)
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Chưa có kết quả trận đấu nào vừa hoàn thành
                  </div>
                )}
              </div>
            )}

            {/* View All Button */}
            <div className="pt-2 text-center border-t border-slate-100">
              <Link
                href="/matches"
                className="text-xs font-bold text-slate-700 hover:text-blue-600 inline-flex items-center gap-1.5 hover:underline transition-all"
              >
                <span>{translate('viewAllMatches')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
            </>
          )}
        </section>

        {/* 2. RIGHT COLUMN: Athlete Profile Card & My Clubs (moved from left, replacing the old right column) */}
        <aside className="w-full lg:w-[270px] xl:w-[280px] shrink-0 flex flex-col gap-3 order-2">
          {/* Athlete Profile Card */}
          <AthleteProfileCard
            user={user}
            isAuthenticated={isAuthenticated}
            elo={activeElo}
            matchesPlayed={matchesPlayed}
            winRate={winRate}
            credibility={matchesPlayed > 0 ? 100 : 100}
            tierName={displayTier}
            categoryName={sportName}
            isLoading={isLoading || (isAuthenticated && userRankings === null)}
            onViewProfile={(e) => {
              if (!user?.id) return;
              const rect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect?.() || null;
              openUserProfile(
                {
                  id: user.id,
                  fullName: user.fullName || translate('user'),
                  avatarUrl: user.avatarUrl,
                },
                rect,
              );
            }}
          />

          {/* My Clubs */}
          <SocialMyClubsCard
            clubs={myClubs}
            isAuthenticated={isAuthenticated}
          />
        </aside>
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

