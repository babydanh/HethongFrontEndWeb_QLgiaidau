'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DollarSign, Gift, Info, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tournament, TournamentParticipant } from '@/types/tournament';
import { getErrorMessage } from '@/utils/error';
import { getPlatformFeeBreakdown } from '@/utils/platform-fee';
import {
  isTournamentCompleted,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentRegistrationClosed,
} from '@/utils/tournament-status';
import toast from 'react-hot-toast';

interface FinanceTabProps {
  tournament: Tournament;
  participants: TournamentParticipant[];
  entryFee: number;
  setEntryFee: (fee: number) => void;
  isSavingConfig: boolean;
  handleSaveFinanceConfig: () => void;
  handlePayPlatformFee: () => void;
  isPayingPlatformFee: boolean;
  allowEntryFees?: boolean;
  handleRequestPayout?: (data: { bankName: string; bankAccountNumber: string; bankAccountName: string; amountRequested: number }) => Promise<void>;
}

export function FinanceTab({
  tournament,
  participants,
  entryFee,
  setEntryFee,
  isSavingConfig,
  handleSaveFinanceConfig,
  handlePayPlatformFee,
  isPayingPlatformFee,
  allowEntryFees = true,
  handleRequestPayout,
}: FinanceTabProps) {
  const translate = useTranslations('OrganizerFinance');
  const locale = useLocale();
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const totalPlayers = participants.reduce((sum, p) => sum + (p.members?.length || 0), 0);
  const totalExpectedFee = entryFee * participants.length;
  const platformFee = getPlatformFeeBreakdown(entryFee, tournament.platformFeePercentage);
  const totalPlatformFee = totalPlayers * platformFee.feePerPlayer;
  const netOrganizerEarnings = Math.max(0, totalExpectedFee - totalPlatformFee);
  const isRegistrationLockedForFinance =
    isTournamentOpenForRegistration(tournament.status) ||
    isTournamentRegistrationClosed(tournament.status) ||
    isTournamentInProgress(tournament.status) ||
    isTournamentCompleted(tournament.status);
  const isEntryFeeInputDisabled = isRegistrationLockedForFinance || !allowEntryFees;

  // Payout form state
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [amountRequested, setAmountRequested] = useState(netOrganizerEarnings);
  const [isPayoutLoading, setIsPayoutLoading] = useState(false);

  const canPayout = (isTournamentCompleted(tournament.status) || isTournamentInProgress(tournament.status)) && !!handleRequestPayout;

  const handleSubmitPayout = async () => {
    if (!bankName.trim()) { toast.error(translate('bankNameRequired')); return; }
    if (!bankAccountNumber.trim()) { toast.error(translate('accountNumberRequired')); return; }
    if (!bankAccountName.trim()) { toast.error(translate('accountNameRequired')); return; }
    if (amountRequested <= 0) { toast.error(translate('withdrawalPositive')); return; }
    if (amountRequested > netOrganizerEarnings) { toast.error(translate('withdrawalExceedsBalance')); return; }

    setIsPayoutLoading(true);
    try {
      await handleRequestPayout!({
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        amountRequested,
      });
      toast.success(translate('withdrawalRequestSent'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsPayoutLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">{translate('title')}</h2>

      {!allowEntryFees && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">{translate('feeSetupLockedTitle')}</p>
          <p className="mt-1 text-xs font-medium text-amber-700">
            {translate('feeSetupLockedDescription')}
          </p>
        </div>
      )}

      {false && tournament?.status === 'REGISTRATION_CLOSED' ? (
        <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-dashed flex flex-col items-center">
          <Lock className="w-12 h-12 text-blue-500 mb-3" />
          <h4 className="font-bold text-slate-850 text-lg">{translate('platformFeeUnpaidTitle')}</h4>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mb-6">
                        {translate('platformFeeUnpaidDescription', { amount: totalPlatformFee.toLocaleString(numberLocale) })}

          </p>
          <Button
            onClick={handlePayPlatformFee}
            disabled={isPayingPlatformFee}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg"
          >
            {isPayingPlatformFee ? translate('connectingPayment') : translate('payPlatformFee')}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label={translate('entryFeeLabel')}
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
              disabled={isEntryFeeInputDisabled}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{translate('platformFeePerPlayerLabel')}</label>
              <Badge className="py-2.5 bg-slate-50 border-slate-200 text-slate-700 justify-center font-bold text-sm">
                {platformFee.feePerPlayer.toLocaleString(numberLocale)} VNĐ / {translate('playerUnit')}
              </Badge>
              <p className="text-xs text-slate-500 font-medium">
                {platformFee.percentage === 0
                  ? translate('platformFeeFreeDescription')
                  : translate('platformFeeRuleDescription', { percentage: platformFee.percentage })}
              </p>
            </div>
          </div>

          {!isEntryFeeInputDisabled && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveFinanceConfig}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isSavingConfig ? translate('saving') : translate('saveFinanceSettings')}
              </Button>
            </div>
          )}

          {/* Financial Report Summary */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 space-y-6 mt-6">
            <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-blue-600" /> {translate('summaryTitle')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{translate('expectedTotalFee')}</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">
                  {totalExpectedFee.toLocaleString(numberLocale)} VNĐ
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">{translate('registeredTeams', { count: participants.length })}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{translate('platformFee')}</p>
                <p className="text-2xl font-bold text-rose-500 mt-2">
                  {totalPlatformFee.toLocaleString(numberLocale)} VNĐ
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {platformFee.ruleLabel} ({translate('athleteCount', { count: totalPlayers })})
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm bg-slate-50/20">
                <p className="text-xs font-bold text-slate-550 uppercase tracking-wider">{translate('organizerNetEarnings')}</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {netOrganizerEarnings.toLocaleString(numberLocale)} VNĐ
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">{translate('platformFeeDeducted')}</p>
              </div>
            </div>

            {/* Payout form */}
            {canPayout ? (
              <div className="bg-white border rounded-lg p-5 space-y-4">
                <h4 className="font-bold text-slate-850 flex items-center gap-1">
                  <Gift className="w-5 h-5 text-purple-600" /> {translate('withdrawalRequestTitle')}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                                    {translate('withdrawalRequestDescription')}

                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input label={translate('bankName')} placeholder="Vietcombank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <Input label={translate('accountNumber')} placeholder="1029384756" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                  <Input label={translate('accountHolder')} placeholder="NGUYEN VAN A" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                  <Input label={translate('withdrawalAmount')} type="number" value={amountRequested} onChange={(e) => setAmountRequested(Number(e.target.value))} />
                </div>
                <Button
                  onClick={handleSubmitPayout}
                  disabled={isPayoutLoading}
                  className="font-bold w-full md:w-auto mt-2"
                >
                  {isPayoutLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {translate('sending')}</> : translate('sendWithdrawal')}
                </Button>
              </div>
            ) : (
              <div className="bg-blue-50/50 p-4 rounded-lg border flex gap-3 text-xs leading-relaxed font-semibold text-blue-900">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>{translate('withdrawalUnavailable')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
