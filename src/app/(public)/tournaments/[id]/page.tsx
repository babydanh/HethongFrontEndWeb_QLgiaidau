import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Metadata } from 'next';
import TournamentDetailClient from './TournamentDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

const REVALIDATE_SECONDS = 60;

/**
 * Fetch giải đấu kèm retry (tránh lỗi mạng thoáng qua).
 * Dùng next.revalidate thay vì cache:'no-store' để Data Cache giảm tải API -> tránh 429
 * khi generateMetadata + page cùng gọi (và nhiều request lặp lại).
 * Lưu ý: Next không cache fetch khi có header Cookie/Authorization -> với user đã đăng nhập
 * (giải PRIVATE) vẫn luôn lấy dữ liệu mới; với khách vãng lai (không Cookie) thì cache revalidate 60s.
 */
async function fetchTournamentWithRetry(url: string, init?: RequestInit) {
  const delays = [0, 350, 1000];
  let lastError: unknown;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
    try {
      const response = await fetch(url, { ...init, next: init?.next ?? { revalidate: REVALIDATE_SECONDS } });
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

/**
 * Chia sẻ kết quả fetch giữa generateMetadata() và page() trong cùng một request
 * thông qua React cache() -> chỉ gọi API 1 lần mỗi lần render server (tránh gọi trùng).
 * Đọc cookies ngay bên trong để đồng bộ args -> cache() dedupe được; Cookie chỉ gửi khi có
 * (khách vãng lai không kèm Cookie nên vẫn dùng được Data Cache).
 */
const getTournament = cache(async (id: string) => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://giaidau.vnvar.com/api/v1';

  try {
    const response = await fetchTournamentWithRetry(`${baseUrl}/tournaments/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!response.ok) return null;
    const res = await response.json();
    return res.data ?? null;
  } catch (error) {
    console.error('Failed to fetch tournament:', error);
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const tournament = await getTournament(resolvedParams.id);

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

  return {
    title: 'Chi tiết giải đấu | VNDC Sport',
    description: 'Thông tin chi tiết và lịch thi đấu giải đấu thể thao trên hệ thống VNDC Sport.',
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

export default async function TournamentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const tournament = await getTournament(resolvedParams.id);

  const sportsEventSchema = tournament ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.name,
    description: tournament.description?.replace(/<[^>]*>?/gm, '').substring(0, 200) || tournament.name,
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
