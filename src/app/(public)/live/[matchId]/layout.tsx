import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ matchId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const translate = await getTranslations('LiveMatch');
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
        const team1 = match.participant1?.teamName || translate('unknown');
        const team2 = match.participant2?.teamName || translate('unknown');
        const tournamentName = match.tournament?.name || translate('tournamentFallback');
        const sportName = match.tournament?.category?.name || translate('sportFallback');
        const title = translate('matchTitle', { team1, team2, tournamentName });
        const description = translate('matchDescription', { team1, team2, sportName });
        const imageUrl = match.tournament?.bannerUrl || 'https://sporto.asia/sporto_v1.svg';

        return {
          title,
          description,
          alternates: { canonical },
          robots: { index: false, follow: true },
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
    title: translate('defaultTitle'),
    description: translate('defaultDescription'),
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}

export default function LiveMatchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
