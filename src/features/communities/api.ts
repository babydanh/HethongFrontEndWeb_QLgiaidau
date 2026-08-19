import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { Community } from '@/types/community';
import { PaginatedResponse, ApiResponse } from '@/types/api';
import { Tournament } from '@/features/tournaments/api';
import type {
  CommunityDashboard,
  CommunityPost,
  CommunityComment,
  CommunityReactionType,
  CommunitySocialSettings,
  CreateCommunityPostPayload,
  CursorPage,
} from '@/types/community-social';

export type { Category, Community, PaginatedResponse, ApiResponse };
export type { CommunityDashboard, CommunityPost, CreateCommunityPostPayload, CursorPage };

interface BackendPost {
  id: string;
  communityId: string;
  authorId: string;
  tournamentId?: string | null;
  type?: string;
  tournament?: CommunityPost['tournament'];
  body: string | null;
  mediaUrls: string[];
  status: CommunityPost['status'];
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  commentCount: number;
  author?: CommunityPost['author'] | null;
  topics?: string[];
  mentions?: string[];
  viewerReaction?: CommunityReactionType | null;
  poll?: CommunityPost['poll'];
}

function mapPost(post: BackendPost): CommunityPost {
  return {
    id: post.id,
    communityId: post.communityId,
    author: post.author ?? { id: post.authorId, fullName: 'Thành viên CLB', avatarUrl: null },
    tournamentId: post.tournamentId ?? null,
    type: post.type ?? 'NORMAL',
    tournament: post.tournament ?? null,
    content: post.body ?? '',
    imageUrls: post.mediaUrls ?? [],
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    reactionCount: post.reactionCount ?? 0,
    commentCount: post.commentCount ?? 0,
    topics: post.topics ?? [],
    mentions: post.mentions ?? [],
    viewerReaction: post.viewerReaction ?? null,
    poll: post.poll ?? null,
  };
}

function mapPostPage(posts: BackendPost[], meta?: { nextCursor?: string | null; hasMore?: boolean }): CursorPage<CommunityPost> {
  return {
    items: Array.isArray(posts) ? posts.map(mapPost) : [],
    nextCursor: meta?.nextCursor ?? null,
    hasMore: meta?.hasMore === true,
  };
}

export interface MyCommunitiesResponse {
  created: Community[];
  joined: Community[];
}

export interface GalleryImage {
  id: string;
  communityId: string;
  uploaderId: string;
  imageUrl: string;
  caption?: string | null;
  createdAt: string;
}

export type MemberStreakType = 'WIN' | 'LOSS' | 'ELO_UP';

/** P2C.3 — Streak tính động từ trận đấu (backend, không lưu DB). */
export interface MemberStreak {
  type: MemberStreakType | null;
  count: number;
  label?: string;
}

