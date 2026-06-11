import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { Tournament, ParentTournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch, MatchTypeUI, MatchTypeDB, GenderRestriction } from '@/types/tournament';
import { ApiResponse } from '@/types/api';

export type { Category, Tournament, ParentTournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch };
export { MatchTypeUI, MatchTypeDB, GenderRestriction };

export const tournamentsApi = {
  getTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments', { params }),
  getPublicTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments/public', { params }),
  getMyTournaments: () => api.get<ApiResponse<Tournament[]>>('/tournaments/my'),
  getTournamentById: (id: string, params?: Record<string, unknown>) => api.get<ApiResponse<Tournament>>(`/tournaments/${id}`, { params }),
  getTournamentByInviteCode: (inviteCode: string) => api.get<ApiResponse<Tournament>>(`/tournaments/join/${inviteCode}`),
  joinTournamentByInviteCode: <T>(inviteCode: string, data: T) => api.post<ApiResponse<{ participantId: string }>>(`/tournaments/join/${inviteCode}`, data),
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
  getTournamentParticipants: (id: string) => api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${id}/participants`),
  getTournamentBracket: (id: string) => api.get<ApiResponse<{ stages: BracketStage[] }>>(`/tournaments/${id}/bracket`),
  generateBracket: (id: string) => api.post<ApiResponse<{ message: string; stageId: string; totalMatches: number }>>(`/tournaments/${id}/generate-bracket`),
  regenerateInviteCode: (id: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/regenerate-invite`),
  publishTournament: (id: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/publish`),
  lockTournament: (id: string) => api.post<ApiResponse<{
    tournament: Tournament;
    summary: {
      totalParticipants: number;
      totalPlayers: number;
      platformFeePerPlayer: number;
      totalPlatformFee: number;
    };
  }>>(`/tournaments/${id}/lock`),
  updateMatchSchedule: (matchId: string, data: { courtId?: string | null; refereeId?: string | null; scheduledAt?: string | null }) =>
    api.patch<ApiResponse<BracketMatch>>(`/matches/${matchId}/schedule`, data),
  updateStage: <T>(stageId: string, data: T) => api.patch<ApiResponse<BracketStage>>(`/tournaments/stages/${stageId}`, data),
  validateInvite: (id: string, inviteCode: string) =>
    api.post<ApiResponse<Tournament>>(`/tournaments/${id}/validate-invite`, { inviteCode }),
  register: (id: string, data: { teamName: string; inviteCode?: string }) =>
    api.post<ApiResponse<{ participant: TournamentParticipant; paymentUrl?: string; teamInviteLink?: string }>>(`/tournaments/${id}/register`, data),
  joinTeam: (id: string, data: { participantId: string; teamInviteToken: string }) =>
    api.post<ApiResponse<{ participant: TournamentParticipant; paymentUrl?: string }>>(`/tournaments/${id}/join-team`, data),
  withdraw: (id: string) =>
    api.post<ApiResponse<{ message: string; refundAmount?: number }>>(`/tournaments/${id}/withdraw`, {}),
  getMyRegistration: (id: string) =>
    api.get<ApiResponse<{ registered: boolean; participant?: TournamentParticipant & { teamMembers?: TournamentParticipant['members']; teamInviteLink?: string } }>>(`/tournaments/${id}/my-registration`),
  getOngoingMatches: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<BracketMatch[]>>('/matches', { params: { status: 'ONGOING', limit: 10, ...params } }),
  seedMockParticipants: (id: string, names: string[]) =>
    api.post<ApiResponse<unknown>>(`/tournaments/${id}/mock-participants`, { names }),
  clearMockParticipants: (id: string) =>
    api.delete<ApiResponse<unknown>>(`/tournaments/${id}/mock-participants`),
  updateParticipantStatus: (id: string, participantId: string, status: string) =>
    api.patch<ApiResponse<unknown>>(`/tournaments/${id}/participants/${participantId}`, { status }),
  assignReservedSlot: (id: string, userEmailOrPhone: string, teamName: string) =>
    api.post<ApiResponse<unknown>>(`/tournaments/${id}/reserve-slots`, { userEmailOrPhone, teamName }),
};
