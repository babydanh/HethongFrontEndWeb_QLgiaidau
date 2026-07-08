import { cookies } from 'next/headers';
import TournamentDetailClient from './TournamentDetailClient';

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
