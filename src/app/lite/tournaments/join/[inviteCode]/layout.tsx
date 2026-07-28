import type { Metadata } from 'next';

type Props = {
  params: Promise<{ inviteCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { inviteCode } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://giaidau.vnvar.com';

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
        const title = `Tham gia ${tournament.name} | VNDC Sport`;
        const description = `Tham gia giải đấu Lite ${tournament.name} trên VNDC Sport.`;
        const url = `${siteUrl}/lite/tournaments/join/${encodeURIComponent(inviteCode)}`;
        return {
          title,
          description,
          alternates: { canonical: url },
          openGraph: { title, description, url, siteName: 'VNDC Sport', type: 'website' },
          twitter: { card: 'summary', title, description },
        };
      }
    }
  } catch {
    // Keep the page shareable with a safe fallback when the API is unavailable.
  }

  return {
    title: 'Lời mời tham gia giải Lite | VNDC Sport',
    description: 'Mở lời mời để xem thông tin và tham gia giải đấu Lite trên VNDC Sport.',
  };
}

export default function LiteJoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
