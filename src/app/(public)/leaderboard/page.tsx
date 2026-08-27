"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { categoriesApi, Category } from "@/features/categories/api";
import { rankingsApi, type FootballTeamRanking, PlayerRanking } from "@/features/rankings/api";
import { regionsApi, Region } from "@/features/regions/api";
import { usersApi } from "@/features/users/api";
import { getCanonicalTierName, getEloFormatLabel, getMostProminentRank, getRankTierTranslationKey, isPublicRankingEligible } from "@/features/rankings/elo-display";
import { buildLeaderboardStandingSlots, isLeaderboardPlaceholder } from "@/features/rankings/leaderboard-slots";

import { getRankBorderColor } from "@/components/ui/RankAvatar";
import { getStandardRankStyles } from "@/utils/rank-style";
import { ChevronDown, Info, Loader2, Search } from "lucide-react";

import { useUserProfileModalStore } from "@/lib/zustand/userProfileModalStore";
import { useAuthStore } from "@/lib/zustand/authStore";

interface LeaderboardSearchResult {
    id: string;
    fullName?: string;
    avatarUrl?: string | null;
    email?: string;
    eloPoints: number | null;
    categoryName?: string;
    matchType?: PlayerRanking['matchType'];
    genderRestriction?: PlayerRanking['genderRestriction'];
}

function StandingElo({ ranking, size = 'sm' }: { ranking: PlayerRanking; size?: 'sm' | 'md' }) {
  return (
    <span className={`${size === 'md' ? 'text-base' : 'text-sm'} font-black text-slate-900`}>
      {ranking.eloPoints} ELO
    </span>
  );
}

type RankingMember = NonNullable<PlayerRanking['user']>;

function getRankingMembers(ranking: PlayerRanking | undefined): RankingMember[] {
  if (!ranking) return [];
  if (ranking.user1 || ranking.user2) {
    return [ranking.user1, ranking.user2].filter((member): member is RankingMember => Boolean(member));
  }
  return ranking.user ? [ranking.user] : [];
}

function isPairRanking(ranking: PlayerRanking | undefined): boolean {
  return getRankingMembers(ranking).length > 1;
}

function getPrimaryRankingMember(ranking: PlayerRanking | undefined): RankingMember | undefined {
  return getRankingMembers(ranking)[0];
}

function getRankingDisplayName(ranking: PlayerRanking | undefined, fallback: string): string {
  const members = getRankingMembers(ranking);
  return members.length > 0 ? members.map((member) => member.fullName || fallback).join(' / ') : fallback;
}

