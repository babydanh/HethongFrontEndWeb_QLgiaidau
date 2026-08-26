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

export type AdminRankingScope = 'PUBLIC';
export type AdminRankingStatus = 'VISIBLE' | 'HIDDEN' | 'BANNED';
export type AdminEloOperation = 'ADD' | 'SUBTRACT' | 'SET' | 'RESET' | 'HIDE' | 'BAN' | 'RESTORE';

export interface AdminRankingContext {
  contextId: string;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  categoryId: string;
  scope: AdminRankingScope;
  matchType: string;
  genderRestriction: string | null;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  peakElo: number;
  updatedAt: string;
  status: AdminRankingStatus;
  statusExpiresAt: string | null;
}

export interface AdminEloOperationPayload {
  operationKey: string;
  userId: string;
  categoryId: string;
  scope: AdminRankingScope;
  matchType: string;
  genderRestriction?: string;
  operation: AdminEloOperation;
  requestedValue?: number;
  reason: string;
  expiresAt?: string;
}

export interface AdminEloOperationResult {
  operationId: string;
  operation: AdminEloOperation;
  previousElo: number | null;
  newElo: number | null;
  changedPoints: number | null;
  status: AdminRankingStatus;
  leaderboardEligible: boolean;
}

export interface AdminEloOperationHistoryItem {
  id: string;
  operationKey: string;
  operation: AdminEloOperation;
  requestedValue: number | null;
  previousElo: number | null;
  newElo: number | null;
  changedPoints: number | null;
  previousStatus: AdminRankingStatus | null;
  newStatus: AdminRankingStatus | null;
  previousLeaderboardEligible: boolean | null;
  newLeaderboardEligible: boolean | null;
  reason: string;
  expiresAt: string | null;
  adminUserId: string;
  createdAt: string;
}

export interface AdminRankingContextQuery {
  limit?: number;
  search?: string;
  categoryId?: string;
  scope?: AdminRankingScope;
  matchType?: string;
  genderRestriction?: string;
  status?: AdminRankingStatus;
  minElo?: number;
  maxElo?: number;
  cursor?: string | null;
}

export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface AdminEloPlayerSummary {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  contextCount: number;
  publicContextCount: number;
  communityContextCount: number;
  visibleContextCount: number;
  hiddenContextCount: number;
  bannedContextCount: number;
  eligibleContextCount: number;
  ineligibleContextCount: number;
  highestElo: number | null;
  lastUpdatedAt: string | null;
}

export interface AdminEloPlayerPage {
  data: AdminEloPlayerSummary[];
  meta: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface AdminEloPairSummary {
  pairId: string;
  user1: { id: string; fullName: string | null; email: string; avatarUrl: string | null };
  user2: { id: string; fullName: string | null; email: string; avatarUrl: string | null };
  categoryId: string;
  categoryName: string;
  matchType: string;
  genderRestriction: string | null;
  eloPoints: number;
  peakElo: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  updatedAt: string;
}

export interface AdminEloPairPage {
  data: AdminEloPairSummary[];
  meta: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface AdminEloPlayerContextDetail {
  contextId: string;
  scope: AdminRankingScope;
  categoryId: string;
  matchType: string;
  genderRestriction: string | null;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  peakElo: number;
  tierName: string | null;
  status: AdminRankingStatus;
  statusExpiresAt: string | null;
  leaderboardEligible: boolean;
  adminBootstrapEligible: boolean;
  updatedAt: string;
}

export interface AdminEloRecentOperation {
  id: string;
  operation: AdminEloOperation;
  scope: AdminRankingScope;
  matchType: string;
  previousElo: number | null;
  newElo: number | null;
  changedPoints: number | null;
  previousStatus: AdminRankingStatus | null;
  newStatus: AdminRankingStatus | null;
  previousLeaderboardEligible: boolean | null;
  newLeaderboardEligible: boolean | null;
  reason: string;
  createdAt: string;
}

export interface AdminEloPlayerDetail {
  user: { id: string; email: string; fullName: string; avatarUrl: string | null };
  category: { id: string; name: string; slug: string };
  contexts: AdminEloPlayerContextDetail[];
  recentOperations: AdminEloRecentOperation[];
}

export interface AdminRankingContextPage {
  data: AdminRankingContext[];
  meta: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface AdminEloHistoryPage {
  data: AdminEloOperationHistoryItem[];
  meta: { limit: number; hasMore: boolean; nextCursor: string | null };
}

interface UserRankResponse {
  eloPoints?: number;
  tierName?: string;
  categoryId?: string;
}

export const rankingsApi = {
  getRankings: (params?: Record<string, unknown>) => api.get<PaginatedRankings>('/rankings', { params }),
  updateElo: (data: { matchId: string }) => api.post('/rankings/update-elo', data),
  getUserRankings: (userId: string) =>
    api
      .get<ApiEnvelope<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] }>>(`/rankings/user/${userId}`)
      .then((response) => response.data),
  getUserEloHistory: (userId: string, params?: Record<string, unknown>) => api.get<{ data: EloHistoryLog[]; meta: { page: number; limit: number } }>(`/rankings/user/${userId}/history`, { params }),
  getUserRank: (userId: string, categoryId: string) => api.get<UserRankResponse>(`/rankings/user/${userId}/rank/${categoryId}`),
  getFootballTeamRankings: (params: { categoryId: string; communityId?: string; limit?: number; cursor?: string }) =>
    api.get<{ data: FootballTeamRanking[]; meta: { nextCursor?: string | null; hasMore?: boolean } }>('/rankings/football-teams', { params }),
  listAdminContexts: (params: AdminRankingContextQuery = {}) =>
    api.get<ApiEnvelope<AdminRankingContextPage>>('/rankings/admin/contexts', { params }),
  listAdminPlayers: (params: { limit?: number; categoryId: string; search?: string; scope?: AdminRankingScope; matchType?: string; status?: AdminRankingStatus; cursor?: string | null }) =>
    api.get<ApiEnvelope<AdminEloPlayerPage>>('/rankings/admin/players', { params }),
  listAdminPairs: (params: { limit?: number; categoryId: string; search?: string; scope?: AdminRankingScope; matchType?: string; genderRestriction?: string; minElo?: number; maxElo?: number; cursor?: string | null }) =>
    api.get<ApiEnvelope<AdminEloPairPage>>('/rankings/admin/pairs', { params }),
  getAdminPlayerDetail: (userId: string, categoryId: string) =>
    api.get<ApiEnvelope<AdminEloPlayerDetail>>(`/rankings/admin/players/${userId}/detail`, { params: { categoryId } }),
  applyAdminOperation: (payload: AdminEloOperationPayload) =>
    api.post<ApiEnvelope<AdminEloOperationResult>>('/rankings/admin/operations', payload),
  getAdminHistory: (contextId: string, limit = 50, cursor?: string | null) =>
    api.get<ApiEnvelope<AdminEloHistoryPage>>(`/rankings/admin/contexts/${contextId}/history`, { params: { limit, cursor: cursor || undefined } }),
};

