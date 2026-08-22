import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('Common');
  const title = translate('communitiesMetadataTitle');
  const description = translate('communitiesMetadataDescription');
  const image = {
    url: BRAND.assets.logo512,
    width: 512,
    height: 512,
    alt: title,
  };

  return {
    title,
    description,
    keywords: translate('communitiesMetadataKeywords').split(',').map((keyword) => keyword.trim()),
    openGraph: {
      title,
      description,
      url: '/communities',
      siteName: BRAND.name,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
    alternates: {
      canonical: '/communities',
    },
  };
}

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
