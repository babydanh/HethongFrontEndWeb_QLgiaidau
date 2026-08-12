import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ matchId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const canonical = `/live/${resolvedParams.matchId}`;

  try {
    const response = await fetch(`${apiBaseUrl}/matches/${resolvedParams.matchId}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const res = await response.json();
      const match = res.data;
      if (match) {
        const team1 = match.participant1?.teamName || 'Chưa xác định';
        const team2 = match.participant2?.teamName || 'Chưa xác định';
        const tournamentName = match.tournament?.name || 'Giải đấu Sporto';
        const sportName = match.tournament?.category?.name || 'Thể thao';
        const title = `Trực tiếp: ${team1} vs ${team2} | ${tournamentName}`;
        const description = `Xem tỷ số trực tuyến và diễn biến trận đấu giữa ${team1} vs ${team2}, bộ môn ${sportName} trên Sporto.`;
        const imageUrl = match.tournament?.bannerUrl || 'https://giaidau.vnvar.com/sporto_v1\.svg';

        return {
          title,
          description,
          alternates: { canonical },
          openGraph: {
            title,
            description,
            url: canonical,
            images: [{ url: imageUrl }],
            type: 'video.other',
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
    console.error('Failed to generate metadata for live match:', error);
  }

  return {
    title: 'Trực tiếp trận đấu | Sporto',
    description: 'Bảng điểm và tỷ số trực tiếp các trận đấu thể thao trên Sporto.',
    alternates: { canonical },
  };
}

export default function LiveMatchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
