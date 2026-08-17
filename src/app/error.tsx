'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Errors');
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Có lỗi xảy ra</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {error?.message || t('generic')}
        </p>
        <Button onClick={() => reset()}>
          {t('retry')}
        </Button>
      </div>
    </div>
  );
}

