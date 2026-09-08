import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  ClubMatchParticipant,
  ClubMatchSession,
  ClubSessionMatch,
  CursorResponse,
} from '@/types/club-match-session';

type CursorQuery = { cursor?: string | null; limit?: number; status?: string };
export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type ClubMatchApiError = {
  statusCode?: number;
  code?: string;
  message?: string;
  warnings?: Array<{ code: string; userIds: string[] }>;
  currentRevision?: number;
};

export function unwrapClubMatchData<T>(response: ApiResponse<T>): T {
  return response.data;
}

export function unwrapClubMatchPage<T>(response: ApiResponse<T[]>): CursorResponse<T> {
  return {
    data: response.data ?? [],
    meta: {
      hasMore: response.meta?.hasMore === true,
      nextCursor: response.meta?.nextCursor ?? null,
    },
  };
}

export const clubMatchSessionsApi = {
  create: (payload: {
    communityId: string;
    name?: string;
    description?: string;
    registrationMode: 'SELF' | 'MANAGER_ASSIGN' | 'MIXED';
    isRanked: boolean;
    maxParticipants?: number;
    startAt?: string;
    endAt?: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    recurringDayOfWeek?: number;
    recurringDaysOfWeek?: number[];
    recurringTimeOfDay?: string;
    recurringAdvanceDays?: number;
  }) => api.post<ApiResponse<ClubMatchSession>>('/club-match-sessions', payload).then(unwrapClubMatchData),
  list: (communityId: string, query: CursorQuery = {}) =>
    api.get<ApiResponse<ClubMatchSession[]>>('/club-match-sessions', {
      params: { communityId, limit: query.limit ?? 20, cursor: query.cursor ?? undefined, status: query.status },
    }).then(unwrapClubMatchPage),
  get: (id: string) => api.get<ApiResponse<ClubMatchSession>>(`/club-match-sessions/${id}`).then(unwrapClubMatchData),
  transition: (id: string, action: 'CLOSE' | 'END' | 'CANCEL', version: number) =>
    api.post<ApiResponse<ClubMatchSession>>(`/club-match-sessions/${id}/transition`, { action, version }).then(unwrapClubMatchData),
  participants: (id: string, query: CursorQuery = {}) =>
    api.get<ApiResponse<ClubMatchParticipant[]>>(`/club-match-sessions/${id}/participants`, {
      params: { limit: query.limit ?? 30, cursor: query.cursor ?? undefined, status: query.status },
    }).then(unwrapClubMatchPage),
  matches: (id: string, query: CursorQuery = {}) =>
    api.get<ApiResponse<ClubSessionMatch[]>>(`/club-match-sessions/${id}/matches`, {
      params: { limit: query.limit ?? 30, cursor: query.cursor ?? undefined, status: query.status },
    }).then(unwrapClubMatchPage),
  standaloneMatches: (communityId: string, query: CursorQuery = {}) =>
    api.get<ApiResponse<ClubSessionMatch[]>>('/club-match-sessions/standalone-matches', {
      params: { communityId, limit: query.limit ?? 50, cursor: query.cursor ?? undefined, status: query.status },
    }).then(unwrapClubMatchPage),
  selfJoin: (id: string) => api.post<ApiResponse<ClubMatchParticipant>>(`/club-match-sessions/${id}/participants/self`).then(unwrapClubMatchData),
  withdraw: (id: string) => api.post<ApiResponse<ClubMatchParticipant>>(`/club-match-sessions/${id}/participants/self/withdraw`).then(unwrapClubMatchData),
  updatePreferences: (
    id: string,
    preferredPartnerUserIds: string[],
    preferredOpponentUserIds: string[],
    avoidUserIds: string[],
    version?: number,
  ) => api.patch<ApiResponse<ClubMatchSession['viewerPreferences']>>(`/club-match-sessions/${id}/preferences/me`, {
    preferredPartnerUserIds,
    preferredOpponentUserIds,
    avoidUserIds,
    version,
  }).then(unwrapClubMatchData),
  forceParticipants: (id: string, userIds: string[], idempotencyKey: string) =>
    api.post<ApiResponse<unknown>>(`/club-match-sessions/${id}/participants/force`, { userIds }, { headers: { 'Idempotency-Key': idempotencyKey } }).then(unwrapClubMatchData),
  removeParticipant: (id: string, userId: string, version: number) =>
    api.patch<ApiResponse<ClubMatchParticipant>>(`/club-match-sessions/${id}/participants/${userId}/remove`, { version }).then(unwrapClubMatchData),
  createMockParticipant: (id: string, name: string) =>
    api.post<ApiResponse<ClubMatchParticipant>>(`/club-match-sessions/${id}/participants/mock`, { name }).then(unwrapClubMatchData),
  createMatch: (
    id: string,
    payload: { sideAUserIds: string[]; sideBUserIds: string[]; matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES'; confirmWarnings?: boolean },
    idempotencyKey: string,
  ) => api.post<ApiResponse<{ match: ClubSessionMatch }>>(`/club-match-sessions/${id}/matches`, payload, { headers: { 'Idempotency-Key': idempotencyKey } }).then(unwrapClubMatchData),
  createStandaloneMatch: (
    payload: {
      communityId: string;
      sideAUserIds: string[];
      sideBUserIds: string[];
      matchType: 'SINGLES' | 'DOUBLES';
      isRanked: boolean;
      scheduledAt?: string;
    },
    idempotencyKey: string,
  ) => api.post<ApiResponse<{ match: ClubSessionMatch }>>('/club-match-sessions/standalone-matches', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  }).then(unwrapClubMatchData),
  deleteStandaloneMatch: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean; eloReverted?: boolean }>>(`/club-match-sessions/standalone-matches/${id}`).then(unwrapClubMatchData),
  updateScore: (match: ClubSessionMatch, p1SetsWon: number, p2SetsWon: number) =>
    api.patch<ApiResponse<ClubSessionMatch>>(`/club-match-sessions/matches/${match.id}/score`, {
      p1SetsWon,
      p2SetsWon,
      expectedRevision: match.revision,
      ...(match.scoreDetails !== undefined ? { scoreDetails: match.scoreDetails } : {}),
    }).then(unwrapClubMatchData),
  completeMatch: (match: ClubSessionMatch, p1SetsWon: number, p2SetsWon: number) =>
    api.post<ApiResponse<ClubSessionMatch>>(`/club-match-sessions/matches/${match.id}/complete`, {
      p1SetsWon,
      p2SetsWon,
      expectedRevision: match.revision,
      ...(match.scoreDetails !== undefined ? { scoreDetails: match.scoreDetails } : {}),
    }).then(unwrapClubMatchData),
};
