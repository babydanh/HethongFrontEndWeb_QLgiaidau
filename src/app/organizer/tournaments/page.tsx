'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi, divisionsApi } from '@/features/tournaments/api';
import { Trophy, Calendar, Users, Plus, Eye, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { Tournament } from '@/types/tournament';
import { formatDate } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import { getTournamentStatusClassName, getTournamentStatusLabel } from '@/utils/tournament-status';

interface ParentWithDivisions {
  id: string;
  name: string;
  description?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  divisions: Tournament[];
  isStandalone?: boolean;
}

const stripHtml = (html?: string | null) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

const getDefaultBanner = (categoryName?: string | null) => {
  return '/vndcsport.svg';
};

const getFormatLabel = (matchType: string, genderRestriction?: string | null) => {
  const mt = matchType || '';
  const gr = genderRestriction || '';
  if (mt === 'SINGLES') {
    return gr === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam';
  }
  if (mt === 'DOUBLES') {
    return gr === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam';
  }
  if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
    return 'Đôi Nam Nữ';
  }
  return mt;
};

const getDivisionIcon = (matchType?: string, genderRestriction?: string | null) => {
  const mt = matchType || '';
  const gr = genderRestriction || '';
  if (mt === 'SINGLES') {
    return gr === 'FEMALE' ? '♀️' : '♂️';
  }
  if (mt === 'DOUBLES' || mt === 'MIXED_DOUBLES' || mt === 'MIXED') {
    return gr === 'FEMALE' ? '👩‍👩' : gr === 'MIXED' ? '👥' : '👨‍👨';
  }
  return '🏆';
};

