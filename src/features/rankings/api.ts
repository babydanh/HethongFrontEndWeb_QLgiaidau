import { api } from '@/lib/axios';

import { PlayerRanking, PaginatedRankings, EloHistoryLog } from '@/types/ranking';
export type { PlayerRanking, PaginatedRankings, EloHistoryLog };

export interface FootballTeamRanking {
  id: string;
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  eloPoints: number;
  peakElo?: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  tierId?: string | null;
  tierName?: string | null;
}

interface UserRankResponse {
  eloPoints?: number;
  tierName?: string;
  categoryId?: string;
}

export const rankingsApi = {
  getRankings: (params?: Record<string, unknown>) => api.get<PaginatedRankings>('/rankings', { params }),
  updateElo: (data: { matchId: string }) => api.post('/rankings/update-elo', data),
  getUserRankings: (userId: string) => api.get<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] }>(`/rankings/user/${userId}`),
  getUserEloHistory: (userId: string, params?: Record<string, unknown>) => api.get<{ data: EloHistoryLog[]; meta: { page: number; limit: number } }>(`/rankings/user/${userId}/history`, { params }),
  getUserRank: (userId: string, categoryId: string) => api.get<UserRankResponse>(`/rankings/user/${userId}/rank/${categoryId}`),
  getFootballTeamRankings: (params: { categoryId: string; communityId?: string; limit?: number; cursor?: string }) =>
    api.get<{ data: FootballTeamRanking[]; meta: { nextCursor?: string | null; hasMore?: boolean } }>('/rankings/football-teams', { params }),
};

