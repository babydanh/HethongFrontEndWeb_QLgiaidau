import { MetadataRoute } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    name: `${BRAND.name} - ${t('tagline')}`,
    short_name: BRAND.name,
    description: t('description'),
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: BRAND.assets.appleTouchIcon,
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: BRAND.assets.logo512,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: BRAND.assets.logo1024,
        sizes: '1024x1024',
        type: 'image/png',
      },
      {
        src: BRAND.assets.logoIcon,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
