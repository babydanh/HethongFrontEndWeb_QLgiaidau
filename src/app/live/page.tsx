"use client";

import Image from "next/image";
import Link from "next/link";

export default function LiveScorePage() {
    return (
        <div className="w-full px-margin-mobile md:px-margin-desktop max-w-container-max-width mx-auto py-8">
            <style dangerouslySetInnerHTML={{__html: `
                .pulse-dot {
                    animation: custom-pulse 2s infinite;
                }
                @keyframes custom-pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(186, 26, 26, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(186, 26, 26, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(186, 26, 26, 0); }
                }
            `}} />
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="font-headline-lg text-headline-lg md:font-display md:text-display text-on-surface">Trận đấu trực tiếp</h1>
                    <span className="bg-error text-on-error font-label-sm text-label-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 bg-on-error rounded-full pulse-dot"></span>
                        3 trận
                    </span>
                </div>
                <div className="relative">
                    <select className="appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer">
                        <option>Tất cả giải đấu</option>
                        <option>Hanoi Open 2026</option>
                        <option>Saigon Masters</option>
                        <option>Da Nang Challenger</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                </div>
            </div>

            {/* Live Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-12">
                {/* Match Card 1 */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <div className="flex justify-between items-center border-b border-surface-variant pb-4">
                        <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                            <span className="font-medium">Hanoi Open 2026 • Bán kết</span>
                        </div>
                        <span className="text-error font-label-sm text-label-sm flex items-center gap-1 bg-error-container px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-error rounded-full pulse-dot"></span>
                            Đang diễn ra
                        </span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border-2 border-primary relative">
                                <Image src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop" alt="Team A" fill className="object-cover" />
                            </div>
                            <span className="font-headline-md text-headline-md text-center">Nguyễn V. A.</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Hà Nội</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 px-8">
                            <div className="flex items-baseline gap-4 font-display text-display font-bold">
                                <span className="text-on-surface">1</span>
                                <span className="text-outline-variant">-</span>
                                <span className="text-on-surface">1</span>
                            </div>
                            <div className="flex gap-2 font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                                <span>21-18</span>
                                <span>18-21</span>
                                <span className="text-primary font-bold">12-8*</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden relative">
                                <Image src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=300&auto=format&fit=crop" alt="Team B" fill className="object-cover" />
                            </div>
                            <span className="font-headline-md text-headline-md text-center">Trần T. B.</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">TP.HCM</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-surface-variant pt-4">
                        <div className="flex items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span>Sân 1</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">sports</span>Trọng tài: Lê C.</span>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[18px]">favorite</span>
                                <span className="font-label-sm text-label-sm">124</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Match Card 2 */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <div className="flex justify-between items-center border-b border-surface-variant pb-4">
                        <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                            <span className="font-medium">Saigon Masters • Tứ kết</span>
                        </div>
                        <span className="text-error font-label-sm text-label-sm flex items-center gap-1 bg-error-container px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-error rounded-full pulse-dot"></span>
                            Đang diễn ra
                        </span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden relative">
                                <Image src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&auto=format&fit=crop" alt="Team C" fill className="object-cover" />
                            </div>
                            <span className="font-headline-md text-headline-md text-center">Phạm D.</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Đà Nẵng</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 px-8">
                            <div className="flex items-baseline gap-4 font-display text-display font-bold">
                                <span className="text-on-surface">0</span>
                                <span className="text-outline-variant">-</span>
                                <span className="text-on-surface">0</span>
                            </div>
                            <div className="flex gap-2 font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                                <span className="text-primary font-bold">14-14*</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border-2 border-primary relative">
                                <Image src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=300&auto=format&fit=crop" alt="Team D" fill className="object-cover" />
                            </div>
                            <span className="font-headline-md text-headline-md text-center">Lý E.</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Cần Thơ</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-surface-variant pt-4">
                        <div className="flex items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span>Sân 3</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">sports</span>Trọng tài: Hoàng F.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recently Finished Section */}
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6">Vừa kết thúc</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-12 opacity-80">
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-6 grayscale-[20%]">
                    <div className="flex justify-between items-center border-b border-surface-variant pb-4">
                        <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                            <span className="font-medium">Hanoi Open 2026 • Tứ kết</span>
                        </div>
                        <span className="text-on-surface-variant font-label-sm text-label-sm bg-surface-container px-2 py-1 rounded-full">
                            Kết thúc
                        </span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden ring-4 ring-green-500/20 border-2 border-green-600 relative">
                                <Image src="https://images.unsplash.com/photo-1544723795-3cj383439e6k?q=80&w=300&auto=format&fit=crop" alt="Winner" fill className="object-cover" />
                            </div>
                            <span className="font-headline-md text-headline-md text-center text-green-700 dark:text-green-400">Bùi H. <span className="material-symbols-outlined text-[16px] align-middle">check_circle</span></span>
                        </div>
                        <div className="flex flex-col items-center gap-2 px-8">
                            <div className="flex items-baseline gap-4 font-display text-display font-bold">
                                <span className="text-green-700 dark:text-green-400">2</span>
                                <span className="text-outline-variant">-</span>
                                <span className="text-on-surface-variant">0</span>
                            </div>
                            <div className="flex gap-2 font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                                <span>21-12</span>
                                <span>21-16</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 flex-1 opacity-70">
                            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden relative">
                                <Image src="https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=300&auto=format&fit=crop" alt="Loser" fill className="object-cover" />
                            </div>
                            <span className="font-headline-md text-headline-md text-center">Đinh K.</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-surface-variant pt-4">
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                            Kết thúc lúc 14:30
                        </div>
                        <button className="text-primary hover:text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold transition-colors">
                            Xem chi tiết
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
