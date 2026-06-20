'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';
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
  X
} from 'lucide-react';

interface CreatorInfo {
  id: string;
  email: string;
  fullName: string;
}

interface TournamentItem {
  id: string;
  name: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED' | 'DRAFT' | 'PENDING_APPROVAL';
  entryFee: string;
  matchType: string;
  tournamentType: string;
  visibility: string;
  createdAt: string;
  creator?: CreatorInfo;
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState(false);

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

  const handleTournamentAction = async (id: string, action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject') => {
    if (processing) return;
    
    const confirmMsg = 
      action === 'suspend' ? 'Bạn có chắc chắn muốn tạm đình chỉ giải đấu này?' :
      action === 'unsuspend' ? 'Bạn có chắc chắn muốn khôi phục hoạt động giải đấu này?' :
      action === 'approve' ? 'Bạn có chắc chắn muốn phê duyệt giải đấu này không?' :
      action === 'reject' ? 'Bạn có chắc chắn muốn từ chối/bác bỏ giải đấu này không?' :
      'CẢNH BÁO: Bạn có chắc chắn muốn HỦY và CẤM vĩnh viễn giải đấu này? Hành động này không thể hoàn tác!';
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/admin/tournaments/${id}/${action}`);
      toast.success(
        action === 'suspend' ? 'Đã đình chỉ giải đấu thành công!' :
        action === 'unsuspend' ? 'Đã khôi phục hoạt động giải đấu!' : 
        action === 'approve' ? 'Đã phê duyệt giải đấu thành công!' : 
        action === 'reject' ? 'Đã bác bỏ/từ chối giải đấu!' : 
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">Chờ duyệt</span>;
      case 'SUSPENDED':
        return <span className="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-red-200">Bị đình chỉ</span>;
      case 'CANCELLED':
        return <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-rose-200">Đã cấm/hủy</span>;
      case 'ONGOING':
        return <span className="bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">Đang diễn ra</span>;
      case 'UPCOMING':
        return <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-200">Sắp diễn ra</span>;
      case 'COMPLETED':
        return <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">Đã kết thúc</span>;
      case 'DRAFT':
        return <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">Bản nháp</span>;
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
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Giải Đấu Hệ Thống</h2>
        <p className="text-slate-500 text-sm">Giám sát toàn bộ giải đấu, áp dụng chế tài tạm đình chỉ hoặc cấm vĩnh viễn các giải đấu vi phạm chính sách.</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên giải đấu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-11 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-xl transition-colors active:scale-95 whitespace-nowrap"
          >
            Tìm kiếm
          </button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex gap-2">
          {[
            { label: 'Tất cả', value: '' },
            { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
            { label: 'Đang hoạt động', value: 'ONGOING' },
            { label: 'Bị đình chỉ', value: 'SUSPENDED' },
          ].map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
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
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách giải đấu...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-800">Không tìm thấy giải đấu nào</p>
          <p className="text-xs text-slate-500">Thử tìm kiếm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Thông tin giải đấu</th>
                  <th className="p-4">Người tổ chức (Creator)</th>
                  <th className="p-4">Lệ phí & Thể thức</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Hành động điều hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {tournaments.map((item) => (
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
                        {item.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleTournamentAction(item.id, 'approve')}
                              disabled={processing}
                              className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleTournamentAction(item.id, 'reject')}
                              disabled={processing}
                              className="bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}
                        {item.status !== 'SUSPENDED' && item.status !== 'CANCELLED' && item.status !== 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleTournamentAction(item.id, 'suspend')}
                            disabled={processing}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Đình chỉ
                          </button>
                        )}
                        {item.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleTournamentAction(item.id, 'unsuspend')}
                            disabled={processing}
                            className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Khôi phục
                          </button>
                        )}
                        {item.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleTournamentAction(item.id, 'ban')}
                            disabled={processing}
                            className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
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
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <span className="text-xs text-slate-500 font-medium">Trang {page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
