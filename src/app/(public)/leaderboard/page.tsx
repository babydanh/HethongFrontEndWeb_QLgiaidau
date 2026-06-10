"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { categoriesApi, Category } from "@/features/categories/api";
import { rankingsApi, PlayerRanking } from "@/features/rankings/api";

export default function LeaderboardPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [rankings, setRankings] = useState<PlayerRanking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const cats = await categoriesApi.getCategories();
                if (cats.data.length > 0) {
                    setCategories(cats.data);
                    setActiveCategoryId(cats.data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!activeCategoryId) return;
        
        const fetchRankings = async () => {
            setIsLoading(true);
            try {
                const res = await rankingsApi.getRankings({ categoryId: activeCategoryId, limit: 50 });
                setRankings(res.data);
            } catch (error) {
                console.error("Failed to fetch rankings", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRankings();
    }, [activeCategoryId]);

    // Lấy top 3 để hiển thị Podium
    const top3 = rankings.slice(0, 3);
    const restRankings = rankings.slice(3);

    return (
        <div className="w-full max-w-container-max-width mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-12 flex flex-col gap-8">
            {/* Header & Sport Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-surface-variant pb-4">
                <div>
                    <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Bảng xếp hạng</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">Hệ thống xếp hạng ELO cho các bộ môn thể thao.</p>
                </div>
                <div className="flex bg-surface-container-low p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                    {categories.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => setActiveCategoryId(cat.id)}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-md font-label-md text-label-md whitespace-nowrap transition-colors ${activeCategoryId === cat.id ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                {/* Left Column: Main Ranking Area */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64 text-on-surface-variant">Đang tải bảng xếp hạng...</div>
                    ) : rankings.length === 0 ? (
                        <div className="flex justify-center items-center h-64 text-on-surface-variant">Chưa có dữ liệu xếp hạng cho bộ môn này.</div>
                    ) : (
                        <>
                            {/* Top 3 Podiums */}
                            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 mt-8 mb-12">
                                {/* Rank 2 */}
                                {top3[1] && (
                                    <div className="flex flex-col items-center bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 w-full sm:w-1/3 order-2 sm:order-1 relative mt-8 sm:mt-0">
                                        <div className="absolute -top-4 bg-surface-container-highest text-on-surface font-label-md text-label-md px-3 py-1 rounded-full border border-outline-variant">#2</div>
                                        <div className="w-16 h-16 rounded-full border-2 border-outline-variant relative overflow-hidden mb-4 bg-surface-variant">
                                            <Image src={top3[1].user?.avatarUrl || "https://i.pravatar.cc/150?u=2"} alt="Rank 2" fill className="object-cover" />
                                        </div>
                                        <h3 className="font-headline-md text-headline-md text-on-surface text-center mb-1">{top3[1].user?.fullName || "Người chơi"}</h3>
                                        <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold tracking-wider mb-3">HIGH A</span>
                                        <div className="text-primary font-headline-md text-headline-md">{top3[1].eloPoints}</div>
                                        <div className="font-label-sm text-label-sm text-on-surface-variant">ELO</div>
                                    </div>
                                )}
                                {/* Rank 1 */}
                                {top3[0] && (
                                    <div className="flex flex-col items-center bg-surface-container-lowest rounded-xl border-2 border-[#FFD700] shadow-md p-8 w-full sm:w-1/3 order-1 sm:order-2 relative z-10 transform sm:-translate-y-4">
                                        <div className="absolute -top-5 bg-[#FFD700] text-[#8B6508] font-bold text-label-md px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">emoji_events</span> #1
                                        </div>
                                        <div className="w-20 h-20 rounded-full border-4 border-[#FFD700] relative overflow-hidden mb-4 bg-surface-variant">
                                            <Image src={top3[0].user?.avatarUrl || "https://i.pravatar.cc/150?u=1"} alt="Rank 1" fill className="object-cover" />
                                        </div>
                                        <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface text-center mb-1">{top3[0].user?.fullName || "Người chơi"}</h3>
                                        <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded text-[11px] font-bold tracking-wider mb-4">PRO</span>
                                        <div className="text-primary font-display text-[28px] font-bold leading-tight">{top3[0].eloPoints}</div>
                                        <div className="font-label-md text-label-md text-on-surface-variant">ELO</div>
                                    </div>
                                )}
                                {/* Rank 3 */}
                                {top3[2] && (
                                    <div className="flex flex-col items-center bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 w-full sm:w-1/3 order-3 sm:order-3 relative mt-8 sm:mt-0">
                                        <div className="absolute -top-4 bg-surface-container-highest text-on-surface font-label-md text-label-md px-3 py-1 rounded-full border border-outline-variant">#3</div>
                                        <div className="w-16 h-16 rounded-full border-2 border-outline-variant relative overflow-hidden mb-4 bg-surface-variant">
                                            <Image src={top3[2].user?.avatarUrl || "https://i.pravatar.cc/150?u=3"} alt="Rank 3" fill className="object-cover" />
                                        </div>
                                        <h3 className="font-headline-md text-headline-md text-on-surface text-center mb-1">{top3[2].user?.fullName || "Người chơi"}</h3>
                                        <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold tracking-wider mb-3">HIGH A</span>
                                        <div className="text-primary font-headline-md text-headline-md">{top3[2].eloPoints}</div>
                                        <div className="font-label-sm text-label-sm text-on-surface-variant">ELO</div>
                                    </div>
                                )}
                            </div>

                            {/* Ranking Table */}
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-surface-container-low border-b border-outline-variant">
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant w-16 text-center">#</th>
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant">Người chơi</th>
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant">Tier</th>
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant text-right">ELO</th>
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant text-right hidden sm:table-cell">Trận</th>
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant text-right hidden md:table-cell">Thắng</th>
                                                <th className="py-4 px-4 font-label-md text-label-md text-on-surface-variant text-right hidden lg:table-cell">Tỷ lệ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-body-md text-body-md divide-y divide-surface-variant">
                                            {restRankings.map((rank, index) => {
                                                const winRate = rank.matchesPlayed > 0 ? ((rank.matchesWon / rank.matchesPlayed) * 100).toFixed(1) : 0;
                                                return (
                                                <tr key={rank.id} className="hover:bg-surface-container-low transition-colors">
                                                    <td className="py-3 px-4 text-center font-label-md text-on-surface-variant">{index + 4}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full object-cover relative overflow-hidden bg-surface-variant">
                                                                <Image src={rank.user?.avatarUrl || `https://i.pravatar.cc/150?u=${rank.userId}`} alt="Player" fill className="object-cover" />
                                                            </div>
                                                            <span className="font-medium text-on-surface">{rank.user?.fullName || "Người chơi"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4"><span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">MID A</span></td>
                                                    <td className="py-3 px-4 text-right font-medium text-on-surface">{rank.eloPoints}</td>
                                                    <td className="py-3 px-4 text-right text-on-surface-variant hidden sm:table-cell">{rank.matchesPlayed}</td>
                                                    <td className="py-3 px-4 text-right text-on-surface-variant hidden md:table-cell">{rank.matchesWon}</td>
                                                    <td className="py-3 px-4 text-right text-on-surface-variant hidden lg:table-cell">{winRate}%</td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Column: Sidebar */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 sticky top-24">
                        <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">info</span>
                            Giải thích Tier
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Hệ thống phân loại trình độ người chơi dựa trên điểm ELO hiện tại.</p>
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-low">
                                <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded text-xs font-bold tracking-wider">PRO</span>
                                <span className="font-label-md text-label-md text-on-surface">2000+</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest">
                                <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-xs font-bold tracking-wider">HIGH A</span>
                                <span className="font-label-md text-label-md text-on-surface">1900 - 1999</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest">
                                <span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-1 rounded text-xs font-bold tracking-wider">MID A</span>
                                <span className="font-label-md text-label-md text-on-surface">1800 - 1899</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest">
                                <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">LOW A</span>
                                <span className="font-label-md text-label-md text-on-surface">1700 - 1799</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest opacity-80">
                                <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">HIGH B</span>
                                <span className="font-label-md text-label-md text-on-surface-variant">1600 - 1699</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest opacity-70">
                                <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">MID B</span>
                                <span className="font-label-md text-label-md text-on-surface-variant">1500 - 1599</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest opacity-60">
                                <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">LOW B</span>
                                <span className="font-label-md text-label-md text-on-surface-variant">1400 - 1499</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-container-lowest opacity-50">
                                <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">C / D</span>
                                <span className="font-label-md text-label-md text-on-surface-variant">&lt; 1400</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
