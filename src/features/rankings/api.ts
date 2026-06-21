import { api } from '@/lib/axios';

import { PlayerRanking, PaginatedRankings, EloHistoryLog } from '@/types/ranking';
export type { PlayerRanking, PaginatedRankings, EloHistoryLog };

export const rankingsApi = {
  getRankings: (params?: Record<string, unknown>) => api.get<PaginatedRankings>('/rankings', { params }),
  updateElo: (data: { matchId: string }) => api.post('/rankings/update-elo', data),
  getUserRankings: (userId: string) => api.get<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] }>(`/rankings/user/${userId}`),
  getUserEloHistory: (userId: string, params?: Record<string, unknown>) => api.get<{ data: EloHistoryLog[]; meta: { page: number; limit: number } }>(`/rankings/user/${userId}/history`, { params }),
};

