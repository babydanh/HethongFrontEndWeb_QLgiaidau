'use client';

import { useState } from 'react';
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
  const [bankName, setBankName] = useState(defaultBankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(defaultBankAccountNumber);
  const [bankAccountName, setBankAccountName] = useState(defaultBankAccountName);
  const [bankError, setBankError] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const executeWithdraw = async (bankData?: { bankName: string; bankAccountNumber: string; bankAccountName: string }) => {
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(tournamentId, bankData, divisionId);
      toast.success('Đã rút khỏi giải đấu thành công.');
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
        setBankError('Vui lòng điền đầy đủ 3 trường thông tin ngân hàng.');
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
          <h3 className="text-base font-bold text-slate-900">Thông tin hoàn trả lệ phí</h3>
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
                Giải đấu có thu phí. Ban tổ chức sẽ đối soát và thực hiện hoàn trả lại lệ phí giải đấu qua số tài khoản ngân hàng bạn cung cấp dưới đây.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tên ngân hàng / Ví (Ví dụ: MB Bank, Vietcombank...)</label>
                <Input
                  required
                  value={bankName}
                  onChange={(e) => { setBankName(e.target.value); setBankError(''); }}
                  placeholder="Nhập tên ngân hàng..."
                  className="font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Số tài khoản ngân hàng</label>
                <Input
                  required
                  value={bankAccountNumber}
                  onChange={(e) => { setBankAccountNumber(e.target.value); setBankError(''); }}
                  placeholder="Nhập số tài khoản..."
                  className="font-semibold text-slate-800 tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Họ và tên chủ tài khoản (Viết hoa không dấu)</label>
                <Input
                  required
                  value={bankAccountName}
                  onChange={(e) => { setBankAccountName(e.target.value); setBankError(''); }}
                  placeholder="Ví dụ: NGUYEN VAN A"
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
                className="px-4 py-2 border-slate-205 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isWithdrawing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-500/10"
              >
                {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Xác nhận rút & hoàn tiền
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 text-xs text-slate-650 leading-relaxed font-medium mb-4">
              Bạn chưa thanh toán lệ phí, nên sẽ không có hoàn tiền. Xác nhận hủy đăng ký?
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-4 py-2 border-slate-205 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={() => executeWithdraw()}
                disabled={isWithdrawing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-500/10"
              >
                {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Xác nhận rút lui
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
