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
  locales,
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
  const switchLanguage = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;

    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold text-slate-500 shadow-sm',
        expanded && 'w-full justify-between px-3 py-1.5 text-sm',
        className,
      )}
    >
      <span className={cn('inline-flex items-center gap-1.5', expanded && 'mr-2')}>
        <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {expanded ? t('language') : null}
      </span>
      <span className="inline-flex items-center gap-0.5" aria-live="polite">
        {locales.map((option) => {
          const language = option === 'vi' ? t('vietnamese') : t('english');
          const isSelected = option === locale;

          return (
            <button
              key={option}
              type="button"
              onClick={() => switchLanguage(option)}
              className={cn(
                'rounded-md px-2 py-1 uppercase transition-colors',
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-blue-50 hover:text-blue-700',
              )}
              aria-current={isSelected ? 'true' : undefined}
              aria-label={isSelected ? language : t('switchTo', { language })}
              title={isSelected ? language : t('switchTo', { language })}
            >
              {option}
            </button>
          );
        })}
      </span>
    </div>
  );
}

