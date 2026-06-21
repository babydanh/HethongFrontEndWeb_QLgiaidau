import { api } from '@/lib/axios';

import { Match, MatchScore } from '@/types/match';
export type { Match, MatchScore };

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export const matchesApi = {
  getMatches: (params?: Record<string, unknown>) => api.get<{ data: Match[]; meta: PaginationMeta }>('/matches', { params }),
  getMatchById: (id: string) => api.get<{ data: Match }>(`/matches/${id}`).then(res => res.data),
  updateScore: (
    id: string,
    scoreData: {
      p1SetsWon: number;
      p2SetsWon: number;
      scoreDetails: { sets: MatchScore[] };
      winnerId?: string | null;
    },
  ) =>
    api
      .patch<{ data: Match }>(`/matches/${id}/score`, scoreData)
      .then((res) => res.data),
  updateStatus: (
    id: string,
    statusData: {
      status: Match['status'];
    },
  ) =>
    api
      .patch<{ data: Match }>(`/matches/${id}/status`, statusData)
      .then((res) => res.data),
};
