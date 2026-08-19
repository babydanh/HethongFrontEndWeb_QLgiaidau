import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import {
  Tournament,
  ParentTournament,
  PaginatedTournaments,
  TournamentParticipant,
  BracketStage,
  BracketMatch,
  MatchTypeUI,
  MatchTypeDB,
  GenderRestriction,
  LiteParticipant,
  LiteGeneratePairsResponse,
  LiteUnpairResponse,
  type StageRoundConfig,
} from '@/types/tournament';
import { ApiResponse } from '@/types/api';
import type { OpsAuditLogResponse } from '@/features/organizer/ops/types';

export interface StaffMember {
  userId: string;
  role: 'CO_ORGANIZER' | 'REFEREE' | 'SPECTATOR';
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface WorkspaceRefereeInvite {
  refereeId: string;
  tournamentId: string;
  tournamentName: string;
  logoUrl?: string | null;
  tournamentStatus: string;
  categoryName: string | null;
  assignedAt: string;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
}

export interface TournamentReferee {
  id: string;
  userId: string;
  status: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface WorkspaceRefereeMatch {
  id: string;
  tournamentId: string;
  tournamentName: string;
  logoUrl?: string | null;
  categoryName: string | null;
  stageName: string;
  groupName: string;
  roundNumber: number;
  matchOrder: number;
  status: string;
  scheduledAt: string | null;
  courtName: string | null;
  participant1Name: string | null;
  participant2Name: string | null;
}

export interface TournamentWorkspace {
  organizedTournaments: Tournament[];
  participatingTournaments: Tournament[];
  coOrganizerTournaments: Tournament[];
  refereeInvites: WorkspaceRefereeInvite[];
  refereeTournaments: WorkspaceRefereeInvite[];
  refereeMatches: WorkspaceRefereeMatch[];
}

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
  bracketType?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT' | null;
  roundConfig?: StageRoundConfig | null;
  startDate?: string | null;
  endDate?: string | null;
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
  endDate?: string | null;
  registrationEndDate?: string | null;
  minElo?: number | null;
  maxElo?: number | null;
  prizeDescription?: string | null;
}

export type UpdateDivisionInput = Partial<Omit<CreateDivisionInput, 'tournamentId'>>;

export type LiteDivisionConfigInput = Pick<
  CreateDivisionInput,
  | 'name'
  | 'matchType'
  | 'genderRestriction'
  | 'maxParticipants'
  | 'bracketType'
  | 'startDate'
  | 'registrationEndDate'
  | 'minElo'
  | 'maxElo'
>;

export type { Category, Tournament, ParentTournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch };
export { MatchTypeUI, MatchTypeDB, GenderRestriction };

export interface TournamentFeesConfig {
  feePublicRanked: number;
  feePublicUnranked: number;
  feeClub: number;
  pctPublicRanked: number;
  pctPublicUnranked: number;
  pctClub: number;
  allowEntryFees: boolean;
}

export interface TournamentResultAward {
  rank: number;
  shared: boolean;
  participant: { participantId: string; teamName: string } | null;
}

export interface TournamentResult {
  tournamentId: string;
  status: string;
  finalized: boolean;
  awards: TournamentResultAward[];
  standings: Record<string, unknown>[];
  matches: Array<Record<string, unknown>>;
}

/** Remove wizard-only fields at the API boundary before any create request. */
const stripCreateWizardFields = <T>(data: T): T => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const payload = { ...(data as Record<string, unknown>) };
  delete payload.selectedFormats;
  return payload as T;
};

export interface RoundConfigPayload {
  roundNumber: number;
  format: 'BO1' | 'BO3' | 'BO5';
  wildcardSlots?: number;
  config?: Record<string, unknown>;
}

export interface MockPaymentPayload {
  organizationId: string;
  amount: number;
  description?: string;
  method?: 'BANK_TRANSFER' | 'E_WALLET' | 'CASH';
}

export interface RegisterTournamentPayload {
  teamName: string;
  footballTeamId?: string;
  memberIds?: string[];
  reserveMemberIds?: string[];
  partnerEmailOrPhone?: string;
  inviteCode?: string;
  divisionId?: string;
  tournamentDivisionId?: string;
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  rankingConsent?: boolean;
  customResponses?: Record<string, unknown>;
}

