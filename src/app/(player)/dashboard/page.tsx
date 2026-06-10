'use client';

import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Trophy, Calendar, Users, Activity, Settings, Plus, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [participatingTournaments, setParticipatingTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [myRes, upcomingRes] = await Promise.all([
          // Assuming the backend supports filtering by participant/user
          tournamentsApi.getTournaments({ limit: 3, status: 'ONGOING' }),
          tournamentsApi.getTournaments({ limit: 1, status: 'UPCOMING' })
        ]);
        setParticipatingTournaments(myRes.data || []);
        setUpcomingTournaments(upcomingRes.data || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      
      {/* Header: Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600 uppercase">{user?.fullName?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chào mừng trở lại, {user?.fullName?.split(' ').pop() || 'bạn'}! 👋</h1>
            <p className="text-sm text-slate-500 mt-1">Hôm nay bạn muốn tham gia giải đấu nào?</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/tournaments">
            <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50">
              <Calendar className="w-4 h-4 mr-2" /> Tìm giải đấu
            </Button>
          </Link>
          <Link href="/organizer/tournaments/create">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Tạo giải đấu
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Section: Giải đấu đang tham gia */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-600" /> Giải đấu đang tham gia / Quan tâm
              </h2>
              <Link href="/tournaments" className="text-sm font-semibold text-blue-600 hover:underline">Tất cả</Link>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                {isLoading ? (
                  <div className="animate-pulse bg-slate-100 h-20 rounded-xl w-full"></div>
                ) : participatingTournaments.length > 0 ? (
                  participatingTournaments.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors bg-white">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Trophy className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{t.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {t.locationAddress || 'Chưa cập nhật'}</span>
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t.format}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="inline-block bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold mb-1">
                          {t.status === 'ONGOING' ? 'Đang diễn ra' : t.status === 'UPCOMING' ? 'Sắp diễn ra' : t.status}
                        </span>
                        <Link href={`/tournaments/${t.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200">Chi tiết</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-500">
                    Chưa có giải đấu nào đang tham gia.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: Trận đấu sắp tới */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" /> Trận đấu tiếp theo
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="animate-pulse bg-slate-100 h-40 rounded-xl w-full"></div>
              ) : upcomingTournaments.length > 0 ? (
                upcomingTournaments.map(t => (
                  <div key={t.id} className="bg-slate-900 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 rounded-full blur-[80px] opacity-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                      <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-4">
                        {t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : 'Sắp tới'}
                      </span>
                      
                      <div className="flex items-center justify-center gap-8 w-full">
                        <div className="flex flex-col items-center gap-3 w-1/3">
                          <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
                            {user?.avatarUrl ? (
                              <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-bold text-slate-400">Bạn</span>
                            )}
                          </div>
                          <span className="font-bold text-white text-center line-clamp-1">{user?.fullName || 'Bạn'}</span>
                        </div>

                        <div className="text-2xl font-black text-slate-600 italic">VS</div>

                        <div className="flex flex-col items-center gap-3 w-1/3">
                          <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
                            <span className="text-xl font-bold text-slate-400">?</span>
                          </div>
                          <span className="font-bold text-white text-center line-clamp-1">Chưa xác định</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800 w-full flex justify-between items-center">
                        <div className="text-sm text-slate-400 font-medium">{t.name}</div>
                        <Link href={`/tournaments/${t.id}`}>
                          <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold">Chi tiết giải</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500">
                  Bạn không có trận đấu nào sắp tới.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column (Widgets) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Widget: ELO & Thống kê */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Trophy className="w-24 h-24" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Chỉ số ELO</h3>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-black text-blue-600">1850</span>
              <span className="text-sm font-bold text-emerald-500 mb-1">+12</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block mb-1">Trận Thắng</span>
                <span className="text-xl font-bold text-slate-900">45</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block mb-1">Tỉ lệ Thắng</span>
                <span className="text-xl font-bold text-slate-900">65%</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block mb-1">Xếp hạng hiện tại</span>
                  <span className="text-sm font-bold text-slate-900">Hạng A - Bán chuyên</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Widget: Quản lý nhanh */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
             <h3 className="text-sm font-bold text-slate-900 mb-4">Lối tắt</h3>
             <div className="flex flex-col gap-2">
               <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-colors border border-transparent hover:border-slate-200">
                 <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Settings className="w-4 h-4" /></div>
                 Cài đặt tài khoản
               </Link>
               <Link href="/organizer/tournaments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-colors border border-transparent hover:border-slate-200">
                 <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><Trophy className="w-4 h-4" /></div>
                 Giải đấu của tôi (Ban tổ chức)
               </Link>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
