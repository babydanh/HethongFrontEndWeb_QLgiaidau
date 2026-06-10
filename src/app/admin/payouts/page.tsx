'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { PayoutRequest } from '@/types/payment';
import { CreditCard, Landmark, Check, X, AlertCircle, ExternalLink, Calendar } from 'lucide-react';

export default function AdminPayoutsReview() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review modal state
  const [reviewingPayout, setReviewingPayout] = useState<PayoutRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPayouts = () => {
    setLoading(true);
    paymentsApi.getAdminPayouts()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setPayouts(res.data);
        } else if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
          setPayouts((res.data as any).data);
        } else {
          setPayouts([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch payouts:', err);
        setError('Không thể tải danh sách yêu cầu rút tiền');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleOpenReview = (payout: PayoutRequest, action: 'APPROVED' | 'REJECTED') => {
    setReviewingPayout(payout);
    setReviewAction(action);
    setProofUrl('');
    setNote('');
    setModalError(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingPayout || !reviewAction) return;

    if (reviewAction === 'APPROVED' && !proofUrl.trim()) {
      setModalError('Vui lòng cung cấp link hình ảnh hóa đơn/bằng chứng chuyển khoản');
      return;
    }

    if (reviewAction === 'REJECTED' && !note.trim()) {
      setModalError('Vui lòng nhập lý do từ chối yêu cầu rút tiền');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      await paymentsApi.reviewPayout(reviewingPayout.id, {
        status: reviewAction,
        transactionProofUrl: reviewAction === 'APPROVED' ? proofUrl : undefined,
        note: note.trim() || undefined,
      });
      alert(`Đã ${reviewAction === 'APPROVED' ? 'duyệt giải ngân' : 'từ chối yêu cầu'} thành công!`);
      setReviewingPayout(null);
      fetchPayouts();
    } catch (err) {
      console.error('Review payout error:', err);
      setModalError('Lỗi cập nhật. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse space-y-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="w-48 h-6 bg-slate-800 rounded"></div>
                <div className="w-32 h-4 bg-slate-800 rounded"></div>
              </div>
              <div className="w-24 h-8 bg-slate-800 rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 bg-slate-800 rounded"></div>
              <div className="h-12 bg-slate-800 rounded"></div>
              <div className="h-12 bg-slate-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white">Yêu Cầu Rút Tiền</h2>
        <p className="text-xs text-slate-400">Xem và giải ngân lệ phí các giải đấu cho Ban tổ chức sau khi hoàn thành đối soát</p>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Payouts list */}
      {payouts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="font-bold">Không có yêu cầu rút tiền nào</p>
          <p className="text-xs text-slate-500">Mọi yêu cầu đối soát và rút tiền đã hoàn thành xong.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {payouts.map((request) => (
            <div 
              key={request.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 shadow-xl flex flex-col gap-6"
            >
              {/* Header inside card */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {request.tournament?.name || 'Giải Đấu'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Người yêu cầu: <span className="font-semibold text-slate-300">{(request as any).organizer?.fullName || (request as any).organizer?.email || request.organizerId}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${
                    request.status === 'PENDING' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : request.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {request.status === 'PENDING' ? 'Chờ Duyệt' : request.status === 'APPROVED' ? 'Đã Thanh Toán' : 'Đã Từ Chối'}
                  </span>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Financial Summary */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Đối soát tài chính</p>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Tổng thu được:</span>
                    <span className="font-semibold text-slate-300">{formatCurrency(request.totalCollected)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Phí sàn (5%):</span>
                    <span className="font-semibold text-rose-400">-{formatCurrency(request.platformFeeRetained)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-300">Thực nhận:</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(request.amountRequested)}</span>
                  </div>
                </div>

                {/* Bank account details */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-400" />
                    Tài khoản thụ hưởng
                  </p>
                  <div className="space-y-1 text-xs text-slate-300">
                    <p><span className="text-slate-500">Ngân hàng:</span> <span className="font-semibold">{request.bankName}</span></p>
                    <p><span className="text-slate-500">Số tài khoản:</span> <span className="font-semibold tracking-wider text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{request.bankAccountNumber}</span></p>
                    <p><span className="text-slate-500">Chủ tài khoản:</span> <span className="font-semibold uppercase">{request.bankAccountName}</span></p>
                  </div>
                </div>

                {/* Processing Info or Admin Action */}
                <div className="flex flex-col justify-center">
                  {request.status === 'PENDING' ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOpenReview(request, 'APPROVED')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        Duyệt Chi
                      </button>
                      <button
                        onClick={() => handleOpenReview(request, 'REJECTED')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold border border-rose-500/20 rounded-xl transition-all active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        Từ Chối
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xử lý lúc: {request.processedAt ? new Date(request.processedAt).toLocaleString('vi-VN') : new Date(request.updatedAt).toLocaleString('vi-VN')}</span>
                      </div>
                      {request.transactionProofUrl && (
                        <a 
                          href={request.transactionProofUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline hover:text-blue-300 font-bold"
                        >
                          Xem ảnh bill chuyển khoản
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewingPayout && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="text-base font-bold text-white">
                {reviewAction === 'APPROVED' ? 'Duyệt giải ngân' : 'Từ chối giải ngân'}
              </h3>
              <button 
                onClick={() => setReviewingPayout(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleReviewSubmit}>
              <div className="p-6 space-y-4">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/40 space-y-1 text-xs">
                  <p><span className="text-slate-500">Người nhận:</span> <span className="font-semibold text-slate-200">{reviewingPayout.bankAccountName}</span></p>
                  <p><span className="text-slate-500">Ngân hàng:</span> <span className="font-semibold text-slate-200">{reviewingPayout.bankName} - {reviewingPayout.bankAccountNumber}</span></p>
                  <p className="pt-1 border-t border-slate-800/60 mt-1">
                    <span className="text-slate-500">Số tiền chuyển:</span> <span className="font-bold text-emerald-400">{formatCurrency(reviewingPayout.amountRequested)}</span>
                  </p>
                </div>

                {reviewAction === 'APPROVED' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Link ảnh bill chuyển khoản (Bắt buộc)</label>
                    <input
                      required
                      type="url"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://example.com/payout-proof.png"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <p className="text-[10px] text-slate-500">Nhập link hình ảnh biên lai để ban tổ chức đối chiếu kiểm tra.</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    {reviewAction === 'APPROVED' ? 'Ghi chú phê duyệt (Tùy chọn)' : 'Lý do từ chối (Bắt buộc)'}
                  </label>
                  <textarea
                    required={reviewAction === 'REJECTED'}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={reviewAction === 'APPROVED' ? 'Ví dụ: Đã chuyển khoản qua Internet Banking thành công.' : 'Nhập lý do cụ thể từ chối lệnh rút tiền...'}
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {modalError && (
                  <p className="text-xs font-semibold text-rose-400">{modalError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewingPayout(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 ${
                    reviewAction === 'APPROVED' 
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10' 
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/10'
                  }`}
                >
                  {reviewAction === 'APPROVED' ? 'Duyệt Chi' : 'Từ Chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
