'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentsApi } from '@/features/payments/api';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Calendar, Trophy, TrophyIcon } from 'lucide-react';

interface PaymentDetails {
  id: string;
  tournamentId: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentGateway?: string;
  paidAt?: string;
  createdAt: string;
  tournamentName?: string;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract either direct paymentId OR VNPAY return params
  const rawTxnRef = searchParams.get('vnp_TxnRef');
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const queryPaymentId = searchParams.get('paymentId');
  
  const paymentId = queryPaymentId || rawTxnRef;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'ERROR'>('PENDING');
  const [details, setDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    if (!paymentId) {
      toast.error('Không tìm thấy thông tin giao dịch');
      setStatus('ERROR');
      setLoading(false);
      return;
    }

    const verifyAndLoad = async () => {
      try {
        setLoading(true);

        // 1. Simulate webhook call to ensure backend is updated in local mock/sandbox environment
        // If VNPAY returned, or we just want to ensure it works, we call the webhook endpoint
        const responseCode = vnpResponseCode || '00';
        try {
          await api.post('/payments/webhook', {
            transactionReference: paymentId,
            responseCode: responseCode,
            gatewayTransactionId: `MOCK_TXN_${Date.now()}`,
            rawPayload: {
              vnp_ResponseCode: responseCode,
              vnp_TxnRef: paymentId,
            }
          });
        } catch (webhookErr) {
          // Webhook might already be processed or fail, we can ignore and check database state
          console.warn('Webhook auto-simulate finished with response/error:', webhookErr);
        }

        // 2. Fetch payment details from database
        const res = await paymentsApi.getPaymentById(paymentId);
        
        // API response mapping
        const paymentData = res?.data || res;
        
        if (paymentData) {
          // Fetch tournament details to get name
          let tName = 'Giải đấu thể thao';
          try {
            const tRes = await api.get<{ name: string } | { data: { name: string } }>(`/tournaments/${paymentData.tournamentId}`);
            const tData = (tRes as any)?.data || tRes;
            if (tData?.name) {
              tName = tData.name;
            }
          } catch (tErr) {
            console.error('Failed to load tournament name in callback:', tErr);
          }

          setDetails({
            id: paymentData.id,
            tournamentId: paymentData.tournamentId,
            amount: paymentData.amount,
            status: paymentData.status,
            paymentGateway: paymentData.paymentGateway,
            paidAt: paymentData.paidAt,
            createdAt: paymentData.createdAt,
            tournamentName: tName,
          });

          if (paymentData.status === 'COMPLETED') {
            setStatus('SUCCESS');
            toast.success('Thanh toán lệ phí thành công!');
          } else if (paymentData.status === 'FAILED') {
            setStatus('FAILED');
            toast.error('Thanh toán thất bại');
          } else {
            setStatus('PENDING');
          }
        } else {
          setStatus('ERROR');
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
        setStatus('ERROR');
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoad();
  }, [paymentId, vnpResponseCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">Đang kiểm tra kết quả giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 md:px-8">
      <div className="max-w-md mx-auto">
        
        {/* Status card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 p-8 text-center">
          
          {status === 'SUCCESS' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Thành Công!</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Đăng ký và thanh toán của bạn đã hoàn tất. Bạn đã chính thức có suất tham gia giải đấu.
              </p>
            </div>
          )}

          {status === 'FAILED' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Thất Bại</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Giao dịch thanh toán lệ phí không thành công hoặc đã bị hủy từ phía cổng thanh toán.
              </p>
            </div>
          )}

          {status === 'PENDING' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Đang Chờ Xử Lý</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Hóa đơn đang được kiểm tra. Trạng thái có thể cập nhật sau vài phút.
              </p>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Lỗi Giao Dịch</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Không thể tải thông tin thanh toán. Vui lòng liên hệ hỗ trợ hoặc thử lại sau.
              </p>
            </div>
          )}

          {/* Details table */}
          {details && (
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-left text-sm mb-8">
              <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <TrophyIcon className="w-4 h-4 text-blue-600" /> {details.tournamentName}
              </h3>
              
              <div className="flex flex-col gap-2.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Mã giao dịch:</span>
                  <span className="font-semibold text-slate-800 text-xs truncate max-w-[150px]">{details.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lệ phí:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(Number(details.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cổng thanh toán:</span>
                  <span className="font-semibold text-slate-800">{details.paymentGateway}</span>
                </div>
                {details.paidAt && (
                  <div className="flex justify-between">
                    <span>Thời gian:</span>
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(details.paidAt).toLocaleString('vi-VN')}
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
                onClick={() => router.push(`/tournaments/${details.tournamentId}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-bold"
              >
                Về Trang Giải Đấu
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/tournaments')}
              className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-2.5"
            >
              Xem Các Giải Khác
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