function RankingMembers({ ranking, size = 'md' }: { ranking: PlayerRanking; size?: 'sm' | 'md' }) {
  const members = getRankingMembers(ranking);
  const dimension = size === 'md' ? 'h-20 w-20' : 'h-8 w-8';
  const borderColor = getStandingBorderColor(ranking, '#cbd5e1');
  return (
    <div className="flex items-center -space-x-4">
      {members.map((member, index) => (
        <div
          key={member.id}
          className={`${dimension} relative z-20 overflow-hidden rounded-full border-[3px] bg-slate-100 shadow-sm ${index > 0 ? 'z-10' : ''}`}
          style={{
            borderColor: borderColor,
            boxShadow: `0 0 14px -2px ${borderColor}80`,
          }}
        >
          {member.avatarUrl ? <Image src={member.avatarUrl} alt={member.fullName || 'Ranking member'} fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">{member.fullName?.slice(0, 2) || '?'}</span>}
        </div>
      ))}
    </div>
  );
}


function getStandingBorderColor(ranking: PlayerRanking | undefined, fallback: string): string {
  if (!ranking) return fallback;
  return getRankBorderColor(
    ranking.eloPoints,
    getCanonicalTierName(ranking),
    ranking.matchesPlayed,
    ranking.categoryName,
  );
}

function getLeaderboardFormatLabel(
  ranking: Pick<PlayerRanking, 'matchType' | 'genderRestriction'> | undefined,
  translate: (key: string) => string,
): string {
  return getEloFormatLabel(ranking?.matchType, ranking?.genderRestriction, {
    singlesMale: translate('formatSinglesMale'),
    singlesFemale: translate('formatSinglesFemale'),
    singlesOpen: translate('formatSinglesOpen'),
    doublesMale: translate('formatDoublesMale'),
    doublesFemale: translate('formatDoublesFemale'),
    doublesOpen: translate('formatDoublesOpen'),
    mixedDoubles: translate('formatMixedDoubles'),
    unknown: translate('formatUnknown'),
  });
}

const normalizeGenderFilter = (gender: string | null | undefined): 'MALE' | 'FEMALE' => {
  return gender?.trim().toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE';
};

export default function LeaderboardPage() {
    const t = useTranslations("Leaderboard");
  const eloTranslate = useTranslations('EloDisplay');
  const { user } = useAuthStore();

    const getCategoryLabel = (category: Category) => {
    switch (category.slug) {
      case "badminton": return t("sportBadminton");
      case "table_tennis": return t("sportTableTennis");
      case "pickleball": return t("sportPickleball");
      case "tennis": return t("sportTennis");
      case "football": return t("sportFootball");
      default: return category.name;
    }
  };



    const { openUserProfile } = useUserProfileModalStore();
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [rankings, setRankings] = useState<PlayerRanking[]>([]);
    const [footballRankings, setFootballRankings] = useState<FootballTeamRanking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rankingError, setRankingError] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);

    const [provinces, setProvinces] = useState<Region[]>([]);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
    const [selectedMatchType, setSelectedMatchType] = useState<string>('SINGLES');
    const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('MALE');

    // ELO User Search States
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<LeaderboardSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const activeCategory = categories.find((category) => category.id === activeCategoryId);
    const isFootballCategory = activeCategory?.slug === 'football';

    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) {
            setSearchError(t("searchTooShort"));
            return;
        }
        setSearchLoading(true);
        setSearchError("");
        setSearchResult([]);
        try {
            const res = await usersApi.searchUsersByQuery(trimmed);
            const foundUsers = res || [];
            if (foundUsers.length === 0) {
                setSearchError(t("userNotFound"));
                return;
            }
            
            const enriched = await Promise.all(
                foundUsers.map(async (u) => {
                    try {
                        const rankRes = await rankingsApi.getUserRankings(u.id);
                        const data = rankRes;
                        const publicRanks = data.publicRanks || [];
                        const matchRank = publicRanks.find((r) =>
                            r.categoryId === activeCategoryId &&
                            (!selectedMatchType || r.matchType === selectedMatchType) &&
                            (!selectedGenderFilter || r.genderRestriction === selectedGenderFilter)
                        );
                        return {
                            ...u,
                            eloPoints: matchRank?.eloPoints ?? null,
                            categoryName: categories.find((category) => category.id === activeCategoryId)?.name,
                            matchType: matchRank?.matchType,
                            genderRestriction: matchRank?.genderRestriction,
                        };
                    } catch {
                        return {
                            ...u,
                            eloPoints: null,
                            categoryName: categories.find((category) => category.id === activeCategoryId)?.name,
                        };
                    }
                })
            );
            setSearchResult(enriched);
        } catch (err) {
            console.error(err);
            setSearchError(t("searchFailed"));
        } finally {
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                const catsRes = await categoriesApi.getCategories();
                const apiCategories = (catsRes && catsRes.data && catsRes.data.length > 0) ? catsRes.data : [];
                
                const FALLBACK_CATEGORIES: Category[] = [
                  { id: 'cat-badminton', name: t('sportBadminton'), slug: 'badminton', isActive: true },
                  { id: 'cat-table-tennis', name: t('sportTableTennis'), slug: 'table_tennis', isActive: true },
                  { id: 'cat-pickleball', name: t('sportPickleball'), slug: 'pickleball', isActive: true },
                  { id: 'cat-tennis', name: t('sportTennis'), slug: 'tennis', isActive: true },
                  { id: 'cat-football', name: t('sportFootball'), slug: 'football', isActive: true },
                ];

                const merged: Category[] = [...apiCategories];
                FALLBACK_CATEGORIES.forEach(fallbackCat => {
                  const exists = apiCategories.some(apiCat => 
                    apiCat.slug === fallbackCat.slug || 
                    apiCat.name.toLowerCase() === fallbackCat.name.toLowerCase()
                  );
                  if (!exists) {
                    merged.push(fallbackCat);
                  }
                });

                const activeCats = merged.filter((cat) => {
                  const catKey = cat.slug || cat.id;
                  if (typeof window !== 'undefined') {
                    const localOverride = localStorage.getItem(`sport_active_${catKey}`);
                    if (localOverride === 'false') return false;
                    if (localOverride === 'true') return true;
                  }
                  return cat.isActive !== false && (cat.categoryConfig as Record<string, unknown> | null | undefined)?.isActive !== false;
                });

                const profileResponse = user?.id
                  ? await rankingsApi.getUserRankings(user.id).catch(() => null)
                  : null;
                const profileRanks = profileResponse?.publicRanks ?? [];
                const prominentRank = getMostProminentRank(profileRanks.filter(isPublicRankingEligible));
                const pickleballCategory = activeCats.find((category) => category.slug === 'pickleball');
                const profileCategory = prominentRank
                  ? activeCats.find((category) => category.id === prominentRank.categoryId)
                  : undefined;
                const defaultCategory = profileCategory ?? pickleballCategory ?? activeCats[0];

                if (cancelled) return;
                setCategories(activeCats);
                setActiveCategoryId(defaultCategory?.id ?? null);
                const profileGender = normalizeGenderFilter(user?.gender);
                const defaultMatchType = prominentRank?.matchType ?? 'SINGLES';
                setSelectedMatchType(defaultMatchType);
                setSelectedGenderFilter(
                  defaultMatchType === 'MIXED_DOUBLES'
                    ? 'MIXED'
                    : profileGender,
                );

                const res = await regionsApi.getProvinces();
                const provList = (Array.isArray(res) ? res : (res as { data?: Region[] }).data) || [];
                if (!cancelled) setProvinces(provList);
            } catch (error) {
                console.error("Failed to initialize leaderboard data", error);
            }
        };
        void init();
        return () => {
          cancelled = true;
        };
    }, [user?.id, t]);

    useEffect(() => {
        if (!activeCategoryId) return;
        
        const fetchRankings = async () => {
            setIsLoading(true);
            setRankingError(false);
            try {
                if (isFootballCategory) {
                    const res = await rankingsApi.getFootballTeamRankings({
                        categoryId: activeCategoryId,
                        communityId: undefined,
                        limit: 100,
                    });
                    setFootballRankings(Array.isArray(res.data) ? res.data : []);
                    setRankings([]);
                    return;
                }
                setFootballRankings([]);
                const params: Record<string, unknown> = {
                    categoryId: activeCategoryId,
                    scope: 'PUBLIC',
                    limit: 100,
                };
                if (selectedMatchType) {
                    params.matchType = selectedMatchType;
                }
                if (selectedGenderFilter) {
                    params.genderRestriction = selectedGenderFilter;
                }
                if (selectedProvinceCode) {
                    params.provinceCode = selectedProvinceCode;
                }
                const res = await rankingsApi.getRankings(params);
                setRankings(res.data || []);
            } catch (error) {
                console.error("Failed to fetch rankings", error);
                setRankings([]);
                setFootballRankings([]);
                setRankingError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRankings();
    }, [activeCategoryId, isFootballCategory, selectedProvinceCode, selectedMatchType, selectedGenderFilter, reloadNonce]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            {/* Sub-Filters: Sport Category, Match Type, Gender, Province & ELO Lookup */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Sport Categories */}
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategoryId(cat.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    activeCategoryId === cat.id
                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {getCategoryLabel(cat)}
                            </button>
                        ))}
                    </div>

                    {/* Compact ELO Player Search */}
                    <div className="relative w-full sm:w-auto">
                        <form onSubmit={handleSearchUser} className="flex items-center gap-1.5 w-full sm:w-[260px]">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder={t("eloLookupPlaceholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 placeholder-slate-400"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>
                            <button
                                type="submit"
                                disabled={searchLoading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                            >
                                {searchLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    t("eloLookupButton")
                                )}
                            </button>
                        </form>

                        {/* Search Popup Dropdown */}
                        {searchError && (
                            <div className="absolute right-0 top-full mt-1.5 z-30 bg-white p-2.5 rounded-lg shadow-lg border border-rose-200 text-rose-500 text-[11px] font-bold w-full sm:w-[280px]">
                                {searchError}
                            </div>
                        )}
                        {searchResult.length > 0 && (
                            <div className="absolute right-0 top-full mt-1.5 z-30 bg-white p-2.5 rounded-xl shadow-xl border border-slate-200 w-full sm:w-[320px] max-h-[320px] overflow-y-auto space-y-1.5">
                                <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-700">{t("eloLookupTitle")}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setSearchResult([])}
                                        className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                    >
                                        {t('closeLookup')}
                                    </button>
                                </div>
                                {searchResult.map((u) => (
                                    <button
                                        type="button"
                                        key={u.id}
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            openUserProfile(
                                                {
                                                    id: u.id,
                                                    fullName: u.fullName || t('playerFallback'),
                                                    avatarUrl: u.avatarUrl,
                                                },
                                                rect,
                                            );
                                        }}
                                        className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group text-left"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full relative overflow-hidden bg-slate-200 shrink-0 border-2 border-slate-200"
                                        >
                                            {u.avatarUrl ? (
                                                <Image src={u.avatarUrl} alt="Avatar" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-[11px] uppercase">
                                                    {u.fullName?.substring(0, 2) || t("initialsFallback")}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                {u.fullName || t('playerFallback')}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium truncate">{u.email}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className="max-w-36 truncate text-[9px] font-bold uppercase text-slate-400">{u.categoryName || t('sportFallback')} · {getLeaderboardFormatLabel(u, t)}</div>
                                            <div className="text-sm font-black text-slate-900">{u.eloPoints === null ? '—' : `${u.eloPoints} ELO`}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Filters Row: Match Type, Gender & Province */}
                <div className={`flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 ${isFootballCategory ? 'hidden' : ''}`}>
                    {/* Match Type Selector */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px] sm:flex-initial">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('typeLabel')}:</label>
                        <div className="relative w-full sm:w-[130px]">
                            <select
                                value={selectedMatchType}
                                onChange={(e) => {
                                    const matchType = e.target.value;
                                    setSelectedMatchType(matchType);
                                    if (matchType === 'MIXED_DOUBLES') {
                                      setSelectedGenderFilter('MIXED');
                                    }
                                }}
                                className="w-full pl-2.5 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                            >
                                <option value="">{t("allMatchTypes")}</option>
                                <option value="SINGLES">{t("singles")}</option>
                                <option value="DOUBLES">{t("doubles")}</option>
                                <option value="MIXED_DOUBLES">{t("mixedDoubles")}</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Gender Filter - Only show for non-MIXED_DOUBLES */}
                    {selectedMatchType && selectedMatchType !== 'MIXED_DOUBLES' && (
                        <div className="flex items-center gap-1.5 flex-1 min-w-[120px] sm:flex-initial">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t("gender")}:</label>
                            <div className="relative w-full sm:w-[110px]">
                                <select
                                    value={selectedGenderFilter}
                                    onChange={(e) => setSelectedGenderFilter(e.target.value)}
                                    className="w-full pl-2.5 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                                >
                                    <option value="">{t("allGenders")}</option>
                                    <option value="MALE">{t("male")}</option>
                                    <option value="FEMALE">{t("female")}</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Province Selector */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[180px] sm:flex-initial">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t("region")}:</label>
                        <div className="relative w-full sm:w-[180px]">
                            <select
                                value={selectedProvinceCode}
                                onChange={(e) => setSelectedProvinceCode(e.target.value)}
                                className="w-full pl-2.5 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                            >
                                <option value="">{t("allProvinces")}</option>
                                {provinces.map(p => (
                                    <option key={p.code} value={p.code}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Podium & List */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                    {isFootballCategory ? (
                        <FootballTeamRankingTable rankings={footballRankings} />
                    ) : isLoading ? (
                        <div className="bg-white rounded-lg border border-slate-200 p-16 flex flex-col items-center justify-center min-h-[300px]">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                            <p className="text-slate-500 font-medium text-sm">{t("loading")}</p>
                        </div>
                    ) : rankingError ? (
                        <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-10 md:p-14 text-center" role="alert">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                                <Info className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">{t('loadFailedTitle')}</h2>
                            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{t('loadFailedDescription')}</p>
                            <button
                                type="button"
                                onClick={() => setReloadNonce((value) => value + 1)}
                                className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                            >
                                {t('retry')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Top 3 Podium Stage (Light Theme). Empty slots remain visible during cold start. */}
                            <div className="bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-white rounded-xl border border-blue-100 shadow-sm p-6 md:p-8 text-slate-800 relative overflow-hidden mb-8">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/10 via-sky-50/5 to-transparent pointer-events-none" />
                                
                                <div className="relative z-10 text-center mb-8">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-blue-600 bg-blue-50/80 px-3 py-1.5 rounded-full border border-blue-100">
                                        ✨ {t('hallOfFame')} ✨
                                    </span>
                                    <h2 className="text-xl md:text-2xl font-bold mt-3 text-slate-900 tracking-tight">
                                                                                {isFootballCategory ? t('teamHeader') : t('topPlayers')}

                                    </h2>
                                </div>

                                {/* Podium Top 3 */}
                                <div className="relative z-10 flex flex-col md:flex-row items-end justify-center gap-6 md:gap-4 lg:gap-8 max-w-4xl mx-auto pb-2 mt-10 md:mt-14">
                                    
                                    {/* Rank 2 - Silver (Left) */}
                                    <div className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center group/podium">
                                        <button 
                                            type="button"
                                            disabled={!getPrimaryRankingMember(rankings[1])?.id}
                                            onClick={(e) => {
                                                const member = getPrimaryRankingMember(rankings[1]);
                                                if (!member?.id) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                openUserProfile(
                                                    {
                                                        id: member.id,
                                                        fullName: getRankingDisplayName(rankings[1], t('athleteFallback')),
                                                        avatarUrl: member.avatarUrl,
                                                    },
                                                    rect,
                                                );
                                            }}
                                            className="flex flex-col items-center hover:opacity-95 transition-opacity cursor-pointer"
                                        >
                                            <div className="relative mb-4 transition-transform duration-300 group-hover:scale-105">
                                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-slate-100 text-slate-700 font-bold text-[10px] px-3.5 py-1 rounded-full border border-slate-300/80 shadow-xs whitespace-nowrap">
                                                    #2 SECOND
                                                </div>
                                                
                                                {isPairRanking(rankings[1]) ? <RankingMembers ranking={rankings[1]} /> : (
                                                    <div
                                                        className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] bg-white shadow-md transition-all"
                                                        style={{
                                                            borderColor: getStandingBorderColor(rankings[1], '#cbd5e1'),
                                                            boxShadow: rankings[1] ? `0 0 16px -2px ${getStandingBorderColor(rankings[1], '#cbd5e1')}90` : undefined,
                                                        }}
                                                    >
                                                        {getPrimaryRankingMember(rankings[1])?.avatarUrl ? <Image src={getPrimaryRankingMember(rankings[1])!.avatarUrl!} alt="Rank 2" fill className="object-cover rounded-full" /> : <span className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-500">?</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-center text-sm mb-1 truncate max-w-[200px] group-hover/podium:text-blue-600 transition-colors">
                                                                                                {getRankingDisplayName(rankings[1], t("waiting"))}

                                            </h3>
                                                {isPairRanking(rankings[1]) && rankings[1] && (
                                                <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md mb-1.5 border border-slate-200">
                                                    {t('teammate')}
                                                </span>
                                            )}
                                            {rankings[1] ? (
                                                <StandingElo ranking={rankings[1]} />
                                            ) : (
                                                <div className="text-[10px] text-[#64748B] font-bold mb-3">--- ELO</div>
                                            )}
                                        </button>
                                        
                                        {/* Stand 2 (Silver) */}
                                        <div className="w-full h-36 bg-[#F1F5F9] rounded-t-2xl border-2 border-[#94A3B8]/70 flex flex-col items-center justify-center shadow-xs">
                                            <span className="text-3xl font-black text-[#64748B] select-none">II</span>
                                            <span className="text-[#64748B] text-[10px] font-bold mt-2">
                                                {rankings[1] ? t('winsSummary', { won: rankings[1].matchesWon, played: rankings[1].matchesPlayed }) : t('winsSummaryEmpty')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rank 1 - Champion Gold (Center) */}
                                    <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center group/podium relative -translate-y-2 md:-translate-y-4">
                                        <button 
                                            type="button"
                                            disabled={!getPrimaryRankingMember(rankings[0])?.id}
                                            onClick={(e) => {
                                                const member = getPrimaryRankingMember(rankings[0]);
                                                if (!member?.id) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                openUserProfile(
                                                    {
                                                        id: member.id,
                                                        fullName: getRankingDisplayName(rankings[0], t('athleteFallback')),
                                                        avatarUrl: member.avatarUrl,
                                                    },
                                                    rect,
                                                );
                                            }}
                                            className="flex flex-col items-center hover:opacity-95 transition-opacity cursor-pointer"
                                        >
                                            <div className="relative mb-5 transition-transform duration-300 group-hover:scale-105">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-400 text-amber-950 font-extrabold text-[10px] px-4 py-1 rounded-full shadow-sm flex items-center gap-1 border border-amber-300 whitespace-nowrap animate-bounce">
                                                    👑 {t('champion')}
                                                </div>
                                                
                                                {isPairRanking(rankings[0]) ? <RankingMembers ranking={rankings[0]} /> : (
                                                    <div
                                                        className="relative h-24 w-24 overflow-hidden rounded-full border-4 bg-white shadow-lg transition-all"
                                                        style={{
                                                            borderColor: getStandingBorderColor(rankings[0], '#fbbf24'),
                                                            boxShadow: rankings[0] ? `0 0 22px -2px ${getStandingBorderColor(rankings[0], '#fbbf24')}B0` : undefined,
                                                        }}
                                                    >
                                                        {getPrimaryRankingMember(rankings[0])?.avatarUrl ? <Image src={getPrimaryRankingMember(rankings[0])!.avatarUrl!} alt="Rank 1" fill className="object-cover rounded-full" /> : <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-500">?</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-amber-600 text-center text-base mb-1 truncate max-w-[220px] group-hover/podium:text-amber-700 transition-colors">
                                                                                                {getRankingDisplayName(rankings[0], t("waiting"))}

                                            </h3>
                                            {isPairRanking(rankings[0]) && rankings[0] && (
                                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md mb-1.5 border border-amber-200">
                                                    {t('teammate')}
                                                </span>
                                            )}
                                            {rankings[0] ? (
                                                <StandingElo ranking={rankings[0]} size="md" />
                                            ) : (
                                                <div className="text-[10px] text-amber-500 font-bold mb-3">--- ELO</div>
                                            )}
                                        </button>
                                        
                                        {/* Stand 1 (Gold) */}
                                        <div className="w-full h-44 bg-amber-50/70 rounded-t-2xl border-2 border-amber-300/80 flex flex-col items-center justify-center shadow-xs relative overflow-hidden">
                                            <span className="text-4xl font-black text-amber-400 select-none">I</span>
                                            <span className="text-amber-600 text-xs font-bold mt-2">
                                                {rankings[0] ? t('winsSummary', { won: rankings[0].matchesWon, played: rankings[0].matchesPlayed }) : t('winsSummaryEmpty')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rank 3 - Bronze (Right) */}
                                    <div className="w-full md:w-1/3 order-3 md:order-3 flex flex-col items-center group/podium">
                                        <button 
                                            type="button"
                                            disabled={!getPrimaryRankingMember(rankings[2])?.id}
                                            onClick={(e) => {
                                                const member = getPrimaryRankingMember(rankings[2]);
                                                if (!member?.id) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                openUserProfile(
                                                    {
                                                        id: member.id,
                                                        fullName: getRankingDisplayName(rankings[2], t('athleteFallback')),
                                                        avatarUrl: member.avatarUrl,
                                                    },
                                                    rect,
                                                );
                                            }}
                                            className="flex flex-col items-center hover:opacity-95 transition-opacity cursor-pointer"
                                        >
                                            <div className="relative mb-4 transition-transform duration-300 group-hover:scale-105">
                                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-amber-50 text-[#C2410C] font-bold text-[10px] px-3.5 py-1 rounded-full border border-amber-200 shadow-xs whitespace-nowrap">
                                                    #3 THIRD
                                                </div>
                                                
                                                {isPairRanking(rankings[2]) ? <RankingMembers ranking={rankings[2]} /> : (
                                                    <div
                                                        className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] bg-white shadow-md transition-all"
                                                        style={{
                                                            borderColor: getStandingBorderColor(rankings[2], '#cbd5e1'),
                                                            boxShadow: rankings[2] ? `0 0 16px -2px ${getStandingBorderColor(rankings[2], '#cbd5e1')}90` : undefined,
                                                        }}
                                                    >
                                                        {getPrimaryRankingMember(rankings[2])?.avatarUrl ? <Image src={getPrimaryRankingMember(rankings[2])!.avatarUrl!} alt="Rank 3" fill className="object-cover rounded-full" /> : <span className="flex h-full w-full items-center justify-center text-xl font-bold text-orange-700">?</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-[#C2410C] text-center text-sm mb-1 truncate max-w-[200px] group-hover/podium:text-amber-800 transition-colors">
                                                                                                {getRankingDisplayName(rankings[2], t("waiting"))}

                                            </h3>
                                            {isPairRanking(rankings[2]) && rankings[2] && (
                                                <span className="text-[10px] text-[#C2410C] font-bold bg-amber-50 px-2 py-0.5 rounded-md mb-1.5 border border-amber-200">
                                                    {t('teammate')}
                                                </span>
                                            )}
                                            {rankings[2] ? (
                                                <StandingElo ranking={rankings[2]} />
                                            ) : (
                                                <div className="text-[10px] text-[#C2410C] font-bold mb-3">--- ELO</div>
                                            )}
                                        </button>
                                        
                                        {/* Stand 3 (Bronze) */}
                                        <div className="w-full h-32 bg-[#FFF7ED] rounded-t-2xl border-2 border-[#C2410C]/60 flex flex-col items-center justify-center shadow-xs">
                                            <span className="text-3xl font-black text-[#C2410C] select-none">III</span>
                                            <span className="text-[#C2410C] text-[10px] font-bold mt-2">
                                                {rankings[2] ? t('winsSummary', { won: rankings[2].matchesWon, played: rankings[2].matchesPlayed }) : t('winsSummaryEmpty')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ranks 4-10 Cards/Stands (Light Theme) */}
                                <div className="mt-8 pt-6 border-t border-blue-100/50">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                        {[3, 4, 5, 6, 7, 8, 9].map((idx) => {
                                            const player = rankings[idx];
                                            const rankNum = idx + 1;
                                            return (
                                                <button 
                                                    type="button"
                                                    key={idx} 
                                                    disabled={!getPrimaryRankingMember(player)?.id}
                                                    onClick={(e) => {
                                                        const member = getPrimaryRankingMember(player);
                                                        if (!member?.id) return;
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        openUserProfile(
                                                            {
                                                                id: member.id,
                                                                fullName: getRankingDisplayName(player, t('athleteFallback')),
                                                                avatarUrl: member.avatarUrl,
                                                            },
                                                            rect,
                                                        );
                                                    }}
                                                    className="bg-white/80 backdrop-blur-xs rounded-lg border border-blue-100/60 p-3 flex flex-col items-center justify-between shadow-xs transition-all duration-300 hover:scale-105 hover:shadow-sm hover:border-blue-300 hover:text-blue-650 cursor-pointer"
                                                >
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-full mb-2">
                                                        #{rankNum}
                                                    </span>
                                                    
                                                    {isPairRanking(player) ? <RankingMembers ranking={player} size="sm" /> : (
                                                        <div
                                                            className="relative mb-2 h-12 w-12 overflow-hidden rounded-full border-2 bg-slate-50 shadow-xs transition-all"
                                                            style={{
                                                                borderColor: getStandingBorderColor(player, '#e2e8f0'),
                                                                boxShadow: player ? `0 0 10px -2px ${getStandingBorderColor(player, '#e2e8f0')}70` : undefined,
                                                            }}
                                                        >
                                                            {getPrimaryRankingMember(player)?.avatarUrl ? <Image src={getPrimaryRankingMember(player)!.avatarUrl!} alt={`Rank ${rankNum}`} fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{player ? (getPrimaryRankingMember(player)?.fullName?.slice(0, 2) || t("initialsFallback")) : '?'}</span>}
                                                        </div>
                                                    )}
                                                    
                                                    <span className="font-bold text-slate-700 text-xs text-center truncate w-full mb-1">
                                                                                                                {getRankingDisplayName(player, t("waiting"))}

                                                    </span>
                                                    {player ? (
                                                        <StandingElo ranking={player} />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold">---</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Remaining public standing slots: ranks 11–20 */}
                            <RestRankingsTable
                                rankings={rankings}
                                categoryId={activeCategoryId ?? ''}
                                selectedMatchType={selectedMatchType}
                            />
                        </>
                    )}
                </div>

                {/* Right Column: Sidebar Tier Breakdown & Search */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="sticky top-[calc(var(--app-header-height)+3rem)] flex flex-col gap-6 lg:top-[calc(var(--app-header-height)+4rem)]">
                        {/* Tier Breakdown Card */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const modal = document.getElementById('eloRulesModal') as HTMLDialogElement | null;
                                                if (modal) modal.showModal();
                                            }}
                                            className="p-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                                            title={t("viewEloRules")}
                                        >
                                            <Info className="w-4 h-4" />
                                        </button>
                                        {t("eloSystemTitle")}
                                    </h3>
                                    <p className="text-slate-500 text-[11px] leading-relaxed">{t("eloSystemDescription")}</p>
                                </div>
                            </div>

                            {/* Modal Quy tắc ELO */}
                            <dialog id="eloRulesModal" className="m-auto rounded-2xl p-0 backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm border border-slate-200 shadow-2xl max-w-lg w-full outline-none fixed inset-0">
                                <div className="bg-white p-6 space-y-4">
                                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                            <Info className="w-5 h-5 text-blue-600" />
                                            {t('eloRulesTitle')}
                                        </h3>
                                        <form method="dialog">
                                            <button className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
                                        </form>
                                    </div>
                                    
                                    <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto">
                                        <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                                            <h4 className="font-bold text-blue-900 mb-1">{t('eloRule1Title')}</h4>
                                            <p className="text-slate-600">{t('eloRule1Body')}</p>
                                        </div>

                                        <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                                            <h4 className="font-bold text-emerald-900 mb-1">{t('eloRule2Title')}</h4>
                                            <p className="text-slate-600">{t('eloRule2Body')}</p>
                                        </div>

                                        <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-100">
                                            <h4 className="font-bold text-amber-900 mb-1">{t('eloRule3Title')}</h4>
                                            <p className="text-slate-600">{t('eloRule3Body')}</p>
                                        </div>

                                        <div className="bg-rose-50/70 p-3 rounded-lg border border-rose-100">
                                            <h4 className="font-bold text-rose-900 mb-1">{t('eloRule4Title')}</h4>
                                            <p className="text-slate-600">{t('eloRule4Body1')}</p>
                                            <p className="text-slate-600">{t('eloRule4Body2')}</p>
                                            <p className="text-slate-600">{t('eloRule4Body3')}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <form method="dialog">
                                            <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 cursor-pointer">{t('eloRulesGotIt')}</button>
                                        </form>
                                    </div>
                                </div>
                            </dialog>
                            <div className="flex flex-col gap-2">
                                {(() => {
                                  const TIER_ROW_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                                    'Tier S': { bg: 'bg-[#FEF3C7]', border: 'border-amber-300', text: 'text-[#92400E]', badge: 'bg-[#D97706] text-white' },
                                    'High Tier A': { bg: 'bg-[#F8C4B4]', border: 'border-rose-300', text: 'text-[#991B1B]', badge: 'bg-[#DC2626] text-white' },
                                    'Low Tier A': { bg: 'bg-[#FBE8E0]', border: 'border-rose-200', text: 'text-[#B91C1C]', badge: 'bg-[#EF4444] text-white' },
                                    'High Tier B': { bg: 'bg-[#BFDBFE]', border: 'border-blue-300', text: 'text-[#1E40AF]', badge: 'bg-[#2563EB] text-white' },
                                    'Low Tier B': { bg: 'bg-[#EFF6FF]', border: 'border-blue-200', text: 'text-[#1D4ED8]', badge: 'bg-[#3B82F6] text-white' },
                                    'High Tier C': { bg: 'bg-[#A7F3D0]', border: 'border-emerald-300', text: 'text-[#065F46]', badge: 'bg-[#059669] text-white' },
                                    'Low Tier C': { bg: 'bg-[#ECFDF5]', border: 'border-emerald-200', text: 'text-[#047857]', badge: 'bg-[#10B981] text-white' },
                                    'High Tier D': { bg: 'bg-[#E2E8F0]', border: 'border-slate-300', text: 'text-[#1E293B]', badge: 'bg-[#475569] text-white' },
                                    'Low Tier D': { bg: 'bg-[#F5F5F4]', border: 'border-stone-300', text: 'text-[#44403C]', badge: 'bg-[#78716C] text-white' },
                                    'Pro': { bg: 'bg-[#FEF3C7]', border: 'border-amber-300', text: 'text-[#92400E]', badge: 'bg-[#D97706] text-white' },
                                    'Advanced': { bg: 'bg-[#ECFDF5]', border: 'border-emerald-200', text: 'text-[#047857]', badge: 'bg-[#10B981] text-white' },
                                    'Intermediate': { bg: 'bg-[#EFF6FF]', border: 'border-blue-200', text: 'text-[#1D4ED8]', badge: 'bg-[#3B82F6] text-white' },
                                    'Beginner': { bg: 'bg-[#F5F5F4]', border: 'border-stone-300', text: 'text-[#44403C]', badge: 'bg-[#78716C] text-white' },
                                  };

                                  return [...getStandardRankStyles()].reverse().map((tier) => {
                                    const tierKey = getRankTierTranslationKey(tier.name);
                                    const tierLabel = tierKey ? eloTranslate(tierKey) : tier.name;
                                    const rangeLabel = tier.maxElo === null
                                      ? `${tier.minElo}+ ELO`
                                      : `${tier.minElo} - ${tier.maxElo} ELO`;
                                    const style = TIER_ROW_STYLES[tier.name] || {
                                      bg: 'bg-slate-50',
                                      border: 'border-slate-200',
                                      text: 'text-slate-700',
                                      badge: tier.badgeClass,
                                    };
                                    return (
                                      <div key={tier.name} className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${style.bg} ${style.border}`}>
                                        <span className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase shadow-xs ${style.badge}`}>{tierLabel}</span>
                                        <span className={`text-right text-xs font-bold ${style.text}`}>{rangeLabel}</span>
                                      </div>
                                    );
                                  });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FootballTeamRankingTable({ rankings }: { rankings: FootballTeamRanking[] }) {
  const t = useTranslations("Leaderboard");
  if (rankings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{t('noEligibleRanksTitle')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{t('noEligibleRanksDescription')}</p>
      </div>
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">{t('teamHeader')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('footballEloTeamDescription')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[680px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">{t('rankHeader')}</th>
              <th className="px-5 py-3">{t('teamHeader')}</th>
              <th className="px-5 py-3">{t('eloRank')}</th>
              <th className="px-5 py-3">{t('matches')}</th>
              <th className="px-5 py-3">{t('wins')}</th>
              <th className="px-5 py-3 text-right">{t('winRate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.map((team, index) => {
              const winRate = team.matchesPlayed > 0 ? Math.round((team.matchesWon / team.matchesPlayed) * 100) : 0;
              return (
                <tr key={team.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 font-bold text-slate-400">#{index + 1}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {team.logoUrl ? <Image src={team.logoUrl} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">{team.teamName.slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <span className="font-bold text-slate-900">{team.teamName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="font-black text-slate-900">{team.eloPoints} ELO</div></td>
                  <td className="px-5 py-4 text-slate-700">{team.matchesPlayed}</td>
                  <td className="px-5 py-4 text-slate-700">{team.matchesWon}</td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-700">{winRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RestRankingsTable({
  rankings,
  categoryId,
  selectedMatchType,
}: {
  rankings: PlayerRanking[];
  categoryId: string;
  selectedMatchType: string;
}) {
  const t = useTranslations("Leaderboard");
  const { openUserProfile } = useUserProfileModalStore();
  const listData = buildLeaderboardStandingSlots(
    rankings,
    categoryId,
    selectedMatchType,
  );

    // Split into 2 columns
    const mid = Math.ceil(listData.length / 2);
    const leftColumnData = listData.slice(0, mid);
    const rightColumnData = listData.slice(mid);

    const renderTable = (data: PlayerRanking[], startRank: number) => {
        return (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-3 w-12 text-center">{t("rankHeader")}</th>
                                <th className="py-3 px-3">{t("player")}</th>
                                <th className="py-3 px-3">{t("eloRank")}</th>
                                <th className="py-3 px-3 text-right">{t("winRate")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700 font-semibold">
                            {data.map((rank, index) => {
                                const rankNum = startRank + index;
                                const isPlaceholder = isLeaderboardPlaceholder(rank);
                                const winRate = rank.matchesPlayed > 0 ? ((rank.matchesWon / rank.matchesPlayed) * 100).toFixed(0) : '0';
                                return (
                                    <tr key={rank.id} className="transition-colors hover:bg-slate-55/40 border-b">
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                            #{rankNum}
                                        </td>
                                        <td className="py-2.5 px-3">
                                                <button
                                                type="button"
                                                disabled={isPlaceholder || !getPrimaryRankingMember(rank)?.id}
                                                onClick={(e) => {
                                                    const member = getPrimaryRankingMember(rank);
                                                    if (isPlaceholder || !member?.id) return;
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    openUserProfile(
                                                        {
                                                            id: member.id,
                                                            fullName: getRankingDisplayName(rank, t('athleteFallback')),
                                                            avatarUrl: member.avatarUrl,
                                                        },
                                                        rect,
                                                    );
                                                }}
                                                className={`flex items-center gap-2 hover:text-blue-600 transition-colors text-left cursor-pointer ${isPlaceholder ? "pointer-events-none" : ""}`}
                                            >
                                                {isPairRanking(rank) ? <RankingMembers ranking={rank} size="sm" /> : (
                                                    <div
                                                        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 bg-slate-100 shadow-xs"
                                                        style={{
                                                            borderColor: getStandingBorderColor(rank, '#e2e8f0'),
                                                            boxShadow: rank ? `0 0 8px -2px ${getStandingBorderColor(rank, '#e2e8f0')}60` : undefined,
                                                        }}
                                                    >
                                                        {getPrimaryRankingMember(rank)?.avatarUrl ? <Image src={getPrimaryRankingMember(rank)!.avatarUrl!} alt="Player" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] font-bold uppercase text-slate-500">{isPlaceholder ? "?" : (getPrimaryRankingMember(rank)?.fullName?.slice(0, 2) || t("initialsFallback"))}</span>}
                                                    </div>
                                                )}
                                                <span className={`font-bold truncate max-w-[100px] sm:max-w-[150px] ${isPlaceholder ? "text-slate-400 font-medium" : "text-slate-900"}`}>
                                                    {getRankingDisplayName(rank, t("waiting"))}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            {isPlaceholder ? (
                                                <span className="text-[10px] text-slate-400 font-medium">---</span>
                                            ) : (
                                                <StandingElo ranking={rank} />
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-emerald-650 font-bold">
                                            {isPlaceholder ? (
                                                <span className="text-slate-400 font-medium">--%</span>
                                            ) : (
                                                `${winRate}%`
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 px-1">{t("rankList")}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    {renderTable(leftColumnData, 11)}
                </div>
                <div>
                    {renderTable(rightColumnData, 11 + mid)}
                </div>
            </div>
        </div>
    );
}

