'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/axios';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const resetSchema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordContent() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const [done, setDone] = useState(false);

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      toast.error(t('missingToken'));
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
      toast.success(t('resetSuccessToast'));
    } catch {
      toast.error(t('invalidToken'));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t('invalidLink')}</h1>
          <p className="text-sm text-slate-500 mb-6">{t('invalidLinkDescription')}</p>
          <Link href="/forgot-password" className="text-sm font-bold text-blue-600 hover:underline">
            {t('requestNew')}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t('resetSuccessTitle')}</h1>
          <p className="text-sm text-slate-500 mb-6">{t('resetSuccessDescription')}</p>
          <Link href="/login" className="inline-block px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg">
            {t('signIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/login" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{t('resetPassword')}</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('newPassword')}</label>
            <Input type="password" placeholder="••••••••" {...register('password')} error={errors.password ? t('passwordMinLength') : undefined} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('confirmPassword')}</label>
            <Input type="password" placeholder="••••••••" {...register('confirmPassword')} error={errors.confirmPassword ? t('passwordMismatch') : undefined} />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg">
            {isSubmitting ? t('processing') : t('resetPassword')}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('Auth');
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">{t('loading')}</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

