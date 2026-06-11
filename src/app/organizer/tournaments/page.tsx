'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi } from '@/features/tournaments/api';
import { Trophy, Calendar, Users, Plus, Eye, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const stripHtml = (html?: string | null) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

export default function MyTournamentsPage() {
  const [parents, setParents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Fetch Parent Tournaments which group divisions
        const res = await tournamentsApi.getMyParentTournaments();
        let parentsWithDivisions: any[] = [];
        
        if (res.data) {
          parentsWithDivisions = await Promise.all(
            res.data.map(async (p) => {
              const detail = await tournamentsApi.getParentTournamentById(p.id);
              return detail.data;
            })
          );
        }

        // Fetch older standalone tournaments to prevent data loss
        const oldRes = await tournamentsApi.getMyTournaments();
        if (oldRes.data) {
          const standaloneTournaments = oldRes.data.filter(t => !t.parentId);
          const pseudoParents = standaloneTournaments.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            bannerUrl: t.bannerUrl,
            logoUrl: t.logoUrl,
            divisions: [t],
            isStandalone: true
          }));
          parentsWithDivisions = [...parentsWithDivisions, ...pseudoParents];
        }

        setParents(parentsWithDivisions);
      } catch (err) {
        toast.error('Không thể tải danh sách giải đấu của bạn');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  const handleDeleteParent = async (id: string, isStandalone: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Bạn có chắc chắn muốn xoá giải đấu này không? Toàn bộ các hình thức/vòng đấu bên trong (nếu có) cũng sẽ bị xoá và không thể khôi phục.')) return;
    try {
      if (isStandalone) {
        await tournamentsApi.deleteTournament(id);
      } else {
        await tournamentsApi.deleteParentTournament(id);
      }
      setParents(parents.filter(p => p.id !== id));
      toast.success('Đã xoá giải đấu thành công');
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xoá giải đấu');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Nháp (Private)</Badge>;
      case 'REGISTRATION_OPEN':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Mở Đăng Ký</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Đóng Đăng Ký</Badge>;
      case 'UPCOMING':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sắp Khởi Tranh</Badge>;
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
            Đang Thi Đấu
          </Badge>
        );
      case 'COMPLETED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Đã Kết Thúc</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Đã Hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Đang tải giải đấu của bạn...</p>
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
            <h1 className="text-3xl font-black text-slate-900">Giải Đấu Của Tôi</h1>
            <p className="text-slate-500 mt-1 font-medium">Quản lý các chuỗi giải đấu và hình thức thi đấu đã tạo</p>
          </div>
          <Link href="/organizer/tournaments/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-5 py-2.5 shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5" /> Tạo giải đấu mới
            </Button>
          </Link>
        </div>

        {parents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Chưa có giải đấu nào</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm">
              Bạn chưa tạo bất kỳ giải đấu nào. Hãy tạo giải đấu đầu tiên của bạn để kết nối những người đam mê thể thao!
            </p>
            <Link href="/organizer/tournaments/create" className="mt-6">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">Tạo giải đấu đầu tiên</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parents.map((parent) => {
              const divisions = parent.divisions || [];
              const firstDivision = divisions[0];
              const totalParticipants = divisions.reduce((acc: number, div: any) => acc + (div._summary?.participantCount || 0), 0);

              return (
                <div 
                  key={parent.id} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Visual Header */}
                  <div className="relative h-32 bg-slate-100 overflow-hidden group">
                    {parent.bannerUrl ? (
                      <Link href={`/tournaments/${firstDivision?.id || parent.id}`} target="_blank" className="block w-full h-full">
                        <img 
                          src={parent.bannerUrl} 
                          alt={parent.name} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                      </Link>
                    ) : (
                      <Link href={`/tournaments/${firstDivision?.id || parent.id}`} target="_blank" className="block w-full h-full bg-slate-200 flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-slate-400" />
                      </Link>
                    )}
                    
                    {/* Status & Action Badges */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      {firstDivision && getStatusBadge(firstDivision.status)}
                      <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-wider">
                        {divisions.length} Hình thức
                      </span>
                      <button
                        type="button"
                        className="w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                        onClick={(e) => handleDeleteParent(parent.id, parent.isStandalone || false, e)}
                        title="Xoá giải đấu"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Category Name Badge (neatly positioned, high contrast, no blur) */}
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="bg-slate-900/90 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                        {firstDivision?.category?.name || 'MULTISPORT'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-grow">
                    <h3 className="text-sm font-black text-slate-900 line-clamp-1">
                      {parent.name}
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-1.5 line-clamp-2 h-7 font-medium leading-relaxed">
                      {stripHtml(parent.description) || 'Giải đấu tập hợp nhiều hình thức thi đấu chuyên nghiệp.'}
                    </p>

                    {/* Division Tags */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {divisions.slice(0, 3).map((div: any) => (
                        <span key={div.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-bold border border-slate-200">
                          {div.matchType}
                        </span>
                      ))}
                      {divisions.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-[8px] font-bold">
                          +{divisions.length - 3} khác
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{firstDivision?.startDate ? new Date(firstDivision.startDate).toLocaleDateString('vi-VN') : 'Chưa xếp lịch'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{totalParticipants} VĐV đã ĐK</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="bg-slate-50 border-t border-slate-100 p-3">
                    {firstDivision ? (
                      <Link href={`/organizer/tournaments/${firstDivision.id}/manage`} className="block">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 font-bold shadow-sm shadow-blue-500/10 h-9 text-xs">
                          <Settings className="w-3.5 h-3.5" /> Quản lý giải đấu
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled className="w-full bg-slate-300 text-white font-bold h-9 text-xs">
                        Chưa có vòng đấu
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
