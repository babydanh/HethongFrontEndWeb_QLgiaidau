'use client';

import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { communitiesApi, Community } from '@/features/communities/api';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { isLiteTournament } from '@/features/tournaments/lite-qr';
import { categoriesApi, Category } from '@/features/categories/api';
import { getSportLogo } from '@/constants/sports';
import { Trophy, Calendar, Users, Plus, Settings, Eye, ChevronLeft, ShieldCheck, Lock, Clock, RotateCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';

type LiteSport = 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';

const mapCategoryToLiteSport = (cat?: { slug?: string; name?: string } | null): LiteSport => {
  if (!cat) return 'badminton';
  const slug = (cat.slug || cat.name || '').toLowerCase();
  if (slug.includes('badminton') || slug.includes('cầu lông') || slug.includes('cau long')) return 'badminton';
  if (slug.includes('tennis') || slug.includes('quần vợt') || slug.includes('quan vot')) return 'tennis';
  if (slug.includes('pickleball')) return 'pickleball';
  if (slug.includes('table_tennis') || slug.includes('table-tennis') || slug.includes('bóng bàn') || slug.includes('bong ban') || slug.includes('tabletennis')) return 'table_tennis';
  if (slug.includes('football') || slug.includes('bóng đá') || slug.includes('bong da') || slug.includes('soccer')) return 'football';
  if (['badminton', 'tennis', 'pickleball', 'table_tennis', 'football'].includes(slug)) {
    return slug as LiteSport;
  }
  return 'badminton';
};

const DAYS_OF_WEEK: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Thứ 2', short: 'T2' },
  { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' },
  { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' },
  { value: 6, label: 'Thứ 7', short: 'T7' },
  { value: 0, label: 'Chủ Nhật', short: 'CN' },
];

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
  const [isLiteModalOpen, setIsLiteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for normal creation
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyCategory, setNewTourneyCategory] = useState('');
  const [newTourneyMatchType, setNewTourneyMatchType] = useState<CommunityTournamentMatchType>('DOUBLES');
  const [newTourneyMaxParticipants, setNewTourneyMaxParticipants] = useState(16);
  const [newTourneyStartDate, setNewTourneyStartDate] = useState('');
  const [newTourneyEndDate, setNewTourneyEndDate] = useState('');
  const [newTourneyEntryFee, setNewTourneyEntryFee] = useState(0);

  // Form states for Lite creation
  const [liteName, setLiteName] = useState('');
  const [liteSport, setLiteSport] = useState<LiteSport>('badminton');
  const [liteGenderRestriction, setLiteGenderRestriction] = useState<'MALE' | 'FEMALE' | ''>('');
  const [liteTeamSize, setLiteTeamSize] = useState<5 | 7 | 11>(7);
  const [liteMaxReserve, setLiteMaxReserve] = useState(5);
  const [liteFormat, setLiteFormat] = useState<'singles' | 'doubles'>('doubles');
  const [liteBracketType, setLiteBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('single_elimination');
  const [liteMaxTeams, setLiteMaxTeams] = useState(16);
  const [liteStartDate, setLiteStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [liteStartTime, setLiteStartTime] = useState('18:00');
  const [liteIsRecurring, setLiteIsRecurring] = useState(false);
  const [liteRecurringFrequency, setLiteRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [liteRecurringDaysOfWeek, setLiteRecurringDaysOfWeek] = useState<number[]>([6]);
  const [liteRecurringTimeOfDay, setLiteRecurringTimeOfDay] = useState('18:00');
  const [liteRecurringAdvanceDays, setLiteRecurringAdvanceDays] = useState<number>(0);
  const [liteIsRanked, setLiteIsRanked] = useState(false);

  const fetchData = async () => {
    try {
      const cRes = await communitiesApi.getCommunityById(id);
      const commData = (cRes as { data?: Community })?.data || (cRes as unknown as Community);
      setCommunity(commData);

      const tRes = await communitiesApi.getTournaments(id);
      setTournaments((tRes as { data?: Tournament[] })?.data || (tRes as unknown as Tournament[]) || []);

      const catRes = await categoriesApi.getCategories();
      if (catRes.data) {
        setCategories(catRes.data);
        if (commData?.categories?.[0]) {
          setNewTourneyCategory(commData.categories[0].id);
          const mappedSport = mapCategoryToLiteSport(commData.categories[0]);
          if (mappedSport) setLiteSport(mappedSport);
        } else if (catRes.data.length > 0) {
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

  const handleOpenAdvancedTournamentCreate = () => {
    router.push(`/organizer/tournaments/create?communityId=${id}&source=club&mode=advanced`);
  };

  const handleCreateLiteTournament = async () => {
    if (!liteName.trim()) {
      toast.error('Vui lòng nhập tên giải đấu nhanh');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await tournamentsApi.createLiteTournament({
        name: liteName.trim(),
        sport: liteSport,
        communityId: id,
        format: liteSport === 'football' ? 'doubles' : liteFormat,
        ...(liteSport === 'football'
          ? { genderRestriction: liteGenderRestriction || undefined, teamSize: liteTeamSize, maxReserve: liteMaxReserve }
          : {}),
        bracketType: liteBracketType,
        maxTeams: liteMaxTeams,
        description: `Giải đấu giao hữu nhanh CLB ${community?.name || ''}`,
        isRanked: liteIsRanked,
        startDate: liteStartDate || undefined,
        startTime: liteStartTime || undefined,
        isRecurring: liteIsRecurring,
        recurringFrequency: liteIsRecurring ? liteRecurringFrequency : undefined,
        recurringDayOfWeek: liteIsRecurring ? (liteRecurringDaysOfWeek[0] ?? 6) : undefined,
        recurringDaysOfWeek: liteIsRecurring ? liteRecurringDaysOfWeek : undefined,
        recurringTimeOfDay: liteIsRecurring ? liteRecurringTimeOfDay : undefined,
        recurringAdvanceDays: liteIsRecurring ? liteRecurringAdvanceDays : undefined,
      });

      toast.success('Tạo giải đấu nhanh thành công!');
      setIsLiteModalOpen(false);

      // Reset form
      setLiteName('');
      setLiteSport('badminton');
      setLiteGenderRestriction('');
      setLiteTeamSize(7);
      setLiteMaxReserve(5);
      setLiteFormat('doubles');
      setLiteBracketType('single_elimination');
      setLiteMaxTeams(16);

      // Redirect directly to the manage page of the newly created tournament
      const newId = res?.id;
      if (newId) {
        router.push(`/organizer/tournaments/${newId}/manage`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClubTournament = async () => {
    if (!newTourneyName.trim()) {
      toast.error('Vui lòng nhập tên giải đấu');
      return;
    }

    let createdParentId: string | null = null;
    let createdTournamentId: string | null = null;
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
      createdParentId = parentId;

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
      createdTournamentId = res?.data?.id ?? null;
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
      if (createdTournamentId) {
        try {
          await tournamentsApi.deleteTournament(createdTournamentId);
        } catch {
          // Best-effort cleanup; preserve the original error for the user.
        }
      }
      if (createdParentId) {
        try {
          await tournamentsApi.deleteParentTournament(createdParentId);
        } catch {
          // Best-effort cleanup; preserve the original error for the user.
        }
      }
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
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Mở Đăng Ký</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Đóng Đăng Ký</Badge>;
      case 'UPCOMING':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sắp Khởi Tranh</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-rose-50 text-rose-700 border-slate-200 animate-pulse">Đang Đấu</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Đã Kết Thúc</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-50 text-rose-700 border-slate-200">Đã Hủy</Badge>;
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
        <div className="max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Quản lý Giải đấu CLB</h1>
            <p className="text-slate-500 mt-1 font-medium flex items-center gap-1">
              Câu lạc bộ: <span className="text-slate-800 font-bold">{community.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => router.push(`/communities/${community.id}/create-lite`)}
              className="font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tạo giải nhanh (Lite)
            </Button>
            <Button
              onClick={handleOpenAdvancedTournamentCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tạo giải đấu chuyên nghiệp
            </Button>
          </div>
        </div>

        {/* Description Banner */}
        <div className="bg-slate-50 text-emerald-950 p-4 rounded-lg border border-slate-200 flex items-start gap-3 text-xs leading-relaxed font-semibold mb-8">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950 text-sm">Chính sách Giải đấu Nội bộ (Club tournaments)</p>
            <p className="mt-1 text-emerald-700">
              Giải đấu nội bộ là hoàn toàn miễn phí cho mọi thành viên trong CLB. Hệ thống sẽ không thu bất kỳ khoản phí sàn hay lệ phí dịch vụ nào.
            </p>
          </div>
        </div>

        {/* Tournaments Grid */}
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">CLB chưa có giải đấu nào</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">
              Hãy tạo giải đấu nội bộ đầu tiên để tăng tính gắn kết giữa các thành viên trong câu lạc bộ!
            </p>
            <Button
              onClick={handleOpenAdvancedTournamentCreate}
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
                className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {(() => {
                          const logo = getSportLogo(t.category?.name);
                          return logo ? <img src={logo} alt="" className="w-2.5 h-2.5 object-contain" /> : null;
                        })()}
                        {t.category?.name || 'Bộ môn'}
                      </span>
                      {isLiteTournament(t) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          Giải Nhanh (Lite)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          Giải Nâng Cao
                        </span>
                      )}
                    </div>
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
                  {isLiteTournament(t) ? (
                    <Link href={`/organizer/tournaments/${t.id}/manage`} className="flex-1">
                      <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1">
                        <Settings className="w-3.5 h-3.5" /> Quản lý giải nhanh
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/organizer/tournaments/${t.id}/manage`} className="flex-1">
                      <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1">
                        <Settings className="w-3.5 h-3.5" /> Thiết lập & Quản lý
                      </Button>
                    </Link>
                  )}
                  <Link href={`/tournaments/${t.id}`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full text-xs font-bold flex items-center justify-center gap-1">
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
            <ModalContent className="bg-white rounded-xl p-6 max-h-[90vh] overflow-y-auto w-full max-w-lg shadow-xl">
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

                {(() => {
                  const clubCategory = community?.categories?.[0];
                  const isClubLocked = Boolean(clubCategory);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Chọn môn thể thao *</label>
                        {isClubLocked && clubCategory && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Lock className="w-3 h-3" /> Cố định theo CLB: {clubCategory.name}
                          </span>
                        )}
                      </div>
                      <select
                        value={newTourneyCategory}
                        onChange={(e) => setNewTourneyCategory(e.target.value)}
                        disabled={isClubLocked}
                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {isClubLocked && clubCategory && (
                        <p className="text-xs text-slate-500 font-medium">
                          🔒 Giải đấu nội bộ được tự động khóa theo bộ môn của CLB ({clubCategory.name}).
                        </p>
                      )}
                    </div>
                  );
                })()}

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

        {isLiteModalOpen && (
          <Modal open={isLiteModalOpen} onOpenChange={(open) => { if (!open) setIsLiteModalOpen(false); }}>
            <ModalContent className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <ModalHeader>
                <ModalTitle className="text-xl font-bold text-slate-900">
                  Tạo Nhanh Giải Đấu (Lite Mode)
                </ModalTitle>
              </ModalHeader>
              <div className="space-y-4 mt-4">
                <Input
                  label="Tên giải đấu nhanh"
                  placeholder="Ví dụ: Giải Giao Hữu Cầu Lông Cuối Tuần"
                  value={liteName}
                  onChange={(e) => setLiteName(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const clubCategory = community?.categories?.[0];
                    const isClubLocked = Boolean(clubCategory);
                    return (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-700">Môn thể thao *</label>
                          {isClubLocked && clubCategory && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Lock className="w-3 h-3" /> Cố định theo CLB
                            </span>
                          )}
                        </div>
                        <select
                          value={liteSport}
                          onChange={(e) => setLiteSport(e.target.value as LiteSport)}
                          disabled={isClubLocked}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                        >
                          {categories.filter((category) => category.isActive !== false).map((category) => (
                            <option key={category.id} value={mapCategoryToLiteSport(category)}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {isClubLocked && clubCategory && (
                          <p className="text-xs text-slate-500 font-medium">
                            🔒 Khóa theo bộ môn của CLB ({clubCategory.name}).
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-750 text-slate-700">Hình thức</label>
                    <select
                      value={liteFormat}
                      onChange={(e) => setLiteFormat(e.target.value as 'singles' | 'doubles')}
                      disabled={liteSport === 'football'}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="singles">Đơn (Singles)</option>
                      <option value="doubles">Đôi (Doubles)</option>
                    </select>
                  </div>
                </div>

                {liteSport === 'football' && (
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Đội hình</label>
                      <select value={liteTeamSize} onChange={(e) => setLiteTeamSize(Number(e.target.value) as 5 | 7 | 11)} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700">
                        <option value={5}>Sân 5</option>
                        <option value={7}>Sân 7</option>
                        <option value={11}>Sân 11</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Giới tính</label>
                      <select value={liteGenderRestriction} onChange={(e) => setLiteGenderRestriction(e.target.value as 'MALE' | 'FEMALE' | '')} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700">
                        <option value="">Không ràng buộc</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                    </div>
                    <Input label="Dự bị tối đa" type="number" min={0} max={20} value={liteMaxReserve} onChange={(e) => setLiteMaxReserve(Math.max(0, Math.min(20, Number(e.target.value) || 0)))} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Thể thức đấu</label>
                    <select
                      value={liteBracketType}
                      onChange={(e) => setLiteBracketType(e.target.value as 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout')}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single_elimination">Loại trực tiếp (Single Elim)</option>
                      <option value="double_elimination">Nhánh thắng/thua (Double Elim)</option>
                      <option value="round_robin">Vòng tròn tính điểm (Round Robin)</option>
                      <option value="group_stage_knockout">Vòng bảng + loại trực tiếp</option>
                    </select>
                    {liteBracketType === 'group_stage_knockout' && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        Cần tối thiểu 4 đội. Hệ thống tự động chia đều.
                      </p>
                    )}
                  </div>

                  <Input
                    label="Số đội tối đa"
                    type="number"
                    value={liteMaxTeams}
                    onChange={(e) => setLiteMaxTeams(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500" /> Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      value={liteStartDate}
                      onChange={(e) => setLiteStartDate(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" /> Giờ thi đấu
                    </label>
                    <input
                      type="time"
                      value={liteStartTime}
                      onChange={(e) => setLiteStartTime(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <RotateCw className={`w-4 h-4 ${liteIsRecurring ? 'text-emerald-600' : 'text-slate-500'}`} />
                        Tự động tạo giải theo chu kỳ định kỳ
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        Tự động tạo giải mới và mở đăng ký theo lịch lặp lại
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={liteIsRecurring}
                      onClick={() => setLiteIsRecurring(!liteIsRecurring)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        liteIsRecurring ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          liteIsRecurring ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {liteIsRecurring && (
                    <div className="pt-2.5 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-700">Tần suất</label>
                          <select
                            value={liteRecurringFrequency}
                            onChange={(e) => setLiteRecurringFrequency(e.target.value as typeof liteRecurringFrequency)}
                            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          >
                            <option value="WEEKLY">Hằng tuần (Weekly)</option>
                            <option value="BIWEEKLY">2 tuần một lần (Bi-weekly)</option>
                            <option value="DAILY">Hằng ngày (Daily)</option>
                            <option value="MONTHLY">Hằng tháng (Monthly)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" /> Giờ thi đấu
                          </label>
                          <input
                            type="time"
                            value={liteRecurringTimeOfDay}
                            onChange={(e) => setLiteRecurringTimeOfDay(e.target.value)}
                            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                          />
                        </div>
                      </div>

                      {liteRecurringFrequency !== 'DAILY' && liteRecurringFrequency !== 'MONTHLY' && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            Các ngày trong tuần ({liteRecurringDaysOfWeek.length} ngày đã chọn)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {DAYS_OF_WEEK.map(({ value, label }: { value: number; label: string }) => {
                              const isSelected = liteRecurringDaysOfWeek.includes(value);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setLiteRecurringDaysOfWeek((prev) => {
                                      if (prev.includes(value)) {
                                        if (prev.length === 1) return prev;
                                        return prev.filter((d) => d !== value);
                                      } else {
                                        return [...prev, value].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
                                      }
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                                            {/* Mở đăng ký trước bao nhiêu ngày */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Thời điểm tự động tạo giải & mở đăng ký
                        </label>
                        <select
                          value={liteRecurringAdvanceDays}
                          onChange={(e) => setLiteRecurringAdvanceDays(Number(e.target.value))}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                        >
                          <option value={0}>Tạo đúng ngày thi đấu (Cùng ngày)</option>
                          <option value={1}>Tạo trước 1 ngày (Mở đăng ký trước 24h)</option>
                          <option value={2}>Tạo trước 2 ngày (Mở đăng ký trước 48h)</option>
                          <option value={3}>Tạo trước 3 ngày</option>
                          <option value={7}>Tạo trước 1 tuần (Mở đăng ký trước 7 ngày)</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                        🔄 <strong>Lịch trình tự động:</strong> Giải đấu sẽ tự động được tạo và mở đăng ký vào{' '}
                        <strong className="text-emerald-950 font-bold">{liteRecurringTimeOfDay}</strong>{' '}
                        {liteRecurringFrequency === 'DAILY'
                          ? 'hằng ngày'
                          : liteRecurringFrequency === 'MONTHLY'
                          ? `ngày ${liteStartDate ? new Date(liteStartDate).getDate() : 15} hàng tháng`
                          : `các ngày ${liteRecurringDaysOfWeek
                              .map((d) => DAYS_OF_WEEK.find((item) => item.value === d)?.label)
                              .filter(Boolean)
                              .join(', ')} hằng ${liteRecurringFrequency === 'BIWEEKLY' ? '2 tuần' : 'tuần'}`}.
                        <br />
                        <span className="text-emerald-700 text-[11px] mt-1 inline-block">
                          📢 Toàn bộ thành viên CLB sẽ nhận được thông báo & bài đăng bảng tin để tham gia.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsLiteModalOpen(false)}
                    disabled={isSubmitting}
                    className="border-slate-200 text-slate-650 font-medium hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    onClick={handleCreateLiteTournament}
                    disabled={isSubmitting}
                    className="font-bold px-5"
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo giải nhanh'}
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
