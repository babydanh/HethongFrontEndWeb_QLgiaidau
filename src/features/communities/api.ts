import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { Community } from '@/types/community';
import { PaginatedResponse, ApiResponse } from '@/types/api';
import { Tournament } from '@/features/tournaments/api';

export type { Category, Community, PaginatedResponse, ApiResponse };

export interface GalleryImage {
  id: string;
  communityId: string;
  uploaderId: string;
  imageUrl: string;
  caption?: string | null;
  createdAt: string;
}

export interface CommunityMemberRecord {
  member: {
    id: string;
    communityId: string;
    userId: string;
    role: 'OWNER' | 'MODERATOR' | 'MEMBER';
    status: 'JOINED' | 'PENDING' | 'INVITED' | 'REJECTED' | 'BANNED';
    joinedAt: string;
    joinAnswers?: Record<string, string> | null;
  };
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    email?: string;
  };
}

export interface JoinRequest {
  id: string;
  communityId: string;
  userId: string;
  role: 'OWNER' | 'MODERATOR' | 'MEMBER';
  status: 'JOINED' | 'PENDING' | 'INVITED' | 'REJECTED' | 'BANNED';
  joinedAt: string;
  joinAnswers?: Record<string, string> | null;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    email?: string;
  };
}

export interface CommunityRankingRecord {
  rank: {
    id: string;
    communityId: string;
    userId: string;
    eloPoints: number;
  };
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export const communitiesApi = {
  getCommunities: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Community[]>>('/communities', { params }),

  getMyCommunities: () =>
    api.get<ApiResponse<Community[]>>('/communities/my'),

  getPendingCommunities: () =>
    api.get<ApiResponse<Community[]>>('/communities/pending'),

  getAllCommunitiesAdmin: () =>
    api.get<ApiResponse<Community[]>>('/communities/admin'),
  
  getFavorites: () => 
    api.get<ApiResponse<{ community: Community }[]>>('/communities/favorites'),
  
  getCommunityById: (id: string) => 
    api.get<ApiResponse<Community>>(`/communities/${id}`),
  
  createCommunity: <T>(data: T) => 
    api.post<ApiResponse<Community>>('/communities', data),
  
  updateCommunity: <T>(id: string, data: T) => 
    api.patch<ApiResponse<Community>>(`/communities/${id}`, data),
  
  reviewCommunity: (id: string, data: { status: 'APPROVED' | 'REJECTED', rejectedReason?: string }) => 
    api.patch<ApiResponse<Community>>(`/communities/${id}/review`, data),
  
  deleteCommunity: (id: string) => 
    api.delete<ApiResponse<Community>>(`/communities/${id}`),

  // Members
  getMembers: (id: string, params?: Record<string, unknown>) => 
    api.get<ApiResponse<CommunityMemberRecord[]>>(`/communities/${id}/members`, { params }),
  
  addMember: (id: string, data: { userId: string, role: string }) => 
    api.post<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members`, data),
  
  updateMemberRole: (id: string, userId: string, role: string) => 
    api.patch<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members/${userId}`, { role }),
  
  removeMember: (id: string, userId: string) => 
    api.delete<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members/${userId}`),

  banMember: (id: string, userId: string) =>
    api.post<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members/${userId}/ban`, {}),

  unbanMember: (id: string, userId: string) =>
    api.delete<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members/${userId}/ban`),

  // Join & Follow
  joinCommunity: (id: string, joinAnswers?: Record<string, string>) => 
    api.post<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/join`, { joinAnswers }),
  
  getJoinRequests: (id: string) => 
    api.get<ApiResponse<CommunityMemberRecord[]>>(`/communities/${id}/join-requests`),
  
  reviewJoinRequest: (id: string, memberId: string, action: 'APPROVE' | 'REJECT') => 
    api.patch<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/join-requests/${memberId}`, { action }),
  
  inviteMember: (id: string, data: { userId: string, role: string }) => 
    api.post<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/invite`, data),
  
  followCommunity: (id: string) => 
    api.post<ApiResponse<unknown>>(`/communities/${id}/follow`),
  
  unfollowCommunity: (id: string) => 
    api.delete<ApiResponse<unknown>>(`/communities/${id}/follow`),
  
  favoriteCommunity: (id: string) => 
    api.post<ApiResponse<unknown>>(`/communities/${id}/favorite`),
  
  unfavoriteCommunity: (id: string) => 
    api.delete<ApiResponse<unknown>>(`/communities/${id}/favorite`),
  
  respondToInvite: (id: string, action: 'accept' | 'decline') => 
    api.post<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/invite/${action}`),

  // Gallery
  getGallery: (id: string) => 
    api.get<ApiResponse<GalleryImage[]>>(`/communities/${id}/gallery`),
  
  addGalleryItem: (id: string, data: { imageUrl: string, caption?: string }) => 
    api.post<ApiResponse<GalleryImage>>(`/communities/${id}/gallery`, data),
  
  removeGalleryItem: (id: string, imageId: string) => 
    api.delete<ApiResponse<GalleryImage>>(`/communities/${id}/gallery/${imageId}`),

  // Tournaments & Rankings
  getTournaments: (id: string, status?: string) => 
    api.get<ApiResponse<Tournament[]>>(`/communities/${id}/tournaments`, { params: { status } }),
  
  getRankings: (id: string, limit?: number) => 
    api.get<ApiResponse<CommunityRankingRecord[]>>(`/communities/${id}/rankings`, { params: { limit } }),
};
