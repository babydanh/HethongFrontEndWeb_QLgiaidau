'use client';

import React, { useState } from 'react';
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
  handleRequestPayout,
}: FinanceTabProps) {
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

  // Payout form state
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [amountRequested, setAmountRequested] = useState(netOrganizerEarnings);
  const [isPayoutLoading, setIsPayoutLoading] = useState(false);

  const canPayout = (isTournamentCompleted(tournament.status) || isTournamentInProgress(tournament.status)) && !!handleRequestPayout;

  const handleSubmitPayout = async () => {
    if (!bankName.trim()) { toast.error('Vui lòng nhập tên ngân hàng'); return; }
    if (!bankAccountNumber.trim()) { toast.error('Vui lòng nhập số tài khoản'); return; }
    if (!bankAccountName.trim()) { toast.error('Vui lòng nhập tên chủ tài khoản'); return; }
    if (amountRequested <= 0) { toast.error('Số tiền rút phải lớn hơn 0'); return; }
    if (amountRequested > netOrganizerEarnings) { toast.error('Số tiền rút không được vượt quá số dư'); return; }

    setIsPayoutLoading(true);
    try {
      await handleRequestPayout!({
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        amountRequested,
      });
      toast.success('Đã gửi yêu cầu rút tiền!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsPayoutLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Quản lý Tài chính</h2>

      {false && tournament?.status === 'REGISTRATION_CLOSED' ? (
        <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-dashed flex flex-col items-center">
          <Lock className="w-12 h-12 text-blue-500 mb-3" />
          <h4 className="font-bold text-slate-850 text-lg">Chưa thanh toán lệ phí sàn</h4>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mb-6">
            Bạn cần hoàn tất thanh toán lệ phí sàn ({totalPlatformFee.toLocaleString('vi-VN')}đ) để xem bảng chi tiết báo cáo và quản lý các giao dịch rút tiền.
          </p>
          <Button
            onClick={handlePayPlatformFee}
            disabled={isPayingPlatformFee}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg"
          >
            {isPayingPlatformFee ? 'Đang kết nối cổng thanh toán...' : 'Thanh toán lệ phí sàn'}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Lệ phí tham gia giải đấu (VNĐ)"
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
              disabled={isRegistrationLockedForFinance}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Lệ phí sàn / VĐV</label>
              <Badge className="py-2.5 bg-slate-50 border-slate-200 text-slate-700 justify-center font-bold text-sm">
                {platformFee.feePerPlayer.toLocaleString('vi-VN')} VNĐ / Người chơi
              </Badge>
              <p className="text-xs text-slate-500 font-medium">
                Logic áp dụng: dưới 100.000đ lấy 5.000đ/người, từ 100.000đ trở lên lấy {platformFee.percentage}% lệ phí/người.
              </p>
            </div>
          </div>

          {!isRegistrationLockedForFinance && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveFinanceConfig}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu cài đặt tài chính'}
              </Button>
            </div>
          )}

          {/* Financial Report Summary */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 space-y-6 mt-6">
            <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-blue-600" /> Bảng tổng kết tài chính giải đấu
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng lệ phí thu dự kiến</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">
                  {totalExpectedFee.toLocaleString('vi-VN')} VNĐ
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Tính trên {participants.length} đội đăng ký</p>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phí nền tảng</p>
                <p className="text-2xl font-bold text-red-500 mt-2">
                  {totalPlatformFee.toLocaleString('vi-VN')} VNĐ
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {platformFee.ruleLabel} ({totalPlayers} VĐV)
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm bg-emerald-50/20">
                <p className="text-xs font-bold text-slate-550 uppercase tracking-wider">Thực nhận của Ban tổ chức</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {netOrganizerEarnings.toLocaleString('vi-VN')} VNĐ
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Đã khấu trừ toàn bộ phí sàn</p>
              </div>
            </div>

            {/* Payout form */}
            {canPayout ? (
              <div className="bg-white border rounded-lg p-5 space-y-4">
                <h4 className="font-bold text-slate-850 flex items-center gap-1">
                  <Gift className="w-5 h-5 text-purple-600" /> Yêu cầu rút tiền
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Giải đấu đang thi đấu hoặc đã kết thúc, bạn có thể gửi yêu cầu rút tiền thực nhận về tài khoản ngân hàng của ban tổ chức.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input label="Ngân hàng" placeholder="Vietcombank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <Input label="Số tài khoản" placeholder="1029384756" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                  <Input label="Chủ tài khoản" placeholder="NGUYEN VAN A" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                  <Input label="Số tiền rút (VNĐ)" type="number" value={amountRequested} onChange={(e) => setAmountRequested(Number(e.target.value))} />
                </div>
                <Button
                  onClick={handleSubmitPayout}
                  disabled={isPayoutLoading}
                  className="font-bold w-full md:w-auto mt-2"
                >
                  {isPayoutLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Đang gửi...</> : 'Gửi yêu cầu rút tiền'}
                </Button>
              </div>
            ) : (
              <div className="bg-blue-50/50 p-4 rounded-lg border flex gap-3 text-xs leading-relaxed font-semibold text-blue-900">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>Cổng rút tiền chỉ mở khi giải đấu <strong>đang thi đấu</strong> hoặc <strong>đã kết thúc</strong>.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
