'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { communitiesApi } from '@/features/communities/api';
import { Button } from '@/components/ui/Button';
import type { Community } from '@/types/community';
import { getErrorMessage } from '@/utils/error';
import {
  AlertCircle,
  Building,
  Check,
  Loader2,
  MapPin,
  Search,
  Users,
  X,
  Eye,
  Ban,
} from 'lucide-react';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED';
type ReviewCommunityStatus = Exclude<StatusFilter, 'ALL'>;
type ReviewCommunity = Omit<Community, 'status'> & {
  status: ReviewCommunityStatus;
};

export default function AdminCommunitiesReview() {
  const [communities, setCommunities] = useState<ReviewCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<ReviewCommunity | null>(null);

  const fetchAllCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await communitiesApi.getAllCommunitiesAdmin();
      const all = Array.isArray(res.data) ? res.data : [];

      const merged: ReviewCommunity[] = all.map((community) => ({
        ...community,
        status: (community.status === 'ACTIVE' ? 'ACTIVE' :
                 community.status === 'PENDING' ? 'PENDING' :
                 community.status === 'REJECTED' ? 'REJECTED' :
                 'PENDING') as ReviewCommunityStatus,
      }));
      setCommunities(merged);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to fetch communities:', err);
      setError(getErrorMessage(err, 'Không thể tải danh sách cộng đồng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCommunities();
  }, [fetchAllCommunities]);

  const handleApprove = async (id: string) => {
    try {
      setSubmitting(true);
      await communitiesApi.reviewCommunity(id, { status: 'APPROVED' });
      toast.success('Đã duyệt cộng đồng thành công');
      fetchAllCommunities();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Duyệt cộng đồng thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!reason.trim()) {
      setModalError('Vui lòng nhập lý do');
      return;
    }
    try {
      setSubmitting(true);
      setModalError(null);
      await communitiesApi.reviewCommunity(id, {
        status: 'REJECTED',
        rejectedReason: reason,
      });
      toast.success('Đã từ chối cộng đồng');
      setRejectingId(null);
      setRejectReason('');
      fetchAllCommunities();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Từ chối thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Vô hiệu hoá cộng đồng này? Thành viên sẽ không thể truy cập.')) return;
    try {
      setSubmitting(true);
      await communitiesApi.reviewCommunity(id, { status: 'REJECTED', rejectedReason: 'Vô hiệu hoá bởi Admin' });
      toast.success('Đã vô hiệu hoá cộng đồng');
      fetchAllCommunities();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Thao tác thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (id: string) => {
    if (!window.confirm('Mở lại cộng đồng này?')) return;
    try {
      setSubmitting(true);
      await communitiesApi.reviewCommunity(id, { status: 'APPROVED', rejectedReason: '' });
      toast.success('Đã mở lại cộng đồng');
      fetchAllCommunities();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Thao tác thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = communities.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const descMatch = (c.description || '').toLowerCase().includes(q);
      const addrMatch = (c.locationAddress || '').toLowerCase().includes(q);
      if (!nameMatch && !descMatch && !addrMatch) return false;
    }
    return true;
  });

  const stats = {
    total: communities.length,
    active: communities.filter(c => c.status === 'ACTIVE').length,
    pending: communities.filter(c => c.status === 'PENDING').length,
    rejected: communities.filter(c => c.status === 'REJECTED').length,
  };

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex-1">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );

  // ─── Loading ───
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 animate-pulse space-y-3">
            <div className="h-6 w-48 bg-gray-100 rounded" />
            <div className="h-12 w-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý cộng đồng</h2>
          <p className="text-xs text-gray-500">Xem, duyệt và quản lý tất cả câu lạc bộ trên hệ thống</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-rose-50 px-4 py-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Tổng số" value={stats.total} color="text-gray-800" />
        <StatCard label="Hoạt động" value={stats.active} color="text-blue-600" />
        <StatCard label="Chờ duyệt" value={stats.pending} color="text-amber-600" />
        <StatCard label="Đã khoá" value={stats.rejected} color="text-rose-600" />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm cộng đồng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            { value: 'ALL', label: 'Tất cả', count: stats.total, color: 'text-gray-700' },
            { value: 'ACTIVE', label: 'Hoạt động', count: stats.active, color: 'text-blue-600' },
            { value: 'PENDING', label: 'Chờ duyệt', count: stats.pending, color: 'text-amber-600' },
            { value: 'REJECTED', label: 'Đã khoá', count: stats.rejected, color: 'text-rose-600' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as StatusFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === opt.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {opt.label}
              <span className={`text-[10px] leading-none ${
                statusFilter === opt.value
                  ? 'text-white/70'
                  : opt.color
              }`}>
                ({opt.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-14 text-center shadow-sm">
          <Building className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-base font-semibold text-gray-700">Không có cộng đồng nào</p>
          <p className="mt-1 text-xs text-gray-400">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((community) => {
            const isPending = community.status === 'PENDING';
            const isActive = community.status === 'ACTIVE';
            const statusColor = isPending
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : isActive
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-gray-50 text-gray-500 border-gray-200';
            const statusLabel = isPending ? 'Chờ duyệt' : isActive ? 'Hoạt động' : 'Đã khoá';

            return (
              <div
                key={community.id}
                onClick={() => setSelectedCommunity(community)}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md cursor-pointer"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg overflow-hidden shrink-0 font-bold uppercase border bg-blue-50 text-blue-700 border-blue-100">
                        {community.logoUrl ? (
                          <img src={community.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          community.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900">{community.name}</h3>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {community.locationAddress || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {(community as any)._count?.members || 0} TV
                          </span>
                        </div>
                      </div>
                    </div>

                    {community.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {community.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 md:flex-col md:min-w-[130px]">
                    {/* Xem */}
                    <button
                      onClick={() => window.open(`/communities/${community.id}`, '_blank')}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem
                    </button>

                    {/* Duyệt (nếu PENDING) */}
                    {isPending && (
                      <Button
                        disabled={submitting}
                        onClick={() => handleApprove(community.id)}
                        variant="success"
                        size="sm"
                        className="text-xs active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt
                      </Button>
                    )}

                    {/* Từ chối / Vô hiệu */}
                    {isPending ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setRejectingId(community.id); setRejectReason(''); setModalError(null); }}
                        className="text-xs active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                        Từ chối
                      </Button>
                    ) : isActive ? (
                      <button
                        disabled={submitting}
                        onClick={() => handleDeactivate(community.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 transition-all hover:bg-gray-100 active:scale-95"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Vô hiệu
                      </button>
                    ) : (
                      <button
                        disabled={submitting}
                        onClick={() => handleReactivate(community.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-100 active:scale-95"
                      >
                        Mở lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-bold text-gray-800">Từ chối cộng đồng</h3>
              <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600">Lý do từ chối</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể..."
                  className="h-28 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500"
                />
              </div>
              {modalError && <p className="text-xs font-semibold text-rose-500">{modalError}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <Button
                variant="outline"
                onClick={() => setRejectingId(null)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                disabled={submitting}
                onClick={() => handleReject(rejectingId, rejectReason)}
                variant="destructive"
                className="text-xs active:scale-95"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm" onClick={() => setSelectedCommunity(null)}>
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
              {selectedCommunity.bannerUrl && <img src={selectedCommunity.bannerUrl} alt="" className="w-full h-full object-cover opacity-60" />}
              <button onClick={() => setSelectedCommunity(null)} className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-end -mt-10 mb-4">
                <div className="w-20 h-20 rounded-xl border-4 border-white bg-white overflow-hidden shadow-md shrink-0">
                  {selectedCommunity.logoUrl ? (
                    <img src={selectedCommunity.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xl">{selectedCommunity.name.charAt(0)}</div>
                  )}
                </div>
                <div className="ml-4 pb-1">
                  <h3 className="text-lg font-bold text-gray-900">{selectedCommunity.name}</h3>
                  <p className="text-xs text-gray-500">{selectedCommunity.locationAddress || 'Chưa cập nhật'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {selectedCommunity.status === 'ACTIVE' && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-xs font-bold">Hoạt động</span>}
                {selectedCommunity.status === 'PENDING' && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-bold">Chờ duyệt</span>}
                {selectedCommunity.status === 'REJECTED' && <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs font-bold">Đã khoá</span>}
                <span className="text-[10px] text-gray-400">{new Date(selectedCommunity.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              {selectedCommunity.description && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">{selectedCommunity.description}</p>
              )}
              {selectedCommunity.status === 'REJECTED' && (selectedCommunity as any).rejectedReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-bold text-rose-600 mb-1">Lý do khoá</p>
                  <p className="text-sm text-rose-800">{(selectedCommunity as any).rejectedReason}</p>
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedCommunity(null)} className="text-xs flex-1">Đóng</Button>
                <Button size="sm" onClick={() => window.open(`/communities/${selectedCommunity.id}`, '_blank')} className="text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white">Xem trang</Button>
                {selectedCommunity.status === 'REJECTED' && (
                  <Button size="sm" onClick={() => { setSelectedCommunity(null); handleReactivate(selectedCommunity.id); }} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Mở lại</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
