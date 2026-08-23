export interface PlayerRanking {
  id: string;
  userId?: string;
  categoryId: string;
  categoryName?: string;
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  genderRestriction?: 'MALE' | 'FEMALE' | 'MIXED' | null;
  eloPoints: number;
  peakElo?: number;
  shieldActive?: boolean;
  adminLeaderboardEligible?: boolean;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  currentStreakType?: 'WIN' | 'LOSS' | 'NONE';
  currentStreakCount?: number;
  updatedAt: string;
  tierName?: string;
  communityId?: string;
  communityName?: string;
  tier?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  user1?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  user2?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface EloHistoryLog {
  id: string;
  userId: string;
  categoryId: string;
  matchId?: string | null;
  previousElo: number;
  oldElo?: number;
  newElo: number;
  changedPoints: number;
  reason?: string | null;
  createdAt: string;
  match?: {
    id?: string;
    tournamentId?: string;
    tournamentName?: string;
    status?: string;
    completedAt?: string | null;
    p1SetsWon?: number;
    p2SetsWon?: number;
    scoreDetails?: Record<string, unknown> | null;
    result?: 'WIN' | 'LOSS' | 'DRAW';
    opponent?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface PaginatedRankings {
  data: PlayerRanking[];
  meta: {
    page: number;
    limit: number;
    total?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
}

