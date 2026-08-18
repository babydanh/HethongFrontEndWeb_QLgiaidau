'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/features/auth/api';
import { usersApi } from '@/features/users/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Trophy, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function VerifyEmailContent() {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    const verify = async () => {
      if (!token) {
        setStatus('error');
        setErrorMsg(t('missingVerificationToken'));
        return;
      }
      try {
        await authApi.confirmEmailVerification(token);
        setStatus('success');
        
        // Try to update current user state if they are logged in
        try {
          const freshProfile = await usersApi.getProfile();
          setUser({
            id: freshProfile.id,
            email: freshProfile.email,
            fullName: freshProfile.fullName,
            avatarUrl: freshProfile.avatarUrl || undefined,
            roles: freshProfile.roles || (freshProfile.role ? [freshProfile.role] : []),
            phoneNumber: freshProfile.phoneNumber || undefined,
            dateOfBirth: freshProfile.dateOfBirth || undefined,
            gender: freshProfile.gender || undefined,
            address: freshProfile.address || undefined,
            bio: freshProfile.bio || undefined,
            // Bắt buộc kèm trạng thái xác minh — nếu không badge sẽ quay lại
            // "Chưa xác minh" ngay sau khi xác thực thành công.
            isEmailVerified: freshProfile.isEmailVerified,
            isPhoneVerified: freshProfile.isPhoneVerified,
            isGenderLocked: freshProfile.isGenderLocked,
          });
        } catch {
          // Ignore if user profile can't be fetched (not logged in)
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(getErrorMessage(err, t('invalidVerificationToken')));
      }
    };

    verify();
  }, [searchParams, setUser]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-xl border border-slate-200/80 shadow-[0_8px_32px_rgba(15,23,42,0.04)] p-8 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <LoadingSpinner className="w-12 h-12 mb-4" />
            <h2 className="text-lg font-bold text-slate-800">{t("verificationLoadingHeading")}</h2>
            <p className="text-xs text-slate-500 mt-2">{t('pleaseWait')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <CheckCircle className="w-14 h-14 text-blue-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t('verificationSuccessHeading')}</h2>
            <p className="text-xs text-slate-500 mt-2 px-4 leading-relaxed">
              {t("verificationSuccessDescription")}
            </p>
            <Link 
              href="/" 
              className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-md transition-colors"
            >
              {t('goHome')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6">
            <XCircle className="w-14 h-14 text-rose-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t('verificationFailedHeading')}</h2>
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-4 py-2 rounded-lg mt-3 leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-8 w-full">
              <Link 
                href="/profile/edit" 
                className="flex-1 border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center"
              >
                {t('enterCodeManually')}
              </Link>
              <Link 
                href="/" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition-colors flex items-center justify-center"
              >
                {t('goHome')}
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

