import type { Match, MatchScore, PickleballSideOutState } from '@/types/match';

export interface OpsReferee {
  id: string;
  userId: string;
  status: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface OpsActivityItem {
  id: string;
  tournamentId: string;
  createdAt: string;
  actor: string;
  entityType: 'PARTICIPANT' | 'MATCH';
  entityId: string;
  action: string;
  title: string;
  detail: string;
}

export interface OpsAuditLogResponse {
  id: string;
  userId: string | null;
  action: string;
  tableName: string;
  recordId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  user: {
    email: string | null;
    fullName: string | null;
  } | null;
}

export interface MatchScheduleInput {
  courtName?: string | null;
  courtAddress?: string | null;
  refereeId?: string | null;
  scheduledAt?: string | null;
}

export interface MatchScoreInput {
  p1SetsWon: number;
  p2SetsWon: number;
  sets: MatchScore[];
  sideOutState?: PickleballSideOutState;
  overrideReason?: string;
}

export type MatchOperationAction =
  | 'WALKOVER'
  | 'RETIREMENT'
  | 'DISQUALIFICATION'
  | 'OVERRIDE_RESULT';

export interface MatchOperationInput {
  action: MatchOperationAction;
  reason: string;
  winnerId: string;
}

export interface MatchStatusOption {
  value: Match['status'];
  label: string;
}

