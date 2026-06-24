'use client';

import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { communitiesApi, Community } from '@/features/communities/api';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { getSportLogo } from '@/constants/sports';
import { Trophy, Calendar, Users, Plus, Settings, Eye, ChevronLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';

export default function ClubTournamentsPage({ params }: { params: Promise<{ id: string }> }) {
  type CommunityTournamentMatchType = 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyCategory, setNewTourneyCategory] = useState('');
  const [newTourneyMatchType, setNewTourneyMatchType] = useState<CommunityTournamentMatchType>('DOUBLES');
  const [newTourneyMaxParticipants, setNewTourneyMaxParticipants] = useState(16);

  const fetchData = async () => {
    try {
      const cRes = await communitiesApi.getCommunityById(id);
      setCommunity((cRes as { data?: Community })?.data || (cRes as unknown as Community));

      const tRes = await communitiesApi.getTournaments(id);
      setTournaments((tRes as { data?: Tournament[] })?.data || (tRes as unknown as Tournament[]) || []);

      const catRes = await categoriesApi.getCategories();
      if (catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length > 0) {
          setNewTourneyCategory(catRes.data[0].id);
        }
      }
    } catch (err) {
      toast.error('Không thể tải thông tin giải đấu câu lạc bộ');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    init();
  }, [id]);

  const handleCreateClubTournament = async () => {
    if (!newTourneyName.trim()) {
      toast.error('Vui lòng nhập tên giải đấu');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 1. Create Parent Tournament first
      const parentRes = await tournamentsApi.createParentTournament({
        name: newTourneyName.trim(),
        description: `Giải đấu nội bộ của Câu lạc bộ ${community?.name || ''}`,
      });

      const parentId = parentRes.data?.id;
      if (!parentId) {
        throw new Error('Không thể tạo Giải đấu mẹ. Vui lòng thử lại.');
      }

      // 2. Create the first division (tournament) under this parent
      const data = {
        parentId,
        name: newTourneyName.trim(),
        categoryId: newTourneyCategory,
        communityId: id,
        tournamentType: 'CLUB' as const,
        matchType: newTourneyMatchType,
        maxParticipants: newTourneyMaxParticipants,
        entryFee: 0,
        sportRules: {
          setsToWin: 2,
          pointsPerSet: 21,
          winByTwo: true,
        },
        tournamentConfig: {
          bracketType: 'SINGLE_ELIMINATION',
          maxTeams: newTourneyMaxParticipants,
        },
      };

      const res = await tournamentsApi.createTournament(data);
      toast.success('Tạo giải đấu nội bộ thành công!');
      setIsCreateModalOpen(false);
      
      // Reset form
      setNewTourneyName('');
      setNewTourneyMatchType('DOUBLES');
      setNewTourneyMaxParticipants(16);
      
      // Refresh list
      fetchData();

      // Redirect directly to the manage page of the newly created tournament
      const newId = res?.data?.id;
      if (newId) {
        router.push(`/organizer/tournaments/${newId}/manage`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Badge className="bg-slate-100 text-slate-700">Nháp (Ẩn)</Badge>;
      case 'REGISTRATION_OPEN':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Mở Đăng Ký</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Đóng Đăng Ký</Badge>;
      case 'UPCOMING':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sắp Khởi Tranh</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 animate-pulse">Đang Đấu</Badge>;
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
          <p className="text-slate-500 font-medium">Đang tải giải đấu câu lạc bộ...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy câu lạc bộ</h2>
          <p className="text-slate-500 mt-2">Đường dẫn không hợp lệ hoặc câu lạc bộ không tồn tại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Back Link */}
        <Link href={`/communities/${community.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6">
          <ChevronLeft className="w-4 h-4" /> Quay lại Câu lạc bộ
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Quản lý Giải đấu CLB</h1>
            <p className="text-slate-500 mt-1 font-medium flex items-center gap-1">
              Câu lạc bộ: <span className="text-slate-800 font-bold">{community.name}</span>
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" /> Tạo giải đấu nội bộ
          </Button>
        </div>

        {/* Description Banner */}
        <div className="bg-emerald-50 text-emerald-950 p-4 rounded-xl border border-emerald-100 flex items-start gap-3 text-xs leading-relaxed font-semibold mb-8">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950 text-sm">Chính sách Giải đấu Nội bộ (Club tournaments)</p>
            <p className="mt-1 text-emerald-700">
              Giải đấu nội bộ là hoàn toàn miễn phí cho mọi thành viên trong CLB. Hệ thống sẽ không thu bất kỳ khoản phí sàn hay lệ phí dịch vụ nào.
            </p>
          </div>
        </div>

        {/* Tournaments Grid */}
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">CLB chưa có giải đấu nào</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">
              Hãy tạo giải đấu nội bộ đầu tiên để tăng tính gắn kết giữa các thành viên trong câu lạc bộ!
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white mt-6"
            >
              Tạo giải đấu nội bộ
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {(() => {
                        const logo = getSportLogo(t.category?.name);
                        return logo ? <img src={logo} alt="" className="w-2.5 h-2.5 object-contain" /> : null;
                      })()}
                      {t.category?.name || 'Bộ môn'}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{t.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-450" />
                      {t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : 'Chưa xếp'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-450" />
                      {t.matchType === 'SINGLES' ? 'Đơn (Singles)' : 'Đôi (Doubles)'} ({t.maxParticipants || 16} đội)
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <Link href={`/organizer/tournaments/${t.id}/manage`} className="flex-1">
                    <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1">
                      <Settings className="w-3.5 h-3.5" /> Thiết lập & Quản lý
                    </Button>
                  </Link>
                  <Link href={`/tournaments/${t.id}`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full border-blue-200 hover:bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Xem trang giải
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCreateModalOpen && (
          <Modal open={isCreateModalOpen} onOpenChange={(open) => { if (!open) setIsCreateModalOpen(false); }}>
            <ModalContent className="bg-white rounded-2xl p-6">
              <ModalHeader>
                <ModalTitle className="text-xl font-bold text-slate-900">
                  Tạo Giải Đấu Nội Bộ CLB (Miễn phí)
                </ModalTitle>
              </ModalHeader>
              <div className="space-y-4 mt-4">
                <Input
                  label="Tên giải đấu nội bộ"
                  placeholder="Ví dụ: Giải Quần Vợt Nội Bộ CLB Mùa Hè 2026"
                  value={newTourneyName}
                  onChange={(e) => setNewTourneyName(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Chọn môn thể thao</label>
                  <select
                    value={newTourneyCategory}
                    onChange={(e) => setNewTourneyCategory(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Hình thức thi đấu</label>
                    <select
                      value={newTourneyMatchType}
                      onChange={(e) => setNewTourneyMatchType(e.target.value as CommunityTournamentMatchType)}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SINGLES">Đơn (Singles)</option>
                      <option value="DOUBLES">Đôi (Doubles)</option>
                      <option value="MIXED_DOUBLES">Đôi nam nữ (Mixed)</option>
                    </select>
                  </div>

                  <Input
                    label="Số đội tham gia tối đa"
                    type="number"
                    value={newTourneyMaxParticipants}
                    onChange={(e) => setNewTourneyMaxParticipants(Number(e.target.value))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmitting}
                    className="border-slate-200 text-slate-650 font-medium hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    onClick={handleCreateClubTournament}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo giải đấu'}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}
      </div>
    </div>
  );
}
