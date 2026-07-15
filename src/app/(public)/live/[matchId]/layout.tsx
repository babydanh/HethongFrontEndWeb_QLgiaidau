import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ matchId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  try {
    const response = await fetch(`${baseUrl}/matches/${resolvedParams.matchId}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const res = await response.json();
      const match = res.data;
      if (match) {
        const team1 = match.participant1?.teamName || 'Chưa xác định';
        const team2 = match.participant2?.teamName || 'Chưa xác định';
        const tournamentName = match.tournament?.name || 'Giải đấu VNSPORT';
        const sportName = match.tournament?.category?.name || 'Thể thao';

        const title = `Trực tiếp: ${team1} vs ${team2} | ${tournamentName}`;
        const description = `Xem tỉ số trực tuyến và diễn biến trận đấu kịch tính giữa ${team1} vs ${team2} bộ môn ${sportName} trên hệ thống VNSPORT.`;
        const imageUrl = match.tournament?.bannerUrl || 'https://giaidau.vnvar.com/vndcsport.svg';

        return {
          title,
          description,
          openGraph: {
            title,
            description,
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
    title: 'Livestream Trận đấu trực tuyến | VNSPORT',
    description: 'Bảng điểm và tỉ số trực tiếp các trận đấu thể thao hấp dẫn trên hệ thống VNSPORT.',
  };
}

export default function LiveMatchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
