import { api } from '@/lib/axios';

import { Match, MatchComment, MatchScore } from '@/types/match';
import type { MatchOperationInput } from '@/features/organizer/ops/types';
export type { Match, MatchComment, MatchScore };

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
      scoreDetails: Record<string, unknown>;
      winnerId?: string | null;
      overrideReason?: string;
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
  applyOperation: (id: string, operationData: MatchOperationInput) =>
    api
      .patch<{ data: Match }>(`/matches/${id}/operation`, operationData)
      .then((res) => res.data),
  getComments: (id: string) =>
    api.get<{ data: MatchComment[] }>(`/matches/${id}/comments`).then((res) => res.data),
  createComment: (id: string, payload: { commentText: string }) =>
    api.post<{ data: MatchComment }>(`/matches/${id}/comments`, payload).then((res) => res.data),
};
