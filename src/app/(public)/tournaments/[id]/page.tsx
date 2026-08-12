import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Metadata } from 'next';
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
  const tournament = await getTournament(resolvedParams.id);

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
      name: tournament.venue?.name || tournament.city || 'Sân thi đấu thể thao',
      address: {
        '@type': 'PostalAddress',
        streetAddress: tournament.venue?.locationAddress || tournament.city || 'Việt Nam',
        addressLocality: tournament.city || 'Việt Nam',
        addressCountry: 'VN',
      },
    },
    image: [tournament.bannerUrl || tournament.logoUrl || 'https://sporto.asia/sporto_v1\.svg'],
    organizer: {
      '@type': 'Organization',
      name: 'Sporto',
      url: 'https://sporto.asia',
    },
  } : null;

  return (
    <>
      {sportsEventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventSchema) }}
        />
      )}
      <TournamentDetailClient tournamentId={resolvedParams.id} initialTournament={tournament} />
    </>
  );
}
