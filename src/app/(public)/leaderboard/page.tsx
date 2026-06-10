"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { categoriesApi, Category } from "@/features/categories/api";
import { rankingsApi, PlayerRanking } from "@/features/rankings/api";
import { communitiesApi, Community } from "@/features/communities/api";
import { EloTierBadge } from "@/components/ui/EloTierBadge";
import { Trophy, ChevronDown, Award, Users, Info, Loader2 } from "lucide-react";

export default function LeaderboardPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [rankings, setRankings] = useState<PlayerRanking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Phase 5: Scope & Community states
    const [scope, setScope] = useState<'PUBLIC' | 'COMMUNITY'>('PUBLIC');
    const [communities, setCommunities] = useState<Community[]>([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            try {
                const cats = await categoriesApi.getCategories();
                if (cats.data.length > 0) {
                    setCategories(cats.data);
                    setActiveCategoryId(cats.data[0].id);
                }

                // Fetch communities for CLB rankings
                const comms = await communitiesApi.getCommunities({ limit: 100 });
                if (comms.data && comms.data.length > 0) {
                    setCommunities(comms.data);
                    setSelectedCommunityId(comms.data[0].id);
                }
            } catch (error) {
                console.error("Failed to initialize leaderboard data", error);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!activeCategoryId) return;
        if (scope === 'COMMUNITY' && !selectedCommunityId) return;
        
        const fetchRankings = async () => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    categoryId: activeCategoryId,
                    scope,
                    limit: 50,
                };
                if (scope === 'COMMUNITY') {
                    params.communityId = selectedCommunityId;
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
    }, [activeCategoryId, scope, selectedCommunityId]);

    // Get top 3 players for Podium display
    const top3 = rankings.slice(0, 3);
    const restRankings = rankings.slice(3);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            {/* Header & Scope Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-4 border-slate-200">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Bảng Xếp Hạng</h1>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                        Hệ thống xếp hạng ELO cho các vận động viên và câu lạc bộ.
                    </p>
                </div>

                {/* Scope selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto font-bold text-xs select-none">
                    <button
                        onClick={() => setScope('PUBLIC')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg transition-all ${
                            scope === 'PUBLIC'
                                ? 'bg-white text-blue-650 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Xếp Hạng Hệ Thống
                    </button>
                    <button
                        onClick={() => setScope('COMMUNITY')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg transition-all ${
                            scope === 'COMMUNITY'
                                ? 'bg-white text-blue-650 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Xếp Hạng CLB (Cộng đồng)
                    </button>
                </div>
            </div>

            {/* Sub-Filters: Sport Category & Community Dropdown */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Category Selection */}
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategoryId(cat.id)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                                activeCategoryId === cat.id
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Community Selector (Visible only when scope is COMMUNITY) */}
                {scope === 'COMMUNITY' && communities.length > 0 && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Chọn CLB:</label>
                        <div className="relative flex-grow md:flex-grow-0 md:min-w-[200px]">
                            <select
                                value={selectedCommunityId}
                                onChange={(e) => setSelectedCommunityId(e.target.value)}
                                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800 font-bold"
                            >
                                {communities.map(comm => (
                                    <option key={comm.id} value={comm.id}>{comm.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                )}
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
                    ) : rankings.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-16 text-center text-slate-400 min-h-[300px] flex flex-col items-center justify-center">
                            <Trophy className="w-12 h-12 text-slate-300 mb-2" />
                            <p className="font-bold text-slate-700">Chưa có dữ liệu xếp hạng</p>
                            <p className="text-xs text-slate-400 mt-1">Các trận đấu thi đấu trong hệ thống sẽ tự động cập nhật ELO cho người chơi.</p>
                        </div>
                    ) : (
                        <>
                            {/* Top 3 Podium */}
                            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 mt-4 mb-8">
                                {/* Rank 2 */}
                                {top3[1] && (
                                    <div className="flex flex-col items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full sm:w-1/3 order-2 sm:order-1 relative mt-8 sm:mt-0">
                                        <div className="absolute -top-3.5 bg-slate-100 text-slate-700 font-black text-xs px-3 py-1 rounded-full border">#2 SECOND</div>
                                        <div className="w-16 h-16 rounded-full border-2 border-slate-200 relative overflow-hidden mb-3 bg-slate-50">
                                            {top3[1].user?.avatarUrl ? (
                                                <Image src={top3[1].user.avatarUrl} alt="Rank 2" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold uppercase text-lg">
                                                    {top3[1].user?.fullName?.substring(0, 2) || 'VĐ'}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-center mb-2 truncate max-w-full">{top3[1].user?.fullName || "Người chơi"}</h3>
                                        <EloTierBadge elo={top3[1].eloPoints} size="sm" className="mb-2" />
                                        <div className="font-semibold text-slate-500 text-xs">
                                          Thắng: {top3[1].matchesWon}/{top3[1].matchesPlayed} trận
                                        </div>
                                    </div>
                                )}
                                {/* Rank 1 */}
                                {top3[0] && (
                                    <div className="flex flex-col items-center bg-white rounded-2xl border-2 border-amber-400 shadow-md p-8 w-full sm:w-1/3 order-1 sm:order-2 relative z-10 transform sm:-translate-y-4">
                                        <div className="absolute -top-4 bg-amber-400 text-amber-950 font-black text-xs px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                                            👑 #1 CHAMPION
                                        </div>
                                        <div className="w-20 h-20 rounded-full border-4 border-amber-400 relative overflow-hidden mb-3 bg-slate-50">
                                            {top3[0].user?.avatarUrl ? (
                                                <Image src={top3[0].user.avatarUrl} alt="Rank 1" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600 font-bold uppercase text-xl">
                                                    {top3[0].user?.fullName?.substring(0, 2) || 'VĐ'}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-extrabold text-slate-950 text-center text-lg mb-2 truncate max-w-full">{top3[0].user?.fullName || "Người chơi"}</h3>
                                        <EloTierBadge elo={top3[0].eloPoints} size="md" className="mb-2" />
                                        <div className="font-bold text-slate-500 text-xs">
                                          Thắng: {top3[0].matchesWon}/{top3[0].matchesPlayed} trận
                                        </div>
                                    </div>
                                )}
                                {/* Rank 3 */}
                                {top3[2] && (
                                    <div className="flex flex-col items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full sm:w-1/3 order-3 sm:order-3 relative mt-8 sm:mt-0">
                                        <div className="absolute -top-3.5 bg-slate-100 text-slate-700 font-black text-xs px-3 py-1 rounded-full border">#3 THIRD</div>
                                        <div className="w-16 h-16 rounded-full border-2 border-slate-200 relative overflow-hidden mb-3 bg-slate-50">
                                            {top3[2].user?.avatarUrl ? (
                                                <Image src={top3[2].user.avatarUrl} alt="Rank 3" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold uppercase text-lg">
                                                    {top3[2].user?.fullName?.substring(0, 2) || 'VĐ'}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-center mb-2 truncate max-w-full">{top3[2].user?.fullName || "Người chơi"}</h3>
                                        <EloTierBadge elo={top3[2].eloPoints} size="sm" className="mb-2" />
                                        <div className="font-semibold text-slate-500 text-xs">
                                          Thắng: {top3[2].matchesWon}/{top3[2].matchesPlayed} trận
                                        </div>
                                    </div>
                                )}
                              </div>

                              {/* Ranking Table */}
                              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                                <th className="py-4 px-4 w-16 text-center">Hạng</th>
                                                <th className="py-4 px-4">Đấu thủ</th>
                                                <th className="py-4 px-4">Tier Badge</th>
                                                <th className="py-4 px-4 text-right">ELO</th>
                                                <th className="py-4 px-4 text-right hidden sm:table-cell">Số Trận</th>
                                                <th className="py-4 px-4 text-right hidden sm:table-cell">Thắng</th>
                                                <th className="py-4 px-4 text-right hidden md:table-cell">Tỷ Lệ Thắng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-slate-700 font-semibold">
                                            {rankings.map((rank, index) => {
                                                const winRate = rank.matchesPlayed > 0 ? ((rank.matchesWon / rank.matchesPlayed) * 100).toFixed(1) : '0';
                                                return (
                                                  <tr key={rank.id} className="hover:bg-slate-50/40 transition-colors">
                                                      <td className="py-4 px-4 text-center font-bold text-slate-500">
                                                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                                      </td>
                                                      <td className="py-4 px-4">
                                                          <div className="flex items-center gap-3">
                                                              <div className="w-9 h-9 rounded-full object-cover relative overflow-hidden bg-slate-100">
                                                                  {rank.user?.avatarUrl ? (
                                                                      <Image src={rank.user.avatarUrl} alt="Player" fill className="object-cover" />
                                                                  ) : (
                                                                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-black text-xs uppercase">
                                                                          {rank.user?.fullName?.substring(0, 2) || 'VD'}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <span className="font-bold text-slate-900">{rank.user?.fullName || "Người chơi"}</span>
                                                          </div>
                                                      </td>
                                                      <td className="py-4 px-4">
                                                          <EloTierBadge elo={rank.eloPoints} size="sm" />
                                                      </td>
                                                      <td className="py-4 px-4 text-right font-black text-blue-600">{rank.eloPoints}</td>
                                                      <td className="py-4 px-4 text-right text-slate-500 hidden sm:table-cell">{rank.matchesPlayed}</td>
                                                      <td className="py-4 px-4 text-right text-slate-500 hidden sm:table-cell">{rank.matchesWon}</td>
                                                      <td className="py-4 px-4 text-right text-emerald-600 hidden md:table-cell">{winRate}%</td>
                                                  </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                              </div>
                        </>
                    )}
                </div>

                {/* Right Column: Sidebar Tier Breakdown */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600" />
                                Hệ thống phân hạng
                            </h3>
                            <p className="text-slate-500 text-[11px] leading-relaxed">Điểm ELO tích lũy sau mỗi trận đấu sẽ xếp người chơi vào các Tier trình độ tương ứng.</p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Grand Master</span>
                                <span className="font-black text-xs text-slate-800">2200+ ELO</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Master</span>
                                <span className="font-black text-xs text-slate-800">2000 - 2199</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Diamond</span>
                                <span className="font-black text-xs text-slate-800">1800 - 1999</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Platinum</span>
                                <span className="font-black text-xs text-slate-800">1600 - 1799</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Gold</span>
                                <span className="font-black text-xs text-slate-800">1400 - 1599</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-gray-400/10 text-gray-450 px-2 py-0.5 rounded text-[10px] font-black uppercase">Silver</span>
                                <span className="font-black text-xs text-slate-800">1200 - 1399</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-205">
                                <span className="bg-orange-700/10 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Bronze</span>
                                <span className="font-black text-xs text-slate-800">100 - 1199</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
