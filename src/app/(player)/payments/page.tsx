'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/features/payments/api';
import { Payment } from '@/types/payment';
import { formatCurrency } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowUpRight, 
  DollarSign, 
  ShoppingBag,
  History
} from 'lucide-react';

export default function PaymentsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/payments');
      return;
    }

    const loadPayments = async () => {
      try {
        setLoading(true);
        const res = await paymentsApi.getMyPayments();
        
        // API response wrapper
        const data = res?.data || res;
        if (Array.isArray(data)) {
          setPayments(data);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [isAuthenticated, router]);

  // Statistics
  const completedPayments = payments.filter(p => p.status === 'COMPLETED');
  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  
  const totalSpent = completedPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const successCount = completedPayments.length;
  const pendingCount = pendingPayments.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">Đang tải lịch sử giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" /> Lịch sử thanh toán
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý hóa đơn lệ phí giải đấu của bạn</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng tiền đã chi</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totalSpent)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Giao dịch thành công</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{successCount}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Giao dịch chờ xử lý</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-850">Chi tiết các hóa đơn</h2>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {payments.length} Hóa đơn
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">Bạn chưa thực hiện giao dịch thanh toán nào</p>
              <button
                onClick={() => router.push('/tournaments')}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1 mx-auto hover:underline"
              >
                Khám phá các giải đấu <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-150">
                    <th className="py-4 px-6">Thời gian</th>
                    <th className="py-4 px-6">Giải đấu</th>
                    <th className="py-4 px-6">Số tiền</th>
                    <th className="py-4 px-6">Phương thức</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {payments.map((p) => {
                    const statusConfig = {
                      PENDING: { bg: 'bg-amber-50 text-amber-600 border-amber-100', text: 'Chờ thanh toán', icon: AlertCircle },
                      COMPLETED: { bg: 'bg-green-50 text-green-600 border-green-100', text: 'Thành công', icon: CheckCircle2 },
                      FAILED: { bg: 'bg-red-50 text-red-600 border-red-100', text: 'Thất bại', icon: XCircle },
                      REFUNDED: { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Đã hoàn tiền', icon: XCircle }
                    }[p.status] || { bg: 'bg-slate-50 text-slate-500 border-slate-100', text: p.status, icon: AlertCircle };

                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap text-xs">
                          {new Date(p.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800 max-w-[280px] truncate">
                          {p.tournament?.name || 'Giải đấu đã bị xóa'}
                        </td>
                        <td className="py-4 px-6 font-black text-slate-950">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-500 text-xs">
                          {p.paymentGateway || 'VNPAY'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.text}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => router.push(`/payments/result?paymentId=${p.id}`)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline"
                          >
                            Xem hóa đơn
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
