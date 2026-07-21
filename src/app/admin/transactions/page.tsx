'use client';

import { useEffect, useState, useMemo } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { AdminPayment } from '@/types/payment';
import { AlertCircle, Search, Filter, ShieldCheck, RefreshCw, X, FileText, Calendar } from 'lucide-react';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

export default function AdminTransactionsList() {
  const [transactions, setTransactions] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Invoice detail modal
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);

  // Refund states
  const [selectedRefundPayment, setSelectedRefundPayment] = useState<AdminPayment | null>(null);
  const [vietQrUrl, setVietQrUrl] = useState('');
  const [refundProofUrl, setRefundProofUrl] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const handleOpenRefundModal = (payment: AdminPayment) => {
    const bankId = encodeURIComponent(payment.refundBankName || '');
    const accountNo = encodeURIComponent(payment.refundAccountNumber || '');
    const accountName = encodeURIComponent(payment.refundAccountName || '');
    const amount = parseFloat(payment.amount);
    const addInfo = encodeURIComponent(`HOAN TIEN GD ${payment.id?.slice(0, 8) ?? 'N/A'}`);
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
    setVietQrUrl(qrUrl);
    setSelectedRefundPayment(payment);
    setRefundProofUrl('');
  };

  const handleConfirmRefund = async () => {
    if (!selectedRefundPayment) return;
    if (!refundProofUrl.trim()) {
      toast.error('Vui lòng nhập link bằng chứng hoàn tiền.');
      return;
    }
    try {
      setSubmittingRefund(true);
      await paymentsApi.confirmRefund(selectedRefundPayment.id, {
        transactionProofUrl: refundProofUrl.trim(),
      });
      toast.success('Xác nhận hoàn tiền thành công!');
      setSelectedRefundPayment(null);
      setRefundProofUrl('');
      fetchTransactions();
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Lỗi khi cập nhật trạng thái hoàn tiền.'));
    } finally {
      setSubmittingRefund(false);
    }
  };

  const fetchTransactions = () => {
    setLoading(true);
    paymentsApi.getAdminTransactions()
      .then((res) => {
        const nextTransactions = Array.isArray(res.data) ? res.data : [];
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
    fetchTransactions();
  }, []);

  // Parse dd/MM/yyyy → Date
  const parseDate = (str: string): Date | null => {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(y, m, d);
  };

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search
    if (searchQuery.trim()) {
       const query = searchQuery.toLowerCase();
       result = result.filter(item =>
         (item.tournament?.name || '').toLowerCase().includes(query) ||
         (item.user?.email || '').toLowerCase().includes(query) ||
         (item.user?.fullName || '').toLowerCase().includes(query) ||
         item.id.toLowerCase().includes(query)
       );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING_REFUND') {
        result = result.filter(item => item.refundStatus === 'PENDING_REFUND');
      } else if (statusFilter === 'REFUNDED') {
        result = result.filter(item => item.refundStatus === 'REFUNDED');
      } else {
        result = result.filter(item => item.status === statusFilter && item.refundStatus !== 'PENDING_REFUND' && item.refundStatus !== 'REFUNDED');
      }
    }

    // Date filter
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (fromDate || toDate) {
      result = result.filter(item => {
        const itemDate = new Date(item.createdAt);
        if (fromDate && itemDate < fromDate) return false;
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (itemDate > endOfDay) return false;
        }
        return true;
      });
    }

    return result;
  }, [transactions, searchQuery, statusFilter, dateFrom, dateTo]);

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-900">Lịch Sử Giao Dịch</h2>
          <p className="text-xs text-gray-500">Xem và đối soát toàn bộ lịch sử thanh toán lệ phí giải đấu trên hệ thống</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold border border-gray-200 rounded-lg transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo giải đấu, email, tên hoặc mã GD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Date from */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Từ ngày (dd/mm/yyyy)"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400"
          />
        </div>

        {/* Date to */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Đến ngày (dd/mm/yyyy)"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán (PENDING)</option>
            <option value="COMPLETED">Thành công (COMPLETED)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            <option value="EXPIRED">Hết hạn (EXPIRED)</option>
            <option value="PENDING_REFUND">Chờ hoàn tiền</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-4 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-full"></div>
          <div className="h-12 bg-gray-100 rounded w-full"></div>
          <div className="h-12 bg-gray-100 rounded w-full"></div>
          <div className="h-12 bg-gray-100 rounded w-full"></div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400 space-y-3">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="font-bold text-gray-600">Không tìm thấy giao dịch nào</p>
          <p className="text-xs text-gray-400">Thử đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-gray-600">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredTransactions.map((item, index) => (
                  <tr
                    key={item.id ?? `${item.createdAt}-${item.user?.email ?? 'unknown'}-${index}`}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedPayment(item)}
                  >
                    {/* ID / Time */}
                    <td className="px-6 py-4 space-y-1">
                      <p className="font-semibold text-gray-800 font-mono text-[10px]">{item.id?.slice(0, 8) ?? 'N/A'}...</p>
                      <p className="text-[10px] text-gray-400">{formatDateTime(item.createdAt)}</p>
                    </td>

                    {/* Paid by */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{item.user?.fullName || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400">{item.user?.email || 'N/A'}</p>
                    </td>

                    {/* Tournament */}
                    <td className="px-6 py-4 font-semibold text-gray-600 max-w-[180px] truncate">
                      {item.tournament?.name || 'N/A'}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>

                    {/* Platform Fee */}
                    <td className="px-6 py-4 text-red-500 font-semibold">
                      {item.platformFeeAmount ? formatCurrency(item.platformFeeAmount) : '—'}
                    </td>

                    {/* Gateway */}
                    <td className="px-6 py-4 font-semibold text-gray-500 uppercase">
                      {item.paymentGateway || 'PAYOS'}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {item.refundStatus === 'PENDING_REFUND' ? (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border bg-amber-50 text-amber-600 border-amber-200">
                          Chờ hoàn tiền
                        </span>
                      ) : item.refundStatus === 'REFUNDED' ? (
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border bg-gray-50 text-gray-500 border-gray-200">
                          Đã hoàn tiền
                        </span>
                      ) : (
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : item.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : item.status === 'FAILED'
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                          {item.status === 'COMPLETED'
                            ? 'Thành công'
                            : item.status === 'PENDING'
                              ? 'Chờ nộp'
                              : item.status === 'FAILED'
                                ? 'Thất bại'
                                : item.status === 'CANCELLED'
                                  ? 'Đã hủy'
                                  : item.status === 'EXPIRED'
                                    ? 'Hết hạn'
                                    : 'Đã hoàn'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPayment(item); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Xem chi tiết"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {item.refundStatus === 'PENDING_REFUND' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenRefundModal(item); }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white font-bold text-[10px] rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Xử lý hoàn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-[10px] font-bold text-gray-500 flex justify-between items-center">
            <span>Hiển thị {filteredTransactions.length} trên tổng số {transactions.length} giao dịch</span>
            <span className="text-gray-500 text-xs">
              Thành công:{' '}
              <span className="text-emerald-600 font-bold text-sm">
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

      {/* ─── Invoice Detail Modal ─── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedPayment(null)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-800">Chi tiết hoá đơn</h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* ID + Status */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mã giao dịch</p>
                  <p className="font-mono font-bold text-sm text-gray-800 mt-0.5">{selectedPayment.id}</p>
                </div>
                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  selectedPayment.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : selectedPayment.status === 'PENDING'
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {selectedPayment.status === 'COMPLETED' ? 'Thành công' : selectedPayment.status === 'PENDING' ? 'Chờ thanh toán' : selectedPayment.status}
                </span>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Info rows */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ngày tạo</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{formatDateTime(selectedPayment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ngày thanh toán</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{selectedPayment.paidAt ? formatDateTime(selectedPayment.paidAt) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Người nộp</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{selectedPayment.user?.fullName || 'N/A'}</p>
                  <p className="text-[11px] text-gray-400">{selectedPayment.user?.email || ''}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Giải đấu</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{selectedPayment.tournament?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cổng thanh toán</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5 uppercase">{selectedPayment.paymentGateway || 'PAYOS'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mã tham chiếu</p>
                  <p className="text-sm font-mono font-semibold text-gray-700 mt-0.5">{selectedPayment.transactionReference || '—'}</p>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Amount breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Lệ phí nộp</span>
                  <span className="text-sm font-bold text-gray-800">{formatCurrency(selectedPayment.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Phí sàn (5%)</span>
                  <span className="text-sm font-bold text-red-500">
                    {selectedPayment.platformFeeAmount ? `-${formatCurrency(selectedPayment.platformFeeAmount)}` : '—'}
                  </span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Người nhận (BTC)</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {selectedPayment.platformFeeAmount
                      ? formatCurrency(parseFloat(selectedPayment.amount) - parseFloat(selectedPayment.platformFeeAmount))
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Refund info (if applicable) */}
              {selectedPayment.refundStatus && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div className="bg-amber-50 rounded-lg p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Thông tin hoàn tiền</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600">Trạng thái</span>
                      <span className="font-bold text-amber-700">{selectedPayment.refundStatus === 'REFUNDED' ? 'Đã hoàn' : 'Chờ hoàn'}</span>
                    </div>
                    {selectedPayment.refundBankName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-600">Ngân hàng</span>
                        <span className="font-bold text-amber-700">{selectedPayment.refundBankName}</span>
                      </div>
                    )}
                    {selectedPayment.refundedAmount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-600">Số tiền hoàn</span>
                        <span className="font-bold text-amber-700">{formatCurrency(selectedPayment.refundedAmount)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-all"
              >
                Đóng
              </button>
              {selectedPayment.refundStatus === 'PENDING_REFUND' && (
                <button
                  onClick={() => { const p = selectedPayment; setSelectedPayment(null); handleOpenRefundModal(p); }}
                  className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-400 transition-all"
                >
                  Xử lý hoàn tiền
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Refund processing Modal */}
      {selectedRefundPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xl animate-in scale-in duration-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Xử lý hoàn tiền thủ công</h3>
              <button onClick={() => setSelectedRefundPayment(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-lg text-xs leading-relaxed font-semibold">
                Quét mã VietQR bằng ứng dụng Ngân hàng để chuyển khoản hoàn trả lệ phí cho VĐV. Sau khi chuyển khoản thành công, hãy bấm xác nhận để cập nhật hệ thống.
              </div>

              <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg w-48 h-48 mx-auto border border-gray-200 shadow-sm">
                <img src={vietQrUrl} alt="VietQR hoàn tiền" className="w-full h-full object-contain" />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Người nhận:</span>
                  <span className="font-bold text-gray-800 uppercase">{selectedRefundPayment.refundAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số tài khoản:</span>
                  <span className="font-mono font-bold text-gray-800 tracking-wider bg-white px-2 py-0.5 rounded border border-gray-200">
                    {selectedRefundPayment.refundAccountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngân hàng:</span>
                  <span className="font-bold text-gray-800">{selectedRefundPayment.refundBankName}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500 font-bold">Số tiền hoàn:</span>
                  <span className="font-bold text-red-500 text-sm">{formatCurrency(selectedRefundPayment.amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600">Link bằng chứng hoàn tiền</label>
                <input
                  type="url"
                  value={refundProofUrl}
                  onChange={(event) => setRefundProofUrl(event.target.value)}
                  placeholder="https://example.com/refund-proof.png"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400">Bắt buộc nhập link hình ảnh chuyển khoản để lưu vết xử lý.</p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setSelectedRefundPayment(null)} className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-all">
                Hủy bỏ
              </button>
              <button disabled={submittingRefund} onClick={handleConfirmRefund} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95">
                {submittingRefund ? 'Đang cập nhật...' : 'Đã chuyển khoản thành công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
