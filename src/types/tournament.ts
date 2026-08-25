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

export type SportRuleKind =
  | 'BADMINTON'
  | 'TABLE_TENNIS'
  | 'PICKLEBALL_RALLY'
  | 'PICKLEBALL_SIDE_OUT'
  | 'TENNIS'
  | 'FOOTBALL';
export type SportScoringModel = 'RALLY_POINT_SET' | 'TENNIS_SET' | 'PICKLEBALL_SIDE_OUT';

export interface SportRuleScoringConfig {
  mode?: 'LITE' | 'STRICT';
  kind?: SportRuleKind;
  scoringModel?: SportScoringModel;
  setsToWin?: number;
  sets_to_win?: number;
  pointsPerSet?: number;
  points_per_set?: number;
  winByTwo?: boolean;
  mustWinByTwo?: boolean;
  deuceEnabled?: boolean;
  deuce_enabled?: boolean;
  tiebreakAt?: number;
  tiebreak_at?: number;
  tiebreakPoints?: number;
  tiebreak_points?: number;
  maxPoints?: number;
  max_points?: number;
  maxPointsPerSet?: number;
  maxDeucePoints?: number | null;
  superTiebreakEnabled?: boolean;
  superTiebreakSetIndex?: number | null;
  superTiebreakPoints?: number | null;
  [key: string]: unknown;
}

export interface SportRulesEnvelope extends SportRuleScoringConfig {
  version?: number;
  kind?: SportRuleKind;
  scoringModel?: SportScoringModel;
  format?: Record<string, unknown>;
  scoring?: SportRuleScoringConfig;
}

export interface StageRoundRuleConfig extends SportRuleScoringConfig {
  venue_id?: string | null;
  scheduled_date?: string | null;
  custom_notes?: string | null;
}

export interface StageRoundConfig extends SportRuleScoringConfig {
  roundsToPlay?: number;
  rounds_to_play?: number;
  max_sets?: number;
  deuce_gap?: number;
  scoring_type?: string;
  advance_count?: number;
  allow_player_choice_court?: boolean;
  time_limit_minutes?: number;
  custom_notes?: string | null;
  rounds?: Record<string, StageRoundRuleConfig>;
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
  city?: string | null;
  locationAddress?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  sportRules?: SportRulesEnvelope;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PENDING_DELETE' | 'UPCOMING' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT';
  maxParticipants?: number;
  entryFee?: number;
  platformFeePercentage?: string;
  platformFeeThreshold?: string;
  platformFeeFixedAmount?: string;
  platformFeePerPlayer?: number;
  tournamentType?: 'CLUB' | 'PUBLIC';
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  communityId?: string | null;
  inviteCode?: string | null;
  visibility?: 'PUBLIC' | 'PRIVATE';
  genderRestriction?: 'MALE' | 'FEMALE' | 'MIXED' | null;
  venueId?: string | null;
  isRanked?: boolean;
  isRegistrationLocked?: boolean;
  isLite?: boolean;
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
    [key: string]: string | undefined;
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
    _count?: {
      participants: number;
      matches: number;
    };
    maxParticipants?: number;
    inviteCode?: string | null;
  }[] | null;
  tournamentConfig?: {
    isLite?: boolean;
    mode?: 'LITE' | 'ADVANCED' | 'STRICT';
    bracketType?: string;
    maxTeams?: number;
    seedingMethod?: 'ELO' | 'RANDOM' | 'MANUAL';
    thirdPlaceMatch?: boolean;
    minElo?: number | null;
    maxElo?: number | null;
    maxCombinedElo?: number | null;
    maxTeammateGap?: number | null;
    registrationMode?: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
    registrationForm?: {
      version: 1;
      status: 'DRAFT' | 'PUBLISHED';
      fields: Array<Record<string, unknown>>;
      divisionIds: string[];
    };
    hideFeaturedCardText?: boolean;
    // Team sport (bóng đá)
    teamSize?: 5 | 7 | 11;
    teamSizeOptions?: Array<5 | 7 | 11>;
    minTeamSize?: number;
    maxTeamSize?: number;
    maxReserve?: number;
    location?: {
      venueName?: string;
      address?: string;
      province?: string;
      district?: string;
      ward?: string;
      display?: string;
    };
    twoLegged?: boolean;
    awayGoalsRule?: boolean;
    penaltyShootout?: boolean;
    allowDraw?: boolean;
    recurring?: {
      enabled?: boolean;
      frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | string;
      dayOfWeek?: number;
      daysOfWeek?: number[];
      time?: string;
      [key: string]: unknown;
    };
  } | null;
  /** Normalized by GET /tournaments/public for banner rendering. */
  hideFeaturedCardText?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupStageKnockoutConfig {
  groupsConfig: {
    numGroups: number;
    teamsPerGroup: number;
    roundsToPlay: number;
  };
  advancementConfig: {
    teamsAdvancing: number;
    allowWildcardThird: boolean;
    wildcardTeamsAdvancing: number;
  };
  playoffConfig: {
    type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
    seedingType: 'SEEDED' | 'RANDOM';
  };
  scoring: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
  };
  tiebreakerRules: {
    primary: 'H2H_POINTS' | 'SET_DIFF' | 'POINT_DIFF';
    secondary: string[];
  };
}

