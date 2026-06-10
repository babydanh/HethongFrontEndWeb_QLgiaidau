export interface PlayerRanking {
  id: string;
  userId: string;
  categoryId: string;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
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
