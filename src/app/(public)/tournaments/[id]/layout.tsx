import type { Metadata } from 'next';
import { stripHtmlAndNormalize } from '@/utils/string';
import { getTournament } from './tournament-fetcher';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const tournament = await getTournament(resolvedParams.id);

  if (tournament) {
    const title = `${tournament.name} | Sporto`;
    const cleanDesc = stripHtmlAndNormalize(tournament.description, 160);
    const description = cleanDesc || `Thông tin chi tiết và lịch thi đấu giải đấu ${tournament.name} trên hệ thống Sporto. Đăng ký tham gia ngay!`;
    const imageUrl = tournament.bannerUrl || tournament.logoUrl || 'https://giaidau.vnvar.com/sporto_v1\.svg';

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
    title: 'Chi tiết giải đấu | Sporto',
    description: 'Thông tin chi tiết và lịch thi đấu giải đấu thể thao trên hệ thống Sporto.',
  };
}

export default function TournamentLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
