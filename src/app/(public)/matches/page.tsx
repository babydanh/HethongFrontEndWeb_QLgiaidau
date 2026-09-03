'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocale, useTranslations } from 'next-intl';
import { Search, ChevronDown, Trophy, Heart, Share2, SlidersHorizontal, Eye, EyeOff, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { matchesApi, type Match } from '@/features/matches/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { regionsApi, type Region } from '@/features/regions/api';
import type { SportRulesEnvelope } from '@/types/tournament';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';
import ShareModal from '@/components/common/ShareModal';
import { BRAND } from '@/constants/brand';
import { SearchableRegionSelect } from '@/components/shared/SearchableRegionSelect';
import AdBannerCard from '@/components/ui/AdBannerCard';

interface EnrichedTournament {
  id: string;
  name: string;
  status?: string;
  createdBy?: string;
  sportRules?: SportRulesEnvelope | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryConfig?: Record<string, unknown> | null;
  category?: {
    name: string;
  } | null;
  matchType?: string;
  genderRestriction?: string;
  isRanked?: boolean;
  // Added fields for location filtering
  city?: string;
  locationAddress?: string;
  venueName?: string | null;
  logoUrl?: string | null;
  community?: {
    logoUrl?: string | null;
  } | null;
}

interface EnrichedParticipant {
  id: string;
  teamName: string;
  eloPoints?: number;
  members?: {
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    elo?: {
      eloPoints: number;
      tierName: string;
    };
  }[];
}

interface EnrichedMatch extends Omit<Match, 'tournament' | 'participant1' | 'participant2' | 'group'> {
  tournament?: EnrichedTournament | null;
  participant1?: EnrichedParticipant | null;
  participant2?: EnrichedParticipant | null;
  viewerCount?: number;
  cheerCount?: number;
  group?: {
    name?: string;
    stage?: {
      name?: string;
      type?: string;
    };
  } | null;
  stage?: {
    name?: string;
    type?: string;
  } | null;
}

type MatchFeedPayload = {
  data?: unknown;
  meta?: { totalPages?: number; nextCursor?: string | null; hasMore?: boolean };
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const response = error.response;
  if (typeof response !== 'object' || response === null || !('status' in response)) return undefined;
  return typeof response.status === 'number' ? response.status : undefined;
};

/**
 * Axios normally returns the already-unwrapped API envelope, while some
 * browser builds retain the Axios response shape. Accept both shapes so a
 * valid match feed can never silently become an empty list.
 */
const readMatchFeed = (value: unknown): { matches: EnrichedMatch[]; totalPages: number; nextCursor: string | null; hasMore: boolean } => {
  const outer = value as MatchFeedPayload | undefined;
  const firstData = outer?.data;
  if (Array.isArray(firstData)) {
    return {
      matches: firstData as EnrichedMatch[],
      totalPages: outer?.meta?.totalPages ?? 1,
      nextCursor: outer?.meta?.nextCursor ?? null,
      hasMore: outer?.meta?.hasMore ?? false,
    };
  }

  const inner = firstData as MatchFeedPayload | undefined;
  if (Array.isArray(inner?.data)) {
    return {
      matches: inner.data as EnrichedMatch[],
      totalPages: inner.meta?.totalPages ?? 1,
      nextCursor: inner.meta?.nextCursor ?? null,
      hasMore: inner.meta?.hasMore ?? false,
    };
  }

  return { matches: [], totalPages: 1, nextCursor: null, hasMore: false };
};

const getShortName = (fullName: string | null | undefined): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 2) {
    return parts.slice(-2).join(' ');
  }
  return fullName;
};

const getTeamShortName = (teamName: string | null | undefined, unknownLabel: string): string => {
  if (!teamName) return unknownLabel;
  if (teamName.includes(' / ')) {
    return teamName.split(' / ').map(name => name.trim()).join(' / ');
  }
  if (teamName.includes(' - ')) {
    return teamName.split(' - ').map(name => name.trim()).join(' - ');
  }
  return teamName.trim();
};