export interface PaginatedTournaments {
  data: Tournament[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
}

export interface TournamentParticipant {
  id: string;
  teamName: string;
  footballTeamId?: string | null;
  footballTeamLogoUrl?: string | null;
  rosterLockedAt?: string | null;
  seed: number | null;
  isPaid: boolean;
  eloPoints?: number;
  isWildcard?: boolean;
  tournamentDivisionId?: string | null;
  registeredAt: string;
  customResponses?: Record<string, unknown> | null;
  payment?: {
    id: string;
    amount: string;
    status: string;
    paymentGateway?: string | null;
    transactionReference?: string | null;
    providerTransactionId?: string | null;
    providerOrderCode?: string | null;
    paidAt?: string | null;
    receiptNumber?: string | null;
    currency?: string | null;
  } | null;
  partnerInviteExpiresAt?: string | null;
  teamInviteToken?: string | null;
  teamStatus?:
    | 'PENDING'
    | 'PENDING_APPROVAL'
    | 'PENDING_PARTNER'
    | 'WAITLISTED'
    | 'COMPLETE'
    | 'REJECTED'
    | 'WITHDRAWN'
    | 'KICKED'
    | 'NO_SHOW'
    | 'DISQUALIFIED'
    | 'REPLACED'
    | 'EXPIRED';
  registeredBy: {
    id: string;
    email?: string | null;
    phoneNumber?: string | null;
    gender?: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  members: {
    userId: string;
    email?: string | null;
    phoneNumber?: string | null;
    gender?: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    role: string;
    isMock?: boolean;
    elo: {
      eloPoints: number;
      tierName: string;
    };
  }[];
}

/** A football registration grouped by the stable team/division identity. */
export interface FootballRegistrationGroup {
  key: string;
  footballTeamId: string;
  teamName: string;
  logoUrl?: string | null;
  divisionName: string;
  participants: TournamentParticipant[];
}

export interface BracketMatch {
  id: string;
  roundNumber: number;
  /** Round-robin leg or two-legged knockout leg persisted by the backend. */
  leg?: number | null;
  matchOrder: number;
  bracketBranch: string;
  status: string;
  isBye: boolean;
  participant1: { id: string; teamName: string; seed: number | null; logoUrl?: string | null; members?: { userId: string; fullName: string | null; avatarUrl?: string | null }[] } | null;
  participant2: { id: string; teamName: string; seed: number | null; logoUrl?: string | null; members?: { userId: string; fullName: string | null; avatarUrl?: string | null }[] } | null;
  participant1Id?: string | null;
  participant2Id?: string | null;
  winnerId: string | null;
  tournamentId?: string;
  scoreDetails?: Record<string, unknown>;
  p1SetsWon: number;
  p2SetsWon: number;
  nextMatchId?: string | null;
  loserNextMatchId?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  courtName?: string | null;
  courtAddress?: string | null;
  cheerCount?: number;
  refereeId?: string | null;
  refereeName?: string | null;
  groupId: string;
  matchConfig?: SportRuleScoringConfig | null;
  stage?: {
    name: string;
    type?: string | null;
    roundConfig?: StageRoundConfig | null;
  } | null;
  group?: {
    id?: string | null;
    name: string;
    stage?: {
      name: string;
      type?: string | null;
      roundConfig?: StageRoundConfig | null;
    };
  } | null;
  tournament?: {
    name: string;
    venueName?: string | null;
    venueAddress?: string | null;
  } | null;
}

// --- Lite pairing types ---

export interface LiteParticipant {
  id: string;
  teamName: string;
  teamStatus: 'PENDING_PARTNER' | 'COMPLETE' | 'PENDING_APPROVAL' | 'WITHDRAWN';
  isPaid: boolean;
  teamInviteToken?: string | null;
  rosters: {
    userId: string;
    role: string;
    profile: {
      fullName: string | null;
      avatarUrl: string | null;
    } | null;
  }[];
}

export interface LiteGeneratePairsResponse {
  message: string;
  paired: Array<{
    participant1Id: string;
    participant2Id: string;
    teamName: string;
  }>;
  unpairedParticipantIds: string[];
  strategy: 'RANDOM' | 'ELO_BALANCED';
}

export interface LiteUnpairResponse {
  leader: LiteParticipant;
  partner: LiteParticipant;
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
  roundConfig?: StageRoundConfig | null;
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

