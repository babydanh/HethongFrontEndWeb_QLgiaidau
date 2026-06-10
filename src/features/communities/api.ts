import { api } from '@/lib/axios';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
}

export interface Community {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  joinMode?: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  joinQuestions?: string[];
  rules?: string;
  maxMembers?: number;
  locationAddress?: string;
  lat?: number;
  lng?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  ownerId?: string;
  creatorId?: string;
  createdAt: string;
  updatedAt: string;
  categories?: Category[];
  _count?: {
    members: number;
    tournaments: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const communitiesApi = {
  getCommunities: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Community>>('/communities', { params }).then(res => res.data),
  getMyCommunities: () => api.get<PaginatedResponse<Community>>('/communities/my').then(res => res.data),
  getPendingCommunities: () => api.get<PaginatedResponse<Community>>('/communities/pending').then(res => res.data),
  getFavorites: () => api.get<PaginatedResponse<{community: Community}>>('/communities/favorites').then(res => res.data),
  getCommunityById: (id: string) => api.get<Community>(`/communities/${id}`).then(res => res.data),
  createCommunity: <T>(data: T) => api.post('/communities', data).then(res => res.data),
  updateCommunity: <T>(id: string, data: T) => api.patch(`/communities/${id}`, data).then(res => res.data),
  reviewCommunity: (id: string, data: { status: 'APPROVED' | 'REJECTED', reviewNotes?: string }) => api.patch(`/communities/${id}/review`, data).then(res => res.data),
  deleteCommunity: (id: string) => api.delete(`/communities/${id}`).then(res => res.data),
  
  // Members
  getMembers: (id: string, params?: Record<string, unknown>) => api.get(`/communities/${id}/members`, { params }).then(res => res.data),
  addMember: (id: string, data: { userId: string, role: string }) => api.post(`/communities/${id}/members`, data).then(res => res.data),
  updateMemberRole: (id: string, userId: string, role: string) => api.patch(`/communities/${id}/members/${userId}`, { role }).then(res => res.data),
  removeMember: (id: string, userId: string) => api.delete(`/communities/${id}/members/${userId}`).then(res => res.data),

  // Join & Follow
  joinCommunity: (id: string, joinAnswers?: Record<string, string>) => api.post(`/communities/${id}/join`, { joinAnswers }).then(res => res.data),
  getJoinRequests: (id: string) => api.get(`/communities/${id}/join-requests`).then(res => res.data),
  reviewJoinRequest: (id: string, memberId: string, action: 'APPROVE' | 'REJECT') => api.patch(`/communities/${id}/join-requests/${memberId}`, { action }).then(res => res.data),
  inviteMember: (id: string, data: { userId: string, role: string }) => api.post(`/communities/${id}/invite`, data).then(res => res.data),
  followCommunity: (id: string) => api.post(`/communities/${id}/follow`).then(res => res.data),
  unfollowCommunity: (id: string) => api.delete(`/communities/${id}/follow`).then(res => res.data),
  favoriteCommunity: (id: string) => api.post(`/communities/${id}/favorite`).then(res => res.data),
  unfavoriteCommunity: (id: string) => api.delete(`/communities/${id}/favorite`).then(res => res.data),
  respondToInvite: (id: string, action: 'accept' | 'decline') => api.post(`/communities/${id}/invite/${action}`).then(res => res.data),

  // Gallery
  getGallery: (id: string) => api.get(`/communities/${id}/gallery`).then(res => res.data),
  addGalleryItem: (id: string, data: { imageUrl: string, caption?: string }) => api.post(`/communities/${id}/gallery`, data).then(res => res.data),
  removeGalleryItem: (id: string, imageId: string) => api.delete(`/communities/${id}/gallery/${imageId}`).then(res => res.data),

  // Tournaments & Rankings
  getTournaments: (id: string, status?: string) => api.get(`/communities/${id}/tournaments`, { params: { status } }).then(res => res.data),
  getRankings: (id: string, limit?: number) => api.get(`/communities/${id}/rankings`, { params: { limit } }).then(res => res.data),
};
