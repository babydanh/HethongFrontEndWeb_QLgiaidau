import { Metadata } from 'next';
import { getTournament } from '../tournament-fetcher';
import JoinTeamClient from './JoinTeamClient';
import { stripHtmlAndNormalize } from '@/utils/string';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const id = resolvedParams.id;
  const pid = typeof resolvedSearchParams.pid === 'string' ? resolvedSearchParams.pid : null;
  const token = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : null;

  const tournament = await getTournament(id);
  
  let teamName = '';
  
  if (pid) {
    // Attempt to fetch participants to get team name
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://giaidau.vnvar.com/api/v1';
    try {
      const response = await fetch(`${baseUrl}/tournaments/${id}/participants`, {
        next: { revalidate: 60 }
      });
      if (response.ok) {
        const res = await response.json();
        const participants = res.data || [];
        const team = participants.find((p: any) => p.id === pid);
        if (team && team.teamName) {
          teamName = team.teamName;
        }
      }
    } catch (e) {
      console.error('Failed to fetch participants for metadata:', e);
    }
  }

  if (tournament) {
    const title = teamName 
      ? `Tham gia đội ${teamName} - ${tournament.name} | VNDC Sport`
      : `Mời tham gia đội - ${tournament.name} | VNDC Sport`;
      
    const cleanDesc = stripHtmlAndNormalize(tournament.description, 100);
    const description = teamName
      ? `Bạn được mời tham gia đội ${teamName} tại giải đấu ${tournament.name}. Nhấn vào link để xác nhận ngay!`
      : cleanDesc || `Thông tin chi tiết và lịch thi đấu giải đấu ${tournament.name} trên hệ thống VNDC Sport. Đăng ký tham gia ngay!`;
      
    const imageUrl = tournament.bannerUrl || tournament.logoUrl || 'https://giaidau.vnvar.com/vndcsport.png';
    const canonicalUrl = `https://giaidau.vnvar.com/tournaments/${id}/join-team${pid ? `?pid=${pid}&token=${token ?? ''}` : ''}`;

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
        siteName: 'VNDC Sport',
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

  const fallbackTitle = 'Mời tham gia đội thi đấu | VNDC Sport';
  const fallbackDesc = 'Bạn nhận được lời mời tham gia đội thi đấu giải đấu tại VNDC Sport. Nhấn để xem chi tiết và xác nhận!';
  const fallbackImage = 'https://giaidau.vnvar.com/vndcsport.png';

  return {
    title: fallbackTitle,
    description: fallbackDesc,
    openGraph: {
      title: fallbackTitle,
      description: fallbackDesc,
      url: `https://giaidau.vnvar.com/tournaments/${id}/join-team`,
      siteName: 'VNDC Sport',
      images: [{ url: fallbackImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fallbackTitle,
      description: fallbackDesc,
      images: [fallbackImage],
    },
  };
}

export default function JoinTeamPage(props: PageProps) {
  return <JoinTeamClient params={props.params} />;
}
