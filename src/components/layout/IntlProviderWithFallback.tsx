'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, PropsWithChildren } from 'react';

type IntlProviderProps = PropsWithChildren<
  Pick<ComponentProps<typeof NextIntlClientProvider>, 'locale' | 'messages'>
>;

/**
 * Keep missing translations user-safe while the catalog gate reports the key
 * to developers. A technical namespace.key must never become visible copy.
 */
export default function IntlProviderWithFallback({
  children,
  locale,
  messages,
}: IntlProviderProps) {
  const getMessageFallback = () =>
    locale === 'vi' ? 'Nội dung đang được cập nhật.' : 'Content is being updated.';

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
