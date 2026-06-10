import { api } from '@/lib/axios';

import { Category } from '@/types/category';
import { Community } from '@/types/community';
import { PaginatedResponse, ApiResponse } from '@/types/api';

export type { Category, Community, PaginatedResponse, ApiResponse };

export const communitiesApi = {
  getCommunities: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Community>>('/communities', { params }),
  getMyCommunities: () => api.get<PaginatedResponse<Community>>('/communities/my'),
  getPendingCommunities: () => api.get<PaginatedResponse<Community>>('/communities/pending'),
  getFavorites: () => api.get<PaginatedResponse<{community: Community}>>('/communities/favorites'),
  getCommunityById: (id: string) => api.get<ApiResponse<Community>>(`/communities/${id}`),
  createCommunity: <T>(data: T) => api.post('/communities', data),
  updateCommunity: <T>(id: string, data: T) => api.patch(`/communities/${id}`, data),
  reviewCommunity: (id: string, data: { status: 'APPROVED' | 'REJECTED', reviewNotes?: string }) => api.patch(`/communities/${id}/review`, data),
  deleteCommunity: (id: string) => api.delete(`/communities/${id}`),
  
  // Members
  getMembers: (id: string, params?: Record<string, unknown>) => api.get(`/communities/${id}/members`, { params }),
  addMember: (id: string, data: { userId: string, role: string }) => api.post(`/communities/${id}/members`, data),
  updateMemberRole: (id: string, userId: string, role: string) => api.patch(`/communities/${id}/members/${userId}`, { role }),
  removeMember: (id: string, userId: string) => api.delete(`/communities/${id}/members/${userId}`),

  // Join & Follow
  joinCommunity: (id: string, joinAnswers?: Record<string, string>) => api.post(`/communities/${id}/join`, { joinAnswers }),
  getJoinRequests: (id: string) => api.get(`/communities/${id}/join-requests`),
  reviewJoinRequest: (id: string, memberId: string, action: 'APPROVE' | 'REJECT') => api.patch(`/communities/${id}/join-requests/${memberId}`, { action }),
  inviteMember: (id: string, data: { userId: string, role: string }) => api.post(`/communities/${id}/invite`, data),
  followCommunity: (id: string) => api.post(`/communities/${id}/follow`),
  unfollowCommunity: (id: string) => api.delete(`/communities/${id}/follow`),
  favoriteCommunity: (id: string) => api.post(`/communities/${id}/favorite`),
  unfavoriteCommunity: (id: string) => api.delete(`/communities/${id}/favorite`),
  respondToInvite: (id: string, action: 'accept' | 'decline') => api.post(`/communities/${id}/invite/${action}`),

  // Gallery
  getGallery: (id: string) => api.get(`/communities/${id}/gallery`),
  addGalleryItem: (id: string, data: { imageUrl: string, caption?: string }) => api.post(`/communities/${id}/gallery`, data),
  removeGalleryItem: (id: string, imageId: string) => api.delete(`/communities/${id}/gallery/${imageId}`),

  // Tournaments & Rankings
  getTournaments: (id: string, status?: string) => api.get(`/communities/${id}/tournaments`, { params: { status } }),
  getRankings: (id: string, limit?: number) => api.get(`/communities/${id}/rankings`, { params: { limit } }),
};
