export type ClubMatchSessionStatus = 'OPEN' | 'LIVE' | 'CLOSED' | 'ENDED' | 'CANCELLED';
export type ClubMatchRegistrationMode = 'SELF' | 'MANAGER_ASSIGN' | 'MIXED';

export interface ClubMatchSession {
  id: string;
  communityId: string;
  categoryId: string;
  name: string | null;
  resolvedName: string;
  description: string | null;
  status: ClubMatchSessionStatus;
  registrationMode: ClubMatchRegistrationMode;
  pairingMode: 'FREE';
  isRanked: boolean;
  startAt: string | null;
  endAt: string | null;
  version: number;
  participantCount?: number;
  matchCount?: number;
  capabilities?: {
    canManage?: boolean;
    canJoin?: boolean;
    canWithdraw?: boolean;
    canCreateMatch?: boolean;
  };
  viewerParticipant?: ClubMatchParticipant['participant'] | null;
  viewerPreferences?: {
    preferredPartnerUserIds: string[];
    preferredOpponentUserIds: string[];
    avoidUserIds: string[];
    version: number;
  } | null;
}

export interface ClubMatchParticipant {
  participant: {
    id: string;
    userId: string;
    source: 'SELF' | 'MANDATORY';
    status: 'ACTIVE' | 'WITHDRAWN' | 'KICKED';
    version: number;
  };
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ClubSessionMatch {
  id: string;
  clubMatchSessionId: string;
  contextType: 'CLUB_SOCIAL_MATCH_SESSION';
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  p1SetsWon: number;
  p2SetsWon: number;
  revision: number;
  eloStatus: string;
  eloDelta?: Record<string, number> | null;
  scoreDetails?: Record<string, unknown>;
  sideAUserIds: string[];
  sideBUserIds: string[];
  participant1: { id: 'SIDE_A'; members: Array<{ id: string; fullName: string | null }> };
  participant2: { id: 'SIDE_B'; members: Array<{ id: string; fullName: string | null }> };
}

export interface CursorResponse<T> {
  data: T[];
  meta: { hasMore: boolean; nextCursor: string | null };
}