export default function MyTournamentsPage() {
  const router = useRouter();
  const [parents, setParents] = useState<ParentWithDivisions[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournaments = async () => {
    try {
      setIsLoading(true);
      // Fetch giải đấu lớn (parent tournaments) - mỗi giải chứa nhiều hình thức thi đấu
      const res = await tournamentsApi.getMyParentTournaments();
      let parentsWithDivisions: ParentWithDivisions[] = [];
      
      if (res.data) {
        parentsWithDivisions = await Promise.all(
          res.data.map(async (p: { id: string }) => {
            const detail = await tournamentsApi.getParentTournamentById(p.id);
            return detail.data;
          })
        );
      }

      // Fetch older standalone tournaments to prevent data loss
      const oldRes = await tournamentsApi.getMyTournaments();
      if (oldRes.data) {
        const standaloneTournaments = oldRes.data.filter(t => !t.parentId);
        const pseudoParents = await Promise.all(
          standaloneTournaments.map(async (t) => {
            let divisionsList: Tournament[] = [];
            try {
              const divRes = await divisionsApi.getDivisions(t.id);
              if (divRes.data) {
                divisionsList = divRes.data.map((div) => ({
                  ...div,
                  tournamentConfig: {
                    bracketType: div.bracketType || undefined,
                    roundConfig: div.roundConfig || undefined,
                  },
                  format: div.bracketType || '',
                  currency: 'VND',
                  organizerId: t.organizerId || '',
                })) as unknown as Tournament[];
              }
            } catch (err) {
              console.error(`Failed to fetch divisions for tournament ${t.id}:`, err);
            }

            // Fallback to the tournament itself if no divisions are found to preserve compatibility
            if (divisionsList.length === 0) {
              divisionsList = [t];
            }

            return {
              id: t.id,
              name: t.name,
              description: t.description,
              bannerUrl: t.bannerUrl,
              logoUrl: t.logoUrl,
              divisions: divisionsList,
              isStandalone: true
            };
          })
        );
        parentsWithDivisions = [...parentsWithDivisions, ...pseudoParents];
      }

      setParents(parentsWithDivisions);
    } catch (err) {
      toast.error('Không thể tải danh sách giải đấu của bạn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      void fetchTournaments();
    });
  }, []);

  const handleDeleteParent = async (id: string, isStandalone: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Bạn có chắc chắn muốn xoá giải đấu này không? Toàn bộ các hình thức thi đấu bên trong (nếu có) cũng sẽ bị xoá và không thể khôi phục.')) return;
    try {
      let res;
      if (isStandalone) {
        res = await tournamentsApi.deleteTournament(id);
      } else {
        res = await tournamentsApi.deleteParentTournament(id);
      }

      // Check if delete is pending review
      const resData = res?.data as unknown as { pendingDelete?: boolean; message?: string } | undefined;
      if (resData?.pendingDelete) {
        toast.success(resData.message || 'Yêu cầu xóa giải đấu của bạn đã được gửi tới Quản trị viên để xét duyệt.');
        fetchTournaments();
      } else {
        setParents(parents.filter(p => p.id !== id));
        toast.success('Đã xoá giải đấu thành công');
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      // Hiện rõ lý do từ backend (vd: chưa hoàn tiền, đang chờ hoàn tiền)
      toast.error(msg || 'Có lỗi xảy ra khi xoá giải đấu');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PENDING_DELETE') {
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Chờ Xóa</Badge>;
    }

    return <Badge className={getTournamentStatusClassName(status)}>{getTournamentStatusLabel(status)}</Badge>;
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
            <h1 className="text-3xl font-bold text-slate-900">Giải Đấu Của Tôi</h1>
            <p className="text-slate-500 mt-1 font-medium">Quản lý các Giải đấu đã tạo</p>
          </div>
          <Link href="/organizer/tournaments/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-5 py-2.5 shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5" /> Tạo giải đấu mới
            </Button>
          </Link>
        </div>

        {parents.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center max-w-xl mx-auto">
            <div className="w-24 h-24 flex items-center justify-center mb-4">
              <img src="/vndcsport.svg" alt="VNDC Sport" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Chưa có giải đấu nào</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm">
              Bạn chưa tạo bất kỳ Giải đấu nào. Hãy tạo Giải đấu đầu tiên của bạn để kết nối những người đam mê thể thao!
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
              const totalParticipants = divisions.reduce((acc: number, div: Tournament) => acc + (div._summary?.participantCount || 0), 0);
              const publicHref = `/tournaments/${parent.isStandalone ? parent.id : (firstDivision?.id || parent.id)}`;
              const manageHref = parent.isStandalone
                ? `/organizer/tournaments/${parent.id}/manage`
                : `/organizer/tournaments/${firstDivision?.id || parent.id}/manage`;
              const opsHref = parent.isStandalone
                ? `/organizer/tournaments/${parent.id}/ops`
                : `/organizer/tournaments/${firstDivision?.id || parent.id}/ops`;

              return (
                <div 
                  key={parent.id} 
                  className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Visual Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    <Link href={publicHref} target="_blank" className="block w-full h-full">
                      <img 
                        src={parent.bannerUrl || firstDivision?.bannerUrl || getDefaultBanner(firstDivision?.category?.name || parent.name)} 
                        alt={parent.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    </Link>

                    {/* Scope & Rank Badges (Top-Left) */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit ${
                        firstDivision?.tournamentType === 'CLUB' ? 'bg-amber-600/90' : 'bg-blue-600/90'
                      }`}>
                        {firstDivision?.tournamentType === 'CLUB' ? 'Nội bộ CLB' : 'Mở rộng'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit ${
                        firstDivision?.isRanked ? 'bg-amber-500/90' : 'bg-slate-600/90'
                      }`}>
                        {firstDivision?.isRanked ? 'Xếp hạng ELO' : 'Phong trào'}
                      </span>
                    </div>
                    
                    {/* Status & Action Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      {firstDivision && getStatusBadge(firstDivision.status)}
                      <span className="px-2.5 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm">
                        {divisions.length} Hình thức
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={(e) => handleDeleteParent(parent.id, parent.isStandalone || false, e)}
                        title="Xoá giải đấu"
                        className="w-7 h-7 rounded-full shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Category Name Badge (neatly positioned, high contrast, no blur) */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="flex items-center gap-1 bg-slate-900/95 text-white px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider w-fit">
                        {(() => {
                          const logo = getSportLogo(firstDivision?.category?.name);
                          return logo ? (
                            <img src={logo} alt={firstDivision?.category?.name || ''} className="w-3 h-3 object-contain brightness-150" />
                          ) : null;
                        })()}
                        {firstDivision?.category?.name || 'MULTISPORT'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mb-3" title={parent.name}>
                        {parent.name}
                      </h3>

                      {/* Division Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {divisions.slice(0, 3).map((div: Tournament) => {
                          const displayDivName = (div.name && div.name.toLowerCase() !== parent.name.toLowerCase()) 
                            ? div.name 
                            : getFormatLabel(div.matchType || '', div.genderRestriction);
                          
                          return (
                            <button
                              key={div.id}
                              onClick={() => router.push(parent.isStandalone ? `/organizer/tournaments/${parent.id}/manage?divisionId=${div.id}` : `/organizer/tournaments/${div.id}/manage`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all cursor-pointer active:scale-95"
                            >
                              <span>{getDivisionIcon(div.matchType, div.genderRestriction)}</span>
                              <span>{displayDivName}</span>
                              {div.tournamentConfig?.bracketType && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  • {div.tournamentConfig.bracketType === 'SINGLE_ELIMINATION' ? 'Loại đơn' : div.tournamentConfig.bracketType === 'DOUBLE_ELIMINATION' ? 'Loại kép' : 'Vòng tròn'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {divisions.length > 3 && (
                          <span className="px-2.5 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-bold border border-slate-200">
                            +{divisions.length - 3} khác
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-slate-500 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{firstDivision?.startDate ? formatDate(firstDivision.startDate) : 'Chưa xếp lịch'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{totalParticipants} VĐV đã ĐK</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="bg-slate-50 border-t border-slate-100 p-4">
                    {firstDivision ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Link href={manageHref} className="block">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 font-bold shadow-sm shadow-blue-500/10 h-10 text-sm active:scale-95 transition-transform duration-100">
                            <Settings className="w-4 h-4" /> Quản lý giải đấu
                          </Button>
                        </Link>
                        <Link href={opsHref} className="block">
                          <Button variant="outline" className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 font-bold h-10 text-sm active:scale-95 transition-transform duration-100">
                            <Eye className="w-4 h-4" /> Vận hành giải
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Button disabled className="w-full bg-slate-300 text-white font-bold h-10 text-sm">
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
