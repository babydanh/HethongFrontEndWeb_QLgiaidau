'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { paymentsApi } from '@/features/payments/api';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { PayoutRequest, PayoutStatus } from '@/types/payment';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  Building2, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  PlusCircle, 
  DollarSign, 
  Trophy,
  Landmark,
  Wallet
} from 'lucide-react';

const createPayoutSchema = (translate: (key: string) => string) => z.object({
  tournamentId: z.string().min(1, translate('selectTournament')),
  amountRequested: z.number().min(10000, translate('minimumAmount')),
  bankName: z.string().min(2, translate('bankNameRequired')),
  bankAccountNumber: z.string().min(5, translate('bankAccountRequired')),
  bankAccountName: z.string().min(2, translate('accountHolderRequired')),
});

type PayoutFormValues = z.infer<ReturnType<typeof createPayoutSchema>>;

const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { bg: string; key: string; icon: typeof AlertCircle }> = {
  PENDING: { bg: 'bg-amber-50 text-amber-600 border-amber-100', key: 'pending', icon: AlertCircle },
  REQUESTED: { bg: 'bg-amber-50 text-amber-600 border-amber-100', key: 'requested', icon: AlertCircle },
  UNDER_REVIEW: { bg: 'bg-blue-50 text-blue-600 border-blue-100', key: 'underReview', icon: AlertCircle },
  APPROVED: { bg: 'bg-blue-50 text-blue-600 border-blue-100', key: 'approved', icon: CheckCircle2 },
  PROCESSING: { bg: 'bg-blue-50 text-blue-600 border-blue-100', key: 'processing', icon: AlertCircle },
  PAID: { bg: 'bg-green-50 text-green-600 border-green-100', key: 'completed', icon: CheckCircle2 },
  REJECTED: { bg: 'bg-rose-50 text-rose-600 border-rose-100', key: 'rejected', icon: XCircle },
  FAILED: { bg: 'bg-rose-50 text-rose-600 border-rose-100', key: 'failed', icon: XCircle },
  CANCELLED: { bg: 'bg-slate-50 text-slate-600 border-slate-100', key: 'cancelled', icon: XCircle },
};

export default function OrganizerPayoutsPage() {
  const translate = useTranslations('OrganizerPayouts');
  const payoutSchema = createPayoutSchema(translate);
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOpenForm, setIsOpenForm] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      tournamentId: '',
      amountRequested: 0,
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
    }
  });

  const selectedTournamentId = watch('tournamentId');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/organizer/payouts');
      return;
    }

    // Check if user is organizer or admin
    const isOrg = user?.roles.includes('ORGANIZER') || user?.roles.includes('ADMIN');
    if (!isOrg) {
      toast.error(translate('accessDenied'));
      router.push('/dashboard');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        // Load payouts
        const pRes = await paymentsApi.getMyPayouts();
        const pData = pRes?.data || pRes;
        if (Array.isArray(pData)) {
          setPayouts(pData);
        }

        // Load organizer's tournaments
        const tRes = await tournamentsApi.getMyTournaments();
        const tData = tRes?.data || tRes;
        if (Array.isArray(tData)) {
          setTournaments(tData);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, user, router]);

  const onSubmit = async (data: PayoutFormValues) => {
    try {
      setSubmitting(true);
      
      const cleanData = {
        tournamentId: data.tournamentId,
        amountRequested: data.amountRequested,
        bankName: trimAndNormalizeSpaces(data.bankName),
        bankAccountNumber: trimAndNormalizeSpaces(data.bankAccountNumber),
        bankAccountName: trimAndNormalizeSpaces(data.bankAccountName).toUpperCase(),
      };

      const res = await paymentsApi.requestPayout(cleanData);
      const newPayout = res?.data || res;
      
      toast.success(translate('submitSuccess'));
      
      // Update local state
      setPayouts(prev => [newPayout, ...prev]);
      
      // Reset form and close
      reset();
      setIsOpenForm(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-6 h-6 text-blue-600" /> {translate('pageTitle')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{translate('pageDescription')}</p>
          </div>
          
          {!isOpenForm && tournaments.length > 0 && (
            <Button
              onClick={() => setIsOpenForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-lg font-bold py-2.5 shadow-md shadow-blue-500/20"
            >
              <PlusCircle className="w-4 h-4" /> {translate('requestWithdrawal')}
            </Button>
          )}
        </div>

        {/* Payout Request Form Modal/Card */}
        {isOpenForm && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 shadow-sm mb-8 animate-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" /> {translate("newWithdrawalTitle")}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">{translate("tournamentLabel")} <span className="text-rose-500">*</span></label>
                <select
                  {...register('tournamentId')}
                  className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- {translate('selectTournament')} --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.tournamentId && <p className="text-xs font-semibold text-rose-500">{errors.tournamentId.message}</p>}
              </div>

              {selectedTournamentId && (
                <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                  {translate('balanceHint')}
                </div>
              )}

              <Input
                label={translate("amountInputLabel")}
                type="number"
                placeholder={translate("amountPlaceholder")}
                {...register('amountRequested', { valueAsNumber: true })}
                error={errors.amountRequested?.message}
              />

              <Input
                label={translate("bankNameLabel")}
                placeholder={translate("bankNamePlaceholder")}
                {...register('bankName')}
                error={errors.bankName?.message}
              />

              <Input
                label={translate("bankAccountNumberLabel")}
                placeholder={translate("bankAccountPlaceholder")}
                {...register('bankAccountNumber')}
                error={errors.bankAccountNumber?.message}
              />

              <Input
                label={translate("accountHolderLabel")}
                placeholder={translate("accountHolderPlaceholder")}
                {...register('bankAccountName')}
                error={errors.bankAccountName?.message}
              />

              <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-100 pt-5 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    setIsOpenForm(false);
                  }}
                  disabled={submitting}
                  className="border-slate-200 text-slate-600 rounded-lg"
                >
                  {translate('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold px-6 py-2 shadow-md shadow-blue-500/10"
                >
                  {submitting ? translate('submitting') : translate('submit')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-800">{translate("historyTitle")}</h2>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {translate('requestCount', { count: payouts.length })}
            </span>
          </div>

          {payouts.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">{translate('empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-4 px-6">{translate("dateSubmitted")}</th>
                    <th className="py-4 px-6">{translate("tournamentLabel")}</th>
                    <th className="py-4 px-6">{translate("withdrawalAmount")}</th>
                    <th className="py-4 px-6">{translate("bankAccount")}</th>
                    <th className="py-4 px-6">{translate("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {payouts.map((p) => {
                    const statusConfig = PAYOUT_STATUS_CONFIG[p.status];

                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap text-xs">
                          {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800 max-w-[200px] truncate">
                          {p.tournament?.name || translate('unknownTournament')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {formatCurrency(Number(p.amountRequested))}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 leading-normal">
                          <p className="font-bold text-slate-700">{p.bankName}</p>
                          <p>{p.bankAccountNumber} - {p.bankAccountName}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg}`}>
                            <StatusIcon className="w-3 h-3" />
                            {translate(statusConfig.key)}
                          </span>
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

