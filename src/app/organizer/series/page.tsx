'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { seriesApi } from '@/features/series/api';
import { TournamentSeries } from '@/types/series';
import { useAuthStore } from '@/lib/zustand/authStore';
import { Trophy, Calendar, Layers, Plus, ExternalLink, Settings, Eye } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function OrganizerSeriesPage() {
  const { user } = useAuthStore();
  const [seriesList, setSeriesList] = useState<TournamentSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchSeries = async () => {
      try {
        setIsLoading(true);
        const res = await seriesApi.getSeriesList({ organizerId: user.id, limit: 50 });
        if (res.data) {
          setSeriesList(res.data);
        }
      } catch (err: unknown) {
        toast.error('Không thể tải danh sách chuỗi giải đấu của bạn');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSeries();
  }, [user]);

  const getStatusBadge = (status: TournamentSeries['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Bản nháp</Badge>;
      case 'ACTIVE':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Đang diễn ra</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Đã kết thúc</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Đã hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Đang tải chuỗi giải đấu của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Chuỗi Giải Đấu Của Tôi</h1>
            <p className="text-slate-500 mt-1 font-medium">Quản lý các hệ thống tour đấu tích lũy điểm PSR và phân phối suất vé thẳng</p>
          </div>
          <Link href="/organizer/series/create">
            <Button className="font-semibold flex items-center gap-2 px-5 py-2.5 shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5" /> Tạo chuỗi giải mới
            </Button>
          </Link>
        </div>

        {seriesList.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Chưa có chuỗi giải đấu nào</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm">
              Bạn chưa tạo bất kỳ hệ thống chặng đấu nào. Hãy tạo chuỗi giải đấu đầu tiên của bạn để tích lũy xếp hạng PSR cho các vận động viên!
            </p>
            <Link href="/organizer/series/create" className="mt-6">
              <Button className="px-6">Tạo chuỗi giải đầu tiên</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seriesList.map((series) => (
              <div 
                key={series.id} 
                className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Header */}
                <div className="relative h-24 bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-end">
                  {series.bannerUrl && (
                    <img 
                      src={series.bannerUrl} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover opacity-20"
                    />
                  )}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(series.status)}
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs font-bold uppercase tracking-wider relative z-10">
                    🏆 Point Series
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-grow">
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                    {series.name}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2 line-clamp-2 h-10 font-medium">
                    {series.description || 'Không có mô tả nào.'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-slate-500 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {series.startDate ? new Date(series.startDate).toLocaleDateString('vi-VN') : 'Chưa xếp lịch'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-blue-600">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>{series._count?.legs || 0} Chặng đấu</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
                  <Link href={`/organizer/series/${series.id}/manage`} className="flex-1">
                    <Button variant="outline" className="w-full text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1.5 font-bold">
                      <Settings className="w-4 h-4" /> Cấu hình
                    </Button>
                  </Link>
                  <Link href={`/series/${series.slug}`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-1.5 font-bold">
                      <Eye className="w-4 h-4" /> Giao diện public
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

