'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, Clock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '@/features/auth/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

interface OrganizerVerificationBannerProps {
  isEmailVerified?: boolean;
  email?: string | null;
}

export function OrganizerVerificationBanner({
  isEmailVerified,
  email,
}: OrganizerVerificationBannerProps) {
  const translate = useTranslations('OrganizerTournaments');
  const [isResending, setIsResending] = useState(false);

  // Nếu đã xác thực thì không hiển thị banner
  if (isEmailVerified) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      await authApi.requestEmailVerification();
      toast.success(translate('verificationResendSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error) || translate('verificationResendError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 p-5 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {translate('verificationBannerTitle')}
              </h3>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {translate('pending')}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed max-w-2xl">
              {translate('verificationBannerDesc')}
              {email ? (
                <span className="ml-1 font-semibold text-slate-800">
                  ({email})
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Nút hành động trực tiếp */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-50 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isResending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
            ) : (
              <Mail className="h-3.5 w-3.5 text-amber-600" />
            )}
            <span>{isResending ? translate('verificationResending') : translate('verificationActionResend')}</span>
          </button>

          <Link
            href="/auth/verify-email"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 cursor-pointer"
          >
            <span>{translate('verificationActionVerify')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Checklist Onboarding 3 bước minh bạch */}
      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-amber-200/60 pt-3.5 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 border border-amber-100">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800 truncate">
            {translate('verificationStep1')}
          </span>
          <span className="ml-auto text-[10px] font-bold text-emerald-600">✓</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-amber-100/60 px-3 py-2 border border-amber-300">
          <Clock className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
          <span className="text-xs font-bold text-amber-900 truncate">
            {translate('verificationStep2')}
          </span>
          <span className="ml-auto text-[10px] font-bold text-amber-700">●</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white/50 px-3 py-2 border border-amber-100/80">
          <span className="h-2 w-2 rounded-full bg-slate-300 ml-1" />
          <span className="text-xs font-medium text-slate-500 truncate">
            {translate('verificationStep3')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default OrganizerVerificationBanner;
