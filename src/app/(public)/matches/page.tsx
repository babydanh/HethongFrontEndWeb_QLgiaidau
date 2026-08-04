'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Play, Trophy, Heart, Share2, X, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { matchesApi, type Match } from '@/features/matches/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { regionsApi, type Region } from '@/features/regions/api';
import type { SportRulesEnvelope } from '@/types/tournament';
import { getMatchRoundLabel } from '@/utils/match-round-label';
import ShareModal from '@/components/common/ShareModal';

interface EnrichedTournament {
  id: string;
  name: string;
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

interface EnrichedMatch extends Omit<Match, 'tournament' | 'participant1' | 'participant2'> {
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

const getBracketTypeLabel = (type?: string) => {
  if (!type) return '';
  if (type === 'SINGLE_ELIMINATION') return 'LOẠI TRỰC TIẾP';
  if (type === 'DOUBLE_ELIMINATION') return 'NHÁNH THẮNG THUA';
  if (type === 'ROUND_ROBIN') return 'VÒNG TRÒN';
  if (type === 'GROUP_STAGE_KNOCKOUT') return 'VÒNG BẢNG + PLAYOFFS';
  return type;
};

const detectMatchGender = (match: EnrichedMatch): 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN' => {
  if (match.tournament?.genderRestriction) {
    return match.tournament.genderRestriction as 'MALE' | 'FEMALE' | 'MIXED';
  }

  const tName = (match.tournament?.name || '').toLowerCase();
  if (tName.includes('nam nữ') || tName.includes('mixed')) return 'MIXED';
  if (tName.includes('nữ')) return 'FEMALE';
  if (tName.includes('nam')) return 'MALE';

