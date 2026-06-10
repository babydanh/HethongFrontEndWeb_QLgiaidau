import { api } from '@/lib/axios';

export interface MatchScore {
  team1Score: number;
  team2Score: number;
  isFinished: boolean;
}

export interface Match {
  id: string;
  tournamentId: string;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  roundNumber: number;
  scheduledTime?: string;
  courtName?: string;
  participant1Id?: string;
  participant2Id?: string;
  participant1?: { id: string; teamName: string };
  participant2?: { id: string; teamName: string };
  scoreConfig: Record<string, unknown>;
  scores: MatchScore[];
  tournament?: { id: string; name: string };
}

export const matchesApi = {
  getMatchById: (id: string) => api.get<{ data: Match }>(`/matches/${id}`).then(res => res.data.data),
};
