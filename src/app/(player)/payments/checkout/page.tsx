'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tournamentsApi, Tournament, TournamentParticipant } from '@/features/tournaments/api';
import { paymentsApi } from '@/features/payments/api';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';
import toast from 'react-hot-toast';
import { Loader2, CreditCard, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const participantId = searchParams.get('participantId');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gateway, setGateway] = useState<'VNPAY' | 'MOMO'>('VNPAY');

  useEffect(() => {
    if (!tournamentId || !participantId) {
      toast.error('Thiếu thông tin giải đấu hoặc lượt đăng ký');
      router.push('/tournaments');
      return;
    }

    const loadDetails = async () => {
      try {
        setLoading(true);
        // Load tournament
        const tRes = await tournamentsApi.getTournamentById(tournamentId);
        if (tRes.data) {
          setTournament(tRes.data);
        }

        // Load participant team name
        const pRes = await tournamentsApi.getTournamentParticipants(tournamentId);
        if (pRes.data) {
          const participant = pRes.data.find((p: TournamentParticipant) => p.id === participantId);
          if (participant) {
            setTeamName(participant.teamName);
          }
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [tournamentId, participantId, router]);

  const handlePayment = async () => {
    if (!tournament || !tournamentId || !participantId) return;

    try {
      setSubmitting(true);
      const amount = Number(tournament.entryFee) || 0;
      
      const res = await paymentsApi.createPaymentLink({
        tournamentId,
        participantId,
        amount,
        paymentGateway: gateway,
      });

      const paymentUrl = res.data?.paymentUrl;
      
      if (paymentUrl) {
        toast.success('Đang chuyển hướng đến cổng thanh toán...');
        window.location.href = paymentUrl;
      } else {
        throw new Error('Không nhận được URL thanh toán từ hệ thống');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600 font-medium">Không tìm thấy thông tin giải đấu</p>
        <Button onClick={() => router.push('/tournaments')}>Quay lại danh sách</Button>
      </div>
    );
  }

  const entryFeeVal = Number(tournament.entryFee) || 0;

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>

        {/* Title */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thanh Toán Lệ Phí</h1>
          <p className="text-sm text-slate-500 mt-1">Hoàn thành thanh toán để xác nhận vị trí trong giải đấu</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <h2 className="text-slate-900 font-bold border-b border-slate-100 pb-3 mb-4">Chi tiết hóa đơn</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <span className="text-sm text-slate-500">Giải đấu</span>
                <span className="text-sm font-bold text-slate-900 text-right max-w-[250px] truncate">{tournament.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Tên đội thi đấu</span>
                <span className="text-sm font-semibold text-slate-800">{teamName || 'Đội đăng ký'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                <span className="text-base font-bold text-slate-900">Tổng cộng</span>
                <span className="text-xl font-black text-blue-600">{formatCurrency(entryFeeVal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Gateway Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-slate-900 font-bold mb-4">Chọn phương thức thanh toán</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setGateway('VNPAY')}
              className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center transition-all ${
                gateway === 'VNPAY'
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="h-8 flex items-center justify-center font-black text-blue-700 tracking-wider text-lg">
                VNPAY
              </div>
              <span className="text-xs text-slate-500 mt-2 font-medium">Cổng VNPay</span>
            </div>

            <div
              onClick={() => setGateway('MOMO')}
              className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center transition-all ${
                gateway === 'MOMO'
                  ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="h-8 flex items-center justify-center font-black text-pink-600 tracking-wider text-lg">
                MoMo
              </div>
              <span className="text-xs text-slate-500 mt-2 font-medium">Ví điện tử MoMo</span>
            </div>
          </div>
        </div>

        {/* Security / Trust */}
        <div className="flex items-center gap-2 text-slate-500 mb-8 px-1">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-xs leading-normal">
            Giao dịch được bảo mật tuyệt đối. Chúng tôi không lưu trữ thông tin thẻ ngân hàng của bạn.
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handlePayment}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Đang chuẩn bị giao dịch...
            </>
          ) : (
            <>
              Xác nhận và Thanh toán <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
