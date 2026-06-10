'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { Payment } from '@/types/payment';
import { AlertCircle, Search, Filter, ShieldCheck, RefreshCw } from 'lucide-react';

export default function AdminTransactionsList() {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchTransactions = () => {
    setLoading(true);
    paymentsApi.getAdminTransactions()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setTransactions(res.data);
          setFilteredTransactions(res.data);
        } else if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
          setTransactions((res.data as any).data);
          setFilteredTransactions((res.data as any).data);
        } else {
          setTransactions([]);
          setFilteredTransactions([]);
        }
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

  // Filter logic
  useEffect(() => {
    let result = [...transactions];

    // Search by tournament name or user email
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.tournament?.name || '').toLowerCase().includes(query) ||
        ((item as any).user?.email || '').toLowerCase().includes(query) ||
        ((item as any).user?.fullName || '').toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter(item => item.status === statusFilter);
    }

    setFilteredTransactions(result);
  }, [searchQuery, statusFilter, transactions]);

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
                      <p className="font-bold text-slate-200">{(item as any).user?.fullName || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500">{(item as any).user?.email || 'N/A'}</p>
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
    </div>
  );
}
