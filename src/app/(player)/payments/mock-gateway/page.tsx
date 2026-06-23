'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Lock, Smartphone, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

/* ──────────────────────────────────────────────────────────
   Mock gateway UI — shown after checkout before the real
   (or simulated) redirect back to /payments/result
────────────────────────────────────────────────────────── */

type Step = 'form' | 'processing' | 'done';
type GW = 'MOMO' | 'VNPAY';

function MomoLogo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-10 h-10 rounded-full bg-[#ae2070] flex items-center justify-center">
        <span className="text-white font-black text-xs leading-none">M</span>
      </div>
      <span className="text-2xl font-black text-[#ae2070] tracking-tight">MoMo</span>
    </div>
  );
}

function VnpayLogo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-[#0066b3] flex items-center justify-center">
        <span className="text-white font-black text-xs leading-none">VN</span>
      </div>
      <span className="text-2xl font-black text-[#0066b3] tracking-tight">VNPAY</span>
    </div>
  );
}

function MockGatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentId = searchParams.get('paymentId') ?? '';
  const gateway = (searchParams.get('gateway') ?? 'VNPAY') as GW;
  const rawAmount = searchParams.get('amount') ?? '0';
  const description = searchParams.get('description') ?? 'Thanh toán lệ phí giải đấu';
  const amount = Number(rawAmount);

  const [step, setStep] = useState<Step>('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [processingMsg, setProcessingMsg] = useState('Đang xử lý giao dịch...');
  const [success, setSuccess] = useState<boolean | null>(null);

  // OTP countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = () => {
    setOtpSent(true);
    setCountdown(60);
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleConfirmPayment = async () => {
    setStep('processing');

    // Simulate gateway processing with message sequence
    const messages = [
      'Đang xác thực giao dịch...',
      'Kết nối tới ngân hàng...',
      'Đang xử lý thanh toán...',
      'Hoàn tất giao dịch...',
    ];

    for (let i = 0; i < messages.length; i++) {
      await new Promise((r) => setTimeout(r, 800 + i * 400));
      setProcessingMsg(messages[i]);
    }

    await new Promise((r) => setTimeout(r, 600));
    setSuccess(true);

    // After showing success, redirect to real result page
    await new Promise((r) => setTimeout(r, 1800));
    router.replace(`/payments/result?paymentId=${paymentId}&vnp_ResponseCode=00`);
  };

  const handleCancelPayment = async () => {
    setStep('processing');
    setProcessingMsg('Đang hủy giao dịch...');
    await new Promise((r) => setTimeout(r, 1500));
    setSuccess(false);
    await new Promise((r) => setTimeout(r, 1800));
    router.replace(`/payments/result?paymentId=${paymentId}&vnp_ResponseCode=24`);
  };

  const isMomo = gateway === 'MOMO';
  const accentColor = isMomo ? '#ae2070' : '#0066b3';
  const accentBg = isMomo ? 'bg-[#ae2070]' : 'bg-[#0066b3]';
  const accentBorder = isMomo ? 'border-[#ae2070]' : 'border-[#0066b3]';
  const accentText = isMomo ? 'text-[#ae2070]' : 'text-[#0066b3]';
  const accentFocus = isMomo ? 'focus:ring-[#ae2070]/30 focus:border-[#ae2070]' : 'focus:ring-[#0066b3]/30 focus:border-[#0066b3]';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: isMomo ? '#f7f0f4' : '#eef4fb' }}
    >
      <AnimatePresence mode="wait">
        {/* ── PROCESSING / RESULT OVERLAY ── */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center text-center w-full max-w-sm"
          >
            {success === null ? (
              <>
                <Loader2 className="w-14 h-14 animate-spin mb-5" style={{ color: accentColor }} />
                <p className="font-bold text-slate-800 text-lg mb-1">{processingMsg}</p>
                <p className="text-sm text-slate-500">Vui lòng không đóng trang này</p>
              </>
            ) : success ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </motion.div>
                <p className="font-black text-slate-900 text-xl mb-1">Thanh toán thành công!</p>
                <p className="text-slate-500 text-sm">Đang chuyển hướng về kết quả...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <p className="font-black text-slate-900 text-xl mb-1">Đã hủy giao dịch</p>
                <p className="text-slate-500 text-sm">Đang chuyển hướng...</p>
              </>
            )}
          </motion.div>
        )}

        {/* ── PAYMENT FORM ── */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
          >
            {/* Header stripe */}
            <div className={`${accentBg} px-6 py-5 flex flex-col items-center`}>
              {isMomo ? <MomoLogo /> : <VnpayLogo />}
              <p className="text-white/80 text-xs mt-2 font-medium">Cổng thanh toán an toàn</p>
            </div>

            <div className="px-6 py-5">
              {/* Order summary */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                  Thông tin thanh toán
                </p>
                <p className="text-sm text-slate-700 font-medium leading-snug mb-3">{description}</p>
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                  <span className="text-sm text-slate-500 font-medium">Tổng tiền</span>
                  <span className="text-xl font-black" style={{ color: accentColor }}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              </div>

              {/* Phone field */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {isMomo ? 'Số điện thoại MoMo' : 'Số thẻ / Tài khoản ngân hàng'}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {isMomo ? (
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    ) : (
                      <CreditCard className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    defaultValue={isMomo ? '0901 234 567' : '9704 •••• •••• 1234'}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 font-medium outline-none focus:ring-2 transition-all ${accentFocus}`}
                    readOnly
                  />
                </div>
              </div>

              {/* OTP section */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700">Mã xác nhận OTP</label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0}
                    className={`text-xs font-bold transition-colors ${countdown > 0 ? 'text-slate-400 cursor-not-allowed' : `${accentText} hover:underline cursor-pointer`}`}
                  >
                    {otpSent
                      ? countdown > 0
                        ? `Gửi lại (${countdown}s)`
                        : 'Gửi lại OTP'
                      : 'Gửi OTP'}
                  </button>
                </div>

                <div className="flex gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-10 h-12 text-center text-lg font-black rounded-xl border outline-none focus:ring-2 transition-all ${accentFocus} ${digit ? `border-2 ${accentBorder}` : 'border-slate-200'}`}
                    />
                  ))}
                </div>
                {!otpSent && (
                  <p className="text-xs text-slate-400 mt-1.5">Nhấn &quot;Gửi OTP&quot; để nhận mã xác nhận</p>
                )}
                {otpSent && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Mã OTP đã được gửi đến số điện thoại đăng ký (giả lập)
                  </p>
                )}
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 mb-5 bg-green-50 border border-green-100 rounded-xl p-3">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-green-700 leading-snug">
                  Giao dịch được mã hóa SSL 256-bit. Thông tin tài khoản của bạn được bảo mật tuyệt đối.
                </p>
              </div>

              {/* Buttons */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                className={`w-full ${accentBg} hover:opacity-90 active:scale-[0.98] text-white font-bold py-3 rounded-xl text-sm transition-all mb-2.5 flex items-center justify-center gap-2 cursor-pointer`}
              >
                <Lock className="w-4 h-4" />
                Xác nhận thanh toán {formatCurrency(amount)}
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Hủy giao dịch
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              <p className="text-[11px] text-slate-400 font-medium">
                Được bảo mật bởi {isMomo ? 'MoMo Security' : 'VNPAY Shield'} · Mô phỏng
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MockGatewayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <MockGatewayContent />
    </Suspense>
  );
}
