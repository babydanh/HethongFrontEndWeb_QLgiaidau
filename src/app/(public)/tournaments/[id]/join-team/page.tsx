import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
  const translate = await getTranslations('TournamentInviteJoin');
  const pid = typeof resolvedSearchParams.pid === 'string' ? resolvedSearchParams.pid : null;
  const token = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : null;

  const baseUrl = process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';

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
      ? translate('metaTitleWithTeam', { team: teamName, tournament: tournament.name })
      : translate('metaTitleWithoutTeam', { tournament: tournament.name });

    const cleanDesc = stripHtmlAndNormalize(tournament.description, 100);
    const description = teamName
      ? translate('metaDescriptionWithTeam', { team: teamName, tournament: tournament.name })
      : cleanDesc || translate('metaDescriptionFallback', { tournament: tournament.name });
      
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
        siteName: 'SportO',
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

  const fallbackTitle = translate('metaFallbackTitle');
  const fallbackDesc = translate('metaFallbackDescription');
  const fallbackImage = 'https://sporto.asia/sporto_v1.svg';

  return {
    title: fallbackTitle,
    description: fallbackDesc,
    openGraph: {
      title: fallbackTitle,
      description: fallbackDesc,
      url: `https://sporto.asia/tournaments/${id}/join-team`,
      siteName: 'SportO',
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
