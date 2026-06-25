export interface MatchScore {
  team1Score: number;
  team2Score: number;
  isFinished: boolean;
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
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  courtName?: string | null;
  participant1Id?: string | null;
  participant2Id?: string | null;
  participant1?: { id: string; teamName: string } | null;
  participant2?: { id: string; teamName: string } | null;
  winnerId?: string | null;
  scoreDetails?: Record<string, unknown> & {
    sets?: MatchScore[];
    specialResult?: {
      action?: string;
      reason?: string;
      decidedAt?: string;
      decidedBy?: string;
    };
  };
  p1SetsWon: number;
  p2SetsWon: number;
  refereeId?: string | null;
  tournament?: { id: string; name: string; createdBy?: string } | null;
}
