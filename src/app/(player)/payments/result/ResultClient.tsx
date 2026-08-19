'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentsApi } from '@/features/payments/api';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';
import type { Payment, PaymentPurpose, PaymentStatus } from '@/types/payment';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Calendar, TrophyIcon, RefreshCw } from 'lucide-react';

interface PaymentDetails {
  id: string;
  tournamentId: string;
  participantId?: string | null;
  amount: string;
  purpose?: PaymentPurpose;
  status: PaymentStatus;
  paymentGateway?: string;
  paidAt?: string;
  createdAt: string;
  tournamentName?: string;
}

export default function ResultClient() {
  const translate = useTranslations('PaymentResult');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract either direct paymentId OR VNPAY return params
  const rawTxnRef = searchParams.get('vnp_TxnRef');
  const queryPaymentId = searchParams.get('paymentId');
  const divisionId = searchParams.get('divisionId');
  const inviteCode = searchParams.get('invite');
  const inviteParticipantId = searchParams.get('pid');
  const teamInviteToken = searchParams.get('token');
  
  const paymentId = queryPaymentId || rawTxnRef;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'ERROR'>('PENDING');
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const buildTournamentDetailHref = (tournamentId: string) => {
    const params = new URLSearchParams();
    if (inviteCode) {
      params.set('invite', inviteCode);
    }
    if (divisionId) {
      params.set('divisionId', divisionId);
    }
    if (inviteParticipantId && teamInviteToken) {
      params.set('pid', inviteParticipantId);
      params.set('token', teamInviteToken);
    }
    return `/tournaments/${tournamentId}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const fetchAndSetStatus = useCallback(async (id: string) => {
    const res = await paymentsApi.getPaymentById(id);
    const paymentData: Payment | undefined = res?.data;

    if (paymentData) {
      let tName = translate('defaultTournamentName');
      if (paymentData.tournament?.name) {
        tName = paymentData.tournament.name;
      }

      setDetails({
        id: paymentData.id,
        tournamentId: paymentData.tournamentId,
        participantId: paymentData.participantId,
        purpose: paymentData.purpose,
        amount: paymentData.amount,
        status: paymentData.status,
        paymentGateway: paymentData.paymentGateway,
        paidAt: paymentData.paidAt,
        createdAt: paymentData.createdAt,
        tournamentName: tName,
      });

      if (paymentData.status === 'COMPLETED') {
        setStatus('SUCCESS');
        toast.success(translate('successToast'));
        return true; // done
      } else if (['FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(paymentData.status)) {
        setStatus('FAILED');
        toast.error(translate('failedToast'));
        return true; // done
      } else {
        const createdAtMs = new Date(paymentData.createdAt).getTime();
        if (Number.isFinite(createdAtMs) && Date.now() - createdAtMs > 15 * 60 * 1000) {
          setStatus('FAILED');
          toast.error(translate('expiredToast'));
          return true;
        }
        setStatus('PENDING');
        return false; // still pending
      }
    } else {
      setStatus('ERROR');
      return true; // error, stop polling
    }
  }, [translate]);

  useEffect(() => {
    if (!paymentId) {
      toast.error(translate('missingTransaction'));
      Promise.resolve().then(() => {
        setStatus('ERROR');
        setLoading(false);
      });
      return;
    }

    let cancelled = false;

    const verifyAndLoad = async () => {
      try {
        setLoading(true);
        const done = await fetchAndSetStatus(paymentId);
        if (done || cancelled) {
          setLoading(false);
          return;
        }

        // Auto-refresh every 5 seconds for pending payments
        pollingRef.current = setInterval(async () => {
          if (cancelled) return;
          try {
            const finished = await fetchAndSetStatus(paymentId);
            if (finished && !cancelled) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              pollingRef.current = null;
              setLoading(false);
            }
          } catch {
            // Silently retry on next interval
          }
        }, 5000);
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error));
          setStatus('ERROR');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    verifyAndLoad();

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [paymentId, fetchAndSetStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">{translate('loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 md:px-8">
      <div className="max-w-md mx-auto">
        
        {/* Status card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 p-8 text-center">
          
          {status === 'SUCCESS' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{translate('successTitle')}</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {details?.participantId
                  ? translate('participantSuccess')
                  : translate('publishFeeSuccess')}
              </p>
            </div>
          )}

          {status === 'FAILED' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{translate('failedTitle')}</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {translate('failedDescription')}
              </p>
            </div>
          )}

          {status === 'PENDING' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{translate('pendingTitle')}</h1>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                {translate('pendingDescription')}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{translate('autoChecking')}</span>
              </div>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{translate('errorTitle')}</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {translate('errorDescription')}
              </p>
            </div>
          )}

          {/* Details table */}
          {details && (
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-100 text-left text-sm mb-8">
              <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <TrophyIcon className="w-4 h-4 text-blue-600" /> {details.tournamentName}
              </h3>
              
              <div className="flex flex-col gap-2.5 text-slate-600">
                <div className="flex justify-between">
                  <span>{translate('transactionId')}</span>
                  <span className="font-semibold text-slate-800 text-xs truncate max-w-[150px]">{details.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {details.purpose === 'PLATFORM_FEE'
                      ? translate('platformFee')
                      : details.purpose === 'TOURNAMENT_PUBLISH_FEE'
                        ? translate('publicationFee')
                        : translate('registrationFee')}
                  </span>
                  <span className="font-bold text-slate-900">{formatCurrency(Number(details.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate('paymentGateway')}</span>
                  <span className="font-semibold text-slate-800">{details.paymentGateway || 'PAYOS'}</span>
                </div>
                {details.paidAt && (
                  <div className="flex justify-between">
                    <span>{translate('paidAt')}</span>
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(details.paidAt).toLocaleString(locale)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {details?.tournamentId && (
              <Button
                onClick={() => router.push(details.participantId ? buildTournamentDetailHref(details.tournamentId) : `/organizer/tournaments/${details.tournamentId}/manage`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-bold"
              >
                {details.participantId ? translate('backToTournament') : translate('backToManage')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/tournaments')}
              className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg py-2.5"
            >
              {translate('viewOtherTournaments')}
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}

