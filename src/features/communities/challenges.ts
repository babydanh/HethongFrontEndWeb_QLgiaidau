import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';

export interface CommunityChallenge {
  id: string;
  challengerId: string;
  challengedId: string;
  senderUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  message: string | null;
  scheduledAt: string | null;
  tournamentId: string | null;
  createdAt: string;
  updatedAt: string;
  challengerName?: string;
  challengerLogoUrl?: string;
  challengedName?: string;
  challengedLogoUrl?: string;
}

export const challengesApi = {
  createChallenge: (
    communityId: string,
    data: { challengedId: string; message?: string; scheduledAt?: string },
  ) =>
    api.post<ApiResponse<CommunityChallenge>>(
      `/communities/${communityId}/challenges`,
      data,
    ),

  getChallenges: (communityId: string) =>
    api.get<ApiResponse<CommunityChallenge[]>>(
      `/communities/${communityId}/challenges`,
    ),

  respondChallenge: (
    communityId: string,
    challengeId: string,
    data: { status: 'ACCEPTED' | 'REJECTED' },
  ) =>
    api.patch<ApiResponse<CommunityChallenge>>(
      `/communities/${communityId}/challenges/${challengeId}`,
      data,
    ),
};
