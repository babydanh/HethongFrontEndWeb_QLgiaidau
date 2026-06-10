export interface MatchScore {
  team1Score: number;
  team2Score: number;
  isFinished: boolean;
}

export interface Match {
  id: string;
  groupId: string;
  tournamentId: string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
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
  scoreDetails?: {
    sets?: MatchScore[];
  };
  p1SetsWon: number;
  p2SetsWon: number;
  refereeId?: string | null;
  tournament?: { id: string; name: string; createdBy?: string } | null;
}
