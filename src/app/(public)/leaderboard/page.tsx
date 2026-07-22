"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { categoriesApi, Category } from "@/features/categories/api";
import { rankingsApi, PlayerRanking } from "@/features/rankings/api";
import { regionsApi, Region } from "@/features/regions/api";
import { usersApi } from "@/features/users/api";
import { EloTierBadge } from "@/components/ui/EloTierBadge";
import { Trophy, ChevronDown, ChevronUp, Award, Users, Info, Loader2, Search } from "lucide-react";
import Link from "next/link";

interface LeaderboardSearchResult {
    id: string;
    fullName?: string;
    avatarUrl?: string | null;
    email?: string;
    eloPoints: number;
    tierName: string;
}

export default function LeaderboardPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [rankings, setRankings] = useState<PlayerRanking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [provinces, setProvinces] = useState<Region[]>([]);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
    const [selectedMatchType, setSelectedMatchType] = useState<string>('SINGLES');
    const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('MALE');

    // ELO User Search States
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<LeaderboardSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");

    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) {
            setSearchError("Nhập ít nhất 2 ký tự");
            return;
        }
        setSearchLoading(true);
        setSearchError("");
        setSearchResult([]);
        try {
            const res = await usersApi.searchUsersByQuery(trimmed);
            const foundUsers = res || [];
            if (foundUsers.length === 0) {
                setSearchError("Không tìm thấy người dùng");
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
                            r.matchType === selectedMatchType &&
                            r.genderRestriction === selectedGenderFilter
                        );
                        return {
                            ...u,
                            eloPoints: matchRank?.eloPoints ?? 1000,
                            tierName: matchRank?.tier?.name || matchRank?.tierName || "Chưa xếp hạng",
                        };
                    } catch {
                        return {
                            ...u,
                            eloPoints: 1000,
                            tierName: "Chưa xếp hạng",
                        };
                    }
                })
            );
            setSearchResult(enriched);
        } catch (err) {
            console.error(err);
            setSearchError("Không tìm thấy hoặc có lỗi xảy ra");
        } finally {
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const cats = await categoriesApi.getCategories();
                if (cats.data.length > 0) {
                    setCategories(cats.data);
                    setActiveCategoryId(cats.data[0].id);
                }
                const res = await regionsApi.getProvinces();
                const provList = (Array.isArray(res) ? res : (res as { data?: Region[] }).data) || [];
                setProvinces(provList);
            } catch (error) {
                console.error("Failed to initialize leaderboard data", error);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!activeCategoryId) return;
        
        const fetchRankings = async () => {
            setIsLoading(true);
            try {
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
            } finally {
                setIsLoading(false);
            }
        };
        fetchRankings();
    }, [activeCategoryId, selectedProvinceCode, selectedMatchType, selectedGenderFilter]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-4 border-slate-200">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Bảng Xếp Hạng</h1>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                        Hệ thống xếp hạng ELO chính thức dành cho các vận động viên.
                    </p>
                </div>
            </div>

            {/* Sub-Filters: Sport Category & Province Selector */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategoryId(cat.id)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                                activeCategoryId === cat.id
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-55"
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Match Type Selector */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Thể loại:</label>
                    <div className="relative flex-grow md:flex-grow-0 md:min-w-[150px]">
                        <select
                            value={selectedMatchType}
                            onChange={(e) => {
                                const matchType = e.target.value;
                                setSelectedMatchType(matchType);
                                setSelectedGenderFilter(matchType === 'MIXED_DOUBLES' ? 'MIXED' : 'MALE');
                            }}
                            className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                        >
                            <option value="SINGLES">Đơn</option>
                            <option value="DOUBLES">Đôi</option>
                            <option value="MIXED_DOUBLES">Đôi Nam Nữ</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>
                </div>

                {/* Gender Filter - Only show for non-MIXED_DOUBLES */}
                {selectedMatchType && selectedMatchType !== 'MIXED_DOUBLES' && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Giới tính:</label>
                        <div className="relative flex-grow md:flex-grow-0 md:min-w-[120px]">
                            <select
                                value={selectedGenderFilter}
                                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Province Selector */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Khu vực / Tỉnh thành:</label>
                    <div className="relative flex-grow md:flex-grow-0 md:min-w-[200px]">
                        <select
                            value={selectedProvinceCode}
                            onChange={(e) => setSelectedProvinceCode(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                        >
                            <option value="">Tất cả tỉnh thành</option>
                            {provinces.map(p => (
                                <option key={p.code} value={p.code}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Podium & List */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                    {isLoading ? (
                        <div className="bg-white rounded-lg border border-slate-200 p-16 flex flex-col items-center justify-center min-h-[300px]">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                            <p className="text-slate-500 font-medium text-sm">Đang tải bảng xếp h�                            {/* Top 3 Podium Stage (Modern Dynamic Colors) */}
                            <div className="bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 md:p-8 text-white relative overflow-hidden mb-8">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-blue-500/5 to-transparent pointer-events-none" />
                                
                                <div className="relative z-10 text-center mb-6">
                                    <span className="text-[10px] uppercase font-extrabold tracking-[0.25em] text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20 shadow-xs">
                                        ✨ SÂN KHẤU VINH DANH ✨
                                    </span>
                                    <h2 className="text-xl md:text-2xl font-black mt-3 text-white tracking-tight drop-shadow-sm">
                                        TOP 10 VẬN ĐỘNG VIÊN XUẤT SẮC
                                    </h2>
                                </div>

                                {/* Podium Top 3 */}
                                <div className="relative z-10 flex flex-col md:flex-row items-end justify-center gap-6 md:gap-4 lg:gap-8 max-w-4xl mx-auto pb-2 mt-8 md:mt-12">
                                    
                                    {/* Rank 2 (Silver - Left) */}
                                    <div className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center group/podium">
                                        <Link 
                                            href={rankings[1]?.user?.id ? `/users/${rankings[1].user.id}` : '#'}
                                            className="flex flex-col items-center group-hover/podium:scale-105 transition-all duration-300 w-full"
                                        >
                                            <div className="relative mb-3">
                                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-slate-200 text-slate-900 font-black text-[10px] px-3 py-0.5 rounded-full border border-slate-300 shadow-md whitespace-nowrap">
                                                    🥈 #2 HẠNG NHÌ
                                                </div>
                                                
                                                {/* Avatar for Rank 2 */}
                                                {selectedMatchType.includes('DOUBLES') ? (
                                                    <div className="relative w-24 h-20 flex items-center justify-center">
                                                        <div className="w-14 h-14 rounded-full border-2 border-slate-300 absolute right-0 bottom-0 bg-slate-800 flex items-center justify-center shadow-md">
                                                            <Users className="w-6 h-6 text-slate-300" />
                                                        </div>
                                                        <div className="w-14 h-14 rounded-full border-2 border-slate-200 p-0.5 absolute left-0 top-0 overflow-hidden bg-slate-800 shadow-lg flex items-center justify-center">
                                                            {rankings[1]?.user?.avatarUrl ? (
                                                                <Image src={rankings[1].user.avatarUrl} alt="Rank 2" fill className="object-cover rounded-full" />
                                                            ) : (
                                                                <span className="text-slate-300 font-bold uppercase text-base">
                                                                    {rankings[1] ? (rankings[1].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full border-3 border-slate-300 p-0.5 relative overflow-hidden bg-slate-800 shadow-lg flex items-center justify-center ring-4 ring-slate-400/20">
                                                        {rankings[1]?.user?.avatarUrl ? (
                                                            <Image src={rankings[1].user.avatarUrl} alt="Rank 2" fill className="object-cover rounded-full" />
                                                        ) : (
                                                            <span className="text-slate-300 font-bold uppercase text-xl">
                                                                {rankings[1] ? (rankings[1].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <h3 className="font-bold text-slate-100 text-center text-sm mb-1 truncate max-w-[180px] group-hover/podium:text-slate-300 transition-colors">
                                                {rankings[1]?.user?.fullName || "Chưa xác định"}
                                            </h3>
                                            {rankings[1] ? (
                                                <EloTierBadge elo={rankings[1].eloPoints} tierName={rankings[1].tier?.name} size="sm" className="mb-3 shadow-md" />
                                            ) : (
                                                <div className="text-[10px] text-slate-500 font-bold mb-3">--- ELO</div>
                                            )}
                                        </Link>
                                        
                                        {/* Stand 2 */}
                                        <div className="w-full h-24 bg-gradient-to-b from-slate-700/80 to-slate-800/90 rounded-t-xl border-t-2 border-x border-slate-500/50 flex flex-col items-center justify-center shadow-lg">
                                            <span className="text-3xl font-black text-slate-300 select-none">II</span>
                                            <span className="text-slate-400 text-[10px] font-bold mt-1">
                                                {rankings[1] ? `Thắng: ${rankings[1].matchesWon}/${rankings[1].matchesPlayed}` : "Thắng: --/--"}
                                            </span>
                                        </div>
                                    </div>
 
                                    {/* Rank 1 (Gold - Center) */}
                                    <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center group/podium relative -translate-y-2 md:-translate-y-4">
                                        <Link 
                                            href={rankings[0]?.user?.id ? `/users/${rankings[0].user.id}` : '#'}
                                            className="flex flex-col items-center group-hover/podium:scale-105 transition-all duration-300 w-full"
                                        >
                                            <div className="relative mb-4">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-amber-950 font-black text-[10px] px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-300 whitespace-nowrap animate-pulse">
                                                    👑 #1 QUÁN QUÂN
                                                </div>
                                                
                                                {/* Avatar for Rank 1 */}
                                                {selectedMatchType.includes('DOUBLES') ? (
                                                    <div className="relative w-28 h-24 flex items-center justify-center">
                                                        <div className="w-16 h-16 rounded-full border-2 border-amber-400 absolute right-0 bottom-0 bg-slate-800 flex items-center justify-center shadow-lg">
                                                            <Users className="w-7 h-7 text-amber-400" />
                                                        </div>
                                                        <div className="w-16 h-16 rounded-full border-3 border-amber-400 p-0.5 absolute left-0 top-0 overflow-hidden bg-slate-800 shadow-xl flex items-center justify-center">
                                                            {rankings[0]?.user?.avatarUrl ? (
                                                                <Image src={rankings[0].user.avatarUrl} alt="Rank 1" fill className="object-cover rounded-full" />
                                                            ) : (
                                                                <span className="text-amber-400 font-bold uppercase text-lg">
                                                                    {rankings[0] ? (rankings[0].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full border-4 border-amber-400 p-0.5 relative overflow-hidden bg-slate-800 shadow-xl flex items-center justify-center ring-4 ring-amber-400/30">
                                                        {rankings[0]?.user?.avatarUrl ? (
                                                            <Image src={rankings[0].user.avatarUrl} alt="Rank 1" fill className="object-cover rounded-full" />
                                                        ) : (
                                                            <span className="text-amber-400 font-bold uppercase text-2xl">
                                                                {rankings[0] ? (rankings[0].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <h3 className="font-black text-amber-400 text-center text-base mb-1 truncate max-w-[200px] group-hover/podium:text-amber-300 transition-colors">
                                                {rankings[0]?.user?.fullName || "Chưa xác định"}
                                            </h3>
                                            {rankings[0] ? (
                                                <EloTierBadge elo={rankings[0].eloPoints} tierName={rankings[0].tier?.name} size="md" className="mb-3 shadow-lg" />
                                            ) : (
                                                <div className="text-[10px] text-amber-500/80 font-bold mb-3">--- ELO</div>
                                            )}
                                        </Link>
                                        
                                        {/* Stand 1 */}
                                        <div className="w-full h-32 bg-gradient-to-b from-amber-500/30 via-amber-600/20 to-slate-800 rounded-t-xl border-t-2 border-x border-amber-400/60 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
                                            <span className="text-4xl font-black text-amber-400 select-none drop-shadow-md">I</span>
                                            <span className="text-amber-300 text-xs font-bold mt-1">
                                                {rankings[0] ? `Thắng: ${rankings[0].matchesWon}/${rankings[0].matchesPlayed}` : "Thắng: --/--"}
                                            </span>
                                        </div>
                                    </div>
 
                                    {/* Rank 3 (Bronze - Right) */}
                                    <div className="w-full md:w-1/3 order-3 md:order-3 flex flex-col items-center group/podium">
                                        <Link 
                                            href={rankings[2]?.user?.id ? `/users/${rankings[2].user.id}` : '#'}
                                            className="flex flex-col items-center group-hover/podium:scale-105 transition-all duration-300 w-full"
                                        >
                                            <div className="relative mb-3">
                                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-amber-700 text-amber-100 font-black text-[10px] px-3 py-0.5 rounded-full border border-amber-600 shadow-md whitespace-nowrap">
                                                    🥉 #3 HẠNG BA
                                                </div>
                                                
                                                {/* Avatar for Rank 3 */}
                                                {selectedMatchType.includes('DOUBLES') ? (
                                                    <div className="relative w-24 h-20 flex items-center justify-center">
                                                        <div className="w-14 h-14 rounded-full border-2 border-amber-600 absolute right-0 bottom-0 bg-slate-800 flex items-center justify-center shadow-md">
                                                            <Users className="w-6 h-6 text-amber-500" />
                                                        </div>
                                                        <div className="w-14 h-14 rounded-full border-2 border-amber-500 p-0.5 absolute left-0 top-0 overflow-hidden bg-slate-800 shadow-lg flex items-center justify-center">
                                                            {rankings[2]?.user?.avatarUrl ? (
                                                                <Image src={rankings[2].user.avatarUrl} alt="Rank 3" fill className="object-cover rounded-full" />
                                                            ) : (
                                                                <span className="text-amber-500 font-bold uppercase text-base">
                                                                    {rankings[2] ? (rankings[2].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full border-3 border-amber-600 p-0.5 relative overflow-hidden bg-slate-800 shadow-lg flex items-center justify-center ring-4 ring-amber-700/20">
                                                        {rankings[2]?.user?.avatarUrl ? (
                                                            <Image src={rankings[2].user.avatarUrl} alt="Rank 3" fill className="object-cover rounded-full" />
                                                        ) : (
                                                            <span className="text-amber-500 font-bold uppercase text-xl">
                                                                {rankings[2] ? (rankings[2].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <h3 className="font-bold text-slate-100 text-center text-sm mb-1 truncate max-w-[180px] group-hover/podium:text-amber-400 transition-colors">
                                                {rankings[2]?.user?.fullName || "Chưa xác định"}
                                            </h3>
                                            {rankings[2] ? (
                                                <EloTierBadge elo={rankings[2].eloPoints} tierName={rankings[2].tier?.name} size="sm" className="mb-3 shadow-md" />
                                            ) : (
                                                <div className="text-[10px] text-slate-500 font-bold mb-3">--- ELO</div>
                                            )}
                                        </Link>
                                        
                                        {/* Stand 3 */}
                                        <div className="w-full h-20 bg-gradient-to-b from-amber-800/40 to-slate-800 rounded-t-xl border-t-2 border-x border-amber-700/50 flex flex-col items-center justify-center shadow-lg">
                                            <span className="text-3xl font-black text-amber-600 select-none">III</span>
                                            <span className="text-amber-500/80 text-[10px] font-bold mt-1">
                                                {rankings[2] ? `Thắng: ${rankings[2].matchesWon}/${rankings[2].matchesPlayed}` : "Thắng: --/--"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ranks 4-10 Cards/Stands (Dark Theme Modern Grid) */}
                                <div className="mt-8 pt-6 border-t border-slate-800">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                        {[3, 4, 5, 6, 7, 8, 9].map((idx) => {
                                            const player = rankings[idx];
                                            const rankNum = idx + 1;
                                            return (
                                                <Link 
                                                    key={idx} 
                                                    href={player?.user?.id ? `/users/${player.user.id}` : '#'}
                                                    className="bg-slate-800/80 hover:bg-slate-800 backdrop-blur-xs rounded-xl border border-slate-700/70 p-3 flex flex-col items-center justify-between shadow-md transition-all duration-300 hover:scale-105 hover:border-blue-500 group/rankcard"
                                                >
                                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full mb-2">
                                                        #{rankNum}
                                                    </span>
                                                    
                                                    {/* Avatar for Ranks 4-10 */}
                                                    {selectedMatchType.includes('DOUBLES') ? (
                                                        <div className="relative w-14 h-11 mb-2">
                                                            <div className="w-8 h-8 rounded-full border border-slate-600 absolute right-0 bottom-0 bg-slate-700 flex items-center justify-center shadow-xs">
                                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full border border-slate-500 absolute left-0 top-0 overflow-hidden bg-slate-700 flex items-center justify-center">
                                                                {player?.user?.avatarUrl ? (
                                                                    <Image src={player.user.avatarUrl} alt={`Rank ${rankNum}`} fill className="object-cover" />
                                                                ) : (
                                                                    <span className="text-slate-400 font-bold text-[10px]">
                                                                        {player ? (player.user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full border border-slate-600 relative overflow-hidden bg-slate-700 flex items-center justify-center mb-2 group-hover/rankcard:border-blue-400 transition-colors">
                                                            {player?.user?.avatarUrl ? (
                                                                <Image src={player.user.avatarUrl} alt={`Rank ${rankNum}`} fill className="object-cover" />
                                                            ) : (
                                                                <span className="text-slate-400 font-bold text-sm">
                                                                    {player ? (player.user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    <span className="font-bold text-slate-200 text-xs text-center truncate w-full mb-1 group-hover/rankcard:text-blue-400 transition-colors">
                                                        {player?.user?.fullName || "Chưa xác định"}
                                                    </span>
                                                    {player ? (
                                                        <span className="text-[11px] font-bold text-blue-400">{player.eloPoints} ELO</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-500 font-bold">--- ELO</span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>   );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Rest of rankings: Top 11 - 100 */}
                            <RestRankingsTable rankings={rankings} selectedMatchType={selectedMatchType} />
                        </>
                    )}
                </div>

                {/* Right Column: Sidebar Tier Breakdown & Search */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="flex flex-col gap-6 sticky top-28 lg:top-32">
                        {/* Tier Breakdown Card */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const modal = document.getElementById('eloRulesModal') as HTMLDialogElement | null;
                                            if (modal) modal.showModal();
                                        }}
                                        className="p-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                                        title="Xem quy tắc tính điểm ELO"
                                    >
                                        <Info className="w-4 h-4" />
                                    </button>
                                    Hệ thống phân hạng ELO
                                </h3>
                                <p className="text-slate-500 text-[11px] leading-relaxed">
                                    Điểm ELO tích lũy sau mỗi trận đấu chính thức sẽ xếp người chơi vào các Tier trình độ tương ứng.
                                </p>
                            </div>

                            {/* Modal Quy tắc ELO - Căn giữa màn hình, viền gọn nhẹ, không bo quá đà & thuần Việt */}
                            <dialog id="eloRulesModal" className="m-auto rounded-xl p-0 backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs border border-slate-200 shadow-xl max-w-lg w-full outline-none">
                                <div className="bg-white p-6 space-y-5">
                                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                            <Info className="w-5 h-5 text-blue-600" />
                                            Quy định tính điểm ELO & Thăng hạng
                                        </h3>
                                        <form method="dialog">
                                            <button className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer px-1">✕</button>
                                        </form>
                                    </div>
                                    
                                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                ⚡ 1. Tích lũy điểm trận đấu
                                            </h4>
                                            <p className="text-slate-600 pl-5">
                                                • **Vận động viên mới** (dưới 10 trận): Điểm ELO cộng/trừ với biên độ cao để nhanh chóng xác định đúng trình độ thực tế.<br />
                                                • **Vận động viên quen thuộc** (10–30 trận): Biên độ điểm vừa phải.<br />
                                                • **Vận động viên kỳ cựu** (trên 30 trận): Điểm ELO tăng/giảm ổn định theo từng trận thắng/thua.
                                            </p>
                                        </div>

                                        <div className="space-y-1 border-t border-slate-100 pt-3">
                                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                🔥 2. Điểm thưởng chuỗi thắng & Thắng áp đảo
                                            </h4>
                                            <p className="text-slate-600 pl-5">
                                                • **Chuỗi 3 trận thắng liên tiếp**: Thưởng thêm +10% điểm ELO nhận được.<br />
                                                • **Chuỗi 5 trận thắng**: Thưởng +20% điểm ELO.<br />
                                                • **Chuỗi 7+ trận thắng**: Thưởng +30% điểm ELO.<br />
                                                • **Thắng cách biệt hủy diệt** (thắng áp đảo tỉ số các set) được thưởng thêm hệ số điểm hiệu số.
                                            </p>
                                        </div>

                                        <div className="space-y-1 border-t border-slate-100 pt-3">
                                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                👑 3. Thưởng lội ngược dòng trước đối thủ mạnh
                                            </h4>
                                            <p className="text-slate-600 pl-5">
                                                • Thắng đối thủ có điểm ELO cao hơn **200+ điểm**: Thưởng thêm +5 điểm ELO.<br />
                                                • Thắng đối thủ vượt trội hơn **400+ điểm ELO**: Thưởng thêm +10 điểm ELO.
                                            </p>
                                        </div>

                                        <div className="space-y-1 border-t border-slate-100 pt-3">
                                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                ⏳ 4. Quy định bảo lưu thứ hạng khi nghỉ thi đấu
                                            </h4>
                                            <p className="text-slate-600 pl-5">
                                                • Người chơi **không tham gia giải đấu/trận đấu chính thức nào trong 30 ngày liên tục** sẽ bắt đầu bị trừ dần điểm ELO tự động (giảm điểm phong độ) nhằm giữ tính cạnh tranh công bằng trên Bảng xếp hạng.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end border-t border-slate-100">
                                        <form method="dialog">
                                            <button className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors cursor-pointer">
                                                Đã hiểu
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </dialog>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#FEF3C7] border-amber-300">
                                    <span className="bg-[#D97706] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">Tier S</span>
                                    <span className="font-bold text-xs text-[#92400E]">1800+ ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#F8C4B4] border-rose-300">
                                    <span className="bg-[#DC2626] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">High Tier A</span>
                                    <span className="font-bold text-xs text-[#991B1B]">1700 - 1799 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#FBE8E0] border-rose-200">
                                    <span className="bg-[#EF4444] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">Low Tier A</span>
                                    <span className="font-bold text-xs text-[#B91C1C]">1600 - 1699 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#BFDBFE] border-blue-300">
                                    <span className="bg-[#2563EB] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">High Tier B</span>
                                    <span className="font-bold text-xs text-[#1E40AF]">1500 - 1599 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#EFF6FF] border-blue-200">
                                    <span className="bg-[#3B82F6] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">Low Tier B</span>
                                    <span className="font-bold text-xs text-[#1D4ED8]">1400 - 1499 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#A7F3D0] border-emerald-300">
                                    <span className="bg-[#059669] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">High Tier C</span>
                                    <span className="font-bold text-xs text-[#065F46]">1300 - 1399 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#ECFDF5] border-emerald-200">
                                    <span className="bg-[#10B981] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">Low Tier C</span>
                                    <span className="font-bold text-xs text-[#047857]">1200 - 1299 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#E2E8F0] border-slate-300">
                                    <span className="bg-[#475569] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">High Tier D</span>
                                    <span className="font-bold text-xs text-[#1E293B]">1100 - 1199 ELO</span>
                                </div>
                                <div className="flex justify-between items-center p-2.5 rounded-lg border bg-[#F5F5F4] border-stone-300">
                                    <span className="bg-[#78716C] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shadow-xs">Low Tier D</span>
                                    <span className="font-bold text-xs text-[#44403C]">0 - 1099 ELO</span>
                                </div>
                            </div>
                        </div>

                        {/* Search User Elo Card */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-blue-600" />
                                    Tra cứu ELO kỳ thủ
                                </h3>
                                <p className="text-slate-500 text-[11px] leading-relaxed">Nhập Gmail hoặc Số điện thoại để tìm thứ hạng và Tier trình độ.</p>
                            </div>

                            <form onSubmit={handleSearchUser} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="gmail hoặc sđt..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 placeholder-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={searchLoading}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer animate-none"
                                >
                                    {searchLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        "Tìm"
                                    )}
                                </button>
                            </form>

                            {searchError && (
                                <p className="text-[10px] text-rose-500 font-bold">{searchError}</p>
                            )}

                            {searchResult.length > 0 && (
                                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                                    {searchResult.map((u) => (
                                        <Link
                                            key={u.id}
                                            href={`/users/${u.id}`}
                                            className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-150 bg-slate-50/50 hover:bg-blue-50/20 hover:border-blue-200 transition-all cursor-pointer group"
                                        >
                                            <div className="w-9 h-9 rounded-full object-cover relative overflow-hidden bg-slate-100 shrink-0">
                                                {u.avatarUrl ? (
                                                    <Image src={u.avatarUrl} alt="Avatar" fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-xs uppercase">
                                                        {u.fullName?.substring(0, 2) || "VĐ"}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                    {u.fullName || "Kỳ thủ"}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{u.email}</p>
                                            </div>
                                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                                                    {u.eloPoints} ELO
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {u.tierName}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RestRankingsTable({ rankings, selectedMatchType }: { rankings: PlayerRanking[], selectedMatchType: string }) {
    // Rankings starting from index 10 (Hạng 11 trở đi)
    const realData = rankings.slice(10, 100);
    
    // Tạo danh sách 90 phần tử (từ hạng 11 đến 100), nếu thiếu thì điền placeholder "Đang chờ..."
    const listData = [...realData];
    const targetLength = 90; // 11 to 100 is 90 slots
    
    for (let i = listData.length; i < targetLength; i++) {
        listData.push({
            id: `placeholder-${i}`,
            categoryId: "",
            eloPoints: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            winStreak: 0,
            updatedAt: new Date().toISOString(),
            user: {
                id: `placeholder-user-${i}`,
                fullName: "Đang chờ...",
                avatarUrl: undefined
            },
            tier: {
                id: "",
                name: "LOW_TIER_D"
            }
        });
    }

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
                                <th className="py-3 px-3 w-12 text-center">Hạng</th>
                                <th className="py-3 px-3">Đấu thủ</th>
                                <th className="py-3 px-3">Hạng ELO</th>
                                <th className="py-3 px-3 text-right">ELO</th>
                                <th className="py-3 px-3 text-right">Tỷ Lệ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700 font-semibold">
                            {data.map((rank, index) => {
                                const rankNum = startRank + index;
                                const isPlaceholder = rank.id.startsWith("placeholder-");
                                const winRate = rank.matchesPlayed > 0 ? ((rank.matchesWon / rank.matchesPlayed) * 100).toFixed(0) : '0';
                                return (
                                    <tr key={rank.id} className="transition-colors hover:bg-slate-55/40 border-b">
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                            #{rankNum}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <Link 
                                                href={isPlaceholder ? '#' : `/users/${rank.user?.id}`}
                                                className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${isPlaceholder ? "pointer-events-none" : ""}`}
                                            >
                                                {/* Stacked Avatar for Doubles in table list */}
                                                {selectedMatchType.includes('DOUBLES') ? (
                                                    <div className="relative w-10 h-7 flex-shrink-0">
                                                        <div className="w-5.5 h-5.5 rounded-full border border-slate-200 absolute right-0 bottom-0 bg-slate-100 flex items-center justify-center">
                                                            <Users className="w-2.5 h-2.5 text-slate-400" />
                                                        </div>
                                                        <div className="w-5.5 h-5.5 rounded-full border border-slate-200 absolute left-0 top-0 overflow-hidden bg-slate-50 flex items-center justify-center">
                                                            {rank.user?.avatarUrl ? (
                                                                <Image src={rank.user.avatarUrl} alt="Player" fill className="object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-[8px] uppercase">
                                                                    {isPlaceholder ? "?" : (rank.user?.fullName?.substring(0, 2) || 'VĐ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full object-cover relative overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                                        {rank.user?.avatarUrl ? (
                                                            <Image src={rank.user.avatarUrl} alt="Player" fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-[9px] uppercase">
                                                                {isPlaceholder ? "?" : (rank.user?.fullName?.substring(0, 2) || 'VĐ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <span className={`font-bold truncate max-w-[100px] sm:max-w-[150px] ${isPlaceholder ? "text-slate-400 font-medium" : "text-slate-900"}`}>
                                                    {rank.user?.fullName || "Đang chờ..."}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            {isPlaceholder ? (
                                                <span className="text-[10px] text-slate-400 font-medium">---</span>
                                            ) : (
                                                <EloTierBadge elo={rank.eloPoints} tierName={rank.tier?.name} size="sm" className="scale-90 origin-left" />
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-blue-650">
                                            {isPlaceholder ? (
                                                <span className="text-slate-450 font-bold">---</span>
                                            ) : (
                                                rank.eloPoints
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
            <h3 className="text-base font-bold text-slate-900 px-1">Danh sách xếp hạng (Hạng 11 - 100)</h3>
            
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
