'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { Payment } from '@/types/payment';
import { AlertCircle, Search, Filter, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';

interface PaymentWithUser extends Payment {
  user?: {
    email?: string;
    fullName?: string;
  };
  refundBankName?: string;
  refundAccountNumber?: string;
  refundAccountName?: string;
}

export default function AdminTransactionsList() {
  const [transactions, setTransactions] = useState<PaymentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Refund states
  const [selectedRefundPayment, setSelectedRefundPayment] = useState<PaymentWithUser | null>(null);
  const [vietQrUrl, setVietQrUrl] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const handleOpenRefundModal = (payment: PaymentWithUser) => {
    // Generate VietQR URL: compact style, dynamically calculated
    const bankId = encodeURIComponent(payment.refundBankName || '');
    const accountNo = encodeURIComponent(payment.refundAccountNumber || '');
    const accountName = encodeURIComponent(payment.refundAccountName || '');
    const amount = parseFloat(payment.amount);
    const addInfo = encodeURIComponent(`HOAN TIEN GD ${payment.id.slice(0, 8)}`);
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;

    setVietQrUrl(qrUrl);
    setSelectedRefundPayment(payment);
  };

  const handleConfirmRefund = async () => {
    if (!selectedRefundPayment) return;
    try {
      setSubmittingRefund(true);
      await api.post(`/payments/admin/payments/${selectedRefundPayment.id}/confirm-refund`);
      toast.success('Xác nhận hoàn tiền thành công!');
      setSelectedRefundPayment(null);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật trạng thái hoàn tiền.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const fetchTransactions = () => {
    setLoading(true);
    paymentsApi.getAdminTransactions()
      .then((res) => {
        const nextTransactions = Array.isArray(res.data) ? (res.data as PaymentWithUser[]) : [];
        setTransactions(nextTransactions);
      })
      .catch((err) => {
        console.error('Failed to fetch transactions:', err);
        setError('Không thể tải lịch sử giao dịch toàn sàn');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTransactions();
    });
  }, []);

  const filteredTransactions = (() => {
    let result = [...transactions];

    if (searchQuery.trim()) {
       const query = searchQuery.toLowerCase();
       result = result.filter(item =>
         (item.tournament?.name || '').toLowerCase().includes(query) ||
         (item.user?.email || '').toLowerCase().includes(query) ||
         (item.user?.fullName || '').toLowerCase().includes(query) ||
         item.id.toLowerCase().includes(query)
       );
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING_REFUND') {
        result = result.filter(item => item.refundStatus === 'PENDING_REFUND');
      } else if (statusFilter === 'REFUNDED') {
        result = result.filter(item => item.refundStatus === 'REFUNDED');
      } else {
        result = result.filter(item => item.status === statusFilter && item.refundStatus !== 'PENDING_REFUND' && item.refundStatus !== 'REFUNDED');
      }
    }

    return result;
  })();

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white">Lịch Sử Giao Dịch</h2>
          <p className="text-xs text-slate-400">Xem và đối soát toàn bộ lịch sử thanh toán lệ phí giải đấu trên hệ thống</p>
        </div>
        <button 
          onClick={fetchTransactions}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo giải đấu, email, tên hoặc mã GD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán (PENDING)</option>
            <option value="COMPLETED">Thành công (COMPLETED)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
            <option value="PENDING_REFUND">Chờ hoàn tiền (PENDING_REFUND)</option>
            <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-full"></div>
          <div className="h-12 bg-slate-800 rounded w-full"></div>
          <div className="h-12 bg-slate-800 rounded w-full"></div>
          <div className="h-12 bg-slate-800 rounded w-full"></div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="font-bold">Không tìm thấy giao dịch nào</p>
          <p className="text-xs text-slate-500">Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái khác.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-300">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Mã GD / Thời gian</th>
                  <th className="px-6 py-4">Nộp bởi</th>
                  <th className="px-6 py-4">Giải đấu</th>
                  <th className="px-6 py-4">Lệ phí nộp</th>
                  <th className="px-6 py-4">Phí sàn (5%)</th>
                  <th className="px-6 py-4">Cổng GD</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {filteredTransactions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    {/* ID / Time */}
                    <td className="px-6 py-4 space-y-1">
                      <p className="font-semibold text-white font-mono text-[10px]">{item.id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                    </td>

                    {/* Paid by */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-200">{item.user?.fullName || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500">{item.user?.email || 'N/A'}</p>
                    </td>

                    {/* Tournament */}
                    <td className="px-6 py-4 font-semibold text-slate-300 max-w-[180px] truncate">
                      {item.tournament?.name || 'N/A'}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-white">
                      {formatCurrency(item.amount)}
                    </td>

                    {/* Platform Fee */}
                    <td className="px-6 py-4 text-rose-400 font-semibold">
                      {item.platformFeeAmount ? formatCurrency(item.platformFeeAmount) : '—'}
                    </td>

                    {/* Gateway */}
                    <td className="px-6 py-4 font-semibold text-slate-400 uppercase">
                      {item.paymentGateway || 'VNPAY'}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {item.refundStatus === 'PENDING_REFUND' ? (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          Chờ hoàn tiền
                        </span>
                      ) : item.refundStatus === 'REFUNDED' ? (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border bg-slate-500/15 text-slate-400 border-slate-500/20">
                          Đã hoàn tiền
                        </span>
                      ) : (
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          item.status === 'COMPLETED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : item.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : item.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                        }`}>
                          {item.status === 'COMPLETED' ? 'Thành công' : item.status === 'PENDING' ? 'Chờ nộp' : item.status === 'FAILED' ? 'Thất bại' : 'Đã hoàn'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {item.refundStatus === 'PENDING_REFUND' ? (
                        <button
                          onClick={() => handleOpenRefundModal(item)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded-lg transition-all active:scale-95 cursor-pointer"
                        >
                          Xử lý hoàn
                        </button>
                      ) : item.refundStatus === 'REFUNDED' ? (
                        <span className="text-[10px] text-slate-500 font-bold">Hoàn tất</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Summary */}
          <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 text-[10px] font-bold text-slate-500 flex justify-between items-center">
            <span>Hiển thị {filteredTransactions.length} trên tổng số {transactions.length} giao dịch</span>
            <span className="text-slate-400 text-xs">
              Thành công:{' '}
              <span className="text-emerald-400 font-extrabold text-sm">
                {formatCurrency(
                  filteredTransactions
                    .filter(t => t.status === 'COMPLETED')
                    .reduce((sum, current) => sum + parseFloat(current.amount), 0)
                )}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Admin Refund processing Modal */}
      {selectedRefundPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in scale-in duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Xử lý hoàn tiền thủ công</h3>
              <button 
                onClick={() => setSelectedRefundPayment(null)}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-850 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-amber-950/20 border border-amber-900/40 text-amber-300 p-4 rounded-xl text-xs leading-relaxed font-semibold">
                Quét mã VietQR bằng ứng dụng Ngân hàng để chuyển khoản hoàn trả lệ phí cho VĐV. Sau khi chuyển khoản thành công, hãy bấm xác nhận để cập nhật hệ thống.
              </div>

              {/* VietQR display */}
              <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl w-48 h-48 mx-auto border border-slate-800 shadow-lg">
                <img
                  src={vietQrUrl}
                  alt="VietQR hoàn tiền"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Refund Info */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Người nhận:</span>
                  <span className="font-bold text-white uppercase">{selectedRefundPayment.refundAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <span className="font-mono font-bold text-white tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {selectedRefundPayment.refundAccountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="font-bold text-white">{selectedRefundPayment.refundBankName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 mt-2">
                  <span className="text-slate-400 font-bold">Số tiền hoàn:</span>
                  <span className="font-extrabold text-rose-400 text-sm">{formatCurrency(selectedRefundPayment.amount)}</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRefundPayment(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 text-xs font-bold rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingRefund}
                onClick={handleConfirmRefund}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-95"
              >
                {submittingRefund ? 'Đang cập nhật...' : 'Đã chuyển khoản thành công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
