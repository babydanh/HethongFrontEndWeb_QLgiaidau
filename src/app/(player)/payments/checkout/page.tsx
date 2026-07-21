'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { divisionsApi, tournamentsApi, Tournament, TournamentParticipant, type Division } from '@/features/tournaments/api';
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
  const divisionId = searchParams.get('divisionId');
  const inviteCode = searchParams.get('invite');
  const inviteParticipantId = searchParams.get('pid');
  const teamInviteToken = searchParams.get('token');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // PayOS inline states
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);
  const [qrOpenedAt, setQrOpenedAt] = useState<number | null>(null);

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
        const tRes = await tournamentsApi.getTournamentById(tournamentId, {
          ...(inviteCode ? { invite: inviteCode } : {}),
          ...(inviteParticipantId ? { pid: inviteParticipantId } : {}),
          ...(teamInviteToken ? { token: teamInviteToken } : {}),
        });
        if (tRes.data) {
          setTournament(tRes.data);
        }

        if (divisionId) {
          const divisionRes = await divisionsApi.getDivisions(tournamentId);
          if (divisionRes.data) {
            setDivision(divisionRes.data.find((item) => item.id === divisionId) ?? null);
          }
        } else {
          setDivision(null);
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
  }, [tournamentId, participantId, divisionId, router, inviteCode, inviteParticipantId, teamInviteToken]);

  // Polling for PayOS transaction completion
  useEffect(() => {
    if (!showQrModal || !paymentId) return;

    const intervalId = setInterval(async () => {
      try {
        if (qrOpenedAt && Date.now() - qrOpenedAt > 15 * 60 * 1000) {
          clearInterval(intervalId);
          setShowQrModal(false);
          setSubmitting(false);
          toast.error('Phiên chờ thanh toán đã hết hạn.');
          return;
        }
        const res = await paymentsApi.getPaymentById(paymentId);
        if (res.data && res.data.status === 'COMPLETED') {
          clearInterval(intervalId);
          toast.success('Thanh toán thành công! Hệ thống đang cập nhật...');
          setShowQrModal(false);
          setQrOpenedAt(null);
          const params = new URLSearchParams({
            payment_status: 'success',
            payment_id: paymentId,
          });
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
          router.push(`/tournaments/${tournamentId}?${params.toString()}`);
        } else if (res.data && ['FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(res.data.status)) {
          clearInterval(intervalId);
          setShowQrModal(false);
          setQrOpenedAt(null);
          toast.error('Thanh toán không thành công hoặc đã hết hạn.');
        }
      } catch (error) {
        console.error('Failed to poll payment status:', error);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [showQrModal, paymentId, tournamentId, router, inviteCode, inviteParticipantId, teamInviteToken, divisionId, qrOpenedAt]);

  const handlePayment = async () => {
    if (!tournament || !tournamentId || !participantId) return;

    try {
      setSubmitting(true);
      const res = await paymentsApi.createPaymentLink({
        purpose: 'REGISTRATION_FEE',
        tournamentId,
        participantId,
        ...(divisionId ? { divisionId } : {}),
      });

      const payment = res.data;
      let backendAmount = payment.amount == null ? null : Number(payment.amount);
      if (backendAmount == null || !Number.isFinite(backendAmount)) {
        const detail = await paymentsApi.getPaymentById(payment.paymentId);
        backendAmount = Number(detail.data.amount);
      }

      if (!Number.isFinite(backendAmount)) {
        throw new Error('Không nhận được số tiền đã xác nhận từ hệ thống');
      }
      setConfirmedAmount(backendAmount);

      if (payment.qrCode) {
        setQrCodeData(payment.qrCode);
        setPaymentId(payment.paymentId);
        setQrOpenedAt(Date.now());
        setShowQrModal(true);
        setSubmitting(false);
        toast.success('Đã tạo mã QR thanh toán PayOS');
        return;
      }

      const paymentUrl = payment.paymentUrl ?? payment.checkoutUrl;
      
      if (paymentUrl) {
        toast.success('Đang chuyển hướng đến cổng thanh toán...');
        router.push(paymentUrl);
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

  const entryFeeVal = Number(division?.entryFee ?? tournament.entryFee) || 0;

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
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thanh Toán Lệ Phí</h1>
          <p className="text-sm text-slate-500 mt-1">Hoàn thành thanh toán để xác nhận vị trí trong giải đấu</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
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
                <span className="text-xl font-bold text-blue-600">{formatCurrency(entryFeeVal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Gateway */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-slate-900 font-bold mb-4">Phương thức thanh toán</h2>

          <div className="rounded-lg border-2 border-blue-600 bg-blue-50/50 p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <span className="text-base font-bold text-blue-700">QR</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">PayOS VietQR</p>
                <p className="text-xs text-slate-500 mt-1">Quét mã bằng ứng dụng ngân hàng; hệ thống tự đối soát qua webhook.</p>
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
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

        {/* PayOS QR Modal */}
        {showQrModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center">
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-3">
                  Cổng Thanh Toán VietQR
                </div>
                <h3 className="text-xl font-bold text-slate-900">Quét mã QR để thanh toán</h3>
                <p className="text-xs text-slate-500 mt-1">Mã QR động tự điền số tiền và thông tin chuyển khoản</p>
                
                <div className="bg-slate-50 rounded-lg p-4 my-6 inline-block border border-slate-100">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeData)}`}
                    alt="VietQR PayOS"
                    className="w-[200px] h-[200px] mx-auto rounded-lg shadow-sm bg-white p-2"
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-4 text-left border border-slate-100 space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Số tiền:</span>
                    <span className="text-slate-900 font-bold text-sm text-blue-600">
                      {formatCurrency(confirmedAmount ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Nội dung thanh toán:</span>
                    <span className="text-slate-900 font-bold max-w-[200px] truncate">{tournament.name}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-sm py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang đợi giao dịch qua Banking...
                  </div>
                  <Button
                    onClick={() => {
                      setShowQrModal(false);
                      setQrOpenedAt(null);
                      setSubmitting(false);
                    }}
                    variant="outline"
                    className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg"
                  >
                    Hủy giao dịch
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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
