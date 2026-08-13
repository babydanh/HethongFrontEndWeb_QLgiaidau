import type { SportRuleScoringConfig, SportRulesEnvelope, StageRoundConfig } from './tournament';

export interface MatchScore {
  team1Score: number;
  team2Score: number;
  isFinished: boolean;
  scoreOverride?: {
    reason: string;
    decidedAt?: string;
    decidedBy?: string;
  };
}

export interface PickleballSideOutState {
  servingTeam: 1 | 2 | null;
  serverNumber: 1 | 2;
  openingSequenceDone: boolean;
}

export type TennisPointLabel = '0' | '15' | '30' | '40' | 'A';

export interface TennisLivePointState {
  mode: 'standard' | 'tiebreak';
  team1Point: TennisPointLabel | number;
  team2Point: TennisPointLabel | number;
}

export interface MatchPenaltyRecord {
  id: string;
  team: 1 | 2 | null;
  kind: string;
  label: string;
  note?: string;
  createdAt: string;
}

export interface MatchComment {
  id: string;
  matchId: string;
  commentText: string;
  createdAt: string;
  user: {
    id?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface Match {
  id: string;
  groupId: string;
  tournamentId: string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  roundNumber: number;
  matchOrder: number;
  bracketBranch: string;
  isBye: boolean;
  cheerCount?: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
  courtName?: string | null;
  participant1Id?: string | null;
  participant2Id?: string | null;
  participant1?: { id: string; teamName: string; members?: { userId?: string; fullName?: string | null; avatarUrl?: string | null }[] } | null;
  participant2?: { id: string; teamName: string; members?: { userId?: string; fullName?: string | null; avatarUrl?: string | null }[] } | null;
  winnerId?: string | null;
  matchConfig?: SportRuleScoringConfig | null;
  scoreDetails?: Record<string, unknown> & {
    sets?: MatchScore[];
    sideOutState?: PickleballSideOutState;
    liveState?: {
      tennisPointState?: TennisLivePointState;
    };
    penalties?: MatchPenaltyRecord[];
    scoreOverride?: {
      reason?: string;
      decidedAt?: string;
      decidedBy?: string;
    };
    specialResult?: {
      action?: string;
      reason?: string;
      decidedAt?: string;
      decidedBy?: string;
    };
  };
  p1SetsWon: number;
  p2SetsWon: number;
  revision?: number;
  refereeId?: string | null;
  refereeName?: string | null;
  tournament?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    createdBy?: string;
    sportRules?: SportRulesEnvelope | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    venueName?: string | null;
    categoryConfig?: Record<string, unknown> | null;
    tournamentConfig?: { mode?: 'LITE' | 'ADVANCED' } | null;
  } | null;
  group?: {
    id: string;
    name: string;
    roundConfig?: Record<string, unknown> | null;
    stage?: {
      name: string;
      type?: string;
      roundConfig?: StageRoundConfig | null;
    } | null;
  } | null;
  stage?: {
    type?: string;
    roundConfig?: StageRoundConfig | null;
  } | null;
}

