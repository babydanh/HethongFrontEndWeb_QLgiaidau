'use client';

import * as React from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, getBaseUrl } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import type { User } from '@/lib/zustand/authStore';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ApiResponse } from '@/types/api';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRAND } from '@/constants/brand';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;
interface LoginResponse {
  user: User;
}

const HIGHLIGHTS = [
  'professionalTournaments',
  'liveEloRanking',
  'athleteCommunity',
];

const STATS = [
  { value: '5,000+', label: 'tournaments' },
  { value: '50K+', label: 'athletes' },
  { value: '120+', label: 'provinces' },
];

export default function LoginPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto redirect to homepage if user is already logged in
  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Reset loading state when navigating back (BFCache handling)
  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsLoading(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
      const user = res.data?.user;
      if (!user) throw new Error(t('userInfoError'));
      setUser(user);
      toast.success(t('loginSuccess'));
      router.push('/');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || t('loginFailed'));
      } else {
        toast.error(t('loginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${getBaseUrl()}/auth/google`;
  };


  return (
    <div className="flex flex-1 min-h-[100dvh] bg-white">
      {/* ── Left: Sport photo + overlay ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden"
        style={{
          backgroundImage: "url('https://picsum.photos/seed/vndc-sport-badminton-action/900/1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/55 to-slate-900/90" />

        {/* Logo */}
        <div className="relative z-10 p-10 pb-0">
          <Link href="/" className="inline-block">
            <img
              src={BRAND.assets.logoFull}
              alt={BRAND.name}
              className="h-8 w-auto object-contain brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
            />
          </Link>
        </div>

        {/* Headline + highlights */}
        <div className="relative z-10 px-10 pb-4">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            {t('managementPlatform')}
            <br />
            <span className="text-blue-400">{t('sportsTournaments')}</span>
            <br />
            {t('vietnam')}
          </h1>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed max-w-[320px]">
            {t('loginMarketingDescription')}
          </p>

          <ul className="mt-5 space-y-2.5">
            {HIGHLIGHTS.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                className="flex items-center gap-2.5 text-sm text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                {t(item)}
              </motion.li>
            ))}
          </ul>

          {/* Stats strip */}
          <div className="mt-8 flex gap-6">
            {STATS.map(({ value, label }) => (
              <div key={t(label)}>
                <p className="text-2xl font-bold text-white leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t(label)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-10 pt-0">
          <p className="text-slate-500 text-xs">© 2025 Sporto</p>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Subtle decorative bg circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-70" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-70" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-[400px] px-4"
        >
          {/* Form card */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-8 py-8">
            {/* Logo inside card for right panel */}
            <div className="flex items-center justify-center mb-5">
              <Link href="/" className="inline-block">
                <img
                  src={BRAND.assets.logoFull}
                  alt={BRAND.name}
                  className="h-8 w-auto object-contain hover:opacity-90 transition-opacity"
                />
              </Link>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('welcomeBack')}</h2>
            <p className="mt-1 text-sm text-slate-500 mb-5">
              {t('loginSubtitle')}
            </p>

            {/* Social Logins Stack */}
            <div className="space-y-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('continueWithGoogle')}
              </button>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t('or')}</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('email')}</label>
                <Input type="email" placeholder="name@example.com" {...register('email')} error={errors.email ? t('invalidEmail') : undefined} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('password')}</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pr-11"
                    {...register('password')}
                    error={errors.password ? t('passwordMinLength') : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    className="absolute right-3 top-[13px] z-10 text-slate-400 transition-colors hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                    {t('forgotPasswordLink')}
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg shadow-sm transition-all cursor-pointer text-sm mt-1"
              >
                {isLoading ? t('processing') : t('signIn')}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              {t('noAccountPrompt')}{' '}
              <Link href="/register" className="font-bold text-blue-600 hover:underline">
                {t('createNewAccount')}
              </Link>
            </p>
          </div>

          {/* Trust line below card */}
          <p className="text-center text-xs text-slate-400 mt-4">
            {t('trustLine')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

