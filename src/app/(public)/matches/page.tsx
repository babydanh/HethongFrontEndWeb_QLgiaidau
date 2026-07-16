'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronDown, Play, Trophy, Heart, Share2, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { matchesApi, type Match } from '@/features/matches/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { regionsApi, type Region } from '@/features/regions/api';
import { getSportLogo } from '@/constants/sports';
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
}

interface EnrichedParticipant {
  id: string;
  teamName: string;
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

export default function MatchesListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareUrl, setActiveShareUrl] = useState('');
  const [activeShareTitle, setActiveShareTitle] = useState('');

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

  // Fetch danh sách trận đấu dựa trên bộ lọc
  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        // Map lựa chọn nội dung đấu sang matchType và genderRestriction
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
          matchType = 'MIXED_DOUBLES';
        }

        const res = await matchesApi.getMatches({
          page: 1, // Reset API page to 1 since we are paging tournaments locally now
          limit: 500, // Fetch all matches so grouping works correctly
          search: searchTerm || undefined,
          categoryId: selectedCategoryId || undefined,
          status: selectedStatus || undefined,
          matchType,
          genderRestriction,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        
        if (res && res.data) {
          setMatches(res.data as unknown as EnrichedMatch[]);
          setTotalPages(res.meta.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch matches', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, [searchTerm, selectedCategoryId, selectedStatus, selectedContent, startDate, endDate]);

  // Lọc bỏ trận đấu đã kết thúc quá 30 ngày
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const filteredMatches = matches.filter(match => {
    // Bỏ qua trận đấu có trạng thái hoặc cờ isBye là true (trận đấu bye/miễn đấu/vô thẳng)
    if (match.isBye) {
      return false;
    }
    // Bỏ qua trận có tên đội là TBD hoặc không xác định
    if (!match.participant1?.teamName || !match.participant2?.teamName ||
        match.participant1.teamName === 'TBD' || match.participant2.teamName === 'TBD') {
      return false;
    }
    // Lọc bỏ trận đấu đã kết thúc quá 30 ngày
    if (match.status === 'COMPLETED' && match.completedAt) {
      return new Date(match.completedAt) >= thirtyDaysAgo;
    }

    // Lọc theo Tỉnh / Thành phố
    if (selectedProvince) {
      const tourCity = match.tournament?.city || '';
      const cleanTourCity = tourCity.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim().toLowerCase();
      const cleanSelectedProv = selectedProvince.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim().toLowerCase();
      if (cleanTourCity !== cleanSelectedProv) {
        return false;
      }
    }

    // Lọc theo Quận / Huyện
    if (selectedDistrict) {
      const tourAddress = match.tournament?.locationAddress || '';
      const cleanTourAddress = tourAddress.toLowerCase();
      const cleanSelectedDist = selectedDistrict.replace(/^(Quận|Huyện|Thị xã)\s+/i, '').trim().toLowerCase();
      if (!cleanTourAddress.includes(cleanSelectedDist)) {
        return false;
      }
    }

    return true;
  });

  // Gom nhóm trận đấu theo giải đấu
  interface GroupedMatches {
    tournamentId: string;
    tournamentName: string;
    tournamentCategory: string;
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
  ].filter(Boolean).length;

  // Pagination for Tournaments: Show 5 tournaments per page
  const TOURNAMENTS_PER_PAGE = 5;
  const totalTournamentsPages = Math.ceil(groupedMatches.length / TOURNAMENTS_PER_PAGE);
  const currentTournaments = groupedMatches.slice((page - 1) * TOURNAMENTS_PER_PAGE, page * TOURNAMENTS_PER_PAGE);

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 leading-tight tracking-tight">Lịch thi đấu & Kết quả</h1>
        <p className="text-sm text-slate-500 max-w-2xl font-medium">
          Cập nhật lịch thi đấu, tỉ số trực tiếp các giải đấu Cầu lông, Pickleball, Tennis đang diễn ra.
        </p>
      </div>
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-black text-slate-900">Bộ lọc trận đấu</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Thu hẹp danh sách theo môn, trạng thái và thời gian.</p>
          </div>
          {activeFilterCount > 0 && (
            <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
              {activeFilterCount} bộ lọc
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4">
        {/* Row 1: Main Filters */}
        <div className="flex flex-col md:flex-row items-end gap-4 w-full">
          {/* Tìm kiếm */}
          <div className="flex-grow w-full flex flex-col gap-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Tìm kiếm</label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold h-[38px]"
                placeholder="Tên vận động viên, CLB..."
              />
            </div>
          </div>

          {/* Môn thể thao */}
          <div className="w-full md:w-44 shrink-0 flex flex-col gap-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Môn thể thao</label>
            <div className="relative w-full">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold h-[38px]"
              >
                <option value="">Tất cả</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Trạng thái */}
          <div className="w-full md:w-40 shrink-0 flex flex-col gap-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái</label>
            <div className="relative w-full">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold h-[38px]"
              >
                <option value="">Tất cả</option>
                <option value="ONGOING">Đang đấu</option>
                <option value="SCHEDULED">Sắp đấu</option>
                <option value="COMPLETED">Đã kết thúc</option>
                <option value="RECENT">Tỉ số nóng</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Nội dung */}
          <div className="w-full md:w-44 shrink-0 flex flex-col gap-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Nội dung</label>
            <div className="relative w-full">
              <select
                value={selectedContent}
                onChange={(e) => {
                  setSelectedContent(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold h-[38px]"
              >
                <option value="">Tất cả</option>
                <option value="SINGLE_MALE">Đơn Nam</option>
                <option value="SINGLE_FEMALE">Đơn Nữ</option>
                <option value="DOUBLE_MALE">Đôi Nam</option>
                <option value="DOUBLE_FEMALE">Đôi Nữ</option>
                <option value="DOUBLE_MIXED">Đôi Nam Nữ</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Lọc thêm button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-[38px] flex items-center justify-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all w-full md:w-auto shrink-0 cursor-pointer ${
              showAdvancedFilters || startDate || endDate || selectedProvince || selectedDistrict
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lọc thêm
          </button>
        </div>

        {/* Row 2: Advanced filters panel */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Từ ngày */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Từ ngày</label>
              <input
                type={startDate ? "date" : "text"}
                placeholder="dd/mm/yyyy"
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-950 font-bold h-[33.5px]"
              />
            </div>

            {/* Đến ngày */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Đến ngày</label>
              <input
                type={endDate ? "date" : "text"}
                placeholder="dd/mm/yyyy"
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-950 font-bold h-[33.5px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tỉnh / Thành phố</label>
              <div className="relative">
                <select
                  value={selectedProvince}
                  onChange={(event) => {
                    setSelectedProvince(event.target.value);
                    setSelectedDistrict('');
                    setPage(1);
                  }}
                  className="w-full h-[33.5px] appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Quận / Huyện</label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(event) => {
                    setSelectedDistrict(event.target.value);
                    setPage(1);
                  }}
                  disabled={!selectedProvince}
                  className="w-full h-[33.5px] appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Tất cả quận / huyện</option>
                  {districts.map((district) => (
                    <option key={district.code} value={district.name}>{district.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Xóa bộ lọc */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategoryId('');
                  setSelectedStatus('');
                  setSelectedContent('');
                  setStartDate('');
                  setEndDate('');
                  setSelectedProvince('');
                  setSelectedDistrict('');
                  setSearchTerm('');
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white h-[33.5px] flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}

      {/* Quick Status Chips */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">Xem nhanh</span>
        <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'TẤT CẢ', value: '', activeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-sm', inactiveClass: 'bg-slate-100 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800' },
          { label: 'ĐANG DIỄN RA', value: 'ONGOING', activeClass: 'bg-rose-50 text-rose-600 border border-rose-200/50 shadow-sm', inactiveClass: 'bg-rose-50/40 text-rose-500 hover:bg-rose-50 hover:text-rose-600' },
          { label: 'SẮP DIỄN RA', value: 'SCHEDULED', activeClass: 'bg-blue-50 text-blue-600 border border-blue-200/50 shadow-sm', inactiveClass: 'bg-blue-50/40 text-blue-500 hover:bg-blue-50 hover:text-blue-600' },
          { label: 'VỪA KẾT THÚC', value: 'COMPLETED', activeClass: 'bg-slate-200 text-slate-700 border border-slate-300/50 shadow-sm', inactiveClass: 'bg-slate-100 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800' },
          { label: 'TỈ SỐ NÓNG', value: 'RECENT', activeClass: 'bg-amber-50 text-amber-600 border border-amber-200/50 shadow-sm', inactiveClass: 'bg-amber-50/40 text-amber-600 hover:bg-amber-50' },
        ].map((chip) => {
          const isActive = selectedStatus === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => {
                setSelectedStatus(chip.value);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                isActive ? chip.activeClass : chip.inactiveClass
              }`}
            >
              {chip.label}
            </button>
          );
        })}
        </div>
      </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Danh sách trận đấu</h2>
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
        <div className="flex flex-col justify-center items-center h-64 text-slate-400 bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-bold text-slate-500">Không tìm thấy trận đấu nào phù hợp.</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng thay đổi bộ lọc để thử lại.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {currentTournaments.map(group => {
            const sportLogo = getSportLogo(group.tournamentCategory);
            // Cấu hình 3x2 (6 trận đấu trên mỗi trang của card giải đấu)
            const MATCHES_PER_PAGE = 6;
            const groupPage = groupPages[group.tournamentId] || 1;
            const totalGroupPages = Math.ceil(group.matches.length / MATCHES_PER_PAGE);
            
            // Slice matches based on sub-pagination inside the card
            const visibleMatches = group.matches.slice((groupPage - 1) * MATCHES_PER_PAGE, groupPage * MATCHES_PER_PAGE);

            return (
              <div 
                key={group.tournamentId} 
                className="bg-slate-50/80 p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5"
              >
                {/* Header giải đấu */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/tournaments/${group.tournamentId}`}
                      className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 hover:opacity-85 transition-opacity"
                    >
                      <img src="/images/vndc_sport.png" alt="VNSPORT Logo" className="w-8 h-8 object-contain" />
                    </Link>
                    <div>
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                        GIẢI ĐẤU HẠNG • {group.tournamentCategory}
                      </span>
                      <Link href={`/tournaments/${group.tournamentId}`} className="hover:text-blue-600 transition-colors">
                        <h3 className="font-black text-slate-900 text-sm md:text-base uppercase tracking-tight leading-none">
                          {group.tournamentName}
                        </h3>
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Link 
                      href={`/tournaments/${group.tournamentId}`}
                      className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-wider flex items-center"
                    >
                      Chi tiết giải &gt;
                    </Link>
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
                      <div 
                        key={match.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                      >
                        {/* Header trận */}
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Đang diễn ra
                              </span>
                            ) : isFinished ? (
                              <span className="text-slate-400">Đã kết thúc</span>
                            ) : (
                              <span className="text-blue-600">Lịch thi đấu</span>
                            )}
                            <span>• {friendlyRoundName}</span>
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {matchTypeLabel}
                          </span>
                        </div>

                        {/* Chi tiết đấu - Bố cục Dọc theo chuẩn giải đấu chuyên nghiệp */}
                        <div className="p-4 flex flex-col gap-3 flex-grow justify-center">
                          <div className="flex flex-col gap-2.5">
                            {/* VĐV / Đội 1 */}
                            <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/70">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-7.5 h-7.5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-700 shrink-0 text-[10px] shadow-sm">
                                  {match.participant1?.teamName?.substring(0, 2).toUpperCase() || 'P1'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                    <span className="truncate">{match.participant1?.teamName || 'Chờ xác định'}</span>
                                    {p1Won && (
                                      <span className="bg-emerald-50 text-emerald-700 text-[8px] px-1 py-0.2 rounded font-black shrink-0">THẮNG</span>
                                    )}
                                  </div>
                                  
                                  {/* Hiển thị ELO / Thành viên thông minh */}
                                  {match.tournament?.matchType === 'SINGLES' ? (
                                    // Đấu đơn: Hiển thị ELO trực tiếp bên dưới tên
                                    match.participant1?.members?.[0]?.elo && (
                                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                        ELO {match.participant1.members[0].elo.eloPoints}
                                      </span>
                                    )
                                  ) : (
                                    // Đấu đôi: Hiển thị 2 thành viên kèm ELO
                                    match.participant1?.members && match.participant1.members.length > 0 && (
                                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                        {match.participant1.members.slice(0, 2).map((m: { fullName: string | null; elo?: { eloPoints: number } }, i: number) => (
                                          <span key={i} className="text-[9px] text-slate-400 font-medium">
                                            {m.fullName || 'N/A'}{m.elo ? ` (${m.elo.eloPoints})` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Tỉ số các set theo cột dọc */}
                              {match.status !== 'SCHEDULED' && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {Array.from({ length: maxSetsCount }).map((_, idx) => {
                                    const set = scoreSets[idx];
                                    const hasScore = set !== undefined && set.team1Score !== undefined && set.team2Score !== undefined;
                                    const isSetDone = set?.isFinished;
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`w-6.5 h-6.5 rounded text-[10px] font-extrabold flex items-center justify-center border transition-all ${
                                          hasScore 
                                            ? isSetDone 
                                              ? 'bg-slate-50 text-slate-600 border-slate-200 shadow-sm' 
                                              : 'bg-rose-50 text-rose-600 border-rose-100 font-black animate-pulse'
                                            : 'text-slate-350 bg-slate-50/20 border-slate-100/50'
                                        }`}
                                      >
                                        {hasScore ? set.team1Score : '-'}
                                      </div>
                                    );
                                  })}
                                  {/* Tổng Set thắng */}
                                  <div className="w-7.5 h-7.5 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center border border-slate-950 shadow ml-1.5">
                                    {match.p1SetsWon ?? 0}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* VĐV / Đội 2 */}
                            <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/70">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-7.5 h-7.5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 shrink-0 text-[10px] shadow-sm">
                                  {match.participant2?.teamName?.substring(0, 2).toUpperCase() || 'P2'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                    <span className="truncate">{match.participant2?.teamName || 'Chờ xác định'}</span>
                                    {p2Won && (
                                      <span className="bg-emerald-50 text-emerald-700 text-[8px] px-1 py-0.2 rounded font-black shrink-0">THẮNG</span>
                                    )}
                                  </div>
                                  
                                  {/* Hiển thị ELO / Thành viên thông minh */}
                                  {match.tournament?.matchType === 'SINGLES' ? (
                                    // Đấu đơn: Hiển thị ELO trực tiếp bên dưới tên
                                    match.participant2?.members?.[0]?.elo && (
                                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                        ELO {match.participant2.members[0].elo.eloPoints}
                                      </span>
                                    )
                                  ) : (
                                    // Đấu đôi: Hiển thị 2 thành viên kèm ELO
                                    match.participant2?.members && match.participant2.members.length > 0 && (
                                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                        {match.participant2.members.slice(0, 2).map((m: { fullName: string | null; elo?: { eloPoints: number } }, i: number) => (
                                          <span key={i} className="text-[9px] text-slate-400 font-medium">
                                            {m.fullName || 'N/A'}{m.elo ? ` (${m.elo.eloPoints})` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Tỉ số các set theo cột dọc */}
                              {match.status !== 'SCHEDULED' && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {Array.from({ length: maxSetsCount }).map((_, idx) => {
                                    const set = scoreSets[idx];
                                    const hasScore = set !== undefined && set.team1Score !== undefined && set.team2Score !== undefined;
                                    const isSetDone = set?.isFinished;
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`w-6.5 h-6.5 rounded text-[10px] font-extrabold flex items-center justify-center border transition-all ${
                                          hasScore 
                                            ? isSetDone 
                                              ? 'bg-slate-50 text-slate-600 border-slate-200 shadow-sm' 
                                              : 'bg-rose-50 text-rose-600 border-rose-100 font-black animate-pulse'
                                            : 'text-slate-350 bg-slate-50/20 border-slate-100/50'
                                        }`}
                                      >
                                        {hasScore ? set.team2Score : '-'}
                                      </div>
                                    );
                                  })}
                                  {/* Tổng Set thắng */}
                                  <div className="w-7.5 h-7.5 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center border border-slate-950 shadow ml-1.5">
                                    {match.p2SetsWon ?? 0}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Phân môn & Sân */}
                          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2.5 justify-center border-t border-slate-100 pt-2.5">
                            <span className="flex items-center gap-1 text-slate-500">
                              {sportLogo ? (
                                <img src={sportLogo} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />
                              ) : (
                                <span>🏆</span>
                              )}
                              <span className="font-bold text-slate-800">
                                {getFormatLabel(match.tournament?.matchType, match.tournament?.genderRestriction)}
                              </span>
                            </span>
                            <span className="text-slate-200">|</span>
                            <span>
                               {match.courtName ? `Sân: ${match.courtName}` : 'Chờ xếp sân'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="px-3 py-1.5 bg-slate-50/50 border-t border-slate-100 grid grid-cols-3 gap-0.5 text-center text-[11px] font-bold text-slate-500">
                          <button 
                            onClick={() => {
                              setCheerCounts(prev => ({
                                ...prev,
                                [match.id]: (prev[match.id] || 0) + 1
                              }));
                              toast.success('Cảm ơn bạn đã cổ vũ!');
                            }}
                            className="flex items-center justify-center gap-1 hover:text-rose-600 transition-colors py-1 cursor-pointer"
                          >
                            <Heart className="w-3 h-3 text-rose-500 fill-current" />
                            <span>Cổ vũ ({cheerCounts[match.id] || 0})</span>
                          </button>
                          <Link 
                            href={`/live/${match.id}`}
                            className="flex items-center justify-center gap-1 hover:text-indigo-600 transition-colors py-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-indigo-600 fill-current" />
                            <span>Chi tiết</span>
                          </Link>
                           <button 
                            onClick={() => {
                              const p1Name = match.participant1?.teamName || 'VĐV 1';
                              const p2Name = match.participant2?.teamName || 'VĐV 2';
                              setActiveShareUrl(`${window.location.origin}/live/${match.id}`);
                              setActiveShareTitle(`Trận đấu: ${p1Name} vs ${p2Name}`);
                              setIsShareModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-1 hover:text-slate-700 transition-colors py-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3 text-slate-400" />
                            <span>Chia sẻ</span>
                          </button>
                        </div>
                      </div>
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
            className="px-3 py-1.5 text-xs font-black text-slate-655 bg-white border border-slate-200 hover:border-slate-350 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Trước
          </button>
          
          <button
            className="relative px-3.5 py-2 flex items-center justify-center text-xs font-black rounded-xl border border-indigo-600 bg-indigo-600 text-white shadow-sm"
          >
            Trang {page}
          </button>

          {page < totalTournamentsPages && (
            <button
              onClick={() => setPage(page + 1)}
              className="relative px-3.5 py-2 flex items-center justify-center text-xs font-black rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-350 hover:text-slate-900 cursor-pointer"
            >
              Trang {page + 1}
            </button>
          )}

          <button
            onClick={() => setPage(p => Math.min(totalTournamentsPages, p + 1))}
            disabled={page === totalTournamentsPages}
            className="px-3 py-1.5 text-xs font-black text-slate-655 bg-white border border-slate-200 hover:border-slate-350 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
