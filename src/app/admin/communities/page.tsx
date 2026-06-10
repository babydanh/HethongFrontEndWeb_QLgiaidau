'use client';

import { useEffect, useState } from 'react';
import { communitiesApi } from '@/features/communities/api';
import { Community } from '@/types/community';
import { Building, MapPin, Calendar, Check, X, AlertCircle } from 'lucide-react';

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
        // Dựa vào PaginatedResponse hoặc ApiResponse
        // getPendingCommunities trả về PaginatedResponse nên danh sách nằm ở res.data
        if (res.data && Array.isArray(res.data)) {
          setCommunities(res.data);
        } else if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
          setCommunities((res.data as any).data);
        } else {
          setCommunities([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch pending communities:', err);
        setError('Không thể tải danh sách cộng đồng chờ duyệt');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPendingCommunities();
  }, []);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn duyệt cộng đồng này không?')) return;
    
    try {
      setSubmitting(true);
      await communitiesApi.reviewCommunity(id, { status: 'APPROVED' });
      alert('Đã duyệt cộng đồng thành công!');
      fetchPendingCommunities();
    } catch (err) {
      console.error('Approve community error:', err);
      alert('Duyệt thất bại. Vui lòng thử lại.');
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
      alert('Đã từ chối cộng đồng thành công!');
      setRejectingId(null);
      setRejectReason('');
      fetchPendingCommunities();
    } catch (err) {
      console.error('Reject community error:', err);
      setModalError('Từ chối thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="w-48 h-6 bg-slate-800 rounded"></div>
                <div className="w-32 h-4 bg-slate-800 rounded"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-20 h-9 bg-slate-800 rounded-lg"></div>
                <div className="w-20 h-9 bg-slate-800 rounded-lg"></div>
              </div>
            </div>
            <div className="w-full h-16 bg-slate-800 rounded"></div>
            <div className="w-40 h-4 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white">Duyệt Cộng Đồng Mới</h2>
        <p className="text-xs text-slate-400">Các cộng đồng/CLB thể thao đang chờ quản trị viên duyệt để hiển thị công khai</p>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Communities List */}
      {communities.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Building className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="font-bold">Không có cộng đồng nào chờ duyệt</p>
          <p className="text-xs text-slate-500">Mọi cộng đồng hiện tại đều đã được xử lý xong.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {communities.map((community) => (
            <div 
              key={community.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Info section */}
              <div className="space-y-4 max-w-3xl flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-900/20 border border-blue-800/30 flex items-center justify-center text-blue-400 font-bold uppercase">
                    {community.logoUrl ? (
                      <img src={community.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      community.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{community.name}</h3>
                    <div className="flex flex-wrap gap-2 items-center mt-1">
                      {community.categories && community.categories.map((cat) => (
                        <span key={cat.id} className="text-[10px] font-bold bg-slate-800 text-blue-400 px-2 py-0.5 rounded-full border border-slate-700">
                          {cat.name}
                        </span>
                      ))}
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">
                        {community.joinMode === 'OPEN' ? 'Mở Tự Do' : community.joinMode === 'APPROVAL' ? 'Cần Xét Duyệt' : 'Chỉ Lời Mời'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-300 line-clamp-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  {community.description || 'Không có mô tả cho cộng đồng này.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{community.locationAddress || 'Chưa cung cấp địa chỉ'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Ngày tạo: {new Date(community.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Actions section */}
              <div className="flex md:flex-col gap-3 justify-end min-w-[150px]">
                <button
                  disabled={submitting}
                  onClick={() => handleApprove(community.id)}
                  className="flex-1 md:w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
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
                  className="flex-1 md:w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white disabled:opacity-50 text-sm font-bold border border-rose-500/20 rounded-xl transition-all active:scale-95"
                >
                  <X className="w-4 h-4" />
                  Từ Chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="text-base font-bold text-white">Từ chối duyệt cộng đồng</h3>
              <button 
                onClick={() => setRejectingId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRejectSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Lý do từ chối</label>
                  <textarea
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể gửi tới người sáng lập (ví dụ: thông tin sai lệch, vi phạm tiêu chuẩn cộng đồng, tên phản cảm...)"
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {modalError && (
                  <p className="text-xs font-semibold text-rose-400">{modalError}</p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-rose-500/10 active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
