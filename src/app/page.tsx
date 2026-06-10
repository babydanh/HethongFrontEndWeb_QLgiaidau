'use client';

import { motion } from 'framer-motion';
import { Button, getButtonClasses } from '@/components/ui/Button';
import Link from 'next/link';
import { 
  Trophy, Calendar, Users, MapPin, ArrowRight, Shield, Activity, Target, 
  Plus, Bell, Mail, ChevronRight, MoreHorizontal, UserPlus, 
  Gamepad2, Gamepad, Target as Pool
} from 'lucide-react';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    const fetchData = async () => {
      try {
        const [tRes, cRes] = await Promise.all([
          tournamentsApi.getTournaments({ limit: 5 }),
          communitiesApi.getCommunities({ limit: 4 })
        ]);
        setTournaments(tRes.data || []);
        setCommunities(cRes.data || []);
      } catch (error: unknown) {
        const err = error as { response?: { data?: unknown }, message?: string };
        console.error("Failed to fetch homepage data", err.response?.data || err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Section 1: Giải đấu sắp diễn ra */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900">Giải đấu sắp diễn ra</h2>
              <Link href="/tournaments" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
              
              {isLoading ? (
                <div className="flex gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="min-w-[300px] w-[300px] h-[320px] bg-slate-200 animate-pulse rounded-xl shrink-0"></div>
                  ))}
                </div>
              ) : tournaments.length > 0 ? (
                tournaments.map((tournament) => (
                  <div key={tournament.id} className="min-w-[300px] w-[300px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col snap-start shrink-0">
                    <div className="h-32 bg-slate-200 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full border border-slate-200">
                        <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" /> {tournament.format || 'Giải đấu'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col gap-3 flex-grow">
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-snug">{tournament.name}</h3>
                      <div className="flex flex-col gap-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('vi-VN') : 'Sắp tới'}</div>
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {tournament.locationAddress || 'Chưa cập nhật'}</div>
                        <div className="flex items-center gap-2"><Users className="w-4 h-4" /> {tournament._count?.participants || 0}/{tournament.maxParticipants || 0}</div>
                      </div>
                      <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100">
                        <span className="text-sm font-semibold text-slate-900">{tournament.entryFee ? `${tournament.entryFee}đ` : 'Miễn phí'}</span>
                        <Link href={`/tournaments/${tournament.id}`}>
                          <Button size="sm" variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">Xem chi tiết</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Chưa có giải đấu nào sắp diễn ra.</p>
                </div>
              )}

            </div>
          </section>

          {/* Section 2: Câu lạc bộ của tôi */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900">Câu lạc bộ của tôi</h2>
              <button className="text-slate-400 hover:text-blue-600 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {isLoading ? (
                <>
                  <div className="bg-slate-200 animate-pulse h-[82px] rounded-xl border border-slate-200"></div>
                  <div className="bg-slate-200 animate-pulse h-[82px] rounded-xl border border-slate-200"></div>
                </>
              ) : communities.length > 0 ? (
                communities.map((community) => (
                  <Link href={`/communities/${community.id}`} key={community.id}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:border-slate-300 transition-colors cursor-pointer group h-full">
                      <div className="w-12 h-12 rounded-full border border-slate-200 bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                        {community.logoUrl ? (
                          <img src={community.logoUrl} alt={community.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex flex-col flex-grow">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{community.name}</h3>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{community.description || 'Chưa có mô tả'}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-1 sm:col-span-2 text-center py-6 bg-white rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm">
                  Chưa có câu lạc bộ nào.
                </div>
              )}

              {/* Add New Community */}
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 text-slate-500 transition-colors cursor-pointer min-h-[82px]">
                <UserPlus className="w-5 h-5" />
                <span className="text-sm font-semibold">Tham gia câu lạc bộ mới</span>
              </div>

            </div>
          </section>



        </div>

        {/* Right Column (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {!isClient ? (
             <div className="animate-pulse bg-slate-200 h-[400px] rounded-xl w-full"></div>
          ) : !isAuthenticated ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa đăng nhập</h3>
              <p className="text-sm text-slate-500 mb-6">Vui lòng đăng nhập để xem thông tin cá nhân, quản lý giải đấu và tham gia câu lạc bộ của bạn.</p>
              <div className="flex flex-col w-full gap-3">
                <Link href="/login" className={getButtonClasses("default", "default", "w-full bg-blue-600 hover:bg-blue-700 shadow-sm")}>
                  Đăng nhập ngay
                </Link>
                <Link href="/register" className={getButtonClasses("outline", "default", "w-full text-slate-600 hover:bg-slate-50 border-slate-200")}>
                  Đăng ký tài khoản
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Widget 1: Cá nhân */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-20"></div>
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-sm z-10 mt-2 relative bg-blue-100 flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-blue-600 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-3">{user?.fullName || 'Người dùng'}</h3>
                <p className="text-sm text-slate-400">{user?.email}</p>
            <div className="flex justify-center gap-2 mt-3">
              <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Hạng A
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                ELO 1850
              </span>
            </div>
            <div className="grid grid-cols-3 w-full gap-4 mt-6 pt-4 border-t border-slate-100">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-900">12</span>
                <span className="text-xs font-semibold text-slate-400">Giải đấu</span>
              </div>
              <div className="flex flex-col items-center border-l border-r border-slate-100">
                <span className="text-xl font-bold text-slate-900">45</span>
                <span className="text-xs font-semibold text-slate-400">Trận thắng</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-900">65%</span>
                <span className="text-xs font-semibold text-slate-400">Tỉ lệ thắng</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Trận đấu sắp tới */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">Trận đấu tiếp theo</h3>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm text-slate-500">
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">Hôm nay, 18:00</span>
                <span className="font-medium">Sân Cầu Giấy</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full border border-slate-200 bg-white"></div>
                  <span className="text-xs font-semibold text-slate-900">Bạn</span>
                </div>
                <div className="text-xl font-bold text-slate-300">VS</div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full border border-slate-200 bg-white"></div>
                  <span className="text-xs font-semibold text-slate-900">Lê Văn C</span>
                </div>
              </div>
              <div className="text-center text-xs font-semibold text-slate-400 mt-1">Vòng Bảng - Hanoi Open</div>
              <Button variant="outline" className="w-full mt-2 border-slate-200 text-slate-600 bg-white hover:bg-slate-50">Cập nhật kết quả</Button>
            </div>
          </div>

          {/* Widget 3: Bảng xếp hạng nhanh */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">BXH Hanoi Tennis (Hạng A)</h3>
              <a href="#" className="text-blue-600 hover:underline text-xs font-semibold">Xem đầy đủ</a>
            </div>
            <div className="flex flex-col">
              
              <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-lg font-bold text-blue-600 w-4 text-center">1</span>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100"></div>
                <div className="flex flex-col flex-grow">
                  <span className="text-sm font-semibold text-slate-900">Phạm D</span>
                </div>
                <span className="text-sm font-semibold text-slate-500">1920</span>
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-lg font-bold text-slate-400 w-4 text-center">2</span>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100"></div>
                <div className="flex flex-col flex-grow">
                  <span className="text-sm font-semibold text-slate-900">Hoàng E</span>
                </div>
                <span className="text-sm font-semibold text-slate-500">1895</span>
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-slate-100 bg-blue-50/50 rounded-lg -mx-2 px-2">
                <span className="text-lg font-bold text-slate-900 w-4 text-center">3</span>
                <div className="w-8 h-8 rounded-full border-2 border-blue-600 bg-slate-100"></div>
                <div className="flex flex-col flex-grow">
                  <span className="text-sm font-bold text-blue-600">Bạn</span>
                </div>
                <span className="text-sm font-bold text-blue-600">1850</span>
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-400 w-4 text-center">4</span>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100"></div>
                <div className="flex flex-col flex-grow">
                  <span className="text-sm font-medium text-slate-900">Bùi G</span>
                </div>
                <span className="text-sm font-medium text-slate-500">1830</span>
              </div>

            </div>
          </div>
          </>
          )}

          {/* Widget 4: Banner Ads 4:3 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col cursor-pointer group">
            <div className="aspect-[4/3] bg-slate-900 relative p-6 flex flex-col justify-end">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
              {/* Replace with actual image later */}
              <div className="absolute inset-0 bg-blue-600 opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white/80 text-[10px] px-1.5 py-0.5 rounded font-semibold z-20">Ad</div>
              
              <div className="relative z-20 mt-auto">
                 <h4 className="text-lg font-bold text-white mb-1">Vợt Tennis PRO 2026</h4>
                 <p className="text-sm text-white/80 font-medium">Độc quyền tại TournaShop. Giảm 20%.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
