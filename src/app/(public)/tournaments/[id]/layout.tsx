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

export default async function TournamentLayout({
  children,
  params,
}: LayoutProps) {
  const resolvedParams = await params;
  const tournament = await getTournament(resolvedParams.id);

  const eventSchema = tournament
    ? {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: tournament.name,
        description: stripHtmlAndNormalize(tournament.description, 200) || tournament.name,
        startDate: tournament.startDate || undefined,
        endDate: tournament.endDate || undefined,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: tournament.venue?.name || tournament.locationAddress || 'Sân thi đấu thể thao',
          address: {
            '@type': 'PostalAddress',
            addressLocality: tournament.city || 'Việt Nam',
            streetAddress: tournament.locationAddress || tournament.venue?.locationAddress || undefined,
            addressCountry: 'VN',
          },
        },
        image: [
          tournament.bannerUrl || tournament.logoUrl || 'https://sporto.asia/sporto_1024.png',
        ],
        organizer: {
          '@type': 'SportsOrganization',
          name: 'SportO',
          url: 'https://sporto.asia',
        },
      }
    : null;

  return (
    <>
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}
      {children}
    </>
  );
}
