import { api } from '@/lib/axios';
import type {
  ClubMatchParticipant,
  ClubMatchSession,
  ClubSessionMatch,
  CursorResponse,
} from '@/types/club-match-session';

export const clubMatchSessionsApi = {
  create: (payload: {
    communityId: string;
    name?: string;
    description?: string;
    registrationMode: 'SELF' | 'MANAGER_ASSIGN' | 'MIXED';
    isRanked: boolean;
    startAt?: string;
    endAt?: string;
  }) => api.post<ClubMatchSession>('/club-match-sessions', payload),
  list: (communityId: string) =>
    api.get<CursorResponse<ClubMatchSession>>('/club-match-sessions', {
      params: { communityId, limit: 50 },
    }),
  get: (id: string) => api.get<ClubMatchSession>(`/club-match-sessions/${id}`),
  transition: (id: string, action: 'CLOSE' | 'END' | 'CANCEL', version: number) =>
    api.post<ClubMatchSession>(`/club-match-sessions/${id}/transition`, { action, version }),
  participants: (id: string) =>
    api.get<CursorResponse<ClubMatchParticipant>>(`/club-match-sessions/${id}/participants`, { params: { limit: 50 } }),
  matches: (id: string) =>
    api.get<CursorResponse<ClubSessionMatch>>(`/club-match-sessions/${id}/matches`, { params: { limit: 50 } }),
  selfJoin: (id: string) => api.post(`/club-match-sessions/${id}/participants/self`),
  withdraw: (id: string) => api.post(`/club-match-sessions/${id}/participants/self/withdraw`),
  updatePreferences: (
    id: string,
    preferredPartnerUserIds: string[],
    preferredOpponentUserIds: string[],
    avoidUserIds: string[],
  ) => api.patch(`/club-match-sessions/${id}/preferences/me`, {
    preferredPartnerUserIds,
    preferredOpponentUserIds,
    avoidUserIds,
  }),
  forceParticipants: (id: string, userIds: string[], idempotencyKey: string) =>
    api.post(`/club-match-sessions/${id}/participants/force`, { userIds }, { headers: { 'Idempotency-Key': idempotencyKey } }),
  createMatch: (
    id: string,
    payload: { sideAUserIds: string[]; sideBUserIds: string[]; matchType: 'SINGLES' | 'DOUBLES'; confirmWarnings?: boolean },
    idempotencyKey: string,
  ) => api.post(`/club-match-sessions/${id}/matches`, payload, { headers: { 'Idempotency-Key': idempotencyKey } }),
  updateScore: (matchId: string, p1SetsWon: number, p2SetsWon: number, expectedRevision: number) =>
    api.patch<ClubSessionMatch>(`/club-match-sessions/matches/${matchId}/score`, { p1SetsWon, p2SetsWon, expectedRevision }),
  completeMatch: (matchId: string, p1SetsWon: number, p2SetsWon: number, expectedRevision: number) =>
    api.post<ClubSessionMatch>(`/club-match-sessions/matches/${matchId}/complete`, { p1SetsWon, p2SetsWon, expectedRevision }),
};
