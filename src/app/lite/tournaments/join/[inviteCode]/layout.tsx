import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ inviteCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { inviteCode } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sporto.asia';
  const translate = await getTranslations('LiteJoinMetadata');

  try {
    const response = await fetch(
      `${apiUrl}/tournaments/lite/join/${encodeURIComponent(inviteCode)}`,
      { cache: 'no-store' },
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        data?: { tournament?: { name?: string; id?: string } };
      };
      const tournament = payload.data?.tournament;
      if (tournament?.name) {
        const title = translate('titleWithTournament', { tournament: tournament.name });
        const description = translate('descriptionWithTournament', { tournament: tournament.name });
        const url = `${siteUrl}/lite/tournaments/join/${encodeURIComponent(inviteCode)}`;
        return {
          title,
          description,
          alternates: { canonical: url },
          openGraph: { title, description, url, siteName: 'SportO', type: 'website' },
          twitter: { card: 'summary', title, description },
        };
      }
    }
  } catch {
    // Keep the page shareable with a safe fallback when the API is unavailable.
  }

  return {
    title: translate('fallbackTitle'),
    description: translate('fallbackDescription'),
  };
}

export default function LiteJoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
