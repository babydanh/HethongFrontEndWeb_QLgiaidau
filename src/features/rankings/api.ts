import { api } from '@/lib/axios';

import { PlayerRanking, PaginatedRankings } from '@/types/ranking';
export type { PlayerRanking, PaginatedRankings };

export const rankingsApi = {
  getRankings: (params?: Record<string, unknown>) => api.get<PaginatedRankings>('/rankings', { params }),
  updateElo: (data: { matchId: string }) => api.post('/rankings/update-elo', data),
};
