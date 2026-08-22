import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('Leaderboard');
  const title = translate('metadataTitle');
  const description = translate('metadataDescription');
  const canonical = `${baseUrl}/leaderboard`;
  const image = `${baseUrl}/sporto_v1.svg`;

  return {
    title,
    description,
    keywords: [
      translate('metadataKeywordSports'),
      translate('metadataKeywordLeaderboard'),
      translate('metadataKeywordPickleball'),
      'SportO',
    ],
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND.name,
      type: 'website',
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
