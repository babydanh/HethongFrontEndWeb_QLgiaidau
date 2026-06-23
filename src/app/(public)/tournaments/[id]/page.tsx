import { tournamentsApi } from '@/features/tournaments/api';
import TournamentDetailClient from './TournamentDetailClient';
import { notFound } from 'next/navigation';

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  let res;

  try {
    res = await tournamentsApi.getTournamentById(resolvedParams.id);
  } catch (error) {
    console.error('Failed to fetch tournament detail:', error);
    return notFound();
  }

  const tournament = res.data;

  if (!tournament) {
    return notFound();
  }

  return <TournamentDetailClient tournament={tournament} />;
}
