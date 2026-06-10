import { tournamentsApi } from '@/features/tournaments/api';
import TournamentDetailClient from './TournamentDetailClient';
import { notFound } from 'next/navigation';

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    // In Next.js App Router (especially > 15), params can be an async promise, but Next.js backwards compat usually allows synchronous.
    // However, it's safer to await params if migrating to latest Next.
    const resolvedParams = await params;
    const tournament = await tournamentsApi.getTournamentById(resolvedParams.id);
    
    if (!tournament) {
      return notFound();
    }

    return <TournamentDetailClient tournament={tournament} />;
  } catch (error) {
    console.error('Failed to fetch tournament detail:', error);
    return notFound();
  }
}
