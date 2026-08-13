import { Metadata } from 'next';
import { getTournament } from '../tournament-fetcher';
import JoinTeamClient from './JoinTeamClient';
import { stripHtmlAndNormalize } from '@/utils/string';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface ParticipantItem {
  id: string;
  teamName?: string;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const id = resolvedParams.id;
  const pid = typeof resolvedSearchParams.pid === 'string' ? resolvedSearchParams.pid : null;
  const token = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : null;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';

  const [tournament, participantsData] = await Promise.all([
    getTournament(id),
    pid
      ? fetch(`${baseUrl}/tournaments/${id}/participants`, { next: { revalidate: 60 } })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  
  let teamName = '';
  if (participantsData?.data && Array.isArray(participantsData.data)) {
    const participants: ParticipantItem[] = participantsData.data;
    const team = participants.find((p) => p.id === pid);
    if (team && team.teamName) {
      teamName = team.teamName;
    }
  }

  if (tournament) {
    const title = teamName 
      ? `Tham gia đội ${teamName} - ${tournament.name} | Sporto`
      : `Mời tham gia đội - ${tournament.name} | Sporto`;
      
    const cleanDesc = stripHtmlAndNormalize(tournament.description, 100);
    const description = teamName
      ? `Bạn được mời tham gia đội ${teamName} tại giải đấu ${tournament.name}. Nhấn vào link để xác nhận ngay!`
      : cleanDesc || `Thông tin chi tiết và lịch thi đấu giải đấu ${tournament.name} trên hệ thống Sporto. Đăng ký tham gia ngay!`;
      
    const imageUrl = tournament.bannerUrl || tournament.logoUrl || 'https://sporto.asia/sporto_v1.svg';
    const canonicalUrl = `https://sporto.asia/tournaments/${id}/join-team${pid ? `?pid=${pid}&token=${token ?? ''}` : ''}`;

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
        siteName: 'Sporto',
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

  const fallbackTitle = 'Mời tham gia đội thi đấu | Sporto';
  const fallbackDesc = 'Bạn nhận được lời mời tham gia đội thi đấu giải đấu tại Sporto. Nhấn để xem chi tiết và xác nhận!';
  const fallbackImage = 'https://sporto.asia/sporto_v1.svg';

  return {
    title: fallbackTitle,
    description: fallbackDesc,
    openGraph: {
      title: fallbackTitle,
      description: fallbackDesc,
      url: `https://sporto.asia/tournaments/${id}/join-team`,
      siteName: 'Sporto',
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
