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
  maxParticipants: number;
  startAt: string | null;
  endAt: string | null;
  isRecurring?: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | null;
  recurringDayOfWeek?: number | null;
  recurringDaysOfWeek?: number[] | null;
  recurringTimeOfDay?: string | null;
  recurringAdvanceDays?: number | null;
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
  category?: {
    id: string;
    name: string;
    slug: string;
    config?: Record<string, unknown> | null;
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
  isMock?: boolean;
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
  participant1: { id: 'SIDE_A'; members: Array<{ id: string; userId?: string; fullName: string | null; avatarUrl?: string | null; isMock?: boolean }> };
  participant2: { id: 'SIDE_B'; members: Array<{ id: string; userId?: string; fullName: string | null; avatarUrl?: string | null; isMock?: boolean }> };
}

export interface CursorResponse<T> {
  data: T[];
  meta: { hasMore: boolean; nextCursor: string | null };
}