export interface CommunityReport {
  id: string;
  communityId: string;
  postId: string | null;
  reason: 'SPAM' | 'HARASSMENT' | 'HATE' | 'SEXUAL' | 'VIOLENCE' | 'OTHER' | string;
  details: string | null;
  status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED' | string;
  createdAt: string;
  resolvedAt: string | null;
  post?: { id: string; body: string | null; status: string } | null;
  reporter?: { id: string; fullName: string | null; email: string | null } | null;
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
    /** P2C.1/P2C.2 — Tag BQT (tối đa 5, text[]). */
    tags?: string[];
  };
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    email?: string;
  };
  /** P2C.3 — Streak thắng/thua/ELO tuần của member (null nếu chưa có). */
  streak?: MemberStreak | null;
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
    api.get<ApiResponse<MyCommunitiesResponse>>('/communities/my'),

  getPendingCommunities: () =>
    api.get<ApiResponse<Community[]>>('/communities/pending'),

  getAllCommunitiesAdmin: () =>
    api.get<ApiResponse<Community[]>>('/communities/admin'),
  
  getFavorites: () => 
    api.get<ApiResponse<{ community: Community }[]>>('/communities/favorites'),
  
  getCommunityById: (id: string) => 
    api.get<ApiResponse<Community>>(`/communities/${id}`),

  getMyMembership: (id: string) =>
    api.get<ApiResponse<{ role: string; status: string; memberId: string; joinedAt: string | null; joinAnswers?: Record<string, string> }>>(`/communities/${id}/my-membership`),

  getDashboard: (id: string) =>
    api.get<ApiResponse<CommunityDashboard>>(`/communities/${id}/dashboard`),

  getSocialSettings: (id: string) =>
    api.get<ApiResponse<CommunitySocialSettings>>(`/communities/${id}/social-settings`),

  updateSocialSettings: (id: string, data: Partial<CommunitySocialSettings>) =>
    api.patch<ApiResponse<CommunitySocialSettings>>(`/communities/${id}/social-settings`, data),

  getPosts: (id: string, params?: { cursor?: string; limit?: number; sort?: 'LATEST' }) =>
    api.get<ApiResponse<BackendPost[]>>(`/communities/${id}/posts`, { params }).then((response) => ({
      ...response,
      data: mapPostPage(response.data, response.meta),
    })),

  createPost: (id: string, data: CreateCommunityPostPayload, idempotencyKey?: string) =>
    api.post<ApiResponse<BackendPost>>(`/communities/${id}/posts`, {
      body: data.content?.trim() ? data.content.trim() : (data.poll ? data.poll.question : undefined),
      mediaUrls: data.imageUrls,
      topics: data.topics,
      mentions: data.mentions,
      poll: data.poll,
    }, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }).then((response) => ({
      ...response,
      data: mapPost(response.data),
    })),

  deletePost: (communityId: string, postId: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/communities/${communityId}/posts/${postId}`),

  getComments: (communityId: string, postId: string, params?: { cursor?: string; limit?: number }) =>
    api.get<ApiResponse<CommunityComment[]>>(`/communities/${communityId}/posts/${postId}/comments`, { params }),

  createComment: (communityId: string, postId: string, data: { body: string; parentId?: string }) =>
    api.post<ApiResponse<CommunityComment>>(`/communities/${communityId}/posts/${postId}/comments`, data),

  updateComment: (communityId: string, commentId: string, body: string) =>
    api.patch<ApiResponse<CommunityComment>>(`/communities/${communityId}/comments/${commentId}`, { body }),

  deleteComment: (communityId: string, commentId: string) =>
    api.post<ApiResponse<CommunityComment>>(`/communities/${communityId}/comments/${commentId}/delete`),

  reactToPost: (communityId: string, postId: string, reactionType: CommunityReactionType) =>
    api.post<ApiResponse<{ reactionType: CommunityReactionType | null; count: number }>>(`/communities/${communityId}/posts/${postId}/reaction`, { reactionType }),

  reportPost: (communityId: string, postId: string, data: { reason: string; details?: string }) =>
    api.post<ApiResponse<unknown>>(`/communities/${communityId}/posts/${postId}/report`, data),

  getCommunityReports: (communityId: string, status?: string) =>
    api.get<ApiResponse<Array<{ report: CommunityReport; post: CommunityReport['post']; reporter: CommunityReport['reporter'] }>>>(`/communities/${communityId}/moderation/reports`, { params: status ? { status } : undefined }).then((response) => ({
      ...response,
      data: (response.data ?? []).map((item) => ({ ...item.report, post: item.post, reporter: item.reporter })),
    })),

  updateCommunityReport: (communityId: string, reportId: string, status: CommunityReport['status']) =>
    api.patch<ApiResponse<CommunityReport>>(`/communities/${communityId}/moderation/reports/${reportId}`, { status }),

  votePoll: (communityId: string, pollId: string, optionId: string) =>
    api.post<ApiResponse<any>>(`/communities/${communityId}/polls/${pollId}/vote`, { optionId }),

  addPollOption: (communityId: string, pollId: string, optionText: string) =>
    api.post<ApiResponse<any>>(`/communities/${communityId}/polls/${pollId}/options`, { optionText }),

  closePoll: (communityId: string, pollId: string) =>
    api.post<ApiResponse<any>>(`/communities/${communityId}/polls/${pollId}/close`),

  getPendingPosts: (communityId: string) =>
    api.get<ApiResponse<BackendPost[]>>(`/communities/${communityId}/moderation/posts`),

  moderatePost: (communityId: string, postId: string, status: 'PUBLISHED' | 'REJECTED' | 'HIDDEN') =>
    api.patch<ApiResponse<BackendPost>>(`/communities/${communityId}/posts/${postId}/moderation`, { status }),

  
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

  // P2C.2 — Gán/Xoá tag BQT (replace toàn bộ, mảng rỗng = xoá hết; OWNER/MODERATOR)
  updateMemberTags: (id: string, userId: string, tags: string[]) =>
    api.patch<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members/${userId}/tags`, { tags }),
  getTagPresets: (id: string) => api.get<ApiResponse<Array<{ id: string; name: string; color: string }>>>(`/communities/${id}/tag-presets`),
  createTagPreset: (id: string, data: { name: string; color: string }) => api.post<ApiResponse<{ id: string; name: string; color: string }>>(`/communities/${id}/tag-presets`, data),
  deleteTagPreset: (id: string, presetId: string) => api.delete<ApiResponse<unknown>>(`/communities/${id}/tag-presets/${presetId}`),

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

  // Notification Preferences
  updateMyNotificationPreference: (id: string, preference: 'ALL' | 'MENTIONS_ONLY' | 'MUTED') =>
    api.put<ApiResponse<CommunityMemberRecord>>(`/communities/${id}/members/me/notification-preference`, { preference }),

  getMyNotificationPreferences: () =>
    api.get<ApiResponse<Array<{
      communityId: string;
      communityName: string;
      logoUrl: string | null;
      role: string;
      notificationPreference: 'ALL' | 'MENTIONS_ONLY' | 'MUTED';
    }>>>('/communities/my/notification-preferences').then((res) => res.data),
};
