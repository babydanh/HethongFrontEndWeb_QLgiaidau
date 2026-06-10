import { api } from '@/lib/axios';

export interface PlayerRanking {
  id: string;
  userId: string;
  categoryId: string;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface PaginatedRankings {
  data: PlayerRanking[];
  meta: {
    page: number;
    limit: number;
    total?: number;
  };
}

export const rankingsApi = {
  getRankings: (params?: Record<string, unknown>) => api.get<PaginatedRankings>('/rankings', { params }).then(res => res.data),
  updateElo: (data: { matchId: string }) => api.post('/rankings/update-elo', data).then(res => res.data),
};
