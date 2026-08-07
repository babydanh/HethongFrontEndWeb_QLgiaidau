import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import TournamentDetailClient from './TournamentDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchTournamentWithRetry(url: string, init?: RequestInit) {
  const delays = [0, 350, 1000];
  let lastError: unknown;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
    try {
      const response = await fetch(url, { ...init, cache: 'no-store' });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`Tournament request failed with ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Tournament request failed');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://giaidau.vnvar.com/api/v1';
  
  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${resolvedParams.id}`);
    if (response.ok) {
      const res = await response.json();
      const tournament = res.data;
      if (tournament) {
        const title = `${tournament.name} | VNDC Sport`;
        const description = tournament.description?.replace(/<[^>]*>?/gm, '').substring(0, 160) || `Thông tin chi tiết và lịch thi đấu giải đấu ${tournament.name} trên hệ thống VNDC Sport. Đăng ký tham gia ngay!`;
        const imageUrl = tournament.bannerUrl || tournament.logoUrl || 'https://giaidau.vnvar.com/vndcsport.png';
        const canonicalUrl = `https://giaidau.vnvar.com/tournaments/${resolvedParams.id}`;

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
    }
  } catch (error) {
    console.error('Failed to generate metadata:', error);
  }

  return {
    title: 'Chi tiết giải đấu | VNDC Sport',
    description: 'Thông tin chi tiết và lịch thi đấu giải đấu thể thao trên hệ thống VNDC Sport.',
  };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://giaidau.vnvar.com/api/v1';

  let tournament = null;

  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${resolvedParams.id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (response.ok) {
      const res = await response.json();
      tournament = res.data ?? null;
    }
  } catch (error) {
    console.error('Failed to fetch tournament detail:', error);
  }

  const sportsEventSchema = tournament ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.name,
    description: tournament.description?.replace(/<[^>]*>?/gm, '').substring(0, 200) || tournament.name,
    startDate: tournament.startDate || tournament.createdAt,
    endDate: tournament.endDate || tournament.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
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
    image: [tournament.bannerUrl || tournament.logoUrl || 'https://giaidau.vnvar.com/vndcsport.png'],
    organizer: {
      '@type': 'Organization',
      name: 'VNDC Sport',
      url: 'https://giaidau.vnvar.com',
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
