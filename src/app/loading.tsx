import { PickleballLoading } from '@/components/ui/PickleballLoading';
import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const translate = await getTranslations('Common');

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-20">
      <PickleballLoading size="lg" text={translate('loading')} />
    </div>
  );
}
