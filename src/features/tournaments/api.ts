import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { Tournament, ParentTournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch, MatchTypeUI, MatchTypeDB, GenderRestriction } from '@/types/tournament';
import { ApiResponse } from '@/types/api';

export interface Division {
  id: string;
  name: string;
  matchType: MatchTypeDB;
  genderRestriction?: GenderRestriction | null;
  status: string;
  categoryId?: string;
  maxParticipants?: number;
  entryFee?: number;
  isConfigOverride?: boolean;
  venueId?: string | null;
  bracketType?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | null;
  roundConfig?: {
    setsToWin?: number;
    pointsPerSet?: number;
    winByTwo?: boolean;
    [key: string]: unknown;
  } | null;
  startDate?: string | null;
  registrationEndDate?: string | null;
  minElo?: number | null;
  maxElo?: number | null;
  prizeDescription?: string | null;
  inviteCode?: string | null;
  _count?: {
    participants: number;
    matches: number;
  };
}

export interface CreateDivisionInput {
  name: string;
  matchType: MatchTypeDB;
  genderRestriction?: GenderRestriction | null;
  maxParticipants?: number | null;
  entryFee?: number;
  isConfigOverride?: boolean;
  venueId?: string | null;
  bracketType?: Division['bracketType'];
  roundConfig?: Division['roundConfig'];
  startDate?: string | null;
  registrationEndDate?: string | null;
  minElo?: number | null;
  maxElo?: number | null;
  prizeDescription?: string | null;
}

export type UpdateDivisionInput = Partial<Omit<CreateDivisionInput, 'tournamentId'>>;

export type { Category, Tournament, ParentTournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch };
export { MatchTypeUI, MatchTypeDB, GenderRestriction };

export interface TournamentFeesConfig {
  feePublicRanked: number;
  feePublicUnranked: number;
  feeClub: number;
  pctPublicRanked: number;
  pctPublicUnranked: number;
  pctClub: number;
}

export interface RoundConfigPayload {
  roundNumber: number;
  format: 'BO1' | 'BO3' | 'BO5';
  wildcardSlots?: number;
  config?: Record<string, unknown>;
}

export interface GuestRegistrationPayload {
  teamName: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  divisionId?: string;
  partnerFullName?: string;
}

export interface MockPaymentPayload {
  organizationId: string;
  amount: number;
  description?: string;
  method?: 'BANK_TRANSFER' | 'E_WALLET' | 'CASH';
}

