import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { stripHtmlAndNormalize } from '@/utils/string';
import TournamentDetailClient from './TournamentDetailClient';
import { getTournament } from './tournament-fetcher';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Map trạng thái giải đấu sang schema.org EventStatus (chuẩn Google). */
function mapEventStatus(status?: string): string {
  switch (status) {
    case 'IN_PROGRESS':
    case 'ONGOING':
      return 'https://schema.org/EventInProgress';
    case 'COMPLETED':
      return 'https://schema.org/EventCompleted';
    case 'CANCELLED':
      return 'https://schema.org/EventCancelled';
    case 'REGISTRATION_OPEN':
    case 'REGISTRATION_CLOSED':
    case 'UPCOMING':
    default:
      // DRAFT/PENDING_APPROVAL/SUSPENDED không nên nằm trong sitemap; nếu lọt vào, mặc định Scheduled.
      return 'https://schema.org/EventScheduled';
  }
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  let tournament: Awaited<ReturnType<typeof getTournament>>;
  try {
    tournament = await getTournament(resolvedParams.id);
  } catch {
    // Preserve Next.js error handling for transient API/5xx failures instead of
    // turning an outage into a misleading not-found page.
    throw new Error('Tournament detail is temporarily unavailable');
  }

  if (!tournament) {
    notFound();
  }

  const translate = await getTranslations('TournamentDetail');
  const sportsEventSchema = tournament ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.name,
    description: stripHtmlAndNormalize(tournament.description, 200) || tournament.name,
    ...(tournament.startDate ? { startDate: tournament.startDate } : {}),
    // Không fallback về startDate khi thiếu endDate -> tránh phát sinh dữ liệu giả.
    ...(tournament.endDate ? { endDate: tournament.endDate } : {}),
    eventStatus: mapEventStatus(tournament.status),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: tournament.venue?.name || tournament.city || translate('schemaVenueFallback'),
      address: {
        '@type': 'PostalAddress',
        streetAddress: tournament.venue?.locationAddress || tournament.city || translate('schemaCountryFallback'),
        addressLocality: tournament.city || translate('schemaCountryFallback'),
        addressCountry: 'VN',
      },
    },
    image: [tournament.bannerUrl || tournament.logoUrl || 'https://sporto.asia/sporto_v1.svg'],
    organizer: {
      '@type': 'Organization',
      name: 'SportO',
      url: 'https://sporto.asia',
    },
  } : null;

  const breadcrumbSchema = tournament ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'SportO',
        item: 'https://sporto.asia',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: translate('breadcrumbTournaments'),
        item: 'https://sporto.asia/tournaments',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tournament.name,
        item: `https://sporto.asia/tournaments/${resolvedParams.id}`,
      },
    ],
  } : null;

  return (
    <>
      {sportsEventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <TournamentDetailClient tournamentId={resolvedParams.id} initialTournament={tournament} />
    </>
  );
}
