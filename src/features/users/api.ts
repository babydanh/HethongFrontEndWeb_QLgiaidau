import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import type { UserChangeRequest, UserProfile } from '@/types/user';
export type { UserChangeRequest, UserProfile };

export type SystemRole = 'PLAYER' | 'REFEREE' | 'ORGANIZER' | 'MODERATOR' | 'ADMIN';

export interface PublicProfileRankResponse {
  categoryId?: string;
  categoryName?: string | null;
  matchType?: string | null;
  genderRestriction?: string | null;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak?: number;
  currentStreakType?: 'WIN' | 'LOSS' | 'NONE';
  currentStreakCount?: number;
  adminLeaderboardEligible?: boolean;
  tierName?: string | null;
  partnerName?: string | null;
  source?: 'SINGLES' | 'DOUBLES';
}

interface PublicProfileResponse {
  id?: string;
  bio?: string | null;
  avatarUrl?: string;
  coverUrl?: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  isVerified?: boolean;
  allowStrangerMessages?: boolean;
  ranks?: PublicProfileRankResponse[];
  pairRanks?: PublicProfileRankResponse[];
  highlightRank?: PublicProfileRankResponse | null;
  createdAt?: string;
  data?: PublicProfileResponse;
}

interface RawUserProfileResponse {
  id?: string;
  email?: string;
  profile?: {
    fullName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    phone?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    provinceCode?: string;
    isGenderLocked?: boolean;
    allowStrangerMessages?: boolean;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  [key: string]: unknown;
}

const mapUserProfile = (data: RawUserProfileResponse): UserProfile => {
  return {
    ...data,
    fullName: data.profile?.fullName,
    avatarUrl: data.profile?.avatarUrl,
    coverUrl: data.profile?.coverUrl,
    bio: data.profile?.bio,
    phoneNumber: data.profile?.phone || data.profile?.phoneNumber,
    dateOfBirth: data.profile?.dateOfBirth,
    gender: data.profile?.gender,
    address: data.profile?.address,
    provinceCode: data.profile?.provinceCode,
    isEmailVerified: data.isEmailVerified as boolean | undefined,
    isPhoneVerified: data.isPhoneVerified as boolean | undefined,
    isGenderLocked: data.profile?.isGenderLocked as boolean | undefined,
    allowStrangerMessages: data.profile?.allowStrangerMessages as boolean | undefined,
    bankName: data.profile?.bankName,
    bankAccountNumber: data.profile?.bankAccountNumber,
    bankAccountName: data.profile?.bankAccountName,
  } as UserProfile;
};

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) => api.get<ApiResponse<UserProfile[]>>('/users', { params }).then(res => res.data),
  searchUsers: (q: string) =>
    api.get<ApiResponse<unknown>>(`/users/search/public?q=${encodeURIComponent(q)}`).then((res) => {
      const payload = res.data;
      let rawList: Record<string, unknown>[] = [];
      if (Array.isArray(payload)) {
        rawList = payload as Record<string, unknown>[];
      } else if (payload && typeof payload === 'object') {
        const d = (payload as { data?: unknown }).data;
        if (Array.isArray(d)) {
          rawList = d as Record<string, unknown>[];
        } else if (d && typeof d === 'object' && Array.isArray((d as { data?: unknown[] }).data)) {
          rawList = (d as { data: Record<string, unknown>[] }).data;
        }
      }

      return rawList.map((item) => {
        const profile = item.profile as Record<string, unknown> | null | undefined;
        return {
          ...item,
          id: (item.id as string) || '',
          email: (item.email as string) || '',
          fullName: (item.fullName as string) || (profile?.fullName as string) || undefined,
          avatarUrl: (item.avatarUrl as string) || (profile?.avatarUrl as string) || undefined,
        } as UserProfile;
      });
    }),
  searchUsersByQuery: (q: string) => api.get<ApiResponse<UserProfile[]>>(`/users/search?q=${encodeURIComponent(q)}`).then(res => res.data),
  getProfile: () => api.get<ApiResponse<RawUserProfileResponse>>('/users/profile').then(res => {
    const mapped = mapUserProfile(res.data);
    return mapped;
  }),
  getUserById: (id: string) => api.get<ApiResponse<UserProfile>>(`/users/${id}`).then(res => res.data),
  getPublicProfile: (id: string) => api.get<ApiResponse<PublicProfileResponse>>(`/users/${id}/public`).then(res => res.data.data || res.data),
  updateSystemRoles: (id: string, roles: SystemRole[]) =>
    api.patch<ApiResponse<{ userId: string; roles: SystemRole[] }>>(`/users/${id}/system-roles`, { roles }).then(res => res.data),
  updateProfile: <T>(data: T) => api.patch<ApiResponse<RawUserProfileResponse>>('/users/profile', data).then(res => mapUserProfile(res.data)),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<RawUserProfileResponse>>('/users/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => mapUserProfile(res.data));
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<RawUserProfileResponse>>('/users/profile/cover', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => mapUserProfile(res.data));
  },
  changePassword: <T>(data: T) => api.patch<ApiResponse<{ message: string }>>('/users/change-password', data).then(res => res.data),
  deleteUser: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/users/${id}`).then(res => res.data),
  createChangeRequest: (data: { requestType: 'GENDER'; newValue: string }) =>
    api.post<ApiResponse<UserChangeRequest>>('/users/change-requests', data).then(res => res.data),
  deleteAccount: (data: { password?: string }) => api.post<ApiResponse<{ message: string }>>('/users/delete-account', data).then(res => res.data),
  getAdminChangeRequests: (params?: { status?: string }) =>
    api.get<ApiResponse<UserChangeRequest[]>>('/users/admin/change-requests', { params }).then(res => res.data),
  approveChangeRequest: (id: string, data?: { adminNote?: string }) =>
    api.patch<ApiResponse<UserChangeRequest>>(`/users/admin/change-requests/${id}/approve`, data).then(res => res.data),
  rejectChangeRequest: (id: string, data?: { adminNote?: string }) =>
    api.patch<ApiResponse<UserChangeRequest>>(`/users/admin/change-requests/${id}/reject`, data).then(res => res.data),
};

