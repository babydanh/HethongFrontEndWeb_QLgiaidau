import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { stripHtmlAndNormalize } from '@/utils/string';
import { isTournamentCompleted } from '@/utils/tournament-status';
import TournamentDetailClient from './TournamentDetailClient';
import { getTournament, getTournamentDivisions, getTournamentResults } from './tournament-fetcher';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const firstSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isResultShare =
    firstSearchParam(resolvedSearchParams.tab) === 'results' &&
    firstSearchParam(resolvedSearchParams.share) === 'results';

  if (!isResultShare) return {};

  const [tournament, result] = await Promise.all([
    getTournament(resolvedParams.id),
    getTournamentResults(resolvedParams.id, firstSearchParam(resolvedSearchParams.divisionId)),
  ]);
  const awards = result?.awards ?? [];
  const top1 = awards.find((award) => award.rank === 1)?.participant;
  const top2 = awards.find((award) => award.rank === 2)?.participant;
  if (!tournament || !result || !top1 || !top2) return {};

  const translate = await getTranslations('TournamentDetail');
  const resultHeading = result.finalized
    ? translate('resultsTabOfficialTitle')
    : translate('resultsTabCurrentTitle');
  const title = `${resultHeading}: ${tournament.name}`;
  const description = `${translate('rank', { rank: 1 })}: ${top1.teamName} · ${translate('rank', { rank: 2 })}: ${top2.teamName}.`;
  const query = new URLSearchParams({ tab: 'results', share: 'results' });
  const divisionId = firstSearchParam(resolvedSearchParams.divisionId);
  if (divisionId) query.set('divisionId', divisionId);
  const shareUrl = `https://sporto.asia/tournaments/${resolvedParams.id}?${query.toString()}`;
  const imageUrl = tournament.bannerUrl || tournament.logoUrl || 'https://sporto.asia/sporto_v1.svg';

  return {
    title,
    description,
    alternates: { canonical: `https://sporto.asia/tournaments/${resolvedParams.id}` },
    openGraph: {
      title,
      description,
      url: shareUrl,
      images: [{ url: imageUrl, alt: title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
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

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let tournament: Awaited<ReturnType<typeof getTournament>>;
  let divisions: Awaited<ReturnType<typeof getTournamentDivisions>> = [];
  try {
    const [t, d] = await Promise.all([
      getTournament(resolvedParams.id),
      getTournamentDivisions(resolvedParams.id),
    ]);
    tournament = t;
    divisions = d;
  } catch {
    // Preserve Next.js error handling for transient API/5xx failures instead of
    // turning an outage into a misleading not-found page.
    throw new Error('Tournament detail is temporarily unavailable');
  }

  if (!tournament) {
    notFound();
  }

  const divisionId = firstSearchParam(resolvedSearchParams.divisionId);
  const divisionIdsToCheck = divisions.length > 0
    ? (divisionId ? [divisionId] : divisions.map((d) => d.id))
    : [undefined];

  const resultsList = await Promise.allSettled(
    divisionIdsToCheck.map((dId) => getTournamentResults(resolvedParams.id, dId))
  );

  let hasInitialResults = Boolean(
    tournament.status && isTournamentCompleted(tournament.status)
  );
  let primaryResults = null;

  for (const res of resultsList) {
    if (res.status === 'fulfilled' && res.value) {
      const awards = res.value.awards ?? [];
      const hasTop1 = awards.some((a) => a.rank === 1 && (Boolean(a.participant?.teamName) || Boolean(a.participant?.members?.length)));
      if (awards.length >= 1 || res.value.finalized || hasTop1) {
        hasInitialResults = true;
        if (!primaryResults) primaryResults = res.value;
      }
    }
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
      <TournamentDetailClient
        tournamentId={resolvedParams.id}
        initialTournament={tournament}
        initialDivisions={divisions}
        initialHasResults={hasInitialResults}
        initialResults={primaryResults}
      />
    </>
  );
}
