'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { Loader2, Trash2, X } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  divisionId?: string;
  isPaid: boolean;
  defaultBankName?: string;
  defaultBankAccountNumber?: string;
  defaultBankAccountName?: string;
  onWithdrawSuccess?: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  tournamentId,
  divisionId,
  isPaid,
  defaultBankName = '',
  defaultBankAccountNumber = '',
  defaultBankAccountName = '',
  onWithdrawSuccess,
}: WithdrawModalProps) {
  const registrationTranslate = useTranslations('TournamentRegistration');
  const [bankName, setBankName] = useState(defaultBankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(defaultBankAccountNumber);
  const [bankAccountName, setBankAccountName] = useState(defaultBankAccountName);
  const [bankError, setBankError] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const executeWithdraw = async (bankData?: { bankName: string; bankAccountNumber: string; bankAccountName: string }) => {
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(tournamentId, bankData, divisionId);
      toast.success(registrationTranslate('withdrawalSuccess'));
      onClose();
      onWithdrawSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmWithdraw = (e: React.FormEvent) => {
    e.preventDefault();

    if (isPaid) {
      if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
        setBankError(registrationTranslate('bankFieldsRequired'));
        return;
      }
      executeWithdraw({
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim().toUpperCase(),
      });
    } else {
      executeWithdraw();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-900">{registrationTranslate('refundModalTitle')}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPaid ? (
          <form onSubmit={handleConfirmWithdraw}>
            <div className="p-6 space-y-4.5">
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-slate-650 leading-relaxed font-medium">
                {registrationTranslate('paidRefundDescription')}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{registrationTranslate('bankNameLabel')}</label>
                <Input
                  required
                  value={bankName}
                  onChange={(e) => { setBankName(e.target.value); setBankError(''); }}
                  placeholder={registrationTranslate('bankNamePlaceholder')}
                  className="font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{registrationTranslate('bankAccountNumberLabel')}</label>
                <Input
                  required
                  value={bankAccountNumber}
                  onChange={(e) => { setBankAccountNumber(e.target.value); setBankError(''); }}
                  placeholder={registrationTranslate('bankAccountNumberPlaceholder')}
                  className="font-semibold text-slate-800 tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{registrationTranslate('bankAccountHolderLabel')}</label>
                <Input
                  required
                  value={bankAccountName}
                  onChange={(e) => { setBankAccountName(e.target.value); setBankError(''); }}
                  placeholder={registrationTranslate('bankAccountHolderPlaceholder')}
                  className="font-semibold text-slate-800 uppercase"
                />
              </div>

              {bankError && (
                <p className="text-xs font-semibold text-rose-600 animate-pulse">{bankError}</p>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-4 py-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                {registrationTranslate('cancelAction')}
              </Button>
              <Button
                type="submit"
                disabled={isWithdrawing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-500/10"
              >
                {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {registrationTranslate('confirmWithdrawRefund')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 text-xs text-slate-650 leading-relaxed font-medium mb-4">
              {registrationTranslate('unpaidWithdrawDescription')}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-4 py-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                {registrationTranslate('cancelAction')}
              </Button>
              <Button
                onClick={() => executeWithdraw()}
                disabled={isWithdrawing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-500/10"
              >
                {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {registrationTranslate('confirmWithdraw')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

