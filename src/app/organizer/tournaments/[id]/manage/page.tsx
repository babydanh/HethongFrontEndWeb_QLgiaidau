'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import {
  tournamentsApi,
  Tournament,
  TournamentParticipant,
  BracketStage,
  BracketMatch,
} from '@/features/tournaments/api';
import { venuesApi } from '@/features/venues/api';
import { paymentsApi } from '@/features/payments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { uploadApi } from '@/features/upload/api';
import {
  Settings,
  Calendar,
  Users,
  Trophy,
  MapPin,
  Clock,
  DollarSign,
  Info,
  Link as LinkIcon,
  CheckCircle,
  FileText,
  AlertTriangle,
  Lock,
  Plus,
  ExternalLink,
  RefreshCw,
  Gift,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

interface Venue {
  id: string;
  name: string;
  locationAddress: string;
}

interface Court {
  id: string;
  courtName: string;
}

export default function TournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [bracket, setBracket] = useState<{ stages: BracketStage[] } | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'config' | 'registration' | 'bracket' | 'finance'>('basic');

  // Basic info tab form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [genderRestriction, setGenderRestriction] = useState<'MALE' | 'FEMALE' | 'MIXED' | ''>('');

  // Time & Location Settings
  const [venueId, setVenueId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [registrationEndDate, setRegistrationEndDate] = useState('');
  
  // Pricing & Rules Settings
  const [entryFee, setEntryFee] = useState(0);
  const [platformFeePerPlayer, setPlatformFeePerPlayer] = useState(10000);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [setsToWin, setSetsToWin] = useState(2);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [winByTwo, setWinByTwo] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Stage details modal states
  const [selectedStage, setSelectedStage] = useState<BracketStage | null>(null);
  const [stageVenueId, setStageVenueId] = useState('');
  const [stageScheduledDate, setStageScheduledDate] = useState('');
  const [stageNotificationNote, setStageNotificationNote] = useState('');
  const [isSavingStage, setIsSavingStage] = useState(false);

  // Lock List Modal states
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockSummary, setLockSummary] = useState<{
    totalParticipants: number;
    totalPlayers: number;
    platformFeePerPlayer: number;
    totalPlatformFee: number;
  } | null>(null);

  // Scheduling match modal states
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [matchCourtId, setMatchCourtId] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPayingPlatformFee, setIsPayingPlatformFee] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);

  const fetchTournamentData = async () => {
    try {
      const tRes = await tournamentsApi.getTournamentById(id);
      if (tRes.data) {
        const t = tRes.data;
        setTournament(t);
        setName(t.name);
        setCategoryId(t.categoryId);
        setDescription(t.description || '');
        setBannerUrl(t.bannerUrl || '');
        setLogoUrl(t.logoUrl || '');
        setPrizeDescription(t.prizeDescription || '');
        setContactInfo({
          phone: t.contactInfo?.phone || '',
          email: t.contactInfo?.email || '',
        });
        setVisibility(t.visibility || 'PUBLIC');
        setGenderRestriction(t.genderRestriction || '');

        setVenueId(t.venueId || '');
        setStartDate(t.startDate ? t.startDate.substring(0, 16) : '');
        setEndDate(t.endDate ? t.endDate.substring(0, 16) : '');
        setRegistrationStartDate(t.registrationStartDate ? t.registrationStartDate.substring(0, 16) : '');
        setRegistrationEndDate(t.registrationEndDate ? t.registrationEndDate.substring(0, 16) : '');
        
        setEntryFee(t.entryFee || 0);
        setPlatformFeePerPlayer(t.platformFeePerPlayer || 10000);
        setMaxParticipants(t.maxParticipants || 16);
        
        const rules = t.sportRules || {};
        setSetsToWin(rules.setsToWin || 2);
        setPointsPerSet(rules.pointsPerSet || 21);
        setWinByTwo(rules.winByTwo !== undefined ? rules.winByTwo : true);

        if (t.venueId) {
          fetchVenueCourts(t.venueId);
        }
      }

      // Fetch participants
      const pRes = await tournamentsApi.getTournamentParticipants(id);
      if (pRes.data) {
        setParticipants(pRes.data);
      }

      // Fetch bracket
      try {
        const bRes = await tournamentsApi.getTournamentBracket(id);
        if (bRes.data) {
          setBracket(bRes.data);
        }
      } catch (err) {
        setBracket(null);
      }
    } catch (err) {
      toast.error('Không thể tải thông tin giải đấu');
    }
  };

  const fetchVenueCourts = async (vId: string) => {
    try {
      const vRes = await venuesApi.getVenueById(vId);
      if (vRes.data && vRes.data.courts) {
        setCourts(vRes.data.courts);
      } else {
        setCourts([]);
      }
    } catch (err) {
      console.error('Failed to fetch courts for venue:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchTournamentData();
      try {
        const vRes = await venuesApi.getVenues();
        if (vRes.data) setVenues(vRes.data.data || vRes.data);
        
        const cRes = await categoriesApi.getCategories();
        if (cRes.data) setCategories(cRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [id]);

  const handleSaveBasicInfo = async () => {
    try {
      setIsSavingConfig(true);
      const data = {
        name,
        categoryId,
        description,
        bannerUrl: bannerUrl || null,
        logoUrl: logoUrl || null,
        prizeDescription: prizeDescription || null,
        contactInfo,
        visibility,
        genderRestriction: genderRestriction === '' ? null : genderRestriction,
      };
      await tournamentsApi.updateTournament(id, data);
      toast.success('Lưu thông tin cơ bản thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveScheduleDetails = async () => {
    try {
      setIsSavingConfig(true);
      const data = {
        venueId: venueId === '' ? null : venueId,
        startDate: startDate === '' ? null : new Date(startDate).toISOString(),
        endDate: endDate === '' ? null : new Date(endDate).toISOString(),
        registrationStartDate: registrationStartDate === '' ? null : new Date(registrationStartDate).toISOString(),
        registrationEndDate: registrationEndDate === '' ? null : new Date(registrationEndDate).toISOString(),
      };
      await tournamentsApi.updateTournament(id, data);
      toast.success('Lưu thông tin lịch và địa điểm thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveMatchConfig = async () => {
    try {
      setIsSavingConfig(true);
      const data = {
        maxParticipants,
        sportRules: {
          setsToWin,
          pointsPerSet,
          winByTwo,
        },
      };
      await tournamentsApi.updateTournament(id, data);
      toast.success('Lưu cấu hình thi đấu thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveFinanceConfig = async () => {
    try {
      setIsSavingConfig(true);
      const data = {
        entryFee,
        platformFeePerPlayer,
      };
      await tournamentsApi.updateTournament(id, data);
      toast.success('Lưu cài đặt tài chính thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRegenerateInviteCode = async () => {
    try {
      setIsLoading(true);
      await tournamentsApi.regenerateInviteCode(id);
      toast.success('Đã tạo lại mã mời mới!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsLoading(true);
      await tournamentsApi.publishTournament(id);
      toast.success('Giải đấu đã chính thức được công bố!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản nháp giải đấu này? Thao tác này không thể hoàn tác.')) {
      return;
    }
    try {
      setIsDeleting(true);
      await tournamentsApi.deleteTournament(id);
      toast.success('Đã xóa giải đấu thành công!');
      router.push('/organizer/tournaments');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePayPlatformFee = async () => {
    try {
      setIsPayingPlatformFee(true);
      const totalPlayers = participants.reduce((sum, p) => sum + (p.members?.length || 0), 0);
      const amount = totalPlayers * platformFeePerPlayer;
      const res = await paymentsApi.createPaymentLink({
        tournamentId: id,
        amount,
      });
      if (res.data?.paymentUrl) {
        window.open(res.data.paymentUrl, '_blank');
        toast.success('Đã mở liên kết thanh toán. Vui lòng thanh toán phí sàn để tiếp tục.');
      } else {
        toast.error('Không tìm thấy liên kết thanh toán.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsPayingPlatformFee(false);
    }
  };

  const handleAddGalleryImage = async () => {
    if (!newGalleryUrl.trim()) return;
    try {
      setIsAddingImage(true);
      await tournamentsApi.addTournamentGalleryImage(id, newGalleryUrl.trim());
      toast.success('Đã thêm ảnh vào bộ sưu tập!');
      setNewGalleryUrl('');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleRemoveGalleryImage = async (index: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi bộ sưu tập?')) return;
    try {
      await tournamentsApi.removeTournamentGalleryImage(id, index);
      toast.success('Đã xóa ảnh thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenLockModal = () => {
    if (participants.length < 2) {
      toast.error('Cần ít nhất 2 đội/VĐV đã đăng ký để chốt danh sách');
      return;
    }
    const totalPlayers = participants.reduce((sum, p) => sum + (p.members?.length || 0), 0);
    const totalPlatformFee = totalPlayers * platformFeePerPlayer;
    setLockSummary({
      totalParticipants: participants.length,
      totalPlayers,
      platformFeePerPlayer,
      totalPlatformFee,
    });
    setIsLockModalOpen(true);
  };

  const handleConfirmLock = async () => {
    try {
      setIsLocking(true);
      await tournamentsApi.lockTournament(id);
      toast.success('Chốt danh sách và tạo sơ đồ thi đấu thành công!');
      setIsLockModalOpen(false);
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLocking(false);
    }
  };

  const handleOpenStageModal = (stage: BracketStage) => {
    setSelectedStage(stage);
    setStageVenueId(stage.venueId || '');
    setStageScheduledDate(stage.scheduledDate ? stage.scheduledDate : '');
    setStageNotificationNote(stage.notificationNote || '');
  };

  const handleSaveStageDetails = async () => {
    if (!selectedStage) return;
    try {
      setIsSavingStage(true);
      await tournamentsApi.updateStage(selectedStage.id, {
        venueId: stageVenueId === '' ? null : stageVenueId,
        scheduledDate: stageScheduledDate === '' ? null : stageScheduledDate,
        notificationNote: stageNotificationNote === '' ? null : stageNotificationNote,
      });
      toast.success('Cập nhật thông tin vòng đấu thành công!');
      setSelectedStage(null);
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleUpdateStageRoundConfig = async (
    stageId: string,
    configData: Partial<NonNullable<BracketStage['roundConfig']>>
  ) => {
    const stage = bracket?.stages.find(s => s.id === stageId);
    if (!stage) return;
    const currentConfig = stage.roundConfig || {};
    const updatedConfig = { ...currentConfig, ...configData };
    try {
      await tournamentsApi.updateStage(stageId, { roundConfig: updatedConfig });
      toast.success('Đã cập nhật quy tắc thi đấu cho vòng này');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenScheduling = (match: BracketMatch) => {
    setSelectedMatch(match);
    setMatchCourtId(match.courtName ? (courts.find(c => c.courtName === match.courtName)?.id || '') : '');
    setMatchScheduledAt(match.scheduledAt ? match.scheduledAt.substring(0, 16) : '');
  };

  const handleSaveSchedule = async () => {
    if (!selectedMatch) return;
    try {
      setIsScheduling(true);
      await tournamentsApi.updateMatchSchedule(selectedMatch.id, {
        courtId: matchCourtId === '' ? null : matchCourtId,
        scheduledAt: matchScheduledAt === '' ? null : new Date(matchScheduledAt).toISOString(),
      });
      toast.success('Cập nhật lịch thi đấu thành công!');
      setSelectedMatch(null);
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsScheduling(false);
    }
  };

  const getStatusLabel = (status: Tournament['status']) => {
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
      case 'ONGOING':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 animate-pulse">Đang Thi Đấu</Badge>;
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
          <p className="text-slate-500 font-medium">Đang tải cấu hình quản trị...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy giải đấu</h2>
          <p className="text-slate-500 mt-2">Giải đấu không tồn tại hoặc bạn không có quyền truy cập quản trị.</p>
        </div>
      </div>
    );
  }

  const inviteLink = tournament.visibility === 'PRIVATE'
    ? `${window.location.origin}/tournaments/${tournament.id}/register?invite=${tournament.inviteCode}`
    : `${window.location.origin}/tournaments/join/${tournament.inviteCode}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Tournament Info Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {tournament.category?.name || 'Bộ môn'}
              </span>
              {getStatusLabel(tournament.status)}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{tournament.name}</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              Khai mạc: {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`/tournaments/${tournament.id}`, '_blank')}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 font-bold"
            >
              <ExternalLink className="w-4 h-4" /> Xem trang giải
            </Button>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'basic' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Thông Tin Cơ Bản
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Lịch & Địa Điểm
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'config' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Cấu Hình Thi Đấu
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'registration' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Đăng Ký & Chốt DS
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'bracket' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Sơ đồ Bracket
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'finance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Tài Chính & Payout
          </button>
        </div>

        {/* TAB 1: BASIC INFO */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Thông tin cơ bản giải đấu</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Tên giải đấu"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Bộ môn thi đấu</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Chế độ hiển thị (Visibility)</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="PUBLIC">Công khai (Hiển thị trên danh sách tìm kiếm)</option>
                  <option value="PRIVATE">Riêng tư (Ẩn, chỉ đăng ký qua link mời)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Ràng buộc giới tính (Gender Restriction)</label>
                <select
                  value={genderRestriction}
                  onChange={(e) => setGenderRestriction(e.target.value as any)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Không ràng buộc (Tự do Nam/Nữ)</option>
                  <option value="MALE">Chỉ Nam</option>
                  <option value="FEMALE">Chỉ Nữ</option>
                  <option value="MIXED">Mixed Doubles (Đôi Nam Nữ - 1 Nam & 1 Nữ)</option>
                </select>
              </div>
            </div>

            {/* HÌNH ẢNH & THƯƠNG HIỆU GIẢI ĐẤU */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-605" /> Hình ảnh & Thương hiệu giải đấu
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CỘT TRÁI: LOGO & BANNER */}
                <div className="space-y-6">
                  {/* Logo */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo giải đấu</label>
                    <div className="flex gap-2">
                      <input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Nhập URL logo hoặc chọn file..."
                        className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                      />
                      <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              toast.loading('Đang tải logo giải đấu...', { id: 'logo-upload' });
                              const res = await uploadApi.uploadImage(file);
                            if (res && res.url) {
                                setLogoUrl(res.url);
                                await tournamentsApi.updateTournament(id, { logoUrl: res.url });
                                toast.success('Đã tải logo thành công!', { id: 'logo-upload' });
                                fetchTournamentData();
                              }
                            } catch (err) {
                              toast.error(getErrorMessage(err), { id: 'logo-upload' });
                            }
                          }}
                        />
                        Chọn file
                      </label>
                    </div>
                    {logoUrl ? (
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center p-2 mt-2">
                        <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                          Logo
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                        <span>Chưa có logo</span>
                      </div>
                    )}
                  </div>

                  {/* Banner */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ảnh Banner chính</label>
                    <div className="flex gap-2">
                      <input
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="Nhập URL banner hoặc chọn file..."
                        className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                      />
                      <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              toast.loading('Đang tải ảnh banner...', { id: 'banner-upload' });
                              const res = await uploadApi.uploadImage(file);
                              if (res && res.url) {
                                setBannerUrl(res.url);
                                await tournamentsApi.updateTournament(id, { bannerUrl: res.url });
                                await tournamentsApi.addTournamentGalleryImage(id, res.url);
                                toast.success('Đã tải ảnh banner và thêm vào album thành công!', { id: 'banner-upload' });
                                fetchTournamentData();
                              }
                            } catch (err) {
                              toast.error(getErrorMessage(err), { id: 'banner-upload' });
                            }
                          }}
                        />
                        Chọn file
                      </label>
                    </div>
                    {bannerUrl ? (
                      <div className="relative aspect-[21/9] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white mt-2">
                        <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                          Xem trước Banner
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[21/9] w-full rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                        <span>Chưa có banner</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CỘT PHẢI: ALBUM ẢNH (GALLERY) */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-semibold">Album ảnh bổ sung (Gallery)</label>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập URL ảnh khác..."
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      className="flex-grow text-slate-800"
                    />
                    <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm mt-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setIsAddingImage(true);
                            toast.loading('Đang tải ảnh lên Cloudinary...', { id: 'gallery-upload' });
                            const res = await uploadApi.uploadImage(file);
                            if (res && res.url) {
                              await tournamentsApi.addTournamentGalleryImage(id, res.url);
                              toast.success('Đã tải ảnh lên và thêm vào bộ sưu tập!', { id: 'gallery-upload' });
                              fetchTournamentData();
                            }
                          } catch (err) {
                            toast.error(getErrorMessage(err), { id: 'gallery-upload' });
                          } finally {
                            setIsAddingImage(false);
                          }
                        }}
                        disabled={isAddingImage}
                      />
                      Chọn file
                    </label>
                    <Button
                      onClick={handleAddGalleryImage}
                      disabled={isAddingImage || !newGalleryUrl.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs shrink-0 shadow-sm mt-1 h-11"
                    >
                      {isAddingImage ? 'Đang thêm...' : 'Thêm URL'}
                    </Button>
                  </div>

                  {tournament.galleryImages && tournament.galleryImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[260px] p-2 bg-white border rounded-xl">
                      {tournament.galleryImages.map((imgUrl, index) => (
                        <div key={index} className="relative group border rounded-lg overflow-hidden aspect-video bg-slate-50">
                          <img src={imgUrl} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                          >
                            <span className="bg-rose-600 hover:bg-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                              Xóa ảnh
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-xl p-8 text-center text-slate-400 bg-white">
                      <p className="text-xs font-semibold italic">Chưa có ảnh nào trong album.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Mô tả giải đấu</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-28 resize-none"
                placeholder="Tóm tắt thể thức, đối tượng tham gia..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Cơ cấu giải thưởng</label>
              <Textarea
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
                className="h-24 resize-none"
                placeholder="Cúp, cờ lưu niệm, tiền thưởng cho các thứ hạng..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
              <Input
                label="Số điện thoại liên hệ"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                placeholder="0987654321"
              />
              <Input
                label="Email liên hệ"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                placeholder="btc@tournahub.vn"
              />
            </div>

            {/* Invite Code Section */}
            {tournament.status !== 'DRAFT' && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mã mời đăng ký nhanh</p>
                    <p className="text-base font-black text-blue-600 tracking-widest">{tournament.inviteCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(tournament.inviteCode || '');
                        toast.success('Đã sao chép mã mời!');
                      }}
                      className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                    >
                      Copy Mã
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateInviteCode}
                      className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Tạo lại mã mời
                    </Button>
                  </div>
                </div>

                {visibility === 'PRIVATE' && (
                  <div className="flex items-center gap-3 border p-3.5 rounded-xl bg-white mt-2">
                    <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                      <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">Đường dẫn đăng ký riêng tư (Private Invite Link)</p>
                      <p className="text-sm font-semibold text-slate-800 truncate select-all">
                        {`${window.location.origin}/tournaments/${tournament.id}/register?invite=${tournament.inviteCode}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/tournaments/${tournament.id}/register?invite=${tournament.inviteCode}`);
                        toast.success('Đã sao chép link đăng ký riêng tư!');
                      }}
                      className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      Copy Link
                    </Button>
                  </div>
                )}
              </div>
            )}



            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                {tournament.status === 'DRAFT' && (
                  <Button
                    onClick={handleDeleteTournament}
                    disabled={isDeleting}
                    variant="outline"
                    className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold px-6"
                  >
                    {isDeleting ? 'Đang xóa...' : 'Xóa giải đấu nháp'}
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSaveBasicInfo}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-500/10"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu thông tin'}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE & LOCATIONS */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Lịch thi đấu & Địa điểm</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Địa điểm mặc định giải</label>
                <select
                  value={venueId}
                  onChange={(e) => {
                    setVenueId(e.target.value);
                    if (e.target.value) fetchVenueCourts(e.target.value);
                  }}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">-- Chọn địa điểm --</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.locationAddress})</option>
                  ))}
                </select>
              </div>
              <DateTimePicker
                label="Ngày khai mạc giải đấu"
                value={startDate}
                onChange={setStartDate}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
              <DateTimePicker
                label="Ngày mở đăng ký"
                value={registrationStartDate}
                onChange={setRegistrationStartDate}
              />
              <DateTimePicker
                label="Hạn chót đăng ký"
                value={registrationEndDate}
                onChange={setRegistrationEndDate}
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveScheduleDetails}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu lịch trình'}
              </Button>
            </div>

            {/* Stage-specific schedule editor */}
            {bracket && bracket.stages && bracket.stages.length > 0 ? (
              <div className="mt-8 border-t pt-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Chi tiết lịch & địa điểm từng vòng đấu</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tùy biến lịch đấu và địa điểm riêng cho các vòng đặc biệt (như Bán kết/Chung kết).</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-650 font-bold border-b">
                      <tr>
                        <th className="p-3.5">Vòng đấu</th>
                        <th className="p-3.5">Ngày dự kiến</th>
                        <th className="p-3.5">Địa điểm riêng</th>
                        <th className="p-3.5">Thông báo riêng</th>
                        <th className="p-3.5 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {bracket.stages.map((stage) => (
                        <tr key={stage.id} className="hover:bg-slate-50/40">
                          <td className="p-3.5 font-bold">{stage.name}</td>
                          <td className="p-3.5 text-xs font-semibold">
                            {stage.scheduledDate ? new Date(stage.scheduledDate).toLocaleDateString('vi-VN') : 'Kế thừa giải đấu'}
                          </td>
                          <td className="p-3.5 text-xs font-semibold">
                            {venues.find(v => v.id === stage.venueId)?.name || 'Kế thừa giải đấu'}
                          </td>
                          <td className="p-3.5 text-xs text-slate-500 italic truncate max-w-[150px]">
                            {stage.notificationNote || 'Không có'}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStageModal(stage)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs"
                            >
                              Sửa đổi
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-8 border-t pt-6 text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed flex flex-col items-center">
                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-xs leading-relaxed max-w-sm">
                  Hãy chốt danh sách VĐV ở tab <strong>Đăng ký & Chốt DS</strong> để sinh các Stage vòng đấu, sau đó bạn có thể cấu hình chi tiết lịch trình cho từng vòng đấu.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATCH CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Cấu hình luật chơi</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Số lượng đội đăng ký tối đa"
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Môn thi đấu / Hình thức</label>
                <Badge className="py-2.5 bg-slate-50 border-slate-200 text-slate-700 uppercase justify-center font-bold text-xs tracking-wider">
                  {tournament.matchType === 'SINGLES' ? 'Đấu Đơn' : 'Đấu Đôi'}
                </Badge>
              </div>
            </div>

            {/* Sport Rules Card */}
            <div className="bg-slate-50 rounded-xl border p-5 space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-2">Luật tính điểm mặc định</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Số Set chạm thắng</label>
                  <select
                    value={setsToWin}
                    onChange={(e) => setSetsToWin(Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value={1}>1 Set</option>
                    <option value={2}>2 Set (Best of 3)</option>
                    <option value={3}>3 Set (Best of 5)</option>
                  </select>
                </div>
                <Input
                  label="Điểm mỗi Set"
                  type="number"
                  value={pointsPerSet}
                  onChange={(e) => setPointsPerSet(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="winByTwo_tab"
                  checked={winByTwo}
                  onChange={(e) => setWinByTwo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="winByTwo_tab" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Yêu cầu cách biệt 2 điểm (Deuce)
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveMatchConfig}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình mặc định'}
              </Button>
            </div>

            {/* Stage-specific configuration */}
            {bracket && bracket.stages && bracket.stages.length > 0 && (
              <div className="mt-8 border-t pt-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">Quy tắc thi đấu linh hoạt cho từng vòng</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tùy biến số set và điểm chạm khác nhau giữa vòng loại (vd: 1 set chạm 11) và vòng chung kết (vd: 3 set chạm 21).</p>
                </div>
                {bracket.stages.map((stage) => (
                  <div key={stage.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-slate-800 text-sm">{stage.name}</h4>
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded border border-blue-100 uppercase">{stage.type}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Số set chạm thắng</label>
                        <select
                          value={stage.roundConfig?.sets_to_win ?? setsToWin}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { sets_to_win: Number(e.target.value) })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        >
                          <option value={1}>1 Set</option>
                          <option value={2}>2 Set (Best of 3)</option>
                          <option value={3}>3 Set (Best of 5)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Điểm mỗi set</label>
                        <input
                          type="number"
                          value={stage.roundConfig?.points_per_set ?? pointsPerSet}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { points_per_set: Number(e.target.value) })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Phương thức tính điểm</label>
                        <select
                          value={stage.roundConfig?.scoring_type ?? 'RALLY_POINT'}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { scoring_type: e.target.value })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        >
                          <option value="RALLY_POINT">Rally Point (Trực tiếp)</option>
                          <option value="TRADITIONAL">Traditional (Giao bóng ăn điểm)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Luật Deuce (Cách biệt 2)</label>
                        <select
                          value={stage.roundConfig?.deuce_enabled === false ? 'FALSE' : 'TRUE'}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { deuce_enabled: e.target.value === 'TRUE' })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        >
                          <option value="TRUE">Bật</option>
                          <option value="FALSE">Tắt</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Chạm Deuce ở điểm</label>
                        <input
                          type="number"
                          value={stage.roundConfig?.tiebreak_at ?? (stage.roundConfig?.points_per_set ? (stage.roundConfig.points_per_set - 1) : 20)}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { tiebreak_at: Number(e.target.value) })}
                          disabled={stage.roundConfig?.deuce_enabled === false}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REGISTRATION & LOCK LIST */}
        {activeTab === 'registration' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Status & Actions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 text-lg">Trạng thái phát hành giải đấu</h3>
              
              {tournament.status === 'DRAFT' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400" />
                    <p className="text-xs leading-relaxed font-medium">
                      Giải đấu đang ở trạng thái <strong>Bản nháp (DRAFT)</strong>. Giải đấu chỉ hiển thị đối với bạn. Hãy kiểm tra kỹ thông tin cấu hình, thời gian và địa điểm thi đấu trước khi công bố.
                    </p>
                  </div>
                  <Button
                    onClick={handlePublish}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-auto flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Công bố giải đấu (Publish)
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-950 text-sm">Giải đấu đã được công bố!</p>
                        <p className="text-emerald-700 text-xs mt-1">Người chơi có thể đăng ký tài khoản và truy cập link để tham gia.</p>
                      </div>
                    </div>
                    
                    {/* Lock list button */}
                    {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'REGISTRATION_CLOSED') && (
                      <Button
                        onClick={handleOpenLockModal}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-4 h-4" /> Chốt danh sách & Sinh Bracket
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 border p-3.5 rounded-xl bg-slate-50">
                    <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {tournament.visibility === 'PRIVATE' ? 'Đường dẫn đăng ký riêng tư' : 'Đường dẫn đăng ký công khai'}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 truncate select-all">{inviteLink}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast.success(tournament.visibility === 'PRIVATE' ? 'Đã sao chép link đăng ký riêng tư!' : 'Đã sao chép link đăng ký công khai!');
                      }}
                      className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Participant List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 text-lg">Danh sách VĐV đăng ký ({participants.length})</h3>
              
              {participants.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                  <Users className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="font-medium text-sm">Chưa có đội hoặc vận động viên nào đăng ký tham gia.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {participants.map((p) => (
                    <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{p.teamName}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-500">
                          <span>Đăng ký lúc: {new Date(p.registeredAt).toLocaleDateString('vi-VN')}</span>
                          <span className="flex items-center gap-1">
                            Trạng thái: 
                            {p.isPaid ? (
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Đã nộp phí</span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Chưa nộp phí</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Team Members */}
                      <div className="flex gap-2">
                        {p.members?.map((m) => (
                          <div key={m.userId} className="flex items-center gap-1 bg-slate-50 border px-2.5 py-1 rounded-lg">
                            <span className="text-xs font-bold text-slate-700">{m.fullName}</span>
                            <span className="text-[10px] text-blue-600 font-black">({m.elo?.eloPoints || 1200} ELO)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: BRACKET */}
        {activeTab === 'bracket' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Sơ đồ thi đấu Bracket</h2>
              <p className="text-sm text-slate-500">Cây thi đấu chi tiết và lịch phân sân thi đấu con cho các trận.</p>
            </div>

            {tournament.status === 'REGISTRATION_CLOSED' ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed flex flex-col items-center">
                <Lock className="w-12 h-12 text-blue-500 mb-3" />
                <h4 className="font-bold text-slate-850 text-lg">Chưa thanh toán lệ phí sàn</h4>
                <p className="text-slate-500 text-sm mt-1 max-w-sm mb-6">
                  Giải đấu đã chốt danh sách VĐV nhưng chưa thanh toán lệ phí sàn ({((participants.reduce((sum, p) => sum + (p.members?.length || 0), 0)) * platformFeePerPlayer).toLocaleString('vi-VN')}đ). Vui lòng thanh toán để mở khóa sơ đồ đấu và hệ thống chấm điểm live.
                </p>
                <Button 
                  onClick={handlePayPlatformFee}
                  disabled={isPayingPlatformFee}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg"
                >
                  {isPayingPlatformFee ? 'Đang kết nối cổng thanh toán...' : 'Thanh toán lệ phí sàn'}
                </Button>
              </div>
            ) : !bracket || bracket.stages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed flex flex-col items-center">
                <Trophy className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-850 text-lg">Chưa có sơ đồ thi đấu</h4>
                <p className="text-slate-500 text-sm mt-1 max-w-sm">
                  Hãy hoàn tất chốt danh sách vận động viên tại tab <strong>Đăng ký & Chốt DS</strong> để hệ thống tự động sinh nhánh đấu loại trực tiếp.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {bracket.stages.map((stage) => (
                  <div key={stage.id} className="space-y-6">
                    <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900">{stage.name}</h3>
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-100 uppercase">
                        {stage.type === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp' :
                         stage.type === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng/thua' :
                         stage.type === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' : stage.type}
                      </span>
                    </div>

                    {stage.groups.map((group) => (
                      <div key={group.id} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.matches.map((match) => (
                            <div
                              key={match.id}
                              className="bg-white border rounded-xl p-4 shadow-sm hover:border-slate-350 transition-all flex flex-col justify-between gap-4"
                            >
                              <div className="flex items-center justify-between border-b pb-2 text-xs font-bold text-slate-400">
                                <span>Trận {match.matchOrder} - Vòng {match.roundNumber}</span>
                                {match.isBye ? (
                                  <Badge className="bg-slate-100 text-slate-650 font-black">BYE (Miễn đấu)</Badge>
                                ) : (
                                  <Badge className="capitalize">
                                    {match.status === 'COMPLETED' ? 'Hoàn thành' : match.status === 'ONGOING' ? 'Đang đấu' : 'Chờ đấu'}
                                  </Badge>
                                )}
                              </div>

                              {/* Competitors */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className={`font-semibold ${match.winnerId === match.participant1?.id && match.winnerId ? 'text-emerald-600 font-black' : 'text-slate-800'}`}>
                                    {match.participant1?.teamName || (match.isBye ? '—' : 'Chờ đối thủ')}
                                    {match.participant1?.seed ? ` [Hạt giống ${match.participant1.seed}]` : ''}
                                  </span>
                                  {match.status === 'COMPLETED' && !match.isBye && <span className="font-bold text-slate-900">{match.p1SetsWon}</span>}
                                </div>
                                <div className="flex items-center justify-between text-sm border-t pt-2 border-dashed">
                                  <span className={`font-semibold ${match.winnerId === match.participant2?.id && match.winnerId ? 'text-emerald-600 font-black' : 'text-slate-800'}`}>
                                    {match.participant2?.teamName || (match.isBye ? '—' : 'Chờ đối thủ')}
                                    {match.participant2?.seed ? ` [Hạt giống ${match.participant2.seed}]` : ''}
                                  </span>
                                  {match.status === 'COMPLETED' && !match.isBye && <span className="font-bold text-slate-900">{match.p2SetsWon}</span>}
                                </div>
                              </div>

                              {/* Time & Court Details */}
                              {!match.isBye && (
                                <div className="bg-slate-50 p-2.5 rounded-lg text-xs font-semibold text-slate-500 space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Thời gian: {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString('vi-VN') : 'Chưa xếp'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Sân: {match.courtName || 'Chưa xếp'}</span>
                                  </div>
                                </div>
                              )}

                              {match.status !== 'COMPLETED' && !match.isBye && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenScheduling(match)}
                                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs"
                                >
                                  Xếp Sân & Giờ thi đấu
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FINANCE & PAYOUT */}
        {activeTab === 'finance' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Quản lý Tài chính</h2>

            {tournament.status === 'REGISTRATION_CLOSED' ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed flex flex-col items-center">
                <Lock className="w-12 h-12 text-blue-500 mb-3" />
                <h4 className="font-bold text-slate-850 text-lg">Chưa thanh toán lệ phí sàn</h4>
                <p className="text-slate-500 text-sm mt-1 max-w-sm mb-6">
                  Bạn cần hoàn tất thanh toán lệ phí sàn ({((participants.reduce((sum, p) => sum + (p.members?.length || 0), 0)) * platformFeePerPlayer).toLocaleString('vi-VN')}đ) để xem bảng chi tiết báo cáo và quản lý các giao dịch rút tiền.
                </p>
                <Button 
                  onClick={handlePayPlatformFee}
                  disabled={isPayingPlatformFee}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg"
                >
                  {isPayingPlatformFee ? 'Đang kết nối cổng thanh toán...' : 'Thanh toán lệ phí sàn'}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Lệ phí tham gia giải đấu (VNĐ)"
                    type="number"
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                    disabled={['UPCOMING', 'IN_PROGRESS', 'COMPLETED'].includes(tournament.status)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Lệ phí sàn / VĐV (Mặc định)</label>
                    <Badge className="py-2.5 bg-slate-50 border-slate-200 text-slate-700 justify-center font-bold text-sm">
                      {platformFeePerPlayer.toLocaleString('vi-VN')} VNĐ / Người chơi
                    </Badge>
                  </div>
                </div>

                {!['UPCOMING', 'IN_PROGRESS', 'COMPLETED'].includes(tournament.status) && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSaveFinanceConfig}
                      disabled={isSavingConfig}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
                    >
                      {isSavingConfig ? 'Đang lưu...' : 'Lưu cài đặt tài chính'}
                    </Button>
                  </div>
                )}

                {/* Financial Report Summary */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6 mt-6">
                  <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">
                    <DollarSign className="w-5 h-5 text-blue-600" /> Bảng tổng kết tài chính giải đấu
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng lệ phí thu dự kiến</p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {(entryFee * participants.length).toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Tính trên {participants.length} đội đăng ký</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phí nền tảng (Platform Fee)</p>
                      <p className="text-2xl font-black text-red-500 mt-2">
                        {(participants.reduce((sum, p) => sum + (p.members?.length || 0), 0) * platformFeePerPlayer).toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Thu cố định 10.000đ/người ({participants.reduce((sum, p) => sum + (p.members?.length || 0), 0)} VĐV)
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
                      <p className="text-xs font-bold text-slate-550 uppercase tracking-wider">Thực nhận của Ban tổ chức</p>
                      <p className="text-2xl font-black text-emerald-600 mt-2">
                        {Math.max(0, (entryFee * participants.length) - (participants.reduce((sum, p) => sum + (p.members?.length || 0), 0) * platformFeePerPlayer)).toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Đã khấu trừ toàn bộ phí sàn</p>
                    </div>
                  </div>

                  {/* Payout logic */}
                  {tournament.status === 'COMPLETED' ? (
                    <div className="bg-white border rounded-xl p-5 space-y-4">
                      <h4 className="font-bold text-slate-850 flex items-center gap-1">
                        <Gift className="w-5 h-5 text-purple-600" /> Yêu cầu rút tiền Payout
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Giải đấu đã kết thúc, bạn có thể thực hiện gửi yêu cầu rút tiền thực nhận về tài khoản ngân hàng của ban tổ chức.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Tên ngân hàng nhận" placeholder="Vietcombank" />
                        <Input label="Số tài khoản ngân hàng" placeholder="1029384756" />
                        <Input label="Tên chủ tài khoản" placeholder="NGUYEN VAN A" />
                      </div>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full md:w-auto mt-2">
                        Gửi yêu cầu Payout
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-blue-50/50 p-4 rounded-xl border flex gap-3 text-xs leading-relaxed font-semibold text-blue-900">
                      <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p>Hệ thống chỉ mở cổng yêu cầu rút tiền Payout sau khi giải đấu kết thúc (Trạng thái chuyển sang <strong>Đã Kết Thúc - COMPLETED</strong>).</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* STAGE DETAILS / OVERRIDE CONFIG MODAL */}
      {selectedStage && (
        <Modal open={!!selectedStage} onOpenChange={(open) => { if (!open) setSelectedStage(null); }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Cấu hình riêng cho vòng {selectedStage.name}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Chọn địa điểm riêng</label>
                <select
                  value={stageVenueId}
                  onChange={(e) => setStageVenueId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">-- Kế thừa địa điểm của giải đấu --</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Chọn ngày thi đấu của vòng"
                type="date"
                value={stageScheduledDate}
                onChange={(e) => setStageScheduledDate(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Thông báo đặc biệt cho vòng này</label>
                <Textarea
                  value={stageNotificationNote}
                  onChange={(e) => setStageNotificationNote(e.target.value)}
                  placeholder="Vd: Vòng bán kết dời sang sân trong nhà do trời mưa..."
                  className="h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStage(null)}
                  disabled={isSavingStage}
                  className="border-slate-200 text-slate-650 font-semibold hover:bg-slate-50"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSaveStageDetails}
                  disabled={isSavingStage}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                >
                  {isSavingStage ? 'Đang lưu...' : 'Lưu cài đặt'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* LOCK LIST & BILLING MODAL */}
      {isLockModalOpen && lockSummary && (
        <Modal open={isLockModalOpen} onOpenChange={(open) => { if (!open) setIsLockModalOpen(false); }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Chốt danh sách vận động viên & tính phí
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-5 mt-4">
              <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-200 flex gap-3 text-xs leading-relaxed font-semibold">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-950">Hành động không thể hoàn tác!</p>
                  <p className="mt-1">Khi chốt danh sách VĐV, giải đấu sẽ khóa đăng ký, tự động sinh sơ đồ đấu loại trực tiếp và tính phí sàn.</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y text-sm bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500 font-semibold">Tổng số đội đăng ký</span>
                  <span className="font-bold text-slate-900">{lockSummary.totalParticipants} đội</span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500 font-semibold">Tổng số VĐV thực tế</span>
                  <span className="font-bold text-slate-900">{lockSummary.totalPlayers} người chơi</span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500 font-semibold">Đơn giá phí sàn / VĐV</span>
                  <span className="font-bold text-slate-900">{lockSummary.platformFeePerPlayer.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="p-3.5 flex justify-between bg-blue-50">
                  <span className="text-blue-900 font-black">Tổng phí sàn nền tảng</span>
                  <span className="font-black text-emerald-600 text-base">{lockSummary.totalPlatformFee.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsLockModalOpen(false)}
                  disabled={isLocking}
                  className="border-slate-200 text-slate-650 font-medium animate-none hover:bg-slate-50"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleConfirmLock}
                  disabled={isLocking}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5"
                >
                  {isLocking ? 'Đang khóa...' : 'Xác nhận chốt danh sách'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* SCHEDULING MATCH MODAL */}
      {selectedMatch && (
        <Modal open={!!selectedMatch} onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Sắp xếp Lịch thi đấu - Trận {selectedMatch.matchOrder} Vòng {selectedMatch.roundNumber}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Chọn sân thi đấu</label>
                <select
                  value={matchCourtId}
                  onChange={(e) => setMatchCourtId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa gán sân con --</option>
                  {courts.map(court => (
                    <option key={court.id} value={court.id}>{court.courtName}</option>
                  ))}
                </select>
              </div>

              <DateTimePicker
                label="Chọn giờ thi đấu dự kiến"
                value={matchScheduledAt}
                onChange={setMatchScheduledAt}
              />

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  disabled={isScheduling}
                  className="border-slate-200 text-slate-650 font-medium hover:bg-slate-50"
                >
                  Đóng
                </Button>
                <Button
                  onClick={handleSaveSchedule}
                  disabled={isScheduling}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                >
                  {isScheduling ? 'Đang cập nhật...' : 'Lưu sắp xếp'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

    </div>
  );
}
