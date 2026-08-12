'use client';

import { startTransition } from 'react';
import { Globe2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  type AppLocale,
  defaultLocale,
  isAppLocale,
  localeCookieName,
} from '@/i18n/config';
import { cn } from '@/utils/cn';

type LanguageSwitcherProps = {
  className?: string;
  expanded?: boolean;
};

export function LanguageSwitcher({
  className,
  expanded = false,
}: LanguageSwitcherProps) {
  const currentLocale = useLocale();
  const t = useTranslations('LocaleSwitcher');
  const router = useRouter();
  const locale = isAppLocale(currentLocale) ? currentLocale : defaultLocale;
  const nextLocale: AppLocale = locale === 'vi' ? 'en' : 'vi';
  const nextLanguage = nextLocale === 'vi' ? t('vietnamese') : t('english');

  const switchLanguage = () => {
    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold uppercase text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700',
        expanded && 'w-full justify-start px-4 py-2.5 text-sm normal-case',
        className,
      )}
      aria-label={t('switchTo', { language: nextLanguage })}
      title={t('switchTo', { language: nextLanguage })}
    >
      <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{expanded ? `${t('language')}: ${locale.toUpperCase()}` : locale.toUpperCase()}</span>
    </button>
  );
}

