import { Category } from './category';

export enum MatchTypeUI {
  MALE_SINGLES = 'MALE_SINGLES',
  FEMALE_SINGLES = 'FEMALE_SINGLES',
  MALE_DOUBLES = 'MALE_DOUBLES',
  FEMALE_DOUBLES = 'FEMALE_DOUBLES',
  MIXED_DOUBLES = 'MIXED_DOUBLES',
}

export enum MatchTypeDB {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES',
  MIXED_DOUBLES = 'MIXED_DOUBLES',
}

export enum GenderRestriction {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  MIXED = 'MIXED',
}

export interface ParentTournament {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  startDate?: string;
  endDate?: string;
  locationAddress?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  sportRules?: {
    setsToWin?: number;
    pointsPerSet?: number;
    winByTwo?: boolean;
  };
  status: 'DRAFT' | 'UPCOMING' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
  maxParticipants?: number;
  entryFee?: number;
  platformFeePerPlayer?: number;
  tournamentType?: 'CLUB' | 'PUBLIC';
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  communityId?: string | null;
  inviteCode?: string | null;
  visibility?: 'PUBLIC' | 'PRIVATE';
  genderRestriction?: 'MALE' | 'FEMALE' | 'MIXED' | null;
  venueId?: string | null;
  venue?: {
    id: string;
    name: string;
    locationAddress: string;
  } | null;
  currency: string;
  categoryId: string;
  logoUrl?: string | null;
  galleryImages?: string[];
  prizeDescription?: string | null;
  contactInfo?: {
    phone?: string;
    email?: string;
  } | null;
  category?: Category;
  organizerId: string;
  organizer?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    isTrusted?: boolean;
  };
  _count?: {
    participants: number;
    matches: number;
  };
  _summary?: {
    participantCount: number;
    matchesTotal: number;
    matchesCompleted: number;
    matchesLive: number;
  };
  parentId?: string | null;
  parent?: ParentTournament | null;
  divisions?: {
    id: string;
    name: string;
    matchType: string;
    genderRestriction?: string | null;
    status: string;
    categoryId: string;
  }[] | null;
  city?: string | null;
  tournamentConfig?: {
    bracketType?: string;
    maxTeams?: number;
    seedingMethod?: string;
    thirdPlaceMatch?: boolean;
  } | null;
}

export interface PaginatedTournaments {
  data: Tournament[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TournamentParticipant {
  id: string;
  teamName: string;
  seed: number | null;
  isPaid: boolean;
  registeredAt: string;
  teamInviteToken?: string | null;
  teamStatus?: 'PENDING' | 'COMPLETE' | 'WITHDRAWN';
  registeredBy: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  members: {
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    role: string;
    elo: {
      eloPoints: number;
      tierName: string;
    };
  }[];
}

export interface BracketMatch {
  id: string;
  roundNumber: number;
  matchOrder: number;
  bracketBranch: string;
  status: string;
  isBye: boolean;
  participant1: { id: string; teamName: string; seed: number | null } | null;
  participant2: { id: string; teamName: string; seed: number | null } | null;
  participant1Id?: string | null;
  participant2Id?: string | null;
  winnerId: string | null;
  scoreDetails?: Record<string, unknown>;
  p1SetsWon: number;
  p2SetsWon: number;
  nextMatchId?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  courtName?: string | null;
  groupId: string;
  group?: {
    name: string;
    stage?: {
      name: string;
    };
  } | null;
}

export interface BracketGroup {
  id: string;
  name: string;
  matches: BracketMatch[];
}

export interface BracketStage {
  id: string;
  name: string;
  type: string;
  order: number;
  groups: BracketGroup[];
  roundConfig?: {
    sets_to_win?: number;
    max_sets?: number;
    points_per_set?: number;
    deuce_enabled?: boolean;
    deuce_gap?: number;
    tiebreak_at?: number;
    scoring_type?: string;
    advance_count?: number;
    allow_player_choice_court?: boolean;
    time_limit_minutes?: number;
    custom_notes?: string;
  } | null;
  venueId?: string | null;
  scheduledDate?: string | null;
  notificationNote?: string | null;
  matchSettings?: {
    maxSets?: number;
    pointsPerSet?: number;
    winBy2Points?: boolean;
    maxDeucePoints?: number;
    superTiebreakEnabled?: boolean;
    superTiebreakSetIndex?: number;
    superTiebreakPoints?: number;
  } | null;
}
