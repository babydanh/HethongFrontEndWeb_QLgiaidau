import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('Common');
  return {
  title: translate('communitiesMetadataTitle'),
  description: translate('communitiesMetadataDescription'),
  openGraph: {
    title: translate('communitiesMetadataTitle'),
    description: translate('communitiesMetadataDescription'),
    url: 'https://sporto.asia/communities',
    type: 'website',
  },
  alternates: {
    canonical: 'https://sporto.asia/communities',
  },
};
}

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

