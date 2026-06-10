import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { Tournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch } from '@/types/tournament';
import { ApiResponse } from '@/types/api';

export type { Category, Tournament, PaginatedTournaments, TournamentParticipant, BracketStage, BracketMatch };

export const tournamentsApi = {
  getTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments', { params }),
  getPublicTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments/public', { params }),
  getMyTournaments: () => api.get<ApiResponse<Tournament[]>>('/tournaments/my'),
  getTournamentById: (id: string) => api.get<ApiResponse<Tournament>>(`/tournaments/${id}`),
  getTournamentByInviteCode: (inviteCode: string) => api.get<ApiResponse<Tournament>>(`/tournaments/join/${inviteCode}`),
  joinTournamentByInviteCode: <T>(inviteCode: string, data: T) => api.post<ApiResponse<{ participantId: string }>>(`/tournaments/join/${inviteCode}`, data),
  createTournament: <T>(data: T) => api.post<ApiResponse<Tournament>>('/tournaments', data),
  updateTournament: <T>(id: string, data: T) => api.patch<ApiResponse<Tournament>>(`/tournaments/${id}`, data),
  deleteTournament: (id: string) => api.delete<ApiResponse<void>>(`/tournaments/${id}`),
  getTournamentGallery: (id: string) => api.get<ApiResponse<string[]>>(`/tournaments/${id}/gallery`),
  addTournamentGalleryImage: (id: string, url: string) => api.post<ApiResponse<Tournament>>(`/tournaments/${id}/gallery`, { url }),
  removeTournamentGalleryImage: (id: string, index: number) => api.delete<ApiResponse<Tournament>>(`/tournaments/${id}/gallery/${index}`),
  getTournamentParticipants: (id: string) => api.get<ApiResponse<TournamentParticipant[]>>(`/tournaments/${id}/participants`),
  getTournamentBracket: (id: string) => api.get<ApiResponse<{ stages: BracketStage[] }>>(`/tournaments/${id}/bracket`),
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
};
