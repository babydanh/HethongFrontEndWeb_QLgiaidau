import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const translate = await getTranslations('Common');

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-20">
      <LoadingSpinner className="w-16 h-16" />
      <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
        {translate('loading')}
      </p>
    </div>
  );
}
