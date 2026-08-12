import { Category } from './category';
export type { Category };
import { Tournament } from './tournament';
import { UserProfile } from './user';

export type SeriesStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type LegStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type TicketStatus = 'DIRECT_ENTRY' | 'WILDCARD' | 'IN_CONTENTION' | 'LOCKED_OUT' | 'NOT_QUALIFIED';
export type ExclusionScope = 'CATEGORY' | 'ALL';

export interface PsrPointConfig {
  pointsByRank: Record<number, number>;
  directEntryThreshold: number;
  wildcardCount: number;
  exclusionRule: boolean;
  exclusionScope: ExclusionScope;
  description: string;
}

export interface TournamentSeries {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  organizerId: string;
  status: SeriesStatus;
  startDate: string | null;
  endDate: string | null;
  totalPrize: number | null;
  rules: PsrPointConfig;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
  organizer?: UserProfile;
  _count?: {
    legs: number;
    events: number;
  };
}

export interface SeriesLeg {
  id: string;
  seriesId: string;
  name: string;
  order: number;
  startDate: string | null;
  endDate: string | null;
  status: LegStatus;
  directEntrySlots: number;
  wildcardSlots: number;
  rulesOverride: Partial<PsrPointConfig> | null;
  createdAt: string;
  events?: SeriesEvent[];
  _count?: { events: number };
}

export interface SeriesEvent {
  id: string;
  legId: string;
  tournamentId: string;
  region: string | null;
  order: number;
  pointMultiplier: number;
  createdAt: string;
  tournament?: Tournament;
}

export interface SeriesStanding {
  id: string;
  legId: string;
  userId: string;
  categoryId: string;
  totalPsrPoints: number;
  eventsPlayed: number;
  bestRank: number | null;
  directEntry: boolean;
  wildcardEntry: boolean;
  lockedOut: boolean;
  qualifiedEventId: string | null;
  updatedAt: string;
  user?: UserProfile;
  category?: Category;
  qualifiedEvent?: SeriesEvent;
  pointLogs?: PsrPointLog[];
}

export interface PsrPointLog {
  id: string;
  standingId: string;
  eventId: string;
  participantId: string;
  rankAchieved: number;
  basePoints: number;
  bonusPoints: number;
  multiplier: number;
  totalPoints: number;
  isDirectEntry: boolean;
  createdAt: string;
  event?: SeriesEvent;
}

export interface CreateSeriesDto {
  name: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  startDate?: string;
  endDate?: string;
  totalPrize?: number;
  rules: PsrPointConfig;
}

export interface UpdateSeriesDto extends Partial<CreateSeriesDto> {
  status?: SeriesStatus;
}

export interface CreateLegDto {
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
  directEntrySlots?: number;
  wildcardSlots?: number;
  rulesOverride?: Partial<PsrPointConfig>;
}

export interface LinkEventDto {
  tournamentId: string;
  region?: string;
  order: number;
  pointMultiplier?: number;
}

export interface QuerySeriesDto {
  status?: SeriesStatus;
  visibility?: 'PUBLIC' | 'PRIVATE';
  search?: string;
  page?: number;
  limit?: number;
  cursor?: string;
  organizerId?: string;
}

export interface QueryStandingsDto {
  legId: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