  return 'OPEN';
};

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

export default function MatchesListPage() {
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
  const [districts, setDistricts] = useState<Region[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareUrl, setActiveShareUrl] = useState('');
  const [activeShareTitle, setActiveShareTitle] = useState('');
  const [matchesRefreshTick, setMatchesRefreshTick] = useState(0);
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

  // Load districts when a province is selected, clear when none
  useEffect(() => {
    if (!selectedProvince) {
      // Delay the state update to ensure it does not execute during the synchronous render cycle
      const timer = setTimeout(() => {
        if (districts.length > 0) {
          setDistricts([]);
        }
        if (selectedDistrict !== '') {
          setSelectedDistrict('');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    const loadDistricts = async () => {
      try {
        const cleanName = selectedProvince.trim().toLowerCase();
        const found = provinces.find(p =>
          p.name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim().toLowerCase() === cleanName
        );
        if (found) {
          const res = await regionsApi.getDistricts(found.code);
          if (res) {
            setDistricts(res);
          }
        }
      } catch (error) {
        console.error("Failed to fetch districts", error);
      }
    };
    loadDistricts();
  }, [selectedProvince, provinces, districts.length, selectedDistrict]);

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

        const res = await matchesApi.getMatches({
          page: 1, // Reset API page to 1 since we are paging tournaments locally now
          limit: 500, // Fetch all matches so grouping works correctly
          search: searchTerm || undefined,
          categoryId: selectedCategoryId || undefined,
          status: selectedStatus || undefined,
          city: selectedProvince || undefined,
          isRanked: isRanked === 'true' ? true : isRanked === 'false' ? false : undefined,
          startDate: apiStartDate,
          endDate: apiEndDate,
        });
        
        if (res && res.data) {
          setMatches(res.data as unknown as EnrichedMatch[]);
          setTotalPages(res.meta.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch matches', error);
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
  }, [searchTerm, selectedCategoryId, selectedStatus, selectedContent, selectedBracketType, startDate, endDate, selectedProvince, selectedDistrict, isRanked, matchesRefreshTick]);

  // Fetch cheer counts for all visible matches
  useEffect(() => {
    if (matches.length === 0) return;
    const ids = matches.map(m => m.id);
    const loadCheerCounts = async () => {
      try {
        const counts: Record<string, number> = {};
        // Use cheerCount from match data if available, or fetch individually
        for (const match of matches) {
          if (typeof match.cheerCount === 'number') {
            counts[match.id] = match.cheerCount;
          } else {
            try {
              const res = await matchesApi.getCheerCount(match.id);
              counts[match.id] = res.cheerCount;
            } catch {
              counts[match.id] = 0;
            }
          }
        }
        setCheerCounts(counts);
      } catch {
        // silent
      }
    };
    loadCheerCounts();
  }, [matches]);

  // Tìm category name từ selectedCategoryId để filter client-side
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const cat = categories.find(c => c.id === selectedCategoryId);
    const name = cat?.name?.toLowerCase() || null;
    console.log('🐛 [sport-filter] selectedCategoryId:', selectedCategoryId, '→ name:', name);
    if (!cat) {
      console.log('🐛 [sport-filter] categories available:', categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
    }
    return name;
  }, [selectedCategoryId, categories]);

  // Ngưỡng 30 ngày, chỉ tính 1 lần khi deps thay đổi
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const filteredMatches = useMemo(() => {
    // 🐛 DEBUG: Log category filter state
    if (selectedCategoryName) {
      console.log('🐛 [sport-filter] ========================');
      console.log('🐛 [sport-filter] selectedCategoryName:', selectedCategoryName);
      console.log('🐛 [sport-filter] total matches:', matches.length);
      matches.forEach((match, idx) => {
        const matchCatName = (match.tournament?.category?.name || match.tournament?.categoryName || '').toLowerCase();
        const matchCat = match.tournament?.category;
        const matchCatNameFallback = match.tournament?.categoryName;
        const matchCatSlug = match.tournament?.categorySlug;
        const tournamentId = match.tournamentId?.slice(0, 8);
        const status = match.status;
        const passesFilter = matchCatName === selectedCategoryName;
        console.log(
          `🐛 [sport-filter] match[${idx}] (${tournamentId}) status=${status}` +
          ` | cat.name=${matchCat?.name}` +
          ` | catName=${matchCatNameFallback}` +
          ` | catSlug=${matchCatSlug}` +
          ` | matchCatName="${matchCatName}"` +
          ` | passes=${passesFilter}`
        );
        if (!passesFilter) {
          console.log('   🐛 FULL tournament:', JSON.stringify(match.tournament, null, 2));
        }
      });
      console.log('🐛 [sport-filter] ========================');
    }

    return matches.filter(match => {
      // Bỏ qua trận đấu có cờ isBye (trận đấu bye/miễn đấu/vô thẳng)
      if (match.isBye) {
        return false;
      }
      // Bỏ qua trận có tên đội là TBD hoặc không xác định
      if (!match.participant1?.teamName || !match.participant2?.teamName ||
          match.participant1.teamName === 'TBD' || match.participant2.teamName === 'TBD') {
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

      // Lọc theo Nội dung (client-side fallback)
      if (selectedContent) {
        const nameLower = (match.tournament?.name || '').toLowerCase();
        
        // Suy luận matchType thực tế từ tên giải đấu
        let actualMatchType = match.tournament?.matchType || '';
        if (nameLower.includes('đơn')) {
          actualMatchType = 'SINGLES';
        } else if (nameLower.includes('đôi')) {
          actualMatchType = 'DOUBLES';
        }

        const genderRestriction = match.tournament?.genderRestriction || '';
        
        let targetMatchType = '';
        let targetGender = '';
        
        if (selectedContent === 'SINGLE_MALE') {
          targetMatchType = 'SINGLES';
          targetGender = 'MALE';
        } else if (selectedContent === 'SINGLE_FEMALE') {
          targetMatchType = 'SINGLES';
          targetGender = 'FEMALE';
        } else if (selectedContent === 'DOUBLE_MALE') {
          targetMatchType = 'DOUBLES';
          targetGender = 'MALE';
        } else if (selectedContent === 'DOUBLE_FEMALE') {
          targetMatchType = 'DOUBLES';
          targetGender = 'FEMALE';
        } else if (selectedContent === 'DOUBLE_MIXED') {
          targetMatchType = 'DOUBLES';
          targetGender = 'MIXED';
        }
        
        if (targetMatchType && actualMatchType !== targetMatchType) return false;

        if (targetGender) {
          const detectedGender = detectMatchGender(match);
          if (detectedGender !== 'OPEN' && detectedGender !== targetGender) return false;
        }
      }

      return true;
    });
  }, [matches, selectedCategoryName, selectedContent, selectedBracketType, selectedProvince, selectedDistrict, thirtyDaysAgo]);

  // Gom nhóm trận đấu theo giải đấu
  interface GroupedMatches {
    tournamentId: string;
    tournamentName: string;
    tournamentCategory: string;
    tournamentLogoUrl: string | null;
    matches: EnrichedMatch[];
  }

  const groupedMatches: GroupedMatches[] = [];
  filteredMatches.forEach(match => {
    const tId = match.tournamentId;
    let group = groupedMatches.find(g => g.tournamentId === tId);
    if (!group) {
      group = {
        tournamentId: tId,
        tournamentName: match.tournament?.name || 'Giải đấu',
        tournamentCategory: match.tournament?.category?.name || match.tournament?.categoryName || 'Chưa cập nhật',
        tournamentLogoUrl: match.tournament?.logoUrl || match.tournament?.community?.logoUrl || null,
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
    selectedDistrict,
    isRanked,
  ].filter(Boolean).length;

  // Pagination for Tournaments: Show 5 tournaments per page
  const TOURNAMENTS_PER_PAGE = 5;
  const totalTournamentsPages = Math.ceil(groupedMatches.length / TOURNAMENTS_PER_PAGE);
  const currentTournaments = groupedMatches.slice((page - 1) * TOURNAMENTS_PER_PAGE, page * TOURNAMENTS_PER_PAGE);

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
        {/* Hàng bộ lọc chính */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Tìm kiếm */}
          <div className="flex-grow w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tìm kiếm</label>
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
                placeholder="Tên vận động viên, CLB..."
              />
            </div>
          </div>

          {/* Môn thể thao */}
          <div className="w-full sm:w-48 shrink-0">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Môn thể thao</label>
            <div className="relative">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-bold h-[42px]"
              >
                <option value="">Tất cả</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          {/* Trạng thái */}
          <div className="w-full sm:w-48 shrink-0">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-bold h-[42px]"
              >
                <option value="">Tất cả</option>
                <option value="ONGOING">Đang diễn ra</option>
                <option value="SCHEDULED">Sắp diễn ra</option>
                <option value="COMPLETED">Vừa kết thúc</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          {/* Lọc thêm button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 h-[42px] cursor-pointer shrink-0 ${
              showAdvancedFilters || selectedBracketType || selectedContent || isRanked || selectedProvince || selectedDistrict || startDate || endDate
                ? 'bg-blue-50 border-blue-250 text-blue-700 shadow-sm'
                : 'bg-slate-105 hover:bg-slate-200 text-slate-900 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Lọc thêm
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-800 text-[9px] rounded-full font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Status Chips — bên trong khung filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs font-semibold">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Lọc nhanh:</span>
          {[
            { label: 'Vừa kết thúc', value: 'COMPLETED', activeClass: 'bg-[#F3F4F1] text-[#4A4E4D] border-slate-400 font-bold shadow-xs', inactiveClass: 'bg-[#F3F4F1]/80 text-[#4A4E4D] border-transparent hover:border-slate-300' },
            { label: 'Đang diễn ra', value: 'ONGOING', activeClass: 'bg-[#EBF5FF] text-[#1E56A0] border-blue-300 font-bold shadow-xs', inactiveClass: 'bg-[#EBF5FF]/80 text-[#1E56A0] border-transparent hover:border-blue-200' },
            { label: 'Sắp diễn ra', value: 'SCHEDULED', activeClass: 'bg-[#FFF5E6] text-[#995C00] border-amber-300 font-bold shadow-xs', inactiveClass: 'bg-[#FFF5E6]/80 text-[#995C00] border-transparent hover:border-amber-200' },
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
              ✕ Bỏ lọc
            </button>
          )}
        </div>

        {/* Advanced filters panel */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Thể thức */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thể thức</label>
                <div className="relative">
                  <select
                    value={selectedBracketType}
                    onChange={(e) => {
                      setSelectedBracketType(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="SINGLE_ELIMINATION">Loại trực tiếp</option>
                    <option value="DOUBLE_ELIMINATION">Nhánh thắng/thua</option>
                    <option value="ROUND_ROBIN">Vòng tròn</option>
                    <option value="GROUP_STAGE_KNOCKOUT">Vòng bảng + Playoffs</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Nội dung */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nội dung</label>
                <div className="relative">
                  <select
                    value={selectedContent}
                    onChange={(e) => {
                      setSelectedContent(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="SINGLE_MALE">Đơn Nam</option>
                    <option value="SINGLE_FEMALE">Đơn Nữ</option>
                    <option value="DOUBLE_MALE">Đôi Nam</option>
                    <option value="DOUBLE_FEMALE">Đôi Nữ</option>
                    <option value="DOUBLE_MIXED">Đôi Nam Nữ</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Xếp hạng */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Xếp hạng</label>
                <div className="relative">
                  <select
                    value={isRanked}
                    onChange={(e) => {
                      setIsRanked(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Xếp hạng</option>
                    <option value="false">Phong trào</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Tỉnh / Thành phố */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tỉnh / Thành phố</label>
                <div className="relative">
                  <select
                    value={selectedProvince}
                    onChange={(event) => {
                      setSelectedProvince(event.target.value);
                      setSelectedDistrict('');
                      setPage(1);
                    }}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả khu vực</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.name.replace(/^(Thành phố|Tỉnh)\s+/i, '')}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Quận / Huyện */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quận / Huyện</label>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    onChange={(event) => {
                      setSelectedDistrict(event.target.value);
                      setPage(1);
                    }}
                    disabled={!selectedProvince}
                    className="w-full h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Tất cả quận / huyện</option>
                    {districts.map((district) => (
                      <option key={district.code} value={district.name}>{district.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Từ ngày */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Từ ngày</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
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
                    title="Chọn ngày"
                  >
                    📅
                  </button>
                </div>
              </div>

              {/* Đến ngày */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đến ngày</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
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
                    title="Chọn ngày"
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
                    setSelectedDistrict('');
                    setSearchTerm('');
                    setIsRanked('');
                    setPage(1);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white h-10 flex items-center justify-center"
                  title="Xóa bộ lọc"
                >
                  <span className="font-bold text-rose-650">Xóa hết</span>
                </button>
              </div>
            </div>
          )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Danh sách trận đấu</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Các trận được nhóm theo từng giải để dễ theo dõi.</p>
        </div>
        {!isLoading && (
          <span className="shrink-0 text-xs font-bold text-slate-500">{groupedMatches.length} giải đấu</span>
        )}
      </div>

      {/* Danh sách các Giải đấu gom nhóm */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-slate-500 font-bold">Đang tải danh sách trận đấu...</div>
      ) : currentTournaments.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 text-slate-400 bg-white border border-slate-200 rounded-lg p-6 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-bold text-slate-500">Không tìm thấy trận đấu nào phù hợp.</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng thay đổi bộ lọc để thử lại.</p>
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
                      <img src="/vndcsport.svg" alt="VNDC Sport" className="w-10 h-10 object-contain opacity-60" />
                    )}
                  </Link>
                  <div>
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                      GIẢI ĐẤU HẠNG • {group.tournamentCategory}
                      {(() => {
                        const firstMatch = group.matches[0];
                        const tConfig = firstMatch?.tournament as Record<string, unknown> | undefined;
                        const tConfigObj = tConfig?.tournamentConfig as Record<string, unknown> | undefined;
                        const bType = tConfig?.bracketType as string || tConfigObj?.bracketType as string || firstMatch?.stage?.type;
                        const label = getBracketTypeLabel(bType);
                        return label ? ` • ${label}` : '';
                      })()}
                    </span>
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
                      ? 'Vòng bảng'
                      : isDoubleElim
                      ? 'Nhánh thắng/thua'
                      : isSingleElim
                      ? 'Loại trực tiếp'
                      : isRoundRobin
                      ? 'Vòng tròn'
                      : 'Giải đấu';

                    const p1Won = isFinished && match.winnerId === match.participant1Id;
                    const p2Won = isFinished && match.winnerId === match.participant2Id;

                    const friendlyRoundName = getMatchRoundLabel({
                      match,
                      matches: group.matches,
                      tournamentFormat: match.stage?.type,
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
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            {isLive ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                    Đang diễn ra
                                  </span>
                                  <span>• {friendlyRoundName}</span>
                                </>
                              ) : isFinished ? (
                                <>
                                  <span className="text-slate-400">Đã kết thúc</span>
                                  <span>• {friendlyRoundName}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold border border-blue-100">Sắp đấu</span>
                                  {match.scheduledAt ? (
                                    <span>• {new Date(match.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date(match.scheduledAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} • {friendlyRoundName}</span>
                                  ) : (
                                    <span>• {friendlyRoundName}</span>
                                  )}
                                </>
                              )}
                            </span>
                            
                            {isLive && typeof match.viewerCount === 'number' && match.viewerCount > 0 && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100/60 px-2 py-0.5 rounded-full">
                                <Eye className="w-3 h-3 text-blue-600 animate-pulse" />
                                <span>{match.viewerCount} đang xem</span>
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
                                      {getTeamShortName(match.participant1?.teamName)}
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
                                                {getShortName(m.fullName) || (m.isMock ? 'VĐV ảo' : 'N/A')}
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
                                              ELO Cặp: {pairElo}
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
                                      {getTeamShortName(match.participant2?.teamName)}
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
                                                {getShortName(m.fullName) || (m.isMock ? 'VĐV ảo' : 'N/A')}
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
                                              ELO Cặp: {pairElo}
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
                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2.5 justify-center border-t border-slate-100 pt-2.5">
                              <span className="flex items-center gap-1 text-slate-500">
                                <span className="font-bold text-slate-800 whitespace-nowrap">
                                  {getFormatLabel(match.tournament?.matchType, match.tournament?.genderRestriction)}
                                </span>
                              </span>
                              <span className="text-slate-200">|</span>
                              <span>
                                 {match.courtName ? `Sân: ${match.courtName}` : 'Chờ xếp sân'}
                              </span>
                            </div>
                          </div>
                        </Link>

                        {/* Interactive Footer (Heart & Share aligned right) */}
                        <div className="px-3 py-1 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-1.5 relative z-10">
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
                                toast.error('Không thể gửi cổ vũ, vui lòng thử lại.');
                              }
                            }}
                            title={`Cổ vũ (${cheerCounts[match.id] || 0})`}
                            className="flex items-center justify-center px-2.5 py-1 hover:bg-white rounded-md text-slate-600 transition-all border border-transparent hover:border-slate-200 active:scale-95 duration-100 cursor-pointer shrink-0"
                          >
                            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
                            <span className="text-[11px] font-bold text-slate-600 ml-1">({cheerCounts[match.id] || 0})</span>
                          </button>

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
                            className="flex items-center justify-center gap-1 hover:text-slate-700 transition-colors py-1 min-h-[32px] cursor-pointer"
                          >
                            <Share2 className="w-3 h-3 text-slate-400" />
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
                      Trước
                    </button>
                    <span className="text-xs font-bold text-slate-500 px-2">
                      Trang {groupPage} / {totalGroupPages}
                    </span>
                    <button
                      onClick={() => setGroupPages(prev => ({ ...prev, [group.tournamentId]: Math.min(totalGroupPages, groupPage + 1) }))}
                      disabled={groupPage === totalGroupPages}
                      className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Sau
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
            Trước
          </button>
          
          <button
            className="relative px-3.5 py-2 flex items-center justify-center text-xs font-bold rounded-lg border border-blue-600 bg-blue-600 text-white shadow-sm"
          >
            Trang {page}
          </button>

          {page < totalTournamentsPages && (
            <button
              onClick={() => setPage(page + 1)}
              className="relative px-3.5 py-2 flex items-center justify-center text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-350 hover:text-slate-900 cursor-pointer"
            >
              Trang {page + 1}
            </button>
          )}

          <button
            onClick={() => setPage(p => Math.min(totalTournamentsPages, p + 1))}
            disabled={page === totalTournamentsPages}
            className="px-3 py-1.5 text-xs font-bold text-slate-655 bg-white border border-slate-200 hover:border-slate-350 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Sau
          </button>
        </div>
      )}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={activeShareUrl}
        title={activeShareTitle}
      />
    </div>
  );
}