export interface RegisterTournamentPayload {
  teamName: string;
  memberIds?: string[];
  partnerEmailOrPhone?: string;
  inviteCode?: string;
  divisionId?: string;
  tournamentDivisionId?: string;
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export const tournamentsApi = {
  getFeesConfig: () => api.get<ApiResponse<TournamentFeesConfig>>('/tournaments/fees'),
  getTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments', { params }),
  getPublicTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments/public', { params }),
  getMyTournaments: () => api.get<ApiResponse<Tournament[]>>('/tournaments/my'),
  getTournamentById: (id: string, params?: Record<string, unknown>) => api.get<ApiResponse<Tournament>>(`/tournaments/${id}`, { params }),
  getTournamentByInviteCode: (inviteCode: string) => api.get<ApiResponse<Tournament>>(`/tournaments/join/${inviteCode}`),
  joinTournamentByInviteCode: <T>(inviteCode: string, data: T) => api.post<ApiResponse<{ participantId: string }>>(`/tournaments/join/${inviteCode}`, data),
  register: (id: string, data: RegisterTournamentPayload) =>
    api.post<ApiResponse<{ participant: TournamentParticipant; paymentUrl?: string; teamInviteLink?: string }>>(`/tournaments/${id}/register`, data),
  getMyRegistration: (id: string) =>
    api.get<ApiResponse<{
      registered: boolean;
      participant?: (TournamentParticipant & {
        teamMembers?: TournamentParticipant['members'];
        teamInviteLink?: string;
      }) | null;
    }>>(`/tournaments/${id}/my-registration`, { params: { _t: Date.now() } }),
  withdraw: (id: string, bankData?: { bankName?: string; bankAccountNumber?: string; bankAccountName?: string }) =>
    api.post<ApiResponse<{ message: string; refundAmount?: number }>>(`/tournaments/${id}/withdraw`, bankData || {}),
  createParentTournament: <T>(data: T) => api.post<ApiResponse<ParentTournament>>('/tournaments/parent', data),
  getMyParentTournaments: () => api.get<ApiResponse<ParentTournament[]>>('/tournaments/parent/my'),
  getParentTournamentById: (id: string) => api.get<ApiResponse<ParentTournament & { divisions: Tournament[] }>>(`/tournaments/parent/${id}`),
  updateParentTournament: <T>(id: string, data: T) => api.patch<ApiResponse<ParentTournament>>(`/tournaments/parent/${id}`, data),
  deleteParentTournament: (id: string) => api.delete<ApiResponse<void>>(`/tournaments/parent/${id}`),
  createTournament: <T>(data: T) => api.post<ApiResponse<Tournament>>('/tournaments', data),
  updateTournament: <T>(id: string, data: T) => api.patch<ApiResponse<Tournament>>(`/tournaments/${id}`, data),
  deleteTournament: (id: string) => api.delete<ApiResponse<void>>(`/tournaments/${id}`),
  getTournamentGallery: (id: string) => api.get<ApiResponse<string[]>>(`/tournaments/${id}/gallery`),
  addTournamentGalleryImage: (id: string, url: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/gallery`, { url }),
  removeTournamentGalleryImage: (id: string, index: number) => api.delete<ApiResponse<Tournament>>(`/tournaments/${id}/gallery/${index}`),
  getTournamentParticipants: (id: string) => api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${id}/participants`, { params: { _t: Date.now() } }),
  getTournamentReferees: (id: string) => api.get<ApiResponse<{ id: string; userId: string; status: string; fullName: string; avatarUrl: string | null }[]>>(`/tournaments/${id}/referees`),
  addTournamentReferee: (id: string, email: string) =>
    api.post<ApiResponse<void>>(`/tournaments/${id}/referees`, { email }),
  getTournamentBracket: (id: string, divisionId?: string) =>
    api.get<ApiResponse<{ stages: BracketStage[] }>>(`/tournaments/${id}/bracket`, {
      params: divisionId ? { divisionId } : undefined,
    }),
  generateBracket: (id: string, divisionId?: string, seedingType?: 'SEEDED' | 'RANDOM') =>
    api.post<ApiResponse<{ message: string; stageId: string; totalMatches: number }>>(
      `/tournaments/${id}/generate-bracket`,
      { divisionId, seedingType }
    ),
  regenerateInviteCode: (id: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/regenerate-invite`),
  publishTournament: (id: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/publish`),
  updateTournamentSeeds: (id: string, seeds: { participantId: string; seed: number }[]) => api.patch<ApiResponse<{ success: boolean }>>(`/tournaments/${id}/seeds`, { seeds }),
  lockTournament: (id: string) => api.post<ApiResponse<{
    tournament: Tournament;
    summary: {
      totalParticipants: number;
      totalPlayers: number;
      platformFeePercentage: number;
      totalPlatformFee: number;
    };
  }>>(`/tournaments/${id}/lock`),
  finalizeRegistration: (id: string) =>
    api.post<ApiResponse<{
      tournament: Tournament;
      bracketReset: boolean;
      bracketLockedAt: string;
      isRegistrationLocked: boolean;
    }>>(`/tournaments/${id}/finalize-registration`),
  updateRoundConfig: (id: string, roundNumber: number, data: RoundConfigPayload) =>
    api.put<ApiResponse<{ success: boolean }>>(`/tournaments/${id}/rounds/${roundNumber}/config`, data),
  registerGuest: (id: string, data: GuestRegistrationPayload) =>
    api.post<ApiResponse<{ guestId: string; confirmationCode: string }>>(`/tournaments/${id}/register-guest`, data),
  mockPayment: (data: MockPaymentPayload) =>
    api.post<ApiResponse<{ paymentId: string; status: 'PENDING' | 'SUCCESS'; organizationId: string }>>('/tournaments/mock-payment', data),
  updateMatchSchedule: (matchId: string, data: { courtId?: string | null; courtName?: string | null; courtAddress?: string | null; refereeId?: string | null; scheduledAt?: string | null; matchConfig?: Record<string, unknown> | null }) =>
    api.patch<ApiResponse<BracketMatch>>(`/matches/${matchId}/schedule`, data),
  updateStage: <T>(stageId: string, data: T) => api.patch<ApiResponse<BracketStage>>(`/tournaments/stages/${stageId}`, data),
  validateInvite: (id: string, inviteCode: string) =>
    api.post<ApiResponse<Tournament>>(`/tournaments/${id}/validate-invite`, { inviteCode }),
  joinTeam: (id: string, data: { participantId: string; teamInviteToken: string }) =>
    api.post<ApiResponse<{ participant: TournamentParticipant; paymentUrl?: string }>>(`/tournaments/${id}/join-team`, data),
  seedMockParticipants: (id: string, names: string[], divisionId?: string) =>
    api.post<ApiResponse<void>>(`/tournaments/${id}/mock-participants`, { names, divisionId }),
  clearMockParticipants: (id: string, divisionId?: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/${id}/mock-participants`, {
      params: divisionId ? { divisionId } : undefined,
    }),
  assignReservedSlot: (id: string, userEmailOrPhone: string, teamName: string, partnerEmailOrPhone?: string, divisionId?: string) =>
    api.post<ApiResponse<unknown>>(`/tournaments/${id}/reserve-slots`, { userEmailOrPhone, teamName, partnerEmailOrPhone, divisionId }),
  updateParticipantStatus: (id: string, participantId: string, status: string) =>
    api.patch<ApiResponse<TournamentParticipant>>(`/tournaments/${id}/participants/${participantId}`, { status }),
};

export const divisionsApi = {
  getDivisions: (tournamentId: string) =>
    api.get<ApiResponse<Division[]>>(`/tournaments/${tournamentId}/divisions`),
  createDivision: (tournamentId: string, data: CreateDivisionInput) =>
    api.post<ApiResponse<Division>>(`/tournaments/${tournamentId}/divisions`, data),
  updateDivision: (divisionId: string, data: UpdateDivisionInput) =>
    api.patch<ApiResponse<Division>>(`/tournaments/divisions/${divisionId}`, data),
  updateDivisionConfig: (tournamentId: string, divisionId: string, data: UpdateDivisionInput) =>
    api.patch<ApiResponse<Division>>(`/tournaments/${tournamentId}/divisions/${divisionId}/config`, data),
  getDivisionParticipants: (tournamentId: string, divisionId: string) =>
    api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${tournamentId}/divisions/${divisionId}/participants`),
  deleteDivision: (divisionId: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/divisions/${divisionId}`),
};