const renderTeamAvatars = (part: EnrichedParticipant | null | undefined, defaultBg: string, defaultText: string) => {
  const members = part?.members || [];

  if (members.length === 0) {
    return (
      <div className={`w-8 h-8 rounded-full ${defaultBg} border border-slate-200 flex items-center justify-center font-bold ${defaultText} shrink-0 text-[10px] shadow-xs`}>
        {part?.teamName?.substring(0, 2).toUpperCase() || 'P'}
      </div>
    );
  }

  if (members.length === 1) {
    const member = members[0];
    return member.avatarUrl ? (
      <img
        src={member.avatarUrl}
        alt={member.fullName || ''}
        className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0 shadow-xs"
      />
    ) : (
      <div className={`w-8 h-8 rounded-full ${defaultBg} border border-slate-200 flex items-center justify-center font-bold ${defaultText} shrink-0 text-[10px] shadow-xs`}>
        {(member.fullName || 'P').substring(0, 2).toUpperCase()}
      </div>
    );
  }

  // Đôi (2 VĐV): Avatar lồng xếp lớp overlap cực sang
  return (
    <div className="flex items-center -space-x-3 shrink-0 relative pr-1.5">
      {members.slice(0, 2).map((member, idx) => {
        const zIndexClass = idx === 0 ? 'z-10' : 'z-20';
        return member.avatarUrl ? (
          <img
            key={idx}
            src={member.avatarUrl}
            alt={member.fullName || ''}
            className={`w-7.5 h-7.5 rounded-full border-2 border-white object-cover shadow-sm ${zIndexClass}`}
          />
        ) : (
          <div
            key={idx}
            className={`w-7.5 h-7.5 rounded-full border border-white ${
              idx === 0
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-blue-100 text-blue-700 border-blue-200'
            } flex items-center justify-center font-bold text-[9px] shadow-xs ${zIndexClass}`}
          >
            {(member.fullName || 'P').charAt(0).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
};

const getBracketTypeLabel = (type?: string, labels?: { singleElimination?: string; doubleElimination?: string; roundRobin?: string; groupStageKnockout?: string }) => {
  if (!type) return '';
  if (type === 'SINGLE_ELIMINATION') return labels?.singleElimination ?? 'Single elimination';
  if (type === 'DOUBLE_ELIMINATION') return labels?.doubleElimination ?? 'Winners/losers bracket';
  if (type === 'ROUND_ROBIN') return labels?.roundRobin ?? 'Round robin';
  if (type === 'GROUP_STAGE_KNOCKOUT') return labels?.groupStageKnockout ?? 'Group stage + playoffs';
  return type;
};

const normalizeMatchType = (match: EnrichedMatch): 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES' | 'OPEN' => {
  const rawType = String(match.tournament?.matchType || '').toUpperCase();
  if (rawType === 'SINGLES' || rawType === 'DOUBLES' || rawType === 'MIXED_DOUBLES') {
    return rawType;
  }

  const name = (match.tournament?.name || '').toLowerCase();
  if (name.includes('đơn') || name.includes('singles')) return 'SINGLES';
  if (name.includes('đôi nam nữ') || name.includes('mixed doubles') || name.includes('mixed')) return 'MIXED_DOUBLES';
  if (name.includes('đôi') || name.includes('doubles')) return 'DOUBLES';
  return 'OPEN';
};

const detectMatchGender = (match: EnrichedMatch): 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN' => {
  const rawGender = String(match.tournament?.genderRestriction || '').toUpperCase();
  if (rawGender === 'MALE' || rawGender === 'FEMALE' || rawGender === 'MIXED') {
    return rawGender;
  }

  const tName = (match.tournament?.name || '').toLowerCase();
  if (tName.includes('nam nữ') || tName.includes('mixed')) return 'MIXED';
  if (tName.includes('nữ') || tName.includes('female') || tName.includes('women')) return 'FEMALE';
  if (tName.includes('nam') || tName.includes('male') || tName.includes('men')) return 'MALE';

  return 'OPEN';
};

type MatchFormatLabels = { singleMale: string; singleFemale: string; doubleMale: string; doubleFemale: string; mixedDoubles: string; singles: string; doubles: string };

const getFormatLabel = (matchType?: string, genderRestriction?: string | null, labels?: MatchFormatLabels) => {
  const mt = matchType || '';
  const gr = genderRestriction || '';
  if (mt === 'SINGLES') {
    return gr === 'FEMALE' ? (labels?.singleFemale ?? 'Women singles') : (labels?.singleMale ?? 'Men singles');
  }
  if (mt === 'DOUBLES') {
    return gr === 'FEMALE' ? (labels?.doubleFemale ?? 'Women doubles') : (labels?.doubleMale ?? 'Men doubles');
  }
  if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
    return labels?.mixedDoubles ?? 'Mixed doubles';
  }
  return mt === 'DOUBLES' ? (labels?.doubles ?? 'Doubles') : mt === 'SINGLES' ? (labels?.singles ?? 'Singles') : (labels?.mixedDoubles ?? 'Mixed doubles');
};

export default function MatchesListPage() {
    const locale = useLocale();
  const translate = useTranslations('Match');
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const roundLabelTranslations: RoundLabelTranslations = {
    roundGrandFinal: translate('roundGrandFinal'),
    roundFinal: translate('roundFinal'),
    roundSemifinal: translate('roundSemifinal'),
    roundQuarterfinal: translate('roundQuarterfinal'),
    roundGroupStage: translate('roundGroupStage'),
    groupPrefix: (name) => translate('groupPrefix', { name }),
    winnersBracket: translate('winnersBracket'),
    losersBracket: translate('losersBracket'),
    playoff: translate('phasePlayoff'),
    roundOf: (round) => translate('roundOf', { round }),
    legSuffix: (leg) => `${translate('leg')} ${leg}`,
  };

  const getTranslatedSport = (catName?: string | null) => {
    if (!catName) return '';
    const lower = catName.toLowerCase();
    if (lower.includes('cầu lông') || lower.includes('badminton')) return translate('sportBadminton');
    if (lower.includes('pickleball')) return translate('sportPickleball');
    if (lower.includes('tennis') || lower.includes('quần vợt')) return translate('sportTennis');
    if (lower.includes('bóng bàn') || lower.includes('table tennis') || lower.includes('ping pong')) return translate('sportTableTennis');
    if (lower.includes('bóng đá') || lower.includes('football') || lower.includes('soccer')) return translate('sportFootball');
    return catName;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [selectedBracketType, setSelectedBracketType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRanked, setIsRanked] = useState<string>('');

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareUrl, setActiveShareUrl] = useState('');
  const [activeShareTitle, setActiveShareTitle] = useState('');
  const [matchesRefreshTick, setMatchesRefreshTick] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const filterKey = [
    debouncedSearchTerm,
    selectedCategoryId,
    selectedStatus,
    selectedContent,
    selectedBracketType,
    startDate,
    endDate,
    selectedProvince,
    selectedWard,
    isRanked,
  ].join('|');
  const matchesRequestInFlightRef = useRef(false);
  const matchesRefreshQueuedRef = useRef(false);

  useEffect(() => {
    const refreshWhenReady = () => {
      if (document.visibilityState === 'visible') {
        setMatchesRefreshTick((value) => value + 1);
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

  // Load danh mục môn thể thao và tỉnh thành
  useEffect(() => {
    const fetchCategoriesAndProvinces = async () => {
      try {
        const [catRes, provRes] = await Promise.all([
          categoriesApi.getCategories(),
          regionsApi.getProvinces(),
        ]);
        if (catRes && catRes.data) {
          setCategories(catRes.data);
        }
        if (provRes) {
          setProvinces(provRes);
        }
      } catch (error) {
        console.error('Failed to fetch categories or provinces', error);
      }
    };
    fetchCategoriesAndProvinces();
  }, []);

  // Load wards from the selected province using the v2 two-level address API
  useEffect(() => {
    if (!selectedProvince) {
      // Delay the state update to ensure it does not execute during the synchronous render cycle
      const timer = setTimeout(() => {
        if (wards.length > 0) {
          setWards([]);
        }
        if (selectedWard !== '') {
          setSelectedWard('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    const loadWards = async () => {
      try {
        const cleanName = selectedProvince.trim().toLowerCase();
        const found = provinces.find(p =>
          p.name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim().toLowerCase() === cleanName
        );
        if (found) {
          const res = await regionsApi.getWardsByProvince(found.code);
          if (res) {
            setWards(res);
          }
        }
      } catch (error) {
        console.error("Failed to fetch wards", error);
      }
    };
    loadWards();
  }, [selectedProvince, provinces, wards.length, selectedWard]);

  // Helper: chuyển dd/mm/yyyy → yyyy-mm-dd cho API
  const formatDateForAPI = (d: string): string | undefined => {
    if (!d) return undefined;
    // Nếu đã là yyyy-mm-dd thì giữ nguyên
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    // Convert dd/mm/yyyy → yyyy-mm-dd
    const parts = d.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return undefined;
  };

  // Cursor state belongs to the active filter set. Any filter change starts
  // a new cursor chain at page 1, while the UI still shows numbered pages.
  useEffect(() => {
    cursorByPageRef.current = { 1: null };
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setPage((currentPage) => (currentPage === 1 ? currentPage : 1));
      setGroupPages((currentPages) => (Object.keys(currentPages).length === 0 ? currentPages : {}));
    });
    return () => {
      active = false;
    };
  }, [filterKey]);

  // Fetch danh sách trận đấu dựa trên bộ lọc
  useEffect(() => {
    if (matchesRequestInFlightRef.current) {
      matchesRefreshQueuedRef.current = true;
      return;
    }
    matchesRequestInFlightRef.current = true;

    const fetchMatches = async () => {
      // Keep the last successful feed visible during background refreshes.
      setIsLoading(matches.length === 0);
      setIsRateLimited(false);
      try {
        // Map lựa chọn nội dung đấu sang matchType + genderRestriction
        let matchType: string | undefined;
        let genderRestriction: string | undefined;

        if (selectedContent === 'SINGLE_MALE') {
          matchType = 'SINGLES';
          genderRestriction = 'MALE';
        } else if (selectedContent === 'SINGLE_FEMALE') {
          matchType = 'SINGLES';
          genderRestriction = 'FEMALE';
        } else if (selectedContent === 'DOUBLE_MALE') {
          matchType = 'DOUBLES';
          genderRestriction = 'MALE';
        } else if (selectedContent === 'DOUBLE_FEMALE') {
          matchType = 'DOUBLES';
          genderRestriction = 'FEMALE';
        } else if (selectedContent === 'DOUBLE_MIXED') {
          matchType = 'DOUBLES';
          genderRestriction = 'MIXED';
        }

        // Convert dd/mm/yyyy → yyyy-mm-dd trước khi gửi API
        const apiStartDate = formatDateForAPI(startDate);
        const apiEndDate = formatDateForAPI(endDate);

        const cursor = cursorByPageRef.current[page] ?? null;
        const res = await matchesApi.getMatches({
          limit: 100,
          publicOnly: true,
          ...(cursor ? { cursor } : {}),
          search: debouncedSearchTerm || undefined,
                    categoryId: selectedCategoryId || undefined,
          status: selectedStatus || undefined,
          matchType,
          genderRestriction,
          city: selectedProvince || undefined,

          isRanked: isRanked === 'true' ? true : isRanked === 'false' ? false : undefined,
          startDate: apiStartDate,
          endDate: apiEndDate,
        });

        const feed = readMatchFeed(res);
        setMatches(feed.matches);
        setTotalPages(feed.totalPages);
        cursorByPageRef.current[page + 1] = feed.nextCursor;
      } catch (error) {
        console.error('Failed to fetch matches', error);
        setIsRateLimited(getHttpStatus(error) === 429);
      } finally {
        setIsLoading(false);
        matchesRequestInFlightRef.current = false;
        if (matchesRefreshQueuedRef.current) {
          matchesRefreshQueuedRef.current = false;
          setMatchesRefreshTick((value) => value + 1);
        }
      }
    };
    fetchMatches();
  }, [filterKey, page, matchesRefreshTick]);

    // The backend match projection already normalizes cheerCount to zero.
  // Counts are rendered from the match projection; local state is only for
  // immediate updates after the user sends a cheer.



  // Tìm category name từ selectedCategoryId để filter client-side
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const cat = categories.find(c => c.id === selectedCategoryId);
    return cat?.name?.toLowerCase() || null;
  }, [selectedCategoryId, categories]);

  // Ngưỡng 30 ngày, chỉ tính 1 lần khi deps thay đổi
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Bỏ qua giải đã bị hủy hoặc bản nháp
      if (match.tournament?.status === 'CANCELLED' || match.tournament?.status === 'DRAFT' || match.tournament?.status === 'PENDING_DELETE') {
        return false;
      }
      // Bỏ qua trận đấu có cờ isBye (trận đấu bye/miễn đấu/vô thẳng)
      if (match.isBye) {
        return false;
      }
      // Chỉ bỏ trận chưa có hai participant thật. Một số response chỉ trả ID,
      // còn tên được nạp ở endpoint chi tiết; không được làm rỗng cả danh sách.
      const hasParticipant1 = Boolean(match.participant1?.id || match.participant1Id);
      const hasParticipant2 = Boolean(match.participant2?.id || match.participant2Id);
      if (!hasParticipant1 || !hasParticipant2) {
        return false;
      }

      // Lọc theo Môn thể thao (client-side fallback khi API không filter đúng)
      // Đặt filter này TRƯỚC filter thời gian để đảm bảo không bị skip
      if (selectedCategoryName) {
        const matchCatName = (match.tournament?.category?.name || match.tournament?.categoryName || '').toLowerCase();
        // Dùng exact match thay vì substring để tránh false positive
        if (matchCatName !== selectedCategoryName) {
          return false;
        }
      }

      // Lọc bỏ trận đấu đã kết thúc quá 30 ngày
      if (match.status === 'COMPLETED' && match.completedAt) {
        return new Date(match.completedAt) >= thirtyDaysAgo;
      }

      // Lọc theo Thể thức (client-side fallback)
      if (selectedBracketType) {
        const stageType = match.group?.stage?.type || match.stage?.type || '';
        if (stageType !== selectedBracketType) return false;
      }

      // Lọc theo nội dung thật từ matchType + genderRestriction của giải/nhánh đấu.
      // Tên giải chỉ là fallback cho dữ liệu cũ chưa trả đủ metadata.
      if (selectedContent) {
        const actualMatchType = normalizeMatchType(match);
        const actualGender = detectMatchGender(match);
        const target = {
          SINGLE_MALE: { type: 'SINGLES', gender: 'MALE' },
          SINGLE_FEMALE: { type: 'SINGLES', gender: 'FEMALE' },
          DOUBLE_MALE: { type: 'DOUBLES', gender: 'MALE' },
          DOUBLE_FEMALE: { type: 'DOUBLES', gender: 'FEMALE' },
          DOUBLE_MIXED: { type: 'MIXED_DOUBLES', gender: 'MIXED' },
        }[selectedContent];

        if (target) {
          const typeMatches = actualMatchType === target.type
            || (target.type === 'MIXED_DOUBLES' && actualMatchType === 'DOUBLES' && actualGender === 'MIXED');
          if (!typeMatches || actualGender !== target.gender) return false;
        }
      }

      return true;
    });
  }, [matches, selectedCategoryName, selectedContent, selectedBracketType, selectedProvince, selectedWard, thirtyDaysAgo]);

  // Gom nhóm trận đấu theo giải đấu
  interface GroupedMatches {
    tournamentId: string;
    tournamentName: string;
    tournamentCategory: string;
    tournamentLogoUrl: string | null;
    tournamentVenueName: string | null;
    matches: EnrichedMatch[];
  }

  const groupedMatches: GroupedMatches[] = [];
  filteredMatches.forEach(match => {
    const tId = match.tournamentId;
    let group = groupedMatches.find(g => g.tournamentId === tId);
    if (!group) {
      group = {
        tournamentId: tId,
        tournamentName: match.tournament?.name || translate('tournamentFallback'),
        tournamentCategory: match.tournament?.category?.name || match.tournament?.categoryName || translate('categoryNotUpdated'),
        tournamentLogoUrl: match.tournament?.logoUrl || match.tournament?.community?.logoUrl || null,
        tournamentVenueName: match.tournament?.venueName || null,
        matches: []
      };
      groupedMatches.push(group);
    }
    group.matches.push(match);
  });

  // Sắp xếp các trận đấu trong từng giải đấu theo mức độ ưu tiên trạng thái
  const getStatusWeight = (m: EnrichedMatch) => {
    if (m.status === 'ONGOING') return 1;
    if (m.status === 'SCHEDULED') return 2;
    if (m.status === 'COMPLETED') return 3;
    return 4;
  };

  groupedMatches.forEach(group => {
    group.matches.sort((a, b) => {
      const wA = getStatusWeight(a);
      const wB = getStatusWeight(b);
      if (wA !== wB) return wA - wB;

      // Cùng trạng thái thì xếp theo ngày
      if (a.status === 'COMPLETED' && b.status === 'COMPLETED') {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA; // Trận vừa kết thúc hiển thị lên trước
      }
      if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
        return timeA - timeB; // Trận sắp đấu gần nhất hiển thị lên trước
      }
      return 0;
    });
  });

  const activeFilterCount = [
    searchTerm,
    selectedCategoryId,
    selectedStatus,
    selectedContent,
    startDate,
    endDate,
    selectedProvince,
    selectedWard,
    isRanked,
  ].filter(Boolean).length;

  // The API page is cursor-backed; grouping remains a presentation detail.
  const totalTournamentsPages = totalPages;
  const currentTournaments = groupedMatches;

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">

      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
        {/* Hàng bộ lọc chính */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Tìm kiếm */}
          <div className="flex-grow w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{translate("search")}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold h-[42px]"
                placeholder={translate("searchPlaceholder")}
              />
            </div>
          </div>

          {/* Môn thể thao */}
          <div className="w-full sm:w-48 shrink-0">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{translate("sport")}</label>
            <div className="relative">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-bold h-[42px]"
              >
                <option value="">{translate("all")}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          {/* Trạng thái */}
          <div className="w-full sm:w-48 shrink-0">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{translate("status")}</label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-bold h-[42px]"
              >
                <option value="">{translate("all")}</option>
                <option value="ONGOING">{translate("ongoing")}</option>
                <option value="SCHEDULED">{translate("scheduled")}</option>
                <option value="COMPLETED">{translate("completed")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          {/* Lọc thêm button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 h-[42px] cursor-pointer shrink-0 ${
              showAdvancedFilters || selectedBracketType || selectedContent || isRanked || selectedProvince || selectedWard || startDate || endDate
                ? 'bg-blue-50 border-blue-250 text-blue-700 shadow-sm'
                : 'bg-slate-105 hover:bg-slate-200 text-slate-900 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {translate("moreFilters")}
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-800 text-[9px] rounded-full font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Status Chips — bên trong khung filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs font-semibold">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{translate("quickFilters")}</span>
          {[
            { label: translate('quickFinished'), value: 'COMPLETED', activeClass: 'bg-[#F3F4F1] text-[#4A4E4D] border-slate-400 font-bold shadow-xs', inactiveClass: 'bg-[#F3F4F1]/80 text-[#4A4E4D] border-transparent hover:border-slate-300' },
            { label: translate('quickOngoing'), value: 'ONGOING', activeClass: 'bg-[#EBF5FF] text-[#1E56A0] border-blue-300 font-bold shadow-xs', inactiveClass: 'bg-[#EBF5FF]/80 text-[#1E56A0] border-transparent hover:border-blue-200' },
            { label: translate('quickUpcoming'), value: 'SCHEDULED', activeClass: 'bg-[#FFF5E6] text-[#995C00] border-amber-300 font-bold shadow-xs', inactiveClass: 'bg-[#FFF5E6]/80 text-[#995C00] border-transparent hover:border-amber-200' },
          ].map((chip) => {
            const isActive = selectedStatus === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => { setSelectedStatus(isActive ? '' : chip.value); setPage(1); }}
                className={`rounded-full px-3.5 py-1.5 border transition-all cursor-pointer ${isActive ? chip.activeClass : chip.inactiveClass}`}
              >
                {chip.label}
              </button>
            );
          })}
          {selectedStatus && (
            <button onClick={() => { setSelectedStatus(''); setPage(1); }}
              className="text-slate-400 font-bold text-xs hover:text-rose-500 transition-colors ml-1 cursor-pointer">
              ✕ {translate('clearStatusFilter')}
            </button>
          )}
        </div>

        {/* Advanced filters panel */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Thể thức */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("format")}</label>
                <div className="relative">
                  <select
                    value={selectedBracketType}
                    onChange={(e) => {
                      setSelectedBracketType(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate("all")}</option>
                    <option value="SINGLE_ELIMINATION">{translate("singleElimination")}</option>
                    <option value="DOUBLE_ELIMINATION">{translate("doubleElimination")}</option>
                    <option value="ROUND_ROBIN">{translate("roundRobin")}</option>
                    <option value="GROUP_STAGE_KNOCKOUT">{translate("groupStagePlayoffs")}</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Nội dung */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate('contentLabel')}</label>
                <div className="relative">
                  <select
                    value={selectedContent}
                    onChange={(e) => {
                      setSelectedContent(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate("all")}</option>
                    <option value="SINGLE_MALE">{translate("singleMale")}</option>
                    <option value="SINGLE_FEMALE">{translate("singleFemale")}</option>
                    <option value="DOUBLE_MALE">{translate("doubleMale")}</option>
                    <option value="DOUBLE_FEMALE">{translate("doubleFemale")}</option>
                    <option value="DOUBLE_MIXED">{translate("doubleMixed")}</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Xếp hạng */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("ranking")}</label>
                <div className="relative">
                  <select
                    value={isRanked}
                    onChange={(e) => {
                      setIsRanked(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate("all")}</option>
                    <option value="true">{translate("ranked")}</option>
                    <option value="false">{translate("recreational")}</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Tỉnh / Thành phố */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("provinceCity")}</label>
                  <SearchableRegionSelect
                    value={provinces.find((province) => province.name.replace(/^(Thành phố|Tỉnh)\s+/i, '') === selectedProvince)?.code || ''}
                    options={provinces}
                    placeholder={translate("allAreas")}
                    inputName="matches-province"
                    className="text-xs"
                    onChange={(code) => {
                      const selected = provinces.find((province) => province.code === code);
                      setSelectedProvince(selected ? selected.name.replace(/^(Thành phố|Tỉnh)\s+/i, '') : '');
                      setSelectedWard('');
                      setPage(1);
                    }}
                  />
              </div>

              {/* Phường / Xã */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("wardCommune")}</label>
                  <SearchableRegionSelect
                    value={wards.find((ward) => ward.name === selectedWard)?.code || ''}
                    options={wards}
                    placeholder={translate("allWards")}
                    inputName="matches-ward"
                    className="text-xs"
                    disabled={!selectedProvince || wards.length === 0}
                    onChange={(code) => {
                      const selected = wards.find((ward) => ward.code === code);
                      setSelectedWard(selected?.name || '');
                      setPage(1);
                    }}
                  />
              </div>

              {/* Từ ngày */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("fromDate")}</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={translate("datePlaceholder")}
                    value={startDate}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length === 2 && !val.includes('/') && startDate.length < val.length) {
                        val = val + '/';
                      }
                      if (val.length === 5 && val[2] === '/' && !val.includes('/', 3) && startDate.length < val.length) {
                        val = val + '/';
                      }
                      setStartDate(val);
                      setPage(1);
                    }}
                    className="w-full pl-3 pr-9 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold h-10"
                  />
                  <input
                    type="date"
                    id="hiddenMatchStartDatePicker"
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                    onChange={(e) => {
                      if (e.target.value) {
                        const parts = e.target.value.split('-');
                        if (parts.length === 3) {
                          setStartDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                          setPage(1);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('hiddenMatchStartDatePicker') as HTMLInputElement | null;
                      if (el) {
                        if (typeof el.showPicker === 'function') {
                          el.showPicker();
                        } else {
                          el.focus();
                          el.click();
                        }
                      }
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                    title={translate('chooseDate')}
                  >
                    📅
                  </button>
                </div>
              </div>

              {/* Đến ngày */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("toDate")}</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={translate("datePlaceholder")}
                    value={endDate}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length === 2 && !val.includes('/') && endDate.length < val.length) {
                        val = val + '/';
                      }
                      if (val.length === 5 && val[2] === '/' && !val.includes('/', 3) && endDate.length < val.length) {
                        val = val + '/';
                      }
                      setEndDate(val);
                      setPage(1);
                    }}
                    className="w-full pl-3 pr-9 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold h-10"
                  />
                  <input
                    type="date"
                    id="hiddenMatchEndDatePicker"
                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                    onChange={(e) => {
                      if (e.target.value) {
                        const parts = e.target.value.split('-');
                        if (parts.length === 3) {
                          setEndDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                          setPage(1);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('hiddenMatchEndDatePicker') as HTMLInputElement | null;
                      if (el) {
                        if (typeof el.showPicker === 'function') {
                          el.showPicker();
                        } else {
                          el.focus();
                          el.click();
                        }
                      }
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                    title={translate('chooseDate')}
                  >
                    📅
                  </button>
                </div>
              </div>

              {/* Xóa bộ lọc */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCategoryId('');
                    setSelectedStatus('');
                    setSelectedContent('');
                    setSelectedBracketType('');
                    setStartDate('');
                    setEndDate('');
                    setSelectedProvince('');
                    setSelectedWard('');
                    setSearchTerm('');
                    setIsRanked('');
                    setPage(1);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white h-10 flex items-center justify-center"
                  title={translate('clearAll')}
                >
                  <span className="font-bold text-rose-650">{translate("clearAll")}</span>
                </button>
              </div>
            </div>
          )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{translate("title")}</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{translate('groupedMatchesHint')}</p>
        </div>
      </div>

      {/* Danh sách các Giải đấu gom nhóm */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-slate-500 font-bold">{translate("loading")}</div>
      ) : isRateLimited ? (
        <div className="flex flex-col justify-center items-center h-64 text-slate-400 bg-white border border-slate-200 rounded-lg p-6 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-bold text-slate-600">{translate('rateLimitTitle')}</p>
          <p className="text-xs text-slate-400 mt-1">{translate('rateLimitHint')}</p>
          <button
            type="button"
            onClick={() => setMatchesRefreshTick((value) => value + 1)}
            className="mt-4 px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition-colors"
          >
            {translate('retry')}
          </button>
        </div>
      ) : currentTournaments.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 text-slate-400 bg-white border border-slate-200 rounded-lg p-6 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-bold text-slate-500">{translate("empty")}</p>
          <p className="text-xs text-slate-400 mt-1">{translate('emptyHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {currentTournaments.map(group => {
            // Cấu hình 3x2 (6 trận đấu trên mỗi trang của card giải đấu)
            const MATCHES_PER_PAGE = 6;
            const groupPage = groupPages[group.tournamentId] || 1;
            const totalGroupPages = Math.ceil(group.matches.length / MATCHES_PER_PAGE);

            // Slice matches based on sub-pagination inside the card
            const visibleMatches = group.matches.slice((groupPage - 1) * MATCHES_PER_PAGE, groupPage * MATCHES_PER_PAGE);

            return (
              <div
                key={group.tournamentId}
                className="bg-slate-50/80 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5"
              >
                {/* Header giải đấu */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/tournaments/${group.tournamentId}`}
                      className="w-14 h-14 rounded-full bg-white overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 hover:opacity-85 transition-opacity shadow-sm"
                    >
                      {group.tournamentLogoUrl ? (
                        <img src={group.tournamentLogoUrl} alt={group.tournamentName} className="w-10 h-10 object-contain" />
                      ) : (
                        <img src={BRAND.assets.logoIcon} alt={BRAND.name} className="w-10 h-10 object-contain opacity-60" />
                      )}
                    </Link>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-2xs uppercase tracking-wider">
                          {translate("rankedTournament")} • {getTranslatedSport(group.tournamentCategory)}
                        </span>
                      </div>
                      <Link href={`/tournaments/${group.tournamentId}`} className="hover:text-blue-600 transition-colors">
                        <h3 className="font-bold text-slate-900 text-sm md:text-base uppercase tracking-tight leading-none">
                          {group.tournamentName}
                        </h3>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Grid 3 cột x 2 hàng */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleMatches.map(match => {
                    const isLive = match.status === 'ONGOING';
                    const isFinished = match.status === 'COMPLETED';
                    const isGroupStage = match.stage?.type === 'GROUP_STAGE';
                    const isDoubleElim = match.stage?.type === 'DOUBLE_ELIMINATION';
                    const isSingleElim = match.stage?.type === 'SINGLE_ELIMINATION';
                    const isRoundRobin = match.stage?.type === 'ROUND_ROBIN';

                    const matchTypeLabel = isGroupStage
                      ? translate('bracketGroupStageKnockout')
                      : isDoubleElim
                      ? translate('bracketDoubleElimination')
                      : isSingleElim
                      ? translate('bracketSingleElimination')
                      : isRoundRobin
                      ? translate('bracketRoundRobin')
                      : translate('tournamentFallback');

                    const p1Won = isFinished && match.winnerId === match.participant1Id;
                    const p2Won = isFinished && match.winnerId === match.participant2Id;

                    const friendlyRoundName = getMatchRoundLabel({
                      match,
                      matches: group.matches,
                      // Some legacy match payloads omit stage metadata but still
                      // carry a group. Treat those records as round-robin so the
                      // scheduler's internal roundNumber cannot become "Final".
                      tournamentFormat: match.stage?.type ?? match.group?.stage?.type ?? (match.group ? 'ROUND_ROBIN' : undefined),
                      translations: roundLabelTranslations,
                    });

                    // Lấy thông tin chi tiết các set đấu
                    const scoreSets = (match.scoreDetails?.sets as Array<{ team1Score?: number; team2Score?: number; isFinished?: boolean }> | undefined) || [];
                    const setsToWinSetting = match.tournament?.sportRules?.setsToWin || 2;
                    // Max sets có thể có ví dụ best of 3 là 3 sets
                    const maxSetsCount = setsToWinSetting === 2 ? 3 : setsToWinSetting === 1 ? 1 : 5;

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
                          {/* Header trận */}
                          <div className={`px-4 py-2.5 ${isLive ? 'bg-rose-50/30' : 'bg-slate-50/50'} border-b border-slate-100 flex items-center justify-between`}>
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                            {isLive ? (
                                <>
                                  <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-2xs animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    {translate("statusLive")}
                                  </span>
                                  <span className="text-slate-800 font-bold">• {friendlyRoundName}</span>
                                </>
                              ) : isFinished ? (
                                <>
                                  <span className="inline-flex items-center bg-slate-800 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-2xs">
                                    {translate("statusFinished")}
                                  </span>
                                  <span className="text-slate-800 font-bold">• {friendlyRoundName}</span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center bg-blue-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-2xs">
                                    {translate("statusScheduled")}
                                  </span>
                                  {match.scheduledAt ? (
                                    <span className="text-slate-800 font-bold">• {new Date(match.scheduledAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })} {new Date(match.scheduledAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })} • {friendlyRoundName}</span>
                                  ) : (
                                    <span className="text-slate-800 font-bold">• {friendlyRoundName}</span>
                                  )}
                                </>
                              )}
                            </span>

                            {isLive && typeof match.viewerCount === 'number' && match.viewerCount > 0 && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-white bg-blue-600 shadow-2xs px-2 py-0.5 rounded-full">
                                <Eye className="w-3 h-3 text-white animate-pulse" />
                                <span>{match.viewerCount} {translate("watchingNow")}</span>
                              </span>
                            )}
                          </div>

                          {/* Chi tiết đấu */}
                          <div className="p-4 flex flex-col gap-3 flex-grow justify-center group-hover:bg-slate-50/30 transition-colors">
                            <div className="flex flex-col gap-2.5">
                              {/* VĐV / Đội 1 */}
                              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100/70 bg-slate-50/50 transition-all">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  {renderTeamAvatars(match.participant1, 'bg-blue-50', 'text-blue-700')}
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-xs truncate group-hover:text-blue-600 transition-colors ${p1Won ? 'text-emerald-700 font-extrabold' : 'text-slate-800 font-bold'}`}>
                                      {getTeamShortName(match.participant1?.teamName, translate('unknownTeam'))}
                                    </div>

                                    {/* Hiển thị ELO / Thành viên thông minh */}
                                    {match.tournament?.matchType === 'SINGLES' ? (
                                      (() => {
                                        const elo = match.participant1?.eloPoints ??
                                                    match.participant1?.members?.[0]?.elo?.eloPoints ??
                                                    1000;
                                        return (
                                          <span className="text-[9px] font-bold text-slate-900 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/70 block w-max mt-1">
                                            ELO: {elo}
                                          </span>
                                        );
                                      })()
                                    ) : (
                                      <div className="flex flex-col mt-0.5">
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                          {(() => {
                                            const members = match.participant1?.members || [];
                                            const memberEloList = members as Array<{ fullName?: string | null; isMock?: boolean; elo?: { eloPoints: number } }>;
                                            return memberEloList.slice(0, 2).map((m, i) => (
                                              <span key={i} className={`text-[9px] font-medium ${p1Won ? 'text-blue-600/80' : 'text-slate-400'}`}>
                                                {getShortName(m.fullName) || (m.isMock ? translate('virtualPlayer') : translate('unknownMember'))}
                                              </span>
                                            ));
                                          })()}
                                        </div>
                                        {(() => {
                                          const members = match.participant1?.members || [];
                                          const memberEloList = members as Array<{ fullName?: string | null; isMock?: boolean; elo?: { eloPoints: number } }>;
                                          const validMembers = memberEloList.filter(m => !m.isMock);
                                          const pairElo = validMembers.length > 0
                                            ? Math.round(validMembers.reduce((acc: number, m) => acc + (m.elo?.eloPoints || 1000), 0) / validMembers.length)
                                            : null;
                                          return pairElo !== null ? (
                                            <span className="text-[9px] font-bold text-slate-900 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/70 block w-max mt-1">
                                              {translate('pairElo', { elo: pairElo })}
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Tỉ số các set theo cột dọc */}
                                {match.status !== 'SCHEDULED' && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {scoreSets.filter(set => set !== undefined && set.team1Score !== undefined && set.team2Score !== undefined).map((set, idx) => {
                                      const isSetDone = set.isFinished;
                                      const isWinner = isSetDone && (Number(set.team1Score) > Number(set.team2Score));
                                      return (
                                        <div
                                          key={idx}
                                          className={`w-6.5 h-6.5 rounded text-[10px] flex items-center justify-center border transition-all ${
                                            isLive
                                              ? 'bg-rose-50 text-rose-600 border-rose-100 font-bold animate-pulse'
                                              : isWinner
                                              ? 'bg-blue-50 text-blue-700 border-emerald-250 font-extrabold shadow-xs scale-103'
                                              : 'bg-slate-50/70 text-slate-400 border-slate-200/50 font-medium'
                                          }`}
                                        >
                                          {set.team1Score}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* VĐV / Đội 2 */}
                              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100/70 bg-slate-50/50 transition-all">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  {renderTeamAvatars(match.participant2, 'bg-blue-50', 'text-blue-700')}
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-xs truncate group-hover:text-blue-600 transition-colors ${p2Won ? 'text-emerald-700 font-extrabold' : 'text-slate-800 font-bold'}`}>
                                      {getTeamShortName(match.participant2?.teamName, translate('unknownTeam'))}
                                    </div>

                                    {/* Hiển thị ELO / Thành viên thông minh */}
                                    {match.tournament?.matchType === 'SINGLES' ? (
                                      (() => {
                                        const elo = match.participant2?.eloPoints ??
                                                    match.participant2?.members?.[0]?.elo?.eloPoints ??
                                                    1000;
                                        return (
                                          <span className="text-[9px] font-bold text-slate-900 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/70 block w-max mt-1">
                                            ELO: {elo}
                                          </span>
                                        );
                                      })()
                                    ) : (
                                      <div className="flex flex-col mt-0.5">
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                          {(() => {
                                            const members = match.participant2?.members || [];
                                            const memberEloList = members as Array<{ fullName?: string | null; isMock?: boolean; elo?: { eloPoints: number } }>;
                                            return memberEloList.slice(0, 2).map((m, i) => (
                                              <span key={i} className={`text-[9px] font-medium ${p2Won ? 'text-blue-600/80' : 'text-slate-400'}`}>
                                                {getShortName(m.fullName) || (m.isMock ? translate('virtualPlayer') : translate('unknownMember'))}
                                              </span>
                                            ));
                                          })()}
                                        </div>
                                        {(() => {
                                          const members = match.participant2?.members || [];
                                          const memberEloList = members as Array<{ fullName?: string | null; isMock?: boolean; elo?: { eloPoints: number } }>;
                                          const validMembers = memberEloList.filter(m => !m.isMock);
                                          const pairElo = validMembers.length > 0
                                            ? Math.round(validMembers.reduce((acc: number, m) => acc + (m.elo?.eloPoints || 1000), 0) / validMembers.length)
                                            : null;
                                          return pairElo !== null ? (
                                            <span className="text-[9px] font-bold text-slate-900 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/70 block w-max mt-1">
                                              {translate('pairElo', { elo: pairElo })}
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Tỉ số các set theo cột dọc */}
                                {match.status !== 'SCHEDULED' && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {scoreSets.filter(set => set !== undefined && set.team1Score !== undefined && set.team2Score !== undefined).map((set, idx) => {
                                      const isSetDone = set.isFinished;
                                      const isWinner = isSetDone && (Number(set.team2Score) > Number(set.team1Score));
                                      return (
                                        <div
                                          key={idx}
                                          className={`w-6.5 h-6.5 rounded text-[10px] flex items-center justify-center border transition-all ${
                                            isLive
                                              ? 'bg-rose-50 text-rose-600 border-rose-100 font-bold animate-pulse'
                                              : isWinner
                                              ? 'bg-blue-50 text-blue-700 border-emerald-250 font-extrabold shadow-xs scale-103'
                                              : 'bg-slate-50/70 text-slate-400 border-slate-200/50 font-medium'
                                          }`}
                                        >
                                          {set.team2Score}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Phân môn & Sân */}
                            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2 justify-center pt-1">
                              <span className="text-slate-700 whitespace-nowrap">
                                {getFormatLabel(match.tournament?.matchType, match.tournament?.genderRestriction, { singleMale: translate('singleMale'), singleFemale: translate('singleFemale'), doubleMale: translate('doubleMale'), doubleFemale: translate('doubleFemale'), mixedDoubles: translate('doubleMixed'), singles: translate('matchTypeSingles'), doubles: translate('matchTypeDoubles') })}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 truncate max-w-[180px]">
                                 {match.courtName
                                   ? `${translate('venueLabel')}: ${match.courtName}`
                                   : (match.tournament?.venueName ? `${translate('venueLabel')}: ${match.tournament.venueName}` : translate('venuePending'))}
                              </span>
                            </div>
                          </div>
                        </Link>

                        {/* Interactive Footer (Full Hitbox Action Bar) */}
                        <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/50 divide-x divide-slate-100 relative z-10">
                          {/* Cổ vũ Button */}
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCheerCounts(prev => ({
                                ...prev,
                                [match.id]: (prev[match.id] ?? match.cheerCount ?? 0) + 1,
                              }));
                              try {
                                const res = await matchesApi.cheerMatch(match.id);
                                setCheerCounts(prev => ({
                                  ...prev,
                                  [match.id]: res.cheerCount,
                                }));
                              } catch {
                                setCheerCounts(prev => ({
                                  ...prev,
                                  [match.id]: Math.max(0, (prev[match.id] ?? 1) - 1),
                                }));
                                toast.error(translate('cheerFailed'));
                              }
                            }}
                            title={`${translate('cheerLabel')} (${cheerCounts[match.id] ?? match.cheerCount ?? 0})`}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 hover:bg-rose-50/70 hover:text-rose-600 text-slate-600 transition-colors active:scale-[0.98] cursor-pointer group/cheer"
                          >
                            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/15 group-hover/cheer:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold text-slate-600 group-hover/cheer:text-rose-600">
                              {translate('cheerLabel')} <span className="text-slate-500 group-hover/cheer:text-rose-600">({cheerCounts[match.id] ?? match.cheerCount ?? 0})</span>
                            </span>
                          </button>

                          {/* Chia sẻ Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const p1Name = getTeamShortName(match.participant1?.teamName, translate('unknownTeam'));
                              const p2Name = getTeamShortName(match.participant2?.teamName, translate('unknownTeam'));
                              setActiveShareUrl(`${window.location.origin}/live/${match.id}`);
                              setActiveShareTitle(translate("matchShareTitle", { p1: p1Name, p2: p2Name }));
                              setIsShareModalOpen(true);
                            }}
                            title={translate("shareMatch")}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 hover:bg-blue-50/70 hover:text-blue-600 text-slate-600 transition-colors active:scale-[0.98] cursor-pointer group/share"
                          >
                            <Share2 className="w-3.5 h-3.5 text-blue-500 group-hover/share:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold text-slate-600 group-hover/share:text-blue-600">
                              {translate('shareMatch')}
                            </span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Sub-pagination per tournament card (Page x of y) */}
                {totalGroupPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setGroupPages(prev => ({ ...prev, [group.tournamentId]: Math.max(1, groupPage - 1) }))}
                      disabled={groupPage === 1}
                      className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {translate('previousPage')}
                    </button>
                    <span className="text-xs font-bold text-slate-500 px-2">
                      {translate('pageOf', { page: groupPage, total: totalGroupPages })}
                    </span>
                    <button
                      onClick={() => setGroupPages(prev => ({ ...prev, [group.tournamentId]: Math.min(totalGroupPages, groupPage + 1) }))}
                      disabled={groupPage === totalGroupPages}
                      className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {translate('nextPage')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Pagination (for Tournaments List: Shows when there are > 5 tournaments) */}
      {totalTournamentsPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-bold text-slate-655 bg-white border border-slate-200 hover:border-slate-350 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {translate('previousPage')}
          </button>

          <button
            className="relative px-3.5 py-2 flex items-center justify-center text-xs font-bold rounded-lg border border-blue-600 bg-blue-600 text-white shadow-sm"
          >
            {translate('pageLabel', { page })}
          </button>

          {page < totalTournamentsPages && (
            <button
              onClick={() => setPage(page + 1)}
              className="relative px-3.5 py-2 flex items-center justify-center text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-350 hover:text-slate-900 cursor-pointer"
            >
              {translate('pageLabel', { page: page + 1 })}
            </button>
          )}

          <button
            onClick={() => setPage(p => Math.min(totalTournamentsPages, p + 1))}
            disabled={page === totalTournamentsPages}
            className="px-3 py-1.5 text-xs font-bold text-slate-655 bg-white border border-slate-200 hover:border-slate-350 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {translate('nextPage')}
          </button>
        </div>
      )}

      {/* Banner Quảng cáo / Đối tác dưới phân trang */}
      <div className="mt-10 pt-4 border-t border-slate-100">
        <AdBannerCard
          slot="MATCHES_BOTTOM"
          variant="horizontal"
          categoryId={selectedCategoryId || undefined}
        />
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={activeShareUrl}
        title={activeShareTitle}
      />
    </div>
  );
}

