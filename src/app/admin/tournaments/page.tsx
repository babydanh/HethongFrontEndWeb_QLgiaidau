'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';
import { getSportLogo } from '@/constants/sports';
import {
  Trophy, 
  Search, 
  Lock, 
  Unlock, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Calendar,
  DollarSign,
  User,
  Users,
  Check,
  X,
  Eye,
  MapPin
} from 'lucide-react';
import { isTournamentUpcoming } from '@/utils/tournament-status';

interface CreatorInfo {
  id: string;
  email: string;
  fullName: string;
}

interface TournamentItem {
  id: string;
  name: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED' | 'DRAFT' | 'PENDING_APPROVAL' | 'PENDING_DELETE';
  entryFee: string;
  matchType: string;
  tournamentType: string;
  visibility: string;
  createdAt: string;
  creator?: CreatorInfo;
}

interface TournamentDetail extends TournamentItem {
  bannerUrl?: string | null;
  description?: string | null;
  isRanked?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  maxParticipants?: number | null;
  category?: {
    name?: string | null;
  } | null;
  venue?: {
    name?: string | null;
    locationAddress?: string | null;
  } | null;
}

/** Countdown đầy đủ giờ:phút:giây cho admin */
function FullCountdownAdmin({ targetDate }: { targetDate: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setText('Đang mở đăng ký'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setText(`Còn ${d} ngày ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      else setText(`Còn ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  if (!text) return null;
  return (
    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
      <span className="text-xs font-bold text-amber-700">⏳ {text}</span>
    </div>
  );
}

export default function AdminTournamentsPage() {
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [detailTournament, setDetailTournament] = useState<TournamentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionModal, setActionModal] = useState<{
    tournamentId: string;
    action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'approve-delete' | 'reject-delete';
    tournamentName: string;
  } | null>(null);
  const [actionNote, setActionNote] = useState('');

  const handleOpenDetail = async (id: string) => {
    setSelectedTournamentId(id);
    setLoadingDetail(true);
    setDetailTournament(null);
    try {
      const response = await api.get<ApiResponse<TournamentDetail>>(`/tournaments/${id}`);
      setDetailTournament(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Không thể lấy thông tin chi tiết giải đấu');
      setSelectedTournamentId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchTournaments = async (searchTerm = '', showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const statusParam = selectedStatus ? `&status=${selectedStatus}` : '';
      const response = await api.get<ApiResponse<TournamentItem[]>>(`/admin/tournaments?page=${page}&limit=10&search=${searchTerm}${statusParam}`);
      setTournaments(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error) {
      console.error(error);
      toast.error('Không thể lấy danh sách giải đấu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTournaments(search, page === 1 ? false : true);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTournaments(search);
  };

  const parseDate = (str: string): Date | null => {
    const p = str.split('/');
    if (p.length !== 3) return null;
    const d = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[2], 10);
    return isNaN(d) || isNaN(m) || isNaN(y) ? null : new Date(y, m, d);
  };

  const filteredTournaments = tournaments.filter(t => {
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (!fromDate && !toDate) return true;
    const d = new Date(t.createdAt);
    if (fromDate && d < fromDate) return false;
    if (toDate) { const end = new Date(toDate); end.setHours(23, 59, 59, 999); if (d > end) return false; }
    return true;
  });

  const handleTournamentAction = async (
    id: string,
    action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'approve-delete' | 'reject-delete',
    note?: string,
  ) => {
    if (processing) return;
    
    const confirmMsg = 
      action === 'suspend' ? 'Bạn có chắc chắn muốn tạm đình chỉ giải đấu này?' :
      action === 'unsuspend' ? 'Bạn có chắc chắn muốn khôi phục hoạt động giải đấu này?' :
      action === 'approve' ? 'Bạn có chắc chắn muốn phê duyệt giải đấu này không?' :
      action === 'reject' ? 'Bạn có chắc chắn muốn từ chối/bác bỏ giải đấu này không?' :
      action === 'approve-delete' ? 'Bạn có chắc chắn muốn phê duyệt YÊU CẦU XÓA giải đấu này không? Hành động này sẽ xóa giải đấu vĩnh viễn.' :
      action === 'reject-delete' ? 'Bạn có chắc chắn muốn từ chối yêu cầu xóa giải đấu này không? Giải đấu sẽ được khôi phục hoạt động bình thường.' :
      'CẢNH BÁO: Bạn có chắc chắn muốn HỦY và CẤM vĩnh viễn giải đấu này? Hành động này không thể hoàn tác!';
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/admin/tournaments/${id}/${action}`, note ? { note } : undefined);
      toast.success(
        action === 'suspend' ? 'Đã đình chỉ giải đấu thành công!' :
        action === 'unsuspend' ? 'Đã khôi phục hoạt động giải đấu!' : 
        action === 'approve' ? 'Đã phê duyệt giải đấu thành công!' : 
        action === 'reject' ? 'Đã bác bỏ/từ chối giải đấu!' : 
        action === 'approve-delete' ? 'Đã duyệt yêu cầu xóa giải đấu thành công!' :
        action === 'reject-delete' ? 'Đã từ chối yêu cầu xóa giải đấu!' :
        'Đã cấm/hủy giải đấu vĩnh viễn!'
      );
      fetchTournaments(search);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi thực hiện hành động trên giải đấu');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenActionModal = (
    tournamentId: string,
    tournamentName: string,
    action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'approve-delete' | 'reject-delete',
  ) => {
    setActionModal({ tournamentId, action, tournamentName });
    setActionNote('');
  };

  const handleSubmitActionModal = async () => {
    if (!actionModal) {
      return;
    }

    const requiresNote =
      actionModal.action === 'reject' ||
      actionModal.action === 'reject-delete' ||
      actionModal.action === 'suspend' ||
      actionModal.action === 'ban';

    if (requiresNote && !actionNote.trim()) {
      toast.error('Vui lòng nhập ghi chú xử lý');
      return;
    }

    await handleTournamentAction(actionModal.tournamentId, actionModal.action, actionNote.trim() || undefined);
    setActionModal(null);
    setActionNote('');
  };

  const actionModalTitle = actionModal
    ? actionModal.action === 'reject'
      ? 'Từ chối duyệt giải đấu'
      : actionModal.action === 'reject-delete'
      ? 'Từ chối yêu cầu xóa giải'
      : actionModal.action === 'suspend'
      ? 'Tạm đình chỉ giải đấu'
      : actionModal.action === 'ban'
      ? 'Hủy vĩnh viễn giải đấu'
      : actionModal.action === 'approve-delete'
      ? 'Duyệt yêu cầu xóa giải'
      : actionModal.action === 'approve'
      ? 'Phê duyệt giải đấu'
      : 'Khôi phục giải đấu'
    : '';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">Chờ duyệt ELO</span>;
      case 'PENDING_DELETE':
        return <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-rose-200">Yêu cầu xóa</span>;
      case 'SUSPENDED':
        return <span className="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-red-200">Bị đình chỉ</span>;
      case 'CANCELLED':
        return <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-rose-200">Đã cấm/hủy</span>;
      case 'REGISTRATION_OPEN':
        return <span className="bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">Mở đăng ký</span>;
      case 'REGISTRATION_CLOSED':
        return <span className="bg-zinc-100 text-zinc-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-zinc-300">Đóng đăng ký</span>;
      case 'IN_PROGRESS':
      case 'ONGOING':
        return (
          <span className="bg-violet-50 text-violet-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-violet-200 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-ping"></span>
            Đang diễn ra
          </span>
        );
      case 'UPCOMING':
        return <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-200">Sắp diễn ra</span>;
      case 'COMPLETED':
        return <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">Đã kết thúc</span>;
      case 'DRAFT':
        return <span className="bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">Bản nháp</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{status}</span>;
    }
  };

  const formatMoney = (amount: string) => {
    const value = parseFloat(amount);
    if (isNaN(value) || value === 0) return 'Miễn phí';
    return value.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {isModeratorOnly ? 'Điều phối duyệt giải đấu' : 'Quản lý giải đấu hệ thống'}
        </h2>
        <p className="text-slate-500 text-sm">
          {isModeratorOnly
            ? 'Người điều phối duyệt hoặc từ chối các giải đang chờ xét duyệt trước khi lên hệ thống.'
            : 'Giám sát toàn bộ giải đấu, áp dụng chế tài tạm đình chỉ hoặc cấm vĩnh viễn các giải đấu vi phạm chính sách.'}
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên giải đấu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg pl-11 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors active:scale-95 whitespace-nowrap"
          >
            Tìm kiếm
          </button>
        </form>

        {/* Date Filter */}
        <div className="flex items-center gap-2 min-w-[130px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Từ ngày (dd/mm/yyyy)" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>
        <div className="flex items-center gap-2 min-w-[130px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Đến ngày (dd/mm/yyyy)" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 max-w-2xl">
          {[
            { label: 'Tất cả', value: '' },
            { label: 'Bản nháp', value: 'DRAFT' },
            { label: 'Chờ duyệt ELO', value: 'PENDING_APPROVAL' },
            { label: 'Mở đăng ký', value: 'REGISTRATION_OPEN' },
            { label: 'Đóng đăng ký', value: 'REGISTRATION_CLOSED' },
            { label: 'Sắp diễn ra', value: 'UPCOMING' },
            { label: 'Đang diễn ra', value: 'IN_PROGRESS' },
            { label: 'Đã kết thúc', value: 'COMPLETED' },
            { label: 'Bị đình chỉ', value: 'SUSPENDED' },
            { label: 'Đã cấm/hủy', value: 'CANCELLED' },
            { label: 'Yêu cầu xóa', value: 'PENDING_DELETE' },
          ].map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                selectedStatus === tab.value
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách giải đấu...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center text-slate-500 space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-800">Không tìm thấy giải đấu nào</p>
          <p className="text-xs text-slate-500">Thử tìm kiếm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Thông tin giải đấu</th>
                  <th className="p-4">Người tổ chức</th>
                  <th className="p-4">Lệ phí & Thể thức</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Hành động điều hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {filteredTournaments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {item.tournamentType}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {item.visibility}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Tạo ngày {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-800">{item.creator?.fullName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{item.creator?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-800 flex items-center gap-0.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          {formatMoney(item.entryFee)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.matchType === 'DOUBLES' ? 'Đấu đôi' : 'Đấu đơn'}</p>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(item.status)}</td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(item.id)}
                          className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-transparent px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Chi tiết
                        </button>
                        {!isModeratorOnly && item.status === 'PENDING_DELETE' && (
                          <>
                            <button
                              onClick={() => handleTournamentAction(item.id, 'approve-delete')}
                              disabled={processing}
                              className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Duyệt xóa
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(item.id, item.name, 'reject-delete')}
                              disabled={processing}
                              className="bg-slate-50 hover:bg-slate-600 text-slate-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}
                        {item.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleTournamentAction(item.id, 'approve')}
                              disabled={processing}
                              className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(item.id, item.name, 'reject')}
                              disabled={processing}
                              className="bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}
                        {!isModeratorOnly && item.status !== 'SUSPENDED' && item.status !== 'CANCELLED' && item.status !== 'PENDING_APPROVAL' && item.status !== 'PENDING_DELETE' && (
                          <button
                            onClick={() => handleOpenActionModal(item.id, item.name, 'suspend')}
                            disabled={processing}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Đình chỉ
                          </button>
                        )}
                        {!isModeratorOnly && item.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleTournamentAction(item.id, 'unsuspend')}
                            disabled={processing}
                            className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Khôi phục
                          </button>
                        )}
                        {!isModeratorOnly && item.status !== 'CANCELLED' && item.status !== 'PENDING_DELETE' && (
                          <button
                            onClick={() => handleOpenActionModal(item.id, item.name, 'ban')}
                            disabled={processing}
                            className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Hủy vĩnh viễn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <span className="text-xs text-slate-500 font-medium">Trang {page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {selectedTournamentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-lg">Chi Tiết Giải Đấu</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedTournamentId(null);
                  setDetailTournament(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Đang tải thông tin chi tiết...</p>
                </div>
              ) : detailTournament ? (
                <div className="space-y-6">
                  {/* Banner & Basic Info */}
                  <div className="relative rounded-lg overflow-hidden aspect-[21/9] bg-slate-100 border border-slate-200">
                    {detailTournament.bannerUrl ? (
                      <img
                        src={detailTournament.bannerUrl}
                        alt={detailTournament.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Trophy className="w-12 h-12 stroke-[1.5]" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {getStatusBadge(detailTournament.status)}
                      <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {detailTournament.visibility}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-bold text-slate-900 leading-snug">{detailTournament.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">ID: {detailTournament.id}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Left Column */}
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Môn thi đấu & Thể loại</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-lg font-semibold border border-blue-100">
                            {(() => {
                              const logo = getSportLogo(detailTournament.category?.name);
                              return logo ? <img src={logo} alt="" className="w-3 h-3 object-contain" /> : null;
                            })()}
                            {detailTournament.category?.name || 'N/A'}
                          </span>
                          <span className="bg-slate-50 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-semibold border border-slate-200">
                            {detailTournament.tournamentType === 'CLUB' ? 'Nội bộ CLB' : 'Mở rộng (PUBLIC)'}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                            detailTournament.isRanked 
                              ? 'bg-amber-50 text-amber-600 border-amber-200' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {detailTournament.isRanked ? 'Tính điểm ELO' : 'Giải phong trào'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Thể thức thi đấu</span>
                        <p className="font-semibold text-slate-800 mt-1">
                          {detailTournament.matchType === 'DOUBLES' ? 'Đấu đôi' : 'Đấu đơn'}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Lệ phí tham gia</span>
                        <p className="font-bold text-emerald-600 text-base mt-0.5 flex items-center gap-0.5">
                          <DollarSign className="w-4 h-4" />
                          {formatMoney(detailTournament.entryFee)}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Thời gian diễn ra</span>
                        <p className="text-slate-800 font-semibold mt-1 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {detailTournament.startDate ? new Date(detailTournament.startDate).toLocaleDateString('vi-VN') : 'Chưa xếp lịch'}
                          {detailTournament.endDate && ` - ${new Date(detailTournament.endDate).toLocaleDateString('vi-VN')}`}
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Người tạo giải</span>
                        <p className="font-semibold text-slate-800 mt-1">{detailTournament.creator?.fullName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{detailTournament.creator?.email || 'N/A'}</p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Địa điểm thi đấu</span>
                        <p className="font-semibold text-slate-800 mt-1 flex items-start gap-1">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {detailTournament.venue?.name || 'N/A'}
                            {detailTournament.venue?.locationAddress && (
                              <span className="block text-xs text-slate-400 font-normal mt-0.5">{detailTournament.venue.locationAddress}</span>
                            )}
                          </span>
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Giới hạn người tham gia</span>
                        <p className="font-semibold text-slate-800 mt-1">
                          {detailTournament.maxParticipants
                            ? `Tối đa ${detailTournament.maxParticipants} người/đội`
                            : 'Không giới hạn'}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Thời gian đăng ký</span>
                        <p className="text-xs text-slate-600 mt-1">
                          {detailTournament.registrationStartDate ? new Date(detailTournament.registrationStartDate).toLocaleDateString('vi-VN') : 'N/A'}
                          {detailTournament.registrationEndDate && ` - ${new Date(detailTournament.registrationEndDate).toLocaleDateString('vi-VN')}`}
                        </p>
                        {isTournamentUpcoming(detailTournament.status) && detailTournament.registrationStartDate && (
                          <FullCountdownAdmin targetDate={detailTournament.registrationStartDate} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {detailTournament.description && (
                    <div className="border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-400 block font-medium mb-1">Mô tả giải đấu</span>
                      <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {detailTournament.description}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-10">Không tìm thấy thông tin giải đấu.</p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 justify-end">
              {detailTournament && (
                <>
                  {!isModeratorOnly && detailTournament.status === 'PENDING_DELETE' && (
                    <>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'approve-delete');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Duyệt xóa vĩnh viễn
                      </button>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'reject-delete');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Từ chối yêu cầu xóa
                      </button>
                    </>
                  )}
                  {detailTournament.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'approve');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Phê duyệt ELO
                      </button>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'reject');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Từ chối phê duyệt
                      </button>
                    </>
                  )}
                  {!isModeratorOnly && detailTournament.status !== 'SUSPENDED' && detailTournament.status !== 'CANCELLED' && detailTournament.status !== 'PENDING_APPROVAL' && detailTournament.status !== 'PENDING_DELETE' && (
                    <button
                      onClick={() => {
                        handleTournamentAction(detailTournament.id, 'suspend');
                        setSelectedTournamentId(null);
                      }}
                      disabled={processing}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      Tạm đình chỉ giải đấu
                    </button>
                  )}
                  {!isModeratorOnly && detailTournament.status === 'SUSPENDED' && (
                    <button
                      onClick={() => {
                        handleTournamentAction(detailTournament.id, 'unsuspend');
                        setSelectedTournamentId(null);
                      }}
                      disabled={processing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      Khôi phục giải đấu
                    </button>
                  )}
                  {!isModeratorOnly && detailTournament.status !== 'CANCELLED' && detailTournament.status !== 'PENDING_DELETE' && (
                    <button
                      onClick={() => {
                        handleTournamentAction(detailTournament.id, 'ban');
                        setSelectedTournamentId(null);
                      }}
                      disabled={processing}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Hủy vĩnh viễn (Cấm)
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  setSelectedTournamentId(null);
                  setDetailTournament(null);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">{actionModalTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">
                Giải đấu: <span className="font-semibold text-slate-700">{actionModal.tournamentName}</span>
              </p>
            </div>

            <div className="space-y-3 p-6">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ghi chú xử lý của admin
              </label>
              <textarea
                rows={4}
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                placeholder="Ví dụ: Hồ sơ chưa đủ điều kiện tính điểm ELO, thiếu minh chứng hoặc đang vi phạm chính sách hệ thống."
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500"
              />
              <p className="text-xs text-slate-500">
                Ghi chú này sẽ được dùng làm lý do xử lý cho các nhánh từ chối hoặc chế tài.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionNote('');
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleSubmitActionModal()}
                disabled={processing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