export interface FootballTeam {
  id: string;
  name: string;
  logoUrl?: string | null;
  categoryId: string;
  communityId?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  membership?: { role: 'CAPTAIN' | 'MANAGER' | 'PLAYER'; status: string };
  members?: Array<{ userId: string; role: 'CAPTAIN' | 'MANAGER' | 'PLAYER'; status?: string; profile?: { fullName?: string | null; avatarUrl?: string | null } }>;
  rank?: FootballTeamRank | null;
}

export interface FootballTeamRank {
  id?: string;
  teamId?: string;
  eloPoints: number;
  peakElo: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  tierId?: string | null;
  tierName?: string | null;
}

export interface FootballTeamMemberCandidate {
  id: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export const footballTeamsApi = {
  listMine: () => api.get<ApiResponse<Array<{ team: FootballTeam; membership: FootballTeam['membership']; rank?: FootballTeamRank | null }>>>('/football-teams/mine'),
  create: (data: { name: string; categoryId: string; logoUrl?: string; communityId?: string }) =>
    api.post<ApiResponse<FootballTeam>>('/football-teams', data),
  get: (teamId: string) => api.get<ApiResponse<FootballTeam>>(`/football-teams/${teamId}`),
  update: (teamId: string, data: { name?: string; logoUrl?: string | null; status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' }) =>
    api.patch<ApiResponse<FootballTeam>>(`/football-teams/${teamId}`, data),
  searchCandidates: (teamId: string, search: string) =>
    api.get<ApiResponse<FootballTeamMemberCandidate[]>>(`/football-teams/${teamId}/member-candidates`, { params: { q: search, limit: 20 } }),
  invite: (teamId: string, userId: string) =>
    api.post<ApiResponse<unknown>>(`/football-teams/${teamId}/invites`, { userId }),
  respondInvite: (teamId: string, status: 'ACCEPTED' | 'DECLINED') =>
    api.post<ApiResponse<unknown>>(`/football-teams/${teamId}/invites/respond`, { status }),
  cancelInvite: (teamId: string, userId: string) =>
    api.delete<ApiResponse<unknown>>(`/football-teams/${teamId}/invites/${userId}`),
  updateMember: (teamId: string, userId: string, role: 'CAPTAIN' | 'MANAGER' | 'PLAYER') =>
    api.patch<ApiResponse<unknown>>(`/football-teams/${teamId}/members/${userId}`, { role }),
  removeMember: (teamId: string, userId: string) =>
    api.delete<ApiResponse<unknown>>(`/football-teams/${teamId}/members/${userId}`),
  leave: (teamId: string) => api.delete<ApiResponse<unknown>>(`/football-teams/${teamId}/members/me`),
};

export interface RegisterTournamentResponse {
  participant: TournamentParticipant;
  entryFee: number;
  paymentEligible: boolean;
  paymentUrl?: string;
  teamInviteLink?: string;
}

export interface FootballRosterSnapshot {
  id: string;
  userId: string;
  role: 'MAIN' | 'RESERVE';
  confirmationStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface FootballRosterStatus {
  entry: {
    id: string;
    status: 'DRAFT' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'LOCKED' | 'WITHDRAWN';
    displayNameSnapshot: string;
    logoUrlSnapshot?: string | null;
    lockedAt?: string | null;
  } | null;
  roster: FootballRosterSnapshot[];
  currentMember: FootballRosterSnapshot | null;
}
type FootballRosterEntryStatus = NonNullable<FootballRosterStatus['entry']>['status'];

export interface MyRegistrationParticipant extends Omit<TournamentParticipant, 'members'> {
  members?: TournamentParticipant['members'];
  teamMembers?: TournamentParticipant['members'];
  teamInviteLink?: string | null;
}

export interface MyRegistrationResponse {
  registered: boolean;
  participant?: MyRegistrationParticipant | null;
}

export interface LivestreamCamera {
  id: string;
  tournamentId: string;
  name: string;
  mode: 'PUSH' | 'PULL';
  protocol: 'RTMP' | 'SRT';
  streamName: string;
  status: 'IDLE' | 'WAITING' | 'LIVE' | 'OFFLINE' | 'ERROR';
  playbackUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LivestreamPublishInfo {
  protocol: 'RTMP' | 'SRT';
  streamName: string;
  url: string;
  rtmpUrl: string;
  srtUrl: string;
}

export interface CreatedLivestreamCamera extends LivestreamCamera {
  publish: LivestreamPublishInfo;
}

export interface MatchLivestream {
  id: string;
  matchId: string;
  cameraId: string | null;
  streamStatus: 'IDLE' | 'LIVE' | 'OFFLINE' | 'ERROR';
  playbackUrl: string | null;
  recordingUrl: string | null;
  isFeatured: boolean;
  startedAt: string | null;
  endedAt: string | null;
  cameraName?: string | null;
}

export interface StartMatchStreamResponse {
  livestream: MatchLivestream | null;
  publish: LivestreamPublishInfo;
  playbackUrl: string;
}

export interface MatchPlaybackResponse {
  matchId: string;
  streamStatus: MatchLivestream['streamStatus'];
  playbackUrl: string | null;
  cameraName: string | null;
  isFeatured: boolean;
}

export const livestreamApi = {
  getCameras: (tournamentId: string) =>
    api.get<ApiResponse<LivestreamCamera[]>>(`/livestream/tournaments/${tournamentId}/cameras`),
  getMatchLivestreams: (tournamentId: string) =>
    api.get<ApiResponse<MatchLivestream[]>>(`/livestream/tournaments/${tournamentId}/matches`),
  createCamera: (tournamentId: string, data: { name: string; protocol: 'RTMP' | 'SRT'; deviceLabel?: string }) =>
    api.post<ApiResponse<CreatedLivestreamCamera>>(`/livestream/tournaments/${tournamentId}/cameras`, data),
  deleteCamera: (cameraId: string) =>
    api.delete<ApiResponse<LivestreamCamera>>(`/livestream/cameras/${cameraId}`),
  assignCamera: (matchId: string, cameraId: string) =>
    api.post<ApiResponse<MatchLivestream>>(`/livestream/matches/${matchId}/assign-camera`, { cameraId }),
  startMatchStream: (matchId: string) =>
    api.post<ApiResponse<StartMatchStreamResponse>>(`/livestream/matches/${matchId}/start`),
  stopMatchStream: (matchId: string) =>
    api.post<ApiResponse<MatchLivestream>>(`/livestream/matches/${matchId}/stop`),
  getMatchPlayback: (matchId: string) =>
    api.get<ApiResponse<MatchPlaybackResponse>>(`/livestream/matches/${matchId}/playback`),
};

export const tournamentsApi = {
  getFeesConfig: () => api.get<ApiResponse<TournamentFeesConfig>>('/tournaments/fees'),
  getTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments', { params }),
  getPublicTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments/public', { params }),
  getMyTournaments: () => api.get<ApiResponse<Tournament[]>>('/tournaments/my'),
  getMyWorkspace: () => api.get<ApiResponse<TournamentWorkspace>>('/tournaments/workspace/me'),
  getTournamentById: (id: string, params?: Record<string, unknown>) => api.get<ApiResponse<Tournament>>(`/tournaments/${id}`, { params }),
  getTournamentByInviteCode: (inviteCode: string) => api.get<ApiResponse<Tournament>>(`/tournaments/join/${inviteCode}`),
  joinTournamentByInviteCode: <T>(inviteCode: string, data: T) => api.post<ApiResponse<{ participantId: string }>>(`/tournaments/join/${inviteCode}`, data),
  register: (id: string, data: RegisterTournamentPayload) => {
    const { inviteCode, ...body } = data;
    return api.post<ApiResponse<RegisterTournamentResponse>>(`/tournaments/${id}/register`, body, {
      params: inviteCode ? { invite: inviteCode } : undefined,
    });
  },
  getMyRegistration: (id: string, divisionId?: string) =>
    api.get<ApiResponse<MyRegistrationResponse>>(`/tournaments/${id}/my-registration`, {
      params: { _t: Date.now(), ...(divisionId ? { divisionId } : {}) },
    }),
  getFootballRosterStatus: (id: string, participantId: string) =>
    api.get<ApiResponse<FootballRosterStatus>>(`/tournaments/${id}/participants/${participantId}/football-roster`),
  updateFootballRoster: (id: string, participantId: string, data: { memberIds: string[]; reserveMemberIds: string[] }) =>
    api.patch<ApiResponse<FootballRosterStatus>>(
      `/tournaments/${id}/participants/${participantId}/football-roster`,
      data,
    ),
  respondFootballRoster: (id: string, participantId: string, action: 'CONFIRM' | 'DECLINE') =>
    api.post<ApiResponse<{ entryId: string; confirmationStatus: 'CONFIRMED' | 'DECLINED'; status: FootballRosterEntryStatus }>>(
      `/tournaments/${id}/participants/${participantId}/football-roster/respond`,
      { action },
    ),
  lockFootballRoster: (id: string, participantId: string) =>
    api.post<ApiResponse<TournamentParticipant>>(`/tournaments/${id}/participants/${participantId}/lock-roster`),
  unlockFootballRoster: (id: string, participantId: string) =>
    api.post<ApiResponse<TournamentParticipant>>(`/tournaments/${id}/participants/${participantId}/unlock-roster`),
  withdraw: (id: string, bankData?: { bankName?: string; bankAccountNumber?: string; bankAccountName?: string }, divisionId?: string) =>
    api.post<ApiResponse<{ message: string; refundAmount?: number }>>(`/tournaments/${id}/withdraw`, { ...(bankData || {}), ...(divisionId ? { tournamentDivisionId: divisionId } : {}) }),
  createParentTournament: <T>(data: T) => api.post<ApiResponse<ParentTournament>>('/tournaments/parent', data),
  getMyParentTournaments: () => api.get<ApiResponse<ParentTournament[]>>('/tournaments/parent/my'),
  getParentTournamentById: (id: string) => api.get<ApiResponse<ParentTournament & { divisions: Tournament[] }>>(`/tournaments/parent/${id}`),
  updateParentTournament: <T>(id: string, data: T) => api.patch<ApiResponse<ParentTournament>>(`/tournaments/parent/${id}`, data),
  deleteParentTournament: (id: string) => api.delete<ApiResponse<void>>(`/tournaments/parent/${id}`),
  createTournament: <T>(data: T) =>
    api.post<ApiResponse<Tournament>>('/tournaments', stripCreateWizardFields(data)),
  updateTournament: <T>(id: string, data: T) => api.patch<ApiResponse<Tournament>>(`/tournaments/${id}`, data),
  confirmLiteRoster: (id: string) =>
    api.post<ApiResponse<Tournament>>(`/tournaments/${id}/confirm-roster`),
  deleteTournament: (id: string) => api.delete<ApiResponse<void>>(`/tournaments/${id}`),
  getTournamentGallery: (id: string) => api.get<ApiResponse<string[]>>(`/tournaments/${id}/gallery`),
  addTournamentGalleryImage: (id: string, url: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/gallery`, { url }),
  removeTournamentGalleryImage: (id: string, index: number) => api.delete<ApiResponse<Tournament>>(`/tournaments/${id}/gallery/${index}`),
  getTournamentParticipants: (id: string, divisionId?: string) =>
    api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${id}/participants`, {
      params: { _t: Date.now(), ...(divisionId ? { divisionId } : {}) },
    }),
  deleteMockParticipant: (id: string, participantId: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/${id}/participants/${participantId}/mock`),
  // Follow / Unfollow
  followTournament: (id: string) =>
    api.post<ApiResponse<void>>(`/tournaments/${id}/follow`),
  unfollowTournament: (id: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/${id}/follow`),
  getFollowedTournaments: () =>
    api.get<ApiResponse<Tournament[]>>('/tournaments/my/followed'),
  getOrganizerTournamentParticipants: (id: string, divisionId?: string) =>
    api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${id}/manage/participants`, {
      params: { _t: Date.now(), ...(divisionId ? { divisionId } : {}) },
    }),
  getOpsAuditLogs: (id: string, divisionId?: string) =>
    api.get<ApiResponse<OpsAuditLogResponse[]>>(`/tournaments/${id}/ops-audit-logs`, {
      params: divisionId ? { divisionId } : undefined,
    }),
  getTournamentReferees: (id: string) => api.get<ApiResponse<TournamentReferee[]>>(`/tournaments/${id}/referees`),
  addTournamentReferee: (id: string, email: string) =>
    api.post<ApiResponse<void>>(`/tournaments/${id}/referees`, { email }),
  respondToRefereeInvite: (tournamentId: string, refereeId: string, action: 'ACCEPT' | 'DECLINE') =>
    api.patch<ApiResponse<void>>(`/tournaments/${tournamentId}/referees/${refereeId}/respond`, { action }),
  removeTournamentRefereeInvite: (tournamentId: string, refereeId: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/${tournamentId}/referees/${refereeId}`),
  getTournamentStaff: (id: string) =>
    api.get<ApiResponse<StaffMember[]>>(`/tournaments/${id}/staff`),
  addTournamentStaff: (id: string, data: { email: string; role: string }) =>
    api.post<ApiResponse<StaffMember>>(`/tournaments/${id}/staff`, data),
  removeTournamentStaff: (id: string, userId: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/${id}/staff/${userId}`),
  createPlayoffMatch: (tournamentId: string, data: { stageId: string; participant1Id: string; participant2Id: string }) =>
    api.post<ApiResponse<{ message: string; id: string }>>(`/tournaments/${tournamentId}/playoff`, data),
  finalizeStage: (tournamentId: string, stageId: string) =>
    api.post<ApiResponse<{ message: string }>>(`/tournaments/${tournamentId}/stages/${stageId}/finalize`),
  getTournamentBracket: (id: string, divisionId?: string) =>
    api.get<ApiResponse<{ stages: BracketStage[] }>>(`/tournaments/${id}/bracket`, {
      params: divisionId ? { divisionId } : undefined,
    }),
  getTournamentResults: (id: string, divisionId?: string) =>
    api.get<ApiResponse<TournamentResult>>(`/tournaments/${id}/results`, {
      params: divisionId ? { divisionId } : undefined,
    }),
  generateBracket: (id: string, divisionId?: string, seedingType?: 'SEEDED' | 'RANDOM', allowReset = true) =>
    api.post<ApiResponse<{ message: string; stageId: string; totalMatches: number }>>(
      `/tournaments/${id}/generate-bracket`,
      { divisionId, seedingType, allowReset }
    ),
  importParticipants: (
    id: string,
    data: {
      divisionId?: string;
      participants: Array<{
        teamName: string;
        player1Name: string;
        player1Email?: string;
        player1Phone?: string;
        player2Name?: string;
        player2Email?: string;
        player2Phone?: string;
        elo?: number;
        isPaid?: boolean;
        autoApprove?: boolean;
        customResponses?: Record<string, any>;
      }>;
      sendInvitationEmail?: boolean;
    }
  ) =>
    api.post<ApiResponse<{ message: string; importedCount: number; emailsSent: number }>>(
      `/tournaments/${id}/import-participants`,
      data
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
  mockPayment: (data: MockPaymentPayload) =>
    api.post<ApiResponse<{ paymentId: string; status: 'PENDING' | 'SUCCESS'; organizationId: string }>>('/tournaments/mock-payment', data),
  updateMatchSchedule: (matchId: string, data: { courtId?: string | null; courtName?: string | null; courtAddress?: string | null; refereeId?: string | null; scheduledAt?: string | null; matchConfig?: Record<string, unknown> | null }) =>
    api.patch<ApiResponse<BracketMatch>>(`/matches/${matchId}/schedule`, data),
  updateStage: <T>(stageId: string, data: T) => api.patch<ApiResponse<BracketStage>>(`/tournaments/stages/${stageId}`, data),
  validateInvite: (id: string, inviteCode: string) =>
    api.post<ApiResponse<Tournament>>(`/tournaments/${id}/validate-invite`, { inviteCode }),
  joinTeam: (id: string, data: { participantId: string; teamInviteToken: string }) =>
    api.post<ApiResponse<{ participant: TournamentParticipant; paymentUrl?: string }>>(`/tournaments/${id}/join-team`, data),
  acceptPartnerInvite: (participantId: string) =>
    api.post<ApiResponse<TournamentParticipant>>(`/tournaments/participants/${participantId}/accept-partner`),
  rejectPartnerInvite: (participantId: string) =>
    api.post<ApiResponse<TournamentParticipant>>(`/tournaments/participants/${participantId}/reject-partner`),
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
  kickParticipant: (id: string, participantId: string, reason: string) =>
    api.post<ApiResponse<{ message: string; refundAmount?: string | null }>>(`/tournaments/${id}/participants/${participantId}/kick`, { reason }),
  advanceStandings: (id: string, data: { divisionId: string; stageId: string }) =>
    api.post<ApiResponse<{ stageIds: string[]; totalMatches: number }>>(`/tournaments/${id}/advance-standings`, data),
  autoSeedParticipants: (id: string, divisionId?: string) =>
    api.post<ApiResponse<{ participantId: string; seed: number; elo: number }[]>>(`/tournaments/${id}/auto-seed`, { divisionId }),
  updateParticipantSeed: (id: string, participantId: string, seed: number) =>
    api.patch<ApiResponse<TournamentParticipant>>(`/tournaments/${id}/participants/${participantId}`, { seed }),
  updateDivisionConfig: (id: string, divisionId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<unknown>>(`/tournaments/${id}/divisions/${divisionId}/config`, data),
  getLiteJoinStatus: (inviteCode: string) =>
    api.get<ApiResponse<unknown>>(`/tournaments/lite/join/${inviteCode}`).then(res => res.data),

  joinLite: (inviteCode: string) =>
    api.post<ApiResponse<unknown>>(`/tournaments/lite/join/${inviteCode}`).then(res => res.data),

  createLiteTournament: (data: {
    name: string;
    sport: 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';
    communityId?: string;
    visibility?: 'PRIVATE' | 'PUBLIC';
    bannerUrl?: string;
    logoUrl?: string;
    prizeDescription?: string;
    contactInfo?: { phone?: string; email?: string };
    format?: 'singles' | 'doubles' | 'mixed_doubles';
    genderRestriction?: 'MALE' | 'FEMALE' | 'MIXED';
    teamSize?: 5 | 7 | 11;
    maxReserve?: number;
    setsToWin?: number;
    pointsPerSet?: number;
    winByTwo?: boolean;
    maxPoints?: number;
    footballHalvesCount?: number;
    footballHalfDuration?: number;
    footballAllowDraw?: boolean;
    bracketType?: 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout';
    maxTeams?: number;
    divisions?: LiteDivisionConfigInput[];
    description?: string;
    registrationMode?: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
    venueName?: string;
    locationAddress?: string;
    province?: string;
    district?: string;
    ward?: string;
    isRanked?: boolean;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    registrationStartDate?: string;
    registrationEndDate?: string;
    isRecurring?: boolean;
    recurringFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    recurringDayOfWeek?: number;
    recurringDaysOfWeek?: number[];
    recurringTimeOfDay?: string;
    recurringAdvanceDays?: number;
  }) => {
    // Lite API derives the scope from communityId (PUBLIC when standalone,
    // CLUB when communityId is present), so no tournamentType is sent.
    return api.post<ApiResponse<{ id: string; name: string; status: string; divisionIds: string[]; inviteCode?: string; joinUrl?: string; qrPayload?: string }>>(
      '/tournaments/lite',
      data,
    ).then(res => res.data);
  },

  getLiteParticipants: (id: string) =>
    api.get<ApiResponse<LiteParticipant[]>>(`/tournaments/lite/${id}/participants`),

  pairLiteParticipants: (id: string, data: { participant1Id: string; participant2Id: string }) =>
    api.post<ApiResponse<LiteParticipant>>(`/tournaments/lite/${id}/pairs`, data),

  generateLitePairs: (id: string, data: { strategy: 'RANDOM' | 'ELO_BALANCED' }) =>
    api.post<ApiResponse<LiteGeneratePairsResponse>>(`/tournaments/lite/${id}/pairs/generate`, data),

  unpairLiteParticipant: (id: string, participantId: string) =>
    api.post<ApiResponse<LiteUnpairResponse>>(`/tournaments/lite/${id}/pairs/${participantId}/unpair`),

  generateLiteBracket: (id: string) =>
    api.post<ApiResponse<{ bracketId: string; totalMatches: number }>>(`/tournaments/lite/${id}/bracket`),
  resetLiteBracket: (id: string) =>
    api.post<ApiResponse<{ bracketId: string; totalMatches: number }>>(`/tournaments/lite/${id}/bracket/reset`),
};


export const divisionsApi = {
  getDivisions: (tournamentId: string) =>
    api.get<ApiResponse<Division[]>>(`/tournaments/${tournamentId}/divisions`),
  createDivision: (tournamentId: string, data: CreateDivisionInput) => {
    // Division DTO does not accept endDate; the tournament owns the full
    // schedule. Keep the legacy UI field readable without sending it.
    const payload = { ...data };
    delete payload.endDate;
    return api.post<ApiResponse<Division>>(`/tournaments/${tournamentId}/divisions`, payload);
  },
  updateDivision: (divisionId: string, data: UpdateDivisionInput) =>
    api.patch<ApiResponse<Division>>(`/tournaments/divisions/${divisionId}`, data),
  updateDivisionConfig: (tournamentId: string, divisionId: string, data: UpdateDivisionInput) =>
    api.patch<ApiResponse<Division>>(`/tournaments/${tournamentId}/divisions/${divisionId}/config`, data),
  getDivisionParticipants: (tournamentId: string, divisionId: string) =>
    api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${tournamentId}/divisions/${divisionId}/participants`),
  deleteDivision: (divisionId: string) =>
    api.delete<ApiResponse<void>>(`/tournaments/divisions/${divisionId}`),
};
