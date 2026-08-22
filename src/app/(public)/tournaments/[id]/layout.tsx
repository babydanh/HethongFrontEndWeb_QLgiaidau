import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { stripHtmlAndNormalize } from '@/utils/string';
import { getTournament } from './tournament-fetcher';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const translate = await getTranslations('TournamentDetail');
  const tournament = await getTournament(resolvedParams.id);

  if (tournament) {
    const title = `${tournament.name} | SportO`;
    const cleanDesc = stripHtmlAndNormalize(tournament.description, 160);
    const description = cleanDesc || translate('metaDescriptionFallback', { tournament: tournament.name });
    const imageUrl = tournament.bannerUrl || tournament.logoUrl || 'https://sporto.asia/sporto_v1.svg';

    const canonicalUrl = `https://sporto.asia/tournaments/${resolvedParams.id}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        images: [{ url: imageUrl }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  }

  return {
    title: translate('metaFallbackTitle'),
    description: translate('metaFallbackDescription'),
  };
}

export default function TournamentLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
