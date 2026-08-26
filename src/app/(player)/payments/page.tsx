'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { paymentsApi } from '@/features/payments/api';
import { Payment, PaymentStatus } from '@/types/payment';
import { formatCurrency } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowUpRight, 
  DollarSign, 
  ShoppingBag,
  History
} from 'lucide-react';

type PaymentStatusLabelKey =
  | 'statusPending'
  | 'statusCompleted'
  | 'statusFailed'
  | 'statusCancelled'
  | 'statusExpired'
  | 'statusRefunded';

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { bg: string; labelKey: PaymentStatusLabelKey; icon: typeof AlertCircle }> = {
  PENDING: { bg: 'bg-amber-50 text-amber-600 border-amber-100', labelKey: 'statusPending', icon: AlertCircle },
  COMPLETED: { bg: 'bg-green-50 text-green-600 border-green-100', labelKey: 'statusCompleted', icon: CheckCircle2 },
  FAILED: { bg: 'bg-rose-50 text-rose-600 border-rose-100', labelKey: 'statusFailed', icon: XCircle },
  CANCELLED: { bg: 'bg-slate-100 text-slate-600 border-slate-200', labelKey: 'statusCancelled', icon: XCircle },
  EXPIRED: { bg: 'bg-slate-100 text-slate-600 border-slate-200', labelKey: 'statusExpired', icon: XCircle },
  REFUNDED: { bg: 'bg-slate-100 text-slate-600 border-slate-200', labelKey: 'statusRefunded', icon: XCircle },
};

export default function PaymentsPage() {
  const translate = useTranslations('Payments');
  const locale = useLocale();
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
        <p className="text-slate-500 font-medium">{translate('loadingHistory')}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" /> {translate('title')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{translate('description')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{translate('totalSpent')}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalSpent)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{translate('successfulTransactions')}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{successCount}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-slate-50 text-blue-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{translate('pendingTransactions')}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-850">{translate('invoiceDetails')}</h2>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {translate('invoiceCount', { count: payments.length })}
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">{translate('noPayments')}</p>
              <button
                onClick={() => router.push('/tournaments')}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1 mx-auto hover:underline"
              >
                {translate('exploreTournaments')} <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-4 px-6">{translate('date')}</th>
                    <th className="py-4 px-6">{translate('tournament')}</th>
                    <th className="py-4 px-6">{translate('amount')}</th>
                    <th className="py-4 px-6">{translate('method')}</th>
                    <th className="py-4 px-6">{translate('status')}</th>
                    <th className="py-4 px-6 text-right">{translate('details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {payments.map((p) => {
                    const statusConfig = PAYMENT_STATUS_CONFIG[p.status];

                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap text-xs">
                          {new Date(p.createdAt).toLocaleString(locale)}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800 max-w-[280px] truncate">
                          {p.tournament?.name || translate('deletedTournament')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-950">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-500 text-xs">
                          {p.paymentGateway || 'PAYOS'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg}`}>
                            <StatusIcon className="w-3 h-3" />
                            {translate(statusConfig.labelKey)}
                          </span>
                        </td>
                                                <td className="py-4 px-6 text-right">
                          <div className="flex flex-wrap justify-end gap-3">
                            {p.status === 'PENDING' &&
                              p.purpose === 'REGISTRATION_FEE' &&
                              p.participantId && (
                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      participantId: p.participantId as string,
                                      tournamentId: p.tournamentId,
                                    });
                                    if (p.divisionId) params.set('divisionId', p.divisionId);
                                    router.push(`/payments/checkout?${params.toString()}`);
                                  }}
                                  className="text-amber-700 hover:text-amber-900 text-xs font-bold hover:underline"
                                >
                                  {translate('continuePayment')}
                                </button>
                              )}
                            <button
                              onClick={() => router.push(`/payments/result?paymentId=${p.id}`)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline"
                            >
                              {translate('viewInvoice')}
                            </button>
                          </div>
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

