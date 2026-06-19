export interface PlayerRanking {
  id: string;
  userId?: string;
  categoryId: string;
  categoryName?: string;
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
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
}

export interface EloHistoryLog {
  id: string;
  userId: string;
  matchId?: string;
  oldElo: number;
  newElo: number;
  changedPoints: number;
  reason?: string;
  createdAt: string;
  match?: {
    id: string;
    tournamentId: string;
    tournamentName?: string;
  };
}

export interface PaginatedRankings {
  data: PlayerRanking[];
  meta: {
    page: number;
    limit: number;
    total?: number;
  };
}
