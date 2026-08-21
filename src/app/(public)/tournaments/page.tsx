'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from "next-intl";
import { Search, ChevronDown, SlidersHorizontal, Bookmark, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { formatCurrency } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import { BRAND } from '@/constants/brand';
import { useAuthStore } from '@/lib/zustand/authStore';
import { sortDiscoveryTournaments, isRecentlyCompletedTournament } from '@/utils/tournament-home';
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentCompleted,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentRegistrationClosed,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import { getRegistrationModeUi } from './registrationMode';
import { getTournamentLocationLabel, getTournamentShortLocation } from '@/utils/tournament-location';

export default function TournamentsListPage() {
  const locale = useLocale();
  const translate = useTranslations("TournamentList");
  const registrationTranslate = useTranslations("RegistrationMode");
  const moreFiltersLabel = translate.has("moreFilters")
    ? translate("moreFilters")
    : locale === "vi"
      ? "Bộ lọc thêm"
      : "More filters";
  const recentlyFinishedLabel = translate.has("recentlyFinished")
    ? translate("recentlyFinished")
    : locale === "vi"
      ? "Mới kết thúc"
      : "Recently finished";
  const { user } = useAuthStore();

  const getFormatLabel = (matchType?: string, genderRestriction?: string | null) => {
    const mt = matchType || '';
    const gr = genderRestriction || '';
    if (mt === 'SINGLES') {
      return gr === 'FEMALE' ? translate('singleFemale') : translate('singleMale');
    }
    if (mt === 'DOUBLES') {
      return gr === 'FEMALE' ? translate('doubleFemale') : translate('doubleMale');
    }
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
      return translate('mixedDoubles');
    }
    return mt === 'DOUBLES' ? translate('doubles') : mt === 'SINGLES' ? translate('singles') : translate('mixedDoubles');
  };

  const getParsedDates = (startStr?: string, endStr?: string) => {
    if (!startStr) return { startDay: '--', endDay: '--', startMonth: '--', endMonth: '--' };
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : start;

    const startDay = start.getDate().toString().padStart(2, '0');
    const endDay = end.getDate().toString().padStart(2, '0');
    const startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
    const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');

    return { startDay, endDay, startMonth, endMonth };
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [featuredTournaments, setFeaturedTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]); // Danh sách phường/xã
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>(''); // Phường/xã đang chọn
  const [selectedContent, setSelectedContent] = useState<string>(''); // Nội dung thi đấu (Đơn Nam, Đôi Nữ...)
  const [selectedIsRanked, setSelectedIsRanked] = useState<string>(''); // ELO or Recreational filter
  const [selectedBracketType, setSelectedBracketType] = useState<string>(''); // Thể thức thi đấu
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // Toggle bộ lọc nâng cao
  const [startDate, setStartDate] = useState<string>(''); // Lọc từ ngày
  const [endDate, setEndDate] = useState<string>(''); // Lọc đến ngày

  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const [followedTournamentIds, setFollowedTournamentIds] = useState<Set<string>>(new Set());
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());

  const filterKey = [
    searchTerm,
    selectedCategoryId,
    selectedStatus,
    selectedRegion,
    selectedWard,
    selectedContent,
    selectedBracketType,
    startDate,
    endDate,
    selectedIsRanked,
  ].join('|');

  useEffect(() => {
    cursorByPageRef.current = { 1: null };
    let active = true;
    Promise.resolve().then(() => {
      if (active) setPage((currentPage) => (currentPage === 1 ? currentPage : 1));
    });
    return () => {
      active = false;
    };
  }, [filterKey]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.getCategories();
        if (res && res.data) {
          const activeCats = res.data.filter(cat => {
            const catKey = cat.slug || cat.id;
            if (typeof window !== 'undefined') {
              const localOverride = localStorage.getItem(`sport_active_${catKey}`);
              if (localOverride === 'false') return false;
              if (localOverride === 'true') return true;
            }
            return cat.isActive !== false && (cat.categoryConfig as Record<string, unknown> | null | undefined)?.isActive !== false;
          });
          setCategories(activeCats);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };

    const fetchRegions = async () => {
      try {
        const res = await regionsApi.getProvinces();
        if (res) {
          setRegions(res);
        }
      } catch (error) {
        console.error("Failed to fetch regions", error);
      }
    };

    const fetchFeatured = async () => {
      try {
        const res = await tournamentsApi.getPublicTournaments({
          limit: 5,
          status: 'REGISTRATION_OPEN',
        });
        if (res && res.data) {
          const validFeatured = res.data.filter((t: Tournament) => {
            const st = (t.status as string)?.toUpperCase();
            return !['DRAFT', 'PENDING_APPROVAL', 'SUSPENDED', 'PENDING_DELETE'].includes(st);
          });
          setFeaturedTournaments(validFeatured);
        }
      } catch (error) {
        console.error("Failed to fetch featured tournaments", error);
      }
    };

    fetchCategories();
    fetchRegions();
    fetchFeatured();
  }, []);

  // Tự động tải Phường / Xã theo Tỉnh / Thành phố (API địa chỉ v2)
  useEffect(() => {
    if (!selectedRegion) {
      return;
    }

    const loadWards = async () => {
      try {
        const cleanRegionName = selectedRegion.trim().toLowerCase();
        const foundRegion = regions.find(r =>
          r.name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim().toLowerCase() === cleanRegionName
        );

        if (foundRegion) {
          const res = await regionsApi.getWardsByProvince(foundRegion.code);
          if (res) {
            setWards(res);
          }
        }
      } catch (error) {
        console.error("Failed to fetch wards", error);
      }
    };

    loadWards();
  }, [selectedRegion, regions]);

  useEffect(() => {
    if (!user?.id) {
      const timer = setTimeout(() => {
        if (followedTournamentIds.size > 0) {
          setFollowedTournamentIds(new Set());
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    let isMounted = true;
    const fetchFollowed = async () => {
      try {
        const res = await tournamentsApi.getFollowedTournaments();
        if (isMounted) {
          setFollowedTournamentIds(new Set((res.data || []).map((tournament) => tournament.id)));
        }
      } catch (error) {
        console.error('Failed to fetch followed tournaments', error);
      }
    };

    fetchFollowed();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const formatDateForAPI = (d: string): string | undefined => {
    if (!d) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parts = d.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return undefined;
  };

  useEffect(() => {
    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        let locationQuery = selectedRegion || undefined;
        if (selectedRegion && selectedWard) {
          locationQuery = `${selectedWard}, ${selectedRegion}`;
        }

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
          genderRestriction = 'MIXED';
        }

        const apiStartDate = formatDateForAPI(startDate);
        const apiEndDate = formatDateForAPI(endDate);

        let isRankedParam: boolean | undefined = undefined;
        if (selectedIsRanked === 'true') isRankedParam = true;
        if (selectedIsRanked === 'false') isRankedParam = false;

        const cursor = cursorByPageRef.current[page] ?? null;
        const res = await tournamentsApi.getPublicTournaments({
          limit: 10,
          ...(cursor ? { cursor } : {}),
          search: searchTerm || undefined,
          categoryId: selectedCategoryId || undefined,
          status: selectedStatus || undefined,
          region: locationQuery,
          matchType,
          genderRestriction,
          bracketType: selectedBracketType || undefined,
          startDate: apiStartDate,
          endDate: apiEndDate,
          isRanked: isRankedParam,
        });
        const validTournaments = (res.data || []).filter((t: Tournament) => {
          const st = (t.status as string)?.toUpperCase();
          return !['DRAFT', 'PENDING_APPROVAL', 'SUSPENDED', 'PENDING_DELETE'].includes(st);
        });
        setTournaments(sortDiscoveryTournaments(validTournaments));
        setTotalPages(res.meta.totalPages);
        cursorByPageRef.current[page + 1] = res.meta.nextCursor ?? null;
      } catch (error) {
        console.error("Failed to fetch tournaments", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, [page, filterKey]);

  const handleToggleFollow = async (tournament: Tournament) => {
    if (!user?.id) return;

    setFollowLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(tournament.id);
      return next;
    });

    try {
      const isFollowing = followedTournamentIds.has(tournament.id);
      if (isFollowing) {
        await tournamentsApi.unfollowTournament(tournament.id);
        setFollowedTournamentIds((prev) => {
          const next = new Set(prev);
          next.delete(tournament.id);
          return next;
        });
      } else {
        await tournamentsApi.followTournament(tournament.id);
        setFollowedTournamentIds((prev) => new Set(prev).add(tournament.id));
      }
    } catch (error) {
      console.error('Failed to toggle follow tournament', error);
    } finally {
      setFollowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(tournament.id);
        return next;
      });
    }
  };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">



      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
        {/* Hàng bộ lọc chính */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{translate("searchLabel")}</label>
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{translate("statusLabel")}</label>
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
                <option value="REGISTRATION_OPEN">{translate("registrationOpen")}</option>
                <option value="UPCOMING">{translate("upcoming")}</option>
                <option value="IN_PROGRESS">{translate("inProgress")}</option>
                <option value="COMPLETED">{translate("completed")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 h-[42px] cursor-pointer shrink-0 ${
              showAdvancedFilters || selectedContent || selectedBracketType || selectedIsRanked || selectedRegion || selectedWard || startDate || endDate
                ? 'bg-blue-50 border-blue-250 text-blue-700 shadow-sm animate-pulse-subtle'
                : 'bg-slate-105 hover:bg-slate-200 text-slate-900 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {moreFiltersLabel}
          </button>
        </div>

        {/* Panel Lọc Nâng Cao trượt mở bên dưới */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Ô Lọc Nội dung thi đấu */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("contentLabel")}</label>
              <div className="relative">
                <select
                  value={selectedContent}
                  onChange={(e) => {
                    setSelectedContent(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-10 py-1.5 border border-slate-250 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold h-10"
                >
                  <option value="">{translate("all")}</option>
                  <option value="SINGLE_MALE">{translate("singleMale")}</option>
                  <option value="SINGLE_FEMALE">{translate("singleFemale")}</option>
                  <option value="DOUBLE_MALE">{translate("doubleMale")}</option>
                  <option value="DOUBLE_FEMALE">{translate("doubleFemale")}</option>
                  <option value="DOUBLE_MIXED">{translate("mixedDoubles")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Ô Lọc Thể thức thi đấu */}
            <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("format")}</label>
              <div className="relative">
                <select
                  value={selectedBracketType}
                  onChange={(e) => {
                    setSelectedBracketType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-10 py-1.5 border border-slate-250 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold h-10"
                >
                  <option value="">{translate("all")}</option>
                  <option value="SINGLE_ELIMINATION">{translate("singleElimination")}</option>
                  <option value="DOUBLE_ELIMINATION">{translate("doubleElimination")}</option>
                  <option value="ROUND_ROBIN">{translate("roundRobin")}</option>
                  <option value="GROUP_STAGE_KNOCKOUT">{translate("groupStageKnockout")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Lọc theo việc giải có tính ELO hay không */}
            <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("ranking")}</label>
              <div className="relative">
                <select
                  value={selectedIsRanked}
                  onChange={(e) => {
                    setSelectedIsRanked(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-10 py-1.5 border border-slate-250 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold h-10"
                >
                  <option value="">{translate("all")}</option>
                  <option value="true">{translate("eloIncluded")}</option>
                  <option value="false">{translate("eloExcluded")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Tỉnh / Thành phố */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("provinceCity")}</label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    const newRegion = e.target.value;
                    setSelectedRegion(newRegion);
                    setSelectedWard('');
                    if (!newRegion) {
                      setWards([]);
                    }
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-10 py-1.5 border border-slate-250 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold h-10"
                >
                  <option value="">{translate("all")}</option>
                  {regions.map(reg => (
                    <option key={reg.code} value={reg.name.replace(/^(Thành phố|Tỉnh)\s+/i, '')}>{reg.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Phường / Xã */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("wardCommune")}</label>
              <div className="relative">
                <select
                  disabled={!selectedRegion || wards.length === 0}
                  value={selectedWard}
                  onChange={(e) => {
                    setSelectedWard(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-10 py-1.5 border border-slate-250 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-950 font-bold disabled:opacity-50 disabled:bg-slate-100 h-10"
                >
                  <option value="">{translate("all")}</option>
                  {wards.map(ward => (
                    <option key={ward.code} value={ward.name}>{ward.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Lọc từ ngày */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("fromDate")}</label>
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
                  className="w-full pl-3 pr-9 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-955 font-bold h-10"
                />
                <input
                  type="date"
                  id="hiddenStartDatePicker"
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
                    const el = document.getElementById('hiddenStartDatePicker') as HTMLInputElement | null;
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
                  title={translate("selectDateAria")}
                >
                  📅
                </button>
              </div>
            </div>

            {/* Lọc đến ngày */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{translate("toDate")}</label>
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
                  className="w-full pl-3 pr-9 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-955 font-bold h-10"
                />
                <input
                  type="date"
                  id="hiddenEndDatePicker"
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
                    const el = document.getElementById('hiddenEndDatePicker') as HTMLInputElement | null;
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
                  title={translate("selectDateAria")}
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
                  setSelectedIsRanked('');
                  setStartDate('');
                  setEndDate('');
                  setSelectedRegion('');
                  setSelectedWard('');
                  setSearchTerm('');
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white h-10 flex items-center justify-center"
                title={translate("clearFilters")}
              >
                <span className="font-bold text-rose-600">{translate("clearFiltersUpper")}</span>
              </button>
            </div>
          </div>
        )}
        {/* Status Chips — bên trong khung filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs font-semibold">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{translate("quickFilter")}</span>
          <button onClick={() => { setSelectedStatus(selectedStatus === 'COMPLETED' ? '' : 'COMPLETED'); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 border transition-all cursor-pointer ${selectedStatus === 'COMPLETED' ? 'bg-[#F3F4F1] text-[#4A4E4D] border-slate-400 font-bold shadow-xs' : 'bg-[#F3F4F1]/80 text-[#4A4E4D] border-transparent hover:border-slate-300'}`}>
            {recentlyFinishedLabel}
          </button>
          <button onClick={() => { setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? '' : 'IN_PROGRESS'); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 border transition-all cursor-pointer ${selectedStatus === 'IN_PROGRESS' ? 'bg-[#EBF5FF] text-[#1E56A0] border-blue-300 font-bold shadow-xs' : 'bg-[#EBF5FF]/80 text-[#1E56A0] border-transparent hover:border-blue-200'}`}>
            {translate("inProgress")}
          </button>
          <button onClick={() => { setSelectedStatus(selectedStatus === 'REGISTRATION_OPEN' ? '' : 'REGISTRATION_OPEN'); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 border transition-all cursor-pointer ${selectedStatus === 'REGISTRATION_OPEN' ? 'bg-[#EFF8E9] text-[#386629] border-emerald-300 font-bold shadow-xs' : 'bg-[#EFF8E9]/80 text-[#386629] border-transparent hover:border-emerald-200'}`}>
            {translate("registrationOpen")}
          </button>
          <button onClick={() => { setSelectedStatus(selectedStatus === 'UPCOMING' ? '' : 'UPCOMING'); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 border transition-all cursor-pointer ${selectedStatus === 'UPCOMING' ? 'bg-[#FFF5E6] text-[#995C00] border-amber-300 font-bold shadow-xs' : 'bg-[#FFF5E6]/80 text-[#995C00] border-transparent hover:border-amber-200'}`}>
            {translate("upcoming")}
          </button>
          <button onClick={() => { setSelectedStatus(selectedStatus === 'FINISHED' ? '' : 'FINISHED'); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 border transition-all cursor-pointer ${selectedStatus === 'FINISHED' ? 'bg-[#F1F5F9] text-[#64748B] border-slate-300 font-bold shadow-xs' : 'bg-[#F1F5F9]/80 text-[#64748B] border-transparent hover:border-slate-200'}`}>
            {translate("completed")}
          </button>
          {selectedStatus && (
            <button onClick={() => { setSelectedStatus(''); setPage(1); }}
              className="text-slate-400 font-bold text-xs hover:text-rose-500 transition-colors ml-1 cursor-pointer">
              ✕ {translate("clearActiveFilter")}
            </button>
          )}
        </div>
      </div>


      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-slate-500 font-medium">{translate("loadingAll")}</div>
      ) : tournaments.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-slate-500 font-medium">{translate("empty")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {tournaments.map(tournament => {
            const { startDay, endDay, startMonth, endMonth } = getParsedDates(tournament.startDate, tournament.endDate);
            const fullLocation = getTournamentLocationLabel(tournament) || translate("locationNotUpdated");
            const displayLocation = getTournamentShortLocation(tournament) || translate("locationNotUpdated");
            const registrationModeUi = getRegistrationModeUi(registrationTranslate, tournament.tournamentConfig?.registrationMode);

            return (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="bg-white rounded-lg border border-slate-200 shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Top: Large Image Banner */}
                <div className="relative aspect-[2.1/1] w-full bg-slate-100 overflow-hidden">
                  {tournament.bannerUrl ? (
                    <img
                      src={tournament.bannerUrl}
                      alt={tournament.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 ${isTournamentCompleted(tournament.status) ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100/90 border-b border-slate-100 group-hover:scale-103 transition-transform duration-500 flex items-center justify-center p-6">
                      <img
                        src={BRAND.assets.defaultTournamentLogo}
                        alt={`${BRAND.name} Logo`}
                        className="w-44 md:w-52 h-auto object-contain drop-shadow-sm"
                      />
                    </div>
                  )}

                  {/* Status Overlay (Top-Left) */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${getTournamentStatusClassName(tournament.status)}`}>
                      {isTournamentInProgress(tournament.status) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                      {getTournamentStatusLabel(tournament.status, { DRAFT: translate('statusDraftPlain'), PENDING_APPROVAL: translate('statusPendingApproval'), PENDING_DELETE: translate('statusPendingDelete'), UPCOMING: translate('upcoming'), REGISTRATION_OPEN: translate('registrationOpen'), REGISTRATION_CLOSED: translate('statusRegistrationClosed'), IN_PROGRESS: translate('inProgress'), ONGOING: translate('inProgress'), COMPLETED: translate('completed'), CANCELLED: translate('statusCancelled') })}
                      {isRecentlyCompletedTournament(tournament) && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-slate-900/75 px-2 py-0.5 text-[9px] font-bold text-white">
                          {recentlyFinishedLabel}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Location Overlay (Bottom-Left) */}
                  <div className="absolute bottom-3 left-3 z-10 max-w-[85%]">
                    <span 
                      className="bg-white/95 text-slate-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-slate-200 inline-flex items-center gap-1 truncate max-w-full"
                      title={fullLocation}
                    >
                      <span className="shrink-0">📍</span>
                      <span className="truncate">{displayLocation}</span>
                    </span>
                  </div>
                </div>

                {/* Bottom: Details Section */}
                <div className="p-5 flex gap-5 flex-grow">
                  {/* Left Column: Date Block */}
                  <div className="flex flex-col items-center justify-center shrink-0 border-r border-slate-100 pr-5 min-w-[70px]">
                    <div className="flex items-baseline gap-0.5 text-2xl font-bold text-slate-900 leading-none">
                      <span>{startDay}</span>
                      <span className="text-slate-350 font-normal text-lg mx-0.5">-</span>
                      <span>{endDay}</span>
                    </div>
                    <div className="flex gap-2.5 justify-center mt-1.5 text-[10px] font-bold text-slate-400">
                      <span>{startMonth}</span>
                      <span>/</span>
                      <span>{endMonth}</span>
                    </div>
                  </div>

                  {/* Right Column: Name & Category Block */}
                  <div className="flex flex-col justify-between flex-grow min-w-0">
                    <div>
                      {/* Organizer / Category Header */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold uppercase tracking-wider mb-1.5">
                        {(() => {
                          const logo = getSportLogo(tournament.category?.name);
                          return logo ? (
                            <img src={logo} alt={tournament.category?.name || ''} className="w-4 h-4 object-contain" />
                          ) : (
                            <span className="w-4.5 h-4.5 bg-slate-200 rounded-full flex items-center justify-center text-[9px] text-slate-600 font-bold">★</span>
                          );
                        })()}
                        <span className="text-slate-500">{tournament.category?.name || 'MULTISPORT'}</span>

                        <span className="text-slate-300">•</span>

                        {/* Ranked or Unranked Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          tournament.isRanked
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {tournament.isRanked ? translate('rankedBadgeLabel') : translate('recreationalBadgeLabel')}
                        </span>

                        {/* Series / Parent Badge */}
                        {tournament.parentId && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-bold border border-blue-200">
                              {translate("seriesLabel")}
                            </span>
                          </>
                        )}

                      </div>

                      {/* Title */}
                      <h3 className="text-sm md:text-base font-bold text-slate-900 uppercase leading-snug line-clamp-2">
                        {tournament.name}
                      </h3>
                    </div>

                    {/* Metadata summary */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] text-slate-500 font-bold mt-2.5 uppercase tracking-wider">
                      <span className="text-blue-600 font-bold">
                        {tournament.entryFee ? formatCurrency(tournament.entryFee) : translate("freeEntryFee")}
                      </span>
                      {tournament.divisions && tournament.divisions.length > 0 ? (
                        <>
                          <span className="text-slate-300">•</span>
                          <div className="flex flex-wrap gap-1">
                            {tournament.divisions.map((div) => {
                              const label = getFormatLabel(div.matchType, div.genderRestriction);
                              return (
                                <span key={div.id} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-650 text-[9px] border border-slate-200 font-bold">
                                  {label} ({div._count?.participants || 0}/{div.maxParticipants || '-'})
                                </span>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            {translate("registeredCount", { count: tournament._count?.participants || 0, max: tournament.maxParticipants || '-' })} {translate("teamSuffix")}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-650 text-[9px] border border-slate-200 font-bold">
                            {getFormatLabel(tournament.matchType, tournament.genderRestriction)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`min-w-[44px] min-h-[44px] border rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                page === i + 1
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-indigo-600/15'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
}

