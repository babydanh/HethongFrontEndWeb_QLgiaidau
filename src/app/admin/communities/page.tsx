'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { communitiesApi } from '@/features/communities/api';
import type { Community } from '@/types/community';
import { getErrorMessage } from '@/utils/error';
import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  Loader2,
  MapPin,
  Users,
  X,
} from 'lucide-react';

export default function AdminCommunitiesReview() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPendingCommunities = () => {
    setLoading(true);
    communitiesApi.getPendingCommunities()
      .then((res) => {
        setCommunities(Array.isArray(res.data) ? res.data : []);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch pending communities:', err);
        setError(getErrorMessage(err, 'Không thể tải danh sách cộng đồng chờ duyệt'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPendingCommunities();
    });
  }, []);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn duyệt cộng đồng này không?')) return;
    
    try {
      setSubmitting(true);
      await communitiesApi.reviewCommunity(id, { status: 'APPROVED' });
      toast.success('Đã duyệt cộng đồng thành công');
      fetchPendingCommunities();
    } catch (err: unknown) {
      console.error('Approve community error:', err);
      toast.error(getErrorMessage(err, 'Duyệt cộng đồng thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      setModalError('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      await communitiesApi.reviewCommunity(rejectingId, {
        status: 'REJECTED',
        rejectedReason: rejectReason,
      });
      toast.success('Đã từ chối cộng đồng');
      setRejectingId(null);
      setRejectReason('');
      fetchPendingCommunities();
    } catch (err: unknown) {
      console.error('Reject community error:', err);
      setModalError(getErrorMessage(err, 'Từ chối cộng đồng thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-slate-100"></div>
                <div className="h-4 w-32 rounded bg-slate-100"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded-lg bg-slate-100"></div>
                <div className="h-9 w-20 rounded-lg bg-slate-100"></div>
              </div>
            </div>
            <div className="h-16 w-full rounded bg-slate-100"></div>
            <div className="h-4 w-40 rounded bg-slate-100"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Duyệt cộng đồng mới</h2>
          <p className="text-sm text-slate-500">
            Kiểm tra hồ sơ câu lạc bộ đang chờ duyệt trước khi mở công khai trên hệ thống.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Đang chờ</p>
          <p className="mt-1 text-2xl font-black text-blue-700">{communities.length}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {communities.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
          <Building className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-base font-semibold text-slate-800">Không có cộng đồng nào chờ duyệt</p>
          <p className="mt-1 text-xs text-slate-500">Tất cả hồ sơ cộng đồng hiện đã được xử lý.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {communities.map((community) => (
            <div 
              key={community.id}
              className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md md:flex-row md:items-center md:justify-between"
            >
              <div className="max-w-3xl flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 font-bold uppercase text-blue-700">
                    {community.logoUrl ? (
                      <img src={community.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      community.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight text-slate-900">{community.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {community.categories && community.categories.map((cat) => (
                        <span key={cat.id} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {cat.name}
                        </span>
                      ))}
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        {community.joinMode === 'OPEN' ? 'Mở tự do' : community.joinMode === 'APPROVAL' ? 'Cần xét duyệt' : 'Chỉ lời mời'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="line-clamp-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {community.description || 'Không có mô tả cho cộng đồng này.'}
                </p>

                <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{community.locationAddress || 'Chưa cung cấp địa chỉ'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Ngày tạo: {new Date(community.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{community._count?.members || 0} thành viên</span>
                  </div>
                </div>
              </div>

              <div className="flex min-w-[170px] gap-3 md:flex-col md:justify-end">
                <button
                  disabled={submitting}
                  onClick={() => handleApprove(community.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-emerald-500 disabled:opacity-50 md:w-full"
                >
                  <Check className="w-4 h-4" />
                  Duyệt CLB
                </button>
                <button
                  disabled={submitting}
                  onClick={() => {
                    setRejectingId(community.id);
                    setRejectReason('');
                    setModalError(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-all active:scale-95 hover:bg-rose-600 hover:text-white disabled:opacity-50 md:w-full"
                >
                  <X className="w-4 h-4" />
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">Từ chối duyệt cộng đồng</h3>
              <button 
                onClick={() => setRejectingId(null)}
                className="text-slate-400 transition-colors hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Lý do từ chối</label>
                  <textarea
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể gửi tới người sáng lập (ví dụ: thông tin sai lệch, vi phạm tiêu chuẩn cộng đồng, tên phản cảm...)"
                    className="h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
                  />
                </div>

                {modalError && (
                  <p className="text-xs font-semibold text-rose-600">{modalError}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 hover:bg-rose-500 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
