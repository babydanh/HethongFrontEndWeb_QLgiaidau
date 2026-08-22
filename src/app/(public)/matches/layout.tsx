import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const translate = await getTranslations('Match');
  const title = translate('matchesMetadataTitle');
  const description = translate('matchesMetadataDescription');
  const keywords = translate.raw('matchesMetadataKeywords') as string[];
  const image = {
    url: BRAND.assets.logo512,
    width: 512,
    height: 512,
    alt: translate('matchesMetadataImageAlt'),
  };

  return {
    title,
    description,
    keywords,
    alternates: { canonical: '/matches' },
    openGraph: {
      title,
      description,
      url: '/matches',
      siteName: BRAND.name,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'vi_VN',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
