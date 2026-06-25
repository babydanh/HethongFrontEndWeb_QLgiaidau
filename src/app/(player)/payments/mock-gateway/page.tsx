'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentsApi } from '@/features/payments/api';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

const GATEWAY_INFO: Record<string, { name: string; color: string; bgColor: string; textColor: string; borderColor: string }> = {
  VNPAY: {
    name: 'VNPAY',
    color: 'from-blue-600 to-blue-700',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  MOMO: {
    name: 'MoMo',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
  },
  TRANSFER: {
    name: 'Chuyển khoản ngân hàng',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
  },
};

function MockGatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentId = searchParams.get('paymentId') || '';
  const gatewayParam = searchParams.get('gateway') || 'VNPAY';
  const amount = searchParams.get('amount') || '0';
  const description = searchParams.get('description') || 'Thanh toán lệ phí giải đấu';

  const gateway = GATEWAY_INFO[gatewayParam.toUpperCase()] || GATEWAY_INFO.VNPAY;

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = useCallback((seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = Array(6).fill('');
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((v) => !v);
    const focusIndex = nextEmpty >= 0 ? nextEmpty : 5;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Vui lòng nhập đầy đủ 6 chữ số mã OTP');
      return;
    }

    if (isExpired) {
      toast.error('Mã OTP đã hết hạn. Vui lòng quay lại và thử lại.');
      return;
    }

    if (!paymentId) {
      toast.error('Thiếu thông tin giao dịch');
      return;
    }

    try {
      setIsSubmitting(true);
      setIsVerifying(true);
      await paymentsApi.mockVerify(paymentId);
      toast.success('Xác thực OTP thành công!');
      router.push(`/payments/result?paymentId=${paymentId}&status=success`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    router.push('/tournaments');
  };

  const handleResendOtp = () => {
    setTimeLeft(180);
    setIsExpired(false);
    toast.success('Mã OTP mới đã được gửi đến số điện thoại của bạn');
  };

  if (!paymentId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <p className="text-slate-600 font-medium">Thiếu thông tin giao dịch</p>
        <Button onClick={() => router.push('/tournaments')}>Quay lại danh sách giải</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-lg mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>

        {/* Gateway Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${gateway.color} p-6 text-white text-center`}>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-black tracking-wider">
                {gatewayParam.toUpperCase() === 'VNPAY' ? 'VN' : gatewayParam.toUpperCase() === 'MOMO' ? 'Mo' : '$'}
              </span>
            </div>
            <h1 className="text-xl font-black">Thanh toán qua {gateway.name}</h1>
            <p className="text-sm text-white/70 mt-1">Cổng thanh toán mô phỏng (Mock Gateway)</p>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">

            {/* Amount & Transaction ID */}
            <div className={`${gateway.bgColor} border ${gateway.borderColor} rounded-xl p-5 space-y-3`}>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Số tiền</span>
                <span className={`text-2xl font-black ${gateway.textColor}`}>
                  {formatCurrency(Number(amount))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Mã giao dịch</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{paymentId}</span>
              </div>
              {description && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-medium">Mô tả</span>
                  <span className="text-sm font-semibold text-slate-700 text-right max-w-[200px] truncate">{description}</span>
                </div>
              )}
            </div>

            {/* OTP Input */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 text-center">
                Nhập mã OTP
              </label>
              <p className="text-xs text-slate-400 text-center">
                Mã OTP gồm 6 chữ số đã được gửi đến số điện thoại đăng ký của bạn
              </p>

              <div className="flex justify-center gap-3 py-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`w-12 h-14 text-center text-xl font-black border-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      digit
                        ? 'border-blue-500 bg-blue-50'
                        : isExpired
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-300 bg-white'
                    }`}
                    disabled={isSubmitting || isExpired}
                  />
                ))}
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <Clock className={`w-4 h-4 ${isExpired ? 'text-red-500' : timeLeft <= 30 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              <span className={`font-bold font-mono tracking-wider ${
                isExpired ? 'text-red-500' : timeLeft <= 30 ? 'text-amber-500' : 'text-slate-600'
              }`}>
                Còn {formatTime(timeLeft)}
              </span>
            </div>

            {/* Expired state */}
            {isExpired && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Mã OTP đã hết hạn</p>
                  <p className="text-xs text-rose-600 mt-1">Vui lòng nhấn &quot;Gửi lại mã&quot; để nhận mã OTP mới.</p>
                </div>
              </div>
            )}

            {/* Resend OTP */}
            <div className="text-center">
              <button
                onClick={handleResendOtp}
                disabled={!isExpired && timeLeft > 120}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
              >
                Gửi lại mã OTP
              </button>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p>
                Đây là cổng thanh toán mô phỏng dành cho mục đích kiểm thử. Mã OTP mặc định là <strong className="text-slate-600">123456</strong>.
                Không có giao dịch thực tế nào được xử lý.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 text-sm"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || otp.join('').length !== 6 || isExpired}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {isVerifying ? 'Đang xác thực...' : 'Đang xử lý...'}
                  </>
                ) : (
                  'Xác nhận thanh toán'
                )}
              </Button>
            </div>

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} Quản Lý Giải Đấu - Mock Gateway (Môi trường kiểm thử)
        </p>
      </div>
    </div>
  );
}

export default function MockGatewayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <MockGatewayContent />
    </Suspense>
  );
}
