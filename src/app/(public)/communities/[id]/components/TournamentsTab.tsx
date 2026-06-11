'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, Users, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { communitiesApi } from '@/features/communities/api';
import { formatDate } from '@/utils/format';
import { Tournament } from '@/types/tournament';

export default function TournamentsTab({ 
  communityId, 
  isOwnerOrMod 
}: { 
  communityId: string; 
  isOwnerOrMod: boolean; 
}) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');

  const fetchTournaments = async () => {
    try {
      if (!isLoading) {
        setIsLoading(true);
      }
      const res = await communitiesApi.getTournaments(communityId);
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTournaments(data);
    } catch (error) {
      console.error('Failed to fetch community tournaments', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (communityId) {
      Promise.resolve().then(() => {
        fetchTournaments();
      });
    }
  }, [communityId]);

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'ONGOING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Đang diễn ra
          </span>
        );
      case 'REGISTRATION_OPEN':
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Sắp diễn ra
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Đã kết thúc
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'UPCOMING') return t.status === 'UPCOMING' || t.status === 'REGISTRATION_OPEN';
    return t.status === activeFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'UPCOMING', label: 'Sắp diễn ra' },
            { key: 'ONGOING', label: 'Đang diễn ra' },
            { key: 'COMPLETED', label: 'Đã kết thúc' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key as any)}
              className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                activeFilter === opt.key
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50 shadow-sm'
                  : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isOwnerOrMod && (
          <Button 
            onClick={() => router.push(`/organizer/tournaments/create?communityId=${communityId}`)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
          >
            + Tạo giải đấu cấp CLB
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
          <p className="text-slate-500 text-sm">Đang tải danh sách giải đấu...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium text-lg">Chưa có giải đấu nào</p>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
            Hiện không tìm thấy giải đấu nào phù hợp với bộ lọc này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTournaments.map((t) => (
            <div 
              key={t.id}
              onClick={() => router.push(`/tournaments/${t.id}`)}
              className="group cursor-pointer bg-white border border-slate-200 hover:border-emerald-500/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-base line-clamp-1">
                    {t.name}
                  </h3>
                  {getStatusBadge(t.status)}
                </div>

                {t.description && (
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4">
                    {t.description}
                  </p>
                )}

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {t.startDate ? formatDate(t.startDate) : 'Chưa cập nhật'} - {t.endDate ? formatDate(t.endDate) : 'Chưa cập nhật'}
                    </span>
                  </div>
                  {t.maxParticipants && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Tối đa {t.maxParticipants} người tham gia</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      Lệ phí: {Number(t.entryFee) > 0 ? `${Number(t.entryFee).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1 transition-colors">
                  Xem chi tiết giải đấu →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
