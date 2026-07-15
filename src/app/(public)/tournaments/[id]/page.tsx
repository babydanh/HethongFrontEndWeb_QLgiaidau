import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import TournamentDetailClient from './TournamentDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  
  try {
    const response = await fetch(`${baseUrl}/tournaments/${resolvedParams.id}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const res = await response.json();
      const tournament = res.data;
      if (tournament) {
        const title = `${tournament.name} | VNSPORT`;
        const description = tournament.description || `Thông tin chi tiết về giải đấu ${tournament.name} trên hệ thống VNSPORT. Đăng ký tham gia ngay!`;
        const imageUrl = tournament.bannerUrl || 'https://giaidau.vnvar.com/vndcsport.svg';

        return {
          title,
          description,
          openGraph: {
            title,
            description,
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
    title: 'Chi tiết giải đấu | VNSPORT',
    description: 'Thông tin chi tiết và lịch thi đấu giải đấu thể thao trên hệ thống VNSPORT.',
  };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  let tournament = null;

  try {
    const response = await fetch(`${baseUrl}/tournaments/${resolvedParams.id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`API returned ${response.status} for tournament ${resolvedParams.id}`);
    } else {
      const res = await response.json();
      tournament = res.data ?? null;
    }
  } catch (error) {
    console.error('Failed to fetch tournament detail:', error);
  }

  return <TournamentDetailClient tournamentId={resolvedParams.id} initialTournament={tournament} />;
}
