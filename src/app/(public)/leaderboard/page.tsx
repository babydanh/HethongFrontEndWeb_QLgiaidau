"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { categoriesApi, Category } from "@/features/categories/api";
import { rankingsApi, PlayerRanking } from "@/features/rankings/api";
import { regionsApi, Region } from "@/features/regions/api";
import { EloTierBadge } from "@/components/ui/EloTierBadge";
import { Trophy, ChevronDown, ChevronUp, Award, Users, Info, Loader2 } from "lucide-react";

export default function LeaderboardPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [rankings, setRankings] = useState<PlayerRanking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [provinces, setProvinces] = useState<Region[]>([]);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
    const [selectedMatchType, setSelectedMatchType] = useState<string>('');
    const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('');

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
                if (selectedGenderFilter && selectedMatchType !== 'MIXED_DOUBLES') {
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
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Bảng Xếp Hạng</h1>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                        Hệ thống xếp hạng ELO chính thức dành cho các vận động viên.
                    </p>
                </div>
            </div>

            {/* Sub-Filters: Sport Category & Province Selector */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                                setSelectedMatchType(e.target.value);
                                setSelectedGenderFilter('');
                            }}
                            className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                        >
                            <option value="">Tất cả</option>
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
                                <option value="">Tất cả</option>
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
                        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center min-h-[300px]">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                            <p className="text-slate-500 font-medium text-sm">Đang tải bảng xếp hạng...</p>
                        </div>
                    ) : (
                        <>
                            {/* Top 3 Podium Stage (Light Theme) */}
                            <div className="bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-white rounded-3xl border border-blue-100 shadow-sm p-6 md:p-8 text-slate-800 relative overflow-hidden mb-8">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/10 via-sky-50/5 to-transparent pointer-events-none" />
                                
                                <div className="relative z-10 text-center mb-8">
                                    <span className="text-[10px] uppercase font-black tracking-[0.25em] text-blue-600 bg-blue-50/80 px-3 py-1.5 rounded-full border border-blue-100">
                                        ✨ SÂN KHẤU VINH DANH ✨
                                    </span>
                                    <h2 className="text-xl md:text-2xl font-black mt-3 text-slate-905 tracking-tight">TOP 10 VẬN ĐỘNG VIÊN XUẤT SẮC</h2>
                                </div>

                                {/* Podium Top 3 */}
                                <div className="relative z-10 flex flex-col md:flex-row items-end justify-center gap-6 md:gap-4 lg:gap-8 max-w-4xl mx-auto pb-2 mt-12 md:mt-16">
                                    
                                    {/* Rank 2 (Left) */}
                                    <div className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center group">
                                        <div className="relative mb-4 transition-transform duration-300 group-hover:scale-105">
                                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-slate-100 text-slate-700 font-black text-[10px] px-3 py-1 rounded-full border border-slate-205 shadow-xs">
                                                #2 SECOND
                                            </div>
                                            <div className="w-20 h-20 rounded-full border-4 border-slate-350 p-0.5 relative overflow-hidden bg-slate-50 shadow-sm flex items-center justify-center">
                                                {rankings[1]?.user?.avatarUrl ? (
                                                    <Image src={rankings[1].user.avatarUrl} alt="Rank 2" fill className="object-cover rounded-full" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-black uppercase text-2xl rounded-full">
                                                        {rankings[1] ? (rankings[1].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="font-extrabold text-slate-800 text-center text-sm mb-1 truncate max-w-[200px]">
                                            {rankings[1]?.user?.fullName || "Đang chờ..."}
                                        </h3>
                                        {rankings[1] ? (
                                            <EloTierBadge elo={rankings[1].eloPoints} tierName={rankings[1].tier?.name} size="sm" className="mb-3 border-slate-200/80 bg-white" />
                                        ) : (
                                            <div className="text-[10px] text-slate-400 font-bold mb-3">--- ELO</div>
                                        )}
                                        
                                        {/* Stand 2 */}
                                        <div className="w-full h-24 bg-gradient-to-b from-blue-100/50 to-blue-200/20 rounded-t-2xl border-t border-x border-blue-200/80 flex flex-col items-center justify-center shadow-xs">
                                            <span className="text-3xl font-black text-blue-300/80 select-none">II</span>
                                            <span className="text-blue-600/70 text-[10px] font-bold mt-1">
                                                {rankings[1] ? `Thắng: ${rankings[1].matchesWon}/${rankings[1].matchesPlayed}` : "Thắng: --/--"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rank 1 (Center) */}
                                    <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center group relative -translate-y-2 md:-translate-y-4">
                                        <div className="relative mb-5 transition-transform duration-300 group-hover:scale-105">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-amber-955 font-black text-[10px] px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1 border border-amber-300 animate-bounce">
                                                👑 CHAMPION
                                            </div>
                                            <div className="w-24 h-24 rounded-full border-4 border-amber-400/80 p-1 relative overflow-hidden bg-slate-55 shadow-md flex items-center justify-center">
                                                {rankings[0]?.user?.avatarUrl ? (
                                                    <Image src={rankings[0].user.avatarUrl} alt="Rank 1" fill className="object-cover rounded-full" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600 font-black uppercase text-2xl rounded-full">
                                                        {rankings[0] ? (rankings[0].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="font-black text-amber-600 text-center text-base mb-1 truncate max-w-[220px]">
                                            {rankings[0]?.user?.fullName || "Đang chờ..."}
                                        </h3>
                                        {rankings[0] ? (
                                            <EloTierBadge elo={rankings[0].eloPoints} tierName={rankings[0].tier?.name} size="md" className="mb-3 border-amber-400/50 bg-white" />
                                        ) : (
                                            <div className="text-[10px] text-amber-500 font-bold mb-3">--- ELO</div>
                                        )}
                                        
                                        {/* Stand 1 */}
                                        <div className="w-full h-32 bg-gradient-to-b from-blue-100/70 to-blue-200/30 rounded-t-2xl border-t border-x border-blue-300 flex flex-col items-center justify-center shadow-xs relative overflow-hidden">
                                            <span className="text-4xl font-black text-blue-400 select-none">I</span>
                                            <span className="text-blue-700 text-xs font-bold mt-1">
                                                {rankings[0] ? `Thắng: ${rankings[0].matchesWon}/${rankings[0].matchesPlayed}` : "Thắng: --/--"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rank 3 (Right) */}
                                    <div className="w-full md:w-1/3 order-3 md:order-3 flex flex-col items-center group">
                                        <div className="relative mb-4 transition-transform duration-300 group-hover:scale-105">
                                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-orange-100 text-orange-700 font-black text-[10px] px-3 py-1 rounded-full border border-orange-205 shadow-xs">
                                                #3 THIRD
                                            </div>
                                            <div className="w-20 h-20 rounded-full border-4 border-orange-300 p-0.5 relative overflow-hidden bg-slate-50 shadow-sm flex items-center justify-center">
                                                {rankings[2]?.user?.avatarUrl ? (
                                                    <Image src={rankings[2].user.avatarUrl} alt="Rank 3" fill className="object-cover rounded-full" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-orange-500 font-black uppercase text-xl rounded-full">
                                                        {rankings[2] ? (rankings[2].user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="font-extrabold text-slate-800 text-center text-sm mb-1 truncate max-w-[200px]">
                                            {rankings[2]?.user?.fullName || "Đang chờ..."}
                                        </h3>
                                        {rankings[2] ? (
                                            <EloTierBadge elo={rankings[2].eloPoints} tierName={rankings[2].tier?.name} size="sm" className="mb-3 border-slate-200/80 bg-white" />
                                        ) : (
                                            <div className="text-[10px] text-slate-400 font-bold mb-3">--- ELO</div>
                                        )}
                                        
                                        {/* Stand 3 */}
                                        <div className="w-full h-20 bg-gradient-to-b from-blue-100/40 to-blue-200/15 rounded-t-2xl border-t border-x border-blue-200/70 flex flex-col items-center justify-center shadow-xs">
                                            <span className="text-3xl font-black text-blue-300/70 select-none">III</span>
                                            <span className="text-blue-600/60 text-[10px] font-bold mt-1">
                                                {rankings[2] ? `Thắng: ${rankings[2].matchesWon}/${rankings[2].matchesPlayed}` : "Thắng: --/--"}
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
                                                <div key={idx} className="bg-white/80 backdrop-blur-xs rounded-2xl border border-blue-100/60 p-3 flex flex-col items-center justify-between shadow-xs transition-all duration-300 hover:scale-105 hover:shadow-sm">
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-full mb-2">
                                                        #{rankNum}
                                                    </span>
                                                    <div className="w-12 h-12 rounded-full border-2 border-slate-200 relative overflow-hidden bg-slate-50 flex items-center justify-center mb-2">
                                                        {player?.user?.avatarUrl ? (
                                                            <Image src={player.user.avatarUrl} alt={`Rank ${rankNum}`} fill className="object-cover" />
                                                        ) : (
                                                            <span className="text-slate-400 font-bold text-sm">
                                                                {player ? (player.user?.fullName?.substring(0, 2) || 'VĐ') : '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-extrabold text-slate-700 text-xs text-center truncate w-full mb-1">
                                                        {player?.user?.fullName || "Đang chờ..."}
                                                    </span>
                                                    {player ? (
                                                        <span className="text-[11px] font-black text-blue-600">{player.eloPoints} ELO</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold">--- ELO</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Rest of rankings: Top 11 - 100 */}
                            <RestRankingsTable rankings={rankings} />
                        </>
                    )}
                </div>

                {/* Right Column: Sidebar Tier Breakdown */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600" />
                                Hệ thống phân hạng ELO
                            </h3>
                            <p className="text-slate-500 text-[11px] leading-relaxed">Điểm ELO tích lũy sau mỗi trận đấu sẽ xếp người chơi vào các Tier trình độ tương ứng.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Tier S</span>
                                <span className="font-black text-xs text-slate-800">1800+ ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-rose-500/15 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">High Tier A</span>
                                <span className="font-black text-xs text-slate-800">1700 - 1799 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-55 border-slate-205">
                                <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Low Tier A</span>
                                <span className="font-black text-xs text-slate-800">1600 - 1699 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-violet-500/15 text-violet-650 px-2 py-0.5 rounded text-[10px] font-black uppercase">High Tier B</span>
                                <span className="font-black text-xs text-slate-800">1500 - 1599 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-violet-500/10 text-violet-550 px-2 py-0.5 rounded text-[10px] font-black uppercase">Low Tier B</span>
                                <span className="font-black text-xs text-slate-800">1400 - 1499 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-teal-500/10 text-teal-650 px-2 py-0.5 rounded text-[10px] font-black uppercase">High Tier C</span>
                                <span className="font-black text-xs text-slate-800">1300 - 1399 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-55 border-slate-205">
                                <span className="bg-cyan-500/10 text-cyan-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Low Tier C</span>
                                <span className="font-black text-xs text-slate-800">1200 - 1299 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-slate-500/10 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">High Tier D</span>
                                <span className="font-black text-xs text-slate-800">1100 - 1199 ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-orange-700/10 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Low Tier D</span>
                                <span className="font-black text-xs text-slate-800">0 - 1099 ELO</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RestRankingsTable({ rankings }: { rankings: PlayerRanking[] }) {
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                                    <tr key={rank.id} className="transition-colors hover:bg-slate-50/40 border-b">
                                        <td className="py-2.5 px-3 text-center font-black text-slate-400">
                                            #{rankNum}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full object-cover relative overflow-hidden bg-slate-100 flex-shrink-0">
                                                    {rank.user?.avatarUrl ? (
                                                        <Image src={rank.user.avatarUrl} alt="Player" fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-black text-[9px] uppercase">
                                                            {isPlaceholder ? "?" : (rank.user?.fullName?.substring(0, 2) || 'VĐ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`font-bold truncate max-w-[100px] sm:max-w-[150px] ${isPlaceholder ? "text-slate-400 font-medium" : "text-slate-900"}`}>
                                                    {rank.user?.fullName || "Đang chờ..."}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            {isPlaceholder ? (
                                                <span className="text-[10px] text-slate-400 font-medium">---</span>
                                            ) : (
                                                <EloTierBadge elo={rank.eloPoints} tierName={rank.tier?.name} size="sm" className="scale-90 origin-left" />
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-black text-blue-650">
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
            <h3 className="text-base font-black text-slate-900 px-1">Danh sách xếp hạng (Hạng 11 - 100)</h3>
            
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
