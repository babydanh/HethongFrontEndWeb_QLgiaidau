import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import { UserProfile } from '@/types/user';
export type { UserProfile };

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
  } as UserProfile;
};

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) => api.get<ApiResponse<UserProfile[]>>('/users', { params }).then(res => res.data),
  searchUsers: (q: string) => api.get<ApiResponse<UserProfile[]>>(`/users/search/public?q=${encodeURIComponent(q)}`).then(res => res.data),
  searchUsersByQuery: (q: string) => api.get<ApiResponse<UserProfile[]>>(`/users/search?q=${encodeURIComponent(q)}`).then(res => res.data),
  getProfile: () => api.get<ApiResponse<RawUserProfileResponse>>('/users/profile').then(res => {
    const mapped = mapUserProfile(res.data);
    return mapped;
  }),
  getUserById: (id: string) => api.get<ApiResponse<UserProfile>>(`/users/${id}`).then(res => res.data),
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
};
